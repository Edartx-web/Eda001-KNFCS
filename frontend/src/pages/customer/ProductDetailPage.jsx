/**
 * ProductDetailPage.jsx — Phase 4
 * Inspired by: Zomato item detail
 * - Full-bleed hero with parallax gradient overlay
 * - Sticky bottom "Add to order" bar that slides in on scroll
 * - Smooth customisation chips with spring animation
 * - Star rating display + review submission
 * - Info grid (calories, prep time, stock, rating)
 * - Related items horizontal scroll
 * - Fully responsive single-col mobile / two-col desktop
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import KNCLoader from "../../components/common/KNCLoader";
import AppLayout from "../../components/layout/AppLayout";
import { getItemDetail, getCategories, toggleFavourite, submitReview } from "../../api/menu";
import { formatPrice, formatUnit, formatCalories } from "../../utils/format";
import { DIETARY_DOT, SPICE_DOTS } from "../../utils/constants";
import useCartStore from "../../store/cartStore";
import { getSwipeList } from "../../store/swipeStore";

const haptic = (ms = 8) => { try { navigator?.vibrate?.(ms); } catch {} };
const SWIPE_HINT_KEY = "knfc_swipe_hint_done";

/* ─── Icons ──────────────────────────────────────────────────────────── */
const Ic = {
  Back:   () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round"/></svg>,
  Heart:  (f) => <svg width="18" height="18" fill={f?"currentColor":"none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Cart:   () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  Check:  () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>,
  Star:   (f) => <svg width="14" height="14" fill={f?"currentColor":"none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Tag:    () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>,
  Info:   () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>,
  Clock:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>,
  Fire:   () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>,
};

/* ─── Food illustration ──────────────────────────────────────────────── */
function FoodFallback({ size = 100 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.4">
      <path d="M24 6C13 6 7 15 7 24s6 18 17 18c5 0 9-2 11-5 4-2 6-5 6-8 0-8-8-14-17-14v-9z" strokeLinejoin="round"/>
      <path d="M24 16c5 0 9 4 9 8" strokeLinecap="round"/>
      <circle cx="20" cy="26" r="3" fill="rgba(255,255,255,.18)" stroke="none"/>
      <path d="M34 10l4-4M36 16l4-2" strokeLinecap="round" opacity=".4"/>
    </svg>
  );
}

/* ─── Star rating display ────────────────────────────────────────────── */
function StarRow({ rating, size = 14 }) {
  return (
    <div style={{ display:"flex", gap:"2px" }}>
      {[1,2,3,4,5].map(n => {
        const filled = n <= Math.round(rating);
        return (
          <svg key={n} width={size} height={size} fill={filled?"var(--gold)":"none"} stroke={filled?"var(--gold)":"var(--t3)"} strokeWidth="1.5" viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        );
      })}
    </div>
  );
}

/* ─── Review card ────────────────────────────────────────────────────── */
function ReviewCard({ r }) {
  return (
    <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s4)" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"linear-gradient(135deg,var(--brand),var(--brand-d))", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--ff-d)", fontWeight:900, color:"#fff", fontSize:".875rem", flexShrink:0 }}>
            {(r.customer_name || "U")[0].toUpperCase()}
          </div>
          <span style={{ fontWeight:600, fontSize:".9375rem" }}>{r.customer_name}</span>
        </div>
        <StarRow rating={r.rating}/>
      </div>
      {r.comment && <p style={{ fontSize:".875rem", color:"var(--t2)", lineHeight:1.65 }}>{r.comment}</p>}
      {r.admin_reply && (
        <div style={{ marginTop:"var(--s3)", padding:"var(--s2) var(--s3)", background:"var(--bgc)", borderRadius:"var(--r2)", borderLeft:"3px solid var(--brand)" }}>
          <div style={{ fontSize:".625rem", fontWeight:800, color:"var(--brand)", marginBottom:"3px", letterSpacing:".08em", textTransform:"uppercase" }}>KNFC replied</div>
          <p style={{ fontSize:".8125rem", color:"var(--t2)", lineHeight:1.6 }}>{r.admin_reply}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Info tile ──────────────────────────────────────────────────────── */
function InfoTile({ label, value, color }) {
  return (
    <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"var(--s3) var(--s4)" }}>
      <div style={{ fontSize:".5625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"4px" }}>{label}</div>
      <div style={{ fontSize:".9375rem", fontWeight:700, color:color||"var(--t1)" }}>{value}</div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────── */
export default function ProductDetailPage() {
  const { slug }         = useParams();
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const branchIdFromUrl  = searchParams.get("b") || localStorage.getItem("branch_id") || "";
  const addBtnRef   = useRef(null);
  const heroRef     = useRef(null);
  const addAreaRef  = useRef(null);
  const touchStartX = useRef(null);
  const [showSwipeHint, setShowSwipeHint] = useState(() => !localStorage.getItem(SWIPE_HINT_KEY));

  const [item,       setItem]       = useState(null);
  const [allCats,    setAllCats]    = useState([]);
  const [qty,        setQty]        = useState(1);
  const [selected,   setSelected]   = useState([]);
  const [note,       setNote]       = useState("");
  const [faved,      setFaved]      = useState(false);
  const [stickyBar,  setStickyBar]  = useState(false);
  const [added,      setAdded]      = useState(false);
  const [imgErr,     setImgErr]     = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);   // true = 404 not found
  const [serverErr,  setServerErr]  = useState(false);  // true = 5xx / network
  const [retryTick,  setRetryTick]  = useState(0);
  const [activeImg,  setActiveImg]  = useState(0);
  const [reviewOpen,   setReviewOpen]   = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText,   setReviewText]   = useState("");
  const [reviewPhoto,  setReviewPhoto]  = useState(null);
  const [reviewPhotoPreview, setReviewPhotoPreview] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);

  const addItem = useCartStore(s => s.addItem);

  /* Swipe hint — auto-dismiss after 3.5 s */
  useEffect(() => {
    if (!showSwipeHint) return;
    const t = setTimeout(() => {
      setShowSwipeHint(false);
      localStorage.setItem(SWIPE_HINT_KEY, "1");
    }, 3500);
    return () => clearTimeout(t);
  }, [showSwipeHint]);

  /* Touch swipe navigation */
  const onTouchStart = useCallback(e => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(e => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 60) return;
    const list = getSwipeList();
    const idx  = list.findIndex(i => i.slug === slug);
    if (idx === -1) return;
    haptic(10);
    if (delta < 0 && idx < list.length - 1) {
      navigate(`/menu/product/${list[idx + 1].slug}?b=${branchIdFromUrl}`);
    } else if (delta > 0 && idx > 0) {
      navigate(`/menu/product/${list[idx - 1].slug}?b=${branchIdFromUrl}`);
    }
  }, [slug, branchIdFromUrl, navigate]);

  useEffect(() => {
    getCategories().then(r => setAllCats(r.data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setError(false);
    setServerErr(false);
    const load = async () => {
      try {
        const res = await getItemDetail(slug, branchIdFromUrl);
        setItem(res.data.item);
      } catch (e) {
        if (e?.response?.status === 404) setError(true);
        else setServerErr(true);
      }
      finally { setLoading(false); }
    };
    load();
  }, [slug, branchIdFromUrl, retryTick]);

  useEffect(() => {
    if (loading || !heroRef.current || typeof gsap === "undefined") return;
    gsap.from(heroRef.current, { scale:1.04, opacity:0, duration:.7, ease:"power3.out" });
  }, [loading]);

  /* Sticky bar trigger */
  useEffect(() => {
    if (!addAreaRef.current) return;
    const obs = new IntersectionObserver(([e]) => setStickyBar(!e.isIntersecting), { threshold:0 });
    obs.observe(addAreaRef.current);
    return () => obs.disconnect();
  }, [item]);

  if (loading) return <KNCLoader visible label="Loading product…"/>;

  if (serverErr) return (
    <AppLayout>
      <div style={{ textAlign:"center", padding:"var(--s12) var(--s4)", maxWidth:"480px", margin:"0 auto" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"var(--s4)" }}>🍗</div>
        <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:900, marginBottom:"var(--s3)" }}>Couldn't load item</h2>
        <p style={{ fontSize:".9375rem", color:"var(--t2)", marginBottom:"var(--s6)" }}>Server took too long. Please try again.</p>
        <div style={{ display:"flex", gap:"var(--s3)", justifyContent:"center" }}>
          <button onClick={() => { setLoading(true); setRetryTick(t => t + 1); }} className="btn btn-p btn-lg">Retry</button>
          <button onClick={() => navigate(-1)} className="btn btn-s btn-lg">← Go back</button>
        </div>
      </div>
    </AppLayout>
  );

  if (error || !item) return (
    <AppLayout>
      <div style={{ textAlign:"center", padding:"var(--s12) var(--s4)", maxWidth:"480px", margin:"0 auto" }}>
        <div style={{ color:"var(--brand)", marginBottom:"var(--s4)" }}><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="17" r="4"/><line x1="11.5" y1="13.5" x2="19" y2="6"/><circle cx="20" cy="5" r="1.5"/></svg></div>
        <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:900, marginBottom:"var(--s3)" }}>Item not found</h2>
        <p style={{ fontSize:".9375rem", color:"var(--t2)", marginBottom:"var(--s6)" }}>This item may not be available at your branch right now.</p>
        <div style={{ display:"flex", gap:"var(--s3)", justifyContent:"center" }}>
          <button onClick={() => navigate(-1)} className="btn btn-s btn-lg">← Go back</button>
          <button onClick={() => navigate("/menu")} className="btn btn-p btn-lg">Browse menu</button>
        </div>
      </div>
    </AppLayout>
  );

  const base      = parseFloat(item.price);
  // Use discounted_price (from discount%), then offer_price, then base
  const discPx    = item.discounted_price ? parseFloat(item.discounted_price) : null;
  const offerPx   = item.offer_price      ? parseFloat(item.offer_price)      : null;
  const price     = discPx ?? offerPx ?? base;
  const hasDisc   = price < base;
  const extraCost = selected.reduce((s, c) => s + parseFloat(c.extra_price || 0), 0);
  const unitPrice = price + extraCost;
  const total     = unitPrice * qty;
  const dietary   = DIETARY_DOT[item.dietary_type] || DIETARY_DOT.non_veg;
  const spiceDots = SPICE_DOTS[item.spice_level] || 2;
  const isOOS     = item.stock_status === "out" || !item.is_available;

  const handleAdd = () => {
    if (isOOS) return;
    haptic(14);
    addItem(item, qty, selected, note);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    if (addBtnRef.current && typeof gsap !== "undefined") {
      gsap.timeline()
        .to(addBtnRef.current, { scale:.95, duration:.09 })
        .to(addBtnRef.current, { scale:1.04, duration:.18, ease:"back.out(2)" })
        .to(addBtnRef.current, { scale:1, duration:.1 });
    }
  };

  const handleFav = async () => {
    setFaved(v => !v);
    await toggleFavourite(item.id).catch(() => setFaved(v => !v));
  };

  const toggleCustom = c => setSelected(prev =>
    prev.find(x => x.name === c.name)
      ? prev.filter(x => x.name !== c.name)
      : [...prev, c]
  );

  const handleReview = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitReview(item.id, reviewRating, reviewText, reviewPhoto);
      setReviewOpen(false);
      setReviewText("");
      setReviewPhoto(null);
      setReviewPhotoPreview(null);
    } finally { setSubmitting(false); }
  };

  /* Swipe neighbour info for indicator dots */
  const swipeList = getSwipeList();
  const swipeIdx  = swipeList.findIndex(i => i.slug === slug);

  return (
    <AppLayout>
      <style>{`
        @keyframes swipe-hint-fade{0%{opacity:0;transform:translateY(8px)}15%{opacity:1;transform:translateY(0)}85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(8px)}}
        @keyframes pdp-fade-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div
        style={{ maxWidth:"1000px", margin:"0 auto", position:"relative", animation:"pdp-fade-in 0.35s ease both" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* ── SWIPE HINT — shown once ────────────────────────────────── */}
        {showSwipeHint && swipeList.length > 1 && (
          <div style={{
            position:"fixed", bottom:"calc(80px + env(safe-area-inset-bottom,0px))", left:"50%",
            transform:"translateX(-50%)", zIndex:500,
            display:"flex", alignItems:"center", gap:"10px",
            background:"rgba(0,0,0,.78)", backdropFilter:"blur(12px)",
            color:"#fff", fontSize:".8125rem", fontWeight:600,
            padding:"10px 20px", borderRadius:"var(--rf)",
            boxShadow:"0 4px 24px rgba(0,0,0,.3)",
            animation:"swipe-hint-fade 3.5s ease forwards",
            pointerEvents:"none", whiteSpace:"nowrap",
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round"/></svg>
            Swipe to browse items
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round"/></svg>
          </div>
        )}

        {/* ── SWIPE POSITION DOTS — show when list has neighbours ─── */}
        {swipeList.length > 1 && swipeIdx !== -1 && (
          <div style={{ display:"flex", justifyContent:"center", gap:"5px", marginBottom:"var(--s3)" }}>
            {swipeList.slice(Math.max(0, swipeIdx - 2), swipeIdx + 3).map((item, i) => {
              const absIdx = Math.max(0, swipeIdx - 2) + i;
              return (
                <div key={absIdx} style={{
                  width: absIdx === swipeIdx ? "22px" : "7px",
                  height:"7px", borderRadius:"4px", transition:"all .25s",
                  background: absIdx === swipeIdx ? "var(--brand)" : "var(--bd2)",
                }}/>
              );
            })}
          </div>
        )}

        {/* category pills removed — navigation via back button */}
        <div className="dp-grid">

          {/* ── LEFT: HERO ──────────────────────────────────────────── */}
          <div>
            {/* Build image list: primary + gallery */}
            {(() => {
              const imgs = [
                item.image_url && !imgErr ? item.image_url : null,
                ...(item.gallery_images || []).map(g => (typeof g === "string" ? g : g?.url)).filter(Boolean),
              ].filter(Boolean);
              const hasGallery = imgs.length > 1;
              const curImg = imgs[activeImg] || null;

              return (
                <>
                  <div ref={heroRef} style={{ borderRadius:"var(--r5)", overflow:"hidden", aspectRatio:"1/1", maxHeight:"420px", position:"relative", background:curImg?"var(--bg3)":`linear-gradient(135deg,${item.gradient_from||"#1A0800"},${item.gradient_to||"#2D1200"})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {curImg
                      ? <img loading="lazy" src={curImg} alt={item.name} onError={() => { if(activeImg===0) setImgErr(true); }} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <FoodFallback size={120}/>
                    }
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,.6) 0%, rgba(0,0,0,.1) 50%, transparent 100%)" }}/>

                    {/* Back */}
                    <button onClick={() => navigate(-1)}
                      style={{ position:"absolute", top:"14px", left:"14px", width:"40px", height:"40px", borderRadius:"var(--r3)", background:"rgba(0,0,0,.5)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,.15)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                      <Ic.Back/>
                    </button>

                    {/* Favourite */}
                    <button onClick={handleFav}
                      style={{ position:"absolute", top:"14px", right:"14px", width:"40px", height:"40px", borderRadius:"var(--r3)", background:"rgba(0,0,0,.5)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,.15)", color:faved?"var(--err)":"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"color var(--d1) var(--ease)" }}>
                      {Ic.Heart(faved)}
                    </button>

                    {/* Slide arrows */}
                    {hasGallery && activeImg > 0 && (
                      <button onClick={() => setActiveImg(i => i - 1)}
                        style={{ position:"absolute", top:"50%", left:"14px", transform:"translateY(-50%)", width:"34px", height:"34px", borderRadius:"var(--r3)", background:"rgba(0,0,0,.55)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.15)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" strokeLinecap="round"/></svg>
                      </button>
                    )}
                    {hasGallery && activeImg < imgs.length - 1 && (
                      <button onClick={() => setActiveImg(i => i + 1)}
                        style={{ position:"absolute", top:"50%", right:"14px", transform:"translateY(-50%)", width:"34px", height:"34px", borderRadius:"var(--r3)", background:"rgba(0,0,0,.55)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.15)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" strokeLinecap="round"/></svg>
                      </button>
                    )}

                    {/* Offer badge */}
                    {item.offer_label && (
                      <div style={{ position:"absolute", bottom:"14px", left:"14px" }}>
                        <span className="badge badge-gold" style={{ fontSize:".75rem", padding:"4px 12px" }}>{item.offer_label}</span>
                      </div>
                    )}

                    {/* Discount badge */}
                    {hasDisc && item.discount && (
                      <div style={{ position:"absolute", bottom:"14px", right:"14px", background:"var(--ok)", color:"#fff", fontWeight:800, fontSize:".75rem", padding:"4px 12px", borderRadius:"var(--rf)" }}>
                        {item.discount}% OFF
                      </div>
                    )}

                    {/* Slide dots */}
                    {hasGallery && (
                      <div style={{ position:"absolute", bottom:"14px", left:"50%", transform:"translateX(-50%)", display:"flex", gap:"6px", zIndex:5 }}>
                        {imgs.map((_, i) => (
                          <button key={i} onClick={() => setActiveImg(i)}
                            style={{ width: i===activeImg?"20px":"8px", height:"8px", borderRadius:"4px", background:i===activeImg?"#fff":"rgba(255,255,255,.45)", border:"none", cursor:"pointer", transition:"all .2s ease", padding:0 }}/>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail strip */}
                  {hasGallery && (
                    <div style={{ display:"flex", gap:"var(--s2)", marginTop:"var(--s3)", overflowX:"auto", scrollbarWidth:"none" }}>
                      {imgs.map((url, i) => (
                        <button key={i} onClick={() => setActiveImg(i)}
                          style={{ flexShrink:0, width:"60px", height:"60px", borderRadius:"var(--r3)", overflow:"hidden", border:`2px solid ${i===activeImg?"var(--brand)":"var(--bd)"}`, cursor:"pointer", padding:0, background:"var(--bg3)", transition:"border-color .15s" }}>
                          <img src={url} alt={`View ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Related items — desktop only */}
            {item.related_items?.length > 0 && (
              <div className="dp-desktop-only" style={{ marginTop:"var(--s5)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:700, marginBottom:"var(--s3)", letterSpacing:"-.015em" }}>You might also like</div>
                <div style={{ display:"flex", gap:"var(--s3)", overflow:"hidden" }}>
                  {item.related_items.slice(0,3).map(r => (
                    <div key={r.id} onClick={() => navigate(`/menu/product/${r.slug}`)}
                      style={{ flex:1, background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden", cursor:"pointer", transition:"transform var(--d1) var(--ease)" }}
                      onMouseEnter={e => e.currentTarget.style.transform="translateY(-3px)"}
                      onMouseLeave={e => e.currentTarget.style.transform="none"}>
                      <div style={{ height:"80px", background:r.image_url?"var(--bg3)":`linear-gradient(135deg,${r.gradient_from||"#1A0800"},${r.gradient_to||"#2D1200"})`, position:"relative", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                        {r.image_url ? <img loading="lazy" src={r.image_url} alt={r.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/> : <FoodFallback size={36}/>}
                      </div>
                      <div style={{ padding:"var(--s2) var(--s3) var(--s3)" }}>
                        <div style={{ fontSize:".8125rem", fontWeight:600, marginBottom:"2px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{r.name}</div>
                        <div className="price" style={{ fontSize:".9375rem" }}>{formatPrice(r.offer_price||r.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: DETAILS ──────────────────────────────────────── */}
          <div>
            {/* Tags row */}
            <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap", marginBottom:"var(--s3)" }}>
              {item.is_featured && (
                <span style={{ display:"inline-flex", alignItems:"center", gap:"4px", background:"linear-gradient(135deg,rgba(232,82,26,.15),rgba(232,82,26,.05))", color:"var(--brand)", border:"1px solid rgba(232,82,26,.2)", fontSize:".6875rem", fontWeight:800, padding:"4px 10px", borderRadius:"var(--rf)", letterSpacing:".06em" }}>
                  <Ic.Fire/> BESTSELLER
                </span>
              )}
              {item.is_new && (
                <span className="badge badge-info" style={{ fontSize:".6875rem" }}>NEW</span>
              )}
              <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", padding:"4px 10px", borderRadius:"var(--rf)", background:"var(--bg2)", border:"1px solid var(--bd)" }}>
                <div style={{ width:"16px", height:"16px", borderRadius:"3px", background:"#fff", border:`2px solid ${dietary.color}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><div style={{ width:"6px", height:"6px", borderRadius:"50%", background:dietary.color }}/></div>
                <span style={{ fontSize:".6875rem", fontWeight:600, color:"var(--t2)" }}>{dietary.label}</span>
              </div>
              {item.spice_level && item.spice_level !== "mild" && item.spice_level !== "none" && (
                <span style={{ padding:"4px 10px", borderRadius:"var(--rf)", background:"var(--bg2)", border:"1px solid var(--bd)", fontSize:".875rem" }}>
                  {Array.from({length:spiceDots}).map((_,i)=>(
                    <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline"}}>
                      <path d="M12 22a7 7 0 007-7c0-5-4-7-5-11-1.5 2-2 4-2 5.5-1-1-1.5-2.5-1-4-2 2.5-2 5-2 6a5 5 0 005 5z"/>
                    </svg>
                  ))}
                </span>
              )}
              {/* Measurement unit + quantity chip */}
              {(item.unit_quantity || item.measurement_unit) && (
                <span style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"4px 10px", borderRadius:"var(--rf)", background:"var(--bg2)", border:"1px solid var(--bd)", fontSize:".8125rem", fontWeight:700, color:"var(--t2)" }}>
                  {formatUnit(item.unit_quantity, item.measurement_unit)}
                </span>
              )}
            </div>

            {/* Name */}
            <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.625rem,4vw,2.25rem)", fontWeight:900, letterSpacing:"-.025em", lineHeight:1.05, marginBottom:"var(--s3)" }}>
              {item.name}
            </h1>

            {/* Rating bar */}
            {item.avg_rating > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s4)", padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)" }}>
                <StarRow rating={item.avg_rating}/>
                <span style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:900, color:"var(--t1)" }}>{Number(item.avg_rating).toFixed(1)}</span>
                <span style={{ color:"var(--bd2)" }}>·</span>
                <span style={{ fontSize:".875rem", color:"var(--t2)" }}>{item.review_count} reviews</span>
                <button onClick={() => setReviewOpen(v => !v)}
                  style={{ marginLeft:"auto", fontSize:".8125rem", fontWeight:700, color:"var(--brand)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
                  {reviewOpen ? "Cancel" : "+ Review"}
                </button>
              </div>
            )}

            {/* Active offer chip */}
            {item.active_offer && (
              <div onClick={() => navigate(`/offer/${item.active_offer.id}`)}
                style={{ display:"flex", alignItems:"center", gap:"var(--s3)", background:"linear-gradient(135deg,rgba(245,166,35,.1),rgba(232,82,26,.06))", border:"1px solid rgba(245,166,35,.25)", borderRadius:"var(--r4)", padding:"var(--s3) var(--s4)", marginBottom:"var(--s4)", cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="rgba(245,166,35,.5)"}
                onMouseLeave={e => e.currentTarget.style.borderColor="rgba(245,166,35,.25)"}>
                <span style={{ fontSize:"1.5rem" }}><Ic.Tag/></span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:".625rem", fontWeight:800, color:"var(--gold-d)", letterSpacing:".08em", textTransform:"uppercase" }}>Active offer</div>
                  <div style={{ fontSize:".9375rem", fontWeight:700 }}>{item.active_offer.name}</div>
                  {item.active_offer.savings_amount && <div style={{ fontSize:".8125rem", color:"var(--ok)" }}>Save {formatPrice(item.active_offer.savings_amount)}</div>}
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gold-d)" strokeWidth="1.8"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round"/></svg>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <p style={{ fontSize:".9375rem", color:"var(--t2)", lineHeight:1.75, marginBottom:"var(--s5)" }}>{item.description}</p>
            )}

            {/* Price */}
            <div style={{ display:"flex", alignItems:"baseline", gap:"var(--s3)", marginBottom:"var(--s1)", flexWrap:"wrap" }}>
              <span className="price" style={{ fontSize:"2.25rem", letterSpacing:"-.02em" }}>{formatPrice(price)}</span>
              {hasDisc && <span style={{ fontSize:"1.25rem", color:"var(--t4)", textDecoration:"line-through" }}>{formatPrice(base)}</span>}
              {item.discount > 0 && (
                <span style={{ fontSize:".8125rem", fontWeight:800, background:"rgba(29,158,117,.12)", color:"var(--ok)", borderRadius:"var(--rf)", padding:"2px 9px", border:"1px solid rgba(29,158,117,.2)" }}>
                  {item.discount}% off
                </span>
              )}
            </div>
            {/* Unit / serving size */}
            {formatUnit(item.unit_quantity, item.measurement_unit) && (
              <div style={{ fontSize:".875rem", color:"var(--t3)", marginBottom:"var(--s2)", display:"flex", alignItems:"center", gap:5 }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
                {formatUnit(item.unit_quantity, item.measurement_unit)}
              </div>
            )}
            {hasDisc && (
              <div style={{ fontSize:".875rem", fontWeight:700, color:"var(--ok)", marginBottom:"var(--s4)", display:"flex", alignItems:"center", gap:"5px" }}>
                <Ic.Check/> You save {formatPrice(base - price)}
              </div>
            )}

            {/* Info grid — no Calories */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"var(--s2)", marginBottom:"var(--s5)" }}>
              <InfoTile label="Prep time" value={item.prep_time_display || "8–15 min"}/>
              <InfoTile label="Rating"    value={item.avg_rating > 0 ? `${Number(item.avg_rating).toFixed(1)} ★` : "No reviews"} color="var(--gold)"/>
              <InfoTile label="Stock"     value={isOOS ? "Out of stock" : item.stock_remaining > 0 ? `${item.stock_remaining} left` : "Available"} color={isOOS ? "var(--err)" : item.stock_remaining < 10 ? "var(--warn)" : "var(--ok)"}/>
              {item.measurement_unit && item.measurement_unit !== "pcs" && (
                <InfoTile label="Unit" value={formatUnit(item.unit_quantity, item.measurement_unit) || item.measurement_unit}/>
              )}
            </div>

            {/* Customisations */}
            {item.customisations?.length > 0 && (
              <div style={{ marginBottom:"var(--s5)" }}>
                <div style={{ fontSize:".875rem", fontWeight:700, color:"var(--t2)", marginBottom:"var(--s3)", letterSpacing:"-.01em" }}>Customise</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"var(--s2)" }}>
                  {item.customisations.map(c => {
                    const on = selected.find(x => x.name === c.name);
                    return (
                      <button key={c.name} onClick={() => toggleCustom(c)}
                        style={{ padding:"8px 16px", borderRadius:"var(--rf)", cursor:"pointer", border:`1.5px solid ${on?"var(--brand)":"var(--bd)"}`, background:on?"var(--brand-tint)":"var(--bg2)", color:on?"var(--brand)":"var(--t2)", fontSize:".875rem", fontWeight:on?700:400, fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}>
                        {c.name}
                        {parseFloat(c.extra_price) > 0 && <span style={{ opacity:.7, marginLeft:"4px", fontSize:".8125rem" }}>+{formatPrice(c.extra_price)}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Qty + total */}
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s4)", marginBottom:"var(--s4)", padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px solid var(--bd)" }}>
              <span style={{ fontSize:".875rem", fontWeight:600, color:"var(--t2)" }}>Qty</span>
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"4px" }}>
                <button onClick={() => setQty(q => Math.max(1, q-1))}
                  style={{ width:"32px", height:"32px", borderRadius:"var(--r2)", background:qty>1?"var(--bg2)":"var(--bg3)", border:"none", cursor:qty>1?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:700, color:qty>1?"var(--t1)":"var(--t4)" }}>−</button>
                <span style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, minWidth:"28px", textAlign:"center" }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(20, q+1))}
                  style={{ width:"32px", height:"32px", borderRadius:"var(--r2)", background:"var(--brand)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:700, color:"#fff" }}>+</button>
              </div>
              <div style={{ marginLeft:"auto" }}>
                <span className="price" style={{ fontSize:"1.5rem", letterSpacing:"-.02em" }}>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Special instructions */}
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Special instructions — extra crispy, no sauce, well done…"
              rows={2}
              style={{ width:"100%", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"var(--s3)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", resize:"none", outline:"none", marginBottom:"var(--s4)", transition:"border-color var(--d1) var(--ease), box-shadow var(--d1) var(--ease)", boxSizing:"border-box" }}
              onFocus={e => { e.target.style.borderColor="var(--brand)"; e.target.style.boxShadow="0 0 0 3px var(--brand-tint)"; }}
              onBlur={e  => { e.target.style.borderColor="var(--bd)"; e.target.style.boxShadow="none"; }}/>

            {/* Add button */}
            <div ref={addAreaRef}>
              {isOOS ? (
                <div style={{ width:"100%", padding:"15px 28px", borderRadius:"var(--r4)", background:"var(--bg3)", border:"2px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", fontSize:"1rem", fontWeight:800, color:"var(--t4)", userSelect:"none" }}>
                  Out of Stock — Not available today
                </div>
              ) : (
                <button ref={addBtnRef} onClick={handleAdd}
                  style={{ width:"100%", padding:"15px 28px", borderRadius:"var(--r4)", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:"1rem", fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", background:added?"var(--ok)":"var(--brand)", color:"#fff", boxShadow:added?"0 8px 28px rgba(29,158,117,.4)":"var(--sh-br)", transition:"background .3s, box-shadow .3s" }}>
                  {added ? (<><Ic.Check/> Added to order!</>) : (<><Ic.Cart/> Add to order — {formatPrice(total)}</>)}
                </button>
              )}
            </div>

            {/* Write review form */}
            {reviewOpen && (
              <form onSubmit={handleReview} style={{ marginTop:"var(--s5)", background:"var(--bg2)", borderRadius:"var(--r4)", padding:"var(--s4)", border:"1px solid var(--bd)" }}>
                <div style={{ fontSize:".875rem", fontWeight:700, marginBottom:"var(--s3)" }}>Your review</div>
                <div style={{ display:"flex", gap:"var(--s1)", marginBottom:"var(--s3)" }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setReviewRating(n)}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:"3px", transition:"transform var(--d1) var(--ease)", transform: n <= reviewRating ? "scale(1.15)" : "scale(1)" }}>
                      <svg width="30" height="30" fill={n<=reviewRating?"var(--gold)":"none"} stroke={n<=reviewRating?"var(--gold)":"var(--t2)"} strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                  ))}
                </div>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                  placeholder="Share your experience with this dish…" rows={3}
                  style={{ width:"100%", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"var(--s3)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", resize:"none", outline:"none", marginBottom:"var(--s3)", boxSizing:"border-box" }}/>

                {/* Photo upload */}
                <div style={{ marginBottom:"var(--s3)" }}>
                  <label style={{ display:"block", fontSize:".75rem", fontWeight:700, color:"var(--t2)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:"var(--s2)" }}>
                    Add photo (optional)
                  </label>
                  {reviewPhotoPreview ? (
                    <div style={{ position:"relative", width:"80px", height:"80px" }}>
                      <img loading="lazy" src={reviewPhotoPreview} alt="preview"
                        style={{ width:"80px", height:"80px", objectFit:"cover", borderRadius:"var(--r3)", border:"1px solid var(--bd)" }}/>
                      <button type="button" onClick={() => { setReviewPhoto(null); setReviewPhotoPreview(null); }}
                        style={{ position:"absolute", top:"-6px", right:"-6px", width:"20px", height:"20px", borderRadius:"50%", background:"var(--err)", border:"none", cursor:"pointer", color:"#fff", fontSize:"12px", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>
                        ×
                      </button>
                    </div>
                  ) : (
                    <label style={{ display:"inline-flex", alignItems:"center", gap:"var(--s2)", padding:"8px 14px", borderRadius:"var(--r3)", border:"1.5px dashed var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".8125rem", color:"var(--t2)", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.color="var(--brand)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.color="var(--t3)"; }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Upload photo
                      <input type="file" accept="image/*" style={{ display:"none" }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setReviewPhoto(f);
                          setReviewPhotoPreview(URL.createObjectURL(f));
                        }}/>
                    </label>
                  )}
                </div>
                <button type="submit" disabled={submitting} className="btn btn-p btn-sm">
                  {submitting ? "Submitting…" : "Submit review"}
                </button>
              </form>
            )}

            {/* Reviews section */}
            {item.reviews?.length > 0 && (
              <div style={{ marginTop:"var(--s8)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, marginBottom:"var(--s5)", letterSpacing:"-.015em" }}>
                  Reviews ({item.review_count})
                </div>

                {/* Star breakdown bar */}
                {item.review_count >= 3 && (
                  <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s4)", marginBottom:"var(--s4)", display:"flex", gap:"var(--s5)", alignItems:"center" }}>
                    {/* Big score */}
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <div style={{ fontFamily:"var(--ff-d)", fontSize:"2.75rem", fontWeight:900, color:"var(--gold)", lineHeight:1 }}>
                        {Number(item.avg_rating).toFixed(1)}
                      </div>
                      <div style={{ display:"flex", gap:"2px", justifyContent:"center", margin:"6px 0 4px" }}>
                        {[1,2,3,4,5].map(n => (
                          <svg key={n} width="12" height="12" fill={n <= Math.round(item.avg_rating) ? "var(--gold)" : "none"} stroke={n <= Math.round(item.avg_rating) ? "var(--gold)" : "var(--t3)"} strokeWidth="1.5" viewBox="0 0 24 24">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        ))}
                      </div>
                      <div style={{ fontSize:".75rem", color:"var(--t2)" }}>{item.review_count} reviews</div>
                    </div>
                    {/* Per-star bars */}
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"5px" }}>
                      {[5,4,3,2,1].map(star => {
                        const count = item.reviews.filter(r => r.rating === star).length;
                        const pct   = item.review_count > 0 ? (count / item.review_count) * 100 : 0;
                        return (
                          <div key={star} style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
                            <span style={{ fontSize:".75rem", color:"var(--t2)", minWidth:"8px" }}>{star}</span>
                            <svg width="10" height="10" fill="var(--gold)" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            <div style={{ flex:1, height:"6px", borderRadius:"3px", background:"var(--bg3)", overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${pct}%`, background:"var(--gold)", borderRadius:"3px", transition:"width .6s var(--ease)" }}/>
                            </div>
                            <span style={{ fontSize:".6875rem", color:"var(--t4)", minWidth:"16px", textAlign:"right" }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
                  {item.reviews.slice(0,4).map(r => <ReviewCard key={r.id} r={r}/>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STICKY ADD BAR ──────────────────────────────────────────── */}
      <div style={{ position:"fixed", bottom:stickyBar?`calc(var(--tab-h) + var(--s2))`:`calc(var(--tab-h) + var(--s2))`, left:"var(--s4)", right:"var(--s4)", maxWidth:"560px", margin:"0 auto", zIndex:90, transform:stickyBar?"translateY(0)":"translateY(120%)", transition:"transform .3s var(--ease)", pointerEvents:stickyBar?"auto":"none" }}>
        <div style={{ background:"var(--bgo)", backdropFilter:"blur(20px)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", padding:"var(--s3) var(--s4)", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"var(--sh-xl)" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:".9375rem", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", maxWidth:"180px" }}>{item.name}</div>
            <div className="price" style={{ fontSize:"1.125rem" }}>{formatPrice(total)}</div>
          </div>
          {isOOS ? (
            <span style={{ padding:"10px 22px", background:"var(--bg3)", borderRadius:"var(--rf)", color:"var(--t4)", fontWeight:700, fontSize:".875rem", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", gap:"6px" }}>
              Out of Stock
            </span>
          ) : (
            <button onClick={handleAdd}
              style={{ padding:"10px 22px", background:added?"var(--ok)":"var(--brand)", border:"none", borderRadius:"var(--rf)", color:"#fff", fontWeight:700, fontSize:".9375rem", cursor:"pointer", fontFamily:"var(--ff-b)", boxShadow:added?"0 4px 16px rgba(29,158,117,.4)":"var(--sh-br)", transition:"background .3s, box-shadow .3s", display:"flex", alignItems:"center", gap:"6px" }}>
              {added ? <><Ic.Check/> Added!</> : qty > 1 ? `Add ×${qty}` : "Add to order"}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .dp-grid{display:grid;gap:var(--s6);grid-template-columns:1fr}
        .dp-desktop-only{display:none}
        @media(min-width:900px){
          .dp-grid{grid-template-columns:1fr 1fr;align-items:start}
          .dp-desktop-only{display:block}
        }
        @media(min-width:1024px){.dp-grid{grid-template-columns:480px 1fr}}
        @media(min-width:1024px){
          .dp-sticky-bar{bottom:var(--s6) !important}
        }
      `}</style>
    </AppLayout>
  );
}
