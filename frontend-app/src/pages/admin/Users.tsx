import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Lock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  UserPlus,
  Key,
  Phone,
  Mail,
  Sparkles,
  Calendar,
  DollarSign,
  AlertTriangle,
  X,
  Check,
  RotateCcw,
  Briefcase,
  User as UserIcon,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../api";
import { useAuth } from "../../auth-context";
import type { User, UserHistoryResponse, Role } from "../../types";

const ROOT_SYSTEM_EMAIL = "admin@elanora-luxury.com";

const isRootSystemAdmin = (u: User | { email?: string; id?: number } | null | undefined): boolean => {
  if (!u) return false;
  return u.email?.toLowerCase() === ROOT_SYSTEM_EMAIL || u.id === 1;
};

const isSuperAdmin = isRootSystemAdmin;

export function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
  const isStaff = currentUser?.role === "staff";

  // Section / Tab filtering
  const [activeTab, setActiveTab] = useState<"all" | "users" | "staff" | "admins">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modals state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<"user" | "staff" | "admin">("user");
  const [toggleActiveUser, setToggleActiveUser] = useState<User | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);
  const [selectedUserHistory, setSelectedUserHistory] = useState<UserHistoryResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Onboard form state
  const [onboardForm, setOnboardForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "user" as Role,
  });
  const [onboardError, setOnboardError] = useState("");

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users", token],
    queryFn: () => api.listUsers(token!),
    enabled: Boolean(token),
  });

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Mutations
  const setRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: "admin" | "staff" | "user" }) =>
      api.setUserRole(token!, userId, role),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setRoleModalUser(null);
      showFeedback("success", `Role for ${updated.full_name} updated to ${updated.role.toUpperCase()}`);
    },
    onError: (err: any) => {
      showFeedback("error", err?.message || "Failed to update user role");
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      api.setUserActive(token!, userId, isActive),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setToggleActiveUser(null);
      showFeedback("success", `Account for ${updated.full_name} is now ${updated.is_active ? "ACTIVE" : "DEACTIVATED"}`);
    },
    onError: (err: any) => {
      showFeedback("error", err?.message || "Failed to alter account status");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => api.deleteUser(token!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      const name = deleteModalUser?.full_name || "Account";
      setDeleteModalUser(null);
      showFeedback("success", `${name} permanently deleted from directory.`);
    },
    onError: (err: any) => {
      showFeedback("error", err?.message || "Failed to delete user account.");
    },
  });

  const onboardMutation = useMutation({
    mutationFn: (payload: { full_name: string; email: string; password: string; role: Role; phone?: string }) =>
      api.createUserByAdmin(token!, payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowOnboardModal(false);
      setOnboardForm({ fullName: "", email: "", phone: "", password: "", role: "user" });
      setOnboardError("");
      showFeedback("success", `Successfully onboarded ${created.full_name} as ${created.role.toUpperCase()}`);
    },
    onError: (err: any) => {
      setOnboardError(err?.message || "Failed to onboard new account");
    },
  });

  const fetchHistory = async (userId: number) => {
    setIsLoadingHistory(true);
    try {
      const data = await api.getUserHistory(token!, userId);
      setSelectedUserHistory(data);
    } catch (err: any) {
      showFeedback("error", err?.message || "Could not retrieve user audit history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = users.length;
    const clients = users.filter((u) => u.role === "user").length;
    const staff = users.filter((u) => u.role === "staff").length;
    const admins = users.filter((u) => u.role === "admin").length;
    return { total, clients, staff, admins };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Tab filter
      if (activeTab === "users" && u.role !== "user") return false;
      if (activeTab === "staff" && u.role !== "staff") return false;
      if (activeTab === "admins" && u.role !== "admin") return false;

      // Status filter
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = u.full_name?.toLowerCase().includes(query) ?? false;
        const emailMatch = u.email?.toLowerCase().includes(query) ?? false;
        const phoneMatch = u.phone?.toLowerCase().includes(query) ?? false;
        const idMatch = `#${u.id}`.includes(query);
        if (!nameMatch && !emailMatch && !phoneMatch && !idMatch) return false;
      }

      return true;
    });
  }, [users, activeTab, statusFilter, searchTerm]);

  const handleOpenRoleModal = (u: User) => {
    if (isRootSystemAdmin(u)) {
      showFeedback("error", "Security Lock: The root System Concierge role cannot be altered.");
      return;
    }
    if (u.id === currentUser?.id) {
      showFeedback("error", "You cannot alter your own administrative role.");
      return;
    }
    setRoleModalUser(u);
    const validRole = u.role === "admin" || u.role === "staff" ? u.role : "user";
    setSelectedNewRole(validRole);
  };

  const handleConfirmRoleChange = () => {
    if (!roleModalUser) return;
    setRoleMutation.mutate({ userId: roleModalUser.id, role: selectedNewRole });
  };

  const handleOpenActiveModal = (u: User) => {
    if (isRootSystemAdmin(u)) {
      showFeedback("error", "Security Lock: The root System Concierge account cannot be deactivated.");
      return;
    }
    if (u.id === currentUser?.id) {
      showFeedback("error", "You cannot deactivate your own administrative account.");
      return;
    }
    setToggleActiveUser(u);
  };

  const handleConfirmActiveToggle = () => {
    if (!toggleActiveUser) return;
    setActiveMutation.mutate({ userId: toggleActiveUser.id, isActive: !toggleActiveUser.is_active });
  };

  const handleOpenDeleteModal = (u: User) => {
    if (isRootSystemAdmin(u)) {
      showFeedback("error", "Security Lock: The root System Concierge account cannot be deleted.");
      return;
    }
    if (u.id === currentUser?.id) {
      showFeedback("error", "You cannot delete your own administrative account while logged in.");
      return;
    }
    setDeleteModalUser(u);
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardForm.fullName.trim()) {
      setOnboardError("Full name is required");
      return;
    }
    if (!onboardForm.email.trim() || !onboardForm.email.includes("@")) {
      setOnboardError("A valid email address is required");
      return;
    }
    if (onboardForm.password.length < 8) {
      setOnboardError("Password must be at least 8 characters");
      return;
    }
    setOnboardError("");
    onboardMutation.mutate({
      full_name: onboardForm.fullName,
      email: onboardForm.email,
      phone: onboardForm.phone || undefined,
      password: onboardForm.password,
      role: onboardForm.role,
    });
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1300, margin: "0 auto", color: "#FFFFFF", fontFamily: "var(--font-sans)" }}>
      {/* Toast Feedback */}
      <AnimatePresence>
        {feedbackMessage && (
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
              background: feedbackMessage.type === "success" ? "#064E3B" : "#7F1D1D",
              border: `1.5px solid ${feedbackMessage.type === "success" ? "#10B981" : "#EF4444"}`,
              color: "#FFFFFF",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            {feedbackMessage.type === "success" ? <CheckCircle2 size={18} color="#10B981" /> : <AlertTriangle size={18} color="#EF4444" />}
            <span>{feedbackMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "#C9A34A", fontWeight: 700 }}>
              Atelier Access & Privilege Governance
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-brand)", fontSize: "1.85rem", color: "#FFFFFF", fontWeight: 600, letterSpacing: "0.06em", margin: 0 }}>
            USER & PRIVILEGE DIRECTORY
          </h1>
          <p style={{ color: "#A3A3A3", fontSize: "0.88rem", marginTop: 6, maxWidth: 680 }}>
            Manage client patrons, atelier operational staff, and certified administrators with role-based governance and immutable Super Administrator protection.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isStaff && !isAdmin && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34D399",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={16} />
              <span>Staff Operational Access (Audit Mode)</span>
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setShowOnboardModal(true);
                setOnboardError("");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #C9A34A 0%, #E6CA65 100%)",
                border: "none",
                color: "#0B0B0B",
                fontSize: "0.84rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(201, 163, 74, 0.3)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <UserPlus size={16} />
              <span>+ Onboard Account</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
        {/* Total Accounts */}
        <div
          onClick={() => setActiveTab("all")}
          style={{
            background: "#141414",
            border: activeTab === "all" ? "1.5px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "18px 20px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#A3A3A3", fontWeight: 700 }}>
              Total Directory
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={16} color="#FFFFFF" />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#FFFFFF" }}>{metrics.total}</div>
          <div style={{ fontSize: "0.75rem", color: "#737373", marginTop: 4 }}>Registered system accounts</div>
        </div>

        {/* Client Patrons */}
        <div
          onClick={() => setActiveTab("users")}
          style={{
            background: "#141414",
            border: activeTab === "users" ? "1.5px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "18px 20px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#A3A3A3", fontWeight: 700 }}>
              Clients & Patrons
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(201, 163, 74, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={16} color="#C9A34A" />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#C9A34A" }}>{metrics.clients}</div>
          <div style={{ fontSize: "0.75rem", color: "#737373", marginTop: 4 }}>Boutique luxury shoppers</div>
        </div>

        {/* Atelier Staff */}
        <div
          onClick={() => setActiveTab("staff")}
          style={{
            background: "#141414",
            border: activeTab === "staff" ? "1.5px solid #10B981" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "18px 20px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#A3A3A3", fontWeight: 700 }}>
              Atelier Staff
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={16} color="#10B981" />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#34D399" }}>{metrics.staff}</div>
          <div style={{ fontSize: "0.75rem", color: "#737373", marginTop: 4 }}>Operations & fabric specialists</div>
        </div>

        {/* Administrators */}
        <div
          onClick={() => setActiveTab("admins")}
          style={{
            background: "#141414",
            border: activeTab === "admins" ? "1.5px solid #EB89A4" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "18px 20px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#A3A3A3", fontWeight: 700 }}>
              Administrators
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(235, 137, 164, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Crown size={16} color="#EB89A4" />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#EB89A4" }}>{metrics.admins}</div>
          <div style={{ fontSize: "0.75rem", color: "#737373", marginTop: 4 }}>1 Protected Super Admin</div>
        </div>
      </div>

      {/* Sections & Tabs Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 16, marginBottom: 20 }}>
        {/* Tab Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All Accounts", count: metrics.total, icon: Users },
            { key: "users", label: "Clients & Patrons", count: metrics.clients, icon: UserIcon },
            { key: "staff", label: "Atelier Staff", count: metrics.staff, icon: Briefcase },
            { key: "admins", label: "Administrators", count: metrics.admins, icon: Crown },
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
                  padding: "8px 16px",
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
                    padding: "1px 7px",
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

        {/* Search & Status Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={15} color="#737373" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search patron name, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 14px 8px 34px",
                width: 260,
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "#141414",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div style={{ background: "#141414", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#181818", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <th style={{ padding: "14px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                Patron / Member
              </th>
              <th style={{ padding: "14px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                Email & Identity
              </th>
              <th style={{ padding: "14px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                Access Role
              </th>
              <th style={{ padding: "14px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                Status
              </th>
              <th style={{ padding: "14px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, textAlign: "right" }}>
                Privilege & Governance
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: "48px 20px", textAlign: "center", color: "#737373" }}>
                  <RotateCcw className="animate-spin" size={24} style={{ margin: "0 auto 10px", color: "#C9A34A" }} />
                  <div>Loading atelier user registry...</div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "48px 20px", textAlign: "center", color: "#737373" }}>
                  <Users size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#FFFFFF" }}>No matching accounts found</div>
                  <div style={{ fontSize: "0.8rem", marginTop: 4 }}>Try clearing search criteria or select another section tab.</div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isSuper = isSuperAdmin(u);
                const isMe = u.id === currentUser?.id;
                const initials = u.full_name
                  ? u.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "U";

                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      background: isSuper ? "rgba(201, 163, 74, 0.03)" : "transparent",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* Member */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: isSuper
                              ? "linear-gradient(135deg, rgba(201,163,74,0.3) 0%, rgba(235,137,164,0.3) 100%)"
                              : u.role === "admin"
                              ? "rgba(201, 163, 74, 0.15)"
                              : u.role === "staff"
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(255, 255, 255, 0.08)",
                            border: isSuper
                              ? "2px solid #C9A34A"
                              : u.role === "admin"
                              ? "1.5px solid rgba(201, 163, 74, 0.5)"
                              : u.role === "staff"
                              ? "1.5px solid rgba(16, 185, 129, 0.5)"
                              : "1px solid rgba(255, 255, 255, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            color: isSuper || u.role === "admin" ? "#C9A34A" : u.role === "staff" ? "#34D399" : "#FFFFFF",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 600, color: "#FFFFFF", fontSize: "0.9rem" }}>{u.full_name}</span>
                            <span style={{ fontSize: "0.68rem", color: "#737373", fontFamily: "monospace" }}>#{u.id}</span>
                            {isMe && (
                              <span style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.08)", fontSize: "0.62rem", color: "#A3A3A3" }}>
                                You
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.76rem", color: "#737373", marginTop: 2 }}>
                            {u.phone ? (
                              <>
                                <Phone size={11} />
                                <span>{u.phone}</span>
                              </>
                            ) : (
                              <span>No phone registered</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email & Identity */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "#D4D4D4" }}>
                        <Mail size={13} color="#737373" />
                        <span>{u.email}</span>
                      </div>
                      {isSuper && (
                        <div
                          style={{
                            marginTop: 5,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "2px 8px",
                            borderRadius: 9999,
                            background: "linear-gradient(135deg, rgba(201,163,74,0.2) 0%, rgba(201,163,74,0.08) 100%)",
                            border: "1px solid rgba(201,163,74,0.45)",
                            color: "#C9A34A",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                          }}
                        >
                          <Crown size={10} />
                          <span>MASTER SUPER ADMIN</span>
                          <Lock size={9} />
                        </div>
                      )}
                    </td>

                    {/* Access Role */}
                    <td style={{ padding: "16px 20px" }}>
                      {isSuper ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 9999,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            background: "rgba(201, 163, 74, 0.18)",
                            color: "#C9A34A",
                            border: "1px solid rgba(201, 163, 74, 0.4)",
                          }}
                        >
                          <Crown size={11} />
                          <span>SUPER ADMIN</span>
                        </span>
                      ) : u.role === "admin" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 9999,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            background: "rgba(235, 137, 164, 0.15)",
                            color: "#EB89A4",
                            border: "1px solid rgba(235, 137, 164, 0.35)",
                          }}
                        >
                          <Crown size={11} />
                          <span>ADMINISTRATOR</span>
                        </span>
                      ) : u.role === "staff" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 9999,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#34D399",
                            border: "1px solid rgba(16, 185, 129, 0.35)",
                          }}
                        >
                          <ShieldCheck size={11} />
                          <span>ATELIER STAFF</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 9999,
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            background: "rgba(255, 255, 255, 0.06)",
                            color: "#A3A3A3",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                          }}
                        >
                          <UserIcon size={11} />
                          <span>CLIENT PATRON</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "16px 20px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 9px",
                          borderRadius: 9999,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: u.is_active ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                          color: u.is_active ? "#10B981" : "#EF4444",
                          border: u.is_active ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                        }}
                      >
                        {u.is_active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                        <span>{u.is_active ? "Active" : "Disabled"}</span>
                      </span>
                    </td>

                    {/* Governance Actions */}
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {/* History / Audit Button (Available to Admin & Staff) */}
                        <button
                          onClick={() => fetchHistory(u.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 12px",
                            borderRadius: 6,
                            background: "rgba(201, 163, 74, 0.1)",
                            border: "1px solid rgba(201, 163, 74, 0.25)",
                            color: "#C9A34A",
                            fontSize: "0.76rem",
                            cursor: "pointer",
                            fontWeight: 600,
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201, 163, 74, 0.2)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(201, 163, 74, 0.1)")}
                        >
                          <Eye size={12} />
                          <span>Audit</span>
                        </button>

                        {/* Admin Privilege Governance */}
                        {isAdmin ? (
                          isSuper ? (
                            <>
                              {/* Locked Role button for Root Concierge */}
                              <button
                                disabled
                                title="Root System Concierge is permanently protected and cannot be altered."
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: "rgba(255, 255, 255, 0.04)",
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  color: "#737373",
                                  fontSize: "0.74rem",
                                  cursor: "not-allowed",
                                  opacity: 0.65,
                                }}
                              >
                                <Lock size={11} color="#C9A34A" />
                                <span>Root Protected</span>
                              </button>

                              <button
                                disabled
                                title="Root System Concierge account cannot be deactivated or deleted."
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: "rgba(255, 255, 255, 0.04)",
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  color: "#737373",
                                  fontSize: "0.74rem",
                                  cursor: "not-allowed",
                                  opacity: 0.65,
                                }}
                              >
                                <ShieldAlert size={11} color="#C9A34A" />
                                <span>Immutable</span>
                              </button>
                            </>
                          ) : isMe ? (
                            <span
                              title="Your active session. To change roles or delete, use another administrator account."
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "6px 10px",
                                borderRadius: 6,
                                fontSize: "0.74rem",
                                color: "#C9A34A",
                                background: "rgba(201, 163, 74, 0.08)",
                                border: "1px solid rgba(201, 163, 74, 0.2)",
                              }}
                            >
                              <Crown size={12} color="#C9A34A" />
                              <span>Current Session (You)</span>
                            </span>
                          ) : (
                            <>
                              {/* Change Role Button */}
                              <button
                                onClick={() => handleOpenRoleModal(u)}
                                title="Assign access level (Client Patron, Atelier Staff, System Administrator)"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: "#1E1E1E",
                                  border: "1px solid rgba(255, 255, 255, 0.12)",
                                  color: "#FFFFFF",
                                  fontSize: "0.74rem",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C9A34A")}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)")}
                              >
                                <Key size={11} color="#C9A34A" />
                                <span>Role</span>
                              </button>

                              {/* Toggle Active Button */}
                              <button
                                onClick={() => handleOpenActiveModal(u)}
                                title={u.is_active ? "Deactivate account" : "Reactivate account"}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: u.is_active ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                  border: u.is_active ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(16, 185, 129, 0.25)",
                                  color: u.is_active ? "#EF4444" : "#10B981",
                                  fontSize: "0.74rem",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                }}
                              >
                                {u.is_active ? "Deactivate" : "Activate"}
                              </button>

                              {/* Delete Account Button */}
                              <button
                                onClick={() => handleOpenDeleteModal(u)}
                                title="Permanently delete this user account"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: "rgba(239, 68, 68, 0.08)",
                                  border: "1px solid rgba(239, 68, 68, 0.25)",
                                  color: "#EF4444",
                                  fontSize: "0.74rem",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                                  e.currentTarget.style.borderColor = "#EF4444";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)";
                                }}
                              >
                                <Trash2 size={11} color="#EF4444" />
                                <span>Delete</span>
                              </button>
                            </>
                          )
                        ) : (
                          // For Staff users: Explain that privilege changes require admin rights
                          <span
                            title="Only administrators can modify roles or deactivate accounts."
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: "0.7rem",
                              color: "#737373",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <Lock size={10} />
                            <span>Admin Only</span>
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

      {/* ── MODAL 1: ONBOARD NEW ACCOUNT (ADMIN ONLY) ── */}
      <AnimatePresence>
        {showOnboardModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 900,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{
                background: "#141414",
                border: "1px solid rgba(201, 163, 74, 0.3)",
                borderRadius: 16,
                maxWidth: 520,
                width: "100%",
                padding: "28px 32px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(201,163,74,0.1)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#C9A34A", fontWeight: 700 }}>
                    Access Onboarding
                  </span>
                  <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.35rem", color: "#FFFFFF", margin: "4px 0 0 0" }}>
                    REGISTER NEW ACCOUNT
                  </h2>
                </div>
                <button
                  onClick={() => setShowOnboardModal(false)}
                  style={{ background: "none", border: "none", color: "#737373", cursor: "pointer", padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              {onboardError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#EF4444",
                    fontSize: "0.82rem",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={15} />
                  <span>{onboardError}</span>
                </div>
              )}

              <form onSubmit={handleOnboardSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Full Name */}
                <div>
                  <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharani Gayatri Devi"
                    value={onboardForm.fullName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, fullName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#1E1E1E",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.86rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. patron@elanora-luxury.com"
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#1E1E1E",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.86rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#1E1E1E",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.86rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Temporary Password */}
                <div>
                  <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Temporary Password (min 8 characters) *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={onboardForm.password}
                    onChange={(e) => setOnboardForm({ ...onboardForm, password: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#1E1E1E",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.86rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Role Selector */}
                <div>
                  <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", fontWeight: 700, display: "block", marginBottom: 8 }}>
                    Privilege Role Designation *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { role: "user", label: "Client", desc: "Shopping & Rentals", icon: UserIcon },
                      { role: "staff", label: "Staff", desc: "Operations & Care", icon: Briefcase },
                      { role: "admin", label: "Admin", desc: "Governance Access", icon: Crown },
                    ].map((item) => {
                      const isSelected = onboardForm.role === item.role;
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.role}
                          onClick={() => setOnboardForm({ ...onboardForm, role: item.role as Role })}
                          style={{
                            padding: "12px 10px",
                            borderRadius: 8,
                            background: isSelected ? "rgba(201, 163, 74, 0.12)" : "#1E1E1E",
                            border: isSelected ? "1.5px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.1)",
                            cursor: "pointer",
                            textAlign: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Icon size={16} color={isSelected ? "#C9A34A" : "#737373"} style={{ margin: "0 auto 4px" }} />
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: isSelected ? "#C9A34A" : "#FFFFFF" }}>{item.label}</div>
                          <div style={{ fontSize: "0.65rem", color: "#737373", marginTop: 2 }}>{item.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setShowOnboardModal(false)}
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
                    type="submit"
                    disabled={onboardMutation.isPending}
                    style={{
                      padding: "10px 22px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #C9A34A 0%, #E6CA65 100%)",
                      border: "none",
                      color: "#0B0B0B",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      cursor: onboardMutation.isPending ? "not-allowed" : "pointer",
                      opacity: onboardMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {onboardMutation.isPending ? "Onboarding..." : "Register Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: PRIVILEGE ROLE SELECTION (ADMIN ONLY) ── */}
      <AnimatePresence>
        {roleModalUser && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 900,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: "#141414",
                border: "1px solid rgba(201, 163, 74, 0.3)",
                borderRadius: 16,
                maxWidth: 480,
                width: "100%",
                padding: "26px 30px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#C9A34A", fontWeight: 700 }}>
                    Privilege Reassignment
                  </span>
                  <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.3rem", color: "#FFFFFF", margin: "4px 0 0 0" }}>
                    MODIFY ACCESS LEVEL
                  </h2>
                </div>
                <button onClick={() => setRoleModalUser(null)} style={{ background: "none", border: "none", color: "#737373", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: "12px 14px", borderRadius: 8, background: "#1E1E1E", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: 18 }}>
                <div style={{ fontSize: "0.75rem", color: "#737373" }}>Target Account:</div>
                <div style={{ fontWeight: 600, color: "#FFFFFF", fontSize: "0.92rem", marginTop: 2 }}>{roleModalUser.full_name}</div>
                <div style={{ fontSize: "0.78rem", color: "#A3A3A3" }}>{roleModalUser.email}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {[
                  {
                    role: "user",
                    title: "Client Patron",
                    desc: "Standard customer privileges — browsing, couture bookings, security deposits, client profile.",
                    icon: UserIcon,
                    color: "#FFFFFF",
                  },
                  {
                    role: "staff",
                    title: "Atelier Staff",
                    desc: "Operational floor console — manage fabric sanitization dispatch, update garment stock, inspect client histories.",
                    icon: Briefcase,
                    color: "#34D399",
                  },
                  {
                    role: "admin",
                    title: "System Administrator",
                    desc: "Full administrative console — pricing catalog, user privilege management, master dashboard analytics.",
                    icon: Crown,
                    color: "#C9A34A",
                  },
                ].map((item) => {
                  const isSelected = selectedNewRole === item.role;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.role}
                      onClick={() => setSelectedNewRole(item.role as any)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        background: isSelected ? "rgba(201, 163, 74, 0.12)" : "#1E1E1E",
                        border: isSelected ? "1.5px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: isSelected ? "rgba(201,163,74,0.2)" : "rgba(255,255,255,0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} color={item.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.86rem", color: isSelected ? "#C9A34A" : "#FFFFFF" }}>{item.title}</div>
                        <div style={{ fontSize: "0.74rem", color: "#8E8E8E", marginTop: 3, lineHeight: 1.4 }}>{item.desc}</div>
                      </div>
                      {isSelected && <Check size={18} color="#C9A34A" style={{ marginTop: 4 }} />}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
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
                  onClick={handleConfirmRoleChange}
                  disabled={setRoleMutation.isPending}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #C9A34A 0%, #E6CA65 100%)",
                    border: "none",
                    color: "#0B0B0B",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: setRoleMutation.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {setRoleMutation.isPending ? "Updating..." : "Confirm Role"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: DEACTIVATE / ACTIVATE CONFIRMATION (ADMIN ONLY) ── */}
      <AnimatePresence>
        {toggleActiveUser && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 900,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: "#141414",
                border: `1px solid ${toggleActiveUser.is_active ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                borderRadius: 16,
                maxWidth: 440,
                width: "100%",
                padding: "26px 30px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: toggleActiveUser.is_active ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {toggleActiveUser.is_active ? <AlertTriangle size={20} color="#EF4444" /> : <CheckCircle2 size={20} color="#10B981" />}
                </div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                    {toggleActiveUser.is_active ? "Suspend Account Access?" : "Reactivate Account Access?"}
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#A3A3A3", marginTop: 2 }}>{toggleActiveUser.full_name}</div>
                </div>
              </div>

              <p style={{ color: "#A3A3A3", fontSize: "0.84rem", lineHeight: 1.5, marginBottom: 20 }}>
                {toggleActiveUser.is_active
                  ? "Suspending this user will immediately revoke their authentication credentials and prevent access to boutique rentals and concierge services."
                  : "Reactivating this account will restore full access and privileges according to their assigned role."}
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setToggleActiveUser(null)}
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
                  onClick={handleConfirmActiveToggle}
                  disabled={setActiveMutation.isPending}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 8,
                    background: toggleActiveUser.is_active ? "#EF4444" : "#10B981",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: setActiveMutation.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {setActiveMutation.isPending
                    ? "Updating..."
                    : toggleActiveUser.is_active
                    ? "Confirm Suspension"
                    : "Confirm Reactivation"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 5: PERMANENT DELETE CONFIRMATION (ADMIN ONLY) ── */}
      <AnimatePresence>
        {deleteModalUser && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 900,
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
                maxWidth: 460,
                width: "100%",
                padding: "26px 30px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={22} color="#EF4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                    Permanently Delete Account?
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#EF4444", fontWeight: 600, marginTop: 2 }}>
                    This action is completely irreversible
                  </div>
                </div>
              </div>

              <div style={{ padding: "12px 14px", borderRadius: 8, background: "#1C1C1C", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: 16 }}>
                <div style={{ fontSize: "0.75rem", color: "#737373" }}>Target Account for Purge:</div>
                <div style={{ fontWeight: 600, color: "#FFFFFF", fontSize: "0.92rem", marginTop: 2 }}>{deleteModalUser.full_name}</div>
                <div style={{ fontSize: "0.78rem", color: "#A3A3A3" }}>{deleteModalUser.email}</div>
                <div style={{ fontSize: "0.74rem", color: "#C9A34A", marginTop: 4 }}>Role: {deleteModalUser.role.toUpperCase()}</div>
              </div>

              <p style={{ color: "#A3A3A3", fontSize: "0.84rem", lineHeight: 1.5, marginBottom: 20 }}>
                Deleting this account will permanently purge all authentication sessions, tokens, and access privileges. Any staff operational histories will be cleanly reassigned to your administrator ID to maintain database audit trails.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  disabled={deleteUserMutation.isPending}
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
                  onClick={() => deleteUserMutation.mutate(deleteModalUser.id)}
                  disabled={deleteUserMutation.isPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 20px",
                    borderRadius: 8,
                    background: "#DC2626",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: deleteUserMutation.isPending ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                  }}
                >
                  <Trash2 size={14} />
                  <span>{deleteUserMutation.isPending ? "Purging..." : "Permanently Delete"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 4: COMPREHENSIVE CLIENT AUDIT & TRANSACTION HISTORY ── */}
      <AnimatePresence>
        {selectedUserHistory && (
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
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.35)",
                borderRadius: 18,
                maxWidth: 820,
                width: "100%",
                padding: "30px 34px",
                maxHeight: "88vh",
                overflowY: "auto",
                boxShadow: "0 25px 70px rgba(0,0,0,0.9), 0 0 35px rgba(201,163,74,0.12)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 16 }}>
                <div>
                  <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#C9A34A", fontWeight: 700 }}>
                    Concierge Ledger & History
                  </span>
                  <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.55rem", color: "#FFFFFF", margin: "4px 0 6px 0" }}>
                    {selectedUserHistory.user.full_name}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: "0.8rem", color: "#A3A3A3" }}>
                    <span>{selectedUserHistory.user.email}</span>
                    {selectedUserHistory.user.phone && (
                      <>
                        <span>•</span>
                        <span>{selectedUserHistory.user.phone}</span>
                      </>
                    )}
                    <span>•</span>
                    <span style={{ textTransform: "uppercase", color: "#C9A34A", fontWeight: 600 }}>{selectedUserHistory.user.role}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserHistory(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "50%",
                    width: 34,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#A3A3A3",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Financial KPI Cards */}
              {(() => {
                const buyOrders = selectedUserHistory.bookings.filter((b) => b.order_type === "buy");
                const buyTotalSpend = buyOrders.reduce((sum, b) => sum + (b.rent_amount || 0), 0);
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
                    <div style={{ background: "#1A1A1A", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#737373", fontWeight: 700 }}>Total Records</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#FFFFFF", marginTop: 4 }}>{selectedUserHistory.summary.total_bookings}</div>
                    </div>
                    <div style={{ background: "#1A1A1A", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#737373", fontWeight: 700 }}>Active Rentals</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#C9A34A", marginTop: 4 }}>{selectedUserHistory.summary.active_bookings}</div>
                    </div>
                    <div style={{ background: "rgba(201, 163, 74, 0.08)", border: "1px solid rgba(201, 163, 74, 0.25)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#E6CA65", fontWeight: 700 }}>Buy to Own Orders</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#E6CA65", marginTop: 4 }}>
                        {buyOrders.length} <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "#A3A3A3" }}>(₹{buyTotalSpend.toLocaleString()})</span>
                      </div>
                    </div>
                    <div style={{ background: "#1A1A1A", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#737373", fontWeight: 700 }}>Total Rent Paid</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#34D399", marginTop: 4 }}>₹{selectedUserHistory.summary.total_rent_paid.toLocaleString()}</div>
                    </div>
                    <div style={{ background: "#1A1A1A", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#737373", fontWeight: 700 }}>Deposits Refunded</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#60A5FA", marginTop: 4 }}>₹{selectedUserHistory.summary.total_deposit_refunded.toLocaleString()}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Bookings Ledger Section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: "0.92rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#FFFFFF", fontWeight: 700, margin: 0 }}>
                    Couture Booking Ledger ({selectedUserHistory.bookings.length})
                  </h3>
                </div>

                {selectedUserHistory.bookings.length === 0 ? (
                  <div style={{ padding: "28px", textAlign: "center", background: "#1A1A1A", borderRadius: 10, color: "#737373", fontSize: "0.85rem" }}>
                    No bookings logged for this patron.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {selectedUserHistory.bookings.map((b) => {
                      const isBuy = b.order_type === "buy";
                      return (
                        <div
                          key={b.id}
                          style={{
                            background: isBuy ? "rgba(201, 163, 74, 0.04)" : "#1A1A1A",
                            border: isBuy ? "1px solid rgba(201, 163, 74, 0.28)" : "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: 10,
                            padding: "14px 18px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 700, color: "#C9A34A", fontSize: "0.86rem" }}>
                                {isBuy ? `Acquisition #${b.id}` : `Booking #${b.id}`}
                              </span>
                              {isBuy && (
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 9999,
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    background: "rgba(201, 163, 74, 0.2)",
                                    color: "#E6CA65",
                                    border: "1px solid rgba(201, 163, 74, 0.35)",
                                  }}
                                >
                                  🛍️ BUY ONCE (ACQUIRED)
                                </span>
                              )}
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 9999,
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  background:
                                    isBuy
                                      ? "rgba(16, 185, 129, 0.15)"
                                      : b.status === "returned"
                                      ? "rgba(16, 185, 129, 0.15)"
                                      : b.status === "cancelled"
                                      ? "rgba(239, 68, 68, 0.15)"
                                      : "rgba(201, 163, 74, 0.15)",
                                  color:
                                    isBuy
                                      ? "#34D399"
                                      : b.status === "returned"
                                      ? "#34D399"
                                      : b.status === "cancelled"
                                      ? "#EF4444"
                                      : "#C9A34A",
                                }}
                              >
                                {isBuy
                                  ? b.status === "allocated"
                                    ? "DISPATCH PREP"
                                    : b.status === "picked_up"
                                    ? "DISPATCHED"
                                    : "OWNED"
                                  : b.status.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#A3A3A3", marginTop: 4 }}>
                              {isBuy ? (
                                <>Order Type: <strong style={{ color: "#E6CA65" }}>Direct Haute Couture Acquisition (Buy Once)</strong></>
                              ) : (
                                <>Rental Plan: <strong style={{ color: "#FFFFFF" }}>{b.rental_plan?.name || "Standard Rental"}</strong></>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: "0.78rem" }}>
                            <div>
                              <span style={{ color: "#737373", display: "block", fontSize: "0.68rem" }}>{isBuy ? "ACQUIRED ON" : "DATES"}</span>
                              <span style={{ color: "#D4D4D4" }}>
                                {isBuy
                                  ? new Date(b.pickup_date).toLocaleDateString()
                                  : `${new Date(b.pickup_date).toLocaleDateString()} → ${new Date(b.due_date).toLocaleDateString()}`}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "#737373", display: "block", fontSize: "0.68rem" }}>{isBuy ? "PURCHASE PRICE" : "RENT PAID"}</span>
                              <span style={{ color: "#34D399", fontWeight: 600 }}>₹{b.rent_amount?.toLocaleString() ?? 0}</span>
                            </div>
                            <div>
                              <span style={{ color: "#737373", display: "block", fontSize: "0.68rem" }}>DEPOSIT</span>
                              <span style={{ color: isBuy ? "#34D399" : "#C9A34A", fontWeight: 600 }}>
                                {isBuy ? "₹0 (Permanent)" : `₹${b.deposit_amount?.toLocaleString() ?? 0}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payments Ledger Section */}
              {selectedUserHistory.payments && selectedUserHistory.payments.length > 0 && (
                <div>
                  <h3 style={{ fontSize: "0.92rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#FFFFFF", fontWeight: 700, marginBottom: 12 }}>
                    Payment & Refund Audit Trail ({selectedUserHistory.payments.length})
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedUserHistory.payments.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          background: "#181818",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: 8,
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.78rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 600, color: "#FFFFFF" }}>TX #{p.id}</span>
                          <span style={{ color: "#A3A3A3" }}>Booking #{p.booking_id}</span>
                          <span style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#C9A34A", fontSize: "0.7rem", fontWeight: 600 }}>
                            {p.type?.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <span style={{ color: "#34D399", fontWeight: 600 }}>₹{p.amount.toLocaleString()}</span>
                          <span style={{ color: p.status === "paid" ? "#10B981" : "#EF4444" }}>{p.status?.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
