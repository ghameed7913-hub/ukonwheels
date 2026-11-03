import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useColors } from '@/hooks/useColors';
import { PORTAL_URL } from '@/lib/portal';

type Place = { id?: string; name: string; label: string; latitude: number; longitude: number; countryCode: string; areas: string[] };
type Warning = { title: string; description: string; url: string; level: 'yellow' | 'amber' | 'red' };
type WeatherResponse = {
  place: Place;
  weather: null | { temperatureC: number; windKph: number; condition: string; forecastAt: string; updatedAt: string };
  weatherError: null | string;
  warnings: { status: 'ok' | 'unavailable' | 'unsupported' | 'unmatched'; area: string; items: Warning[]; checkedAt: string | null; message: string };
  fetchedAt: string;
};
type Coords = { lat: number; lon: number };

const REFRESH_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 15000;
const PREVIEW = 3;
const round2 = (n: number) => Math.round(n * 100) / 100;
const api = (params: Record<string, string>) => {
  const u = new URL('weather-api', PORTAL_URL);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
};
const fmt = (iso?: string | null, day = false) => {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'unknown';
  return d.toLocaleString('en-GB', day ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' });
};
const safeUrl = (u: string) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null; } catch { return null; } };
async function getJson<T>(url: string, ctrl: AbortController): Promise<T> {
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    const b = await r.json().catch(() => { throw new Error('The weather service is not available yet. Please try again later.'); });
    if (!r.ok) throw new Error((b as { error?: string }).error || `Weather service returned ${r.status}`);
    if (!b || (!Array.isArray(b.places) && (!b.place || !b.warnings))) throw new Error('The weather service returned an incomplete response.');
    return b as T;
  } finally { clearTimeout(t); }
}
const errText = (e: unknown) => (e as Error)?.name === 'AbortError' ? 'The weather service took too long to respond, or you are offline.' : (e as Error)?.message?.includes('Network') ? 'You appear to be offline. Try again when connected.' : (e as Error)?.message || 'Weather could not be loaded.';

