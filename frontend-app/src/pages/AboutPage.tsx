import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight, Eye, Shield, Zap, Calendar, CreditCard, ShieldCheck, Users } from "lucide-react";

function useFadeIn() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; observer.disconnect(); }
    }, { threshold: 0.08 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const fadeInit: React.CSSProperties = { opacity: 0, transform: "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" };

export function AboutPage() {
  const navigate = useNavigate();
  const missionRef = useFadeIn();
  const whatRef = useFadeIn();
  const valuesRef = useFadeIn();
  const ctaRef = useFadeIn();

  const whatWeDoCards = [
    { icon: <Calendar size={18} color="var(--color-accent-gold)" />, title: "Smart Booking", desc: "Reserve pieces with real-time availability and automatic conflict prevention." },
    { icon: <CreditCard size={18} color="var(--color-accent-gold)" />, title: "Transparent Payments", desc: "Clear pricing, deposits, and rental charges with detailed breakdowns." },
    { icon: <ShieldCheck size={18} color="var(--color-accent-gold)" />, title: "Conflict Prevention", desc: "Automatic date blocking and overlap detection ensure no double-bookings." },
    { icon: <Users size={18} color="var(--color-accent-gold)" />, title: "Role-Based Control", desc: "Separate interfaces for clients, admins, and operational staff." },
  ];

  const values = [
    { icon: <Eye size={20} color="var(--color-accent-gold)" />, title: "Transparency", desc: "Every booking, payment, and action is logged and visible to the right people." },
    { icon: <Shield size={20} color="var(--color-accent-gold)" />, title: "Accountability", desc: "Know exactly who has what, when, and for how long. No surprises." },
    { icon: <Zap size={20} color="var(--color-accent-gold)" />, title: "Simplicity", desc: "Powerful tools should be easy to use. No training required." },
  ];

  return (
    <div style={{ background: "var(--color-bg-primary)", width: "100%" }}>
      <style>{`
        .about-wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .about-what-card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 24px; transition: border-color 0.25s ease, transform 0.25s ease; }
        .about-what-card:hover { border-color: var(--color-border-strong); transform: translateY(-3px); }
        @media (max-width: 768px) {
          .about-mission-grid { grid-template-columns: 1fr !important; }
          .about-what-grid { grid-template-columns: 1fr !important; }
          .about-values-grid { grid-template-columns: 1fr !important; }
          .about-hero-stats { flex-wrap: wrap; gap: 24px !important; }
          .about-hero-stat-divider { display: none !important; }
        }
      `}</style>

      {/* Hero */}
      <section style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)", padding: "80px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,169,110,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Crown size={28} color="var(--color-accent-gold)" strokeWidth={1.5} style={{ margin: "0 auto 16px" }} />
          <p className="section-eyebrow" style={{ marginBottom: 12 }}>Our Story</p>
          <h1 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 52, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 16px 0", lineHeight: 1.1 }}>About Riwaayat</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--color-text-muted)", maxWidth: 520, marginInline: "auto", lineHeight: 1.7 }}>
            Building accountable and elegant asset operations for those who value heritage.
          </p>
          <div className="about-hero-stats" style={{ display: "flex", gap: 48, justifyContent: "center", alignItems: "center", marginTop: 48 }}>
            {[{ value: "500+", label: "Assets Managed" }, { value: "1,200+", label: "Bookings Fulfilled" }, { value: "3", label: "Years of Operation" }, { value: "99.9%", label: "Uptime" }].map((s, i) => (
              <>
                <div key={s.value} style={{ textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 600, color: "var(--color-accent-gold)", lineHeight: 1, display: "block" }}>{s.value}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: 6, display: "block" }}>{s.label}</span>
                </div>
                {i < 3 && <div className="about-hero-stat-divider" key={`d${i}`} style={{ width: 1, height: 40, background: "var(--color-border)" }} />}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section ref={missionRef as React.RefObject<HTMLElement>} style={{ ...fadeInit, background: "var(--color-bg-primary)", padding: "80px 0" }}>
        <div className="about-wrap">
          <div className="about-mission-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div style={{ borderLeft: "2px solid var(--color-accent-gold)", paddingLeft: 32 }}>
              <p className="section-eyebrow" style={{ marginBottom: 12 }}>Our Mission</p>
              <h2 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 36, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 20px 0", lineHeight: 1.2 }}>Why we built Riwaayat</h2>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.8, margin: 0 }}>
                Riwaayat empowers clients to access heritage pieces with transparency, accountability, and elegance. We believe that luxury rental shouldn't be complicated. Our platform simplifies the entire lifecycle — from discovery and booking to allocation, usage, and return.
              </p>
              <button className="btn-ghost" style={{ marginTop: 20, padding: "0", color: "var(--color-accent-gold)", letterSpacing: "0.1em" }} onClick={() => navigate("/assets")}>
                Explore the catalog <ArrowRight size={14} />
              </button>
            </div>
            <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "40px 36px", position: "relative" }}>
              <div style={{ position: "absolute", top: 16, left: 16, width: 32, height: 32, borderTop: "1px solid var(--color-border-strong)", borderLeft: "1px solid var(--color-border-strong)" }} />
              <div style={{ position: "absolute", bottom: 16, right: 16, width: 32, height: 32, borderBottom: "1px solid var(--color-border-strong)", borderRight: "1px solid var(--color-border-strong)" }} />
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 64, color: "var(--color-border-strong)", lineHeight: 1 }}>"</p>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.4, marginTop: 8 }}>
                Heritage should be accessible to all who cherish it.
              </p>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-accent-gold)", marginTop: 16, letterSpacing: "0.08em" }}>— The Riwaayat Team</p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section ref={whatRef as React.RefObject<HTMLElement>} style={{ ...fadeInit, background: "var(--color-bg-secondary)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", padding: "80px 0" }}>
        <div className="about-wrap">
          <p className="section-eyebrow" style={{ textAlign: "center", marginBottom: 12 }}>What We Do</p>
          <h2 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 40, fontWeight: 500, color: "var(--color-text-primary)", textAlign: "center", margin: "0 0 0 0" }}>A complete rental platform</h2>
          <hr className="gold-divider" style={{ margin: "20px auto", maxWidth: 80 }} />
          <div className="about-what-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginTop: 48, maxWidth: 800, marginInline: "auto" }}>
            {whatWeDoCards.map((c) => (
              <div key={c.title} className="about-what-card">
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>{c.icon}</div>
                <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-primary)", margin: "0 0 8px 0" }}>{c.title}</h3>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.7, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section ref={valuesRef as React.RefObject<HTMLElement>} style={{ ...fadeInit, background: "var(--color-bg-primary)", padding: "80px 0" }}>
        <div className="about-wrap">
          <p className="section-eyebrow" style={{ textAlign: "center", marginBottom: 12 }}>Our Values</p>
          <h2 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 40, fontWeight: 500, color: "var(--color-text-primary)", textAlign: "center", margin: "0 0 0 0" }}>What drives us</h2>
          <hr className="gold-divider" style={{ margin: "20px auto", maxWidth: 80 }} />
          <div className="about-values-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {values.map((v) => (
              <div key={v.title} style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "32px 24px", transition: "border-color 0.25s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-border-strong)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{v.icon}</div>
                <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-primary)", margin: "0 0 10px 0" }}>{v.title}</h3>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.7, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef as React.RefObject<HTMLElement>} style={{ ...fadeInit, padding: "60px 24px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "64px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 20, left: 20, width: 60, height: 60, borderTop: "1px solid var(--color-border-strong)", borderLeft: "1px solid var(--color-border-strong)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 20, right: 20, width: 60, height: 60, borderBottom: "1px solid var(--color-border-strong)", borderRight: "1px solid var(--color-border-strong)", pointerEvents: "none" }} />
          <Crown size={24} color="var(--color-accent-gold)" strokeWidth={1.5} style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 36, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 12px 0" }}>Start your journey</h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--color-text-muted)", marginBottom: 28, lineHeight: 1.7 }}>Join clients already using Riwaayat for elegant, accountable rentals.</p>
          <button className="btn-gold" style={{ padding: "14px 36px" }} onClick={() => navigate("/register")}>
            Create Account <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
