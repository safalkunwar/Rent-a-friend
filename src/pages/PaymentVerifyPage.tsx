import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { PAYMENT_REVIEW_REQUIRED } from '../services/payments';

export const PaymentVerifyPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full bg-surface border border-border-token rounded-3xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-primary-action mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Payment verification required</h2>
        <p className="text-sm text-text-secondary mb-6">{PAYMENT_REVIEW_REQUIRED} Reservation acceptance is separate from payment.</p>
        <button onClick={() => navigate('/bookings')} className="px-6 py-3 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors">
          Go to Bookings
        </button>
      </div>
    </div>
  );
};
