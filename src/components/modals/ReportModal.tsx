import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { reportService } from '../../services/reports';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'user' | 'companion' | 'post' | 'comment' | 'story' | 'booking' | 'safety' | 'other';
  targetId: string;
  targetName?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, targetType, targetId, targetName }) => {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please provide a reason for the report', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await reportService.submitReport({
        targetType,
        targetId,
        reason: reason.trim(),
        details: details.trim() ? { additionalInfo: details.trim() } : undefined,
      });
      showToast('Report submitted successfully. Our team will review it.', 'success');
      setReason('');
      setDetails('');
      onClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
      showToast('Failed to submit report. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background border border-border-token rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border-token flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Report {targetType}
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {targetName && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reporting</p>
              <p className="text-sm text-text-primary">{targetName}</p>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action"
            >
              <option value="">Select a reason</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate">Inappropriate Content</option>
              <option value="fake">Fake Profile</option>
              <option value="safety">Safety Concern</option>
              <option value="scam">Scam or Fraud</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Additional Details</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Please provide more context..."
              className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action resize-none"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-surface-elevated text-text-secondary rounded-xl font-bold hover:bg-border-token transition-colors uppercase tracking-wider text-sm border border-border-token">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors uppercase tracking-wider text-sm disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
