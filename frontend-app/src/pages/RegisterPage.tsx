import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Mail, Lock, User, Loader2, Check, Crown } from "lucide-react";
import { useAuth } from "../auth-context";
import { validateName, validateEmail, validatePassword } from "../utils/validation";

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "var(--color-border)" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { label: "", color: "var(--color-border)" },
    { label: "Weak", color: "var(--color-error)" },
    { label: "Fair", color: "#C9A96E" },
    { label: "Strong", color: "#7EC8A0" },
    { label: "Very Strong", color: "var(--color-success)" },
  ];
  return { score: s, ...map[s] };
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-error)", margin: "4px 0 0 0", fontFamily: "var(--font-sans)" }}>
      <AlertCircle size={12} color="var(--color-error)" style={{ flexShrink: 0 }} />
      {message}
    </p>
  );
}

function PwInput({ value, onChange, onBlur, placeholder, disabled, borderColor }: { value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; disabled?: boolean; borderColor?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Lock size={15} color="var(--color-text-faint)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder ?? "••••••••"}
        disabled={disabled}
        autoComplete="new-password"
        style={{ width: "100%", boxSizing: "border-box", padding: "12px 42px 12px 42px", fontSize: 14, color: "var(--color-text-primary)", background: "var(--color-bg-secondary)", border: `1.5px solid ${borderColor ?? "var(--color-border)"}`, borderRadius: "var(--radius-md)", outline: "none", fontFamily: "var(--font-sans)", transition: "border-color 0.2s ease" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-gold)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,169,110,0.1)"; }}
      />
      <button type="button" onClick={() => setShow((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)", display: "flex", alignItems: "center", padding: 0 }}>
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const strength = getStrength(password);

  const getFieldBorder = (field: string, value: string) => {
    if (!touched[field]) return "var(--color-border)";
    return errors[field] ? "var(--color-error)" : value ? "var(--color-success)" : "var(--color-border)";
  };

  const validateField = (field: string, value: string) => {
    let err: string | null = null;
    if (field === "fullName") err = validateName(value);
    if (field === "email") err = validateEmail(value);
    if (field === "password") err = validatePassword(value);
    if (field === "confirmPassword") err = value !== password ? "Passwords do not match" : null;
    setErrors((prev) => ({ ...prev, [field]: err }));
    return err;
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const canSubmit = !loading && !success && Boolean(fullName && email && password && confirmPassword && termsAccepted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string | null> = {
      fullName: validateName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: confirmPassword !== password ? "Passwords do not match" : null,
    };
    setErrors(newErrors);
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    if (!termsAccepted) setErrors((prev) => ({ ...prev, terms: "You must accept the terms" }));
    if (Object.values(newErrors).some(Boolean) || !termsAccepted) return;
    setError("");
    setLoading(true);
    try {
      await register({ full_name: fullName, email, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle: React.CSSProperties = { display: "block", fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 };

  return (
    <div style={{ minHeight: "calc(100vh - 68px)", background: "var(--color-bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(201,169,110,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480, background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "44px 40px", boxShadow: "var(--shadow-lg)" }}>
        {/* Corner ornaments */}
        <div style={{ position: "absolute", top: 16, left: 16, width: 32, height: 32, borderTop: "1px solid var(--color-border-strong)", borderLeft: "1px solid var(--color-border-strong)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 16, right: 16, width: 32, height: 32, borderBottom: "1px solid var(--color-border-strong)", borderRight: "1px solid var(--color-border-strong)", pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Crown size={24} color="var(--color-accent-gold)" strokeWidth={1.5} style={{ margin: "0 auto 12px" }} />
          <h1 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px 0" }}>Create Account</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>Join Riwaayat to start renting</p>
          <hr className="gold-divider" style={{ margin: "20px auto 0", maxWidth: 60 }} />
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", marginBottom: 16, background: "rgba(224,112,112,0.08)", border: "1px solid rgba(224,112,112,0.25)", borderRadius: "var(--radius-md)" }}>
            <AlertCircle size={15} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: "var(--color-error)", fontFamily: "var(--font-sans)" }}>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", marginBottom: 16, background: "rgba(126,200,160,0.08)", border: "1px solid rgba(126,200,160,0.25)", borderRadius: "var(--radius-md)" }}>
            <CheckCircle2 size={15} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: "var(--color-success)", fontFamily: "var(--font-sans)" }}>Account created! Redirecting…</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <div style={{ position: "relative" }}>
                <User size={15} color="var(--color-text-faint)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input type="text" placeholder="Your full name" value={fullName}
                  onChange={(e) => { setFullName(e.target.value); if (touched.fullName) validateField("fullName", e.target.value); }}
                  onBlur={() => handleBlur("fullName", fullName)}
                  disabled={loading}
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px 12px 42px", fontSize: 14, color: "var(--color-text-primary)", background: "var(--color-bg-secondary)", border: `1.5px solid ${getFieldBorder("fullName", fullName)}`, borderRadius: "var(--radius-md)", outline: "none", fontFamily: "var(--font-sans)" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-gold)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,169,110,0.1)"; }}
                />
                {touched.fullName && !errors.fullName && fullName && <Check size={15} color="var(--color-success)" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />}
              </div>
              <FieldError message={touched.fullName ? errors.fullName ?? null : null} />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail size={15} color="var(--color-text-faint)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); if (touched.email) validateField("email", e.target.value); }}
                  onBlur={() => handleBlur("email", email)}
                  disabled={loading}
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px 12px 42px", fontSize: 14, color: "var(--color-text-primary)", background: "var(--color-bg-secondary)", border: `1.5px solid ${getFieldBorder("email", email)}`, borderRadius: "var(--radius-md)", outline: "none", fontFamily: "var(--font-sans)" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-gold)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,169,110,0.1)"; }}
                />
                {touched.email && !errors.email && email && <Check size={15} color="var(--color-success)" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />}
              </div>
              <FieldError message={touched.email ? errors.email ?? null : null} />
            </div>

            {/* Password row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Password</label>
                <PwInput value={password} onChange={(v) => { setPassword(v); if (touched.password) validateField("password", v); }} onBlur={() => handleBlur("password", password)} placeholder="Min. 8 chars" disabled={loading} borderColor={getFieldBorder("password", password)} />
                <FieldError message={touched.password ? errors.password ?? null : null} />
              </div>
              <div>
                <label style={labelStyle}>Confirm</label>
                <PwInput value={confirmPassword} onChange={(v) => { setConfirmPassword(v); if (touched.confirmPassword) validateField("confirmPassword", v); }} onBlur={() => handleBlur("confirmPassword", confirmPassword)} placeholder="Re-enter" disabled={loading} borderColor={getFieldBorder("confirmPassword", confirmPassword)} />
                <FieldError message={touched.confirmPassword ? errors.confirmPassword ?? null : null} />
              </div>
            </div>

            {/* Strength bar */}
            {password && (
              <div>
                <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((seg) => (
                    <div key={seg} style={{ flex: 1, height: 3, borderRadius: 3, background: seg <= strength.score ? strength.color : "var(--color-border)", transition: "background 0.2s" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-faint)", fontFamily: "var(--font-sans)" }}>Password strength</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: strength.color, fontFamily: "var(--font-sans)" }}>{strength.label}</span>
                </div>
              </div>
            )}

            {/* Terms */}
            <div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <div
                  onClick={() => { setTermsAccepted((v) => !v); setErrors((prev) => ({ ...prev, terms: null })); }}
                  style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, marginTop: 2, border: `1.5px solid ${errors.terms ? "var(--color-error)" : termsAccepted ? "var(--color-accent-gold)" : "var(--color-border)"}`, background: termsAccepted ? "var(--color-accent-gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                >
                  {termsAccepted && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="var(--color-bg-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5, fontFamily: "var(--font-sans)" }}>
                  I agree to the{" "}
                  <Link to="/terms" style={{ color: "var(--color-accent-gold)", textDecoration: "none", fontWeight: 500 }}>Terms of Service</Link>
                  {" "}and{" "}
                  <a href="#" style={{ color: "var(--color-accent-gold)", textDecoration: "none", fontWeight: 500 }}>Privacy Policy</a>
                </span>
              </label>
              <FieldError message={errors.terms ?? null} />
            </div>
          </div>

          <button type="submit" disabled={!canSubmit} className="btn-gold" style={{ width: "100%", marginTop: 20, padding: "14px", fontSize: "0.75rem", justifyContent: "center", opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}>
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-text-muted)", textAlign: "center", marginTop: 20, marginBottom: 0 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--color-accent-gold)", fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
