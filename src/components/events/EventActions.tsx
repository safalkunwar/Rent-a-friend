import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { eventParticipantsService } from '../../services/eventParticipants';
import { eventCapacity } from '../../services/eventParticipationCore';
import { Modal } from '../ui/Modal';

export function EventActions(props: { id: string; data: Record<string, any>; onDeleted: (cleanupPending: boolean) => void }) {
  const { currentUser } = useAppContext();
  return <EventActionSession key={`${props.id}:${currentUser?.id ?? 'guest'}`} {...props} />;
}
function EventActionSession({ id, data, onDeleted }: { id: string; data: Record<string, any>; onDeleted: (pending: boolean) => void }) {
  const { currentUser, openAuthModal } = useAppContext();
  const [event, setEvent] = useState(data), [joined, setJoined] = useState(false), [loading, setLoading] = useState(!!currentUser);
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const alive = useRef(true), guard = useRef(false);
  const refresh = async () => {
    if (!currentUser) return;
    try { const result=await eventParticipantsService.getParticipation(id); if(alive.current) { setEvent(result.event); setJoined(result.joined); } }
    catch(failure) { if(alive.current) setError(failure instanceof Error ? failure.message : 'Could not load participation.'); }
    finally { if(alive.current) setLoading(false); }
  };
  useEffect(() => { alive.current=true; void refresh(); return () => { alive.current=false; }; }, [id,currentUser?.id]);
  const act = async (operation: () => Promise<void>) => {
    if(!currentUser) { openAuthModal(); return; }
    if(guard.current) return;
    guard.current=true; setBusy(true); setError('');
    try { await operation(); }
    catch(failure) { if(alive.current) { setError(failure instanceof Error ? failure.message : 'Event action failed.'); await refresh(); } }
    finally { guard.current=false; if(alive.current) setBusy(false); }
  };
  const capacity=eventCapacity(event), full=capacity.remaining===0;
  const closed=event.status!=='ACTIVE' || event.moderationStatus!=='ACTIVE' || event.visibilityStatus!=='PUBLIC';
  return <section aria-label="Event participation" className="space-y-3">
    {capacity.valid ? <p>{capacity.count} / {event.spots} joined · {capacity.remaining} spots left</p> : <p>Registration unavailable: capacity needs verification.</p>}
    <div className="flex flex-wrap gap-3">
      <button disabled={busy || loading || (!joined && (!capacity.valid || full || closed))} onClick={() => void act(async () => {
        if(joined) await eventParticipantsService.leaveEvent(id); else await eventParticipantsService.joinEvent(id);
        if(alive.current) await refresh();
      })} className="px-3 py-2 rounded-lg border border-border-token disabled:opacity-50">{busy ? 'Please wait…' : joined ? 'Leave Event' : closed ? 'Event unavailable' : full ? 'Event Full' : 'Join Event'}</button>
      {currentUser?.id===event.ownerId && event.status!=='DELETED' && <button disabled={busy} onClick={() => { setError(''); setConfirm(true); }} className="px-3 py-2 rounded-lg border border-border-token">Delete Event</button>}
    </div>
    {error && <p role="alert">{error}</p>}
    <Modal isOpen={confirm} onClose={() => { if(!busy) setConfirm(false); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="delete-event-title" aria-describedby="delete-event-message" className="space-y-4 text-text-primary">
        <h2 id="delete-event-title" className="font-bold">Delete Event?</h2>
        <p id="delete-event-message">Are you sure you want to delete this event? This action cannot be undone.</p>
        {error && <p role="alert">{error}</p>}
        <div className="flex gap-3">
          <button disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
          <button disabled={busy} onClick={() => void act(async () => {
            const result=await eventParticipantsService.deleteEvent(id);
            if(alive.current) { setConfirm(false); onDeleted(result.mediaCleanupPending); }
          })}>{busy ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </Modal>
  </section>;
}
