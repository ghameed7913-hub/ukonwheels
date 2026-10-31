/* Shared expense types are stored in Supabase, not in this browser. */
window.ExpenseTypes=(()=>{
 const defaults=["Wages","Salary","Fuel","Rent","Office","Entertainment","Utility Bills","Rider Fuel","Staff Fuel","Hotel Expense","Vehicle Recovery Expenses","Insurance","Other Expenses"];
 let owner=null,version=0,custom=[],loading=false,saving=false,message="",failed=false;
 const uid=()=>typeof currentSession==="undefined"?null:currentSession?.user?.id;
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function reset(){owner=uid();version++;custom=[];loading=false;saving=false;message="";failed=false;}
 function sync(){if(owner!==uid())reset();}
 function list(){sync();return [...defaults,...custom.filter(name=>!defaults.includes(name))];}
 function canManage(){return window.ExpenseBulk?.state().canManage===true;}
 function paint(){
  if(typeof document==="undefined")return;
  const names=list();
  document.querySelectorAll('#exCat,select[data-bulk-field="category"]').forEach(select=>{
   const value=select.value;
   select.innerHTML='<option value="">Select expense type</option>'+names.map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join("");
   select.value=value;
  });
  const status=document.getElementById("expenseTypeStatus");
  if(status){status.textContent=message;status.setAttribute("role",failed?"alert":"status");}
  const button=document.getElementById("expenseTypeSave");
  if(button){button.disabled=loading||saving||!canManage();button.textContent=saving?"Saving type…":"Save expense type";}
  const input=document.getElementById("expenseTypeName");if(input)input.disabled=saving||!canManage();
  window.ExpenseReport?.paint();
 }
 function failure(error){
  return ["PGRST202","42P01","42883"].includes(error?.code)
   ?"Custom expense types need the Supabase setup: supabase/expense-types.sql. Your entry has been kept."
   :error?.message||"Expense types could not be loaded. Your entry has been kept.";
 }
 async function read(){
  sync();const actor=uid(),v=version;if(!actor||saving||loading)return;
  loading=true;message="Loading saved expense types…";failed=false;paint();
  try{
   // Local preview demonstrates controls only; it never claims a database save.
   if(window.ExpenseBulk?.isLocalPreview()){message="Preview only. Sign in to save expense types.";return;}
   const {data,error}=await sb.rpc("read_expense_types");
   if(error)throw error;
   if(!Array.isArray(data)||!data.every(x=>typeof x==="string"))throw Error("Invalid expense-type response.");
   if(actor!==uid()||v!==version)return;
   custom=data;message="";
  }catch(error){if(actor===uid()&&v===version){message=failure(error);failed=true;}}
  finally{if(actor===uid()&&v===version){loading=false;paint();}}
 }
 async function save(){
  sync();if(loading||saving||!canManage())return;
  const input=document.getElementById("expenseTypeName"),name=String(input?.value||"").trim().replace(/\s+/g," ");
  if(!name||name.length>80||/[\u0000-\u001f\u007f]/.test(name)){
   message="Enter an expense type between 1 and 80 characters.";failed=true;paint();return;
  }
  if(window.ExpenseBulk?.isLocalPreview()){message="Preview only. Sign in to save expense types.";failed=true;paint();return;}
  const actor=uid(),v=version;saving=true;message="";failed=false;paint();
  try{
   const {data,error}=await sb.rpc("add_expense_type",{p_name:name});
   if(error)throw error;
   if(!Array.isArray(data)||!data.every(x=>typeof x==="string"))throw Error("Save could not be confirmed. Retry to check the saved type.");
   if(actor!==uid()||v!==version)return;
   custom=data;input.value="";message="Expense type saved and available in the list.";
  }catch(error){if(actor===uid()&&v===version){message=failure(error);failed=true;}}
  finally{if(actor===uid()&&v===version){saving=false;paint();}}
 }
 if(window.addEventListener)window.addEventListener("focus",()=>{
  if(typeof page!=="undefined"&&page==="expenses"&&!saving)read();
 });
 return {list,read,save,paint,reset};
})();
