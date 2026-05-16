/**
 * HomePage.jsx — KNFC Customer Home  v3
 *
 * Section order:
 *  1. Hero  2. Closed banner  3. Active order  4. Loyalty bar
 *  5. Greeting  6. Today's offers  7. Hot Deals card  8. Popular picks
 *  9. Category grid  10. Order again  11. Favourites  12. Themed sections
 */

import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import { Link, useNavigate }           from "react-router-dom";
import { gsap }                        from "gsap";
import AppLayout                       from "../../components/layout/AppLayout";
import { useAuth }                     from "../../context/AuthContext";
import useBranch                       from "../../hooks/useBranch";
import useCartStore                    from "../../store/cartStore";
import { getOffers }                   from "../../api/orders";
import { getCategories, getFeatured, getFavourites, getItems } from "../../api/menu";
import GoogleReviewBanner from "../../components/common/GoogleReviewBanner";
import { formatPrice, formatUnit }     from "../../utils/format";
import { DIETARY_DOT }                 from "../../utils/constants";

/* ── SVG icon set ─────────────────────────────────────────────────────────── */
const Ic = {
  Arrow:  () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Cart:   () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  Fire:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>,
  Star:   () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Clock:  () => <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>,
  Tag:    () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>,
  Heart:  () => <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Redo:   () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Loc:    () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Play:   () => <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Pause:  () => <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  Check:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Wave:   () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 4a2 2 0 013 0v5m0 0V4a2 2 0 014 0v5m0 0V5a2 2 0 014 0v9a7 7 0 01-14 0V9a2 2 0 014 0v4"/></svg>,
  Lock:   () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round"/></svg>,
  Chick:  () => <svg width="48" height="48" fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M24 8C15 8 9 16 9 24s6 16 15 16c4 0 8-2 10-5 3-2 5-4 5-7 0-7-7-12-15-12V8z"/><path d="M24 18c4 0 8 3 8 6"/></svg>,
  Cup:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2h8l-1 14H9L8 2z" strokeLinejoin="round"/><path d="M9 16c0 3 1.5 5 3 5s3-2 3-5" strokeLinecap="round"/><path d="M6 8h12" strokeLinecap="round"/></svg>,
};

/* ── helpers ──────────────────────────────────────────────────────────────── */
function formatNextOpen(isoStr) {
  if (!isoStr) return null;
  const d   = new Date(isoStr);
  const now = new Date();
  const diff = Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate()) - new Date(now.getFullYear(),now.getMonth(),now.getDate())) / 86400000);
  const t   = d.toLocaleTimeString("en-IN", { hour:"numeric", minute:"2-digit", hour12:true });
  if (diff === 0) return `Today at ${t}`;
  if (diff === 1) return `Tomorrow at ${t}`;
  return `${d.toLocaleDateString("en-IN",{weekday:"long"})} at ${t}`;
}

const THEMED_SECTIONS = [
  { flag:"is_hotdeals",    label:"Hot Deals",     accent:"var(--brand)", filterParam:"is_hotdeals"    },
  { flag:"is_chicken",     label:"Chicken Items", accent:"var(--brand)", filterParam:"is_chicken"     },
  { flag:"is_snacks",      label:"Snacks",        accent:"var(--warn)",  filterParam:"is_snacks"      },
  { flag:"is_cold_drinks", label:"Cold Drinks",   accent:"var(--info)",  filterParam:"is_cold_drinks" },
];

/* ══════════════════════════════════════════════════════════════════════
   HERO CAROUSEL
══════════════════════════════════════════════════════════════════════ */
function HeroCarousel({ offers }) {
  const [cur,    setCur]   = useState(0);
  const [paused, setPaused]= useState(false);
  const trackRef = useRef(null);
  const touchX   = useRef(null);
  const total    = offers.length;

  const goTo = useCallback(i => {
    if (!trackRef.current) return;
    gsap.to(trackRef.current, { x:`-${i*100}%`, duration:.5, ease:"power2.inOut" });
    setCur(i);
  }, []);

  useEffect(() => {
    if (paused || total <= 1) return;
    const t = setInterval(() => goTo((cur+1)%total), 5500);
    return () => clearInterval(t);
  }, [cur, paused, total, goTo]);

  return (
    <div style={{ position:"relative", width:"100%", height:"100%", overflow:"hidden" }}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchX.current === null) return;
        const d = touchX.current - e.changedTouches[0].clientX;
        if (Math.abs(d) > 45) goTo(d > 0 ? (cur+1)%total : (cur-1+total)%total);
        touchX.current = null;
      }}>
      <div ref={trackRef} style={{ display:"flex", height:"100%", width:`${total*100}%`, willChange:"transform" }}>
        {offers.map((o, i) => <HeroSlide key={o.id} offer={o} active={i===cur} paused={paused} onPause={()=>setPaused(v=>!v)} width={`${100/total}%`}/>)}
      </div>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.45) 45%,rgba(0,0,0,.12) 100%)", pointerEvents:"none" }}/>
      <HeroOverlay offer={offers[cur]}/>
      <div style={{ position:"absolute", bottom:"var(--s5)", right:"var(--s5)", display:"flex", alignItems:"center", gap:"var(--s2)", zIndex:4 }}>
        <button onClick={()=>setPaused(v=>!v)} style={{ width:"28px",height:"28px",borderRadius:"50%",background:"rgba(0,0,0,.5)",border:"1px solid rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,.8)",cursor:"pointer",backdropFilter:"blur(8px)" }}>
          {paused ? <Ic.Play/> : <Ic.Pause/>}
        </button>
        {offers.map((_,i) => (
          <button key={i} onClick={()=>goTo(i)} style={{ border:"none",cursor:"pointer",padding:0,width:i===cur?"22px":"6px",height:"6px",borderRadius:"3px",background:i===cur?"var(--brand)":"rgba(255,255,255,.35)",transition:"all .3s var(--ease)" }}/>
        ))}
      </div>
    </div>
  );
}

