import { useCallback, useEffect, useState } from 'react';
import { firestore } from '../services/firestore';
import { socialRepository, type Comment } from '../repositories/SocialRepository';
import { useAppContext } from '../context/AppContext';

/**
 * Shared comment engine for every surface (Community Feed cards and the
 * unified Home feed). One realtime listener per OPENED post; optimistic
 * insertion reconciled by the listener; failures revert cleanly.
 */
export function usePostComments(postId: string | null) {
  const { currentUser, createComment, deleteComment } = useAppContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const unsubscribe = firestore.subscribe<Comment>('comments', {
      where: [{ field: 'postId', operator: '==', value: postId }],
      orderByField: 'createdAt',
      orderDirection: 'asc',
    }, (items) => {
      if (!active) return;
      if (import.meta.env.DEV) console.debug(`[comments:${postId}] snapshot:`, items.length);
      setComments(items);
      setLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [postId]);

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
      createdAt: new Date().toISOString(),
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

  return { comments, loading, addComment, removeComment, editCommentText };
}
