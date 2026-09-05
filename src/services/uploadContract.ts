export type PublicUploadCategory = 'avatars' | 'posts' | 'stories';
export type UploadCategory = PublicUploadCategory | 'kyc';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function validateUpload(category: UploadCategory, type: string, size: number): void {
  const types = category === 'kyc' ? ['image/jpeg', 'image/png', 'application/pdf'] : IMAGE_TYPES;
  if (!types.includes(type)) throw new Error('Unsupported file type for this upload category.');
  const maximum = (category === 'kyc' ? 5 : 10) * 1024 * 1024;
  if (size <= 0 || size > maximum) throw new Error('File is empty or exceeds the upload size limit.');
}
export function uploadPath(category: UploadCategory, uid: string, fileId: string): string {
  if (!['avatars','posts','stories','kyc'].includes(category) || !/^[^/\\]+$/.test(uid) || !/^[a-zA-Z0-9_.-]+$/.test(fileId) || fileId === '.' || fileId === '..') {
    throw new Error('Invalid upload path.');
  }
  return `${category}/${uid}/${fileId}`;
}
export function isPrivateKycPath(path: string, uid?: string): boolean {
  const parts = path.split('/');
  return parts.length === 3 && parts[0] === 'kyc' && !!parts[1] && !!parts[2] && (!uid || parts[1] === uid) && !path.includes('://');
}
export function validateFileSignature(type: string, bytes: Uint8Array): void {
  const prefix = (...expected: number[]) => expected.every((byte, index) => bytes[index] === byte);
  const valid = type === 'image/jpeg' ? prefix(255,216,255)
    : type === 'image/png' ? prefix(137,80,78,71,13,10,26,10)
    : type === 'application/pdf' ? prefix(37,80,68,70,45)
    : type === 'image/webp' && prefix(82,73,70,70) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80;
  if (!valid) throw new Error('File content does not match its declared type.');
}
