const fs = require('fs');
const path = require('path');
const shapefile = require('shapefile');
const proj4 = require('proj4');
const { CACHE_PATH, loadCacheFromDisk } = require('./nepalLocationService');

// SaugatPdl ward shapefile uses Nepal National Grid (Everest), not WGS84 lat/lng
const SHAPEFILE_CRS = 'EPSG:24381';
proj4.defs(
  SHAPEFILE_CRS,
  '+proj=tmerc +lat_0=0 +lon_0=84 +k=0.9996 +x_0=500000 +y_0=0 +ellps=everest +a=6377301.243 +b=6356100.23 +units=m +no_defs'
);

const MESUGAT_SOURCE_URL =
  process.env.NEPAL_BOUNDARIES_MESUGAT_URL ||
  'https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-wards.geojson';

const SHAPEFILE_BASE_URL =
  process.env.NEPAL_BOUNDARIES_SHAPEFILE_BASE ||
  'https://media.githubusercontent.com/media/SaugatPdl/nepal-administrative-boundary-shapefiles/main/Ward';

const DATA_DIR = path.join(__dirname, '../data/nepal-boundaries');
const WARDS_DIR = path.join(DATA_DIR, 'wards');
const INDEX_PATH = path.join(DATA_DIR, 'boundaries-index.json');
const META_PATH = path.join(DATA_DIR, 'boundaries-meta.json');

// SaugatPdl ward shapefile property mapping (NEW_WARD_N, GaPa_NaPa, Type_GN, DISTRICT)
const TYPE_SUFFIX = {
  Mahanagarpalika: 'Metropolitan City',
  Upamahanagarpalika: 'Sub-Metropolitan City',
  Nagarpalika: 'Municipality',
  Gaunpalika: 'Rural Municipality',
};

let cachedIndex = null;
let cachedMeta = null;
let cachedMetaMtime = null;

function titleCase(value) {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function municipalityBaseName(name) {
  return name.replace(
    /\s+(Metropolitan City|Sub-Metropolitan City|Municipality|Rural Municipality)$/i,
    ''
  );
}

function isWgs84Pair(pair) {
  const [x, y] = pair;
  return Math.abs(x) <= 180 && Math.abs(y) <= 90;
}

function transformCoordinatePair(pair) {
  if (isWgs84Pair(pair)) return pair;
  const [lng, lat] = proj4(SHAPEFILE_CRS, 'EPSG:4326', pair);
  return [lng, lat];
}

function transformCoordinates(coords) {
  if (typeof coords[0] === 'number') {
    return transformCoordinatePair(coords);
  }
  return coords.map(transformCoordinates);
}

function transformGeometry(geometry) {
  if (!geometry?.coordinates) return geometry;
  return {
    ...geometry,
    coordinates: transformCoordinates(geometry.coordinates),
  };
}

function levenshtein(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  const cols = rows[0];
  for (let j = 1; j <= b.length; j += 1) cols[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
    }
  }
  return rows[a.length][b.length];
}

function loadLocationTree() {
  loadCacheFromDisk();
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  return cache.locations;
}

// Shapefile district labels often differ from MoFAGA / location-cache names.
const SHAPEFILE_DISTRICT_ALIASES = {
  ACHHAM: 'Acham',
  CHITAWAN: 'Chitwan',
  KABHREPALANCHOK: 'Kavrepalanchok',
  KAPILBASTU: 'Kapilvastu',
  MAKAWANPUR: 'Makwanpur',
  NAWALPARASI_E: 'Nawalpur',
  NAWALPARASI_W: 'Parasi',
  PANCHTHAR: 'Pachthar',
  PARBAT: 'Parwat',
  RAMECHHAP: 'Ramechap',
  RUKUM_E: 'Eastern Rukum',
  RUKUM_W: 'Western Rukum',
  TANAHU: 'Tanahun',
};

function findDistrictKey(districtName, locations) {
  const target = normalizeKey(districtName);
  for (const province of Object.keys(locations)) {
    for (const district of Object.keys(locations[province])) {
      if (normalizeKey(district) === target) {
        return { province, district };
      }
    }
  }
  return null;
}

function resolveShapefileDistrict(districtName, locations) {
  const raw = String(districtName || '').trim();
  if (!raw) return null;

  const alias = SHAPEFILE_DISTRICT_ALIASES[raw.toUpperCase()];
  if (alias) {
    const hit = findDistrictKey(alias, locations);
    if (hit) return hit;
  }

  const direct = findDistrictKey(raw, locations);
  if (direct) return direct;

  const target = normalizeKey(raw);
  let best = null;
  let bestScore = Infinity;

  for (const province of Object.keys(locations)) {
    for (const district of Object.keys(locations[province])) {
      const score = levenshtein(target, normalizeKey(district));
      if (score < bestScore) {
        bestScore = score;
        best = { province, district };
      }
    }
  }

  if (best && bestScore <= 2) {
    return best;
  }

  return null;
}

