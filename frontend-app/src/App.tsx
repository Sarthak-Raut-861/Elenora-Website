import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy, type ReactElement } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { AppLayout } from "./components/AppLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomePage } from "./pages/HomePage";

// Lazy load all route pages for code splitting
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const AssetsPage = lazy(() => import("./pages/AssetsPage").then((m) => ({ default: m.AssetsPage })));
const AssetDetailPage = lazy(() => import("./pages/AssetDetailPage").then((m) => ({ default: m.AssetDetailPage })));
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
  if (user?.role !== "admin") {
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

// Blocks admins from accessing public routes — redirects them to /admin
// Blocks dry_cleaners from accessing public routes — redirects them to portal
function AdminGuardedPublicLayout() {
  const { token, user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (token && user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }
  if (token && user?.role === "dry_cleaner") {
    return <Navigate to="/dry-cleaning/portal" replace />;
  }
  return <AppLayout />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public and User Routes — admin users are redirected to /admin */}
        <Route element={<AdminGuardedPublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />
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
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Dedicated Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="assets" element={<AdminAssetsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="ops" element={<AdminOperationsPage />} />
          <Route path="dry-cleaning" element={<AdminDryCleaningPage />} />
          <Route path="tracking/:bookingId" element={<BookingTrackingAdminPage />} />
        </Route>

        {/* Dry Cleaning Portal — separate auth flow */}
        <Route path="/dry-cleaning/login" element={<DryCleaningLogin />} />
        <Route
          path="/dry-cleaning/portal"
          element={
            <DryCleaningRoute>
              <DryCleaningPortal />
            </DryCleaningRoute>
          }
        />
        {/* Legacy /dry-cleaning redirect */}
        <Route path="/dry-cleaning" element={<Navigate to="/dry-cleaning/portal" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
