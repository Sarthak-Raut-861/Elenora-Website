import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  X,
  Search,
  ArrowUpDown,
  Check,
  Sparkles,
  Clock,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Info,
  Layers,
  Power,
} from "lucide-react";
import { api } from "../../api";
import { useAuth } from "../../auth-context";
import type { RentalPlan, Booking } from "../../types";

interface PlanFormData {
  name: string;
  duration_days: number;
  daily_rate: number;
  deposit_amount: number;
  daily_fine_rate: number;
  damage_fee: number;
}

const LUXURY_PRESETS: Array<{ label: string; icon: string; data: PlanFormData }> = [
  {
    label: "Weekend Soirée",
    icon: "🍸",
    data: {
      name: "Weekend Soirée (3 Days)",
      duration_days: 3,
      daily_rate: 1500,
      deposit_amount: 5000,
      daily_fine_rate: 500,
      damage_fee: 1000,
    },
  },
  {
    label: "Festive Gala",
    icon: "✨",
    data: {
      name: "Festive Gala (5 Days)",
      duration_days: 5,
      daily_rate: 1200,
      deposit_amount: 6000,
      daily_fine_rate: 600,
      damage_fee: 1200,
    },
  },
  {
    label: "Grand Wedding",
    icon: "👑",
    data: {
      name: "Grand Wedding Week (7 Days)",
      duration_days: 7,
      daily_rate: 1000,
      deposit_amount: 8000,
      daily_fine_rate: 800,
      damage_fee: 1500,
    },
  },
  {
    label: "Royal Extravaganza",
    icon: "💎",
    data: {
      name: "Royal Bridal Extravaganza (10 Days)",
      duration_days: 10,
      daily_rate: 900,
      deposit_amount: 10000,
      daily_fine_rate: 1000,
      damage_fee: 2000,
    },
  },
];

