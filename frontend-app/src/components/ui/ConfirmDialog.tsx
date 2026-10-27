import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = "Confirm", cancelLabel = "Cancel",
  onConfirm, onCancel, danger = true,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          onClick={onCancel}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,2,8,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}
          >
            {/* Body */}
            <div style={{ padding: "28px 28px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: danger ? "rgba(224,112,112,0.1)" : "rgba(201,169,110,0.1)", border: `1px solid ${danger ? "rgba(224,112,112,0.25)" : "var(--color-border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={20} color={danger ? "var(--color-error)" : "var(--color-accent-gold)"} strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 6px" }}>{title}</p>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.6 }}>{message}</p>
              </div>
            </div>
            {/* Footer */}
            <div style={{ padding: "16px 28px 24px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--color-border)" }}>
              <button onClick={onCancel} className="btn-ghost" style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 18px" }}>
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                style={{ height: 38, padding: "0 18px", background: danger ? "var(--color-error)" : "var(--color-accent-gold)", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: danger ? "#fff" : "var(--color-bg-primary)", cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
