import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  CreditCard,
  CheckCircle2,
  Lock,
  Sparkles,
  AlertCircle,
  Clock,
  Check,
  ChevronRight,
  PackageCheck,
  MapPin,
  Phone,
  User,
  Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth-context";
import type { Asset, Booking } from "../types";
import { useCart } from "../cart-context";
import { formatINR } from "../utils/currency";

// Razorpay checkout script loader helper
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { cartItems, cartTotal, clearCart } = useCart();

  const fromCart = searchParams.get("fromCart") === "true";
  const rawAssetId = searchParams.get("assetId");
  const assetId = rawAssetId ? Number(rawAssetId) : null;
  const selectedSize = searchParams.get("size") || "M";
  const selectedColor = searchParams.get("color") || "";

  // Form State
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [stateName, setStateName] = useState("Maharashtra");
  const [pinCode, setPinCode] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.full_name || "");
      if (!email) setEmail(user.email || "");
    }
  }, [user]);

  // Query Asset Details
  const { data: asset, isLoading, error } = useQuery<Asset>({
    queryKey: ["asset-checkout", assetId],
    queryFn: () => api.getAsset(token, assetId as number),
    enabled: Boolean(assetId && assetId > 0),
  });

  const fullShippingAddress = [
    addressLine.trim(),
    city.trim(),
    stateName.trim(),
    pinCode.trim() ? `PIN: ${pinCode.trim()}` : "",
    specialInstructions.trim() ? `(Note: ${specialInstructions.trim()})` : "",
  ]
    .filter(Boolean)
    .join(", ");

  // Buy Order Mutation
  const buyMutation = useMutation({
    mutationFn: (_payRef?: string | void) =>
      api.createBuyOrder(token!, {
        asset_id: (assetId || (cartItems[0]?.asset?.id ?? 1)) as number,
        size: selectedSize,
        color: selectedColor || undefined,
        shipping_address: fullShippingAddress,
        contact_phone: phone.trim(),
      }),
    onSuccess: (order: Booking) => {
      if (fromCart || (!assetId && cartItems.length > 0)) {
        clearCart();
      }
      setConfirmedOrder(order);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Failed to complete acquisition order. Please try again.");
    },
  });

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!token) {
      navigate("/login", { state: { from: `/checkout?${searchParams.toString()}` } });
      return;
    }

    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMessage("Please enter a valid contact phone number for white-glove delivery coordination.");
      return;
    }

    if (!addressLine.trim()) {
      setErrorMessage("Please enter your complete delivery address.");
      return;
    }

    if (!pinCode.trim()) {
      setErrorMessage("Please enter your delivery PIN / Postal code.");
      return;
    }

    const price = asset ? (asset.buy_price || 38000) : cartTotal;

    if (paymentMethod === "razorpay") {
      // 1. Load Razorpay SDK
      const isLoaded = await loadRazorpayScript();
      const razorpayKey = (window as any).__RAZORPAY_KEY_ID__ || "rzp_test_elanora_boutique";

      if (isLoaded && (window as any).Razorpay && razorpayKey !== "rzp_test_elanora_boutique") {
        try {
          const options = {
            key: razorpayKey,
            amount: price * 100, // in paise
            currency: "INR",
            name: "ELENORA BOUTIQUE",
            description: `Haute Couture Acquisition: ${asset?.name} (${selectedSize})`,
            image: "/elanora-emblem.png",
            prefill: {
              name: fullName || user?.full_name || "Valued Patron",
              email: email || user?.email || "",
              contact: phone || "",
            },
            theme: {
              color: "#C9A34A",
            },
            handler: function (response: any) {
              // On Razorpay success, finalize order with payment id
              buyMutation.mutate(response.razorpay_payment_id);
            },
            modal: {
              ondismiss: function () {
                // If user closes without paying, don't throw an unhandled error
              },
            },
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          return;
        } catch (err) {
          console.warn("Razorpay standard flow fallback", err);
        }
      }

      // If Razorpay test key / simulated direct gateway mode is active:
      buyMutation.mutate("rzp_demo_tx_" + Date.now());
    } else {
      // White-Glove Cash/Card on Delivery
      buyMutation.mutate(undefined);
    }
  };

  if (!assetId && cartItems.length === 0) {
    return (
      <div style={{ background: "#0B0B0B", minHeight: "85vh", padding: "80px 20px", textAlign: "center", color: "#FFFFFF" }}>
        <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.6rem", marginBottom: 12 }}>Your Shopping Bag is Empty</h2>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>Please select a bespoke couture piece from our collection vault.</p>
        <button onClick={() => navigate("/assets")} className="btn-rose-primary">
          Explore Collection Vault
        </button>
      </div>
    );
  }

  if (assetId && isLoading) {
    return (
      <div style={{ background: "#0B0B0B", minHeight: "85vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid rgba(201, 163, 74, 0.2)", borderTopColor: "#C9A34A", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "0.8rem", letterSpacing: "0.15em", color: "#C9A34A", textTransform: "uppercase", fontWeight: 600 }}>
          Preparing Atelier Checkout…
        </span>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div style={{ background: "#0B0B0B", minHeight: "85vh", padding: "80px 20px", textAlign: "center", color: "#FFFFFF" }}>
        <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.6rem", marginBottom: 12 }}>Garment Information Unavailable</h2>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>The piece you are attempting to acquire could not be loaded.</p>
        <button onClick={() => navigate("/assets")} className="btn-rose-primary">
          Return to Vault
        </button>
      </div>
    );
  }

  const buyPriceNum = asset.buy_price || 38000;
  const buyPriceFormatted = buyPriceNum.toLocaleString("en-IN");

  return (
    <div style={{ background: "#0B0B0B", minHeight: "100vh", padding: "36px 16px 80px", color: "#FFFFFF" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => (asset ? navigate(`/assets/${asset.id}`) : navigate("/cart"))}
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
          <ArrowLeft size={16} /> {asset ? `Return to ${asset.name}` : "Return to Shopping Bag"}
        </button>

        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#C9A34A", fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
            <Sparkles size={14} /> Haute Couture Permanent Wardrobe
          </div>
          <h1 style={{ fontFamily: "var(--font-brand)", fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)", fontWeight: 600, letterSpacing: "0.04em", margin: 0 }}>
            SECURE BOUTIQUE CHECKOUT
          </h1>
        </div>

        {/* Authentication Notice if Guest */}
        {!token && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: "rgba(201, 163, 74, 0.1)",
              border: "1.5px solid rgba(201, 163, 74, 0.35)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 28,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#FFFFFF" }}>Have an Elanora Atelier Account?</div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>Sign in to auto-fill saved addresses and earn private salon loyalty credits.</div>
            </div>
            <button
              onClick={() => navigate("/login", { state: { from: `/checkout?${searchParams.toString()}` } })}
              className="btn-rose-primary"
              style={{ padding: "8px 18px", fontSize: "0.8rem", fontWeight: 700 }}
            >
              Sign In to Continue
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#f87171",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 36, alignItems: "start" }}>
          
          {/* ── LEFT COLUMN: DELIVERY & PAYMENT FORM ── */}
          <form onSubmit={handlePlaceOrder} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            
            {/* Step 1: Client & Contact */}
            <div
              style={{
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.25)",
                borderRadius: 16,
                padding: "24px 24px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#C9A34A", color: "#0B0B0B", fontWeight: 800, fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  1
                </span>
                <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.15rem", fontWeight: 600, margin: 0, color: "#FFFFFF" }}>
                  PATRON & CONTACT DETAILS
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#C9A34A", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maharani Sarthak"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: 8,
                      background: "#1E1E1E",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#C9A34A", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patron@elanora-luxury.com"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: 8,
                      background: "#1E1E1E",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#C9A34A", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Phone for White-Glove Dispatch *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: 8,
                      background: "#1E1E1E",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Doorstep White-Glove Delivery Address */}
            <div
              style={{
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.25)",
                borderRadius: 16,
                padding: "24px 24px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#C9A34A", color: "#0B0B0B", fontWeight: 800, fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  2
                </span>
                <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.15rem", fontWeight: 600, margin: 0, color: "#FFFFFF" }}>
                  WHITE-GLOVE DOORSTEP DELIVERY
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#C9A34A", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Street Address & Villa / Apartment *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="e.g. 402, Sea View Heights, Worli Sea Face"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: 8,
                      background: "#1E1E1E",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#C9A34A", fontWeight: 700, display: "block", marginBottom: 6 }}>
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 8,
                        background: "#1E1E1E",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.85rem",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#C9A34A", fontWeight: 700, display: "block", marginBottom: 6 }}>
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="Maharashtra"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 8,
                        background: "#1E1E1E",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.85rem",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#C9A34A", fontWeight: 700, display: "block", marginBottom: 6 }}>
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="400018"
                      maxLength={6}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 8,
                        background: "#1E1E1E",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.85rem",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.6)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Special Fitting / Alteration Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Sleeve length adjust 1 inch, or please call 1 hour before arrival."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#1E1E1E",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.82rem",
                      boxSizing: "border-box",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payment Method Selection */}
            <div
              style={{
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.25)",
                borderRadius: 16,
                padding: "24px 24px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#C9A34A", color: "#0B0B0B", fontWeight: 800, fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  3
                </span>
                <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.15rem", fontWeight: 600, margin: 0, color: "#FFFFFF" }}>
                  PAYMENT GATEWAY & METHOD
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Razorpay Option */}
                <div
                  onClick={() => setPaymentMethod("razorpay")}
                  style={{
                    padding: "16px 18px",
                    borderRadius: 12,
                    background: paymentMethod === "razorpay" ? "rgba(201, 163, 74, 0.12)" : "#1E1E1E",
                    border: paymentMethod === "razorpay" ? "2px solid #C9A34A" : "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: paymentMethod === "razorpay" ? "6px solid #C9A34A" : "2px solid rgba(255,255,255,0.3)",
                        background: "#0B0B0B",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8 }}>
                        <span>Razorpay Secure Checkout</span>
                        <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 4, background: "rgba(52, 211, 153, 0.2)", color: "#34D399", fontWeight: 700 }}>
                          RECOMMENDED
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                        UPI (GPay, PhonePe, Paytm), Credit / Debit Cards, NetBanking, EMI
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#C9A34A", fontSize: "0.75rem", fontWeight: 700 }}>
                    <Lock size={14} /> 256-bit SSL
                  </div>
                </div>

                {/* White Glove Concierge Delivery Option */}
                <div
                  onClick={() => setPaymentMethod("cod")}
                  style={{
                    padding: "16px 18px",
                    borderRadius: 12,
                    background: paymentMethod === "cod" ? "rgba(201, 163, 74, 0.12)" : "#1E1E1E",
                    border: paymentMethod === "cod" ? "2px solid #C9A34A" : "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: paymentMethod === "cod" ? "6px solid #C9A34A" : "2px solid rgba(255,255,255,0.3)",
                        background: "#0B0B0B",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#FFFFFF" }}>
                        Concierge Pay upon Doorstep Fitting
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                        Try on at your residence, verify couture finish, and pay via Card or Cash to our courier.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={buyMutation.isPending}
              style={{
                width: "100%",
                padding: "16px 28px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #C9A34A 0%, #F5D77F 100%)",
                border: "none",
                color: "#0B0B0B",
                fontSize: "1.05rem",
                fontWeight: 800,
                letterSpacing: "0.04em",
                cursor: buyMutation.isPending ? "not-allowed" : "pointer",
                boxShadow: "0 10px 30px rgba(201, 163, 74, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: "all 0.2s ease",
              }}
            >
              {buyMutation.isPending ? (
                <>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #0B0B0B", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  <span>Securing Haute Couture Piece…</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Confirm Acquisition · Pay {formatINR(buyPriceNum)}</span>
                </>
              )}
            </button>
          </form>


          {/* ── RIGHT COLUMN: ORDER SUMMARY & ATELIER GUARANTEES ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 90 }}>
            
            {/* Garment Card */}
            <div
              style={{
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.3)",
                borderRadius: 16,
                padding: "20px",
                boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 14 }}>
                Atelier Order Summary
              </div>

              {/* Product Info */}
              <div style={{ display: "flex", gap: 16, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16, marginBottom: 16 }}>
                <img
                  src={asset.image_url || undefined}
                  alt={asset.name}
                  style={{ width: 76, height: 100, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(201,163,74,0.3)" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.68rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                    {asset.asset_code.replace(/-\d+$/, "")}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.2rem", fontWeight: 600, color: "#FFFFFF", margin: "4px 0 8px 0" }}>
                    {asset.name}
                  </h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 9999, background: "rgba(201,163,74,0.15)", color: "#C9A34A", fontSize: "0.72rem", fontWeight: 700 }}>
                      Size: {selectedSize}
                    </span>
                    {selectedColor && (
                      <span style={{ padding: "3px 10px", borderRadius: 9999, background: "rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: "0.72rem" }}>
                        Shade: {selectedColor}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Calculation */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Haute Couture Acquisition:</span>
                  <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{formatINR(buyPriceNum)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>White-Glove Pan-India Delivery:</span>
                  <span style={{ color: "#34D399", fontWeight: 600 }}>COMPLIMENTARY</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Eco-Sterilization & Velvet Bag:</span>
                  <span style={{ color: "#34D399", fontWeight: 600 }}>COMPLIMENTARY</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Applicable GST & Luxury Cess:</span>
                  <span style={{ color: "#FFFFFF", fontWeight: 600 }}>Included</span>
                </div>
              </div>

              {/* Total Row */}
              <div
                style={{
                  borderTop: "1.5px solid rgba(201, 163, 74, 0.4)",
                  paddingTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#C9A34A", fontWeight: 700, display: "block" }}>
                    Total Investment
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
                    Permanent Wardrobe Ownership
                  </span>
                </div>
                <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#C9A34A" }}>
                  {formatINR(buyPriceNum)}
                </div>
              </div>

            </div>

            {/* Atelier Guarantees Card */}
            <div
              style={{
                background: "rgba(201, 163, 74, 0.05)",
                border: "1px solid rgba(201, 163, 74, 0.2)",
                borderRadius: 14,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.8rem", color: "rgba(255,255,255,0.85)" }}>
                <ShieldCheck size={18} color="#C9A34A" />
                <span>100% Certified Authentic Handcrafted Couture</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.8rem", color: "rgba(255,255,255,0.85)" }}>
                <Truck size={18} color="#C9A34A" />
                <span>Pan-India Insured White-Glove Dispatch</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.8rem", color: "rgba(255,255,255,0.85)" }}>
                <Sparkles size={18} color="#C9A34A" />
                <span>Dedicated Elanora Concierge Fitting Assistance</span>
              </div>
            </div>

          </div>

        </div>

        {/* ── ORDER CONFIRMATION MODAL OVERLAY ── */}
        <AnimatePresence>
          {confirmedOrder && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.9)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: 20,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  background: "#141414",
                  border: "2px solid #C9A34A",
                  borderRadius: 20,
                  maxWidth: 520,
                  width: "100%",
                  padding: "36px 32px",
                  textAlign: "center",
                  boxShadow: "0 25px 80px rgba(0,0,0,0.95), 0 0 40px rgba(201, 163, 74, 0.3)",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "rgba(52, 211, 153, 0.15)",
                    border: "2px solid #34D399",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    color: "#34D399",
                  }}
                >
                  <PackageCheck size={36} />
                </div>

                <div style={{ fontSize: "0.75rem", color: "#C9A34A", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                  Acquisition Confirmed
                </div>
                <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.7rem", color: "#FFFFFF", margin: "0 0 12px 0" }}>
                  WELCOME TO THE WARDROBE
                </h2>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 24 }}>
                  Order <strong>#{confirmedOrder.id}</strong> has been received for <strong>{asset.name}</strong> ({selectedSize}). Your personal Elanora concierge will contact you on <strong>{phone || "your phone"}</strong> to arrange white-glove delivery.
                </p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button
                    onClick={() => navigate("/bookings")}
                    className="btn-rose-primary"
                    style={{ padding: "12px 24px", fontSize: "0.85rem", fontWeight: 700 }}
                  >
                    View My Acquisitions
                  </button>
                  <button
                    onClick={() => navigate("/assets")}
                    style={{
                      padding: "12px 20px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Explore Vault
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