export default function LocalWeather({ active = true }: { active?: boolean }) {
  const c = useColors();
  const [mode, setMode] = useState<'none' | 'gps' | 'manual'>('none');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');
  const [denied, setDenied] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Place[] | null>(null);
  const [searchError, setSearchError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const reqId = useRef(0), searchId = useRef(0), geoId = useRef(0);
  const activeRef = useRef(active); activeRef.current = active;
  const ctrl = useRef<AbortController | null>(null), sctrl = useRef<AbortController | null>(null);
  const modeRef = useRef(mode); modeRef.current = mode;
  const lastFetch = useRef(0);

  const load = useCallback(async (at: Coords) => {
    ctrl.current?.abort();
    const ac = new AbortController(); ctrl.current = ac;
    const id = ++reqId.current;
    setLoading(true); setError('');
    try {
      const b = await getJson<WeatherResponse>(api({ lat: String(at.lat), lon: String(at.lon) }), ac);
      if (id !== reqId.current) return;
      setData(b); setExpanded(false); lastFetch.current = Date.now();
    } catch (e) {
      if (id !== reqId.current) return;
      setError(errText(e));
    } finally { if (id === reqId.current) setLoading(false); }
  }, []);

  const locate = useCallback(async (userInitiated: boolean) => {
    const id = ++geoId.current;
    if (Platform.OS === 'web') { setGeoMsg('Use the town or city search on web preview.'); return; }
    setGeoBusy(true); setGeoMsg('');
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && userInitiated && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setDenied(true);
        if (userInitiated) setGeoMsg('Location permission is off. Allow location in Settings, or search for a town or city.');
        return;
      }
      setDenied(false);
      let pos = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
      if (!pos) {
        pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000)),
        ]);
      }
      if (!pos) throw new Error('timeout');
      if (id !== geoId.current || !activeRef.current) return;
      if (!userInitiated && modeRef.current === 'manual') return;
      const at = { lat: round2(pos.coords.latitude), lon: round2(pos.coords.longitude) };
      setMode('gps'); setCoords(at); setShowSearch(false); setResults(null);
      void load(at);
    } catch (e) {
      if (id !== geoId.current) return;
      setGeoMsg((e as Error)?.message === 'timeout' ? 'Finding your location timed out. Try again or search for a town or city.' : 'Your location could not be determined. Search for a town or city instead.');
      setShowSearch(true);
    } finally { if (id === geoId.current) setGeoBusy(false); }
  }, [load]);

  const refresh = useCallback(() => {
    if (modeRef.current === 'gps') void locate(false);
    else if (coords) void load(coords);
  }, [coords, load, locate]);
  const refreshRef = useRef(refresh); refreshRef.current = refresh;
  const locateRef = useRef(locate); locateRef.current = locate;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Location.getForegroundPermissionsAsync().then(p => { if (p.granted && modeRef.current === 'none') void locateRef.current(false); }).catch(() => {});
    }
    const due = () => activeRef.current && lastFetch.current > 0 && Date.now() - lastFetch.current >= REFRESH_MS - 5000;
    const iv = setInterval(() => { if (AppState.currentState === 'active' && due()) refreshRef.current(); }, 60000);
    const sub = AppState.addEventListener('change', st => { if (st === 'active' && due()) refreshRef.current(); });
    return () => { clearInterval(iv); sub.remove(); ++geoId.current; ++reqId.current; ++searchId.current; ctrl.current?.abort(); sctrl.current?.abort(); };
  }, []);

  async function search() {
    const q = query.trim();
    if (q.length < 2) { setSearchError('Enter at least 2 characters.'); setResults(null); return; }
    sctrl.current?.abort();
    const ac = new AbortController(); sctrl.current = ac;
    const id = ++searchId.current;
    setSearching(true); setSearchError(''); setResults(null);
    try {
      const b = await getJson<{ places: Place[] }>(api({ q }), ac);
      if (id !== searchId.current) return;
      const list = (b.places || []).slice(0, 5);
      setResults(list);
      if (!list.length) setSearchError(`No places found for "${q}". Check the spelling or try a nearby town.`);
    } catch (e) { if (id === searchId.current) setSearchError(errText(e)); }
    finally { if (id === searchId.current) setSearching(false); }
  }
  function pick(p: Place) {
    ++geoId.current; setGeoBusy(false);
    const at = { lat: round2(p.latitude), lon: round2(p.longitude) };
    setMode('manual'); setCoords(at); setResults(null); setShowSearch(false); setQuery(''); setGeoMsg('');
    void load(at);
  }

  const wx = data?.weather, w = data?.warnings, stale = !!data && !!error;
  const items = w?.items ?? [];
  const shown = expanded ? items : items.slice(0, PREVIEW);
  const levelColor = (l: string) => l === 'red' ? c.destructive : l === 'amber' ? c.warningAmber : c.warningYellow;
  const status = loading ? (data ? 'Refreshing…' : 'Loading weather…') : geoBusy ? 'Finding your location…' : '';
  const Btn = ({ label, onPress, disabled, icon, primary, testID }: { label: string; onPress: () => void; disabled?: boolean; icon: React.ComponentProps<typeof Feather>['name']; primary?: boolean; testID: string }) =>
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: primary ? c.primary : c.muted, borderColor: primary ? c.primary : c.border, opacity: disabled ? .5 : pressed ? .8 : 1 }]}>
      <Feather name={icon} size={14} color={primary ? c.white : c.navy} /><Text style={[s.btnText, { color: primary ? c.white : c.navy }]}>{label}</Text>
    </Pressable>;

  return <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]} accessibilityLabel="Local weather">
    <View style={s.head}>
      <View style={s.flex}>
        <Text style={[s.eyebrow, { color: c.mutedForeground }]}>LOCAL WEATHER{mode === 'gps' ? ' · YOUR LOCATION' : mode === 'manual' ? ' · CHOSEN PLACE' : ''}</Text>
        <Text numberOfLines={1} style={[s.place, { color: c.foreground }]}>{data?.place?.label || data?.place?.name || 'Choose a location'}</Text>
      </View>
      <Feather name="cloud" size={20} color={c.primary} />
    </View>
    <View style={s.actions}>
      <Btn testID="weather-locate" icon="crosshair" label="Use my location" onPress={() => void locate(true)} disabled={geoBusy} />
      <Btn testID="weather-search-toggle" icon="search" label={data ? 'Change city' : 'Search city'} onPress={() => setShowSearch(v => !v)} />
      {coords && <Btn testID="weather-refresh" icon="refresh-cw" label="Refresh" onPress={refresh} disabled={loading} />}
    </View>
    {!!status && <Text accessibilityLiveRegion="polite" style={[s.small, { color: c.mutedForeground }]}>{status}</Text>}
    {showSearch && <View style={s.gap}>
      <View style={s.searchRow}>
        <TextInput testID="weather-query" accessibilityLabel="Town or city" value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} returnKeyType="search" autoCorrect={false}
          placeholder="Town or city, e.g. Leeds" placeholderTextColor={c.mutedForeground} style={[s.input, { borderColor: c.border, color: c.foreground, backgroundColor: c.background }]} />
        <Btn testID="weather-search" icon="search" primary label={searching ? 'Searching…' : 'Search'} onPress={() => void search()} disabled={searching} />
      </View>
      {!!searchError && <Text accessibilityLiveRegion="polite" style={[s.small, { color: c.destructive }]}>{searchError}</Text>}
      {results?.map((p, i) => <Pressable key={p.id ?? `${p.latitude},${p.longitude},${i}`} accessibilityRole="button" accessibilityLabel={`Use ${p.label}`} onPress={() => pick(p)}
        style={({ pressed }) => [s.result, { borderColor: c.border, backgroundColor: pressed ? c.muted : c.card }]}>
        <Text style={[s.bold, { color: c.foreground }]}>{p.name}</Text>
        <Text style={[s.small, { color: c.mutedForeground }]}>{p.label}{p.areas?.length ? ` · ${p.areas.join(', ')}` : ''}</Text>
      </Pressable>)}
    </View>}
    {!data && !coords && !loading && <Text style={[s.small, { color: c.mutedForeground }]}>Use my location shares your approximate position (rounded to about 1 km) with our weather service, MET Norway and OpenStreetMap to find your local forecast. Or search for a town or city.</Text>}
    {!data && loading && <View style={s.gap}><View style={[s.skel, { width: '40%', height: 26, backgroundColor: c.muted }]} /><View style={[s.skel, { backgroundColor: c.muted }]} /></View>}
    {data && <View accessibilityLiveRegion="polite" style={s.gap}>
      {wx ? <>
        <View style={[s.now, stale && { opacity: .6 }]}>
          <Text style={[s.temp, { color: c.foreground }]}>{Math.round(wx.temperatureC)}°C</Text>
          <Text style={[s.bold, { color: c.foreground }]}>{wx.condition}</Text>
          <Text style={[s.small, { color: c.mutedForeground }]}>Wind {Math.round(wx.windKph)} km/h</Text>
        </View>
        <Text style={[s.small, { color: c.mutedForeground }]}>Forecast for {fmt(wx.forecastAt, true)} · Last refreshed {fmt(data.fetchedAt || wx.updatedAt, true)}</Text>
      </> : <Text style={[s.small, { color: c.destructive }]}>Current weather unavailable{data.weatherError ? `: ${data.weatherError}` : ''}. Last refreshed {fmt(data.fetchedAt, true)}.</Text>}
      {stale && <Text style={[s.small, { color: c.destructive }]}>Showing earlier data. {error}</Text>}
      {w && <View style={[s.warn, { borderColor: c.border }]}>
        <Text style={[s.eyebrow, { color: c.mutedForeground }]}>MET OFFICE WARNINGS{w.area ? ` · ${w.area.toUpperCase()}` : ''}</Text>
        {w.status !== 'ok' ? <Text style={[s.small, { color: c.foreground }]}>
          <Text style={s.bold}>{w.status === 'unsupported' ? 'Warnings not available for this location.' : w.status === 'unmatched' ? 'Warning region could not be matched.' : 'Warnings could not be checked.'}</Text> This does not mean there are no warnings. {w.message}{' '}
          <Text accessibilityRole="link" style={[s.link, { color: c.navy }]} onPress={() => void Linking.openURL('https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings').catch(() => {})}>Check the Met Office</Text>
        </Text> : !items.length ? <Text style={[s.small, { color: c.foreground }]}>No matching regional warnings{w.checkedAt ? ` (checked ${fmt(w.checkedAt)})` : ''}.</Text> : <>
          <Text style={[s.small, { color: c.foreground }]}>{items.length} current or upcoming warning{items.length === 1 ? '' : 's'}{w.checkedAt ? `, checked ${fmt(w.checkedAt)}` : ''}</Text>
          {shown.map((it, i) => { const u = safeUrl(it.url); return <View key={`${it.title}-${i}`} style={[s.item, { borderLeftColor: levelColor(it.level), backgroundColor: c.background }]}>
            <Text style={[s.level, { color: levelColor(it.level) }]}>{String(it.level).toUpperCase()} WARNING</Text>
            <Text style={[s.bold, { color: c.foreground }]}>{it.title}</Text>
            <Text style={[s.small, { color: c.mutedForeground }]}>{it.description}</Text>
            {u && <Text accessibilityRole="link" style={[s.link, { color: c.navy }]} onPress={() => void Linking.openURL(u).catch(() => {})}>Full warning</Text>}
          </View>; })}
          {items.length > PREVIEW && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(v => !v)} hitSlop={8}>
            <Text style={[s.link, { color: c.navy }]}>{expanded ? 'Show fewer' : `Show all ${items.length} warnings`}</Text>
          </Pressable>}
        </>}
        {w.status === 'ok' && <Text style={[s.small, { color: c.mutedForeground }]}>{w.message}{' '}
          <Text accessibilityRole="link" style={[s.link, { color: c.navy }]} onPress={() => void Linking.openURL('https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings').catch(() => {})}>Check warning map</Text>
        </Text>}
      </View>}
    </View>}
    {!data && !!error && <Text accessibilityLiveRegion="polite" style={[s.small, { color: c.destructive }]}>{error}</Text>}
    {!!error && !loading && coords && <Pressable accessibilityRole="button" onPress={refresh} hitSlop={8}><Text style={[s.link, { color: c.navy }]}>Try again</Text></Pressable>}
    {!!geoMsg && <Text accessibilityLiveRegion="polite" style={[s.small, { color: c.destructive }]}>{geoMsg}</Text>}
    {denied && !!geoMsg && <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings().catch(() => {})} hitSlop={8}><Text style={[s.link, { color: c.navy }]}>Open Settings</Text></Pressable>}
    <Text style={[s.attr, { color: c.mutedForeground }]}>
      Weather <Text style={s.link} onPress={() => void Linking.openURL('https://www.met.no/en').catch(() => {})}>MET Norway</Text> (<Text style={s.link} onPress={() => void Linking.openURL('https://creativecommons.org/licenses/by/4.0/').catch(() => {})}>CC BY 4.0</Text>, values rounded and wind converted) · Places © <Text style={s.link} onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})}>OpenStreetMap contributors</Text> · Warnings <Text style={s.link} onPress={() => void Linking.openURL('https://www.metoffice.gov.uk/').catch(() => {})}>Met Office</Text>
    </Text>
  </View>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  place: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, minHeight: 36 },
  btnText: { fontSize: 12, fontWeight: '600' },
  gap: { gap: 6 },
  searchRow: { flexDirection: 'row', gap: 6 },
  input: { flex: 1, borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, minHeight: 38, fontSize: 15 },
  result: { borderWidth: 1, borderRadius: 7, padding: 10 },
  small: { fontSize: 12, lineHeight: 17 },
  bold: { fontSize: 13, fontWeight: '700' },
  now: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
  temp: { fontSize: 28, fontWeight: '800' },
  skel: { height: 14, borderRadius: 5 },
  warn: { borderTopWidth: 1, paddingTop: 8, gap: 6 },
  item: { borderLeftWidth: 4, borderRadius: 6, padding: 8, gap: 2 },
  level: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  link: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  attr: { fontSize: 11, lineHeight: 15 },
});
