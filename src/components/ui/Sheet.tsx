import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  side?: 'right' | 'bottom';
  children: React.ReactNode;
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  side = 'right',
  children,
  className = ''
}) => {
  const isRight = side === 'right';

  const sheetVariants = {
    initial: isRight ? { x: '100%' } : { y: '100%' },
    animate: isRight ? { x: 0 } : { y: 0 },
    exit: isRight ? { x: '100%' } : { y: '100%' }
  };

  const layoutClasses = isRight
    ? 'fixed top-0 bottom-0 right-0 w-full md:w-[420px] max-w-full h-full border-l border-border-token/40 rounded-l-3xl shadow-2xl z-50 flex flex-col overflow-hidden bg-surface'
    : 'fixed bottom-0 left-0 right-0 max-h-[90vh] w-full border-t border-border-token/40 rounded-t-3xl shadow-2xl z-50 flex flex-col overflow-hidden bg-surface';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Sheet Container */}
          <motion.div
            variants={sheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`${layoutClasses} ${className}`}
          >
            {/* Grab handle for bottom sheet */}
            {!isRight && (
              <div className="flex justify-center py-2 shrink-0">
                <div className="w-12 h-1 bg-border-token/80 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-token/40 shrink-0">
              {title ? (
                <h3 className="text-lg font-semibold text-white">
                  {title}
                </h3>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-white transition p-1.5 hover:bg-surface-elevated rounded-full"
                aria-label="Close sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
