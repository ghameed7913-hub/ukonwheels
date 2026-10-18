/* Private finance state: never copy vehicle trading into the shared portal snapshot. */
window.VehicleTrading=(()=>{
 const costFields=["purchaseAmount","fuel","motCharges","roadTax","auctionCharges"];
 const fields=["purchaseDate","purchaseSource","sellerName",...costFields,"mileage","registration","make","model","serviceHistory","logBook","soldFor"];
 let owner=null,generation=0,request=0,pending=null,previewRows=[],searchTimer;
 const empty=()=>({page:"buying",rows:[],draft:null,editingSale:false,canManage:false,loading:false,saving:false,
   uncertain:false,conflict:false,error:"",errors:{},success:"",query:""});
 let data=empty(),seed="";
 const uid=()=>typeof currentSession!=="undefined"?currentSession?.user?.id:null;
 const allowed=()=>!!uid()&&(role==="admin"||(role==="staff"&&hasPermission("accounts")));
 function reset(){owner=null;generation++;request++;pending=null;data=empty();seed="";previewRows=[];clearTimeout(searchTimer);}
 function sync(){if(owner!==uid()){reset();owner=uid();}}
 function isLocalPreview(){return ["localhost","127.0.0.1"].includes(location.hostname)&&
   new URLSearchParams(location.search).get("ui-preview")==="admin"&&uid()==="local-preview-admin"&&
   ["buying","selling"].includes(new URLSearchParams(location.search).get("ui-page"));}
 function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London"}).format(new Date());}
 function blank(){return {id:crypto.randomUUID(),version:0,purchaseDate:today(),purchaseSource:"private",sellerName:"",
   purchaseAmount:"",fuel:"0.00",motCharges:"0.00",roadTax:"0.00",auctionCharges:"0.00",mileage:"",
   registration:"",make:"",model:"",serviceHistory:"Unknown",logBook:"Awaiting",soldFor:""};}
 function draftOf(r){const d={id:r.id,version:r.version};for(const f of fields)d[f]=r[f]==null?"":String(r[f]);return d;}
 function cents(value,positive=false){
   const s=String(value).trim();if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error("Enter an amount with up to two decimal places.");
   const [a,b=""]=s.split("."),p=Number(a)*100+Number((b+"00").slice(0,2));
   if(!Number.isSafeInteger(p)||p>99999999999||p<0||(positive&&p===0))throw Error(positive?"Enter a positive purchase amount.":"Enter a valid amount, zero or above.");
   return p;
 }
 function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!s.startsWith("0000")&&Number.isFinite(Date.parse(s+"T12:00:00Z"))&&new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;}
 function day(s){return validDate(s)?new Intl.DateTimeFormat("en-GB",{weekday:"long",timeZone:"UTC"}).format(new Date(s+"T12:00:00Z")):"—";}
 function totals(d){
   if(!d)return {totalCost:0,profit:null};
   try{const p=costFields.reduce((a,f)=>a+cents(d[f]||"0"),0);if(p>99999999999)throw Error();
     return {totalCost:p/100,profit:String(d.soldFor??"").trim()===""?null:(cents(d.soldFor)-p)/100};
   }catch{return {totalCost:NaN,profit:null};}
 }
 function validate(d,saleOnly=false){
   const errors={},payload={};if(!d)return {errors:{form:"Enter a vehicle first."},payload};
   if(!validDate(d.purchaseDate))errors.purchaseDate="Choose a valid purchase date.";
   payload.purchaseDate=d.purchaseDate;
   if(!["private","auction"].includes(d.purchaseSource))errors.purchaseSource="Choose Private or Auction.";
   payload.purchaseSource=d.purchaseSource;
   for(const [f,max] of [["sellerName",300],["make",120],["model",120],["registration",20]]){
     payload[f]=String(d[f]??"").trim();if(!payload[f]||payload[f].length>max)errors[f]="Enter "+(f==="sellerName"?(d.purchaseSource==="auction"?"the auction name":"the private seller's name"):f)+" (up to "+max+" characters).";
   }
   payload.registration=payload.registration.toUpperCase();
   if(!/^[A-Z0-9][A-Z0-9 -]{0,19}$/.test(payload.registration))errors.registration="Enter a valid registration number.";
   if(!/^\d+$/.test(String(d.mileage))||Number(d.mileage)>1000000000)errors.mileage="Enter the mileage as a whole number, zero or above.";
   payload.mileage=Number(d.mileage);
   let sum=0;
   for(const f of costFields){try{const p=cents(f==="purchaseAmount"?d[f]:(d[f]||"0"),f==="purchaseAmount");payload[f]=p/100;sum+=p;}catch(e){errors[f]=e.message;}}
   if(sum>99999999999)errors.purchaseAmount="The combined total cost is too large.";
   payload.serviceHistory=d.serviceHistory;payload.logBook=d.logBook;
   if(!["Full","Partial","None","Unknown"].includes(d.serviceHistory))errors.serviceHistory="Choose a service history status.";
   if(!["Yes","No","Awaiting"].includes(d.logBook))errors.logBook="Choose a log book status.";
   payload.soldFor=null;
   if(String(d.soldFor??"").trim()!==""){try{payload.soldFor=cents(d.soldFor)/100;}catch(e){errors.soldFor=e.message;}}
   else if(saleOnly)errors.soldFor="Enter the sold price. Enter 0 only if the vehicle was sold for no payment.";
   return {errors,payload};
 }
 function state(){
   sync();const q=data.query.toLocaleLowerCase().replace(/\s/g,""),rows=data.rows.filter(r=>[r.registration,r.make,r.model,r.sellerName].some(v=>String(v||"").toLocaleLowerCase().replace(/\s/g,"").includes(q)));
   const visibleDraft=data.saving||data.uncertain||data.conflict||data.page===(data.editingSale?"selling":"buying")?data.draft:null;
   return {...data,rows,draft:visibleDraft?{...visibleDraft}:null,canManage:allowed()&&data.canManage,
     totals:totals(data.draft),day:day(data.draft?.purchaseDate||"")};
 }
 const gbp=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n);
 function summary(){
   const s=state(),root=document.getElementById("vehicleTradingView");if(!root)return;
   const weekday=root.querySelector("[data-trade-day]"),label=root.querySelector("[data-trade-seller-label]");
   for(const total of root.querySelectorAll("[data-trade-total]"))total.textContent=Number.isFinite(s.totals.totalCost)?gbp(s.totals.totalCost):"—";
   for(const profit of root.querySelectorAll("[data-trade-profit]")){const p=s.totals.profit;
     profit.textContent=p===null?"Not sold":p===0?"£0.00 · Break even":(p>0?"+":"-")+gbp(Math.abs(p));
     profit.style.color=p>0?"#15803d":p<0?"#b91c1c":"inherit";
   }
   if(weekday)weekday.textContent=s.day;
   if(label)label.textContent=s.draft?.purchaseSource==="auction"?"Auction name *":"Private seller name *";
 }
 function paint(){
   const root=document.getElementById("vehicleTradingView");
   if(root&&typeof page!=="undefined"&&["buying","selling"].includes(page)&&allowed()){
     const active=document.activeElement,focus=active?.closest?.("#vehicleTradingView")?
       {id:active.id,start:active.selectionStart,end:active.selectionEnd}:null;
     root.innerHTML=VehicleTradingUI.render(state());summary();
     const next=focus?.id?document.getElementById(focus.id):null;
     if(next&&!next.disabled){next.focus({preventScroll:true});try{if(focus.start!==null)next.setSelectionRange(focus.start,focus.end);}catch{}}
   }
 }
 function capture(){
   if(!data.draft)return;const root=document.getElementById("vehicleTradingView");if(!root)return;
   for(const el of root.querySelectorAll("[data-trade-field]"))if(fields.includes(el.dataset.tradeField))data.draft[el.dataset.tradeField]=el.value;
 }
 function update(field,value){
   sync();if(!data.canManage||data.saving||data.uncertain||data.conflict||!data.draft||!fields.includes(field))return;
   data.draft[field]=String(value);summary();
 }
 async function call(name,args){
   if(!allowed())throw Object.assign(Error("Accounts access is required."),{code:"42501"});
   const r=await sb.rpc(name,args);
   if(r.error){const e=Object.assign(Error(r.error.message||"The request was not confirmed."),{code:r.error.code});
     if(["PGRST202","PGRST205","42883","42P01"].includes(e.code)){e.message="Buying & Selling needs setup. Ask Admin to run supabase/vehicle-trading.sql.";e.definite=true;}
     throw e;
   }return r.data;
 }
 function validRow(r){return r&&typeof r.id==="string"&&Number.isInteger(r.version)&&r.version>0&&Number.isFinite(r.totalCost)&&
   r.totalCost>=0&&(r.profit===null||Number.isFinite(r.profit))&&(r.soldFor===null||Number.isFinite(r.soldFor));}
 async function load(){
   sync();const actor=owner,gen=generation,seq=++request;data.loading=true;data.error="";paint();
   try{
     const result=isLocalPreview()?{trades:previewRows.slice(),canManage:true}:await call("read_vehicle_trades");
     if(actor!==uid()||gen!==generation||seq!==request)return;
     if(!Array.isArray(result?.trades)||!result.trades.every(validRow)||typeof result.canManage!=="boolean")throw Error("Invalid vehicle ledger response.");
     data.rows=result.trades;data.canManage=result.canManage;
     if(!data.draft&&data.page==="buying"&&data.canManage){data.draft=blank();seed=JSON.stringify(data.draft);}
   }catch(e){if(actor===uid()&&gen===generation&&seq===request){data.error=e.message;
     if(e.code==="42501"||/^PGRST30/.test(e.code||"")){data.canManage=false;data.rows=[];data.draft=null;pending=null;seed="";}
   }}
   finally{if(actor===uid()&&gen===generation&&seq===request){data.loading=false;paint();}}
 }
 function draw(c,target){
   sync();if(!allowed()){c.innerHTML='<div class="panel"><h2>Access Restricted</h2></div>';return;}
   data.page=target;
   if(target==="selling"&&!data.editingSale&&data.draft&&JSON.stringify(data.draft)===seed){data.draft=null;seed="";}
   c.innerHTML='<div id="vehicleTradingView"></div>';paint();return load();
 }
 async function canSwitch(){
   if(data.saving||data.uncertain)return false;capture();
   if(!data.draft||JSON.stringify(data.draft)===seed)return true;
   const actor=owner,gen=generation;
   const ok=await crmConfirm("Discard the unsaved vehicle details?","Unsaved vehicle details","Discard");
   return !!ok&&actor===uid()&&gen===generation&&!data.saving&&!data.uncertain;
 }
 async function select(id,sale){
   sync();if(!data.canManage||!await canSwitch())return;const r=data.rows.find(x=>x.id===id);if(!r)return;
   data.draft=draftOf(r);seed=JSON.stringify(data.draft);data.editingSale=!!sale;pending=null;data.errors={};data.error="";data.success="";data.conflict=false;
   const target=sale?"selling":"buying";if(page!==target)go(target);else paint();
 }
 async function newPurchase(){
   sync();if(!data.canManage||!await canSwitch())return;
   data.draft=blank();seed=JSON.stringify(data.draft);data.editingSale=false;pending=null;data.errors={};data.error="";data.conflict=false;data.success="";
   if(page!=="buying")go("buying");else paint();
 }
 async function cancelEdit(){
   sync();if(!await canSwitch())return;data.draft=null;seed="";pending=null;data.editingSale=false;data.errors={};data.conflict=false;data.error="";paint();
 }
 function setQuery(value){data.query=String(value);clearTimeout(searchTimer);searchTimer=setTimeout(()=>{capture();paint();},200);}
 async function save(){
   sync();if(!allowed()||!data.canManage||data.saving||data.conflict)return;
   if(!data.uncertain){
     capture();const checked=validate(data.draft,data.editingSale);data.errors=checked.errors;data.error="";
     if(Object.keys(checked.errors).length){paint();return;}
     pending={id:data.draft.id,version:data.draft.version,mutation:crypto.randomUUID(),payload:checked.payload};
   }
   if(!pending)return;const actor=owner,gen=generation,job=pending;
   request++;data.loading=false;data.saving=true;data.error="";paint();
   try{
     let result;
     if(isLocalPreview()){
       let r=previewRows.find(x=>x.id===job.id);
       if(r?._mutation!==job.mutation){r={...job.payload,...totals(job.payload),day:day(job.payload.purchaseDate),id:job.id,
         version:job.version+1,createdAt:r?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),_mutation:job.mutation};
         previewRows=[r,...previewRows.filter(x=>x.id!==job.id)];}result={trade:r,canManage:true};
     }else result=await call("save_vehicle_trade",{p_id:job.id,p_expected_version:job.version,p_mutation_id:job.mutation,p_trade:job.payload});
     if(actor!==uid()||gen!==generation)return;
     const r=result?.trade,expected=totals(job.payload);
     if(!validRow(r)||r.id!==job.id||r.version!==job.version+1||r.totalCost!==expected.totalCost||r.profit!==expected.profit)
       throw Error("The server did not confirm the complete vehicle save. Retry to confirm it.");
     request++;data.loading=false;
     data.rows=[r,...data.rows.filter(x=>x.id!==r.id)];data.success=r.soldFor===null?"Vehicle purchase saved.":"Vehicle sale saved. Profit / loss updated.";
     data.draft=null;seed="";pending=null;data.errors={};data.uncertain=false;data.editingSale=false;
   }catch(e){
     if(actor!==uid()||gen!==generation)return;
     data.error=e.message||"Vehicle details could not be saved.";data.conflict=e.code==="40001";
     data.uncertain=!data.conflict&&!e.definite&&!/^(22|23|42|P0001|PGRST30)/.test(e.code||"");
     if(!data.uncertain)pending=null;
   }finally{if(actor===uid()&&gen===generation){data.saving=false;paint();}}
 }
 async function recover(){
   sync();if(data.saving||data.uncertain)return;const id=data.draft?.id,sale=data.editingSale;
   if(!await canSwitch())return;data.draft=null;pending=null;seed="";data.conflict=false;data.editingSale=false;
   await load();const r=data.rows.find(x=>x.id===id);
   if(r&&data.canManage){data.draft=draftOf(r);data.editingSale=sale;seed=JSON.stringify(data.draft);}paint();
 }
 async function reload(){sync();if(data.saving||data.uncertain)return;capture();await load();}
 return {draw,state,update,save,edit:id=>select(id,false),recordSale:id=>select(id,true),newPurchase,cancelEdit,reload,recover,
   reset,setQuery,validate,totals,day,cents,isLocalPreview};
})();
