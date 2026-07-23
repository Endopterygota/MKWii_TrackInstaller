import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
};

export function Dialog({ open, title, description, children, onClose, closeLabel = "Dialog schließen" }: DialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="dialog"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="dialog__close" aria-label={closeLabel} onClick={onClose}><X size={17} /></button>
            <p className="eyebrow">AUTOMATION</p>
            <h2>{title}</h2>
            {description && <p className="dialog__description">{description}</p>}
            <div className="dialog__content">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
