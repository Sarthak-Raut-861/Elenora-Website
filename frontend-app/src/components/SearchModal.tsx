import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight, Sparkles, Tag, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useAuth } from "../auth-context";
import { formatINR } from "../utils/currency";
import type { Asset } from "../types";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { token } = useAuth();

  const { data: rawAssets = [] } = useQuery<Asset[]>({
    queryKey: ["search-assets"],
    queryFn: () => api.listAssets(token),
    enabled: isOpen,
  });

  const assets = Array.isArray(rawAssets) ? rawAssets : [];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Unique creations matching query
  const matchingAssets = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    const map = new Map<string, Asset>();
    for (const a of assets) {
      const matchName = a.name.toLowerCase().includes(term);
      const matchCode = a.asset_code.toLowerCase().includes(term);
      const matchDesc = (a.description || "").toLowerCase().includes(term);
      if (matchName || matchCode || matchDesc) {
        const key = a.name.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, a);
        }
      }
    }
    return Array.from(map.values()).slice(0, 8);
  }, [searchTerm, assets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    onClose();
    navigate(`/assets?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  const quickSearches = [
    { label: "Lehengas", query: "Lehenga" },
    { label: "Banarasi Sarees", query: "Banarasi" },
    { label: "Bridal Gowns", query: "Gown" },
    { label: "Sherwanis", query: "Sherwani" },
    { label: "Velvet Tuxedos", query: "Tuxedo" },
    { label: "Polki Jewellery", query: "Polki" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 130 }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(8px)",
            }}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 720,
              margin: "60px auto 20px",
              background: "#121212",
              borderRadius: 18,
              border: "1.5px solid rgba(201, 163, 74, 0.35)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(201, 163, 74, 0.15)",
              color: "#FFFFFF",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <form onSubmit={handleSubmit} style={{ position: "relative", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <Search
                size={22}
                style={{
                  position: "absolute",
                  left: 22,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#C9A34A",
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search designer lehengas, bridal gowns, sherwanis, sarees..."
                style={{
                  width: "100%",
                  padding: "22px 56px 22px 60px",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#FFFFFF",
                  fontSize: "1.05rem",
                  fontFamily: "var(--font-brand)",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={onClose}
                style={{
                  position: "absolute",
                  right: 18,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#1E1E1E",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </form>

            {/* Quick Filter Tags */}
            <div
              style={{
                padding: "14px 22px",
                background: "#0E0E0E",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                overflowX: "auto",
              }}
            >
              <span style={{ fontSize: "0.68rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, flexShrink: 0 }}>
                Popular:
              </span>
              {quickSearches.map((qs) => (
                <button
                  key={qs.label}
                  type="button"
                  onClick={() => setSearchTerm(qs.query)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 9999,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "0.74rem",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C9A34A";
                    e.currentTarget.style.color = "#C9A34A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                  }}
                >
                  {qs.label}
                </button>
              ))}
            </div>

            {/* Results Area */}
            <div style={{ maxHeight: "55vh", overflowY: "auto", padding: "16px 20px" }}>
              {searchTerm.trim() ? (
                matchingAssets.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 10px" }}>
                    <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.9rem", margin: "0 0 16px" }}>
                      No matching haute couture pieces found for "{searchTerm}".
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate("/assets");
                      }}
                      className="btn-gold-outline"
                      style={{ padding: "8px 20px", fontSize: "0.78rem" }}
                    >
                      Browse Entire Atelier Vault
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {matchingAssets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => {
                          onClose();
                          navigate(`/assets/${asset.id}`);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 14,
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "#161616",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          cursor: "pointer",
                          transition: "all 0.18s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(201, 163, 74, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(201, 163, 74, 0.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#161616";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                          <img
                            src={asset.image_url || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b"}
                            alt={asset.name}
                            style={{
                              width: 48,
                              height: 60,
                              borderRadius: 6,
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "0.64rem", color: "#C9A34A", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                              {asset.asset_code}
                            </div>
                            <h4
                              style={{
                                fontFamily: "var(--font-brand)",
                                fontSize: "0.95rem",
                                color: "#FFFFFF",
                                margin: "2px 0 0",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {asset.name}
                            </h4>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                          <div style={{ textAlign: "right" }}>
                            {asset.rental_price && (
                              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#C9A34A" }}>
                                Rent {formatINR(asset.rental_price)}/day
                              </div>
                            )}
                            {asset.buy_price && (
                              <div style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.55)" }}>
                                Buy {formatINR(asset.buy_price)}
                              </div>
                            )}
                          </div>
                          <ChevronRight size={16} color="rgba(255, 255, 255, 0.4)" />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div style={{ padding: "24px 10px", textAlign: "center" }}>
                  <Sparkles size={24} color="#C9A34A" style={{ margin: "0 auto 10px" }} />
                  <p style={{ fontSize: "0.88rem", color: "rgba(255, 255, 255, 0.7)", margin: 0 }}>
                    Type a keyword or select a category above to search the atelier catalog.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {searchTerm.trim() && matchingAssets.length > 0 && (
              <div
                style={{
                  padding: "14px 22px",
                  background: "#0E0E0E",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.5)" }}>
                  Showing {matchingAssets.length} matching pieces
                </span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#C9A34A",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <span>View All Results in Catalog</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
