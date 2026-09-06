import { expect, it } from 'vitest';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { assertCommentTimes, commentText, commentWrite, latestCommentsQuery, type Comment } from '../services/commentContract';
import { commentTimeAgo } from '../components/social/CommentsPanel';

it('writes an allowlisted server timestamp rather than accepting injected client time', () => {
  const result = commentWrite('generated', { postId: 'p', userId: 'u', userName: 'User', userAvatar: '', text: ' typed ', createdAt: 'fake', pending: true } as any);
  expect(result.createdAt.isEqual(serverTimestamp())).toBe(true);
  expect(result).toEqual({ id: 'generated', postId: 'p', userId: 'u', userName: 'User', userAvatar: '', text: 'typed', createdAt: serverTimestamp() });
});

it('uses the existing composer limit for both create and edit validation', () => {
  expect(commentText('x'.repeat(500))).toHaveLength(500);
  expect(() => commentText('x'.repeat(501))).toThrow();
  expect(() => commentText(' \n ')).toThrow();
});

it('defines one bounded descending query with an explicit document-ID tie breaker', () => {
  expect(latestCommentsQuery('p')).toEqual({ where: [{ field: 'postId', operator: '==', value: 'p' }],
    orderByField: 'createdAt', orderDirection: 'desc', orderById: true, orderByIdDirection: 'desc', limitCount: 50 });
});

it('rejects legacy or missing timestamps instead of mixing strings with Timestamp ordering', () => {
  for (const createdAt of ['2026-09-06', undefined, 123, {}]) {
    expect(() => assertCommentTimes([{ createdAt } as Comment])).toThrow('Unsupported comment timestamp schema');
  }
  expect(() => assertCommentTimes([{ createdAt: Timestamp.now() }, { createdAt: null }] as Comment[])).not.toThrow();
});

it('renders resolved server time and leaves pending timestamps undated', () => {
  expect(commentTimeAgo(Timestamp.fromMillis(Date.now() - 120000))).toBe('2m');
  expect(commentTimeAgo(null)).toBe('');
  expect(commentTimeAgo('legacy' as any)).toBe('');
});
