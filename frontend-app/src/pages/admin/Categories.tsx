import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  Plus,
  Trash2,
  Edit3,
  X,
  Search,
  Crown,
  FolderOpen,
  Layers,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../api";
import { useAuth } from "../../auth-context";
import type { Category, Asset } from "../../types";

export function AdminCategoriesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"id-asc" | "id-desc" | "name-asc" | "assets-desc">("id-asc");
  const [createError, setCreateError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch Categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.listCategories(token),
  });

  // Fetch Assets to calculate real-time inventory counts per category
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["admin-assets"],
    queryFn: () => api.listAssetsFiltered(token),
  });

  // Calculate items assigned to each category
  const getAssetsForCategory = (categoryId: number) => {
    return assets.filter((asset) => asset.category_id === categoryId);
  };

  // Toast feedback helper
  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (name: string) => api.createCategory(token!, { name: name.trim() }),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewCategoryName("");
      setCreateError(null);
      showToast(`Category "${newCat.name}" (#0${newCat.id}) created successfully`);
    },
    onError: (err: any) => {
      setCreateError(err?.message || "Failed to create category");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.updateCategory(token!, id, { name: name.trim() }),
    onSuccess: (updatedCat) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setEditingCategory(null);
      setEditError(null);
      showToast(`Category #${updatedCat.id} updated to "${updatedCat.name}"`);
    },
    onError: (err: any) => {
      setEditError(err?.message || "Failed to update category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCategory(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      const deletedName = deletingCategory?.name;
      setDeletingCategory(null);
      setDeleteError(null);
      showToast(`Category "${deletedName}" has been removed`);
    },
    onError: (err: any) => {
      setDeleteError(err?.message || "Failed to delete category");
    },
  });

  // Sort and filter categories (Default: ID strictly ascending: #1, #2, #3...)
  const sortedCategories = useMemo(() => {
    const list = [...categories];
    switch (sortBy) {
      case "id-desc":
        return list.sort((a, b) => b.id - a.id);
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "assets-desc":
        return list.sort(
          (a, b) => getAssetsForCategory(b.id).length - getAssetsForCategory(a.id).length
        );
      case "id-asc":
      default:
        return list.sort((a, b) => a.id - b.id);
    }
  }, [categories, sortBy, assets]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return sortedCategories;
    const term = searchTerm.toLowerCase().trim();
    return sortedCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(term) ||
        cat.id.toString() === term.replace(/^#/, "") ||
        `#${cat.id}`.includes(term)
    );
  }, [sortedCategories, searchTerm]);

  // Summary Metrics
  const totalCategoriesCount = categories.length;
  const assignedAssetsCount = assets.filter((a) => a.category_id).length;
  const emptyCategoriesCount = categories.filter(
    (c) => getAssetsForCategory(c.id).length === 0
  ).length;

  const handleCreateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;

    // Check duplicate locally
    const exists = categories.some((c) => c.name.toLowerCase() === clean.toLowerCase());
    if (exists) {
      setCreateError(`Category "${clean}" already exists`);
      return;
    }

    setCreateError(null);
    createMutation.mutate(clean);
  };

  const handleEditSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingCategory) return;
    const clean = editingCategory.name.trim();
    if (!clean) {
      setEditError("Category name cannot be empty");
      return;
    }
    const exists = categories.some(
      (c) => c.id !== editingCategory.id && c.name.toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      setEditError(`Another category named "${clean}" already exists`);
      return;
    }
    setEditError(null);
    updateMutation.mutate({ id: editingCategory.id, name: clean });
  };

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto", color: "#FFFFFF" }}>
      
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
              ATELIER ARCHITECTURE & TAXONOMY
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
            Category Architecture
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginTop: 6, maxWidth: 600 }}>
            Organize vault items into structured designer collections with strict numerical sequencing.
          </p>
        </div>

        {/* Total Badge */}
        <div
          style={{
            background: "rgba(201, 163, 74, 0.1)",
            border: "1px solid rgba(201, 163, 74, 0.3)",
            borderRadius: 12,
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Layers size={20} color="#C9A34A" />
          <div>
            <div style={{ fontSize: "0.7rem", color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Total Collections
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#FFFFFF", fontFamily: "var(--font-brand)" }}>
              {totalCategoriesCount} Active
            </div>
          </div>
        </div>
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
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Collections</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#FFFFFF" }}>{totalCategoriesCount} Categories</div>
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
            <Tag size={20} color="#EB89A4" />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Assigned Inventory</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#FFFFFF" }}>{assignedAssetsCount} Pieces Cataloged</div>
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
            <FolderOpen size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Empty Collections</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: emptyCategoriesCount > 0 ? "#C9A34A" : "#888" }}>
              {emptyCategoriesCount} Removable
            </div>
          </div>
        </div>
      </div>

      {/* ── CREATE NEW CATEGORY STUDIO ── */}
      <div
        style={{
          background: "#141414",
          border: "1.5px solid rgba(201, 163, 74, 0.35)",
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 28,
          boxShadow: "0 15px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3
              style={{
                fontSize: "0.95rem",
                color: "#C9A34A",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: 0,
              }}
            >
              Create New Atelier Collection
            </h3>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", margin: "4px 0 0" }}>
              New categories are assigned next sequential ID automatically and immediately available across Rent & Buy manifests.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateSubmit}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="e.g. Bridal Lehengas, Royale Sherwanis, Polki Sets, Haute Gowns..."
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                if (createError) setCreateError(null);
              }}
              style={{
                flex: 1,
                minWidth: 280,
                padding: "12px 18px",
                borderRadius: 10,
                background: "#1a1a1a",
                border: createError ? "1.5px solid #f87171" : "1px solid rgba(255, 255, 255, 0.15)",
                color: "#FFFFFF",
                fontSize: "0.92rem",
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#C9A34A")}
              onBlur={(e) => (e.currentTarget.style.borderColor = createError ? "#f87171" : "rgba(255, 255, 255, 0.15)")}
            />
            <button
              type="submit"
              disabled={createMutation.isPending || !newCategoryName.trim()}
              className="btn-rose-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: 10,
                fontSize: "0.88rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: !newCategoryName.trim() || createMutation.isPending ? "not-allowed" : "pointer",
                opacity: !newCategoryName.trim() ? 0.6 : 1,
              }}
            >
              <Plus size={18} />
              {createMutation.isPending ? "Creating..." : "Add Category"}
            </button>
          </div>
          {createError && (
            <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} />
              <span>{createError}</span>
            </div>
          )}
        </form>
      </div>

      {/* ── TOOLBAR: SEARCH & ID ORDERING SELECTOR ── */}
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
        <div style={{ position: "relative", minWidth: 300, flex: 1 }}>
          <Search
            size={16}
            color="#888"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search collection name or category ID (e.g. #01, Bridal)..."
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

        {/* Sort Selector */}
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
            <option value="id-asc">ID (Increasing 1 → 9)</option>
            <option value="id-desc">ID (Decreasing 9 → 1)</option>
            <option value="name-asc">Name (Alphabetical A → Z)</option>
            <option value="assets-desc">Inventory Count (Highest first)</option>
          </select>
        </div>
      </div>

      {/* ── CATEGORIES TABLE ── */}
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
              <th
                style={{
                  padding: "16px 22px",
                  fontSize: "0.72rem",
                  color: "#C9A34A",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  width: "120px",
                }}
              >
                ID SEQUENCE
              </th>
              <th
                style={{
                  padding: "16px 22px",
                  fontSize: "0.72rem",
                  color: "#C9A34A",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                }}
              >
                COLLECTION NAME
              </th>
              <th
                style={{
                  padding: "16px 22px",
                  fontSize: "0.72rem",
                  color: "#C9A34A",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                }}
              >
                CATALOG INVENTORY
              </th>
              <th
                style={{
                  padding: "16px 22px",
                  fontSize: "0.72rem",
                  color: "#C9A34A",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  textAlign: "right",
                  width: "160px",
                }}
              >
                MANAGEMENT
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoadingCategories ? (
              <tr>
                <td colSpan={4} style={{ padding: "48px 20px", textAlign: "center", color: "#888" }}>
                  Loading designer collections...
                </td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "48px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No collections match "{searchTerm}". Try another search or create a new category above.
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat) => {
                const catAssets = getAssetsForCategory(cat.id);
                const hasAssets = catAssets.length > 0;
                const formattedId = cat.id < 10 ? `#0${cat.id}` : `#${cat.id}`;

                return (
                  <tr
                    key={cat.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* ID Sequence (Increasing Order) */}
                    <td style={{ padding: "16px 22px" }}>
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
                          letterSpacing: "0.06em",
                        }}
                      >
                        {formattedId}
                      </span>
                    </td>

                    {/* Category Name */}
                    <td style={{ padding: "16px 22px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: "0.96rem", color: "#FFFFFF", fontWeight: 600 }}>
                          {cat.name}
                        </span>
                      </div>
                    </td>

                    {/* Catalog Inventory Count Badge */}
                    <td style={{ padding: "16px 22px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 12px",
                          borderRadius: 9999,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          background: hasAssets ? "rgba(201, 163, 74, 0.12)" : "rgba(255, 255, 255, 0.05)",
                          border: hasAssets ? "1px solid rgba(201, 163, 74, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                          color: hasAssets ? "#C9A34A" : "#888888",
                        }}
                      >
                        <Tag size={12} color={hasAssets ? "#C9A34A" : "#888888"} />
                        {hasAssets ? `${catAssets.length} Active Piece${catAssets.length > 1 ? "s" : ""}` : "Empty Collection"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "16px 22px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            setEditingCategory({ id: cat.id, name: cat.name });
                            setEditError(null);
                          }}
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
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(201, 163, 74, 0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(201, 163, 74, 0.12)";
                          }}
                          title="Edit Category"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            setDeletingCategory(cat);
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
                          title="Delete Category"
                        >
                          <Trash2 size={14} />
                          Delete
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

      {/* ── EDIT CATEGORY MODAL ── */}
      <AnimatePresence>
        {editingCategory && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
            onClick={() => setEditingCategory(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                width: "100%",
                maxWidth: 480,
                background: "#141414",
                border: "1.5px solid rgba(201, 163, 74, 0.4)",
                borderRadius: 16,
                padding: "28px 30px",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(201, 163, 74, 0.12)",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setEditingCategory(null)}
                style={{
                  position: "absolute",
                  top: 18,
                  right: 18,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "50%",
                  width: 30,
                  height: 30,
                  color: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Edit3 size={16} color="#C9A34A" />
                  <span style={{ fontSize: "0.7rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    EDIT ATELIER TAXONOMY
                  </span>
                </div>
                <h3
                  className="gold-metallic-text"
                  style={{
                    fontFamily: "var(--font-brand)",
                    fontSize: "1.45rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    margin: "4px 0 0",
                    textTransform: "uppercase",
                  }}
                >
                  Edit Category #{editingCategory.id}
                </h3>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={editingCategory.name}
                    onChange={(e) => {
                      setEditingCategory({ ...editingCategory, name: e.target.value });
                      if (editError) setEditError(null);
                    }}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px",
                      borderRadius: 8,
                      background: "#1a1a1a",
                      border: editError ? "1.5px solid #f87171" : "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#FFFFFF",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  />
                  {editError && (
                    <div style={{ marginTop: 6, fontSize: "0.76rem", color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangle size={13} />
                      <span>{editError}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
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
                    disabled={updateMutation.isPending || !editingCategory.name.trim()}
                    className="btn-rose-primary"
                    style={{
                      padding: "10px 22px",
                      borderRadius: 8,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      cursor: updateMutation.isPending || !editingCategory.name.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── LUXURY DELETE CONFIRMATION POPUP ── */}
      <AnimatePresence>
        {deletingCategory && (() => {
          const catAssets = getAssetsForCategory(deletingCategory.id);
          const hasAssets = catAssets.length > 0;

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
              onClick={() => setDeletingCategory(null)}
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
                  border: hasAssets ? "1.5px solid rgba(245, 158, 11, 0.4)" : "1.5px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: 16,
                  padding: "32px 28px",
                  boxShadow: hasAssets
                    ? "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 158, 11, 0.15)"
                    : "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(239, 68, 68, 0.15)",
                  position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setDeletingCategory(null)}
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

                {/* Badge Icon */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: hasAssets ? "rgba(245, 158, 11, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    border: hasAssets ? "1.5px solid rgba(245, 158, 11, 0.35)" : "1.5px solid rgba(239, 68, 68, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: hasAssets ? "#f59e0b" : "#f87171",
                    margin: "0 auto 18px",
                    boxShadow: hasAssets ? "0 0 20px rgba(245, 158, 11, 0.2)" : "0 0 20px rgba(239, 68, 68, 0.2)",
                  }}
                >
                  {hasAssets ? <ShieldAlert size={26} /> : <Trash2 size={24} />}
                </div>

                {/* Title & Description */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      color: hasAssets ? "#f59e0b" : "#f87171",
                      textTransform: "uppercase",
                    }}
                  >
                    {hasAssets ? "CATALOG INTEGRITY SAFEGUARD" : "PERMANENT ARCHIVE DELETION"}
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
                    {hasAssets ? "Category In Use" : "Delete Collection?"}
                  </h3>
                  <p style={{ fontSize: "0.84rem", color: "rgba(255, 255, 255, 0.7)", margin: 0, lineHeight: 1.5 }}>
                    {hasAssets ? (
                      <>
                        The collection <strong style={{ color: "#FFFFFF" }}>"{deletingCategory.name}"</strong> (#{deletingCategory.id}) currently has <strong style={{ color: "#f59e0b" }}>{catAssets.length} active inventory item(s)</strong> assigned to it.
                      </>
                    ) : (
                      <>
                        Are you sure you want to permanently remove <strong style={{ color: "#FFFFFF" }}>"{deletingCategory.name}"</strong> (ID #{deletingCategory.id})? This empty category will be removed immediately.
                      </>
                    )}
                  </p>
                </div>

                {/* Active Items Warning Preview if has assets */}
                {hasAssets && (
                  <div
                    style={{
                      background: "#1c1c1c",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                      Assigned Pieces in Vault:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                      {catAssets.slice(0, 3).map((asset) => (
                        <div key={asset.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.78rem", color: "rgba(255,255,255,0.85)" }}>
                          <img
                            src={asset.image_url || "/elanora-emblem.png"}
                            alt={asset.name}
                            style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }}
                          />
                          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {asset.name}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#C9A34A", fontFamily: "monospace" }}>
                            {asset.asset_code}
                          </span>
                        </div>
                      ))}
                      {catAssets.length > 3 && (
                        <span style={{ fontSize: "0.72rem", color: "#888", textAlign: "center", marginTop: 4 }}>
                          + {catAssets.length - 3} more piece(s)
                        </span>
                      )}
                    </div>
                  </div>
                )}

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
                    onClick={() => setDeletingCategory(null)}
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
                    {hasAssets ? "Close" : "Cancel"}
                  </button>

                  {hasAssets ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingCategory(null);
                        navigate("/admin/assets");
                      }}
                      style={{
                        flex: 1.4,
                        padding: "12px",
                        borderRadius: 10,
                        background: "rgba(201, 163, 74, 0.15)",
                        border: "1.5px solid #C9A34A",
                        color: "#C9A34A",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <ExternalLink size={14} />
                      Manage in Manifest
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(deletingCategory.id)}
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
                      {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
