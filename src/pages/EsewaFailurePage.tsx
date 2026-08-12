import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export const EsewaFailurePage: React.FC = () => {
  const navigate = useNavigate();
  const [message] = useState('Your eSewa payment was cancelled or failed.');

  useEffect(() => {
    const timer = setTimeout(() => navigate('/bookings'), 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full bg-surface border border-border-token rounded-3xl p-8 text-center">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Payment Cancelled</h2>
        <p className="text-sm text-text-secondary mb-6">{message}</p>
        <button
          onClick={() => navigate('/bookings')}
          className="px-6 py-3 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors"
        >
          Go to Bookings
        </button>
      </div>
    </div>
  );
};
