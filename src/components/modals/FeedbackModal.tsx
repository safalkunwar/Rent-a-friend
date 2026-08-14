import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { feedbackService } from '../../services/feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [type, setType] = useState<'feedback' | 'bug' | 'guide_feedback'>('feedback');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Please enter your feedback', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.submitFeedback({
        type,
        message: message.trim(),
        rating: rating || undefined,
        category: category || undefined,
      });
      showToast('Thank you for your feedback!', 'success');
      setType('feedback');
      setMessage('');
      setRating(0);
      setCategory('');
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      showToast('Failed to submit feedback. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background border border-border-token rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border-token flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">Send Feedback</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action"
            >
              <option value="feedback">General Feedback</option>
              <option value="bug">Bug Report</option>
              <option value="guide_feedback">Guide Feedback</option>
            </select>
          </div>
          {type === 'feedback' && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. UI, Performance, Features"
              className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              placeholder="Tell us what you think..."
              className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action resize-none"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-surface-elevated text-text-secondary rounded-xl font-bold hover:bg-border-token transition-colors uppercase tracking-wider text-sm border border-border-token">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-3 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors uppercase tracking-wider text-sm disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
