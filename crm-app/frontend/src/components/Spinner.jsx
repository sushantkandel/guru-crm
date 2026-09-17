/**
 * Inline activity indicator for buttons and toolbars.
 *
 * Sized in em so it scales with the surrounding text, and it inherits
 * currentColor so it works on primary, outline and danger buttons alike.
 */
export default function Spinner({ className = '', size = '1em', label }) {
  return (
    <>
      <span
        className={`spinner ${className}`}
        style={{ width: size, height: size, borderWidth: '2px' }}
        aria-hidden="true"
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}
