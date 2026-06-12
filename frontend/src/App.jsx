/**
 * App.jsx — Complete KNFC route tree with branch-gate for customers
 *
 * Routes:
 *   Public auth:    /login/customer, /login/staff, /login/admin
 *   Customer:       /menu, /menu/category/:slug, /offer/:id, /cart, /account, /order/*, /faq, /contact
 *   Staff:          /staff/queue, /staff/stock, /staff/new-order
 *   Branch Admin:   /admin/dashboard, /admin/menu, /admin/*
 *   Super Admin:    /superadmin/dashboard, /superadmin/branches, /superadmin/*
 */

import React, { Suspense, lazy, useState, useEffect, useRef, useCallback, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import useBranch             from "./hooks/useBranch";
import BranchSelector        from "./components/common/BranchSelector";
import KNCLoader             from "./components/common/KNCLoader";
import Footer                from "./components/layout/Footer";
import AppLayout             from "./components/layout/AppLayout";
import { CookieBanner, OfferPopup }  from "./components/common/CookieBanner";
import NearestBranchBanner           from "./components/common/NearestBranchBanner";
import { NotificationProvider } from "./components/common/NotificationSystem";
import { getPublicBranches }   from "./api/auth";
import "./styles/global.css";

/* ── Auth pages — eager ──────────────────────────────────────────────── */
import CustomerLogin        from "./pages/auth/CustomerLogin";
import ChangePasswordPage  from "./pages/auth/ChangePasswordPage";
import { StaffLogin, AdminLogin, AdminForgotPassword } from "./pages/auth/AuthPages";
import {
  StaffRegisterPage, BranchAdminRegisterPage,
  StaffVerifyEmailPage, ForgotPasswordPage, ResetPasswordPage,
} from "./pages/auth/RegisterPages";

/* ── Lazy pages ─────────────────────────────────────────────────────── */
const HomePage          = lazy(() => import("./pages/customer/HomePage"));
const ProductListPage   = lazy(() => import("./pages/customer/ProductListPage"));
const ProductDetailPage = lazy(() => import("./pages/customer/ProductDetailPage"));
const CartPage          = lazy(() => import("./pages/customer/CartPage"));
const OfferDetailPage   = lazy(() => import("./pages/customer/OfferDetailPage"));
const AccountPage       = lazy(() => import("./pages/customer/AccountPage"));
const OffersPage        = lazy(() => import("./pages/customer/OffersPage"));
const OrderConfirmPage      = lazy(() => import("./pages/customer/OrderPages").then(m => ({ default: m.OrderConfirmPage })));
const OrderTrackPage        = lazy(() => import("./pages/customer/OrderPages").then(m => ({ default: m.OrderTrackPage   })));
const AwaitingPaymentPage   = lazy(() => import("./pages/customer/AwaitingPaymentPage"));
const InvoicePage       = lazy(() => import("./pages/customer/InvoicePage"));
const SearchPage        = lazy(() => import("./pages/customer/SearchPage"));
const SpinWheelPage        = lazy(() => import("./pages/customer/SpinWheelPage"));
const ReferralLandingPage  = lazy(() => import("./pages/customer/ReferralLandingPage"));
const PrivacyPage  = lazy(() => import("./pages/customer/LegalPages").then(m => ({ default: m.PrivacyPage  })));
const CookiePage   = lazy(() => import("./pages/customer/LegalPages").then(m => ({ default: m.CookiePage   })));
const TermsPage    = lazy(() => import("./pages/customer/LegalPages").then(m => ({ default: m.TermsPage    })));
const AboutPage    = lazy(() => import("./pages/customer/LegalPages").then(m => ({ default: m.AboutPage    })));
const CareersPage  = lazy(() => import("./pages/customer/LegalPages").then(m => ({ default: m.CareersPage  })));
const BlogPage     = lazy(() => import("./pages/customer/LegalPages").then(m => ({ default: m.BlogPage     })));
const PressPage    = lazy(() => import("./pages/customer/LegalPages").then(m => ({ default: m.PressPage    })));
const FAQPage      = lazy(() => import("./pages/customer/LegalPages").then(m => ({ default: m.FAQPage      })));
const ContactPage  = lazy(() => import("./pages/customer/LegalPages").then(m => ({ default: m.ContactPage  })));

const QueuePage    = lazy(() => import("./pages/staff/StaffPages").then(m => ({ default: m.QueuePage    })));
const StockPage    = lazy(() => import("./pages/staff/StaffPages").then(m => ({ default: m.StockPage    })));
const NewOrderPage = lazy(() => import("./pages/staff/StaffPages").then(m => ({ default: m.NewOrderPage })));
const ProfilePage  = lazy(() => import("./pages/admin/ProfilePage"));

const BranchDashboard    = lazy(() => import("./pages/admin/AdminPages").then(m => ({ default: m.BranchDashboard     })));
const SuperAdminDash     = lazy(() => import("./pages/admin/AdminPages").then(m => ({ default: m.SuperAdminDashboard })));
const AdminMenuPage      = lazy(() => import("./pages/admin/AdminMenuPage"));
const AdminOffersPage    = lazy(() => import("./pages/admin/AdminOffersPage"));
const AnalyticsDashboard = lazy(() => import("./pages/admin/AnalyticsDashboard"));
const AdminStaffPage     = lazy(() => import("./pages/admin/AdminStaffPage"));
const AdminStockPage     = lazy(() => import("./pages/admin/AdminStockPage"));
const WhatsAppPage       = lazy(() => import("./pages/admin/WhatsAppPage"));
const BroadcastPage      = lazy(() => import("./pages/admin/BroadcastPage"));

/* ── Error Boundary ─────────────────────────────────────────────────── */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("KNFC page error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"var(--bg)", gap:"var(--s4)", padding:"var(--s8)" }}>
          <div style={{ color:"var(--brand)" }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="17" r="4"/><line x1="11.5" y1="13.5" x2="19" y2="6"/><circle cx="20" cy="5" r="1.5"/></svg></div>
          <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:900, color:"var(--t1)" }}>Something went wrong</div>
          <p style={{ color:"var(--t3)", fontSize:".9375rem", textAlign:"center", maxWidth:"400px" }}>
            This page ran into an issue. Please try refreshing.
          </p>
          <div style={{ display:"flex", gap:"var(--s3)" }}>
            <button onClick={() => window.location.reload()} className="btn btn-p btn-lg">Refresh page</button>
            <button onClick={() => { this.setState({ hasError:false }); window.history.back(); }} className="btn btn-s btn-lg">Go back</button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <pre style={{ marginTop:"var(--s4)", padding:"var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", fontSize:".75rem", color:"var(--err)", maxWidth:"600px", overflow:"auto", whiteSpace:"pre-wrap" }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Top progress bar — shown during route transitions ───────────────── */
function RouteBar({ active }) {
  const [phase, setPhase] = useState(0); // 0=idle 1=running 2=done
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (active) {
      setPhase(1);
    } else if (phase === 1) {
      setPhase(2);
      timerRef.current = setTimeout(() => setPhase(0), 500);
    }
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (phase === 0) return null;
  return (
    <div style={{
      position:      "fixed",
      top:           0,
      left:          0,
      right:         0,
      height:        "3px",
      zIndex:        9998,
      pointerEvents: "none",
      opacity:       phase === 2 ? 0 : 1,
      transition:    phase === 2 ? "opacity 0.45s ease" : "none",
    }}>
      <div style={{
        height:     "100%",
        background: "linear-gradient(90deg, #E8521A 0%, #F5C843 100%)",
        borderRadius: "0 2px 2px 0",
        boxShadow:  "0 0 10px rgba(232,82,26,0.55)",
        width:      phase === 2 ? "100%" : undefined,
        transition: phase === 2 ? "width 0.25s ease" : "none",
        animation:  phase === 1 ? "knc-rbar 2.5s ease forwards" : "none",
      }} />
      <style>{`
        @keyframes knc-rbar {
          0%  { width:0%  }
          25% { width:35% }
          55% { width:60% }
          80% { width:78% }
          100%{ width:82% }
        }
      `}</style>
    </div>
  );
}

/* ── Scroll to top on every route change ────────────────────────────── */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

/* ── Page transition — content stays visible, only bar moves ─────────── */
function PageTransition({ children }) {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const prevPath  = useRef(location.pathname);
  const timerRef  = useRef(null);

  useEffect(() => {
    if (prevPath.current === location.pathname) return; // skip mount
    prevPath.current = location.pathname;
    setActive(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(false), 400);
    return () => clearTimeout(timerRef.current);
  }, [location.pathname]);

  return (
    <>
      <RouteBar active={active} />
      {children}
    </>
  );
}

/* ── Role guard ─────────────────────────────────────────────────────── */
function RequireAuth({ roles, children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <KNCLoader visible label="Loading…" />;
  if (!user)     return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) {
    const HOME = {
      customer:     "/menu",
      staff:        "/staff/queue",
      branch_admin: "/admin/dashboard",
      super_admin:  "/superadmin/dashboard",
    };
    return <Navigate to={HOME[user.role] || "/"} replace />;
  }
  return children;
}

/* ── Must-change-password guard ─────────────────────────────────────── */
function MustChangePasswordGate({ children }) {
  const { user } = useAuth();
  if (user?.must_change_password) return <Navigate to="/change-password" replace />;
  return children;
}

/* ── Branch gate (customers + unauthenticated guests) ───────────────── */
function BranchGate({ children }) {
  const { user, isLoading, selectBranch } = useAuth();
  const { hasBranch } = useBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPicker, setShowPicker] = useState(false);
  const qrHandledRef = useRef(false);

  // Auto-select branch when arriving via QR code (?branch_id=<uuid>)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (qrHandledRef.current) return;
    const urlBranchId = searchParams.get("branch_id");
    if (!urlBranchId) return;
    qrHandledRef.current = true;

    const applyBranch = (list) => {
      const found = list.find(b => b.id === urlBranchId);
      if (found) selectBranch(found);
    };

    const cleanUrl = () =>
      setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("branch_id"); return n; }, { replace: true });

    try {
      const cached = JSON.parse(localStorage.getItem("knfc_branches_cache") || "[]");
      if (cached.length) { applyBranch(cached); cleanUrl(); return; }
    } catch {}

    getPublicBranches()
      .then(res => {
        const list = res.data.branches || [];
        if (list.length) localStorage.setItem("knfc_branches_cache", JSON.stringify(list));
        applyBranch(list);
      })
      .catch(() => {})
      .finally(cleanUrl);
  }, []); // intentional empty deps — runs once on mount to handle QR branch_id param

  const handleSelected = useCallback((branch) => {
    selectBranch(branch);
    setShowPicker(false);
  }, [selectBranch]);

  return (
    <>
      {children}
      {/* Nearest-branch suggestion — shown after login if closer branch found */}
      <NearestBranchBanner />
      {showPicker && <BranchSelector onSelected={handleSelected} allowDismiss={true} onDismiss={() => setShowPicker(false)} />}
    </>
  );
}

