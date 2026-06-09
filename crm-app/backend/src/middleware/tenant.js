function tenantMiddleware(req, res, next) {
  if (!req.user?.companyId) {
    return res.status(403).json({ error: 'Company context required' });
  }
  req.companyId = req.user.companyId;
  next();
}

function ownerOnlyDelete(req, res, next) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({
      error: 'Request deletion from your company admin.',
    });
  }
  next();
}

module.exports = { tenantMiddleware, ownerOnlyDelete };
