import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { PORTAL_URL, navigationKind, type Section } from '@/lib/portal';
import { PORTAL_BRIDGE, sectionScript, LOGOUT_SCRIPT } from '@/lib/bridge';
import { getEvidencePosition, prepareEvidencePhoto } from '@/lib/evidence-media';
import { pushOpenScript, pushRegistrationScript, type PushRegistration } from '@/lib/push-bridge';
import { startNativeTracking, stopNativeTracking, nativeTrackingStatus, syncTrackingOwner } from '@/lib/live-tracking';

export default function DriverPortal({ section, request, onHome, pushRegistration, notificationId, onPushStatus, onNotificationHandled, logoutRequest = 0, onSignedOut, onSignedIn }: {
  section: Section | null; request: number; onHome: () => void;
  pushRegistration?: PushRegistration | null;
  notificationId?: string | null;
  onPushStatus?: (ok: boolean, error?: string) => void;
  onNotificationHandled?: () => void;
  logoutRequest?: number;
  onSignedOut?: () => void;
  onSignedIn?: () => void;
}) {
  const colors = useColors();
  const web = useRef<WebView>(null);
  const queued = useRef<Section | null>(section);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sharing, setSharing] = useState(false);
   const [cameraStage, setCameraStage] = useState('');
  const shareBusy = useRef(false);
   const cameraBusy = useRef(false);
  const pushRequest = useRef(0);
  const trackingOwner = useRef<string|null>(null);
  const [pushSession,setPushSession]=useState(0);
  useEffect(() => {
    if (logoutRequest > 0) {
      if (ready) web.current?.injectJavaScript(LOGOUT_SCRIPT);
      else Alert.alert('Portal not ready', 'Wait for the portal to finish loading, then try Log out again.');
    }
  }, [logoutRequest]);
  function logout() {
    Alert.alert('Log out?', 'Save your work first. You will need to sign in again to access your jobs.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => web.current?.injectJavaScript(LOGOUT_SCRIPT) },
    ]);
  }
  useEffect(() => {
    if (ready && pushRegistration) web.current?.injectJavaScript(pushRegistrationScript(pushRegistration, String(++pushRequest.current)));
  }, [ready, pushRegistration, pushSession]);
  useEffect(() => {
    if (ready && notificationId) web.current?.injectJavaScript(pushOpenScript(notificationId));
  }, [ready, notificationId, pushSession]);
  useEffect(() => {
    queued.current = section;
    if (ready && section) {
      web.current?.injectJavaScript(sectionScript(section));
      queued.current = null;
    }
  }, [section, request, ready]);
  async function external(url: string) {
    if (navigationKind(url) === 'blocked') return;
    try { await Linking.openURL(url); }
    catch { Alert.alert('Cannot open link', 'Please try again or open the portal in your browser.'); }
  }
  async function message(event: WebViewMessageEvent) {
    if (navigationKind(event.nativeEvent.url) !== 'portal') return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if(data.type==='tracking-owner'){
        trackingOwner.current=typeof data.ownerId==='string'&&/^[a-f0-9-]{36}$/i.test(data.ownerId)?data.ownerId:null;
        void syncTrackingOwner(trackingOwner.current).catch(()=>{});
        return;
      }
      if(data.type==='tracking-command'){
        if(typeof data.id!=='string'||!/^\d{1,10}$/.test(data.id)||!['start','stop','status'].includes(data.action))return;
        const reply=(result:Record<string,unknown>)=>web.current?.injectJavaScript(
          `window.__ukowNativeTrackingReply?.(${JSON.stringify(data.id)},${JSON.stringify(result)});true;`);
        try{
          if(data.action==='start'&&(!ready||data.session?.owner_id!==trackingOwner.current))
            throw Error('Sign in as the assigned Driver before starting tracking.');
          const result=data.action==='start'?await startNativeTracking(data.session):
            data.action==='stop'?await stopNativeTracking():await nativeTrackingStatus();
          reply({ok:true,...result});
        }catch(error){
          reply({ok:false,error:error instanceof Error?error.message:'The phone could not confirm location sharing.'});
        }
        return;
      }
      if (data.type === 'signed-out') {
        trackingOwner.current=null;void syncTrackingOwner(null).catch(()=>{});
        pushRequest.current++;setReady(false);onSignedOut?.();if(pushRegistration)onPushStatus?.(false, 'Sign in to connect alerts');return;
      }
      if (data.type === 'logout-error') {
        Alert.alert('Unable to log out', 'Check your connection and try again.'); return;
      }
      if (data.type === 'driver-ready') { setReady(true); onSignedIn?.(); return; }
      if (data.type === 'driver-push-session') {
        pushRequest.current++;
        if(pushRegistration)onPushStatus?.(false,data.signedIn?'Connecting alerts to your Driver account…':'Sign in to connect alerts');
        if(data.signedIn)setPushSession(value=>value+1);
        return;
      }
      if (data.type === 'driver-push-registration' && data.id === String(pushRequest.current)) {
        onPushStatus?.(data.ok === true, typeof data.error === 'string' ? data.error : undefined);return;
      }
      if (data.type === 'driver-push-open' && data.id === notificationId) {
        if (data.ok === true) onNotificationHandled?.();
        else Alert.alert('Cannot open notification', typeof data.error === 'string' ? data.error : 'Please sign in again.', [
          {text:'Close',onPress:onNotificationHandled},
          {text:'Retry',onPress:()=>notificationId&&web.current?.injectJavaScript(pushOpenScript(notificationId))},
        ]);
        return;
      }
       if (data.type === 'take-evidence-photo') {
         if (typeof data.id !== 'string' || !/^\d{1,10}$/.test(data.id)) return;
         const reply = (result: Record<string, unknown>) => web.current?.injectJavaScript(
           `window.__ukowNativeEvidenceResult?.(${JSON.stringify({id:data.id,...result})});true;`
         );
         if (!ready || cameraBusy.current) { reply({error:'Camera is busy. Please try again.'}); return; }
         cameraBusy.current = true;
         const temporaryFiles: string[] = [];
         try {
           const camera = await ImagePicker.requestCameraPermissionsAsync();
           const location = camera.granted ? await Location.requestForegroundPermissionsAsync() : null;
           if (!camera.granted || !location?.granted) {
             reply({error:'Camera and location access are required. Allow both in phone settings, then tap Open Camera again.'});
             Alert.alert('Camera and location needed','Allow Camera and Location for Expo Go, then return to this job.',
               [{text:'Cancel',style:'cancel'},{text:'Open Settings',onPress:()=>void Linking.openSettings().catch(()=>{})}]);
             return;
           }
           // Start GPS while the Driver frames the photo; never leave a rejected
           // promise unhandled if the Driver cancels the camera.
           const warmed = getEvidencePosition().then(position => position, () => undefined);
           const result = await ImagePicker.launchCameraAsync({
             mediaTypes:['images'],cameraType:ImagePicker.CameraType.back,
             allowsEditing:false,quality:1,base64:false,exif:false,
           });
           if (result.canceled) { reply({cancelled:true}); return; }
           const asset = result.assets[0];
           const timestamp = new Date().toISOString();
           if (!asset?.uri) throw new Error('The camera photo could not be read. Please retake it.');
           temporaryFiles.push(asset.uri);
           setCameraStage('Preparing photo and checking location…');
           const [photoResult, positionResult] = await Promise.allSettled([
             prepareEvidencePhoto(asset).then(photo => { temporaryFiles.push(photo.uri); return photo; }),
             warmed.then(position => getEvidencePosition(position)),
           ]);
           if (photoResult.status === 'rejected') throw photoResult.reason;
           if (positionResult.status === 'rejected') throw positionResult.reason;
           const photo = photoResult.value, position = positionResult.value;
           reply({image:photo.image,
             timestamp,latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy});
         } catch (error) {
           reply({error:error instanceof Error?error.message:'The phone camera could not open. Please try again.'});
         } finally {
           cameraBusy.current=false;setCameraStage('');
           for (const uri of temporaryFiles) {
             if (FileSystem.cacheDirectory && uri.startsWith(FileSystem.cacheDirectory)) {
               void FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>{});
             }
           }
         }
         return;
       }
       if (data.type === 'camera-permission') {
         if (typeof data.id !== 'string' || !/^\d{1,10}$/.test(data.id)) return;
         const reply = (granted: boolean) => web.current?.injectJavaScript(
           `window.__ukowCameraPermissionResult?.(${JSON.stringify(data.id)},${granted});true;`
         );
         if (!ready || cameraBusy.current) { reply(false); return; }
         cameraBusy.current = true;
         try {
           const permission = await ImagePicker.requestCameraPermissionsAsync();
           reply(permission.granted);
           if (!permission.granted) Alert.alert('Camera access needed',
             'Allow camera access for Expo Go in your phone settings, then return and tap Open camera again.',
             [{text:'Cancel',style:'cancel'},{text:'Open Settings',onPress:()=>void Linking.openSettings().catch(()=>Alert.alert('Settings unavailable','Open phone Settings → Apps → Expo Go → Permissions → Camera.'))}]);
         } catch {
           reply(false);
           Alert.alert('Camera permission unavailable','Open phone Settings → Apps → Expo Go → Permissions and allow Camera, then try again.');
         } finally { cameraBusy.current = false; }
         return;
       }
      if (data.type === 'wrong-role') {
        trackingOwner.current=null;void syncTrackingOwner(null).catch(()=>{});
        setReady(false);
        Alert.alert('Driver account required', 'Please sign in with your Driver account. Admin and HR should use the main portal.');
        return;
      }
      if (data.type === 'download-error') {
        Alert.alert('PDF could not be saved', 'Try again. For PDFs larger than 25 MB, use the portal in your browser.'); return;
      }
      if (data.type !== 'pdf' || shareBusy.current) return;
      if (typeof data.data !== 'string' || !/^data:application\/pdf;base64,[A-Za-z0-9+/=\r\n]+$/.test(data.data) || data.data.length > 36_000_000) {
        throw new Error('The PDF download is not valid or is too large.');
      }
      shareBusy.current = true; setSharing(true);
      const name = String(data.name || 'UKOW-document.pdf').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0,90);
      const path = FileSystem.cacheDirectory + `${Date.now()}-${name.endsWith('.pdf') ? name : name+'.pdf'}`;
      try {
        if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
        await FileSystem.writeAsStringAsync(path, data.data.split(',')[1], { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(path, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save or share your UK On Wheels PDF' });
      } finally {
        await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
        shareBusy.current = false; setSharing(false);
      }
    } catch (error) {
      Alert.alert('Download unavailable', error instanceof Error ? error.message : 'Please retry this download.');
    }
  }
  const button = (label: string, action: () => void) => <Pressable accessibilityRole="button" onPress={action} style={[styles.button,{backgroundColor:colors.primary}]}><Text style={{color:colors.white,fontFamily:'Inter_600SemiBold'}}>{label}</Text></Pressable>;
  return <View style={[styles.root,{backgroundColor:colors.card}]}>
    <View style={[styles.bar,{borderColor:colors.border}]}>
      <Pressable testID="portal-home" accessibilityRole="button" accessibilityLabel="Return to app home; keep portal open" onPress={onHome} hitSlop={12}><Feather name="arrow-left" size={23} color={colors.foreground}/></Pressable>
      <View style={styles.brand}><Feather name="lock" size={13} color={colors.success}/><Text style={{color:colors.foreground,fontFamily:'Inter_600SemiBold'}}>Driver portal</Text></View>
      {ready && <Pressable testID="portal-logout" accessibilityRole="button" accessibilityLabel="Log out of Driver account" onPress={logout} hitSlop={8} style={{flexDirection:'row',alignItems:'center',gap:5,padding:8}}>
        <Feather name="log-out" size={18} color={colors.primary}/><Text style={{color:colors.primary,fontWeight:'600'}}>Log out</Text>
      </Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Reload portal" onPress={()=>Alert.alert('Reload portal?', 'Unsubmitted form changes may be lost. Save your work first.',[{text:'Cancel',style:'cancel'},{text:'Reload',onPress:()=>{setReady(false);setFailed(false);setLoading(true);web.current?.reload();}}])} hitSlop={12}><Feather name="rotate-cw" size={20} color={colors.foreground}/></Pressable>
    </View>
    {Platform.OS === 'web' ? <View style={styles.notice}>
      <Feather name="smartphone" size={38} color={colors.primary}/>
      <Text style={[styles.title,{color:colors.foreground}]}>Your portal, on your phone</Text>
      <Text style={[styles.copy,{color:colors.mutedForeground}]}>The Android and iPhone app opens your secure Driver portal here. In this web preview, open the portal in your browser instead.</Text>
      {button('Open secure Driver portal',()=>void external(PORTAL_URL))}
      <Text style={[styles.copy,{color:colors.mutedForeground}]}>Use Preview on your phone to try the native app in Expo Go.</Text>
    </View> : <>
      <WebView ref={web} source={{uri:PORTAL_URL}} style={{flex:1}} originWhitelist={['https://*','about:blank','tel:*','mailto:*']}
        javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled={false} geolocationEnabled
        mixedContentMode="never" allowsInlineMediaPlayback mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        allowFileAccess={false} allowsBackForwardNavigationGestures={false} setSupportMultipleWindows={false}
        injectedJavaScript={PORTAL_BRIDGE} onMessage={message}
        onLoadStart={()=>{setLoading(true);setReady(false);}}
        onLoadEnd={()=>setLoading(false)}
        onError={()=>{setFailed(true);setLoading(false);setReady(false);}}
        onHttpError={e=>{if(e.nativeEvent.url===PORTAL_URL&&e.nativeEvent.statusCode>=400){setFailed(true);setLoading(false);}}}
        onShouldStartLoadWithRequest={req=>{
          const kind=navigationKind(req.url);
          if(kind==='portal')return true;
          if(kind==='external')Alert.alert('Open link outside the app?', 'This link will open in another app or your browser.',[{text:'Cancel',style:'cancel'},{text:'Open',onPress:()=>void external(req.url)}]);
          return false;
        }}
        onFileDownload={e=>void external(e.nativeEvent.downloadUrl)}
        onContentProcessDidTerminate={()=>{setFailed(true);setReady(false);setLoading(false);}}
      />
      {(loading||sharing||!!cameraStage)&&!failed&&<View pointerEvents="none" style={[styles.progress,{backgroundColor:colors.card}]}><ActivityIndicator color={colors.primary}/><Text style={{color:colors.mutedForeground}}>{cameraStage||(sharing?'Preparing PDF…':'Connecting securely…')}</Text></View>}
      {failed&&<View style={[StyleSheet.absoluteFill,styles.notice,{top:57,backgroundColor:colors.card}]}>
        <Feather name="wifi-off" size={36} color={colors.primary}/><Text style={[styles.title,{color:colors.foreground}]}>Cannot reach the portal</Text>
        <Text style={[styles.copy,{color:colors.mutedForeground}]}>Check your internet connection. This version needs to be online; nothing is marked as saved until the portal confirms it.</Text>
        {button('Try again',()=>{setFailed(false);setLoading(true);web.current?.reload();})}
      </View>}
    </>}
  </View>;
}
const styles=StyleSheet.create({
 root:{flex:1},bar:{height:57,borderBottomWidth:1,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{flexDirection:'row',alignItems:'center',gap:7},
 notice:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:20},
 title:{fontFamily:'Inter_700Bold',fontSize:23,textAlign:'center'},copy:{fontFamily:'Inter_400Regular',fontSize:15,lineHeight:23,textAlign:'center'},
 button:{paddingHorizontal:24,paddingVertical:16,borderRadius:8,alignItems:'center'},
 progress:{position:'absolute',top:57,left:0,right:0,padding:9,flexDirection:'row',justifyContent:'center',gap:9},
});
