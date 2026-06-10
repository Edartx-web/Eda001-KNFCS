/**
 * AccountPage.jsx — Phase 4
 * Design: Zepto account × editorial
 * - Brand-gradient profile hero with loyalty progress
 * - Tier system with visual badge (New/Regular/Fan/VIP)
 * - Quick stats row
 * - Orders: scannable rows with status badges + "Reorder" CTA
 * - Favourites: 2-col grid with remove heart
 * - Settings: clean info list + sign out
 */
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { gsap } from "gsap";
import AppLayout from "../../components/layout/AppLayout";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import { useAuth } from "../../context/AuthContext";
import useCartStore from "../../store/cartStore";
import { getMyOrders } from "../../api/orders";
import axiosClient from "../../api/axiosClient";
import { getFavourites, toggleFavourite } from "../../api/menu";
import GoogleReviewBanner from "../../components/common/GoogleReviewBanner";
import { formatPrice, formatDate, formatTime } from "../../utils/format";
import { STATUS_META } from "../../utils/constants";

const Ic = {
  Phone:  () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg>,
  Logout: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Arrow:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round"/></svg>,
  Heart:  () => <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Clock:  () => <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>,
  Redo:   () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeLinecap="round"/></svg>,
};

const TIERS = [
  { min:0,   max:99,  label:"New",     color:"var(--t2)",    bg:"var(--bg3)",      glow:"rgba(140,138,134,.2)",
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="17" r="4"/><line x1="11.5" y1="13.5" x2="19" y2="6"/><circle cx="20" cy="5" r="1.5"/></svg> },
  { min:100, max:299, label:"Regular", color:"var(--info)",  bg:"var(--info-t)",   glow:"rgba(55,138,221,.2)",
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 007-7c0-5-4-7-5-11-1.5 2-2 4-2 5.5-1-1-1.5-2.5-1-4-2 2.5-2 5-2 6a5 5 0 005 5z"/></svg> },
  { min:300, max:499, label:"Fan",     color:"var(--ok)",    bg:"var(--ok-t)",     glow:"rgba(29,158,117,.2)",
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { min:500, max:Infinity, label:"VIP",color:"var(--gold-d)",bg:"rgba(245,166,35,.12)", glow:"rgba(245,166,35,.3)",
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 16L3 6l5.5 5L12 4l3.5 7L21 6l-2 10H5z"/><line x1="5" y1="19" x2="19" y2="19"/></svg> },
];
const getTier = pts => TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0];

export default function AccountPage() {
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const addItem   = useCartStore(s => s.addItem);
  const { loading: pageLoading } = usePageLoader();
  const pageRef   = useRef(null);
  const heroRef   = useRef(null);

  const [orders,       setOrders]       = useState([]);
  const [orderFilter,  setOrderFilter]  = useState("all");
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [favourites,   setFavourites]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("orders");
  const [removing,     setRemoving]     = useState({});
  const [reordering,   setReordering]   = useState({});
  const [cancelling,   setCancelling]   = useState({});
  const [siteConfig,   setSiteConfig]   = useState(null);

  const points = user?.loyalty_points || 0;
  const tier   = getTier(points);
  const nextT  = TIERS.find(t => t.min > points);
  const pct    = nextT ? Math.min((points / nextT.min) * 100, 100) : 100;
  const loyaltyOn = siteConfig?.loyalty_enabled !== false;

  useEffect(() => {
    const load = async () => {
      try {
        const [oR, fR] = await Promise.all([
          getMyOrders().catch(() => ({ data:{ orders:[] } })),
          getFavourites().catch(() => ({ data:{ favourites:[] } })),
        ]);
        setOrders(oR.data.orders || []);
        setFavourites(fR.data.favourites || []);
        axiosClient.get("/branches/config/").then(r => setSiteConfig(r.data.config)).catch(() => {});
      } finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (loading || !pageRef.current || typeof gsap === "undefined") return;
    gsap.fromTo(pageRef.current.querySelectorAll(".ac-section"),
      { y:18, opacity:0 },
      { y:0, opacity:1, stagger:.08, duration:.42, ease:"power2.out" }
    );
  }, [loading]);

  const handleRemoveFav = async id => {
    setRemoving(r => ({...r, [id]:true}));
    try {
      await toggleFavourite(id);
      setFavourites(f => f.filter(x => x.id !== id));
    } finally { setRemoving(r => ({...r, [id]:false})); }
  };
const handleCancelOrder = async (order) => {
    if (!window.confirm(`Cancel order ${order.token_number}? This cannot be undone.`)) return;

    setCancelling(c => ({ ...c, [order.id]: true }));
    try {
      await axiosClient.patch(`/orders/${order.id}/cancel/`);
      const res = await getMyOrders();
      setOrders(res.data.orders || []);
    } catch (err) {
      alert(err?.response?.data?.error || "Could not cancel order. Please speak to staff.");
    } finally {
      setCancelling(c => ({ ...c, [order.id]: false }));
    }
  };

  // Fixed: Properly declared handleReorder
  const handleReorder = async (order) => {
    setReordering(r => ({ ...r, [order.id]: true }));
    try {
      (order.items || []).forEach(item => {
        if (item.menu_item_id) {
          addItem({
            id: item.menu_item_id,
            name: item.name_snapshot,
            price: item.price_snapshot,
            slug: item.slug || "",
          }, item.quantity);
        }
      });
      navigate("/cart");
    } finally {
      setReordering(r => ({ ...r, [order.id]: false }));
    }
  };

  if (pageLoading || loading) return <KNCLoader visible label="Loading account…" />;
  const TABS = [
    { key:"orders",     label:"Orders",   count:orders.length     },
    { key:"favourites", label:"Saved",    count:favourites.length },
  ];

  return (
    <AppLayout>
      <div ref={pageRef} style={{ maxWidth:"640px", margin:"0 auto" }}>

        {/* ── Hero profile card ─────────────────────────────────────── */}
        <div ref={heroRef} className="ac-section"
          style={{ background:"linear-gradient(135deg,var(--brand),var(--brand-d))", borderRadius:"var(--r5)", padding:"var(--s6)", marginBottom:"var(--s5)", position:"relative", overflow:"hidden" }}>
          {/* Decorative orbs */}
          <div style={{ position:"absolute", width:"240px", height:"240px", borderRadius:"50%", background:"rgba(255,255,255,.06)", top:"-80px", right:"-60px", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", width:"120px", height:"120px", borderRadius:"50%", background:"rgba(255,255,255,.04)", bottom:"-30px", left:"20px", pointerEvents:"none" }}/>

          <div style={{ position:"relative", zIndex:1 }}>
            {/* Top row: avatar + tier badge */}
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s5)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s4)" }}>
                <div style={{ width:"60px", height:"60px", borderRadius:"50%", background:"rgba(255,255,255,.2)", border:"2.5px solid rgba(255,255,255,.35)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--ff-d)", fontSize:"1.625rem", fontWeight:900, color:"#fff", flexShrink:0 }}>
                  {(user?.name || "?")[0].toUpperCase()}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1rem,4vw,1.5rem)", fontWeight:900, color:"#fff", letterSpacing:"-.02em", lineHeight:1.1, marginBottom:"5px", wordBreak:"break-word" }}>
                    {user?.name || "Customer"}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"5px", color:"rgba(255,255,255,.7)", fontSize:".8125rem", fontWeight:500 }}>
                    <Ic.Phone/> {user?.phone || "Not set"}
                  </div>
                </div>
              </div>

              {/* Tier badge — only when loyalty is on */}
              {loyaltyOn && (
              <div style={{ background:"rgba(255,255,255,.15)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,.2)", borderRadius:"var(--r3)", padding:"var(--s2) var(--s3)", textAlign:"center", flexShrink:0 }}>
                <div style={{ lineHeight:1, marginBottom:"3px" }}>{tier.icon}</div>
                <div style={{ fontSize:".5625rem", fontWeight:800, color:"rgba(255,255,255,.85)", letterSpacing:".1em", textTransform:"uppercase" }}>{tier.label}</div>
              </div>
              )}
            </div>

            {/* Points + progress — only when loyalty is on */}
            {loyaltyOn && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"var(--s2)" }}>
                <div>
                  <span style={{ fontFamily:"var(--ff-d)", fontSize:"2rem", fontWeight:900, color:"var(--gold)" }}>{points}</span>
                  <span style={{ fontSize:".9375rem", color:"rgba(255,255,255,.65)", marginLeft:"5px" }}>points</span>
                </div>
                <span style={{ fontSize:".8125rem", color:"rgba(255,255,255,.55)" }}>
                  {nextT ? `${nextT.min - points} more → ${nextT.label}` : "Max tier reached"}
                </span>
              </div>
              <div style={{ height:"6px", borderRadius:"3px", background:"rgba(255,255,255,.15)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:"var(--gold)", borderRadius:"3px", transition:"width .8s var(--ease-s)" }}/>
              </div>
              <div style={{ fontSize:".75rem", color:"rgba(255,255,255,.45)", marginTop:"var(--s2)" }}>
                500 pts = ₹50 off your next order
              </div>
            </div>
            )}
          </div>
        </div>

        {/* ── Quick stats ──────────────────────────────────────────── */}
        <div className="ac-section stats-grid" style={{ marginBottom:"var(--s5)" }}>
          {[
            { label:"Orders",    value:orders.length,                                    color:"var(--info)"   },
            { label:"Completed", value:orders.filter(o=>o.status==="completed").length,  color:"var(--ok)"     },
            ...(loyaltyOn ? [{ label:"Points", value:points, color:"var(--gold-d)" }] : []),
            { label:"Saved",     value:favourites.length,                                color:"var(--err)"    },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:`linear-gradient(90deg,${s.color},transparent)`, borderRadius:"var(--r4) var(--r4) 0 0" }}/>
              <div className="stat-lbl">{s.label}</div>
              <div className="stat-val" style={{ color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Loyalty tier explanation ──────────────────────────────── */}
        {loyaltyOn && (
          <div className="ac-section" style={{ marginBottom:"var(--s5)" }}>
            <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s3)" }}>
              How Loyalty Tiers Work
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"var(--s2)" }}>
              {TIERS.map(t => {
                const isCurrent = tier.label === t.label;
                const isReached = points >= t.min;
                return (
                  <div key={t.label} style={{ padding:"var(--s3) var(--s4)", borderRadius:"var(--r3)", background: isCurrent ? t.bg : "var(--bg2)", border:`1.5px solid ${isCurrent ? t.color : "var(--bd)"}`, opacity: isReached ? 1 : .5, transition:"all .2s ease" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", marginBottom:"4px" }}>
                      <span style={{ color: t.color }}>{t.icon}</span>
                      <span style={{ fontWeight:800, fontSize:".9375rem", color: isCurrent ? t.color : "var(--t1)" }}>{t.label}</span>
                      {isCurrent && <span style={{ fontSize:".5625rem", fontWeight:800, padding:"1px 6px", borderRadius:"var(--rf)", background:t.color, color:"#fff", letterSpacing:".06em" }}>YOU</span>}
                    </div>
                    <div style={{ fontSize:".75rem", color:"var(--t3)" }}>
                      {t.max === Infinity ? `${t.min}+ pts` : `${t.min} – ${t.max} pts`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:"var(--s3)", padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", fontSize:".8125rem", color:"var(--t2)", lineHeight:1.6 }}>
              <strong>How to earn points:</strong> Complete orders → earn points automatically (rate set by admin). Redeem at checkout for ₹ off. New → Regular (100 pts) → Fan (300 pts) → VIP (500 pts).
            </div>
          </div>
        )}

        {/* ── Games — scratch card (if enabled) ───────────────────── */}
        {siteConfig?.scratch_enabled && (
          <div className="ac-section" style={{ marginBottom:"var(--s5)" }}>
            <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s3)" }}>
              Games &amp; Rewards
            </div>
            <div style={{ flex:1, background:"linear-gradient(135deg,rgba(37,99,235,.10),rgba(5,150,105,.10))", border:"1px solid rgba(37,99,235,.18)", borderRadius:"var(--r4)", padding:"var(--s4)", textAlign:"center" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:"6px", color:"#2563EB" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2M12 12v4M10 14h4"/></svg>
              </div>
              <div style={{ fontFamily:"var(--ff-d)", fontWeight:900, fontSize:".9375rem", color:"var(--t1)", marginBottom:"2px" }}>Scratch Card</div>
              <div style={{ fontSize:".75rem", color:"var(--t3)" }}>Scratch for {siteConfig.scratch_discount_pct}% off!</div>
            </div>
          </div>
        )}

        {/* ── Account Details — always visible ────────────────────── */}
        <div className="ac-section" style={{ marginBottom:"var(--s5)" }}>
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
            <div style={{ padding:"var(--s3) var(--s5)", borderBottom:"1px solid var(--bd)", display:"flex", alignItems:"center", gap:"8px" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span style={{ fontSize:".75rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t2)" }}>Account Details</span>
            </div>
            <div style={{ padding:"var(--s2) 0" }}>
              {[
                { label:"Name",         value: user?.name || "—",    icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                { label:"Phone",        value: user?.phone || "—",   icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg> },
                { label:"Member since", value: user?.date_joined ? new Date(user.date_joined).toLocaleDateString("en-IN",{month:"long",year:"numeric"}) : "—", icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                ...(loyaltyOn ? [{ label:"Loyalty tier", value:`${tier.label} · ${points} pts`, icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }] : []),
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s5)", borderBottom:"1px solid var(--bd)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", color:"var(--t2)" }}>
                    {icon}
                    <span style={{ fontSize:".875rem" }}>{label}</span>
                  </div>
                  <span style={{ fontSize:".9375rem", fontWeight:700, color:"var(--t1)" }}>{value}</span>
                </div>
              ))}
              <div style={{ padding:"var(--s3) var(--s5)", display:"flex", gap:"var(--s2)" }}>
                <Link to="/privacy" style={{ fontSize:".75rem", color:"var(--t2)", textDecoration:"none" }}>Privacy</Link>
                <span style={{ color:"var(--bd)", fontSize:".75rem" }}>·</span>
                <Link to="/terms"   style={{ fontSize:".75rem", color:"var(--t2)", textDecoration:"none" }}>Terms</Link>
                <span style={{ color:"var(--bd)", fontSize:".75rem" }}>·</span>
                <Link to="/cookies" style={{ fontSize:".75rem", color:"var(--t2)", textDecoration:"none" }}>Cookies</Link>
              </div>
            </div>
          </div>
          {/* Support / WhatsApp contact */}
          <a href="/contact"
            style={{ width:"100%", marginTop:"var(--s3)", padding:"var(--s3)", background:"rgba(37,211,102,.08)", color:"#25D366", border:"1px solid rgba(37,211,102,.25)", borderRadius:"var(--r3)", fontWeight:700, fontSize:".9375rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", fontFamily:"var(--ff-b)", textDecoration:"none", boxSizing:"border-box" }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            Support
          </a>
          <button onClick={() => { logout(); navigate("/login/customer"); }}
            style={{ width:"100%", marginTop:"var(--s3)", padding:"var(--s3)", background:"var(--err-t)", color:"var(--err)", border:"1px solid rgba(226,75,74,.2)", borderRadius:"var(--r3)", fontWeight:700, fontSize:".9375rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", fontFamily:"var(--ff-b)" }}>
            <Ic.Logout/> Sign out
          </button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div className="ac-section tabs" style={{ marginBottom:"var(--s5)" }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab-item${tab===t.key?" active":""}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.count !== null && <span style={{ marginLeft:"5px", fontSize:".6875rem", fontWeight:700, padding:"1px 5px", borderRadius:"var(--rf)", background:tab===t.key?"rgba(232,82,26,.15)":"var(--bg3)", color:tab===t.key?"var(--brand)":"var(--t4)" }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ───────────────────────────────────────────── */}
        {tab === "orders" && (
          <div className="ac-section">
            {/* Status filter pills */}
            {orders.length > 0 && !loading && (
              <div style={{ display:"flex", gap:"var(--s2)", marginBottom:"var(--s4)", flexWrap:"wrap" }}>
                {[
                  ["all",       "All",       orders.length],
                  ["active",    "Active",    orders.filter(o=>!["completed","cancelled"].includes(o.status)).length],
                  ["completed", "Completed", orders.filter(o=>o.status==="completed").length],
                  ["cancelled", "Cancelled", orders.filter(o=>o.status==="cancelled").length],
                ].map(([v,l,count]) => (
                  <button key={v} onClick={() => setOrderFilter(v)}
                    style={{ padding:"5px 14px", borderRadius:"var(--rf)", border:`1.5px solid ${orderFilter===v?"var(--brand)":"var(--bd)"}`, background:orderFilter===v?"var(--brand-tint)":"var(--bg2)", cursor:"pointer", fontSize:".8125rem", fontWeight:orderFilter===v?700:400, fontFamily:"var(--ff-b)", color:orderFilter===v?"var(--brand)":"var(--t3)", transition:"all var(--d1) var(--ease)", display:"flex", alignItems:"center", gap:"5px" }}>
                    {l}
                    {count > 0 && <span style={{ fontSize:".6875rem", padding:"1px 5px", borderRadius:"var(--rf)", background:orderFilter===v?"rgba(232,82,26,.15)":"var(--bg3)", color:orderFilter===v?"var(--brand)":"var(--t4)", fontWeight:700 }}>{count}</span>}
                  </button>
                ))}
              </div>
            )}
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"80px", borderRadius:"var(--r4)" }}/>)}
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign:"center", padding:"var(--s12) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
                <div style={{ fontSize:"3rem", marginBottom:"var(--s3)" }}>📋</div>
                <p style={{ fontWeight:700, marginBottom:"var(--s2)", fontSize:".9375rem" }}>No orders yet</p>
                <p style={{ color:"var(--t2)", fontSize:".875rem", marginBottom:"var(--s5)" }}>Your order history will appear here.</p>
                <button onClick={() => navigate("/menu")} className="btn btn-p btn-lg">Browse menu →</button>
              </div>
            ) : (() => {
              const filteredOrders = orders.filter(order => {
                if (orderFilter === "active")    return !["completed","cancelled"].includes(order.status);
                if (orderFilter === "completed") return order.status === "completed";
                if (orderFilter === "cancelled") return order.status === "cancelled";
                return true;
              });
              const visibleOrders = showAllOrders ? filteredOrders : filteredOrders.slice(0, 5);
              return (
              <div>
              <div className="card" style={{ overflow:"hidden" }}>
                {visibleOrders.map((order, i, arr) => {
                  const meta = STATUS_META[order.status] || STATUS_META.placed;
                  const isActive = !["completed","cancelled"].includes(order.status);
                  const badgeClass = order.status==="completed"?"badge-ok":order.status==="cancelled"?"badge-err":order.status==="ready"?"badge-p":"badge-warn";
                  return (
                    <div key={order.id}
                      style={{ padding:"var(--s4) var(--s5)", borderBottom:i<arr.length-1?"1px solid var(--bd)":"none", display:"flex", alignItems:"center", gap:"var(--s3)", transition:"background var(--d1) var(--ease)" }}
                      onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>

                      {/* Token */}
                      <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:900, padding:"4px 12px", borderRadius:"var(--r2)", background:isActive?"var(--brand)":"var(--bg3)", color:isActive?"#fff":"var(--t3)", flexShrink:0, minWidth:"52px", textAlign:"center" }}>
                        {order.token_number}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", marginBottom:"3px", flexWrap:"wrap" }}>
                          <span style={{ fontWeight:600, fontSize:".9375rem" }}>
                            {order.item_count} item{order.item_count!==1?"s":""}
                          </span>
                          <span style={{ color:"var(--t2)", fontSize:".8125rem" }}>·</span>
                          <span style={{ fontSize:".8125rem", color:"var(--t2)" }}>
                            {order.order_type==="dine_in"?`Table ${order.table_number}`:"Pickup"}
                          </span>
                          <span className={`badge ${badgeClass}`} style={{ fontSize:".5625rem" }}>
                            {meta.label}
                          </span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"4px", color:"var(--t2)", fontSize:".75rem" }}>
                          <Ic.Clock/> {formatDate(order.created_at)} {formatTime(order.created_at)}
                        </div>
                      </div>

                      {/* Price + actions */}
                      <div style={{ textAlign:"right", flexShrink:0, display:"flex", flexDirection:"column", gap:"var(--s1)", alignItems:"flex-end" }}>
                        <div className="price" style={{ fontSize:"1rem" }}>{formatPrice(order.total)}</div>
                        {isActive ? (
                          <>
                            <button onClick={() => navigate(`/order/track/${order.id}`)}
                              style={{ fontSize:".75rem", color:"var(--brand)", fontWeight:700, background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:"3px", fontFamily:"var(--ff-b)" }}>
                              Track <Ic.Arrow/>
                            </button>
                            {order.status === "placed" && (() => {
                              const expireMs = 3600000 - (Date.now() - new Date(order.created_at).getTime());
                              const minLeft  = Math.max(0, Math.floor(expireMs / 60000));
                              return (
                                <>
                                  {minLeft < 60 && (
                                    <span style={{ fontSize:".6875rem", color: minLeft < 10 ? "var(--err)" : "var(--warn)", fontWeight:700, display:"flex", alignItems:"center", gap:"3px" }}>
                                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
                                      {minLeft}m left
                                    </span>
                                  )}
                                  <button onClick={() => handleCancelOrder(order)} disabled={cancelling[order.id]}
                                    style={{ fontSize:".75rem", color:"var(--err)", fontWeight:600, background:"none", border:"none", cursor:cancelling[order.id]?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:"3px", fontFamily:"var(--ff-b)", opacity:cancelling[order.id]?.5:1 }}>
                                    {cancelling[order.id] ? "Cancelling…" : "Cancel"}
                                  </button>
                                </>
                              );
                            })()}
                          </>
                        ) : order.status === "completed" && (
                          <button onClick={() => handleReorder(order)} disabled={reordering[order.id]}
                            style={{ fontSize:".75rem", color:"var(--ok)", fontWeight:700, background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:"3px", fontFamily:"var(--ff-b)", opacity:reordering[order.id]?.6:1 }}>
                            {reordering[order.id] ? "Adding…" : <><Ic.Redo/> Reorder</>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredOrders.length > 5 && (
                <button onClick={() => setShowAllOrders(v => !v)}
                  style={{ width:"100%", marginTop:"var(--s3)", padding:"var(--s3)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", cursor:"pointer", fontSize:".875rem", fontWeight:600, color:"var(--brand)", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.background="var(--brand-tint)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.background="var(--bg2)"; }}>
                  {showAllOrders ? `Show less ↑` : `Show all ${filteredOrders.length} orders ↓`}
                </button>
              )}
              </div>
              );
            })()}
          </div>
        )}

        {/* ── FAVOURITES TAB ───────────────────────────────────────── */}
        {tab === "favourites" && (
          <div className="ac-section">
            {favourites.length === 0 ? (
              <div style={{ textAlign:"center", padding:"var(--s12) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
                <div style={{ fontSize:"3rem", marginBottom:"var(--s3)" }}>❤️</div>
                <p style={{ fontWeight:700, marginBottom:"var(--s2)", fontSize:".9375rem" }}>No saved items</p>
                <p style={{ color:"var(--t2)", fontSize:".875rem", marginBottom:"var(--s5)" }}>Tap ❤️ on any item to save it here.</p>
                <button onClick={() => navigate("/menu")} className="btn btn-p btn-lg">Browse menu →</button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"var(--s3)" }}>
                {favourites.map(item => (
                  <div key={item.id} style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden", position:"relative", cursor:"pointer", transition:"transform var(--d1) var(--ease), box-shadow var(--d1) var(--ease)" }}
                    onClick={() => navigate(`/menu/product/${item.slug}`)}
                    onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="var(--sh-md)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
                    <div style={{ aspectRatio:"4/3", background:item.image_url?"var(--bg3)":`linear-gradient(135deg,${item.gradient_from||"#1A0800"},${item.gradient_to||"#2D1200"})`, position:"relative", overflow:"hidden" }}>
                      {item.image_url ? <img loading="lazy" src={item.image_url} alt={item.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--t4)" }}>{item.emoji || <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>}</div>}
                    </div>
                    <div style={{ padding:"var(--s3)" }}>
                      <div style={{ fontSize:".875rem", fontWeight:600, marginBottom:"4px", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" }}>{item.name}</div>
                      <div className="price" style={{ fontSize:".9375rem" }}>{formatPrice(item.offer_price||item.price)}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleRemoveFav(item.id); }} disabled={removing[item.id]}
                      style={{ position:"absolute", top:"8px", right:"8px", width:"28px", height:"28px", borderRadius:"50%", background:"rgba(226,75,74,.15)", border:"1px solid rgba(226,75,74,.3)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--err)", cursor:"pointer", transition:"background var(--d1) var(--ease)" }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(226,75,74,.3)"}
                      onMouseLeave={e => e.currentTarget.style.background="rgba(226,75,74,.15)"}>
                      <Ic.Heart/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <GoogleReviewBanner style={{ margin:"var(--s6) 0 var(--s8)" }}/>

        {/* ── Mobile mini-footer (links + Edartx credit) ────────────── */}
        <div style={{ borderTop:"1px solid var(--bd)", marginTop:"var(--s6)", paddingTop:"var(--s5)", paddingBottom:"var(--s8)" }}>
          {/* Navigation links */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"var(--s3) var(--s5)", justifyContent:"center", marginBottom:"var(--s5)" }}>
            {[
              ["About Us", "/about"],
              ["Blog", "/blog"],
              ["Careers", "/careers"],
              ["Contact", "/contact"],
              ["FAQ", "/faq"],
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
            ].map(([label, path]) => (
              <a key={label} href={path}
                style={{ fontSize:".8125rem", color:"var(--t3)", textDecoration:"none", fontWeight:500, transition:"color .15s" }}
                onMouseEnter={e => e.target.style.color="var(--brand)"}
                onMouseLeave={e => e.target.style.color="var(--t3)"}>
                {label}
              </a>
            ))}
          </div>

          {/* Edartx powered-by badge */}
          <a href="https://edartx.com" target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", textDecoration:"none", padding:"12px 24px", borderRadius:"var(--rf)", background:"linear-gradient(135deg,#0A0A0A,#1A1300)", border:"1.5px solid #B8860B", margin:"0 auto", maxWidth:"280px", transition:"all .2s ease", boxShadow:"0 2px 12px rgba(184,134,11,.2)" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow="0 4px 20px rgba(184,134,11,.4)"; e.currentTarget.style.borderColor="#DAA520"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow="0 2px 12px rgba(184,134,11,.2)"; e.currentTarget.style.borderColor="#B8860B"; }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DAA520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <div>
              <div style={{ fontSize:".625rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"#B8860B", lineHeight:1 }}>Powered by</div>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:900, letterSpacing:".04em", color:"#DAA520", lineHeight:1.2 }}>Edartx</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>

          <div style={{ textAlign:"center", marginTop:"var(--s4)", fontSize:".6875rem", color:"var(--t4)" }}>
            © {new Date().getFullYear()} KNFC Fried Chicken. All rights reserved.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
