import { useRef, useState } from 'react';

interface Props {
  source: string;
  loaded: number;
  matches: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  onLoadMore: () => Promise<void>;
  onRetry: () => Promise<void>;
}

/** One explicit bounded page per action; never scan the collection for a match. */
export function DiscoveryPageControl(props: Props) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);
  const failed = Boolean(props.error) || actionFailed;
  const loading = props.loading || props.loadingMore || pending;
  const run = async () => {
    if (busy.current || loading) return;
    busy.current = true;
    setPending(true);
    setActionFailed(false);
    try { await (failed ? props.onRetry() : props.onLoadMore()); }
    catch { setActionFailed(true); }
    finally { busy.current = false; setPending(false); }
  };
  return (
    <div className="space-y-2 py-3 text-center text-xs text-text-secondary">
      <p role="status">{loading ? `Loading ${props.source}…` : `${props.matches} matches in ${props.loaded} loaded ${props.source}.`}</p>
      {failed && <p role="alert">Could not load {props.source}. Results may be incomplete.</p>}
      {!loading && !failed && <p>{props.hasMore ? 'More results may be on later pages.' : 'End of available pages.'}</p>}
      {(failed || props.hasMore || loading) && (
        <button type="button" disabled={loading} onClick={() => { void run(); }}
          className="px-4 py-2 rounded-xl border border-border-token text-primary-action disabled:opacity-50">
          {failed ? `Retry ${props.source}` : `Load more ${props.source}`}
        </button>
      )}
    </div>
  );
}
