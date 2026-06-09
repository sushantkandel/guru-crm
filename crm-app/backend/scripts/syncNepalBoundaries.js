#!/usr/bin/env node
/**
 * Downloads Nepal ward boundaries, chunks them by municipality,
 * and writes backend/src/data/nepal-boundaries/**
 */
const { fetchAndSyncFromSource, DATA_DIR } = require('../src/services/nepalBoundaryService');

fetchAndSyncFromSource()
  .then((meta) => {
    console.log('Nepal ward boundaries synced successfully.');
    console.log('Data dir:', DATA_DIR);
    console.log('Stats:', meta.stats);
    console.log('Source:', meta.sourceType, meta.source);
    console.log('Synced at:', meta.syncedAt);
  })
  .catch((err) => {
    console.error('Boundary sync failed:', err.message);
    process.exit(1);
  });