/* ── Root redirect by role ──────────────────────────────────────────── */
function RootRedirect() {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  if (isLoading) return <KNCLoader visible />;
  // Preserve branch_id from QR scan so BranchGate can pick it up on /menu
  const branchParam = searchParams.get("branch_id");
  const menuTarget  = branchParam ? `/menu?branch_id=${branchParam}` : "/menu";
  if (!user) return <Navigate to={menuTarget} replace />;
  const HOME = {
    customer:     menuTarget,
    staff:        "/staff/queue",
    branch_admin: "/admin/dashboard",
    super_admin:  "/superadmin/dashboard",
  };
  return <Navigate to={HOME[user.role] || "/menu"} replace />;
}

/* ── Require logged-in customer (redirects to login, not root) ───────── */
function RequireCustomer({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <KNCLoader visible label="Loading…" />;
  if (!user) return <Navigate to="/login/customer" replace />;
  if (user.role !== "customer") {
    const HOME = { staff:"/staff/queue", branch_admin:"/admin/dashboard", super_admin:"/superadmin/dashboard" };
    return <Navigate to={HOME[user.role] || "/menu"} replace />;
  }
  return children;
}

/* ── Active order shortcut ──────────────────────────────────────────── */
function TrackRedirect() {
  const { user } = useAuth();
  try {
    const o = JSON.parse(localStorage.getItem("active_order") || "null");
    if (o?.id && (!o._uid || o._uid === user?.id)) return <Navigate to={`/order/track/${o.id}`} replace />;
  } catch {}
  // No active order — show a friendly prompt instead of silently redirecting
  return (
    <AppLayout>
      <div style={{ minHeight:"70vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"var(--s4)", padding:"var(--s8) var(--s4)", textAlign:"center" }}>
        <div style={{ fontSize:"3.5rem", lineHeight:1 }}>🍗</div>
        <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.75rem", fontWeight:900, margin:0 }}>No active order</h2>
        <p style={{ fontSize:".9375rem", color:"var(--t2)", maxWidth:320, lineHeight:1.65, margin:0 }}>
          You haven't placed an order yet. Browse the menu and place your first order to track it here.
        </p>
        <div style={{ display:"flex", gap:"var(--s3)", flexWrap:"wrap", justifyContent:"center" }}>
          <a href="/menu" style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"12px 24px", background:"var(--brand)", color:"#fff", borderRadius:"var(--rf)", fontWeight:700, fontSize:".9375rem", textDecoration:"none", fontFamily:"var(--ff-b)" }}>
            Browse Menu →
          </a>
        </div>
      </div>
    </AppLayout>
  );
}

/* ── 404 ─────────────────────────────────────────────────────────────── */
function NotFound() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"var(--bg)", gap:"var(--s4)" }}>
      <div style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(4rem,12vw,8rem)", fontWeight:900, color:"var(--bd2)", lineHeight:1 }}>404</div>
      <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:700 }}>Page not found</div>
      <p style={{ fontSize:".9375rem", color:"var(--t3)" }}>The page you're looking for doesn't exist.</p>
      <a href="/" className="btn btn-p btn-lg">← Go home</a>
    </div>
  );
}

