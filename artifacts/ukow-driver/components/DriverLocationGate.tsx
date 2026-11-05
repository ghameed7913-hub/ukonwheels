import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { readLocationAccess, requestLocationAccess, type LocationAccess } from '@/lib/location-access';
import { stopNativeTracking } from '@/lib/live-tracking';

export default function DriverLocationGate({ children }: { children: React.ReactNode }) {
  const colors = useColors(), insets = useSafeAreaInsets();
  const [access, setAccess] = useState<LocationAccess | 'checking'>(Platform.OS === 'web' ? 'allowed' : 'checking');
  const [opened, setOpened] = useState(Platform.OS === 'web');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requesting = useRef(false), version = useRef(0), alive = useRef(true);

  async function check(request = false) {
    if (requesting.current) return;
    const run = ++version.current;
    requesting.current = request;
    setBusy(true); setError('');
    try {
      const next = await (request ? requestLocationAccess() : readLocationAccess());
      if (!alive.current || run !== version.current) return;
      setAccess(next);
      if (next === 'allowed') setOpened(true);
      else {
        // Revocation blocks an existing session too. Clear physical GPS first;
        // the server separately enforces the active-job boundary on every point.
        await stopNativeTracking();
      }
    } catch {
      if (alive.current && run === version.current) {
        setAccess('permission');
        setError('Could not confirm location access or stop sharing. Check your connection and phone settings, then try again.');
        await stopNativeTracking().catch(() => {});
      }
    } finally {
      requesting.current = false;
      if (alive.current && run === version.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (Platform.OS === 'web') return;
    alive.current = true;
    void check();
    const listener = AppState.addEventListener('change', state => {
      if (requesting.current) return; // OS permission dialogs also change AppState.
      if (state === 'active') { setAccess('checking'); void check(); }
      else { ++version.current; setAccess('checking'); }
    });
    return () => { alive.current = false; ++version.current; listener.remove(); };
  }, []);
  const allowed = access === 'allowed';
  return <View style={styles.fill}>
    {/* Do not load the sign-in WebView until the permission check passes.
        Keep it mounted after that to preserve unsaved work if Settings is opened. */}
    {opened && <View style={[styles.fill, !allowed && styles.hidden]} pointerEvents={allowed ? 'auto' : 'none'} accessibilityElementsHidden={!allowed} importantForAccessibility={allowed ? 'auto' : 'no-hide-descendants'}>{children}</View>}
    {!allowed && <View testID="location-access-gate" style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark"/>
      <ScrollView contentContainerStyle={styles.content}>
        <Feather name="map-pin" size={38} color={colors.primary}/>
        <Text style={[styles.title, { color: colors.foreground }]}>Location access for deliveries</Text>
        <Text style={[styles.copy, { color: colors.foreground }]}>UK On Wheels Driver requires location permission set to “Allow all the time” on Android or “Always” on iPhone before you can sign in or use your Driver account.</Text>
        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.copy, { color: colors.foreground }]}>During an active delivery, UK On Wheels collects location even when the app is closed or not in use, so Admin and the booking’s Client can track the vehicle.</Text>
          <Text style={[styles.copy, { color: colors.foreground }]}>Permission alone does not start delivery tracking. Start sharing in your picked-up job. Sharing ends when delivery is completed or the job is reassigned. Admin and Clients cannot see your location when you have no active delivery or sharing has ended.</Text>
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>Local weather uses your location separately to find your city; it does not share your off-duty location with Admin or Clients.</Text>
        </View>
        {access === 'unsupported' ? <Text style={[styles.copy, { color: colors.foreground }]}>Use the installed UK On Wheels Driver app. Expo Go cannot provide the required background location permission.</Text> :
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>{access === 'services' ? 'Turn on your phone’s Location Services, then check again.' : 'Allow location first, then choose “Allow all the time” / “Always”. If that option is not offered, open the app’s permissions in phone Settings.'}</Text>}
        {!!error && <Text accessibilityRole="alert" style={[styles.copy, { color: colors.foreground }]}>{error}</Text>}
        {busy || access === 'checking' ? <ActivityIndicator color={colors.primary}/> : <>
          {access !== 'unsupported' && <Pressable testID="location-continue" accessibilityRole="button" onPress={() => void check(true)} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.label, { color: colors.white }]}>Continue — allow location</Text></Pressable>}
          <Pressable testID="location-settings" accessibilityRole="button" onPress={() => void Linking.openSettings().catch(() => setError('Open phone Settings, select UK On Wheels Driver, and allow location at all times.'))} style={[styles.button, { borderWidth: 1, borderColor: colors.border }]}><Text style={[styles.label, { color: colors.foreground }]}>Open phone settings</Text></Pressable>
          <Pressable testID="location-recheck" accessibilityRole="button" onPress={() => void check()} style={styles.button}><Text style={[styles.label, { color: colors.primary }]}>Check again</Text></Pressable>
        </>}
      </ScrollView>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  fill: { flex: 1 }, hidden: { display: 'none' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 18 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  copy: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23 },
  notice: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 14 },
  button: { minHeight: 48, padding: 14, borderRadius: 8, alignItems: 'center' },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
