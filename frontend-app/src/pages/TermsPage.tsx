import { Shield, FileText, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", padding: "60px 24px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--color-accent-gold)", background: "transparent", border: "none", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", marginBottom: 24 }}
        >
          <ArrowLeft size={16} /> Return
        </button>

        <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "40px 32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 9999, background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)", marginBottom: 16 }}>
            <Shield size={14} color="var(--color-accent-gold)" />
            <span style={{ fontSize: "0.72rem", color: "var(--color-accent-gold)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Privilege Covenant</span>
          </div>

          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.4rem", color: "var(--color-text-primary)", marginBottom: 12 }}>
            Rental Charter & Terms of Service
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 32 }}>
            Please review our covenant governing luxury asset reservation, security escrow safeguards, return protocols, and hygiene maintenance.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {[
              {
                title: "1. Security Deposit & Escrow Protocol",
                desc: "Every rental reservation requires an escrow security deposit matching the selected Rental Plan tier. The deposit is held securely and refunded within 48 hours following physical intake inspection at our atelier.",
              },
              {
                title: "2. Handover & Date Reservation",
                desc: "Assets are blocked exclusively for your confirmed rental dates. Overlaps are strictly prevented. Cancellations requested more than 7 days prior to pickup receive a 100% full deposit refund.",
              },
              {
                title: "3. Care & Fabric Integrity",
                desc: "Clients agree not to self-wash, iron with direct heat, or chemically spot-clean delicate silks, velvets, and zardozi embroidery. Professional restoration is handled exclusively through our certified dry-cleaning partners.",
              },
              {
                title: "4. Return Timing & Grace Period",
                desc: "Assets must be surrendered on or before the due date agreed in your booking contract. Late returns without prior concierge approval incur the standard daily late fine stipulated in the rental plan.",
              },
            ].map((section, idx) => (
              <div key={idx} style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", color: "var(--color-accent-gold-light)", marginBottom: 8 }}>
                  {section.title}
                </h3>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: 1.65 }}>
                  {section.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