/* ── Suspense fallback — dark background so no white/blank flash ─────── */
const PageFallback = () => (
  <div style={{ minHeight: "100vh", background: "#0C0807" }} />
);

/* ── Route convenience wrappers ─────────────────────────────────────── */
// P — role-gated with error boundary
const P = ({ roles, C }) => (
  <RequireAuth roles={roles}>
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <PageTransition><C /></PageTransition>
      </Suspense>
    </ErrorBoundary>
  </RequireAuth>
);

// PG — Public customer page (no auth required — any visitor can browse)
const PG = ({ C }) => (
  <BranchGate>
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <PageTransition><C /></PageTransition>
      </Suspense>
    </ErrorBoundary>
  </BranchGate>
);

// PC — customer-only page (redirects to /login/customer if not logged in)
const PC = ({ C }) => (
  <RequireCustomer>
    <BranchGate>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <PageTransition><C /></PageTransition>
        </Suspense>
      </ErrorBoundary>
    </BranchGate>
  </RequireCustomer>
);

// PA — admin role + must-change-password gate + error boundary
const PA = ({ roles, C }) => (
  <RequireAuth roles={roles}>
    <MustChangePasswordGate>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <PageTransition><C /></PageTransition>
        </Suspense>
      </ErrorBoundary>
    </MustChangePasswordGate>
  </RequireAuth>
);

