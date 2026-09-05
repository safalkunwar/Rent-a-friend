import React from 'react';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { ProfilePhotoUpload } from '../components/modals/ProfilePhotoUpload';
import { CreateStoryModal } from '../components/modals/CreateStoryModal';

const mocks=vi.hoisted(()=>({save:vi.fn(),story:vi.fn(),setUser:vi.fn(),toast:vi.fn(),uid:'A'}));
vi.mock('../context/AppContext',()=>({useAppContext:()=>({currentUser:{id:mocks.uid,name:'A',avatar:'',role:'customer',email:'a@example.test',favorites:[]},setCurrentUser:mocks.setUser,openAuthModal:vi.fn()})}));
vi.mock('../components/ui/Toast',()=>({useToast:()=>({showToast:mocks.toast})}));
vi.mock('../services/identity',()=>({requireUid:(uid?:string)=>{if(uid&&uid!==mocks.uid)throw new Error('Account changed');return mocks.uid;}}));
vi.mock('../services/mediaUploads',()=>({saveAppMedia:mocks.save}));
vi.mock('../repositories/SocialRepository',()=>({socialRepository:{uploadStory:mocks.story}}));
beforeEach(()=>{
  vi.clearAllMocks(); mocks.uid='A';
  URL.createObjectURL=vi.fn(()=> 'blob:preview'); URL.revokeObjectURL=vi.fn();
});
afterEach(cleanup);
const choose=(container:HTMLElement)=>fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[new File(['test'],'photo.jpg',{type:'image/jpeg'})]}});
describe('media form persistence sequencing',()=>{
  it('profile select previews but does not claim success or mutate user until persistence resolves',async()=>{
    let resolve!:(value:object)=>void;
    mocks.save.mockReturnValue(new Promise(done=>{resolve=done;}));
    const {container}=render(<ProfilePhotoUpload />); choose(container);
    expect(screen.getByAltText('Profile photo preview').getAttribute('src')).toBe('blob:preview');
    const button=screen.getByRole('button',{name:'Upload profile photo'});
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.setUser).not.toHaveBeenCalled();
    resolve({id:'A',role:'admin',avatar:'https://storage.test/photo',photoModerationStatus:'ACTIVE',photoVisibilityStatus:'PUBLIC'});
    await waitFor(()=>expect(mocks.setUser).toHaveBeenCalledTimes(1));
    expect(mocks.setUser.mock.calls[0][0].role).toBe('customer');
    expect(screen.getByRole('status').textContent).toBe('Profile photo saved.');
  });
  it('profile network failure preserves preview and permits retry',async()=>{
    mocks.save.mockRejectedValueOnce(new Error('Network unavailable'));
    const {container}=render(<ProfilePhotoUpload />); choose(container);
    fireEvent.click(screen.getByRole('button',{name:'Upload profile photo'}));
    await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Network unavailable'));
    expect(screen.getByAltText('Profile photo preview')).toBeTruthy();
    expect(mocks.setUser).not.toHaveBeenCalled();
    expect((screen.getByRole('button',{name:'Upload profile photo'}) as HTMLButtonElement).disabled).toBe(false);
  });
  it('Story publish prevents duplicates and calls success only after Storage/metadata service resolves',async()=>{
    let resolve!:(value:object)=>void;
    mocks.story.mockReturnValue(new Promise(done=>{resolve=done;}));
    const done=vi.fn(),close=vi.fn();
    const {container}=render(<CreateStoryModal onSuccess={done} onClose={close} />); choose(container);
    const button=screen.getByRole('button',{name:'Publish Story'}); fireEvent.click(button); fireEvent.click(button);
    expect(mocks.story).toHaveBeenCalledTimes(1); expect(done).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
    resolve({id:'s',userId:'A'});
    await waitFor(()=>expect(done).toHaveBeenCalledWith({id:'s',userId:'A'}));
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('Story metadata failure preserves caption/preview and does not announce publication',async()=>{
    mocks.story.mockRejectedValue(new Error('Permission denied'));
    const done=vi.fn(); const {container}=render(<CreateStoryModal onSuccess={done} onClose={vi.fn()} />); choose(container);
    fireEvent.change(screen.getByPlaceholderText('Describe your co-experience moment...'),{target:{value:'Keep me'}});
    fireEvent.click(screen.getByRole('button',{name:'Publish Story'}));
    await waitFor(()=>expect(screen.getByText('Permission denied')).toBeTruthy());
    expect((screen.getByPlaceholderText('Describe your co-experience moment...') as HTMLInputElement).value).toBe('Keep me');
    expect(screen.getByAltText('Preview')).toBeTruthy(); expect(done).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  });
});
