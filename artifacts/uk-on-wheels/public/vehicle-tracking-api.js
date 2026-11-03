(function(root){
  "use strict";
  var uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function actor(){return typeof currentSession!=="undefined"?currentSession?.user?.id:null;}
  async function rpc(name,args){
    var id=actor();if(!id)throw Error("Sign in to use vehicle tracking.");
    if(typeof sb==="undefined")throw Error("Vehicle tracking is unavailable.");
    var result=await sb.rpc(name,args);
    if(id!==actor())throw Error("Your sign-in changed. Open tracking again.");
    if(result.error){
      if(["PGRST202","42883","42P01"].includes(result.error.code))
        throw Error("Vehicle tracking needs the Supabase setup: supabase/live-vehicle-tracking.sql.");
      throw Error(result.error.message||"Vehicle tracking could not be confirmed.");
    }
    return result.data;
  }
  function idCheck(id){if(typeof id!=="string"||!uuid.test(id))throw Error("Refresh the booking before tracking.");}
  root.VehicleTrackingAPI={
    async search(query){
      var text=String(query||"").trim();if(text.length>80)throw Error("Search is too long.");
      var data=await rpc("track_vehicle",{p_query:text||null});
      if(!Array.isArray(data?.bookings)||!Number.isFinite(Date.parse(data.server_time)))throw Error("Invalid tracking response.");
      data.bookings.forEach(function(b){
        idCheck(b.id);
        if(b.location){
          var l=b.location;
          if(!Number.isFinite(l.latitude)||Math.abs(l.latitude)>90||!Number.isFinite(l.longitude)||Math.abs(l.longitude)>180||
            !Number.isFinite(l.accuracy)||l.accuracy<0||!Number.isFinite(Date.parse(l.recorded_at))||!Number.isFinite(Date.parse(l.received_at)))
            throw Error("Invalid location received. Refresh tracking.");
        }
      });
      return data;
    },
    async start(id){
      idCheck(id);var data=await rpc("start_vehicle_tracking",{p_booking_id:id});
      if(data?.booking_id!==id||data.owner_id!==actor()||!/^[a-f0-9]{64}$/.test(data.token)||
        !Number.isFinite(Date.parse(data.expires_at)))throw Error("Location sharing was not confirmed.");
      // These are the existing public Supabase URL/key, never a user JWT.
      return {...data,endpoint:sb.supabaseUrl,anonKey:sb.supabaseKey};
    },
    async stop(id){idCheck(id);if(await rpc("stop_vehicle_tracking",{p_booking_id:id})!==true)throw Error("Stopping tracking was not confirmed.");},
    async driverStatus(){var data=await rpc("vehicle_tracking_driver_status");if(typeof data?.sharing!=="boolean")throw Error("Tracking status was not confirmed.");return data;},
    publish(session,position){
      return rpc("publish_vehicle_location",{p_token:session.token,p_latitude:position.coords.latitude,
        p_longitude:position.coords.longitude,p_accuracy:position.coords.accuracy,p_recorded_at:new Date(position.timestamp).toISOString()});
    }
  };
})(window);
