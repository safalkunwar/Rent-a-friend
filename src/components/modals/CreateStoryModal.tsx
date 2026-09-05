import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { createMediaDraft, type MediaDraft } from '../../services/mediaUploadCore';
import { socialRepository } from '../../repositories/SocialRepository';
import { requireUid } from '../../services/identity';
import { imageExtension } from '../../services/mediaContract';
import type { ExperienceStory } from '../../types';

interface CreateStoryModalProps {
  onClose: () => void;
  onSuccess?: (story: ExperienceStory) => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ onClose, onSuccess }) => {
  const { currentUser, openAuthModal } = useAppContext();
  const { showToast } = useToast();

  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const draft = useRef<MediaDraft | null>(null);
  const submitGuard = useRef(false);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); },[imagePreview]);

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-surface border border-border-token rounded-[32px] w-full max-w-sm p-6 text-center space-y-4">
          <Sparkles className="w-10 h-10 text-primary-action mx-auto" />
          <h3 className="text-lg font-bold text-text-primary">Sign In to Share Your Moment</h3>
          <p className="text-xs text-text-secondary">Join SATHI to post authentic co-experience stories with local companions.</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              disabled={submitting} onClick={onClose}
              className="px-4 py-2 bg-surface-elevated rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                openAuthModal();
              }}
              className="px-5 py-2 bg-primary-action text-background font-bold rounded-xl text-xs"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      imageExtension(file);
      draft.current = createMediaDraft('story',requireUid(currentUser.id),file);
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Invalid image.'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.current || submitGuard.current) return;
    submitGuard.current = true;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const saved = await socialRepository.uploadStory(draft.current, { caption, userName: currentUser.name }, setUploadProgress);
      requireUid(currentUser.id);
      onSuccess?.(saved as unknown as ExperienceStory);
      showToast('Story saved. It is visible under the current moderation policy.', 'success');
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed. Your selection is preserved for retry.');
    } finally {
      submitGuard.current = false;
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-surface border border-border-token rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border-token flex justify-between items-center bg-background">
          <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-action" /> Share Story Moment
          </h3>
          <button disabled={submitting} onClick={onClose} className="text-text-secondary hover:text-text-primary transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-left">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Photo upload zone */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
              Select Photo
            </label>
            {imagePreview ? (
              <div className="relative aspect-[9/12] w-full rounded-2xl overflow-hidden bg-black/50 border border-border-token">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    draft.current = null;
                    setSelectedFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-black/70 text-text-primary rounded-full p-1.5 hover:bg-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-border-token hover:border-primary-action/60 rounded-2xl bg-background cursor-pointer transition-colors p-4 text-center">
                <Upload className="w-8 h-8 text-primary-action mb-2" />
                <span className="text-xs font-bold text-text-primary">Click to upload photo</span>
                <span className="text-[10px] text-text-secondary mt-1">JPG, PNG, WEBP (Max 10MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp" disabled={submitting}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
              Caption
            </label>
            <input
              type="text"
              placeholder="Describe your co-experience moment..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={150}
              className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-primary-action"
            />
          </div>

          {/* Progress bar */}
          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-text-secondary font-bold">
                <span>Uploading to Firebase Storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-action transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex gap-3 justify-end">
            <button
              type="button"
              disabled={submitting} onClick={onClose}
              className="px-4 py-2 bg-surface-elevated border border-border-token/60 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="px-5 py-2 bg-primary-action hover:bg-primary-action-hover disabled:bg-primary-action/40 text-background font-black rounded-xl text-xs uppercase tracking-wide transition-all shadow-md"
            >
              {submitting ? 'Publishing...' : 'Publish Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
