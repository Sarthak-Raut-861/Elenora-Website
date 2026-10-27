import { cn } from "../../lib/cn";
import { bookingStatusColor, formatStatus } from "../../lib/status";

interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, string>;
  className?: string;
}

// Riwaayat-themed status color map
const riwaayatStatusColor: Record<string, React.CSSProperties> = {
  pending:          { background: "rgba(201,169,110,0.12)", color: "#C9A96E", border: "1px solid rgba(201,169,110,0.3)" },
  booked:           { background: "rgba(126,200,160,0.12)", color: "#7EC8A0", border: "1px solid rgba(126,200,160,0.3)" },
  allocated:        { background: "rgba(180,140,200,0.12)", color: "#C8A0D8", border: "1px solid rgba(180,140,200,0.3)" },
  rent_paid:        { background: "rgba(180,140,200,0.12)", color: "#C8A0D8", border: "1px solid rgba(180,140,200,0.3)" },
  ready_for_pickup: { background: "rgba(232,180,100,0.12)", color: "#E8B464", border: "1px solid rgba(232,180,100,0.3)" },
  return_requested: { background: "rgba(232,140,100,0.12)", color: "#E88C64", border: "1px solid rgba(232,140,100,0.3)" },
  picked_up:        { background: "rgba(126,200,160,0.12)", color: "#7EC8A0", border: "1px solid rgba(126,200,160,0.3)" },
  overdue:          { background: "rgba(224,112,112,0.12)", color: "#E07070", border: "1px solid rgba(224,112,112,0.3)" },
  returned:         { background: "rgba(126,200,160,0.12)", color: "#7EC8A0", border: "1px solid rgba(126,200,160,0.3)" },
  cancelled:        { background: "rgba(158,128,112,0.12)", color: "#9E8070", border: "1px solid rgba(158,128,112,0.3)" },
  available:        { background: "rgba(126,200,160,0.12)", color: "#7EC8A0", border: "1px solid rgba(126,200,160,0.3)" },
  rented:           { background: "rgba(201,169,110,0.12)", color: "#C9A96E", border: "1px solid rgba(201,169,110,0.3)" },
  maintenance:      { background: "rgba(224,112,112,0.12)", color: "#E07070", border: "1px solid rgba(224,112,112,0.3)" },
};

export function StatusBadge({ status, colorMap, className }: StatusBadgeProps) {
  const inlineStyle = riwaayatStatusColor[status] ?? {
    background: "rgba(158,128,112,0.12)",
    color: "var(--color-text-muted)",
    border: "1px solid var(--color-border)",
  };

  return (
    <span
      className={cn("inline-flex items-center capitalize tracking-wide", className)}
      style={{
        ...inlineStyle,
        borderRadius: 100,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {formatStatus(status)}
    </span>
  );
}
