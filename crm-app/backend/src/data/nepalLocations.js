const {
  getProvinces,
  getDistricts,
  getMunicipalities,
  getWards,
  getMeta,
  loadCacheFromDisk,
} = require('../services/nepalLocationService');

loadCacheFromDisk();

module.exports = {
  getProvinces,
  getDistricts,
  getMunicipalities,
  getWards,
  getMeta,
};
