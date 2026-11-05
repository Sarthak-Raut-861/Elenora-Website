import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Wrench, Package2, Tag, ClipboardList, Users, LogOut, Bell, Shirt, Crown, LayoutDashboard, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../auth-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

const adminNav = [
  { to: "/admin/dashboard",    label: "Dashboard",      icon: LayoutDashboard },
  { to: "/admin/ops",          label: "Operations & Rent", icon: Wrench },
  { to: "/admin/assets",       label: "Product Manifest", icon: Package2 },
  { to: "/admin/categories",   label: "Categories",     icon: Tag },
  { to: "/admin/plans",        label: "Rental Plans",   icon: ClipboardList },
  { to: "/admin/users",        label: "Customers & Staff", icon: Users },
  { to: "/admin/dry-cleaning", label: "Laundry Tracking", icon: Shirt, badgeKey: "dc" },
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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "var(--font-sans)", background: "#0B0B0B", color: "#FFFFFF" }}>

      {/* ── SIDEBAR MATCHING MOCKUP BOTTOM PANEL ── */}
      <aside
        style={{
          width: 260,
          minWidth: 260,
          height: "100vh",
          position: "sticky",
          top: 0,
          background: "#141414",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          zIndex: 40,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: 70,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            flexShrink: 0,
          }}
        >
          <img
            src="/elanora-emblem.png"
            alt="Elanora Emblem"
            style={{ width: 34, height: 34, objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(201,163,74,0.4))" }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span className="gold-metallic-text" style={{ fontFamily: "var(--font-brand)", fontSize: "1.05rem", fontWeight: 700, letterSpacing: "0.16em" }}>
                ELANORA
              </span>
              <span style={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.2em", color: "#EB89A4" }}>
                ADMIN
              </span>
            </div>
            <span style={{ fontSize: "0.52rem", color: "var(--color-text-faint)", letterSpacing: "0.08em", display: "block" }}>
              OWNER / STAFF CONSOLE
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 8px" }}>
          <p style={{ padding: "0 12px 10px", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
            MANAGEMENT
          </p>

          {adminNav.map(({ to, label, icon: Icon, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                margin: "3px 0",
                borderRadius: "10px",
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? "#EB89A4" : "#A3A3A3",
                background: isActive ? "rgba(235, 137, 164, 0.12)" : "transparent",
                borderLeft: isActive ? "3px solid #EB89A4" : "3px solid transparent",
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} color={isActive ? "#EB89A4" : "#A3A3A3"} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badgeKey === "dc" && pendingCount > 0 && (
                    <span style={{ background: "#EB89A4", color: "#0B0B0B", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>
                      {pendingCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          <div style={{ margin: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }} />

          <NavLink
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: 13,
              fontWeight: 600,
              color: "#C9A34A",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={15} color="#C9A34A" />
            <span>Storefront Atelier</span>
          </NavLink>
        </div>

        {/* User Card & Signout */}
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255, 255, 255, 0.08)", padding: 16, background: "#111111" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(201,163,74,0.15)",
                border: "1px solid #C9A34A",
                color: "#C9A34A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.full_name || "Administrator"}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "7px",
              fontSize: 11,
              fontWeight: 600,
              color: "#A3A3A3",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3A3")}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflowY: "auto", background: "#0B0B0B" }}>
        <Outlet />
      </main>

    </div>
  );
}
