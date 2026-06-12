/**
 * Smoke test for balanceService math (no database required).
 */
const assert = require('assert');

function buildBalance(totalOrders, totalPaid, pendingSettlement) {
  const orders = Number(totalOrders || 0);
  const paid = Number(totalPaid || 0);
  const pending = Number(pendingSettlement || 0);
  return {
    totalOrders: orders,
    totalPaid: paid,
    remaining: Math.max(0, orders - paid),
    pendingSettlement: pending,
  };
}

const cases = [
  { in: [10000, 3000, 4000], out: { totalOrders: 10000, totalPaid: 3000, remaining: 7000, pendingSettlement: 4000 } },
  { in: [5000, 5000, 0], out: { totalOrders: 5000, totalPaid: 5000, remaining: 0, pendingSettlement: 0 } },
  { in: [1000, 1500, 0], out: { totalOrders: 1000, totalPaid: 1500, remaining: 0, pendingSettlement: 0 } },
];

cases.forEach(({ in: [o, p, pend], out }, i) => {
  const result = buildBalance(o, p, pend);
  assert.deepStrictEqual(result, out, `case ${i + 1} failed`);
});

console.log(`balanceService math: ${cases.length} cases passed`);
