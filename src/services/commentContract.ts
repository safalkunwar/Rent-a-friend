import { serverTimestamp, Timestamp } from 'firebase/firestore';
import type { QueryOptions } from './firestore';

export const COMMENT_PAGE_SIZE = 50;
export const COMMENT_MAX_LENGTH = 500;
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  // null is reserved for an unresolved local server timestamp / pending UI.
  createdAt: Timestamp | null;
  parentId?: string;
}
export type NewComment = Omit<Comment, 'id' | 'createdAt'>;

export function commentWrite(id: string, input: NewComment) {
  const text = commentText(input.text);
  return {
    id, postId: input.postId, userId: input.userId,
    userName: input.userName, userAvatar: input.userAvatar, text,
    ...(input.parentId ? { parentId: input.parentId } : {}),
    createdAt: serverTimestamp(),
  };
}

export function commentText(value: string): string {
  const text = value.trim();
  if (!text || text.length > COMMENT_MAX_LENGTH) throw new Error(`Comment must contain 1–${COMMENT_MAX_LENGTH} characters.`);
  return text;
}

export function latestCommentsQuery(postId: string): QueryOptions {
  return {
    where: [{ field: 'postId', operator: '==', value: postId }],
    orderByField: 'createdAt', orderDirection: 'desc',
    orderById: true, orderByIdDirection: 'desc', limitCount: COMMENT_PAGE_SIZE,
  };
}

export function assertCommentTimes(items: Comment[]): void {
  if (items.some(item => item.createdAt !== null && !(item.createdAt instanceof Timestamp))) {
    throw new Error('Unsupported comment timestamp schema.');
  }
}
