import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Save,
  Shield,
  Calendar,
  AlertCircle,
  Check,
  Crown,
  LogOut,
  ExternalLink,
  Package2,
  Tag,
  ClipboardList,
  LayoutDashboard,
  Shirt,
  Users,
  Sparkles,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth-context";
import { Alert } from "../components/ui/Alert";
import { validateName, validatePhone, validatePassword } from "../utils/validation";

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#f87171", margin: "6px 0 0 0" }}>
      <AlertCircle size={13} color="#f87171" style={{ flexShrink: 0 }} />
      {message}
    </p>
  );
}

function getInitials(name: string | undefined) {
  if (!name) return "E";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "rgba(255,255,255,0.1)" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "", color: "rgba(255,255,255,0.1)" },
    { label: "Weak", color: "#f87171" },
    { label: "Fair", color: "#f59e0b" },
    { label: "Strong", color: "#4ade80" },
    { label: "Atelier Grade (Very Strong)", color: "#C9A34A" },
  ];
  return { score, ...map[score] };
}

const luxuryInputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 16px",
  fontSize: "0.92rem",
  color: "#FFFFFF",
  background: "#1a1a1a",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "10px",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

function focusInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#C9A34A";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201, 163, 74, 0.15)";
}

function blurInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
  e.currentTarget.style.boxShadow = "none";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: "6px",
        fontSize: "0.74rem",
        fontWeight: 700,
        color: "#C9A34A",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </label>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  disabled,
  borderColor,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  borderColor?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••"}
        disabled={disabled}
        style={{
          ...luxuryInputBase,
          paddingRight: "44px",
          borderColor: borderColor ?? "rgba(255, 255, 255, 0.12)",
        }}
        onFocus={focusInput}
        onBlur={blurInput}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(255, 255, 255, 0.45)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function ProfilePage() {
  const { token, user, refreshToken, logout } = useAuth();
  const navigate = useNavigate();

  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string | null>>({});
  const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwFieldErrors, setPwFieldErrors] = useState<Record<string, string | null>>({});
  const [pwTouched, setPwTouched] = useState<Record<string, boolean>>({});

  // Sign out confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isAdmin = user?.role === "admin";

  const validateProfileField = (field: string, value: string) => {
    let err: string | null = null;
    if (field === "fullName") err = validateName(value);
    if (field === "phone" && value.trim()) err = validatePhone(value);
    setProfileFieldErrors((prev) => ({ ...prev, [field]: err }));
    return err;
  };

  const validatePwField = (field: string, value: string) => {
    let err: string | null = null;
    if (field === "newPassword") err = validatePassword(value);
    if (field === "confirmPassword") err = value !== newPassword ? "Passwords do not match" : null;
    if (field === "currentPassword") err = !value ? "Current password is required" : null;
    setPwFieldErrors((prev) => ({ ...prev, [field]: err }));
    return err;
  };

  const getProfileBorder = (field: string, value: string) => {
    if (!profileTouched[field]) return "rgba(255, 255, 255, 0.12)";
    return profileFieldErrors[field] ? "#f87171" : value ? "#4ade80" : "rgba(255, 255, 255, 0.12)";
  };

  const getPwBorder = (field: string, value: string) => {
    if (!pwTouched[field]) return undefined;
    return pwFieldErrors[field] ? "#f87171" : value ? "#4ade80" : undefined;
  };

  // Bookings for stats
  const bookingsQuery = useQuery({
    queryKey: ["bookings", token],
    queryFn: () => api.listBookings(token!),
    enabled: Boolean(token),
  });
  const bookings = Array.isArray(bookingsQuery.data) ? bookingsQuery.data : [];
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "returned").length;
  const activeBookings = bookings.filter((b) => ["picked_up", "overdue"].includes(b.status)).length;

  const profileMutation = useMutation({
    mutationFn: () => api.updateMe(token!, { full_name: fullName, phone: phone || undefined }),
    onSuccess: async () => {
      await refreshToken();
      setProfileMsg("Atelier Profile updated successfully!");
      setProfileError("");
      setTimeout(() => setProfileMsg(""), 3500);
    },
    onError: (err: Error) => setProfileError(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: () => api.changePassword(token!, { current_password: currentPassword, new_password: newPassword }),
    onSuccess: () => {
      setPwMsg("Security credentials updated successfully!");
      setPwError("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwTouched({});
      setPwFieldErrors({});
      setTimeout(() => setPwMsg(""), 3500);
    },
    onError: (err: Error) => setPwError(err.message),
  });

  const passwordsMatch = newPassword === confirmPassword;
  const pwFormValid = Boolean(currentPassword && newPassword && confirmPassword && passwordsMatch);
  const pwStrength = getPasswordStrength(newPassword);

  const handleProfileSave = () => {
    const nameErr = validateName(fullName);
    const phoneErr = phone.trim() ? validatePhone(phone) : null;
    setProfileFieldErrors({ fullName: nameErr, phone: phoneErr });
    setProfileTouched({ fullName: true, phone: true });
    if (nameErr || phoneErr) return;
    profileMutation.mutate();
  };

  const handlePasswordUpdate = () => {
    const errs = {
      currentPassword: !currentPassword ? "Current password is required" : null,
      newPassword: validatePassword(newPassword),
      confirmPassword: confirmPassword !== newPassword ? "Passwords do not match" : null,
    };
    setPwFieldErrors(errs);
    setPwTouched({ currentPassword: true, newPassword: true, confirmPassword: true });
    if (Object.values(errs).some(Boolean)) return;
    passwordMutation.mutate();
  };

  const handleConfirmLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <style>{`
        .profile-grid { display: grid; grid-template-columns: 290px 1fr; gap: 28px; align-items: start; }
        .profile-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 860px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .profile-info-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "calc(100vh - 4.5rem)", background: "#0B0B0B", color: "#FFFFFF", padding: "36px 24px" }}>
        <div style={{ maxWidth: "1140px", margin: "0 auto" }}>
          
          {/* ── Page Header ── */}
          <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Crown size={15} color="#C9A34A" />
                <span style={{ fontSize: "0.72rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                  ATELIER CLIENTELE & IDENTITY
                </span>
              </div>
              <h1
                className="gold-metallic-text"
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "2.2rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                My Profile
              </h1>
              <p style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.6)", margin: "4px 0 0 0" }}>
                Manage bespoke account details, password credentials, and active rental history.
              </p>
            </div>

            {/* Quick Sign Out Header Pill */}
            <button
              onClick={() => setShowLogoutModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                borderRadius: 9999,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
              }}
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>

          <div className="profile-grid">
            
            {/* ══ LEFT SIDEBAR: PROFILE & SIGN OUT CARD ══ */}
            <div
              style={{
                background: "#141414",
                borderRadius: "16px",
                padding: "32px 24px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
                textAlign: "center",
                border: "1px solid rgba(201, 163, 74, 0.3)",
                position: "relative",
              }}
            >
              {/* Avatar Monogram */}
              <div style={{ position: "relative", display: "inline-block" }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #1f1b14 0%, #3a301a 100%)",
                    border: "2px solid #C9A34A",
                    boxShadow: "0 0 25px rgba(201, 163, 74, 0.25)",
                    color: "#C9A34A",
                    fontSize: "34px",
                    fontWeight: 700,
                    fontFamily: "var(--font-brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                  }}
                >
                  {getInitials(user?.full_name)}
                </div>
              </div>

              {/* Name + Email */}
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#FFFFFF",
                  margin: "16px 0 4px 0",
                  fontFamily: "var(--font-brand)",
                  letterSpacing: "0.03em",
                }}
              >
                {user?.full_name || "Elanora Client"}
              </h2>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)", margin: 0, wordBreak: "break-all" }}>
                {user?.email}
              </p>

              {/* Role Badge */}
              <div style={{ marginTop: 12 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 14px",
                    borderRadius: 9999,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background: isAdmin ? "rgba(201, 163, 74, 0.15)" : "rgba(255, 255, 255, 0.08)",
                    border: isAdmin ? "1px solid rgba(201, 163, 74, 0.4)" : "1px solid rgba(255, 255, 255, 0.15)",
                    color: isAdmin ? "#C9A34A" : "rgba(255,255,255,0.8)",
                  }}
                >
                  {isAdmin && <Crown size={12} color="#C9A34A" />}
                  {isAdmin ? "Owner / Administrator" : user?.role === "staff" ? "Atelier Staff" : "Boutique Member"}
                </span>
              </div>

              {/* Stats Row */}
              <div
                style={{
                  display: "flex",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  marginTop: "22px",
                  padding: "16px 0",
                }}
              >
                {[
                  { value: totalBookings, label: "Bookings" },
                  { value: completedBookings, label: "Completed" },
                  { value: activeBookings, label: "Active" },
                ].map((stat, i, arr) => (
                  <div
                    key={stat.label}
                    style={{
                      flex: 1,
                      borderRight: i < arr.length - 1 ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
                      padding: "0 6px",
                    }}
                  >
                    <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#C9A34A", margin: 0 }}>
                      {stat.value}
                    </p>
                    <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", margin: "2px 0 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Member Since */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  marginTop: "16px",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                <Calendar size={13} color="#C9A34A" />
                Member since May 2026
              </div>

              {/* ── EXPLICIT SIGN OUT BUTTON IN SIDEBAR ── */}
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px",
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                  }}
                >
                  <LogOut size={16} />
                  Sign Out of Atelier
                </button>
              </div>
            </div>

            {/* ══ RIGHT COLUMN: ADMIN GATE & DETAILS ══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              
              {/* ── DISTINCT ATELIER MASTER CONSOLE CARD (ONLY FOR ADMIN) ── */}
              {(isAdmin || user?.role === "staff") && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #18150f 0%, #141414 100%)",
                    border: "1.5px solid rgba(201, 163, 74, 0.45)",
                    borderRadius: 16,
                    padding: "26px 30px",
                    boxShadow: "0 15px 45px rgba(0, 0, 0, 0.8), 0 0 35px rgba(201, 163, 74, 0.12)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: "rgba(201, 163, 74, 0.2)",
                            border: "1px solid rgba(201, 163, 74, 0.5)",
                            color: "#C9A34A",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                          }}
                        >
                          <Crown size={13} />
                          MASTER CONSOLE PRIVILEGES DETECTED
                        </span>
                      </div>
                      <h2
                        className="gold-metallic-text"
                        style={{
                          fontFamily: "var(--font-brand)",
                          fontSize: "1.55rem",
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          margin: 0,
                          textTransform: "uppercase",
                        }}
                      >
                        Atelier Executive Suite
                      </h2>
                      <p style={{ fontSize: "0.84rem", color: "rgba(255, 255, 255, 0.7)", margin: "6px 0 0", maxWidth: 540 }}>
                        Privileged administrative terminal to manage the Product Manifest, Escrow Tiers, Categories, Order Lifecycle, and Dry Cleaning Dispatch.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/admin/assets")}
                      className="btn-rose-primary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 24px",
                        borderRadius: 10,
                        fontSize: "0.86rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        boxShadow: "0 6px 20px rgba(201, 163, 74, 0.3)",
                      }}
                    >
                      <Sparkles size={16} />
                      Enter Admin Console
                    </button>
                  </div>

                  {/* Quick Jump Buttons to Admin Modules */}
                  <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 16, marginTop: 14 }}>
                    <span style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>
                      Direct Administrative Modules:
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                      {[
                        { label: "Product Manifest", to: "/admin/assets", icon: Package2 },
                        { label: "Categories", to: "/admin/categories", icon: Tag },
                        { label: "Rental Plans", to: "/admin/plans", icon: ClipboardList },
                        { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
                        { label: "Laundry Tracking", to: "/admin/dry-cleaning", icon: Shirt },
                        { label: "Customers & Staff", to: "/admin/users", icon: Users },
                      ].map((mod) => {
                        const Icon = mod.icon;
                        return (
                          <button
                            key={mod.to}
                            type="button"
                            onClick={() => navigate(mod.to)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "9px 12px",
                              borderRadius: 8,
                              background: "rgba(255, 255, 255, 0.04)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              color: "rgba(255, 255, 255, 0.85)",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(201, 163, 74, 0.15)";
                              e.currentTarget.style.borderColor = "#C9A34A";
                              e.currentTarget.style.color = "#C9A34A";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                              e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                            }}
                          >
                            <Icon size={14} />
                            <span>{mod.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PERSONAL INFORMATION CARD ── */}
              <div
                style={{
                  background: "#141414",
                  borderRadius: "16px",
                  padding: "28px 32px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 15px 40px rgba(0,0,0,0.6)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "22px" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(201, 163, 74, 0.12)",
                      border: "1px solid rgba(201, 163, 74, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={16} color="#C9A34A" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#FFFFFF", margin: 0 }}>
                      Personal Information
                    </h2>
                    <span style={{ fontSize: "0.74rem", color: "#888" }}>Primary atelier contact details</span>
                  </div>
                </div>

                {profileMsg && <Alert variant="success" message={profileMsg} onDismiss={() => setProfileMsg("")} />}
                {profileError && <Alert variant="error" message={profileError} onDismiss={() => setProfileError("")} />}

                <div className="profile-info-grid" style={{ marginBottom: "16px" }}>
                  {/* Full Name */}
                  <div>
                    <FieldLabel>Full Name *</FieldLabel>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (profileTouched.fullName) validateProfileField("fullName", e.target.value);
                        }}
                        onBlur={() => {
                          setProfileTouched((p) => ({ ...p, fullName: true }));
                          validateProfileField("fullName", fullName);
                        }}
                        disabled={profileMutation.isPending}
                        style={{
                          ...luxuryInputBase,
                          border: `1.5px solid ${getProfileBorder("fullName", fullName)}`,
                        }}
                        onFocus={focusInput}
                      />
                      {profileTouched.fullName && !profileFieldErrors.fullName && fullName && (
                        <Check size={16} color="#4ade80" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      )}
                    </div>
                    <FieldError message={profileTouched.fullName ? profileFieldErrors.fullName ?? null : null} />
                  </div>

                  {/* Email (Readonly) */}
                  <div>
                    <FieldLabel>Email (Permanent)</FieldLabel>
                    <div style={{ position: "relative" }}>
                      <input
                        type="email"
                        value={user?.email ?? ""}
                        disabled
                        readOnly
                        style={{
                          ...luxuryInputBase,
                          background: "#101010",
                          color: "rgba(255, 255, 255, 0.5)",
                          paddingRight: "40px",
                          cursor: "not-allowed",
                        }}
                      />
                      <Lock size={14} color="#666" style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }} />
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div style={{ marginBottom: "22px" }}>
                  <FieldLabel>Phone Number</FieldLabel>
                  <div
                    style={{
                      display: "flex",
                      border: `1.5px solid ${getProfileBorder("phone", phone)}`,
                      borderRadius: "10px",
                      overflow: "hidden",
                      background: "#1a1a1a",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "#121212",
                        borderRight: "1px solid rgba(255, 255, 255, 0.12)",
                        fontSize: "0.9rem",
                        color: "#C9A34A",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      +91
                    </div>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (profileTouched.phone) validateProfileField("phone", e.target.value);
                      }}
                      onBlur={() => {
                        setProfileTouched((p) => ({ ...p, phone: true }));
                        validateProfileField("phone", phone);
                      }}
                      disabled={profileMutation.isPending}
                      maxLength={10}
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        fontSize: "0.92rem",
                        color: "#FFFFFF",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                      }}
                    />
                  </div>
                  <FieldError message={profileTouched.phone ? profileFieldErrors.phone ?? null : null} />
                </div>

                {/* Save button */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={handleProfileSave}
                    disabled={profileMutation.isPending}
                    className="btn-rose-primary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "11px 24px",
                      borderRadius: 10,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      cursor: profileMutation.isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    <Save size={16} />
                    {profileMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>

              {/* ── CHANGE PASSWORD CARD ── */}
              <div
                style={{
                  background: "#141414",
                  borderRadius: "16px",
                  padding: "28px 32px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 15px 40px rgba(0,0,0,0.6)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "22px" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(201, 163, 74, 0.12)",
                      border: "1px solid rgba(201, 163, 74, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Lock size={16} color="#C9A34A" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#FFFFFF", margin: 0 }}>
                      Security Credentials
                    </h2>
                    <span style={{ fontSize: "0.74rem", color: "#888" }}>Update account authentication password</span>
                  </div>
                </div>

                {pwMsg && <Alert variant="success" message={pwMsg} onDismiss={() => setPwMsg("")} />}
                {pwError && <Alert variant="error" message={pwError} onDismiss={() => setPwError("")} />}

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Current password */}
                  <div>
                    <FieldLabel>Current Password *</FieldLabel>
                    <PasswordInput
                      value={currentPassword}
                      onChange={(v) => {
                        setCurrentPassword(v);
                        if (pwTouched.currentPassword) validatePwField("currentPassword", v);
                      }}
                      disabled={passwordMutation.isPending}
                      borderColor={getPwBorder("currentPassword", currentPassword)}
                    />
                    <FieldError message={pwTouched.currentPassword ? pwFieldErrors.currentPassword ?? null : null} />
                  </div>

                  {/* New password + strength */}
                  <div>
                    <FieldLabel>New Password *</FieldLabel>
                    <PasswordInput
                      value={newPassword}
                      onChange={(v) => {
                        setNewPassword(v);
                        if (pwTouched.newPassword) validatePwField("newPassword", v);
                      }}
                      placeholder="Min. 8 characters with numbers & symbols"
                      disabled={passwordMutation.isPending}
                      borderColor={getPwBorder("newPassword", newPassword)}
                    />
                    <FieldError message={pwTouched.newPassword ? pwFieldErrors.newPassword ?? null : null} />
                    {newPassword && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                          {[1, 2, 3, 4].map((seg) => (
                            <div
                              key={seg}
                              style={{
                                flex: 1,
                                height: "4px",
                                borderRadius: "4px",
                                background: seg <= pwStrength.score ? pwStrength.color : "rgba(255,255,255,0.1)",
                                transition: "background 0.2s",
                              }}
                            />
                          ))}
                        </div>
                        <p style={{ fontSize: "12px", color: pwStrength.color, margin: 0, fontWeight: 500 }}>
                          {pwStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <FieldLabel>Confirm New Password *</FieldLabel>
                    <PasswordInput
                      value={confirmPassword}
                      onChange={(v) => {
                        setConfirmPassword(v);
                        if (pwTouched.confirmPassword) validatePwField("confirmPassword", v);
                      }}
                      placeholder="Re-enter new password"
                      disabled={passwordMutation.isPending}
                      borderColor={getPwBorder("confirmPassword", confirmPassword)}
                    />
                    <FieldError message={pwTouched.confirmPassword ? pwFieldErrors.confirmPassword ?? null : null} />
                  </div>

                  {/* Update button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      onClick={handlePasswordUpdate}
                      disabled={passwordMutation.isPending || !pwFormValid}
                      className="btn-rose-primary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "11px 24px",
                        borderRadius: 10,
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        cursor: passwordMutation.isPending || !pwFormValid ? "not-allowed" : "pointer",
                        opacity: !pwFormValid ? 0.6 : 1,
                      }}
                    >
                      <Shield size={16} />
                      {passwordMutation.isPending ? "Updating Credentials..." : "Update Password"}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── LUXURY SIGN OUT CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: 20,
            }}
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                width: "100%",
                maxWidth: 440,
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.35)",
                borderRadius: 16,
                padding: "32px 28px",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(239, 68, 68, 0.15)",
                textAlign: "center",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1.5px solid rgba(239, 68, 68, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f87171",
                  margin: "0 auto 18px",
                  boxShadow: "0 0 20px rgba(239, 68, 68, 0.2)",
                }}
              >
                <LogOut size={24} />
              </div>

              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "#C9A34A",
                  textTransform: "uppercase",
                }}
              >
                SECURITY LOGOFF
              </span>

              <h3
                className="gold-metallic-text"
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "1.45rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  margin: "4px 0 10px",
                  textTransform: "uppercase",
                }}
              >
                End Atelier Session?
              </h3>

              <p style={{ fontSize: "0.84rem", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 24px", lineHeight: 1.5 }}>
                Are you sure you want to sign out from <strong style={{ color: "#FFFFFF" }}>{user?.email}</strong>? You will need to re-authenticate with your security credentials to access protected vault manifests.
              </p>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 10,
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "rgba(255, 255, 255, 0.75)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  style={{
                    flex: 1.2,
                    padding: "12px",
                    borderRadius: 10,
                    background: "#dc2626",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                  }}
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
