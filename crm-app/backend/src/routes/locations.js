const express = require('express');
const { getProvinces, getDistricts, getMunicipalities, getWards, getMeta } = require('../data/nepalLocations');
const { fetchAndSyncFromSource } = require('../services/nepalLocationService');
const {
  getWardBoundaries,
  getMeta: getBoundaryMeta,
  fetchAndSyncFromSource: fetchAndSyncBoundaries,
} = require('../services/nepalBoundaryService');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/nepal', (req, res, next) => {
  try {
    const { province, district, municipality } = req.query;

    if (!province) {
      return res.json({ provinces: getProvinces() });
    }
    if (!district) {
      return res.json({ districts: getDistricts(province) });
    }
    if (!municipality) {
      return res.json({ municipalities: getMunicipalities(province, district) });
    }
    return res.json({ wards: getWards(province, district, municipality) });
  } catch (err) {
    next(err);
  }
});

router.get('/nepal/meta', (req, res, next) => {
  try {
    res.json(getMeta());
  } catch (err) {
    next(err);
  }
});

router.post('/nepal/sync', roleGuard('owner'), async (req, res, next) => {
  try {
    const meta = await fetchAndSyncFromSource();
    res.json({
      message: 'Nepal location data updated successfully',
      ...meta,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/nepal/boundaries', (req, res, next) => {
  try {
    const { province, district, municipality, ward } = req.query;
    const collection = getWardBoundaries(province, district, municipality, ward);
    res.json(collection);
  } catch (err) {
    next(err);
  }
});

router.get('/nepal/boundaries/meta', (req, res, next) => {
  try {
    res.json(getBoundaryMeta());
  } catch (err) {
    next(err);
  }
});

router.post('/nepal/boundaries/sync', roleGuard('owner'), async (req, res, next) => {
  try {
    const meta = await fetchAndSyncBoundaries();
    res.json({
      message: 'Nepal ward boundaries updated successfully',
      ...meta,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
