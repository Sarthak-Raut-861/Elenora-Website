import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Wrench, Package2, Tag, ClipboardList, Users, LogOut, Bell, Shirt, Crown, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../auth-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

const adminNav = [
  { to: "/admin/dashboard",    label: "Dashboard",      icon: LayoutDashboard },
  { to: "/admin/ops",          label: "Operations",     icon: Wrench },
  { to: "/admin/assets",       label: "Asset Manifest", icon: Package2 },
  { to: "/admin/categories",   label: "Categories",     icon: Tag },
  { to: "/admin/plans",        label: "Rental Plans",   icon: ClipboardList },
  { to: "/admin/users",        label: "Users",          icon: Users },
  { to: "/admin/dry-cleaning", label: "Dry Cleaning",   icon: Shirt, badgeKey: "dc" },
];

export function AdminLayout() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pendingQuery = useQuery({
    queryKey: ["dc-pending-send", token],
    queryFn: () => api.getDryCleaningPendingSend(token!),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });
  const pendingCount = pendingQuery.data?.length ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "A";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "var(--font-sans)", background: "var(--color-bg-primary)" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 256, minWidth: 256, height: "100vh", position: "sticky", top: 0, background: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)", display: "flex", flexDirection: "column", zIndex: 40 }}>

        {/* Logo */}
        <div style={{ height: 60, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
          <Crown size={18} color="var(--color-accent-gold)" strokeWidth={1.5} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-gold)" }}>
            Riwaayat
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-faint)", marginLeft: 4 }}>
            Admin
          </span>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          <p style={{ padding: "16px 20px 8px", fontFamily: "var(--font-sans)", fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.18em", color: "var(--color-text-faint)", textTransform: "uppercase", margin: 0 }}>
            Modules
          </p>

          {adminNav.map(({ to, label, icon: Icon, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                margin: "2px 8px",
                borderRadius: "var(--radius-md)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? "var(--color-accent-gold)" : "var(--color-text-muted)",
                background: isActive ? "rgba(201,169,110,0.08)" : "transparent",
                borderLeft: isActive ? "2px solid var(--color-accent-gold)" : "2px solid transparent",
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.02em",
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!el.getAttribute("aria-current")) {
                  el.style.background = "rgba(201,169,110,0.05)";
                  el.style.color = "var(--color-text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                if (!el.getAttribute("aria-current")) {
                  el.style.background = "transparent";
                  el.style.color = "var(--color-text-muted)";
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} color={isActive ? "var(--color-accent-gold)" : "currentColor"} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badgeKey === "dc" && pendingCount > 0 && (
                    <span style={{ background: "var(--color-accent-gold)", color: "var(--color-bg-primary)", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999, lineHeight: "16px" }}>
                      {pendingCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--color-border)", padding: 16, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", color: "var(--color-accent-gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0, fontFamily: "var(--font-serif)" }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.full_name}</p>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--color-text-faint)", margin: "1px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-faint)", background: "transparent", border: "none", cursor: "pointer", width: "100%", marginTop: 8, transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-error)"; e.currentTarget.style.background = "rgba(224,112,112,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-faint)"; e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── RIGHT COLUMN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{ height: 60, background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", position: "sticky", top: 0, zIndex: 50, flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)", letterSpacing: "0.04em" }}>Admin Console</span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.55rem", letterSpacing: "0.15em", color: "var(--color-text-faint)", display: "block", textTransform: "uppercase" }}>Riwaayat Management</span>
          </div>
          <button
            aria-label="Notifications"
            style={{ position: "relative", width: 34, height: 34, borderRadius: "var(--radius-md)", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", transition: "border-color 0.2s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-accent-gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          >
            <Bell size={15} />
            {pendingCount > 0 && (
              <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "var(--color-accent-gold)" }} />
            )}
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", background: "var(--color-bg-primary)", padding: "32px 36px", minHeight: "calc(100vh - 60px)" }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
