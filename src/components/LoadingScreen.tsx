import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';

export const LoadingScreen: React.FC = () => {
  const { loading } = useAppContext();
  const [hasTimeout, setHasTimeout] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setHasTimeout(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!loading && !hasTimeout) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-action flex items-center justify-center font-bold text-background text-2xl animate-pulse">
          S
        </div>
        <p className="text-text-secondary text-sm">{hasTimeout ? 'Taking longer than usual...' : 'Loading SATHI...'}</p>
        {hasTimeout && (
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-primary-action underline"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
};
