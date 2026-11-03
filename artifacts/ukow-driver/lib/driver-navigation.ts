// Route native home shortcuts into the same authenticated Driver portal.
// Filtering stays inside the portal and always starts with driverAssignedRows.
export const DRIVER_NAVIGATION_BRIDGE = `
(function(root){
 if(root.__ukowDriverNavigation)return;
 root.__ukowDriverNavigation=true;
 let mode='assigned';
 const activeStatuses=new Set(['Picked Up','On Route','Delayed','Accident','Claims','Fault On Route','Assigned AA on Route']);
 const esc=value=>typeof escapeHtml==='function'?escapeHtml(String(value??'')):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 root.__ukowOpenDriverSection=function(section){
  if(typeof role==='undefined'||role!=='driver'||typeof root.setDriverMobileTab!=='function')return;
  if(typeof driverPhotoIsSaving==='function'&&driverPhotoIsSaving())return;
  if(typeof IncidentUI!=='undefined'&&IncidentUI.isSaving?.()){
   root.setDriverMobileTab('jobs');return;
  }
  const next=section==='assigned'||section==='active'||section==='jobs'?'jobs':section==='delivered'?'history':section;
   if(!['jobs','history','companyId','tradePlate','payments','incidents','holidays','profile'].includes(next))return;
  if(section==='assigned'||section==='active'){
   // A native home shortcut must open its list, not a previously selected job.
   // Snapshot its unfinished answers before changing the portal's selection.
   if(typeof driverSelectedJobRef!=='undefined'&&driverSelectedJobRef){
    if(typeof saveDriverFormDraft==='function')saveDriverFormDraft();
    driverSelectedJobRef=null;
   }
   mode=section;
  }
  root.setDriverMobileTab(next);
 };
 function install(){
  // The native Home screen owns cross-section navigation. Apply CSS as well
  // as suppressing future nav rendering, including an already-rendered page.
  const doc=root.document;
  if(doc?.head&&!doc.getElementById('ukowNativeSectionLayout')){
   const style=doc.createElement('style');style.id='ukowNativeSectionLayout';
   style.textContent='.driverApp .driverBottomNav,.driverApp .driverSummary,.driverApp .driverProfileShortcut{display:none!important}body.driver-mode .driverApp{padding-bottom:env(safe-area-inset-bottom)!important}';
   doc.head.appendChild(style);
  }
  if(typeof root.drawDriverJobsMobile==='function'&&!root.drawDriverJobsMobile.ukowHomeNavigation){
   const original=root.drawDriverJobsMobile;
   const wrapped=function(){
    const rows=driverAssignedRows();
    // Keep the existing working-job page, draft protection and camera/save flow.
    if(typeof driverSelectedJobRef!=='undefined'&&rows.some(b=>b.ref===driverSelectedJobRef&&b.status!=='Delivered')){
     const working=rows.find(b=>b.ref===driverSelectedJobRef);
     mode=working.status==='Driver Assigned'?'assigned':'active';
     return original.apply(this,arguments);
    }
    const assigned=rows.filter(b=>b.status==='Driver Assigned');
    const active=rows.filter(b=>activeStatuses.has(b.status));
    const visible=mode==='active'?active:assigned;
    const title=mode==='active'?'Active Jobs':'Assigned Jobs';
    return '<div class="driverSectionTitle"><h3 style="margin:0">'+title+'</h3><span class="driverPill">'+visible.length+'</span></div>'+
     (visible.length?'<p class="muted">Choose a vehicle to '+(mode==='active'?'continue its journey.':'start its pickup inspection.')+'</p><div class="driverJobList">'+
      visible.map(b=>'<button type="button" class="driverJobSelect" data-booking-ref="'+esc(b.ref)+'" onclick="openDriverJob(this.dataset.bookingRef)" aria-label="Open booking '+esc(b.ref)+'">'+
       '<span class="driverJobSelectTop"><span class="badge">'+esc(b.status)+'</span><span class="driverPill">'+esc(b.ref)+'</span></span>'+
       '<strong>'+esc(b.vehicle||'Vehicle')+' '+esc(b.reg||'')+'</strong>'+
       '<span class="driverJobRoute">'+esc(b.pickup||'Collection address not set')+' → '+esc(b.destination||'Delivery address not set')+'</span>'+
       '<span class="driverJobAction">'+(b.status==='Driver Assigned'?'Start pickup':b.status==='Picked Up'?'Start journey':'Continue delivery')+' →</span></button>').join('')+'</div>':
      '<div class="driverEmpty">'+(mode==='active'?'No jobs are in progress.':'No vehicles are awaiting pickup.')+'</div>');
   };
   wrapped.ukowHomeNavigation=true;root.drawDriverJobsMobile=wrapped;
  }
  if(typeof root.drawDriverHistoryMobile==='function'&&!root.drawDriverHistoryMobile.ukowHomeNavigation){
   const original=root.drawDriverHistoryMobile;
   const wrapped=function(){return original.apply(this,arguments).replace('Delivered History','Delivered');};
   wrapped.ukowHomeNavigation=true;root.drawDriverHistoryMobile=wrapped;
  }
  if(typeof root.driverMobileNav==='function'&&!root.driverMobileNav.ukowHomeNavigation){
   const wrapped=function(){return '';};
   wrapped.ukowHomeNavigation=true;root.driverMobileNav=wrapped;
  }
 }
 install();setInterval(install,700);
})(window);`;
