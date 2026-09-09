import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { EventActions } from '../components/events/EventActions';
import { CreateEventModal } from '../components/modals/CreateEventModal';
import { eventFields } from '../services/eventContract';

const mocks=vi.hoisted(()=>({uid:'A',get:vi.fn(),join:vi.fn(),leave:vi.fn(),remove:vi.fn(),save:vi.fn(),auth:vi.fn()}));
vi.mock('../context/AppContext',()=>({useAppContext:()=>({currentUser:{id:mocks.uid},openAuthModal:mocks.auth})}));
vi.mock('../services/eventParticipants',()=>({eventParticipantsService:{getParticipation:mocks.get,joinEvent:mocks.join,leaveEvent:mocks.leave,deleteEvent:mocks.remove}}));
vi.mock('../services/mediaUploads',()=>({saveAppMedia:mocks.save}));
vi.mock('../services/identity',()=>({requireUid:()=>mocks.uid}));
const data={id:'event',ownerId:'A',status:'ACTIVE',moderationStatus:'ACTIVE',visibilityStatus:'PUBLIC',spots:20,participantCount:7,participationVersion:1};
beforeEach(()=>{vi.clearAllMocks();mocks.uid='A';mocks.get.mockResolvedValue({event:data,joined:false});mocks.remove.mockResolvedValue({mediaCleanupPending:false});URL.createObjectURL=vi.fn(()=> 'blob:event');URL.revokeObjectURL=vi.fn();});
afterEach(cleanup);
it('owner sees capacity and confirmation; Cancel makes no deletion call',async()=>{
  render(<EventActions id="event" data={data} onDeleted={vi.fn()} />);
  expect(await screen.findByText('7 / 20 joined · 13 spots left')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Delete Event'}));
  expect(screen.getByRole('alertdialog')).toBeTruthy();
  expect(screen.getByText('Are you sure you want to delete this event? This action cannot be undone.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  expect(mocks.remove).not.toHaveBeenCalled();
});
it('another user cannot see Delete; full capacity disables join',async()=>{
  mocks.uid='B';mocks.get.mockResolvedValue({event:{...data,participantCount:20},joined:false});
  render(<EventActions id="event" data={data} onDeleted={vi.fn()} />);
  await waitFor(()=>expect((screen.getByRole('button',{name:'Event Full'}) as HTMLButtonElement).disabled).toBe(true));
  expect(screen.queryByRole('button',{name:'Delete Event'})).toBeNull();
});
it('failed deletion keeps the dialog and never claims success; duplicate clicks share one operation',async()=>{
  let reject!:(error:Error)=>void;mocks.remove.mockReturnValue(new Promise((_,fail)=>{reject=fail;}));
  const deleted=vi.fn();render(<EventActions id="event" data={data} onDeleted={deleted} />);
  fireEvent.click(screen.getByRole('button',{name:'Delete Event'}));
  const button=screen.getByRole('button',{name:'Delete'});fireEvent.click(button);fireEvent.click(button);
  expect(mocks.remove).toHaveBeenCalledTimes(1);reject(new Error('Offline deletion failed'));
  await screen.findAllByText('Offline deletion failed');expect(deleted).not.toHaveBeenCalled();expect(screen.getByRole('alertdialog')).toBeTruthy();
});
it('confirmed persisted deletion calls the unavailable-content handler',async()=>{
  const deleted=vi.fn();render(<EventActions id="event" data={data} onDeleted={deleted} />);
  fireEvent.click(screen.getByRole('button',{name:'Delete Event'}));fireEvent.click(screen.getByRole('button',{name:'Delete'}));
  await waitFor(()=>expect(deleted).toHaveBeenCalledWith(false));
});
it('capacity validation rejects malformed input and Event form submits the chosen maximum',async()=>{
  const fields={title:'Walk',description:'Local walk',location:'Pokhara',category:'Social',date:'2099-12-20',time:'10:30'};
  for(const spots of [0,-1,1.5,NaN,'abc','',10001]) expect(()=>eventFields({...fields,spots})).toThrow(/Maximum participants/);
  mocks.save.mockResolvedValue({id:'new-event'});const saved=vi.fn();const {container}=render(<CreateEventModal onClose={vi.fn()} onSaved={saved} />);
  for(const [label,value] of Object.entries(fields)) fireEvent.change(screen.getByLabelText(label==='time'?'time (Nepal time)':label),{target:{value}});
  fireEvent.change(screen.getByLabelText('Maximum participants'),{target:{value:'20'}});
  fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[new File(['image'],'photo.jpg',{type:'image/jpeg'})]}});
  fireEvent.click(screen.getByRole('button',{name:'Publish Event'}));
  await waitFor(()=>expect(mocks.save).toHaveBeenCalled());expect(mocks.save.mock.calls[0][1].spots).toBe('20');expect(saved).toHaveBeenCalledWith('new-event');
});
