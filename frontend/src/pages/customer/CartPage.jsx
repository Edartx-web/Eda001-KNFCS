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
import { formatPrice } from "../../utils/format";
import useCartStore from "../../store/cartStore";
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
    try {
      const r = await axiosClient.post("/offers/coupon/", { code: c });
      if (r.data.success) {
        setOk(r.data.message || "Coupon applied!");
        onApply(r.data.offer_id);
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
        <div style={{ fontSize:".9375rem", fontWeight:700, color:"var(--t1)", marginBottom:"3px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{item.name}</div>
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
  const navigate       = useNavigate();
  const { loading: pageLoading } = usePageLoader(700);

  const items          = useCartStore(s => s.items);
  const orderType      = useCartStore(s => s.orderType);
  const tableNumber    = useCartStore(s => s.tableNumber);
  const offerId        = useCartStore(s => s.offerId);
  const setOrderType   = useCartStore(s => s.setOrderType);
  const setTableNumber = useCartStore(s => s.setTableNumber);
  const setOffer       = useCartStore(s => s.setOffer);
  const clearCart       = useCartStore(s => s.clearCart);
  const buildPayload    = useCartStore(s => s.buildOrderPayload);
  const spinDiscountPct = useCartStore(s => s.spinDiscountPct);
  const setSpinDiscount = useCartStore(s => s.setSpinDiscount);

  const [offerDetail,     setOfferDetail]     = useState(null);
  const [branchData,      setBranchData]      = useState(null);
  const [shopOpen,        setShopOpen]        = useState(true);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [showBillSplit,   setShowBillSplit]   = useState(false);
  const [paymentMethod,   setPaymentMethod]   = useState("cash");
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loyaltyPts,      setLoyaltyPts]      = useState(0);
  const [loyaltyLoading,  setLoyaltyLoading]  = useState(false);
  // discountType: null | "offer" | "coupon" | "loyalty"
  // Only ONE discount can be active at a time
  const [discountType,    setDiscountType]    = useState(null);
  const [siteConfig,      setSiteConfig]      = useState(null); // loaded from /branches/config/
  const userPoints = useAuth().user?.loyalty_points || 0;

  // Load SiteConfig for loyalty rate/enabled
  useEffect(() => {
    axiosClient.get("/branches/config/")
      .then(r => setSiteConfig(r.data.config))
      .catch(() => {});
  }, []);

  // Check if shop is currently open — uses axiosClient so auth token is sent automatically
  useEffect(() => {
    const bid = localStorage.getItem("branch_id");
    if (!bid) return;
    axiosClient.get(`/branches/${bid}/hours/`)
      .then(r => {
        if (r.data.success) {
          setShopOpen(r.data.is_open_now ?? true);
          setBranchData(r.data);
          if (r.data.pickup_upi_only) setPaymentMethod("upi");
        }
      })
      .catch(() => setShopOpen(true)); // fail open — don't block orders on network error
  }, []);

  // Load offer detail when an offer is applied
  useEffect(() => {
    if (!offerId) { setOfferDetail(null); return; }
    getOfferDetail(offerId)
      .then(r => setOfferDetail(r.data.offer))
      .catch(() => setOfferDetail(null));
  }, [offerId]);

  const subtotal       = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount      = items.reduce((sum, i) => sum + i.quantity, 0);

  // Calculate offer discount
  const offerDiscount = offerDetail
    ? offerDetail.discount_percentage
      ? subtotal * (Number(offerDetail.discount_percentage) / 100)
      : offerDetail.discount_flat
      ? Number(offerDetail.discount_flat)
      : 0
    : 0;
  const spinDiscount = spinDiscountPct > 0
    ? Math.round(subtotal * (spinDiscountPct / 100) * 100) / 100
    : 0;
  const grandTotal = Math.max(0, subtotal - offerDiscount - loyaltyDiscount - spinDiscount);

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
    // Pickup + UPI: show UPI panel first — payment is confirmed by staff
    // Order is placed with payment_status=pending, staff marks it paid → confirmed
    setError(""); setLoading(true);
    try {
      const res = await placeOrder(buildPayload(loyaltyPts, paymentMethod));
      const order = res.data.order;
      localStorage.setItem("active_order", JSON.stringify(order));
      clearCart();
      navigate(`/order/confirm/${order.id}`);
    } catch (e) {
      setError(e.response?.data?.error || "Could not place order. Please try again.");
    } finally { setLoading(false); }
  };

  if (pageLoading) return <KNCLoader visible label="Loading cart…"/>;
  if (!items.length) return <EmptyCart navigate={navigate}/>;

  return (
    <AppLayout>
      {loading && <KNCLoader visible label="Placing your order…"/>}

      {/* Page heading */}
      <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s6)" }}>
        <button onClick={() => navigate(-1)} className="btn btn-g btn-ico"><Ic.Back/></button>
        <div>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.625rem", fontWeight:900, letterSpacing:"-.02em", lineHeight:1 }}>Your order</h1>
          <p style={{ fontSize:".8125rem", color:"var(--t2)", marginTop:"2px" }}>{itemCount} item{itemCount!==1?"s":""} · {formatPrice(subtotal)}</p>
        </div>
        <button onClick={() => { if (window.confirm("Clear all items from cart?")) clearCart(); }}
          style={{ marginLeft:"auto", fontSize:".8125rem", color:"var(--err)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontWeight:600 }}>
          Clear all
        </button>
      </div>

      {/* Two-column layout */}
      <div className="cart-layout">

        {/* ── LEFT: items + options ─────────────────────────────────── */}
        <div>
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
            {/* Summary header */}
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"var(--bg2)" }}>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, letterSpacing:"-.015em" }}>Order summary</div>
              <div style={{ fontSize:".8125rem", color:"var(--t2)", marginTop:"2px" }}>{itemCount} item{itemCount!==1?"s":""}</div>
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
                <span style={{ fontWeight:600 }}>{formatPrice(subtotal)}</span>
              </div>

              {/* Item-level savings — shown when any item has a discount */}
              {(() => {
                const itemSavings = items.reduce((sum, i) => {
                  if (!i.originalPrice || i.originalPrice <= i.price) return sum;
                  return sum + (i.originalPrice - i.price) * i.quantity;
                }, 0);
                return itemSavings > 0 ? (
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:".8125rem", marginBottom:"var(--s2)", color:"var(--ok)" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      Item discounts
                    </span>
                    <span style={{ fontWeight:700 }}>−{formatPrice(itemSavings)}</span>
                  </div>
                ) : null;
              })()}

              {/* ── Discount: Offer/Coupon chip OR input (one at a time) ── */}
              {offerDetail ? (
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"var(--s2) var(--s3)", background:"linear-gradient(135deg,rgba(29,158,117,.08),rgba(29,158,117,.03))", border:"1px solid rgba(29,158,117,.22)", borderRadius:"var(--r3)", marginBottom:"var(--s2)" }}>
                  <span style={{ color:"var(--ok)" }}><Ic.Tag/></span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:".8125rem", fontWeight:700, color:"var(--ok)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {discountType==="coupon" ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{display:"inline",marginRight:"4px"}}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg> : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{display:"inline",marginRight:"4px"}}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>}{offerDetail.name}
                    </div>
                    {offerDiscount > 0 && <div style={{ fontSize:".75rem", color:"var(--t2)" }}>−{formatPrice(offerDiscount)} saved</div>}
                  </div>
                  <button onClick={() => { setOffer(null); setDiscountType(null); setLoyaltyDiscount(0); setLoyaltyPts(0); }}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t2)", fontSize:"18px", lineHeight:1, padding:"2px" }} title="Remove">×</button>
                </div>
              ) : (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s2)", marginBottom:"var(--s2)" }}>
                    <button onClick={() => navigate("/offers")}
                      style={{ padding:"9px", borderRadius:"var(--r3)", border:"1.5px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontSize:".8125rem", fontWeight:700, cursor:"pointer", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", justifyContent:"center", gap:"5px" }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg> Browse offers
                    </button>
                    <button onClick={() => document.getElementById("coupon-input-field")?.focus()}
                      style={{ padding:"9px", borderRadius:"var(--r3)", border:"1.5px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontSize:".8125rem", fontWeight:700, cursor:"pointer", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", justifyContent:"center", gap:"5px" }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg> Enter code
                    </button>
                  </div>
                  <CouponInput onApply={(id) => { setOffer(id); setDiscountType("coupon"); setLoyaltyDiscount(0); setLoyaltyPts(0); }}/>
                </>
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

              {/* Spin-wheel discount chip */}
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
                  {(offerDiscount + spinDiscount) > 0 && <div style={{ fontSize:".75rem", color:"var(--ok)", fontWeight:600 }}>You save {formatPrice(offerDiscount + spinDiscount)}</div>}
                </div>
              </div>

              {/* Payment method selector */}
              <div style={{ marginBottom:"var(--s4)" }}>
                <p style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t2)", marginBottom:"var(--s3)" }}>
                  Payment method
                </p>
                <div style={{ display:"grid", gridTemplateColumns:branchData?.pickup_upi_only ? "1fr" : "1fr 1fr", gap:"var(--s3)" }}>
                  {[
                    {
                      value: "cash",
                      accent: "#16a34a",
                      accentBg: "rgba(22,163,74,.09)",
                      accentRing: "rgba(22,163,74,.18)",
                      label: "Cash",
                      sub: "Pay at counter",
                      icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 466" shape-rendering="geometricPrecision"
                            text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd"
                            clip-rule="evenodd" viewBox="0 0 512 265.788">
                            <path fill="#427D2A" d="M0 0h512v265.789H0z" />
                            <path fill="#87CC71"
                                d="M427.35 41.011c-.271 19.77 17.153 37.654 37.661 37.9v105.161c-21.602-.271-39.482 17.153-39.728 40.706H84.65c.271-21.603-17.157-39.487-37.662-39.733V79.884c21.685.246 39.58-17.167 39.826-38.873H427.35z" />
                            <path fill="#427D2A"
                                d="M184.56 94.866c21.004-39.459 70.01-54.415 109.468-33.412 39.458 21 54.415 70.01 33.411 109.469-21 39.457-70.009 54.414-109.467 33.411-39.459-21.004-54.415-70.01-33.412-109.468z" />
                            <path fill="#FEFEFE"
                                d="M227.768 87.669h56.52c.484 0 .881.406.881.905l-.001 8.613a.895.895 0 01-.881.903h-17.652c2.783 3.237 4.771 7.137 5.673 11.422h11.98c.484 0 .88.404.88.903v8.614c0 .497-.396.905-.88.905h-11.98c-1.081 5.131-3.724 9.715-7.421 13.263-4.843 4.647-11.51 7.529-18.838 7.529v.03h-.815l31.703 36.151c.857.978-.644 3.153-1.317 3.156l-14.657.083-33.844-38.593a1.18 1.18 0 01-.23-1.142v-14.134h19.16v.028c3.445 0 6.568-1.346 8.829-3.512a11.857 11.857 0 002.197-2.859h-29.307c-.484 0-.879-.408-.879-.905v-8.614c0-.499.396-.903.879-.903l29.307-.001a11.781 11.781 0 00-2.197-2.858c-2.261-2.169-5.384-3.514-8.829-3.514v.027l-19.16.001V88.574c0-.499.395-.905.878-.905h.001z" />
                        </svg>
                      ),
                    },
                    {
                      value: "upi",
                      accent: "#7c3aed",
                      accentBg: "rgba(124,58,237,.09)",
                      accentRing: "rgba(124,58,237,.18)",
                      label: "UPI",
                      sub: "GPay · PhonePe · Paytm",
                      icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 466" id="upi">
                          <path fill="#3d3d3c" d="M98.1 340.7h6.3l-5.9 24.5c-.9 3.6-.7 6.4.5 8.2 1.2 1.8 3.4 2.7 6.7 2.7 3.2 0 5.9-.9 8-2.7 2.1-1.8 3.5-4.6 4.4-8.2l5.9-24.5h6.4l-6 25.1c-1.3 5.4-3.6 9.5-7 12.2-3.3 2.7-7.7 4.1-13.1 4.1-5.4 0-9.1-1.3-11.1-4s-2.4-6.8-1.1-12.2l6-25.2zm31.4 40.3 10-41.9 19 24.6c.5.7 1 1.4 1.5 2.2.5.8 1 1.7 1.6 2.7l6.7-27.9h5.9l-10 41.8-19.4-25.1-1.5-2.1c-.5-.8-.9-1.5-1.2-2.4l-6.7 28h-5.9zm44.2 0 9.6-40.3h6.4l-9.6 40.3h-6.4zm15.5 0 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10H217l-1.4 5.7h-15.5l-4.5 18.9h-6.4zm29 0 9.6-40.3h6.4l-9.6 40.3h-6.4zm15.5 0 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7h-15.5l-3.1 13H257l-1.4 5.9h-21.9zm29.3 0 9.6-40.3h8.6c5.6 0 9.5.3 11.6.9 2.1.6 3.9 1.5 5.3 2.9 1.8 1.8 3 4.1 3.5 6.8.5 2.8.3 6-.5 9.5-.9 3.6-2.2 6.7-4 9.5-1.8 2.8-4.1 5-6.8 6.8-2 1.4-4.2 2.3-6.6 2.9-2.3.6-5.8.9-10.4.9H263zm7.8-6h5.4c2.9 0 5.2-.2 6.8-.6 1.6-.4 3-1.1 4.3-2 1.8-1.3 3.3-2.9 4.5-4.9 1.2-1.9 2.1-4.2 2.7-6.8.6-2.6.8-4.8.5-6.7-.3-1.9-1-3.6-2.2-4.9-.9-1-2-1.6-3.5-2-1.5-.4-3.8-.6-7.1-.6h-4.6l-6.8 28.5zm59.7-12.1-4.3 18.1h-6l9.6-40.3h9.7c2.9 0 4.9.2 6.2.5 1.3.3 2.3.8 3.1 1.6 1 .9 1.7 2.2 2 3.8.3 1.6.2 3.3-.2 5.2-.5 1.9-1.2 3.7-2.3 5.3-1.1 1.6-2.4 2.9-3.8 3.8-1.2.7-2.5 1.3-3.9 1.6-1.4.3-3.6.5-6.4.5h-3.7zm1.7-5.4h1.6c3.5 0 6-.4 7.4-1.2 1.4-.8 2.3-2.2 2.8-4.2.5-2.1.2-3.7-.8-4.5-1.1-.9-3.3-1.3-6.6-1.3H335l-2.8 11.2zm40.1 23.5-2-10.4h-15.6l-7 10.4H341l29-41.9 9 41.9h-6.7zm-13.8-15.9h10.9l-1.8-9.2c-.1-.6-.2-1.3-.2-2-.1-.8-.1-1.6-.1-2.5-.4.9-.8 1.7-1.3 2.5-.4.8-.8 1.5-1.2 2.1l-6.3 9.1zm29.7 15.9 4.4-18.4-8-21.8h6.7l5 13.7c.1.4.2.8.4 1.4.2.6.3 1.2.5 1.8l1.2-1.8c.4-.6.8-1.1 1.2-1.6l11.7-13.5h6.4L399 362.5l-4.4 18.4h-6.4zm60.9-19.9c0-.3.1-1.2.3-2.6.1-1.2.2-2.1.3-2.9-.4.9-.8 1.8-1.3 2.8-.5.9-1.1 1.9-1.8 2.8l-15.4 21.5-5-21.9c-.2-.9-.4-1.8-.5-2.6-.1-.8-.2-1.7-.2-2.5-.2.8-.5 1.7-.8 2.7-.3.9-.7 1.9-1.2 2.9l-9 19.8h-5.9l19.3-42 5.5 25.4c.1.4.2 1.1.3 2 .1.9.3 2.1.5 3.5.7-1.2 1.6-2.6 2.8-4.4.3-.5.6-.8.7-1.1l17.4-25.4-.6 42h-5.9l.5-20zm10.6 19.9 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7h-15.5l-3.1 13H483l-1.4 5.9h-21.9zm29.2 0 10-41.9 19 24.6c.5.7 1 1.4 1.5 2.2.5.8 1 1.7 1.6 2.7l6.7-27.9h5.9l-10 41.8-19.4-25.1-1.5-2.1c-.5-.8-.9-1.5-1.2-2.4l-6.7 28h-5.9zm65.1-34.8-8.3 34.7h-6.4l8.3-34.7h-10.4l1.3-5.6h27.2l-1.3 5.6H554zm6.7 26.7 5.7-2.4c.1 1.8.6 3.2 1.7 4.1 1.1.9 2.6 1.4 4.6 1.4 1.9 0 3.5-.5 4.9-1.6 1.4-1.1 2.3-2.5 2.7-4.3.6-2.4-.8-4.5-4.2-6.3-.5-.3-.8-.5-1.1-.6-3.8-2.2-6.2-4.1-7.2-5.9-1-1.8-1.2-3.9-.6-6.4.8-3.3 2.5-5.9 5.2-8 2.7-2 5.7-3.1 9.3-3.1 2.9 0 5.2.6 6.9 1.7 1.7 1.1 2.6 2.8 2.9 4.9l-5.6 2.6c-.5-1.3-1.1-2.2-1.9-2.8-.8-.6-1.8-.9-3-.9-1.7 0-3.2.5-4.4 1.4-1.2.9-2 2.1-2.4 3.7-.6 2.4 1.1 4.7 5 6.8.3.2.5.3.7.4 3.4 1.8 5.7 3.6 6.7 5.4 1 1.8 1.2 3.9.6 6.6-.9 3.8-2.8 6.8-5.7 9.1-2.9 2.2-6.3 3.4-10.3 3.4-3.3 0-5.9-.8-7.7-2.4-2-1.6-2.9-3.9-2.8-6.8zm47.1 8.1 9.6-40.3h6.4l-9.6 40.3h-6.4zm15.6 0 10-41.9 19 24.6c.5.7 1 1.4 1.5 2.2.5.8 1 1.7 1.6 2.7l6.7-27.9h5.9l-10 41.8-19.4-25.1-1.5-2.1c-.5-.8-.9-1.5-1.2-2.4l-6.7 28h-5.9zm65.1-34.8-8.3 34.7h-6.4l8.3-34.7h-10.4l1.3-5.6h27.2l-1.3 5.6h-10.4zm6.9 34.8 9.6-40.3h22l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7h-15.5l-3.1 13h15.5l-1.4 5.9h-22zm39.5-18.1-4.3 18h-6l9.6-40.3h8.9c2.6 0 4.6.2 5.9.5 1.4.3 2.5.9 3.3 1.7 1 1 1.6 2.2 1.9 3.8.3 1.5.2 3.2-.2 5.1-.8 3.2-2.1 5.8-4.1 7.6-2 1.8-4.5 2.9-7.5 3.3l9.1 18.3h-7.2l-8.7-18h-.7zm1.6-5.1h1.2c3.4 0 5.7-.4 7-1.2 1.3-.8 2.2-2.2 2.7-4.3.5-2.2.3-3.8-.7-4.7-1-.9-3.1-1.4-6.3-1.4h-1.2l-2.7 11.6zm18.9 23.2 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10h15.5l-1.4 5.7h-15.5l-4.5 18.9h-6.4zm52.8 0-2-10.4h-15.6l-7 10.4h-6.7l29-41.9 9 41.9h-6.7zm-13.9-15.9h10.9l-1.8-9.2c-.1-.6-.2-1.3-.2-2-.1-.8-.1-1.6-.1-2.5-.4.9-.8 1.7-1.3 2.5-.4.8-.8 1.5-1.2 2.1l-6.3 9.1zm62.2-14.6c-1.4-1.6-3.1-2.8-4.9-3.5-1.8-.8-3.8-1.2-6.1-1.2-4.3 0-8.1 1.4-11.5 4.2-3.4 2.8-5.6 6.5-6.7 11-1 4.3-.6 7.9 1.4 10.8 1.9 2.8 4.9 4.2 8.9 4.2 2.3 0 4.6-.4 6.9-1.3 2.3-.8 4.6-2.1 7-3.8l-1.8 7.4c-2 1.3-4.1 2.2-6.3 2.8-2.2.6-4.4.9-6.8.9-3 0-5.7-.5-8-1.5s-4.2-2.5-5.7-4.5c-1.5-1.9-2.4-4.2-2.8-6.8-.4-2.6-.3-5.4.5-8.4.7-3 1.9-5.7 3.5-8.3 1.6-2.6 3.7-4.9 6.1-6.8 2.4-2 5-3.5 7.8-4.5s5.6-1.5 8.5-1.5c2.3 0 4.4.3 6.4 1 1.9.7 3.7 1.7 5.3 3.1l-1.7 6.7zm.6 30.5 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7H868l-3.1 13h15.5L879 381h-21.9z"></path>
                          <path fill="#70706e" d="M740.7 305.6h-43.9l61-220.3h43.9l-61 220.3zM717.9 92.2c-3-4.2-7.7-6.3-14.1-6.3H462.6l-11.9 43.2h219.4l-12.8 46.1H481.8v-.1h-43.9l-36.4 131.5h43.9l24.4-88.2h197.3c6.2 0 12-2.1 17.4-6.3 5.4-4.2 9-9.4 10.7-15.6l24.4-88.2c1.9-6.6 1.3-11.9-1.7-16.1zm-342 199.6c-2.4 8.7-10.4 14.8-19.4 14.8H130.2c-6.2 0-10.8-2.1-13.8-6.3-3-4.2-3.7-9.4-1.9-15.6l55.2-198.8h43.9l-49.3 177.6h175.6l49.3-177.6h43.9l-57.2 205.9z"></path>
                          <path fill="#098041" d="M877.5 85.7 933 196.1 816.3 306.5z"></path>
                          <path fill="#e97626" d="M838.5 85.7 894 196.1 777.2 306.5z"></path>
                        </svg>

                      ),
                    },
                  ].filter(opt => !branchData?.pickup_upi_only || opt.value === "upi").map(opt => {
                    const sel = paymentMethod === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => setPaymentMethod(opt.value)}
                        style={{ position:"relative", padding:"var(--s4) var(--s3)", borderRadius:"var(--r4)", border:`2.5px solid ${sel ? opt.accent : "var(--bd)"}`, background:sel ? opt.accentBg : "var(--bg2)", cursor:"pointer", textAlign:"center", transition:"all var(--d2) var(--ease)", display:"flex", flexDirection:"column", alignItems:"center", gap:"var(--s2)", boxShadow:sel?`0 0 0 4px ${opt.accentRing}`:"none", outline:"none" }}>

                        {/* Radio indicator */}
                        <div style={{ position:"absolute", top:10, right:10, width:18, height:18, borderRadius:"50%", background:sel?opt.accent:"transparent", border:`2px solid ${sel?opt.accent:"var(--bd)"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all var(--d1) var(--ease)", flexShrink:0 }}>
                          {sel && <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>}
                        </div>

                        {/* Icon badge */}
                        <div style={{ width:56, height:56, borderRadius:"var(--r3)", background:sel?opt.accentBg:"var(--bg3)", border:`1.5px solid ${sel?opt.accent+"55":"var(--bd)"}`, display:"flex", alignItems:"center", justifyContent:"center", color:sel?opt.accent:"var(--t2)", transition:"all var(--d1) var(--ease)", flexShrink:0 }}>
                          {opt.icon}
                        </div>

                        {/* Label */}
                        <div style={{ fontWeight:800, fontSize:"1rem", color:sel?opt.accent:"var(--t1)", fontFamily:"var(--ff-b)", letterSpacing:"-.01em", lineHeight:1, transition:"color var(--d1) var(--ease)" }}>
                          {opt.label}
                        </div>

                        {/* Sub */}
                        <div style={{ fontSize:".6875rem", color:sel?"var(--t2)":"var(--t3)", lineHeight:1.4, fontWeight:500 }}>
                          {opt.sub}
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

              {/* Pickup + UPI: awaiting payment confirmation notice */}
              {orderType === "pickup" && paymentMethod === "upi" && (
                <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(239,159,39,.07)", border:"1px solid rgba(239,159,39,.25)", borderRadius:"var(--r3)", marginBottom:"var(--s3)", fontSize:".8125rem" }}>
                  <div style={{ fontWeight:700, color:"var(--warn)", marginBottom:"4px", display:"flex", alignItems:"center", gap:"6px" }}><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--warn)" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg> Awaiting UPI payment confirmation</div>
                  <div style={{ color:"var(--t2)", lineHeight:1.5 }}>
                    Your order is placed first. Show your UPI receipt to staff — they will confirm it and start preparing your food.
                  </div>
                </div>
              )}

              {/* Place order */}
              <button onClick={handlePlace} disabled={loading || !shopOpen}
                style={{ width:"100%", padding:"15px 28px", borderRadius:"var(--r4)", border:"none", cursor:(loading||!shopOpen)?"not-allowed":"pointer", fontFamily:"var(--ff-b)", fontSize:"1rem", fontWeight:800, background:(loading||!shopOpen)?"var(--bg3)":"var(--brand)", color:(loading||!shopOpen)?"var(--t3)":"#fff", boxShadow:(loading||!shopOpen)?"none":"var(--sh-br)", transition:"all var(--d1) var(--ease)", display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)" }}>
                {loading
                  ? <><span className="spin" style={{ display:"inline-block" }}>⟳</span> Placing order…</>
                  : !shopOpen
                  ? "Shop is closed"
                  : paymentMethod === "upi"
                  ? <>Place order · {formatPrice(grandTotal)} · Pay via UPI →</>
                  : <>Place order · {formatPrice(grandTotal)} →</>
                }
              </button>

              <p style={{ fontSize:".75rem", color:"var(--t2)", textAlign:"center", marginTop:"var(--s3)", lineHeight:1.5 }}>
                {orderType === "pickup" && paymentMethod === "upi"
                  ? "Order placed → show UPI QR to staff → staff confirms → kitchen starts cooking."
                  : paymentMethod === "upi"
                  ? "UPI payment link will appear after placing your order."
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
