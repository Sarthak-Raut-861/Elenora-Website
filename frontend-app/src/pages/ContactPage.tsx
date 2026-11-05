import { BoutiqueAddressShowcase } from "../components/BoutiqueAddressShowcase";
import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, Crown, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { request } from "../api";

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await request<{ status: string; message: string }>("/contact/", {
        method: "POST",
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          message: formData.message,
        },
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit inquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", padding: "64px 24px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 9999, background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)", marginBottom: 12 }}>
            <Crown size={14} color="var(--color-accent-gold)" />
            <span style={{ fontSize: "0.72rem", color: "var(--color-accent-gold)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Atelier Concierge</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.6rem", color: "var(--color-text-primary)", fontWeight: 500 }}>
            Connect with Our Curators
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", maxWidth: 540, margin: "8px auto 0" }}>
            Reach out for bespoke bridal sizing consultations, private vault viewings, or corporate occasion styling.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 36 }}>
          {/* Contact Details */}
          <div style={{ background: "var(--color-bg-secondary)", borderRadius: 16, border: "1px solid var(--color-border)", padding: "36px 28px", display: "flex", flexDirection: "column", gap: 28 }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", color: "var(--color-accent-gold-light)" }}>
              Flagship Atelier
            </h2>

            {[
              { icon: <MapPin size={20} color="#C9A34A" />, label: "Flagship Boutique Address", value: "Prakriti Palladium, Shop No. 1, Near Punyadham Ashram Road, Kondhwa, Pune - 411048" },
              { icon: <Phone size={20} color="#C9A34A" />, label: "Direct Phone & WhatsApp", value: "+91 9970347554 / +91 9067867464" },
              { icon: <Mail size={20} color="#C9A34A" />, label: "Client Inquiries", value: "elanora.info@gmail.com" },
              { icon: <Clock size={20} color="#C9A34A" />, label: "Boutique Viewing Hours", value: "Mon – Sun: 10:30 AM – 9:00 PM (Daily Walk-ins & Bridal Appointments)" },
            ].map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ padding: 10, borderRadius: 8, background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                  {item.icon}
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-accent-gold-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{item.label}</span>
                  <p style={{ color: "var(--color-text-primary)", fontSize: "0.92rem", marginTop: 2, lineHeight: 1.5 }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div style={{ background: "var(--color-bg-card)", borderRadius: 16, border: "1px solid var(--color-border)", padding: "36px 28px" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "40px 10px" }}>
                <CheckCircle2 size={48} color="var(--color-success)" style={{ margin: "0 auto 16px" }} />
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--color-text-primary)", marginBottom: 8 }}>
                  Inquiry Dispatched
                </h3>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                  An atelier advisor will review your query and connect via telephone/email within 4 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {errorMsg && (
                  <div style={{ padding: 12, borderRadius: 8, background: "rgba(224,112,112,0.15)", border: "1px solid var(--color-error)", color: "var(--color-error)", display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 6, fontWeight: 500 }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 6, fontWeight: 500 }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 6, fontWeight: 500 }}>Contact Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 6, fontWeight: 500 }}>Message or Event Details</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none", resize: "none" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 20px",
                    borderRadius: 8,
                    background: "var(--color-accent-gold)",
                    color: "#1E0A14",
                    fontWeight: 600,
                    fontSize: "0.92rem",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    marginTop: 6,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {loading ? "Transmitting…" : "Transmit Inquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 64 }}>
        <BoutiqueAddressShowcase />
      </div>
    </div>
  );
}
