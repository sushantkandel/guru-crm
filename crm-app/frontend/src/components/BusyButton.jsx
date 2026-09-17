import Spinner from './Spinner';

/**
 * A button that shows it is working.
 *
 * While `busy` it is disabled, swaps in a spinner and announces itself to
 * assistive tech, so a slow request never looks like a dead control.
 * `busyLabel` keeps the visible text meaningful ("Saving…" rather than a bare
 * spinner) where there is room for it.
 */
export default function BusyButton({
  busy = false,
  busyLabel,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`${className} ${busy ? 'btn-busy' : ''}`.trim()}
      {...props}
    >
      {busy ? (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          {busyLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