/* ══════════════════════════════════════════════════════════════════════
   GLOBAL ZOOM BLOCK
   Blocks Ctrl+/-, Ctrl+0, Ctrl+scroll on all desktop browsers.
   Touch pinch-zoom is blocked via CSS touch-action + viewport meta.
══════════════════════════════════════════════════════════════════════ */
function ZoomBlocker() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // +  =  -  0  all trigger browser zoom
        if (["+", "=", "-", "_", "0"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    // passive:false required to call preventDefault on wheel
    window.addEventListener("keydown",  onKey,   { capture: true });
    window.addEventListener("wheel",    onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("keydown",  onKey,   { capture: true });
      window.removeEventListener("wheel",    onWheel, { capture: true });
    };
  }, []);
  return null;
}

/* ── Root overlays rendered outside page transitions ─────────────────── */
function RootOverlays() {
  const { user }   = useAuth();
  const location   = useLocation();
  const isAuthPage    = location.pathname.startsWith("/login") || location.pathname === "/change-password";
  const isInvoicePage = location.pathname.startsWith("/order/invoice/");
  const isCustomer = user?.role === "customer";
  if (isAuthPage) return null;
  return (
    <>
      {!isInvoicePage && <Footer />}
      <CookieBanner />
      {isCustomer && !isInvoicePage && <OfferPopup />}
    </>
  );
}

