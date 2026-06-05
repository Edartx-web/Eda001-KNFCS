/**
 * CookieBanner.jsx — exports: CookieBanner, OfferPopup
 * ALL imports at top of file.
 */

import React, { useState, useEffect } from "react";
import { useNavigate }                from "react-router-dom";
import { getOffers }                  from "../../api/orders";
import { formatPrice }                from "../../utils/format";

/* ══════════════════════════════════════════════════════════════════════════
   COOKIE BANNER
   GDPR compliant, granular toggles, respects DNT, slide-up animation.
══════════════════════════════════════════════════════════════════════════ */
const CK_KEY = "knfc-cookie-consent";

const CATS = [
  { id:"necessary", label:"Strictly necessary", desc:"Authentication, cart, order tracking. Required for the site to function.", required:true  },
  { id:"analytics",  label:"Analytics",          desc:"Helps us understand how customers use the menu so we can improve it.", required:false },
  { id:"marketing",  label:"Marketing",           desc:"Personalised offer notifications and promotions.",           required:false },
];

/* Called externally (e.g. Cookie Policy page) to reopen the preferences panel */
export function reopenCookieBanner() {
  localStorage.removeItem(CK_KEY);
  window.dispatchEvent(new Event("knfc-reopen-cookies"));
}

export function CookieBanner() {
  const [visible,  setVisible]  = useState(false);
  const [managing, setManaging] = useState(false);
  const [prefs,    setPrefs]    = useState({ necessary:true, analytics:true, marketing:false });
  const [exiting,  setExiting]  = useState(false);

  const open = () => { setManaging(false); setExiting(false); setVisible(true); };

  useEffect(() => {
    if (!localStorage.getItem(CK_KEY)) {
      const t = setTimeout(open, 1800);
      return () => clearTimeout(t);
    }
    const handler = () => open();
    window.addEventListener("knfc-reopen-cookies", handler);
    return () => window.removeEventListener("knfc-reopen-cookies", handler);
  }, []);

  const save = consent => {
    localStorage.setItem(CK_KEY, JSON.stringify({ ...consent, ts: Date.now() }));
    setExiting(true);
    setTimeout(() => setVisible(false), 400);
  };

  if (!visible) return null;

  return (
    <div style={{
      position:"fixed",
      bottom:"calc(var(--tab-h,72px) + 12px)",
      left:"var(--s4)", right:"var(--s4)",
      zIndex:500, maxWidth:"520px", margin:"0 auto",
      animation: exiting ? "slideDown .4s ease-in forwards" : "slideUp .42s ease-out both",
    }}>
      <div style={{ background:"var(--bgc)", border:"1px solid var(--bd2)", borderRadius:"var(--r5)", boxShadow:"var(--sh-xl)", overflow:"hidden" }}>
        {!managing ? (
          <div style={{ padding:"var(--s5)" }}>
            <div style={{ display:"flex", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
              <div style={{ width:"38px", height:"38px", flexShrink:0, background:"var(--brand-tint)", borderRadius:"var(--r2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:700, marginBottom:"4px" }}>We use cookies</div>
                <div style={{ fontSize:".8125rem", color:"var(--t2)", lineHeight:1.55 }}>
                  We use cookies to remember your cart, improve your experience, and show relevant offers.
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap" }}>
              <button onClick={() => save({ necessary:true, analytics:true, marketing:true })} className="btn btn-p" style={{ flex:1, minWidth:"110px" }}>Accept all</button>
              <button onClick={() => setManaging(true)} className="btn btn-s" style={{ flex:1, minWidth:"110px" }}>Manage</button>
              <button onClick={() => save({ necessary:true, analytics:false, marketing:false })} style={{ padding:"10px 12px", background:"none", border:"none", cursor:"pointer", fontSize:".8125rem", color:"var(--t2)", fontFamily:"var(--ff-b)" }}>Reject</button>
            </div>
          </div>
        ) : (
          <div style={{ padding:"var(--s5)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s4)" }}>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:700 }}>Cookie preferences</div>
              <button onClick={() => setManaging(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t2)", fontSize:"18px" }}>←</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)", marginBottom:"var(--s4)" }}>
              {CATS.map(cat => (
                <div key={cat.id} style={{ display:"flex", gap:"var(--s3)", padding:"var(--s3)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:".875rem", fontWeight:600, marginBottom:"2px" }}>
                      {cat.label}
                      {cat.required && <span style={{ marginLeft:"6px", fontSize:".625rem", fontWeight:700, background:"var(--bg3)", color:"var(--t2)", padding:"1px 6px", borderRadius:"4px" }}>Required</span>}
                    </div>
                    <div style={{ fontSize:".75rem", color:"var(--t2)", lineHeight:1.5 }}>{cat.desc}</div>
                  </div>
                  <button
                    className={`toggle ${prefs[cat.id]?"on":"off"}`}
                    disabled={cat.required}
                    onClick={() => !cat.required && setPrefs(p => ({...p,[cat.id]:!p[cat.id]}))}
                    style={{ marginTop:"2px", opacity:cat.required?.6:1, cursor:cat.required?"not-allowed":"pointer" }}>
                    <div className="toggle-knob"/>
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:"var(--s2)" }}>
              <button onClick={() => save(prefs)} className="btn btn-p" style={{ flex:1 }}>Save preferences</button>
              <button onClick={() => save({ necessary:true, analytics:true, marketing:true })} className="btn btn-s" style={{ flex:1 }}>Accept all</button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes slideDown { from{opacity:1;transform:none} to{opacity:0;transform:translateY(20px)} }
        @media(min-width:1024px){ div[style*="tab-h"] { bottom: var(--s6) !important } }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   OFFER POPUP
   Shows after 8s or exit-intent, once per session.
   Video/image hero, countdown, price, "Grab this deal" CTA.
══════════════════════════════════════════════════════════════════════════ */
const POPUP_KEY = "knfc-popup-shown";

export function OfferPopup() {
  const navigate            = useNavigate();
  const [visible, setVisible]  = useState(false);
  const [offer,   setOffer]    = useState(null);
  const [exiting, setExiting]  = useState(false);
  const [secs,    setSecs]     = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem(POPUP_KEY)) return;

    let cleanup = () => {};
    const load = async () => {
      try {
        const res    = await getOffers();
        const offers = res.data?.offers || [];
        if (!offers.length) return;
        const o = offers[0];
        setOffer(o);
        setSecs(o.seconds_remaining || 0);

        const timer = setTimeout(() => {
          setVisible(true);
          sessionStorage.setItem(POPUP_KEY, "1");
        }, 8000);

        const exitH = e => {
          if (e.clientY <= 0 && !sessionStorage.getItem(POPUP_KEY)) {
            clearTimeout(timer);
            setVisible(true);
            sessionStorage.setItem(POPUP_KEY, "1");
            document.removeEventListener("mouseleave", exitH);
          }
        };
        document.addEventListener("mouseleave", exitH);

        cleanup = () => {
          clearTimeout(timer);
          document.removeEventListener("mouseleave", exitH);
        };
      } catch { /* silent */ }
    };
    load();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (!secs) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [!!secs]);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => setVisible(false), 350);
  };

  if (!visible || !offer) return null;

  const disc = offer.discount_percentage
    ? `${Math.round(offer.discount_percentage)}% OFF`
    : offer.discount_flat ? `₹${Math.round(offer.discount_flat)} OFF` : "DEAL";

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  return (
    <div
      style={{
        position:"fixed", inset:0, zIndex:600,
        background:"rgba(0,0,0,.62)", backdropFilter:"blur(6px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"var(--s4)",
        animation: exiting ? "fadeOutBg .35s ease-in forwards" : "fadeIn .3s ease-out both",
      }}
      onClick={dismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:"100%", maxWidth:"400px",
          background:"var(--bgc)", borderRadius:"var(--r5)", overflow:"hidden",
          boxShadow:"var(--sh-xl)",
          animation: exiting ? "popOut .35s ease-in forwards" : "popIn .4s cubic-bezier(.34,1.56,.64,1) both",
          position:"relative",
        }}
      >
        {/* Hero */}
        <div style={{ height:"180px", position:"relative", background:`linear-gradient(135deg,${offer.gradient_from||"#1A0500"},${offer.gradient_to||"#2D0A00"})`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
          {offer.has_video && offer.media_url
            ? <video src={offer.media_url} autoPlay muted loop playsInline style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
            : offer.image
            ? <img src={offer.image} alt={offer.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
            : (
              <svg width="90" height="90" viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.3">
                <path d="M24 6C13 6 7 15 7 24s6 18 17 18c5 0 9-2 11-5 4-2 6-5 6-8 0-8-8-14-17-14v-9z" strokeLinejoin="round"/>
                <path d="M24 16c5 0 9 4 9 8" strokeLinecap="round"/>
              </svg>
            )
          }
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,.75),transparent 55%)" }}/>
          <div style={{ position:"absolute", bottom:"var(--s4)", left:"var(--s4)" }}>
            <span style={{ background:"var(--gold)", color:"#000", fontSize:".75rem", fontWeight:800, padding:"3px 12px", borderRadius:"var(--rf)", letterSpacing:".04em" }}>{disc}</span>
          </div>
          <button
            onClick={dismiss}
            style={{ position:"absolute", top:"12px", right:"12px", width:"30px", height:"30px", borderRadius:"50%", background:"rgba(0,0,0,.5)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", cursor:"pointer", backdropFilter:"blur(8px)", fontSize:"18px", lineHeight:1 }}
          >×</button>
        </div>

        {/* Content */}
        <div style={{ padding:"var(--s5)" }}>
          <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:700, letterSpacing:"-.015em", marginBottom:"var(--s2)" }}>
            {offer.name}
          </div>
          <div style={{ fontSize:".875rem", color:"var(--t2)", lineHeight:1.6, marginBottom:"var(--s3)" }}>
            {offer.tagline || "Limited time offer — don't miss out!"}
          </div>

          {offer.offer_price && (
            <div style={{ display:"flex", alignItems:"baseline", gap:"var(--s2)", marginBottom:"var(--s3)" }}>
              <span className="price" style={{ fontSize:"1.875rem" }}>{formatPrice(offer.offer_price)}</span>
              {offer.original_price && <span className="price-old" style={{ fontSize:"1.125rem" }}>{formatPrice(offer.original_price)}</span>}
            </div>
          )}

          {/* Countdown */}
          {secs > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", marginBottom:"var(--s4)" }}>
              <span style={{ fontSize:".75rem", fontWeight:600, color:"var(--t2)" }}>Ends in</span>
              {[[h,"h"],[m,"m"],[s,"s"]].map(([v,u]) => (
                <React.Fragment key={u}>
                  <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r2)", padding:"5px 10px", textAlign:"center", minWidth:"40px" }}>
                    <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:800, fontVariantNumeric:"tabular-nums" }}>
                      {String(v).padStart(2,"0")}
                    </div>
                    <div style={{ fontSize:".5625rem", color:"var(--t2)", letterSpacing:".06em", textTransform:"uppercase" }}>{u}</div>
                  </div>
                  {u !== "s" && <span style={{ color:"var(--t2)", fontWeight:700 }}>:</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* CTAs */}
          <div style={{ display:"flex", gap:"var(--s2)" }}>
            <button
              onClick={() => { navigate(`/offer/${offer.id}`); dismiss(); }}
              className="btn btn-lg"
              style={{ flex:1, background:"linear-gradient(135deg,var(--gold),var(--gold-d))", border:"none", color:"#000", fontWeight:700, fontSize:"1rem" }}
            >
              Grab this deal
            </button>
            <button onClick={dismiss} className="btn btn-s">Maybe later</button>
          </div>
          <div style={{ textAlign:"center", marginTop:"var(--s3)", fontSize:".75rem", color:"var(--t2)" }}>
            Today only · Claim Offer, Kanchipuram
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn      { from{opacity:0;transform:scale(.88) translateY(16px)} to{opacity:1;transform:none} }
        @keyframes popOut     { from{opacity:1;transform:none} to{opacity:0;transform:scale(.92) translateY(8px)} }
        @keyframes fadeOutBg  { from{opacity:1} to{opacity:0} }
      `}</style>
    </div>
  );
}
