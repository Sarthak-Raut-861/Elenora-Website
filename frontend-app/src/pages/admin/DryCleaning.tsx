import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shirt,
  Send,
  CheckCircle2,
  Check,
  Clock,
  Plus,
  Tag,
  Crown,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X,
  Search,
  Building2,
  Phone,
  MapPin,
  Star,
  ArrowRight,
  ExternalLink,
  Layers,
  AlertTriangle,
  User,
  Mail,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "../../api";
import { useAuth } from "../../auth-context";
import type { DryCleaningRequest, DryCleaner, Asset, DryCleaningPriority } from "../../types";

export function AdminDryCleaningPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // View state
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");

  // Filter state
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cleanerFilter, setCleanerFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority" | "due">("newest");

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [showCleanersModal, setShowCleanersModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Date calculation helper based on care priority
  const calculateExpectedDateForPriority = (priority: DryCleaningPriority): string => {
    const d = new Date();
    let daysToAdd = 3;
    if (priority === "urgent") {
      daysToAdd = 0; // Same-day express
    } else if (priority === "high") {
      daysToAdd = 2; // 24-48 hours
    } else if (priority === "normal") {
      daysToAdd = 3; // 2-3 days
    } else if (priority === "low") {
      daysToAdd = 5;
    }
    d.setDate(d.getDate() + daysToAdd);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Dispatch Form State
  const [dispatchAssetId, setDispatchAssetId] = useState<number | "">("");
  const [dispatchCleanerId, setDispatchCleanerId] = useState<number | "">("");
  const [dispatchPriority, setDispatchPriority] = useState<DryCleaningPriority>("normal");
  const [dispatchExpectedBy, setDispatchExpectedBy] = useState<string>(() => calculateExpectedDateForPriority("normal"));
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const handlePriorityChange = (priority: DryCleaningPriority) => {
    setDispatchPriority(priority);
    setDispatchExpectedBy(calculateExpectedDateForPriority(priority));
  };

  const openDispatchModal = () => {
    setDispatchAssetId("");
    setDispatchNotes("");
    setDispatchPriority("normal");
    setDispatchExpectedBy(calculateExpectedDateForPriority("normal"));
    setDispatchError(null);
    setShowDispatchModal(true);
  };

  // Complete Cleaning Modal State
  const [completingRequest, setCompletingRequest] = useState<DryCleaningRequest | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionCost, setCompletionCost] = useState<number | "">(450);
  const [completionRating, setCompletionRating] = useState<number>(5);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // New Cleaner Partner Modal State
  const [showAddCleanerModal, setShowAddCleanerModal] = useState(false);
  const [newCleanerName, setNewCleanerName] = useState("");
  const [newCleanerContact, setNewCleanerContact] = useState("");
  const [newCleanerPhone, setNewCleanerPhone] = useState("");
  const [newCleanerEmail, setNewCleanerEmail] = useState("");
  const [newCleanerAddress, setNewCleanerAddress] = useState("");

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Queries
  const { data: requests = [], isLoading: isLoadingRequests } = useQuery<DryCleaningRequest[]>({
    queryKey: ["admin-dry-cleaning", token],
    queryFn: () => api.listDryCleaningRequests(token!),
    enabled: Boolean(token),
  });

  const { data: cleaners = [] } = useQuery<DryCleaner[]>({
    queryKey: ["admin-cleaners", token],
    queryFn: () => api.listDryCleaners(token!),
    enabled: Boolean(token),
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["admin-assets", token],
    queryFn: () => api.listAssetsFiltered(token),
    enabled: Boolean(token),
  });

  // Mutations
  const dispatchMutation = useMutation({
    mutationFn: (payload: {
      asset_id: number;
      dry_cleaner_id?: number;
      dry_cleaner_name?: string;
      priority: string;
      expected_by?: string;
      notes?: string;
    }) => api.sendToDryCleaner(token!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dry-cleaning"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setShowDispatchModal(false);
      setDispatchAssetId("");
      setDispatchNotes("");
      setDispatchError(null);
      showToast("Garment dispatched to sanitization & dry-cleaning successfully!");
    },
    onError: (err: any) => {
      setDispatchError(err?.message || "Failed to dispatch garment");
    },
  });

  const startMutation = useMutation({
    mutationFn: (requestId: number) => api.startCleaning(token!, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dry-cleaning"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      showToast("Sanitization cycle started — garment is now in active treatment");
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: number;
      payload: { cleaner_notes?: string; actual_cost?: number; rating?: number };
    }) => api.markCleaningDone(token!, requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dry-cleaning"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setCompletingRequest(null);
      setCompleteError(null);
      showToast("Sterilization verified! Piece is restored to active vault stock.");
    },
    onError: (err: any) => {
      setCompleteError(err?.message || "Failed to complete cleaning");
    },
  });

  const createCleanerMutation = useMutation({
    mutationFn: (payload: Partial<DryCleaner> & { name: string }) =>
      api.createDryCleaner(token!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cleaners"] });
      setShowAddCleanerModal(false);
      setNewCleanerName("");
      setNewCleanerContact("");
      setNewCleanerPhone("");
      setNewCleanerEmail("");
      setNewCleanerAddress("");
      showToast("New certified fabric care partner registered!");
    },
  });

  // Batch Handoff Action
  const handleBatchHandoff = async () => {
    const pendingToHandoff = selectedIds.filter((id) => {
      const r = requests.find((req) => req.id === id);
      return r && r.status === "pending";
    });

    if (pendingToHandoff.length === 0) {
      showToast("None of the selected pieces are in 'Pending Handoff' status.");
      return;
    }

    setIsBatchProcessing(true);
    try {
      await Promise.all(pendingToHandoff.map((id) => api.startCleaning(token!, id)));
      queryClient.invalidateQueries({ queryKey: ["admin-dry-cleaning"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      setSelectedIds([]);
      showToast(`Batch dispatch success: ${pendingToHandoff.length} pieces moved to active treatment!`);
    } catch (err: any) {
      showToast(err?.message || "Batch dispatch error occurred");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Accurate Mutually Exclusive Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const activeCount = requests.filter((r) => (r.status === "in_progress" || r.status === "sent")).length;
  const completedCount = requests.filter((r) => r.status === "completed").length;
  const inCareCount = pendingCount + activeCount;
  const vaultAvailabilityPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  // Filter & Sort
  const filteredAndSortedRequests = useMemo(() => {
    let result = requests.filter((r) => {
      const isCompleted = r.status === "completed";
      const isInProgress = (r.status === "in_progress" || r.status === "sent") && !isCompleted;
      const isPending = r.status === "pending" && !isCompleted && !isInProgress;

      if (activeTab === "pending" && !isPending) return false;
      if (activeTab === "in_progress" && !isInProgress) return false;
      if (activeTab === "completed" && !isCompleted) return false;

      if (cleanerFilter !== "all") {
        if (cleanerFilter === "unassigned" && r.dry_cleaner_id) return false;
        if (cleanerFilter !== "unassigned") {
          const matchId = String(r.dry_cleaner_id) === cleanerFilter;
          const matchName = r.dry_cleaner_name === cleanerFilter;
          if (!matchId && !matchName) return false;
        }
      }

      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const asset = assets.find((a) => a.id === r.asset_id);
        const matchId = r.id.toString().includes(term) || `#${r.id}`.includes(term);
        const matchAsset = (asset?.name && asset.name.toLowerCase().includes(term)) ||
          (asset?.asset_code && asset.asset_code.toLowerCase().includes(term));
        const matchCleaner = r.dry_cleaner_name && r.dry_cleaner_name.toLowerCase().includes(term);
        const matchNotes = r.notes && r.notes.toLowerCase().includes(term);
        if (!matchId && !matchAsset && !matchCleaner && !matchNotes) return false;
      }

      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "newest") return b.id - a.id;
      if (sortBy === "oldest") return a.id - b.id;
      if (sortBy === "priority") {
        const pRank: Record<string, number> = { urgent: 3, high: 2, normal: 1, low: 0 };
        return (pRank[b.priority || "normal"] || 0) - (pRank[a.priority || "normal"] || 0);
      }
      if (sortBy === "due") {
        if (!a.expected_by) return 1;
        if (!b.expected_by) return -1;
        return new Date(a.expected_by).getTime() - new Date(b.expected_by).getTime();
      }
      return b.id - a.id;
    });

    return result;
  }, [requests, activeTab, cleanerFilter, priorityFilter, searchTerm, sortBy, assets]);

  // Pagination calculation
  const totalItems = filteredAndSortedRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRequests = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAndSortedRequests.slice(start, start + pageSize);
  }, [filteredAndSortedRequests, safeCurrentPage, pageSize]);

  // Selection helpers
  const isAllPageSelected =
    paginatedRequests.length > 0 &&
    paginatedRequests.every((r) => selectedIds.includes(r.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedRequests.some((r) => r.id === id)));
    } else {
      const pageIds = paginatedRequests.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const pendingSelectedCount = selectedIds.filter((id) => {
    const r = requests.find((req) => req.id === id);
    return r && r.status === "pending";
  }).length;

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchAssetId) {
      setDispatchError("Please select a garment from the vault");
      return;
    }
    const cleaner = cleaners.find((c) => c.id === Number(dispatchCleanerId));
    dispatchMutation.mutate({
      asset_id: Number(dispatchAssetId),
      dry_cleaner_id: cleaner?.id,
      dry_cleaner_name: cleaner?.name || "Atelier Royal Dry Care",
      priority: dispatchPriority,
      expected_by: dispatchExpectedBy || undefined,
      notes: dispatchNotes || undefined,
    });
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRequest) return;
    completeMutation.mutate({
      requestId: completingRequest.id,
      payload: {
        cleaner_notes: completionNotes || undefined,
        actual_cost: completionCost ? Number(completionCost) : undefined,
        rating: completionRating,
      },
    });
  };

  const handleCreateCleanerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCleanerName.trim()) return;
    createCleanerMutation.mutate({
      name: newCleanerName.trim(),
      contact_person: newCleanerContact.trim() || null,
      phone: newCleanerPhone.trim() || null,
      email: newCleanerEmail.trim() || null,
      address: newCleanerAddress.trim() || null,
      turnaround_days: 2,
    });
  };

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1280, margin: "0 auto", color: "#FFFFFF" }}>

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
            <CheckCircle2 size={18} color="#C9A34A" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 26,
          flexWrap: "wrap",
          gap: 18,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Shirt size={18} color="#C9A34A" />
            <span
              style={{
                fontSize: "0.75rem",
                color: "#C9A34A",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Atelier Fabric Care & Sanitization Command
            </span>
          </div>
          <h1
            className="gold-metallic-text"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "2.3rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Laundry & Care Dispatch
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.88rem", marginTop: 4, maxWidth: 640 }}>
            Dispatch vault couture to certified fabric partners, track ozone sterilization cycles, and
            verify returned pieces to restore immediate vault availability.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowCleanersModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 18px",
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "rgba(255, 255, 255, 0.85)",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(201, 163, 74, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
            }}
          >
            <Building2 size={16} color="#C9A34A" />
            Partner Cleaners ({cleaners.length})
          </button>

          <button
            type="button"
            onClick={openDispatchModal}
            className="btn-rose-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 22px",
              borderRadius: 10,
              fontSize: "0.86rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 4px 18px rgba(201, 163, 74, 0.25)",
            }}
          >
            <Send size={16} />
            + Dispatch Piece to Cleaning
          </button>
        </div>
      </div>

      {/* ── METRICS BANNER ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginBottom: 20 }}>
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
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Dispatches</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#FFFFFF" }}>{totalCount} Total Logged</div>
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
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Awaiting Handoff</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: pendingCount > 0 ? "#f59e0b" : "#FFFFFF" }}>
              {pendingCount} Pending Dispatch
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
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(235, 137, 164, 0.12)", border: "1px solid rgba(235, 137, 164, 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shirt size={20} color="#EB89A4" />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active Treatment</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: activeCount > 0 ? "#EB89A4" : "#FFFFFF" }}>
              {activeCount} In Ozone Care
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
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Restored to Vault</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#4ade80" }}>{completedCount} Available Stock</div>
          </div>
        </div>
      </div>

      {/* ── CARE CAPACITY LOAD GAUGE ── */}
      <div
        style={{
          background: "linear-gradient(145deg, #181818 0%, #121212 100%)",
          border: "1px solid rgba(201, 163, 74, 0.2)",
          borderRadius: 12,
          padding: "14px 20px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkles size={16} color="#C9A34A" />
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF" }}>
            Vault Availability Ratio:
          </span>
          <span style={{ fontSize: "0.82rem", color: "#4ade80", fontWeight: 700 }}>
            {vaultAvailabilityPct}% Ready in Vault
          </span>
          <span style={{ color: "#666", fontSize: "0.75rem" }}>•</span>
          <span style={{ fontSize: "0.78rem", color: inCareCount > 0 ? "#f59e0b" : "#888" }}>
            {inCareCount} piece{inCareCount === 1 ? "" : "s"} undergoing active fabric maintenance
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ minWidth: 220, flex: 1, maxWidth: 360 }}>
          <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 9999, overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${vaultAvailabilityPct}%`, background: "linear-gradient(90deg, #22c55e, #4ade80)", height: "100%", transition: "width 0.4s ease" }} />
            <div style={{ width: `${100 - vaultAvailabilityPct}%`, background: "linear-gradient(90deg, #f59e0b, #eb89a4)", height: "100%", transition: "width 0.4s ease" }} />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: TABS, FILTERS, SEARCH & VIEW TOGGLE ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        {/* Top Toolbar Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", gap: 6, background: "#141414", padding: "4px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
            {[
              { id: "all", label: "All Cycles", count: totalCount },
              { id: "pending", label: "Pending Handoff", count: pendingCount },
              { id: "in_progress", label: "In Treatment", count: activeCount },
              { id: "completed", label: "Restored Vault", count: completedCount },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? "rgba(201, 163, 74, 0.18)" : "transparent",
                    color: isSelected ? "#C9A34A" : "rgba(255,255,255,0.65)",
                    border: isSelected ? "1px solid rgba(201, 163, 74, 0.4)" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {tab.label}
                  <span
                    style={{
                      fontSize: "0.68rem",
                      padding: "1px 6px",
                      borderRadius: 9999,
                      background: isSelected ? "rgba(201, 163, 74, 0.3)" : "rgba(255,255,255,0.08)",
                      color: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle (Table vs Kanban Pipeline) */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#141414", padding: "4px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: "0.78rem",
                fontWeight: viewMode === "table" ? 700 : 500,
                background: viewMode === "table" ? "rgba(201, 163, 74, 0.18)" : "transparent",
                color: viewMode === "table" ? "#C9A34A" : "rgba(255,255,255,0.6)",
                border: viewMode === "table" ? "1px solid rgba(201, 163, 74, 0.4)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title="Detailed Ledger Table"
            >
              <List size={14} /> Ledger Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("pipeline")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: "0.78rem",
                fontWeight: viewMode === "pipeline" ? 700 : 500,
                background: viewMode === "pipeline" ? "rgba(201, 163, 74, 0.18)" : "transparent",
                color: viewMode === "pipeline" ? "#C9A34A" : "rgba(255,255,255,0.6)",
                border: viewMode === "pipeline" ? "1px solid rgba(201, 163, 74, 0.4)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title="Visual Kanban Pipeline Board"
            >
              <LayoutGrid size={14} /> Care Pipeline Board
            </button>
          </div>
        </div>

        {/* Second Toolbar Row: Filters, Search, Sorters */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Quick Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Cleaner Partner Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#141414", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px" }}>
              <Building2 size={13} color="#C9A34A" />
              <select
                value={cleanerFilter}
                onChange={(e) => {
                  setCleanerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ background: "transparent", border: "none", color: "#FFFFFF", fontSize: "0.78rem", outline: "none", cursor: "pointer" }}
              >
                <option value="all" style={{ background: "#1a1a1a" }}>All Cleaners ({cleaners.length})</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={String(c.id)} style={{ background: "#1a1a1a" }}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#141414", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px" }}>
              <Filter size={13} color="#C9A34A" />
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ background: "transparent", border: "none", color: "#FFFFFF", fontSize: "0.78rem", outline: "none", cursor: "pointer" }}
              >
                <option value="all" style={{ background: "#1a1a1a" }}>All Priorities</option>
                <option value="urgent" style={{ background: "#1a1a1a" }}>Urgent Priority</option>
                <option value="high" style={{ background: "#1a1a1a" }}>High Priority</option>
                <option value="normal" style={{ background: "#1a1a1a" }}>Normal Priority</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#141414", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px" }}>
              <ArrowUpDown size={13} color="#C9A34A" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{ background: "transparent", border: "none", color: "#FFFFFF", fontSize: "0.78rem", outline: "none", cursor: "pointer" }}
              >
                <option value="newest" style={{ background: "#1a1a1a" }}>Newest First</option>
                <option value="oldest" style={{ background: "#1a1a1a" }}>Oldest First</option>
                <option value="priority" style={{ background: "#1a1a1a" }}>Priority (Urgent First)</option>
                <option value="due" style={{ background: "#1a1a1a" }}>Return Due Date</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", minWidth: 260, flex: 1, maxWidth: 360 }}>
            <Search
              size={15}
              color="#888"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search by Request #, Asset code, Partner..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 14px 8px 36px",
                borderRadius: 8,
                background: "#141414",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#FFFFFF",
                fontSize: "0.82rem",
                outline: "none",
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: 10,
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
        </div>
      </div>

      {/* ── BATCH SELECTION FLOATING ACTION BAR ── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            style={{
              background: "linear-gradient(135deg, #1c1c1c 0%, #121212 100%)",
              border: "1.5px solid #C9A34A",
              borderRadius: 12,
              padding: "12px 20px",
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 25px rgba(201, 163, 74, 0.2)",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckSquare size={18} color="#C9A34A" />
              <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#FFFFFF" }}>
                {selectedIds.length} Piece{selectedIds.length === 1 ? "" : "s"} Selected
              </span>
              {pendingSelectedCount > 0 && (
                <span style={{ fontSize: "0.75rem", color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "2px 8px", borderRadius: 9999 }}>
                  {pendingSelectedCount} ready for handoff
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {pendingSelectedCount > 0 && (
                <button
                  type="button"
                  onClick={handleBatchHandoff}
                  disabled={isBatchProcessing}
                  className="btn-rose-primary"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: isBatchProcessing ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Send size={13} />
                  {isBatchProcessing ? "Dispatching..." : `Batch Handoff (${pendingSelectedCount}) to Cleaners`}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#FFFFFF",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Deselect All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 1: DETAILED LEDGER TABLE VIEW (PAGINATED & COMPACT)
         ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "table" && (
        <div
          style={{
            background: "#141414",
            borderRadius: 16,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.75)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#171717", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  {/* Select All */}
                  <th style={{ padding: "14px 16px", width: 44, textAlign: "center" }}>
                    <div
                      onClick={toggleSelectAllPage}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: isAllPageSelected ? "1.5px solid #C9A34A" : "1.5px solid rgba(255, 255, 255, 0.25)",
                        background: isAllPageSelected ? "rgba(201, 163, 74, 0.2)" : "rgba(255, 255, 255, 0.03)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title="Select all on this page"
                    >
                      {isAllPageSelected && <Check size={12} color="#C9A34A" strokeWidth={3} />}
                    </div>
                  </th>
                  <th style={{ padding: "14px 16px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, width: 85 }}>
                    DISPATCH ID
                  </th>
                  <th style={{ padding: "14px 16px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, minWidth: 260 }}>
                    VAULT GARMENT
                  </th>
                  <th style={{ padding: "14px 16px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, minWidth: 210 }}>
                    FABRIC CARE PARTNER
                  </th>
                  <th style={{ padding: "14px 16px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, minWidth: 160 }}>
                    CARE TIMELINE
                  </th>
                  <th style={{ padding: "14px 16px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, minWidth: 160 }}>
                    VAULT STATUS
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, textAlign: "right", minWidth: 140 }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRequests ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "#888" }}>
                      Loading atelier sanitization ledger...
                    </td>
                  </tr>
                ) : paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>
                      No care dispatch requests found matching the current filters. Click &ldquo;+ Dispatch Piece to Cleaning&rdquo; to log one.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((r) => {
                    const asset = assets.find((a) => a.id === r.asset_id);
                    const isCompleted = r.status === "completed";
                    const isInProgress = (r.status === "in_progress" || r.status === "sent") && !isCompleted;
                    const isPending = r.status === "pending" && !isCompleted && !isInProgress;
                    const isSelected = selectedIds.includes(r.id);

                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          background: isSelected ? "rgba(201, 163, 74, 0.06)" : "transparent",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: "12px 16px", textAlign: "center", verticalAlign: "middle" }}>
                          <div
                            onClick={() => toggleSelectOne(r.id)}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 5,
                              border: isSelected ? "1.5px solid #C9A34A" : "1.5px solid rgba(255, 255, 255, 0.22)",
                              background: isSelected ? "rgba(201, 163, 74, 0.2)" : "rgba(255, 255, 255, 0.03)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {isSelected && <Check size={12} color="#C9A34A" strokeWidth={3} />}
                          </div>
                        </td>

                        {/* ID */}
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: "rgba(201, 163, 74, 0.1)",
                              border: "1px solid rgba(201, 163, 74, 0.25)",
                              color: "#E2C375",
                              fontSize: "0.78rem",
                              fontFamily: "monospace",
                              fontWeight: 700,
                            }}
                          >
                            #{r.id}
                          </span>
                        </td>

                        {/* Asset details */}
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <img
                              src={asset?.image_url || "/elanora-emblem.png"}
                              alt={asset?.name || "Vault Asset"}
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                objectFit: "cover",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                background: "#1c1c1c",
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: "0.9rem",
                                  fontWeight: 600,
                                  color: "#FFFFFF",
                                  display: "block",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: 240,
                                }}
                                title={asset?.name}
                              >
                                {asset?.name || `Asset #${r.asset_id}`}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#C9A34A",
                                  fontFamily: "monospace",
                                  fontWeight: 600,
                                  letterSpacing: "0.04em",
                                  display: "inline-block",
                                  marginTop: 1,
                                }}
                              >
                                {asset?.asset_code || `ID: ${r.asset_id}`}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Partner Cleaner */}
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Building2 size={13} color="#C9A34A" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#FFFFFF" }}>
                                {r.dry_cleaner_name || "Atelier Royal Dry Care"}
                              </span>
                            </div>
                            {r.notes ? (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "rgba(255, 255, 255, 0.6)",
                                  marginTop: 4,
                                  background: "rgba(255, 255, 255, 0.03)",
                                  border: "1px solid rgba(255, 255, 255, 0.06)",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  display: "inline-block",
                                  maxWidth: 220,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={r.notes}
                              >
                                Note: {r.notes}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.7rem", color: "rgba(255, 255, 255, 0.35)", marginTop: 2, display: "block" }}>
                                Routine inspection
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Priority & Expected Date */}
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 9999,
                                width: "fit-content",
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                textTransform: "capitalize",
                                background:
                                  r.priority === "urgent"
                                    ? "rgba(239, 68, 68, 0.12)"
                                    : r.priority === "high"
                                    ? "rgba(245, 158, 11, 0.12)"
                                    : "rgba(201, 163, 74, 0.1)",
                                color:
                                  r.priority === "urgent"
                                    ? "#f87171"
                                    : r.priority === "high"
                                    ? "#f59e0b"
                                    : "#E2C375",
                                border:
                                  r.priority === "urgent"
                                    ? "1px solid rgba(239, 68, 68, 0.28)"
                                    : r.priority === "high"
                                    ? "1px solid rgba(245, 158, 11, 0.28)"
                                    : "1px solid rgba(201, 163, 74, 0.25)",
                              }}
                            >
                              <span style={{ fontSize: "0.6rem" }}>●</span> {r.priority === "urgent" ? "Express Same-Day" : r.priority === "high" ? "High Priority" : "Standard Care"}
                            </span>
                            {r.expected_by && (
                              <span style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.55)", display: "flex", alignItems: "center", gap: 4 }}>
                                <Clock size={11} color="#C9A34A" /> Due {r.expected_by}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 10px",
                              borderRadius: 9999,
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              background: isCompleted
                                ? "rgba(34, 197, 94, 0.1)"
                                : isInProgress
                                ? "rgba(235, 137, 164, 0.12)"
                                : "rgba(245, 158, 11, 0.1)",
                              color: isCompleted
                                ? "#4ade80"
                                : isInProgress
                                ? "#EB89A4"
                                : "#f59e0b",
                              border: isCompleted
                                ? "1px solid rgba(34, 197, 94, 0.25)"
                                : isInProgress
                                ? "1px solid rgba(235, 137, 164, 0.25)"
                                : "1px solid rgba(245, 158, 11, 0.25)",
                            }}
                          >
                            {isCompleted && <CheckCircle2 size={12} />}
                            {isInProgress && <Shirt size={12} />}
                            {isPending && <Clock size={12} />}
                            {isCompleted ? "Restored to Stock" : isInProgress ? "In Ozone Wash" : "Awaiting Handoff"}
                          </span>
                        </td>

                        {/* Workflow Actions */}
                        <td style={{ padding: "12px 18px", textAlign: "right", verticalAlign: "middle" }}>
                          <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => startMutation.mutate(r.id)}
                                disabled={startMutation.isPending}
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: 8,
                                  background: "rgba(201, 163, 74, 0.12)",
                                  border: "1px solid rgba(201, 163, 74, 0.35)",
                                  color: "#E2C375",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(201, 163, 74, 0.22)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(201, 163, 74, 0.12)";
                                }}
                              >
                                <Send size={12} />
                                Handoff
                              </button>
                            )}

                            {isInProgress && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCompletingRequest(r);
                                  setCompletionNotes("");
                                  setCompletionCost(450);
                                  setCompleteError(null);
                                }}
                                className="btn-rose-primary"
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: 8,
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                <CheckCircle2 size={12} />
                                Verify & Restock
                              </button>
                            )}

                            {isCompleted && (
                              <span
                                style={{
                                  fontSize: "0.73rem",
                                  color: "rgba(255, 255, 255, 0.5)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  background: "rgba(255, 255, 255, 0.03)",
                                  border: "1px solid rgba(255, 255, 255, 0.06)",
                                }}
                              >
                                <ShieldCheck size={13} color="#4ade80" />
                                Available
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION CONTROLS ── */}
          <div
            style={{
              padding: "14px 20px",
              background: "#181818",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ fontSize: "0.78rem", color: "#888" }}>
              Showing <strong style={{ color: "#FFF" }}>{totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}</strong> to{" "}
              <strong style={{ color: "#FFF" }}>{Math.min(safeCurrentPage * pageSize, totalItems)}</strong> of{" "}
              <strong style={{ color: "#C9A34A" }}>{totalItems}</strong> entries
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Rows per page */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#888" }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    background: "#121212",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 6,
                    color: "#FFF",
                    padding: "3px 8px",
                    fontSize: "0.76rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: safeCurrentPage <= 1 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: safeCurrentPage <= 1 ? "rgba(255,255,255,0.2)" : "#FFF",
                    cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <span style={{ fontSize: "0.78rem", color: "#C9A34A", fontWeight: 700, padding: "0 6px" }}>
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: safeCurrentPage >= totalPages ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: safeCurrentPage >= totalPages ? "rgba(255,255,255,0.2)" : "#FFF",
                    cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 2: CARE PIPELINE BOARD (KANBAN 3-LANE VISUAL WORKFLOW)
         ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "pipeline" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {/* LANE 1: AWAITING HANDOFF */}
          <div
            style={{
              background: "#141414",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: 16,
              padding: "18px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Lane Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} color="#f59e0b" />
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#f59e0b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Awaiting Handoff
                </h3>
              </div>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, padding: "2px 9px", borderRadius: 9999, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                {filteredAndSortedRequests.filter((r) => r.status === "pending").length}
              </span>
            </div>

            {/* Lane Cards */}
            <div className="luxury-modal-scroll" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
              {filteredAndSortedRequests.filter((r) => r.status === "pending").length === 0 ? (
                <div style={{ padding: "36px 14px", textAlign: "center", color: "#666", fontSize: "0.8rem", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10 }}>
                  No garments waiting for cleaner pickup.
                </div>
              ) : (
                filteredAndSortedRequests
                  .filter((r) => r.status === "pending")
                  .map((r) => {
                    const asset = assets.find((a) => a.id === r.asset_id);
                    return (
                      <div
                        key={r.id}
                        style={{
                          background: "#1a1a1a",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                        }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <img
                            src={asset?.image_url || "/elanora-emblem.png"}
                            alt={asset?.name}
                            style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: "0.68rem", color: "#C9A34A", fontFamily: "monospace", fontWeight: 700 }}>
                              #{r.id} • {asset?.asset_code || `Asset #${r.asset_id}`}
                            </span>
                            <h4 style={{ fontSize: "0.88rem", fontWeight: 600, color: "#FFF", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {asset?.name || `Vault Garment #${r.asset_id}`}
                            </h4>
                          </div>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Building2 size={12} color="#C9A34A" />
                          <span>{r.dry_cleaner_name || "Atelier Royal Dry Care"}</span>
                        </div>

                        {r.notes && (
                          <div style={{ fontSize: "0.72rem", color: "#888", background: "rgba(255,255,255,0.03)", padding: "4px 8px", borderRadius: 6 }}>
                            {r.notes}
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                          <span style={{ fontSize: "0.66rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", textTransform: "uppercase" }}>
                            {r.priority}
                          </span>

                          <button
                            type="button"
                            onClick={() => startMutation.mutate(r.id)}
                            disabled={startMutation.isPending}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              background: "rgba(201, 163, 74, 0.15)",
                              border: "1px solid rgba(201, 163, 74, 0.4)",
                              color: "#C9A34A",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Send size={12} /> Handoff
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* LANE 2: IN OZONE TREATMENT */}
          <div
            style={{
              background: "#141414",
              border: "1px solid rgba(235, 137, 164, 0.25)",
              borderRadius: 16,
              padding: "18px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Lane Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Shirt size={16} color="#EB89A4" />
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#EB89A4", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  In Ozone Treatment
                </h3>
              </div>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, padding: "2px 9px", borderRadius: 9999, background: "rgba(235, 137, 164, 0.15)", color: "#EB89A4", border: "1px solid rgba(235, 137, 164, 0.3)" }}>
                {filteredAndSortedRequests.filter((r) => (r.status === "in_progress" || r.status === "sent")).length}
              </span>
            </div>

            {/* Lane Cards */}
            <div className="luxury-modal-scroll" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
              {filteredAndSortedRequests.filter((r) => (r.status === "in_progress" || r.status === "sent")).length === 0 ? (
                <div style={{ padding: "36px 14px", textAlign: "center", color: "#666", fontSize: "0.8rem", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10 }}>
                  No garments currently undergoing ozone wash.
                </div>
              ) : (
                filteredAndSortedRequests
                  .filter((r) => (r.status === "in_progress" || r.status === "sent"))
                  .map((r) => {
                    const asset = assets.find((a) => a.id === r.asset_id);
                    return (
                      <div
                        key={r.id}
                        style={{
                          background: "#1a1a1a",
                          border: "1px solid rgba(235, 137, 164, 0.2)",
                          borderRadius: 12,
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                        }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <img
                            src={asset?.image_url || "/elanora-emblem.png"}
                            alt={asset?.name}
                            style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: "0.68rem", color: "#EB89A4", fontFamily: "monospace", fontWeight: 700 }}>
                              #{r.id} • {asset?.asset_code || `Asset #${r.asset_id}`}
                            </span>
                            <h4 style={{ fontSize: "0.88rem", fontWeight: 600, color: "#FFF", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {asset?.name || `Vault Garment #${r.asset_id}`}
                            </h4>
                          </div>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Building2 size={12} color="#C9A34A" />
                          <span>{r.dry_cleaner_name || "Atelier Royal Dry Care"}</span>
                        </div>

                        {r.expected_by && (
                          <div style={{ fontSize: "0.72rem", color: "#EB89A4", display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} /> Return by {r.expected_by}
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                          <span style={{ fontSize: "0.66rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(235, 137, 164, 0.15)", color: "#EB89A4", textTransform: "uppercase" }}>
                            {r.priority}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setCompletingRequest(r);
                              setCompletionNotes("");
                              setCompletionCost(450);
                              setCompleteError(null);
                            }}
                            className="btn-rose-primary"
                            style={{
                              padding: "6px 14px",
                              borderRadius: 6,
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <CheckCircle2 size={12} /> Verify & Restock
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* LANE 3: RESTORED TO VAULT */}
          <div
            style={{
              background: "#141414",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              borderRadius: 16,
              padding: "18px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Lane Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} color="#4ade80" />
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#4ade80", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Restored to Vault
                </h3>
              </div>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, padding: "2px 9px", borderRadius: 9999, background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
                {filteredAndSortedRequests.filter((r) => r.status === "completed").length}
              </span>
            </div>

            {/* Lane Cards */}
            <div className="luxury-modal-scroll" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
              {filteredAndSortedRequests.filter((r) => r.status === "completed").length === 0 ? (
                <div style={{ padding: "36px 14px", textAlign: "center", color: "#666", fontSize: "0.8rem", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10 }}>
                  No completed care records found.
                </div>
              ) : (
                filteredAndSortedRequests
                  .filter((r) => r.status === "completed")
                  .map((r) => {
                    const asset = assets.find((a) => a.id === r.asset_id);
                    return (
                      <div
                        key={r.id}
                        style={{
                          background: "#1a1a1a",
                          border: "1px solid rgba(34, 197, 94, 0.18)",
                          borderRadius: 12,
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                        }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <img
                            src={asset?.image_url || "/elanora-emblem.png"}
                            alt={asset?.name}
                            style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: "0.68rem", color: "#4ade80", fontFamily: "monospace", fontWeight: 700 }}>
                              #{r.id} • {asset?.asset_code || `Asset #${r.asset_id}`}
                            </span>
                            <h4 style={{ fontSize: "0.88rem", fontWeight: 600, color: "#FFF", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {asset?.name || `Vault Garment #${r.asset_id}`}
                            </h4>
                          </div>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Building2 size={12} color="#C9A34A" />
                          <span>{r.dry_cleaner_name || "Atelier Royal Dry Care"}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                          <span style={{ fontSize: "0.72rem", color: "#4ade80", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                            <ShieldCheck size={13} color="#4ade80" /> In Vault Stock
                          </span>

                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                            Restored
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DISPATCH VAULT PIECE TO CLEANING MODAL ── */}
      <AnimatePresence>
        {showDispatchModal && (
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
            onClick={() => setShowDispatchModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="luxury-modal-scroll"
              style={{
                width: "100%",
                maxWidth: 580,
                maxHeight: "90vh",
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
                onClick={() => setShowDispatchModal(false)}
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

              <div style={{ marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Shirt size={16} color="#C9A34A" />
                  <span style={{ fontSize: "0.72rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                    VAULT DISPATCH STUDIO
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
                  Dispatch Piece to Sanitization
                </h2>
              </div>

              <form onSubmit={handleDispatchSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Asset Selector */}
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Select Vault Couture Piece *
                    </label>
                    <select
                      value={dispatchAssetId}
                      onChange={(e) => setDispatchAssetId(e.target.value ? Number(e.target.value) : "")}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                    >
                      <option value="">-- Choose garment to dispatch --</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.asset_code}) — Status: {a.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Partner Cleaner Selector */}
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Certified Cleaning Partner
                    </label>
                    <select
                      value={dispatchCleanerId}
                      onChange={(e) => setDispatchCleanerId(e.target.value ? Number(e.target.value) : "")}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                    >
                      <option value="">Atelier Royal Dry Care (Default Partner)</option>
                      {cleaners.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.phone || "Partner"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {/* Priority */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Care Priority
                        </label>
                        <span style={{ fontSize: "0.68rem", color: "#f59e0b" }}>
                          Auto-sets date
                        </span>
                      </div>
                      <select
                        value={dispatchPriority}
                        onChange={(e) => handlePriorityChange(e.target.value as any)}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: 10,
                          background: "#1a1a1a",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#FFFFFF",
                          fontSize: "0.9rem",
                          outline: "none",
                        }}
                      >
                        <option value="normal">Normal (2-3 Days)</option>
                        <option value="high">High (24-48 Hours)</option>
                        <option value="urgent">Urgent / Express Same-Day</option>
                      </select>
                    </div>

                    {/* Expected By */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Expected Return Date
                        </label>
                        <span style={{ fontSize: "0.68rem", color: "#4ade80" }}>
                          {dispatchPriority === "urgent" ? "Same Day" : dispatchPriority === "high" ? "+2 Days" : "+3 Days"}
                        </span>
                      </div>
                      <input
                        type="date"
                        value={dispatchExpectedBy}
                        onChange={(e) => setDispatchExpectedBy(e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "#1a1a1a",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#FFFFFF",
                          fontSize: "0.88rem",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Care Notes */}
                  <div>
                    <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                      Fabric Instructions & Stain Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Delicate Zardozi threadwork, gentle ozone wash only, steam press hem..."
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "0.88rem",
                        outline: "none",
                        lineHeight: 1.5,
                      }}
                    />
                  </div>

                  {dispatchError && (
                    <div style={{ fontSize: "0.78rem", color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangle size={14} />
                      <span>{dispatchError}</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <button
                      type="button"
                      onClick={() => setShowDispatchModal(false)}
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
                      type="submit"
                      disabled={dispatchMutation.isPending || !dispatchAssetId}
                      className="btn-rose-primary"
                      style={{
                        flex: 2,
                        padding: "12px",
                        borderRadius: 10,
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: dispatchMutation.isPending || !dispatchAssetId ? "not-allowed" : "pointer",
                        opacity: !dispatchAssetId ? 0.6 : 1,
                      }}
                    >
                      {dispatchMutation.isPending ? "Dispatching..." : "Dispatch Garment"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── VERIFY & RESTORE TO VAULT MODAL ── */}
      <AnimatePresence>
        {completingRequest && (() => {
          const asset = assets.find((a) => a.id === completingRequest.asset_id);

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
              onClick={() => setCompletingRequest(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 15 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                style={{
                  width: "100%",
                  maxWidth: 480,
                  background: "#141414",
                  border: "1.5px solid rgba(34, 197, 94, 0.4)",
                  borderRadius: 16,
                  padding: "30px 28px",
                  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(34, 197, 94, 0.15)",
                  position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setCompletingRequest(null)}
                  style={{
                    position: "absolute",
                    top: 18,
                    right: 18,
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "rgba(34, 197, 94, 0.12)",
                      border: "1.5px solid rgba(34, 197, 94, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4ade80",
                      margin: "0 auto 16px",
                      boxShadow: "0 0 20px rgba(34, 197, 94, 0.2)",
                    }}
                  >
                    <ShieldCheck size={26} />
                  </div>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.2em", color: "#4ade80", textTransform: "uppercase" }}>
                    QUALITY SANITIZATION AUDIT
                  </span>
                  <h3
                    className="gold-metallic-text"
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: "1.45rem",
                      fontWeight: 600,
                      margin: "4px 0 6px",
                      textTransform: "uppercase",
                    }}
                  >
                    Restore to Active Vault?
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.7)", margin: 0 }}>
                    Confirm that <strong style={{ color: "#FFFFFF" }}>{asset?.name || `Asset #${completingRequest.asset_id}`}</strong> has been inspected, sanitized, and is ready for client rental booking.
                  </p>
                </div>

                <form onSubmit={handleCompleteSubmit}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                        Actual Cleaning / Treatment Cost (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={completionCost}
                        onChange={(e) => setCompletionCost(e.target.value ? Number(e.target.value) : "")}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 14px",
                          borderRadius: 8,
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
                        Partner Quality Rating (1 - 5 Stars)
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setCompletionRating(star)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 6,
                              background: star <= completionRating ? "rgba(201, 163, 74, 0.2)" : "rgba(255, 255, 255, 0.05)",
                              border: star <= completionRating ? "1px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.1)",
                              color: star <= completionRating ? "#C9A34A" : "rgba(255, 255, 255, 0.5)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.85rem",
                              fontWeight: 700,
                            }}
                          >
                            <Star size={14} fill={star <= completionRating ? "#C9A34A" : "none"} />
                            {star}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                        Atelier Inspection Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Steamed and packaged in breathable dust bag"
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: "#1a1a1a",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#FFFFFF",
                          fontSize: "0.86rem",
                          outline: "none",
                        }}
                      />
                    </div>

                    {completeError && (
                      <div style={{ fontSize: "0.78rem", color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangle size={14} />
                        <span>{completeError}</span>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => setCompletingRequest(null)}
                        style={{
                          flex: 1,
                          padding: "11px",
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
                        type="submit"
                        disabled={completeMutation.isPending}
                        style={{
                          flex: 1.5,
                          padding: "11px",
                          borderRadius: 10,
                          background: "#16a34a",
                          border: "none",
                          color: "#FFFFFF",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          boxShadow: "0 4px 14px rgba(22, 163, 74, 0.4)",
                        }}
                      >
                        <ShieldCheck size={16} />
                        {completeMutation.isPending ? "Restoring..." : "Restore to Vault Stock"}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── PARTNER CLEANERS DIRECTORY MODAL ── */}
      <AnimatePresence>
        {showCleanersModal && (
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
            onClick={() => setShowCleanersModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="luxury-modal-scroll"
              style={{
                width: "100%",
                maxWidth: 780,
                maxHeight: "88vh",
                overflowY: "auto",
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.35)",
                borderRadius: 20,
                padding: "32px 36px",
                boxShadow: "0 25px 70px rgba(0, 0, 0, 0.95), 0 0 50px rgba(201, 163, 74, 0.1)",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Perfectly Aligned Header: Left title, Right actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  paddingBottom: 20,
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <Building2 size={15} color="#C9A34A" />
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "#C9A34A",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.18em",
                      }}
                    >
                      CERTIFIED FABRIC PARTNERS
                    </span>
                  </div>
                  <h2
                    className="gold-metallic-text"
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: "1.65rem",
                      fontWeight: 600,
                      margin: 0,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Dry Cleaning Directory
                  </h2>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowAddCleanerModal(true)}
                    className="btn-rose-primary"
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 18px rgba(201, 163, 74, 0.25)",
                    }}
                  >
                    <Plus size={15} /> Add Partner
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCleanersModal(false)}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      borderRadius: "50%",
                      width: 36,
                      height: 36,
                      color: "#FFFFFF",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                    title="Close Directory"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                      e.currentTarget.style.borderColor = "rgba(201, 163, 74, 0.5)";
                      e.currentTarget.style.color = "#C9A34A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
                      e.currentTarget.style.color = "#FFFFFF";
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Cleaners List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {cleaners.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#888",
                      background: "#181818",
                      borderRadius: 12,
                      border: "1px dashed rgba(255,255,255,0.1)",
                    }}
                  >
                    No certified fabric partners registered yet. Click &ldquo;Add Partner&rdquo; above.
                  </div>
                ) : (
                  cleaners.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: "linear-gradient(145deg, #181818 0%, #111111 100%)",
                        border: "1px solid rgba(201, 163, 74, 0.2)",
                        borderRadius: 14,
                        padding: "20px 22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.4)",
                        transition: "all 0.25s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(201, 163, 74, 0.45)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(201, 163, 74, 0.2)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Top Row: Partner Identity + Rating & Performance Badges */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: "rgba(201, 163, 74, 0.12)",
                              border: "1px solid rgba(201, 163, 74, 0.28)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#C9A34A",
                              flexShrink: 0,
                            }}
                          >
                            <Building2 size={20} />
                          </div>

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <h3
                                style={{
                                  fontSize: "1.08rem",
                                  fontWeight: 700,
                                  color: "#FFFFFF",
                                  margin: 0,
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {c.name}
                              </h3>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  padding: "3px 9px",
                                  borderRadius: 9999,
                                  background: "rgba(34, 197, 94, 0.14)",
                                  color: "#4ade80",
                                  border: "1px solid rgba(34, 197, 94, 0.32)",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                <ShieldCheck size={12} /> Verified Partner
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Badges on right: Star rating + Completed cycles */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "5px 12px",
                              borderRadius: 9999,
                              background: "rgba(201, 163, 74, 0.15)",
                              border: "1px solid rgba(201, 163, 74, 0.35)",
                              color: "#E2C375",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                            }}
                          >
                            <Star size={13} fill="#E2C375" color="#E2C375" />
                            <span>{c.rating ? c.rating.toFixed(1) : "5.0"}</span>
                          </div>

                          <div
                            style={{
                              padding: "5px 12px",
                              borderRadius: 9999,
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "rgba(255, 255, 255, 0.75)",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              letterSpacing: "0.03em",
                            }}
                          >
                            {c.total_jobs || 0} cycles completed
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ height: 1, background: "rgba(255, 255, 255, 0.06)" }} />

                      {/* Clean Structured Information Grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                          gap: 12,
                          fontSize: "0.8rem",
                        }}
                      >
                        {c.contact_person && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255, 255, 255, 0.75)" }}>
                            <User size={14} color="#C9A34A" style={{ flexShrink: 0 }} />
                            <span style={{ color: "#888", fontSize: "0.74rem" }}>Rep:</span>
                            <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{c.contact_person}</span>
                          </div>
                        )}

                        {c.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255, 255, 255, 0.75)" }}>
                            <Phone size={14} color="#C9A34A" style={{ flexShrink: 0 }} />
                            <span style={{ color: "#888", fontSize: "0.74rem" }}>Phone:</span>
                            <a
                              href={`tel:${c.phone}`}
                              style={{ color: "#E2C375", textDecoration: "none", fontWeight: 600 }}
                            >
                              {c.phone}
                            </a>
                          </div>
                        )}

                        {c.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255, 255, 255, 0.75)" }}>
                            <Mail size={14} color="#C9A34A" style={{ flexShrink: 0 }} />
                            <span style={{ color: "#888", fontSize: "0.74rem" }}>Email:</span>
                            <a
                              href={`mailto:${c.email}`}
                              style={{
                                color: "rgba(255, 255, 255, 0.9)",
                                textDecoration: "none",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.email}
                            </a>
                          </div>
                        )}

                        {c.address && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              color: "rgba(255, 255, 255, 0.75)",
                              gridColumn: "1 / -1",
                            }}
                          >
                            <MapPin size={14} color="#C9A34A" style={{ flexShrink: 0 }} />
                            <span style={{ color: "#888", fontSize: "0.74rem" }}>Facility:</span>
                            <span style={{ color: "rgba(255, 255, 255, 0.85)" }}>{c.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADD NEW CLEANER PARTNER MODAL ── */}
      <AnimatePresence>
        {showAddCleanerModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.88)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1100,
              padding: 20,
            }}
            onClick={() => setShowAddCleanerModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                width: "100%",
                maxWidth: 520,
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.4)",
                borderRadius: 18,
                padding: "28px 32px",
                position: "relative",
                boxShadow: "0 25px 70px rgba(0, 0, 0, 0.95), 0 0 40px rgba(201, 163, 74, 0.12)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  paddingBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Building2 size={16} color="#C9A34A" />
                  <h3
                    className="gold-metallic-text"
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: "1.35rem",
                      fontWeight: 600,
                      margin: 0,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Add Cleaner Partner
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCleanerModal(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    color: "#FFFFFF",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                  title="Close"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                    e.currentTarget.style.color = "#C9A34A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                    e.currentTarget.style.color = "#FFFFFF";
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateCleanerSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label
                      style={{
                        fontSize: "0.74rem",
                        color: "#C9A34A",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: 6,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Company / Atelier Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Imperial Dry Care Atelier"
                      value={newCleanerName}
                      onChange={(e) => setNewCleanerName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 8,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        outline: "none",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: "0.74rem",
                        color: "#C9A34A",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: 6,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Contact Representative
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kulkarni"
                      value={newCleanerContact}
                      onChange={(e) => setNewCleanerContact(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 8,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        outline: "none",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label
                        style={{
                          fontSize: "0.74rem",
                          color: "#C9A34A",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: 6,
                          letterSpacing: "0.08em",
                        }}
                      >
                        Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98450 11223"
                        value={newCleanerPhone}
                        onChange={(e) => setNewCleanerPhone(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: 8,
                          background: "#1a1a1a",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#fff",
                          outline: "none",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.74rem",
                          color: "#C9A34A",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: 6,
                          letterSpacing: "0.08em",
                        }}
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="cleaner@atelier.com"
                        value={newCleanerEmail}
                        onChange={(e) => setNewCleanerEmail(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: 8,
                          background: "#1a1a1a",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#fff",
                          outline: "none",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: "0.74rem",
                        color: "#C9A34A",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: 6,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Facility / Atelier Address
                    </label>
                    <input
                      type="text"
                      placeholder="Shop No. 12, MG Road, Pune"
                      value={newCleanerAddress}
                      onChange={(e) => setNewCleanerAddress(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 8,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        outline: "none",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => setShowAddCleanerModal(false)}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: 10,
                        background: "transparent",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        color: "#aaa",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        letterSpacing: "0.05em",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)")}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createCleanerMutation.isPending || !newCleanerName.trim()}
                      className="btn-rose-primary"
                      style={{
                        flex: 1.5,
                        padding: "12px",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        letterSpacing: "0.06em",
                        cursor: createCleanerMutation.isPending || !newCleanerName.trim() ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 18px rgba(201, 163, 74, 0.25)",
                      }}
                    >
                      {createCleanerMutation.isPending ? "Adding..." : "Add Partner"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
