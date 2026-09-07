import type { MediaKind } from './mediaContract';
import { imageExtension } from './mediaContract';
import { validateFileSignature } from './uploadContract';

export const IMAGE_LIMITS = { profile: 512, story: 1920, event: 1600 } as const;
export function fitImage(width: number, height: number, edge: number) {
  if (![width, height, edge].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid image dimensions.');
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Re-encoding strips EXIF (including GPS). No original camera file is uploaded on decode failure. */
export async function optimizeImage(file: File, kind: MediaKind, maximumEdge: number = IMAGE_LIMITS[kind]): Promise<File> {
  imageExtension(file);
  validateFileSignature(file.type, new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    if (bitmap.width * bitmap.height > 60_000_000) throw new Error('Image dimensions are too large. Choose an image under 60 megapixels.');
    const dimensions = fitImage(bitmap.width, bitmap.height, Math.min(maximumEdge, IMAGE_LIMITS[kind]));
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width; canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encode = (type: string) => new Promise<Blob>((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Could not optimize this image.')), type, 0.86));
    let blob = await encode('image/webp');
    // Some browsers silently return PNG when WebP encoding is unavailable.
    if (blob.type !== 'image/webp') {
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
      blob = await encode('image/jpeg');
    }
    if (!['image/webp', 'image/jpeg'].includes(blob.type)) throw new Error('Image encoding is unsupported.');
    const optimized = new File([blob], `image.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`, { type: blob.type });
    imageExtension(optimized);
    return optimized;
  } finally { bitmap.close(); }
}
