import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  PackageCheck,
  Package,
  Clock,
  Shirt,
  Sparkles,
  Search,
  Check,
  X,
  ExternalLink,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Layers,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../api";
import { useAuth } from "../../auth-context";
import type { Booking, Asset, BookingStatus } from "../../types";

export function AdminOperationsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active filter tab & order type filter
  const [activeTab, setActiveTab] = useState<"all" | "allocation" | "handover" | "active_rent" | "return_queue" | "completed">("allocation");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "rent" | "buy">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Per-booking asset selection map { [bookingId]: assetId }
  const [selectedAssetMap, setSelectedAssetMap] = useState<Record<number, number>>({});

  // Toast feedback state
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Return & Settlement Modal State
  const [returnBooking, setReturnBooking] = useState<Booking | null>(null);
  const [returnDamageAmount, setReturnDamageAmount] = useState<number>(0);
  const [returnDamageNotes, setReturnDamageNotes] = useState("");
  const [sendForDryCleaning, setSendForDryCleaning] = useState(true);
  const [inspectionChecks, setInspectionChecks] = useState({
    ensembleComplete: true,
    zippersIntact: true,
    noFabricTears: true,
  });

  // Reject Booking Modal State
  const [rejectBookingTarget, setRejectBookingTarget] = useState<Booking | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Queries
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["admin-bookings", token],
    queryFn: () => api.listAdminBookings(token!),
    enabled: Boolean(token),
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["admin-assets", token],
    queryFn: () => api.listAssets(token),
    enabled: Boolean(token),
  });

  const availableAssets = useMemo(() => {
    return assets.filter((a) => a.status === "available" && !a.is_in_dry_cleaning && a.is_active);
  }, [assets]);

  // Asset lookup map
  const assetMap = useMemo(() => {
    const map = new Map<number, Asset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  // Global counts for Order Types
  const orderTypeStats = useMemo(() => {
    const total = bookings.length;
    const rentals = bookings.filter((b) => b.order_type !== "buy").length;
    const buyOnce = bookings.filter((b) => b.order_type === "buy").length;
    const buyRevenue = bookings
      .filter((b) => b.order_type === "buy")
      .reduce((acc, b) => acc + (b.rent_amount || 0), 0);
    return { total, rentals, buyOnce, buyRevenue };
  }, [bookings]);

  // Categorized Queues
  const allocationQueue = useMemo(() => {
    return bookings.filter((b) => b.status === "pending" || b.status === "booked");
  }, [bookings]);

  const handoverQueue = useMemo(() => {
    return bookings.filter((b) => b.status === "allocated" || b.status === "ready_for_pickup");
  }, [bookings]);

  const activeRentQueue = useMemo(() => {
    return bookings.filter((b) => b.order_type !== "buy" && (b.status === "picked_up" || b.status === "rent_paid" || b.status === "overdue"));
  }, [bookings]);

  const returnQueue = useMemo(() => {
    return bookings.filter((b) => b.order_type !== "buy" && b.status === "return_requested");
  }, [bookings]);

  const completedQueue = useMemo(() => {
    return bookings.filter((b) => b.status === "returned" || b.status === "cancelled");
  }, [bookings]);

  // Filtered Bookings for the active view
  const currentTabBookings = useMemo(() => {
    let list: Booking[] = [];
    if (activeTab === "all") list = bookings;
    else if (activeTab === "allocation") list = allocationQueue;
    else if (activeTab === "handover") list = handoverQueue;
    else if (activeTab === "active_rent") list = activeRentQueue;
    else if (activeTab === "return_queue") list = returnQueue;
    else if (activeTab === "completed") list = completedQueue;

    // Filter by order type
    if (orderTypeFilter === "rent") {
      list = list.filter((b) => b.order_type !== "buy");
    } else if (orderTypeFilter === "buy") {
      list = list.filter((b) => b.order_type === "buy");
    }

    if (!searchTerm.trim()) return list;

    const query = searchTerm.toLowerCase();
    return list.filter((b) => {
      const matchId = `#${b.id}`.includes(query) || String(b.id) === query;
      const matchClient = b.user?.full_name?.toLowerCase().includes(query) ?? false;
      const matchEmail = b.user?.email?.toLowerCase().includes(query) ?? false;
      const matchPhone = b.user?.phone?.toLowerCase().includes(query) ?? false;
      const reqAsset = b.requested_asset_id ? assetMap.get(b.requested_asset_id) : null;
      const allocAsset = b.allocated_asset_id ? assetMap.get(b.allocated_asset_id) : null;
      const matchReq = reqAsset?.name.toLowerCase().includes(query) || reqAsset?.asset_code.toLowerCase().includes(query);
      const matchAlloc = allocAsset?.name.toLowerCase().includes(query) || allocAsset?.asset_code.toLowerCase().includes(query);

      return matchId || matchClient || matchEmail || matchPhone || matchReq || matchAlloc;
    });
  }, [activeTab, orderTypeFilter, bookings, allocationQueue, handoverQueue, activeRentQueue, returnQueue, completedQueue, searchTerm, assetMap]);

  // Mutations
  const allocateMutation = useMutation({
    mutationFn: ({ bookingId, assetId }: { bookingId: number; assetId: number }) =>
      api.allocateAsset(token!, bookingId, assetId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      showToast("success", `Asset allocated successfully to Booking #${vars.bookingId}`);
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to allocate asset");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (bookingId: number) => api.rejectBookingByAdmin(token!, bookingId),
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      setRejectBookingTarget(null);
      showToast("success", `Booking #${bookingId} rejected and client notified.`);
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to reject booking");
    },
  });

  const markPickedUpMutation = useMutation({
    mutationFn: (bookingId: number) => api.markPickedUp(token!, bookingId),
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      showToast("success", `Order #${bookingId} marked as handed over / dispatched to client.`);
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to mark booking as handed over");
    },
  });

  const processReturnMutation = useMutation({
    mutationFn: () => {
      if (!returnBooking) throw new Error("No booking selected for return");
      return api.processReturn(
        token!,
        returnBooking.id,
        new Date().toISOString().split("T")[0],
        returnDamageAmount,
        returnDamageNotes || null,
        sendForDryCleaning
      );
    },
    onSuccess: (_, __) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["dc-requests"] });
      const bId = returnBooking?.id;
      setReturnBooking(null);
      showToast("success", `Return finalized for Booking #${bId}. Deposit refund released.`);
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to finalize return inspection");
    },
  });

  const refreshStatusesMutation = useMutation({
    mutationFn: () => api.refreshBookingStatuses(token!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      showToast("success", `Live status sync complete: ${data.picked_up_count} picked up, ${data.overdue_count} overdue.`);
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Failed to sync booking statuses");
    },
  });

  const getStatusBadge = (status: BookingStatus, orderType?: "rent" | "buy") => {
    if (orderType === "buy") {
      if (status === "allocated" || status === "ready_for_pickup") {
        return { label: "Buy Order: Preparing Dispatch", bg: "rgba(201, 163, 74, 0.2)", text: "#E6CA65", border: "rgba(201, 163, 74, 0.45)" };
      }
      if (status === "picked_up") {
        return { label: "Buy Order: Dispatched / In Transit", bg: "rgba(16, 185, 129, 0.2)", text: "#34D399", border: "rgba(16, 185, 129, 0.45)" };
      }
      if (status === "returned") {
        return { label: "Buy Order: Delivered & Owned", bg: "rgba(255, 255, 255, 0.08)", text: "#D4D4D4", border: "rgba(255, 255, 255, 0.15)" };
      }
    }

    switch (status) {
      case "pending":
      case "booked":
        return { label: "Pending Allocation", bg: "rgba(201, 163, 74, 0.15)", text: "#C9A34A", border: "rgba(201, 163, 74, 0.3)" };
      case "allocated":
      case "ready_for_pickup":
        return { label: "Ready for Pickup", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" };
      case "picked_up":
      case "rent_paid":
        return { label: "Active On Rent", bg: "rgba(16, 185, 129, 0.15)", text: "#34D399", border: "rgba(16, 185, 129, 0.3)" };
      case "overdue":
        return { label: "Overdue Return", bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444", border: "rgba(239, 68, 68, 0.35)" };
      case "return_requested":
        return { label: "Return Inspection", bg: "rgba(235, 137, 164, 0.18)", text: "#EB89A4", border: "rgba(235, 137, 164, 0.4)" };
      case "returned":
        return { label: "Returned & Settled", bg: "rgba(255, 255, 255, 0.08)", text: "#A3A3A3", border: "rgba(255, 255, 255, 0.15)" };
      case "cancelled":
        return { label: "Cancelled / Rejected", bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", border: "rgba(239, 68, 68, 0.2)" };
      default:
        return { label: status, bg: "rgba(255, 255, 255, 0.05)", text: "#FFFFFF", border: "rgba(255, 255, 255, 0.1)" };
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true };
    if (diffDays === 0) return { text: "Due today", isOverdue: false };
    return { text: `Due in ${diffDays}d`, isOverdue: false };
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1380, margin: "0 auto", color: "#FFFFFF", fontFamily: "var(--font-sans)" }}>
      {/* Toast Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed",
              top: 24,
              right: 28,
              zIndex: 9999,
              padding: "12px 20px",
              borderRadius: 10,
              background: feedback.type === "success" ? "#064E3B" : "#7F1D1D",
              border: `1.5px solid ${feedback.type === "success" ? "#10B981" : "#EF4444"}`,
              color: "#FFFFFF",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            {feedback.type === "success" ? <CheckCircle2 size={18} color="#10B981" /> : <AlertTriangle size={18} color="#EF4444" />}
            <span>{feedback.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "#C9A34A", fontWeight: 700 }}>
              Atelier Logistics & Client Fulfillment
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-brand)", fontSize: "1.85rem", color: "#FFFFFF", fontWeight: 600, letterSpacing: "0.06em", margin: 0 }}>
            OPERATIONS & RENT / BUY COMMAND
          </h1>
          <p style={{ color: "#A3A3A3", fontSize: "0.88rem", marginTop: 6, maxWidth: 680 }}>
            Oversee occasion rentals and outright purchases (Buy Once), allocate vault pieces, manage client handoffs, and finalize return deposit refunds.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => refreshStatusesMutation.mutate()}
            disabled={refreshStatusesMutation.isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 8,
              background: "#1E1E1E",
              border: "1px solid rgba(201, 163, 74, 0.3)",
              color: "#C9A34A",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: refreshStatusesMutation.isPending ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201, 163, 74, 0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1E1E1E")}
          >
            <RotateCcw size={15} className={refreshStatusesMutation.isPending ? "animate-spin" : ""} />
            <span>Sync Live Statuses</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 26 }}>
        {/* 1. Pending Allocation */}
        <div
          onClick={() => setActiveTab("allocation")}
          style={{
            background: "#141414",
            border: activeTab === "allocation" ? "1.5px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#A3A3A3", fontWeight: 700 }}>
              1. Pending Allocation
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(201, 163, 74, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={15} color="#C9A34A" />
            </div>
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 700, color: "#C9A34A" }}>{allocationQueue.length}</div>
          <div style={{ fontSize: "0.74rem", color: "#737373", marginTop: 4 }}>Awaiting piece assignment</div>
        </div>

        {/* 2. Ready for Handover */}
        <div
          onClick={() => setActiveTab("handover")}
          style={{
            background: "#141414",
            border: activeTab === "handover" ? "1.5px solid #60A5FA" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#A3A3A3", fontWeight: 700 }}>
              2. Pickup & Dispatch
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PackageCheck size={15} color="#60A5FA" />
            </div>
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 700, color: "#60A5FA" }}>{handoverQueue.length}</div>
          <div style={{ fontSize: "0.74rem", color: "#737373", marginTop: 4 }}>Ready for pickup / courier</div>
        </div>

        {/* 3. Active on Rent */}
        <div
          onClick={() => setActiveTab("active_rent")}
          style={{
            background: "#141414",
            border: activeTab === "active_rent" ? "1.5px solid #10B981" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#A3A3A3", fontWeight: 700 }}>
              3. Active On Rent
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shirt size={15} color="#10B981" />
            </div>
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 700, color: "#34D399" }}>{activeRentQueue.length}</div>
          <div style={{ fontSize: "0.74rem", color: "#737373", marginTop: 4 }}>Active occasion rentals</div>
        </div>

        {/* 4. Return Verification */}
        <div
          onClick={() => setActiveTab("return_queue")}
          style={{
            background: "#141414",
            border: activeTab === "return_queue" ? "1.5px solid #EB89A4" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#A3A3A3", fontWeight: 700 }}>
              4. Return Verification
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(235, 137, 164, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={15} color="#EB89A4" />
            </div>
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 700, color: "#EB89A4" }}>{returnQueue.length}</div>
          <div style={{ fontSize: "0.74rem", color: "#737373", marginTop: 4 }}>Intake fabric check & refund</div>
        </div>

        {/* 5. Buy to Own Purchases */}
        <div
          onClick={() => setOrderTypeFilter("buy")}
          style={{
            background: "#141414",
            border: orderTypeFilter === "buy" ? "1.5px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 18px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#A3A3A3", fontWeight: 700 }}>
              Buy to Own Orders
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(201, 163, 74, 0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingBag size={15} color="#C9A34A" />
            </div>
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 700, color: "#C9A34A" }}>{orderTypeStats.buyOnce}</div>
          <div style={{ fontSize: "0.74rem", color: "#34D399", marginTop: 4, fontWeight: 600 }}>₹{orderTypeStats.buyRevenue.toLocaleString()} volume</div>
        </div>
      </div>

      {/* Primary Section Switcher: All Records vs Rentals vs Buy Once */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, background: "#181818", padding: "6px 8px", borderRadius: 10, width: "fit-content", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <button
          onClick={() => setOrderTypeFilter("all")}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "none",
            background: orderTypeFilter === "all" ? "#C9A34A" : "transparent",
            color: orderTypeFilter === "all" ? "#0B0B0B" : "#A3A3A3",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          All Orders ({orderTypeStats.total})
        </button>

        <button
          onClick={() => setOrderTypeFilter("rent")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "none",
            background: orderTypeFilter === "rent" ? "#C9A34A" : "transparent",
            color: orderTypeFilter === "rent" ? "#0B0B0B" : "#A3A3A3",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Shirt size={13} />
          <span>Occasion Rentals ({orderTypeStats.rentals})</span>
        </button>

        <button
          onClick={() => setOrderTypeFilter("buy")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "none",
            background: orderTypeFilter === "buy" ? "linear-gradient(135deg, #C9A34A 0%, #E6CA65 100%)" : "transparent",
            color: orderTypeFilter === "buy" ? "#0B0B0B" : "#C9A34A",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <ShoppingBag size={13} />
          <span>Buy Once Purchases ({orderTypeStats.buyOnce})</span>
        </button>
      </div>

      {/* Queue Tabs and Search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 16, marginBottom: 24 }}>
        {/* Tab Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "allocation", label: "1. Allocation Queue", count: allocationQueue.length, icon: Package },
            { key: "handover", label: "2. Pickup & Dispatch", count: handoverQueue.length, icon: PackageCheck },
            { key: "active_rent", label: "3. Active on Rent", count: activeRentQueue.length, icon: Shirt },
            { key: "return_queue", label: "4. Return Verification", count: returnQueue.length, icon: ShieldCheck },
            { key: "completed", label: "5. Completed Archives", count: completedQueue.length, icon: CheckCircle2 },
            { key: "all", label: "All Master Records", count: bookings.length, icon: Layers },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  border: isActive ? "1px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isActive ? "rgba(201, 163, 74, 0.12)" : "#141414",
                  color: isActive ? "#C9A34A" : "#A3A3A3",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={14} color={isActive ? "#C9A34A" : "#737373"} />
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 9999,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    background: isActive ? "#C9A34A" : "rgba(255, 255, 255, 0.08)",
                    color: isActive ? "#0B0B0B" : "#A3A3A3",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={15} color="#737373" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search booking #, patron, garment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 14px 8px 34px",
              width: 270,
              borderRadius: 8,
              background: "#141414",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              outline: "none",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#737373", cursor: "pointer" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {bookingsLoading ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#737373" }}>
          <RotateCcw className="animate-spin" size={26} style={{ margin: "0 auto 12px", color: "#C9A34A" }} />
          <div>Loading atelier fulfillment queues...</div>
        </div>
      ) : currentTabBookings.length === 0 ? (
        <div style={{ background: "#141414", borderRadius: 14, border: "1px solid rgba(255, 255, 255, 0.08)", padding: "50px 20px", textAlign: "center" }}>
          <Package size={36} style={{ margin: "0 auto 12px", color: "#737373", opacity: 0.4 }} />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#FFFFFF", margin: 0 }}>No Bookings in this Queue</h3>
          <p style={{ fontSize: "0.82rem", color: "#737373", marginTop: 4 }}>
            {searchTerm ? "No reservations match your current search criteria." : "All operations for this stage are currently up to date."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {currentTabBookings.map((b) => {
            const isBuyOrder = b.order_type === "buy";
            const statusBadge = getStatusBadge(b.status, b.order_type);
            const reqAsset = b.requested_asset_id ? assetMap.get(b.requested_asset_id) : null;
            const allocAsset = b.allocated_asset_id ? assetMap.get(b.allocated_asset_id) : null;
            const displayAsset = allocAsset || reqAsset;

            // Is the requested asset currently available for instant 1-click allocation?
            const isRequestedAssetAvailable = reqAsset && reqAsset.status === "available" && !reqAsset.is_in_dry_cleaning;

            // Selected asset for this booking card in dropdown
            const currentSelectedAssetId = selectedAssetMap[b.id] ?? (isRequestedAssetAvailable ? reqAsset.id : "");

            const countdown = getDaysRemaining(b.due_date);

            return (
              <div
                key={b.id}
                style={{
                  background: "#141414",
                  borderRadius: 14,
                  border: isBuyOrder ? "1.5px solid rgba(201, 163, 74, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "20px 24px",
                  transition: "border-color 0.15s ease",
                }}
              >
                {/* Header bar of card */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, paddingBottom: 16, borderBottom: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.02em" }}>
                      {isBuyOrder ? `Buy Order #${b.id}` : `Rental Booking #${b.id}`}
                    </span>

                    {/* Order Type Badge */}
                    {isBuyOrder ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 10px",
                          borderRadius: 9999,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          background: "linear-gradient(135deg, rgba(201, 163, 74, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)",
                          color: "#E6CA65",
                          border: "1px solid rgba(201, 163, 74, 0.45)",
                        }}
                      >
                        <ShoppingBag size={11} />
                        <span>BUY ONCE (ACQUIRED)</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 9999,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          background: statusBadge.bg,
                          color: statusBadge.text,
                          border: `1px solid ${statusBadge.border}`,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    )}

                    <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: "0.72rem", background: "rgba(255, 255, 255, 0.05)", color: isBuyOrder ? "#34D399" : "#C9A34A", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                      {isBuyOrder ? "Direct Acquisition (Buy to Own)" : (b.rental_plan?.name || "Occasion Rental")}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.78rem" }}>
                    <span style={{ color: "#737373" }}>Log Date: {new Date(b.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => navigate(`/admin/tracking/${b.id}`)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "none",
                        border: "none",
                        color: "#C9A34A",
                        cursor: "pointer",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                      }}
                    >
                      <span>Timeline</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>

                {/* Body: Garment Preview, Client details, Dates, Financials */}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1.2fr) minmax(280px, 1fr) minmax(220px, 0.9fr)", gap: 20, alignItems: "center", marginBottom: 18 }}>
                  {/* Column 1: Garment Preview */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 10,
                        background: "#1E1E1E",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {displayAsset?.image_url ? (
                        <img src={displayAsset.image_url} alt={displayAsset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <Shirt size={26} color="#737373" />
                      )}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: isBuyOrder ? "#34D399" : b.allocated_asset_id ? "#34D399" : "#C9A34A", fontWeight: 700 }}>
                          {isBuyOrder ? "Purchased Vault Piece" : b.allocated_asset_id ? "Allocated Vault Piece" : "Requested Couture Piece"}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#FFFFFF", marginTop: 2 }}>
                        {displayAsset?.name || `Asset #${b.requested_asset_id || b.allocated_asset_id || "Unspecified"}`}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#A3A3A3", fontFamily: "monospace", marginTop: 2 }}>
                        {displayAsset?.asset_code || "Code Pending"}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Client & Contact */}
                  <div>
                    <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#737373", fontWeight: 700 }}>
                      Buyer / Patron Details
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#FFFFFF", marginTop: 2 }}>
                      {b.user?.full_name || "Boutique Patron"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#A3A3A3", marginTop: 2 }}>
                      <Mail size={12} color="#737373" />
                      <span>{b.user?.email || "No email"}</span>
                    </div>
                    {b.user?.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#A3A3A3", marginTop: 2 }}>
                        <Phone size={12} color="#737373" />
                        <span>{b.user.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Dates & Deposit Held */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div>
                      <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#737373", fontWeight: 700 }}>
                        {isBuyOrder ? "Acquisition Date" : "Rental Period"}
                      </span>
                      <div style={{ fontSize: "0.82rem", color: "#D4D4D4", marginTop: 2 }}>
                        {isBuyOrder ? `${b.pickup_date} • Permanent Purchase` : `${b.pickup_date} → ${b.due_date}`}
                      </div>
                      {!isBuyOrder && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 3,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: countdown.isOverdue ? "#EF4444" : "#C9A34A",
                          }}
                        >
                          {countdown.text}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 14, fontSize: "0.78rem", marginTop: 2 }}>
                      <div>
                        <span style={{ color: "#737373", fontSize: "0.68rem", display: "block" }}>
                          {isBuyOrder ? "SECURITY DEPOSIT" : "DEPOSIT HELD"}
                        </span>
                        <span style={{ color: isBuyOrder ? "#737373" : "#C9A34A", fontWeight: 700 }}>
                          {isBuyOrder ? "₹0 (Outright Sale)" : `₹${b.deposit_amount?.toLocaleString() ?? 0}`}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#737373", fontSize: "0.68rem", display: "block" }}>
                          {isBuyOrder ? "PURCHASE PRICE" : "RENT PAID"}
                        </span>
                        <span style={{ color: "#34D399", fontWeight: 700 }}>₹{b.rent_amount?.toLocaleString() ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Area based on Queue Stage & Order Type */}
                <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  {/* Buy Order Handover Action */}
                  {isBuyOrder && (b.status === "allocated" || b.status === "ready_for_pickup") && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#34D399", fontSize: "0.82rem" }}>
                        <CheckCircle2 size={16} />
                        <span>Buy Order confirmed & paid (₹{b.rent_amount?.toLocaleString()}). Piece ready for client packaging & dispatch.</span>
                      </div>
                      <button
                        onClick={() => markPickedUpMutation.mutate(b.id)}
                        disabled={markPickedUpMutation.isPending}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 20px",
                          borderRadius: 8,
                          background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                          color: "#FFFFFF",
                          border: "none",
                          fontWeight: 700,
                          fontSize: "0.84rem",
                          cursor: markPickedUpMutation.isPending ? "not-allowed" : "pointer",
                          boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        <Truck size={16} />
                        <span>Mark Dispatched / Handed Over to Buyer</span>
                      </button>
                    </div>
                  )}

                  {/* Stage 1: Allocation Actions (for rental bookings) */}
                  {!isBuyOrder && (b.status === "pending" || b.status === "booked") && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {isRequestedAssetAvailable && (
                          <button
                            onClick={() => allocateMutation.mutate({ bookingId: b.id, assetId: reqAsset.id })}
                            disabled={allocateMutation.isPending}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "8px 16px",
                              borderRadius: 8,
                              background: "linear-gradient(135deg, #C9A34A 0%, #E6CA65 100%)",
                              border: "none",
                              color: "#0B0B0B",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              cursor: allocateMutation.isPending ? "not-allowed" : "pointer",
                              boxShadow: "0 2px 10px rgba(201, 163, 74, 0.25)",
                            }}
                          >
                            <Sparkles size={14} />
                            <span>Instant 1-Click Allocate Requested Piece</span>
                          </button>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <select
                            value={currentSelectedAssetId}
                            onChange={(e) => setSelectedAssetMap({ ...selectedAssetMap, [b.id]: Number(e.target.value) })}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              background: "#1E1E1E",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              color: "#FFFFFF",
                              fontSize: "0.82rem",
                              outline: "none",
                              maxWidth: 320,
                            }}
                          >
                            <option value="">Select Physical Vault Piece</option>
                            {availableAssets.map((asset) => (
                              <option key={asset.id} value={asset.id}>
                                {asset.name} ({asset.asset_code})
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => {
                              if (currentSelectedAssetId) {
                                allocateMutation.mutate({ bookingId: b.id, assetId: Number(currentSelectedAssetId) });
                              }
                            }}
                            disabled={!currentSelectedAssetId || allocateMutation.isPending}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 8,
                              background: currentSelectedAssetId ? "#C9A34A" : "rgba(255, 255, 255, 0.08)",
                              color: currentSelectedAssetId ? "#0B0B0B" : "#737373",
                              border: "none",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              cursor: currentSelectedAssetId ? "pointer" : "not-allowed",
                            }}
                          >
                            Confirm Allocation
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => setRejectBookingTarget(b)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 8,
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#EF4444",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        Reject Reservation
                      </button>
                    </div>
                  )}

                  {/* Stage 2: Ready for Handover (for rentals) */}
                  {!isBuyOrder && (b.status === "allocated" || b.status === "ready_for_pickup") && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#60A5FA", fontSize: "0.82rem" }}>
                        <CheckCircle2 size={16} />
                        <span>Piece tagged in vault. Awaiting patron boutique arrival or courier dispatch.</span>
                      </div>
                      <button
                        onClick={() => markPickedUpMutation.mutate(b.id)}
                        disabled={markPickedUpMutation.isPending}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 18px",
                          borderRadius: 8,
                          background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                          color: "#FFFFFF",
                          border: "none",
                          fontWeight: 700,
                          fontSize: "0.84rem",
                          cursor: markPickedUpMutation.isPending ? "not-allowed" : "pointer",
                          boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        <PackageCheck size={16} />
                        <span>Mark Handed Over / Picked Up</span>
                      </button>
                    </div>
                  )}

                  {/* Stage 3: Active On Rent (rentals only) */}
                  {!isBuyOrder && (b.status === "picked_up" || b.status === "rent_paid" || b.status === "overdue") && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: b.status === "overdue" ? "#EF4444" : "#34D399", fontSize: "0.82rem" }}>
                        <Clock size={16} />
                        <span>
                          {b.status === "overdue"
                            ? "Overdue: Patron has not returned garment past due date."
                            : "Active rental: Client currently enjoying garment."}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setReturnBooking(b);
                          setReturnDamageAmount(0);
                          setReturnDamageNotes("");
                          setSendForDryCleaning(true);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 18px",
                          borderRadius: 8,
                          background: "linear-gradient(135deg, #C9A34A 0%, #E6CA65 100%)",
                          color: "#0B0B0B",
                          border: "none",
                          fontWeight: 700,
                          fontSize: "0.84rem",
                          cursor: "pointer",
                        }}
                      >
                        <ShieldCheck size={16} />
                        <span>Intake Return & Deposit Settlement</span>
                      </button>
                    </div>
                  )}

                  {/* Stage 4: Return Verification Requested (rentals only) */}
                  {!isBuyOrder && b.status === "return_requested" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#EB89A4", fontSize: "0.82rem" }}>
                        <AlertCircle size={16} />
                        <span>Patron requested return handoff. Ready for fabric inspection and deposit release.</span>
                      </div>
                      <button
                        onClick={() => {
                          setReturnBooking(b);
                          setReturnDamageAmount(0);
                          setReturnDamageNotes("");
                          setSendForDryCleaning(true);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 18px",
                          borderRadius: 8,
                          background: "linear-gradient(135deg, #C9A34A 0%, #E6CA65 100%)",
                          color: "#0B0B0B",
                          border: "none",
                          fontWeight: 700,
                          fontSize: "0.84rem",
                          cursor: "pointer",
                        }}
                      >
                        <ShieldCheck size={16} />
                        <span>Process Inspection & Release Refund</span>
                      </button>
                    </div>
                  )}

                  {/* Stage 5: Completed or Cancelled */}
                  {(b.status === "returned" || b.status === "cancelled") && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", color: "#737373", fontSize: "0.8rem" }}>
                      <span>
                        {isBuyOrder
                          ? "Direct acquisition complete: Garment delivered to client."
                          : b.status === "returned"
                          ? "Fulfillment complete: Garment returned, inspected, and deposit refunded."
                          : "Reservation cancelled / rejected."}
                      </span>
                      <button
                        onClick={() => navigate(`/admin/tracking/${b.id}`)}
                        style={{
                          background: "none",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: 6,
                          padding: "5px 12px",
                          color: "#A3A3A3",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        View Audit Log
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: INTAKE RETURN INSPECTION & DEPOSIT REFUND ── */}
      <AnimatePresence>
        {returnBooking && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 950,
              padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.35)",
                borderRadius: 18,
                maxWidth: 580,
                width: "100%",
                padding: "28px 32px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 25px 70px rgba(0,0,0,0.9)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#C9A34A", fontWeight: 700 }}>
                    Atelier Quality Assurance
                  </span>
                  <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.35rem", color: "#FFFFFF", margin: "4px 0 0 0" }}>
                    RETURN INSPECTION & REFUND (BOOKING #{returnBooking.id})
                  </h2>
                </div>
                <button
                  onClick={() => setReturnBooking(null)}
                  style={{ background: "none", border: "none", color: "#737373", cursor: "pointer", padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Booking & Patron Snapshot */}
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "#1E1E1E", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#FFFFFF" }}>{returnBooking.user?.full_name}</div>
                    <div style={{ fontSize: "0.76rem", color: "#A3A3A3" }}>{returnBooking.user?.email}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.68rem", color: "#737373", textTransform: "uppercase" }}>Security Deposit Held</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#C9A34A" }}>₹{returnBooking.deposit_amount?.toLocaleString() ?? 0}</div>
                  </div>
                </div>
              </div>

              {/* Inspection Quality Checklist */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, marginBottom: 8 }}>
                  Atelier Quality Intake Checklist
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "#1A1A1A", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.82rem", color: "#FFFFFF", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={inspectionChecks.ensembleComplete}
                      onChange={(e) => setInspectionChecks({ ...inspectionChecks, ensembleComplete: e.target.checked })}
                    />
                    <span>Complete couture ensemble returned (dust bag, custom hangers, accessories)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.82rem", color: "#FFFFFF", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={inspectionChecks.zippersIntact}
                      onChange={(e) => setInspectionChecks({ ...inspectionChecks, zippersIntact: e.target.checked })}
                    />
                    <span>Zippers, hooks, and lining fully functional without stress tearing</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.82rem", color: "#FFFFFF", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={inspectionChecks.noFabricTears}
                      onChange={(e) => setInspectionChecks({ ...inspectionChecks, noFabricTears: e.target.checked })}
                    />
                    <span>Zardozi / sequin embroidery sound; no burns or chemical burns detected</span>
                  </label>
                </div>
              </div>

              {/* Damage Assessment Deduction */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, display: "block", marginBottom: 6 }}>
                  Damage / Repair Deduction (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  max={returnBooking.deposit_amount}
                  value={returnDamageAmount}
                  onChange={(e) => setReturnDamageAmount(Math.max(0, Number(e.target.value)))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "#1E1E1E",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#FFFFFF",
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "8px 12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  <span style={{ fontSize: "0.8rem", color: "#D4D4D4" }}>Net Deposit Refund to Patron:</span>
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: "#34D399" }}>
                    ₹{Math.max(0, (returnBooking.deposit_amount || 0) - returnDamageAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Damage Notes */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, display: "block", marginBottom: 6 }}>
                  Damage & Fabric Care Observations
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Minor hem staining; delicate dry cleaning requested. Zardozi work in pristine condition."
                  value={returnDamageNotes}
                  onChange={(e) => setReturnDamageNotes(e.target.value)}
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
                    resize: "none",
                  }}
                />
              </div>

              {/* Dry Cleaning Dispatch Toggle */}
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "#1E1E1E", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: 22 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.84rem", color: "#FFFFFF", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={sendForDryCleaning}
                    onChange={(e) => setSendForDryCleaning(e.target.checked)}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>Queue Piece into Certified Fabric Sanitization</span>
                    <span style={{ display: "block", fontSize: "0.72rem", color: "#737373", marginTop: 2 }}>
                      Automatically transfers garment to Laundry Tracking for ozone dry cleaning before returning to stock.
                    </span>
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setReturnBooking(null)}
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
                  onClick={() => processReturnMutation.mutate()}
                  disabled={processReturnMutation.isPending}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #C9A34A 0%, #E6CA65 100%)",
                    border: "none",
                    color: "#0B0B0B",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    cursor: processReturnMutation.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {processReturnMutation.isPending ? "Finalizing Settlement..." : "Finalize Return & Release Refund"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: REJECT RESERVATION CONFIRMATION ── */}
      <AnimatePresence>
        {rejectBookingTarget && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(4px)",
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
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: 16,
                maxWidth: 440,
                width: "100%",
                padding: "26px 30px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={20} color="#EF4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                    Reject Reservation #{rejectBookingTarget.id}?
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#A3A3A3", marginTop: 2 }}>
                    Client: {rejectBookingTarget.user?.full_name}
                  </div>
                </div>
              </div>

              <p style={{ color: "#A3A3A3", fontSize: "0.84rem", lineHeight: 1.5, marginBottom: 20 }}>
                Rejecting this booking will cancel the reservation, release any deposit holds, and notify the patron that the requested couture piece cannot be fulfilled.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRejectBookingTarget(null)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#A3A3A3",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => rejectMutation.mutate(rejectBookingTarget.id)}
                  disabled={rejectMutation.isPending}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 8,
                    background: "#EF4444",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: rejectMutation.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