/* ── Crossfade: splash out + app content in, once auth settles ───────── */
function SplashDismisser() {
  const { isLoading } = useAuth();
  const dismissed = useRef(false);

  useEffect(() => {
    if (isLoading || dismissed.current) return;
    dismissed.current = true;

    const splash = document.getElementById("knfc-splash");
    const root   = document.getElementById("root");

    requestAnimationFrame(() => {
      // Fade in app content and fade out splash at the same time
      if (root)   root.style.opacity = "1";
      if (splash) {
        splash.classList.add("knfc-splash-out");
        setTimeout(() => splash.remove(), 500);
      }
    });
  }, [isLoading]);

  // Safety: if auth never settles (JS error, network down), show content after 5s
  useEffect(() => {
    const t = setTimeout(() => {
      if (dismissed.current) return;
      dismissed.current = true;
      const splash = document.getElementById("knfc-splash");
      const root   = document.getElementById("root");
      if (root)   root.style.opacity = "1";
      if (splash) { splash.classList.add("knfc-splash-out"); setTimeout(() => splash.remove(), 500); }
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SplashDismisser />
        <ZoomBlocker />
        <ScrollToTop />
        <NotificationProvider />
        <div style={{ minHeight: "100vh" }}>
        <Routes>

          {/* ── Root ──────────────────────────────────────────────────── */}
          <Route path="/" element={<RootRedirect />} />

          {/* ── Public auth ───────────────────────────────────────────── */}
          <Route path="/login/customer"      element={<CustomerLogin />} />
          <Route path="/login/staff"         element={<StaffLogin />} />
          <Route path="/login/admin"         element={<AdminLogin />} />
          <Route path="/login/admin/forgot"   element={<AdminForgotPassword />} />
          <Route path="/login/staff/verify"  element={<StaffVerifyEmailPage />} />
          <Route path="/login/staff/forgot"  element={<ForgotPasswordPage />} />
          <Route path="/login/staff/reset"   element={<ResetPasswordPage />} />
          <Route path="/change-password" element={
            <RequireAuth roles={["branch_admin"]}>
              <ChangePasswordPage />
            </RequireAuth>
          } />

          {/* ── Register (protected) ──────────────────────────────────── */}
          <Route path="/admin/staff/create" element={
            <RequireAuth roles={["branch_admin","super_admin"]}>
              <PageTransition><StaffRegisterPage /></PageTransition>
            </RequireAuth>
          } />
          <Route path="/superadmin/branch-admin/create" element={
            <RequireAuth roles={["super_admin"]}>
              <PageTransition><BranchAdminRegisterPage /></PageTransition>
            </RequireAuth>
          } />

          {/* ── Customer browsing — public (no login required) ─────────── */}
          <Route path="/menu"                element={<PG C={HomePage} />} />
          <Route path="/menu/search"         element={<PG C={SearchPage} />} />
          <Route path="/menu/browse"         element={<PG C={SearchPage} />} />
          <Route path="/menu/all"            element={<PG C={ProductListPage} />} />
          <Route path="/menu/category/:slug" element={<PG C={ProductListPage} />} />
          <Route path="/menu/item/:slug"     element={<PG C={ProductDetailPage} />} />
          <Route path="/menu/product/:slug"  element={<PG C={ProductDetailPage} />} />
          <Route path="/offers"              element={<PG C={OffersPage} />} />
          <Route path="/offers/:id"          element={<PG C={OfferDetailPage} />} />
          <Route path="/spin"                element={<PG C={SpinWheelPage} />} />
          <Route path="/refer/:code"        element={<PG C={ReferralLandingPage} />} />
          <Route path="/offer/:id"           element={<PG C={OfferDetailPage} />} />
          <Route path="/about"               element={<PG C={AboutPage} />} />
          <Route path="/privacy"             element={<PG C={PrivacyPage} />} />
          <Route path="/terms"               element={<PG C={TermsPage} />} />
          <Route path="/cookies"             element={<PG C={CookiePage} />} />
          <Route path="/careers"             element={<PG C={CareersPage} />} />
          <Route path="/blog"                element={<PG C={BlogPage} />} />
          <Route path="/press"               element={<PG C={PressPage} />} />
          <Route path="/faq"                 element={<PG C={FAQPage} />} />
          <Route path="/contact"             element={<PG C={ContactPage} />} />

          {/* ── Customer actions — login required ─────────────────────── */}
          <Route path="/cart"                element={<PC C={CartPage} />} />
          <Route path="/account"             element={<PC C={AccountPage} />} />
          <Route path="/order/confirm/:id"            element={<PC C={OrderConfirmPage} />} />
          <Route path="/order/awaiting-payment/:orderId" element={<PC C={AwaitingPaymentPage} />} />
          <Route path="/order/track/:id"              element={<PC C={OrderTrackPage} />} />
          <Route path="/order/invoice/:orderId" element={<PG C={InvoicePage} />} />
          <Route path="/order/track" element={
            <RequireCustomer>
              <BranchGate><TrackRedirect /></BranchGate>
            </RequireCustomer>
          } />

          {/* ── Staff ─────────────────────────────────────────────────── */}
          <Route path="/staff/queue"     element={<P roles={["staff","branch_admin"]} C={QueuePage} />} />
          <Route path="/staff/stock"     element={<P roles={["staff","branch_admin"]} C={StockPage} />} />
          <Route path="/staff/new-order" element={<P roles={["staff","branch_admin"]} C={NewOrderPage} />} />
          <Route path="/profile"         element={<P roles={["staff","branch_admin"]} C={ProfilePage} />} />

          {/* ── Branch Admin ──────────────────────────────────────────── */}
          <Route path="/admin/dashboard"  element={<PA roles={["branch_admin"]}              C={BranchDashboard} />} />
          <Route path="/admin/staff"      element={<PA roles={["branch_admin","super_admin"]} C={AdminStaffPage} />} />
          <Route path="/admin/stock"      element={<PA roles={["branch_admin","super_admin"]} C={AdminStockPage} />} />
          <Route path="/admin/offers"     element={<PA roles={["branch_admin","super_admin"]} C={AdminOffersPage} />} />
          <Route path="/admin/*"          element={<PA roles={["branch_admin"]}              C={BranchDashboard} />} />

          {/* ── Menu, Analytics, Broadcast — super_admin only ─────────── */}
          <Route path="/admin/menu"       element={<PA roles={["super_admin"]} C={AdminMenuPage} />} />
          <Route path="/admin/analytics"  element={<PA roles={["super_admin"]} C={AnalyticsDashboard} />} />
          <Route path="/admin/broadcast"  element={<PA roles={["super_admin"]} C={BroadcastPage} />} />

          {/* ── Super Admin ───────────────────────────────────────────── */}
          <Route path="/superadmin/dashboard"  element={<P roles={["super_admin"]} C={SuperAdminDash} />} />
          <Route path="/superadmin/branches"   element={<P roles={["super_admin"]} C={SuperAdminDash} />} />
          <Route path="/superadmin/menu"       element={<PA roles={["super_admin"]} C={AdminMenuPage} />} />
          <Route path="/superadmin/stock"      element={<PA roles={["super_admin"]} C={AdminStockPage} />} />
          <Route path="/superadmin/analytics"  element={<P roles={["super_admin"]} C={AnalyticsDashboard} />} />
          <Route path="/superadmin/staff"      element={<P roles={["super_admin"]} C={AdminStaffPage} />} />
          <Route path="/superadmin/whatsapp"   element={<P roles={["super_admin"]} C={WhatsAppPage} />} />
          <Route path="/superadmin/broadcast"  element={<P roles={["super_admin"]} C={BroadcastPage} />} />
          <Route path="/superadmin/*"          element={<P roles={["super_admin"]} C={SuperAdminDash} />} />

          {/* ── 404 ───────────────────────────────────────────────────── */}
          <Route path="*" element={<NotFound />} />

        </Routes>
        </div>

        {/* Footer + overlays — outside Routes/PageTransition so never hidden by opacity */}
        <RootOverlays />

      </AuthProvider>
    </BrowserRouter>
  );
}