function buildMunicipalityCandidates(gaPaNaPa, typeGn) {
  const suffix = TYPE_SUFFIX[typeGn] || 'Municipality';
  const titled = titleCase(gaPaNaPa);
  return [
    `${gaPaNaPa} ${suffix}`,
    `${titled} ${suffix}`,
    `${gaPaNaPa} Metropolitan City`,
    `${titled} Metropolitan City`,
    gaPaNaPa,
    titled,
  ];
}

function matchMunicipality(districtName, gaPaNaPa, typeGn, locations) {
  const districtHit = resolveShapefileDistrict(districtName, locations);
  if (!districtHit) return null;

  const { province, district } = districtHit;
  const municipalities = Object.keys(locations[province][district]);
  const candidates = buildMunicipalityCandidates(gaPaNaPa, typeGn);

  for (const candidate of candidates) {
    if (municipalities.includes(candidate)) {
      return { province, district, municipality: candidate };
    }
  }

  const sourceBase = normalizeKey(gaPaNaPa);
  let best = null;
  let bestScore = Infinity;

  for (const municipality of municipalities) {
    const targetBase = normalizeKey(municipalityBaseName(municipality));
    const score = levenshtein(sourceBase, targetBase);
    if (score < bestScore) {
      bestScore = score;
      best = municipality;
    }
  }

  if (best && bestScore <= 3) {
    return { province, district, municipality: best };
  }

  return null;
}

function chunkFilename(province, district, municipality) {
  const slug = [province, district, municipality]
    .map((part) =>
      normalizeKey(part).slice(0, 40) || 'unknown'
    )
    .join('__');
  return `${slug}.geojson`;
}

function applyMeta(meta) {
  cachedMeta = meta;
}

function applyIndex(index) {
  cachedIndex = index;
}

function loadMetaFromDisk() {
  if (!fs.existsSync(META_PATH)) return false;
  applyMeta(JSON.parse(fs.readFileSync(META_PATH, 'utf8')));
  return true;
}