function HeroSlide({ offer, active, paused, onPause, width }) {
  const canvasRef = useRef(null);
  const videoRef  = useRef(null);
  useEffect(() => {
    if (videoRef.current) {
      if (active && !paused) videoRef.current.play().catch(()=>{});
      else videoRef.current.pause();
    }
  }, [active, paused]);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || offer.image) return;
    const w = c.offsetWidth||800, h = c.offsetHeight||500;
    c.width=w; c.height=h;
    const ctx=c.getContext("2d"), g=ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,offer.gradient_from||"#0D0300"); g.addColorStop(.5,"#1A0800"); g.addColorStop(1,offer.gradient_to||"#2D1200");
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    for(let i=0;i<120;i++){const x=Math.random()*w,y=Math.random()*h,r=.3+Math.random()*3;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=`rgba(245,166,35,${Math.random()*.22})`;ctx.fill();}
    const rg=ctx.createRadialGradient(w*.72,h*.45,30,w*.72,h*.45,w*.4);
    rg.addColorStop(0,"rgba(232,82,26,.22)"); rg.addColorStop(.5,"rgba(232,82,26,.06)"); rg.addColorStop(1,"transparent");
    ctx.fillStyle=rg; ctx.fillRect(0,0,w,h);
  }, [offer]);
  return (
    <div style={{ width,flexShrink:0,position:"relative",cursor:offer.has_video?"pointer":"default" }} onClick={offer.has_video?onPause:undefined}>
      {offer.has_video ? <video ref={videoRef} src={offer.media_url} poster={offer.video_thumbnail} muted loop playsInline style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
        : offer.image ? <img loading="eager" src={offer.image} alt={offer.name} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
        : <canvas ref={canvasRef} style={{ width:"100%",height:"100%",display:"block" }}/>}
    </div>
  );
}

function HeroOverlay({ offer }) {
  const navigate = useNavigate();
  if (!offer) return null;
  const disc = offer.discount_percentage ? `${Math.round(offer.discount_percentage)}% OFF`
    : offer.discount_flat ? `₹${Math.round(offer.discount_flat)} OFF`
    : offer.offer_type==="combo" ? "COMBO" : "DEAL";
  return (
    <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:3,padding:"var(--s6) var(--s5) calc(var(--s8) + 10px)" }}>
      <div style={{ display:"inline-flex",alignItems:"center",gap:"5px",background:"var(--brand)",color:"#fff",fontSize:".6875rem",fontWeight:800,padding:"4px 12px",borderRadius:"var(--rf)",marginBottom:"var(--s3)",letterSpacing:".08em",boxShadow:"0 4px 16px rgba(232,82,26,.5)",textTransform:"uppercase" }}>
        <Ic.Tag/> {disc}
      </div>
      <h2 style={{ fontFamily:"var(--ff-d)",fontSize:"clamp(1.375rem,4vw,2.25rem)",fontWeight:900,color:"#fff",lineHeight:1.1,letterSpacing:"-.02em",marginBottom:"var(--s2)",maxWidth:"520px" }}>{offer.name}</h2>
      {offer.tagline && <p style={{ fontSize:".9375rem",color:"rgba(255,255,255,.65)",lineHeight:1.5,marginBottom:"var(--s4)",maxWidth:"360px" }}>{offer.tagline}</p>}
      <div style={{ display:"flex",alignItems:"center",gap:"var(--s3)",flexWrap:"wrap" }}>
        {offer.offer_price && (
          <div style={{ display:"flex",alignItems:"baseline",gap:"var(--s2)" }}>
            <span style={{ fontFamily:"var(--ff-d)",fontSize:"1.75rem",fontWeight:900,color:"var(--gold)",letterSpacing:"-.02em",lineHeight:1 }}>{formatPrice(offer.offer_price)}</span>
            {offer.original_price && <span style={{ fontSize:"1rem",color:"rgba(255,255,255,.35)",textDecoration:"line-through" }}>{formatPrice(offer.original_price)}</span>}
          </div>
        )}
        <button onClick={()=>navigate(`/offer/${offer.id}`)} style={{ padding:"10px 24px",background:"#fff",border:"none",borderRadius:"var(--rf)",color:"var(--brand)",fontSize:".9375rem",fontWeight:800,cursor:"pointer",fontFamily:"var(--ff-b)",display:"flex",alignItems:"center",gap:"6px" }}>
          Grab deal <Ic.Arrow/>
        </button>
      </div>
    </div>
  );
}

/* ── Fallback hero ────────────────────────────────────────────────────────── */
function FallbackHero({ branchName }) {
  const navigate  = useNavigate();
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w=c.offsetWidth||800, h=c.offsetHeight||480;
    c.width=w; c.height=h;
    const ctx=c.getContext("2d"), g=ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,"#080200"); g.addColorStop(.55,"#180800"); g.addColorStop(1,"#2D1200");
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    for(let i=0;i<140;i++){ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,.3+Math.random()*2.5,0,Math.PI*2);ctx.fillStyle=`rgba(232,82,26,${Math.random()*.28})`;ctx.fill();}
    const rg=ctx.createRadialGradient(w*.68,h*.5,20,w*.68,h*.5,260);
    rg.addColorStop(0,"rgba(232,82,26,.3)"); rg.addColorStop(1,"transparent");
    ctx.fillStyle=rg; ctx.fillRect(0,0,w,h);
  }, []);
  return (
    <div style={{ position:"relative",width:"100%",height:"100%",overflow:"hidden" }}>
      <canvas ref={canvasRef} style={{ width:"100%",height:"100%",display:"block" }}/>
      <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.35) 55%,transparent 100%)" }}/>
      <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:"var(--s6) var(--s5) var(--s8)" }}>
        <div style={{ fontSize:".625rem",fontWeight:800,letterSpacing:".18em",textTransform:"uppercase",color:"var(--brand)",marginBottom:"var(--s3)" }}>{branchName||"KNFC"} · Fresh daily</div>
        <h1 style={{ fontFamily:"var(--ff-d)",fontSize:"clamp(2rem,6vw,3.5rem)",fontWeight:900,color:"#fff",letterSpacing:"-.03em",lineHeight:1.0,marginBottom:"var(--s4)" }}>Crispy.<br/>Hot.<br/>Perfect.</h1>
        <button onClick={()=>navigate("/menu/all")} style={{ padding:"12px 28px",background:"var(--brand)",border:"none",borderRadius:"var(--rf)",color:"#fff",fontSize:"1rem",fontWeight:800,cursor:"pointer",fontFamily:"var(--ff-b)",boxShadow:"0 8px 32px rgba(232,82,26,.45)",display:"inline-flex",alignItems:"center",gap:"8px" }}>
          Browse menu <Ic.Arrow/>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   OFFER STRIP — horizontal scroll cards
