(function(root){
  "use strict";
  var session=null,owner="",watch=null,timer=null,generation=0,error="",busy=false,lastSend=0,uploading=false;
  var nativeState={sharing:false},pending=new Map(),sequence=0,mode="Browser · keep this page open";
  function actor(){try{return role==="driver"?currentSession?.user?.id||"":"";}catch(_){return "";}}
  function emit(){root.dispatchEvent(new Event("driver-tracking-change"));}
  function native(){return typeof root.__ukowNativeTracking==="function";}
  function command(action,extra){
    return new Promise(function(resolve,reject){
      var id=String(++sequence),timeout=setTimeout(function(){pending.delete(id);reject(Error("The phone did not confirm tracking. Try again."));},180000);
      pending.set(id,{resolve:resolve,reject:reject,timeout:timeout});
      root.__ukowNativeTracking({id:id,action:action,...extra});
    });
  }
  root.__ukowNativeTrackingReply=function(id,result){
    var task=pending.get(id);if(!task)return;
    pending.delete(id);clearTimeout(task.timeout);
    if(result?.ok===false)task.reject(Error(result.error||"The phone could not confirm tracking."));else task.resolve(result);
  };
  function stopWatch(){
    if(watch!==null)navigator.geolocation?.clearWatch(watch);
    watch=null;session=null;lastSend=0;uploading=false;
  }
  async function refresh(){
    var a=actor(),g=generation;if(!a||busy||uploading)return;
    try{
      var result=await root.VehicleTrackingAPI.driverStatus();
      if(g!==generation||a!==actor())return;
      if(native()){
        var state=await command("status");
        if(g!==generation||a!==actor())return;
        nativeState=state;
        // Reassignment, delivery, expiry or HR blocks stop the physical GPS task too.
        if(state.sharing&&(!result.sharing||result.booking_id!==state.bookingId)){
          await command("stop");nativeState={sharing:false};
        }
      }else if(session&&(!result.sharing||result.booking_id!==session.booking_id))stopWatch();
      emit();
    }catch(e){if(g===generation&&a===actor()){error=e.message;emit();}}
  }
  function init(){
    var a=actor();if(!a)return;
    if(owner&&owner!==a)reset();
    owner=a;
    if(!timer){timer=setInterval(refresh,30000);void refresh();}
  }
  async function start(id){
    init();if(busy)throw Error("Please wait for the current tracking request.");
    if(!actor())throw Error("Sign in as the assigned Driver.");
    busy=true;error="";var a=actor(),g=++generation,s=null;
    try{
      if(!native()&&!navigator.geolocation)throw Error("Location is not supported on this device.");
      if(!native()&&!root.confirm("Browser tracking stops when this page closes or the phone locks. For background tracking, use the updated installed Driver app. Start browser sharing now?"))return;
      s=await root.VehicleTrackingAPI.start(id);
      if(g!==generation||a!==actor())throw Error("Your sign-in changed. Tracking was cancelled.");
      stopWatch();
      if(native()){
        nativeState=await command("start",{session:s});mode="Background app tracking";
        if(g!==generation||a!==actor()){await command("stop").catch(()=>{});throw Error("Tracking was cancelled.");}
      }else{
        session=s;mode="Browser · keep this page open";
        watch=navigator.geolocation.watchPosition(async function(position){
          if(!session||session.token!==s.token||g!==generation||a!==actor()||uploading||Date.now()-lastSend<15000)return;
          lastSend=Date.now();uploading=true;
          try{
            var result=await root.VehicleTrackingAPI.publish(s,position);
            if(g!==generation||a!==actor())return;
            if(!result?.active){stopWatch();error="Sharing ended. Check that this vehicle is still assigned to you and undelivered.";}
            else error="";
          }catch(e){if(g===generation)error="Location update failed: "+e.message;}
          finally{if(g===generation){uploading=false;emit();}}
        },function(e){if(g===generation){
          error="Location unavailable. Allow precise location and check phone settings.";
          if(e.code===1){stopWatch();void root.VehicleTrackingAPI.stop(id).catch(function(){});}
          emit();
        }},
        {enableHighAccuracy:true,maximumAge:0,timeout:20000});
      }
      emit();
    }catch(e){
      if(g===generation){stopWatch();nativeState={sharing:false};error=e.message;}
      // Revoke the scoped capability even if logout or a native timeout happened.
      if(s)void closeCapability(s);
      throw e;
    }finally{if(g===generation)busy=false;emit();}
  }
  async function closeCapability(s){
    try{await fetch(s.endpoint.replace(/\/$/,"")+"/rest/v1/rpc/close_vehicle_tracking",{
      method:"POST",headers:{"Content-Type":"application/json",apikey:s.anonKey},body:JSON.stringify({p_token:s.token}),keepalive:true});}catch(_){}
  }
  async function stop(id){
    if(busy)throw Error("Wait for the tracking request to finish.");
    busy=true;var g=++generation;
    try{
      stopWatch();
      var nativeError=null;
      if(native()){
        try{await command("stop");}catch(e){nativeError=e;}
        nativeState={sharing:false};
      }
      await root.VehicleTrackingAPI.stop(id);
      error=nativeError?"Server sharing has stopped. Check that the phone's location indicator has stopped too.":"";
    }catch(e){error="Tracking stopped on this device but server confirmation failed: "+e.message;throw Error(error);}
    finally{if(g===generation)busy=false;emit();}
  }
  function reset(){
    var old=session;++generation;stopWatch();
    if(timer)clearInterval(timer);timer=null;owner="";busy=false;nativeState={sharing:false};error="";
    if(old)void closeCapability(old);
    if(native())void command("stop").catch(()=>{});
    emit();
  }
  root.DriverTracking={
    init:init,start:start,stop:stop,reset:reset,
    status:function(id){
      var state=native()?nativeState:{sharing:!!session,bookingId:session?.booking_id};
      return {sharing:!!actor()&&!!state.sharing&&state.bookingId===id,error:error||state.error||"",mode:mode};
    }
  };
  root.addEventListener("focus",refresh);
  root.addEventListener("pagehide",function(){if(!native()){var old=session;stopWatch();if(old)void closeCapability(old);}});
})(window);
