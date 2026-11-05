import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Sparkles,
  Calendar,
  Eye,
  Crown,
  ChevronRight,
  Shield,
  Layers,
  Heart,
  SlidersHorizontal,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth-context";
import { AssetBookingModal } from "../components/AssetBookingModal";
import type { Asset, Category } from "../types";

export function AssetsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlType = searchParams.get("type") || "all";
  const urlCategory = searchParams.get("category") || "all";

  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>(urlType);
  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory);
  const [selectedAssetForBooking, setSelectedAssetForBooking] = useState<Asset | null>(null);

  useEffect(() => {
    const t = searchParams.get("type");
    if (t && t !== selectedType) setSelectedType(t);
    const c = searchParams.get("category");
    if (c && c !== selectedCategory) setSelectedCategory(c);
  }, [searchParams]);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const newParams = new URLSearchParams(searchParams);
    if (type === "all") {
      newParams.delete("type");
    } else {
      newParams.set("type", type);
    }
    setSearchParams(newParams);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", cat);
    }
    setSearchParams(newParams);
  };

  const { data: rawCategories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.listCategories(token),
  });
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  const { data: rawAssets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: () => api.listAssets(token),
  });
  const assets = Array.isArray(rawAssets) ? rawAssets : [];

  // Filter assets by search, category, and Rent vs Buy section
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_code.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesCategory = true;
    if (selectedCategory !== "all") {
      const catObj = categories.find((c) => c.name.toLowerCase() === selectedCategory.toLowerCase());
      if (catObj) {
        matchesCategory = asset.category_id === catObj.id;
      } else {
        matchesCategory = asset.name.toLowerCase().includes(selectedCategory.toLowerCase());
      }
    }

    let matchesType = true;
    const lType = asset.listing_type || "both";
    if (selectedType === "rent") {
      matchesType = lType === "rent" || lType === "both";
    } else if (selectedType === "buy") {
      matchesType = lType === "buy" || lType === "both";
    }

    return matchesSearch && matchesCategory && matchesType;
  });

  // Group assets by piece name & category so that multiple physical units show as 1 clean product card
  const groupedProducts = useMemo(() => {
    const map = new Map<string, any>();
    for (const asset of filteredAssets) {
      const key = `${asset.name.trim().toLowerCase()}__${asset.category_id}`;
      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          name: asset.name,
          category_id: asset.category_id,
          primaryAsset: asset,
          units: [],
          availableUnits: [],
          availableStock: 0,
          totalStock: 0,
        });
      }
      const prod = map.get(key)!;
      prod.units.push(asset);
      prod.totalStock += 1;
      if (asset.status === "available" && !asset.is_in_dry_cleaning && asset.is_active) {
        prod.availableUnits.push(asset);
        prod.availableStock += 1;
      }
    }
    return Array.from(map.values());
  }, [filteredAssets]);

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", padding: "36px 16px 64px", color: "#FFFFFF" }}>
      <div className="page-container" style={{ maxWidth: 1260 }}>
        
        {/* Dynamic Header based on Section */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.72rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#C9A34A",
              fontWeight: 700,
            }}
          >
            {selectedType === "rent" ? "THE RENTAL VAULT • COUTURE FOR OCCASIONS" : selectedType === "buy" ? "READY-TO-WEAR BOUTIQUE • ACQUIRE & OWN" : "HAUTE COUTURE CATALOG & VAULT"}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              color: "#FFFFFF",
              fontWeight: 500,
              marginTop: 6,
            }}
          >
            {selectedType === "rent" ? "Designer Outfits for Special Occasions" : selectedType === "buy" ? "Own Your Favourite Designer Styles" : "Curated Bridal, Festive & Evening Wear"}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", maxWidth: 620, margin: "10px auto 0" }}>
            {selectedType === "rent"
              ? "Experience white-glove rental for 3, 5, or 7 days with custom hand-pressing and 100% refundable security deposit."
              : selectedType === "buy"
              ? "Handcrafted heirloom pieces, casual couture, and designer ensembles tailored for everyday elegance and permanent acquisition."
              : "Handpicked designer pieces preserved with certified dry care sterilization. Rent for celebrations or acquire permanently."}
          </p>
        </div>

        {/* ── DEDICATED RENT VS BUY SECTION SWITCHER (PILL TOGGLE) ── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#141414",
              padding: "5px",
              borderRadius: "9999px",
              border: "1.5px solid rgba(201, 163, 74, 0.3)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            <button
              onClick={() => handleTypeChange("all")}
              style={{
                padding: "10px 22px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                transition: "all 0.25s ease",
                background: selectedType === "all" ? "linear-gradient(135deg, #C9A34A 0%, #B38E37 100%)" : "transparent",
                color: selectedType === "all" ? "#0B0B0B" : "#A3A3A3",
                boxShadow: selectedType === "all" ? "0 4px 14px rgba(201, 163, 74, 0.35)" : "none",
              }}
            >
              ✨ All Collections ({assets.length})
            </button>

            <button
              onClick={() => handleTypeChange("rent")}
              style={{
                padding: "10px 24px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                transition: "all 0.25s ease",
                background: selectedType === "rent" ? "#C9A34A" : "transparent",
                color: selectedType === "rent" ? "#0B0B0B" : "#A3A3A3",
                boxShadow: selectedType === "rent" ? "0 4px 16px rgba(201, 163, 74, 0.4)" : "none",
              }}
            >
              👗 Rent Vault ({assets.filter((a) => (a.listing_type || "both") !== "buy").length})
            </button>

            <button
              onClick={() => handleTypeChange("buy")}
              style={{
                padding: "10px 24px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                transition: "all 0.25s ease",
                background: selectedType === "buy" ? "#C9A34A" : "transparent",
                color: selectedType === "buy" ? "#0B0B0B" : "#A3A3A3",
                boxShadow: selectedType === "buy" ? "0 4px 16px rgba(201, 163, 74, 0.4)" : "none",
              }}
            >
              🛍️ Buy to Own ({assets.filter((a) => (a.listing_type || "both") !== "rent").length})
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", flex: "1 1 300px", maxWidth: 460 }}>
            <Search
              size={17}
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#C9A34A" }}
            />
            <input
              type="text"
              placeholder={`Search ${selectedType === "rent" ? "rentals" : selectedType === "buy" ? "ready-to-wear" : "vault"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px 16px 11px 42px",
                background: "#1E1E1E",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "9999px",
                fontSize: "0.88rem",
                color: "#FFFFFF",
                outline: "none",
              }}
            />
          </div>

          {/* Category Chips Scroll */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", maxWidth: "100%", paddingBottom: 4 }}>
            <button
              onClick={() => handleCategoryChange("all")}
              style={{
                padding: "8px 16px",
                borderRadius: "9999px",
                fontSize: "0.78rem",
                fontWeight: 600,
                background: selectedCategory === "all" ? "rgba(201, 163, 74, 0.18)" : "#1E1E1E",
                color: selectedCategory === "all" ? "#C9A34A" : "#A3A3A3",
                border: selectedCategory === "all" ? "1.5px solid #C9A34A" : "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.name)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "9999px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  background: selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "rgba(201, 163, 74, 0.18)" : "#1E1E1E",
                  color: selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "#C9A34A" : "#A3A3A3",
                  border: selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "1.5px solid #C9A34A" : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#C9A34A", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>Curating couture vault...</p>
          </div>
        )}

        {/* Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 26 }}>
          {groupedProducts.map((prod: any) => {
            const asset = prod.primaryAsset;
            const isRentable = (asset.listing_type || "both") !== "buy";
            const isBuyable = (asset.listing_type || "both") !== "rent";
            const buyPrice = asset.buy_price ? asset.buy_price.toLocaleString("en-IN") : "8,999";
            const rentPrice = asset.rental_price ? asset.rental_price.toLocaleString("en-IN") : "2,499";
            const isOutOfStock = prod.availableStock === 0;
            const targetUnitForBooking = prod.availableUnits[0] || asset;

            return (
              <motion.div
                key={prod.groupKey}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className="card-elanora"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                  opacity: isOutOfStock ? 0.75 : 1,
                }}
              >
                {/* Product Photo */}
                <div style={{ position: "relative", height: 340, overflow: "hidden", background: "#111" }}>
                  <img
                    src={asset.image_url ?? undefined}
                    alt={prod.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />

                  {/* Section Badge */}
                  <div style={{ position: "absolute", top: 14, left: 14, zIndex: 5, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        borderRadius: "9999px",
                        background: asset.listing_type === "rent" ? "rgba(201, 163, 74, 0.9)" : asset.listing_type === "buy" ? "rgba(201, 163, 74, 0.9)" : "rgba(201, 163, 74, 0.9)",
                        color: "#0B0B0B",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {asset.listing_type === "rent" ? "Rent Vault" : asset.listing_type === "buy" ? "Buy to Own" : "Buy | Rent"}
                    </span>

                    {/* Dynamic Stock Indicator Badge */}
                    {isOutOfStock ? (
                      <span
                        style={{
                          padding: "3px 10px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          borderRadius: "9999px",
                          background: "rgba(239, 68, 68, 0.9)",
                          color: "#FFFFFF",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          display: "inline-block",
                        }}
                      >
                        ● Out of Stock
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "3px 10px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          borderRadius: "9999px",
                          background: "rgba(34, 197, 94, 0.9)",
                          color: "#000000",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          display: "inline-block",
                        }}
                      >
                        ● {prod.availableStock} in Stock
                      </span>
                    )}
                  </div>

                  {/* Wishlist Heart */}
                  <div style={{ position: "absolute", top: 14, right: 14, zIndex: 5 }}>
                    <button
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(11,11,11,0.7)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#C9A34A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Heart size={16} />
                    </button>
                  </div>
                </div>

                {/* Card Details */}
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "1.15rem",
                        color: "#FFFFFF",
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      {prod.name}
                    </h3>
                    <div style={{ fontSize: "0.72rem", color: "#C9A34A", marginBottom: 10, fontWeight: 600 }}>
                      Sizes: {asset.sizes || "XS, S, M, L, XL"}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
                      {asset.description ? asset.description.slice(0, 75) + "..." : "Exclusive couture piece tailored for celebrations."}
                    </p>
                  </div>

                  <div>
                    {/* Price Row: Responsive to Current Filter */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#1C1C1C",
                        borderRadius: "10px",
                        marginBottom: 16,
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {isBuyable && (
                        <div>
                          <span style={{ fontSize: "0.68rem", color: "var(--color-text-faint)", textTransform: "uppercase", display: "block" }}>
                            Buy Price
                          </span>
                          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}>
                            ₹{buyPrice}
                          </span>
                        </div>
                      )}

                      {isBuyable && isRentable && (
                        <div style={{ width: 1, height: 26, background: "rgba(255,255,255,0.1)" }} />
                      )}

                      {isRentable && (
                        <div style={{ textAlign: isBuyable ? "right" : "left" }}>
                          <span style={{ fontSize: "0.68rem", color: "var(--color-text-faint)", textTransform: "uppercase", display: "block" }}>
                            Rental Price
                          </span>
                          <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#C9A34A" }}>
                            ₹{rentPrice}<span style={{ fontSize: "0.75rem", fontWeight: 500 }}>/day</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: 10 }}>
                      {isRentable && (
                        <button
                          onClick={() => {
                            if (!isOutOfStock) {
                              setSelectedAssetForBooking(targetUnitForBooking);
                            } else {
                              alert("This couture piece is currently out of stock for rentals.");
                            }
                          }}
                          disabled={isOutOfStock}
                          className="btn-rose-primary"
                          style={{
                            flex: 1,
                            padding: "10px 14px",
                            fontSize: "0.82rem",
                            opacity: isOutOfStock ? 0.5 : 1,
                            cursor: isOutOfStock ? "not-allowed" : "pointer",
                          }}
                        >
                          {isOutOfStock ? "Out of Stock" : "Rent Now"}
                        </button>
                      )}

                      {isBuyable && !isRentable && (
                        <button
                          onClick={() => navigate(`/assets/${asset.id}`)}
                          className="btn-rose-primary"
                          style={{ flex: 1, padding: "10px 14px", fontSize: "0.82rem" }}
                        >
                          {isOutOfStock ? "Out of Stock" : "Buy Now"}
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/assets/${asset.id}`)}
                        className="btn-gold-outline"
                        style={{ padding: "10px 16px", fontSize: "0.82rem" }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Modal */}
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
