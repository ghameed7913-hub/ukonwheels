// Supabase auth remains inside the portal. Only the phone's push token crosses
// into it; no passwords, access tokens or refresh tokens leave the WebView.
export const DRIVER_PUSH_BRIDGE = `
(function(root){
 if(root.__ukowDriverPush)return;root.__ukowDriverPush=true;
 const send=p=>root.ReactNativeWebView?.postMessage(JSON.stringify(p));
 const driver=()=>typeof role!=='undefined'&&role==='driver'&&typeof currentSession!=='undefined'&&currentSession?.user?.id;
 let account=null;
 setInterval(()=>{
  const next=driver()||null;
  if(account!==next){account=next;send({type:'driver-push-session',signedIn:!!next});}
 },700);
 // Read the canonical instructions even before the web portal's next release.
 if(typeof root.normalizedBookingToPortal==='function'){
  const original=root.normalizedBookingToPortal;
  root.normalizedBookingToPortal=function(b,...rest){
   return {...original.call(this,b,...rest),...(b.driver_instructions!=null?{driverNotes:b.driver_instructions}:{})};
  };
 }
 if(typeof root.driverMobileJobCard==='function'){
  const original=root.driverMobileJobCard;
  root.driverMobileJobCard=function(b){
   const html=original.call(this,b);
   if(!b.driverNotes||html.includes('class="driverInstructions"'))return html;
   return html.replace('<details class="driverExtras">','<section class="driverInstructions"><h3>Driver instructions</h3><p style="white-space:pre-wrap">'+escapeHtml(b.driverNotes)+'</p></section><details class="driverExtras">');
  };
 }
 root.__ukowRegisterDriverPush=async function(input){
  if(!input||!/^\\d{1,10}$/.test(input.id)||!driver())return;
  const id=input.id;
  const user=currentSession.user.id;
  if(!/^(ExponentPushToken|ExpoPushToken)\\[[A-Za-z0-9_-]+\\]$/.test(input.token)||input.token.length>256||
   !['android','ios'].includes(input.platform)||input.projectId!=='e2493dec-778d-4129-9a50-2c6849bc1499')return;
  try{
   const r=await sb.rpc('register_driver_push',{p_token:input.token,p_platform:input.platform,p_project_id:input.projectId});
   if(r.error||r.data!==true)throw r.error||new Error('Not confirmed');
   if(driver()&&currentSession.user.id===user)send({type:'driver-push-registration',id,ok:true});
  }catch(e){
   send({type:'driver-push-registration',id,ok:false,error:'Could not connect notifications. Check the Supabase Driver notification setup and sign in again.'});
  }
 };
 root.__ukowOpenDriverNotification=async function(id){
  if(typeof id!=='string'||!/^[-a-f0-9]{36}$/i.test(id)||!driver())return;
  if((typeof driverPhotoIsSaving==='function'&&driverPhotoIsSaving())||
   (typeof IncidentUI!=='undefined'&&IncidentUI.isSaving?.())){
   send({type:'driver-push-open',id,ok:false,error:'Finish saving your photos or report before opening this notification.'});return;
  }
  try{
   const user=currentSession.user.id;
   const r=await sb.rpc('read_driver_push_notification',{p_id:id});
   if(r.error||!r.data||!driver()||currentSession.user.id!==user)throw new Error('Access unavailable');
   if(r.data.reference){
    await loadNormalizedPortalData();
    if(!driver()||currentSession.user.id!==user)throw new Error('Account changed');
    if(typeof sharedReadError!=='undefined'&&sharedReadError)throw new Error('Job refresh unavailable');
    const row=driverAssignedRows().find(b=>b.ref===r.data.reference);
    if(!row)throw new Error('Job not available');
    if(row.status==='Delivered')root.__ukowOpenDriverSection('delivered');
    else {setDriverMobileTab('jobs');openDriverJob(row.ref);}
   }
   if(r.data.message&&r.data.title!=='New job assigned')root.alert(String(r.data.message));
   send({type:'driver-push-open',id,ok:true});
  }catch(e){
   send({type:'driver-push-open',id,ok:false,error:'This notification is unavailable for the current Driver. The job may have been reassigned, or you may need to sign in again.'});
  }
 };
})(window);`;

export type PushRegistration = { token: string; platform: 'android' | 'ios'; projectId: string };
export function pushRegistrationScript(registration: PushRegistration, id: string) {
  return `window.__ukowRegisterDriverPush?.(${JSON.stringify({ ...registration, id })});true;`;
}
export function pushOpenScript(id: string) {
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) throw new Error('Invalid notification');
  return `window.__ukowOpenDriverNotification?.(${JSON.stringify(id)});true;`;
}
