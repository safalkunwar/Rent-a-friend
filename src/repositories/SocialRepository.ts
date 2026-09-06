import { firestore } from '../services/firestore';
import { BaseRepository } from './base';
import { OperationType } from '../services/firestore-errors';
import { CommunityPost, ExperienceStory } from '../types';
import { doc, runTransaction, writeBatch, collection, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { offlineWriteQueue } from '../services/offlineQueue';
import { requireUid } from '../services/identity';
import { getDocsFromServer, getDocFromServer } from 'firebase/firestore';
import { visibleStoriesQuery } from '../services/mediaQueries';
import { visibleStory } from '../services/mediaContract';
import { saveAppMedia } from '../services/mediaUploads';
import type { MediaDraft } from '../services/mediaUploadCore';
import { commentText, commentWrite, type Comment } from '../services/commentContract';
export type { Comment } from '../services/commentContract';


export class SocialRepository extends BaseRepository {
  private likedStateCache = new Map<string, boolean>();

  private getCachedLikedState(kind: 'post' | 'story', userId: string, targetId: string): boolean | undefined {
    return this.likedStateCache.get(`${kind}:${userId}:${targetId}`);
  }

  private setCachedLikedState(kind: 'post' | 'story', userId: string, targetId: string, liked: boolean): void {
    this.likedStateCache.set(`${kind}:${userId}:${targetId}`, liked);
  }

  private invalidateLikedState(kind: 'post' | 'story', userId: string, targetId: string): void {
    this.likedStateCache.delete(`${kind}:${userId}:${targetId}`);
  }

  async queueIfOffline(collection: string, docId: string, data: Record<string, unknown>, action: 'set' | 'update' | 'delete' = 'set'): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineWriteQueue.enqueue({ collection, docId, data, action });
    }
  }

  // ==================== COMMUNITY POSTS ====================

  async getPosts(category?: string, limitCount = 10): Promise<CommunityPost[]> {
    const posts = await this.executeWithRetry(
      () => firestore.getDocuments<CommunityPost>('community_posts', {
        where: [{ field: 'status', operator: '==', value: 'published' }],
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: category ? undefined : limitCount
      }),
      OperationType.LIST,
      'community_posts'
    );
    if (category) {
      return posts.filter(p => p.category?.toLowerCase() === category.toLowerCase()).slice(0, limitCount);
    }
    return posts;
  }

  async createPost(post: Omit<CommunityPost, 'id'>): Promise<string> {
    requireUid(post.userId);
    const id = `post-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const newPost: CommunityPost = {
      ...post,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    try {
      await this.executeWithRetry(
        () => firestore.setDocument(`community_posts/${id}`, newPost as any),
        OperationType.CREATE,
        `community_posts/${id}`
      );
    } catch (err) {
      await this.queueIfOffline('community_posts', id, newPost as unknown as Record<string, unknown>, 'set');
      throw err;
    }
    return id;
  }

  async updatePost(id: string, updates: Partial<CommunityPost>): Promise<void> {
    try {
      await this.executeWithRetry(
        () => firestore.updateDocument(`community_posts/${id}`, {
          ...updates,
          updatedAt: new Date().toISOString()
        }),
        OperationType.UPDATE,
        `community_posts/${id}`
      );
    } catch (err) {
      await this.queueIfOffline('community_posts', id, { ...updates, updatedAt: new Date().toISOString() }, 'update');
      throw err;
    }
  }

  async deletePost(id: string): Promise<void> {
    try {
      await this.executeWithRetry(
        () => firestore.deleteDocument(`community_posts/${id}`),
        OperationType.DELETE,
        `community_posts/${id}`
      );
    } catch (err) {
      await this.queueIfOffline('community_posts', id, {}, 'delete');
      throw err;
    }
  }

  // ==================== LIKES (Scalable Design) ====================

  /** Fresh, bounded read for the shared Home reaction state; no permanent like cache. */
  async getFeedReaction(kind: 'post' | 'story', userId: string, targetId: string): Promise<{ liked: boolean; count: number }> {
    requireUid(userId);
    if (!db) throw new Error('Social service unavailable.');
    const [reaction, content] = await Promise.all([
      getDocFromServer(doc(db, kind === 'post' ? 'likes' : 'story_likes', `${userId}_${targetId}`)),
      getDocFromServer(doc(db, kind === 'post' ? 'community_posts' : 'stories', targetId)),
    ]);
    requireUid(userId);
    if (!content.exists()) throw new Error('Content unavailable.');
    const data = content.data();
    const count = kind === 'post' ? data.likesCount : (data.likesCount ?? data.likes);
    return { liked: reaction.exists(), count: typeof count === 'number' && Number.isFinite(count) ? Math.max(0, count) : 0 };
  }

  async likePost(userId: string, postId: string): Promise<void> {
    requireUid(userId);
    if (!db) throw new Error('Social service unavailable.');
    this.invalidateLikedState('post', userId, postId);
    const likeId = `${userId}_${postId}`;
    const likeRef = doc(db, 'likes', likeId);
    const postRef = doc(db, 'community_posts', postId);

    await this.executeWithRetry(
      async () => {
        await runTransaction(db!, async (transaction) => {
          const likeDoc = await transaction.get(likeRef);
          if (likeDoc.exists()) {
            return; // Already liked
          }

          const postDoc = await transaction.get(postRef);
          const currentLikes = postDoc.exists() ? (postDoc.data()?.likesCount || 0) : 0;

          transaction.set(likeRef, {
            userId,
            postId,
            createdAt: new Date().toISOString()
          });

          if (postDoc.exists()) {
            transaction.update(postRef, {
              likesCount: currentLikes + 1,
              updatedAt: new Date().toISOString()
            });
          }
        });
      },
      OperationType.WRITE,
      `community_posts/${postId}/likes`
    );
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    requireUid(userId);
    if (!db) throw new Error('Social service unavailable.');
    this.invalidateLikedState('post', userId, postId);
    const likeId = `${userId}_${postId}`;
    const likeRef = doc(db, 'likes', likeId);
    const postRef = doc(db, 'community_posts', postId);

    await this.executeWithRetry(
      async () => {
        await runTransaction(db!, async (transaction) => {
          const likeDoc = await transaction.get(likeRef);
          if (!likeDoc.exists()) {
            return; // Not liked
          }

          const postDoc = await transaction.get(postRef);
          const currentLikes = postDoc.exists() ? (postDoc.data()?.likesCount || 0) : 0;

          transaction.delete(likeRef);

          if (postDoc.exists() && currentLikes > 0) {
            transaction.update(postRef, {
              likesCount: currentLikes - 1,
              updatedAt: new Date().toISOString()
            });
          }
        });
      },
      OperationType.WRITE,
      `community_posts/${postId}/likes`
    );
  }

  async checkUserLikedPost(userId: string, postId: string): Promise<boolean> {
    if (!userId || !postId) return false;
    const cached = this.getCachedLikedState('post', userId, postId);
    if (cached !== undefined) return cached;
    try {
      const likeId = `${userId}_${postId}`;
      const docSnap = await this.executeWithRetry(
        () => firestore.getDocument<any>(`likes/${likeId}`),
        OperationType.GET,
        `likes/${likeId}`
      );
      const liked = !!docSnap;
      this.setCachedLikedState('post', userId, postId, liked);
      return liked;
    } catch (err) {
      console.warn(`[SocialRepository] Error checking liked state for post ${postId}:`, err);
      return false;
    }
  }

  // ==================== COMMENTS ====================

  async createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<string> {
    requireUid(comment.userId);
    if (!db) throw new Error('Social service unavailable.');
    const id = doc(collection(db, 'comments')).id;
    const newComment = commentWrite(id, comment);

    const postRef = doc(db, 'community_posts', comment.postId);

    await this.executeWithRetry(
      async () => {
        await runTransaction(db!, async (transaction) => {
          const postDoc = await transaction.get(postRef);
          if (!postDoc.exists() || postDoc.data().status !== 'published') throw new Error('Post is unavailable for comments.');
          const currentComments = postDoc.exists() ? (postDoc.data()?.commentsCount || 0) : 0;

          transaction.set(doc(db!, 'comments', id), newComment);

          if (postDoc.exists()) {
            transaction.update(postRef, {
              commentsCount: currentComments + 1,
              lastCommentMutationId: id,
              updatedAt: new Date().toISOString()
            });
          }
        });
      },
      OperationType.WRITE,
      `comments/${id}`
    );

    return id;
  }

  async editComment(id: string, text: string): Promise<void> {
    requireUid();
    const validated = commentText(text);
    await this.executeWithRetry(
      () => firestore.updateDocument(`comments/${id}`, { text: validated }),
      OperationType.UPDATE,
      `comments/${id}`
    );
  }

  async deleteComment(id: string, postId: string): Promise<void> {
    requireUid();
    if (!db) {
      try {
        await firestore.deleteDocument(`comments/${id}`);
      } catch (err) {
        await this.queueIfOffline('comments', id, {}, 'delete');
        throw err;
      }
      return;
    }

    const postRef = doc(db, 'community_posts', postId);

    try {
      await this.executeWithRetry(
        async () => {
          await runTransaction(db!, async (transaction) => {
            const commentRef = doc(db!, 'comments', id);
            const commentDoc = await transaction.get(commentRef);
            if (!commentDoc.exists()) return;
            if (commentDoc.data().postId !== postId) throw new Error('Comment target mismatch.');
            const postDoc = await transaction.get(postRef);
            const currentComments = postDoc.exists() ? (postDoc.data()?.commentsCount || 0) : 0;

            transaction.delete(doc(db!, 'comments', id));

            if (postDoc.exists() && currentComments > 0) {
              transaction.update(postRef, {
                commentsCount: currentComments - 1,
                lastCommentMutationId: id,
                updatedAt: new Date().toISOString()
              });
            }
          });
        },
        OperationType.WRITE,
        `comments/${id}`
      );
    } catch (err) {
      await this.queueIfOffline('comments', id, {}, 'delete');
      throw err;
    }
  }

  // ==================== STORIES ====================

  async getStories(limitCount = 20): Promise<ExperienceStory[]> {
    if (!db) throw new Error('Stories unavailable.');
    const result = await getDocsFromServer(visibleStoriesQuery(db,Date.now(),limitCount));
    return result.docs.map(document => ({...document.data(),id:document.id} as ExperienceStory));
  }

  async getVisibleStory(id: string): Promise<ExperienceStory | null> {
    if (!db) throw new Error('Stories unavailable.');
    const result = await getDocFromServer(doc(db,'stories',id));
    if (!result.exists()) return null;
    const story = {...result.data(),id:result.id} as ExperienceStory;
    return visibleStory(story) ? story : null;
  }

  async uploadStory(draft: MediaDraft, fields: { caption: string; userName: string; userAvatar?: string }, onProgress?: (value: number) => void): Promise<ExperienceStory> {
    requireUid(draft.uid);
    if (draft.kind !== 'story') throw new Error('Expected a Story media draft.');
    return await saveAppMedia(draft,fields,onProgress) as unknown as ExperienceStory;
  }

  async deleteStory(id: string): Promise<void> {
    requireUid();
    if (!db) throw new Error('Stories are unavailable.');
    // Propagate failure; a failed delete must not remove the item from UI as success.
    await deleteDoc(doc(db,'stories',id));
  }

  // ==================== STORY LIKES ====================

  async likeStory(userId: string, storyId: string): Promise<void> {
    requireUid(userId);
    if (!db) throw new Error('Social service unavailable.');
    this.invalidateLikedState('story', userId, storyId);
    const likeId = `${userId}_${storyId}`;
    const likeRef = doc(db, 'story_likes', likeId);
    const storyRef = doc(db, 'stories', storyId);

    await this.executeWithRetry(
      async () => {
        await runTransaction(db!, async (transaction) => {
          const likeDoc = await transaction.get(likeRef);
          if (likeDoc.exists()) {
            return; // Already liked
          }

          const storyDoc = await transaction.get(storyRef);
          const currentLikes = storyDoc.exists() ? (storyDoc.data()?.likes || storyDoc.data()?.likesCount || 0) : 0;

          transaction.set(likeRef, {
            userId,
            storyId,
            createdAt: new Date().toISOString()
          });

          if (storyDoc.exists()) {
            transaction.update(storyRef, {
              likes: currentLikes + 1,
              likesCount: currentLikes + 1,
              updatedAt: new Date().toISOString()
            });
          }
        });
      },
      OperationType.WRITE,
      `stories/${storyId}/likes`
    );
  }

  async unlikeStory(userId: string, storyId: string): Promise<void> {
    requireUid(userId);
    if (!db) throw new Error('Social service unavailable.');
    this.invalidateLikedState('story', userId, storyId);
    const likeId = `${userId}_${storyId}`;
    const likeRef = doc(db, 'story_likes', likeId);
    const storyRef = doc(db, 'stories', storyId);

    await this.executeWithRetry(
      async () => {
        await runTransaction(db!, async (transaction) => {
          const likeDoc = await transaction.get(likeRef);
          if (!likeDoc.exists()) {
            return; // Not liked
          }

          const storyDoc = await transaction.get(storyRef);
          const currentLikes = storyDoc.exists() ? (storyDoc.data()?.likes || storyDoc.data()?.likesCount || 0) : 0;

          transaction.delete(likeRef);

          if (storyDoc.exists() && currentLikes > 0) {
            transaction.update(storyRef, {
              likes: currentLikes - 1,
              likesCount: currentLikes - 1,
              updatedAt: new Date().toISOString()
            });
          }
        });
      },
      OperationType.WRITE,
      `stories/${storyId}/likes`
    );
  }

  async checkUserLikedStory(userId: string, storyId: string): Promise<boolean> {
    if (!userId || !storyId) return false;
    const cached = this.getCachedLikedState('story', userId, storyId);
    if (cached !== undefined) return cached;
    try {
      const likeId = `${userId}_${storyId}`;
      const docSnap = await this.executeWithRetry(
        () => firestore.getDocument<any>(`story_likes/${likeId}`),
        OperationType.GET,
        `story_likes/${likeId}`
      );
      const liked = !!docSnap;
      this.setCachedLikedState('story', userId, storyId, liked);
      return liked;
    } catch (err) {
      console.warn(`[SocialRepository] Error checking liked state for story ${storyId}:`, err);
      return false;
    }
  }
}

export const socialRepository = new SocialRepository();
