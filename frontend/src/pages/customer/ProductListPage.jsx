/**
 * ProductListPage.jsx — Phase 4
 * Inspired by: Swiggy category page
 * - Full-bleed cinematic hero with parallax feel
 * - Sticky filter/search bar that locks at top on scroll
 * - Diet filter pills (All · Veg · Non-veg)
 * - Sort dropdown
 * - Grid / List view toggle
 * - Premium product cards with spring add-to-cart
 * - Fully responsive 2→3→4→5 col
 */

import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import useSEO from "../../hooks/useSEO";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { gsap } from "gsap";
import AppLayout from "../../components/layout/AppLayout";
import { getCategoryDetail, getCategories, getItems } from "../../api/menu";
import { formatPrice, formatUnit } from "../../utils/format";
import { SORT_OPTIONS, DIETARY_DOT } from "../../utils/constants";
import useCartStore from "../../store/cartStore";

/* ─── Icon set ───────────────────────────────────────────────────────── */
const Ic = {
  Back:   () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round"/></svg>,
  Search: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>,
  Filter: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h18M7 8h10M11 12h2" strokeLinecap="round"/></svg>,
  Grid:   () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  List:   () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/></svg>,
  Star:   () => <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Clock:  () => <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>,
  Cart:   () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  Arrow:  () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round"/></svg>,
  Check:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>,
  Fire:   () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>,
};

/* ─── Food illustration fallback ───────────────────────────────────── */
function FoodFallback({ slug = "", size = 52 }) {
  const s = (slug || "").toLowerCase();
  const d = s.includes("drink") || s.includes("juice") || s.includes("cola")
    ? <><path d="M12 8h24l-4 28H16L12 8z" strokeLinejoin="round"/><path d="M10 4h28l-2 4H12L10 4z" strokeLinejoin="round"/><path d="M18 22c2-2 4-2 6 0s4 2 6 0" strokeLinecap="round"/></>
    : s.includes("burg") || s.includes("sand") || s.includes("wrap")
    ? <><path d="M8 18C8 13 12 8 24 8s16 5 16 10" strokeLinecap="round"/><rect x="6" y="18" width="36" height="5" rx="2"/><rect x="6" y="25" width="36" height="5" rx="2" opacity=".6"/><path d="M6 32h36c0 4-4 7-16 7S6 36 6 32z" strokeLinejoin="round"/></>
    : s.includes("fry") || s.includes("side")
    ? <><rect x="12" y="22" width="24" height="18" rx="3" strokeLinejoin="round"/><path d="M16 22V12M20 22V8M24 22V10M28 22V8M32 22V12" strokeLinecap="round"/></>
    : <><path d="M24 6C13 6 7 15 7 24s6 18 17 18c5 0 9-2 11-5 4-2 6-5 6-8 0-8-8-14-17-14v-9z" strokeLinejoin="round"/><path d="M24 16c5 0 9 4 9 8" strokeLinecap="round"/><circle cx="20" cy="26" r="3" fill="rgba(255,255,255,.2)" stroke="none"/></>;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.5">
      {d}
    </svg>
  );
}

/* ─── Skeleton loader ────────────────────────────────────────────────── */
const shimmer = {
  background: "linear-gradient(90deg, var(--bg2) 25%, var(--bg3) 50%, var(--bg2) 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
};
function SkeletonCard() {
  return (
    <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
      <div style={{ aspectRatio:"4/3", ...shimmer }} />
      <div style={{ padding:"var(--s3)", display:"flex", flexDirection:"column", gap:"8px" }}>
        <div style={{ height:"14px", borderRadius:"6px", width:"75%", ...shimmer }} />
        <div style={{ height:"11px", borderRadius:"6px", width:"45%", ...shimmer }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"4px" }}>
          <div style={{ height:"16px", borderRadius:"6px", width:"36%", ...shimmer }} />
          <div style={{ width:"34px", height:"34px", borderRadius:"var(--r3)", ...shimmer }} />
        </div>
      </div>
    </div>
  );
}
function ProductListSkeleton() {
  return (
    <AppLayout>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {/* Hero skeleton */}
      <div style={{ height:"clamp(160px,28vw,280px)", borderRadius:"var(--r5)", marginBottom:"var(--s5)", ...shimmer }} />
      {/* Filter bar skeleton */}
      <div style={{ display:"flex", gap:"var(--s2)", marginBottom:"var(--s5)" }}>
        {[80,60,70,90].map((w,i) => <div key={i} style={{ height:"36px", width:`${w}px`, borderRadius:"var(--rf)", flexShrink:0, ...shimmer }}/>)}
      </div>
      {/* Grid skeleton */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"var(--s3)" }}>
        {Array.from({length:8}).map((_,i) => <SkeletonCard key={i}/>)}
      </div>
    </AppLayout>
  );
}