══════════════════════════════════════════════════════════════════════ */
function OfferStrip({ offers }) {
  const navigate = useNavigate();
  if (!offers.length) return null;
  return (
    <section style={{ marginBottom:"var(--s8)" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"var(--s4)" }}>
        <h2 style={{ fontFamily:"var(--ff-d)",fontSize:"1.25rem",fontWeight:800,letterSpacing:"-.02em",display:"flex",alignItems:"center",gap:"var(--s2)" }}>
          <span style={{ color:"var(--brand)",display:"flex",alignItems:"center" }}><Ic.Fire/></span> Today's offers
        </h2>
        <Link to="/offers" style={{ fontSize:".875rem",fontWeight:700,color:"var(--brand)",display:"flex",alignItems:"center",gap:"4px" }}>All <Ic.Arrow/></Link>
      </div>
      <div style={{ display:"flex",gap:"var(--s3)",overflowX:"auto",scrollbarWidth:"none",paddingBottom:"var(--s1)",WebkitOverflowScrolling:"touch" }} className="scroll-x">
        {offers.map(o => {
          const disc = o.discount_percentage ? `${Math.round(o.discount_percentage)}% OFF` : o.discount_flat ? `₹${Math.round(o.discount_flat)} OFF` : "DEAL";
          return (
            <div key={o.id} onClick={()=>navigate(`/offer/${o.id}`)}
              style={{ flexShrink:0,cursor:"pointer",borderRadius:"var(--r4)",overflow:"hidden",position:"relative",width:"clamp(200px,50vw,280px)",background:`linear-gradient(135deg,${o.gradient_from||"#1A0500"},${o.gradient_to||"#2D0A00"})`,border:"1px solid rgba(255,255,255,.06)",transition:"border-color var(--d2) var(--ease),box-shadow var(--d2) var(--ease)" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(232,82,26,.55)";e.currentTarget.style.boxShadow="0 0 0 1px rgba(232,82,26,.25),0 8px 28px rgba(232,82,26,.2)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.06)";e.currentTarget.style.boxShadow="none";}}>
              {o.image && <img loading="eager" src={o.image} alt={o.name} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.35 }}/>}
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.85),rgba(0,0,0,.1))" }}/>
              <div style={{ position:"relative",padding:"var(--s4)" }}>
                <div style={{ width:"34px",height:"34px",borderRadius:"var(--r2)",background:"rgba(232,82,26,.18)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--brand)" }}><Ic.Fire/></div>
                <div style={{ marginTop:"var(--s8)" }}>
                  <span style={{ fontSize:".625rem",fontWeight:800,background:"var(--gold)",color:"#000",padding:"2px 8px",borderRadius:"var(--rf)",letterSpacing:".06em" }}>{disc}</span>
                  <div style={{ fontFamily:"var(--ff-d)",fontSize:"1rem",fontWeight:800,color:"#fff",marginTop:"var(--s2)",lineHeight:1.2 }}>{o.name}</div>
                  {o.offer_price && (
                    <div style={{ display:"flex",alignItems:"baseline",gap:"var(--s1)",marginTop:"4px" }}>
                      <span style={{ fontFamily:"var(--ff-d)",fontSize:"1.25rem",fontWeight:900,color:"var(--gold)" }}>{formatPrice(o.offer_price)}</span>
                      {o.original_price && <span style={{ fontSize:".875rem",color:"rgba(255,255,255,.35)",textDecoration:"line-through" }}>{formatPrice(o.original_price)}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ADS PANEL — simple promotional strip between sections
══════════════════════════════════════════════════════════════════════ */
function AdsPanel({ siteConfig }) {
  const navigate = useNavigate();
  const adImage = siteConfig?.config?.ad_banner_url;
  const adLink  = siteConfig?.config?.ad_banner_link || "/menu/all";

  if (adImage) {
    return (
      <section className="hp-section" style={{ marginBottom:"var(--s6)" }}>
        <div onClick={()=>navigate(adLink)} style={{ borderRadius:"var(--r4)",overflow:"hidden",cursor:"pointer",position:"relative",aspectRatio:"16/5",background:"var(--bg2)",border:"1px solid var(--bd)" }}>
          <img src={adImage} alt="Promotion" style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
        </div>
      </section>
    );
  }

  return (
    <section className="hp-section" style={{ marginBottom:"var(--s6)" }}>
      <div onClick={()=>navigate("/menu/all")} style={{ borderRadius:"var(--r4)",overflow:"hidden",cursor:"pointer",background:"linear-gradient(135deg,#1A0500 0%,#3D0F00 50%,#1A0500 100%)",border:"1px solid rgba(232,82,26,.25)",padding:"var(--s5) var(--s6)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"var(--s4)" }}>
        <div>
          <div style={{ fontSize:".625rem",fontWeight:800,letterSpacing:".16em",textTransform:"uppercase",color:"var(--brand)",marginBottom:"4px" }}>Limited time</div>
          <div style={{ fontFamily:"var(--ff-d)",fontSize:"clamp(1.1rem,4vw,1.5rem)",fontWeight:900,color:"#fff",lineHeight:1.1 }}>Fresh & Crispy<br/><span style={{ color:"var(--brand)" }}>Every Day</span></div>
          <div style={{ fontSize:".8125rem",color:"rgba(255,255,255,.55)",marginTop:"6px" }}>Explore today's full menu →</div>
        </div>
        <div style={{ color:"var(--brand)",flexShrink:0 }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="17" r="4"/><line x1="11.5" y1="13.5" x2="19" y2="6"/><circle cx="20" cy="5" r="1.5"/></svg></div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CATEGORY SCROLL — horizontal scroll strip (mobile-first, Blinkit-style)
══════════════════════════════════════════════════════════════════════ */
function CategoryGrid({ categories }) {
  const navigate = useNavigate();
  if (!categories.length) return null;
  return (
    <section style={{ marginBottom:"var(--s8)" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"var(--s4)" }}>
        <h2 style={{ fontFamily:"var(--ff-d)",fontSize:"1.125rem",fontWeight:800,letterSpacing:"-.02em" }}>Categories</h2>
        <Link to="/menu/all" style={{ fontSize:".875rem",fontWeight:700,color:"var(--brand)",display:"flex",alignItems:"center",gap:"4px" }}>See all <Ic.Arrow/></Link>
      </div>

      <div className="cat-scroll-row">
        {categories.map(cat => (
          <div key={cat.id} className="cat-chip" onClick={()=>navigate(`/menu/category/${cat.slug}`)}>
            {/* Square image area — gradient or photo fills entire square */}
            <div className="cat-chip-img"
              style={{ background:`linear-gradient(145deg,${cat.gradient_from||"#1A0800"},${cat.gradient_to||"#2D1200"})` }}>
              {cat.image
                ? <img loading="lazy" src={cat.image} alt={cat.name}
                    style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }}/>
                : <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem" }}>
                    {cat.emoji || <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="17" r="4"/><line x1="11.5" y1="13.5" x2="19" y2="6"/><circle cx="20" cy="5" r="1.5"/></svg>}
                  </div>
              }
              {/* Item count badge */}
              {(cat.available_count||cat.item_count||0) > 0 && (
                <div style={{ position:"absolute",top:"6px",left:"6px",background:"rgba(0,0,0,.55)",backdropFilter:"blur(6px)",borderRadius:"var(--rf)",padding:"2px 6px",fontSize:".5625rem",fontWeight:700,color:"rgba(255,255,255,.9)",lineHeight:1.4 }}>
                  {cat.available_count||cat.item_count}
                </div>
              )}
            </div>
            {/* Name overlaid at bottom via CSS */}
            <div className="cat-chip-name">{cat.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PRODUCT CARD
══════════════════════════════════════════════════════════════════════ */
const ProductCard = memo(function ProductCard({ item, rank }) {
  const navigate  = useNavigate();
  const addItem   = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const updateQty = useCartStore(s => s.updateQuantity);
  const btnRef    = useRef(null);
  const [imgErr, setImgErr] = useState(false);
  const [added,  setAdded]  = useState(false);

  const inCart    = cartItems.find(i => i.id === item.id);
  const isOOS     = item.stock_status==="out" || !item.is_available;
  const dietary   = DIETARY_DOT[item.dietary_type] || DIETARY_DOT.non_veg;
  const hasDisc   = item.discounted_price && Number(item.discounted_price) < Number(item.price);
  const showPrice = hasDisc ? item.discounted_price : (item.offer_price||item.price);

  const handleAdd = e => {
    e.stopPropagation();
    if (isOOS) return;
    addItem(item); setAdded(true); setTimeout(()=>setAdded(false),1400);
    if (btnRef.current) gsap.timeline().to(btnRef.current,{scale:.75,duration:.08}).to(btnRef.current,{scale:1.22,duration:.16,ease:"back.out(3)"}).to(btnRef.current,{scale:1,duration:.12});
  };

  return (
    <div style={{ background:"var(--bgc)",border:"1px solid var(--bd)",borderRadius:"var(--r4)",overflow:"hidden",cursor:isOOS?"default":"pointer",opacity:isOOS?.55:1,display:"flex",flexDirection:"column",position:"relative",transition:"transform var(--d2) var(--ease),box-shadow var(--d2) var(--ease),border-color var(--d2) var(--ease)" }}
      onClick={()=>!isOOS&&navigate(`/menu/product/${item.slug}`)}
      onMouseEnter={e=>{if(!isOOS){e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="var(--sh-lg)";e.currentTarget.style.borderColor="var(--bd2)";}}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="var(--bd)";}}>
      {/* Image */}
      <div style={{ aspectRatio:"4/3",position:"relative",background:item.image_url&&!imgErr?"var(--bg3)":`linear-gradient(135deg,${item.gradient_from||"#1A0800"},${item.gradient_to||"#2D1200"})`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden" }}>
        {item.image_url&&!imgErr
          ? <img loading="lazy" src={item.image_url} alt={item.name} onError={()=>setImgErr(true)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }}/>
          : <div style={{ opacity:.6 }}><svg width="52" height="52" viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.5"><path d="M24 6C13 6 7 15 7 24s6 18 17 18c5 0 9-2 11-5 4-2 6-5 6-8 0-8-8-14-17-14v-9z" strokeLinejoin="round"/><path d="M24 16c5 0 9 4 9 8" strokeLinecap="round"/></svg></div>
        }
        <div title={dietary.label} style={{ position:"absolute",top:"8px",left:"8px",width:"16px",height:"16px",borderRadius:"3px",background:"#fff",border:`2px solid ${dietary.color}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 4px rgba(0,0,0,.35)" }}>
          <div style={{ width:"6px",height:"6px",borderRadius:"50%",background:dietary.color }}/>
        </div>
        <div style={{ position:"absolute",top:"8px",right:"8px",display:"flex",gap:"4px",zIndex:1 }}>
          {(item.is_bestseller||rank<=3) && <div style={{ background:"linear-gradient(135deg,#FF6B35,var(--brand))",color:"#fff",fontSize:".5625rem",fontWeight:800,padding:"3px 8px",borderRadius:"var(--rf)",letterSpacing:".06em",textTransform:"uppercase",display:"flex",alignItems:"center",gap:"3px",boxShadow:"0 2px 8px rgba(232,82,26,.5)" }}><Ic.Fire/> Best</div>}
          {item.is_new && <div style={{ background:"linear-gradient(135deg,#378ADD,#2563EB)",color:"#fff",fontSize:".5625rem",fontWeight:800,padding:"3px 8px",borderRadius:"var(--rf)",letterSpacing:".06em" }}>NEW</div>}
        </div>
        {hasDisc&&item.discount && <div style={{ position:"absolute",bottom:"7px",left:"7px",background:"var(--ok)",color:"#fff",fontSize:".5625rem",fontWeight:800,padding:"2px 7px",borderRadius:"var(--rf)",letterSpacing:".04em" }}>{item.discount}% OFF</div>}
        {item.stock_status==="low"&&!isOOS && <div style={{ position:"absolute",bottom:"7px",right:"7px",background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",color:"var(--warn)",fontSize:".5625rem",fontWeight:800,padding:"2px 8px",borderRadius:"var(--rf)",border:"1px solid rgba(239,159,39,.3)",letterSpacing:".04em" }}>{item.stock_remaining>0?`Only ${item.stock_remaining} left`:"Few left"}</div>}
        {isOOS && <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.5)",backdropFilter:"blur(3px)" }}><span style={{ fontSize:".75rem",fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.8)" }}>Sold out</span></div>}
      </div>
      {/* Body */}
      <div style={{ padding:"var(--s3)",flex:1,display:"flex",flexDirection:"column" }}>
        <div style={{ fontWeight:700,fontSize:".9375rem",color:"var(--t1)",lineHeight:1.3,marginBottom:"4px",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{item.name}</div>
        {(item.avg_rating>0||item.prep_time_display) && (
          <div style={{ display:"flex",alignItems:"center",gap:"var(--s2)",marginBottom:"6px" }}>
            {item.avg_rating>0 && <><div style={{ display:"flex",alignItems:"center",gap:"3px",color:"var(--gold)" }}><Ic.Star/><span style={{ fontSize:".75rem",color:"var(--t2)",fontWeight:500 }}>{Number(item.avg_rating).toFixed(1)}</span></div><span style={{ color:"var(--bd2)",fontSize:"10px" }}>·</span></>}
            <div style={{ display:"flex",alignItems:"center",gap:"3px",color:"var(--t2)" }}><Ic.Clock/><span style={{ fontSize:".75rem",color:"var(--t2)" }}>{item.prep_time_display||"8–15 min"}</span></div>
          </div>
        )}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"auto",paddingTop:"var(--s1)" }}>
          <div>
            <span className="price" style={{ fontSize:"1rem",letterSpacing:"-.01em" }}>{formatPrice(showPrice)}</span>
            {hasDisc && <span style={{ fontSize:".8125rem",color:"var(--t2)",textDecoration:"line-through",marginLeft:"5px" }}>{formatPrice(item.price)}</span>}
            {formatUnit(item.unit_quantity,item.measurement_unit) && <span style={{ fontSize:".6875rem",color:"var(--t2)",marginLeft:"5px",fontWeight:500 }}>/ {formatUnit(item.unit_quantity,item.measurement_unit)}</span>}
          </div>
          {!isOOS && (inCart
            ? <div style={{ display:"flex",alignItems:"center",gap:"3px" }} onClick={e=>e.stopPropagation()}>
                <button onClick={e=>{e.stopPropagation();updateQty(inCart._key,inCart.quantity-1);}} style={{ width:"28px",height:"28px",borderRadius:"var(--r2)",background:"var(--bg2)",border:"1px solid var(--bd)",fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--t1)",fontWeight:700 }}>−</button>
                <span style={{ fontSize:".875rem",fontWeight:800,minWidth:"18px",textAlign:"center" }}>{inCart.quantity}</span>
                <button ref={btnRef} onClick={e=>{e.stopPropagation();if(item.stock_remaining!=null&&inCart.quantity>=item.stock_remaining)return;updateQty(inCart._key,inCart.quantity+1);}} style={{ width:"28px",height:"28px",borderRadius:"var(--r2)",background:"var(--brand)",border:"none",fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 }}>+</button>
              </div>
            : <button ref={btnRef} onClick={handleAdd} style={{ width:"34px",height:"34px",borderRadius:"var(--r3)",background:added?"var(--ok)":"var(--brand)",border:"none",color:"#fff",fontSize:"20px",fontWeight:300,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:added?"0 4px 14px rgba(29,158,117,.4)":"0 4px 14px rgba(232,82,26,.38)",transition:"background .25s var(--ease),box-shadow .25s var(--ease)" }}>
                {added?<Ic.Check/>:"+"}
              </button>
          )}
        </div>
      </div>
    </div>
  );
});

/* ── Active order strip ───────────────────────────────────────────────────── */
function ActiveOrderStrip({ order }) {
  const navigate = useNavigate();
  if (!order) return null;
  const col = {placed:"var(--info)",confirmed:"var(--ok)",preparing:"var(--warn)",ready:"var(--brand)",completed:"var(--t3)"}[order.status]||"var(--info)";
  return (
    <div onClick={()=>navigate(`/order/track/${order.id}`)}
      style={{ display:"flex",alignItems:"center",gap:"var(--s3)",background:"var(--bg2)",border:`1px solid ${col}22`,borderLeft:`3px solid ${col}`,borderRadius:"var(--r3)",padding:"var(--s3) var(--s4)",marginBottom:"var(--s5)",cursor:"pointer",transition:"background var(--d1) var(--ease)" }}
      onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"}
      onMouseLeave={e=>e.currentTarget.style.background="var(--bg2)"}>
      <div style={{ width:"10px",height:"10px",borderRadius:"50%",background:col,boxShadow:`0 0 0 3px ${col}22`,animation:"pulse 2s infinite",flexShrink:0 }}/>
      <div style={{ flex:1,minWidth:0 }}>
        <span style={{ fontWeight:700,fontSize:".9375rem" }}>{order.token_number}</span>
        <span style={{ color:"var(--t2)",fontSize:".875rem" }}> — {order.status_display||order.status}</span>
      </div>
      <span style={{ fontSize:".8125rem",color:col,fontWeight:700,display:"flex",alignItems:"center",gap:"4px" }}>Track <Ic.Arrow/></span>
    </div>
  );
}

/* ── Loyalty bar ──────────────────────────────────────────────────────────── */
function LoyaltyBar({ points }) {
  const goal = 500, pct = Math.min((points/goal)*100,100);
  return (
    <div style={{ background:"linear-gradient(135deg,rgba(245,166,35,.08),rgba(232,82,26,.04))",border:"1px solid rgba(245,166,35,.18)",borderRadius:"var(--r4)",padding:"var(--s4)",marginBottom:"var(--s6)",display:"flex",alignItems:"center",gap:"var(--s4)" }}>
      <div style={{ width:"42px",height:"42px",borderRadius:"50%",background:"rgba(245,166,35,.12)",border:"1px solid rgba(245,166,35,.28)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"6px" }}>
          <span style={{ fontWeight:700,fontSize:".9375rem" }}><span style={{ fontFamily:"var(--ff-d)",fontSize:"1.25rem",color:"var(--gold)" }}>{points}</span> pts</span>
          <span style={{ fontSize:".75rem",color:"var(--t2)" }}>{goal-points} more for ₹50 off</span>
        </div>
        <div style={{ height:"5px",borderRadius:"var(--rf)",background:"var(--bg3)",overflow:"hidden" }}>
          <div style={{ height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,var(--gold),var(--brand))",borderRadius:"var(--rf)",transition:"width .8s var(--ease-s)" }}/>
        </div>
      </div>
    </div>
  );
}

/* ── Horizontal item strip (order again / favourites) ─────────────────────── */
function HorizontalItemStrip({ items, title, icon }) {
  const navigate = useNavigate();
  if (!items.length) return null;
  return (
    <section style={{ marginBottom:"var(--s8)" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"var(--s4)" }}>
        <h2 style={{ fontFamily:"var(--ff-d)",fontSize:"1.125rem",fontWeight:800,letterSpacing:"-.02em",display:"flex",alignItems:"center",gap:"var(--s2)" }}>{icon} {title}</h2>
      </div>
      <div className="scroll-x" style={{ gap:"var(--s3)",paddingBottom:"4px" }}>
        {items.map(item => (
          <div key={item.id} onClick={()=>navigate(`/menu/product/${item.slug}`)} style={{ flexShrink:0,cursor:"pointer",width:"clamp(120px,30vw,150px)" }}>
            <div style={{ aspectRatio:"1",borderRadius:"var(--r3)",marginBottom:"var(--s2)",background:item.image_url?"var(--bg3)":`linear-gradient(135deg,${item.gradient_from||"#1A0800"},${item.gradient_to||"#2D1200"})`,overflow:"hidden",position:"relative",border:"1px solid var(--bd)",transition:"transform var(--d1) var(--ease)" }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              {item.image_url
                ? <img loading="lazy" src={item.image_url} alt={item.name} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }}/>
                : <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",opacity:.5 }}><svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5"><path d="M24 6C13 6 7 15 7 24s6 18 17 18c5 0 9-2 11-5 4-2 6-5 6-8 0-8-8-14-17-14v-9z" strokeLinejoin="round"/><path d="M24 16c5 0 9 4 9 8" strokeLinecap="round"/></svg></div>
              }
            </div>
            <div style={{ fontSize:".8125rem",fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:"2px" }}>{item.name}</div>
            <div className="price" style={{ fontSize:".875rem" }}>{formatPrice(item.offer_price||item.price)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Cart bar ─────────────────────────────────────────────────────────────── */
function CartBar({ count, total }) {
  const navigate = useNavigate();
  if (!count) return null;
  return (
    <>
      <div className="cart-mob-bar" onClick={()=>navigate("/cart")} style={{ background:"linear-gradient(135deg,var(--brand),var(--brand-d))" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"var(--s2)" }}>
          <div style={{ width:"32px",height:"32px",borderRadius:"var(--r2)",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--ff-d)",fontWeight:900,color:"#fff",fontSize:".9375rem" }}>{count}</div>
          <div><div style={{ fontSize:".875rem",fontWeight:700,color:"#fff",lineHeight:1.2 }}>{count} item{count!==1?"s":""}</div><div style={{ fontSize:".75rem",color:"rgba(255,255,255,.75)" }}>{formatPrice(total)}</div></div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"6px",color:"#fff",fontSize:".9375rem",fontWeight:800 }}>View order <Ic.Arrow/></div>
      </div>
      <button className="cart-fab-btn" onClick={()=>navigate("/cart")} style={{ background:"var(--brand)",color:"#fff",boxShadow:"var(--sh-br)",border:"none",fontFamily:"var(--ff-b)",fontSize:".9375rem",fontWeight:700 }}>
        <Ic.Cart/> {count} · {formatPrice(total)} <Ic.Arrow/>
      </button>
    </>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function HomeSkeleton() {
  return (
    <AppLayout>
      <div className="skel" style={{ height:"clamp(300px,55vw,520px)",borderRadius:"var(--r4)",marginBottom:"var(--s8)" }}/>
      <div style={{ display:"flex",gap:"var(--s3)",marginBottom:"var(--s8)",overflow:"hidden" }}>
        {[1,2,3,4].map(i=><div key={i} className="skel" style={{ flexShrink:0,width:"150px",height:"200px",borderRadius:"var(--r4)" }}/>)}
      </div>
      <div className="product-grid">{[1,2,3,4,5,6].map(i=><div key={i} className="skel" style={{ height:"230px",borderRadius:"var(--r4)" }}/>)}</div>
    </AppLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const { user }       = useAuth();
  const { branchName, branchId } = useBranch();
  const cartCount      = useCartStore(s => s.items.reduce((a,i)=>a+i.quantity,0));
  const cartTotal      = useCartStore(s => s.items.reduce((a,i)=>a+i.lineTotal,0));
  const pageRef        = useRef(null);

  const [loading,      setLoading]      = useState(true);
  const [offers,       setOffers]       = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [featured,     setFeatured]     = useState([]);
  const [orderAgain,   setOrderAgain]   = useState([]);
  const [favourites,   setFavourites]   = useState([]);
  const [activeOrder,  setActiveOrder]  = useState(null);
  const [shopOpen,     setShopOpen]     = useState(null);
  const [nextOpenAt,   setNextOpenAt]   = useState(null);
  const [sectionItems, setSectionItems] = useState({});
  const [siteConfig,   setSiteConfig]   = useState(null);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    (async () => {
      try {
        const [oR,cR,fR] = await Promise.all([
          getOffers().catch(()=>({data:{offers:[]}})),
          getCategories().catch(()=>({data:{categories:[]}})),
          getFeatured().catch(()=>({data:{featured:[],order_again:[]}})),
        ]);
        setOffers(oR.data.offers||[]);
        setCategories(cR.data.categories||[]);
        setFeatured(fR.data.featured||[]);
        setOrderAgain(fR.data.order_again||[]);
        if (user) {
          const fav = await getFavourites().catch(()=>({data:{favourites:[]}}));
          setFavourites(fav.data.favourites||[]);
        }
        try { const s=localStorage.getItem("active_order"); if(s) setActiveOrder(JSON.parse(s)); } catch {}
        const flags = ["is_hotdeals","is_chicken","is_snacks","is_cold_drinks"];
        const sec = {};
        await Promise.all(flags.map(async f => {
          try { const r=await getItems({[f]:"true",page_size:10}); if((r.data.items||[]).length>0) sec[f]=r.data.items; } catch {}
        }));
        setSectionItems(sec);
        try { const {default:ax}=await import("../../api/axiosClient"); const cfg=await ax.get("/branches/config/"); setSiteConfig(cfg.data); } catch {}
      } finally { setLoading(false); }
    })();
  }, [user, branchId]);

  useEffect(() => {
    const bid = localStorage.getItem("branch_id");
    if (!bid) return;
    import("../../api/axiosClient").then(({default:ax}) => {
      ax.get(`/branches/${bid}/hours/`)
        .then(r => { if(r.data.success){setShopOpen(r.data.is_open_now??true);setNextOpenAt(r.data.next_open_at||null);} })
        .catch(()=>setShopOpen(true));
    });
  }, []);

  useEffect(() => {
    if (loading||!pageRef.current) return;
    const els = pageRef.current.querySelectorAll(".hp-section");
    gsap.fromTo(els,{y:22,opacity:0},{y:0,opacity:1,stagger:.08,duration:.5,ease:"power2.out",delay:.05});
  }, [loading]);

  if (loading) return <HomeSkeleton/>;

  const userPoints = user?.loyalty_points||0;
  const hour = new Date().getHours();

  return (
    <AppLayout>
      <div ref={pageRef} style={{ paddingBottom:"var(--s8)" }}>

        {/* 1. HERO — flush against header */}
        <section className="hp-section hp-hero-section" style={{ marginBottom:"var(--s8)",marginLeft:"calc(-1 * var(--s4))",marginRight:"calc(-1 * var(--s4))" }}>
          <div style={{ position:"relative",height:"clamp(300px,55vw,520px)",overflow:"hidden" }} className="hp-hero">
            {offers.length>0 ? <HeroCarousel offers={offers}/> : <FallbackHero branchName={branchName}/>}
            {branchName && (
              <div style={{ position:"absolute",top:"var(--s4)",left:"var(--s4)",zIndex:5,display:"flex",alignItems:"center",gap:"6px",background:"rgba(0,0,0,.55)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,.12)",borderRadius:"var(--rf)",padding:"5px 12px" }}>
                <Ic.Loc/>
                <span style={{ fontSize:".8125rem",fontWeight:700,color:"rgba(255,255,255,.9)" }}>{branchName}</span>
                {shopOpen!==null && (
                  <span style={{ marginLeft:"4px",display:"inline-flex",alignItems:"center",gap:"4px",fontSize:".6875rem",fontWeight:700,color:shopOpen?"#4ade80":"#f87171" }}>
                    <span style={{ width:"6px",height:"6px",borderRadius:"50%",background:shopOpen?"#4ade80":"#f87171",display:"inline-block" }}/>
                    {shopOpen?"Open":"Closed"}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 2. CLOSED BANNER */}
        {shopOpen===false && (
          <section className="hp-section" style={{ marginBottom:"var(--s5)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"var(--s3)",padding:"var(--s4) var(--s5)",background:"linear-gradient(135deg,rgba(226,75,74,.12),rgba(226,75,74,.06))",border:"1px solid rgba(226,75,74,.25)",borderRadius:"var(--r4)",borderLeft:"4px solid var(--err)" }}>
              <div style={{ color:"var(--err)",flexShrink:0 }}><Ic.Lock/></div>
              <div>
                <div style={{ fontWeight:800,fontSize:".9375rem",color:"var(--err)",marginBottom:"2px" }}>{branchName||"This branch"} is currently closed</div>
                <div style={{ fontSize:".8125rem",color:"var(--t2)" }}>
                  {nextOpenAt ? <>Opens {formatNextOpen(nextOpenAt)} · You can browse the menu in the meantime.</> : <>You can browse the menu but orders are not accepted right now.</>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. ACTIVE ORDER */}
        {activeOrder && <section className="hp-section"><ActiveOrderStrip order={activeOrder}/></section>}

        {/* Loyalty bar hidden per #7 — visible in /account instead */}

        {/* 5. GREETING */}
        <section className="hp-section" style={{ marginBottom:"var(--s6)" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div>
              <h1 style={{ fontFamily:"var(--ff-d)",fontSize:"clamp(1.375rem,4vw,2rem)",color:"var(--t1)",fontWeight:900,letterSpacing:"-.02em",lineHeight:1.1 }}>
                {user?.name
                  ? <span style={{ display:"flex",alignItems:"center",gap:"var(--s2)" }}>Hey, {user.name.split(" ")[0]} <span style={{ color:"var(--gold)",display:"flex" }}><Ic.Wave/></span></span>
                  : <>What are you <span style={{ color:"var(--brand)" }}>craving?</span></>
                }
              </h1>
              <p style={{ fontSize:".9375rem",color:"var(--t2)",marginTop:"4px" }}>
                {hour<12?"Good morning":hour<17?"Good afternoon":"Good evening"} · {categories.length} categories available
              </p>
            </div>
            {user && (
              <Link to="/account" style={{ textDecoration:"none" }}>
                <div style={{ width:"44px",height:"44px",borderRadius:"50%",background:"linear-gradient(135deg,var(--brand),var(--brand-d))",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--ff-d)",fontWeight:900,color:"#fff",fontSize:"1.125rem",boxShadow:"var(--sh-br)",flexShrink:0 }}>
                  {(user.name||"U")[0].toUpperCase()}
                </div>
              </Link>
            )}
          </div>
        </section>

        {/* 6. TODAY'S OFFERS */}
        {offers.length>0 && <section className="hp-section"><OfferStrip offers={offers}/></section>}

        {/* 7. POPULAR PICKS */}
        {featured.length>0 && (
          <section className="hp-section" style={{ marginBottom:"var(--s8)" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"var(--s4)" }}>
              <h2 style={{ color:"var(--t1)",fontFamily:"var(--ff-d)",fontSize:"1.125rem",fontWeight:800,letterSpacing:"-.02em",display:"flex",alignItems:"center",gap:"var(--s2)" }}>
                <span style={{ color:"var(--brand)",display:"flex",alignItems:"center" }}><Ic.Fire/></span> Popular picks
              </h2>
              <Link to="/menu/all" style={{ fontSize:".875rem",fontWeight:700,color:"var(--brand)",display:"flex",alignItems:"center",gap:"4px" }}>All <Ic.Arrow/></Link>
            </div>
            <div className="home-section-row">
              {featured.slice(0,10).map((item,i)=><ProductCard key={item.id} item={item} rank={i+1}/>)}
            </div>
          </section>
        )}

        {/* ADS PANEL — between Popular Picks and Categories */}
        <AdsPanel siteConfig={siteConfig}/>

        {/* 9. CATEGORIES GRID */}
        {categories.length>0 && <section className="hp-section"><CategoryGrid categories={categories}/></section>}

        {/* 10. ORDER AGAIN */}
        {orderAgain.length>0 && (
          <section className="hp-section">
            <HorizontalItemStrip items={orderAgain} title="Order again" icon={<span style={{ color:"var(--brand)",display:"flex",alignItems:"center" }}><Ic.Redo/></span>}/>
          </section>
        )}

        {/* 11. FAVOURITES */}
        {favourites.length>0 && (
          <section className="hp-section">
            <HorizontalItemStrip items={favourites} title="Your favourites" icon={<span style={{ color:"var(--err)",display:"flex",alignItems:"center" }}><Ic.Heart/></span>}/>
          </section>
        )}

        {/* 12. THEMED SECTIONS */}
        {THEMED_SECTIONS.map(({flag,label,accent,filterParam}) => {
          const items = sectionItems[flag];
          if (!items?.length) return null;
          return (
            <section key={flag} className="hp-section" style={{ marginBottom:"var(--s8)" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"var(--s4)" }}>
                <h2 style={{ fontFamily:"var(--ff-d)",fontSize:"1.125rem",fontWeight:800,letterSpacing:"-.02em",display:"flex",alignItems:"center",gap:"var(--s2)",color:"var(--t1)" }}>
                  <span style={{ color:accent,display:"flex",alignItems:"center" }}>
                    {flag==="is_hotdeals"    && <Ic.Fire/>}
                    {flag==="is_chicken"    && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" strokeLinejoin="round"/></svg>}
                    {flag==="is_snacks"     && <Ic.Star/>}
                    {flag==="is_cold_drinks"&& <Ic.Cup/>}
                  </span>
                  {label}
                </h2>
                <Link to={`/menu/all?filter=${filterParam}`} style={{ fontSize:".875rem",fontWeight:700,color:accent,display:"flex",alignItems:"center",gap:"4px" }}>All <Ic.Arrow/></Link>
              </div>
              <div className="home-section-row">
                {items.slice(0,10).map((item,i)=><ProductCard key={item.id} item={item} rank={i+1}/>)}
              </div>
            </section>
          );
        })}

        {/* GOOGLE REVIEW */}
        <section className="hp-section" style={{ marginBottom:"var(--s8)" }}>
          <GoogleReviewBanner/>
        </section>

        {/* EMPTY STATE */}
        {!loading && featured.length===0 && categories.length===0 && (
          <section className="hp-section" style={{ textAlign:"center",padding:"var(--s12) var(--s4)" }}>
            <div style={{ display:"flex",justifyContent:"center",marginBottom:"var(--s4)",opacity:.4,color:"var(--t2)" }}><Ic.Chick/></div>
            <h2 style={{ fontFamily:"var(--ff-d)",fontSize:"1.5rem",fontWeight:800,marginBottom:"var(--s3)" }}>Menu loading…</h2>
            <p style={{ fontSize:".9375rem",color:"var(--t2)",marginBottom:"var(--s5)" }}>The menu for {branchName||"this branch"} is being set up. Check back soon!</p>
            <button onClick={()=>window.location.reload()} className="btn btn-p btn-lg">Refresh →</button>
          </section>
        )}
      </div>

      <CartBar count={cartCount} total={cartTotal}/>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .hp-hero{border-radius:0}
        @media(min-width:640px){.hp-hero{border-radius:var(--r4)}}
        .scroll-x::-webkit-scrollbar{display:none}
        .hp-hero-section{margin-top:calc(-1 * var(--s4))}
        @media(min-width:1024px){.hp-hero-section{margin-top:calc(-1 * var(--s8))}}
      `}</style>
    </AppLayout>
  );
}
