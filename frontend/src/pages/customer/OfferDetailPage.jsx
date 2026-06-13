/**
 * OfferDetailPage.jsx
 * Route: /offer/:id
 *
 * Sections:
 *   - Video/image hero with GSAP entrance
 *   - Live countdown (HH:MM:SS)
 *   - Discount badge + savings amount
 *   - Included items carousel
 *   - "Grab this deal" CTA → adds items to cart
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { gsap }                       from "gsap";
import AppLayout                      from "../../components/layout/AppLayout";
import KNCLoader from "../../components/common/KNCLoader";
import useCartStore                   from "../../store/cartStore";
import { getOfferDetail }             from "../../api/orders";
import { formatPrice, formatCountdown } from "../../utils/format";
import axiosClient                    from "../../api/axiosClient";
import { useAuth }                    from "../../context/AuthContext";

/* ── Icons ─────────────────────────────────────────────────────────── */
const Ic = {
  Back:  () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Tag:   () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>,
  Check: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Cart:  () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  Arrow: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

/* ── Countdown unit ─────────────────────────────────────────────────── */
function CountUnit({ value, label }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.75rem,5vw,2.5rem)", fontWeight:900, color:"#fff", letterSpacing:"-.02em", lineHeight:1, fontVariantNumeric:"tabular-nums", minWidth:"2.5ch" }}>
        {String(value).padStart(2,"0")}
      </div>
      <div style={{ fontSize:".625rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.55)", marginTop:"4px" }}>
        {label}
      </div>
    </div>
  );
}
function Colon() {
  return <div style={{ fontFamily:"var(--ff-d)", fontSize:"2rem", fontWeight:900, color:"rgba(255,255,255,.4)", alignSelf:"flex-start", paddingTop:"4px", lineHeight:1 }}>:</div>;
}

