export const DRIVER_TRACKING_BRIDGE=`
(function(root){
 if(root.__ukowNativeTracking)return;
 const send=p=>root.ReactNativeWebView?.postMessage(JSON.stringify(p));
 root.__ukowSyncTrackingOwner=function(){
  const id=typeof currentSession!=='undefined'?currentSession?.user?.id:null;
  send({type:'tracking-owner',ownerId:id||null});
 };
 root.__ukowNativeTracking=function(command){
  root.__ukowSyncTrackingOwner();
  send({type:'tracking-command',...command});
 };
 let subscribed=false;
 setInterval(()=>{
  if(!subscribed&&typeof sb!=='undefined'&&sb.auth?.onAuthStateChange){
   subscribed=true;
   sb.auth.onAuthStateChange((event,data)=>{
    if(event==='SIGNED_OUT'||event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='USER_UPDATED')
     send({type:'tracking-owner',ownerId:data?.user?.id||null});
   });
  }
 },700);
})(window);
`;
