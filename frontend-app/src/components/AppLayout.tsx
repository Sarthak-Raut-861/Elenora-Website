import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth-context";
import { cn } from "../lib/cn";

function getInitials(name: string | undefined) {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function AppLayout() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const publicLinks = [
    { to: "/", label: "Home" },
    { to: "/assets", label: "Catalog" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];
  const authLinks = [{ to: "/bookings", label: "My Bookings" }];
  const navLinks = token ? [...publicLinks, ...authLinks] : publicLinks;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-sans)",
    fontSize: "0.7rem",
    fontWeight: 500,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    textDecoration: "none",
    color: isActive ? "var(--color-accent-gold)" : "var(--color-text-muted)",
    transition: "color 0.2s ease",
    paddingBottom: "2px",
    borderBottom: isActive ? "1px solid var(--color-accent-gold)" : "1px solid transparent",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg-primary)",
        color: "var(--color-text-primary)",
        overflowX: "hidden",
      }}
    >
      {/* ── NAVBAR ── */}
      <header
        className="navbar-dark"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          width: "100%",
          boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.4)" : "none",
          transition: "box-shadow 0.3s ease",
        }}
      >
        <div className="page-container">
          <div style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>

            {/* Logo */}
            <NavLink
              to="/"
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}
            >
              <Crown size={20} color="var(--color-accent-gold)" strokeWidth={1.5} />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--color-accent-gold)",
                }}
              >
                Riwaayat
              </span>
            </NavLink>

            {/* Desktop nav */}
            <nav style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden md:flex">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  style={({ isActive }) => navLinkStyle(isActive)}
                  onMouseEnter={(e) => {
                    if (!(e.currentTarget as HTMLElement).style.color.includes("C9A96E"))
                      (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    if (!el.style.borderBottomColor.includes("C9A96E"))
                      el.style.color = "var(--color-text-muted)";
                  }}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Desktop actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }} className="hidden md:flex">
              {(!token || user?.role === "dry_cleaner") && (
                <NavLink
                  to="/dry-cleaning/login"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.65rem",
                    fontWeight: 500,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "var(--color-text-muted)",
                    padding: "6px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--color-accent-gold)";
                    e.currentTarget.style.borderColor = "var(--color-accent-gold)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text-muted)";
                    e.currentTarget.style.borderColor = "var(--color-border)";
                  }}
                >
                  Staff Portal
                </NavLink>
              )}

              {token ? (
                <>
                  <button
                    onClick={() => navigate("/profile")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 100,
                      padding: "5px 14px 5px 6px",
                      cursor: "pointer",
                      transition: "border-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-accent-gold)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--color-accent-gold-dim)",
                        color: "var(--color-bg-primary)",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(user?.full_name)}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-sans)",
                      }}
                      className="hidden lg:inline"
                    >
                      {user?.full_name?.split(" ")[0]}
                    </span>
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      border: "1px solid rgba(201,169,110,0.2)",
                      borderRadius: "var(--radius-sm)",
                      padding: "7px 14px",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--color-error)";
                      e.currentTarget.style.borderColor = "var(--color-error)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--color-text-muted)";
                      e.currentTarget.style.borderColor = "rgba(201,169,110,0.2)";
                    }}
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={() => navigate("/login")}
                    className="btn-ghost"
                    style={{ padding: "8px 18px" }}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => navigate("/register")}
                    className="btn-gold"
                    style={{ padding: "8px 20px" }}
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                padding: 6,
                marginLeft: "auto",
              }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: "var(--color-bg-secondary)",
                borderTop: "1px solid var(--color-border)",
                overflow: "hidden",
              }}
              className="md:hidden"
            >
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    style={({ isActive }) => ({
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      color: isActive ? "var(--color-accent-gold)" : "var(--color-text-muted)",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: isActive ? "rgba(201,169,110,0.08)" : "transparent",
                    })}
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div style={{ borderTop: "1px solid var(--color-border)", margin: "12px 0" }} />
                {token ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      className="btn-gold"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => navigate("/profile")}
                    >
                      My Profile
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={handleLogout}
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      className="btn-ghost"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => navigate("/login")}
                    >
                      Sign in
                    </button>
                    <button
                      className="btn-gold"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => navigate("/register")}
                    >
                      Get Started
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>

      {/* ── FOOTER ── */}
      <footer
        style={{
          background: "var(--color-bg-secondary)",
          borderTop: "1px solid var(--color-border)",
          padding: "56px 24px 28px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="footer-cols">
            {/* Col 1 — Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Crown size={18} color="var(--color-accent-gold)" strokeWidth={1.5} />
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--color-accent-gold)",
                  }}
                >
                  Riwaayat
                </span>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: "0.9rem",
                  color: "var(--color-text-muted)",
                  lineHeight: 1.6,
                  maxWidth: 240,
                }}
              >
                Where Tradition Meets Timeless Elegance.
              </p>
              <p style={{ fontSize: 12, color: "var(--color-text-faint)", marginTop: 24 }}>
                © 2026 Riwaayat. All rights reserved.
              </p>
            </div>

            {/* Col 2 — Catalog */}
            <div>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "var(--color-accent-gold)",
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                Catalog
              </p>
              {[
                { to: "/assets", label: "Browse All" },
                { to: "/bookings", label: "My Bookings" },
                { to: "/#how-it-works", label: "How It Works" },
              ].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    marginBottom: 10,
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>

            {/* Col 3 — Company */}
            <div>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "var(--color-accent-gold)",
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                Company
              </p>
              {[
                { to: "/about", label: "About Us" },
                { to: "/contact", label: "Contact" },
                { to: "/terms", label: "Terms" },
              ].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    marginBottom: 10,
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>

            {/* Col 4 — Account */}
            <div>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "var(--color-accent-gold)",
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                Account
              </p>
              {[
                { to: "/login", label: "Sign In" },
                { to: "/register", label: "Create Account" },
                { to: "/profile", label: "My Profile" },
              ].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    marginBottom: 10,
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              marginTop: 40,
              borderTop: "1px solid var(--color-border)",
              paddingTop: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--color-text-faint)",
              }}
            >
              Crafted with heritage, delivered with care.
            </p>
            <NavLink
              to="/dry-cleaning/login"
              style={{
                fontSize: 11,
                color: "var(--color-text-faint)",
                textDecoration: "none",
                letterSpacing: "0.08em",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-faint)")}
            >
              Staff Login
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
