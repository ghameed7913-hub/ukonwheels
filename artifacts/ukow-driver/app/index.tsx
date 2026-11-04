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
import { LinearGradient } from 'expo-linear-gradient';
import colors from '@/constants/colors';

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

type Tile = { key: Section | 'support'; title: string; detail: string; label: string; icon: Icon };
const GRID: Tile[] = [
  { key: 'incidents', title: 'Report issue', detail: 'Damage, accidents, delays', label: 'Open incident report form', icon: 'alert-triangle' },
  ...PERSONAL.map(p => ({ key: p.id, title: p.title, detail: p.detail, label: `Open ${p.title}`, icon: p.icon })),
  { key: 'support', title: 'Help & support', detail: 'Guides, camera setup', label: 'Open help and support', icon: 'headphones' },
];

export default function DriverApp() {
  const c=useColors(),insets=useSafeAreaInsets(),g=colors.driverHome;
  const [screen,setScreen]=useState<'home'|'portal'|'help'>('home');
  const [section,setSection]=useState<Section|null>(null);
  const [request,setRequest]=useState(0);
  const [notificationId,setNotificationId]=useState<string|null>(null);
  const [logoutRequest,setLogoutRequest]=useState(0);
  const [signedIn,setSignedIn]=useState(false);
  const [jobCounts,setJobCounts]=useState<{assigned:number;active:number;delivered:number}|null>(null);
  const [alertsOpen,setAlertsOpen]=useState(false);
  const push=useDriverPush(id=>{setNotificationId(id);setScreen('portal');});
  useEffect(()=>{if(Platform.OS!=='android')return;const listener=BackHandler.addEventListener('hardwareBackPress',()=>{
    if(screen!=='home'){setScreen('home');return true;}return false;
  });return ()=>listener.remove();},[screen]);
  function open(next:Section|null) {
    void Haptics.selectionAsync().catch(()=>{});
    setSection(next);setRequest(r=>r+1);setScreen('portal');
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
  return <View style={[s.root,{backgroundColor:screen==='home'?g.bg:c.background,paddingTop:Platform.OS==='web'?Math.max(insets.top,67):insets.top,paddingBottom:Platform.OS==='web'?Math.max(insets.bottom,34):insets.bottom}]}>
    <StatusBar style={screen==='home'?'light':'dark'}/>
    {screen==='home'&&<View style={[StyleSheet.absoluteFill,{backgroundColor:g.bg}]}/>}
    <View style={[s.fill,screen==='home'?undefined:s.hidden]}>
      <ScrollView contentContainerStyle={s.hContent} showsVerticalScrollIndicator={false}>
        <View style={s.hHeader}>
          <Pressable testID="help" accessibilityRole="button" accessibilityLabel="Help and camera settings" onPress={()=>setScreen('help')} hitSlop={10} style={({pressed})=>[s.iconBtn,{opacity:pressed?.6:1}]}><Feather name="help-circle" size={22} color={g.gold}/></Pressable>
          <View style={s.brandCol}>
            <Image source={require('@/assets/images/company-logo.png')} style={s.hLogo} resizeMode="contain" accessibilityLabel="UK On Wheels company logo"/>
            <View style={s.tagRow}><View style={[s.tagLine,{backgroundColor:g.goldLine}]}/><Text style={[s.hTag,{color:g.gold}]}>DRIVER COMPANION</Text><View style={[s.tagLine,{backgroundColor:g.goldLine}]}/></View>
          </View>
          <Pressable testID="alerts" accessibilityRole="button" accessibilityLabel="Job and instruction alerts" accessibilityState={{expanded:alertsOpen}} onPress={()=>setAlertsOpen(v=>!v)} hitSlop={10} style={({pressed})=>[s.iconBtn,{opacity:pressed?.6:1}]}><Feather name="bell" size={22} color={alertsOpen?g.goldBright:g.gold}/>{!push.registration&&<View style={[s.badge,{backgroundColor:g.goldBright}]}/>}</Pressable>
        </View>
        {alertsOpen&&<View testID="alerts-panel" style={[s.alertPanel,{backgroundColor:g.surface,borderColor:g.goldLine}]}>
          <View style={s.header}><Text style={[s.tileTitle,{color:g.text}]}>Job & instruction alerts</Text><Pressable accessibilityRole="button" accessibilityLabel="Close alerts" onPress={()=>setAlertsOpen(false)} hitSlop={12}><Feather name="x" size={20} color={g.muted}/></Pressable></View>
          <Text accessibilityLiveRegion="polite" style={[s.tileDetail,{color:g.muted}]}>{push.status}</Text>
          <Pressable accessibilityRole="button" disabled={push.busy} onPress={()=>void push.enable()} style={[s.compact,{backgroundColor:g.gold,opacity:push.busy?.6:1}]}>
            <Feather name="bell" size={16} color={g.ink}/><Text style={[s.compactLabel,{color:g.ink}]}>{push.busy?'Connecting…':push.registration?'Refresh notification connection':'Enable notifications'}</Text>
          </Pressable>
        </View>}
        <LocalWeather active={screen==='home'}/>
        <LinearGradient colors={[g.goldBright,g.gold,g.goldDeep]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.summary}>
          <View style={s.sumHead}><View style={s.sumTitleRow}><Feather name="briefcase" size={20} color={g.ink}/><Text style={[s.sumTitle,{color:g.ink}]}>Delivery run</Text></View>
            {!signedIn&&<Pressable testID="sign-in" accessibilityRole="button" accessibilityLabel="Sign in to see your jobs" onPress={()=>open(null)} hitSlop={8} style={({pressed})=>[s.signIn,{backgroundColor:g.ink,opacity:pressed?.7:1}]}><Feather name="log-in" size={14} color={g.goldBright}/><Text style={[s.signInText,{color:g.goldBright}]}>Sign in</Text></Pressable>}
          </View>
          <View style={s.sumRow}>{ROUTE.map((item,i)=><Pressable key={item.id} testID={`section-${item.id}`} accessibilityRole="button" accessibilityLabel={`Open ${item.title}, ${jobCounts&&signedIn?jobCounts[item.id as 'assigned'|'active'|'delivered']:'count unavailable'}`} onPress={()=>open(item.id)}
            style={({pressed})=>[s.sumCell,i>0&&{borderLeftWidth:1,borderLeftColor:'rgba(26,19,7,0.25)'},{opacity:pressed?.6:1}]}>
            <Text style={[s.sumCount,{color:g.ink}]}>{jobCounts&&signedIn?jobCounts[item.id as 'assigned'|'active'|'delivered']:'—'}</Text>
            <Text style={[s.sumLabel,{color:g.ink}]} numberOfLines={1}>{item.title}</Text>
          </Pressable>)}</View>
        </LinearGradient>
        <View style={s.hGrid}>{GRID.map(item=><Pressable key={item.key} testID={item.key==='support'?'home-support':`section-${item.key}`} accessibilityRole="button" accessibilityLabel={item.label} onPress={()=>item.key==='support'?setScreen('help'):open(item.key as Section)}
          style={({pressed})=>[s.hTile,{backgroundColor:pressed?g.surfaceHi:g.surface,borderColor:pressed?g.gold:g.goldLine,transform:[{scale:pressed?.98:1}]}]}>
          <Feather name={item.icon} size={26} color={g.gold}/>
          <View style={s.stopText}><Text style={[s.hTileTitle,{color:g.text}]} numberOfLines={2}>{item.title}</Text><Text style={[s.hTileDetail,{color:g.muted}]} numberOfLines={2}>{item.detail}</Text></View>
        </Pressable>)}</View>
        {signedIn && <Pressable testID="home-logout" accessibilityRole="button" accessibilityLabel="Log out of Driver account" onPress={()=>{
          Alert.alert('Log out?', 'Save your work first. You will need to sign in again to access your jobs.', [
            {text:'Cancel',style:'cancel'},
            {text:'Log out',style:'destructive',onPress:()=>{setScreen('portal');setLogoutRequest(v=>v+1);}},
          ]);
        }} style={({pressed})=>[s.hLogout,{borderColor:g.goldLine,opacity:pressed?.7:1}]}>
          <Feather name="log-out" size={18} color={g.gold}/><Text style={[s.tileTitle,{color:g.gold}]}>Log out</Text>
        </Pressable>}
        <View style={[s.footer,{borderTopColor:g.hairline}]}>
          <Text style={[s.footBrand,{color:g.gold}]}>UK ON WHEELS</Text>
          <Text style={[s.connectionText,{color:g.muted,textAlign:'center'}]}>Professional vehicle delivery. Internet required — updates go to the same Admin and Client portal.</Text>
        </View>
      </ScrollView>
    </View>
    <View style={[s.fill,screen==='portal'?undefined:s.hidden]}><DriverPortal section={section} request={request} onHome={()=>setScreen('home')} pushRegistration={push.registration} notificationId={notificationId} onPushStatus={push.connection} onNotificationHandled={()=>setNotificationId(null)} logoutRequest={logoutRequest} onSignedIn={()=>setSignedIn(true)} onSignedOut={()=>{setSignedIn(false);setJobCounts(null);setSection(null);setNotificationId(null);}} onJobCounts={setJobCounts}/></View>
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
 hContent:{paddingHorizontal:18,paddingTop:8,paddingBottom:28,gap:18},
 hHeader:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between'},iconBtn:{width:44,height:44,alignItems:'center',justifyContent:'center'},
 brandCol:{alignItems:'center',gap:6,flex:1},hLogo:{width:'100%',maxWidth:230,height:140},
 hBrand:{fontFamily:'Inter_700Bold',fontSize:22,letterSpacing:2},tagRow:{flexDirection:'row',alignItems:'center',gap:8},tagLine:{width:22,height:1},hTag:{fontFamily:'Inter_600SemiBold',fontSize:9,letterSpacing:2.4},
 summary:{borderRadius:16,padding:16,gap:12},sumHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sumTitleRow:{flexDirection:'row',alignItems:'center',gap:10},sumTitle:{fontFamily:'Inter_700Bold',fontSize:18},
 sumRow:{flexDirection:'row'},sumCell:{flex:1,minWidth:0,minHeight:72,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:4},sumCount:{fontFamily:'Inter_700Bold',fontSize:34},sumLabel:{fontFamily:'Inter_600SemiBold',fontSize:12},
 hGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:12},
 hTile:{width:'48.3%',minHeight:84,borderWidth:1,borderRadius:14,padding:13,flexDirection:'row',alignItems:'center',gap:11},
 hTileTitle:{fontFamily:'Inter_600SemiBold',fontSize:14},hTileDetail:{fontFamily:'Inter_400Regular',fontSize:11,lineHeight:15},
 hLogout:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,borderWidth:1,borderRadius:14,minHeight:50},
 footer:{borderTopWidth:1,paddingTop:16,alignItems:'center',gap:6},footBrand:{fontFamily:'Inter_700Bold',fontSize:12,letterSpacing:2.4},
 headerActions:{flexDirection:'row',alignItems:'center',gap:18},badge:{position:'absolute',top:0,right:0,width:8,height:8,borderRadius:4},
 alertPanel:{borderWidth:1,borderRadius:12,padding:16,gap:10},compact:{borderRadius:8,paddingHorizontal:14,paddingVertical:11,flexDirection:'row',alignItems:'center',gap:10,alignSelf:'flex-start'},compactLabel:{fontFamily:'Inter_600SemiBold',fontSize:13},
 count:{fontFamily:'Inter_700Bold',fontSize:22},signIn:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,minHeight:34,borderRadius:17},signInText:{fontFamily:'Inter_600SemiBold',fontSize:13},
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
