import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Crown,
  Calendar,
  Shield,
  Sparkles,
  Clock,
  CheckCircle2,
  Tag,
  AlertCircle,
  Heart,
  Share2,
  ShoppingBag,
  Truck,
  RotateCcw,
  Check,
  X,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth-context";
import { AssetBookingModal } from "../components/AssetBookingModal";
import type { Asset, ColorVariant } from "../types";

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [buyError, setBuyError] = useState("");

  const buyMutation = useMutation({
    mutationFn: () =>
      api.createBuyOrder(token!, {
        asset_id: asset!.id,
        size: selectedSize,
        color: selectedColor,
        shipping_address: shippingAddress || undefined,
        contact_phone: contactPhone || undefined,
      }),
    onSuccess: () => {
      setShowBuyModal(false);
      navigate("/bookings");
    },
    onError: (err: any) => {
      setBuyError(err?.message || "Failed to complete acquisition");
    },
  });

  const assetId = Number(id);

  const { data: asset, isLoading, error } = useQuery<Asset>({
    queryKey: ["asset", assetId],
    queryFn: () => api.getAsset(token, assetId),
    enabled: Boolean(assetId),
  });

  // Query sister units to calculate real-time piece stock
  const { data: rawAllAssets = [] } = useQuery<Asset[]>({
    queryKey: ["all-assets-inventory"],
    queryFn: () => api.listAssets(token),
  });

  const sisterUnits = useMemo(() => {
    if (!asset || !Array.isArray(rawAllAssets)) return [];
    return rawAllAssets.filter(
      (a) => a.name.toLowerCase().trim() === asset.name.toLowerCase().trim() && a.category_id === asset.category_id
    );
  }, [asset, rawAllAssets]);

  const availableUnits = useMemo(() => {
    return sisterUnits.filter((u) => u.status === "available" && !u.is_in_dry_cleaning && u.is_active);
  }, [sisterUnits]);

  const availableStock = sisterUnits.length > 0 ? availableUnits.length : (asset?.status === "available" && !asset.is_in_dry_cleaning ? 1 : 0);
  const totalStock = sisterUnits.length > 0 ? sisterUnits.length : 1;
  const isOutOfStock = availableStock === 0;

  // Gallery images parsing (multi-angle photography)
  const galleryImages: string[] = (() => {
    if ((asset as any)?.gallery_images) {
      try {
        const parsed = JSON.parse((asset as any).gallery_images);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    if (asset?.image_url) return [asset.image_url];
    return [];
  })();

  // Color variants parsing
  const variants: ColorVariant[] = (() => {
    if (asset?.color_variants) {
      try {
        const parsed = JSON.parse(asset.color_variants);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    const baseImg = galleryImages[0] || asset?.image_url || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80";
    return [
      { color: "Blush Rose", hex: "#C9A34A", image_url: baseImg },
      { color: "Champagne Gold", hex: "#C9A34A", image_url: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=800&q=80" },
      { color: "Midnight Noir", hex: "#1A1A1A", image_url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80" },
      { color: "Emerald Green", hex: "#046307", image_url: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80" },
    ];
  })();

  // Available sizes
  const sizes: string[] = (() => {
    if (asset?.sizes) {
      return asset.sizes.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return ["XS", "S", "M", "L", "XL"];
  })();

  const [selectedColor, setSelectedColor] = useState<string>("Blush Rose");
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [activeImage, setActiveImage] = useState<string>("");

  useEffect(() => {
    const initialImg = galleryImages[0] || variants[0]?.image_url || asset?.image_url || "";
    if (initialImg && !activeImage) {
      setActiveImage(initialImg);
    }
    if (variants.length > 0 && !selectedColor) {
      setSelectedColor(variants[0].color);
    }
    if (sizes.length > 0 && !selectedSize) {
      setSelectedSize(sizes[0]);
    }
  }, [asset, galleryImages.length]);

  const handleColorSelect = (v: ColorVariant) => {
    setSelectedColor(v.color);
    setActiveImage(v.image_url);
  };

  const handleAddToCart = () => {
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  if (isLoading) {
    return (
      <div style={{ background: "var(--color-bg-primary)", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#C9A34A", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div style={{ background: "var(--color-bg-primary)", minHeight: "80vh", padding: "60px 24px", textAlign: "center", color: "#fff" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", marginBottom: 12 }}>Garment Not Found</h2>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 24 }}>The piece you are looking for may have been archived or rented.</p>
        <button onClick={() => navigate("/assets")} className="btn-rose-primary">
          Return to Vault
        </button>
      </div>
    );
  }

  const isRentable = (asset.listing_type || "both") !== "buy";
  const isBuyable = (asset.listing_type || "both") !== "rent";
  const buyPrice = asset.buy_price ? asset.buy_price.toLocaleString("en-IN") : "8,999";
  const rentPrice = asset.rental_price ? asset.rental_price.toLocaleString("en-IN") : "2,499";

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", padding: "36px 16px 64px", color: "#FFFFFF" }}>
      <div className="page-container" style={{ maxWidth: 1180 }}>
        
        {/* Back navigation */}
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
            marginBottom: 28,
          }}
        >
          <ArrowLeft size={16} /> Back to Collection Vault
        </button>

        {/* Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 44, alignItems: "start" }}>
          
          {/* ── LEFT: Dynamic Image Showcase with Color Switching ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "#141414",
                borderRadius: 20,
                overflow: "hidden",
                border: "1.5px solid rgba(201, 163, 74, 0.25)",
                position: "relative",
                boxShadow: "0 16px 48px rgba(0,0,0,0.8), 0 0 30px rgba(201, 163, 74, 0.1)",
                height: 520,
              }}
            >
              {/* Dynamic Image with Crossfade Animation */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage || asset.image_url}
                  src={activeImage || asset.image_url || undefined}
                  alt={asset.name}
                  initial={{ opacity: 0.3, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.3 }}
                  transition={{ duration: 0.35 }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </AnimatePresence>

              {/* Listing Mode Pill */}
              <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10 }}>
                <span
                  style={{
                    padding: "5px 14px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    background: asset.listing_type === "rent" ? "#C9A34A" : asset.listing_type === "buy" ? "#C9A34A" : "#C9A34A",
                    color: "#0B0B0B",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  }}
                >
                  {asset.listing_type === "rent" ? "Rental Exclusive" : asset.listing_type === "buy" ? "Buy to Own" : "Buy | Rent"}
                </span>
              </div>

              {/* Action Buttons top right */}
              <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8, zIndex: 10 }}>
                <button
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(11,11,11,0.75)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#C9A34A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  title="Save to Wishlist"
                >
                  <Heart size={18} />
                </button>
                <button
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(11,11,11,0.75)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  title="Share Piece"
                >
                  <Share2 size={18} />
                </button>
              </div>

              {/* Dynamic Color Banner at bottom of image */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "linear-gradient(to top, rgba(11,11,11,0.95) 0%, transparent 100%)",
                  padding: "24px 20px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "0.78rem", color: "#C9A34A", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Selected Shade: {selectedColor}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#A3A3A3" }}>
                  Size {selectedSize} In Stock
                </span>
              </div>
            </div>

            {/* ── MULTI-ANGLE GALLERY THUMBNAILS (IF MULTIPLE PHOTOS PRESENT) ── */}
            {galleryImages.length > 1 && (
              <div>
                <p style={{ fontSize: "0.72rem", color: "#C9A34A", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Multi-Angle Couture Photography ({galleryImages.length} Views):
                </p>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(galleryImages.length, 6)}, 1fr)`, gap: 10 }}>
                  {galleryImages.map((img, idx) => {
                    const isCurrent = activeImage === img;
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveImage(img)}
                        style={{
                          position: "relative",
                          borderRadius: 10,
                          overflow: "hidden",
                          aspectRatio: "3/4",
                          border: isCurrent ? "2px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.12)",
                          cursor: "pointer",
                          background: "#181818",
                          boxShadow: isCurrent ? "0 0 14px rgba(201, 163, 74, 0.4)" : "none",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <img src={img} alt={`View ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", bottom: 2, right: 4, fontSize: "0.58rem", color: "#C9A34A", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                          #{idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── COLOR SHADE SWATCHES & DYNAMIC PREVIEW ── */}
            <div>
              <p style={{ fontSize: "0.72rem", color: "#C9A34A", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                Available Atelier Shades ({variants.length}):
              </p>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(variants.length, 5)}, 1fr)`, gap: 10 }}>
                {variants.map((v) => {
                  const isSelected = selectedColor === v.color;
                  return (
                    <div
                      key={v.color}
                      onClick={() => handleColorSelect(v)}
                      style={{
                        position: "relative",
                        borderRadius: 12,
                        overflow: "hidden",
                        border: isSelected ? "2px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.12)",
                        cursor: "pointer",
                        background: "#181818",
                        boxShadow: isSelected ? "0 0 16px rgba(201, 163, 74, 0.4)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {v.image_url ? (
                        <img
                          src={v.image_url}
                          alt={v.color}
                          style={{ width: "100%", height: 72, objectFit: "cover", display: "block" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: 72, background: v.hex, opacity: 0.8 }} />
                      )}
                      <div
                        style={{
                          padding: "6px 4px",
                          background: "#141414",
                          textAlign: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.hex, border: "1px solid rgba(255,255,255,0.4)" }} />
                        <span style={{ fontSize: "0.68rem", fontWeight: 600, color: isSelected ? "#C9A34A" : "#A3A3A3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {v.color}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Specifications & Interactive Actions ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <span style={{ fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 700 }}>
                AUTHENTIC COUTURE VAULT • {asset.asset_code}
              </span>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  marginTop: 6,
                  marginBottom: 10,
                }}
              >
                {asset.name}
              </h1>

              <p style={{ color: "var(--color-text-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
                {asset.description || "Exclusive couture piece crafted from hand-loomed textiles with gold zardozi embellishments. Complete with certified eco-sterilization."}
              </p>
            </div>

            {/* Price Box */}
            <div
              style={{
                background: "#181818",
                border: "1px solid rgba(201, 163, 74, 0.3)",
                borderRadius: 16,
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {isBuyable && (
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-faint)", textTransform: "uppercase", display: "block" }}>
                    Buy Price (Own Forever)
                  </span>
                  <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "#FFFFFF" }}>
                    ₹{buyPrice}
                  </span>
                </div>
              )}

              {isBuyable && isRentable && (
                <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.1)" }} />
              )}

              {isRentable && (
                <div style={{ textAlign: isBuyable ? "right" : "left" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-faint)", textTransform: "uppercase", display: "block" }}>
                    Rental Price (White-Glove)
                  </span>
                  <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#C9A34A" }}>
                    ₹{rentPrice}<span style={{ fontSize: "0.85rem", fontWeight: 500 }}>/day</span>
                  </span>
                </div>
              )}
            </div>

            {/* Interactive Color selector chips (changes image!) */}
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#C9A34A", display: "block", marginBottom: 10 }}>
                Select Color: <span style={{ color: "#C9A34A", fontWeight: 700 }}>{selectedColor}</span>
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {variants.map((v) => {
                  const isSelected = selectedColor === v.color;
                  return (
                    <button
                      key={v.color}
                      onClick={() => handleColorSelect(v)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 16px",
                        borderRadius: 9999,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        background: isSelected ? "rgba(201,163,74,0.18)" : "#181818",
                        border: isSelected ? "1.5px solid #C9A34A" : "1px solid rgba(255,255,255,0.1)",
                        color: isSelected ? "#C9A34A" : "#A3A3A3",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: v.hex, border: "1px solid rgba(255,255,255,0.3)" }} />
                      <span>{v.color}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size Selector (XS, S, M, L, XL) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#C9A34A" }}>
                  Select Size: <span style={{ color: "#FFFFFF" }}>{selectedSize}</span>
                </label>
                <span style={{ fontSize: "0.72rem", color: "#C9A34A", cursor: "pointer" }}>
                  Size & Fitting Guide
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {sizes.map((sz) => {
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        background: isSelected ? "#C9A34A" : "#181818",
                        border: isSelected ? "1.5px solid #C9A34A" : "1px solid rgba(255,255,255,0.12)",
                        color: isSelected ? "#0B0B0B" : "#FFFFFF",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 4px 14px rgba(201,163,74,0.35)" : "none",
                      }}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cart Toast Notification */}
            <AnimatePresence>
              {addedToCart && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    color: "#4ade80",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  <Check size={16} />
                  <span>Added {selectedColor} ({selectedSize}) to your luxury shopping bag!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stock Availability Indicator */}
            {isOutOfStock ? (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <AlertCircle size={18} />
                <span>Currently Out of Stock — All {totalStock} atelier units of this piece are reserved or in sanitization.</span>
              </div>
            ) : (
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  color: "#4ade80",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "8px",
                }}
              >
                <span>● In Stock: {availableStock} of {totalStock} units available for instant booking</span>
              </div>
            )}

            {/* Dual CTAs: Rent Now & Buy Now */}
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              {isRentable && (
                <button
                  onClick={() => {
                    if (!isOutOfStock) setShowBookingModal(true);
                  }}
                  disabled={isOutOfStock}
                  className="btn-rose-primary"
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    opacity: isOutOfStock ? 0.45 : 1,
                    cursor: isOutOfStock ? "not-allowed" : "pointer",
                  }}
                >
                  <Calendar size={18} /> {isOutOfStock ? "Out of Stock" : "Rent for Occasion"}
                </button>
              )}

              {isBuyable && (
                <button
                  onClick={() => {
                    if (isOutOfStock) return;
                    if (!token) {
                      navigate("/login", { state: { from: `/assets/${asset.id}` } });
                      return;
                    }
                    setBuyError("");
                    setShowBuyModal(true);
                  }}
                  disabled={isOutOfStock}
                  className={isRentable ? "btn-gold-outline" : "btn-rose-primary"}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    opacity: isOutOfStock ? 0.45 : 1,
                    cursor: isOutOfStock ? "not-allowed" : "pointer",
                  }}
                >
                  <ShoppingBag size={18} /> {isOutOfStock ? "Out of Stock" : "Buy to Own"}
                </button>
              )}
            </div>

            {/* Service & Fitting Highlights */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
                <Truck size={16} color="#C9A34A" />
                <span>Pan-India doorstep delivery & fitting assistance</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
                <Shield size={16} color="#C9A34A" />
                <span>7-Stage certified eco-sterilization before every shipment</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
                <RotateCcw size={16} color="#4ade80" />
                <span>100% refundable security deposit credited upon return</span>
              </div>
            </div>

          </div>

        </div>

                {/* Modal for Buy to Own (Direct Acquisition) */}
        <AnimatePresence>
          {showBuyModal && asset && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.85)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 950,
                padding: 20,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  background: "#141414",
                  border: "1.5px solid rgba(201, 163, 74, 0.4)",
                  borderRadius: 18,
                  maxWidth: 540,
                  width: "100%",
                  padding: "28px 32px",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 25px 70px rgba(0,0,0,0.9), 0 0 30px rgba(201,163,74,0.15)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#C9A34A", fontWeight: 700 }}>
                      Haute Couture Acquisition
                    </span>
                    <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.4rem", color: "#FFFFFF", margin: "4px 0 0 0" }}>
                      BUY TO OWN (PERMANENT WARDROBE)
                    </h2>
                  </div>
                  <button onClick={() => setShowBuyModal(false)} style={{ background: "none", border: "none", color: "#737373", cursor: "pointer", padding: 4 }}>
                    <X size={20} />
                  </button>
                </div>

                {buyError && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#EF4444", fontSize: "0.82rem", marginBottom: 16 }}>
                    {buyError}
                  </div>
                )}

                {/* Selected Piece Details */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 10, background: "#1E1E1E", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: 18 }}>
                  <img src={activeImage || asset.image_url || undefined} alt={asset.name} style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#FFFFFF" }}>{asset.name}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(201,163,74,0.15)", color: "#C9A34A", fontSize: "0.72rem", fontWeight: 600 }}>
                        Size: {selectedSize}
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: "0.72rem" }}>
                        Color: {selectedColor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(201, 163, 74, 0.06)", border: "1px solid rgba(201, 163, 74, 0.2)", marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#A3A3A3", marginBottom: 6 }}>
                    <span>Couture Acquisition Price:</span>
                    <span style={{ color: "#FFFFFF", fontWeight: 600 }}>₹{buyPrice}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#A3A3A3", marginBottom: 6 }}>
                    <span>Insured White-Glove Shipping:</span>
                    <span style={{ color: "#34D399", fontWeight: 600 }}>COMPLIMENTARY</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#A3A3A3", marginBottom: 8 }}>
                    <span>Security Deposit:</span>
                    <span style={{ color: "#34D399", fontWeight: 600 }}>₹0 (Permanent Ownership)</span>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: 700, color: "#C9A34A" }}>
                    <span>Total Investment:</span>
                    <span style={{ fontSize: "1.1rem" }}>₹{buyPrice}</span>
                  </div>
                </div>

                {/* Form Inputs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, display: "block", marginBottom: 6 }}>
                      Doorstep Delivery Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 402, Sea View Apartments, Worli, Mumbai - 400018"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "#1E1E1E",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.84rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, display: "block", marginBottom: 6 }}>
                      Contact Phone for Delivery
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "#1E1E1E",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.84rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowBuyModal(false)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#A3A3A3",
                      fontSize: "0.84rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => buyMutation.mutate()}
                    disabled={buyMutation.isPending}
                    style={{
                      padding: "10px 22px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #C9A34A 0%, #E6CA65 100%)",
                      border: "none",
                      color: "#0B0B0B",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      cursor: buyMutation.isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    {buyMutation.isPending ? "Processing..." : `Confirm Acquisition · Pay ₹${buyPrice}`}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* Modal for Rentals */}
        {showBookingModal && (
          <AssetBookingModal
            asset={asset}
            token={token}
            onClose={() => setShowBookingModal(false)}
            onBookingSuccess={() => {
              setShowBookingModal(false);
              navigate("/bookings");
            }}
          />
        )}

      </div>
    </div>
  );
}
