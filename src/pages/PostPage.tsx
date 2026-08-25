import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firestore } from '../services/firestore';
import { CommunityPost } from '../types';
import { FeedPostCard } from '../components/social/FeedSocialCards';
import { SafeImage } from '../components/ui/SafeImage';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'notfound' }
  | { kind: 'ready'; post: CommunityPost };

export const PostPage: React.FC = () => {
  const { postId = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    firestore
      .getDocument<CommunityPost>(`community_posts/${postId}`)
      .then(post => {
        if (!active) return;
        // Only published posts are publicly viewable via deep link.
        if (post && post.status === 'published') {
          setState({ kind: 'ready', post });
          document.title = `${post.title} — SATHI`;
          const desc = document.querySelector('meta[name="description"]');
          if (desc) desc.setAttribute('content', post.content.slice(0, 160));
        } else {
          setState({ kind: 'notfound' });
        }
      })
      .catch(() => active && setState({ kind: 'notfound' }));
    return () => {
      active = false;
      document.title = 'SATHI - Nepal\'s Premier Social Experiences Marketplace';
    };
  }, [postId]);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 h-[62px] bg-background border-b border-white/5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors" aria-label="Go back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Back
        </button>
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5" aria-label="SATHI home">
          <img src="/sathi-logo.jpeg" alt="SATHI" className="w-9 h-9 rounded-full object-cover ring-1 ring-primary-action/30" />
          <span className="text-lg font-black tracking-tight">SATHI<span className="text-primary-action">.</span></span>
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {state.kind === 'loading' && (
          <div className="py-24 flex flex-col items-center gap-3">
            <span className="w-10 h-10 rounded-full border-2 border-t-primary-action border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <p className="text-xs text-text-secondary animate-pulse">Loading post…</p>
          </div>
        )}

        {state.kind === 'notfound' && (
          <div className="py-24 text-center space-y-3">
            <p className="text-5xl">🔍</p>
            <h1 className="text-lg font-extrabold text-text-primary">Post not found</h1>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              This post may have been deleted or the link is incorrect.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-3 px-5 py-2 bg-primary-action text-background font-black text-xs rounded-xl uppercase tracking-wide"
            >
              Back to SATHI
            </button>
          </div>
        )}

        {state.kind === 'ready' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-left">
              <SafeImage
                src={state.post.userAvatar}
                alt={state.post.userName}
                fallbackType="avatar"
                textForInitials={state.post.userName}
                className="w-10 h-10 rounded-full border border-primary-action/50 object-cover"
              />
              <div>
                <h2 className="text-sm font-black">{state.post.userName}</h2>
                <p className="text-[10px] text-text-secondary">
                  {state.post.location || 'Nepal'} · {new Date(state.post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            <FeedPostCard post={state.post} />

            <button
              onClick={() => navigate('/explore')}
              className="w-full py-3 text-xs font-bold text-text-secondary hover:text-primary-action border border-border-token/40 rounded-2xl transition-colors"
            >
              Explore more community moments →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
