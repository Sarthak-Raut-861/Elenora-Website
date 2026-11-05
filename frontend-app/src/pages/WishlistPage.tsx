import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Trash2, Calendar, ShoppingBag, Eye, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../wishlist-context";
import { useAuth } from "../auth-context";
import { AssetBookingModal } from "../components/AssetBookingModal";
import type { Asset } from "../types";

export function WishlistPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { wishlistItems, removeFromWishlist, clearWishlist } = useWishlist();
  const [selectedAssetForBooking, setSelectedAssetForBooking] = useState<Asset | null>(null);

  return (
    <div style={{ background: "#0B0B0B", minHeight: "100vh", padding: "40px 20px 80px", color: "#FFFFFF" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <button
            onClick={() => navigate("/assets")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#C9A34A",
              background: "transparent",
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} /> Return to Collection Vault
          </button>

          {wishlistItems.length > 0 && (
            <button
              onClick={clearWishlist}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "rgba(255, 255, 255, 0.6)",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: "0.78rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.borderColor = "rgba(248, 113, 113, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
              }}
            >
              <Trash2 size={13} /> Clear Wishlist
            </button>
          )}
        </div>

        {/* Title Section */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#C9A34A", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
            <Sparkles size={14} /> Haute Couture Curation
          </div>
          <h1 style={{ fontFamily: "var(--font-brand)", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 600, letterSpacing: "0.06em", margin: "0 0 10px 0" }}>
            YOUR ATELIER WISHLIST
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "0.95rem", maxWidth: 620, margin: "0 auto" }}>
            Save your favourite bespoke couture, occasion wear, and bridal ensembles to reserve or acquire when ready.
          </p>
        </div>

        {/* Wishlist Items Grid or Empty State */}
        {wishlistItems.length === 0 ? (
          <div
            style={{
              background: "#141414",
              border: "1px solid rgba(201, 163, 74, 0.2)",
              borderRadius: 20,
              padding: "70px 24px",
              textAlign: "center",
              maxWidth: 600,
              margin: "40px auto 0",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(201, 163, 74, 0.1)",
                border: "1.5px solid rgba(201, 163, 74, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: "#C9A34A",
              }}
            >
              <Heart size={32} />
            </div>
            <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.5rem", marginBottom: 12 }}>
              Your Atelier Wishlist is Empty
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
              Explore our vault of royal bridal lehengas, evening gowns, and ready-to-wear pieces. Click the heart icon on any outfit to save it here.
            </p>
            <button
              onClick={() => navigate("/assets")}
              className="btn-rose-primary"
              style={{ padding: "14px 32px", fontSize: "0.88rem", fontWeight: 700 }}
            >
              Explore Collection Vault
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 28,
            }}
          >
            <AnimatePresence>
              {wishlistItems.map((asset) => {
                const isBuyable = (asset.listing_type || "both") !== "rent";
                const isRentable = (asset.listing_type || "both") !== "buy";
                const buyPrice = asset.buy_price ? asset.buy_price.toLocaleString("en-IN") : "8,999";
                const rentPrice = asset.rental_price ? asset.rental_price.toLocaleString("en-IN") : "2,499";

                return (
                  <motion.div
                    key={asset.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      background: "#141414",
                      borderRadius: 16,
                      border: "1.5px solid rgba(201, 163, 74, 0.25)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
                      position: "relative",
                    }}
                  >
                    {/* Image Area */}
                    <div style={{ position: "relative", height: 360, background: "#181818" }}>
                      <img
                        src={asset.image_url || undefined}
                        alt={asset.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />

                      {/* Pill Badge */}
                      <div style={{ position: "absolute", top: 12, left: 12 }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            borderRadius: 9999,
                            background: "#C9A34A",
                            color: "#0B0B0B",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {asset.listing_type === "rent" ? "Rent Vault" : asset.listing_type === "buy" ? "Buy to Own" : "Rent | Buy"}
                        </span>
                      </div>

                      {/* Remove from Wishlist Button */}
                      <button
                        onClick={() => removeFromWishlist(asset.id)}
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(11, 11, 11, 0.8)",
                          border: "1px solid rgba(248, 113, 113, 0.4)",
                          color: "#f87171",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        title="Remove from Wishlist"
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(11, 11, 11, 0.8)")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>
                          {asset.asset_code.replace(/-\d+$/, "")}
                        </div>
                        <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.15rem", fontWeight: 600, color: "#FFFFFF", margin: "0 0 6px 0" }}>
                          {asset.name}
                        </h3>
                        <div style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.6)", marginBottom: 12 }}>
                          Sizes: {asset.sizes || "XS, S, M, L, XL"}
                        </div>
                      </div>

                      <div>
                        {/* Price Row */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            background: "#1C1C1C",
                            borderRadius: 10,
                            marginBottom: 14,
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                          }}
                        >
                          {isBuyable && (
                            <div>
                              <span style={{ fontSize: "0.65rem", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", display: "block" }}>
                                Buy Price
                              </span>
                              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}>
                                ₹{buyPrice}
                              </span>
                            </div>
                          )}

                          {isBuyable && isRentable && (
                            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />
                          )}

                          {isRentable && (
                            <div style={{ textAlign: isBuyable ? "right" : "left" }}>
                              <span style={{ fontSize: "0.65rem", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", display: "block" }}>
                                Rental Price
                              </span>
                              <span style={{ fontSize: "1.02rem", fontWeight: 800, color: "#C9A34A" }}>
                                ₹{rentPrice}<span style={{ fontSize: "0.72rem", fontWeight: 500 }}>/day</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 8 }}>
                          {isRentable && (
                            <button
                              onClick={() => setSelectedAssetForBooking(asset)}
                              className="btn-rose-primary"
                              style={{ flex: 1, padding: "9px 12px", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              <Calendar size={13} /> Rent
                            </button>
                          )}

                          {isBuyable && (
                            <button
                              onClick={() => {
                                const size = asset.sizes ? asset.sizes.split(",")[0].trim() : "M";
                                navigate(`/checkout?type=buy&assetId=${asset.id}&size=${encodeURIComponent(size)}`);
                              }}
                              className={isRentable ? "btn-gold-outline" : "btn-rose-primary"}
                              style={{ flex: 1, padding: "9px 12px", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              <ShoppingBag size={13} /> Buy
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/assets/${asset.id}`)}
                            style={{
                              padding: "9px 12px",
                              borderRadius: 8,
                              background: "rgba(255, 255, 255, 0.08)",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                              color: "#FFFFFF",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="View Garment Details"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Modal for Booking */}
        {selectedAssetForBooking && (
          <AssetBookingModal
            asset={selectedAssetForBooking}
            token={token}
            onClose={() => setSelectedAssetForBooking(null)}
            onBookingSuccess={() => {
              setSelectedAssetForBooking(null);
              navigate("/bookings");
            }}
          />
        )}

      </div>
    </div>
  );
}

