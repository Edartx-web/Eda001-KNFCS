/**
 * AppLayout.jsx — master layout for all authenticated pages
 * Renders: Header + page body (with optional admin sidebar) + Footer
 *          + CookieBanner + OfferPopup (customer only)
 *          + GSAP page transition on route change
 *
 * Usage:
 *   <AppLayout>content</AppLayout>
 *   <AppLayout adminSidebar>admin content</AppLayout>
 */

import React, { useRef, useEffect } from "react";
import { useLocation, Link }           from "react-router-dom";
import { gsap }                        from "gsap";
import Header                          from "./Header";
import { useAuth }                     from "../../context/AuthContext";

/* ── Staff activity ping — every 5 min to track last_seen ──────────── */
function StaffPing({ role }) {
  useEffect(() => {
    if (!["staff", "branch_admin"].includes(role)) return;
    const ping = () => {
      import("../../api/axiosClient").then(({ default: ax }) => {
        ax.post("/auth/ping/").catch(() => {});
      });
    };
    ping(); // ping on mount
    const t = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [role]);
  return null;
}

/* ── Sidebar icon SVGs ────────────────────────────────────────────────── */
const SvgStaff    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const SvgFlame    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 007-7c0-5-4-7-5-11-1.5 2-2 4-2 5.5-1-1-1.5-2.5-1-4-2 2.5-2 5-2 6a5 5 0 005 5z"/></svg>;
const SvgMenu     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>;
const SvgChart    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

/* ── Admin sidebar link sets ─────────────────────────────────────────────── */
const ADMIN_NAV = [
  { path:"/admin/dashboard",  label:"Dashboard", icon:"◈" },
  { path:"/admin/menu",       label:"Menu",       icon:"⬡" },
  { path:"/admin/staff",      label:"Staff",      icon:<SvgStaff /> },
  { path:"/admin/stock",      label:"Stock",      icon:"◎" },
  { path:"/admin/offers",     label:"Offers",     icon:<SvgFlame /> },
  { path:"/admin/analytics",  label:"Analytics",  icon:<SvgChart /> },
];
const SUPER_NAV = [
  { path:"/superadmin/dashboard",  label:"Dashboard", icon:"◈" },
  { path:"/superadmin/branches",   label:"Branches",  icon:"⬡" },
  { path:"/superadmin/menu",       label:"Menu",      icon:<SvgMenu /> },
  { path:"/superadmin/stock",      label:"Stock",     icon:"◎" },
  { path:"/superadmin/staff",      label:"Staff",     icon:<SvgStaff /> },
  { path:"/superadmin/offers",     label:"Offers",    icon:<SvgFlame /> },
  { path:"/superadmin/analytics",  label:"Analytics", icon:<SvgChart /> },
];

function AdminSidebar({ isSuperAdmin }) {
  const location = useLocation();
  const links    = isSuperAdmin ? SUPER_NAV : ADMIN_NAV;
  const active   = p => location.pathname === p || location.pathname.startsWith(p);

  return (
    <aside className="admin-sidebar">
      {/* Section label */}
      <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", padding:"0 var(--s3)", marginBottom:"var(--s3)" }}>
        {isSuperAdmin ? "Super Admin" : "Branch Admin"}
      </div>

      {links.map(l => {
        const on = active(l.path);
        return (
          <Link key={l.path} to={l.path} style={{
            display:"flex", alignItems:"center", gap:"var(--s3)",
            padding:"10px var(--s3)", borderRadius:"var(--r3)", marginBottom:"2px",
            fontSize:".9375rem", color: on?"var(--brand)":"var(--t2)",
            background: on?"var(--brand-tint)":"transparent",
            fontWeight: on?600:400,
            borderLeft:`3px solid ${on?"var(--brand)":"transparent"}`,
            transition:"all var(--d1) var(--ease)",
          }}
            onMouseEnter={e => { if (!on) { e.currentTarget.style.background="var(--bg3)"; e.currentTarget.style.color="var(--t1)"; } }}
            onMouseLeave={e => { if (!on) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="var(--t2)"; } }}
          >
            <span style={{ opacity:on?1:.5, display:"flex", alignItems:"center" }}>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </aside>
  );
}

export default function AppLayout({ children, adminSidebar = false }) {
  const mainRef  = useRef(null);
  const location = useLocation();
  const prev     = useRef(location.pathname);
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";

  /* Page transition */
  useEffect(() => {
    if (!mainRef.current || prev.current === location.pathname) return;
    prev.current = location.pathname;
    if (typeof gsap !== "undefined") {
      gsap.fromTo(mainRef.current,
        { opacity:0, y:10 },
        { opacity:1, y:0, duration:.32, ease:"power2.out", clearProps:"all" }
      );
    }
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Header />
      <StaffPing role={user?.role} />

      {/* Main body — flex row if admin sidebar is needed */}
      <div className={`page-body${adminSidebar ? " admin-layout" : ""}`}>
        {adminSidebar && <AdminSidebar isSuperAdmin={isSuperAdmin} />}

        <main ref={mainRef} className={adminSidebar ? "admin-main" : ""}>
          <div className="page-wrap">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
