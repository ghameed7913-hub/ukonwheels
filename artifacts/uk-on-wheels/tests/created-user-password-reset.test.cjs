const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
function part(start,end){
 const a=html.indexOf(start),b=html.indexOf(end,a);
 assert.ok(a>=0&&b>a,start);
 return html.slice(a,b);
}
function setup(){
 const users=[{id:"user-1",name:"Example Driver",email:"driver@example.invalid",phone:"07000000000",role:"Driver",status:"Active"}];
 const calls=[],notices=[],confirmations=[];
 let approved=true,response={},wait=null;
 const c=vm.createContext({
  role:"admin",SUPABASE_CONFIGURED:true,currentSession:{user:{id:"admin-1"}},
  ensureStaffUsers:()=>({staffUsers:users}),
  escapeHtml:v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])),
  location:{origin:"https://portal.example",pathname:"/"},
  alert:m=>notices.push(m),
  crmConfirm:async(...args)=>{confirmations.push(args);return wait?await wait:approved},
  sb:{auth:{resetPasswordForEmail:async(email,options)=>{calls.push({email,options});return response}}},
 });
 vm.runInContext(part("async function requestAccountPasswordReset(","/* ---------- Inline icon set")+"\n"+part("function drawCreateUsers(","function viewUserInformation("),c);
 const button={disabled:false,textContent:"Change Password",isConnected:true};
 return {c,users,calls,notices,confirmations,button,
  cancel:()=>{approved=false},error:error=>{response={error}},hold:p=>{wait=p}};
}
test("Created Users has a password action, and confirmation sends only the saved email through Supabase recovery",async()=>{
 const s=setup(),box={innerHTML:""};
 s.c.drawCreateUsers(box);
 assert.match(box.innerHTML,/sendCreatedUserPasswordReset\(0,this\).*Change Password/);
 assert.match(box.innerHTML,/user chooses their new password/);
 assert.equal(await s.c.sendCreatedUserPasswordReset(0,s.button),true);
 assert.equal(s.calls.length,1);
 assert.equal(s.calls[0].email,"driver@example.invalid");
 assert.equal(s.calls[0].options.redirectTo,"https://portal.example/");
 assert.match(s.confirmations[0][0],/driver@example.invalid/);
 assert.match(s.notices.at(-1),/password has not been changed/);
 assert.equal(s.button.disabled,false);
 assert.equal(s.button.textContent,"Change Password");
});
test("Cancel, missing email, deleted/unsaved users, demo and non-Admin roles never request an email",async()=>{
 for(const mutate of [
  s=>s.cancel(),s=>{s.users[0].email=""},s=>{s.users[0].status="Deleted"},
  s=>{delete s.users[0].id},s=>{s.c.SUPABASE_CONFIGURED=false},
  s=>{s.c.currentSession=null},s=>{s.c.currentSession.user.id="local-preview-admin"},
  ...["driver","client","staff"].map(role=>s=>{s.c.role=role}),
 ]){
  const s=setup();mutate(s);
  await s.c.sendCreatedUserPasswordReset(0,s.button);
  assert.equal(s.calls.length,0);
  assert.equal(s.button.disabled,false);
 }
 const s=setup();s.c.role="staff";const box={};s.c.drawCreateUsers(box);
 assert.doesNotMatch(box.innerHTML,/sendCreatedUserPasswordReset/);
});
test("An inactive Unassigned saved user can recover their password without changing activation or role",async()=>{
 const s=setup();s.users[0].role="Unassigned";s.users[0].status="Inactive";
 const before=JSON.stringify(s.users);
 await s.c.sendCreatedUserPasswordReset(0,s.button);
 assert.equal(s.calls.length,1);
 assert.equal(JSON.stringify(s.users),before);
});
test("Rate-limit and network errors are explicit, restore the button, and permit a later manual retry",async()=>{
 const s=setup();s.error({message:"Email rate limit exceeded"});
 assert.equal(await s.c.sendCreatedUserPasswordReset(0,s.button),false);
 assert.match(s.notices.at(-1),/could not be requested.*rate limit exceeded/);
 assert.equal(s.button.disabled,false);
 s.c.sb.auth.resetPasswordForEmail=async()=>{throw new Error("Network offline")};
 assert.equal(await s.c.sendCreatedUserPasswordReset(0,s.button),false);
 assert.match(s.notices.at(-1),/Network offline/);
 s.c.sb.auth.resetPasswordForEmail=async()=>{s.calls.push({});return {}};
 assert.equal(await s.c.sendCreatedUserPasswordReset(0,s.button),true);
});
test("Double clicks send one email and account/target changes during confirmation block sending",async()=>{
 const s=setup();let release;s.hold(new Promise(r=>{release=r}));
 const first=s.c.sendCreatedUserPasswordReset(0,s.button);
 await s.c.sendCreatedUserPasswordReset(0,s.button);
 assert.equal(s.confirmations.length,1);assert.equal(s.button.disabled,true);
 release(true);await first;assert.equal(s.calls.length,1);
 for(const mutate of [
  s=>{s.c.currentSession=null},s=>{s.c.currentSession.user.id="other-admin"},
  s=>{s.c.role="staff"},s=>{s.users[0].email="changed@example.invalid"},
  s=>{s.users[0].status="Deleted"},s=>{s.users.length=0},
 ]){
  const s=setup();let done;s.hold(new Promise(r=>{done=r}));
  const pending=s.c.sendCreatedUserPasswordReset(0,s.button);
  mutate(s);done(true);await pending;
  assert.equal(s.calls.length,0);assert.match(s.notices.at(-1),/changed/);
 }
});