export function AdminPlansPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"id-asc" | "id-desc" | "duration-asc" | "rate-asc" | "deposit-asc">("id-asc");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlan, setNewPlan] = useState<PlanFormData>({
    name: "",
    duration_days: 3,
    daily_rate: 1500,
    deposit_amount: 5000,
    daily_fine_rate: 500,
    damage_fee: 1000,
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editingPlan, setEditingPlan] = useState<RentalPlan | null>(null);
  const [editFormData, setEditFormData] = useState<PlanFormData>({
    name: "",
    duration_days: 3,
    daily_rate: 1500,
    deposit_amount: 5000,
    daily_fine_rate: 500,
    damage_fee: 1000,
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Safeguard Modal State
  const [deletingPlan, setDeletingPlan] = useState<RentalPlan | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Queries
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery<RentalPlan[]>({
    queryKey: ["admin-plans", token],
    queryFn: () => api.listRentalPlans(token!),
    enabled: Boolean(token),
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["admin-bookings", token],
    queryFn: () => api.listAdminBookings(token!),
    enabled: Boolean(token),
  });

  // Calculate booking count per plan
  const getBookingsForPlan = (planId: number) => {
    return bookings.filter((b) => b.rental_plan_id === planId);
  };

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: PlanFormData) => api.createRentalPlan(token!, payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setShowAddModal(false);
      setCreateError(null);
      setNewPlan({
        name: "",
        duration_days: 3,
        daily_rate: 1500,
        deposit_amount: 5000,
        daily_fine_rate: 500,
        damage_fee: 1000,
      });
      showToast(`Rental Tier "${created.name}" created successfully`);
    },
    onError: (err: any) => {
      setCreateError(err?.message || "Failed to create rental plan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<RentalPlan> }) =>
      api.updateRentalPlan(token!, id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setEditingPlan(null);
      setEditError(null);
      showToast(`Rental Tier #${updated.id} "${updated.name}" updated successfully`);
    },
    onError: (err: any) => {
      setEditError(err?.message || "Failed to update rental plan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteRentalPlan(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      const deletedName = deletingPlan?.name;
      setDeletingPlan(null);
      setDeleteError(null);
      showToast(`Rental Tier "${deletedName}" has been archived`);
    },
    onError: (err: any) => {
      setDeleteError(err?.message || "Failed to archive rental plan");
    },
  });

  // Open Edit Modal
  const openEditModal = (plan: RentalPlan) => {
    setEditingPlan(plan);
    setEditFormData({
      name: plan.name,
      duration_days: plan.duration_days,
      daily_rate: Number(plan.daily_rate),
      deposit_amount: Number(plan.deposit_amount),
      daily_fine_rate: Number(plan.daily_fine_rate),
      damage_fee: Number(plan.damage_fee || 1000),
    });
    setEditError(null);
  };

  // Sort and filter plans
  const sortedPlans = useMemo(() => {
    const list = [...plans];
    switch (sortBy) {
      case "id-desc":
        return list.sort((a, b) => b.id - a.id);
      case "duration-asc":
        return list.sort((a, b) => a.duration_days - b.duration_days);
      case "rate-asc":
        return list.sort((a, b) => Number(a.daily_rate) - Number(b.daily_rate));
      case "deposit-asc":
        return list.sort((a, b) => Number(a.deposit_amount) - Number(b.deposit_amount));
      case "id-asc":
      default:
        return list.sort((a, b) => a.id - b.id);
    }
  }, [plans, sortBy]);

  const filteredPlans = useMemo(() => {
    if (!searchTerm.trim()) return sortedPlans;
    const term = searchTerm.toLowerCase().trim();
    return sortedPlans.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.duration_days.toString().includes(term) ||
        p.id.toString() === term.replace(/^#/, "") ||
        `#${p.id}`.includes(term)
    );
  }, [sortedPlans, searchTerm]);

  // Summary Metrics
  const activePlansCount = plans.filter((p) => p.is_active).length;
  const avgDailyRate =
    plans.length > 0
      ? Math.round(plans.reduce((acc, p) => acc + Number(p.daily_rate), 0) / plans.length)
      : 0;
  const durations = plans.map((p) => p.duration_days);
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const avgDeposit =
    plans.length > 0
      ? Math.round(plans.reduce((acc, p) => acc + Number(p.deposit_amount), 0) / plans.length)
      : 0;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1180, margin: "0 auto", color: "#FFFFFF" }}>
      
      {/* ── SUCCESS TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed",
              top: 24,
              right: 28,
              zIndex: 2000,
              background: "#161616",
              border: "1.5px solid #C9A34A",
              borderRadius: 12,
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(201, 163, 74, 0.2)",
              color: "#FFFFFF",
              fontSize: "0.88rem",
            }}
          >
            <Check size={18} color="#C9A34A" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Crown size={16} color="#C9A34A" />
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 700 }}>
              ATELIER RENTAL ARCHITECTURE & ESCROW TIERS
            </span>
          </div>
          <h1
            className="gold-metallic-text"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "2.3rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Rental Plan Tiers
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginTop: 6, maxWidth: 640 }}>
            Control rental durations, daily rates, security deposit escrow tiers, and late fine penalties with live client checkout simulation.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setCreateError(null);
          }}
          className="btn-rose-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: 10,
            fontSize: "0.88rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 4px 18px rgba(201, 163, 74, 0.25)",
          }}
        >
          <Plus size={18} /> New Rental Plan
        </button>
      </div>

      {/* ── SUMMARY STATS BANNER ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(201, 163, 74, 0.12)", border: "1px solid rgba(201, 163, 74, 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Layers size={20} color="#C9A34A" />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active Rental Tiers</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#FFFFFF" }}>{activePlansCount} Packages</div>
          </div>
        </div>

        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(235, 137, 164, 0.12)", border: "1px solid rgba(235, 137, 164, 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Coins size={20} color="#EB89A4" />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg. Daily Rental Rate</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#FFFFFF" }}>₹{avgDailyRate.toLocaleString("en-IN")}/day</div>
          </div>
        </div>

        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Calendar size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Occasion Window Spectrum</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#C9A34A" }}>
              {minDuration} – {maxDuration} Days
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} color="#4ade80" />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg. Escrow Deposit</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#FFFFFF" }}>₹{avgDeposit.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: SEARCH & ORDERING SELECTOR ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", minWidth: 320, flex: 1 }}>
          <Search
            size={16}
            color="#888"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search rental plan by name, duration (e.g. 3 Days, Wedding)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 14px 10px 40px",
              borderRadius: 10,
              background: "#141414",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#FFFFFF",
              fontSize: "0.86rem",
              outline: "none",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#888",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Ordering Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ArrowUpDown size={15} color="#C9A34A" />
          <span style={{ fontSize: "0.74rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Ordering:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "9px 14px",
              borderRadius: 8,
              background: "#141414",
              border: "1px solid rgba(201, 163, 74, 0.3)",
              color: "#C9A34A",
              fontSize: "0.82rem",
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="id-asc">ID (Increasing #01 → #04)</option>
            <option value="id-desc">ID (Decreasing)</option>
            <option value="duration-asc">Duration (Shortest → Longest)</option>
            <option value="rate-asc">Daily Rate (Lowest → Highest)</option>
            <option value="deposit-asc">Deposit (Lowest → Highest)</option>
          </select>
        </div>
      </div>

      {/* ── RENTAL PLANS TABLE ── */}
      <div
        style={{
          background: "#141414",
          borderRadius: 16,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#1a1a1a", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                ID SEQUENCE
              </th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                PLAN & TIER NAME
              </th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                DURATION
              </th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                DAILY RATE
              </th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                SECURITY ESCROW
              </th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                CLIENT CHECKOUT TOTAL
              </th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                PENALTIES
              </th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, textAlign: "right" }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoadingPlans ? (
              <tr>
                <td colSpan={8} style={{ padding: "48px 20px", textAlign: "center", color: "#888" }}>
                  Loading rental tiers and escrow structures...
                </td>
              </tr>
            ) : filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "48px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No rental tiers found matching "{searchTerm}". Click "+ New Rental Plan" to create one.
                </td>
              </tr>
            ) : (
              filteredPlans.map((p) => {
                const formattedId = p.id < 10 ? `#0${p.id}` : `#${p.id}`;
                const baseRent = Number(p.daily_rate) * p.duration_days;
                const totalEscrow = baseRent + Number(p.deposit_amount);
                const planBookings = getBookingsForPlan(p.id);

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* ID Sequence */}
                    <td style={{ padding: "16px 20px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: "rgba(201, 163, 74, 0.12)",
                          border: "1px solid rgba(201, 163, 74, 0.3)",
                          color: "#C9A34A",
                          fontSize: "0.82rem",
                          fontFamily: "monospace",
                          fontWeight: 700,
                        }}
                      >
                        {formattedId}
                      </span>
                    </td>

                    {/* Plan Name & Booking History */}
                    <td style={{ padding: "16px 20px" }}>
                      <div>
                        <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#FFFFFF", display: "block" }}>
                          {p.name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: "0.72rem", color: "#888" }}>
                            {planBookings.length > 0 ? (
                              <span style={{ color: "#C9A34A" }}>★ {planBookings.length} booking{planBookings.length > 1 ? "s" : ""} booked</span>
                            ) : (
                              "No client bookings yet"
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Duration */}
                    <td style={{ padding: "16px 20px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 12px",
                          borderRadius: 9999,
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#FFFFFF",
                        }}
                      >
                        <Clock size={13} color="#C9A34A" />
                        {p.duration_days} Days
                      </span>
                    </td>

                    {/* Daily Rate */}
                    <td style={{ padding: "16px 20px" }}>
                      <div>
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#C9A34A" }}>
                          ₹{Number(p.daily_rate).toLocaleString("en-IN")}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#888", display: "block" }}>per day</span>
                      </div>
                    </td>

                    {/* Security Deposit */}
                    <td style={{ padding: "16px 20px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#4ade80",
                        }}
                      >
                        ₹{Number(p.deposit_amount).toLocaleString("en-IN")}
                        <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>(Refundable)</span>
                      </span>
                    </td>

                    {/* Client Total Estimate */}
                    <td style={{ padding: "16px 20px" }}>
                      <div>
                        <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#FFFFFF" }}>
                          ₹{totalEscrow.toLocaleString("en-IN")}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "#888", display: "block" }}>
                          Rent ₹{baseRent.toLocaleString("en-IN")} + Dep ₹{Number(p.deposit_amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </td>

                    {/* Penalties */}
                    <td style={{ padding: "16px 20px", fontSize: "0.75rem", lineHeight: 1.5 }}>
                      <div style={{ color: "#f87171" }}>
                        Late: <strong>₹{Number(p.daily_fine_rate).toLocaleString("en-IN")}/day</strong>
                      </div>
                      <div style={{ color: "#A3A3A3", fontSize: "0.7rem" }}>
                        Damage cap: ₹{Number(p.damage_fee || 1000).toLocaleString("en-IN")}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button
                          onClick={() => openEditModal(p)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "rgba(201, 163, 74, 0.12)",
                            border: "1px solid rgba(201, 163, 74, 0.3)",
                            color: "#C9A34A",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201, 163, 74, 0.25)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(201, 163, 74, 0.12)")}
                          title="Edit Rental Plan"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            setDeletingPlan(p);
                            setDeleteError(null);
                          }}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            color: "#f87171",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
                            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)";
                          }}
                          title="Archive Rental Plan"
                        >
                          <Trash2 size={14} />
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── CREATE RENTAL PLAN MODAL (WITH LIVE FINANCIAL BREAKDOWN) ── */}
      <AnimatePresence>
        {showAddModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="luxury-modal-scroll"
              style={{
                width: "100%",
                maxWidth: 620,
                maxHeight: "92vh",
                overflowY: "auto",
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.35)",
                borderRadius: 20,
                padding: "30px 32px",
                boxShadow: "0 25px 70px rgba(0, 0, 0, 0.95), 0 0 50px rgba(201, 163, 74, 0.1)",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  color: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div style={{ marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Crown size={16} color="#C9A34A" />
                  <span style={{ fontSize: "0.72rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                    ATELIER RENTAL ESCROW STUDIO
                  </span>
                </div>
                <h2
                  className="gold-metallic-text"
                  style={{
                    fontFamily: "var(--font-brand)",
                    fontSize: "1.6rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  Create Rental Plan Tier
                </h2>
              </div>

              {/* Luxury Quick Presets */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: "0.72rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  ⚡ Quick Luxury Presets:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                  {LUXURY_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setNewPlan(preset.data)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "rgba(255,255,255,0.85)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(201, 163, 74, 0.15)";
                        e.currentTarget.style.borderColor = "#C9A34A";
                        e.currentTarget.style.color = "#C9A34A";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                      }}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Inputs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wedding Weekend (3 Days), Royal Gala (5 Days)..."
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px",
                      borderRadius: 10,
                      background: "#1a1a1a",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Duration (Days) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={newPlan.duration_days}
                      onChange={(e) => setNewPlan({ ...newPlan, duration_days: Math.max(1, Number(e.target.value)) })}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Daily Rate (₹/day) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={newPlan.daily_rate}
                      onChange={(e) => setNewPlan({ ...newPlan, daily_rate: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Refundable Security Deposit (₹) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={newPlan.deposit_amount}
                      onChange={(e) => setNewPlan({ ...newPlan, deposit_amount: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#4ade80",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Daily Late Fine (₹/day) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={newPlan.daily_fine_rate}
                      onChange={(e) => setNewPlan({ ...newPlan, daily_fine_rate: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#f87171",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Minor Damage Insurance Assessment (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={250}
                    value={newPlan.damage_fee}
                    onChange={(e) => setNewPlan({ ...newPlan, damage_fee: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px",
                      borderRadius: 10,
                      background: "#1a1a1a",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* ── LIVE CLIENT CHECKOUT SIMULATOR ── */}
                <div
                  style={{
                    background: "rgba(201, 163, 74, 0.08)",
                    border: "1px solid rgba(201, 163, 74, 0.3)",
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Sparkles size={15} color="#C9A34A" />
                    <span style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Live Client Checkout Estimation
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#A3A3A3" }}>
                      <span>Base Rental Fee ({newPlan.duration_days} Days × ₹{newPlan.daily_rate}):</span>
                      <strong style={{ color: "#FFFFFF" }}>₹{(newPlan.duration_days * newPlan.daily_rate).toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#A3A3A3" }}>
                      <span>Refundable Security Escrow:</span>
                      <strong style={{ color: "#4ade80" }}>₹{newPlan.deposit_amount.toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: "0.92rem" }}>
                      <span style={{ fontWeight: 700, color: "#FFFFFF" }}>Total Due at Checkout:</span>
                      <strong style={{ color: "#C9A34A", fontSize: "1.05rem" }}>
                        ₹{((newPlan.duration_days * newPlan.daily_rate) + newPlan.deposit_amount).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: "0.68rem", color: "#888" }}>
                    💡 Client pays ₹{((newPlan.duration_days * newPlan.daily_rate) + newPlan.deposit_amount).toLocaleString("en-IN")}; deposit of ₹{newPlan.deposit_amount.toLocaleString("en-IN")} is returned to original payment source upon damage inspection.
                  </div>
                </div>

                {createError && (
                  <div style={{ fontSize: "0.78rem", color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={14} />
                    <span>{createError}</span>
                  </div>
                )}

                {/* Submit Buttons */}
                <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 10,
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "rgba(255,255,255,0.75)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => createMutation.mutate(newPlan)}
                    disabled={createMutation.isPending || !newPlan.name.trim()}
                    className="btn-rose-primary"
                    style={{
                      flex: 2,
                      padding: "12px",
                      borderRadius: 10,
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: createMutation.isPending || !newPlan.name.trim() ? "not-allowed" : "pointer",
                      opacity: !newPlan.name.trim() ? 0.6 : 1,
                    }}
                  >
                    {createMutation.isPending ? "Creating Tier..." : "Create Rental Plan"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT RENTAL PLAN MODAL ── */}
      <AnimatePresence>
        {editingPlan && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
            onClick={() => setEditingPlan(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="luxury-modal-scroll"
              style={{
                width: "100%",
                maxWidth: 620,
                maxHeight: "92vh",
                overflowY: "auto",
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.35)",
                borderRadius: 20,
                padding: "30px 32px",
                boxShadow: "0 25px 70px rgba(0, 0, 0, 0.95), 0 0 50px rgba(201, 163, 74, 0.1)",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setEditingPlan(null)}
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  color: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div style={{ marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Edit3 size={16} color="#C9A34A" />
                  <span style={{ fontSize: "0.72rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                    MODIFY RENTAL PLAN TIER #{editingPlan.id}
                  </span>
                </div>
                <h2
                  className="gold-metallic-text"
                  style={{
                    fontFamily: "var(--font-brand)",
                    fontSize: "1.6rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  Edit Rental Tier
                </h2>
              </div>

              {/* Form Inputs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px",
                      borderRadius: 10,
                      background: "#1a1a1a",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Duration (Days) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={editFormData.duration_days}
                      onChange={(e) => setEditFormData({ ...editFormData, duration_days: Math.max(1, Number(e.target.value)) })}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Daily Rate (₹/day) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={editFormData.daily_rate}
                      onChange={(e) => setEditFormData({ ...editFormData, daily_rate: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Refundable Security Deposit (₹) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={editFormData.deposit_amount}
                      onChange={(e) => setEditFormData({ ...editFormData, deposit_amount: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#4ade80",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Daily Late Fine (₹/day) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={editFormData.daily_fine_rate}
                      onChange={(e) => setEditFormData({ ...editFormData, daily_fine_rate: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#f87171",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Minor Damage Insurance Assessment (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={250}
                    value={editFormData.damage_fee}
                    onChange={(e) => setEditFormData({ ...editFormData, damage_fee: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px",
                      borderRadius: 10,
                      background: "#1a1a1a",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Live Estimator for Edit */}
                <div
                  style={{
                    background: "rgba(201, 163, 74, 0.08)",
                    border: "1px solid rgba(201, 163, 74, 0.3)",
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Sparkles size={15} color="#C9A34A" />
                    <span style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase" }}>
                      Updated Client Price Breakdown
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#A3A3A3", fontSize: "0.82rem" }}>
                    <span>Base Rent ({editFormData.duration_days} Days × ₹{editFormData.daily_rate}):</span>
                    <strong style={{ color: "#FFFFFF" }}>₹{(editFormData.duration_days * editFormData.daily_rate).toLocaleString("en-IN")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#A3A3A3", fontSize: "0.82rem", marginTop: 4 }}>
                    <span>Refundable Escrow:</span>
                    <strong style={{ color: "#4ade80" }}>₹{editFormData.deposit_amount.toLocaleString("en-IN")}</strong>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "0.92rem" }}>Updated Client Total:</span>
                    <strong style={{ color: "#C9A34A", fontSize: "1.05rem" }}>
                      ₹{((editFormData.duration_days * editFormData.daily_rate) + editFormData.deposit_amount).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>

                {editError && (
                  <div style={{ fontSize: "0.78rem", color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={14} />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 10,
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "rgba(255,255,255,0.75)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateMutation.mutate({
                        id: editingPlan.id,
                        payload: editFormData,
                      })
                    }
                    disabled={updateMutation.isPending || !editFormData.name.trim()}
                    className="btn-rose-primary"
                    style={{
                      flex: 2,
                      padding: "12px",
                      borderRadius: 10,
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: updateMutation.isPending || !editFormData.name.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {updateMutation.isPending ? "Updating Tier..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── LUXURY DELETE / ARCHIVE SAFEGUARD MODAL ── */}
      <AnimatePresence>
        {deletingPlan && (() => {
          const planBookings = getBookingsForPlan(deletingPlan.id);
          const hasBookings = planBookings.length > 0;

          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.85)",
                backdropFilter: "blur(12px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: 20,
              }}
              onClick={() => setDeletingPlan(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{
                  width: "100%",
                  maxWidth: 480,
                  background: "#141414",
                  border: "1.5px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: 16,
                  padding: "32px 28px",
                  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(239, 68, 68, 0.15)",
                  position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setDeletingPlan(null)}
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <X size={18} />
                </button>

                {/* Warning Icon Badge */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1.5px solid rgba(239, 68, 68, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f87171",
                    margin: "0 auto 18px",
                    boxShadow: "0 0 20px rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <Trash2 size={24} />
                </div>

                {/* Title & Description */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      color: "#f87171",
                      textTransform: "uppercase",
                    }}
                  >
                    ARCHIVE RENTAL TIER
                  </span>
                  <h3
                    className="gold-metallic-text"
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: "1.45rem",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      margin: "4px 0 8px",
                      textTransform: "uppercase",
                    }}
                  >
                    Archive "{deletingPlan.name}"?
                  </h3>
                  <p style={{ fontSize: "0.84rem", color: "rgba(255, 255, 255, 0.7)", margin: 0, lineHeight: 1.5 }}>
                    {hasBookings ? (
                      <>
                        This tier is linked to <strong style={{ color: "#C9A34A" }}>{planBookings.length} client booking(s)</strong>. It will be archived so existing client bookings maintain their agreement history, but new clients will no longer be able to select this tier.
                      </>
                    ) : (
                      <>
                        Are you sure you want to archive this rental package ({deletingPlan.duration_days} Days @ ₹{Number(deletingPlan.daily_rate).toLocaleString("en-IN")}/day)?
                      </>
                    )}
                  </p>
                </div>

                {/* Error Banner */}
                {deleteError && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 18,
                      fontSize: "0.78rem",
                      color: "#f87171",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>{deleteError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setDeletingPlan(null)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 10,
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "rgba(255, 255, 255, 0.75)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(deletingPlan.id)}
                    disabled={deleteMutation.isPending}
                    style={{
                      flex: 1.3,
                      padding: "12px",
                      borderRadius: 10,
                      background: "#dc2626",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                    }}
                  >
                    <Trash2 size={15} />
                    {deleteMutation.isPending ? "Archiving..." : "Confirm Archive"}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
