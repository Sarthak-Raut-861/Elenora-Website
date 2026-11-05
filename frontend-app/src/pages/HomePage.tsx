import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Heart,
  ChevronLeft,
  Pause,
  Play,
  ShoppingBag,
  Star,
  Check,
  Send,
  Eye,
  SlidersHorizontal,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth-context";
import { useWishlist } from "../wishlist-context";
import { AssetBookingModal } from "../components/AssetBookingModal";
import { BoutiqueAddressShowcase } from "../components/BoutiqueAddressShowcase";
import type { Asset } from "../types";
import { formatINR } from "../utils/currency";

// ── Hero Slides (Matching Rozina Editorial Standard) ──
const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1920&q=85",
    title: "New Arrivals",
    sub: "The Royal Bridal & Festive Couture Edit",
    cta: "SHOP NOW",
    to: "/assets",
  },
  {
    image: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1920&q=85",
    title: "The Rental Vault",
    sub: "Wear Multi-Lakh Designer Outfits For Your Special Occasions",
    cta: "EXPLORE RENTALS",
    to: "/assets?type=rent",
  },
  {
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1920&q=85",
    title: "Ready-To-Wear",
    sub: "Own Handcrafted Banarasi, Chikankari & Festive Heirlooms",
    cta: "BUY COLLECTION",
    to: "/assets?type=buy",
  },
];

// ── Shop The Look Ensemble Components (Rozina "Shop The Look") ──
const SHOP_THE_LOOK_ITEMS = [
  {
    id: "look-1",
    title: "Beige Tasseled Anarkali with Pista Green Koti",
    sku: "ANK-9201",
    rentalPrice: 2899,
    buyPrice: 34500,
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=700&q=80",
    desc: "Crushed silk flared anarkali paired with an artisanal hand-embroidered koti featuring gold gota patti and emerald beads.",
  },
  {
    id: "look-2",
    title: "Off-White Anarkali with Gold Silk Gota Koti",
    sku: "GOTA-410",
    rentalPrice: 3499,
    buyPrice: 42000,
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=700&q=80",
    desc: "Pure raw silk jacket embroidered with micro pearls and cut-dana work draped over an ethereal ivory kalidar.",
  },
  {
    id: "look-3",
    title: "Purple Velvet Embroidered Angarkha with Ruffled Dupatta",
    sku: "ANG-880",
    rentalPrice: 3199,
    buyPrice: 38000,
    image: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=700&q=80",
    desc: "Regal micro-velvet silhouette enriched with antique zardozi work and a dramatic tiered organza ruffle dupatta.",
  },
];

