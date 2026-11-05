import React, { createContext, useContext, useEffect, useState } from "react";
import type { Asset } from "./types";

interface WishlistContextType {
  wishlistItems: Asset[];
  wishlistCount: number;
  isInWishlist: (assetId: number) => boolean;
  toggleWishlist: (asset: Asset) => void;
  removeFromWishlist: (assetId: number) => void;
  clearWishlist: () => void;
  toastMessage: string | null;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const STORAGE_KEY = "elanora_boutique_wishlist_v1";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Failed to read wishlist from localStorage", e);
    }
    return [];
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistItems));
    } catch (e) {
      console.warn("Failed to save wishlist to localStorage", e);
    }
  }, [wishlistItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const isInWishlist = (assetId: number) => {
    return wishlistItems.some((item) => item.id === assetId);
  };

  const toggleWishlist = (asset: Asset) => {
    if (!asset || !asset.id) return;
    setWishlistItems((prev) => {
      const exists = prev.some((item) => item.id === asset.id);
      if (exists) {
        showToast(`Removed "${asset.name}" from your Atelier Wishlist`);
        return prev.filter((item) => item.id !== asset.id);
      } else {
        showToast(`Saved "${asset.name}" to your Atelier Wishlist`);
        return [asset, ...prev];
      }
    });
  };

  const removeFromWishlist = (assetId: number) => {
    setWishlistItems((prev) => {
      const target = prev.find((i) => i.id === assetId);
      if (target) {
        showToast(`Removed "${target.name}" from your Atelier Wishlist`);
      }
      return prev.filter((item) => item.id !== assetId);
    });
  };

  const clearWishlist = () => {
    setWishlistItems([]);
    showToast("Cleared your Atelier Wishlist");
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount: wishlistItems.length,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        toastMessage,
      }}
    >
      {children}
      {/* Global Wishlist Toast */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9999,
            background: "#141414",
            border: "1.5px solid rgba(201, 163, 74, 0.5)",
            borderRadius: 12,
            padding: "12px 20px",
            color: "#FFFFFF",
            boxShadow: "0 12px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(201, 163, 74, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: "0.85rem",
            fontWeight: 600,
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <span style={{ color: "#C9A34A", fontSize: "1.1rem" }}>✦</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
