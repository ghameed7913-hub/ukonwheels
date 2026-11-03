import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useColors } from '@/hooks/useColors';
import type { Section } from '@/lib/portal';
import DriverPortal from '@/components/DriverPortal';
import LocalWeather from '@/components/LocalWeather';
import { useDriverPush } from '@/hooks/useDriverPush';

type Icon = React.ComponentProps<typeof Feather>['name'];
type Shortcut = { id: Section; title: string; detail: string; icon: Icon };
const ROUTE: Shortcut[] = [
  { id: 'assigned', title: 'Assigned jobs', detail: 'Vehicles allocated to you and pickup checks', icon: 'clipboard' },
  { id: 'active', title: 'Active jobs', detail: 'Vehicles picked up and on the road', icon: 'navigation' },
  { id: 'delivered', title: 'Delivered', detail: 'Completed deliveries and job history', icon: 'check' },
];
const PERSONAL: Shortcut[] = [
  { id: 'companyId', title: 'Digital ID', detail: 'Show your company card', icon: 'credit-card' },
  { id: 'tradePlate', title: 'Assigned trade plate', detail: 'Plate number and expiry set by HR', icon: 'tag' },
  { id: 'payments', title: 'Payments', detail: 'Payslips from HR', icon: 'file-text' },
  { id: 'holidays', title: 'Holidays', detail: 'Request time off', icon: 'calendar' },
  { id: 'profile', title: 'Profile', detail: 'Details managed by HR', icon: 'user' },
];