// ── Visual Categories ("Collections" on Rozina) ──
const EDITORIAL_COLLECTIONS = [
  {
    name: "Haute Couture Lehengas",
    subtitle: "Bridal & Sangeet Masterpieces",
    count: "50+ Vault Items",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=80",
    to: "/assets?category=Haute+Couture+Lehengas",
  },
  {
    name: "Saris & Draped Sets",
    subtitle: "Banarasi, Chiffon & Pre-Stitched",
    count: "35+ Vault Items",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
    to: "/assets?category=Royal+Banarasi+Sarees",
  },
  {
    name: "Designer Gowns & Long Tails",
    subtitle: "Red Carpet & Cocktail Statements",
    count: "28+ Vault Items",
    image: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=900&q=80",
    to: "/assets?category=Bridal+Gowns",
  },
  {
    name: "Heritage Sherwanis & Kurtas",
    subtitle: "Regal Raw Silk & Signature Zardozi",
    count: "40+ Vault Items",
    image: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=900&q=80",
    to: "/assets?category=Heritage+Sherwanis",
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [selectedAssetForBooking, setSelectedAssetForBooking] = useState<Asset | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("All");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [activeLookIndex, setActiveLookIndex] = useState(0);

  // Auto-advance hero slides
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const { data: rawAssets = [] } = useQuery({
    queryKey: ["home-assets"],
    queryFn: () => api.listAssets(token),
  });

  const assets = Array.isArray(rawAssets) ? rawAssets : [];

  // Group assets by piece name so duplicate physical units do not repeat on homepage
  const uniqueAssets = useMemo<Asset[]>(() => {
    const map = new Map<string, Asset>();
    for (const a of assets) {
      const key = `${a.name.toLowerCase().trim()}__${a.category_id}`;
      if (!map.has(key)) {
        map.set(key, a);
      } else if (a.status === 'available' && !a.is_in_dry_cleaning) {
        map.set(key, a);
      }
    }
    return Array.from(map.values());
  }, [assets]);

  const featuredAssets = uniqueAssets.filter((asset: any) => {
    if (activeCategoryFilter === "All") return true;
    if (activeCategoryFilter === "Rent Vault") return (asset.listing_type || "both") !== "buy";
    if (activeCategoryFilter === "Buy to Own") return (asset.listing_type || "both") !== "rent";
    return asset.name.toLowerCase().includes(activeCategoryFilter.toLowerCase());
  });

  const under40kAssets = uniqueAssets.filter((asset: any) => {
    const buy = asset.buy_price || 35000;
    return buy <= 40000;
  });

  const slide = HERO_SLIDES[currentSlide];
  const activeLook = SHOP_THE_LOOK_ITEMS[activeLookIndex];

  return (
    <div style={{ background: "#0B0B0B", color: "#FFFFFF", minHeight: "100vh" }}>

      {/* ── 1. ROZINA-INSPIRED FULL-BLEED EDITORIAL HERO SLIDER ─────────── */}
      <section
        style={{
          position: "relative",
          width: "100%",
          height: "clamp(540px, 80vh, 780px)",
          overflow: "hidden",
          background: "#0E0E0E",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0.25, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.25 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(to top, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.35) 45%, rgba(11,11,11,0.65) 100%), url('${slide.image}')`,
              backgroundSize: "cover",
              backgroundPosition: "center 30%",
            }}
          />
        </AnimatePresence>

        {/* Center Hero Overlay Content (Matching Rozina Typography) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 20px",
            zIndex: 10,
          }}
        >
          <motion.div
            key={`content-${currentSlide}`}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ maxWidth: 860 }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 32, height: 1, background: "linear-gradient(90deg, transparent, #C9A34A)" }} />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.76rem",
                  letterSpacing: "0.26em",
                  color: "#C9A34A",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                ELANORA ATELIER • AUTUMN / FESTIVE 2026
              </span>
              <span style={{ width: 32, height: 1, background: "linear-gradient(90deg, #C9A34A, transparent)" }} />
            </div>

            <h1
              className="gold-metallic-text"
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: "clamp(3rem, 6.5vw, 5.2rem)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                margin: "0 0 14px",
                lineHeight: 1.08,
                textTransform: "uppercase",
              }}
            >
              {slide.title}
            </h1>

            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(0.92rem, 1.6vw, 1.15rem)",
                color: "rgba(255, 255, 255, 0.88)",
                margin: "0 0 36px",
                letterSpacing: "0.06em",
                fontWeight: 400,
              }}
            >
              {slide.sub}
            </p>

            {/* Clean Translucent Glassmorphism Button (Rozina Standard) */}
            <div>
              <button
                onClick={() => navigate(slide.to)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "13px 44px",
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(14px)",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  borderRadius: "9999px",
                  color: "#FFFFFF",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#FFFFFF";
                  e.currentTarget.style.color = "#0B0B0B";
                  e.currentTarget.style.borderColor = "#FFFFFF";
                  e.currentTarget.style.boxShadow = "0 8px 30px rgba(255, 255, 255, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.color = "#FFFFFF";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
                }}
              >
                {slide.cta}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Bottom Slider Controls: < • ∘ ∘ > || (Exact Rozina Layout) */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            zIndex: 20,
            background: "rgba(18, 18, 18, 0.75)",
            backdropFilter: "blur(10px)",
            padding: "8px 20px",
            borderRadius: "9999px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          {/* Prev */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            style={{ background: "none", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center" }}
            title="Previous slide"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: currentSlide === idx ? 22 : 6,
                  height: 6,
                  borderRadius: 4,
                  background: currentSlide === idx ? "#C9A34A" : "rgba(255, 255, 255, 0.35)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
            style={{ background: "none", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center" }}
            title="Next slide"
          >
            <ChevronRight size={16} />
          </button>

          <span style={{ width: 1, height: 14, background: "rgba(255, 255, 255, 0.2)" }} />

          {/* Pause / Play */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ background: "none", border: "none", color: "#C9A34A", cursor: "pointer", display: "flex", alignItems: "center" }}
            title={isPlaying ? "Pause auto-slide" : "Play auto-slide"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      </section>

      {/* ── 2. NEW ARRIVALS (ROZINA 4-COLUMN PRODUCT GRID) ────────────────── */}
      <section style={{ padding: "64px 20px 48px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          
          {/* Section Header */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 600 }}>
              HAUTE COUTURE EDITORIAL
            </span>
            <h2
              className="gold-metallic-text"
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: "clamp(2rem, 4vw, 2.8rem)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                margin: "4px 0 16px",
                textTransform: "uppercase",
              }}
            >
              New Arrivals
            </h2>
            <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, #C9A34A, transparent)", margin: "0 auto 24px" }} />

            {/* Filter pills: All, Rent Vault, Buy to Own, Categories */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              {["All", "Rent Vault", "Buy to Own", "Lehenga", "Gown", "Kurta"].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setActiveCategoryFilter(pill)}
                  style={{
                    background: activeCategoryFilter === pill ? "#C9A34A" : "rgba(255, 255, 255, 0.05)",
                    color: activeCategoryFilter === pill ? "#0B0B0B" : "rgba(255, 255, 255, 0.75)",
                    border: activeCategoryFilter === pill ? "1px solid #C9A34A" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 9999,
                    padding: "7px 20px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* 4-Column Product Grid Matching Rozina Product Cards */}
          {featuredAssets.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 24px",
                background: "#141414",
                borderRadius: 14,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                maxWidth: 600,
                margin: "20px auto 40px",
              }}
            >
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
                Our atelier is currently tailoring new bespoke bridal and festive collections. Explore our upcoming drops shortly.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 28 }}>
              {featuredAssets.slice(0, 8).map((asset: Asset) => {
              const buyPrice = formatINR(asset.buy_price || 38000);
              const rentPrice = formatINR(asset.rental_price || 2899);
              const lType = asset.listing_type || "both";

              return (
                <motion.div
                  key={asset.id}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    background: "#121212",
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                  }}
                >
                  {/* Portrait Model Photo (3:4 Ratio, Edge to Edge) */}
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "3 / 4",
                      overflow: "hidden",
                      background: "#181818",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(`/assets/${asset.id}`)}
                  >
                    <img
                      src={asset.image_url ?? undefined}
                      alt={asset.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    />

                    {/* Section Badge (Rent vs Buy) */}
                    <div style={{ position: "absolute", top: 12, left: 12, zIndex: 5 }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "9999px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          background: lType === "rent" ? "#C9A34A" : "rgba(255, 255, 255, 0.95)",
                          color: "#0B0B0B",
                        }}
                      >
                        {lType === "rent" ? "Rent Vault" : lType === "buy" ? "Buy to Own" : "Rent | Buy"}
                      </span>
                    </div>

                    {/* Wishlist Heart */}
                    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(asset);
                        }}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: "rgba(11, 11, 11, 0.75)",
                          border: isInWishlist(asset.id) ? "1.5px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.2)",
                          color: isInWishlist(asset.id) ? "#C9A34A" : "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          boxShadow: isInWishlist(asset.id) ? "0 0 12px rgba(201, 163, 74, 0.4)" : "none",
                          transition: "all 0.2s ease",
                        }}
                        title={isInWishlist(asset.id) ? "Remove from Wishlist" : "Save to Wishlist"}
                      >
                        <Heart size={16} fill={isInWishlist(asset.id) ? "#C9A34A" : "none"} />
                      </button>
                    </div>
                  </div>

                  {/* Clean Rozina Product Details */}
                  <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontSize: "0.65rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 6 }}>
                        SKU: {asset.asset_code} • Haute Couture Archive
                      </span>

                      <h3
                        onClick={() => navigate(`/assets/${asset.id}`)}
                        style={{
                          fontFamily: "var(--font-brand)",
                          fontSize: "0.98rem",
                          color: "#FFFFFF",
                          fontWeight: 500,
                          lineHeight: 1.4,
                          margin: "0 0 12px",
                          cursor: "pointer",
                          minHeight: 40,
                        }}
                      >
                        {asset.name}
                      </h3>
                    </div>

                    <div>
                      {/* Price in Rozina Indian Luxury Format */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          paddingTop: 10,
                          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                          marginBottom: 14,
                        }}
                      >
                        {lType !== "rent" && (
                          <div>
                            <span style={{ fontSize: "0.66rem", color: "#888", display: "block" }}>Buy to Own</span>
                            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}>
                              {buyPrice}
                            </span>
                          </div>
                        )}

                        {lType !== "buy" && (
                          <div style={{ textAlign: lType === "both" ? "right" : "left" }}>
                            <span style={{ fontSize: "0.66rem", color: "#888", display: "block" }}>Rental Rate</span>
                            <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#C9A34A" }}>
                              {rentPrice}<span style={{ fontSize: "0.72rem", fontWeight: 500 }}>/day</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 8 }}>
                        {lType !== "buy" && (
                          <button
                            onClick={() => setSelectedAssetForBooking(asset)}
                            className="btn-rose-primary"
                            style={{ flex: 1, padding: "9px 12px", fontSize: "0.78rem", fontWeight: 700 }}
                          >
                            Rent Now
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/assets/${asset.id}`)}
                          className="btn-gold-outline"
                          style={{ flex: lType === "buy" ? 1 : undefined, padding: "9px 16px", fontSize: "0.78rem", fontWeight: 600 }}
                        >
                          {lType === "buy" ? "Buy Now" : "Details"}
                        </button>
                      </div>
                    </div>
                  </div>

                </motion.div>
              );
            })}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 44 }}>
            <button
              onClick={() => navigate("/assets")}
              className="btn-gold-outline"
              style={{ padding: "12px 38px", fontSize: "0.85rem", letterSpacing: "0.12em", textTransform: "uppercase" }}
            >
              View Full Collection Vault <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </section>

      {/* ── 4. THE HERITAGE EDIT (ROZINA FULL-WIDTH EDITORIAL BANNER) ────── */}
      <section style={{ padding: "64px 20px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          
          <div
            style={{
              position: "relative",
              borderRadius: 16,
              overflow: "hidden",
              minHeight: 460,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "60px 24px",
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.88) 100%), url('/royal-bridal-banner-wide.jpg')`,
              backgroundSize: "cover",
              backgroundPosition: "center 22%",
              border: "1px solid rgba(201,163,74,0.35)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.85)",
              marginBottom: 44,
            }}
          >
            <div style={{ maxWidth: 780, background: "rgba(11,11,11,0.55)", backdropFilter: "blur(6px)", padding: "36px 30px", borderRadius: 16, border: "1px solid rgba(201,163,74,0.25)" }}>
              <span style={{ fontSize: "0.74rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 700, display: "block", marginBottom: 12 }}>
                CURATED ATELIER ARCHIVE
              </span>
              <h2
                className="gold-metallic-text"
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  margin: "0 0 16px",
                  textTransform: "uppercase",
                }}
              >
                The Royal Bridal Collection
              </h2>
              <p style={{ fontSize: "1.02rem", color: "rgba(255,255,255,0.9)", lineHeight: 1.65, margin: "0 0 28px", maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
                Handcrafted velvet lehengas, heirloom zardozi embroidery, and molten gold accents designed for grand wedding ceremonies and timeless regal bridal celebrations.
              </p>
              <button
                onClick={() => navigate("/assets?category=Bridal+wear")}
                className="btn-rose-primary"
                style={{ padding: "13px 40px", fontSize: "0.85rem", letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                Explore Bridal Collection →
              </button>
            </div>
          </div>

          {/* 4 Featured Products From This Edit */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 28 }}>
            {[
              {
                title: "Burgundy Velvet Royal Palace Bridal Lehenga",
                sku: "BRL-101",
                buy: 58000,
                rent: 4499,
                img: "/royal-bridal-banner.jpg",
              },
              {
                title: "The Crimson Empress Zardozi Bridal Lehenga",
                sku: "BRL-102",
                buy: 52000,
                rent: 3899,
                img: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
              },
              {
                title: "Noor Ivory & Molten Gold Embroidered Bridal Ensemble",
                sku: "BRL-103",
                buy: 46500,
                rent: 3499,
                img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
              },
              {
                title: "Heritage Royal Rose Hand-Embroidered Bridal Set",
                sku: "BRL-104",
                buy: 49000,
                rent: 3699,
                img: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
              },
            ].map((p, idx) => (
              <div
                key={idx}
                style={{
                  background: "#121212",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ aspectRatio: "3 / 4", overflow: "hidden", cursor: "pointer" }} onClick={() => navigate(`/assets?search=${encodeURIComponent(p.title)}`)}>
                  <img src={p.img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "16px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "0.65rem", color: "#C9A34A", fontWeight: 700, letterSpacing: "0.12em" }}>SKU: {p.sku}</span>
                    <h4 style={{ fontFamily: "var(--font-brand)", fontSize: "0.95rem", color: "#FFFFFF", margin: "4px 0 10px", lineHeight: 1.4 }}>{p.title}</h4>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.64rem", color: "#888", display: "block" }}>Buy: {formatINR(p.buy)}</span>
                      <span style={{ fontSize: "0.95rem", color: "#C9A34A", fontWeight: 800 }}>Rent: {formatINR(p.rent)}/day</span>
                    </div>
                    <button onClick={() => navigate(`/assets?search=${encodeURIComponent(p.title)}`)} className="btn-gold-outline" style={{ padding: "6px 14px", fontSize: "0.72rem" }}>
                      Reserve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 5. SHOP THE LOOK (INTERACTIVE ROZINA EDITORIAL COMPONENT) ───── */}
      <section style={{ padding: "64px 20px", background: "#0D0D0D", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 600 }}>
              CURATED STYLING
            </span>
            <h2
              className="gold-metallic-text"
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: "clamp(2rem, 4vw, 2.8rem)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                margin: "4px 0 10px",
                textTransform: "uppercase",
              }}
            >
              Shop The Look
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>
              Complete Couture Ensembles Designed by Elanora's Master Drapers
            </p>
          </div>

          {/* Interactive Split Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 36, alignItems: "center" }}>
            
            {/* Left: Big Editorial Photo with Active Look */}
            <div
              style={{
                position: "relative",
                aspectRatio: "3 / 4",
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(201,163,74,0.3)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
              }}
            >
              <img
                src={activeLook.image}
                alt={activeLook.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: 28,
                }}
              >
                <span style={{ fontSize: "0.72rem", color: "#C9A34A", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700 }}>
                  RUNWAY SHOWCASE
                </span>
                <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.5rem", color: "#FFFFFF", margin: "4px 0 8px" }}>
                  {activeLook.title}
                </h3>
                <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#C9A34A" }}>
                    Rental: {formatINR(activeLook.rentalPrice)}/day
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#A3A3A3" }}>
                    Buy: {formatINR(activeLook.buyPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Selectable Ensemble Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {SHOP_THE_LOOK_ITEMS.map((item, idx) => {
                const isSelected = activeLookIndex === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveLookIndex(idx)}
                    style={{
                      display: "flex",
                      gap: 18,
                      padding: 16,
                      borderRadius: 12,
                      background: isSelected ? "rgba(201, 163, 74, 0.1)" : "#141414",
                      border: isSelected ? "1.5px solid #C9A34A" : "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      style={{ width: 84, height: 110, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.65rem", color: "#C9A34A", fontWeight: 700, letterSpacing: "0.1em" }}>
                            {item.sku}
                          </span>
                          {isSelected && (
                            <span style={{ fontSize: "0.62rem", background: "#C9A34A", color: "#0B0B0B", padding: "2px 8px", borderRadius: 9999, fontWeight: 700 }}>
                              VIEWING
                            </span>
                          )}
                        </div>
                        <h4 style={{ fontFamily: "var(--font-brand)", fontSize: "0.95rem", color: "#FFFFFF", margin: "0 0 6px", lineHeight: 1.3 }}>
                          {item.title}
                        </h4>
                        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.4 }}>
                          {item.desc}
                        </p>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#C9A34A" }}>
                          Rent {formatINR(item.rentalPrice)}/day
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/assets?search=${encodeURIComponent(item.title)}`);
                          }}
                          className="btn-rose-primary"
                          style={{ padding: "6px 14px", fontSize: "0.72rem" }}
                        >
                          Book Fitting →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </section>

      {/* ── 6. CURATED UNDER 40K (METICULOUSLY CRAFTED COUTURE) ──────────── */}
      <section style={{ padding: "64px 20px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
            <div>
              <span style={{ fontSize: "0.72rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 600 }}>
                ACCESSIBLE LUXURY
              </span>
              <h2
                className="gold-metallic-text"
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "clamp(2rem, 4vw, 2.8rem)",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  margin: "4px 0 0",
                  textTransform: "uppercase",
                }}
              >
                Couture Under ₹40,000
              </h2>
            </div>
            <Link
              to="/assets"
              style={{
                fontSize: "0.82rem",
                color: "#C9A34A",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
                letterSpacing: "0.08em",
              }}
            >
              Explore Price Vault <ArrowRight size={15} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 28 }}>
            {[
              {
                title: "Peach Net Jacket with Zari Sequin Embroidery & Skirt",
                sku: "JKT-420",
                buy: 34500,
                rent: 2499,
                img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
              },
              {
                title: "Grey Sequin Jacket with Tasseled Lace & Printed Palazzo",
                sku: "PAL-881",
                buy: 28000,
                rent: 2199,
                img: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",
              },
              {
                title: "Beige Net Sari with Appliqué Border & Resham Blouse",
                sku: "SRI-290",
                buy: 32000,
                rent: 2399,
                img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
              },
              {
                title: "Shimmer Draped Sari with Hand-Embroidered Beaded Blouse",
                sku: "SHM-602",
                buy: 38500,
                rent: 2899,
                img: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "#121212",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ aspectRatio: "3 / 4", overflow: "hidden", cursor: "pointer" }} onClick={() => navigate(`/assets?search=${encodeURIComponent(item.title)}`)}>
                  <img src={item.img} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "16px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "0.65rem", color: "#C9A34A", fontWeight: 700, letterSpacing: "0.12em" }}>SKU: {item.sku}</span>
                    <h4 style={{ fontFamily: "var(--font-brand)", fontSize: "0.95rem", color: "#FFFFFF", margin: "4px 0 10px", lineHeight: 1.4 }}>{item.title}</h4>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.64rem", color: "#888", display: "block" }}>Buy: {formatINR(item.buy)}</span>
                      <span style={{ fontSize: "0.95rem", color: "#C9A34A", fontWeight: 800 }}>Rent: {formatINR(item.rent)}/day</span>
                    </div>
                    <button onClick={() => navigate(`/assets?search=${encodeURIComponent(item.title)}`)} className="btn-rose-primary" style={{ padding: "6px 14px", fontSize: "0.72rem" }}>
                      Rent Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 7. EDITORIAL COLLECTIONS (EXACT MATCHING ROZINA "COLLECTIONS") ─── */}
      <section style={{ padding: "64px 20px", background: "#0E0E0E", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 600 }}>
              CURATED CATEGORIES
            </span>
            <h2
              className="gold-metallic-text"
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: "clamp(2rem, 4vw, 2.8rem)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                margin: "4px 0 10px",
                textTransform: "uppercase",
              }}
            >
              Collections
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.92rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>
              Discover Handcrafted Silhouettes For Every Royal Occasion
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {EDITORIAL_COLLECTIONS.map((col, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                onClick={() => navigate(col.to)}
                style={{
                  position: "relative",
                  borderRadius: 12,
                  overflow: "hidden",
                  aspectRatio: "3 / 4",
                  background: "#181818",
                  cursor: "pointer",
                  border: "1px solid rgba(201,163,74,0.25)",
                  boxShadow: "0 14px 40px rgba(0,0,0,0.7)",
                }}
              >
                <img
                  src={col.image}
                  alt={col.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, transparent 80%)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: 24,
                  }}
                >
                  <span style={{ fontSize: "0.68rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 4 }}>
                    {col.count}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.35rem", color: "#FFFFFF", margin: "0 0 4px", fontWeight: 600 }}>
                    {col.name}
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.75)", margin: "0 0 12px" }}>
                    {col.subtitle}
                  </p>
                  <span style={{ fontSize: "0.74rem", color: "#C9A34A", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                    Discover Collection →
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 8. SIGN-UP TO BE AN INSIDER (ROZINA NEWSLETTER CLUB) ─────────── */}
      <section style={{ padding: "80px 20px", background: "#0B0B0B", borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <img
            src="/elanora-emblem.png"
            alt="Elanora Monogram"
            style={{ width: 50, height: 50, objectFit: "contain", margin: "0 auto 16px", filter: "drop-shadow(0 0 12px rgba(201,163,74,0.4))" }}
          />
          <h2
            className="gold-metallic-text"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "clamp(2rem, 4vw, 2.6rem)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              margin: "0 0 12px",
              textTransform: "uppercase",
            }}
          >
            Sign-Up To Be An Insider
          </h2>
          <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "0 0 32px" }}>
            Join our private couture circle for exclusive preview access to new bridal arrivals, private rental slots, bespoke bridal fittings, and VIP invitations.
          </p>

          {newsletterSubscribed ? (
            <div style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid #22c55e", padding: "16px 24px", borderRadius: 9999, color: "#4ade80", fontSize: "0.9rem" }}>
              ✓ Welcome to the Elanora Couture Circle. We have sent your private welcome dossier.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newsletterEmail) setNewsletterSubscribed(true);
              }}
              style={{ display: "flex", gap: 10, maxWidth: 520, margin: "0 auto", flexWrap: "wrap" }}
            >
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 260,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 9999,
                  padding: "14px 24px",
                  color: "#FFFFFF",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                className="btn-rose-primary"
                style={{ padding: "14px 32px", fontSize: "0.82rem", letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── 9. FLAGSHIP PUNE BOUTIQUE SHOWCASE ───────────────────────────── */}
      <BoutiqueAddressShowcase />

      {/* ── 10. BOOKING MODAL (FOR IMMEDIATE RENTAL RESERVATIONS) ────────── */}
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
  );
}
