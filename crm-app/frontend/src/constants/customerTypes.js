export const CUSTOMER_TYPES = [
  { value: 'retailer', label: 'Retailer' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'dealer', label: 'Dealer' },
];

export function customerTypeLabel(value) {
  return CUSTOMER_TYPES.find((t) => t.value === value)?.label || value;
}
