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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(120% 120% at 50% 0%, #17191C 0%, #0F1113 60%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative">
          <span className="absolute inset-0 rounded-[22px] bg-primary-action/30 animate-ping" />
          <img
            src="/sathi-logo.png"
            alt="SATHI"
            className="relative w-20 h-20 rounded-[22px] object-contain shadow-[0_12px_48px_rgba(200,162,94,0.35)]"
          />
        </div>
        <div className="text-2xl font-black tracking-tight text-text-primary">
          SATHI<span className="text-primary-action">.</span>
        </div>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary-action/40 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-primary-action/70 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-primary-action animate-bounce [animation-delay:300ms]" />
        </div>
        <p className="text-text-secondary text-sm min-h-5">
          {hasTimeout ? 'Taking longer than usual...' : 'Loading SATHI...'}
        </p>
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
