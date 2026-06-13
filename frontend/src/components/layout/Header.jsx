/**
 * Header.jsx — KNFC top navigation
 * Uses CSS classes defined in global.css — no inline media queries.
 * Desktop (≥1024px): logo · nav · search · open chip · theme · cart
 * Mobile  (<1024px):  logo · spacer · theme · cart badge · hamburger
 *
 * Drawer: slides in from right with search + nav links.
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth }    from "../../context/AuthContext";
import useCartStore   from "../../store/cartStore";
import useTheme       from "../../hooks/useTheme";
import useBranch       from "../../hooks/useBranch";
import BranchSelector  from "../common/BranchSelector";

/* ── Next open time helper ──────────────────────────────────────────────── */
function formatNextOpenShort(isoStr) {
  if (!isoStr) return null;
  const d   = new Date(isoStr);
  const now = new Date();
  const dMid   = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff   = Math.round((dMid - nowMid) / 86400000);
  const time   = d.toLocaleTimeString("en-IN", { hour:"numeric", minute:"2-digit", hour12:true });
  if (diff <= 1) return time;
  return d.toLocaleDateString("en-IN", { weekday:"short" });
}

/* ── Nav link sets ──────────────────────────────────────────────────────── */
const NAV = {
  customer:     [{ label:"Menu",      path:"/menu"         },
                 { label:"Offers",    path:"/offers"       },
                 { label:"Track",     path:"/order/track"  },
                 { label:"Account",   path:"/account"      }],
  staff:        [{ label:"Queue",     path:"/staff/queue"     },
                 { label:"Stock",     path:"/staff/stock"     },
                 { label:"New Order", path:"/staff/new-order" }],
  branch_admin: [{ label:"Dashboard", path:"/admin/dashboard" },
                 { label:"Staff",     path:"/admin/staff"     },
                 { label:"Stock",     path:"/admin/stock"     },
                 { label:"Offers",    path:"/admin/offers"    }],
  super_admin:  [], // SuperAdmin uses sidebar navigation inside SuperAdminDashboard
};

/* ── Logo: one-letter-at-a-time emoji flip (K→🍗 N→🍔 F→🥤 C→🌶️) ──────── */
const LETTER_EMOJIS = ["🍗","🍔","🥤","🌶️"];

/* ── Icons ──────────────────────────────────────────────────────────────── */
const LogoIcon = () => <img src="/KNFC-logo.svg" alt="KNFC" width="44" height="44" style={{ objectFit:"contain", borderRadius:"10px", boxShadow:"0 0 0 2px rgba(232,82,26,.22), 0 2px 10px rgba(232,82,26,.18)" }} />;
const SearchIcon= () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>;
const CartIcon  = () => <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
/* Dark/Light mode — pill toggle, no SVG ─── */
const XIcon     = () => <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>;

