/* Payroll mutations are atomic on the existing Supabase operations store. */
window.PayrollPayments=(()=>{
  let owner=null;
  const versions=new Map();
  function actor(){
    if(!SUPABASE_CONFIGURED||!currentSession?.user?.id)throw Error("Sign in to use payslip payments.");
    const id=currentSession.user.id;if(owner!==id){versions.clear();owner=id;}return id;
  }
  async function call(name,args){
    const id=actor(),r=await sb.rpc(name,args);
    if(currentSession?.user?.id!==id)throw Error("Your sign-in changed. Reload payroll before continuing.");
    if(r.error){
      if(["PGRST202","42883"].includes(r.error.code))throw Error("Payslip payments need setup. Ask Admin to run supabase/payslip-payments.sql.");
      throw Error(r.error.message||"Payslip changes could not be saved.");
    }
    if(!r.data||!Array.isArray(r.data.expenses)||(r.data.payslips!==null&&!Array.isArray(r.data.payslips)))throw Error("Invalid payroll response.");
    for(const p of r.data.payslips||[])versions.set(p.id,Number(p.paymentVersion||0));
    return r.data;
  }
  function expense(p){
    if(!Number.isFinite(p.net)||p.net<0)throw Error("A payslip with a negative balance cannot be marked Paid.");
    if(!String(p.role||"").trim()||String(p.role).trim().toLowerCase()==="client")throw Error("A valid employee role is required.");
    return {id:"PAY-EXP-"+p.id,source:"payslip",payslipId:p.id,date:new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London"}).format(new Date()),
      category:String(p.role).trim().toLowerCase()==="driver"?"Wages":"Salary",amount:p.net,method:"Not recorded",
      reference:p.id,payee:p.name,notes:"Paid payslip for "+p.month+" (net after tax and advances)"};
  }
  return {
    status:p=>p.paymentStatus==="Paid"?"Paid":"Unpaid",
    expense,
    read:()=>call("read_payroll_finances"),
    create:(p,status)=>call("create_portal_payslip",{p_payslip:p,p_status:status}),
    setStatus(id,status){actor();if(!versions.has(id))throw Error("Refresh payslips before changing payment status.");
      return call("set_payslip_payment_status",{p_id:id,p_status:status,p_expected_version:versions.get(id)});},
    reset(){owner=null;versions.clear();}
  };
})();
