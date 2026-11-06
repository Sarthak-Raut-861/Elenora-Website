import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  Percent,
  Tag,
  CheckCircle2,
  Trash2,
  Edit2,
  ShieldCheck,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  TrendingDown,
  X,
} from "lucide-react";
import { api } from "../../api";
import { useAuth } from "../../auth-context";
import { formatINR } from "../../utils/currency";
import type { Offer, OfferCreatePayload, Category, Asset } from "../../types";

export function AdminOffersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"sitewide" | "category" | "asset">("sitewide");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [assetId, setAssetId] = useState<number | null>(null);
  const [applyTo, setApplyTo] = useState<"both" | "buy" | "rent">("both");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount" | "custom_price">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [customBuyPrice, setCustomBuyPrice] = useState<number | "">("");
  const [customRentalPrice, setCustomRentalPrice] = useState<number | "">("");
  const [badgeText, setBadgeText] = useState("SPECIAL OFFER");
  const [isActive, setIsActive] = useState(true);

  // Query all offers
  const { data: offers = [], isLoading } = useQuery<Offer[]>({
    queryKey: ["admin-offers", token],
    queryFn: () => api.listOffers(token || undefined, true),
    enabled: Boolean(token),
  });

  // Query categories for dropdown
  const { data: rawCategories = [] } = useQuery<Category[]>({
    queryKey: ["admin-categories", token],
    queryFn: () => api.listCategories(token ?? null),
    enabled: Boolean(token),
  });
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  // Query assets for dropdown
  const { data: rawAssets = [] } = useQuery<Asset[]>({
    queryKey: ["admin-assets", token],
    queryFn: () => api.listAssets(token ?? null),
    enabled: Boolean(token),
  });
  const assets = Array.isArray(rawAssets) ? rawAssets : [];

  // Stats
  const activeOffersCount = useMemo(() => offers.filter((o) => o.is_active).length, [offers]);

  const maxDiscountPct = useMemo(() => {
    const activePcts = offers
      .filter((o) => o.is_active && o.discount_type === "percentage")
      .map((o) => o.discount_value);
    return activePcts.length > 0 ? Math.max(...activePcts) : 0;
  }, [offers]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: OfferCreatePayload) => api.createOffer(payload, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["public-active-offers"] });
      closeModal();
    },
    onError: (err: any) => {
      alert(`Failed to save offer: ${err.message || "Unknown error"}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<OfferCreatePayload> }) =>
      api.updateOffer(id, payload, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["public-active-offers"] });
      closeModal();
    },
    onError: (err: any) => {
      alert(`Failed to update offer: ${err.message || "Unknown error"}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteOffer(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["public-active-offers"] });
    },
    onError: (err: any) => {
      alert(`Failed to delete offer: ${err.message || "Unknown error"}`);
    },
  });

  const openCreateModal = () => {
    setEditingOffer(null);
    setTitle("Royal Festive Special Offer");
    setDescription("Exclusive promotional discount on boutique collection");
    setScope("sitewide");
    setCategoryId(categories[0]?.id || null);
    setAssetId(assets[0]?.id || null);
    setApplyTo("both");
    setDiscountType("percentage");
    setDiscountValue(20);
    setCustomBuyPrice("");
    setCustomRentalPrice("");
    setBadgeText("FESTIVE 20% OFF");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setTitle(offer.title);
    setDescription(offer.description || "");
    setScope(offer.scope);
    setCategoryId(offer.category_id || (categories[0]?.id || null));
    setAssetId(offer.asset_id || (assets[0]?.id || null));
    setApplyTo(offer.apply_to as any);
    setDiscountType(offer.discount_type as any);
    setDiscountValue(offer.discount_value);
    setCustomBuyPrice(offer.custom_buy_price ?? "");
    setCustomRentalPrice(offer.custom_rental_price ?? "");
    setBadgeText(offer.badge_text);
    setIsActive(offer.is_active);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingOffer(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please provide an offer title");
      return;
    }

    const payload: OfferCreatePayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      scope,
      category_id: scope === "category" ? categoryId : null,
      asset_id: scope === "asset" ? assetId : null,
      apply_to: applyTo,
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      custom_buy_price: customBuyPrice !== "" ? Number(customBuyPrice) : null,
      custom_rental_price: customRentalPrice !== "" ? Number(customRentalPrice) : null,
      badge_text: badgeText.trim() || "SPECIAL OFFER",
      is_active: isActive,
    };

    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleOfferStatus = (offer: Offer) => {
    updateMutation.mutate({
      id: offer.id,
      payload: { is_active: !offer.is_active },
    });
  };

  const handleDelete = (offer: Offer) => {
    if (confirm(`Are you sure you want to delete the offer "${offer.title}"? Your products and assets will remain completely safe and untouched.`)) {
      deleteMutation.mutate(offer.id);
    }
  };

  return (
    <div style={{ padding: "32px 28px 80px", maxWidth: 1300, margin: "0 auto", color: "#FFFFFF" }}>
      
      {/* ── TOP HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "0.74rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 700 }}>
              SPECIAL PROMOTIONS CONSOLE
            </span>
            <span style={{ background: "rgba(201,163,74,0.15)", border: "1px solid rgba(201,163,74,0.35)", padding: "2px 8px", borderRadius: 9999, fontSize: "0.68rem", color: "#C9A34A", fontWeight: 700 }}>
              STRIKETHROUGH PRICING
            </span>
          </div>

          <h1
            className="gold-metallic-text"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Special Offers & Discounts
          </h1>
          <p style={{ fontSize: "0.88rem", color: "rgba(255, 255, 255, 0.65)", margin: "6px 0 0" }}>
            Configure limited-time special offer prices. When applied, the website strikes through the current price and highlights the special offer price without changing your stock records.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-rose-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 6px 20px rgba(201,163,74,0.3)",
          }}
        >
          <Plus size={18} />
          <span>Create New Offer</span>
        </button>
      </div>

      {/* ── STATS CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }}>
        
        {/* Card 1: Active Offers */}
        <div style={{ background: "#141414", border: "1px solid rgba(201,163,74,0.25)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.72rem", color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
              Live Active Offers
            </span>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: activeOffersCount > 0 ? "#4ade80" : "#666", boxShadow: activeOffersCount > 0 ? "0 0 10px #4ade80" : "none" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#C9A34A" }}>
              {activeOffersCount}
            </span>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              of {offers.length} configured
            </span>
          </div>
          <span style={{ fontSize: "0.74rem", color: activeOffersCount > 0 ? "#4ade80" : "#A3A3A3", marginTop: 4, display: "block" }}>
            {activeOffersCount > 0 ? "✓ Actively displayed on client website" : "All offers paused / standard prices active"}
          </span>
        </div>

        {/* Card 2: Highest Discount */}
        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.72rem", color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
              Peak Active Savings
            </span>
            <Percent size={18} color="#C9A34A" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#FFFFFF" }}>
              {maxDiscountPct > 0 ? `${maxDiscountPct}%` : "Custom"}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#C9A34A", fontWeight: 600 }}>
              Off Retail
            </span>
          </div>
          <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.5)", marginTop: 4, display: "block" }}>
            Maximum client incentive currently live
          </span>
        </div>

        {/* Card 3: Stock Integrity Guarantee */}
        <div style={{ background: "#141414", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.72rem", color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
              Stock Protection
            </span>
            <ShieldCheck size={18} color="#4ade80" />
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFFFFF", marginBottom: 4 }}>
            100% Non-Destructive
          </div>
          <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.4, display: "block" }}>
            Stock counts, base retail prices, and rental catalogs remain fully protected and unaltered in your database.
          </span>
        </div>

      </div>

      {/* ── LIVE PREVIEW BANNER (HOW IT APPEARS ON THE SITE) ── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(20,20,20,0.95), rgba(11,11,11,0.98))",
          border: "1.5px solid rgba(201,163,74,0.35)",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 36,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(201,163,74,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={22} color="#C9A34A" />
          </div>
          <div>
            <span style={{ fontSize: "0.7rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, display: "block" }}>
              Live Website Price Format Example
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
              <div>
                <span style={{ fontSize: "0.68rem", color: "#888", display: "block" }}>Buy to Own</span>
                <span style={{ fontSize: "0.88rem", textDecoration: "line-through", color: "#888", marginRight: 8 }}>
                  ₹58,000
                </span>
                <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#C9A34A" }}>
                  ₹44,999
                </span>
              </div>
              <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.1)" }} />
              <div>
                <span style={{ fontSize: "0.68rem", color: "#888", display: "block" }}>Rental Rate</span>
                <span style={{ fontSize: "0.88rem", textDecoration: "line-through", color: "#888", marginRight: 8 }}>
                  ₹4,499
                </span>
                <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#C9A34A" }}>
                  ₹3,499<span style={{ fontSize: "0.75rem", fontWeight: 500 }}>/day</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{ background: "linear-gradient(135deg, #ECC880, #C9A34A)", color: "#0B0B0B", padding: "4px 12px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            ✨ SPECIAL OFFER BADGE
          </span>
          <span style={{ display: "block", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
            Automatically attached to products matching your active rules
          </span>
        </div>
      </div>

      {/* ── OFFERS LIST ── */}
      <div style={{ background: "#121212", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.15rem", color: "#FFFFFF", margin: 0, fontWeight: 600 }}>
            Configured Promotional Offers ({offers.length})
          </h3>
          <span style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.5)" }}>
            Toggle status with 1-click to apply or pause immediately
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
            Loading special offers...
          </div>
        ) : offers.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <Sparkles size={40} color="#C9A34A" style={{ margin: "0 auto 16px", opacity: 0.6 }} />
            <h4 style={{ fontSize: "1.1rem", color: "#FFFFFF", marginBottom: 6 }}>No Special Offers Configured</h4>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", maxWidth: 480, margin: "0 auto 20px" }}>
              Create your first promotional offer rule. You can offer sitewide discounts, category savings (e.g. Bridal Wear), or special prices on individual pieces.
            </p>
            <button onClick={openCreateModal} className="btn-rose-primary" style={{ padding: "10px 22px", fontSize: "0.82rem" }}>
              + Create First Offer
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {offers.map((offer) => {
              const isLive = offer.is_active;
              return (
                <div
                  key={offer.id}
                  style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 16,
                    background: isLive ? "rgba(201,163,74,0.04)" : "transparent",
                    transition: "background 0.2s",
                  }}
                >
                  {/* Left: Badge & Title */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 280 }}>
                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: isLive ? "linear-gradient(135deg, #ECC880, #C9A34A)" : "#222",
                        color: isLive ? "#0B0B0B" : "#888",
                        fontWeight: 800,
                        fontSize: "0.7rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {offer.badge_text}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h4 style={{ fontFamily: "var(--font-brand)", fontSize: "1.05rem", color: "#FFFFFF", margin: 0, fontWeight: 600 }}>
                          {offer.title}
                        </h4>
                        {isLive && (
                          <span style={{ fontSize: "0.62rem", background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", padding: "2px 8px", borderRadius: 9999, fontWeight: 700 }}>
                            LIVE ON WEBSITE
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", margin: "4px 0 6px" }}>
                        {offer.description || "Promotional price adjustment active across boutique."}
                      </p>
                      
                      {/* Meta Tags */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "0.68rem", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4, color: "#C9A34A" }}>
                          Scope: {offer.scope === "sitewide" ? "All Creations (Sitewide)" : offer.scope === "category" ? `Category: ${offer.category_name || "Assigned"}` : `Product: ${offer.asset_name || "Assigned"}`}
                        </span>
                        <span style={{ fontSize: "0.68rem", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4, color: "rgba(255,255,255,0.7)" }}>
                          Applies to: {offer.apply_to === "both" ? "Buy & Rent" : offer.apply_to === "buy" ? "Buy Price Only" : "Rental Price Only"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Discount Value */}
                  <div style={{ textAlign: "center", minWidth: 140 }}>
                    <span style={{ fontSize: "0.66rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>
                      Savings Tier
                    </span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#C9A34A" }}>
                      {offer.discount_type === "percentage"
                        ? `${offer.discount_value}% OFF`
                        : offer.discount_type === "fixed_amount"
                        ? `₹${offer.discount_value.toLocaleString("en-IN")} FLAT OFF`
                        : "CUSTOM PRICE"}
                    </span>
                    {offer.discount_type === "custom_price" && (
                      <span style={{ fontSize: "0.72rem", color: "#A3A3A3", display: "block" }}>
                        {offer.custom_buy_price ? `Buy: ₹${offer.custom_buy_price.toLocaleString("en-IN")}` : ""} {offer.custom_rental_price ? `Rent: ₹${offer.custom_rental_price.toLocaleString("en-IN")}/day` : ""}
                      </span>
                    )}
                  </div>

                  {/* Right: Toggle Switch & Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Toggle Button */}
                    <button
                      onClick={() => toggleOfferStatus(offer)}
                      style={{
                        padding: "8px 18px",
                        borderRadius: 9999,
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: isLive ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.05)",
                        border: isLive ? "1px solid #22c55e" : "1px solid rgba(255, 255, 255, 0.15)",
                        color: isLive ? "#4ade80" : "#888",
                        transition: "all 0.2s",
                      }}
                      title={isLive ? "Click to Pause Offer" : "Click to Apply Offer on Website"}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: isLive ? "#4ade80" : "#666" }} />
                      <span>{isLive ? "Applied (Active) ✓" : "Inactive (Paused)"}</span>
                    </button>

                    <button
                      onClick={() => openEditModal(offer)}
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.14)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: "#FFFFFF",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.78rem",
                      }}
                      title="Edit Offer"
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(offer)}
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: "#ef4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.78rem",
                      }}
                      title="Delete Offer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT OFFER MODAL ── */}
      <AnimatePresence>
        {modalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)",
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: "#141414",
                border: "1.5px solid rgba(201,163,74,0.4)",
                borderRadius: 16,
                maxWidth: 620,
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(201,163,74,0.15)",
                padding: "28px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#C9A34A", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    PROMOTIONAL OFFER BUILDER
                  </span>
                  <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.35rem", color: "#FFFFFF", margin: "2px 0 0" }}>
                    {editingOffer ? "Edit Special Offer" : "Create New Special Offer"}
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                
                {/* Offer Title */}
                <div>
                  <label style={{ fontSize: "0.76rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Offer Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Royal Diwali Festive Edit"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#1B1B1B",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: "#FFFFFF",
                      fontSize: "0.88rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Badge Text */}
                <div>
                  <label style={{ fontSize: "0.76rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Promotional Badge Text (Shown on Product Card) *
                  </label>
                  <input
                    type="text"
                    required
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="e.g. FESTIVE 20% OFF or SPECIAL OFFER"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#1B1B1B",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: "#FFFFFF",
                      fontSize: "0.88rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Scope Selection */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { id: "sitewide", label: "Sitewide (All)" },
                    { id: "category", label: "By Category" },
                    { id: "asset", label: "Specific Product" },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setScope(s.id as any)}
                      style={{
                        padding: "10px",
                        borderRadius: 8,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        background: scope === s.id ? "rgba(201,163,74,0.2)" : "#1B1B1B",
                        border: scope === s.id ? "1.5px solid #C9A34A" : "1px solid rgba(255,255,255,0.1)",
                        color: scope === s.id ? "#C9A34A" : "rgba(255,255,255,0.7)",
                        textAlign: "center",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Category Dropdown (if scope === category) */}
                {scope === "category" && (
                  <div>
                    <label style={{ fontSize: "0.76rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Select Category
                    </label>
                    <select
                      value={categoryId || ""}
                      onChange={(e) => setCategoryId(Number(e.target.value))}
                      style={{
                        width: "100%",
                        background: "#1B1B1B",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        color: "#FFFFFF",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Specific Asset Dropdown (if scope === asset) */}
                {scope === "asset" && (
                  <div>
                    <label style={{ fontSize: "0.76rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Select Product from Stock
                    </label>
                    <select
                      value={assetId || ""}
                      onChange={(e) => setAssetId(Number(e.target.value))}
                      style={{
                        width: "100%",
                        background: "#1B1B1B",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        color: "#FFFFFF",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    >
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.asset_code}) · Retail: {formatINR(a.buy_price || 0)} · Rent: {formatINR(a.rental_price || 0)}/day
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Applies to Buy / Rent / Both */}
                <div>
                  <label style={{ fontSize: "0.76rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Applies Price Discount To
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { id: "both", label: "Both (Buy & Rent)" },
                      { id: "buy", label: "Buy Price Only" },
                      { id: "rent", label: "Rental Rate Only" },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setApplyTo(opt.id as any)}
                        style={{
                          padding: "8px",
                          borderRadius: 8,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          background: applyTo === opt.id ? "rgba(201,163,74,0.2)" : "#1B1B1B",
                          border: applyTo === opt.id ? "1.5px solid #C9A34A" : "1px solid rgba(255,255,255,0.1)",
                          color: applyTo === opt.id ? "#C9A34A" : "rgba(255,255,255,0.7)",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount Calculation Type */}
                <div>
                  <label style={{ fontSize: "0.76rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Discount Calculation Method
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                    {[
                      { id: "percentage", label: "Percentage (%) Off" },
                      { id: "fixed_amount", label: "Flat Rupee (₹) Off" },
                      { id: "custom_price", label: "Custom Offer Price" },
                    ].map((dt) => (
                      <button
                        type="button"
                        key={dt.id}
                        onClick={() => setDiscountType(dt.id as any)}
                        style={{
                          padding: "8px",
                          borderRadius: 8,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          background: discountType === dt.id ? "rgba(201,163,74,0.2)" : "#1B1B1B",
                          border: discountType === dt.id ? "1.5px solid #C9A34A" : "1px solid rgba(255,255,255,0.1)",
                          color: discountType === dt.id ? "#C9A34A" : "rgba(255,255,255,0.7)",
                        }}
                      >
                        {dt.label}
                      </button>
                    ))}
                  </div>

                  {discountType === "percentage" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.75rem", color: "#A3A3A3" }}>Discount Percentage:</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#C9A34A" }}>{discountValue}% OFF</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="70"
                        step="5"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "#C9A34A" }}
                      />
                    </div>
                  )}

                  {discountType === "fixed_amount" && (
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#A3A3A3", display: "block", marginBottom: 4 }}>
                        Flat Discount Amount (₹):
                      </span>
                      <input
                        type="number"
                        min="100"
                        step="100"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        placeholder="e.g. 5000"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          background: "#1B1B1B",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "10px 14px",
                          color: "#FFFFFF",
                          fontSize: "0.88rem",
                          outline: "none",
                        }}
                      />
                    </div>
                  )}

                  {discountType === "custom_price" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "#A3A3A3", display: "block", marginBottom: 4 }}>
                          Special Buy Price (₹):
                        </span>
                        <input
                          type="number"
                          value={customBuyPrice}
                          onChange={(e) => setCustomBuyPrice(e.target.value ? Number(e.target.value) : "")}
                          placeholder="e.g. 34999"
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            background: "#1B1B1B",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 8,
                            padding: "10px 14px",
                            color: "#FFFFFF",
                            fontSize: "0.88rem",
                            outline: "none",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "#A3A3A3", display: "block", marginBottom: 4 }}>
                          Special Rent Rate (₹/day):
                        </span>
                        <input
                          type="number"
                          value={customRentalPrice}
                          onChange={(e) => setCustomRentalPrice(e.target.value ? Number(e.target.value) : "")}
                          placeholder="e.g. 2499"
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            background: "#1B1B1B",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 8,
                            padding: "10px 14px",
                            color: "#FFFFFF",
                            fontSize: "0.88rem",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Checkbox */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: 8 }}>
                  <input
                    type="checkbox"
                    id="is_active_toggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "#C9A34A", cursor: "pointer" }}
                  />
                  <label htmlFor="is_active_toggle" style={{ fontSize: "0.82rem", color: "#FFFFFF", cursor: "pointer", fontWeight: 600 }}>
                    Apply offer immediately on website (displays strikethrough price)
                  </label>
                </div>

                {/* Stock safety note */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.74rem", color: "#4ade80" }}>
                  <ShieldCheck size={16} />
                  <span>Your products and stock records will never be modified by this promotional rule.</span>
                </div>

                {/* Modal Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#FFFFFF",
                      borderRadius: 8,
                      padding: "10px 18px",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-rose-primary"
                    style={{
                      padding: "10px 24px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingOffer ? "Update Offer" : "Create & Apply Offer"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
