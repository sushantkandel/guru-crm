/** Label on red map pins — always the customer company / shop name. */
export function getShopCompanyLabel(shopOrForm) {
  if (!shopOrForm) return 'Company';
  const name = shopOrForm.shopName || shopOrForm.shop_name;
  if (name && String(name).trim()) return String(name).trim();
  return 'Company';
}
