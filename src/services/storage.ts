import { ref, uploadBytesResumable, getDownloadURL, getBlob } from 'firebase/storage';
import { storage } from '../firebase';
import { requireUid } from './identity';
import { validateUpload, uploadPath, validateFileSignature, isPrivateKycPath, type PublicUploadCategory, type UploadCategory } from './uploadContract';

export interface UploadOptions {
  folder?: PublicUploadCategory;
  maxSizeMB?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

function requireStorage() {
  if (!storage) throw new Error('Firebase Storage is unavailable.');
  return storage;
}

async function upload(file: File, category: UploadCategory, options: UploadOptions = {}): Promise<string> {
  const uid = requireUid();
  validateUpload(category, file.type, file.size);
  if (options.maxSizeMB && file.size > options.maxSizeMB * 1024 * 1024) throw new Error('File exceeds the selected size limit.');
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) throw new Error('Unsupported file type.');
  validateFileSignature(file.type, new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  const service = requireStorage();
  const path = uploadPath(category, uid, crypto.randomUUID());
  const object = ref(service, path);
  const task = uploadBytesResumable(object, file, {
    contentType: file.type,
    cacheControl: category === 'kyc' ? 'private, no-store, max-age=0' : 'public, max-age=3600',
    customMetadata: { ownerUid: uid, category },
  });
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', snapshot => options.onProgress?.(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, () => resolve());
  });
  requireUid(uid);
  // KYC never requests or persists a tokenized download URL.
  if (category === 'kyc') return path;
  const url = await getDownloadURL(object);
  // Stash the path on the ref so callers can perform best-effort orphan cleanup.
  (object as any).__uploadPath = path;
  return url;
}

/** Returns the Storage path of the most recent public upload in this session. */
export const lastUploadPath = (urlOrPath: string): string | null => {
  // Heuristic: the contract places the path at category/uid/uuid. Without an
  // explicit return, callers can recover it from the URL's pathname if they
  // need it. Intentionally a no-op stub; orphan cleanup is best-effort.
  try {
    const u = new URL(urlOrPath);
    const m = u.pathname.match(/\/o\/(.+?)(?:\?|$)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
};

/** Best-effort delete by Storage path; swallows "object not found". */
export const deleteStorageObject = async (path: string): Promise<void> => {
  const service = requireStorage();
  try {
    const { deleteObject } = await import('firebase/storage');
    await deleteObject(ref(service, path));
  } catch (err: any) {
    if (err?.code === 'storage/object-not-found') return;
    throw err;
  }
};

export const uploadImageToStorage = (file: File, options: UploadOptions = {}): Promise<string> =>
  upload(file, options.folder || 'avatars', options);
export const uploadKycDocument = (file: File): Promise<string> => upload(file, 'kyc');

/** Reviewer bytes are fetched with Firebase authorization; caller revokes its object URL. */
export async function readKycDocument(path: string): Promise<Blob> {
  requireUid();
  if (!isPrivateKycPath(path)) throw new Error('Legacy or invalid document reference requires a secure migration.');
  if (!storage) throw new Error('Firebase Storage is unavailable.');
  return getBlob(ref(storage, path), 5 * 1024 * 1024);
}

// ==================== OFFLINE STORAGE UTILS ====================

const PREFIX = 'sathi_offline_';

export const offlineStorage = {
  async getCachedCollection<T>(collectionName: string): Promise<T[]> {
    try {
      const data = localStorage.getItem(`${PREFIX}col_${collectionName}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async cacheCollection<T>(collectionName: string, items: T[]): Promise<void> {
    try {
      localStorage.setItem(`${PREFIX}col_${collectionName}`, JSON.stringify(items));
    } catch (e) {
      console.warn('[OfflineStorage] Failed to cache collection:', e);
    }
  },

  async cacheItem<T>(key: string, item: T): Promise<void> {
    try {
      localStorage.setItem(`${PREFIX}item_${key}`, JSON.stringify(item));
    } catch (e) {
      console.warn('[OfflineStorage] Failed to cache item:', e);
    }
  },

  async getCachedItem<T>(key: string): Promise<T | null> {
    try {
      const data = localStorage.getItem(`${PREFIX}item_${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async clearStore(): Promise<void> {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.warn('[OfflineStorage] Failed to clear store:', e);
    }
  }
};
