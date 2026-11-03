// This bridge never reads/transmits passwords, sessions or account details.
// The existing portal remains responsible for auth, compliance and RLS.
import { NATIVE_EVIDENCE_BRIDGE } from './native-evidence';
import { INSPECTION_VALIDATION_BRIDGE } from './inspection-validation';
import { DRIVER_NAVIGATION_BRIDGE } from './driver-navigation';
import { DRIVER_PUSH_BRIDGE } from './push-bridge';
import { DRIVER_TRACKING_BRIDGE } from './tracking-bridge';
export const PORTAL_BRIDGE = `
(function(){
 if(window.__ukowNativeBridge)return true;
 window.__ukowNativeBridge=true;
 const send=payload=>window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
 // Android WebView cannot grant camera access until the host app has permission.
 const cameraRequests=new Map();
 let cameraSequence=0;
 window.__ukowCameraPermissionResult=function(id,granted){
  const pending=cameraRequests.get(id);
  if(!pending)return;
  clearTimeout(pending.timer);cameraRequests.delete(id);
  if(granted)pending.resolve();
  else pending.reject(new Error('Camera permission was not granted. Enable camera access for Expo Go in phone settings.'));
 };
 if(typeof navigator!=='undefined'&&navigator.mediaDevices?.getUserMedia){
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=async function(constraints){
   if(constraints?.video){
    await new Promise((resolve,reject)=>{
     const id=String(++cameraSequence);
     const timer=setTimeout(()=>{
      cameraRequests.delete(id);reject(new Error('Camera permission request timed out. Please try again.'));
     },60000);
     cameraRequests.set(id,{resolve,reject,timer});
     send({type:'camera-permission',id});
    });
   }
   return original(constraints);
  };
 }
 let ready=false,rejecting=false;
 setInterval(function(){
  try{
   const app=document.getElementById('app');
   const authenticated=app&&!app.classList.contains('hidden')&&typeof currentUser!=='undefined'&&currentUser;
   if(!authenticated){if(ready)send({type:'signed-out'});ready=false;rejecting=false;return;}
   if(typeof role!=='undefined'&&role!=='driver'){
    if(rejecting)return;
    rejecting=true;
    app.classList.add('hidden');
    if(typeof logoutNow==='function')logoutNow();
    send({type:'wrong-role'});return;
   }
   if(!ready&&typeof role!=='undefined'&&role==='driver'){
    ready=true;send({type:'driver-ready'});
   }
  }catch(e){}
 },700);
 const seen=new Set();
 function download(anchor){
  if(!anchor.download||!anchor.href.startsWith('blob:'))return false;
  if(seen.has(anchor.href))return true;
  seen.add(anchor.href);
  fetch(anchor.href).then(r=>r.blob()).then(blob=>{
   if(blob.type!=='application/pdf'||blob.size>25*1024*1024)
    throw Error('This download is not a PDF, or exceeds the 25 MB mobile limit.');
   const reader=new FileReader();
   reader.onload=()=>send({type:'pdf',name:anchor.download,data:reader.result});
   reader.onerror=()=>send({type:'download-error'});
   reader.readAsDataURL(blob);
  }).catch(()=>send({type:'download-error'}));
  return true;
 }
 const click=HTMLAnchorElement.prototype.click;
 HTMLAnchorElement.prototype.click=function(){if(!download(this))return click.apply(this,arguments);};
 const dispatch=HTMLAnchorElement.prototype.dispatchEvent;
 HTMLAnchorElement.prototype.dispatchEvent=function(event){
  if(event.type==='click'&&download(this))return true;
  return dispatch.apply(this,arguments);
 };
 return true;
})();
${NATIVE_EVIDENCE_BRIDGE}
${INSPECTION_VALIDATION_BRIDGE}
${DRIVER_NAVIGATION_BRIDGE}
${DRIVER_PUSH_BRIDGE}
${DRIVER_TRACKING_BRIDGE}
true;`;

export function sectionScript(section: string) {
  const allowed = ['jobs','assigned','active','delivered','companyId','tradePlate','payments','incidents','holidays','history','profile'];
  if (!allowed.includes(section)) throw new Error('Unknown Driver section');
  const legacy = section === 'delivered' ? 'history' : ['assigned','active'].includes(section) ? 'jobs' : section;
  return `if(typeof role!=='undefined'&&role==='driver'){if(typeof window.__ukowOpenDriverSection==='function'){window.__ukowOpenDriverSection(${JSON.stringify(section)});}else if(typeof setDriverMobileTab==='function'){setDriverMobileTab(${JSON.stringify(legacy)});}}true;`;
}

// Use the portal's own logout flow so its in-progress-save guards and
// session cleanup also apply to the native button.
export const LOGOUT_SCRIPT = `
(async function(){
 const send=payload=>window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
 try{
  if(typeof logoutNow!=='function')throw Error('Portal is not ready. Please wait and try again.');
  await logoutNow();
 }catch(error){
  send({type:'logout-error',message:'Sign out could not be completed. Check your connection and try again.'});
 }
})();true;`;
