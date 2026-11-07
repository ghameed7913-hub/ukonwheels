import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_LOCATION_AGE = 30_000;
let recentEvidencePosition: Location.LocationObject | null = null;
let locationPending: Promise<Location.LocationObject> | null = null;

export function evidenceSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('The camera returned invalid photo dimensions. Please retake the photo.');
  }
  // Match the existing evidence canvas: no reduction in the saved resolution.
  const scale = Math.min(1, 1280 / width, 960 / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function isRecentPosition(position: Location.LocationObject | null, now = Date.now()): position is Location.LocationObject {
  if (!position || !Number.isFinite(position.timestamp) || now - position.timestamp < 0 ||
      now - position.timestamp > MAX_LOCATION_AGE) return false;
  const { latitude, longitude, accuracy } = position.coords;
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) && Math.abs(longitude) <= 180 &&
    accuracy != null && Number.isFinite(accuracy) && accuracy >= 0;
}

export async function getEvidencePosition(warmed?: Location.LocationObject): Promise<Location.LocationObject> {
  if (isRecentPosition(warmed ?? null)) {
    recentEvidencePosition = warmed!;
    return warmed!;
  }
  if (isRecentPosition(recentEvidencePosition) && recentEvidencePosition.coords.accuracy! <= 100) return recentEvidencePosition;
  if (locationPending) return locationPending;
  const pending = readEvidencePosition();
  locationPending = pending;
  try {
    const position = await pending;
    recentEvidencePosition = position;
    return position;
  } finally {
    if (locationPending === pending) locationPending = null;
  }
}

async function readEvidencePosition(): Promise<Location.LocationObject> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const recent = await Location.getLastKnownPositionAsync({
          maxAge: MAX_LOCATION_AGE, requiredAccuracy: 100,
        });
        if (isRecentPosition(recent) && recent.coords.accuracy! <= 100) return recent;
        const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isRecentPosition(fresh)) throw new Error('A recent GPS position is unavailable. Move to an open area and try again.');
        return fresh;
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Location took too long. Check Location is enabled and try again in an open area.')), 12_000);
      }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function prepareEvidencePhoto(asset: { uri: string; width: number; height: number }) {
  const size = evidenceSize(asset.width, asset.height);
  const result = await ImageManipulator.manipulateAsync(asset.uri,
    [{ resize: size }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  if (!result.base64 || result.base64.length > 3_000_000) {
    throw new Error('The camera photo could not be prepared. Please retake it.');
  }
  return { image: `data:image/jpeg;base64,${result.base64}`, uri: result.uri };
}
