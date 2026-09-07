import { useEffect } from 'react';

export const AUTH_MODAL_EVENT = 'sathi_open_auth_modal';

/** Route shared guest prompts to the existing ClientApp dialog state. */
export function useAuthModalTrigger(open: (mode: 'login') => void) {
  useEffect(() => {
    const handleOpen = () => open('login');
    window.addEventListener(AUTH_MODAL_EVENT, handleOpen);
    return () => window.removeEventListener(AUTH_MODAL_EVENT, handleOpen);
  }, [open]);
}
