import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Package2,
  Plus,
  Trash2,
  Edit,
  Tag,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Crown,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  Palette,
  Sparkles,
  Star,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  ShieldCheck,
} from "lucide-react";
import React, { useMemo } from "react";
import { api, request } from "../../api";
import { useAuth } from "../../auth-context";
import type { Asset, Category, AssetCreatePayload, ColorVariant } from "../../types";

export function AdminAssetsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"all" | "sale" | "rental">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formGalleryImages, setFormGalleryImages] = useState<string[]>([]);
  const [galleryUrlInput, setGalleryUrlInput] = useState<string>("");
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingShadeIdx, setUploadingShadeIdx] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [retiringAsset, setRetiringAsset] = useState<Asset | null>(null);

  // Grouped Product Management & Units Drawer State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [addingStockGroup, setAddingStockGroup] = useState<any | null>(null);
  const [addStockQty, setAddStockQty] = useState<number>(1);
  const [retiringGroup, setRetiringGroup] = useState<any | null>(null);

  // Form state & Validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<number>(1);
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formListingType, setFormListingType] = useState<"both" | "rent" | "buy">("both");
  const [formBuyPrice, setFormBuyPrice] = useState<number>(8999);
  const [formRentalPrice, setFormRentalPrice] = useState<number>(2499);
  const [formSizes, setFormSizes] = useState<string[]>(["XS", "S", "M", "L", "XL"]);
  const [formVariants, setFormVariants] = useState<ColorVariant[]>([]);

  const { data: rawAssets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["admin-assets", token],
    queryFn: () => api.listAssets(token),
  });
  const assets = Array.isArray(rawAssets) ? rawAssets : [];

  const { data: rawCategories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.listCategories(token),
  });
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  const clearFieldError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      if (Object.keys(next).length === 0) {
        setShowValidationAlert(false);
      }
      return next;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formName.trim()) {
      errors.name = "Garment title / product name is required.";
    } else if (formName.trim().length < 3) {
      errors.name = "Garment title must be at least 3 characters long.";
    }

    if (!formCategoryId || Number(formCategoryId) <= 0) {
      errors.category = "Please select an Atelier category.";
    }

    if (formListingType === "both" || formListingType === "buy") {
      if (!formBuyPrice || Number(formBuyPrice) <= 0) {
        errors.buyPrice = "Please enter a valid retail purchase price (₹).";
      }
    }

    if (formListingType === "both" || formListingType === "rent") {
      if (!formRentalPrice || Number(formRentalPrice) <= 0) {
        errors.rentalPrice = "Please enter a valid rental daily rate (₹).";
      }
    }

    if (!formSizes || formSizes.length === 0) {
      errors.sizes = "Please select at least one available size (e.g. S, M, L).";
    }

    const hasGalleryImages = formGalleryImages.length > 0;
    const hasSingleImage = Boolean(formImage && formImage.trim());
    const hasVariantImages = formVariants.some((v) => v.image_url && v.image_url.trim());
    if (!hasGalleryImages && !hasSingleImage && !hasVariantImages) {
      errors.images = "Please upload at least one garment photo or paste an image URL.";
    }

    if (formVariants.length > 0) {
      const missingColor = formVariants.some((v) => !v.color || !v.color.trim());
      if (missingColor) {
        errors.variants = "All color shades must have a designated name (e.g. Royal Blush Rose).";
      }
    }

    if (!editingAsset) {
      if (!formQuantity || Number(formQuantity) < 1) {
        errors.quantity = "Initial inventory quantity must be at least 1.";
      }
    }

    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    setShowValidationAlert(!isValid);

    if (!isValid) {
      const modalBody = document.getElementById("asset-form-modal-body");
      if (modalBody) {
        modalBody.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    return isValid;
  };

  const openAddModal = () => {
    setFormErrors({});
    setShowValidationAlert(false);
    setEditingAsset(null);
    setFormName("");
    setFormDesc("");
    setFormImage("");
    setFormCategoryId(categories[0]?.id || 1);
    setFormQuantity(1);
    setFormListingType("both");
    setFormBuyPrice(38000);
    setFormRentalPrice(2899);
    setFormSizes(["XS", "S", "M", "L", "XL"]);
    setFormGalleryImages([]);
    setGalleryUrlInput("");
    setFormVariants([]);
    setShowModal(true);
  };

  const handleListingTypeSelect = (type: "both" | "rent" | "buy") => {
    setFormListingType(type);
    clearFieldError("buyPrice");
    clearFieldError("rentalPrice");
    if (type === "rent") {
      if (!formRentalPrice || formRentalPrice === 0) setFormRentalPrice(2499);
    } else if (type === "buy") {
      if (!formBuyPrice || formBuyPrice === 0) setFormBuyPrice(35000);
    } else if (type === "both") {
      if (!formBuyPrice || formBuyPrice === 0) setFormBuyPrice(35000);
      if (!formRentalPrice || formRentalPrice === 0) setFormRentalPrice(2499);
    }
  };

  const openEditModal = (asset: Asset) => {
    setFormErrors({});
    setShowValidationAlert(false);
    setEditingAsset(asset);
    setFormName(asset.name);
    setFormDesc(asset.description || "");
    setFormImage(asset.image_url || "");
    setFormCategoryId(asset.category_id);
    setFormListingType((asset.listing_type as any) || "both");
    setFormBuyPrice(asset.buy_price ?? 8999);
    setFormRentalPrice(asset.rental_price ?? 2499);
    setFormSizes(asset.sizes ? asset.sizes.split(",").map((s) => s.trim()) : ["XS", "S", "M", "L", "XL"]);
    
    // Load gallery images
    let initialGallery: string[] = [];
    if ((asset as any).gallery_images) {
      try {
        const parsed = JSON.parse((asset as any).gallery_images);
        if (Array.isArray(parsed)) initialGallery = parsed;
      } catch {}
    }
    if (initialGallery.length === 0 && asset.image_url) {
      initialGallery = [asset.image_url];
    }
    setFormGalleryImages(initialGallery);
    setGalleryUrlInput("");

    if (asset.color_variants) {
      try {
        const parsed = JSON.parse(asset.color_variants);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFormVariants(parsed.filter((v: ColorVariant) => v && v.color && v.color.trim()));
        } else {
          setFormVariants([]);
        }
      } catch {
        setFormVariants([]);
      }
    } else {
      setFormVariants([]);
    }
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, variantIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${api.baseUrl}/assets/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (variantIndex !== undefined) {
        const updated = [...formVariants];
        updated[variantIndex].image_url = data.image_url;
        setFormVariants(updated);
      } else {
        setFormImage(data.image_url);
      }
    } catch {
      alert("Image upload failed. You can paste a direct image URL instead.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Multi-Image Gallery Handlers
  const handleMultipleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const fileList = Array.from(files);
      const urls = await api.uploadMultipleImages(token!, fileList);
      if (urls.length > 0) {
        clearFieldError("images");
        setFormGalleryImages((prev) => {
          const updated = [...prev, ...urls];
          if (!formImage && updated.length > 0) setFormImage(updated[0]);
          return updated;
        });
      }
    } catch {
      alert("Failed to upload images. Check that files are PNG, JPG or WEBP.");
    } finally {
      setUploadingGallery(false);
      e.target.value = "";
    }
  };

  const addGalleryUrl = () => {
    if (!galleryUrlInput.trim()) return;
    clearFieldError("images");
    const url = galleryUrlInput.trim();
    setFormGalleryImages((prev) => {
      const updated = [...prev, url];
      if (!formImage && updated.length > 0) setFormImage(updated[0]);
      return updated;
    });
    setGalleryUrlInput("");
  };

  const setPrimaryCover = (index: number) => {
    setFormGalleryImages((prev) => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      const updated = [selected, ...rest];
      setFormImage(selected);
      return updated;
    });
  };

  const removeGalleryImage = (index: number) => {
    setFormGalleryImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (formImage === prev[index]) {
        setFormImage(updated[0] || "");
      }
      return updated;
    });
  };

  const handleShadeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingShadeIdx(variantIndex);
    try {
      const url = await api.uploadSingleImage(token!, file);
      const updated = [...formVariants];
      updated[variantIndex].image_url = url;
      setFormVariants(updated);
      setFormGalleryImages((prev) => prev.includes(url) ? prev : [...prev, url]);
    } catch {
      alert("Failed to upload shade image.");
    } finally {
      setUploadingShadeIdx(null);
      e.target.value = "";
    }
  };

  const luxuryPresets = [
    { color: "Royal Crimson", hex: "#800020" },
    { color: "Champagne Gold", hex: "#C9A34A" },
    { color: "Moonlight Ivory", hex: "#F7F4EE" },
    { color: "Emerald Velvet", hex: "#0B4619" },
    { color: "Midnight Navy", hex: "#0B192C" },
    { color: "Blush Rose", hex: "#EB89A4" },
    { color: "Obsidian Noir", hex: "#181818" },
  ];

  const addPresetShade = (preset: { color: string; hex: string }) => {
    clearFieldError("variants");
    setFormVariants((prev) => [
      ...prev,
      { color: preset.color, hex: preset.hex, image_url: formGalleryImages[0] || formImage || "" },
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Only persist relevant price based on selected listing type
      const finalBuyPrice = formListingType === "rent" ? null : (formBuyPrice ? Number(formBuyPrice) : null);
      const finalRentalPrice = formListingType === "buy" ? null : (formRentalPrice ? Number(formRentalPrice) : null);

      const primaryCover = formGalleryImages[0] || formImage || formVariants[0]?.image_url || null;
      const galleryJson = JSON.stringify(formGalleryImages);

      const payload: any = {
        name: formName,
        description: formDesc,
        image_url: primaryCover,
        gallery_images: galleryJson,
        category_id: formCategoryId,
        quantity: formQuantity,
        listing_type: formListingType,
        buy_price: finalBuyPrice,
        rental_price: finalRentalPrice,
        sizes: formSizes.join(","),
        color_variants: JSON.stringify(formVariants),
      };

      if (editingAsset) {
        return api.updateAsset(token!, editingAsset.id, {
          name: formName,
          description: formDesc,
          image_url: primaryCover,
          gallery_images: galleryJson,
          category_id: formCategoryId,
          listing_type: formListingType,
          buy_price: finalBuyPrice,
          rental_price: finalRentalPrice,
          sizes: formSizes.join(","),
          color_variants: JSON.stringify(formVariants),
          update_all_units: true,
        });
      } else {
        return request<Asset[]>("/assets/", {
          method: "POST",
          token,
          body: payload,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setShowModal(false);
    },
    onError: (err: any) => {
      setFormErrors({ server: err?.message || "Failed to save garment. Please check all details and try again." });
      setShowValidationAlert(true);
      const modalBody = document.getElementById("asset-form-modal-body");
      if (modalBody) {
        modalBody.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
  });

  const handleSaveClick = () => {
    if (!validateForm()) {
      return;
    }
    saveMutation.mutate();
  };

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: number) => api.deleteAsset(token!, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const addStockMutation = useMutation({
    mutationFn: async () => {
      if (!addingStockGroup || addStockQty < 1) return;
      return api.addAssetStock(token!, addingStockGroup.primaryAsset.id, addStockQty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setAddingStockGroup(null);
      setAddStockQty(1);
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to add stock units");
    },
  });

  const deleteAssetGroupMutation = useMutation({
    mutationFn: async (grp: any) => {
      return api.deleteAssetGroup(token!, grp.primaryAsset.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setRetiringGroup(null);
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to retire product group");
    },
  });

  const toggleDryCleaningMutation = useMutation({
    mutationFn: async (unit: Asset) => {
      return api.updateAsset(token!, unit.id, {
        is_in_dry_cleaning: !unit.is_in_dry_cleaning,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const deleteSingleUnitMutation = useMutation({
    mutationFn: async (unitId: number) => {
      return api.deleteAsset(token!, unitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  // Filter assets by Tab (All, Sale, Rental), Search, Category
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || asset.category_id === Number(categoryFilter);

    const lType = asset.listing_type || "both";
    let matchesTab = true;
    if (activeTab === "sale") {
      matchesTab = lType === "buy" || lType === "both";
    } else if (activeTab === "rental") {
      matchesTab = lType === "rent" || lType === "both";
    }

    return matchesSearch && matchesCategory && matchesTab;
  });

  // Group filtered assets into unique product models so 9 units do not create 9 duplicate table rows
  const groupedAssets = useMemo(() => {
    const map = new Map<string, any>();
    for (const asset of filteredAssets) {
      const baseCode = asset.asset_code.replace(/-\d+$/, "");
      const key = `${asset.name.trim().toLowerCase()}__${asset.category_id}`;

      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          baseCode,
          name: asset.name,
          category_id: asset.category_id,
          primaryAsset: asset,
          units: [],
          totalStock: 0,
          availableStock: 0,
          rentedStock: 0,
          dryCleaningStock: 0,
        });
      }
      const grp = map.get(key)!;
      grp.units.push(asset);
      grp.totalStock += 1;
      if (asset.is_in_dry_cleaning) {
        grp.dryCleaningStock += 1;
      } else if (asset.status === "available" && asset.is_active) {
        grp.availableStock += 1;
      } else if (asset.status === "rented" || asset.status === "allocated") {
        grp.rentedStock += 1;
      }
    }
    for (const grp of map.values()) {
      grp.units.sort((a: Asset, b: Asset) => a.asset_code.localeCompare(b.asset_code));
    }
    return Array.from(map.values());
  }, [filteredAssets]);

  const toggleSize = (sz: string) => {
    clearFieldError("sizes");
    if (formSizes.includes(sz)) {
      setFormSizes(formSizes.filter((s) => s !== sz));
    } else {
      setFormSizes([...formSizes, sz]);
    }
  };

  const addVariant = () => {
    clearFieldError("variants");
    setFormVariants([...formVariants, { color: `Shade ${formVariants.length + 1}`, hex: "#C9A34A", image_url: formGalleryImages[0] || formImage || "" }]);
  };

  const removeVariant = (index: number) => {
    setFormVariants(formVariants.filter((_, idx) => idx !== index));
  };

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1260, margin: "0 auto", color: "#FFFFFF" }}>
      
      {/* ── TOP HEADER (MATCHES MOCKUP SCREEN 2: PRODUCT MANAGEMENT) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A34A", fontWeight: 700 }}>
            INVENTORY & CATALOG CONTROL
          </span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.2rem", color: "#FFFFFF", fontWeight: 500, margin: "4px 0 0" }}>
            Product Management
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem", marginTop: 4 }}>
            Manage Rent Vault & Buy collections, dual pricing, sizes, and color variant photos.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="btn-rose-primary"
          style={{ padding: "12px 24px", fontSize: "0.85rem", fontWeight: 700, boxShadow: "0 4px 18px rgba(235, 137, 164, 0.35)" }}
        >
          <Plus size={18} /> + Add Product
        </button>
      </div>

      {/* ── SEGMENTED FILTER TABS: All, Sale, Rental (MATCHING MOCKUP) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#141414",
            padding: "4px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <button
            onClick={() => setActiveTab("all")}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
              background: activeTab === "all" ? "#EB89A4" : "transparent",
              color: activeTab === "all" ? "#0B0B0B" : "#A3A3A3",
              transition: "all 0.2s",
            }}
          >
            All Products ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab("sale")}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
              background: activeTab === "sale" ? "#EB89A4" : "transparent",
              color: activeTab === "sale" ? "#0B0B0B" : "#A3A3A3",
              transition: "all 0.2s",
            }}
          >
            🛍️ Sale / Buy ({assets.filter((a) => (a.listing_type || "both") !== "rent").length})
          </button>
          <button
            onClick={() => setActiveTab("rental")}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
              background: activeTab === "rental" ? "#EB89A4" : "transparent",
              color: activeTab === "rental" ? "#0B0B0B" : "#A3A3A3",
              transition: "all 0.2s",
            }}
          >
            👗 Rental ({assets.filter((a) => (a.listing_type || "both") !== "buy").length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", width: 260 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888" }} />
            <input
              type="text"
              placeholder="Search product code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 14px 8px 36px",
                borderRadius: 8,
                background: "#181818",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#FFFFFF",
                fontSize: "0.82rem",
                outline: "none",
              }}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "#181818",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              outline: "none",
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── PRODUCT MANIFEST TABLE (MATCHING MOCKUP SCREEN 2) ── */}
      <div style={{ background: "#141414", borderRadius: 16, border: "1px solid rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#181818", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em" }}>Product & Code</th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em" }}>Type</th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pricing (Buy / Rent)</th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em" }}>Sizes & Colors</th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em" }}>Inventory Status</th>
              <th style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#C9A34A", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedAssets.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No products found for this section. Click "+ Add Product" to create one.
                </td>
              </tr>
            ) : (
              groupedAssets.map((grp: any) => {
                const asset = grp.primaryAsset;
                const bPrice = asset.buy_price ? `₹${asset.buy_price.toLocaleString("en-IN")}` : "₹8,999";
                const rPrice = asset.rental_price ? `₹${asset.rental_price.toLocaleString("en-IN")}/day` : "₹2,499/day";
                const lType = asset.listing_type || "both";
                const isExpanded = Boolean(expandedGroups[grp.groupKey]);

                return (
                  <React.Fragment key={grp.groupKey}>
                    <tr style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(255, 255, 255, 0.04)", background: isExpanded ? "rgba(201, 163, 74, 0.04)" : "transparent" }}>
                      {/* Thumbnail & Product Details */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <img
                            src={asset.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=100&q=80"}
                            alt={grp.name}
                            style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                          <div>
                            <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "#FFFFFF", display: "block" }}>
                              {grp.name}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: "0.75rem", color: "#C9A34A", fontFamily: "monospace", fontWeight: 700 }}>
                                {grp.baseCode}
                              </span>
                              <span style={{ fontSize: "0.68rem", color: "#A3A3A3", padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
                                {grp.totalStock} {grp.totalStock === 1 ? "unit" : "units"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Listing Type */}
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 9999,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background: lType === "rent" ? "rgba(201, 163, 74, 0.15)" : lType === "buy" ? "rgba(235, 137, 164, 0.15)" : "rgba(255, 255, 255, 0.1)",
                            color: lType === "rent" ? "#C9A34A" : lType === "buy" ? "#EB89A4" : "#FFFFFF",
                            border: lType === "rent" ? "1px solid rgba(201, 163, 74, 0.3)" : lType === "buy" ? "1px solid rgba(235, 137, 164, 0.3)" : "1px solid rgba(255, 255, 255, 0.2)",
                          }}
                        >
                          {lType === "rent" ? "Rental Only" : lType === "buy" ? "Sale Only" : "Rent & Sale"}
                        </span>
                      </td>

                      {/* Pricing */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                          {lType !== "rent" && (
                            <div style={{ color: "#FFFFFF" }}>
                              <span style={{ color: "#888", fontSize: "0.72rem" }}>Buy: </span>
                              <strong>{bPrice}</strong>
                            </div>
                          )}
                          {lType !== "buy" && (
                            <div style={{ color: "#EB89A4" }}>
                              <span style={{ color: "#888", fontSize: "0.72rem" }}>Rent: </span>
                              <strong>{rPrice}</strong>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Sizes & Colors */}
                      <td style={{ padding: "14px 20px", fontSize: "0.8rem", color: "#A3A3A3" }}>
                        <div>{asset.sizes || "XS, S, M, L, XL"}</div>
                      </td>

                      {/* Inventory Status with breakdown */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div>
                            {grp.availableStock > 0 ? (
                              <span
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 9999,
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  background: "rgba(34, 197, 94, 0.15)",
                                  color: "#4ade80",
                                  border: "1px solid rgba(34, 197, 94, 0.3)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                ● In Stock ({grp.availableStock}/{grp.totalStock} available)
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 9999,
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  background: "rgba(239, 68, 68, 0.15)",
                                  color: "#f87171",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                ● Out of Stock ({grp.totalStock} units)
                              </span>
                            )}
                          </div>
                          {(grp.rentedStock > 0 || grp.dryCleaningStock > 0) && (
                            <span style={{ fontSize: "0.68rem", color: "#888" }}>
                              {grp.rentedStock > 0 && `${grp.rentedStock} Rented`}
                              {grp.rentedStock > 0 && grp.dryCleaningStock > 0 && " · "}
                              {grp.dryCleaningStock > 0 && `${grp.dryCleaningStock} Laundry`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <button
                            onClick={() => toggleGroupExpand(grp.groupKey)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: isExpanded ? "rgba(201, 163, 74, 0.2)" : "rgba(255, 255, 255, 0.06)",
                              border: isExpanded ? "1px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.12)",
                              color: isExpanded ? "#C9A34A" : "#CCCCCC",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.74rem",
                              fontWeight: 600,
                              transition: "all 0.15s ease",
                            }}
                            title="Inspect individual physical garments"
                          >
                            <Layers size={13} />
                            {isExpanded ? "Hide Units" : `View ${grp.units.length} Units`}
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>

                          <button
                            onClick={() => {
                              setAddingStockGroup(grp);
                              setAddStockQty(1);
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: "rgba(201, 163, 74, 0.12)",
                              border: "1px solid rgba(201, 163, 74, 0.35)",
                              color: "#C9A34A",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.74rem",
                              fontWeight: 600,
                            }}
                            title="Add more stock units to this product style"
                          >
                            <Plus size={13} /> Add Stock
                          </button>

                          <button
                            onClick={() => openEditModal(asset)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                              color: "#FFFFFF",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.74rem",
                              fontWeight: 600,
                            }}
                            title="Edit Product Style Details"
                          >
                            <Edit size={13} /> Edit
                          </button>

                          <button
                            onClick={() => setRetiringGroup(grp)}
                            style={{
                              padding: "6px 8px",
                              borderRadius: 6,
                              background: "rgba(239, 68, 68, 0.1)",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                              color: "#f87171",
                              cursor: "pointer",
                            }}
                            title="Retire All Units of this Garment"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Physical Units Drawer */}
                    {isExpanded && (
                      <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <td colSpan={6} style={{ background: "#0E0E0E", padding: "16px 22px 20px 22px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.72rem", color: "#C9A34A", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Physical Unit Inventory Tracking ({grp.units.length} Units)
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "#888" }}>
                                Individual serial barcodes for white-glove lifecycle and sanitization.
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setAddingStockGroup(grp);
                                setAddStockQty(1);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#C9A34A",
                                fontSize: "0.72rem",
                                cursor: "pointer",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Plus size={13} /> + Add Another Unit
                            </button>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
                            {grp.units.map((unit: Asset) => {
                              const isDryCleaning = unit.is_in_dry_cleaning;
                              const isAvail = unit.status === "available" && !isDryCleaning && unit.is_active;
                              const isRented = unit.status === "rented" || unit.status === "allocated";

                              return (
                                <div
                                  key={unit.id}
                                  style={{
                                    background: "#161616",
                                    borderRadius: 10,
                                    border: "1px solid rgba(255, 255, 255, 0.08)",
                                    padding: "10px 14px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <div>
                                    <span style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 700, color: "#C9A34A", display: "block" }}>
                                      {unit.asset_code}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                      {isDryCleaning ? (
                                        <span style={{ fontSize: "0.66rem", color: "#E2C375", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(201, 163, 74, 0.18)" }}>
                                          🧼 In Laundry
                                        </span>
                                      ) : isAvail ? (
                                        <span style={{ fontSize: "0.66rem", color: "#4ade80", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(34, 197, 94, 0.15)" }}>
                                          ● Available
                                        </span>
                                      ) : isRented ? (
                                        <span style={{ fontSize: "0.66rem", color: "#facc15", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(250, 204, 21, 0.15)" }}>
                                          ● Rented / Allocated
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: "0.66rem", color: "#9ca3af", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(156, 163, 175, 0.15)" }}>
                                          ● {unit.status}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <button
                                      onClick={() => toggleDryCleaningMutation.mutate(unit)}
                                      disabled={toggleDryCleaningMutation.isPending}
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: 6,
                                        background: isDryCleaning ? "rgba(34, 197, 94, 0.15)" : "rgba(201, 163, 74, 0.12)",
                                        border: isDryCleaning ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(201, 163, 74, 0.3)",
                                        color: isDryCleaning ? "#4ade80" : "#C9A34A",
                                        cursor: "pointer",
                                        fontSize: "0.68rem",
                                        fontWeight: 600,
                                      }}
                                      title={isDryCleaning ? "Return unit to available inventory" : "Send unit to dry cleaning"}
                                    >
                                      {isDryCleaning ? "Mark Clean" : "🧼 Laundry"}
                                    </button>

                                    {grp.units.length > 1 && (
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`Retire unit ${unit.asset_code}?`)) {
                                            deleteSingleUnitMutation.mutate(unit.id);
                                          }
                                        }}
                                        disabled={deleteSingleUnitMutation.isPending}
                                        style={{
                                          padding: "4px 6px",
                                          borderRadius: 6,
                                          background: "transparent",
                                          border: "none",
                                          color: "#666",
                                          cursor: "pointer",
                                        }}
                                        title="Retire single physical unit"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── ADD / EDIT PRODUCT MODAL (QUIET LUXURY ATELIER CONTROL) ── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            id="asset-form-modal-body"
            className="luxury-modal-scroll"
            style={{
              background: "#141414",
              border: "1.5px solid rgba(201, 163, 74, 0.35)",
              borderRadius: 20,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "32px 36px",
              boxShadow: "0 25px 70px rgba(0,0,0,0.95), 0 0 50px rgba(201, 163, 74, 0.08)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 18 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Crown size={16} color="#C9A34A" />
                  <span style={{ fontSize: "0.72rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                    ATELIER INVENTORY MANIFEST
                  </span>
                </div>
                <h2 className="gold-metallic-text" style={{ fontFamily: "var(--font-brand)", fontSize: "1.65rem", fontWeight: 600, letterSpacing: "0.06em", margin: 0, textTransform: "uppercase" }}>
                  {editingAsset ? "Edit Product Details" : "Add New Vault Product"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  color: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Prominent Missing Fields Validation Alert Banner */}
            {showValidationAlert && Object.keys(formErrors).length > 0 && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(185, 28, 28, 0.12) 100%)",
                  border: "1.5px solid #EF4444",
                  borderRadius: 12,
                  padding: "16px 20px",
                  marginBottom: 18,
                  boxShadow: "0 8px 25px rgba(239, 68, 68, 0.25)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(239, 68, 68, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <AlertCircle size={18} color="#EF4444" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.02em" }}>
                        Missing Required Information
                      </h4>
                      <span style={{ fontSize: "0.75rem", color: "#FCA5A5" }}>
                        Please complete the highlighted required fields below before saving this piece:
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowValidationAlert(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.6)",
                      cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <ul style={{ margin: "2px 0 0 0", paddingLeft: 34, fontSize: "0.78rem", color: "#FECACA", display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(formErrors).map(([key, msg]) => (
                    <li key={key} style={{ lineHeight: 1.4 }}>
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              
              {/* Product Name & Category */}
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: "0.74rem", color: formErrors.name ? "#EF4444" : "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span>Product Name *</span>
                    {formErrors.name && <span style={{ textTransform: "none", fontSize: "0.68rem", color: "#EF4444" }}>Required</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. The Royal Maroon Zardozi Lehenga"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      clearFieldError("name");
                    }}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px",
                      borderRadius: 10,
                      background: "#1a1a1a",
                      border: formErrors.name ? "1.5px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.12)",
                      boxShadow: formErrors.name ? "0 0 10px rgba(239, 68, 68, 0.25)" : "none",
                      color: "#FFFFFF",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                  {formErrors.name && (
                    <div style={{ color: "#EF4444", fontSize: "0.72rem", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={12} /> {formErrors.name}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: "0.74rem", color: formErrors.category ? "#EF4444" : "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span>Atelier Category *</span>
                    {formErrors.category && <span style={{ textTransform: "none", fontSize: "0.68rem", color: "#EF4444" }}>Required</span>}
                  </label>
                  {categories.length === 0 ? (
                    <div
                      style={{
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: formErrors.category ? "1.5px solid #EF4444" : "1px dashed rgba(201, 163, 74, 0.4)",
                        color: "#C9A34A",
                        fontSize: "0.82rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.78rem", color: "#A3A3A3" }}>No categories yet</span>
                      <Link to="/admin/categories" style={{ color: "#C9A34A", fontWeight: 700, fontSize: "0.75rem", textDecoration: "underline" }}>
                        + Add Category &rarr;
                      </Link>
                    </div>
                  ) : (
                    <select
                      value={formCategoryId}
                      onChange={(e) => {
                        setFormCategoryId(Number(e.target.value));
                        clearFieldError("category");
                      }}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#1a1a1a",
                        border: formErrors.category ? "1.5px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.12)",
                        boxShadow: formErrors.category ? "0 0 10px rgba(239, 68, 68, 0.25)" : "none",
                        color: "#FFFFFF",
                        fontSize: "0.88rem",
                        outline: "none",
                      }}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  {formErrors.category && (
                    <div style={{ color: "#EF4444", fontSize: "0.72rem", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={12} /> {formErrors.category}
                    </div>
                  )}
                </div>
              </div>

              {/* ── LISTING ALLOCATION (3 SEGMENT CARDS) ── */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Listing Allocation (Section) *
                  </label>
                  <span style={{ fontSize: "0.7rem", color: "#888" }}>
                    Controls whether this piece appears in Rent Vault, Buy Store, or Both
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { id: "both", label: "Rent & Buy (Both)", desc: "Dual Pricing Enabled" },
                    { id: "rent", label: "Rental Only (Rent)", desc: "Occasion Vault Piece" },
                    { id: "buy", label: "Sale Only (Buy)", desc: "Ready-To-Wear Purchase" },
                  ].map((t) => {
                    const isSelected = formListingType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleListingTypeSelect(t.id as any)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          textAlign: "left",
                          background: isSelected ? "rgba(201, 163, 74, 0.15)" : "#1a1a1a",
                          border: isSelected ? "1.5px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.1)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected ? "0 4px 18px rgba(201, 163, 74, 0.2)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: isSelected ? "#C9A34A" : "#FFFFFF" }}>
                            {t.label}
                          </span>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: isSelected ? "#C9A34A" : "rgba(255,255,255,0.2)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.68rem", color: isSelected ? "rgba(255,255,255,0.85)" : "#777", display: "block" }}>
                          {t.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {formErrors.sizes && (
                  <div style={{ color: "#EF4444", fontSize: "0.72rem", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={12} /> {formErrors.sizes}
                  </div>
                )}
              </div>

              {/* ── DYNAMIC PRICING ARCHITECTURE (EXCLUSIVE OR DUAL EDITING) ── */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Pricing Architecture
                  </label>
                  <span style={{ fontSize: "0.7rem", color: "#888" }}>
                    {formListingType === "both" && "✨ Both prices are editable with independent values"}
                    {formListingType === "rent" && "👗 Only Rental Rate is editable · Sale price locked"}
                    {formListingType === "buy" && "🛍️ Only Buy Price is editable · Rental rate locked"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  
                  {/* BUY PRICE CARD */}
                  <div
                    style={{
                      background: formListingType === "rent" ? "#121212" : "#1a1a1a",
                      border: formListingType === "rent"
                        ? "1px dashed rgba(255, 255, 255, 0.12)"
                        : formErrors.buyPrice
                        ? "1.5px solid #EF4444"
                        : "1.5px solid rgba(201, 163, 74, 0.4)",
                      boxShadow: formErrors.buyPrice ? "0 0 12px rgba(239, 68, 68, 0.25)" : "none",
                      borderRadius: 10,
                      padding: "14px 16px",
                      opacity: formListingType === "rent" ? 0.4 : 1,
                      transition: "all 0.25s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: "0.74rem", color: formListingType === "rent" ? "#666" : "#FFFFFF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Buy to Own Price
                      </label>
                      <span
                        style={{
                          fontSize: "0.62rem",
                          padding: "2px 8px",
                          borderRadius: 9999,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background: formListingType === "rent" ? "rgba(255,255,255,0.06)" : "rgba(201, 163, 74, 0.2)",
                          color: formListingType === "rent" ? "#777" : "#C9A34A",
                        }}
                      >
                        {formListingType === "rent" ? "Locked · Rent Only" : "Active & Editable"}
                      </span>
                    </div>

                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: formListingType === "rent" ? "#555" : "#C9A34A", fontWeight: 700, fontSize: "0.95rem" }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        disabled={formListingType === "rent"}
                        placeholder={formListingType === "rent" ? "Not for Sale" : "e.g. 35000"}
                        value={formListingType === "rent" ? "" : (formBuyPrice || "")}
                        onChange={(e) => {
                          setFormBuyPrice(Number(e.target.value));
                          clearFieldError("buyPrice");
                        }}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 14px 10px 28px",
                          borderRadius: 8,
                          background: formListingType === "rent" ? "#101010" : "#121212",
                          border: formListingType === "rent"
                            ? "1px solid rgba(255, 255, 255, 0.05)"
                            : formErrors.buyPrice
                            ? "1.5px solid #EF4444"
                            : "1px solid rgba(255, 255, 255, 0.15)",
                          color: formListingType === "rent" ? "#555" : "#FFFFFF",
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          outline: "none",
                          cursor: formListingType === "rent" ? "not-allowed" : "text",
                        }}
                      />
                    </div>
                    {formErrors.buyPrice && (
                      <div style={{ color: "#EF4444", fontSize: "0.72rem", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                        <AlertCircle size={12} /> {formErrors.buyPrice}
                      </div>
                    )}
                    <p style={{ fontSize: "0.68rem", color: formListingType === "rent" ? "#555" : "rgba(255,255,255,0.5)", margin: "6px 0 0" }}>
                      {formListingType === "rent" ? "Piece is locked to Rental Vault only" : "Permanent acquisition rate for bespoke client purchase"}
                    </p>
                  </div>

                  {/* RENTAL DAILY RATE CARD */}
                  <div
                    style={{
                      background: formListingType === "buy" ? "#121212" : "#1a1a1a",
                      border: formListingType === "buy"
                        ? "1px dashed rgba(255, 255, 255, 0.12)"
                        : formErrors.rentalPrice
                        ? "1.5px solid #EF4444"
                        : "1.5px solid rgba(201, 163, 74, 0.4)",
                      boxShadow: formErrors.rentalPrice ? "0 0 12px rgba(239, 68, 68, 0.25)" : "none",
                      borderRadius: 10,
                      padding: "14px 16px",
                      opacity: formListingType === "buy" ? 0.4 : 1,
                      transition: "all 0.25s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: "0.74rem", color: formListingType === "buy" ? "#666" : "#FFFFFF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Rental Daily Rate
                      </label>
                      <span
                        style={{
                          fontSize: "0.62rem",
                          padding: "2px 8px",
                          borderRadius: 9999,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background: formListingType === "buy" ? "rgba(255,255,255,0.06)" : "rgba(201, 163, 74, 0.2)",
                          color: formListingType === "buy" ? "#777" : "#C9A34A",
                        }}
                      >
                        {formListingType === "buy" ? "Locked · Sale Only" : "Active & Editable"}
                      </span>
                    </div>

                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: formListingType === "buy" ? "#555" : "#C9A34A", fontWeight: 700, fontSize: "0.95rem" }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        disabled={formListingType === "buy"}
                        placeholder={formListingType === "buy" ? "Not for Rent" : "e.g. 2499"}
                        value={formListingType === "buy" ? "" : (formRentalPrice || "")}
                        onChange={(e) => {
                          setFormRentalPrice(Number(e.target.value));
                          clearFieldError("rentalPrice");
                        }}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 14px 10px 28px",
                          borderRadius: 8,
                          background: formListingType === "buy" ? "#101010" : "#121212",
                          border: formListingType === "buy"
                            ? "1px solid rgba(255, 255, 255, 0.05)"
                            : formErrors.rentalPrice
                            ? "1.5px solid #EF4444"
                            : "1px solid rgba(255, 255, 255, 0.15)",
                          color: formListingType === "buy" ? "#555" : "#FFFFFF",
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          outline: "none",
                          cursor: formListingType === "buy" ? "not-allowed" : "text",
                        }}
                      />
                    </div>
                    {formErrors.rentalPrice && (
                      <div style={{ color: "#EF4444", fontSize: "0.72rem", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                        <AlertCircle size={12} /> {formErrors.rentalPrice}
                      </div>
                    )}
                    <p style={{ fontSize: "0.68rem", color: formListingType === "buy" ? "#555" : "rgba(255,255,255,0.5)", margin: "6px 0 0" }}>
                      {formListingType === "buy" ? "Piece is locked to Retail Purchase only" : "Per-day occasion rental charge (calculated over 3, 5, or 7 days)"}
                    </p>
                  </div>

                </div>
              </div>

              {/* ── AVAILABLE ATELIER SIZES (LUXURY CHIPS) ── */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: "0.74rem", color: formErrors.sizes ? "#EF4444" : "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Available Atelier Sizes *
                  </label>
                  <span style={{ fontSize: "0.7rem", color: formErrors.sizes ? "#EF4444" : "#888" }}>
                    Selected: <strong style={{ color: formErrors.sizes ? "#EF4444" : "#C9A34A" }}>{formSizes.join(", ") || "None"}</strong>
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    padding: formErrors.sizes ? "10px" : "0",
                    borderRadius: 10,
                    border: formErrors.sizes ? "1.5px solid #EF4444" : "none",
                    background: formErrors.sizes ? "rgba(239, 68, 68, 0.05)" : "transparent",
                  }}
                >
                  {["XS", "S", "M", "L", "XL", "Free Size"].map((sz) => {
                    const checked = formSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleSize(sz)}
                        style={{
                          padding: "8px 18px",
                          borderRadius: 8,
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          background: checked ? "#C9A34A" : "rgba(255, 255, 255, 0.05)",
                          color: checked ? "#0B0B0B" : "rgba(255, 255, 255, 0.75)",
                          border: checked ? "1.5px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.12)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: checked ? "0 4px 14px rgba(201, 163, 74, 0.3)" : "none",
                        }}
                      >
                        {checked && "✓ "}{sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 1. GARMENT MEDIA & MULTI-ANGLE GALLERY ── */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: "0.76rem", color: formErrors.images ? "#EF4444" : "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                      <ImageIcon size={15} color={formErrors.images ? "#EF4444" : "#C9A34A"} />
                      Garment Gallery & Multi-Angle Photos * ({formGalleryImages.length})
                    </label>
                    <span style={{ fontSize: "0.7rem", color: "#888", display: "block", marginTop: 2 }}>
                      Upload front, back, silhouette, and close-up embroidery shots. Image #1 serves as primary storefront cover.
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label
                      style={{
                        background: "linear-gradient(135deg, rgba(201, 163, 74, 0.25) 0%, rgba(201, 163, 74, 0.12) 100%)",
                        border: "1.5px solid #C9A34A",
                        borderRadius: 8,
                        color: "#E6CA65",
                        padding: "7px 16px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: uploadingGallery ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 10px rgba(201, 163, 74, 0.2)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Upload size={14} color="#C9A34A" />
                      {uploadingGallery ? "Uploading..." : "+ Upload Multiple Photos"}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultipleGalleryUpload}
                        disabled={uploadingGallery}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                {/* URL Paste input */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input
                    type="text"
                    placeholder="Or paste direct image URL (e.g. https://... or /uploads/...)"
                    value={galleryUrlInput}
                    onChange={(e) => setGalleryUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGalleryUrl(); } }}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "#141414",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#FFFFFF",
                      fontSize: "0.82rem",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={addGalleryUrl}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      color: "#FFFFFF",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Add URL
                  </button>
                </div>

                {/* Gallery Thumbnails Grid */}
                {formGalleryImages.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))",
                      gap: 12,
                      background: "#121212",
                      padding: 14,
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {formGalleryImages.map((imgUrl, idx) => {
                      const isCover = idx === 0;
                      return (
                        <div
                          key={idx}
                          style={{
                            position: "relative",
                            aspectRatio: "3/4",
                            borderRadius: 10,
                            overflow: "hidden",
                            background: "#1C1C1C",
                            border: isCover ? "2px solid #C9A34A" : "1px solid rgba(255, 255, 255, 0.12)",
                            boxShadow: isCover ? "0 0 14px rgba(201, 163, 74, 0.35)" : "none",
                          }}
                        >
                          <img
                            src={imgUrl}
                            alt={`Gallery ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />

                          {/* Cover badge */}
                          {isCover ? (
                            <div
                              style={{
                                position: "absolute",
                                top: 6,
                                left: 6,
                                background: "#C9A34A",
                                color: "#0B0B0B",
                                fontSize: "0.62rem",
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: 4,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <Star size={10} fill="#0B0B0B" />
                              Cover
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPrimaryCover(idx)}
                              title="Set as primary cover photo"
                              style={{
                                position: "absolute",
                                top: 6,
                                left: 6,
                                background: "rgba(0,0,0,0.75)",
                                border: "1px solid rgba(255,255,255,0.3)",
                                color: "#C9A34A",
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                padding: "3px 6px",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                            >
                              Make Cover
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(idx)}
                            title="Remove photo"
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "rgba(220, 38, 38, 0.85)",
                              border: "none",
                              color: "#FFFFFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>

                          {/* Index badge */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 4,
                              right: 6,
                              background: "rgba(0,0,0,0.7)",
                              color: "#A3A3A3",
                              fontSize: "0.6rem",
                              padding: "1px 5px",
                              borderRadius: 4,
                            }}
                          >
                            #{idx + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "24px",
                      borderRadius: 12,
                      border: formErrors.images ? "2px dashed #EF4444" : "1.5px dashed rgba(201, 163, 74, 0.3)",
                      background: formErrors.images ? "rgba(239, 68, 68, 0.08)" : "rgba(201, 163, 74, 0.03)",
                      textAlign: "center",
                    }}
                  >
                    <ImageIcon size={28} color="#C9A34A" style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#E6CA65", margin: 0 }}>
                      No Garment Photos Uploaded Yet
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "#888", margin: "4px 0 0" }}>
                      Click "+ Upload Multiple Photos" above or paste URLs to create an haute couture visual showcase.
                    </p>
                  </div>
                )}
                {formErrors.images && (
                  <div style={{ color: "#EF4444", fontSize: "0.74rem", marginTop: 10, padding: "8px 12px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={14} color="#EF4444" />
                    <span>{formErrors.images}</span>
                  </div>
                )}
              </div>

              {/* ── 2. COLOR VARIANTS & DYNAMIC SHADE STUDIO ── */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: "0.76rem", color: formErrors.variants ? "#EF4444" : "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                      <Palette size={15} color={formErrors.variants ? "#EF4444" : "#C9A34A"} />
                      Color Variants & Dynamic Shade Studio ({formVariants.length})
                    </label>
                    <span style={{ fontSize: "0.7rem", color: "#888", display: "block", marginTop: 2 }}>
                      Clients see dynamic swatch pills. Selecting a shade crossfades the showcase to that color's photo.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={addVariant}
                    style={{
                      background: "rgba(201, 163, 74, 0.15)",
                      border: "1px solid rgba(201, 163, 74, 0.4)",
                      borderRadius: 8,
                      color: "#C9A34A",
                      padding: "6px 14px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Plus size={14} /> Add Custom Shade
                  </button>
                </div>

                {/* Luxury Shade Presets Bar */}
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#737373", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Quick-Add Luxury Royal Presets:
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {luxuryPresets.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => addPresetShade(preset)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 10px",
                          borderRadius: 6,
                          background: "#181818",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#E5E5E5",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C9A34A"; e.currentTarget.style.color = "#C9A34A"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.color = "#E5E5E5"; }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: preset.hex, border: "1px solid rgba(255,255,255,0.3)" }} />
                        <span>+ {preset.color}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual Shade Cards List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {formVariants.map((variant, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#181818",
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: "1px solid rgba(255, 255, 255, 0.09)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {/* Top Row: Color swatch, name, hex, and trash */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* Swatch & Picker */}
                        <div
                          style={{
                            position: "relative",
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "1.5px solid rgba(255, 255, 255, 0.25)",
                            background: variant.hex,
                            flexShrink: 0,
                            cursor: "pointer",
                          }}
                          title="Click to choose shade color"
                        >
                          <input
                            type="color"
                            value={variant.hex}
                            onChange={(e) => {
                              const updated = [...formVariants];
                              updated[idx].hex = e.target.value;
                              setFormVariants(updated);
                            }}
                            style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer", width: "100%", height: "100%" }}
                          />
                        </div>

                        {/* Shade Name */}
                        <input
                          type="text"
                          placeholder="e.g. Royal Blush Rose"
                          value={variant.color}
                          onChange={(e) => {
                            const updated = [...formVariants];
                            updated[idx].color = e.target.value;
                            setFormVariants(updated);
                            if (e.target.value.trim()) clearFieldError("variants");
                          }}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "#121212",
                            border: (!variant.color.trim() && formErrors.variants)
                              ? "1.5px solid #EF4444"
                              : "1px solid rgba(255, 255, 255, 0.12)",
                            color: "#FFFFFF",
                            fontSize: "0.84rem",
                            fontWeight: 600,
                            outline: "none",
                          }}
                        />

                        {/* Hex Display */}
                        <input
                          type="text"
                          placeholder="#Hex"
                          value={variant.hex}
                          onChange={(e) => {
                            const updated = [...formVariants];
                            updated[idx].hex = e.target.value;
                            setFormVariants(updated);
                          }}
                          style={{
                            width: 80,
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: "#121212",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            color: "#C9A34A",
                            fontSize: "0.8rem",
                            fontFamily: "monospace",
                            textAlign: "center",
                            outline: "none",
                          }}
                        />

                        {/* Delete Shade */}
                        <button
                          type="button"
                          onClick={() => removeVariant(idx)}
                          title="Delete this shade"
                          style={{
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            color: "#EF4444",
                            borderRadius: 8,
                            padding: "8px 10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Bottom Row: Dedicated Shade Photo */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          background: "#121212",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        {/* Live Photo Thumbnail */}
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 6,
                            overflow: "hidden",
                            background: "#222",
                            border: variant.image_url ? "1.5px solid #C9A34A" : "1px dashed rgba(255, 255, 255, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {variant.image_url ? (
                            <img src={variant.image_url} alt={variant.color} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "0.6rem", color: "#666", textAlign: "center" }}>No Photo</span>
                          )}
                        </div>

                        {/* File Upload & URL inputs for shade */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <label
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: 6,
                                color: "#D4D4D4",
                                padding: "5px 12px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                cursor: uploadingShadeIdx === idx ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Upload size={13} color="#C9A34A" />
                              {uploadingShadeIdx === idx ? "Uploading..." : "Upload Photo for Shade"}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleShadeFileUpload(e, idx)}
                                disabled={uploadingShadeIdx === idx}
                                style={{ display: "none" }}
                              />
                            </label>

                            {/* Shortcut: Pick from Gallery */}
                            {formGalleryImages.length > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: "0.65rem", color: "#737373" }}>Or pick from gallery:</span>
                                {formGalleryImages.slice(0, 4).map((gImg, gIdx) => (
                                  <button
                                    key={gIdx}
                                    type="button"
                                    onClick={() => {
                                      const updated = [...formVariants];
                                      updated[idx].image_url = gImg;
                                      setFormVariants(updated);
                                    }}
                                    title={`Use Gallery Photo #${gIdx + 1}`}
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: 4,
                                      overflow: "hidden",
                                      border: variant.image_url === gImg ? "1.5px solid #C9A34A" : "1px solid rgba(255,255,255,0.2)",
                                      padding: 0,
                                      cursor: "pointer",
                                      background: "none",
                                    }}
                                  >
                                    <img src={gImg} alt="Thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder="Or paste direct image URL for this shade..."
                            value={variant.image_url}
                            onChange={(e) => {
                              const updated = [...formVariants];
                              updated[idx].image_url = e.target.value;
                              setFormVariants(updated);
                            }}
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: "#0E0E0E",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              color: "#FFFFFF",
                              fontSize: "0.78rem",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {formErrors.variants && (
                  <div style={{ color: "#EF4444", fontSize: "0.72rem", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={12} /> {formErrors.variants}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: "0.74rem", color: "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Garment Craftsmanship & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Artisanal garment craftsmanship details, fabric composition, embroidery specifications..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 14px",
                    borderRadius: 10,
                    background: "#1a1a1a",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#FFFFFF",
                    fontSize: "0.85rem",
                    outline: "none",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Bulk Quantity (only on new asset) */}
              {!editingAsset && (
                <div>
                  <label style={{ fontSize: "0.74rem", color: formErrors.quantity ? "#EF4444" : "#C9A34A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    Initial Quantity of Identical Pieces (Generates Individual RFID/Barcodes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formQuantity}
                    onChange={(e) => {
                      setFormQuantity(Number(e.target.value));
                      clearFieldError("quantity");
                    }}
                    style={{
                      width: "140px",
                      boxSizing: "border-box",
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "#1a1a1a",
                      border: formErrors.quantity ? "1.5px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.12)",
                      boxShadow: formErrors.quantity ? "0 0 8px rgba(239, 68, 68, 0.25)" : "none",
                      color: "#FFFFFF",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                  {formErrors.quantity && (
                    <div style={{ color: "#EF4444", fontSize: "0.72rem", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={12} /> {formErrors.quantity}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: 14, marginTop: 12, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 9999,
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={saveMutation.isPending}
                  className="btn-rose-primary"
                  style={{
                    flex: 2,
                    padding: "12px",
                    borderRadius: 9999,
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: saveMutation.isPending ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 18px rgba(201, 163, 74, 0.35)",
                  }}
                >
                  {saveMutation.isPending ? "Saving Piece..." : editingAsset ? "Update Product Details" : "Save & Generate Product"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── LUXURY RETIRE / DELETE CONFIRMATION POPUP ── */}
      <AnimatePresence>
        {retiringAsset && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
            onClick={() => setRetiringAsset(null)}
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
                border: "1px solid rgba(201, 163, 74, 0.3)",
                borderRadius: 16,
                padding: "32px 28px",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(239, 68, 68, 0.12)",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setRetiringAsset(null)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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

              {/* Modal Title & Subtitle */}
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
                  ARCHIVE CATALOG ITEM
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
                  Retire Couture Piece?
                </h3>
                <p style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.65)", margin: 0, lineHeight: 1.5 }}>
                  This piece will be removed from your active rental vault & storefront catalog. Completed customer booking history remains preserved in the ledger.
                </p>
              </div>

              {/* Garment Preview Snapshot Card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "#1c1c1c",
                  borderRadius: 12,
                  padding: "12px 14px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  marginBottom: 24,
                }}
              >
                <img
                  src={retiringAsset.image_url || "/elanora-emblem.png"}
                  alt={retiringAsset.name}
                  style={{
                    width: 52,
                    height: 65,
                    borderRadius: 8,
                    objectFit: "cover",
                    background: "#222",
                    flexShrink: 0,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: "0.66rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "#C9A34A",
                      textTransform: "uppercase",
                    }}
                  >
                    SKU: {retiringAsset.asset_code}
                  </span>
                  <h4
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#FFFFFF",
                      margin: "2px 0 4px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {retiringAsset.name}
                  </h4>
                  <div style={{ display: "flex", gap: 8, fontSize: "0.72rem", color: "#888" }}>
                    <span>Listing: <strong style={{ color: "#FFF" }}>{retiringAsset.listing_type || "both"}</strong></span>
                    <span>•</span>
                    <span>Buy: <strong style={{ color: "#FFF" }}>₹{retiringAsset.buy_price?.toLocaleString("en-IN") || "—"}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setRetiringAsset(null)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 9999,
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteAssetMutation.mutate(retiringAsset.id);
                    setRetiringAsset(null);
                  }}
                  disabled={deleteAssetMutation.isPending}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 9999,
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: deleteAssetMutation.isPending ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 18px rgba(220, 38, 38, 0.4)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 24px rgba(220, 38, 38, 0.6)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 18px rgba(220, 38, 38, 0.4)")}
                >
                  {deleteAssetMutation.isPending ? "Retiring..." : "Retire Piece"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ── ADD STOCK MODAL ── */}
      {addingStockGroup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            padding: 20,
          }}
          onClick={() => setAddingStockGroup(null)}
        >
          <div
            style={{
              background: "#161616",
              border: "1.5px solid rgba(201, 163, 74, 0.35)",
              borderRadius: 16,
              maxWidth: 440,
              width: "100%",
              padding: 26,
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#C9A34A", fontWeight: 700 }}>
                  INVENTORY EXPANSION
                </span>
                <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.25rem", color: "#FFFFFF", margin: "4px 0 0" }}>
                  Add Stock Units
                </h3>
              </div>
              <button onClick={() => setAddingStockGroup(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
              <span style={{ fontSize: "0.75rem", color: "#A3A3A3", display: "block" }}>Product Style:</span>
              <strong style={{ fontSize: "0.9rem", color: "#FFFFFF" }}>{addingStockGroup.name}</strong>
              <span style={{ fontSize: "0.75rem", color: "#C9A34A", fontFamily: "monospace", display: "block", marginTop: 2 }}>
                Base SKU: {addingStockGroup.baseCode} ({addingStockGroup.totalStock} units currently tracked)
              </span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#FFFFFF", display: "block", marginBottom: 6 }}>
                Number of Units to Add
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={addStockQty}
                onChange={(e) => setAddStockQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#1E1E1E",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#FFFFFF",
                  fontSize: "1rem",
                  fontWeight: 600,
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "0.7rem", color: "#888", display: "block", marginTop: 6 }}>
                Will automatically assign serial codes starting from #{addingStockGroup.totalStock + 1}.
              </span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setAddingStockGroup(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#AAA",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addStockMutation.mutate()}
                disabled={addStockMutation.isPending}
                className="btn-rose-primary"
                style={{ flex: 1, padding: "10px", fontSize: "0.82rem" }}
              >
                {addStockMutation.isPending ? "Adding Units..." : `Add +${addStockQty} Units`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RETIRE PRODUCT GROUP MODAL ── */}
      {retiringGroup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            padding: 20,
          }}
          onClick={() => setRetiringGroup(null)}
        >
          <div
            style={{
              background: "#161616",
              border: "1.5px solid rgba(239, 68, 68, 0.35)",
              borderRadius: 16,
              maxWidth: 440,
              width: "100%",
              padding: 26,
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#EF4444", fontWeight: 700 }}>
                  CONFIRM RETIREMENT
                </span>
                <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "1.25rem", color: "#FFFFFF", margin: "4px 0 0" }}>
                  Retire Garment Product
                </h3>
              </div>
              <button onClick={() => setRetiringGroup(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
              This action will retire and permanently remove all <strong style={{ color: "#FFF" }}>{retiringGroup.totalStock} units</strong> of <strong style={{ color: "#C9A34A" }}>{retiringGroup.name}</strong> ({retiringGroup.baseCode}) from the online store and admin product manifest.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setRetiringGroup(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#AAA",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteAssetGroupMutation.mutate(retiringGroup)}
                disabled={deleteAssetGroupMutation.isPending}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  background: "#EF4444",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {deleteAssetGroupMutation.isPending ? "Retiring..." : `Retire All ${retiringGroup.totalStock} Units`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
