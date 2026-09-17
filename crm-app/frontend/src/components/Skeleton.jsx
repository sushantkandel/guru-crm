/**
 * Shimmer placeholders.
 *
 * These deliberately mirror the shape of the real content so a screen keeps its
 * layout while data loads, instead of collapsing to a line of text and then
 * jumping when rows arrive.
 */

export function Skeleton({ className = '', width, style }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width, ...style }}
      aria-hidden="true"
    />
  );
}

/** A run of text lines, last one short so it reads as a paragraph. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

/**
 * Table placeholder. `columns` should match the real header count so the
 * shimmer lines up with the columns that are about to appear.
 */
export function TableSkeleton({ columns = 5, rows = 6, label = 'Loading' }) {
  const widths = ['70%', '45%', '60%', '35%', '55%', '40%', '65%', '30%', '50%', '45%'];
  return (
    <div className="data-table-wrap" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      <table className="data-table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c}>
                  <Skeleton className="h-3" width={widths[(r + c) % widths.length]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Placeholder for the dashboard stat tiles. */
export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="stat-grid" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <Skeleton className="h-3 mb-3" width="55%" />
          <Skeleton className="h-7" width="70%" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a stack of cards / panels. */
export function CardSkeleton({ lines = 3, className = '' }) {
  return (
    <div className={`page-card-padded ${className}`} role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-4 mb-4" width="40%" />
      <SkeletonText lines={lines} />
    </div>
  );
}
