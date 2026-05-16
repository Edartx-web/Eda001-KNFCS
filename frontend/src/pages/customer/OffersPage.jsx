/**
 * OffersPage.jsx — Phase 4
 * Design: Amazon Deals × editorial dark
 * - Full-bleed offer cards with cinematic images
 * - Live countdown timers with urgency colors
 * - Savings highlight + "X% claimed" scarcity bar
 * - Filter: All / Active / Expiring soon
 * - Staggered GSAP entrance
 */
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { gsap } from "gsap";
import AppLayout from "../../components/layout/AppLayout";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import useBranch from "../../hooks/useBranch";
import axiosClient from "../../api/axiosClient";
import { formatPrice, formatCountdown } from "../../utils/format";
import ScratchCoupon from "../../components/common/ScratchCoupon";
import SpinWheel     from "../../components/common/SpinWheel";
import useCartStore  from "../../store/cartStore";

const BID = () => localStorage.getItem("branch_id") || "";

/* ─── Live countdown ────────────────────────────────────────────────── */
function Countdown({ endAt, compact }) {
  // null / undefined endAt = lifetime offer — show ♾ instead of countdown
  if (!endAt) {
    if (compact) return (
      <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", padding:"4px 10px", background:"rgba(29,158,117,.85)", backdropFilter:"blur(8px)", borderRadius:"var(--rf)", border:"1px solid rgba(29,158,117,.3)" }}>
        <span style={{ fontSize:".75rem", fontWeight:800, color:"#fff" }}>♾ Lifetime</span>
      </div>
    );
    return (
      <div style={{ display:"flex", alignItems:"center", gap:"6px", color:"var(--ok)", fontWeight:700, fontSize:".875rem" }}>
        <span>♾</span> Lifetime offer — never expires
      </div>
    );
  }
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(endAt) - Date.now()) / 1000)));
  useEffect(() => {
    if (!secs) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [!!secs]);

  if (!secs) return <span style={{ fontSize:".75rem", fontWeight:800, color:"var(--err)", background:"var(--err-t)", padding:"3px 8px", borderRadius:"var(--rf)", border:"1px solid rgba(226,75,74,.2)" }}>Expired</span>;

  const { h, m, s } = formatCountdown(secs);
  const isUrgent = secs < 3600; // < 1 hour

  if (compact) return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", padding:"4px 10px", background:isUrgent?"rgba(226,75,74,.9)":"rgba(0,0,0,.55)", backdropFilter:"blur(8px)", borderRadius:"var(--rf)", border:isUrgent?"1px solid rgba(226,75,74,.3)":"1px solid rgba(255,255,255,.1)" }}>
      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke={isUrgent?"#fff":"rgba(255,255,255,.7)"} strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>
      <span style={{ fontFamily:"var(--ff-d)", fontSize:".75rem", fontWeight:800, color:"#fff", fontVariantNumeric:"tabular-nums", letterSpacing:".02em" }}>
        {h}:{m}:{s}
      </span>
    </div>
  );

  return (
    <div style={{ display:"flex", gap:"var(--s1)", alignItems:"center" }}>
      {[{v:h,l:"hr"},{v:m,l:"min"},{v:s,l:"sec"}].map(({v,l}) => (
        <div key={l} style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:900, lineHeight:1, color:isUrgent?"var(--err)":"var(--t1)", minWidth:"42px", padding:"var(--s2)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)" }}>{v}</div>
          <div style={{ fontSize:".5625rem", color:"var(--t4)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", marginTop:"3px" }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Offer card ────────────────────────────────────────────────────── */
function OfferCard({ offer, index }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof gsap === "undefined") return;
    gsap.fromTo(ref.current,
      { opacity:0, y:28, scale:.96 },
      { opacity:1, y:0, scale:1, duration:.45, ease:"power2.out", delay:index * .06 }
    );
  }, []);

  const disc = offer.discount_percentage
    ? `${Math.round(offer.discount_percentage)}% OFF`
    : offer.discount_flat ? `₹${Math.round(offer.discount_flat)} OFF`
    : "DEAL";

  const savings = offer.original_price && offer.offer_price
    ? Math.round(Number(offer.original_price) - Number(offer.offer_price))
    : null;

  const now = Date.now();
  const isLifetime = !offer.end_at;
  const end = isLifetime ? null : new Date(offer.end_at);
  const totalSecs  = (!isLifetime && offer.start_at) ? (end - new Date(offer.start_at)) / 1000 : 0;
  const remainSecs = isLifetime ? Infinity : Math.max(0, (end - now) / 1000);
  const claimedPct = totalSecs > 0 ? Math.min(100, Math.round((1 - remainSecs / totalSecs) * 100)) : 0;
  const isUrgent   = !isLifetime && remainSecs < 3600 && remainSecs > 0;

  const claimed = offer.user_can_redeem === false;

  return (
    <article ref={ref}
      onClick={() => !claimed && navigate(`/offer/${offer.id}`)}
      style={{ borderRadius:"var(--r5)", overflow:"hidden", cursor:claimed?"default":"pointer", background:`linear-gradient(135deg,${offer.gradient_from||"#1A0500"},${offer.gradient_to||"#2D0A00"})`, border:"1px solid rgba(255,255,255,.06)", position:"relative", transition:"transform var(--d2) var(--ease), box-shadow var(--d2) var(--ease)", opacity:claimed?.72:1 }}
      onMouseEnter={e => { if (!claimed) { e.currentTarget.style.transform="translateY(-6px)"; e.currentTarget.style.boxShadow="0 24px 48px rgba(0,0,0,.4)"; } }}
      onMouseLeave={e => { if (!claimed) { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; } }}>

      {/* Background image */}
      {offer.image && !imgErr && (
        <img loading="lazy" src={typeof offer.image === "string" ? offer.image : ""} alt={offer.name}
          onError={() => setImgErr(true)}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:.35 }}/>
      )}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.35) 55%, transparent 100%)" }}/>

      {/* Claimed ribbon */}
      {claimed && (
        <div style={{ position:"absolute", top:0, left:0, right:0, background:"rgba(0,0,0,.55)", backdropFilter:"blur(4px)", padding:"5px var(--s4)", fontSize:".625rem", fontWeight:800, color:"rgba(255,255,255,.7)", textTransform:"uppercase", letterSpacing:".1em", textAlign:"center", zIndex:2 }}>
          ✓ Already claimed — one use per customer
        </div>
      )}

      {/* Urgency ribbon */}
      {isUrgent && !claimed && (
        <div style={{ position:"absolute", top:0, left:0, right:0, background:"var(--err)", padding:"5px var(--s4)", fontSize:".625rem", fontWeight:800, color:"#fff", textTransform:"uppercase", letterSpacing:".1em", textAlign:"center" }}>
          Ending very soon
        </div>
      )}

      <div style={{ position:"relative", padding:isUrgent?"var(--s6) var(--s5) var(--s5)":"var(--s5)" }}>
        {/* Top row */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s8)" }}>
          <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap" }}>
            <span style={{ background:"var(--gold)", color:"#000", fontSize:".75rem", fontWeight:900, padding:"4px 12px", borderRadius:"var(--rf)", letterSpacing:".04em" }}>
              {disc}
            </span>
            {offer.offer_type && offer.offer_type !== "percentage" && offer.offer_type !== "flat" && (
              <span style={{ background:"rgba(255,255,255,.12)", color:"#fff", fontSize:".6875rem", fontWeight:700, padding:"4px 10px", borderRadius:"var(--rf)", backdropFilter:"blur(8px)", textTransform:"capitalize" }}>
                {offer.offer_type === "bogo" ? "Buy 1 Get 1" : offer.offer_type === "combo" ? "Combo" : "Special"}
              </span>
            )}
          </div>
          {offer.end_at && <Countdown endAt={offer.end_at} compact />}
        </div>

        {/* Emoji */}
        <div style={{ fontSize:"2.5rem", marginBottom:"var(--s2)", lineHeight:1 }}>{offer.emoji ? <span style={{fontSize:"2.5rem",lineHeight:1}}>{offer.emoji}</span> : <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>}</div>

        {/* Name + tagline */}
        <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.25rem,3.5vw,1.75rem)", fontWeight:900, color:"#fff", letterSpacing:"-.02em", lineHeight:1.1, marginBottom:"var(--s2)" }}>
          {offer.name}
        </h2>
        {offer.tagline && (
          <p style={{ fontSize:".9375rem", color:"rgba(255,255,255,.6)", lineHeight:1.55, marginBottom:"var(--s4)", maxWidth:"380px" }}>
            {offer.tagline}
          </p>
        )}

        {/* Price row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
          <div>
            {offer.offer_price && (
              <div style={{ display:"flex", alignItems:"baseline", gap:"var(--s2)" }}>
                <span style={{ fontFamily:"var(--ff-d)", fontSize:"2rem", fontWeight:900, color:"var(--gold)", letterSpacing:"-.02em", lineHeight:1 }}>
                  {formatPrice(offer.offer_price)}
                </span>
                {offer.original_price && (
                  <span style={{ fontSize:"1rem", color:"rgba(255,255,255,.38)", textDecoration:"line-through" }}>
                    {formatPrice(offer.original_price)}
                  </span>
                )}
              </div>
            )}
            {savings > 0 && (
              <div style={{ fontSize:".8125rem", color:"var(--ok)", fontWeight:700, marginTop:"3px", display:"flex", alignItems:"center", gap:"4px" }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
                Save ₹{savings}
              </div>
            )}
          </div>
          {claimed ? (
            <div style={{ background:"rgba(255,255,255,.1)", color:"rgba(255,255,255,.55)", padding:"10px 22px", borderRadius:"var(--rf)", fontSize:".875rem", fontWeight:800, display:"flex", alignItems:"center", gap:"6px", flexShrink:0, border:"1px solid rgba(255,255,255,.15)" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
              Already claimed
            </div>
          ) : (
            <div style={{ background:"var(--brand)", color:"#fff", padding:"10px 22px", borderRadius:"var(--rf)", fontSize:".9375rem", fontWeight:800, boxShadow:"var(--sh-br)", display:"flex", alignItems:"center", gap:"6px", flexShrink:0 }}>
              Grab deal
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round"/></svg>
            </div>
          )}
        </div>

        {/* Scarcity bar */}
        {claimedPct > 10 && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
              <span style={{ fontSize:".6875rem", color:"rgba(255,255,255,.5)", fontWeight:600 }}>Claimed</span>
              <span style={{ fontSize:".6875rem", color:"rgba(255,255,255,.7)", fontWeight:700 }}>{claimedPct}%</span>
            </div>
            <div style={{ height:"4px", borderRadius:"2px", background:"rgba(255,255,255,.12)", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${claimedPct}%`, background:claimedPct > 70 ? "var(--err)" : claimedPct > 40 ? "var(--warn)" : "var(--ok)", borderRadius:"2px", transition:"width .6s var(--ease-s)" }}/>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function OffersPage() {
  const { branchName, branchId, hasBranch } = useBranch();
  const navigate = useNavigate();
  const { loading: pageLoading } = usePageLoader(800);
  const [offers,  setOffers]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,    setFilter]   = useState("all");
  const [showGames, setShowGames]= useState(false);
  const [gameTab,   setGameTab]  = useState("spin");
  const [wonPrize,  setWonPrize] = useState(null);
  const [siteConfig, setSiteConfig] = useState(null);
  const [spinOpen,   setSpinOpen]   = useState(false);
  const setSpinDiscount = useCartStore(s => s.setSpinDiscount);

  useEffect(() => {
    axiosClient.get("/branches/config/")
      .then(r => setSiteConfig(r.data.config))
      .catch(() => {});
  }, []);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!hasBranch) return;
    axiosClient.get(`/offers/?branch_id=${branchId || BID()}`)
      .then(r => setOffers(r.data.offers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasBranch, branchId]);

  useEffect(() => {
    if (!loading && headerRef.current && typeof gsap !== "undefined") {
      gsap.from(headerRef.current, { y:-16, opacity:0, duration:.5, ease:"power3.out" });
    }
  }, [loading]);

  if (pageLoading) return <KNCLoader visible label="Loading offers…"/>;

  const now = Date.now();
  const filtered = offers.filter(o => {
    if (filter === "active")  return !o.end_at || new Date(o.end_at) > now;
    if (filter === "urgent")  return o.end_at && (new Date(o.end_at) - now) < 3600000 && new Date(o.end_at) > now;
    return true;
  });

  const FILTERS = [
    { key:"all",    label:"All offers",    count:offers.length },
    { key:"active", label:"Active",        count:offers.filter(o => !o.end_at || new Date(o.end_at) > now).length },
    { key:"urgent", label:"Ending soon", count:offers.filter(o => { if(!o.end_at) return false; const d=(new Date(o.end_at)-now); return d < 3600000 && d > 0; }).length },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div ref={headerRef} style={{ marginBottom:"var(--s8)" }}>
        <div style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"var(--brand)", marginBottom:"var(--s2)", display:"flex", alignItems:"center", gap:"var(--s2)" }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {branchName}
        </div>
        <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(2rem,5vw,3.25rem)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.0, marginBottom:"var(--s3)" }}>
          Today's<br/>
          <span style={{ color:"var(--brand)", display:"inline-flex", alignItems:"center", gap:"8px" }}>deals <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--brand)"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg></span>
        </h1>
        <p style={{ fontSize:"1rem", color:"var(--t2)", lineHeight:1.6 }}>
          Limited-time offers — grab them before they're gone.
        </p>
      </div>

      {/* Filter pills */}
      <div style={{ display:"flex", gap:"var(--s2)", marginBottom:"var(--s6)", flexWrap:"wrap" }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding:"8px 16px", borderRadius:"var(--rf)", border:`1.5px solid ${filter===f.key?"var(--brand)":"var(--bd)"}`, background:filter===f.key?"var(--brand-tint)":"var(--bg2)", color:filter===f.key?"var(--brand)":"var(--t2)", fontSize:".875rem", fontWeight:filter===f.key?700:500, cursor:"pointer", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)", display:"flex", alignItems:"center", gap:"6px" }}>
            {f.label}
            <span style={{ fontSize:".75rem", fontWeight:700, padding:"1px 6px", borderRadius:"var(--rf)", background:filter===f.key?"rgba(232,82,26,.15)":"var(--bg3)", color:filter===f.key?"var(--brand)":"var(--t4)" }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Lucky Games — only shown when spin or scratch is enabled in SiteConfig */}
      {(siteConfig?.spin_enabled || siteConfig?.scratch_enabled) && (
      <div style={{ marginBottom:"var(--s8)", background:"linear-gradient(135deg,rgba(232,82,26,.06),rgba(37,99,235,.04))", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden" }}>
        {/* Section header */}
        <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:"1.0625rem", color:"var(--t1)" }}>Lucky Games</div>
            <div style={{ fontSize:".8125rem", color:"var(--t2)", marginTop:"2px" }}>Spin the wheel or scratch a card for an instant discount!</div>
          </div>
          <button onClick={() => setShowGames(g => !g)}
            style={{ padding:"7px 14px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--ff-b)" }}>
            {showGames ? "Hide" : "Play now"}
          </button>
        </div>

        {showGames && (
          <div style={{ padding:"var(--s6) var(--s5)" }}>
            {/* Game tab switcher */}
            <div style={{ display:"flex", gap:"var(--s2)", marginBottom:"var(--s6)", justifyContent:"center" }}>
              {[
                siteConfig?.spin_enabled    && ["spin",    "Spin Wheel"],
                siteConfig?.scratch_enabled && ["scratch", "Scratch Card"],
              ].filter(Boolean).map(([k,l]) => (
                <button key={k} onClick={() => setGameTab(k)}
                  style={{ padding:"9px 20px", borderRadius:"var(--rf)", border:`1.5px solid ${gameTab===k?"var(--brand)":"var(--bd)"}`, background:gameTab===k?"var(--brand-tint)":"var(--bg2)", color:gameTab===k?"var(--brand)":"var(--t2)", fontWeight:gameTab===k?700:500, fontSize:".875rem", cursor:"pointer", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Game area */}
            <div style={{ display:"flex", justifyContent:"center" }}>
              {gameTab === "spin" && siteConfig?.spin_enabled ? (
                <button onClick={() => setSpinOpen(true)} style={{
                  padding:"20px 52px", borderRadius:40, border:"none",
                  background:"linear-gradient(135deg,#ff8c5a,#E8521A)",
                  color:"#fff", fontWeight:900, fontSize:"1.125rem",
                  cursor:"pointer", fontFamily:"system-ui,sans-serif",
                  boxShadow:"0 8px 28px rgba(232,82,26,.5)",
                  letterSpacing:".04em",
                  display:"flex", alignItems:"center", gap:12,
                  transition:"transform .2s, box-shadow .2s",
                }}>
                  🎡 Launch Spin Wheel
                </button>
              ) : gameTab === "scratch" && siteConfig?.scratch_enabled ? (
                <ScratchCoupon
                  code={siteConfig.scratch_coupon_code || "KNFC15"}
                  discount={(siteConfig.scratch_discount_pct || 15) + "% OFF"}
                  onRevealed={code => {
                    import("../../components/common/NotificationSystem").then(m => m.notify("Coupon revealed! Use code " + code, "success"));
                  }}/>
              ) : null}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"var(--s5)" }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"320px", borderRadius:"var(--r5)" }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"var(--s16) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r5)", border:"1px dashed var(--bd)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"var(--s4)" }}><svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:800, marginBottom:"var(--s3)" }}>
            {filter === "urgent" ? "No urgent deals right now" : "No active offers"}
          </h2>
          <p style={{ color:"var(--t2)", marginBottom:"var(--s5)" }}>
            {filter !== "all" ? "Try viewing all offers." : "Check back soon — new deals drop regularly!"}
          </p>
          {filter !== "all"
            ? <button onClick={() => setFilter("all")} className="btn btn-p btn-lg">View all offers</button>
            : <button onClick={() => navigate("/menu")} className="btn btn-p btn-lg">← Back to menu</button>
          }
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"var(--s5)", paddingBottom:"var(--s12)" }}>
          {filtered.map((offer, i) => <OfferCard key={offer.id} offer={offer} index={i}/>)}
        </div>
      )}
      {/* Fullscreen SpinWheel overlay */}
      {siteConfig?.spin_enabled && (
        <SpinWheel
          open={spinOpen}
          onClose={() => setSpinOpen(false)}
          prizes={siteConfig.spin_prizes?.length ? siteConfig.spin_prizes : undefined}
          spinsLeft={siteConfig.spin_max_uses || 1}
          onWin={prize => {
            if (prize.pct > 0) setSpinDiscount(prize.pct);
            if (prize.label !== "Try Again") {
              setWonPrize(prize.label);
              import("../../components/common/NotificationSystem").then(m => m.notify("You won: " + prize.label + "!", "success"));
            }
          }}
        />
      )}
    </AppLayout>
  );
}
