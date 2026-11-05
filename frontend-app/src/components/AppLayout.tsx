import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import {
  Menu, X, Crown, Heart, ShoppingBag, Search, ChevronDown, User, MessageCircle, LogOut, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth-context";

function InstagramIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

export function AppLayout() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShopMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHomeActive = location.pathname === "/" && !location.search;
  const isShopActive = location.pathname.startsWith("/assets");
  const isContactActive = location.pathname === "/contact";

  // Minimal, refined navigation link style matching Rozina reference
  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-serif)",
    fontSize: "1.02rem",
    fontWeight: 400,
    letterSpacing: "0.02em",
    textDecoration: "none",
    color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.78)",
    paddingBottom: "3px",
    borderBottom: isActive ? "1px solid #FFFFFF" : "1px solid transparent",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
    background: "none",
    borderLeft: "none",
    borderRight: "none",
    borderTop: "none",
  });

  const shopCategories = [
    { label: "New Arrivals", to: "/assets" },
    { label: "The Royal Bridal Edit", to: "/assets?category=Bridal+Wear" },
    { label: "The Rental Vault (Occasion Rent)", to: "/assets?type=rent" },
    { label: "Ready-To-Wear Boutique (Buy)", to: "/assets?type=buy" },
    { label: "Heritage Banarasi Sarees", to: "/assets?category=Kurtis" },
    { label: "Raw Silk Sherwanis", to: "/assets?category=Party+Wear" },
    { label: "Chikankari Suit Sets", to: "/assets?category=Casual+Wear" },
    { label: "Designer Gowns & Long Tail Gowns", to: "/assets?category=Party+Wear" },
    { label: "Western Outfits & Jumpsuits", to: "/assets?category=Western+Outfits" },
    { label: "Designer Abayas & Hijabs", to: "/assets?category=Hijabs+%26+Abayas" },
    { label: "Artisanal Polki Jewellery", to: "/assets?category=Jewellery" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0B0B0B",
        color: "#FFFFFF",
        overflowX: "hidden",
      }}
    >


      {/* ── MAIN TASKBAR / NAVBAR (MINIMAL & ELEGANT AS IN ROZINA IMAGE) ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          width: "100%",
          background: scrolled ? "rgba(11, 11, 11, 0.98)" : "#0B0B0B",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          transition: "background 0.3s ease",
        }}
        onMouseLeave={() => setShopMenuOpen(false)}
      >
        <div style={{ maxWidth: 1380, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

            {/* ── LEFT ZONE: EXACTLY 3 MINIMAL LINKS (Home, Shop ⌵, Contact Us) ── */}
            <nav style={{ display: "flex", alignItems: "center", gap: 32, flex: 1 }} className="hidden md:flex">
              <NavLink
                to="/"
                style={() => navItemStyle(isHomeActive)}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#FFFFFF")}
                onMouseLeave={(e) => {
                  if (!isHomeActive) (e.currentTarget as HTMLElement).style.color = "rgba(255, 255, 255, 0.78)";
                }}
              >
                Home
              </NavLink>

              {/* Shop ⌵ */}
              <div
                style={{ position: "relative" }}
                onMouseEnter={() => setShopMenuOpen(true)}
              >
                <button
                  type="button"
                  onClick={() => setShopMenuOpen(!shopMenuOpen)}
                  style={navItemStyle(isShopActive)}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#FFFFFF")}
                  onMouseLeave={(e) => {
                    if (!isShopActive) (e.currentTarget as HTMLElement).style.color = "rgba(255, 255, 255, 0.78)";
                  }}
                >
                  <span>Shop</span>
                  <ChevronDown size={14} style={{ transform: shopMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", opacity: 0.7 }} />
                </button>
              </div>

              <NavLink
                to="/contact"
                style={() => navItemStyle(isContactActive)}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#FFFFFF")}
                onMouseLeave={(e) => {
                  if (!isContactActive) (e.currentTarget as HTMLElement).style.color = "rgba(255, 255, 255, 0.78)";
                }}
              >
                Contact Us
              </NavLink>
            </nav>

            {/* ── CENTER ZONE: OFFICIAL ELANORA EMBLEM & BRAND TITLE ── */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <NavLink
                to="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textDecoration: "none",
                }}
              >
                <img
                  src="/elanora-emblem.png"
                  alt="Elanora Boutique"
                  style={{
                    height: 44,
                    width: "auto",
                    objectFit: "contain",
                    filter: "drop-shadow(0 2px 10px rgba(201, 163, 74, 0.4))",
                    transition: "transform 0.25s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
                  <span
                    className="gold-metallic-text"
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: "1.32rem",
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    ELANORA
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={{ width: 10, height: 1, background: "rgba(201, 163, 74, 0.5)" }} />
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "0.55rem",
                        fontWeight: 600,
                        letterSpacing: "0.28em",
                        color: "#EB89A4",
                        textTransform: "uppercase",
                      }}
                    >
                      BOUTIQUE
                    </span>
                    <span style={{ width: 10, height: 1, background: "rgba(201, 163, 74, 0.5)" }} />
                  </div>
                </div>
              </NavLink>
            </div>

            {/* ── RIGHT ZONE: CLEAN MINIMAL ICONS (MATCHING ROZINA IMAGE) ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20, flex: 1 }}>
              {/* Instagram */}
              <a
                href="https://instagram.com/_elanora_boutique"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "rgba(255, 255, 255, 0.75)",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.75)")}
                title="Instagram"
                className="hidden md:flex"
              >
                <InstagramIcon size={19} />
              </a>

              {/* Search */}
              <button
                onClick={() => navigate("/assets")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.75)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 2,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.75)")}
                title="Search"
              >
                <Search size={19} strokeWidth={1.6} />
              </button>

              {/* Admin Console Pill (Only visible to authenticated administrators) */}
              {token && (user?.role === "admin" || user?.role === "staff") && (
                <button
                  type="button"
                  onClick={() => navigate("/admin/assets")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 9999,
                    background: "rgba(201, 163, 74, 0.15)",
                    border: "1.5px solid rgba(201, 163, 74, 0.45)",
                    color: "#C9A34A",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(201, 163, 74, 0.15)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(201, 163, 74, 0.25)";
                    e.currentTarget.style.boxShadow = "0 0 20px rgba(201, 163, 74, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(201, 163, 74, 0.15)";
                    e.currentTarget.style.boxShadow = "0 0 15px rgba(201, 163, 74, 0.15)";
                  }}
                  title="Exclusive Owner / Staff Console"
                >
                  <Crown size={13} color="#C9A34A" />
                  <span className="hidden sm:inline">Admin Console</span>
                </button>
              )}

              {/* Account with Luxury Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    if (!token) {
                      navigate("/login");
                    } else {
                      setUserMenuOpen(!userMenuOpen);
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: userMenuOpen ? "#C9A34A" : "rgba(255, 255, 255, 0.75)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 2,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = userMenuOpen ? "#C9A34A" : "rgba(255, 255, 255, 0.75)")}
                  title={token ? (user?.full_name || "My Account") : "Sign In"}
                >
                  <User size={19} strokeWidth={1.6} />
                </button>

                {/* User Dropdown */}
                <AnimatePresence>
                  {token && userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 14px)",
                        right: 0,
                        width: 250,
                        background: "#141414",
                        border: "1.5px solid rgba(201, 163, 74, 0.35)",
                        borderRadius: 14,
                        boxShadow: "0 20px 50px rgba(0,0,0,0.85), 0 0 30px rgba(201, 163, 74, 0.1)",
                        padding: "16px",
                        zIndex: 150,
                      }}
                    >
                      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {user?.full_name || "Elanora Client"}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {user?.email}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 9999,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              background: user?.role === "admin" ? "rgba(201, 163, 74, 0.15)" : "rgba(255, 255, 255, 0.08)",
                              color: user?.role === "admin" ? "#C9A34A" : "rgba(255,255,255,0.75)",
                              border: user?.role === "admin" ? "1px solid rgba(201, 163, 74, 0.3)" : "1px solid rgba(255, 255, 255, 0.12)",
                            }}
                          >
                            {user?.role === "admin" && <Crown size={10} />}
                            {user?.role === "admin" ? "Master Admin" : user?.role === "staff" ? "Atelier Staff" : "Client Member"}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {(user?.role === "admin" || user?.role === "staff") && (
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              navigate("/admin/assets");
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: 8,
                              background: "rgba(201, 163, 74, 0.12)",
                              border: "1px solid rgba(201, 163, 74, 0.3)",
                              color: "#C9A34A",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <Crown size={14} color="#C9A34A" />
                            <span>Atelier Admin Console</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/profile");
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: "transparent",
                            border: "none",
                            color: "rgba(255,255,255,0.85)",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <User size={14} color="rgba(255,255,255,0.6)" />
                          <span>My Profile & Security</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/bookings");
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: "transparent",
                            border: "none",
                            color: "rgba(255,255,255,0.85)",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <ShoppingBag size={14} color="rgba(255,255,255,0.6)" />
                          <span>My Vault Rentals</span>
                        </button>

                        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />

                        <button
                          onClick={async () => {
                            setUserMenuOpen(false);
                            await logout();
                            navigate("/login");
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: "rgba(239, 68, 68, 0.08)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            color: "#f87171",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.18)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)")}
                        >
                          <LogOut size={14} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Shopping Bag / Cart */}
              <button
                onClick={() => navigate(token ? "/bookings" : "/login")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.75)",
                  cursor: "pointer",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  padding: 2,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.75)")}
                title="Shopping Bag & Rentals"
              >
                <ShoppingBag size={19} strokeWidth={1.6} />
              </button>

              {/* Mobile Hamburger Toggle */}
              <button
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#FFFFFF",
                  padding: 4,
                }}
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>

          </div>
        </div>

        {/* ── CLEAN, MINIMAL "SHOP ⌵" MEGA-MENU DROPDOWN ── */}
        <AnimatePresence>
          {shopMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#0E0E0E",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.85)",
                zIndex: 90,
              }}
              onMouseEnter={() => setShopMenuOpen(true)}
              onMouseLeave={() => setShopMenuOpen(false)}
            >
              <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center" }}>
                  
                  {/* Left Column: Clean List of Categories (Matching Rozina Image 3) */}
                  <div>
                    <h4
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "0.85rem",
                        letterSpacing: "0.15em",
                        color: "#C9A34A",
                        textTransform: "uppercase",
                        margin: "0 0 16px",
                      }}
                    >
                      Boutique Edits
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                      {shopCategories.map((item, idx) => (
                        <Link
                          key={idx}
                          to={item.to}
                          onClick={() => setShopMenuOpen(false)}
                          style={{
                            fontSize: "0.92rem",
                            fontFamily: "var(--font-serif)",
                            color: "rgba(255, 255, 255, 0.8)",
                            textDecoration: "none",
                            padding: "4px 0",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#C9A34A")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)")}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: 2 Clean Editorial Photos (Matching Rozina Image 3) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div
                      onClick={() => {
                        setShopMenuOpen(false);
                        navigate("/assets?type=rent");
                      }}
                      style={{
                        position: "relative",
                        height: 260,
                        borderRadius: 6,
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=600&q=80"
                        alt="The Rental Vault"
                        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          padding: 14,
                        }}
                      >
                        <span style={{ fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          Couture Rental
                        </span>
                        <span style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", color: "#FFFFFF" }}>
                          The Rental Vault
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setShopMenuOpen(false);
                        navigate("/assets?type=buy");
                      }}
                      style={{
                        position: "relative",
                        height: 260,
                        borderRadius: 6,
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"
                        alt="Ready-to-Wear"
                        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          padding: 14,
                        }}
                      >
                        <span style={{ fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          Bespoke Retail
                        </span>
                        <span style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", color: "#FFFFFF" }}>
                          Buy to Own
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Slide-down Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: "#0E0E0E",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
              className="md:hidden"
            >
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                <NavLink
                  to="/"
                  style={{ color: isHomeActive ? "#C9A34A" : "#FFFFFF", textDecoration: "none", fontSize: "1rem", fontFamily: "var(--font-serif)" }}
                >
                  Home
                </NavLink>
                <NavLink
                  to="/assets"
                  style={{ color: isShopActive ? "#C9A34A" : "#FFFFFF", textDecoration: "none", fontSize: "1rem", fontFamily: "var(--font-serif)" }}
                >
                  Shop All
                </NavLink>
                <NavLink
                  to="/assets?type=rent"
                  style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "1rem", fontFamily: "var(--font-serif)" }}
                >
                  Rent Vault
                </NavLink>
                <NavLink
                  to="/assets?type=buy"
                  style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "1rem", fontFamily: "var(--font-serif)" }}
                >
                  Buy Collection
                </NavLink>
                <NavLink
                  to="/contact"
                  style={{ color: isContactActive ? "#C9A34A" : "#FFFFFF", textDecoration: "none", fontSize: "1rem", fontFamily: "var(--font-serif)" }}
                >
                  Contact Us
                </NavLink>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>



      {/* ── FLOATING WHATSAPP BUTTON (BOTTOM RIGHT) ── */}
      <a
        href="https://wa.me/919970347554?text=Hello%20Elanora%20Boutique,%20I%20am%20interested%20in%20your%20couture%20collection."
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 80,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#25D366",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          boxShadow: "0 6px 20px rgba(37, 211, 102, 0.35)",
          transition: "transform 0.2s ease",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        title="WhatsApp Us"
      >
        <MessageCircle size={24} />
      </a>

      {/* ── LUXURY MINIMAL FOOTER ── */}
      <footer
        style={{
          background: "#080808",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "50px 24px 30px",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 36, marginBottom: 40 }}>
            {/* Brand column */}
            <div style={{ maxWidth: 320 }}>
              <Link to="/" style={{ textDecoration: "none", display: "inline-block", marginBottom: 12 }}>
                <img
                  src="/elanora-logo.png"
                  alt="Elanora Boutique — Your Style, Our Passion"
                  style={{
                    height: 60,
                    width: "auto",
                    objectFit: "contain",
                    filter: "drop-shadow(0 4px 14px rgba(201,163,74,0.3))",
                    display: "block",
                    marginBottom: 8,
                  }}
                />
              </Link>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.68rem",
                  color: "#C9A34A",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  margin: "0 0 12px",
                }}
              >
                YOUR STYLE, OUR PASSION
              </p>
              <p style={{ fontSize: "0.82rem", lineHeight: 1.6, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>
                India's premier luxury couture & occasion rental atelier. Wearing perfection for your most cherished celebration.
              </p>
              <span style={{ fontSize: "0.72rem", color: "#C9A34A", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
                WEAR IT. LOVE IT. OWN IT. RENT IT.
              </span>
            </div>

            {/* Collections */}
            <div>
              <h4 style={{ fontSize: "0.8rem", fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                Collections
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem" }}>
                <li><Link to="/assets?category=Bridal+Wear" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Haute Couture Lehengas</Link></li>
                <li><Link to="/assets?category=Party+Wear" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Designer Gowns</Link></li>
                <li><Link to="/assets?category=Party+Wear" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Heritage Sherwanis</Link></li>
                <li><Link to="/assets?category=Kurtis" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Banarasi & Chikankari</Link></li>
                <li><Link to="/assets?category=Jewellery" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Artisanal Polki Jewellery</Link></li>
              </ul>
            </div>

            {/* Flagship Boutique */}
            <div>
              <h4 style={{ fontSize: "0.8rem", fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                Flagship Boutique
              </h4>
              <p style={{ fontSize: "0.82rem", lineHeight: 1.6, color: "rgba(255,255,255,0.6)", margin: "0 0 8px" }}>
                <strong style={{ color: "#FFFFFF" }}>Prakriti Palladium, Shop No. 1</strong><br />
                Near Punyadham Ashram Road,<br />
                Kondhwa, Pune - 411048
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#4ade80", marginTop: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                <span>Open Daily · 10:30 AM – 9:00 PM</span>
              </div>
            </div>

            {/* Direct Contacts */}
            <div>
              <h4 style={{ fontSize: "0.8rem", fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                Direct Hotline
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem" }}>
                <li>
                  <a href="tel:9970347554" style={{ color: "#C9A34A", textDecoration: "none" }}>
                    +91 9970347554
                  </a>
                </li>
                <li>
                  <a href="tel:9067867464" style={{ color: "#C9A34A", textDecoration: "none" }}>
                    +91 9067867464
                  </a>
                </li>
                <li>
                  <a href="mailto:elanora.info@gmail.com" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
                    elanora.info@gmail.com
                  </a>
                </li>
                <li>
                  <a href="https://instagram.com/_elanora_boutique" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
                    @_elanora_boutique
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              paddingTop: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              fontSize: "0.75rem",
              color: "rgba(255, 255, 255, 0.4)",
            }}
          >
            <span>© 2026 ELANORA BOUTIQUE. All rights reserved.</span>
            <span>Your Style, Our Passion.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
