import React, { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, act } from '@testing-library/react';
import { SafeImage } from '../components/ui/SafeImage';
import { AUTH_MODAL_EVENT, useAuthModalTrigger } from '../hooks/useAuthModalTrigger';
import { CreateStoryModal } from '../components/modals/CreateStoryModal';

vi.mock('../context/AppContext', () => ({ useAppContext: () => ({
  currentUser: null,
  openAuthModal: () => window.dispatchEvent(new CustomEvent('sathi_open_auth_modal')),
}) }));
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../repositories/SocialRepository', () => ({ socialRepository: {} }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('SafeImage readiness', () => {
  it('renders an already cached image without needing a new load event, including StrictMode', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(120);
    const { rerender } = render(<StrictMode><SafeImage src="/cached.png" alt="Photo" /></StrictMode>);
    expect(screen.getByAltText('Photo').className).toContain('opacity-100');
    rerender(<StrictMode><SafeImage src="/cached.png" alt="Photo" className="rounded-full" /></StrictMode>);
    expect(screen.getByAltText('Photo').className).toContain('opacity-100');
  });
  it('shows a cold image after load and preserves caller callbacks', () => {
    const onLoad = vi.fn();
    render(<SafeImage src="/cold.png" alt="Photo" onLoad={onLoad} loading="eager" />);
    const image = screen.getByAltText('Photo');
    expect(image.className).toContain('opacity-0');
    fireEvent.load(image);
    expect(image.className).toContain('opacity-100');
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(image.getAttribute('loading')).toBe('eager');
  });
  it('resets only for the new source and ignores old-image events', () => {
    const { rerender } = render(<SafeImage src="/a.png" alt="Photo" />);
    const old = screen.getByAltText('Photo');
    fireEvent.load(old);
    rerender(<SafeImage src="/b.png" alt="Photo" />);
    const replacement = screen.getByAltText('Photo');
    expect(replacement).not.toBe(old);
    expect(replacement.className).toContain('opacity-0');
    fireEvent.error(old); fireEvent.load(old);
    expect(replacement.className).toContain('opacity-0');
    fireEvent.load(replacement);
    expect(replacement.className).toContain('opacity-100');
  });
  it('recovers from an error when the source changes', () => {
    const onError = vi.fn();
    const { rerender } = render(<SafeImage src="/bad.png" alt="Photo" fallbackType="avatar" textForInitials="Test User" onError={onError} />);
    fireEvent.error(screen.getByAltText('Photo'));
    expect(screen.getByText('TU')).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    rerender(<SafeImage src="/good.png" alt="Photo" />);
    fireEvent.load(screen.getByAltText('Photo'));
    expect(screen.getByAltText('Photo').className).toContain('opacity-100');
  });
  it('handles an already-complete broken image and empty sources with fallbacks', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
    const { rerender } = render(<SafeImage src="/broken.png" alt="Photo" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Photo')).toBeTruthy();
    rerender(<SafeImage src="" alt="Avatar" fallbackType="avatar" textForInitials="Guest User" />);
    expect(screen.getByText('GU')).toBeTruthy();
  });
  it('new srcSet gets fresh readiness rather than reusing a loaded prior selection', () => {
    const { rerender } = render(<SafeImage src="/a.png" srcSet="/a2.png 2x" alt="Photo" />);
    fireEvent.load(screen.getByAltText('Photo'));
    rerender(<SafeImage src="/a.png" srcSet="/b2.png 2x" alt="Photo" />);
    expect(screen.getByAltText('Photo').className).toContain('opacity-0');
  });
});

describe('shared guest auth trigger', () => {
  it('opens login once in StrictMode and removes the listener on unmount', () => {
    const open = vi.fn();
    const { unmount } = renderHook(() => useAuthModalTrigger(open), { wrapper: StrictMode });
    act(() => window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT)));
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('login');
    unmount();
    act(() => window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT)));
    expect(open).toHaveBeenCalledTimes(1);
  });
  it('the real guest Story prompt closes and routes to the existing login state', () => {
    function Harness() {
      const [showStory, setShowStory] = useState(true);
      const [mode, setMode] = useState<string | null>(null);
      useAuthModalTrigger(setMode);
      return <>{showStory && <CreateStoryModal onClose={() => setShowStory(false)} />}
        {mode === 'login' && <div role="dialog" aria-label="Existing login dialog" />}</>;
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.queryByText('Sign In to Share Your Moment')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Existing login dialog' })).toBeTruthy();
  });
});
