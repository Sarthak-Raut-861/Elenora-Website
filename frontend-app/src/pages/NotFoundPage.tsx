import { useNavigate } from "react-router-dom";
import { Crown, Compass, ArrowRight } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 500 }}>
        <Crown size={40} color="var(--color-accent-gold-dim)" style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "4.5rem", color: "var(--color-accent-gold)", margin: 0, lineHeight: 1 }}>
          404
        </h1>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", color: "var(--color-text-primary)", margin: "12px 0" }}>
          Uncharted Destination
        </h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 28 }}>
          The page or vault entry you requested is unavailable or has been archived by our curators.
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            borderRadius: 8,
            background: "var(--color-accent-gold)",
            color: "#1E0A14",
            fontWeight: 600,
            fontSize: "0.9rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Return to Sanctuary <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
