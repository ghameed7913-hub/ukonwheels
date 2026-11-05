import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

const TASK='ukow-delivery-location-v1',KEY='ukow-delivery-tracking-v1';
export type TrackingSession={
  token:string;booking_id:string;reference:string;owner_id:string;
  expires_at:string;endpoint:string;anonKey:string;
};
let session:TrackingSession|null=null,loaded=false,generation=0,lastError='';
let observedOwner:string|null|undefined;
let queue:Promise<unknown>=Promise.resolve();
const options={keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validTrackingSession(value:unknown):value is TrackingSession {
  if(!value||typeof value!=='object')return false;
  const s=value as TrackingSession;
  try{
    const url=new URL(s.endpoint);
    return /^[a-f0-9]{64}$/.test(s.token)&&uuid.test(s.booking_id)&&uuid.test(s.owner_id)&&
      typeof s.reference==='string'&&s.reference.length<=100&&
      Number.isFinite(Date.parse(s.expires_at))&&Date.parse(s.expires_at)>Date.now()&&
      url.protocol==='https:'&&/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)&&
      !url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&['','/'].includes(url.pathname)&&
      typeof s.anonKey==='string'&&s.anonKey.length>0&&s.anonKey.length<=4096;
  }catch{return false;}
}
function serial<T>(action:()=>Promise<T>):Promise<T>{
  const result=queue.then(action,action);queue=result.catch(()=>{});return result;
}
async function load(){
  if(!loaded){
    const raw=await SecureStore.getItemAsync(KEY,options);
    try{const parsed=raw?JSON.parse(raw):null;session=validTrackingSession(parsed)?parsed:null;}
    catch{session=null;}
    loaded=true;
    if(raw&&!session)await SecureStore.deleteItemAsync(KEY,options);
  }
  return session;
}
async function request(s:TrackingSession,name:string,args:Record<string,unknown>){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const result=await fetch(s.endpoint.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{
      method:'POST',headers:{'Content-Type':'application/json',apikey:s.anonKey},
      body:JSON.stringify(args),signal:controller.signal,
    });
    if(!result.ok)throw Error('Tracking could not reach the server. Check your internet connection and tracking setup.');
    return await result.json();
  }finally{clearTimeout(timer);}
}
async function clearDevice(){
  try {
    if(await Location.hasStartedLocationUpdatesAsync(TASK))await Location.stopLocationUpdatesAsync(TASK);
  } finally {
    session=null;loaded=true;lastError='';
    await SecureStore.deleteItemAsync(KEY,options);
  }
}
async function close(s:TrackingSession){await request(s,'close_vehicle_tracking',{p_token:s.token});}
function status(){
  return {sharing:!!session,bookingId:session?.booking_id,reference:session?.reference,
    mode:'Background app tracking',error:lastError||undefined};
}
async function publish(position:Location.LocationObject){
  const s=await load();if(!s){await clearDevice();return;}
  if(!validTrackingSession(s)){await clearDevice();return;}
  const foreground=await Location.getForegroundPermissionsAsync();
  const background=await Location.getBackgroundPermissionsAsync();
  if(!foreground.granted||!background.granted){
    try { await clearDevice(); } finally { await close(s).catch(()=>{}); }
    return;
  }
  try{
    const result=await request(s,'publish_vehicle_location',{p_token:s.token,
      p_latitude:position.coords.latitude,p_longitude:position.coords.longitude,
      p_accuracy:position.coords.accuracy,p_recorded_at:new Date(position.timestamp).toISOString()});
    if(typeof result?.active!=='boolean')throw Error('Tracking was not confirmed by the server.');
    if(!result.active){await clearDevice();return;}
    lastError='';
  }catch{
    // No offline history or backlog: only the next fresh GPS fix is sent.
    lastError='Location updates are not reaching the server. Check signal and internet; tracking will retry.';
  }
}
if(!TaskManager.isTaskDefined(TASK))TaskManager.defineTask<{locations:Location.LocationObject[]}>(TASK,async({data,error})=>{
  await serial(async()=>{
    if(error){lastError='The phone could not obtain location. Check location permissions and battery settings.';return;}
    const locations=data?.locations;
    if(locations?.length){
      const latest=locations.reduce((a,b)=>a.timestamp>b.timestamp?a:b);
      await publish(latest);
    }
  });
});
export async function startNativeTracking(input:unknown){
  if(!validTrackingSession(input))throw Error('Tracking configuration is invalid. Refresh your job.');
  const s=input,g=++generation;
  return serial(async()=>{
    if(Platform.OS==='web'||Constants.executionEnvironment==='storeClient'||!await TaskManager.isAvailableAsync())
      throw Error('Background tracking needs the updated installed Driver app, not Expo Go or a browser.');
    const old=await load();
    await clearDevice();
    if(old)await close(old).catch(()=>{}); // The signed-in start RPC already revoked older sessions.
    const foreground=await Location.requestForegroundPermissionsAsync();
    if(!foreground.granted)throw Error('Allow precise location access to share your assigned vehicle location.');
    if(g!==generation)throw Error('Tracking was cancelled because your account changed.');
    if(!(await Location.getBackgroundPermissionsAsync()).granted){
      const allowed=await new Promise<boolean>(resolve=>Alert.alert('Delivery location sharing',
        'To keep sharing this vehicle with Admin and its Client when the phone is locked, choose Allow all the time / Always on the next screen. Sharing ends after delivery. You can stop it in the job.',
        [{text:'Cancel',style:'cancel',onPress:()=>resolve(false)},{text:'Continue',onPress:()=>resolve(true)}],
        {cancelable:true,onDismiss:()=>resolve(false)}));
      if(!allowed)throw Error('Background sharing was cancelled.');
    }
    const background=await Location.requestBackgroundPermissionsAsync();
    if(!background.granted)throw Error('Allow location all the time / Always to keep sharing when the phone is locked.');
    if(g!==generation)throw Error('Tracking was cancelled because your account or delivery changed.');
    if(!await Location.hasServicesEnabledAsync())throw Error('Turn on phone Location Services, then start sharing again.');
    session=s;loaded=true;
    try{
      await SecureStore.setItemAsync(KEY,JSON.stringify(s),options);
      await Location.startLocationUpdatesAsync(TASK,{
        accuracy:Location.Accuracy.High,timeInterval:15000,distanceInterval:0,
        deferredUpdatesInterval:15000,pausesUpdatesAutomatically:false,
        activityType:Location.ActivityType.AutomotiveNavigation,showsBackgroundLocationIndicator:true,
        foregroundService:{notificationTitle:'UK On Wheels delivery tracking',
          notificationBody:'Sharing location for '+s.reference+'. Stop sharing in your assigned job.',
          killServiceOnDestroy:false},
      });
      if(g!==generation){await clearDevice();throw Error('Tracking was cancelled.');}
      // Do not hold up the sharing control while the first GPS fix is acquired.
      void Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High})
        .then(p=>serial(async()=>{if(session?.token===s.token)await publish(p);})).catch(()=>{});
      return status();
    }catch(error){
      await clearDevice();await close(s).catch(()=>{});throw error;
    }
  });
}
export function stopNativeTracking(){
  ++generation;
  return serial(async()=>{
    const s=await load();
    try { await clearDevice(); }
    finally { if(s)await close(s); } // Revoke even if the OS task could not be stopped.
    return status();
  });
}
export function nativeTrackingStatus(){
  return serial(async()=>{
    await load();
    if(session){
      const foreground=await Location.getForegroundPermissionsAsync();
      const background=await Location.getBackgroundPermissionsAsync();
      if(!foreground.granted||!background.granted){
        const old=session;
        try { await clearDevice(); } finally { await close(old).catch(()=>{}); }
        lastError='Location permission changed. Allow location all the time / Always before continuing.';
      }
    }
    if(!session&&await Location.hasStartedLocationUpdatesAsync(TASK))await clearDevice();
    if(session&&!validTrackingSession(session))await clearDevice();
    if(session&&!await Location.hasStartedLocationUpdatesAsync(TASK)){
      const old=session;await clearDevice();await close(old).catch(()=>{});
      lastError='Tracking stopped on this phone. Open the assigned job and start sharing again.';
    }
    return status();
  });
}
export function syncTrackingOwner(owner:string|null){
  if(observedOwner!==undefined&&observedOwner!==owner)++generation;
  observedOwner=owner;
  return serial(async()=>{
    const s=await load();
    if(s&&s.owner_id!==owner){
      ++generation;await clearDevice();await close(s).catch(()=>{});
    }
  });
}
