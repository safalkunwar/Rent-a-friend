import { describe, expect, it } from 'vitest';
import { uploadPath, validateUpload, isPrivateKycPath, validateFileSignature } from '../services/uploadContract';
describe('canonical public/private upload contract', () => {
  it('uses authenticated owner segments, not entity IDs', () => { expect(uploadPath('posts','A','unique.jpg')).toBe('posts/A/unique.jpg'); });
  it('rejects path injection', () => { expect(() => uploadPath('posts','A/B','x')).toThrow(); expect(() => uploadPath('kyc','A','../x')).toThrow(); });
  it('does not treat public photo URLs as identity documents', () => { expect(isPrivateKycPath('https://example.org/photo.jpg','A')).toBe(false); expect(isPrivateKycPath('posts/A/p','A')).toBe(false); });
  it('checks private document ownership', () => { expect(isPrivateKycPath('kyc/A/doc','A')).toBe(true); expect(isPrivateKycPath('kyc/B/doc','A')).toBe(false); });
  it('uses actual PDF MIME for KYC only', () => { expect(() => validateUpload('kyc','application/pdf',100)).not.toThrow(); expect(() => validateUpload('posts','application/pdf',100)).toThrow(); });
  it('enforces zero/oversize/type boundaries', () => { expect(() => validateUpload('kyc','image/jpeg',5*1024*1024)).not.toThrow(); expect(() => validateUpload('kyc','image/jpeg',5*1024*1024+1)).toThrow(); expect(() => validateUpload('posts','image/jpeg',0)).toThrow(); expect(() => validateUpload('kyc','image/webp',1)).toThrow(); });
  it('rejects content pretending to be an allowed image', () => { expect(() => validateFileSignature('image/jpeg',new Uint8Array([60,104,116,109,108]))).toThrow(); expect(() => validateFileSignature('image/jpeg',new Uint8Array([255,216,255]))).not.toThrow(); });
});
