import { useState, useCallback, useRef } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useAsyncAction = <T>(asyncFn: () => Promise<T>, deps: unknown[] = []) => {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await asyncFn();
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
      return result;
    } catch (error: any) {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, loading: false, error: error?.message || 'An error occurred' }));
      }
      throw error;
    }
  }, [asyncFn, ...deps]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    isIdle: !state.loading && !state.error && !state.data,
  };
};
