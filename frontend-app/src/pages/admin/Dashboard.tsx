import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Package2,
  Calendar,
  Users,
  Shirt,
  DollarSign,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Crown,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { api } from "../../api";
import { useAuth } from "../../auth-context";
import type { Booking, Asset, User } from "../../types";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const { data: rawAssets = [] } = useQuery<Asset[]>({
    queryKey: ["admin-assets", token],
    queryFn: () => api.listAssets(token),
    enabled: Boolean(token),
  });

  const { data: rawBookings = [] } = useQuery<Booking[]>({
    queryKey: ["admin-bookings", token],
    queryFn: () => api.listAdminBookings(token!),
    enabled: Boolean(token),
  });

  const { data: rawUsersList = [] } = useQuery<User[]>({
    queryKey: ["admin-users", token],
    queryFn: () => api.listUsers(token!),
    enabled: Boolean(token),
  });

  const bookings = Array.isArray(rawBookings) ? rawBookings : [];
  const assets = Array.isArray(rawAssets) ? rawAssets : [];
  const usersList = Array.isArray(rawUsersList) ? rawUsersList : [];

  const assetMap = useMemo(() => {
    const map = new Map<number, Asset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  // Dynamic Metrics Calculation from live database records
  const totalSales = useMemo(() => {
    return bookings
      .filter((b) => b.order_type === "buy")
      .reduce((acc, b) => acc + Number(b.rent_amount || 0), 0);
  }, [bookings]);

  const totalRentals = useMemo(() => {
    return bookings
      .filter((b) => b.order_type !== "buy")
      .reduce((acc, b) => acc + Number(b.rent_amount || 0), 0);
  }, [bookings]);

  const buyCount = useMemo(() => {
    return bookings.filter((b) => b.order_type === "buy").length;
  }, [bookings]);

  const rentalCount = useMemo(() => {
    return bookings.filter((b) => b.order_type !== "buy").length;
  }, [bookings]);

  const totalOrders = bookings.length;
  const pendingAllocations = bookings.filter((b) => b.status === "booked" || b.status === "pending");
  const activeRentals = bookings.filter(
    (b) => b.order_type !== "buy" && ["picked_up", "rent_paid", "allocated"].includes(b.status)
  );

  // Dynamic Recent Bookings
  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [bookings]);

  // Dynamic Monthly Revenue Breakdown for past 6 months
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const months: { month: string; key: string; sales: number; rentals: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthShort = d.toLocaleString("default", { month: "short" });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ month: monthShort, key, sales: 0, rentals: 0 });
    }

    bookings.forEach((b) => {
      if (!b.created_at) return;
      const bDate = new Date(b.created_at);
      const key = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, "0")}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) {
        const amount = Number(b.rent_amount || 0);
        if (b.order_type === "buy") {
          bucket.sales += amount;
        } else {
          bucket.rentals += amount;
        }
      }
    });

    const maxVal = Math.max(1, ...months.flatMap((m) => [m.sales, m.rentals]));
    return months.map((m) => ({
      ...m,
      salesPercent: maxVal > 0 && m.sales > 0 ? Math.max(15, Math.round((m.sales / maxVal) * 100)) : 0,
      rentalsPercent: maxVal > 0 && m.rentals > 0 ? Math.max(15, Math.round((m.rentals / maxVal) * 100)) : 0,
    }));
  }, [bookings]);

  const hasRevenue = monthlyRevenue.some((m) => m.sales > 0 || m.rentals > 0);

  const getStatusStyle = (status: string, orderType?: string) => {
    if (orderType === "buy") {
      return { label: "Acquisition", color: "#E6CA65", bg: "rgba(201, 163, 74, 0.15)" };
    }
    switch (status) {
      case "pending":
      case "booked":
        return { label: "Pending", color: "#C9A34A", bg: "rgba(201, 163, 74, 0.15)" };
      case "allocated":
      case "ready_for_pickup":
        return { label: "Ready", color: "#60A5FA", bg: "rgba(59, 130, 246, 0.15)" };
      case "picked_up":
      case "rent_paid":
        return { label: "Active", color: "#34D399", bg: "rgba(16, 185, 129, 0.15)" };
      case "return_requested":
        return { label: "Inspection", color: "#EB89A4", bg: "rgba(235, 137, 164, 0.15)" };
      case "returned":
        return { label: "Completed", color: "#A3A3A3", bg: "rgba(255, 255, 255, 0.08)" };
      default:
        return { label: status, color: "#FFFFFF", bg: "rgba(255, 255, 255, 0.08)" };
    }
  };

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1240, margin: "0 auto", color: "#FFFFFF" }}>
      
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 700 }}>
            ADMIN CONSOLE • OWNER/STAFF
          </span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.2rem", color: "#FFFFFF", fontWeight: 500, marginTop: 4 }}>
            Dashboard Overview
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem", marginTop: 4 }}>
            Live analytics for revenue, bookings, asset lifecycle, and dry care dispatches.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => navigate("/admin/assets")}
            className="btn-rose-primary"
            style={{ padding: "10px 20px", fontSize: "0.82rem" }}
          >
            + Add New Asset
          </button>
          <button
            onClick={() => navigate("/admin/ops")}
            className="btn-gold-outline"
            style={{ padding: "10px 18px", fontSize: "0.82rem" }}
          >
            Fulfillment Ops
          </button>
        </div>
      </div>

      {/* 4 Dynamic Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 36 }}>
        
        {/* Metric 1: Total Sales */}
        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderTop: "3px solid #EB89A4",
            borderRadius: 14,
            padding: "20px 22px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Total Sales
            </span>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(235,137,164,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={16} color="#EB89A4" />
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 700, color: "#FFFFFF" }}>
            ₹{totalSales.toLocaleString()}
          </span>
          <p style={{ fontSize: "0.75rem", color: buyCount > 0 ? "#4ADE80" : "var(--color-text-muted)", marginTop: 4 }}>
            {buyCount > 0 ? `${buyCount} outright purchase${buyCount > 1 ? "s" : ""} recorded` : "0 purchases recorded"}
          </p>
        </div>

        {/* Metric 2: Total Rentals */}
        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderTop: "3px solid #C9A34A",
            borderRadius: 14,
            padding: "20px 22px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Total Rentals
            </span>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(201,163,74,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Crown size={16} color="#C9A34A" />
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 700, color: "#FFFFFF" }}>
            ₹{totalRentals.toLocaleString()}
          </span>
          <p style={{ fontSize: "0.75rem", color: "#C9A34A", marginTop: 4 }}>
            {rentalCount} reservation{rentalCount !== 1 ? "s" : ""} recorded
          </p>
        </div>

        {/* Metric 3: Total Orders */}
        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderTop: "3px solid #4ADE80",
            borderRadius: 14,
            padding: "20px 22px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Total Orders
            </span>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(74,222,128,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={16} color="#4ADE80" />
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 700, color: "#FFFFFF" }}>
            {totalOrders}
          </span>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>
            {pendingAllocations.length} awaiting allocation
          </p>
        </div>

        {/* Metric 4: Active Rentals */}
        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderTop: "3px solid #38BDF8",
            borderRadius: 14,
            padding: "20px 22px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Active Rentals
            </span>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(56,189,248,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shirt size={16} color="#38BDF8" />
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 700, color: "#FFFFFF" }}>
            {activeRentals.length}
          </span>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>
            {activeRentals.length === 1 ? "1 piece in client possession" : `${activeRentals.length} in client possession / events`}
          </p>
        </div>

      </div>

      {/* Middle Grid: Revenue Overview Chart & Recent Bookings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, marginBottom: 36 }}>
        
        {/* Revenue Overview Visual */}
        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 16,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
              Revenue Overview
            </h3>
            <div style={{ display: "flex", gap: 12, fontSize: "0.75rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#EB89A4" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EB89A4" }} /> Sales
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#C9A34A" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A34A" }} /> Rentals
              </span>
            </div>
          </div>

          {/* Bar Chart Representation or Clean Zero-State */}
          {hasRevenue ? (
            <div style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 16, paddingBottom: 10 }}>
              {monthlyRevenue.map((col) => (
                <div key={col.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: "100%", display: "flex", gap: 4, alignItems: "flex-end", height: 160 }}>
                    <div
                      title={`Sales: ₹${col.sales.toLocaleString()}`}
                      style={{
                        flex: 1,
                        height: `${col.salesPercent}%`,
                        background: "linear-gradient(to top, #C76582, #EB89A4)",
                        borderRadius: "4px 4px 0 0",
                        minHeight: col.sales > 0 ? 8 : 2,
                        opacity: col.sales > 0 ? 1 : 0.2,
                      }}
                    />
                    <div
                      title={`Rentals: ₹${col.rentals.toLocaleString()}`}
                      style={{
                        flex: 1,
                        height: `${col.rentalsPercent}%`,
                        background: "linear-gradient(to top, #967830, #C9A34A)",
                        borderRadius: "4px 4px 0 0",
                        minHeight: col.rentals > 0 ? 8 : 2,
                        opacity: col.rentals > 0 ? 1 : 0.2,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-faint)" }}>{col.month}</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "24px 20px",
                textAlign: "center",
              }}
            >
              <BarChart3 size={32} color="#C9A34A" style={{ opacity: 0.5, marginBottom: 8 }} />
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#FFFFFF" }}>No Revenue Recorded Yet</span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4, maxWidth: 300, lineHeight: 1.4 }}>
                Monthly sales and rental revenue analytics will graph here automatically as new orders occur.
              </span>
            </div>
          )}
        </div>

        {/* Recent Bookings List or Clean Zero-State */}
        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 16,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
              Recent Bookings & Orders
            </h3>
            <button
              onClick={() => navigate("/admin/ops")}
              style={{ background: "transparent", border: "none", color: "#EB89A4", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
            >
              View All
            </button>
          </div>

          {recentBookings.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {recentBookings.map((b) => {
                const badge = getStatusStyle(b.status, b.order_type);
                const clientName = b.user?.full_name || b.user?.email || `Client #${b.user_id}`;
                const reqAsset = b.requested_asset_id ? assetMap.get(b.requested_asset_id) : null;
                const pieceTitle = reqAsset?.name || (b.order_type === "buy" ? "Direct Acquisition" : b.rental_plan?.name || "Occasion Rental");
                const dateText = b.order_type === "buy" ? `Ordered: ${b.pickup_date}` : `${b.pickup_date} - ${b.due_date}`;
                return (
                  <div
                    key={b.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "#1A1A1A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
                        {clientName}
                      </h4>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {pieceTitle} • {dateText}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 9999,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: badge.color,
                        background: badge.bg,
                        flexShrink: 0,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "24px 20px",
                textAlign: "center",
              }}
            >
              <Calendar size={32} color="#EB89A4" style={{ opacity: 0.5, marginBottom: 8 }} />
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#FFFFFF" }}>No Bookings Recorded Yet</span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4, maxWidth: 320, lineHeight: 1.4 }}>
                All new client occasion bookings and direct purchase orders will display here in real-time.
              </span>
              <button
                onClick={() => navigate("/admin/assets")}
                style={{
                  marginTop: 14,
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: "rgba(201, 163, 74, 0.15)",
                  border: "1px solid rgba(201, 163, 74, 0.35)",
                  color: "#C9A34A",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Add Vault Asset
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
        {[
          { title: "Product Management", desc: "Audit catalog, update daily rent tiers, upload photos", link: "/admin/assets" },
          { title: "Rental Management", desc: "Allocate available pieces & track rental schedules", link: "/admin/ops" },
          { title: "Laundry Tracking", desc: "Monitor dispatched pieces with fabric care partners", link: "/admin/dry-cleaning" },
          { title: "User & Privilege Access", desc: "Manage client histories and authorized administrators", link: "/admin/users" },
        ].map((item, idx) => (
          <div
            key={idx}
            onClick={() => navigate(item.link)}
            style={{
              background: "#141414",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "20px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#C9A34A";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#FFFFFF", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {item.title} <ArrowRight size={15} color="#C9A34A" />
            </h4>
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
