import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { createMediaDraft, type MediaDraft } from '../../services/mediaUploadCore';
import { saveAppMedia } from '../../services/mediaUploads';
import { requireUid } from '../../services/identity';
import { visibleAvatar } from '../../services/mediaContract';
import type { User } from '../../types';

export function ProfilePhotoUpload() {
  const { currentUser, setCurrentUser } = useAppContext();
  const draft = useRef<MediaDraft | null>(null);
  const busy = useRef(false);
  const [preview,setPreview] = useState('');
  const [progress,setProgress] = useState<number | null>(null);
  const [message,setMessage] = useState('');
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); },[preview]);
  useEffect(() => { draft.current = null; setPreview(''); setMessage(''); },[currentUser?.id]);
  if (!currentUser) return null;
  return <div className="space-y-2">
    <label className="text-xs font-bold text-text-secondary">Profile photo — JPG, PNG or WebP, up to 10 MB</label>
    {(preview || visibleAvatar(currentUser)) && <img src={preview || visibleAvatar(currentUser)} alt="Profile photo preview" className="w-20 h-20 rounded-full object-cover" />}
    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={progress !== null} onChange={event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try { draft.current = createMediaDraft('profile',requireUid(currentUser.id),file); setPreview(URL.createObjectURL(file)); setMessage('Preview only — upload to save.'); }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid image.'); }
    }} />
    <button type="button" disabled={!draft.current || progress !== null} className="px-3 py-2 rounded-xl bg-primary-action text-background text-xs disabled:opacity-50" onClick={async () => {
      if (!draft.current || busy.current) return;
      busy.current = true; setProgress(0);
      try {
        const saved = await saveAppMedia(draft.current,{},setProgress);
        requireUid(currentUser.id);
        const photo = saved as Partial<User>;
        // Do not replace normalized Auth role/claims or other application state with a raw user document.
        setCurrentUser(previous => previous?.id !== currentUser.id ? previous : { ...previous, avatar: visibleAvatar(photo), photoPath: photo.photoPath,
          photoUpdatedAt: photo.photoUpdatedAt, photoModerationStatus: photo.photoModerationStatus,
          photoVisibilityStatus: photo.photoVisibilityStatus });
        draft.current = null; setPreview(''); setMessage('Profile photo saved.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed. Retry with your selection.'); }
      finally { busy.current = false; setProgress(null); }
    }}>{progress === null ? 'Upload profile photo' : progress === 100 ? 'Saving photo...' : `Uploading ${progress}%`}</button>
    <p className="text-xs text-text-secondary" role="status">{message}</p>
  </div>;
}
