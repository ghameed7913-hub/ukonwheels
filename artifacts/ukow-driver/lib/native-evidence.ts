// Runs inside the trusted portal. Auth and storage writes stay in the portal;
// only a freshly captured photo and its location cross the native bridge.
export const NATIVE_EVIDENCE_BRIDGE = `
(function(){
 if(window.__ukowNativeEvidenceInstalled)return;
 window.__ukowNativeEvidenceInstalled=true;
 const photos=new Map(),pending=new Map();
 let sequence=0;
 const key=(kind,ref,id)=>JSON.stringify([kind,ref,String(id)]);
 const statusFor=(kind,ref,id)=>document.getElementById((kind==='pickup'?'s_':'ds_')+ref+'_'+id);
 const saving=()=>typeof pickupChecklistSaves!=='undefined'&&pickupChecklistSaves.size;
 const driver=()=>typeof role!=='undefined'&&role==='driver'&&typeof currentUser!=='undefined'&&!!currentUser;
 const say=(status,text,error)=>{
  status.textContent=text;status.classList.toggle('error',!!error);
 };
 function open(kind,ref,id){
  if(!driver()||saving())return;
  const status=statusFor(kind,ref,id);
  if(!status||status.dataset.nativeBusy==='1')return;
  const requestId=String(++sequence),k=key(kind,ref,id);
  if(pending.size)return;
  const button=status.closest('.cameraBox')?.querySelector('.camActions .primary');
  if(button?.disabled)return;
  if(button)button.disabled=true;
  status.dataset.nativeBusy='1';
  say(status,'Opening phone camera…',false);
  const timer=setTimeout(()=>{
   pending.delete(requestId);delete status.dataset.nativeBusy;
   if(button)button.disabled=false;
   say(status,'Camera did not respond. Tap Open Camera to try again.',true);
  },180000);
  pending.set(requestId,{kind,ref,id,k,status,timer,button});
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'take-evidence-photo',id:requestId}));
 }
 window.__ukowNativeEvidenceResult=async function(result){
  const request=pending.get(result.id);
  if(!request)return;
  pending.delete(result.id);clearTimeout(request.timer);
  const {kind,ref,id,k,status,button}=request;
  delete status.dataset.nativeBusy;
  if(button)button.disabled=false;
  if(!driver()||statusFor(kind,ref,id)!==status)return;
  if(result.cancelled){
   say(status,photos.has(k)?'Photo ready — tap Capture & Store.':status.dataset.captured==='1'?'Previous photo is still stored.':'Camera cancelled — no new photo saved.',false);
   return;
  }
  if(result.error){say(status,result.error,true);return;}
  try{
   if(typeof result.image!=='string'||!/^data:image\\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(result.image)||result.image.length>16000000)
    throw Error('The camera photo is invalid or too large. Please retake it.');
   if(!Number.isFinite(result.latitude)||Math.abs(result.latitude)>90||
      !Number.isFinite(result.longitude)||Math.abs(result.longitude)>180||
      !Number.isFinite(result.accuracy)||result.accuracy<0||!Number.isFinite(Date.parse(result.timestamp)))
    throw Error('Photo location is missing. Enable location and retake the picture.');
   const image=new Image();
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Photo could not be opened. Please retake it.'));image.src=result.image;});
   if(statusFor(kind,ref,id)!==status||!driver())return;
   photos.set(k,{...result,image,status});
   const box=status.closest('.cameraBox'),preview=box?.querySelector('.cameraPreview');
   box?.classList.add('camera-active');
   box?.classList.remove('preview-open');
   box?.querySelectorAll('video').forEach(video=>{if(video.srcObject)video.srcObject.getTracks().forEach(t=>t.stop());video.srcObject=null;video.style.display='none';});
   let photo=box?.querySelector('.nativeCameraPreview');
   if(!photo&&preview){photo=document.createElement('img');photo.className='nativeCameraPreview';photo.alt='New camera photo — not stored yet';photo.style.cssText='display:block;width:100%;max-height:360px;object-fit:contain';preview.prepend(photo);}
   if(photo)photo.src=result.image;
   say(status,'Photo ready — tap Capture & Store to upload it.',false);
  }catch(error){say(status,error.message,true);}
 };
 async function store(kind,ref,id){
  if(!driver()||saving())return;
  const k=key(kind,ref,id),photo=photos.get(k),status=statusFor(kind,ref,id);
  if(!status)return;
  if(!photo||photo.status!==status){say(status,'Tap Open Camera and take a photo first.',true);return;}
  const box=status.closest('.cameraBox'),button=box?.querySelector('.camActions .primary');
  if(!button||button.disabled||status.dataset.nativeBusy==='1')return;
  button.disabled=true;status.dataset.nativeBusy='1';
  const previous=status.dataset.captured;
  try{
   say(status,'Uploading photo to secure booking storage…',false);
   const state=getStore(),booking=state.bookings.find(b=>b.ref===ref);
   if(!booking?._normalizedId)throw Error('This booking is not linked to secure storage. Refresh your jobs.');
   const canvas=document.getElementById((kind==='pickup'?'c_':'dcv_')+ref+'_'+id);
   if(!canvas)throw Error('Photo area changed. Return to this job and retake the photo.');
   const scale=Math.min(1,1280/photo.image.naturalWidth,960/photo.image.naturalHeight);
   canvas.width=Math.max(1,Math.round(photo.image.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(photo.image.naturalHeight*scale));
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error('Photo could not be prepared.');
   ctx.drawImage(photo.image,0,0,canvas.width,canvas.height);
   const now=new Date(photo.timestamp),dateText=now.toLocaleDateString('en-GB'),timeText=now.toLocaleTimeString('en-GB',{hour12:false});
   const locationText='GPS: '+photo.latitude.toFixed(6)+', '+photo.longitude.toFixed(6)+' ±'+Math.round(photo.accuracy)+'m';
   const font=Math.max(18,Math.round(canvas.width/45)),pad=14,line=Math.round(font*1.35),strip=line*3+pad*2;
   ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,canvas.height-strip,canvas.width,strip);
   ctx.fillStyle='#fff';ctx.font='bold '+font+'px Arial';
   ctx.fillText('UK ON WHEELS — '+kind.toUpperCase()+' CAMERA EVIDENCE',pad,canvas.height-strip+pad+font);
   ctx.font=font+'px Arial';
   ctx.fillText(dateText+' '+timeText,pad,canvas.height-strip+pad+font+line);
   ctx.fillText(locationText,pad,canvas.height-strip+pad+font+line*2);
   const label=box.querySelector('.cameraAreaTab span')?.textContent||String(id);
   const storagePath=await uploadBookingEvidence(booking,canvas,kind,label,photo.latitude,photo.longitude,photo.accuracy,photo.timestamp);
   if(!storagePath)throw Error('Storage did not confirm this photo. Please try again.');
   const image=canvas.toDataURL('image/jpeg',0.55),field=kind==='pickup'?'pickupPhotos':'deliveryPhotos';
   booking[field]=booking[field]||{};
   booking[field][String(id)]={image,storagePath,timestamp:photo.timestamp,dateText,timeText,latitude:photo.latitude,longitude:photo.longitude,accuracy:photo.accuracy,label};
   status.dataset.timestamp=photo.timestamp;status.dataset.latitude=photo.latitude;
   status.dataset.longitude=photo.longitude;status.dataset.accuracy=photo.accuracy;
   updateEvidencePreview(status,image,label,dateText,timeText,locationText);
   box.querySelector('.nativeCameraPreview')?.remove();
   box.classList.remove('camera-active');
   photos.delete(k);
   window.UKOWInspectionValidation?.refresh(ref);
  }catch(error){
   status.dataset.captured=previous||'';
   say(status,'Photo was not stored: '+error.message+'. You can retry Capture & Store.',true);
  }finally{button.disabled=false;delete status.dataset.nativeBusy;}
 }
 function install(){
  if(typeof startCamera!=='function'||typeof captureCamera!=='function')return;
  window.startCamera=(ref,id)=>open('pickup',ref,id);
  window.captureCamera=(ref,id)=>store('pickup',ref,id);
  if(typeof startDeliveryCamera==='function')window.startDeliveryCamera=(ref,id)=>open('delivery',ref,id);
  if(typeof captureDeliveryCamera==='function')window.captureDeliveryCamera=(ref,id)=>store('delivery',ref,id);
 }
 install();
 setInterval(()=>{
  install();
  for(const [k,photo] of photos)if(!driver()||!photo.status.isConnected)photos.delete(k);
 },700);
})();`;
