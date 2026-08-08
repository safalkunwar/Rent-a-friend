import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// ==================== FIREBASE STORAGE UTILS ====================

export interface UploadOptions {
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

export const uploadImageToStorage = async (
  file: File,
  options: UploadOptions = {}
): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized.');
  }

  const {
    folder = 'uploads',
    maxSizeMB = 10,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    onProgress
  } = options;

  // Validate File Type
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error(`Invalid file type (${file.type}). Allowed types: JPG, PNG, WEBP.`);
  }

  // Validate File Size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`File size exceeds maximum limit of ${maxSizeMB}MB.`);
  }

  // Generate unique filename
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
  const storageRef = ref(storage, filename);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        console.error('[StorageService] Upload error:', error);
        reject(new Error(`Image upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (err: any) {
          reject(new Error(`Failed to retrieve image download URL: ${err.message}`));
        }
      }
    );
  });
};

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
