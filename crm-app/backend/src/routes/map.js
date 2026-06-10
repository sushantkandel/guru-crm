const express = require('express');
const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/shops', async (req, res, next) => {
  try {
    const { province, district, municipality, ward } = req.query;
    const addressWhere = {
      latitude: { not: null },
      longitude: { not: null },
    };
    if (province) addressWhere.province = province;
    if (district) addressWhere.district = district;
    if (municipality) addressWhere.municipality = municipality;
    if (ward) addressWhere.ward = ward;

    const customerWhere = { companyId: req.companyId };
    if (req.user.role === 'staff') {
      customerWhere.assignedTo = req.user.id;
    }

    const addresses = await prisma.address.findMany({
      where: {
        ...addressWhere,
        customer: customerWhere,
        isPrimary: true,
      },
      include: {
        customer: {
          select: { id: true, name: true, shopName: true, phone: true, panVatNumber: true },
        },
      },
    });

    const shops = addresses.map((a) => ({
      customerId: a.customer.id,
      name: a.customer.name,
      shopName: a.customer.shopName,
      phone: a.customer.phone,
      panVatNumber: a.customer.panVatNumber,
      province: a.province,
      district: a.district,
      municipality: a.municipality,
      ward: a.ward,
      street: a.street,
      latitude: a.latitude,
      longitude: a.longitude,
    }));

    res.json(shops);
  } catch (err) {
    next(err);
  }
});

const MUNICIPALITY_SPELLING_ALIASES = {
  gaindakot: 'Gaidakot',
  devachuli: 'Devchuli',
  madhyabindu: 'Madhyabindu',
  baudikali: 'Bungdikali',
};

function municipalityBaseName(name) {
  return String(name || '').replace(
    /\s+(Metropolitan City|Sub-Metropolitan City|Municipality|Rural Municipality)$/i,
    ''
  );
}

function buildGeocodeQueries(address) {
  const queries = [address];
  const parts = String(address)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  for (let i = 0; i < parts.length; i += 1) {
    const base = municipalityBaseName(parts[i]).toLowerCase();
    const alias = MUNICIPALITY_SPELLING_ALIASES[base];
    if (alias) {
      const altParts = [...parts];
      altParts[i] = alias;
      queries.push(altParts.join(', '));
    }
  }

  return [...new Set(queries)];
}

async function nominatimSearch(query, { bounded = true } = {}) {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    q: query,
    countrycodes: 'np',
    viewbox: '80.06,30.45,88.2,26.35',
    bounded: bounded ? '1' : '0',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': process.env.NOMINATIM_USER_AGENT || 'SalesGuru/1.0',
    },
  });

  if (!response.ok) {
    throw new Error('Geocoding service unavailable');
  }

  const results = await response.json();
  return results?.[0] || null;
}

router.post('/geocode', async (req, res, next) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Address is required' });

    const queries = buildGeocodeQueries(address);
    let hit = null;

    for (const query of queries) {
      hit = await nominatimSearch(query, { bounded: true });
      if (hit) break;
    }

    if (!hit) {
      for (const query of queries) {
        hit = await nominatimSearch(query, { bounded: false });
        if (hit) break;
      }
    }

    if (!hit) {
      return res.status(404).json({ error: 'Could not geocode address' });
    }

    res.json({
      latitude: parseFloat(hit.lat),
      longitude: parseFloat(hit.lon),
      formattedAddress: hit.display_name,
    });
  } catch (err) {
    if (err.message === 'Geocoding service unavailable') {
      return res.status(502).json({ error: err.message });
    }
    next(err);
  }
});

const OSRM_BASE_URL =
  process.env.OSRM_URL || 'https://router.project-osrm.org';

function parseCoord(value, name) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid ${name}`);
  }
  return num;
}

router.get('/route', async (req, res, next) => {
  try {
    const fromLat = parseCoord(req.query.fromLat, 'fromLat');
    const fromLng = parseCoord(req.query.fromLng, 'fromLng');
    const toLat = parseCoord(req.query.toLat, 'toLat');
    const toLng = parseCoord(req.query.toLng, 'toLng');

    const url =
      `${OSRM_BASE_URL}/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      '?overview=full&geometries=geojson&steps=false';

    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'SalesGuru/1.0' },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Routing service unavailable' });
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.length) {
      return res.status(404).json({ error: 'No driving route found between these points' });
    }

    const route = data.routes[0];
    res.json({
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry,
    });
  } catch (err) {
    if (err.message?.startsWith('Invalid ')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
