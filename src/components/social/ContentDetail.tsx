import React, { useEffect, useState } from 'react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { visibleStory, mediaTime } from '../../services/mediaContract';
import { ContentInteractions } from './ContentInteractions';
import { SafeImage } from '../ui/SafeImage';
import type { ExperienceStory } from '../../types';

export function ContentDetail({ kind, id, onClose, comments }: { kind: 'story' | 'event'; id: string; comments: boolean; onClose: () => void }) {
  const [data, setData] = useState<Record<string, any> | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true, timer: ReturnType<typeof setTimeout>;
    setLoading(true); setData(null);
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
      {loading ? <p>Loading…</p> : !data ? <p>This content is no longer available.</p> : <>
        <h2 className="font-bold">{data.title || data.userName}</h2>
        <SafeImage src={kind === 'story' || (data.mediaModerationStatus === 'ACTIVE' && data.mediaVisibilityStatus === 'PUBLIC') ? data.imageUrl : ''} alt={data.title || 'Story'} className="w-full max-h-[55vh] object-contain" />
        <p className="break-words">{data.caption || data.description}</p>
        {kind === 'event' && <p>{data.date} {data.time} (Nepal time) · {data.location}</p>}
        <ContentInteractions kind={kind} id={id} openComments={comments} />
      </>}
    </div>
  </div>;
}
