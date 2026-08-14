import React, { useState, useCallback } from 'react';
import { MapPin, AlertTriangle, Navigation, CheckCircle2, X } from 'lucide-react';
import * as motion from 'motion/react-client';
import { sosService } from '../services/sos';
import { auth } from '../firebase';

export const SafetyWidget: React.FC<{ isVisible?: boolean, onClose?: () => void, bookingId?: string }> = ({ isVisible = true, onClose, bookingId }) => {
  const [sosActive, setSosActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSOS = useCallback(async () => {
    if (sosActive) {
      setSosActive(false);
      return;
    }

    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      await sosService.createAlert({
        bookingId,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Current location',
        },
        message: 'Emergency SOS triggered from SATHI app',
        severity: 'critical',
      });

      setSosActive(true);
    } catch (error) {
      console.error('SOS activation failed:', error);
      alert('Failed to activate SOS. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sosActive, bookingId]);

  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-surface rounded-2xl shadow-2xl border border-border-token p-4 w-72 flex flex-col gap-3 relative">
        {onClose && (
           <button onClick={onClose} aria-label="Close safety widget" className="absolute top-2 right-2 text-text-secondary hover:text-white p-1">
             <X className="w-4 h-4" />
           </button>
        )}
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-token flex items-center justify-center relative">
             <div className={`absolute inset-0 rounded-full border-2 ${sosActive ? 'border-red-500' : 'border-primary-action'} animate-ping opacity-20`}></div>
             <Navigation className={`w-5 h-5 ${sosActive ? 'text-red-500' : 'text-primary-action'}`} />
           </div>
           <div>
             <h4 className="text-sm font-semibold text-white">
                {sosActive ? 'SOS Protocol Active' : 'Safety Features Active'}
             </h4>
             <p className="text-xs text-text-secondary">
                {sosActive ? 'Broadcasting live location' : 'Live tracking enabled'}
             </p>
           </div>
        </div>

        <div className="bg-surface-elevated rounded-lg p-3 border border-border-token">
           <div className="text-xs flex justify-between text-text-secondary mb-1">
             <span>Emergency Contacts</span>
             <span className={`${sosActive ? 'text-red-500' : 'text-primary-action'} font-medium whitespace-nowrap`}>
               {sosActive ? 'Alerted' : 'Shared'}
             </span>
           </div>
           <div className="flex -space-x-2">
             <div className={`w-6 h-6 rounded-full ${sosActive ? 'bg-red-900 text-red-100 border-red-500' : 'bg-background border-border-token text-text-primary'} border-2 flex justify-center items-center text-[10px] uppercase font-bold transition-colors`}>Mom</div>
             <div className={`w-6 h-6 rounded-full ${sosActive ? 'bg-red-900 text-red-100 border-red-500' : 'bg-background border-border-token text-text-primary'} border-2 flex justify-center items-center text-[10px] uppercase font-bold transition-colors`}>Sis</div>
           </div>
        </div>

        <button 
          onClick={handleSOS}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-2 font-medium text-sm rounded-lg transition-colors disabled:opacity-50 ${
            sosActive 
              ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
              : 'bg-red-900/30 border border-red-500/30 hover:bg-red-900/50 text-red-500'
          }`}
        >
          {loading ? (
            'Activating...'
          ) : sosActive ? (
            <><CheckCircle2 className="w-4 h-4" /> Cancel SOS</>
          ) : (
            <><AlertTriangle className="w-4 h-4" /> Emergency SOS</>
          )}
        </button>
      </div>
    </motion.div>
  );
};
