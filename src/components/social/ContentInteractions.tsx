import React, { useEffect, useRef, useState } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { contentInteractions, type InteractionTarget } from '../../services/contentInteractions';
import { useAppContext } from '../../context/AppContext';

export function ContentInteractions(props: { kind: InteractionTarget; id: string; openComments?: boolean }) {
  const { currentUser } = useAppContext();
  return <InteractionSession key={`${props.kind}:${props.id}:${currentUser?.id ?? 'guest'}`} {...props} />;
}
function InteractionSession({ kind, id, openComments = false }: { kind: InteractionTarget; id: string; openComments?: boolean }) {
  const { currentUser, openAuthModal } = useAppContext();
  const [liked, setLiked] = useState<boolean | null>(null);
  const [open, setOpen] = useState(openComments);
  const [items, setItems] = useState<{ id: string; userId: string; text: string }[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const guard = useRef(false), alive = useRef(true);
  const cursor = useRef<QueryDocumentSnapshot | undefined>(undefined);
  const draft = useRef({ id: crypto.randomUUID(), text: '' });
  useEffect(() => {
    alive.current = true;
    if (currentUser) contentInteractions.liked(kind, id).then(value => { if (alive.current) setLiked(value); }).catch(() => { if (alive.current) setError('Likes unavailable. Reopen to retry.'); });
    return () => { alive.current = false; };
  }, [kind, id, currentUser?.id]);
  const load = async (next = false) => {
    if (guard.current) return;
    guard.current = true; setBusy(true); setError('');
    try {
      const page = await contentInteractions.comments(kind, id, next ? cursor.current : undefined);
      if (!alive.current) return;
      cursor.current = page.cursor; setMore(page.hasMore);
      setItems(previous => next ? [...previous, ...page.items.filter(item => !previous.some(old => old.id === item.id))] : page.items);
    } catch { if (alive.current) setError('Comments unavailable. Try again.'); }
    finally { guard.current = false; if (alive.current) setBusy(false); }
  };
  useEffect(() => { if (open) void load(); }, [open]);
  const act = async (operation: () => Promise<void>) => {
    if (!currentUser) { openAuthModal(); return; }
    if (guard.current) return;
    guard.current = true; setBusy(true); setError('');
    try { await operation(); } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Interaction failed.'); }
    finally { guard.current = false; if (alive.current) setBusy(false); }
  };
  return <section className="space-y-3" id="comments">
    <div className="flex gap-4">
      <button disabled={busy || (!!currentUser && liked === null)} onClick={() => void act(async () => { await contentInteractions.setLiked(kind, id, !liked); if (alive.current) setLiked(!liked); })}>{liked ? 'Unlike' : 'Like'}</button>
      <button onClick={() => setOpen(value => !value)}>{open ? 'Hide comments' : 'Comments'}</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {open && <>
      <button disabled={busy} onClick={() => void load()}>Refresh comments</button>
      {items.map(item => <p key={item.id} className="break-words border-b border-border-token py-2">{item.text}</p>)}
      {more && <button disabled={busy} onClick={() => void load(true)}>Older comments</button>}
      <form onSubmit={event => {
        event.preventDefault();
        void act(async () => {
          if (draft.current.text !== text) draft.current = { id: crypto.randomUUID(), text };
          await contentInteractions.comment(kind, id, text, draft.current.id);
          if (!alive.current) return;
          setItems(previous => [{ id: draft.current.id, userId: currentUser!.id, text: text.trim() }, ...previous.filter(item => item.id !== draft.current.id)]);
          setText(''); draft.current = { id: crypto.randomUUID(), text: '' };
        });
      }}>
        <textarea aria-label="Write a comment" value={text} maxLength={500} disabled={busy} onChange={event => setText(event.target.value)} className="w-full bg-surface border border-border-token rounded-xl p-2" />
        <button disabled={busy || !text.trim()}>Post comment</button>
      </form>
    </>}
  </section>;
}
