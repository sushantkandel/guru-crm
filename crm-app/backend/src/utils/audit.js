const userSelect = { select: { id: true, name: true } };

const auditInclude = {
  creator: userSelect,
  updater: userSelect,
};

function auditOnCreate(userId) {
  return { createdBy: userId, updatedBy: userId };
}

function auditOnUpdate(userId) {
  return { updatedBy: userId };
}

module.exports = { auditInclude, userSelect, auditOnCreate, auditOnUpdate };
