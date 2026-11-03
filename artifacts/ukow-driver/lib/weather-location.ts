import * as Location from 'expo-location';

// Automatic weather asks only on first use. A previous denial is respected;
// the Driver can retry explicitly or enable permission in phone Settings.
export async function weatherLocationPermission(userInitiated: boolean, onOpen: boolean) {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain &&
      (userInitiated || (onOpen && permission.status === 'undetermined'))) {
    return Location.requestForegroundPermissionsAsync();
  }
  return permission;
}
