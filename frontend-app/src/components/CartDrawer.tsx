import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Trash2, ArrowRight, Sparkles, Shield, Plus, Minus } from "lucide-react";
import { useCart } from "../cart-context";
import { formatINR } from "../utils/currency";

export function CartDrawer() {
  const { cartItems, cartCount, cartTotal, removeFromCart, updateQuantity, isCartOpen, closeCart } = useCart();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120 }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCart}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
            }}
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              maxWidth: 460,
              background: "#0E0E0E",
              borderLeft: "1px solid rgba(201, 163, 74, 0.3)",
              boxShadow: "-15px 0 50px rgba(0, 0, 0, 0.9)",
              display: "flex",
              flexDirection: "column",
              color: "#FFFFFF",
              zIndex: 10,
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "#121212",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShoppingBag size={20} color="#C9A34A" />
                <h3
                  style={{
                    fontFamily: "var(--font-brand)",
                    fontSize: "1.15rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  Shopping Bag ({cartCount})
                </h3>
              </div>
              <button
                onClick={closeCart}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "#1E1E1E",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#282828")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1E1E1E")}
              >
                <X size={16} />
              </button>
            </div>

            {/* Free Shipping Note */}
            <div
              style={{
                padding: "10px 24px",
                background: "rgba(201, 163, 74, 0.1)",
                borderBottom: "1px solid rgba(201, 163, 74, 0.2)",
                fontSize: "0.74rem",
                color: "#E8D49E",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Sparkles size={14} color="#C9A34A" />
              <span>Complimentary Pan-India White Glove Doorstep Delivery</span>
            </div>

            {/* Items List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {cartItems.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    textAlign: "center",
                    padding: "40px 10px",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "rgba(201, 163, 74, 0.12)",
                      border: "1px solid rgba(201, 163, 74, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#C9A34A",
                      marginBottom: 16,
                    }}
                  >
                    <ShoppingBag size={28} />
                  </div>
                  <h4
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: "1.1rem",
                      color: "#FFFFFF",
                      margin: "0 0 8px",
                    }}
                  >
                    Your Bag is Empty
                  </h4>
                  <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)", maxWidth: 260, margin: "0 0 24px" }}>
                    Discover our luxury bridal, festive heirlooms, and occasion rental vault.
                  </p>
                  <button
                    onClick={() => {
                      closeCart();
                      navigate("/assets");
                    }}
                    className="btn-rose-primary"
                    style={{ padding: "11px 28px", fontSize: "0.82rem" }}
                  >
                    Explore Vault Creations
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: 14,
                      background: "#141414",
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      position: "relative",
                    }}
                  >
                    {/* Item Thumbnail */}
                    <div
                      style={{
                        width: 76,
                        height: 98,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#222",
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        closeCart();
                        navigate(`/assets/${item.asset.id}`);
                      }}
                    >
                      <img
                        src={item.asset.image_url || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b"}
                        alt={item.asset.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>

                    {/* Item Info */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                          <span
                            style={{
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              padding: "2px 8px",
                              borderRadius: 9999,
                              background: item.orderType === "rent" ? "rgba(201, 163, 74, 0.18)" : "rgba(255,255,255,0.1)",
                              color: item.orderType === "rent" ? "#C9A34A" : "#FFFFFF",
                              border: item.orderType === "rent" ? "1px solid rgba(201, 163, 74, 0.35)" : "1px solid rgba(255,255,255,0.2)",
                            }}
                          >
                            {item.orderType === "rent" ? `Rent (${item.rentalDays || 3} Days)` : "Buy to Own"}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "rgba(255, 255, 255, 0.4)",
                              cursor: "pointer",
                              padding: 2,
                              transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)")}
                            title="Remove"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <h4
                          onClick={() => {
                            closeCart();
                            navigate(`/assets/${item.asset.id}`);
                          }}
                          style={{
                            fontFamily: "var(--font-brand)",
                            fontSize: "0.9rem",
                            color: "#FFFFFF",
                            margin: "6px 0 2px",
                            cursor: "pointer",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.asset.name}
                        </h4>

                        <div style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.6)", marginTop: 2 }}>
                          <span>Size: <strong>{item.size}</strong></span>
                          {item.color && <span> • Shade: <strong>{item.color}</strong></span>}
                        </div>
                      </div>

                      {/* Quantity & Price */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: "#1E1E1E",
                            borderRadius: 6,
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            padding: "2px 4px",
                          }}
                        >
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#FFFFFF",
                              cursor: "pointer",
                              width: 22,
                              height: 22,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, minWidth: 20, textAlign: "center" }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#FFFFFF",
                              cursor: "pointer",
                              width: 22,
                              height: 22,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#C9A34A" }}>
                          {formatINR(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            {cartItems.length > 0 && (
              <div
                style={{
                  padding: "20px 24px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "#121212",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.7)" }}>Estimated Subtotal</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#C9A34A" }}>
                    {formatINR(cartTotal)}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={() => {
                      closeCart();
                      navigate("/checkout?fromCart=true");
                    }}
                    className="btn-rose-primary"
                    style={{
                      width: "100%",
                      padding: "13px",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span>Proceed to Atelier Checkout</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    onClick={() => {
                      closeCart();
                      navigate("/cart");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 8,
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#C9A34A";
                      e.currentTarget.style.color = "#C9A34A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                    }}
                  >
                    View Full Shopping Bag Page
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginTop: 12,
                    fontSize: "0.7rem",
                    color: "rgba(255, 255, 255, 0.45)",
                  }}
                >
                  <Shield size={13} color="#C9A34A" />
                  <span>Secure 256-Bit Encrypted Atelier Transaction</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}