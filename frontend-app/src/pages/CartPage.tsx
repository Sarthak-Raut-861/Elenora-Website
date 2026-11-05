import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ShoppingBag, Trash2, Shield, Plus, Minus, Sparkles, Check } from "lucide-react";
import { useCart } from "../cart-context";
import { formatINR } from "../utils/currency";

export function CartPage() {
  const { cartItems, cartCount, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();

  return (
    <div style={{ background: "#0B0B0B", color: "#FFFFFF", minHeight: "100vh", padding: "48px 20px 80px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              color: "#C9A34A",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <ArrowLeft size={16} /> Continue Browsing
          </button>

          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)")}
            >
              Clear Bag
            </button>
          )}
        </div>

        {/* Page Header */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <span style={{ fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 700 }}>
            YOUR CURATED ATELIER SELECTION
          </span>
          <h1
            className="gold-metallic-text"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "clamp(2.2rem, 4vw, 3rem)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              margin: "6px 0 12px",
              textTransform: "uppercase",
            }}
          >
            Shopping Bag ({cartCount})
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "0.95rem", margin: 0 }}>
            Review your couture orders, bespoke rental dates, and proceed with white-glove security.
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div
            style={{
              background: "#121212",
              borderRadius: 16,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "70px 24px",
              textAlign: "center",
              maxWidth: 580,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(201, 163, 74, 0.12)",
                border: "1px solid rgba(201, 163, 74, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#C9A34A",
                margin: "0 auto 20px",
              }}
            >
              <ShoppingBag size={32} />
            </div>
            <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.4rem", color: "#FFFFFF", margin: "0 0 10px" }}>
              Your Bag is Currently Empty
            </h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: 420, margin: "0 auto 28px" }}>
              Explore our hand-embroidered bridal lehengas, occasion rental vault, and ready-to-wear heirlooms.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
              <Link to="/assets" className="btn-rose-primary" style={{ padding: "12px 28px", fontSize: "0.85rem", textDecoration: "none" }}>
                Browse All Creations
              </Link>
              <Link to="/assets?type=rent" className="btn-gold-outline" style={{ padding: "12px 28px", fontSize: "0.85rem", textDecoration: "none" }}>
                The Rental Vault
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 36, alignItems: "start" }}>
            {/* Left Column: Bag Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#141414",
                    borderRadius: 14,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    padding: 20,
                    display: "flex",
                    gap: 20,
                    position: "relative",
                  }}
                >
                  {/* Photo */}
                  <div
                    onClick={() => navigate(`/assets/${item.asset.id}`)}
                    style={{
                      width: 100,
                      height: 130,
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "#1E1E1E",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={item.asset.image_url || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b"}
                      alt={item.asset.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            padding: "3px 10px",
                            borderRadius: 9999,
                            background: item.orderType === "rent" ? "rgba(201, 163, 74, 0.18)" : "rgba(255,255,255,0.1)",
                            color: item.orderType === "rent" ? "#C9A34A" : "#FFFFFF",
                            border: item.orderType === "rent" ? "1px solid rgba(201, 163, 74, 0.35)" : "1px solid rgba(255,255,255,0.15)",
                          }}
                        >
                          {item.orderType === "rent" ? `Rent (${item.rentalDays || 3} Days Duration)` : "Buy to Own (Permanent)"}
                        </span>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "rgba(255, 255, 255, 0.4)",
                            cursor: "pointer",
                            padding: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.74rem",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)")}
                        >
                          <Trash2 size={15} />
                          <span>Remove</span>
                        </button>
                      </div>

                      <h3
                        onClick={() => navigate(`/assets/${item.asset.id}`)}
                        style={{
                          fontFamily: "var(--font-brand)",
                          fontSize: "1.1rem",
                          color: "#FFFFFF",
                          margin: "10px 0 4px",
                          cursor: "pointer",
                          lineHeight: 1.3,
                        }}
                      >
                        {item.asset.name}
                      </h3>

                      <div style={{ display: "flex", gap: 16, fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.65)" }}>
                        <span>Size: <strong style={{ color: "#FFFFFF" }}>{item.size}</strong></span>
                        {item.color && <span>Shade: <strong style={{ color: "#FFFFFF" }}>{item.color}</strong></span>}
                        <span>SKU: <strong style={{ color: "#C9A34A" }}>{item.asset.asset_code}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: "#1A1A1A",
                          borderRadius: 8,
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          padding: "4px 6px",
                        }}
                      >
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#FFFFFF",
                            cursor: "pointer",
                            width: 26,
                            height: 26,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: 26, textAlign: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#FFFFFF",
                            cursor: "pointer",
                            width: 26,
                            height: 26,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", display: "block" }}>
                          {item.quantity} × {formatINR(item.price)}
                        </span>
                        <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#C9A34A" }}>
                          {formatINR(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Order Summary Card */}
            <div
              style={{
                background: "#141414",
                borderRadius: 16,
                border: "1px solid rgba(201, 163, 74, 0.3)",
                padding: "28px 24px",
                position: "sticky",
                top: 96,
                boxShadow: "0 15px 40px rgba(0,0,0,0.7)",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "1.2rem",
                  letterSpacing: "0.08em",
                  color: "#FFFFFF",
                  margin: "0 0 20px",
                  textTransform: "uppercase",
                  paddingBottom: 14,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Order Summary
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "rgba(255,255,255,0.75)" }}>
                  <span>Bag Items ({cartCount})</span>
                  <span>{formatINR(cartTotal)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "rgba(255,255,255,0.75)" }}>
                  <span>White Glove Delivery</span>
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>FREE (Complimentary)</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "rgba(255,255,255,0.75)" }}>
                  <span>Eco-Sterilization & Pressing</span>
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>Included</span>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "8px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 600, color: "#FFFFFF" }}>Total Amount</span>
                  <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#C9A34A" }}>
                    {formatINR(cartTotal)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate("/checkout?fromCart=true")}
                className="btn-rose-primary"
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <span>Proceed to Atelier Checkout</span>
                <ArrowRight size={18} />
              </button>

              {/* Guarantees */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 22, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem", color: "rgba(255,255,255,0.6)" }}>
                  <Shield size={14} color="#C9A34A" />
                  <span>Secure 256-Bit Encrypted Atelier Payments</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem", color: "rgba(255,255,255,0.6)" }}>
                  <Sparkles size={14} color="#C9A34A" />
                  <span>Doorstep Try & Fit Assistance on Delivery</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}