export default function DriverApp() {
  const c=useColors(),insets=useSafeAreaInsets();
  const [screen,setScreen]=useState<'home'|'portal'|'help'>('home');
  const [opened,setOpened]=useState(false);
  const [section,setSection]=useState<Section|null>(null);
  const [request,setRequest]=useState(0);
  const [notificationId,setNotificationId]=useState<string|null>(null);
  const [logoutRequest,setLogoutRequest]=useState(0);
  const [signedIn,setSignedIn]=useState(false);
  const push=useDriverPush(id=>{setNotificationId(id);setOpened(true);setScreen('portal');});
  useEffect(()=>{if(Platform.OS!=='android')return;const listener=BackHandler.addEventListener('hardwareBackPress',()=>{
    if(screen!=='home'){setScreen('home');return true;}return false;
  });return ()=>listener.remove();},[screen]);
  function open(next:Section|null) {
    void Haptics.selectionAsync().catch(()=>{});
    setSection(next);setRequest(r=>r+1);setOpened(true);setScreen('portal');
  }
  async function camera() {
    if(Platform.OS==='web'){Alert.alert('Phone camera','Open the app in Expo Go to manage native camera permissions.');return;}
    try {
      const permission=await ImagePicker.requestCameraPermissionsAsync();
      if(permission.granted){
        const location=await Location.requestForegroundPermissionsAsync();
        Alert.alert('Inspection permissions',location.granted?'Camera and location are enabled for vehicle evidence.':'Camera is enabled. Location was not allowed; the portal will tell you if it needs location for an inspection.',location.granted?[{text:'OK'}]:[{text:'OK'},{text:'Open Settings',onPress:()=>void Linking.openSettings().catch(()=>{})}]);
      }
      else Alert.alert('Camera permission needed','Allow camera access in Settings to take inspection photos. You can still choose existing files where the portal allows it.',[{text:'Not now',style:'cancel'},{text:'Open Settings',onPress:()=>void Linking.openSettings().catch(()=>Alert.alert('Settings unavailable','Open your phone settings and find this app.'))}]);
    } catch {Alert.alert('Camera unavailable','Check camera permissions in your phone settings.');}
  }
  return <View style={[s.root,{backgroundColor:c.background,paddingTop:Platform.OS==='web'?Math.max(insets.top,67):insets.top,paddingBottom:Platform.OS==='web'?Math.max(insets.bottom,34):insets.bottom}]}>
    <StatusBar style="dark"/>
    <View style={[s.fill,screen==='home'?undefined:s.hidden]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.logoGroup}><Image source={require('@/assets/images/company-logo.jpg')} style={s.logo}/><View><Text style={[s.brand,{color:c.foreground}]}>UK ON WHEELS</Text><Text style={[s.eyebrow,{color:c.mutedForeground}]}>DRIVER COMPANION</Text></View></View>
          <Pressable testID="help" accessibilityRole="button" accessibilityLabel="Help and camera settings" onPress={()=>setScreen('help')} hitSlop={12}><Feather name="help-circle" size={24} color={c.foreground}/></Pressable>
        </View>
        <LocalWeather active={screen==='home'}/>
        <View style={s.sectionHeading}><Text style={[s.heading,{color:c.foreground}]}>Delivery run</Text></View>
        <View style={[s.jobTabs,{backgroundColor:c.card,borderColor:c.border}]} accessibilityLabel="Job categories">
          {ROUTE.map(item=><Pressable key={item.id} testID={`section-${item.id}`} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={()=>open(item.id)}
            style={({pressed})=>[s.jobTab,{backgroundColor:pressed?c.muted:c.card,borderColor:c.border}]}>
            <Feather name={item.icon} size={20} color={c.primary}/>
            <Text style={[s.jobTabTitle,{color:c.foreground}]}>{item.title}</Text>
          </Pressable>)}
        </View>
        <View style={[s.helpCard,{backgroundColor:c.card,borderColor:c.border}]}>
          <View style={s.header}><Text style={[s.tileTitle,{color:c.foreground}]}>Job & instruction alerts</Text><Feather name="bell" size={20} color={c.primary}/></View>
          <Text accessibilityLiveRegion="polite" style={[s.tileDetail,{color:c.mutedForeground}]}>{push.status}</Text>
          <Pressable accessibilityRole="button" disabled={push.busy} onPress={()=>void push.enable()} style={[s.primary,{backgroundColor:c.primary,opacity:push.busy?.6:1}]}>
            <Text style={[s.primaryLabel,{color:c.white}]}>{push.busy?'Connecting…':push.registration?'Refresh notification connection':'Enable notifications'}</Text>
          </Pressable>
        </View>
        <View style={[s.hero,{backgroundColor:c.navy}]}>
          <View style={s.heroTop}><Text style={[s.heroTag,{color:c.navyMuted}]}>{opened?'PORTAL STILL OPEN':'READY FOR THE ROAD'}</Text><View style={[s.dot,{backgroundColor:opened?c.success:c.primary}]}/></View>
          <Text style={[s.heroTitle,{color:c.white}]}>{opened?'Pick up where\nyou left off.':'Find your vehicle.\nStart the run.'}</Text>
          <Pressable testID="open-jobs" accessibilityRole="button" accessibilityLabel={opened?'Resume Driver portal':'Open assigned jobs'} onPress={()=>open(opened?null:'assigned')} style={({pressed})=>[s.primary,{backgroundColor:c.primary,opacity:pressed?.85:1,transform:[{scale:pressed?.98:1}]}]}>
            <Feather name={opened?'rotate-ccw':'truck'} size={20} color={c.white}/><Text style={[s.primaryLabel,{color:c.white}]}>{opened?'Resume Driver portal':'Open assigned jobs'}</Text><Feather name="arrow-right" size={20} color={c.white}/>
          </Pressable>
          <View style={s.secure}><Feather name="lock" size={12} color={c.navyMuted}/><Text style={[s.secureText,{color:c.navyMuted}]}>Your existing portal sign-in. No new account.</Text></View>
        </View>
        <Pressable testID="section-incidents" accessibilityRole="button" accessibilityLabel="Open incident report form" onPress={()=>open('incidents')} style={({pressed})=>[s.incident,{borderColor:c.primary,backgroundColor:c.card,opacity:pressed?.8:1}]}>
          <View style={[s.incidentIcon,{backgroundColor:c.primary}]}><Feather name="alert-triangle" size={20} color={c.white}/></View>
          <View style={s.stopText}><Text style={[s.tileTitle,{color:c.foreground}]}>Report an incident</Text><Text style={[s.tileDetail,{color:c.mutedForeground}]}>Damage, accidents or delays, with photo evidence</Text></View>
          <Feather name="arrow-up-right" size={18} color={c.primary}/>
        </Pressable>
        <View style={s.sectionHeading}><Text style={[s.heading,{color:c.foreground}]}>You & your company</Text></View>
        <View style={s.grid}>{PERSONAL.map(item=><Pressable key={item.id} testID={`section-${item.id}`} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={()=>open(item.id)} style={({pressed})=>[s.tile,{backgroundColor:item.id==='companyId'?c.navy:c.card,borderColor:item.id==='companyId'?c.navy:c.border,opacity:pressed?.75:1}]}>
          <View style={s.tileTop}><Feather name={item.icon} size={22} color={item.id==='companyId'?c.white:c.foreground}/><Feather name="arrow-up-right" size={15} color={item.id==='companyId'?c.navyMuted:c.mutedForeground}/></View>
          <Text style={[s.tileTitle,{color:item.id==='companyId'?c.white:c.foreground}]}>{item.title}</Text><Text style={[s.tileDetail,{color:item.id==='companyId'?c.navyMuted:c.mutedForeground}]}>{item.detail}</Text>
        </Pressable>)}</View>
        {signedIn && <Pressable testID="home-logout" accessibilityRole="button" accessibilityLabel="Log out of Driver account" onPress={()=>{
          Alert.alert('Log out?', 'Save your work first. You will need to sign in again to access your jobs.', [
            {text:'Cancel',style:'cancel'},
            {text:'Log out',style:'destructive',onPress:()=>{setScreen('portal');setLogoutRequest(v=>v+1);}},
          ]);
        }} style={[s.incident,{borderColor:c.border,backgroundColor:c.card}]}>
          <Feather name="log-out" size={20} color={c.primary}/><Text style={[s.tileTitle,{color:c.primary}]}>Log out</Text>
        </Pressable>}
        <View style={[s.connection,{borderColor:c.border}]}><Feather name="wifi" size={17} color={c.mutedForeground}/><Text style={[s.connectionText,{color:c.mutedForeground}]}>Internet required. Updates go to the same Admin and Client portal.</Text></View>
      </ScrollView>
    </View>
    {opened&&<View style={[s.fill,screen==='portal'?undefined:s.hidden]}><DriverPortal section={section} request={request} onHome={()=>setScreen('home')} pushRegistration={push.registration} notificationId={notificationId} onPushStatus={push.connection} onNotificationHandled={()=>setNotificationId(null)} logoutRequest={logoutRequest} onSignedIn={()=>setSignedIn(true)} onSignedOut={()=>{setSignedIn(false);setSection(null);setNotificationId(null);}}/></View>}
    {screen==='help'&&<ScrollView contentContainerStyle={s.content}>
      <Pressable testID="help-back" accessibilityRole="button" accessibilityLabel="Back to home" onPress={()=>setScreen('home')} style={s.back}><Feather name="arrow-left" size={24} color={c.foreground}/></Pressable>
      <Text style={[s.heading,{color:c.foreground}]}>Help for your working day</Text>
      {[
        ['Sign in','Use the email and password created for you by UK On Wheels. If access is blocked by expired documents, contact HR to update them.'],
        ['Pickup photos','Open Assigned jobs, select your assigned vehicle and follow every photo guide. Save the inspection before marking the vehicle Picked Up.'],
        ['Digital ID','Your company card is uploaded and maintained by Admin/HR. Contact HR if it is missing or expired; you cannot change your portrait here.'],
        ['Connection & saving','Keep the app online and wait for each save confirmation. Returning to this app’s home keeps the portal open; reloading or closing the app can discard unfinished work.'],
        ['PDF downloads','Generated PDFs open the phone’s Save/Share sheet. Files are prepared temporarily, then removed from the app cache. Large PDFs can be downloaded in the browser.'],
        ['Roadside safety','Stop somewhere safe before using the app. In an emergency, contact the emergency services first, then notify your company and submit an incident report.'],
      ].map(([title,body])=><View key={title} style={[s.helpCard,{backgroundColor:c.card,borderColor:c.border}]}><Text style={[s.tileTitle,{color:c.foreground}]}>{title}</Text><Text style={[s.helpCopy,{color:c.mutedForeground}]}>{body}</Text></View>)}
      <Pressable testID="enable-camera" accessibilityRole="button" onPress={()=>void camera()} style={[s.primary,{backgroundColor:c.primary}]}><Feather name="camera" size={20} color={c.white}/><Text style={[s.primaryLabel,{color:c.white}]}>Enable camera & location</Text></Pressable>
    </ScrollView>}
  </View>;
}
const s=StyleSheet.create({
 jobTabs:{flexDirection:'row',borderWidth:1,borderRadius:12,overflow:'hidden'},
 jobTab:{flex:1,minWidth:0,minHeight:84,alignItems:'center',justifyContent:'center',gap:9,padding:8,borderRightWidth:StyleSheet.hairlineWidth},
 jobTabTitle:{fontFamily:'Inter_600SemiBold',fontSize:12,textAlign:'center'},
 root:{flex:1},fill:{flex:1},hidden:{display:'none'},content:{paddingHorizontal:22,paddingTop:16,paddingBottom:24,gap:22},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:3},logoGroup:{flexDirection:'row',gap:10,alignItems:'center'},logo:{width:43,height:43,borderRadius:22},brand:{fontFamily:'Inter_700Bold',fontSize:15,letterSpacing:.3},eyebrow:{fontFamily:'Inter_500Medium',fontSize:9,letterSpacing:1.9,marginTop:4},
 hero:{borderRadius:16,padding:23,gap:19},heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},dot:{width:9,height:9,borderRadius:5},route:{borderWidth:1,borderRadius:14,paddingVertical:6,overflow:'hidden'},stop:{flexDirection:'row',alignItems:'center',gap:14,paddingRight:16,minHeight:74},rail:{width:52,alignSelf:'stretch',alignItems:'center'},railLine:{width:2,flex:1},node:{width:34,height:34,borderRadius:17,borderWidth:2,alignItems:'center',justifyContent:'center'},stopText:{flex:1,gap:3},incident:{flexDirection:'row',alignItems:'center',gap:14,borderWidth:1.5,borderRadius:14,padding:14},incidentIcon:{width:42,height:42,borderRadius:10,alignItems:'center',justifyContent:'center'},heroTag:{fontFamily:'Inter_600SemiBold',fontSize:10,letterSpacing:1.6},heroTitle:{fontFamily:'Inter_700Bold',fontSize:31,lineHeight:39,letterSpacing:-.8},heroCopy:{fontFamily:'Inter_400Regular',fontSize:14,lineHeight:22},
 primary:{borderRadius:8,paddingHorizontal:17,paddingVertical:17,flexDirection:'row',alignItems:'center',gap:12},primaryLabel:{fontFamily:'Inter_600SemiBold',fontSize:15,flex:1},secure:{flexDirection:'row',alignItems:'center',gap:6},secureText:{fontFamily:'Inter_400Regular',fontSize:10},
 sectionHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},heading:{fontFamily:'Inter_700Bold',fontSize:20},small:{fontFamily:'Inter_500Medium',fontSize:8,letterSpacing:1},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:12},tile:{width:'48%',flexGrow:1,borderWidth:1,borderRadius:12,padding:17,gap:7,minHeight:118},tileTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:9},tileTitle:{fontFamily:'Inter_600SemiBold',fontSize:15},tileDetail:{fontFamily:'Inter_400Regular',fontSize:12,lineHeight:18},
 connection:{flexDirection:'row',gap:12,paddingTop:18,borderTopWidth:1},connectionText:{fontFamily:'Inter_400Regular',fontSize:12,lineHeight:19,flex:1},back:{paddingVertical:9},helpCard:{padding:20,borderWidth:1,borderRadius:12,gap:9},helpCopy:{fontFamily:'Inter_400Regular',fontSize:14,lineHeight:23},
});
