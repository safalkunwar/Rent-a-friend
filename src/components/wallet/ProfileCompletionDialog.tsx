import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, Shield, CreditCard, ArrowLeftRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';

interface ProfileCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  actionType: 'add_coins' | 'exchange_coins' | 'redeem_coins';
}

const ACTION_LABELS: Record<string, string> = {
  add_coins: 'Add Coins',
  exchange_coins: 'Exchange Coins',
  redeem_coins: 'Redeem Coins',
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
  add_coins: 'Add Coins to your wallet using an approved payment method.',
  exchange_coins: 'Exchange Coins for platform benefits or partner offers.',
  redeem_coins: 'Redeem Coins for cash (requires financial approval).',
};

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Display Name', type: 'text', required: true, placeholder: 'Your display name' },
  { key: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+977 98X XXXXXXX' },
  { key: 'location', label: 'Location', type: 'text', required: true, placeholder: 'City, area' },
  { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
  { key: 'kycDocumentType', label: 'ID Document Type', type: 'select', required: true, options: ['citizenship', 'passport', 'driving_license'] },
  { key: 'kycDocumentNumber', label: 'ID Document Number (last 4 digits)', type: 'text', required: true, placeholder: '1234' },
];

export function ProfileCompletionDialog({ isOpen, onClose, onComplete, actionType }: ProfileCompletionDialogProps) {
  const { currentUser, updateUserProfile } = useAppContext();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && currentUser) {
      // Check which required fields are missing
      const missing = REQUIRED_FIELDS.filter(field => {
        const userValue = currentUser[field.key as keyof typeof currentUser];
        return !userValue || (typeof userValue === 'string' && userValue.trim() === '');
      }).map(f => f.key);
      
      // Also check KYC-specific fields
      if (!currentUser.claims?.kycDocumentType) missing.push('kycDocumentType');
      if (!currentUser.claims?.kycDocumentNumber) missing.push('kycDocumentNumber');
      if (!currentUser.claims?.dateOfBirth) missing.push('dateOfBirth');
      
      setMissingFields(missing);
      
      // Pre-fill form with existing data
      const initialData: Record<string, string> = {};
      REQUIRED_FIELDS.forEach(field => {
        const value = currentUser[field.key as keyof typeof currentUser] || 
                     currentUser.claims?.[field.key] || '';
        initialData[field.key] = String(value);
      });
      setFormData(initialData);
      setErrors({});
    }
  }, [isOpen, currentUser]);

  const validateField = useCallback((key: string, value: string): string => {
    const field = REQUIRED_FIELDS.find(f => f.key === key);
    if (!field) return '';
    
    if (field.required && (!value || value.trim() === '')) {
      return `${field.label} is required.`;
    }
    
    if (key === 'phone' && value && !/^\+?[0-9\s-]{10,}$/.test(value)) {
      return 'Enter a valid phone number (e.g., +977 98X XXXXXXX).';
    }
    
    if (key === 'dateOfBirth' && value) {
      const date = new Date(value);
      const today = new Date();
      if (date >= today) return 'Date of birth must be in the past.';
      const age = today.getFullYear() - date.getFullYear();
      if (age < 13) return 'You must be at least 13 years old.';
    }
    
    if (key === 'kycDocumentNumber' && value && value.length < 4) {
      return 'Enter at least the last 4 digits of your document.';
    }
    
    return '';
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    const error = validateField(key, value);
    setErrors(prev => ({ ...prev, [key]: error }));
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    REQUIRED_FIELDS.forEach(field => {
      const error = validateField(field.key, formData[field.key] || '');
      if (error) newErrors[field.key] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fix the errors above.', 'error');
      return;
    }
    
    setSubmitting(true);
    setErrors({});
    
    try {
      // Update user profile with the new information
      const profileUpdates: Record<string, unknown> = {
        name: formData.name,
        phone: formData.phone,
        location: formData.location,
      };
      
      // Store KYC-related info in claims
      const claimsUpdates = {
        ...currentUser.claims,
        kycDocumentType: formData.kycDocumentType,
        kycDocumentNumber: formData.kycDocumentNumber,
        dateOfBirth: formData.dateOfBirth,
        profileCompletedAt: new Date().toISOString(),
      };
      
      await updateUserProfile({ ...profileUpdates, claims: claimsUpdates });
      
      showToast('Profile updated successfully.', 'success');
      onComplete();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const actionLabel = ACTION_LABELS[actionType];
  const actionDescription = ACTION_DESCRIPTIONS[actionType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl border border-border-token overflow-hidden" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-border-token">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Complete Profile for {actionLabel}</h3>
            <p className="text-xs text-text-secondary mt-0.5">{actionDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-start gap-3 p-3 bg-primary-action/10 border border-primary-action/20 rounded-xl">
            <Shield className="h-5 w-5 text-primary-action mt-0.5 shrink-0" />
            <div className="text-sm text-text-secondary">
              <p className="font-semibold text-text-primary">Why is this needed?</p>
              <p className="mt-1">To {actionLabel.toLowerCase()}, we need to verify your identity and contact information. This helps prevent fraud and ensures secure transactions.</p>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
            {REQUIRED_FIELDS.map(field => {
              const isMissing = missingFields.includes(field.key);
              const error = errors[field.key];
              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                    {field.label}
                    {field.required && <span className="text-primary-action">*</span>}
                    {isMissing && <AlertCircle className="h-3.5 w-3.5 text-primary-action" aria-label="Required for this action" />}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="w-full rounded-xl border border-border-token/50 bg-background px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-action focus:border-transparent disabled:opacity-50"
                      disabled={submitting}
                    >
                      <option value="">Select {field.label.toLowerCase()}</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-action focus:border-transparent disabled:opacity-50 ${
                        error ? 'border-red-500/50' : 'border-border-token/50'
                      }`}
                      disabled={submitting}
                      max={field.type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
                    />
                  )}
                  {error && <p className="text-[11px] text-red-400">{error}</p>}
                </div>
              );
            })}

            {submitting && (
              <div className="flex items-center justify-center gap-2 text-sm text-text-secondary py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving profile…
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border-token/50 px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-elevated disabled:opacity-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-primary-action px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-action-hover disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Save & Continue'}
              </button>
            </div>
          </form>
        </div>

        <footer className="p-4 border-t border-border-token bg-surface/30">
          <p className="text-[11px] text-text-secondary text-center">
            Your information is stored securely and used only for {actionLabel.toLowerCase()} verification.
          </p>
        </footer>
      </div>
    </div>
  );
}