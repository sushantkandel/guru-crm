import { useActiveProducts } from '../hooks/useActiveProducts';

export default function ProductSelect({ value, onChange, className = '', id }) {
  const { products } = useActiveProducts();

  const handleSelect = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      onChange({
        productId: product.id,
        productName: product.name,
        unit: product.defaultUnit,
        unitPrice: product.defaultPrice,
      });
    } else {
      onChange({ productId: '', productName: '', unit: 'packet', unitPrice: 0 });
    }
  };

  return (
    <select
      id={id}
      className={className}
      value={value?.productId || ''}
      onChange={(e) => handleSelect(e.target.value)}
      required={!value?.productName}
    >
      <option value="">Select product</option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}{p.productCode ? ` (${p.productCode})` : ''} — Rs {p.defaultPrice}/{p.defaultUnit}
        </option>
      ))}
    </select>
  );
}