/* ─── GRID card ─────────────────────────────────────────────────────── */
const GridCard = memo(function GridCard({ item, navigate }) {
  const addItem   = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const updateQty = useCartStore(s => s.updateQuantity);
  const inCart    = cartItems.find(i => i.id === item.id);
  const btnRef    = useRef(null);
  const [imgErr, setImgErr]  = useState(false);
  const [added,  setAdded]   = useState(false);

  const isOOS   = item.stock_status === "out" || !item.is_available;
  const dietary = DIETARY_DOT[item.dietary_type] || DIETARY_DOT.non_veg;
  const slug    = (item.category_slug || item.slug || "").toLowerCase();
  const price   = item.discounted_price && Number(item.discounted_price) < Number(item.price)
    ? item.discounted_price : (item.offer_price || item.price);
  const hasDisc = price !== item.price;

  const handleAdd = e => {
    e.stopPropagation();
    if (isOOS) return;
    addItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
    if (btnRef.current && typeof gsap !== "undefined") {
      gsap.timeline()
        .to(btnRef.current, { scale:.72, duration:.08 })
        .to(btnRef.current, { scale:1.25, duration:.15, ease:"back.out(3)" })
        .to(btnRef.current, { scale:1, duration:.12 });
    }
  };

  return (
    <article
      onClick={() => !isOOS && navigate(`/menu/product/${item.slug}?b=${localStorage.getItem("branch_id")||""}`)}
      style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden", cursor:isOOS?"default":"pointer", opacity:isOOS?.5:1, display:"flex", flexDirection:"column", position:"relative", transition:"transform var(--d2) var(--ease), box-shadow var(--d2) var(--ease), border-color var(--d2) var(--ease)" }}
      onMouseEnter={e => { if (!isOOS) { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="var(--sh-lg)"; e.currentTarget.style.borderColor="var(--bd2)"; } }}
      onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="var(--bd)"; }}>

      {/* Image */}
      <div style={{ aspectRatio:"4/3", position:"relative", background:item.image_url&&!imgErr?"var(--bg3)":`linear-gradient(135deg,${item.gradient_from||"#1A0800"},${item.gradient_to||"#2D1200"})`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
        {item.image_url && !imgErr
          ? <img loading="lazy" src={item.image_url} alt={item.name} onError={() => setImgErr(true)} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
          : <FoodFallback slug={slug} size={52}/>
        }
        {/* Dietary dot */}
        <div title={dietary.label} style={{ position:"absolute", top:"8px", left:"8px", width:"16px", height:"16px", borderRadius:"3px", background:"#fff", border:`2px solid ${dietary.color}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><div style={{ width:"6px", height:"6px", borderRadius:"50%", background:dietary.color }}/></div>
        {/* Bestseller badge */}
        {(item.is_bestseller || item.is_featured) && (
          <div style={{ position:"absolute", top:"7px", right:"7px", background:"linear-gradient(135deg,#FF6B35,var(--brand))", color:"#fff", fontSize:".5625rem", fontWeight:800, padding:"3px 8px", borderRadius:"var(--rf)", letterSpacing:".06em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:"3px", boxShadow:"0 2px 8px rgba(232,82,26,.5)" }}>
            <Ic.Fire/> Best
          </div>
        )}
        {/* Discount badge */}
        {hasDisc && item.discount && (
          <div style={{ position:"absolute", bottom:"7px", left:"7px", background:"var(--ok)", color:"#fff", fontSize:".5625rem", fontWeight:800, padding:"2px 7px", borderRadius:"var(--rf)", letterSpacing:".04em" }}>
            {item.discount}% OFF
          </div>
        )}
        {/* Unit chip — Blinkit style, bottom-right of image */}
        {!item.stock_status || item.stock_status !== "low" ? (
          formatUnit(item.unit_quantity, item.measurement_unit) ? (
            <div style={{ position:"absolute", bottom:"7px", right:"7px", zIndex:2, background:"rgba(255,255,255,.93)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)", borderRadius:"var(--rf)", padding:"2px 8px", fontSize:".625rem", fontWeight:800, color:"#1a1a1a", lineHeight:1.5, letterSpacing:".02em", pointerEvents:"none" }}>
              {formatUnit(item.unit_quantity, item.measurement_unit)}
            </div>
          ) : null
        ) : (
          /* Hurry badge — low stock only (replaces unit chip) */
          <div style={{ position:"absolute", bottom:"7px", right:"7px", background:"linear-gradient(135deg,#ff4444,#cc0000)", color:"#fff", fontSize:".5625rem", fontWeight:800, padding:"2px 7px", borderRadius:"var(--rf)", letterSpacing:".06em", textTransform:"uppercase", boxShadow:"0 2px 6px rgba(204,0,0,.4)" }}>
            Hurry!
          </div>
        )}
        {/* Out of Stock */}
        {isOOS && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.55)", backdropFilter:"blur(3px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:".75rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.85)" }}>Out of Stock</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding:"var(--s3)", flex:1, display:"flex", flexDirection:"column", gap:"3px" }}>
        <div style={{ fontWeight:700, fontSize:".9rem", color:"var(--t1)", lineHeight:1.35, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {item.name}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"4px", flexWrap:"wrap" }}>
          {item.avg_rating > 0 && (
            <>
              <span style={{ color:"var(--gold)" }}><Ic.Star/></span>
              <span style={{ fontSize:".75rem", color:"var(--t2)", fontWeight:700 }}>{Number(item.avg_rating).toFixed(1)}</span>
              {item.review_count > 0 && <span style={{ fontSize:".6875rem", color:"var(--t4)" }}>({item.review_count})</span>}
              <span style={{ color:"var(--bd2)" }}>·</span>
            </>
          )}
          <span style={{ color:"var(--t4)", display:"flex" }}><Ic.Clock/></span>
          <span style={{ fontSize:".75rem", color:"var(--t3)" }}>{item.prep_time_display || "8–15 min"}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"auto", paddingTop:"var(--s1)" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
              <span className="price" style={{ fontSize:".9375rem" }}>{formatPrice(price)}</span>
              {hasDisc && <span style={{ fontSize:".75rem", color:"var(--t4)", textDecoration:"line-through" }}>{formatPrice(item.price)}</span>}
            </div>
          </div>
          {!isOOS && (
            inCart
              ? <div style={{ display:"flex", alignItems:"center", gap:"3px" }} onClick={e => e.stopPropagation()}>
                  <button onClick={e => { e.stopPropagation(); updateQty(inCart._key, inCart.quantity - 1); }}
                    style={{ width:"28px", height:"28px", borderRadius:"var(--r2)", background:"var(--bg2)", border:"1px solid var(--bd)", fontSize:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>−</button>
                  <span style={{ fontSize:".875rem", fontWeight:800, minWidth:"18px", textAlign:"center" }}>{inCart.quantity}</span>
                  <button ref={btnRef} onClick={e => { e.stopPropagation(); updateQty(inCart._key, inCart.quantity + 1); }}
                    style={{ width:"28px", height:"28px", borderRadius:"var(--r2)", background:"var(--brand)", border:"none", fontSize:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700 }}>+</button>
                </div>
              : <button ref={btnRef} onClick={handleAdd}
                  style={{ width:"34px", height:"34px", borderRadius:"var(--r3)", background:added?"var(--ok)":"var(--brand)", border:"none", color:"#fff", fontSize:"22px", fontWeight:300, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:added?"0 4px 14px rgba(29,158,117,.4)":"0 4px 14px rgba(232,82,26,.38)", transition:"background .25s, box-shadow .25s" }}>
                  {added ? <Ic.Check/> : "+"}
                </button>
          )}
        </div>
      </div>
    </article>
  );
});

/* ─── LIST card ─────────────────────────────────────────────────────── */
const ListCard = memo(function ListCard({ item, navigate }) {
  const addItem   = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const updateQty = useCartStore(s => s.updateQuantity);
  const inCart    = cartItems.find(i => i.id === item.id);
  const [imgErr, setImgErr] = useState(false);

  const isOOS   = item.stock_status === "out" || !item.is_available;
  const dietary = DIETARY_DOT[item.dietary_type] || DIETARY_DOT.non_veg;
  const slug    = (item.category_slug || item.slug || "").toLowerCase();
  const price   = item.discounted_price && Number(item.discounted_price) < Number(item.price)
    ? item.discounted_price : (item.offer_price || item.price);
  const hasDisc = price !== item.price;

  return (
    <article
      onClick={() => !isOOS && navigate(`/menu/product/${item.slug}?b=${localStorage.getItem("branch_id")||""}`)}
      style={{ display:"flex", gap:"0", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden", cursor:isOOS?"default":"pointer", opacity:isOOS?.5:1, transition:"box-shadow var(--d2) var(--ease), border-color var(--d2) var(--ease)" }}
      onMouseEnter={e => { if (!isOOS) { e.currentTarget.style.boxShadow="var(--sh-md)"; e.currentTarget.style.borderColor="var(--bd2)"; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="var(--bd)"; }}>

      {/* Square image */}
      <div style={{ width:"120px", minWidth:"120px", position:"relative", background:item.image_url&&!imgErr?"var(--bg3)":`linear-gradient(135deg,${item.gradient_from||"#1A0800"},${item.gradient_to||"#2D1200"})`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        {item.image_url && !imgErr
          ? <img loading="lazy" src={item.image_url} alt={item.name} onError={() => setImgErr(true)} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
          : <FoodFallback slug={slug} size={48}/>
        }
        <div title={dietary.label} style={{ position:"absolute", top:"8px", left:"8px", width:"16px", height:"16px", borderRadius:"3px", background:"#fff", border:`2px solid ${dietary.color}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><div style={{ width:"6px", height:"6px", borderRadius:"50%", background:dietary.color }}/></div>
        {isOOS && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:".5rem", fontWeight:800, letterSpacing:".08em", color:"rgba(255,255,255,.8)" }}>OUT OF STOCK</span>
          </div>
        )}
        {(item.is_bestseller || item.is_featured) && (
          <div style={{ position:"absolute", bottom:"5px", left:"5px", background:"var(--brand)", color:"#fff", fontSize:".5rem", fontWeight:800, padding:"2px 6px", borderRadius:"var(--rf)" }}>BEST</div>
        )}
        {item.stock_status === "low" && !isOOS && (
          <div style={{ position:"absolute", bottom:"5px", right:"5px", background:"linear-gradient(135deg,#ff4444,#cc0000)", color:"#fff", fontSize:".5rem", fontWeight:800, padding:"2px 6px", borderRadius:"var(--rf)" }}>HURRY</div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex:1, padding:"var(--s3) var(--s4) var(--s3) var(--s3)", display:"flex", flexDirection:"column", justifyContent:"space-between", minWidth:0 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:".9375rem", color:"var(--t1)", marginBottom:"3px" }}>{item.name}</div>
          {item.description && (
            <div style={{ fontSize:".8125rem", color:"var(--t2)", lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", marginBottom:"5px" }}>
              {item.description}
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:"4px", flexWrap:"wrap" }}>
            {item.avg_rating > 0 && (
              <>
                <span style={{ color:"var(--gold)" }}><Ic.Star/></span>
                <span style={{ fontSize:".75rem", color:"var(--t2)", fontWeight:500 }}>{Number(item.avg_rating).toFixed(1)}</span>
                <span style={{ color:"var(--bd2)" }}>·</span>
              </>
            )}
            <span style={{ fontSize:".75rem", color:"var(--t3)" }}>{item.prep_time_display || "8–15 min"}</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <span className="price" style={{ fontSize:"1.0625rem" }}>{formatPrice(price)}</span>
              {hasDisc && <span style={{ fontSize:".8125rem", color:"var(--t4)", textDecoration:"line-through" }}>{formatPrice(item.price)}</span>}
            </div>
            {formatUnit(item.unit_quantity, item.measurement_unit) && (
              <span style={{ fontSize:".8125rem", color:"var(--t2)", fontWeight:600 }}>
                {formatUnit(item.unit_quantity, item.measurement_unit)}
              </span>
            )}
          </div>
          {!isOOS && (
            inCart
              ? <div style={{ display:"flex", alignItems:"center", gap:"6px" }} onClick={e => e.stopPropagation()}>
                  <button onClick={e => { e.stopPropagation(); updateQty(inCart._key, inCart.quantity - 1); }}
                    style={{ width:"30px", height:"30px", borderRadius:"var(--r2)", background:"var(--bg2)", border:"1px solid var(--bd)", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <span style={{ fontWeight:800, minWidth:"18px", textAlign:"center" }}>{inCart.quantity}</span>
                  <button onClick={e => { e.stopPropagation(); addItem(item); }}
                    style={{ width:"30px", height:"30px", borderRadius:"var(--r2)", background:"var(--brand)", border:"none", color:"#fff", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                </div>
              : <button onClick={e => { e.stopPropagation(); addItem(item); }}
                  style={{ padding:"8px 18px", borderRadius:"var(--r3)", background:"var(--brand)", border:"none", color:"#fff", fontSize:".875rem", fontWeight:700, cursor:"pointer", fontFamily:"var(--ff-b)", boxShadow:"0 2px 10px rgba(232,82,26,.3)", transition:"background var(--d1) var(--ease)" }}
                  onMouseEnter={e => e.currentTarget.style.background="var(--brand-d)"}
                  onMouseLeave={e => e.currentTarget.style.background="var(--brand)"}>
                  Add +
                </button>
          )}
        </div>
      </div>
    </article>
  );
});

/* ─── Main page ─────────────────────────────────────────────────────── */
const SECTION_LABELS = {
  is_hotdeals:    "Hot Deals",
  is_chicken:     "Chicken Items",
  is_snacks:      "Snacks",
  is_cold_drinks: "Cold Drinks",
};

export default function ProductListPage() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const [searchParams] = useSearchParams();
  const sectionFilter  = searchParams.get("filter"); // e.g. "is_hotdeals"
  const isAllMode      = !slug; // no slug = /menu/all

  useSEO({
    title: isAllMode ? "Full Menu — Fried Chicken, Buckets & Combos" : undefined,
    description: "Browse KNFC's full menu — crispy fried chicken, buckets, combos, snacks and cold drinks. Fresh, hot and delivered fast.",
  });

  const gridRef       = useRef(null);
  const headerRef     = useRef(null);
  const filterRef     = useRef(null);
  const isInitialLoad = useRef(true);

  const [loading,   setLoading]   = useState(true);
  const [category,  setCategory]  = useState(null);
  const [allCats,   setAllCats]   = useState([]);
  const [items,     setItems]     = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [searchQ,   setSearchQ]   = useState("");
  const [sort,      setSort]      = useState("popular");
  const [diet,      setDiet]      = useState("all");
  const [viewMode,  setViewMode]  = useState("grid");
  const [showSort,  setShowSort]  = useState(false);
  const [stickyBar, setStickyBar] = useState(false);
  const [activeSection, setActiveSection] = useState("all");
  const catBarRef   = useRef(null);
  const sectionRefs = useRef({});

  const cartCount = useCartStore(s => s.items.reduce((a, i) => a + i.quantity, 0));
  const cartTotal = useCartStore(s => s.items.reduce((a, i) => a + i.lineTotal, 0));

  useEffect(() => {
    getCategories().then(r => setAllCats(r.data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { sort };
        if (!isAllMode) params.category = slug;
        if (sectionFilter) params[sectionFilter] = "true";

        const [catR, itemR] = await Promise.all([
          isAllMode ? Promise.resolve(null) : getCategoryDetail(slug).catch(() => null),
          getItems(params).catch(() => ({ data:{ items:[] } })),
        ]);
        if (catR) setCategory(catR.data.category);
        const list = itemR.data.items || [];
        setItems(list);
        setFiltered(list);
      } finally {
        isInitialLoad.current = false;
        setLoading(false);
      }
    };
    load();
  }, [slug, sort, isAllMode, sectionFilter]);

  useEffect(() => {
    const q = searchQ.trim().toLowerCase();
    let list = items;
    if (q) list = list.filter(i => i.name.toLowerCase().includes(q) || (i.description||"").toLowerCase().includes(q));
    if (diet === "veg")     list = list.filter(i => i.dietary_type === "veg" || i.dietary_type === "vegan");
    if (diet === "non_veg") list = list.filter(i => i.dietary_type === "non_veg");
    setFiltered(list);
  }, [searchQ, diet, items]);

  useEffect(() => {
    if (loading || !gridRef.current || typeof gsap === "undefined") return;
    const cards = gridRef.current.querySelectorAll("article");
    gsap.fromTo(cards, { y:14, opacity:0 }, { y:0, opacity:1, stagger:.04, duration:.38, ease:"power2.out", delay:.06 });
  }, [loading, filtered, viewMode]);

  /* Sticky filter bar on scroll */
  useEffect(() => {
    const hero = headerRef.current;
    if (!hero) return;
    const obs = new IntersectionObserver(([e]) => setStickyBar(!e.isIntersecting), { threshold:0, rootMargin:"-68px 0px 0px 0px" });
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  /* Scroll-spy: highlight the category chip matching the section in view */
  useEffect(() => {
    if (!isAllMode) return;
    const refs = sectionRefs.current;
    const observers = [];
    Object.entries(refs).forEach(([slug, el]) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveSection(slug); },
        { rootMargin: "-72px 0px -65% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [isAllMode, filtered]);

  /* Auto-scroll active chip into centre of category bar */
  useEffect(() => {
    if (!catBarRef.current || !activeSection) return;
    const chip = catBarRef.current.querySelector(`[data-cat="${activeSection}"]`);
    if (chip) chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeSection]);

  const cat   = category || {};
  const pageTitle = isAllMode
    ? (sectionFilter ? SECTION_LABELS[sectionFilter] || "Menu" : "All Items")
    : (cat.name || "Menu");
  const avail = filtered.filter(i => i.is_available).length;

  if (loading && isInitialLoad.current) return <ProductListSkeleton />;

  /* Group items by category for ALL-mode section display */
  const sections = isAllMode
    ? allCats
        .map(cat => ({ ...cat, items: filtered.filter(i => i.category_slug === cat.slug) }))
        .filter(s => s.items.length > 0)
    : [];
  /* Items without a matching category go to "More" section */
  const knownSlugs = new Set(sections.map(s => s.slug));
  const otherItems = isAllMode ? filtered.filter(i => !knownSlugs.has(i.category_slug)) : [];

  const DIET_FILTERS = [
    { key:"all",     label:"All" },
    { key:"veg",     label:"Veg" },
    { key:"non_veg", label:"Non-veg" },
  ];

  return (
    <AppLayout>
      {/* ── HERO ────────────────────────────────────────────────────── */}
      <div ref={headerRef} style={{ position:"relative", height:"clamp(160px,28vw,280px)", borderRadius:"var(--r5)", overflow:"hidden", marginBottom:"var(--s5)", background:cat.image?"var(--bg3)":`linear-gradient(135deg,${cat.gradient_from||"#1A0500"},${cat.gradient_to||"#2D1200"})` }}>
        {cat.image && <img loading="lazy" src={cat.image} alt={cat.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(120deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.35) 60%,transparent 100%)" }}/>

        {/* Back button */}
        <button onClick={() => navigate("/menu")}
          style={{ position:"absolute", top:"var(--s4)", left:"var(--s4)", width:"38px", height:"38px", borderRadius:"var(--r3)", background:"rgba(0,0,0,.55)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,.15)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <Ic.Back/>
        </button>

        {/* Text content */}
        <div style={{ position:"absolute", bottom:"var(--s6)", left:"var(--s6)", right:"var(--s6)" }}>
          <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"var(--brand)", marginBottom:"var(--s2)" }}>
            {avail} available · {items.length} items
          </div>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.75rem,5vw,3rem)", fontWeight:900, color:"#fff", lineHeight:1.0, letterSpacing:"-.025em", marginBottom:"var(--s2)" }}>
            {pageTitle}
          </h1>
          {cat.description && !isAllMode && (
            <p style={{ fontSize:".9rem", color:"rgba(255,255,255,.6)", lineHeight:1.5, maxWidth:"420px" }}>{cat.description}</p>
          )}
        </div>
      </div>

      <style>{`
        @media(max-width:639px){.sort-btn-wrap{display:none}}
        .cat-bar::-webkit-scrollbar{display:none}
        .cat-bar{-ms-overflow-style:none;scrollbar-width:none}
        @keyframes cat-pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>

      {/* ── CATEGORY STRIP ──────────────────────────────────────────── */}
      {allCats.length > 0 && (
        <div style={{ position:"sticky", top:"var(--nav-h)", zIndex:31, marginBottom:"var(--s3)", background:"var(--bgo)", backdropFilter:"blur(20px)", marginLeft:"calc(-1 * var(--s4))", marginRight:"calc(-1 * var(--s4))", borderBottom:"1px solid var(--bd)" }}>
          <div ref={catBarRef} className="cat-bar" style={{ display:"flex", gap:"var(--s2)", overflowX:"auto", padding:"10px var(--s4)" }}>

            {/* "All" chip */}
            <button
              data-cat="all"
              onClick={() => isAllMode ? window.scrollTo({top:0,behavior:"smooth"}) : navigate("/menu/all")}
              style={{ flexShrink:0, display:"flex", alignItems:"center", gap:"6px", padding:"7px 16px", borderRadius:"var(--rf)", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".8125rem", fontWeight:700, transition:"all .2s", whiteSpace:"nowrap",
                background: (!isAllMode || activeSection === "all") ? "var(--brand)" : "var(--bg2)",
                color:      (!isAllMode || activeSection === "all") ? "#fff"         : "var(--t2)",
                boxShadow:  (!isAllMode || activeSection === "all") ? "0 2px 10px rgba(232,82,26,.4)" : "none",
              }}>
              🍽 All
            </button>

            {allCats.map(cat => {
              const isActive = isAllMode ? activeSection === cat.slug : slug === cat.slug;
              return (
                <button
                  key={cat.id || cat.slug}
                  data-cat={cat.slug}
                  onClick={() => {
                    if (isAllMode) {
                      const el = sectionRefs.current[cat.slug];
                      if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 120; window.scrollTo({top:y,behavior:"smooth"}); }
                    } else {
                      navigate(`/menu/${cat.slug}`);
                    }
                    setActiveSection(cat.slug);
                  }}
                  style={{ flexShrink:0, display:"flex", alignItems:"center", gap:"6px", padding:"7px 14px", borderRadius:"var(--rf)", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".8125rem", fontWeight:isActive?700:500, transition:"all .2s", whiteSpace:"nowrap",
                    background: isActive ? "var(--brand)" : "var(--bg2)",
                    color:      isActive ? "#fff"         : "var(--t2)",
                    boxShadow:  isActive ? "0 2px 10px rgba(232,82,26,.4)" : "none",
                  }}>
                  {cat.emoji && <span style={{fontSize:"1rem",lineHeight:1}}>{cat.emoji}</span>}
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STICKY FILTER BAR ───────────────────────────────────────── */}
      <div ref={filterRef} style={{ position:"sticky", top:"var(--nav-h)", zIndex:30, marginBottom:"var(--s4)", transition:"all var(--d2) var(--ease)" }}>
        <div style={{ background:stickyBar?"var(--bgo)":"transparent", backdropFilter:stickyBar?"blur(20px)":"none", borderBottom:stickyBar?"1px solid var(--bd)":"none", padding:stickyBar?"var(--s3) 0":"0", marginLeft:"calc(-1 * var(--s4))", marginRight:"calc(-1 * var(--s4))", paddingLeft:"var(--s4)", paddingRight:"var(--s4)", transition:"all var(--d2) var(--ease)" }}>
          <div style={{ display:"flex", gap:"var(--s2)", alignItems:"center", flexWrap:"wrap" }}>
            {/* Search */}
            <div style={{ flex:1, minWidth:"180px", display:"flex", alignItems:"center", gap:"var(--s2)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--rf)", padding:"0 var(--s3)", transition:"all var(--d1) var(--ease)" }}
              onFocus={e => { e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.boxShadow="0 0 0 3px var(--brand-tint)"; }}
              onBlur={e  => { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.boxShadow="none"; }}>
              <span style={{ color:"var(--t2)", flexShrink:0, display:"flex" }}><Ic.Search/></span>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder={`Search in ${pageTitle}…`}
                style={{ flex:1, border:"none", background:"transparent", color:"var(--t1)", fontSize:".875rem", outline:"none", padding:"10px 0", fontFamily:"var(--ff-b)" }}/>
              {searchQ && <button onClick={() => setSearchQ("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t2)", fontSize:"18px", lineHeight:1 }}>×</button>}
            </div>

            {/* Diet filters */}
            <div style={{ display:"flex", gap:"var(--s1)", background:"var(--bg2)", borderRadius:"var(--rf)", padding:"3px", border:"1px solid var(--bd)" }}>
              {DIET_FILTERS.map(f => (
                <button key={f.key} onClick={() => setDiet(f.key)}
                  style={{ padding:"6px 12px", borderRadius:"var(--rf)", border:"none", cursor:"pointer", fontSize:".8125rem", fontWeight:diet===f.key?700:400, background:diet===f.key?"var(--bgc)":"transparent", color:diet===f.key?"var(--t1)":"var(--t3)", boxShadow:diet===f.key?"var(--sh-xs)":"none", transition:"all var(--d1) var(--ease)", fontFamily:"var(--ff-b)", whiteSpace:"nowrap" }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="sort-btn-wrap" style={{ position:"relative" }}>
              <button onClick={() => setShowSort(v => !v)}
                style={{ height:"40px", padding:"0 var(--s3)", display:"flex", alignItems:"center", gap:"var(--s1)", background:showSort?"var(--brand-tint)":"var(--bg2)", border:`1px solid ${showSort?"var(--bdb)":"var(--bd)"}`, borderRadius:"var(--r3)", cursor:"pointer", color:showSort?"var(--brand)":"var(--t2)", fontSize:".8125rem", fontWeight:500, transition:"all var(--d1) var(--ease)", fontFamily:"var(--ff-b)" }}>
                <Ic.Filter/> Sort
              </button>
              {showSort && (
                <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:50, background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden", minWidth:"200px", boxShadow:"var(--sh-xl)" }}>
                  {SORT_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => { setSort(o.value); setShowSort(false); }}
                      style={{ width:"100%", padding:"11px 16px", border:"none", background:sort===o.value?"var(--brand-tint)":"transparent", cursor:"pointer", fontSize:".875rem", fontWeight:sort===o.value?700:400, color:sort===o.value?"var(--brand)":"var(--t2)", textAlign:"left", fontFamily:"var(--ff-b)", borderBottom:"1px solid var(--bd)", transition:"background var(--d1) var(--ease)", display:"flex", justifyContent:"space-between" }}>
                      {o.label}
                      {sort === o.value && <span style={{ color:"var(--brand)" }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grid/List toggle */}
            <button onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}
              style={{ width:"40px", height:"40px", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", cursor:"pointer", color:"var(--t2)", transition:"all var(--d1) var(--ease)" }}>
              {viewMode === "grid" ? <Ic.List/> : <Ic.Grid/>}
            </button>
          </div>
        </div>
      </div>

      {/* ── RESULT COUNT ────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s4)", fontSize:".8125rem", color:"var(--t2)", padding:"var(--s2) var(--s3)", background:"var(--bg2)", borderRadius:"var(--r3)" }}>
          <span style={{ fontWeight:600, color:"var(--t1)" }}>{filtered.length}</span> items
          <span>·</span>
          <span style={{ color:"var(--ok)", fontWeight:600 }}>{avail} available</span>
          {searchQ && <><span>·</span><span style={{ color:"var(--brand)" }}>Filtered</span><button onClick={() => setSearchQ("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--brand)", fontSize:".75rem", fontWeight:700 }}>Clear ×</button></>}
          {diet !== "all" && <><span>·</span><button onClick={() => setDiet("all")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--brand)", fontSize:".75rem", fontWeight:700 }}>{diet === "veg" ? "Veg only" : "Non-veg only"} ×</button></>}
        </div>
      )}

      {/* ── ITEMS ───────────────────────────────────────────────────── */}
      {loading ? (
        /* Shimmer cards in-place — category strip & hero stay visible */
        viewMode === "grid" ? (
          <div className="product-grid">
            {Array.from({length:8}).map((_,i) => <SkeletonCard key={i}/>)}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
            {Array.from({length:6}).map((_,i) => (
              <div key={i} style={{ display:"flex", gap:0, background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden", height:"108px" }}>
                <div style={{ width:"120px", minWidth:"120px", ...shimmer }}/>
                <div style={{ flex:1, padding:"var(--s3) var(--s4)", display:"flex", flexDirection:"column", gap:8, justifyContent:"center" }}>
                  <div style={{ height:"14px", borderRadius:"6px", width:"70%", ...shimmer }}/>
                  <div style={{ height:"11px", borderRadius:"6px", width:"45%", ...shimmer }}/>
                  <div style={{ height:"16px", borderRadius:"6px", width:"30%", ...shimmer }}/>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"var(--s16) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
          <div style={{ fontSize:"3rem", marginBottom:"var(--s4)" }}>🔍</div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:700, marginBottom:"var(--s2)" }}>Nothing found</h2>
          <p style={{ fontSize:".9375rem", color:"var(--t2)", marginBottom:"var(--s5)" }}>Try a different search or filter</p>
          <button onClick={() => { setSearchQ(""); setDiet("all"); }} className="btn btn-p">Clear filters</button>
        </div>
      ) : isAllMode && (sections.length > 0 || loading) ? (
        /* ALL MODE — grouped by category with section headers */
        <div ref={gridRef}>
          {[...sections, ...(otherItems.length > 0 ? [{ slug:"_other", name:"More", emoji:"🍴", items:otherItems }] : [])].map(section => (
            <div key={section.slug} style={{ marginBottom:"var(--s10)" }}>
              {/* Section header */}
              <div
                ref={el => { sectionRefs.current[section.slug] = el; }}
                style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s4)", paddingBottom:"var(--s3)", borderBottom:"2px solid var(--bd)" }}>
                {section.emoji && <span style={{ fontSize:"1.5rem", lineHeight:1 }}>{section.emoji}</span>}
                {section.image && !section.emoji && (
                  <div style={{ width:"32px", height:"32px", borderRadius:"var(--r2)", overflow:"hidden", flexShrink:0 }}>
                    <img src={section.image} alt={section.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  </div>
                )}
                <div>
                  <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, color:"var(--t1)", margin:0, lineHeight:1.2 }}>{section.name}</h2>
                  <span style={{ fontSize:".75rem", color:"var(--t3)", fontWeight:500 }}>{section.items.length} item{section.items.length !== 1 ? "s" : ""}</span>
                </div>
                {/* Scroll anchor pill */}
                <button onClick={() => { setActiveSection(section.slug); catBarRef.current?.querySelector(`[data-cat="${section.slug}"]`)?.scrollIntoView({behavior:"smooth",inline:"center"}); }}
                  style={{ marginLeft:"auto", padding:"4px 12px", borderRadius:"var(--rf)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t3)", fontSize:".6875rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--ff-b)" }}>
                  ↑ Top
                </button>
              </div>
              {/* Items grid or list */}
              {viewMode === "grid" ? (
                <div className="product-grid">
                  {section.items.map(item => <GridCard key={item.id} item={item} navigate={navigate}/>)}
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
                  {section.items.map(item => <ListCard key={item.id} item={item} navigate={navigate}/>)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div ref={gridRef} className="product-grid">
          {filtered.map(item => <GridCard key={item.id} item={item} navigate={navigate}/>)}
        </div>
      ) : (
        <div ref={gridRef} style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
          {filtered.map(item => <ListCard key={item.id} item={item} navigate={navigate}/>)}
        </div>
      )}

      {/* ── CART BAR ────────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <>
          <div className="cart-mob-bar" onClick={() => navigate("/cart")}>
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
              <div style={{ width:"32px", height:"32px", borderRadius:"var(--r2)", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--ff-d)", fontWeight:900, color:"#fff" }}>{cartCount}</div>
              <div>
                <div style={{ fontSize:".875rem", fontWeight:700, color:"#fff" }}>{cartCount} item{cartCount!==1?"s":""}</div>
                <div style={{ fontSize:".75rem", color:"rgba(255,255,255,.75)" }}>{formatPrice(cartTotal)}</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"6px", color:"#fff", fontSize:".9375rem", fontWeight:700 }}>
              View order <Ic.Arrow/>
            </div>
          </div>
          <button className="cart-fab-btn" onClick={() => navigate("/cart")}>
            <Ic.Cart/> {cartCount} · {formatPrice(cartTotal)} <Ic.Arrow/>
          </button>
        </>
      )}

      {/* Close sort dropdown on outside click */}
      {showSort && <div onClick={() => setShowSort(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>}
    </AppLayout>
  );
}
