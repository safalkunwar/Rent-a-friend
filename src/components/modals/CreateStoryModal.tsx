import React, { useState } from 'react';
import { X, Upload, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { uploadImageToStorage } from '../../services/storage';
import { socialRepository } from '../../repositories/SocialRepository';

interface CreateStoryModalProps {
  onClose: () => void;
  onSuccess?: () => void;
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

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-surface border border-border-token rounded-[32px] w-full max-w-sm p-6 text-center space-y-4">
          <Sparkles className="w-10 h-10 text-primary-action mx-auto" />
          <h3 className="text-lg font-bold text-text-primary">Sign In to Share Your Moment</h3>
          <p className="text-xs text-text-secondary">Join SATHI to post authentic co-experience stories with local companions.</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={onClose}
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

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Please select a JPG, PNG, or WEBP image file.');
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 10MB.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a photo to upload.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Upload photo to Firebase Storage
      const imageUrl = await uploadImageToStorage(selectedFile, {
        folder: 'stories',
        maxSizeMB: 10,
        onProgress: (progress) => setUploadProgress(progress)
      });

      // 2. Save story metadata to Firestore
      const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.name || 'User') + '&background=C8A25E&color=0F1113';
      
      await socialRepository.uploadStory({
        userId: currentUser.id,
        userName: currentUser.name || 'SATHI Traveler',
        userAvatar: currentUser.avatar || defaultAvatar,
        companionName: 'SATHI Companion',
        caption: caption.trim() || 'Co-experience moment in Nepal',
        imageUrl,
        timeAgo: 'Just now',
        createdAt: new Date().toISOString(),
        likes: 0,
        likesCount: 0
      });

      showToast('Your SATHI moment published live!', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[CreateStoryModal] Error creating story:', err);
      setErrorMessage(err.message || 'Failed to upload story. Please try again.');
    } finally {
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
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-all">
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
                  onClick={() => {
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
                  accept="image/jpeg,image/png,image/webp,image/jpg"
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
              onClick={onClose}
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
