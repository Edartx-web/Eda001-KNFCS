/**
 * CartPage.jsx — Phase 4
 * Inspired by: Blinkit checkout + Swiggy cart
 * - Animated item rows with swipe-to-remove feel
 * - Premium order type selector with icons
 * - Sticky summary panel on desktop
 * - Real-time total with discount breakdown
 * - Bill split panel (dine-in)
 * - Empty state with illustration
 * - Fully responsive single/two-col
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { gsap } from "gsap";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import AppLayout from "../../components/layout/AppLayout";
import { placeOrder, getOfferDetail, redeemLoyaltyPoints } from "../../api/orders";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import useBranch from "../../hooks/useBranch";
import BranchSelector from "../../components/common/BranchSelector";
import { formatPrice, formatUnit } from "../../utils/format";
import useCartStore from "../../store/cartStore";
import usePageProtection from "../../hooks/usePageProtection";
/* ─── CouponInput — type a code, get an offer applied ────────────────── */

function CouponInput({ onApply }) {
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [ok,      setOk]      = useState("");

  const handleApply = async () => {
    const c = code.trim().toUpperCase();
    if (!c) { setErr("Enter a coupon code"); return; }
    setLoading(true); setErr(""); setOk("");
    const bid = localStorage.getItem("branch_id") || "";
    try {
      const r = await axiosClient.get(`/offers/coupon/?code=${encodeURIComponent(c)}&branch_id=${bid}`);
      if (r.data.success && r.data.offer) {
        setOk("Coupon applied!");
        onApply(r.data.offer.id);
        setCode("");
      } else {
        setErr(r.data.error || "Invalid coupon code");
      }
    } catch (e) {
      setErr(e.response?.data?.error || "Invalid or expired coupon code");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ marginBottom:"var(--s3)" }}>
      <div style={{ display:"flex", gap:"var(--s2)", alignItems:"center" }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:"var(--s2)", border:`1.5px solid ${err?"var(--err)":"var(--bd)"}`, borderRadius:"var(--r3)", padding:"0 var(--s3)", background:"var(--bg2)" }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>
          <input
            value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr(""); setOk(""); }}
            onKeyDown={e => e.key === "Enter" && handleApply()}
            placeholder="Enter coupon code" maxLength={30}
            style={{ flex:1, border:"none", background:"transparent", padding:"10px 0", fontSize:".875rem", fontFamily:"monospace", fontWeight:700, letterSpacing:".06em", outline:"none", color:"var(--t1)" }}
          />
        </div>
        <button onClick={handleApply} disabled={loading || !code.trim()}
          style={{ padding:"10px 16px", borderRadius:"var(--r3)", border:"none", background:code.trim()?"var(--brand)":"var(--bg3)", color:code.trim()?"#fff":"var(--t4)", fontWeight:700, fontSize:".875rem", cursor:code.trim()?"pointer":"not-allowed", fontFamily:"var(--ff-b)", flexShrink:0, transition:"all var(--d1) var(--ease)" }}>
          {loading ? "…" : "Apply"}
        </button>
      </div>
      {err && <p style={{ fontSize:".75rem", color:"var(--err)", marginTop:"4px", display:"flex", alignItems:"center", gap:"4px" }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>{err}</p>}
      {ok  && <p style={{ fontSize:".75rem", color:"var(--ok)",  marginTop:"4px", display:"flex", alignItems:"center", gap:"4px" }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>{ok}</p>}
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────── */
const Ic = {
  Back:    () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round"/></svg>,
  Trash:   () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinejoin="round"/></svg>,
  DineIn:  () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 9h18M9 9V3m6 6V3M3 9v12a2 2 0 002 2h14a2 2 0 002-2V9"/></svg>,
  Pickup:  () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  People:  () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  Check:   () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>,
  Chevron: (up) => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d={up?"M18 15l-6-6-6 6":"M6 9l6 6 6-6"} strokeLinecap="round"/></svg>,
  Alert:   () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>,
  Tag:     () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>,
};

/* ─── Cart Item Row ──────────────────────────────────────────────────── */
function CartItemRow({ item }) {
  const updateQty  = useCartStore(s => s.updateQuantity);
  const removeItem = useCartStore(s => s.removeItem);
  const rowRef     = useRef(null);

  const handleRemove = () => {
    if (rowRef.current && typeof gsap !== "undefined") {
      gsap.to(rowRef.current, { x:24, opacity:0, height:0, paddingTop:0, paddingBottom:0, marginBottom:0, overflow:"hidden", duration:.32, ease:"power2.in", onComplete:() => removeItem(item._key) });
    } else {
      removeItem(item._key);
    }
  };

  return (
    <div ref={rowRef}
      style={{ display:"flex", gap:"var(--s3)", padding:"var(--s4)", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", marginBottom:"var(--s2)", alignItems:"flex-start", transition:"box-shadow var(--d1) var(--ease)" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow="var(--sh-sm)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>

      {/* Thumbnail */}
      <div style={{ width:"64px", height:"64px", borderRadius:"var(--r3)", flexShrink:0, overflow:"hidden", background:item.imageUrl?"var(--bg3)":"linear-gradient(135deg,#1A0800,#2D1200)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {item.imageUrl
          ? <img loading="lazy" src={item.imageUrl} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          : <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"><path d="M24 6C13 6 7 15 7 24s6 18 17 18c5 0 9-2 11-5 4-2 6-5 6-8 0-8-8-14-17-14v-9z" strokeLinejoin="round"/></svg>
        }
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:".9375rem", fontWeight:700, color:"var(--t1)", marginBottom:"2px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{item.name}</div>
        {/* Unit / serving size */}
        {(item.unit_quantity || item.measurement_unit) && (
          <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:".75rem", color:"var(--t3)", marginBottom:"2px" }}>
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
            {formatUnit(item.unit_quantity, item.measurement_unit)}
            {item.prep_time_display && <><span style={{ margin:"0 3px", color:"var(--bd2)" }}>·</span>{item.prep_time_display}</>}
          </div>
        )}
        {item.customisations?.length > 0 && (
          <div style={{ fontSize:".75rem", color:"var(--t2)", marginBottom:"3px" }}>{item.customisations.map(c => c.name).join(", ")}</div>
        )}
        {item.specialInstructions && (
          <div style={{ fontSize:".75rem", color:"var(--t2)", fontStyle:"italic", marginBottom:"5px" }}>"{item.specialInstructions}"</div>
        )}

        {/* Price + qty row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {/* Qty stepper */}
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s1)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"3px" }}>
            <button onClick={() => updateQty(item._key, item.quantity - 1)}
              style={{ width:"28px", height:"28px", borderRadius:"var(--r2)", background:item.quantity>1?"var(--bg3)":"transparent", border:"none", fontSize:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:item.quantity>1?"var(--t1)":"var(--t4)", fontWeight:700 }}>−</button>
            <span style={{ fontSize:".9375rem", fontWeight:800, minWidth:"22px", textAlign:"center", fontFamily:"var(--ff-d)" }}>{item.quantity}</span>
            <button
              onClick={() => { if(item.stock_remaining!=null&&item.quantity>=item.stock_remaining) return; updateQty(item._key, item.quantity + 1); }}
              disabled={item.stock_remaining!=null&&item.quantity>=item.stock_remaining}
              title={item.stock_remaining!=null&&item.quantity>=item.stock_remaining?`Only ${item.stock_remaining} in stock`:"Add more"}
              style={{ width:"28px", height:"28px", borderRadius:"var(--r2)", background:item.stock_remaining!=null&&item.quantity>=item.stock_remaining?"var(--bg3)":"var(--brand)", border:"none", fontSize:"15px", cursor:item.stock_remaining!=null&&item.quantity>=item.stock_remaining?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:item.stock_remaining!=null&&item.quantity>=item.stock_remaining?"var(--t4)":"#fff", fontWeight:700 }}>+</button>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
            <div style={{ textAlign:"right" }}>
              <span className="price" style={{ fontSize:"1rem" }}>{formatPrice(item.lineTotal)}</span>
              {/* Show original price struck through if discounted */}
              {item.originalPrice && item.originalPrice !== item.price && item.quantity > 0 && (
                <div style={{ fontSize:".75rem", color:"var(--t2)", textDecoration:"line-through", lineHeight:1 }}>
                  {formatPrice(item.originalPrice * item.quantity)}
                </div>
              )}
            </div>
            <button onClick={handleRemove}
              style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t2)", padding:"5px", display:"flex", alignItems:"center", borderRadius:"var(--r2)", transition:"color var(--d1) var(--ease), background var(--d1) var(--ease)" }}
              onMouseEnter={e => { e.currentTarget.style.color="var(--err)"; e.currentTarget.style.background="var(--err-t)"; }}
              onMouseLeave={e => { e.currentTarget.style.color="var(--t4)"; e.currentTarget.style.background="none"; }}>
              <Ic.Trash/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Order type selector ────────────────────────────────────────────── */
function OrderTypeSelector({ orderType, setOrderType, branch }) {
  const types = [
    { val:"dine_in", label:"Dine-in",  icon:<Ic.DineIn/>,  desc:"Eat at the restaurant" },
    { val:"pickup",  label:"Pickup",   icon:<Ic.Pickup/>,  desc:"Take your order to go"  },
  ].filter(t =>
    t.val === "dine_in" ? (branch?.enable_dine_in !== false) : (branch?.enable_pickup !== false)
  );

  // Auto-select if only one option available
  useEffect(() => {
    if (types.length === 1 && orderType !== types[0].val) {
      setOrderType(types[0].val);
    }
  }, [branch]);

  if (types.length === 0) return (
    <div style={{ padding:"var(--s4)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--r3)", color:"var(--err)", fontSize:".875rem", fontWeight:600 }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg> This branch is not currently accepting orders.
    </div>
  );

  if (types.length === 1) return (
    <div style={{ padding:"var(--s3) var(--s4)", background:"var(--brand-tint)", border:"1px solid rgba(232,82,26,.2)", borderRadius:"var(--r3)", fontSize:".875rem", fontWeight:700, color:"var(--brand)", display:"flex", alignItems:"center", gap:"var(--s2)" }}>
      {types[0].icon} {types[0].label} only — {types[0].desc}
    </div>
  );
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s2)" }}>
      {types.map(t => (
        <button key={t.val} onClick={() => setOrderType(t.val)}
          style={{ padding:"var(--s3) var(--s4)", borderRadius:"var(--r4)", border:`2px solid ${orderType===t.val?"var(--brand)":"var(--bd)"}`, background:orderType===t.val?"var(--brand-tint)":"var(--bg2)", cursor:"pointer", textAlign:"left", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)", position:"relative" }}>
          {orderType === t.val && (
            <div style={{ position:"absolute", top:"8px", right:"10px", color:"var(--brand)" }}><Ic.Check/></div>
          )}
          <div style={{ color:orderType===t.val?"var(--brand)":"var(--t3)", marginBottom:"var(--s1)" }}>{t.icon}</div>
          <div style={{ fontWeight:700, fontSize:".9375rem", color:orderType===t.val?"var(--brand)":"var(--t1)", marginBottom:"2px" }}>{t.label}</div>
          <div style={{ fontSize:".75rem", color:"var(--t2)" }}>{t.desc}</div>
        </button>
      ))}
    </div>
  );
}

/* ─── Seating type icons (SVG) ──────────────────────────────────────── */
const SEAT_ICON = {
  indoor:  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="10" width="18" height="8" rx="2"/><path d="M7 10V6a5 5 0 0110 0v4"/><line x1="12" y1="18" x2="12" y2="22"/></svg>,
  outdoor: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 17l9-9 9 9"/><path d="M12 8V3"/></svg>,
  window:  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>,
  counter: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="12" x2="22" y2="12"/><path d="M6 12V8h12v4"/></svg>,
  private: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6M12 9v6"/></svg>,
  family:  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  booth:   <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="8" width="4" height="13" rx="1"/><rect x="18" y="8" width="4" height="13" rx="1"/><rect x="6" y="15" width="12" height="6" rx="1"/></svg>,
};

/* ─── Named table picker ─────────────────────────────────────────────── */
function BranchTablePicker({ tableNumber, setTableNumber }) {
  const [tables,  setTables]  = useState([]);
  const [loading, setLoading] = useState(true);
  const bid = localStorage.getItem("branch_id");

  useEffect(() => {
    if (!bid) { setLoading(false); return; }
    axiosClient.get(`/branches/${bid}/tables/`)
      .then(r => setTables(r.data.tables || []))
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }, [bid]);

  if (loading) return (
    <div style={{ marginTop:"var(--s4)", display:"flex", gap:8 }}>
      {[1,2,3].map(i => <div key={i} className="skel" style={{ width:90, height:72, borderRadius:"var(--r3)" }}/>)}
    </div>
  );

  if (tables.length === 0) return (
    <div style={{ marginTop:"var(--s4)", padding:"var(--s3) var(--s4)", background:"rgba(239,159,39,.07)", border:"1px solid rgba(239,159,39,.25)", borderRadius:"var(--r3)", fontSize:".8125rem", color:"var(--warn)" }}>
      No tables configured yet — BranchAdmin has not set up table details. Please ask staff to seat you.
    </div>
  );

  return (
    <div style={{ marginTop:"var(--s4)" }}>
      <div style={{ fontSize:".8125rem", fontWeight:700, color:"var(--t2)", marginBottom:"var(--s3)" }}>
        Select your seat
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:"var(--s2)" }}>
        {tables.map(t => {
          const selected   = String(tableNumber) === String(t.table_number);
          const available  = t.is_available;
          return (
            <button
              key={t.id}
              type="button"
              disabled={!available}
              onClick={() => available && setTableNumber(String(t.table_number))}
              style={{
                padding:"var(--s3)",
                borderRadius:"var(--r3)",
                border:`2px solid ${selected?"var(--brand)":available?"var(--bd)":"rgba(226,75,74,.25)"}`,
                background: selected?"var(--brand-tint)":available?"var(--bg2)":"rgba(226,75,74,.04)",
                cursor: available ? "pointer" : "not-allowed",
                textAlign:"center",
                transition:"all var(--d1) var(--ease)",
                opacity: available ? 1 : 0.65,
                position:"relative",
              }}>
              {/* Occupied dot */}
              {!available && (
                <div style={{ position:"absolute", top:6, right:6, width:7, height:7, borderRadius:"50%", background:"var(--err)" }}/>
              )}
              {/* Seating type icon */}
              <div style={{ color: selected?"var(--brand)":available?"var(--t3)":"var(--err)", marginBottom:4, display:"flex", justifyContent:"center" }}>
                {SEAT_ICON[t.seating_type] || SEAT_ICON.indoor}
              </div>
              {/* Label */}
              <div style={{ fontWeight:700, fontSize:".75rem", color: selected?"var(--brand)":available?"var(--t1)":"var(--err)", lineHeight:1.3, marginBottom:2 }}>
                {t.label}
              </div>
              {/* Capacity + status */}
              <div style={{ fontSize:".6rem", color:"var(--t4)", letterSpacing:".04em" }}>
                {t.capacity} seats · {available ? "Free" : "Occupied"}
              </div>
            </button>
          );
        })}
      </div>
      {tableNumber && (
        <p style={{ fontSize:".75rem", color:"var(--ok)", marginTop:"var(--s2)", display:"flex", alignItems:"center", gap:4 }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
          {tables.find(t => String(t.table_number) === String(tableNumber))?.label || `Table ${tableNumber}`} selected
        </p>
      )}
    </div>
  );
}