export default function OfferDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const heroRef   = useRef(null);
  const videoRef  = useRef(null);
  const ctaRef    = useRef(null);
  const [offer,        setOffer]        = useState(null);
  const [secs,         setSecs]         = useState(0);
  const [added,        setAdded]        = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [shared,       setShared]       = useState(false);
  const [refLink,      setRefLink]      = useState(null);   // { code, share_url, whatsapp_share }
  const [refStats,     setRefStats]     = useState(null);   // { visits, signups, rewards_earned }
  const [refCopied,    setRefCopied]    = useState(false);
  const [refLoading,   setRefLoading]   = useState(false);
  const { user } = useAuth();
  const addItem = useCartStore(s => s.addItem);
  const setOffer_ = useCartStore(s => s.setOffer);

  /* Load offer */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getOfferDetail(id);
        const o   = res.data.offer;
        setOffer(o);
        setSecs(o.seconds_remaining ?? null); // null = lifetime
      } catch { navigate("/menu"); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  /* Countdown ticker — skip for lifetime offers (secs === null) */
  useEffect(() => {
    if (secs === null || !secs) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secs === null ? 'lifetime' : !!secs]);

  /* GSAP entrance */
  useEffect(() => {
    if (loading || !heroRef.current || typeof gsap === "undefined") return;
    gsap.from(heroRef.current, { opacity:0, y:-20, duration:.6, ease:"power2.out" });
    if (ctaRef.current) gsap.from(ctaRef.current, { opacity:0, y:20, duration:.5, ease:"power2.out", delay:.35 });
  }, [loading]);

  /* Fetch referral link + stats for referral-type offers (logged-in customers) */
  useEffect(() => {
    if (!offer || offer.offer_type !== "referral" || !user || user.role !== "customer") return;
    setRefLoading(true);
    Promise.all([
      axiosClient.get(`/offers/referral/link/?offer_id=${offer.id}`).catch(() => null),
      axiosClient.get("/offers/referral/stats/").catch(() => null),
    ]).then(([linkRes, statsRes]) => {
      if (linkRes?.data?.success) {
        const code = linkRes.data.link?.code;
        /* Always build share_url from the actual frontend origin so it works
           regardless of what SITE_URL is configured on the backend */
        const shareUrl = `${window.location.origin}/refer/${code}`;
        const waText   = encodeURIComponent(
          `🍗 Hey! I'm at KNFC Fried Chicken — best crispy chicken ever!\n\nSign up with my link and get a special reward on your first order.\n\n👉 ${shareUrl}`
        );
        setRefLink({
          code,
          share_url:      shareUrl,
          whatsapp_share: `https://wa.me/?text=${waText}`,
        });
      }
      if (statsRes?.data?.success) {
        const myLink = statsRes.data.referrals?.find(r => r.offer_id === offer.id);
        if (myLink) setRefStats(myLink);
      }
    }).finally(() => setRefLoading(false));
  }, [offer?.id, offer?.offer_type, user?.id]);

  /* Video play/pause */
  useEffect(() => {
    if (videoRef.current) videoRef.current.play().catch(()=>{});
  }, [offer?.video_url]);

  const handleGrabDeal = () => {
    if (!offer) return;
    // Add all offer items to cart
    (offer.offer_items || []).forEach(oi => {
      if (oi.menu_item) addItem(oi.menu_item, oi.quantity);
    });
    // If offer applies to specific items, add first
    if (offer.applies_to?.length) {
      addItem(offer.applies_to[0]);
    }
    // Apply offer discount
    if (offer.id) setOffer_(offer.id);

    setAdded(true);
    if (typeof gsap !== "undefined" && ctaRef.current) {
      gsap.timeline()
        .to(ctaRef.current, { scale:.95, duration:.1 })
        .to(ctaRef.current, { scale:1.04, duration:.18, ease:"back.out(2.5)" })
        .to(ctaRef.current, { scale:1, duration:.1 });
    }
    setTimeout(() => navigate("/cart"), 800);
  };

  const handleWhatsAppShare = () => {
    const url  = window.location.href;
    const disc = offer.discount_percentage
      ? `${Number(offer.discount_percentage).toFixed(0)}% OFF`
      : offer.discount_flat
        ? `₹${Number(offer.discount_flat).toFixed(0)} OFF`
        : "";
    const text = `${offer.emoji || "🔥"} *${offer.name}*${disc ? ` — *${disc}*` : ""}`
      + (offer.tagline ? `\n${offer.tagline}` : "")
      + (offer.coupon_code ? `\nCode: *${offer.coupon_code}*` : "")
      + `\n\nView offer: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const handleShare = async () => {
    const url  = window.location.href;
    const text = `${offer.name} — ${discount} at KNFC!${offer.tagline ? " " + offer.tagline : ""}`;
    if (navigator.share) {
      try {
        const shareData = { title: offer.name, text, url };
        if (offer.image && typeof offer.image === "string") shareData.url = url;
        await navigator.share(shareData);
      } catch {}
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

  const isLifetime  = secs === null;
  const { h, m, s } = isLifetime ? { h:'∞', m:'∞', s:'∞' } : formatCountdown(secs || 0);
  const expired     = !isLifetime && secs === 0;

  if (loading || !offer) return <KNCLoader visible label="Loading offer…" />;
  // inject spin keyframe once
  if (typeof document !== "undefined" && !document.getElementById("od-spin-css")) {
    const s = document.createElement("style"); s.id = "od-spin-css";
    s.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(s);
  }

  const discount = offer.discount_percentage
    ? `${Math.round(offer.discount_percentage)}% OFF`
    : offer.discount_flat
    ? `₹${Math.round(offer.discount_flat)} OFF`
    : "DEAL";

  return (
    <AppLayout>
      <div style={{ maxWidth:"680px", margin:"0 auto" }}>

        {/* Back */}
        <button onClick={() => navigate(-1)} className="btn btn-g" style={{ marginBottom:"var(--s4)", gap:"var(--s2)" }}>
          <Ic.Back /> Back
        </button>

        {/* Hero media */}
        <div ref={heroRef} style={{ borderRadius:"var(--r5)", overflow:"hidden", marginBottom:"var(--s5)", position:"relative", aspectRatio:"16/9", maxHeight:"380px", background:`linear-gradient(135deg,${offer.gradient_from||"#1A0500"},${offer.gradient_to||"#2D0A00"})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {offer.video_url ? (
            <video ref={videoRef} src={offer.video_url} poster={offer.thumbnail_url || offer.image_url || ""} muted loop playsInline style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
          ) : offer.image_url ? (
            <img loading="lazy" src={offer.image_url} alt={offer.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
          ) : (
            <div style={{ textAlign:"center" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"var(--s3)" }}><svg width="56" height="56" viewBox="0 0 24 24" fill="rgba(255,255,255,.6)"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg></div>
            </div>
          )}
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,.85) 0%, transparent 55%)" }} />

          {/* Offer badge */}
          <div style={{ position:"absolute", top:"var(--s4)", left:"var(--s4)", display:"flex", gap:"var(--s2)" }}>
            <span style={{ background:"var(--gold)", color:"#000", fontSize:".875rem", fontWeight:800, padding:"5px 16px", borderRadius:"var(--rf)", letterSpacing:".04em" }}>
              {discount}
            </span>
            {expired && (
              <span className="badge badge-err">Expired</span>
            )}
          </div>

          {/* Bottom text */}
          <div style={{ position:"absolute", bottom:"var(--s5)", left:"var(--s5)", right:"var(--s5)" }}>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.375rem,4vw,2rem)", fontWeight:800, color:"#fff", letterSpacing:"-.02em", lineHeight:1.15, marginBottom:"var(--s2)" }}>
              {offer.name}
            </div>
            {offer.tagline && <p style={{ fontSize:".9375rem", color:"rgba(255,255,255,.7)" }}>{offer.tagline}</p>}
          </div>
        </div>

        {/* Price + countdown row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"var(--s4)", alignItems:"center", marginBottom:"var(--s5)" }}>
          {/* Price */}
          {offer.offer_price && (
            <div>
              <div style={{ display:"flex", alignItems:"baseline", gap:"var(--s2)", flexWrap:"wrap" }}>
                <span className="price" style={{ fontSize:"2.25rem" }}>{formatPrice(offer.offer_price)}</span>
                {offer.original_price && (
                  <span className="price-old" style={{ fontSize:"1.125rem" }}>{formatPrice(offer.original_price)}</span>
                )}
              </div>
              {offer.savings_amount > 0 && (
                <div className="price-save" style={{ fontSize:".9375rem", marginTop:"4px" }}>
                  You save {formatPrice(offer.savings_amount)}
                </div>
              )}
            </div>
          )}

          {/* Countdown */}
          {secs > 0 && (
            <div style={{ background:"linear-gradient(135deg,var(--brand),var(--brand-d))", borderRadius:"var(--r4)", padding:"var(--s4) var(--s5)", boxShadow:"var(--sh-br)", textAlign:"center" }}>
              <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.6)", marginBottom:"var(--s2)" }}>
                Ends in
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
                <CountUnit value={h} label="hrs" />
                <Colon />
                <CountUnit value={m} label="min" />
                <Colon />
                <CountUnit value={s} label="sec" />
              </div>
            </div>
          )}
        </div>

        {/* What's included */}
        {offer.offer_items?.length > 0 && (
          <div style={{ marginBottom:"var(--s6)" }}>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:700, marginBottom:"var(--s3)" }}>
              What's included
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
              {offer.offer_items.map(oi => (
                <div key={oi.id} style={{ display:"flex", alignItems:"center", gap:"var(--s3)", padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)" }}>
                  <div style={{ width:"40px", height:"40px", borderRadius:"var(--r2)", overflow:"hidden", background:"linear-gradient(135deg,#1A0800,#2D1200)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {oi.menu_item_image
                      ? <img loading="lazy" src={oi.menu_item_image} alt={oi.menu_item_name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
                    }
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:".9375rem", fontWeight:600 }}>{oi.menu_item_name}</div>
                    {oi.notes && <div style={{ fontSize:".8125rem", color:"var(--t2)" }}>{oi.notes}</div>}
                  </div>
                  <div style={{ fontFamily:"var(--ff-d)", fontWeight:700, color:"var(--brand)" }}>
                    × {oi.quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applies to items */}
        {offer.applies_to?.length > 0 && (
          <div style={{ marginBottom:"var(--s6)" }}>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:700, marginBottom:"var(--s3)" }}>
              Discount applies to
            </div>
            <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap" }}>
              {offer.applies_to.map(item => (
                <div key={item.id} style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"var(--s2) var(--s3)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--rf)", fontSize:".875rem" }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terms */}
        <div style={{ padding:"var(--s4)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", marginBottom:"var(--s6)", fontSize:".8125rem", color:"var(--t2)" }}>
          <div style={{ fontWeight:700, color:"var(--t2)", marginBottom:"var(--s2)" }}>Terms & conditions</div>
          <ul style={{ paddingLeft:"var(--s4)", display:"flex", flexDirection:"column", gap:"3px" }}>
            <li>Valid at this branch only</li>
            <li>One offer per order</li>
            <li>Cannot be combined with other discounts</li>
            {expired && <li style={{ color:"var(--err)", fontWeight:600, display:"flex", alignItems:"center", gap:"5px" }}><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg> This offer has expired</li>}
          </ul>
        </div>

        {/* ── REFERRAL OFFER — professional Share & Earn UI ────────── */}
        {offer.offer_type === "referral" ? (
          <div>

            {/* ── Hero reward banner ── */}
            <div style={{ position:"relative", borderRadius:"var(--r5)", overflow:"hidden", marginBottom:"var(--s5)", background:"linear-gradient(135deg,#0D1F0F 0%,#0E2210 40%,#132814 100%)", border:"1px solid rgba(37,211,102,.18)", padding:"var(--s6) var(--s5)" }}>
              {/* Background glow */}
              <div style={{ position:"absolute", top:"-40px", right:"-40px", width:"200px", height:"200px", borderRadius:"50%", background:"radial-gradient(circle,rgba(37,211,102,.18) 0%,transparent 70%)", pointerEvents:"none" }}/>
              <div style={{ position:"relative" }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(37,211,102,.12)", border:"1px solid rgba(37,211,102,.25)", borderRadius:"var(--rf)", padding:"5px 14px", fontSize:".75rem", fontWeight:700, color:"#25D366", letterSpacing:".06em", textTransform:"uppercase", marginBottom:"var(--s3)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Share &amp; Earn
                </div>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.5rem,5vw,2rem)", fontWeight:900, color:"#fff", lineHeight:1.1, marginBottom:"var(--s2)" }}>
                  Invite friends,{" "}
                  {offer.referral_reward_value
                    ? <span style={{ color:"#4ADE80" }}>earn ₹{Math.round(offer.referral_reward_value)}</span>
                    : <span style={{ color:"#4ADE80" }}>earn rewards</span>
                  }
                </div>
                <p style={{ fontSize:".9rem", color:"rgba(255,255,255,.55)", margin:0 }}>
                  Share your link · friend joins · reward hits your WhatsApp
                </p>
              </div>
            </div>

            {/* ── How it works — 3 steps ── */}
            <div style={{ marginBottom:"var(--s5)" }}>
              <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"var(--s3)" }}>How it works</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr auto 1fr", gap:"var(--s2)", alignItems:"center" }}>
                {[
                  { step:"1", icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, label:"Share your link", sub:"via WhatsApp or any app" },
                  { step:"2", icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, label:"Friend signs up", sub:"using your unique link" },
                  { step:"3", icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>, label:"You earn reward", sub: offer.referral_reward_value ? `₹${Math.round(offer.referral_reward_value)} coupon on WhatsApp` : "Coupon sent via WhatsApp" },
                ].map((s, i) => (
                  <React.Fragment key={s.step}>
                    <div style={{ textAlign:"center", padding:"var(--s4) var(--s2)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)" }}>
                      <div style={{ width:44, height:44, borderRadius:"50%", background:i===2?"linear-gradient(135deg,#25D366,#1DA851)":"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s2)", color:i===2?"#fff":"var(--brand)" }}>
                        {s.icon}
                      </div>
                      <div style={{ fontSize:".8125rem", fontWeight:700, color:"var(--t1)", marginBottom:3 }}>{s.label}</div>
                      <div style={{ fontSize:".6875rem", color:"var(--t3)", lineHeight:1.4 }}>{s.sub}</div>
                    </div>
                    {i < 2 && (
                      <div style={{ textAlign:"center", color:"var(--t4)", fontSize:"1.25rem", fontWeight:300 }}>→</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ── Auth gate / Link / Loading ── */}
            {!user || user.role !== "customer" ? (
              /* Not logged in */
              <div style={{ padding:"var(--s6)", background:"var(--bg2)", border:"1.5px dashed var(--bd)", borderRadius:"var(--r4)", textAlign:"center", marginBottom:"var(--s5)" }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s3)" }}>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round"/></svg>
                </div>
                <div style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:"1.0625rem", marginBottom:8 }}>Login to get your link</div>
                <p style={{ fontSize:".875rem", color:"var(--t3)", marginBottom:"var(--s4)", lineHeight:1.6 }}>
                  Sign in to receive a personal referral link that tracks your sign-ups and rewards.
                </p>
                <Link to="/login/customer" className="btn btn-p btn-lg" style={{ display:"inline-flex", gap:8 }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Login / Sign up
                </Link>
              </div>
            ) : refLoading ? (
              /* Generating link */
              <div style={{ padding:"var(--s6)", textAlign:"center", color:"var(--t3)", fontSize:".9rem", background:"var(--bg2)", borderRadius:"var(--r4)", marginBottom:"var(--s5)" }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ animation:"spin 1s linear infinite", display:"inline-block", marginBottom:10 }}><path d="M21 12a9 9 0 11-3-6.7" strokeLinecap="round"/></svg>
                <div>Generating your referral link…</div>
              </div>
            ) : refLink ? (
              <>
                {/* ── Your referral link ── */}
                <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s4)", marginBottom:"var(--s4)" }}>
                  <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:"var(--s3)", display:"flex", alignItems:"center", gap:6 }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    Your unique referral link
                  </div>
                  <div style={{ display:"flex", gap:"var(--s2)", alignItems:"stretch" }}>
                    <div style={{ flex:1, padding:"12px 14px", background:"var(--bgc)", border:"1.5px solid var(--bd)", borderRadius:"var(--r3)", fontSize:".875rem", fontFamily:"monospace", fontWeight:600, color:"var(--t1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {refLink.share_url}
                    </div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(refLink.share_url).then(() => { setRefCopied(true); setTimeout(() => setRefCopied(false), 2400); })}
                      style={{ flexShrink:0, padding:"12px 18px", borderRadius:"var(--r3)", border:"none", background:refCopied ? "var(--ok)" : "var(--brand)", color:"#fff", fontWeight:700, fontSize:".875rem", cursor:"pointer", fontFamily:"var(--ff-b)", transition:"all .22s", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
                      {refCopied ? <><Ic.Check /> Copied!</> : <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Link</>}
                    </button>
                  </div>
                </div>

                {/* ── Share buttons ── */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s2)", marginBottom:"var(--s5)" }}>
                  <a href={refLink.whatsapp_share} target="_blank" rel="noopener noreferrer"
                    style={{ padding:"14px", borderRadius:"var(--r3)", background:"#25D366", color:"#fff", fontWeight:800, fontSize:".9375rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, textDecoration:"none", boxShadow:"0 4px 16px rgba(37,211,102,.4)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Send on WhatsApp
                  </a>
                  <button onClick={handleShare}
                    style={{ padding:"14px", borderRadius:"var(--r3)", border:"1.5px solid var(--bd)", background:"var(--bg2)", color:shared ? "var(--ok)" : "var(--t1)", fontWeight:700, fontSize:".9375rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"var(--ff-b)", transition:"all .22s" }}>
                    {shared
                      ? <><Ic.Check /> Link Copied!</>
                      : <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share Link</>
                    }
                  </button>
                </div>

                {/* ── Stats ── */}
                {refStats && (
                  <>
                    <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"var(--s3)" }}>Your progress</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"var(--s2)", marginBottom:"var(--s5)" }}>
                      {[
                        { label:"Visits",  value: refStats.visits         ?? 0, icon:"👁", color:"var(--info)"  },
                        { label:"Joined",  value: refStats.signups        ?? 0, icon:"👥", color:"var(--ok)"    },
                        { label:"Rewards", value: refStats.rewards_earned ?? 0, icon:"🎁", color:"#F5C843"      },
                      ].map(s => (
                        <div key={s.label} style={{ padding:"var(--s4) var(--s2)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", textAlign:"center" }}>
                          <div style={{ fontSize:"1.25rem", lineHeight:1, marginBottom:6 }}>{s.icon}</div>
                          <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.75rem", fontWeight:900, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                          <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Pending reward notice */}
                    {(refStats.pending_rewards ?? 0) > 0 && (
                      <div style={{ display:"flex", gap:"var(--s3)", alignItems:"flex-start", padding:"var(--s4)", background:"rgba(245,200,67,.06)", border:"1px solid rgba(245,200,67,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s4)" }}>
                        <div style={{ fontSize:"1.25rem", lineHeight:1, flexShrink:0 }}>⏳</div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:".875rem", color:"#F5C843", marginBottom:3 }}>Reward pending</div>
                          <div style={{ fontSize:".8125rem", color:"var(--t2)", lineHeight:1.55 }}>
                            <strong>{refStats.pending_rewards}</strong> friend{refStats.pending_rewards > 1 ? "s have" : " has"} signed up using your link. Your reward coupon will be sent to your WhatsApp the moment they place their first order.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Earned reward coupons */}
                    {refStats.reward_coupons?.length > 0 && (
                      <div>
                        <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--ok)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"var(--s3)", display:"flex", alignItems:"center", gap:6 }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
                          Your earned coupon{refStats.reward_coupons.length > 1 ? "s" : ""}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                          {refStats.reward_coupons.map((code, i) => (
                            <div key={i} style={{ display:"flex", gap:"var(--s2)", alignItems:"stretch", background:"linear-gradient(135deg,rgba(29,158,117,.06),rgba(29,158,117,.02))", border:"1.5px solid rgba(29,158,117,.25)", borderRadius:"var(--r3)", overflow:"hidden" }}>
                              <div style={{ flex:1, padding:"14px 16px" }}>
                                <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--ok)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>Coupon Code</div>
                                <div style={{ fontFamily:"monospace", fontSize:"1.125rem", fontWeight:900, color:"var(--ok)", letterSpacing:".1em" }}>{code}</div>
                              </div>
                              <button
                                onClick={() => navigator.clipboard?.writeText(code).then(() => { setRefCopied(i); setTimeout(() => setRefCopied(false), 2400); })}
                                style={{ padding:"0 20px", border:"none", borderLeft:"1px solid rgba(29,158,117,.2)", background:refCopied===i?"var(--ok)":"rgba(29,158,117,.08)", color:refCopied===i?"#fff":"var(--ok)", fontWeight:700, fontSize:".875rem", cursor:"pointer", fontFamily:"var(--ff-b)", transition:"all .22s", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                                {refCopied === i ? <><Ic.Check /> Copied</> : "Copy"}
                              </button>
                            </div>
                          ))}
                          <p style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:4, lineHeight:1.55 }}>
                            Enter the code at checkout to apply your reward discount.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div style={{ padding:"var(--s4)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.2)", borderRadius:"var(--r3)", fontSize:".875rem", color:"var(--err)", marginBottom:"var(--s4)" }}>
                Could not load your referral link. Please refresh the page.
              </div>
            )}
          </div>
        ) : (
          /* ── NON-REFERRAL: standard CTA + share ─────────────────── */
          <>
            <div ref={ctaRef}>
              {!expired ? (
                <button onClick={handleGrabDeal} className="btn btn-p btn-xl btn-full"
                  style={{ background: added ? "var(--ok)" : "linear-gradient(135deg,var(--gold),var(--gold-d))", borderColor:"transparent", color:added?"#fff":"#000", fontSize:"1.0625rem", fontWeight:800, transition:"background .35s ease" }}>
                  {added
                    ? <><Ic.Check /> Added to cart!</>
                    : <><Ic.Cart /> Grab this deal → {offer.offer_price ? formatPrice(offer.offer_price) : ""}</>
                  }
                </button>
              ) : (
                <div style={{ textAlign:"center", padding:"var(--s5)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--r4)" }}>
                  <p style={{ fontSize:".9375rem", fontWeight:700, color:"var(--err)", marginBottom:"var(--s3)" }}>
                    This offer has expired
                  </p>
                  <button onClick={() => navigate("/menu")} className="btn btn-p">Browse current offers →</button>
                </div>
              )}
            </div>

            {/* Share row */}
            <div style={{ display:"flex", gap:"var(--s2)", marginTop:"var(--s3)" }}>
              <button onClick={handleShare}
                style={{ flex:1, padding:"var(--s3)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", color:shared?"var(--ok)":"var(--t2)", fontWeight:600, fontSize:".875rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}>
                {shared
                  ? <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg> Copied!</>
                  : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share</>
                }
              </button>
              <button onClick={handleWhatsAppShare}
                style={{ flex:1, padding:"var(--s3)", background:"#25D366", border:"none", borderRadius:"var(--r3)", color:"#fff", fontWeight:700, fontSize:".875rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", fontFamily:"var(--ff-b)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
            </div>
          </>
        )}

        {/* Branch + validity + conditions */}
        <div style={{ textAlign:"center", marginTop:"var(--s4)", fontSize:".8125rem", color:"var(--t2)" }}>
          {isLifetime ? "♾ Lifetime offer — never expires" : offer.end_at && `Valid until ${new Date(offer.end_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}`}
        </div>
        {(offer.min_order_value || offer.first_order_only || offer.max_redemptions_per_user > 0) && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:"var(--s2)", justifyContent:"center", marginTop:"var(--s3)" }}>
            {offer.min_order_value && (
              <span style={{ fontSize:".75rem", fontWeight:700, padding:"4px 12px", borderRadius:"var(--rf)", background:"var(--info-t)", color:"var(--info)", border:"1px solid rgba(55,138,221,.2)" }}>
                Min. order ₹{Math.round(offer.min_order_value)}
              </span>
            )}
            {offer.first_order_only && (
              <span style={{ fontSize:".75rem", fontWeight:700, padding:"4px 12px", borderRadius:"var(--rf)", background:"var(--warn-t)", color:"var(--warn)", border:"1px solid rgba(239,159,39,.2)" }}>
                First order only
              </span>
            )}
            {offer.max_redemptions_per_user > 0 && (
              <span style={{ fontSize:".75rem", fontWeight:700, padding:"4px 12px", borderRadius:"var(--rf)", background:"var(--bg2)", color:"var(--t2)", border:"1px solid var(--bd)" }}>
                Max {offer.max_redemptions_per_user}× per customer
              </span>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
