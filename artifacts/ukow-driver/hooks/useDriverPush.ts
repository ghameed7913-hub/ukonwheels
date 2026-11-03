import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PushRegistration } from '@/lib/push-bridge';
import type { NotificationResponse } from 'expo-notifications';

const PREFERENCE = 'ukow-driver-push-opt-in';
export function notificationTarget(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  return value.kind === 'ukow-driver' && typeof value.notificationId === 'string' &&
    /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value.notificationId) ? value.notificationId : null;
}

export function useDriverPush(onOpen: (notificationId: string) => void) {
  const [registration, setRegistration] = useState<PushRegistration | null>(null);
  const [status, setStatus] = useState('Enable alerts for jobs and instructions');
  const [busy, setBusy] = useState(false);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const handled = useRef<string | null>(null);
  const mounted = useRef(true);
  const supported = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
  async function register(requestPermission: boolean) {
    if (!supported) {
      if (requestPermission) Alert.alert('Installed app required',
        'Lock-screen push notifications need the installed UK On Wheels app, not Expo Go or this web preview. The Supabase notification setup and phone push credentials must also be completed.');
      return;
    }
    setBusy(true);
    try {
      const Notifications = await import('expo-notifications');
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (typeof projectId !== 'string') throw new Error('The Expo project is not configured.');
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('driver-jobs', {
        name: 'Jobs & Driver instructions', importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250], sound: 'default',
      });
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted' && requestPermission && permission.canAskAgain)
        permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        if (mounted.current) setStatus('Notifications are off in phone settings');
        if (requestPermission) Alert.alert('Allow notifications', 'Enable UK On Wheels notifications in your phone settings.',
          [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => void Linking.openSettings().catch(() => {}) }]);
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await AsyncStorage.setItem(PREFERENCE, 'yes');
      if (mounted.current) {
        setRegistration({ token, projectId, platform: Platform.OS as 'android' | 'ios' });
        setStatus('Sign in to your Driver portal to finish connecting');
      }
    } catch {
      if (mounted.current) setStatus('Could not register this phone. Check internet and app push credentials, then retry.');
    } finally { if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    mounted.current = true;
    let subscription: { remove(): void } | undefined;
    if (supported) {
      void (async () => {
        try {
          const Notifications = await import('expo-notifications');
          if (!mounted.current) return;
          Notifications.setNotificationHandler({ handleNotification: async () => ({
            shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
          }) });
          const respond = (response: NotificationResponse | null) => {
            const id = notificationTarget(response?.notification.request.content.data);
            if (!mounted.current || !id || handled.current === id) return;
            handled.current = id;
            onOpenRef.current(id);
            void Notifications.clearLastNotificationResponseAsync().catch(() => {});
          };
          subscription = Notifications.addNotificationResponseReceivedListener(respond);
          respond(await Notifications.getLastNotificationResponseAsync());
          if (await AsyncStorage.getItem(PREFERENCE) === 'yes' && mounted.current) await register(false);
        } catch { if (mounted.current) setStatus('Notification connection unavailable. Tap Enable to retry.'); }
      })();
    } else setStatus('Lock-screen alerts require the installed app');
    return () => { mounted.current = false; subscription?.remove(); };
  }, [supported]);
  function connection(ok: boolean, error?: string) {
    setStatus(ok ? 'Connected to your signed-in Driver account' : error || 'Sign in to connect alerts');
  }
  return { registration, status, busy, enable: () => register(true), connection };
}
