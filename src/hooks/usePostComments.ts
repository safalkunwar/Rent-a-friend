import { useCallback, useEffect, useState } from 'react';
import { firestore } from '../services/firestore';
import { socialRepository, type Comment } from '../repositories/SocialRepository';
import { useAppContext } from '../context/AppContext';
import { assertCommentTimes, latestCommentsQuery } from '../services/commentContract';

/**
 * Shared comment engine for every surface (Community Feed cards and the
 * unified Home feed). A bounded latest-50 listener and one summary-document
 * listener per OPENED post; the visible window is never used as a total count.
 */
export function usePostComments(postId: string | null) {
  const { currentUser, createComment, deleteComment } = useAppContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }
    let active = true;
    setComments([]);
    setError(null);
    setTotalCount(null);
    setLoading(true);
    const failed = () => { if (active) { setLoading(false); setError('Comments unavailable. Try again online.'); } };
    const unsubscribe = firestore.subscribe<Comment>('comments', latestCommentsQuery(postId), (items) => {
      if (!active) return;
      try { assertCommentTimes(items); }
      catch { setComments([]); setLoading(false); setError('Comments use an unsupported data format.'); return; }
      if (import.meta.env.DEV) console.debug(`[comments:${postId}] snapshot:`, items.length);
      setComments(items.slice().reverse());
      setLoading(false);
    }, failed);
    const unsubscribeCount = firestore.subscribeDocument<{ commentsCount?: number }>(`community_posts/${postId}`, post => {
      if (!active) return;
      if (!post) { failed(); return; }
      setTotalCount(typeof post.commentsCount === 'number' ? Math.max(0, post.commentsCount) : null);
    }, failed);
    return () => {
      active = false;
      unsubscribe();
      unsubscribeCount();
    };
  }, [postId, attempt]);

  const addComment = useCallback(async (rawText: string) => {
    if (!currentUser) throw new Error('auth-required');
    const text = rawText.trim();
    if (!text) throw new Error('empty-comment');
    if (!postId) throw new Error('no-post');

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=C8A25E&color=0F1113`;
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setComments(prev => [...prev, {
      id: tempId,
      postId,
      userId: currentUser.id,
      userName: currentUser.name || 'Anonymous Traveler',
      userAvatar: currentUser.avatar || defaultAvatar,
      text,
      createdAt: null,
      pending: true,
    } as Comment]);

    if (import.meta.env.DEV) {
      console.debug(`[comments:${postId}] submitting uid=${currentUser.id} bytes=${text.length}`);
    }

    try {
      await createComment({
        postId,
        userId: currentUser.id,
        userName: currentUser.name || 'Anonymous Traveler',
        userAvatar: currentUser.avatar || defaultAvatar,
        text,
      });
      if (import.meta.env.DEV) console.debug(`[comments:${postId}] write committed`);
      setComments(prev => prev.filter(c => c.id !== tempId));
    } catch (err) {
      setComments(prev => prev.filter(c => c.id !== tempId));
      throw err;
    }
  }, [currentUser, postId, createComment]);

  const removeComment = useCallback(async (commentId: string) => {
    await deleteComment(commentId, postId!);
    setComments(prev => prev.filter(c => c.id !== commentId));
  }, [postId, deleteComment]);

  const editCommentText = useCallback(async (commentId: string, text: string) => {
    await socialRepository.editComment(commentId, text);
    setComments(prev => prev.map(c => (c.id === commentId ? { ...c, text, updatedAt: new Date().toISOString() } : c)));
  }, []);

  return { comments, loading, error, totalCount, retry: () => setAttempt(value => value + 1), addComment, removeComment, editCommentText };
}