/* ─── Bill split ─────────────────────────────────────────────────────── */
function BillSplit({ total }) {
  const [people, setPeople] = useState(2);
  const [names,  setNames]  = useState(["You", "Person 2"]);
  const per = Math.ceil((total / people) * 100) / 100;
  const avatarColors = ["var(--brand)","var(--ok)","var(--info)","var(--warn)","var(--gold)"];

  return (
    <div style={{ background:"linear-gradient(135deg,rgba(55,138,221,.07),rgba(55,138,221,.03))", border:"1px solid rgba(55,138,221,.2)", borderRadius:"var(--r4)", padding:"var(--s4)", marginTop:"var(--s3)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s4)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", color:"var(--info)" }}>
          <Ic.People/><span style={{ fontWeight:700 }}>Split bill</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
          <span style={{ fontSize:".8125rem", color:"var(--t2)" }}>People</span>
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s1)", background:"var(--bgc)", borderRadius:"var(--r2)", border:"1px solid var(--bd)", padding:"2px" }}>
            <button onClick={() => { if (people>2) { setPeople(p=>p-1); setNames(n=>n.slice(0,-1)); } }}
              style={{ width:"26px", height:"26px", borderRadius:"var(--r1)", border:"none", background:"transparent", cursor:people>2?"pointer":"default", fontSize:"15px", fontWeight:700, color:people>2?"var(--t1)":"var(--t4)", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
            <span style={{ fontWeight:800, minWidth:"20px", textAlign:"center", fontFamily:"var(--ff-d)" }}>{people}</span>
            <button onClick={() => { if (people<8) { setPeople(p=>p+1); setNames(n=>[...n,`Person ${people+1}`]); } }}
              style={{ width:"26px", height:"26px", borderRadius:"var(--r1)", border:"none", background:people<8?"var(--info)":"transparent", cursor:people<8?"pointer":"default", fontSize:"15px", fontWeight:700, color:people<8?"#fff":"var(--t4)", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
          </div>
        </div>
      </div>

      <div style={{ textAlign:"center", padding:"var(--s3)", background:"var(--bgc)", borderRadius:"var(--r3)", marginBottom:"var(--s3)", border:"1px solid var(--bd)" }}>
        <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t2)", marginBottom:"4px" }}>Each person pays</div>
        <div style={{ fontFamily:"var(--ff-d)", fontSize:"2rem", fontWeight:900, color:"var(--info)", lineHeight:1 }}>{formatPrice(per)}</div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
        {names.map((name, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:`${avatarColors[i%avatarColors.length]}18`, border:`1.5px solid ${avatarColors[i%avatarColors.length]}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".6875rem", fontWeight:800, color:avatarColors[i%avatarColors.length], flexShrink:0 }}>
              {name[0].toUpperCase()}
            </div>
            <input value={name} onChange={e => setNames(n => n.map((v,j) => j===i?e.target.value:v))}
              style={{ flex:1, border:"none", background:"transparent", color:"var(--t2)", fontSize:".875rem", outline:"none", fontFamily:"var(--ff-b)" }}/>
            <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:".9375rem", color:"var(--t1)", flexShrink:0 }}>{formatPrice(per)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty cart ─────────────────────────────────────────────────────── */
function EmptyCart({ navigate }) {
  return (
    <AppLayout>
      <div style={{ textAlign:"center", padding:"var(--s16) var(--s4)", maxWidth:"360px", margin:"0 auto" }}>
        {/* Animated cart illustration */}
        <div style={{ width:"120px", height:"120px", borderRadius:"50%", background:"var(--bg2)", border:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s6)" }}>
          <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="var(--t2)" strokeWidth="1.2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
        <h1 style={{ fontFamily:"var(--ff-d)",color:"var(--t1)", fontSize:"1.75rem", fontWeight:900, letterSpacing:"-.02em", marginBottom:"var(--s3)" }}>Your cart is empty</h1>
        <p style={{ fontSize:".9375rem", color:"var(--t2)", lineHeight:1.65, marginBottom:"var(--s6)" }}>
          Add some delicious items from our menu to get started.
        </p>
        <button onClick={() => navigate("/menu")} className="btn btn-p btn-lg btn-full">
          Browse menu →
        </button>
        <div style={{ marginTop:"var(--s4)" }}>
          <Link to="/offers" style={{ fontSize:".875rem", color:"var(--brand)", fontWeight:600 }}>
            View today's offers →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────── */
export default function CartPage() {
  usePageProtection();   // block copy/screenshot/print on checkout page

  const navigate       = useNavigate();
  const { loading: pageLoading } = usePageLoader(700);

  const items            = useCartStore(s => s.items);
  const orderType        = useCartStore(s => s.orderType);
  const tableNumber      = useCartStore(s => s.tableNumber);
  const offerId          = useCartStore(s => s.offerId);
  const paymentMethod    = useCartStore(s => s.paymentMethod);   // now from persisted store
  const setOrderType     = useCartStore(s => s.setOrderType);
  const setTableNumber   = useCartStore(s => s.setTableNumber);
  const setOffer         = useCartStore(s => s.setOffer);
  const setPaymentMethod = useCartStore(s => s.setPaymentMethod);
  const clearCart        = useCartStore(s => s.clearCart);
  const buildPayload     = useCartStore(s => s.buildOrderPayload);
  const spinDiscountPct  = useCartStore(s => s.spinDiscountPct);
  const setSpinDiscount  = useCartStore(s => s.setSpinDiscount);

  const [offerDetail,     setOfferDetail]     = useState(null);
  const [branchData,      setBranchData]      = useState(null);
  const [qrBlobUrl,       setQrBlobUrl]       = useState(null);
  const [shopOpen,        setShopOpen]        = useState(true);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [showBillSplit,   setShowBillSplit]   = useState(false);
  // paymentMethod is now in cartStore (persisted) — no longer local state
  const [showQr,          setShowQr]          = useState(false);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loyaltyPts,      setLoyaltyPts]      = useState(0);
  const [loyaltyLoading,  setLoyaltyLoading]  = useState(false);
  // discountType: null | "offer" | "coupon" | "loyalty"
  // Only ONE discount can be active at a time
  const [discountType,    setDiscountType]    = useState(null);
  const [siteConfig,      setSiteConfig]      = useState(null); // loaded from /branches/config/
  const { user }   = useAuth();
  const { hasBranch, branchName: currentBranchName, selectBranch } = useBranch();
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const userPoints = user?.loyalty_points || 0;

  // Load SiteConfig for loyalty rate/enabled
  useEffect(() => {
    axiosClient.get("/branches/config/")
      .then(r => setSiteConfig(r.data.config))
      .catch(() => {});
  }, []);

  // Check if shop is currently open + load payment info + branch details in parallel
  useEffect(() => {
    const bid = localStorage.getItem("branch_id");
    if (!bid) return;
    Promise.all([
      axiosClient.get(`/branches/${bid}/hours/`).catch(() => null),
      axiosClient.get(`/branches/${bid}/payment-info/`).catch(() => null),
      axiosClient.get(`/branches/${bid}/`).catch(() => null),          // full branch (includes max_tables)
    ]).then(([hoursRes, payRes, branchRes]) => {
      const hoursData   = hoursRes?.data?.success   ? hoursRes.data        : {};
      const payData     = payRes?.data?.success     ? payRes.data          : {};
      const branchDetail= branchRes?.data?.branch   || branchRes?.data     || {};
      setShopOpen(hoursData.is_open_now ?? true);
      setBranchData({ ...hoursData, ...payData, max_tables: branchDetail.max_tables || 0 });
      if (hoursData.pickup_upi_only || payData.pickup_upi_only) setPaymentMethod("upi");  // auto-force UPI
    });
  }, []);

  // Load offer detail when an offer is applied
  useEffect(() => {
    if (!offerId) { setOfferDetail(null); return; }
    getOfferDetail(offerId)
      .then(r => setOfferDetail(r.data.offer))
      .catch(() => setOfferDetail(null));
  }, [offerId]);

  // ── Computed totals — declared BEFORE the QR useEffect that depends on grandTotal ──
  const subtotal         = items.reduce((sum, i) => sum + i.lineTotal, 0);          // discounted item total
  const originalSubtotal = items.reduce((sum, i) => sum + i.originalPrice * i.quantity, 0); // MRP total
  const itemSavings      = Math.max(0, originalSubtotal - subtotal);                // item-level discount
  const itemCount        = items.reduce((sum, i) => sum + i.quantity, 0);

  // If user already claimed a one-time offer (user_can_redeem=false), treat discount as 0
  const offerCanRedeem = !offerDetail || offerDetail.user_can_redeem !== false;
  const offerDiscount = (offerDetail && offerCanRedeem)
    ? offerDetail.discount_percentage
      ? subtotal * (Number(offerDetail.discount_percentage) / 100)
      : offerDetail.discount_flat
      ? Number(offerDetail.discount_flat)
      : offerDetail.welcome_bonus_amount
      ? Number(offerDetail.welcome_bonus_amount)
      : 0
    : 0;
  const spinDiscount = spinDiscountPct > 0 && !offerDetail
    ? Math.round(subtotal * (spinDiscountPct / 100) * 100) / 100
    : 0;
  const grandTotal = Math.max(0, subtotal - offerDiscount - loyaltyDiscount - spinDiscount);  // subtotal is already item-discounted

  // Fetch a fresh signed QR URL (amount-specific) then load QR image as blob
  useEffect(() => {
    if (!showQr) return;
    const bid = localStorage.getItem("branch_id");
    if (!bid) return;
    let objectUrl = null;
    let cancelled = false;

    axiosClient.get(`/branches/${bid}/payment-info/?am=${grandTotal.toFixed(2)}`)
      .then(r => {
        if (cancelled) return;
        const signedUrl = r.data?.payment_qr_url;
        if (!signedUrl) return;
        const token = localStorage.getItem("access_token");
        return fetch(`${signedUrl}&tn=KNFC+Order`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then(r => (r && r.ok ? r.blob() : null))
      .then(blob => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setQrBlobUrl(objectUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setQrBlobUrl(null);
    };
  }, [showQr, grandTotal]);

  const handleRedeemLoyalty = async () => {
    if (loyaltyDiscount > 0) { setLoyaltyDiscount(0); setLoyaltyPts(0); return; }
    const pts = Math.floor(userPoints / 100) * 100; // round down to multiple of 100
    if (pts < 100) return;
    setLoyaltyLoading(true);
    try {
      const r = await redeemLoyaltyPoints(pts);
      setLoyaltyDiscount(Number(r.data.discount_amount));
      setLoyaltyPts(pts);
    } catch (e) {
      setError(e.response?.data?.error || "Could not apply points.");
    } finally { setLoyaltyLoading(false); }
  };

  const handlePlace = async () => {
    if (!hasBranch) { setShowBranchPicker(true); return; }
    setError(""); setLoading(true);
    try {
      const res = await placeOrder(buildPayload(loyaltyPts));   // paymentMethod now inside payload from store
      const order = res.data.order;
      localStorage.setItem("active_order", JSON.stringify({ ...order, _uid: user?.id }));
      clearCart();
      // Always use the ORDER's payment_method from the API — never trust local/stale state
      if (order.payment_method === "upi") {
        navigate(`/order/awaiting-payment/${order.id}`, { replace: true });
      } else {
        navigate(`/order/confirm/${order.id}`, { replace: true });
      }
    } catch (e) {
      const d = e.response?.data;
      // Backend returns {errors: {non_field_errors:[...]} or {field:[...]}} or {error:"..."}
      let msg = d?.error;
      if (!msg && d?.errors) {
        const errs = d.errors;
        const flat = errs.non_field_errors || errs.items || Object.values(errs).flat();
        msg = Array.isArray(flat) ? flat[0] : (typeof flat === "string" ? flat : null);
      }
      setError(msg || "Could not place order. Please try again.");
    } finally { setLoading(false); }
  };

  if (pageLoading) return <KNCLoader visible label="Loading cart…"/>;
  if (!items.length) return <EmptyCart navigate={navigate}/>;
  // No branch selected at checkout — force picker
  if (!hasBranch) return (
    <AppLayout>
      <BranchSelector onSelected={b => selectBranch(b)} allowDismiss={false} />
    </AppLayout>
  );

  return (
    <AppLayout>
      {showBranchPicker && (
        <BranchSelector
          onSelected={b => { selectBranch(b); setShowBranchPicker(false); }}
          allowDismiss={true}
          onDismiss={() => setShowBranchPicker(false)}
        />
      )}
      {loading && <KNCLoader visible label="Placing your order…"/>}

      {/* Page heading */}
      <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s6)" }}>
        <button onClick={() => navigate(-1)} className="btn btn-g btn-ico"><Ic.Back/></button>
        <div>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.625rem", fontWeight:900, letterSpacing:"-.02em", lineHeight:1 }}>Your order</h1>
          <p style={{ fontSize:".8125rem", color:"var(--t2)", marginTop:"2px" }}>{itemCount} item{itemCount!==1?"s":""} · {formatPrice(originalSubtotal)}</p>
        </div>
        <button onClick={() => { if (window.confirm("Clear all items from cart?")) clearCart(); }}
          style={{ marginLeft:"auto", fontSize:".8125rem", color:"var(--err)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontWeight:600 }}>
          Clear all
        </button>
      </div>

      {/* Two-column layout */}
      <div className="cart-layout">

        {/* ── LEFT: order type + items + options ───────────────────── */}
        <div>
          {/* ── Order type — Pickup or Dine-In (MUST be selected first) ── */}
          <div style={{ marginBottom:"var(--s5)", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden" }}>
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"var(--bg2)", display:"flex", alignItems:"center", gap:8 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:800, letterSpacing:"-.01em" }}>How would you like your order?</div>
            </div>
            <div style={{ padding:"var(--s4) var(--s5)" }}>
              <OrderTypeSelector orderType={orderType} setOrderType={setOrderType} branch={branchData}/>

              {/* Table picker — loads named tables from BranchAdmin config */}
              {orderType === "dine_in" && (
                <BranchTablePicker
                  tableNumber={tableNumber}
                  setTableNumber={setTableNumber}
                />
              )}
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom:"var(--s5)" }}>
            {items.map(item => <CartItemRow key={item._key} item={item}/>)}
            <Link to="/menu" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", padding:"var(--s3)", border:"1.5px dashed var(--bd)", borderRadius:"var(--r4)", color:"var(--brand)", fontWeight:600, fontSize:".875rem", textDecoration:"none", transition:"all var(--d1) var(--ease)" }}
              onMouseEnter={e => { e.currentTarget.style.background="var(--brand-tint)"; e.currentTarget.style.borderColor="var(--brand)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="var(--bd)"; }}>
              + Add more items
            </Link>
          </div>

        </div>

        {/* ── RIGHT: summary + place order ─────────────────────────── */}
        <div style={{ position:"sticky", top:`calc(var(--nav-h) + var(--s4))` }}>
          <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden" }}>
            {/* Summary header + branch chip */}
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"var(--bg2)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s3)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, letterSpacing:"-.015em" }}>Order summary</div>
                <span style={{ fontSize:".8125rem", color:"var(--t3)" }}>{itemCount} item{itemCount!==1?"s":""}</span>
              </div>
              {hasBranch && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r3)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:".5625rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--t4)", lineHeight:1 }}>Ordering from</div>
                      <div style={{ fontWeight:700, fontSize:".8125rem", color:"var(--t1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {currentBranchName || branchData?.branch_name || "Your branch"}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowBranchPicker(true)}
                    style={{ padding:"4px 10px", borderRadius:"var(--r2)", border:"1px solid var(--brand)", background:"transparent", color:"var(--brand)", fontFamily:"var(--ff-b)", fontSize:".75rem", fontWeight:700, cursor:"pointer", flexShrink:0 }}>
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Line items */}
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
              {items.map(item => (
                <div key={item._key} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", fontSize:".875rem" }}>
                  <div>
                    <span style={{ color:"var(--t1)", fontWeight:500 }}>{item.name}</span>
                    <span style={{ color:"var(--t2)", marginLeft:"5px", fontSize:".8125rem" }}>×{item.quantity}</span>
                  </div>
                  <span style={{ fontWeight:700, flexShrink:0 }}>{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ padding:"var(--s4) var(--s5)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:".875rem", marginBottom:"var(--s2)" }}>
                <span style={{ color:"var(--t2)" }}>Subtotal</span>
                <span style={{ fontWeight:600 }}>{formatPrice(originalSubtotal)}</span>
              </div>

              {/* Item-level savings — already baked into lineTotal, shown as a visible discount row */}
              {itemSavings > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:".8125rem", marginBottom:"var(--s2)", color:"var(--ok)" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Item discounts
                  </span>
                  <span style={{ fontWeight:700 }}>−{formatPrice(itemSavings)}</span>
                </div>
              )}

              {/* ── Offers & Coupons ── */}
              {offerDetail ? (
                !offerCanRedeem ? (
                  /* Already-claimed offer — show warning, offer auto-removed from total */
                  <div style={{ padding:"12px 14px", background:"var(--err-t)", border:"1.5px solid rgba(226,75,74,.3)", borderRadius:"var(--r3)", marginBottom:"var(--s2)" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:"var(--s2)" }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:".8125rem", fontWeight:800, color:"var(--err)", marginBottom:3 }}>
                          {offerDetail.offer_type === "welcome"
                            ? "Welcome Bonus already claimed"
                            : "Offer already used"}
                        </div>
                        <div style={{ fontSize:".75rem", color:"var(--t2)", lineHeight:1.5 }}>
                          {offerDetail.offer_type === "welcome"
                            ? "The Welcome Bonus is a one-time offer — one use per customer account. This discount cannot be applied again."
                            : `You have already used "${offerDetail.name}" the maximum allowed number of times.`}
                        </div>
                      </div>
                      <button onClick={() => { setOffer(null); setDiscountType(null); }}
                        style={{ background:"none", border:"none", cursor:"pointer", color:"var(--err)", fontSize:"18px", lineHeight:1, padding:"0 2px", flexShrink:0 }}
                        title="Remove">×</button>
                    </div>
                  </div>
                ) : (
                  /* Valid applied offer */
                  <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"10px 12px", background:"rgba(29,158,117,.07)", border:"1.5px solid rgba(29,158,117,.3)", borderRadius:"var(--r3)", marginBottom:"var(--s2)" }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:".8125rem", fontWeight:700, color:"var(--ok)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{offerDetail.name}</div>
                      {offerDiscount > 0 && <div style={{ fontSize:".75rem", color:"var(--t2)" }}>You save {formatPrice(offerDiscount)}</div>}
                    </div>
                    <button onClick={() => { setOffer(null); setDiscountType(null); setLoyaltyDiscount(0); setLoyaltyPts(0); }}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t4)", fontSize:"20px", lineHeight:1, padding:"0 2px", fontWeight:300 }} title="Remove">×</button>
                  </div>
                )
              ) : (
                <div style={{ border:"1px solid var(--bd)", borderRadius:"var(--r3)", overflow:"hidden", marginBottom:"var(--s2)" }}>
                  {/* Browse offers row */}
                  <button onClick={() => navigate("/offers")}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"10px 12px", border:"none", borderBottom:"1px solid var(--bd)", background:"transparent", cursor:"pointer", fontFamily:"var(--ff-b)", textAlign:"left" }}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>
                    <span style={{ fontSize:".875rem", fontWeight:600, color:"var(--brand)" }}>Browse offers</span>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ marginLeft:"auto" }}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round"/></svg>
                  </button>
                  {/* Coupon code row */}
                  <div style={{ padding:"8px 12px", background:"transparent" }}>
                    <CouponInput onApply={(id) => {
                      setOffer(id); setDiscountType("coupon");
                      setSpinDiscount(0);
                      setLoyaltyDiscount(0); setLoyaltyPts(0);
                    }}/>
                  </div>
                </div>
              )}
              {offerDiscount > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:".875rem", marginBottom:"var(--s2)" }}>
                  <span style={{ color:"var(--ok)", fontWeight:600 }}>Offer discount</span>
                  <span style={{ color:"var(--ok)", fontWeight:700 }}>−{formatPrice(offerDiscount)}</span>
                </div>
              )}

              {/* Loyalty points redemption */}
              {siteConfig?.loyalty_enabled !== false && userPoints >= (siteConfig?.loyalty_min_redeem || 100) && !offerDetail && (
                loyaltyDiscount > 0 ? (
                  <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"var(--s2) var(--s3)", background:"linear-gradient(135deg,rgba(245,166,35,.1),rgba(245,166,35,.04))", border:"1px solid rgba(245,166,35,.3)", borderRadius:"var(--r3)", marginBottom:"var(--s2)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:".8125rem", fontWeight:700, color:"var(--gold-d)" }}>{loyaltyPts} pts applied</div>
                      <div style={{ fontSize:".75rem", color:"var(--t2)" }}>−{formatPrice(loyaltyDiscount)} loyalty discount</div>
                    </div>
                    <button onClick={handleRedeemLoyalty}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t2)", fontSize:"16px", lineHeight:1, padding:"2px", transition:"color var(--d1) var(--ease)" }}
                      onMouseEnter={e=>e.currentTarget.style.color="var(--err)"}
                      onMouseLeave={e=>e.currentTarget.style.color="var(--t4)"}
                      title="Remove points">×</button>
                  </div>
                ) : (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:".875rem", marginBottom:"var(--s2)" }}>
                    <span style={{ color:"var(--t2)", display:"flex", alignItems:"center", gap:"4px" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)" style={{flexShrink:0}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <span>{userPoints} pts available</span>
                    </span>
                    <button onClick={handleRedeemLoyalty} disabled={loyaltyLoading}
                      style={{ fontSize:".8125rem", color:"var(--gold-d)", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", opacity:loyaltyLoading?.6:1 }}>
                      {loyaltyLoading ? "…" : `Use ${Math.floor(userPoints/100)*100} pts`}
                    </button>
                  </div>
                )
              )}
              {loyaltyDiscount > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:".875rem", marginBottom:"var(--s2)" }}>
                  <span style={{ color:"var(--gold-d)", fontWeight:600 }}>Loyalty discount</span>
                  <span style={{ color:"var(--gold-d)", fontWeight:700 }}>−{formatPrice(loyaltyDiscount)}</span>
                </div>
              )}

              {/* Spin-wheel discount chip — hidden when a coupon/offer is active */}
              {spinDiscountPct > 0 && offerDetail && (
                <div style={{ fontSize:".75rem", color:"var(--t3)", padding:"var(--s2) var(--s3)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", marginBottom:"var(--s2)", display:"flex", alignItems:"center", gap:6 }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
                  Spin Wheel discount paused — remove the offer above to use it
                </div>
              )}
              {spinDiscount > 0 && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"var(--s2) var(--s3)", background:"linear-gradient(135deg,rgba(232,82,26,.09),rgba(232,82,26,.03))", border:"1px solid rgba(232,82,26,.25)", borderRadius:"var(--r3)", marginBottom:"var(--s2)" }}>
                    <span style={{ fontSize:"1.1rem", lineHeight:1 }}>🎡</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:".8125rem", fontWeight:700, color:"var(--brand)" }}>
                        Spin Wheel — {spinDiscountPct}% OFF
                      </div>
                      <div style={{ fontSize:".75rem", color:"var(--t2)" }}>
                        −{formatPrice(spinDiscount)} bonus saving
                      </div>
                    </div>
                    <button onClick={() => setSpinDiscount(0)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t2)", fontSize:"18px", lineHeight:1, padding:"2px", transition:"color var(--d1) var(--ease)" }}
                      onMouseEnter={e=>e.currentTarget.style.color="var(--err)"}
                      onMouseLeave={e=>e.currentTarget.style.color="var(--t2)"}
                      title="Remove spin discount">×</button>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:".875rem", marginBottom:"var(--s2)" }}>
                    <span style={{ color:"var(--brand)", fontWeight:600 }}>Spin discount</span>
                    <span style={{ color:"var(--brand)", fontWeight:700 }}>−{formatPrice(spinDiscount)}</span>
                  </div>
                </>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", fontSize:".875rem", marginBottom:"var(--s4)" }}>
                <span style={{ color:"var(--t2)" }}>Taxes & fees</span>
                <span style={{ color:"var(--ok)", fontWeight:600 }}>Included</span>
              </div>
              <div style={{ height:"1px", background:"var(--bd)", marginBottom:"var(--s4)" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"var(--s4)" }}>
                <span style={{ fontSize:"1.0625rem", fontWeight:800 }}>Total</span>
                <div style={{ textAlign:"right" }}>
                  <span className="price" style={{ fontSize:"1.75rem", letterSpacing:"-.02em" }}>{formatPrice(grandTotal)}</span>
                  {(itemSavings + offerDiscount + spinDiscount) > 0 && <div style={{ fontSize:".75rem", color:"var(--ok)", fontWeight:600 }}>You save {formatPrice(itemSavings + offerDiscount + spinDiscount)}</div>}
                </div>
              </div>

              {/* Payment method selector */}
              <div style={{ marginBottom:"var(--s4)" }}>
                <p style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t2)", marginBottom:"var(--s3)" }}>
                  Payment method
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                  {[
                    !branchData?.pickup_upi_only && {
                      value:"cash", label:"Cash", sub:"Pay at counter", accent:"#16a34a", accentBg:"rgba(22,163,74,.07)",
                      icon:(
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>
                        </svg>
                      ),
                    },
                    {
                      value:"upi", label:"UPI / QR Scan", sub:"GPay · PhonePe · Any UPI app", accent:"#5f259f", accentBg:"rgba(95,37,159,.07)",
                      icon:(
                        <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                          <rect width="40" height="40" rx="8" fill="#5f259f"/>
                          <text x="20" y="27" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="900" fontFamily="Arial">UPI</text>
                        </svg>
                      ),
                    },
                  ].filter(Boolean).map(opt => {
                    const sel = paymentMethod === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => setPaymentMethod(opt.value)}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:"var(--r3)", border:`2px solid ${sel?opt.accent:"var(--bd)"}`, background:sel?opt.accentBg:"var(--bg2)", cursor:"pointer", fontFamily:"var(--ff-b)", textAlign:"left", transition:"all var(--d1) var(--ease)", width:"100%" }}>
                        <div style={{ width:44, height:44, borderRadius:"var(--r2)", background:sel?opt.accent+"20":"var(--bg3)", border:`1.5px solid ${sel?opt.accent:"var(--bd)"}`, display:"flex", alignItems:"center", justifyContent:"center", color:sel?opt.accent:"var(--t2)", flexShrink:0 }}>
                          {opt.icon}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:".9375rem", color:sel?opt.accent:"var(--t1)", lineHeight:1.2 }}>{opt.label}</div>
                          <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:2 }}>{opt.sub}</div>
                        </div>
                        <div style={{ width:20, height:20, borderRadius:"50%", background:sel?opt.accent:"transparent", border:`2px solid ${sel?opt.accent:"var(--bd)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all var(--d1) var(--ease)" }}>
                          {sel && <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Shop closed banner */}
              {!shopOpen && (
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"var(--s3) var(--s4)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--r3)", marginBottom:"var(--s3)", fontSize:".875rem", color:"var(--err)", fontWeight:600 }}>
                  <Ic.Alert/> Shop is currently closed — orders not accepted right now
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"var(--s3)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--r3)", marginBottom:"var(--s3)", fontSize:".8125rem", color:"var(--err)" }}>
                  <Ic.Alert/>{error}
                </div>
              )}

              {/* UPI info — shown after selecting UPI payment */}
              {paymentMethod === "upi" && (() => {
                const amt   = grandTotal.toFixed(2);
                const bName = encodeURIComponent(branchData?.branch_name || "KNFC Fried Chicken");
                const note  = encodeURIComponent("KNFC Order");
                const gpayUpi      = branchData?.gpay_upi_id      || branchData?.upi_id || "";
                const phonepeUpi   = branchData?.phonepe_upi_id   || branchData?.upi_id || "";
                const mainUpi      = branchData?.upi_id || "";
                const gpayLink     = gpayUpi    ? `tez://upi/pay?pa=${encodeURIComponent(gpayUpi)}&pn=${bName}&am=${amt}&cu=INR&tn=${note}` : null;
                const phonepeLink  = phonepeUpi ? `phonepe://pay?pa=${encodeURIComponent(phonepeUpi)}&pn=${bName}&am=${amt}&cu=INR&tn=${note}` : null;
                const upiLink      = mainUpi    ? `upi://pay?pa=${encodeURIComponent(mainUpi)}&pn=${bName}&am=${amt}&cu=INR&tn=${note}` : null;
                return (
                  <div style={{ marginBottom:"var(--s3)", border:"1px solid rgba(124,58,237,.2)", borderRadius:"var(--r4)", overflow:"hidden" }}>
                    {/* Header */}
                    <div style={{ padding:"10px 14px", background:"rgba(124,58,237,.06)", borderBottom:"1px solid rgba(124,58,237,.12)", fontSize:".8125rem", fontWeight:700, color:"#7c3aed", display:"flex", alignItems:"center", gap:6 }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/></svg>
                      Pay ₹{amt} via UPI after placing order
                    </div>

                    {/* App redirect buttons */}
                    <div style={{ padding:"10px 14px", display:"flex", gap:8, flexWrap:"wrap" }}>
                      {gpayLink && (
                        <a href={gpayLink} style={{ flex:"1 1 120px", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"11px 0", borderRadius:"var(--r3)", background:"#fff", border:"2px solid #1a73e8", color:"#1a73e8", fontWeight:800, fontSize:".9375rem", textDecoration:"none", fontFamily:"var(--ff-b)", boxShadow:"0 2px 8px rgba(26,115,232,.15)", transition:"box-shadow .15s" }}
                          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(26,115,232,.3)"}
                          onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(26,115,232,.15)"}>
                          {/* Google G logo */}
                          <svg width="20" height="20" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                          </svg>
                          GPay
                        </a>
                      )}
                      {phonepeLink && (
                        <a href={phonepeLink} style={{ flex:"1 1 120px", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"11px 0", borderRadius:"var(--r3)", background:"#fff", border:"2px solid #5f259f", color:"#5f259f", fontWeight:800, fontSize:".9375rem", textDecoration:"none", fontFamily:"var(--ff-b)", boxShadow:"0 2px 8px rgba(95,37,159,.15)", transition:"box-shadow .15s" }}
                          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(95,37,159,.3)"}
                          onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(95,37,159,.15)"}>
                          {/* PhonePe P logo */}
                          <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                            <rect width="48" height="48" rx="12" fill="#5f259f"/>
                            <path d="M13 13h15a9 9 0 010 18H19v8h-6V13zm6 12h9a3 3 0 000-6h-9v6z" fill="#fff"/>
                          </svg>
                          PhonePe
                        </a>
                      )}
                    </div>

                    {/* QR on demand */}
                    {branchData?.payment_qr_url && (
                      <div style={{ borderTop:"1px solid rgba(124,58,237,.12)" }}>
                        <button type="button" onClick={() => setShowQr(v => !v)}
                          style={{ width:"100%", display:"flex", alignItems:"center", gap:6, padding:"9px 14px", border:"none", background:"transparent", cursor:"pointer", color:"#7c3aed", fontSize:".8125rem", fontWeight:600, fontFamily:"var(--ff-b)" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="5" y="5" width="2" height="2" fill="currentColor"/><rect x="17" y="5" width="2" height="2" fill="currentColor"/><rect x="5" y="17" width="2" height="2" fill="currentColor"/></svg>
                          {showQr ? "Hide QR Code" : "Show QR Code (scan at counter)"}
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ marginLeft:"auto", transform:showQr?"rotate(180deg)":"none", transition:"transform var(--d1) var(--ease)" }}><path d="M6 9l6 6 6-6" strokeLinecap="round"/></svg>
                        </button>
                        {showQr && (
                          <div style={{ padding:"12px 14px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:8, background:"#fafafa", borderTop:"1px solid rgba(124,58,237,.1)" }}>
                            {qrBlobUrl ? (
                              <img src={qrBlobUrl} alt="Pay QR" style={{ width:176, height:176, borderRadius:8, border:"1.5px solid rgba(124,58,237,.3)", imageRendering:"pixelated", background:"#fff", padding:6 }}/>
                            ) : (
                              <div style={{ width:176, height:176, borderRadius:8, background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa", fontSize:13 }}>Loading…</div>
                            )}
                            <div style={{ fontSize:12, fontWeight:700, color:"#7c3aed" }}>₹{amt} · Scan at counter</div>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ padding:"8px 14px", fontSize:".75rem", color:"var(--t4)", borderTop:"1px solid var(--bd)", textAlign:"center" }}>
                      Pay at counter after placing your order
                    </div>
                  </div>
                );
              })()}

              {/* Place order */}
              <button onClick={handlePlace} disabled={loading || !shopOpen}
                style={{ width:"100%", padding:"15px 28px", borderRadius:"var(--r4)", border:"none", cursor:(loading||!shopOpen)?"not-allowed":"pointer", fontFamily:"var(--ff-b)", fontSize:"1rem", fontWeight:800, background:(loading||!shopOpen)?"var(--bg3)":"var(--brand)", color:(loading||!shopOpen)?"var(--t3)":"#fff", boxShadow:(loading||!shopOpen)?"none":"var(--sh-br)", transition:"all var(--d1) var(--ease)", display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)" }}>
                {loading
                  ? <><span className="spin" style={{ display:"inline-block" }}>⟳</span> Placing order…</>
                  : !shopOpen
                  ? "Shop is closed"
                  : paymentMethod === "upi"
                  ? <>Place order · {formatPrice(grandTotal)} · Scan QR to pay →</>
                  : <>Place order · {formatPrice(grandTotal)} →</>
                }
              </button>

              <p style={{ fontSize:".75rem", color:"var(--t2)", textAlign:"center", marginTop:"var(--s3)", lineHeight:1.5 }}>
                {paymentMethod === "upi"
                  ? "Place order → staff shows payment QR → scan with any UPI app → staff confirms."
                  : "Payment collected at the counter after your order is ready."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
