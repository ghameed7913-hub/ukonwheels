const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const script=fs.readFileSync(path.join(__dirname,"../public/driver-identity-ui.js"),"utf8");
function setup(snapshot,error){
  let calls=0;
  const c=vm.createContext({
    window:{addEventListener(){},removeEventListener(){},DriverIdentityAPI:{own:async()=>{
      calls++;if(error)throw Error(error);return snapshot;
    }}},
    currentSession:{user:{id:"driver-1"}},driverMobileTab:"profile",
    document:{getElementById:()=>null,querySelector:()=>null,body:{classList:{contains:()=>true}}},
    setInterval:()=>1,clearInterval(){},console
  });
  vm.runInContext(script,c);
  return {c,ui:c.window.DriverIdentityUI,calls:()=>calls};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const snap={user_id:"driver-1",name:"<Driver>",photo_path:"driver-1/portrait.jpg",photo_url:"https://example.invalid/portrait",
  card:{name:"<Driver>",reference:"UKOW-ID-000001",photo_url:"https://example.invalid/portrait",issued_at:"2026-01-01",state:"active"}};
test("A compulsory portrait gates readiness; a stored snapshot unlocks it",async()=>{
  const s=setup({...snap,photo_path:null,card:null});
  assert.equal(s.ui.ready(),false);s.ui.mountDriver();await tick();
  assert.equal(s.ui.ready(),false);assert.match(s.ui.renderProfile(),/Required/);
  const saved=setup(snap);saved.ui.mountDriver();await tick();
  assert.equal(saved.ui.ready(),true);
});
test("Company ID displays server reference and escaped name with no editable card fields",async()=>{
  const s=setup(snap);s.ui.mountDriver();await tick();
  const card=s.ui.renderCard();
  assert.match(card,/UKOW-ID-000001/);assert.match(card,/&lt;Driver&gt;/);
  assert.match(card,/Active/);assert.doesNotMatch(card,/<input|<textarea/);
});
test("Revoked and expired IDs are explicitly not valid",async()=>{
  for(const state of ["revoked","expired","suspended"]){
    const s=setup({...snap,card:{...snap.card,state}});s.ui.mountDriver();await tick();
    assert.match(s.ui.renderCard(),/NOT VALID/);
    assert.doesNotMatch(s.ui.renderCard(),/Valid UK On Wheels Driver ID\./);
  }
});
test("An unissued card is never displayed as official identification",async()=>{
  const s=setup({...snap,card:null});s.ui.mountDriver();await tick();
  assert.match(s.ui.renderCard(),/profile portrait is not a company ID/);
  assert.doesNotMatch(s.ui.renderCard(),/UKOW-ID-/);
});
test("Changing accounts clears the previous portrait before rendering",async()=>{
  const s=setup(snap);s.ui.mountDriver();await tick();
  s.c.currentSession={user:{id:"different-driver"}};
  assert.equal(s.ui.ready(),false);
  assert.doesNotMatch(s.ui.renderProfile(),/example.invalid\/portrait|UKOW-ID-000001/);
  assert.doesNotMatch(s.ui.renderCard(),/UKOW-ID-000001/);
});
test("Setup/network errors hide cards and do not cause an automatic retry loop",async()=>{
  const s=setup(null,"Setup unavailable");s.ui.mountDriver();await tick();
  s.ui.mountDriver();await tick();
  assert.equal(s.calls(),1);assert.equal(s.ui.ready(),false);
  assert.match(s.ui.renderProfile(),/Setup unavailable/);
  assert.match(s.ui.renderCard(),/unavailable/);
});
test("The ID view cannot be covered by a sticky Driver header, and HR navigation can expand",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const css=fs.readFileSync(path.join(__dirname,"../public/driver-identity.css"),"utf8");
  assert.match(html,/activeTab==="companyId"\?" driverCompanyIDView"/);
  assert.match(css,/\.driverCompanyIDView \.driverHeader\{position:static\}/);
  assert.match(css,/\.navGroup\.open\[data-nav-group="hr"\] > \.navChildren\{max-height:none;overflow:visible\}/);
});
test("A late HR directory response cannot overwrite another page",async()=>{
  const s=setup(null);let resolve,writes=0;
  s.c.page="driverCompanyIDs";
  s.c.window.DriverIdentityAPI.list=()=>new Promise(r=>resolve=r);
  const body={removeAttribute(){},set innerHTML(v){writes++;}};
  const container={isConnected:true,innerHTML:"",dataset:{},addEventListener(){},querySelector:()=>body};
  const pending=s.ui.drawAdmin(container);
  s.c.page="hrRegister";container.innerHTML="Unsaved employee form";
  resolve({canIssue:true,drivers:[]});await pending;
  assert.equal(writes,0);assert.equal(container.innerHTML,"Unsaved employee form");
});
test("HR portrait controls are included only in the permission-controlled branch",()=>{
  assert.match(script,/if\(A\.data\.canIssue\)\{[\s\S]*data-di-a="open-photo"/);
  assert.match(script,/await a\.uploadHRPhoto\(uid,file\)/);
  assert.match(script,/Your file is still selected; retry when ready/);
  assert.match(script,/if\(!adminLive\(A\)\|\|S\.admin\.gen!==gen\)return/);
});
test("The Digital ID page shows the whole uploaded card image and escapes its filename",async()=>{
  const card={...snap.card,source:"uploaded",document:{mime:"image/png",url:"https://example.invalid/id-card.png",name:'<Company ID>'}};
  const s=setup({...snap,card});s.ui.mountDriver();await tick();
  const html=s.ui.renderCard();
  assert.match(html,/<img[^>]+id-card\.png/);assert.match(html,/UKOW-ID-000001/);
  assert.doesNotMatch(html,/<Company ID>/);
  const css=fs.readFileSync(path.join(__dirname,"../public/driver-identity.css"),"utf8");
  assert.match(css,/object-fit:\s*contain/);
});
test("A PDF ID has an open-in-viewer link; invalid IDs never expose a stale file",async()=>{
  const base={...snap.card,source:"uploaded",document:{mime:"application/pdf",url:"https://example.invalid/id.pdf",name:"ID.pdf"}};
  const s=setup({...snap,card:base});s.ui.mountDriver();await tick();
  const html=s.ui.renderCard();assert.match(html,/<iframe/);
  assert.match(html,/Open Digital ID PDF/);assert.match(html,/noopener noreferrer/);
  for(const state of ["revoked","expired","suspended"]){
    const invalid=setup({...snap,card:{...base,state}});invalid.ui.mountDriver();await tick();
    const output=invalid.ui.renderCard();
    assert.doesNotMatch(output,/https:\/\/example.invalid\/id.pdf|<iframe|Open Digital ID PDF/);
    assert.match(output,/Digital ID not available to show/);
  }
});
test("Digital ID is its own Driver tab without removing History",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const nav=html.match(/function driverMobileNav\(\)\{([\s\S]*?)\n\}/)?.[1]||"";
  assert.match(nav,/Digital ID/);assert.match(nav,/companyId/);assert.match(nav,/History/);
});
