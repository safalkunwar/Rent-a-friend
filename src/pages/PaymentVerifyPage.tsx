import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export const PaymentVerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get('token') || searchParams.get('pidx');
      const statusParam = searchParams.get('status');

      if (!token) {
        setStatus('failed');
        setMessage('Missing payment verification token.');
        return;
      }

      try {
        const { paymentService } = await import('../services/payments');
        const result = await paymentService.verifyPayment('khalti', token);
        if (result.success) {
          setStatus('success');
          setMessage('Payment verified successfully! Your booking is confirmed.');
        } else {
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support.');
        }
      } catch (err) {
        setStatus('failed');
        setMessage(err instanceof Error ? err.message : 'Payment verification failed.');
      }
    };

    verify();
  }, [searchParams]);

  useEffect(() => {
    if (status !== 'loading') {
      const timer = setTimeout(() => navigate('/bookings'), 4000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full bg-surface border border-border-token rounded-3xl p-8 text-center">
        {status === 'loading' && <Loader className="w-12 h-12 text-primary-action mx-auto mb-4 animate-spin" />}
        {status === 'success' && <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />}
        {status === 'failed' && <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />}
        <h2 className="text-xl font-bold text-text-primary mb-2">
          {status === 'loading' ? 'Processing Payment' : status === 'success' ? 'Payment Successful' : 'Payment Failed'}
        </h2>
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
