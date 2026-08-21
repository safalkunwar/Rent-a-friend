import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const AdminUnauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full bg-surface border border-border-token rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-warning-token/10 text-warning-token mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h2>
        <p className="text-sm text-text-secondary mb-6">
          You don't have permission to access the SATHI Admin Console.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Login
        </button>
      </div>
    </div>
  );
};
