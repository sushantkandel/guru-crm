const fs = require('fs');
const path = require('path');

const SOURCE_URL =
  process.env.NEPAL_LOCATIONS_SOURCE_URL ||
  'https://raw.githubusercontent.com/sagautam5/local-states-nepal/master/dataset/alldataset/en.json';

const CACHE_PATH = path.join(__dirname, '../data/nepal-locations-cache.json');

const PROVINCE_NAME_MAP = {
  Bagmati: 'Bagmati Province',
  Gandaki: 'Gandaki Province',
  Lumbini: 'Lumbini Province',
  Karnali: 'Karnali Province',
  'Sudur Paschimanchal': 'Sudurpashchim Province',
};

let cachedLocations = null;
let cachedMeta = null;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function normalizeProvinceName(name) {
  return PROVINCE_NAME_MAP[name] || name;
}

function transformSourceData(provincesInput) {
  const provinces = asArray(provincesInput);
  const locations = {};
  let districtCount = 0;
  let municipalityCount = 0;
  let wardCount = 0;

  for (const province of provinces) {
    const provinceName = normalizeProvinceName(province.name);
    locations[provinceName] = {};

    for (const district of asArray(province.districts)) {
      districtCount += 1;
      locations[provinceName][district.name] = {};

      for (const municipality of asArray(district.municipalities)) {
        municipalityCount += 1;
        const wards = asArray(municipality.wards);
        wardCount += wards.length;
        locations[provinceName][district.name][municipality.name] = wards.length;
      }
    }
  }

  return {
    locations,
    stats: {
      provinces: provinces.length,
      districts: districtCount,
      municipalities: municipalityCount,
      wards: wardCount,
    },
  };
}

function applyCache(cache) {
  cachedLocations = cache.locations;
  cachedMeta = {
    syncedAt: cache.syncedAt,
    source: cache.source,
    stats: cache.stats,
  };
}

function loadCacheFromDisk() {
  if (!fs.existsSync(CACHE_PATH)) {
    return false;
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  if (!cache?.locations) {
    throw new Error('Invalid Nepal locations cache file');
  }
  applyCache(cache);
  return true;
}

function ensureLoaded() {
  if (cachedLocations) return;
  if (!loadCacheFromDisk()) {
    throw new Error(
      'Nepal location cache not found. Run `npm run locations:sync` or use Settings → Sync Location Data.'
    );
  }
}

function wardList(count) {
  const safeCount = Number(count) > 0 ? Number(count) : 9;
  return Array.from({ length: safeCount }, (_, i) => String(i + 1));
}

function getProvinces() {
  ensureLoaded();
  return Object.keys(cachedLocations).sort();
}

function getDistricts(province) {
  ensureLoaded();
  const districts = cachedLocations[province];
  if (!districts) return [];
  return Object.keys(districts).sort();
}

function getMunicipalities(province, district) {
  ensureLoaded();
  const municipalities = cachedLocations[province]?.[district];
  if (!municipalities) return [];
  return Object.keys(municipalities).sort();
}

function getWards(province, district, municipality) {
  ensureLoaded();
  const municipalities = cachedLocations[province]?.[district];
  if (!municipalities) return wardList(9);
  const count = municipalities[municipality];
  if (!count) return wardList(9);
  return wardList(count);
}

function getMeta() {
  ensureLoaded();
  return { ...cachedMeta };
}

async function fetchAndSyncFromSource() {
  const response = await fetch(SOURCE_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'crm-app-nepal-locations-sync' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch location data (${response.status} ${response.statusText})`);
  }

  const raw = await response.json();
  const { locations, stats } = transformSourceData(raw);

  const cache = {
    syncedAt: new Date().toISOString(),
    source: SOURCE_URL,
    stats,
    locations,
  };

  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  applyCache(cache);

  return getMeta();
}

module.exports = {
  SOURCE_URL,
  CACHE_PATH,
  transformSourceData,
  loadCacheFromDisk,
  fetchAndSyncFromSource,
  getMeta,
  getProvinces,
  getDistricts,
  getMunicipalities,
  getWards,
};
