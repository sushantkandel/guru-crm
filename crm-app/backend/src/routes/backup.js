const express = require('express');
const multer = require('multer');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const {
  exportCompanyBackupBuffer,
  parseBackupZip,
  validateBackupData,
  restoreCompanyBackup,
} = require('../services/backupService');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(authMiddleware, tenantMiddleware, roleGuard('owner'));

function sendZip(res, { buffer, fileName, manifest }) {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  if (manifest?.exportedAt) {
    res.setHeader('X-Backup-Exported-At', manifest.exportedAt);
  }
  res.send(buffer);
}

router.get('/export', async (req, res, next) => {
  try {
    const { buffer, fileName, manifest } = await exportCompanyBackupBuffer(req.companyId);
    console.log(`[backup] export company=${req.companyId} user=${req.user.id}`);
    sendZip(res, { buffer, fileName, manifest });
  } catch (err) {
    next(err);
  }
});

router.post('/pre-restore-export', async (req, res, next) => {
  try {
    const { buffer, fileName, manifest } = await exportCompanyBackupBuffer(req.companyId);
    console.log(`[backup] pre-restore safety export company=${req.companyId} user=${req.user.id}`);
    sendZip(res, { buffer, fileName: fileName.replace('.zip', '-safety.zip'), manifest });
  } catch (err) {
    next(err);
  }
});

router.post('/validate', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Backup file is required (ZIP)' });
    }
    const parsed = parseBackupZip(req.file.buffer);
    const result = validateBackupData(parsed, req.companyId);
    res.json({
      valid: result.valid,
      manifest: result.manifest,
      warnings: result.warnings,
      counts: result.manifest.counts,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.post('/restore', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Backup file is required (ZIP)' });
    }
    if (req.body?.confirm !== 'RESTORE') {
      return res.status(400).json({ error: 'Type RESTORE in the confirm field to proceed' });
    }

    const parsed = parseBackupZip(req.file.buffer);
    const result = await restoreCompanyBackup(req.companyId, req.user.id, parsed);
    console.log(`[backup] restore company=${req.companyId} user=${req.user.id}`);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
