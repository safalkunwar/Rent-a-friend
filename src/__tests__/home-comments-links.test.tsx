import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CommentComposer } from '../components/social/CommentComposer';
import { ExpandableText } from '../components/social/ExpandableText';
import { usePostComments } from '../hooks/usePostComments';
import { PostPage } from '../pages/PostPage';
const mocks = vi.hoisted(() => ({ subscribe: vi.fn(), summary: vi.fn(), get: vi.fn(), create: vi.fn(), remove: vi.fn() }));
vi.mock('../services/firestore', () => ({ firestore: { subscribe: mocks.subscribe, subscribeDocument: mocks.summary, getDocument: mocks.get } }));
vi.mock('../context/AppContext', () => ({ useAppContext: () => ({ currentUser: { id: 'real-uid', name: 'User', avatar: '' }, createComment: mocks.create, deleteComment: mocks.remove }) }));
vi.mock('../repositories/SocialRepository', () => ({ socialRepository: { editComment: vi.fn() } }));
vi.mock('../components/social/FeedSocialCards', () => ({ FeedPostCard: ({ post }: { post: { id: string; content: string } }) => <article data-id={post.id}>{post.content}</article> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { vi.clearAllMocks(); });

it('keeps typed text visible after a failed send and guards rapid duplicate submits', async () => {
  let fail!: (error: Error) => void;
  const submit = vi.fn(() => new Promise<void>((_, reject) => { fail = reject; }));
  render(<CommentComposer onSubmit={submit} autoFocus />);
  const input = screen.getByRole('textbox', { name: 'Write a comment' }) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: 'Real typed comment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send comment' }));
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input.value).toBe('Real typed comment');
  expect(submit).toHaveBeenCalledTimes(1);
  await act(async () => { fail(new Error('offline')); });
  expect(input.value).toBe('Real typed comment');
  submit.mockResolvedValueOnce(undefined);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Send comment' })); });
  expect(input.value).toBe('');
});

it('bounds opened comments, keeps the aggregate separate, uses authenticated UID and tears down both listeners', async () => {
  const stopComments = vi.fn(), stopCount = vi.fn();
  mocks.subscribe.mockReturnValue(stopComments); mocks.summary.mockReturnValue(stopCount);
  const { result, unmount } = renderHook(() => usePostComments('exact-post'));
  expect(mocks.subscribe.mock.calls[0][1]).toMatchObject({ limitCount: 50, orderDirection: 'desc', where: [{ field: 'postId', operator: '==', value: 'exact-post' }] });
  act(() => {
    mocks.subscribe.mock.calls[0][2]([{ id: 'new', text: 'new', createdAt: null }, { id: 'old', text: 'old', createdAt: null }]);
    mocks.summary.mock.calls[0][1]({ commentsCount: 120 });
  });
  expect(result.current.comments.map(comment => comment.id)).toEqual(['old', 'new']);
  expect(result.current.totalCount).toBe(120);
  await act(async () => { await result.current.addComment('  typed  '); });
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ postId: 'exact-post', userId: 'real-uid', text: 'typed' }));
  act(() => mocks.subscribe.mock.calls[0][3](new Error('denied')));
  expect(result.current.error).toBeTruthy();
  unmount();
  expect(stopComments).toHaveBeenCalledOnce(); expect(stopCount).toHaveBeenCalledOnce();
});

it('collapses only the rendered text and supports Show more / Show less', () => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(20);
  const text = 'This full stored text is retained even when the paragraph is collapsed.';
  render(<ExpandableText text={text} />);
  const paragraph = screen.getByText(text);
  expect(paragraph.style.webkitLineClamp).toBe('1');
  fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
  expect(paragraph.textContent).toBe(text);
  fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
  expect(paragraph.textContent).toBe(text);
  expect(paragraph.style.webkitLineClamp).toBe('1');
});

const directPage = () => render(<MemoryRouter initialEntries={['/post/exact-post']}><Routes><Route path="/post/:postId" element={<PostPage />} /></Routes></MemoryRouter>);
it('direct access and a fresh page mount look up the exact document independently of Home', async () => {
  mocks.get.mockResolvedValue({ id: 'exact-post', status: 'published', title: 'Exact', content: 'Exact content', createdAt: '2026-09-06' });
  const first = directPage();
  await screen.findByText('Exact content');
  expect(mocks.get).toHaveBeenCalledWith('community_posts/exact-post', { throwOnError: true });
  first.unmount();
  directPage();
  await screen.findByText('Exact content');
  expect(mocks.get).toHaveBeenCalledTimes(2);
});

it('shows retry for unavailable deep links rather than falsely claiming deletion', async () => {
  mocks.get.mockRejectedValueOnce(new Error('offline'));
  directPage();
  await screen.findByRole('alert');
  expect(screen.queryByText('Post not found')).toBeNull();
  mocks.get.mockResolvedValueOnce(null);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.getByText('Post not found')).toBeTruthy());
});
