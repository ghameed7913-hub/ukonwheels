// Route native home shortcuts into the same authenticated Driver portal.
// Filtering stays inside the portal and always starts with driverAssignedRows.
export const DRIVER_NAVIGATION_BRIDGE = `
(function(root){
 if(root.__ukowDriverNavigation)return;
 root.__ukowDriverNavigation=true;
 let mode='assigned';
 const activeStatuses=new Set(['Picked Up','On Route','Delayed','Accident','Claims','Fault On Route','Assigned AA on Route']);
 let lastCounts='null';
 function publishCounts(){
  try{
   const app=root.document?.getElementById('app');
   const authenticated=app&&!app.classList.contains('hidden')&&typeof currentUser!=='undefined'&&currentUser&&typeof role!=='undefined'&&role==='driver';
   const rows=authenticated&&typeof driverAssignedRows==='function'?driverAssignedRows():null;
   const counts=rows?{assigned:rows.filter(b=>b.status==='Driver Assigned').length,active:rows.filter(b=>activeStatuses.has(b.status)).length,delivered:rows.filter(b=>b.status==='Delivered').length}:null;
   const signature=JSON.stringify(counts);
   if(signature!==lastCounts){
    lastCounts=signature;
    root.ReactNativeWebView?.postMessage(JSON.stringify({type:'driver-job-counts',counts}));
   }
  }catch(error){
   if(lastCounts!=='null'){lastCounts='null';root.ReactNativeWebView?.postMessage(JSON.stringify({type:'driver-job-counts',counts:null}));}
  }
 }
 const esc=value=>typeof escapeHtml==='function'?escapeHtml(String(value??'')):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function jobTabs(selected){
  const rows=driverAssignedRows();
  const counts={assigned:rows.filter(b=>b.status==='Driver Assigned').length,active:rows.filter(b=>activeStatuses.has(b.status)).length,delivered:rows.filter(b=>b.status==='Delivered').length};
  return '<div class="ukowJobTabs" role="tablist" aria-label="Job lists">'+
   [['assigned','Assigned jobs'],['active','Active jobs'],['delivered','Delivered']].map(([id,label])=>
    '<button type="button" role="tab" aria-controls="ukowJobPanel" aria-selected="'+(selected===id)+'" onclick="window.__ukowOpenDriverSection(\\''+id+'\\')">'+label+' <span>'+counts[id]+'</span></button>'
   ).join('')+'</div>';
 }
 root.__ukowOpenDriverSection=function(section){
  if(typeof role==='undefined'||role!=='driver'||typeof root.setDriverMobileTab!=='function')return;
  if(typeof driverPhotoIsSaving==='function'&&driverPhotoIsSaving())return;
  if(typeof IncidentUI!=='undefined'&&IncidentUI.isSaving?.()){
   root.setDriverMobileTab('jobs');return;
  }
  const next=section==='assigned'||section==='active'||section==='jobs'?'jobs':section==='delivered'?'history':section;
   if(!['jobs','history','companyId','tradePlate','payments','incidents','holidays','profile'].includes(next))return;
  if(section==='assigned'||section==='active'||section==='delivered'){
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
   style.textContent='.driverApp .driverBottomNav,.driverApp .driverSummary,.driverApp .driverProfileShortcut{display:none!important}body.driver-mode .driverApp{padding-bottom:env(safe-area-inset-bottom)!important}.ukowJobTabs{display:flex;gap:4px;background:#e1e8f0;padding:4px;border-radius:12px;margin:0 0 16px}.ukowJobTabs button{flex:1;min-width:0;min-height:54px;padding:8px 4px;border:0;border-radius:9px;background:transparent;color:#101833;font:600 12px system-ui;cursor:pointer}.ukowJobTabs button[aria-selected=true]{background:#0b2039;color:#fff}.ukowJobTabs span{display:block;font-size:16px;margin-top:4px}.ukowJobTabs button:focus-visible{outline:2px solid #e2131f;outline-offset:2px}';
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
    return jobTabs(mode==='active'?'active':'assigned')+'<div id="ukowJobPanel" role="tabpanel"><div class="driverSectionTitle"><h3 style="margin:0">'+title+'</h3><span class="driverPill">'+visible.length+'</span></div>'+
     (visible.length?'<p class="muted">Choose a vehicle to '+(mode==='active'?'continue its journey.':'start its pickup inspection.')+'</p><div class="driverJobList">'+
      visible.map(b=>'<button type="button" class="driverJobSelect" data-booking-ref="'+esc(b.ref)+'" onclick="openDriverJob(this.dataset.bookingRef)" aria-label="Open booking '+esc(b.ref)+'">'+
       '<span class="driverJobSelectTop"><span class="badge">'+esc(b.status)+'</span><span class="driverPill">'+esc(b.ref)+'</span></span>'+
       '<strong>'+esc(b.vehicle||'Vehicle')+' '+esc(b.reg||'')+'</strong>'+
       '<span class="driverJobRoute">'+esc(b.pickup||'Collection address not set')+' → '+esc(b.destination||'Delivery address not set')+'</span>'+
       '<span class="driverJobAction">'+(b.status==='Driver Assigned'?'Start pickup':b.status==='Picked Up'?'Start journey':'Continue delivery')+' →</span></button>').join('')+'</div>':
      '<div class="driverEmpty">'+(mode==='active'?'No jobs are in progress.':'No vehicles are awaiting pickup.')+'</div>')+'</div>';
   };
   wrapped.ukowHomeNavigation=true;root.drawDriverJobsMobile=wrapped;
  }
  if(typeof root.drawDriverHistoryMobile==='function'&&!root.drawDriverHistoryMobile.ukowHomeNavigation){
   const original=root.drawDriverHistoryMobile;
   const wrapped=function(){return jobTabs('delivered')+'<div id="ukowJobPanel" role="tabpanel">'+original.apply(this,arguments).replace('Delivered History','Delivered')+'</div>';};
   wrapped.ukowHomeNavigation=true;root.drawDriverHistoryMobile=wrapped;
  }
  if(typeof root.driverMobileNav==='function'&&!root.driverMobileNav.ukowHomeNavigation){
   const wrapped=function(){return '';};
   wrapped.ukowHomeNavigation=true;root.driverMobileNav=wrapped;
  }
 }
 install();publishCounts();setInterval(function(){install();publishCounts();},700);
})(window);`;
