import { firestore } from '../services/firestore';
import { BaseRepository } from './base';
import { OperationType } from '../services/firestore-errors';
import { CommunityPost, ExperienceStory } from '../types';
import { doc, runTransaction, writeBatch, collection, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
  parentId?: string; // For replies
}

export class SocialRepository extends BaseRepository {
  // ==================== COMMUNITY POSTS ====================

  async getPosts(category?: string, limitCount = 10): Promise<CommunityPost[]> {
    const whereCond = category ? [{ field: 'category', operator: '==', value: category }] : undefined;
    return this.executeWithRetry(
      () => firestore.getDocuments<CommunityPost>('community_posts', {
        where: whereCond as any,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount
      }),
      OperationType.LIST,
      'community_posts'
    );
  }

  async createPost(post: Omit<CommunityPost, 'id'>): Promise<string> {
    const id = `post-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const newPost: CommunityPost = {
      ...post,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.executeWithRetry(
      () => firestore.setDocument(`community_posts/${id}`, newPost as any),
      OperationType.CREATE,
      `community_posts/${id}`
    );
    return id;
  }

  async updatePost(id: string, updates: Partial<CommunityPost>): Promise<void> {
    await this.executeWithRetry(
      () => firestore.updateDocument(`community_posts/${id}`, {
        ...updates,
        updatedAt: new Date().toISOString()
      }),
      OperationType.UPDATE,
      `community_posts/${id}`
    );
  }

  async deletePost(id: string): Promise<void> {
    await this.executeWithRetry(
      () => firestore.deleteDocument(`community_posts/${id}`),
      OperationType.DELETE,
      `community_posts/${id}`
    );
  }

  // ==================== LIKES (Scalable Design) ====================

  async likePost(userId: string, postId: string): Promise<void> {
    if (!db) return;
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
    if (!db) return;
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
    const likeId = `${userId}_${postId}`;
    const docSnap = await this.executeWithRetry(
      () => firestore.getDocument<any>(`likes/${likeId}`),
      OperationType.GET,
      `likes/${likeId}`
    );
    return !!docSnap;
  }

  // ==================== COMMENTS ====================

  async getComments(postId: string, limitCount = 20): Promise<Comment[]> {
    return this.executeWithRetry(
      () => firestore.getDocuments<Comment>('comments', {
        where: [{ field: 'postId', operator: '==', value: postId }],
        orderByField: 'createdAt',
        orderDirection: 'asc',
        limitCount
      }),
      OperationType.LIST,
      'comments'
    );
  }

  async createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<string> {
    const id = `comment-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const newComment: Comment = {
      ...comment,
      id,
      createdAt: timestamp,
    };

    if (!db) {
      await firestore.setDocument(`comments/${id}`, newComment as any);
      return id;
    }

    const postRef = doc(db, 'community_posts', comment.postId);

    await this.executeWithRetry(
      async () => {
        await runTransaction(db!, async (transaction) => {
          const postDoc = await transaction.get(postRef);
          const currentComments = postDoc.exists() ? (postDoc.data()?.commentsCount || 0) : 0;

          transaction.set(doc(db!, 'comments', id), newComment);

          if (postDoc.exists()) {
            transaction.update(postRef, {
              commentsCount: currentComments + 1,
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
    await this.executeWithRetry(
      () => firestore.updateDocument(`comments/${id}`, { text }),
      OperationType.UPDATE,
      `comments/${id}`
    );
  }

  async deleteComment(id: string, postId: string): Promise<void> {
    if (!db) {
      await firestore.deleteDocument(`comments/${id}`);
      return;
    }

    const postRef = doc(db, 'community_posts', postId);

    await this.executeWithRetry(
      async () => {
        await runTransaction(db!, async (transaction) => {
          const postDoc = await transaction.get(postRef);
          const currentComments = postDoc.exists() ? (postDoc.data()?.commentsCount || 0) : 0;

          transaction.delete(doc(db!, 'comments', id));

          if (postDoc.exists() && currentComments > 0) {
            transaction.update(postRef, {
              commentsCount: currentComments - 1,
              updatedAt: new Date().toISOString()
            });
          }
        });
      },
      OperationType.WRITE,
      `comments/${id}`
    );
  }

  // ==================== STORIES ====================

  async getStories(limitCount = 20): Promise<ExperienceStory[]> {
    return this.executeWithRetry(
      () => firestore.getDocuments<ExperienceStory>('stories', {
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount
      }),
      OperationType.LIST,
      'stories'
    );
  }

  async uploadStory(story: Omit<ExperienceStory, 'id'>): Promise<string> {
    const id = `story-${Date.now()}`;
    const newStory = {
      ...story,
      id,
      createdAt: new Date().toISOString()
    };
    await this.executeWithRetry(
      () => firestore.setDocument(`stories/${id}`, newStory as any),
      OperationType.CREATE,
      `stories/${id}`
    );
    return id;
  }

  async deleteStory(id: string): Promise<void> {
    await this.executeWithRetry(
      () => firestore.deleteDocument(`stories/${id}`),
      OperationType.DELETE,
      `stories/${id}`
    );
  }

  // ==================== STORY LIKES ====================

  async likeStory(userId: string, storyId: string): Promise<void> {
    if (!db) return;
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
    if (!db) return;
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
    const likeId = `${userId}_${storyId}`;
    const docSnap = await this.executeWithRetry(
      () => firestore.getDocument<any>(`story_likes/${likeId}`),
      OperationType.GET,
      `story_likes/${likeId}`
    );
    return !!docSnap;
  }
}

export const socialRepository = new SocialRepository();
