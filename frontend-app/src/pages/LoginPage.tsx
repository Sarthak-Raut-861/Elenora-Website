import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Mail, Lock, Loader2, Check, Crown } from "lucide-react";
import { useAuth } from "../auth-context";
import { validateEmail } from "../utils/validation";

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-error)", margin: "4px 0 0 0", fontFamily: "var(--font-sans)" }}>
      <AlertCircle size={12} color="var(--color-error)" style={{ flexShrink: 0 }} />
      {message}
    </p>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string) => {
    let err: string | null = null;
    if (field === "email") err = validateEmail(value);
    if (field === "password") err = !value ? "Password is required" : value.length < 8 ? "Password must be at least 8 characters" : null;
    setErrors((prev) => ({ ...prev, [field]: err }));
    return err;
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const getFieldBorder = (field: string, value: string) => {
    if (!touched[field]) return "var(--color-border)";
    return errors[field] ? "var(--color-error)" : value ? "var(--color-success)" : "var(--color-border)";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = {
      email: validateEmail(email),
      password: !password ? "Password is required" : password.length < 8 ? "Password must be at least 8 characters" : null,
    };
    setErrors(newErrors);
    setTouched({ email: true, password: true });
    if (Object.values(newErrors).some(Boolean)) return;
    setError("");
    setLoading(true);
    try {
      const me = await login({ email, password });
      navigate(me.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string, value: string): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 16px 13px 42px",
    fontSize: 14,
    color: "var(--color-text-primary)",
    background: "var(--color-bg-secondary)",
    border: `1.5px solid ${getFieldBorder(field, value)}`,
    borderRadius: "var(--radius-md)",
    outline: "none",
    fontFamily: "var(--font-sans)",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  });

  return (
    <div
      style={{
        minHeight: "calc(100vh - 68px)",
        background: "var(--color-bg-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(201,169,110,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none", zIndex: 0 }} />

      {/* Card */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 440,
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: "44px 40px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Corner ornaments */}
        <div style={{ position: "absolute", top: 16, left: 16, width: 32, height: 32, borderTop: "1px solid var(--color-border-strong)", borderLeft: "1px solid var(--color-border-strong)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 16, right: 16, width: 32, height: 32, borderBottom: "1px solid var(--color-border-strong)", borderRight: "1px solid var(--color-border-strong)", pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Crown size={24} color="var(--color-accent-gold)" strokeWidth={1.5} style={{ margin: "0 auto 12px" }} />
          <h1 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px 0" }}>
            Welcome Back
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Sign in to continue to Riwaayat
          </p>
          <hr className="gold-divider" style={{ margin: "20px auto 0", maxWidth: 60 }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", marginBottom: 20, background: "rgba(224,112,112,0.08)", border: "1px solid rgba(224,112,112,0.25)", borderRadius: "var(--radius-md)" }}>
            <AlertCircle size={15} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: "var(--color-error)", fontFamily: "var(--font-sans)" }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={15} color="var(--color-text-faint)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (touched.email) validateField("email", e.target.value); }}
                  onBlur={() => handleBlur("email", email)}
                  disabled={loading}
                  autoComplete="email"
                  style={{ ...inputStyle("email", email), paddingRight: touched.email && !errors.email && email ? "42px" : "16px" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-gold)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,169,110,0.1)"; }}
                />
                {touched.email && !errors.email && email && (
                  <Check size={15} color="var(--color-success)" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                )}
              </div>
              <FieldError message={touched.email ? errors.email ?? null : null} />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                  Password
                </label>
                <a href="#" style={{ fontSize: 12, color: "var(--color-accent-gold)", textDecoration: "none", fontFamily: "var(--font-sans)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  Forgot?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <Lock size={15} color="var(--color-text-faint)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (touched.password) validateField("password", e.target.value); }}
                  onBlur={() => handleBlur("password", password)}
                  disabled={loading}
                  autoComplete="current-password"
                  style={{ ...inputStyle("password", password), paddingRight: "42px" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-gold)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,169,110,0.1)"; }}
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)", display: "flex", alignItems: "center", padding: 0 }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <FieldError message={touched.password ? errors.password ?? null : null} />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold"
            style={{ width: "100%", marginTop: 28, padding: "14px", fontSize: "0.75rem", justifyContent: "center", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-text-muted)", textAlign: "center", marginTop: 24, marginBottom: 0 }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "var(--color-accent-gold)", fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
