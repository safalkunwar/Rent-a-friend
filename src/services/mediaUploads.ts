import { auth, db, storage } from '../firebase';
import { saveMedia, type MediaDraft } from './mediaUploadCore';
export function saveAppMedia(draft: MediaDraft, fields: Record<string, unknown> = {}, progress?: (value: number) => void) {
  if (!auth || !db || !storage) throw new Error('Firebase media upload is unavailable.');
  return saveMedia({ auth, db, storage }, draft, fields, progress);
}
