import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shirt, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "../../auth-context";

export function DryCleaningLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dry-cleaning/portal");
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please verify dry-cleaning partner credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: 16, maxWidth: 440, width: "100%", padding: 36 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(201,169,110,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Shirt size={24} color="var(--color-accent-gold)" />
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", color: "var(--color-text-primary)" }}>
            Atelier Sanitization Portal
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
            Partner portal for certified dry cleaning & ozone sterilization tracking.
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(224,112,112,0.15)", border: "1px solid rgba(224,112,112,0.3)", borderRadius: 8, padding: "10px 14px", color: "var(--color-error)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>Partner Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cleaner@atelier.com"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--color-bg-card)", border: "1px solid var(--color-border)", color: "#fff", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>Passcode</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--color-bg-card)", border: "1px solid var(--color-border)", color: "#fff", outline: "none" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px",
              borderRadius: 8,
              background: "var(--color-accent-gold)",
              color: "#1E0A14",
              fontWeight: 600,
              fontSize: "0.9rem",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 8,
            }}
          >
            {loading ? "Authenticating…" : "Access Treatment Jobs"} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
