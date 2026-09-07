import { auth, db, storage } from '../firebase';
import { saveMedia, type MediaDraft } from './mediaUploadCore';
import { optimizeImage } from './imageOptimization';
import { imageExtension, mediaPath } from './mediaContract';
const preparations = new WeakMap<MediaDraft, Promise<void>>();
export async function saveAppMedia(draft: MediaDraft, fields: Record<string, unknown> = {}, progress?: (value: number) => void) {
  if (!auth || !db || !storage) throw new Error('Firebase media upload is unavailable.');
  if (!draft.uploadAttempted) {
    let preparation = preparations.get(draft);
    if (!preparation) {
      preparation = optimizeImage(draft.file, draft.kind).then(async file => {
        const preview = await optimizeImage(file, draft.kind, draft.kind === 'profile' ? 128 : draft.kind === 'story' ? 320 : 640);
        draft.file = file;
        draft.path = mediaPath(draft.kind, draft.uid, draft.id, imageExtension(file));
        draft.preview = { file: preview, path: mediaPath(draft.kind, draft.uid, `${draft.id}_preview`, imageExtension(preview)) };
      }).catch(error => { preparations.delete(draft); throw error; });
      preparations.set(draft, preparation);
    }
    await preparation;
  }
  return saveMedia({ auth, db, storage }, draft, fields, progress);
}
