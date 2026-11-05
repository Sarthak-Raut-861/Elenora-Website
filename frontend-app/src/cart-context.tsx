import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { Asset } from "./types";

export interface CartItem {
  id: string; // unique item key
  asset: Asset;
  size: string;
  color?: string;
  orderType: "buy" | "rent";
  price: number;
  quantity: number;
  rentalDays?: number;
  rentalStartDate?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (item: {
    asset: Asset;
    size: string;
    color?: string;
    orderType: "buy" | "rent";
    price?: number;
    rentalDays?: number;
    rentalStartDate?: string;
    quantity?: number;
  }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  toastMessage: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "elanora_boutique_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Failed to read cart from localStorage", e);
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.warn("Failed to persist cart to localStorage", e);
    }
  }, [cartItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const addToCart = ({
    asset,
    size,
    color = "",
    orderType,
    price,
    rentalDays = 3,
    rentalStartDate,
    quantity = 1,
  }: {
    asset: Asset;
    size: string;
    color?: string;
    orderType: "buy" | "rent";
    price?: number;
    rentalDays?: number;
    rentalStartDate?: string;
    quantity?: number;
  }) => {
    if (!asset || !asset.id) return;

    const itemPrice =
      price !== undefined
        ? price
        : orderType === "rent"
        ? (asset.rental_price || 2899) * rentalDays
        : asset.buy_price || 38000;

    const itemId = `${asset.id}_${size}_${color}_${orderType}`;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === itemId);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        return next;
      } else {
        return [
          {
            id: itemId,
            asset,
            size,
            color,
            orderType,
            price: itemPrice,
            quantity,
            rentalDays,
            rentalStartDate,
          },
          ...prev,
        ];
      }
    });

    showToast(`Added "${asset.name}" (${size}) to your luxury shopping bag`);
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        showToast(`Removed "${target.asset.name}" from shopping bag`);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
    showToast("Cleared your shopping bag");
  };

  const cartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        toggleCart: () => setIsCartOpen((prev) => !prev),
        toastMessage,
      }}
    >
      {children}
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
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
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
