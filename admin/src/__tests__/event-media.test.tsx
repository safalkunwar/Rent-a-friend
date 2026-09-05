import React from 'react';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { AdminContent } from '../pages/AdminContent';
const mocks=vi.hoisted(()=>({save:vi.fn(),toast:vi.fn()}));
vi.mock('../repositories/AdminRepository',()=>({adminRepository:{listActivities:vi.fn().mockResolvedValue([]),listEvents:vi.fn().mockResolvedValue([])}}));
vi.mock('../hooks/useAdmin',()=>({useAdminAuth:()=>({user:{uid:'creator'},hasPerm:()=>true})}));
vi.mock('../components/ui/Toast',()=>({useToast:()=>({showToast:mocks.toast})}));
vi.mock('../services/rateLimiter',()=>({adminRateLimiter:{checkAction:()=>true}}));
vi.mock('../../../src/services/mediaUploadCore',()=>({
  createMediaDraft:()=>({id:'media',contentId:'event-id',uid:'creator',kind:'event'}),saveMedia:mocks.save,
}));
beforeEach(()=>{vi.clearAllMocks();URL.createObjectURL=vi.fn(()=> 'blob:event-preview');URL.revokeObjectURL=vi.fn();});
afterEach(cleanup);
async function selectEventImage() {
  const rendered=render(<AdminContent />);
  fireEvent.click(screen.getByRole('button',{name:'Events'}));
  await waitFor(()=>expect(screen.getByText('No events found.')).toBeTruthy());
  fireEvent.click(screen.getByRole('button',{name:'New'}));
  fireEvent.change(rendered.container.querySelector('form input[required]')!,{target:{value:'Real event'}});
  fireEvent.change(rendered.container.querySelector('input[type=file]')!,{target:{files:[new File(['image'],'event.jpg',{type:'image/jpeg'})]}});
  return rendered;
}
describe('authorized event image picker',()=>{
  it('previews and saves through the shared core once, showing success after acknowledgement',async()=>{
    let resolve!:(value:object)=>void; mocks.save.mockReturnValue(new Promise(done=>{resolve=done;}));
    const rendered=await selectEventImage();
    expect(screen.getByAltText('Selected event image preview')).toBeTruthy();
    fireEvent.submit(rendered.container.querySelector('form')!);fireEvent.submit(rendered.container.querySelector('form')!);
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.toast).not.toHaveBeenCalled();
    resolve({id:'event-id',title:'Real event',imagePath:'events/creator/media.jpg'});
    await waitFor(()=>expect(mocks.toast).toHaveBeenCalledWith('Event image and metadata saved.','success'));
    expect(screen.getByText('Real event')).toBeTruthy();
  });
  it('failure preserves the selected image and event form for retry',async()=>{
    mocks.save.mockRejectedValue(new Error('Storage permission denied'));
    const rendered=await selectEventImage(); fireEvent.submit(rendered.container.querySelector('form')!);
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Storage permission denied'));
    expect(screen.getByAltText('Selected event image preview')).toBeTruthy();
    expect((rendered.container.querySelector('form input[required]') as HTMLInputElement).value).toBe('Real event');
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
