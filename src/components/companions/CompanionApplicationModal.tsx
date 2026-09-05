import React, { useState } from 'react';
import { X, Upload, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { companionApplicationRepository } from '../../repositories/CompanionApplicationRepository';
import { uploadKycDocument } from '../../services/storage';
import { SafeImage } from '../ui/SafeImage';

const CATEGORIES = ['Hiking Partner', 'Coffee Buddy', 'Photography Guide', 'Food Explorer', 'Cultural Guide', 'Local Host', 'Travel Companion'];
const LANGUAGES = ['Nepali', 'English', 'Hindi', 'Newari', 'Tamang', 'Sherpa', 'French', 'Japanese'];
const DOC_TYPES = ['citizenship', 'passport', 'driving_license'] as const;

interface CompanionApplicationModalProps {
  onClose: () => void;
  onSubmitted?: () => void;
}

export const CompanionApplicationModal: React.FC<CompanionApplicationModalProps> = ({ onClose, onSubmitted }) => {
  const { currentUser, updateUserProfile } = useAppContext();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['Nepali']);
  const [location, setLocation] = useState(currentUser?.location || '');
  const [hourlyRate, setHourlyRate] = useState<number>(1500);
  const [imageUrl, setImageUrl] = useState('');
  const [kycPath, setKycPath] = useState('');
  const [legalFullName, setLegalFullName] = useState('');
  const [documentType, setDocumentType] = useState<typeof DOC_TYPES[number]>('citizenship');
  const [documentNumber, setDocumentNumber] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleCategory = (c: string) =>
    setCategories(prev => (prev.includes(c) ? prev.filter(x => x !== c) : prev.length < 3 ? [...prev, c] : prev));

  const handleDocFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Document must be at most 5MB.', 'error');
      return;
    }
    setUploading(true);
    try {
      const path = await uploadKycDocument(file);
      setDocFile(file);
      setKycPath(path);
      showToast('Document uploaded securely.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Document upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const validate = (): string => {
    if (!displayName.trim()) return 'Display name is required.';
    if (bio.trim().length < 30) return 'Bio must be at least 30 characters.';
    if (categories.length === 0) return 'Select at least one category.';
    if (!location.trim()) return 'Location is required.';
    if (!hourlyRate || hourlyRate < 500) return 'Hourly rate must be at least NPR 500.';
    if (!legalFullName.trim()) return 'Legal full name is required for verification.';
    if (documentNumber.trim().length < 4) return 'Enter a valid document number.';
    if (!imageUrlsReady()) return 'Upload a photo of your identity document.';
    return '';
  };

  const imageUrlsReady = () => !!kycPath.trim();

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Keep the user's public profile name in sync with their application identity.
      if (currentUser && displayName.trim() !== currentUser.name) {
        await updateUserProfile({ name: displayName.trim() });
      }
      const applicationId = await companionApplicationRepository.createDraft(currentUser!.id);
      await companionApplicationRepository.saveDraft(
        applicationId,
        {
          displayName: displayName.trim(),
          bio: bio.trim(),
          categories,
          languages,
          location: location.trim(),
          hourlyRate,
          ...(imageUrl ? { imageUrl } : {}),
        },
        {
          legalFullName: legalFullName.trim(),
          documentType,
          documentNumberMasked: `••••${documentNumber.trim().slice(-4)}`,
          documentFileUrl: kycPath,
          verificationStatus: 'UNVERIFIED',
        }
      );
      await companionApplicationRepository.submit(applicationId);

      showToast('Application submitted! Our team will review it shortly.', 'success');
      onSubmitted?.();
      onClose();
    } catch (err) {
      console.error('[CompanionApplication] submit failed:', err);
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl bg-surface border border-border-token rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-border-token flex items-center justify-between bg-background shrink-0">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-action" /> Become a SATHI Companion
          </h2>
          <button onClick={onClose} aria-label="Close application form" className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
          className="p-5 space-y-4 overflow-y-auto text-left"
        >
          <p className="text-xs text-text-secondary leading-relaxed bg-surface-elevated/60 rounded-xl p-3">
            Applications are reviewed by the SATHI team. Your public companion profile activates only after approval. Identity documents are stored securely and are never shown publicly.
          </p>

          {/* Public companion profile */}
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted">Public Profile</h3>
          <div>
            <label htmlFor="app-display-name" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Display Name *</label>
            <input id="app-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} className="w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action" />
          </div>
          <div>
            <label htmlFor="app-bio" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Short Bio * <span className="normal-case">(min 30 chars)</span></label>
            <textarea id="app-bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={500} placeholder="Tell travelers who you are and what experiences you offer…" className="w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action resize-none" />
            <p className="text-[10px] text-text-muted mt-0.5">{bio.trim().length}/500</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Categories * <span className="normal-case">(max 3)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => toggleCategory(c)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${categories.includes(c) ? 'bg-primary-action text-background border-primary-action' : 'border-border-token text-text-secondary hover:border-white/20'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="app-languages" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Languages</label>
              <input id="app-languages" value={languages.join(', ')} onChange={e => setLanguages(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action" />
            </div>
            <div>
              <label htmlFor="app-location" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Base City *</label>
              <input id="app-location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Kathmandu" className="w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action" />
            </div>
            <div>
              <label htmlFor="app-rate" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Hourly Rate (NPR) *</label>
              <input id="app-rate" type="number" min={500} value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))} className="w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action" />
            </div>
            <div>
              <label htmlFor="app-photo" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Profile Photo</label>
              <SafeImage src={imageUrl} alt="" fallbackType="avatar" textForInitials={displayName} className="w-full h-16 object-cover rounded-lg border border-border-token" />
              <input id="app-photo" type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Photo URL" className="mt-1 w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-1.5 text-[11px] focus:outline-none focus:border-primary-action" />
            </div>
          </div>

          {/* KYC */}
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted pt-2">Identity Verification (KYC)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="app-legal-name" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Legal Full Name *</label>
              <input id="app-legal-name" value={legalFullName} onChange={e => setLegalFullName(e.target.value)} autoComplete="off" className="w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action" />
            </div>
            <div>
              <label htmlFor="app-doc-type" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Document Type *</label>
              <select id="app-doc-type" value={documentType} onChange={e => setDocumentType(e.target.value as typeof DOC_TYPES[number])} className="w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action capitalize">
                {DOC_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="app-doc-number" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Document Number *</label>
              <input id="app-doc-number" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} className="w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action" />
              <p className="text-[9px] text-text-muted mt-0.5">Only the last 4 digits are stored.</p>
            </div>
            <div>
              <label htmlFor="app-doc-file" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Document Photo *</label>
              <label htmlFor="app-doc-file" className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border-token rounded-xl text-[11px] font-bold text-primary-action cursor-pointer hover:bg-surface-hover">
                <Upload className="w-3.5 h-3.5" />
                <span className="truncate">{uploading ? 'Uploading…' : docFile ? docFile.name : 'Upload photo'}</span>
                <input id="app-doc-file" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => void handleDocFile(e)} className="hidden" />
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">{error}</div>
          )}

          <div className="pt-2 border-t border-border-token flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-surface-elevated border border-border-token rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex items-center gap-2 px-5 py-2 bg-primary-action text-background font-black rounded-xl text-xs uppercase tracking-wide disabled:opacity-50 transition-all shadow-md"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
