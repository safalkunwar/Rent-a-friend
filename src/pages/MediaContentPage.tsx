import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ContentDetail } from '../components/social/ContentDetail';
import { AuthModal } from '../components/AuthModal';
import { useAuthModalTrigger } from '../hooks/useAuthModalTrigger';

/** Direct links read one target, not the unrelated Home discovery collections. */
export function MediaContentPage({ kind }: { kind: 'story' | 'event' }) {
  const parameters = useParams(), location = useLocation(), navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'login' | null>(null);
  useAuthModalTrigger(setAuthMode);
  const id = (kind === 'story' ? parameters.storyId : parameters.eventId) || '';
  return <main className="min-h-screen bg-background">
    <ContentDetail kind={kind} id={id} comments={new URLSearchParams(location.search).has('comments')} onClose={() => navigate('/')} />
    {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
  </main>;
}
