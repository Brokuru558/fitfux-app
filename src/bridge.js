// FitFux native bridge – Health Connect, Barcode, Open Food Facts, Dateien
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Health } from 'capacitor-health';

const native = Capacitor.isNativePlatform();
const UA = 'FitFux/1.0 (Android; private use)';
const HC_PERMS = ['READ_STEPS', 'READ_WORKOUTS', 'READ_WEIGHT', 'READ_ACTIVE_CALORIES', 'READ_TOTAL_CALORIES', 'READ_DISTANCE'];

const iso = (d) => new Date(d).toISOString();
const dayStart = (dateStr) => new Date(dateStr + 'T00:00:00');

async function offGet(url) {
  const r = await CapacitorHttp.get({ url, headers: { 'User-Agent': UA, Accept: 'application/json' }, connectTimeout: 10000, readTimeout: 15000 });
  if (r.status >= 400) throw new Error('HTTP ' + r.status);
  return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
}
function offProduct(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null);
  if (kcal == null) return null;
  const name = [p.product_name_de || p.product_name, p.brands ? '(' + String(p.brands).split(',')[0].trim() + ')' : ''].filter(Boolean).join(' ').trim();
  return {
    name: name || 'Unbekanntes Produkt', code: p.code, kcal: Math.round(kcal),
    p: +(n.proteins_100g ?? 0), c: +(n.carbohydrates_100g ?? 0), f: +(n.fat_100g ?? 0),
    sug: +(n.sugars_100g ?? 0), fib: +(n.fiber_100g ?? 0), salt: +(n.salt_100g ?? 0),
    serving: p.serving_quantity ? Math.round(+p.serving_quantity) : null, servingLabel: p.serving_size || '',
    ml: /ml|l\b/i.test(String(p.quantity || '')) && !/g\b/i.test(String(p.quantity || '')),
    per100: true, src: 'off'
  };
}
const FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_size,serving_quantity,quantity';

window.FX = {
  native,
  platform: Capacitor.getPlatform(),
  async scan() {
    if (!native) throw new Error('Nur in der App');
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable().catch(() => ({ available: true }));
    if (!available) { await BarcodeScanner.installGoogleBarcodeScannerModule(); throw new Error('Scanner wird installiert – gleich nochmal tippen'); }
    const { barcodes } = await BarcodeScanner.scan({ formats: [] });
    return barcodes?.[0]?.rawValue || null;
  },
  async offLookup(code) {
    const j = await offGet(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
    return j.status === 1 ? offProduct(j.product) : null;
  },
  async offSearch(q) {
    const j = await offGet(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&sort_by=unique_scans_n&countries_tags_en=germany&fields=${FIELDS}`);
    return (j.products || []).map(offProduct).filter(Boolean);
  },
  health: {
    async available() { if (!native) return false; try { return (await Health.isHealthAvailable()).available; } catch { return false; } },
    async connect() { return Health.requestHealthPermissions({ permissions: HC_PERMS }); },
    async granted() {
      try { const r = await Health.checkHealthPermissions({ permissions: HC_PERMS }); const m = Object.assign({}, ...(r.permissions || [])); return !!m.READ_STEPS; } catch { return false; }
    },
    openSettings() { return Health.openHealthConnectSettings(); },
    install() { return Health.showHealthConnectInPlayStore(); },
    async steps(fromDate, toDate) {
      const r = await Health.queryAggregated({ startDate: iso(dayStart(fromDate)), endDate: iso(new Date(dayStart(toDate).getTime() + 864e5)), dataType: 'steps', bucket: 'day' });
      const out = {};
      for (const s of r.aggregatedData || []) { const d = new Date(s.startDate); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); out[k] = Math.round(s.value); }
      return out;
    },
    async workouts(fromDate, toDate) {
      const r = await Health.queryWorkouts({ startDate: iso(dayStart(fromDate)), endDate: iso(new Date(dayStart(toDate).getTime() + 864e5)), includeHeartRate: false, includeRoute: false, includeSteps: false });
      return r.workouts || [];
    },
    async weights(fromDate, toDate) {
      const r = await Health.queryRecords({ startDate: iso(dayStart(fromDate)), endDate: iso(new Date(dayStart(toDate).getTime() + 864e5)), dataType: 'weight' });
      return r.records || [];
    }
  },
  async saveFile(name, data, mime = 'application/json') {
    const w = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, url: w.uri, dialogTitle: 'Speichern oder teilen' });
  },
  onResume(cb) { if (native) App.addListener('resume', cb); },
  onBack(cb) { if (native) App.addListener('backButton', cb); },
  exit() { App.exitApp(); }
};
window.dispatchEvent(new Event('fx-ready'));
