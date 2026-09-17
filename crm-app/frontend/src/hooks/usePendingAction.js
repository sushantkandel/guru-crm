import { useCallback, useRef, useState } from 'react';

/**
 * Tracks which asynchronous actions are currently in flight, keyed so that a
 * list can show a spinner on the one row being acted on rather than blocking
 * the whole page.
 *
 * Requests against a remote database regularly take half a second or more, and
 * without this a button looks inert for that whole time and invites a second
 * click. `run` also refuses to start a key that is already running, so a
 * double tap cannot fire the same request twice.
 *
 *   const { isPending, run } = usePendingAction();
 *   <button disabled={isPending(o.id)} onClick={() => run(o.id, () => confirm(o))}>
 */
export function usePendingAction() {
  const [pending, setPending] = useState(() => new Set());
  // Mirrors `pending` synchronously so two clicks in the same tick can't both pass.
  const inFlight = useRef(new Set());

  const isPending = useCallback((key = 'default') => pending.has(key), [pending]);
  const isAnyPending = pending.size > 0;

  const run = useCallback(async (key, fn) => {
    const actionKey = typeof key === 'function' ? 'default' : key;
    const action = typeof key === 'function' ? key : fn;
    if (inFlight.current.has(actionKey)) return undefined;

    inFlight.current.add(actionKey);
    setPending((prev) => new Set(prev).add(actionKey));
    try {
      return await action();
    } finally {
      inFlight.current.delete(actionKey);
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(actionKey);
        return next;
      });
    }
  }, []);

  return { isPending, isAnyPending, run };
}

export default usePendingAction;
