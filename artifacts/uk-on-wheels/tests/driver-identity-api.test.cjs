const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const script=fs.readFileSync(path.join(__dirname,"../public/driver-identity-api.js"),"utf8");
function setup(){
  let version=1,uploads=0,registers=0,fail=false;
  const calls=[],urls=[];
  const snapshot=()=>({user_id:"driver-1",name:"Driver",version,photo_path:"driver-1/portrait.jpg",card:null});
  const context=vm.createContext({
    window:{},SUPABASE_CONFIGURED:true,currentSession:{user:{id:"driver-1"}},
    crypto:{randomUUID:()=>"11111111-1111-1111-1111-111111111111"},
    URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},
    Image:class{naturalWidth=100;naturalHeight=100;async decode(){}},
    document:{createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toBlob:fn=>fn({size:100,type:"image/jpeg"})})},
    sb:{rpc:async(name,args)=>{
      calls.push({name,args});
      if(name==="register_driver_portrait"){registers++;if(fail)return {error:{message:"Network failure"}}}
      if(name==="list_driver_identities")return {data:{canIssue:true,drivers:[snapshot()]}};
      return {data:snapshot()};
    },storage:{from:bucket=>{
      assert.equal(bucket,"driver-portraits");
      return {createSignedUrl:async(p,seconds)=>{urls.push({p,seconds});return {data:{signedUrl:"https://example.invalid/"+p}}},
        upload:async(p,blob,options)=>{uploads++;assert.equal(blob.type,"image/jpeg");assert.equal(options.upsert,false);return {data:{path:p}}}};
    }}}
  });
  vm.runInContext(script,context);
  return {api:context.window.DriverIdentityAPI,c:context,calls,urls,uploads:()=>uploads,registers:()=>registers,setFail:v=>fail=v};
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
