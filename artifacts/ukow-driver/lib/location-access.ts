import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type LocationAccess = 'allowed' | 'permission' | 'services' | 'unsupported';

// Permission is not consent to start GPS. This module never obtains a position,
// creates a delivery session, or sends coordinates to the portal.
export async function readLocationAccess(): Promise<LocationAccess> {
  if (Platform.OS === 'web') return 'allowed'; // Browser preview has no native login.
  if (Constants.executionEnvironment === 'storeClient' || !await TaskManager.isAvailableAsync()) return 'unsupported';
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  if (!foreground.granted || !background.granted) return 'permission';
  return await Location.hasServicesEnabledAsync() ? 'allowed' : 'services';
}

// Call only from the disclosure screen's explicit Continue button.
export async function requestLocationAccess(): Promise<LocationAccess> {
  const current = await readLocationAccess();
  if (current !== 'permission') return current;
  let foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted && foreground.canAskAgain) foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return 'permission';
  const background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted && background.canAskAgain) await Location.requestBackgroundPermissionsAsync();
  return readLocationAccess();
}
