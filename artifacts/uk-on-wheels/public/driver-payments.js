/* Driver-only read model. Never use the HR financial RPC or write payment status. */
window.DriverPayments=(()=>{
  let owner=null,revision=0,inflight=null;
  let data={items:[],loading:false,error:"",lastUpdated:null,openIds:[]};
  const numeric=["basic","vehiclePay","overtime","fuel","food","travel","gross","taxAmount","advance","taxPct"];
  function actor(){
    if(typeof role==="undefined"||role!=="driver"||!currentSession?.user?.id)throw Error("Sign in as a Driver to view your payments.");
    return currentSession.user.id;
  }
  function reset(){
    owner=null;revision++;inflight=null;data={items:[],loading:false,error:"",lastUpdated:null,openIds:[]};
    const root=document.getElementById("driverPaymentsPage");if(root)root.innerHTML="";
  }
  function sync(){
    const id=actor();if(owner!==id){reset();owner=id;}return id;
  }
  function amount(value){
    if(!["number","string"].includes(typeof value)||String(value).trim()===""||!Number.isFinite(Number(value)))throw Error("A saved payslip has an invalid amount. Ask HR to check the record.");
    return Number(value);
  }
  function ownItems(raw){
    const id=actor(),email=String(currentSession.user.email||currentUser?.email||"").trim().toLowerCase();
    if(!Array.isArray(raw))throw Error("The saved payslip response is incomplete. Please retry.");
    return raw.filter(p=>p&&typeof p==="object"&&(
      Object.prototype.hasOwnProperty.call(p,"profileId")?p.profileId===id:
        !!email&&String(p.email||"").trim().toLowerCase()===email
    )).map(p=>{
      if(typeof p.id!=="string"||!p.id.trim())throw Error("A saved payslip has no reference. Ask HR to check the record.");
      const item={id:p.id,name:String(p.name||"Driver"),month:String(p.month||"Not recorded"),
        net:amount(p.net),status:p.paymentStatus==="Paid"?"Paid":"Pending",
        paidOn:String(p.paidOn||""),createdAt:String(p.createdAt||"")};
      for(const key of numeric)if(p[key]!=null)item[key]=amount(p[key]);
      if(typeof p.taxEnabled==="boolean")item.taxEnabled=p.taxEnabled;
      return item;
    });
  }
  function remember(){
    const root=document.getElementById("driverPaymentsPage");
    if(root)data.openIds=Array.from(root.querySelectorAll("details[open][data-payment-ref]"),el=>el.dataset.paymentRef);
  }
  function state(){sync();remember();return {...data,items:data.items.slice(),openIds:data.openIds.slice()};}
  function active(){return typeof role!=="undefined"&&role==="driver"&&typeof driverMobileTab!=="undefined"&&driverMobileTab==="payments";}
  function paint(){
    if(!active())return;
    const root=document.getElementById("driverPaymentsPage");
    if(root&&window.DriverPaymentsUI)root.innerHTML=DriverPaymentsUI.render(state());
  }
  function acceptScopedStore(store){
    if(typeof role==="undefined"||role!=="driver")return;
    sync();const items=ownItems(store?.payslips);
    revision++;inflight=null;data={...data,items,loading:false,error:"",lastUpdated:new Date().toISOString()};paint();
  }
  async function read(){
    if(isLocalPreview())return ownItems(getStore().payslips);
    const id=actor(),r=await sb.rpc("read_own_portal_store");
    if(actor()!==id)throw Error("Your sign-in changed. Reload payments.");
    if(r.error)throw Error(r.error.message||"Payments could not be loaded.");
    return ownItems(r.data?.payslips);
  }
  function refresh(){
    let id;try{id=sync();}catch(e){reset();return Promise.resolve();}
    if(inflight)return inflight;
    const version=++revision;data.loading=true;data.error="";paint();
    inflight=Promise.resolve().then(read).then(items=>{
      if(version!==revision||actor()!==id)return;
      data={...data,items,error:"",lastUpdated:new Date().toISOString()};
    }).catch(e=>{
      if(version===revision&&currentSession?.user?.id===id)data.error=e.message||"Payments could not be refreshed.";
    }).finally(()=>{
      if(version===revision){data.loading=false;inflight=null;paint();}
    });
    return inflight;
  }
  function view(){return '<div id="driverPaymentsPage">'+DriverPaymentsUI.render(state())+"</div>";}
  function mount(){sync();if(!data.lastUpdated||Date.now()-Date.parse(data.lastUpdated)>5000)refresh();}
  function isLocalPreview(){
    return typeof location!=="undefined"&&["localhost","127.0.0.1"].includes(location.hostname)&&
      new URLSearchParams(location.search).has("ui-preview")&&currentSession?.user?.id==="local-preview-driver";
  }
  window.addEventListener("focus",()=>{if(active())refresh();});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&active())refresh();});
  return {read,ownItems,state,refresh,acceptScopedStore,view,mount,reset,isLocalPreview};
})();
