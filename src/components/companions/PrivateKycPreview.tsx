import { useEffect, useState } from 'react';
import { readKycDocument } from '../../services/storage';

export function PrivateKycPreview({ path }: { path: string }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return <div>
    <button type="button" disabled={loading} onClick={async () => {
      setLoading(true); setError('');
      try { setUrl(URL.createObjectURL(await readKycDocument(path))); }
      catch (error) { setError(error instanceof Error ? error.message : 'Document access failed.'); }
      finally { setLoading(false); }
    }}>{loading ? 'Loading private document…' : 'View private identity document'}</button>
    {error && <p role="alert">{error}</p>}
    {url && <iframe title="Private identity document" src={url} className="w-full h-72" />}
  </div>;
}
