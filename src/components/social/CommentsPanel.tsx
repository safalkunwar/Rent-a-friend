import React, { useEffect, useState } from 'react';
import { Send, Trash2, Edit3, X } from 'lucide-react';
import { usePostComments } from '../../hooks/usePostComments';
import { SafeImage } from '../ui/SafeImage';
import { CommentComposer } from './CommentComposer';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';

interface CommentsPanelProps {
  postId: string;
  onClose?: () => void;
  onCountChange?: (count: number) => void;
  maxHeightClass?: string;
}

export const commentTimeAgo = (iso?: string): string => {
  if (!iso) return '';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  postId,
  onClose,
  onCountChange,
  maxHeightClass = 'max-h-56',
}) => {
  const { currentUser } = useAppContext();
  const { showToast } = useToast();
  const { comments, loading, addComment, removeComment, editCommentText } = usePostComments(postId);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    if (!loading) onCountChange?.(comments.length);
  }, [comments.length, loading, onCountChange]);

  const handleAdd = async (text: string) => {
    try {
      await addComment(text);
      showToast('Comment posted!', 'success');
    } catch (err) {
      showToast('Comment failed to post. Your text was kept — try again.', 'error');
      throw err;
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await removeComment(commentId);
      showToast('Comment deleted', 'success');
    } catch {
      showToast('Failed to delete comment', 'error');
    }
  };

  return (
    <div id={`comments-panel-${postId}`} className="relative z-10 bg-background border-t border-border-token/40 p-3 text-left space-y-3">
      {onClose && (
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Comments</span>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Close comments">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`${maxHeightClass} overflow-y-auto space-y-2.5 custom-scrollbar pr-1`}>
        {loading ? (
          <p className="text-[10px] text-text-secondary animate-pulse">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="text-[10px] text-text-muted italic py-1">
            No comments yet. Be the first to share your thoughts.
          </p>
        ) : (
          comments.map((comm, idx) => {
            const isPending = (comm as { pending?: boolean }).pending === true;
            const isOwn = currentUser && currentUser.id === comm.userId;
            return (
              <div key={`${comm.id || 'comm'}-${idx}`} className={`flex gap-2 items-start text-xs bg-surface p-2 rounded-xl ${isPending ? 'opacity-60' : ''}`}>
                <SafeImage src={comm.userAvatar} className="w-5 h-5 rounded-full object-cover mt-0.5" alt={comm.userName} fallbackType="avatar" textForInitials={comm.userName} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-text-primary text-[10px]">
                      {comm.userName}
                      {commentTimeAgo(comm.createdAt) && (
                        <span className="ml-1.5 font-medium text-text-muted">{commentTimeAgo(comm.createdAt)}</span>
                      )}
                    </span>
                    {isOwn && !isPending && !editing && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditing({ id: comm.id, text: comm.text })} className="text-text-muted hover:text-primary-action" title="Edit comment" aria-label="Edit comment">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => { void handleDelete(comm.id); }}
                          className="text-text-muted hover:text-red-500"
                          title="Delete comment"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {editing?.id === comm.id ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={editing.text}
                        onChange={(e) => setEditing(prev => prev ? { ...prev, text: e.target.value } : prev)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editing.text.trim()) void editCommentText(comm.id, editing.text.trim()).then(() => setEditing(null));
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        className="flex-1 bg-surface-elevated text-text-primary border border-primary-action/50 rounded-lg px-2 py-1 text-[10px] focus:outline-none"
                      />
                      <button onClick={() => { if (editing.text.trim()) void editCommentText(comm.id, editing.text.trim()).then(() => setEditing(null)); }} className="text-primary-action" title="Save" aria-label="Save edit">
                        <Send className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditing(null)} className="text-text-muted hover:text-red-500" title="Cancel" aria-label="Cancel edit">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <p className={`text-text-secondary font-light text-[10px] mt-0.5 leading-relaxed whitespace-pre-wrap break-words`}>
                      {comm.text}
                      {isPending && <span className="ml-1.5 italic text-text-muted">Sending…</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {currentUser ? (
        <CommentComposer autoFocus onSubmit={handleAdd} />
      ) : (
        <p className="text-[10px] text-text-muted py-1">Sign in to join the conversation.</p>
      )}
    </div>
  );
};