import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import * as motion from 'motion/react-client';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md min-w-[300px] ${
              toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
              'bg-[#1E2124]/90 border-[#2A2D31] text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-[#C8A25E]" />}
            
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/10 rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 opacity-70 hover:opacity-100" />
            </button>
          </motion.div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
