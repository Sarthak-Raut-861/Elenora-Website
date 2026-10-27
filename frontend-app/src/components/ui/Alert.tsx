import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../lib/cn";

type AlertVariant = "success" | "error" | "info" | "warning";

interface AlertProps {
  variant: AlertVariant;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const config: Record<AlertVariant, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
  success: {
    bg: "rgba(126,200,160,0.08)",
    border: "rgba(126,200,160,0.25)",
    color: "var(--color-success)",
    icon: <CheckCircle2 size={15} style={{ flexShrink: 0 }} />,
  },
  error: {
    bg: "rgba(224,112,112,0.08)",
    border: "rgba(224,112,112,0.25)",
    color: "var(--color-error)",
    icon: <AlertCircle size={15} style={{ flexShrink: 0 }} />,
  },
  info: {
    bg: "rgba(201,169,110,0.08)",
    border: "rgba(201,169,110,0.25)",
    color: "var(--color-accent-gold)",
    icon: <Info size={15} style={{ flexShrink: 0 }} />,
  },
  warning: {
    bg: "rgba(232,180,100,0.08)",
    border: "rgba(232,180,100,0.25)",
    color: "#E8B464",
    icon: <AlertCircle size={15} style={{ flexShrink: 0 }} />,
  },
};

export function Alert({ variant, message, onDismiss, className }: AlertProps) {
  const { bg, border, color, icon } = config[variant];
  return (
    <div
      role="alert"
      className={cn("flex items-center gap-3 text-sm font-medium", className)}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        color,
        fontFamily: "var(--font-sans)",
        marginBottom: 16,
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ background: "none", border: "none", cursor: "pointer", color, padding: "2px", display: "flex", alignItems: "center", marginLeft: "auto", flexShrink: 0, opacity: 0.7 }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
