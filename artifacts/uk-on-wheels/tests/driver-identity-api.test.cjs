const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const script=fs.readFileSync(path.join(__dirname,"../public/driver-identity-api.js"),"utf8");
function setup(){
  let version=1,uploads=0,registers=0,fail=false,card=null;
  const calls=[],urls=[],paths=[],buckets=[];
  const snapshot=()=>({user_id:"driver-1",name:"Driver",version,photo_path:"driver-1/portrait.jpg",card});
  const context=vm.createContext({
    window:{},SUPABASE_CONFIGURED:true,currentSession:{user:{id:"driver-1"}},
    crypto:{randomUUID:()=>"11111111-1111-1111-1111-111111111111"},
    URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},
    Image:class{naturalWidth=100;naturalHeight=100;async decode(){}},
    document:{createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toBlob:fn=>fn({size:100,type:"image/jpeg"})})},
    sb:{rpc:async(name,args)=>{
      calls.push({name,args});
      if(["register_driver_portrait","register_hr_driver_portrait","register_driver_company_id_file"].includes(name)){
        registers++;if(fail)return {error:{message:"Network failure"}};
      }
      if(name==="list_driver_identities")return {data:{canIssue:true,drivers:[snapshot()]}};
      return {data:snapshot()};
    },storage:{from:bucket=>{
      assert.ok(["driver-portraits","driver-company-ids"].includes(bucket));
      return {createSignedUrl:async(p,seconds)=>{urls.push({p,seconds});return {data:{signedUrl:"https://example.invalid/"+p}}},
        upload:async(p,blob,options)=>{uploads++;paths.push(p);buckets.push(bucket);assert.equal(options.upsert,false);return {data:{path:p}}}};
    }}}
  });
  vm.runInContext(script,context);
  return {api:context.window.DriverIdentityAPI,c:context,calls,urls,paths,buckets,uploads:()=>uploads,registers:()=>registers,setFail:v=>fail=v,setCard:v=>card=v};
}
function file(type="image/jpeg",bytes=[255,216,255]){
  return {type,size:bytes.length,slice:()=>({arrayBuffer:async()=>Uint8Array.from(bytes).buffer})};
}
test("Own portrait is served privately with a short signed URL",async()=>{
  const s=setup(),v=await s.api.own();
  assert.match(v.photo_url,/example.invalid/);assert.equal(s.urls[0].seconds,120);
  assert.equal(s.calls[0].name,"own_driver_identity");assert.equal(s.calls[0].args,undefined);
});
test("Portrait upload normalizes images and retries metadata without a second upload",async()=>{
  const s=setup(),f=file();s.setFail(true);
  await assert.rejects(s.api.uploadPhoto(f),/Network failure/);
  s.setFail(false);await s.api.uploadPhoto(f);
  assert.equal(s.uploads(),1);assert.equal(s.registers(),2);
});
test("Invalid/oversized images never reach storage",async()=>{
  const s=setup();
  await assert.rejects(s.api.uploadPhoto(file("image/svg+xml")),/JPEG/);
  await assert.rejects(s.api.uploadPhoto(file("image/jpeg",[1,2,3])),/contents/);
  await assert.rejects(s.api.uploadPhoto({...file(),size:10485761}),/10 MB/);
  assert.equal(s.uploads(),0);
});
test("Issue and revoke use server data and optimistic versions, not generated local IDs",async()=>{
  const s=setup();
  assert.throws(()=>s.api.issue("driver-1",null),/Refresh/);
  await s.api.list();await s.api.issue("driver-1","2030-01-01");
  const issue=s.calls.find(c=>c.name==="issue_driver_company_id");
  assert.equal(issue.args.p_expected_version,1);assert.equal(issue.args.p_valid_until,"2030-01-01");
  await s.api.revoke("driver-1","Employee left");
  assert.equal(s.calls.at(-1).args.p_reason,"Employee left");
});
test("Changing accounts invalidates cached issue permissions/versions",async()=>{
  const s=setup();await s.api.list();s.c.currentSession={user:{id:"other"}};
  assert.throws(()=>s.api.issue("driver-1",null),/Refresh/);
});
test("Late responses cannot populate another account",async()=>{
  const s=setup();let resolve;
  s.c.sb.rpc=()=>new Promise(r=>resolve=r);
  const pending=s.api.own();s.c.currentSession={user:{id:"other"}};
  resolve({data:{user_id:"driver-1",version:1}});
  await assert.rejects(pending,/sign-in changed/);
});
test("HR uploads use the selected Driver path and expected version, with safe metadata retry",async()=>{
  const s=setup(),f=file();s.c.currentSession={user:{id:"admin"}};
  await assert.rejects(s.api.uploadHRPhoto("driver-1",f),/Refresh/);
  assert.equal(s.uploads(),0);
  await s.api.list();s.setFail(true);
  await assert.rejects(s.api.uploadHRPhoto("driver-1",f),/Network failure/);
  s.setFail(false);await s.api.uploadHRPhoto("driver-1",f);
  assert.equal(s.uploads(),1);assert.match(s.paths[0],/^driver-1\//);
  const calls=s.calls.filter(c=>c.name==="register_hr_driver_portrait");
  assert.equal(calls.length,2);assert.equal(calls[1].args.p_user_id,"driver-1");
  assert.equal(calls[1].args.p_expected_version,1);
  assert.equal(calls[0].args.p_path,calls[1].args.p_path);
});
test("HR cannot reuse a cached portrait version after changing accounts",async()=>{
  const s=setup();await s.api.list();
  s.c.currentSession={user:{id:"another-admin"}};
  await assert.rejects(s.api.uploadHRPhoto("driver-1",file()),/Refresh/);
  assert.equal(s.uploads(),0);
});
test("Uploaded company ID PDFs have their own private bucket, version and idempotent retry",async()=>{
  const s=setup();s.c.currentSession={user:{id:"admin"}};await s.api.list();
  const f={...file("application/pdf",Buffer.from("%PDF-1.7\n")) ,name:"Company ID.pdf"};
  s.setFail(true);await assert.rejects(s.api.uploadDigitalID("driver-1",f,"2030-01-01"),/Network failure/);
  s.setFail(false);await s.api.uploadDigitalID("driver-1",f,"2030-01-01");
  assert.equal(s.uploads(),1);assert.equal(s.buckets[0],"driver-company-ids");assert.match(s.paths[0],/\.pdf$/);
  const calls=s.calls.filter(c=>c.name==="register_driver_company_id_file");
  assert.equal(calls[1].args.p_name,"Company ID.pdf");
  assert.equal(calls[1].args.p_mime,"application/pdf");assert.equal(calls[1].args.p_expected_version,1);
  assert.equal(calls[1].args.p_path,calls[0].args.p_path);
});
test("Rejected company ID files never reach storage; IDs cannot reuse portrait paths",async()=>{
  const s=setup();await s.api.list();
  await assert.rejects(s.api.uploadDigitalID("driver-1",file("text/html",[60,62])),/company ID/);
  await assert.rejects(s.api.uploadDigitalID("driver-1",file("application/pdf",[1,2,3])),/contents/);
  await assert.rejects(s.api.uploadDigitalID("driver-1",{...file(),size:10485761}),/10 MB/);
  assert.equal(s.uploads(),0);
  const f=file();await s.api.uploadPhoto(f);await s.api.uploadDigitalID("driver-1",f,null);
  assert.deepEqual(s.buckets,["driver-portraits","driver-company-ids"]);assert.equal(s.uploads(),2);
});
test("Drivers receive a signed ID-file link only for an active card",async()=>{
  const s=setup();
  const base={source:"uploaded",document:{path:"driver-1/id.pdf",name:"Company ID.pdf",mime:"application/pdf"}};
  s.setCard({...base,state:"active"});let snap=await s.api.own();assert.ok(snap.card.document.url);
  for(const state of ["revoked","expired","suspended"]){
    s.setCard({...base,state});snap=await s.api.own();assert.equal(snap.card.document.url,null);
  }
  s.c.currentSession={user:{id:"admin"}};
  const rows=await s.api.list();assert.ok(rows.drivers[0].card.document.url);
});
