import React, { useEffect, useState } from 'react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { visibleStory, mediaTime } from '../../services/mediaContract';
import { ContentInteractions } from './ContentInteractions';
import { SafeImage } from '../ui/SafeImage';
import type { ExperienceStory } from '../../types';
import { StoryLikeSurface } from './StoryLikeSurface';
import { useFeedReaction } from '../../hooks/useFeedReaction';
import { Heart } from 'lucide-react';
import { EventActions } from '../events/EventActions';

function StoryDetailMedia({ data, id }: { data: Record<string, any>; id: string }) {
  const reaction = useFeedReaction('story', id, data.likesCount ?? data.likes ?? 0);
  return <>
    <StoryLikeSurface onLike={() => reaction.setLiked(true)}>
      <SafeImage src={data.imageUrl} alt={data.caption || 'Story'} className="w-full max-h-[55vh] object-contain pointer-events-none" />
    </StoryLikeSurface>
    <p className="text-xs text-text-secondary">Double tap the photo to like</p>
    <button aria-label={reaction.liked ? 'Unlike Story' : 'Like Story'} aria-pressed={reaction.liked} disabled={reaction.busy || !!reaction.error} onClick={() => { void reaction.setLiked(!reaction.liked); }} className="flex items-center gap-2">
      <Heart className={reaction.liked ? 'fill-rose-500 text-rose-500' : ''} />{reaction.count}
    </button>
    {reaction.error && <p role="alert">{reaction.error} <button onClick={() => { void reaction.refresh(); }}>Refresh likes</button></p>}
  </>;
}

export function ContentDetail({ kind, id, onClose, comments }: { kind: 'story' | 'event'; id: string; comments: boolean; onClose: () => void }) {
  const [data, setData] = useState<Record<string, any> | null>(null), [loading, setLoading] = useState(true);
  const [eventDeleted, setEventDeleted] = useState<string | null>(null);
  useEffect(() => {
    let active = true, timer: ReturnType<typeof setTimeout>;
    setLoading(true); setData(null);
    if (kind === 'event') setEventDeleted(null);
    const read = async () => {
      try {
        if (!db) throw new Error('Unavailable');
        const result = await getDocFromServer(doc(db, kind === 'story' ? 'stories' : 'events', id));
        const item = { ...result.data(), id };
        const visible = kind === 'story' ? visibleStory(item as ExperienceStory) : result.data()?.moderationStatus === 'ACTIVE' && result.data()?.visibilityStatus === 'PUBLIC';
        if (!active) return;
        setData(result.exists() && visible ? item : null);
        if (kind === 'story' && visible) timer = setTimeout(() => setData(null), Math.max(0, mediaTime((item as ExperienceStory).expiresAt) - Date.now()));
      } catch { if (active) setData(null); }
      finally { if (active) setLoading(false); }
    };
    void read();
    return () => { active = false; clearTimeout(timer); };
  }, [kind, id]);
  return <div role="dialog" aria-modal="true" aria-label={`${kind} detail`} className="fixed inset-0 z-[45] bg-black/80 p-4 flex items-center justify-center">
    <div className="bg-surface text-text-primary rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-auto space-y-4">
      <button onClick={onClose}>Close</button>
      {loading ? <p>Loading…</p> : !data ? <p>{(kind === 'event' && eventDeleted) || 'This content is no longer available.'}</p> : <>
        <h2 className="font-bold">{data.title || data.userName}</h2>
        {kind === 'story' ? <StoryDetailMedia key={id} data={data} id={id} /> : <SafeImage src={data.mediaModerationStatus === 'ACTIVE' && data.mediaVisibilityStatus === 'PUBLIC' ? data.imageUrl : ''} alt={data.title || 'Event'} className="w-full max-h-[55vh] object-contain" />}
        <p className="break-words">{data.caption || data.description}</p>
        {kind === 'event' && <p>{data.date} {data.time} (Nepal time) · {data.location}</p>}
        {kind === 'event' && <EventActions id={id} data={data} onDeleted={pending => { setData(null); setEventDeleted(pending ? 'Event deleted. Image cleanup is pending.' : 'Event deleted.'); }} />}
        {kind === 'event' && <ContentInteractions kind="event" id={id} openComments={comments} />}
      </>}
    </div>
  </div>;
}