export default function Header() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user }   = useAuth();
  const { isDark, toggle } = useTheme();

  const { branchName, hasBranch, selectBranch } = useBranch();
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const isCustomer    = user?.role === "customer";
  const userRole      = user?.role || "customer";
  const isAdminRole   = userRole === "branch_admin" || userRole === "super_admin";
  const isBranchAdmin = userRole === "branch_admin";
  const historyKey  = userRole === "staff"
    ? "knfc_staff_search_history"
    : (userRole === "branch_admin" || userRole === "super_admin")
      ? "knfc_admin_search_history"
      : "knfc_search_history";

  const cartCount  = useCartStore(s => s.items.reduce((a,i) => a + i.quantity, 0));
  const cartTotal  = useCartStore(s => s.items.reduce((a,i) => a + i.lineTotal, 0));

  const [scrolled,      setScrolled]      = useState(false);
  const [drawer,        setDrawer]        = useState(false);
  const [search,        setSearch]        = useState("");
  const [focused,       setFocused]       = useState(false);
  const [shopOpen,      setShopOpen]      = useState(true);
  const [nextOpenAt,    setNextOpenAt]    = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [flipIdx,       setFlipIdx]       = useState(-1);
  const flipCycleRef = useRef(0);
  const searchRef  = useRef(null);
  const { logout } = useAuth();

  /* load search history from localStorage — scoped per role */
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem(historyKey) || "[]");
      setSearchHistory(Array.isArray(h) ? h.slice(0, 6) : []);
    } catch {}
  }, [focused, historyKey]);

  const saveSearchTerm = (q) => {
    if (!q?.trim()) return;
    try {
      const prev = JSON.parse(localStorage.getItem(historyKey) || "[]");
      const next = [q.trim(), ...prev.filter(x => x.toLowerCase() !== q.trim().toLowerCase())].slice(0, 8);
      localStorage.setItem(historyKey, JSON.stringify(next));
      setSearchHistory(next.slice(0, 6));
    } catch {}
  };

  const removeSearchTerm = (term) => {
    try {
      const next = searchHistory.filter(x => x !== term);
      localStorage.setItem(historyKey, JSON.stringify(next));
      setSearchHistory(next);
    } catch {}
  };

  /* scroll shadow */
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  /* close drawer on nav */
  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    if (isAdminRole && !isBranchAdmin) return;
    document.body.classList.toggle("nav-open", drawer);
    return () => document.body.classList.remove("nav-open");
  }, [drawer, isAdminRole, isBranchAdmin]);

  /* fetch branch open/closed status + next open time */
  useEffect(() => {
    const bid = localStorage.getItem("branch_id");
    if (!bid) return;
    const fetchHours = () =>
      import("../../api/axiosClient").then(({ default: ax }) =>
        ax.get(`/branches/${bid}/hours/`)
          .then(r => {
            setShopOpen(r.data.is_open_now ?? true);
            setNextOpenAt(r.data.next_open_at || null);
          })
          .catch(() => setShopOpen(true))
      );
    fetchHours();
    const t = setInterval(fetchHours, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [hasBranch]);

  /* Logo — flip one letter at a time every 2.8 s */
  useEffect(() => {
    const t = setInterval(() => {
      const idx = flipCycleRef.current % 4;
      flipCycleRef.current++;
      setFlipIdx(idx);
      setTimeout(() => setFlipIdx(-1), 1100);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  /* "/" shortcut */
  useEffect(() => {
    const h = e => {
      if (e.key === "/" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) {
        e.preventDefault(); searchRef.current?.focus();
      }
      if (e.key === "Escape") { setDrawer(false); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const role   = userRole;
  const links  = NAV[role] || NAV.customer;
  const active = p => {
    if (p === "/menu") return location.pathname === "/menu" || location.pathname.startsWith("/menu/");
    if (p === "/offers") return location.pathname === "/offers" || location.pathname.startsWith("/offer/");
    return location.pathname === p || location.pathname.startsWith(p + "/");
  };
  const fmt    = n => `₹${Number(n).toLocaleString("en-IN")}`;

  const handleBranchSelected = (branch) => {
    selectBranch(branch);
    setShowBranchPicker(false);
    // Clear cart if branch changes
    const currentId = localStorage.getItem("branch_id");
    if (currentId && currentId !== branch.id) {
      useCartStore.getState().clearCart();
    }
  };

  const handleSearch = (e, overrideQ) => {
    if (e?.preventDefault) e.preventDefault();
    const q = (overrideQ ?? search).trim();
    if (!q) return;
    saveSearchTerm(q);
    let dest;
    if (userRole === "staff") {
      dest = `/staff/queue?q=${encodeURIComponent(q)}`;
    } else if (userRole === "branch_admin" || userRole === "super_admin") {
      dest = `/admin/menu?q=${encodeURIComponent(q)}`;
    } else {
      const lower = q.toLowerCase();
      dest = `/menu/search?q=${encodeURIComponent(q)}`;
      if (/^(offer|deal|discount|promo)/i.test(lower)) dest = "/offers";
      else if (/^(account|profile|point|loyalty|wallet)/i.test(lower)) dest = "/account";
      else if (/^(track|token|status)/i.test(lower)) dest = "/order/track";
    }
    navigate(dest);
    setSearch("");
    setFocused(false);
    searchRef.current?.blur();
  };

  /* nav link style helper */
  const linkStyle = p => ({
    padding: "6px 14px",
    borderRadius: "var(--r2)",
    fontSize: ".875rem",
    fontWeight: active(p) ? 600 : 400,
    color: active(p) ? "var(--brand)" : "var(--t2)",
    background: active(p) ? "var(--brand-tint)" : "transparent",
    transition: "all var(--d1) var(--ease)",
    whiteSpace: "nowrap",
    display: "block",
  });

  return (
    <>
      {/* ── Fixed header bar ──────────────────────────────────────────── */}
      <header
        className={`hdr-root${scrolled ? " scrolled" : ""}`}
        style={{ height:"var(--nav-h)" }} >
        <div style={{
          maxWidth: "var(--wrap)", margin: "0 auto",
          height: "100%", display: "flex", alignItems: "center",
          gap: "var(--s3)", padding: "0 var(--s4)",
        }}
          /* desktop padding handled by CSS */
          className="header-inner-row"
        >
          {/* Logo — animated swap every 5 s */}
          <Link to={
            user?.role === "staff"        ? "/staff/queue" :
            user?.role === "branch_admin" ? "/admin/dashboard" :
            user?.role === "super_admin"  ? "/superadmin/dashboard" :
            "/menu"
          } className="hdr-logo" style={{ gap:"10px" }}>
            <LogoIcon />
            <div>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:900, letterSpacing:"-.02em", color:"var(--t1)", lineHeight:1, display:"flex" }}>
                {["K","N","F","C"].map((ch, i) => (
                  <span key={i} style={{ display:"inline-block", position:"relative" }}>
                    <span style={{
                      display:"inline-block",
                      transition:"opacity .18s ease, transform .18s ease",
                      opacity: flipIdx === i ? 0 : 1,
                      transform: flipIdx === i ? "translateY(4px)" : "none",
                    }}>{ch}</span>
                    {flipIdx === i && (
                      <span style={{
                        position:"absolute", left:0, top:0, pointerEvents:"none",
                        animation:"letterFlipIn .25s ease forwards",
                      }}>{LETTER_EMOJIS[i]}</span>
                    )}
                  </span>
                ))}
              </div>
              <div style={{ fontSize:".5625rem", fontWeight:600, color:"var(--t2)", letterSpacing:".08em", textTransform:"uppercase", lineHeight:1, marginTop:"2px" }}>Fried Chicken</div>
            </div>
          </Link>

          {/* Desktop nav ── CSS: display:none mobile, flex desktop */}
          <nav className="hdr-nav">
            {links.map(l => (
              <Link key={l.path} to={l.path} style={linkStyle(l.path)}
                onMouseEnter={e => { if (!active(l.path)) { e.currentTarget.style.color="var(--t1)"; e.currentTarget.style.background="var(--bg2)" } }}
                onMouseLeave={e => { if (!active(l.path)) { e.currentTarget.style.color="var(--t2)"; e.currentTarget.style.background="transparent" } }}
              >{l.label}</Link>
            ))}
          </nav>

          {/* Desktop search ── CSS: display:none mobile, flex desktop */}
          <form onSubmit={handleSearch} className="hdr-search-wrap" style={{ position:"relative" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "var(--s2)",
              background: focused ? "var(--bgc)" : "var(--bg2)",
              border: `1px solid ${focused ? "var(--brand)" : "var(--bd)"}`,
              borderRadius: "var(--rf)", padding: "0 var(--s3)",
              boxShadow: focused ? "0 0 0 3px var(--brand-tint)" : "none",
              transition: "all var(--d1) var(--ease)", width: "100%",
            }}>
              <span style={{ color:"var(--t2)", display:"flex" }}><SearchIcon /></span>
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 120)}
                placeholder={
                  userRole === "staff"        ? "Search orders, items…" :
                  userRole === "branch_admin" || userRole === "super_admin" ? "Search menu, orders, staff…" :
                  "Search menu, offers, account…"
                }
                enterKeyHint="search"
                autoComplete="off"
                style={{ flex:1, border:"none", background:"transparent", color:"var(--t1)", fontSize:".875rem", outline:"none", padding:"9px 0", fontFamily:"var(--ff-b)" }}
              />
              {search && (
                <button type="button" onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t2)", display:"flex", alignItems:"center", padding:"4px", borderRadius:"var(--r1)", transition:"color var(--d1) var(--ease)" }}
                  onMouseEnter={e => e.currentTarget.style.color="var(--t1)"}
                  onMouseLeave={e => e.currentTarget.style.color="var(--t3)"}
                ><XIcon /></button>
              )}
            </div>
            {/* Search suggestions dropdown */}
            {focused && (
              <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", boxShadow:"var(--sh-md)", zIndex:10, overflow:"hidden" }}>
                {search.trim() ? (
                  <button onMouseDown={handleSearch} style={{ width:"100%", padding:"var(--s3) var(--s4)", display:"flex", alignItems:"center", gap:"var(--s3)", background:"transparent", border:"none", cursor:"pointer", color:"var(--t1)", fontSize:".875rem", textAlign:"left", fontFamily:"var(--ff-b)" }}
                    onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <span style={{ color:"var(--t2)", display:"flex", flexShrink:0 }}><SearchIcon /></span>
                    <span style={{ color:"var(--t2)" }}>Search <strong style={{ color:"var(--t1)" }}>"{search}"</strong> in menu</span>
                    <span style={{ marginLeft:"auto", color:"var(--brand)", fontSize:".8125rem", fontWeight:700 }}>→</span>
                  </button>
                ) : (
                  <>
                    {/* Recent searches — personalized per user */}
                    {searchHistory.length > 0 && (
                      <>
                        <div style={{ padding:"var(--s2) var(--s4)", fontSize:".6875rem", fontWeight:800, color:"var(--t2)", textTransform:"uppercase", letterSpacing:".06em", borderBottom:"1px solid var(--bd)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span>Recent searches</span>
                          <button onMouseDown={() => { localStorage.removeItem("knfc_search_history"); setSearchHistory([]); }}
                            style={{ background:"none", border:"none", cursor:"pointer", color:"var(--brand)", fontSize:".6875rem", fontWeight:700, padding:0 }}>
                            Clear
                          </button>
                        </div>
                        {searchHistory.map(term => (
                          <div key={term} style={{ display:"flex", alignItems:"center", width:"100%" }}>
                            <button onMouseDown={() => { setSearch(term); handleSearch(null, term); }}
                              style={{ flex:1, padding:"var(--s3) var(--s4)", display:"flex", alignItems:"center", gap:"var(--s3)", background:"transparent", border:"none", cursor:"pointer", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", textAlign:"left" }}
                              onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--t4)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><polyline points="21 21 16.65 16.65"/></svg>
                              <span style={{ color:"var(--t2)" }}>{term}</span>
                            </button>
                            <button onMouseDown={() => removeSearchTerm(term)}
                              style={{ padding:"var(--s3) var(--s3)", background:"transparent", border:"none", cursor:"pointer", color:"var(--t2)", display:"flex", alignItems:"center" }}
                              onMouseEnter={e => e.currentTarget.style.color="var(--t2)"}
                              onMouseLeave={e => e.currentTarget.style.color="var(--t4)"}>
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ))}
                        <div style={{ borderTop:"1px solid var(--bd)" }}/>
                      </>
                    )}

                    {/* Quick links — role-specific */}
                    <div style={{ padding:"var(--s2) var(--s4)", fontSize:".6875rem", fontWeight:800, color:"var(--t2)", textTransform:"uppercase", letterSpacing:".06em", borderBottom:"1px solid var(--bd)" }}>
                      {searchHistory.length > 0 ? "Quick links" : "Browse"}
                    </div>
                    {(userRole === "staff" ? [
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>, label:"Order Queue",  path:"/staff/queue" },
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8" strokeLinecap="round"/></svg>,                                label:"New Order",   path:"/staff/new-order" },
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>, label:"Stock Update", path:"/staff/stock" },
                    ] : (userRole === "branch_admin" || userRole === "super_admin") ? [
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label:"Dashboard",  path:"/admin/dashboard" },
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>, label:"Menu",       path:"/admin/menu" },
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,  label:"Stock",      path:"/admin/stock" },
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>, label:"Offers",     path:"/admin/offers" },
                    ] : [
                      { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>, label:"Offers & Deals", path:"/offers" },
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label:"My Account",    path:"/account" },
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>, label:"Track Order",  path:"/order/track" },
                      { icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>, label:"Browse Menu",  path:"/menu" },
                    ]).map(({ icon, label, path }) => (
                      <button key={path} onMouseDown={() => { navigate(path); setFocused(false); }}
                        style={{ width:"100%", padding:"var(--s3) var(--s4)", display:"flex", alignItems:"center", gap:"var(--s3)", background:"transparent", border:"none", cursor:"pointer", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)" }}
                        onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        <span style={{ color:"var(--brand)", display:"flex", width:"18px", justifyContent:"center" }}>{icon}</span>
                        <span style={{ color:"var(--t2)" }}>{label}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </form>

          {/* Spacer ── mobile only, pushes actions to right edge */}
          <div className="hdr-spacer" />

          {/* Right actions */}
          <div className="hdr-actions">
            {/* Open / Closed chip ── desktop only */}
            <div className="hdr-open-chip" style={{
              alignItems: "center", gap: "5px",
              padding: "5px 12px",
              background: shopOpen ? "var(--ok-t)" : "var(--err-t)",
              border: `1px solid ${shopOpen ? "rgba(29,158,117,.2)" : "rgba(226,75,74,.2)"}`,
              borderRadius: "var(--rf)",
            }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background: shopOpen ? "var(--ok)" : "var(--err)", animation: shopOpen ? "pulse 2s infinite" : "none" }} />
              <span style={{ fontSize:".75rem", fontWeight:600, color: shopOpen ? "var(--ok)" : "var(--err)", whiteSpace:"nowrap" }}>
                {shopOpen
                  ? "Open now"
                  : nextOpenAt
                    ? `Opens ${formatNextOpenShort(nextOpenAt)}`
                    : "Closed"
                }
              </span>
            </div>

            {/* Branch switch icon — customers only, mobile only */}
            {isCustomer && (
              <button
                onClick={() => setShowBranchPicker(true)}
                className="hdr-branch-mob"
                title={hasBranch ? `Branch: ${branchName}` : "Select branch"}
                style={{ width:"36px", height:"36px", borderRadius:"var(--r2)", background:"var(--bg2)", border:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--t2)", cursor:"pointer", flexShrink:0, transition:"all var(--d1) var(--ease)" }}
                onMouseEnter={e=>{ e.currentTarget.style.color="var(--brand)"; e.currentTarget.style.borderColor="var(--bdb)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.color="var(--t2)"; e.currentTarget.style.borderColor="var(--bd)"; }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </button>
            )}

            {/* Branch chip — customers only, desktop */}
            {isCustomer && (
              <button
                onClick={() => setShowBranchPicker(true)}
                className="hdr-branch-chip"
                style={{
                  display:"flex", alignItems:"center", gap:"6px",
                  padding:"7px 13px", borderRadius:"var(--rf)",
                  background:"var(--brand-tint)", border:"1px solid var(--bdb)",
                  color:"var(--brand)", fontSize:".8125rem", fontWeight:700,
                  cursor:"pointer", whiteSpace:"nowrap", fontFamily:"var(--ff-b)",
                  transition:"all var(--d1) var(--ease)", flexShrink:0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background="var(--brand)"; e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor="var(--brand)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="var(--brand-tint)"; e.currentTarget.style.color="var(--brand)"; e.currentTarget.style.borderColor="var(--bdb)"; }}
                title="Switch branch"
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                {hasBranch ? branchName : "Select branch"}
              </button>
            )}

            {/* Theme toggle — sun/moon icon button */}
            <button
              onClick={toggle}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width:"36px", height:"36px", borderRadius:"var(--r2)", padding:0,
                background: isDark ? "rgba(232,82,26,.12)" : "var(--bg2)",
                border:`1.5px solid ${isDark ? "rgba(232,82,26,.3)" : "var(--bd)"}`,
                cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                color: isDark ? "var(--brand)" : "var(--t2)",
                transition:"all .2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.color="var(--brand)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor= isDark ? "rgba(232,82,26,.3)" : "var(--bd)"; e.currentTarget.style.color= isDark ? "var(--brand)" : "var(--t2)"; }}>
              {isDark ? (
                /* Sun — switch to light */
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                /* Moon — switch to dark */
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {/* Cart */}
            {role === "customer" && (
              <button
                onClick={() => navigate("/cart")}
                style={{
                  display:"flex", alignItems:"center", gap:"var(--s2)",
                  padding: cartCount > 0 ? "8px 14px" : "9px",
                  background: cartCount > 0 ? "var(--brand)" : "var(--bg2)",
                  border: `1px solid ${cartCount > 0 ? "var(--brand)" : "var(--bd)"}`,
                  borderRadius:"var(--r3)", color: cartCount > 0 ? "#fff" : "var(--t2)",
                  position:"relative", transition:"all var(--d1) var(--ease)",
                  boxShadow: cartCount > 0 ? "var(--sh-br)" : "none", flexShrink:0,
                }}
              >
                <CartIcon />
                {/* Text shown only on desktop via CSS */}
                <span className="cart-txt" style={{ fontSize:".875rem", fontWeight:700 }}>
                  {cartCount > 0 ? `${cartCount} · ${fmt(cartTotal)}` : ""}
                </span>
                {/* Badge shown only on mobile */}
                {cartCount > 0 && (
                  <div style={{
                    position:"absolute", top:"-5px", right:"-5px",
                    background:"var(--brand)", color:"#fff",
                    fontSize:".5625rem", fontWeight:800,
                    width:"16px", height:"16px", borderRadius:"50%",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    border:"2px solid var(--bg)",
                  }}
                    className="cart-badge-mob"
                  >{cartCount > 9 ? "9+" : cartCount}</div>
                )}
              </button>
            )}

            {/* Admin mobile sign-out — compact button, hidden at desktop (they use sidebar logout) */}
            {isAdminRole && user && (
              <button
                className="hdr-admin-logout"
                onClick={async () => { const r = userRole; await logout(); navigate(r === "staff" ? "/login/staff" : r === "customer" ? "/login" : "/login/admin"); }}
                title="Sign out"
                style={{
                  width:"36px", height:"36px", borderRadius:"var(--r2)",
                  background:"transparent", border:"1px solid var(--err-t)",
                  color:"var(--err)", display:"flex", alignItems:"center",
                  justifyContent:"center", cursor:"pointer", flexShrink:0,
                  transition:"all var(--d1) var(--ease)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background="var(--err-t)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            )}

            {/* Hamburger ── mobile only, hidden at desktop via CSS. */}
            {(!isAdminRole || isBranchAdmin) && <button
              className={isBranchAdmin ? "hdr-ba-hamburger hdr-hamburger" : "hdr-hamburger"}
              onClick={() => setDrawer(v => !v)}
              style={{
                width:"38px", height:"38px", borderRadius:"var(--r2)",
                background: drawer ? "var(--bg3)" : "var(--bg2)",
                border:"1px solid var(--bd)",
                flexDirection:"column", gap:"4.5px",
                alignItems:"center", justifyContent:"center",
                transition:"background var(--d1) var(--ease)", flexShrink:0,
              }}
            >
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: i === 1 ? "13px" : "18px", height:"2px", borderRadius:"1px",
                  background:"var(--t2)",
                  transition:"all var(--d2) var(--ease)",
                  transform: drawer
                    ? i===0 ? "translateY(6.5px) rotate(45deg)"
                    : i===2 ? "translateY(-6.5px) rotate(-45deg)"
                    : "scaleX(0)"
                    : i===1 ? "scaleX(.72)" : "none",
                }} />
              ))}
            </button>}
          </div>
        </div>
      </header>

      {/* ── Mobile drawer backdrop + slide drawer (customer / staff / branch_admin) ─── */}
      {(!isAdminRole || isBranchAdmin) && drawer && (
        <div
          onClick={() => setDrawer(false)}
          style={{
            position:"fixed", inset:0, zIndex:190,
            background:"rgba(0,0,0,.45)", backdropFilter:"blur(4px)",
            animation:"fadeIn var(--d2) var(--ease-o)",
          }}
        />
      )}

      {(!isAdminRole || isBranchAdmin) && <aside style={{
        position:"fixed", top:0, right:0, bottom:0, zIndex:195,
        width:"min(300px,84vw)", background:"var(--bgc)",
        borderLeft:"1px solid var(--bd)", boxShadow:"var(--sh-xl)",
        transform: drawer ? "translateX(0)" : "translateX(100%)",
        transition:"transform var(--d3) var(--ease)",
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        {/* Drawer header */}
        <div style={{ padding:"var(--s5)", borderBottom:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, color:"var(--brand)" }}>KNFC</div>
            {user && <div style={{ fontSize:".8125rem", color:"var(--t2)", marginTop:"2px" }}>{user.name} · {(user.role||"").replace("_"," ")}</div>}
          </div>
          <button onClick={() => setDrawer(false)} style={{ width:"32px", height:"32px", borderRadius:"var(--r2)", background:"var(--bg2)", border:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--t2)", cursor:"pointer" }}>
            <XIcon />
          </button>
        </div>

        {/* Drawer search */}
        <div style={{ padding:"var(--s3) var(--s4)" }}>
          <form onSubmit={e => { handleSearch(e); setDrawer(false); }}>
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"0 var(--s3)" }}>
              <span style={{ color:"var(--t2)", display:"flex" }}><SearchIcon /></span>
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={userRole === "staff" ? "Search orders…" : userRole === "branch_admin" || userRole === "super_admin" ? "Search menu, staff…" : "Search menu…"}
                enterKeyHint="search" autoComplete="off"
                style={{ flex:1, border:"none", background:"transparent", color:"var(--t1)", fontSize:".875rem", outline:"none", padding:"10px 0", fontFamily:"var(--ff-b)" }} />
            </div>
          </form>
        </div>

        {/* Drawer nav */}
        <nav style={{ flex:1, padding:"0 var(--s3)", overflowY:"auto" }}>
          {links.map(l => (
            <Link key={l.path} to={l.path} style={{
              display:"flex", alignItems:"center", padding:"var(--s3)",
              borderRadius:"var(--r3)", marginBottom:"2px",
              fontSize:".9375rem", fontWeight: active(l.path) ? 600 : 400,
              color: active(l.path) ? "var(--brand)" : "var(--t1)",
              background: active(l.path) ? "var(--brand-tint)" : "transparent",
              transition:"all var(--d1) var(--ease)",
            }}>
              {l.label}
              {active(l.path) && <div style={{ marginLeft:"auto", width:"6px", height:"6px", borderRadius:"50%", background:"var(--brand)" }} />}
            </Link>
          ))}
        </nav>

        {/* Drawer footer */}
        <div style={{ padding:"var(--s4) var(--s5)", borderTop:"1px solid var(--bd)", display:"flex", flexDirection:"column", gap:"var(--s2)", flexShrink:0 }}>
          {/* Shop status pill */}
          <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"5px 10px", borderRadius:"var(--rf)", background: shopOpen ? "var(--ok-t)" : "var(--err-t)", border:`1px solid ${shopOpen?"rgba(29,158,117,.2)":"rgba(226,75,74,.2)"}`, alignSelf:"flex-start" }}>
            <div style={{ width:"6px", height:"6px", borderRadius:"50%", background: shopOpen ? "var(--ok)" : "var(--err)" }}/>
            <span style={{ fontSize:".75rem", fontWeight:600, color: shopOpen ? "var(--ok)" : "var(--err)" }}>
              {shopOpen ? "Open now" : nextOpenAt ? `Opens ${formatNextOpenShort(nextOpenAt)}` : "Closed"}
            </span>
          </div>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"var(--s2)" }}>
            {isCustomer && hasBranch ? (
              <button
                onClick={() => { setDrawer(false); setShowBranchPicker(true); }}
                style={{ display:"flex", alignItems:"center", gap:"5px", background:"var(--brand-tint)", border:"1px solid var(--bdb)", borderRadius:"var(--rf)", padding:"5px 12px", color:"var(--brand)", fontSize:".8125rem", fontWeight:700, cursor:"pointer", fontFamily:"var(--ff-b)" }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                {branchName}
              </button>
            ) : (
              <span style={{ fontSize:".8125rem", color:"var(--t2)" }}>KNFC</span>
            )}
            <button onClick={toggle} style={{ padding:"6px 12px", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r2)", fontSize:".8125rem", fontWeight:500, color:"var(--t2)", fontFamily:"var(--ff-b)", cursor:"pointer", display:"flex", alignItems:"center", gap:"5px" }}>
              {isDark
                ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>Light</>
                : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>Dark</>
              }
            </button>
          </div>

          {/* Logout button — shown for logged-in staff/admin/customer */}
          {user && (
            <button
              onClick={async () => { setDrawer(false); const r = userRole; await logout(); navigate(r === "staff" ? "/login/staff" : r === "customer" ? "/login" : "/login/admin"); }}
              style={{ width:"100%", padding:"10px", borderRadius:"var(--r3)", border:"1px solid var(--err-t)", background:"transparent", color:"var(--err)", fontSize:".875rem", fontWeight:700, cursor:"pointer", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", transition:"all var(--d1) var(--ease)", marginTop:"var(--s1)" }}
              onMouseEnter={e=>{e.currentTarget.style.background="var(--err-t)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          )}
        </div>
      </aside>}

      <style>{`
        /* cart badge hidden on desktop */
        @media(min-width:1024px){ .cart-badge-mob{display:none} .cart-txt{display:inline !important} }
        @media(max-width:1023px){ .cart-txt{display:none !important} }
        .header-inner-row{padding: 0 var(--s4)}
        @media(min-width:1024px){ .header-inner-row{padding: 0 var(--s8)} }
        @media(min-width:1280px){ .header-inner-row{padding: 0 var(--s10)} }
        .hdr-branch-chip{display:none !important}
        @media(min-width:1024px){ .hdr-branch-chip{display:flex !important} }
        /* Mobile branch icon: show on mobile, hide on desktop (branch chip takes over) */
        .hdr-branch-mob{display:flex !important}
        @media(min-width:1024px){ .hdr-branch-mob{display:none !important} }
        /* Admin logout button: mobile only */
        .hdr-admin-logout{display:flex}
        @media(min-width:1024px){ .hdr-admin-logout{display:none !important} }
        /* BranchAdmin hamburger: mobile only */
        .hdr-ba-hamburger{display:flex}
        @media(min-width:1024px){ .hdr-ba-hamburger{display:none !important} }
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes letterFlipIn{0%{opacity:0;transform:translateY(-5px) scale(.7)}65%{opacity:1;transform:translateY(1px) scale(1.1)}100%{opacity:1;transform:translateY(0) scale(1)}}
      `}</style>
      {/* Branch picker modal */}
      {showBranchPicker && (
        <BranchSelector
          onSelected={handleBranchSelected}
          allowDismiss={true}
          onDismiss={() => setShowBranchPicker(false)}
        />
      )}

    </>
  );
}
