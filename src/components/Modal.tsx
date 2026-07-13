import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-width class for the modal box, e.g. "max-w-[760px]". */
  maxWidth?: string;
  contentClassName?: string;
}

/** Shared overlay modal: click-away close, ESC-to-close, and locked background scroll. */
export default function Modal({ open, onClose, children, maxWidth = 'max-w-[600px]', contentClassName = '' }: ModalProps) {
  useLockBodyScroll(open);
  useEscapeKey(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          {/* Click-away overlay */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`bg-white border border-[#E4E1DA] rounded-xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden relative z-10 ${contentClassName}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
