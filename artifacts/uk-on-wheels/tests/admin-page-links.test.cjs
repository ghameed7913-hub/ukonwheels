const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
function setup(url="https://example.org/portal/?page=expenses"){
 const calls=[],listeners={};
 const context=vm.createContext({
  URL,Set,role:"admin",currentUser:{name:"Admin"},page:"expenses",
  location:{href:url},
  nav:()=>[{key:"desktop"},{key:"accounts",items:[{key:"expenses"}]},{key:"logout"}],
  history:{replaceState:(_a,_b,url)=>calls.push(["replace",url]),pushState:(_a,_b,url)=>calls.push(["push",url])},
  go:key=>calls.push(["go",key]),
  window:{addEventListener:(name,fn)=>listeners[name]=fn}
 });
 vm.runInContext(html.slice(html.indexOf("function adminPageKeys(){"),html.indexOf("function enhancePortalUsability(){")),context);
 return {context,calls,listeners};
}
test("page links preserve the mounted path and unrelated URL parameters",()=>{
 const {context}=setup("https://example.org/portal/?filter=test#section");
 assert.equal(context.adminPageUrl("expenses"),"/portal/?filter=test&page=expenses#section");
});
test("new tabs restore only known non-action pages",()=>{
 for(const [page,expected] of [["expenses","expenses"],["accounts","accounts"],["logout",null],["notARealPage",null]]){
  assert.equal(setup("https://example.org/?page="+page).context.adminPageFromUrl(),expected);
 }
 assert.match(html,/if\(role==="admin"\)page=adminPageFromUrl\(\)\|\|page/);
});
test("ordinary clicks use in-app navigation and record browser history",()=>{
 const {context,calls}=setup();let prevented=false;
 context.adminPageLinkClick({button:0,preventDefault(){prevented=true}},"expenses");
 assert.equal(prevented,true);
 assert.deepEqual(calls,[["push","/portal/?page=expenses"],["go","expenses"]]);
});
test("modified and middle clicks leave native new-tab behavior untouched",()=>{
 for(const modifiers of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}]){
  const {context,calls}=setup();
  context.adminPageLinkClick({button:0,...modifiers,preventDefault(){throw Error("Native navigation blocked");}},"expenses");
  assert.equal(calls.length,0);
 }
});
test("back and forward restore the URL's page only for authenticated Admin",()=>{
 const {context,calls,listeners}=setup();
 listeners.popstate();assert.deepEqual(calls,[["go","expenses"]]);
 context.role="driver";listeners.popstate();assert.equal(calls.length,1);
});
test("link enhancement is Admin-only and excludes save/logout actions",()=>{
 const {context}=setup();
 context.role="client";
 context.enhanceAdminPageLinks(); // No DOM access for other roles.
 assert.match(html,/if\(!match\|\|!keys\.has\(match\[1\]\)\)return/);
 assert.match(html,/link\.href=adminPageUrl\(key\)/);
});
