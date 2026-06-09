#!/usr/bin/env node
/**
 * Fetches full Nepal Province → District → Municipality → Ward data
 * from local-states-nepal and writes backend/src/data/nepal-locations-cache.json
 */
const { fetchAndSyncFromSource, CACHE_PATH } = require('../src/services/nepalLocationService');

fetchAndSyncFromSource()
  .then((meta) => {
    console.log('Nepal locations synced successfully.');
    console.log('Cache file:', CACHE_PATH);
    console.log('Stats:', meta.stats);
    console.log('Synced at:', meta.syncedAt);
  })
  .catch((err) => {
    console.error('Sync failed:', err.message);
    process.exit(1);
  });
