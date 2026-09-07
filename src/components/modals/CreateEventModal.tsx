import React, { useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { createMediaDraft, type MediaDraft } from '../../services/mediaUploadCore';
import { saveAppMedia } from '../../services/mediaUploads';
import { eventFields } from '../../services/eventContract';
import { requireUid } from '../../services/identity';

export function CreateEventModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const { currentUser, openAuthModal } = useAppContext();
  const [fields, setFields] = useState({ title: '', description: '', location: '', date: '', time: '', category: 'Social' });
  const [preview, setPreview] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const draft = useRef<MediaDraft | null>(null), guard = useRef(false);
  React.useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  React.useEffect(() => { draft.current = null; setPreview(''); }, [currentUser?.id]);
  return <div role="dialog" aria-modal="true" aria-label="Create Event" className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
    <form className="bg-surface text-text-primary rounded-2xl p-5 space-y-3 max-w-lg w-full max-h-[90vh] overflow-auto" onSubmit={async event => {
      event.preventDefault();
      if (!currentUser) { openAuthModal(); onClose(); return; }
      if (!draft.current || guard.current) return;
      guard.current = true; setBusy(true); setError('');
      try {
        eventFields(fields); requireUid(currentUser.id);
        const saved = await saveAppMedia(draft.current, { ...fields, spots: 0, userCreated: true });
        requireUid(currentUser.id); onSaved(saved.id); onClose();
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not create event.'); }
      finally { guard.current = false; setBusy(false); }
    }}>
      <h2 className="font-bold">Create Event</h2>
      {!currentUser ? <button type="button" onClick={() => { openAuthModal(); onClose(); }}>Sign in to create an event</button> : <>
        {Object.entries(fields).map(([key, value]) => <label key={key} className="block text-sm capitalize">{key}{key === 'time' ? ' (Nepal time)' : ''}
          <input required disabled={busy} type={key === 'date' || key === 'time' ? key : 'text'} value={value} maxLength={key === 'description' ? 3000 : key === 'location' ? 250 : key === 'title' ? 120 : 60}
            onChange={event => setFields(old => ({ ...old, [key]: event.target.value }))} className="block w-full bg-background border border-border-token rounded-lg p-2" />
        </label>)}
        <label className="block">Event cover<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => {
          const file = event.target.files?.[0]; if (!file) return;
          try { draft.current = createMediaDraft('event', requireUid(currentUser.id), file); setPreview(URL.createObjectURL(file)); setError(''); }
          catch (failure) { setError(failure instanceof Error ? failure.message : 'Invalid image.'); }
        }} /></label>
        {preview && <img src={preview} alt="Event cover preview" className="max-h-48 w-full object-contain" />}
        <button disabled={busy || !preview} className="bg-primary-action text-background rounded-lg px-4 py-2">{busy ? 'Optimizing and publishing…' : 'Publish Event'}</button>
      </>}
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
    </form>
  </div>;
}
