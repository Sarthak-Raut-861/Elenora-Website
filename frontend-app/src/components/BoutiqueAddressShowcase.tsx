import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Phone, Mail, Copy, Check, MessageCircle, ExternalLink
} from "lucide-react";

export function BoutiqueAddressShowcase() {
  const [copied, setCopied] = useState(false);

  const addressText = "Prakriti Palladium, Shop No. 1, Near Punyadham Ashram Road, Kondhwa, Pune - 411048";
  const googleMapsUrl = "https://www.google.com/maps/search/?api=1&query=Prakriti+Palladium+Shop+No+1+Near+Punyadham+Ashram+Road+Kondhwa+Pune+411048";

  const handleCopy = () => {
    navigator.clipboard.writeText(addressText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      style={{
        padding: "70px 20px",
        background: "#080808",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        
        {/* Minimal Luxury Section Header */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <span
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "#C9A34A",
              fontWeight: 600,
              display: "block",
              marginBottom: 8,
            }}
          >
            FLAGSHIP ATELIER
          </span>
          <h2
            className="gold-metallic-text"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              margin: "0 0 12px",
              textTransform: "uppercase",
            }}
          >
            Visit Our Boutique
          </h2>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.92rem",
              color: "rgba(255, 255, 255, 0.65)",
              margin: 0,
              maxWidth: 600,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.5,
            }}
          >
            Experience private bridal consultations, personalized draping sessions, and white-glove rental fittings at our flagship Pune atelier.
          </p>
        </div>

        {/* 2 Clean Minimal Luxury Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
          
          {/* ── CARD 1: Boutique Address & Visiting Hours ── */}
          <div
            style={{
              background: "#111111",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 12,
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <MapPin size={18} color="#C9A34A" />
                <span
                  style={{
                    fontSize: "0.74rem",
                    letterSpacing: "0.16em",
                    color: "#C9A34A",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  PUNE ATELIER
                </span>
              </div>

              <h3
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "1.3rem",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  margin: "0 0 8px",
                }}
              >
                Prakriti Palladium, Shop No. 1
              </h3>

              <p
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(255, 255, 255, 0.72)",
                  lineHeight: 1.6,
                  margin: "0 0 16px",
                }}
              >
                Near Punyadham Ashram Road, Kondhwa, Pune - 411048
              </p>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.78rem",
                  color: "#4ade80",
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  padding: "5px 14px",
                  borderRadius: 9999,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                <span>Open Daily · 10:30 AM – 9:00 PM</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 28,
                paddingTop: 18,
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-rose-primary"
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontSize: "0.78rem",
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Get Directions ↗
              </a>
              <button
                onClick={handleCopy}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: copied ? "#4ade80" : "#FFFFFF",
                  borderRadius: 9999,
                  padding: "10px 18px",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copied ? "Copied ✓" : "Copy Address"}
              </button>
            </div>
          </div>

          {/* ── CARD 2: Direct Concierge & Bridal Appointments ── */}
          <div
            style={{
              background: "#111111",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 12,
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Phone size={18} color="#C9A34A" />
                <span
                  style={{
                    fontSize: "0.74rem",
                    letterSpacing: "0.16em",
                    color: "#C9A34A",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  DIRECT CONCIERGE
                </span>
              </div>

              <h3
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "1.3rem",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  margin: "0 0 8px",
                }}
              >
                Appointments & Sizing
              </h3>

              <p
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(255, 255, 255, 0.72)",
                  lineHeight: 1.6,
                  margin: "0 0 16px",
                }}
              >
                Connect directly with our master stylists for bespoke bridal appointments, fitting reservations, or urgent occasion rentals.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.72rem", color: "#888", width: 65 }}>Primary:</span>
                  <a href="tel:9970347554" style={{ color: "#C9A34A", textDecoration: "none", fontWeight: 700, fontSize: "0.95rem" }}>
                    +91 9970347554
                  </a>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.72rem", color: "#888", width: 65 }}>Secondary:</span>
                  <a href="tel:9067867464" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "0.92rem" }}>
                    +91 9067867464
                  </a>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.72rem", color: "#888", width: 65 }}>Email:</span>
                  <a href="mailto:elanora.info@gmail.com" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.82rem" }}>
                    elanora.info@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 28,
                paddingTop: 18,
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <a
                href="https://wa.me/919970347554?text=Hello%20Elanora%20Boutique,%20I%20would%20like%20to%20inquire%20about%20a%20bridal/occasion%20fitting%20at%20your%20Kondhwa%20Pune%20store."
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold-outline"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 18px",
                  fontSize: "0.8rem",
                  textDecoration: "none",
                }}
              >
                <MessageCircle size={15} />
                <span>Book Fitting on WhatsApp</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
