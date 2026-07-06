import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleProps {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Disclosure section reused by secondary modal content and collapsible filter panels. */
export default function Collapsible({ title, badge, defaultOpen = false, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-[#E2E2DE] pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left cursor-pointer"
      >
        <span className="text-[10px] font-bold text-[#717171] uppercase tracking-wider flex items-center gap-2">
          {title}
          {badge !== undefined && badge !== '' && (
            <span className="bg-[#F5F4F0] text-[#0F0F0F] text-[9px] font-bold px-1.5 py-0.5">{badge}</span>
          )}
        </span>
        <ChevronDown size={14} className={`text-[#717171] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