function loadIndexFromDisk() {
  if (!fs.existsSync(INDEX_PATH)) return false;
  applyIndex(JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')));
  return true;
}

function ensureLoaded() {
  const metaMtime = fs.existsSync(META_PATH) ? fs.statSync(META_PATH).mtimeMs : null;
  if (cachedIndex && cachedMeta && cachedMetaMtime === metaMtime) return;

  if (!loadIndexFromDisk() || !loadMetaFromDisk()) {
    throw new Error(
      'Nepal boundary cache not found. Run `npm run boundaries:sync` or use Settings → Sync Ward Boundaries.'
    );
  }

  cachedMetaMtime = metaMtime;
}

function getMeta() {
  ensureLoaded();
  return { ...cachedMeta };
}

function indexKey(province, district, municipality) {
  return `${province}||${district}||${municipality}`;
}

function getWardBoundaries(province, district, municipality, ward) {
  ensureLoaded();

  if (!province || !district || !municipality) {
    return { type: 'FeatureCollection', features: [] };
  }

  const key = indexKey(province, district, municipality);
  const entry = cachedIndex[key];
  if (!entry) {
    return { type: 'FeatureCollection', features: [] };
  }

  const chunkPath = path.join(WARDS_DIR, entry.file);
  if (!fs.existsSync(chunkPath)) {
    return { type: 'FeatureCollection', features: [] };
  }

  const collection = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
  if (!ward) {
    return collection;
  }

  const wardNumber = String(ward);
  return {
    type: 'FeatureCollection',
    features: collection.features.filter(
      (feature) => String(feature.properties?.ward) === wardNumber
    ),
  };
}

async function downloadShapefileComponent(filename) {
  const url = `${SHAPEFILE_BASE_URL}/${filename}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'crm-app-nepal-boundaries-sync' },
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${filename} (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error(`Downloaded empty file: ${filename}`);
  }
  return buffer;
}

async function isMesaugatWardData(geojson) {
  const sample = geojson.features?.[0]?.properties;
  if (!sample) return false;
  return Boolean(sample.VDC_NAME || sample.VDC_CODE) && !sample.NEW_WARD_N;
}

async function syncFromShapefile(locations) {
  const tempDir = path.join(DATA_DIR, '_sync-temp');
  fs.mkdirSync(tempDir, { recursive: true });

  const shpPath = path.join(tempDir, '5_NepalWards.shp');
  const dbfPath = path.join(tempDir, '5_NepalWards.dbf');

  const [shp, dbf] = await Promise.all([
    downloadShapefileComponent('5_NepalWards.shp'),
    downloadShapefileComponent('5_NepalWards.dbf'),
  ]);

  fs.writeFileSync(shpPath, shp);
  fs.writeFileSync(dbfPath, dbf);

  const chunks = {};
  const index = {};
  let wardCount = 0;
  let matchedWards = 0;
  const unmatchedMunicipalities = new Set();

  const source = await shapefile.open(shpPath, dbfPath);
  while (true) {
    const result = await source.read();
    if (result.done) break;

    const { geometry, properties } = result.value;
    wardCount += 1;

    const match = matchMunicipality(
      properties.DISTRICT,
      properties.GaPa_NaPa,
      properties.Type_GN,
      locations
    );

    if (!match) {
      unmatchedMunicipalities.add(
        `${properties.DISTRICT} / ${properties.GaPa_NaPa} (${properties.Type_GN})`
      );
      continue;
    }

    matchedWards += 1;
    const key = indexKey(match.province, match.district, match.municipality);
    if (!chunks[key]) {
      chunks[key] = {
        match,
        features: [],
      };
    }

    chunks[key].features.push({
      type: 'Feature',
      properties: {
        province: match.province,
        district: match.district,
        municipality: match.municipality,
        ward: String(properties.NEW_WARD_N),
        wardNumber: Number(properties.NEW_WARD_N),
        sourceMunicipality: properties.GaPa_NaPa,
        sourceType: properties.Type_GN,
      },
      geometry: transformGeometry(geometry),
    });
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(WARDS_DIR, { recursive: true });

  const existingFiles = fs.existsSync(WARDS_DIR)
    ? fs.readdirSync(WARDS_DIR).filter((name) => name.endsWith('.geojson'))
    : [];
  for (const file of existingFiles) {
    fs.unlinkSync(path.join(WARDS_DIR, file));
  }

  let municipalitiesMatched = 0;
  for (const [key, chunk] of Object.entries(chunks)) {
    municipalitiesMatched += 1;
    const file = chunkFilename(chunk.match.province, chunk.match.district, chunk.match.municipality);
    const collection = { type: 'FeatureCollection', features: chunk.features };
    fs.writeFileSync(path.join(WARDS_DIR, file), JSON.stringify(collection));

    index[key] = {
      file,
      province: chunk.match.province,
      district: chunk.match.district,
      municipality: chunk.match.municipality,
      wardCount: chunk.features.length,
      wards: chunk.features
        .map((feature) => Number(feature.properties.ward))
        .sort((a, b) => a - b),
    };
  }

  return {
    source: SHAPEFILE_BASE_URL,
    sourceType: 'saugatpdl-shapefile',
    wardCount,
    matchedWards,
    municipalitiesMatched,
    municipalitiesUnmatched: unmatchedMunicipalities.size,
    unmatchedSamples: Array.from(unmatchedMunicipalities).slice(0, 25),
    index,
  };
}

async function fetchAndSyncFromSource() {
  const locations = loadLocationTree();
  let syncResult;

  try {
    const response = await fetch(MESUGAT_SOURCE_URL, {
      headers: { Accept: 'application/json', 'User-Agent': 'crm-app-nepal-boundaries-sync' },
    });
    if (response.ok) {
      const geojson = await response.json();
      if (!(await isMesaugatWardData(geojson))) {
        syncResult = await syncFromShapefile(locations);
      } else {
        syncResult = await syncFromShapefile(locations);
      }
    } else {
      syncResult = await syncFromShapefile(locations);
    }
  } catch {
    syncResult = await syncFromShapefile(locations);
  }

  const meta = {
    syncedAt: new Date().toISOString(),
    source: syncResult.source,
    sourceType: syncResult.sourceType,
    stats: {
      wardsInSource: syncResult.wardCount,
      wardsIndexed: syncResult.matchedWards,
      municipalitiesMatched: syncResult.municipalitiesMatched,
      municipalitiesUnmatched: syncResult.municipalitiesUnmatched,
      unmatchedSamples: syncResult.unmatchedSamples,
    },
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(syncResult.index, null, 2));
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));

  applyIndex(syncResult.index);
  applyMeta(meta);

  return getMeta();
}

module.exports = {
  MESUGAT_SOURCE_URL,
  SHAPEFILE_BASE_URL,
  DATA_DIR,
  INDEX_PATH,
  META_PATH,
  matchMunicipality,
  fetchAndSyncFromSource,
  getWardBoundaries,
  getMeta,
  loadIndexFromDisk,
  loadMetaFromDisk,
};
