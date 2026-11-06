import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy, type ReactElement } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { WishlistProvider } from "./wishlist-context";

import { CartProvider } from "./cart-context";
import { AppLayout } from "./components/AppLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomePage } from "./pages/HomePage";

// Lazy load all route pages for code splitting
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const AssetsPage = lazy(() => import("./pages/AssetsPage").then((m) => ({ default: m.AssetsPage })));
const AssetDetailPage = lazy(() => import("./pages/AssetDetailPage").then((m) => ({ default: m.AssetDetailPage })));
const WishlistPage = lazy(() => import("./pages/WishlistPage").then((m) => ({ default: m.WishlistPage })));

const CartPage = lazy(() => import("./pages/CartPage").then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const BookingsPage = lazy(() => import("./pages/BookingsPage").then((m) => ({ default: m.BookingsPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const TermsPage = lazy(() => import("./pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

// Lazy load admin pages
const AdminAssetsPage = lazy(() => import("./pages/admin/Assets").then((m) => ({ default: m.AdminAssetsPage })));
const AdminCategoriesPage = lazy(() =>
  import("./pages/admin/Categories").then((m) => ({ default: m.AdminCategoriesPage }))
);
const AdminOperationsPage = lazy(() =>
  import("./pages/admin/Operations").then((m) => ({ default: m.AdminOperationsPage }))
);
const AdminPlansPage = lazy(() => import("./pages/admin/Plans").then((m) => ({ default: m.AdminPlansPage })));
const AdminOffersPage = lazy(() => import("./pages/admin/Offers").then((m) => ({ default: m.AdminOffersPage })));
const AdminUsersPage = lazy(() => import("./pages/admin/Users").then((m) => ({ default: m.AdminUsersPage })));
const AdminDashboardPage = lazy(() => import("./pages/admin/Dashboard").then((m) => ({ default: m.AdminDashboardPage })));
const AdminDryCleaningPage = lazy(() => import("./pages/admin/DryCleaning").then((m) => ({ default: m.AdminDryCleaningPage })));
const DryCleaningPortal = lazy(() => import("./pages/DryCleaningPortal").then((m) => ({ default: m.DryCleaningPortal })));
const DryCleaningLogin = lazy(() => import("./pages/dry-cleaning/DryCleaningLogin").then((m) => ({ default: m.DryCleaningLogin })));
const BookingTrackingPage = lazy(() => import("./pages/BookingTrackingPage").then((m) => ({ default: m.BookingTrackingPage })));
const BookingTrackingAdminPage = lazy(() => import("./pages/admin/BookingTrackingAdminPage").then((m) => ({ default: m.BookingTrackingAdminPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--color-bg-primary)", gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-gold)", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-faint)" }}>Loading…</span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { token, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }: { children: ReactElement }) {
  const { token, user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== "admin" && user?.role !== "staff") {
    return <Navigate to="/assets" replace />;
  }
  return children;
}

// Dry cleaning portal guard — allows dry_cleaner and admin roles
function DryCleaningRoute({ children }: { children: ReactElement }) {
  const { token, user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!token) return <Navigate to="/dry-cleaning/login" replace />;
  if (user?.role !== "dry_cleaner" && user?.role !== "admin") {
    return <Navigate to="/dry-cleaning/login" replace />;
  }
  return children;
}

function AdminGuardedPublicLayout() {
  const { token, user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (token && user?.role === "admin" && window.location.pathname === "/admin-only-dummy") {
    return <Navigate to="/admin" replace />;
  }
  if (token && user?.role === "dry_cleaner" && window.location.pathname === "/cleaner-only-dummy") {
    return <Navigate to="/dry-cleaning/portal" replace />;
  }
  return <AppLayout />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── 1. DEDICATED ADMIN BACK-OFFICE ROUTES (EVALUATED FIRST) ── */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="assets" element={<AdminAssetsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
          <Route path="offers" element={<AdminOffersPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="ops" element={<AdminOperationsPage />} />
          <Route path="dry-cleaning" element={<AdminDryCleaningPage />} />
          <Route path="tracking/:bookingId" element={<BookingTrackingAdminPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* ── 2. DRY CLEANING PORTAL ROUTES ── */}
        <Route path="/dry-cleaning/login" element={<DryCleaningLogin />} />
        <Route
          path="/dry-cleaning/portal"
          element={
            <DryCleaningRoute>
              <DryCleaningPortal />
            </DryCleaningRoute>
          }
        />
        <Route path="/dry-cleaning" element={<Navigate to="/dry-cleaning/portal" replace />} />

        {/* ── 3. PUBLIC & BOUTIQUE CLIENT ROUTES ── */}
        <Route element={<AdminGuardedPublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />

          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/:bookingId/track"
            element={
              <ProtectedRoute>
                <BookingTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* 404 Catch-All within Public Layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
