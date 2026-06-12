/**
 * KNCLoader.jsx  v4
 *
 * Exports:
 *   default KNCLoader   – full-screen transparent cinematic loader (GSAP)
 *   KNCSpinner          – compact inline spinner
 *   KNCPageSkeleton     – themed full-page skeleton
 *   usePageLoader       – hook that wires KNCLoader to page navigation
 */

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/* ══════════════════════════════════════════════════════════════════════════
   1. KNCLoader — Full-screen transparent entry animation
══════════════════════════════════════════════════════════════════════════ */
export default function KNCLoader({ visible = true, onDone, label = "" }) {
  const rootRef     = useRef(null);
  const ringOutRef  = useRef(null);
  const ringInRef   = useRef(null);
  const iconRef     = useRef(null);
  const brandRef    = useRef(null);
  const dotsRef     = useRef([]);
  const glowRef     = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!visible) { setHidden(false); return; }
    if (!rootRef.current) return;

    const dots = dotsRef.current.filter(Boolean);

    // Initial state
    gsap.set([brandRef.current, iconRef.current], { opacity: 0, y: 16, scale: 0.88 });
    gsap.set(dots, { opacity: 0, y: 6, scale: 0.7 });
    gsap.set(ringOutRef.current, { opacity: 0, scale: 0.7, rotation: 0 });
    gsap.set(ringInRef.current, { opacity: 0, scale: 0.6, rotation: 0 });
    gsap.set(glowRef.current, { opacity: 0, scale: 0.5 });

    const tl = gsap.timeline();

    // Glow pulse in
    tl.to(glowRef.current, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }, 0);

    // Rings appear and spin
    tl.to(ringOutRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" }, 0.08);
    tl.to(ringInRef.current,  { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)" }, 0.16);

    // Icon + brand text
    tl.to(iconRef.current,  { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, 0.22);
    tl.to(brandRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power2.out" }, 0.36);

    // Dots stagger in
    tl.to(dots, { opacity: 1, y: 0, scale: 1, stagger: 0.1, duration: 0.35, ease: "back.out(2)" }, 0.55);

    // Hold, then dots bounce continuously
    dots.forEach((dot, i) => {
      tl.to(dot, { y: -6, duration: 0.22, ease: "power1.out", yoyo: true, repeat: -1 }, 0.9 + i * 0.12);
    });

    // Continuous ring rotation (independent of timeline)
    gsap.to(ringOutRef.current, { rotation: 360, duration: 3.2, ease: "none", repeat: -1 });
    gsap.to(ringInRef.current,  { rotation: -360, duration: 2.1, ease: "none", repeat: -1 });

    return () => {
      tl.kill();
      gsap.killTweensOf([ringOutRef.current, ringInRef.current, ...dotsRef.current.filter(Boolean)]);
    };
  }, [visible]);

  if (!visible || hidden) return null;

  return (
    <div
      ref={rootRef}
      style={{
        position:             "fixed",
        inset:                0,
        zIndex:               9999,
        background:           "#0C0807",
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "center",
      }}
    >
      {/* Ambient glow behind the loader card */}
      <div
        ref={glowRef}
        style={{
          position:     "absolute",
          width:        "340px",
          height:       "340px",
          borderRadius: "50%",
          background:   "radial-gradient(circle, rgba(232,82,26,0.22) 0%, rgba(232,82,26,0.06) 50%, transparent 72%)",
          filter:       "blur(24px)",
          pointerEvents:"none",
          opacity:      0,
        }}
      />

      {/* Loader card — glass panel */}
      <div style={{
        position:      "relative",
        background:    "rgba(255,255,255,0.045)",
        backdropFilter:"blur(32px)",
        border:        "1px solid rgba(255,255,255,0.10)",
        borderRadius:  "28px",
        padding:       "44px 52px 40px",
        textAlign:     "center",
        minWidth:      "240px",
        boxShadow:     "0 8px 48px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}>

        {/* Ring stage */}
        <div style={{ position:"relative", width:"130px", height:"130px", margin:"0 auto 24px" }}>

          {/* Outer rotating ring — dashed arc */}
          <svg
            ref={ringOutRef}
            width="130" height="130"
            viewBox="0 0 130 130"
            style={{ position:"absolute", inset:0 }}
          >
            <circle cx="65" cy="65" r="58"
              fill="none"
              stroke="rgba(232,82,26,0.15)"
              strokeWidth="2"
            />
            <circle cx="65" cy="65" r="58"
              fill="none"
              stroke="url(#grad-out)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="80 284"
              strokeDashoffset="0"
            />
            <defs>
              <linearGradient id="grad-out" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E8521A" stopOpacity="0"/>
                <stop offset="60%" stopColor="#E8521A"/>
                <stop offset="100%" stopColor="#F5C843"/>
              </linearGradient>
            </defs>
          </svg>

          {/* Inner rotating ring */}
          <svg
            ref={ringInRef}
            width="100" height="100"
            viewBox="0 0 100 100"
            style={{ position:"absolute", top:"15px", left:"15px" }}
          >
            <circle cx="50" cy="50" r="42"
              fill="none"
              stroke="rgba(245,200,67,0.10)"
              strokeWidth="1.5"
            />
            <circle cx="50" cy="50" r="42"
              fill="none"
              stroke="url(#grad-in)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="50 214"
            />
            <defs>
              <linearGradient id="grad-in" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F5C843" stopOpacity="0"/>
                <stop offset="100%" stopColor="#F5C843"/>
              </linearGradient>
            </defs>
          </svg>

          {/* Center icon — KNFC logo */}
          <div
            ref={iconRef}
            style={{
              position:       "absolute",
              inset:          0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              opacity:        0,
            }}
          >
            <img
              src="/KNFC-logo.svg"
              alt="KNFC"
              width="72"
              height="72"
              style={{
                objectFit:    "contain",
                borderRadius: "14px",
                boxShadow:    "0 4px 20px rgba(232,82,26,0.30)",
              }}
            />
          </div>
        </div>

        {/* Brand text */}
        <div ref={brandRef} style={{ opacity: 0 }}>
          <div style={{
            fontFamily:    "var(--ff-d)",
            fontSize:      "2.25rem",
            fontWeight:    900,
            letterSpacing: "-.04em",
            color:         "#fff",
            lineHeight:    1,
          }}>
            KN<span style={{ color:"#E8521A" }}>FC</span>
          </div>
          <div style={{
            fontSize:      "0.6875rem",
            fontWeight:    700,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color:         "rgba(255,255,255,0.45)",
            marginTop:     "6px",
          }}>
            {label || "Fried Chicken Shop"}
          </div>
        </div>

        {/* Animated dots */}
        <div style={{ display:"flex", gap:"7px", justifyContent:"center", marginTop:"22px" }}>
          {[0,1,2,3].map(i => (
            <div
              key={i}
              ref={el => dotsRef.current[i] = el}
              style={{
                width:        i === 1 || i === 2 ? "8px" : "6px",
                height:       i === 1 || i === 2 ? "8px" : "6px",
                borderRadius: "50%",
                background:   i === 1 ? "#E8521A" : i === 2 ? "#F5C843" : "rgba(255,255,255,0.3)",
                opacity:      0,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   2. KNCSpinner — compact inline spinner
══════════════════════════════════════════════════════════════════════════ */
export function KNCSpinner({ size = 40, label = "", color = "var(--brand)" }) {
  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      justifyContent:"center",
      gap:           "12px",
    }}>
      <div style={{ position:"relative", width:size, height:size }}>
        <svg
          width={size} height={size}
          viewBox="0 0 40 40"
          style={{ animation:"knc-spin 1.1s linear infinite", display:"block" }}
        >
          <circle cx="20" cy="20" r="16" fill="none" stroke="var(--bg3)" strokeWidth="3"/>
          <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="3"
            strokeLinecap="round" strokeDasharray="60 40"/>
        </svg>
        <div style={{
          position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-50%)",
          width:size*0.36, height:size*0.36,
          borderRadius:"50%", background:color, opacity:0.22,
        }}/>
      </div>
      {label && (
        <span style={{
          fontFamily:"var(--ff-b)", fontSize:"0.75rem", fontWeight:600,
          letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--t3)",
        }}>
          {label}
        </span>
      )}
      <style>{`@keyframes knc-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   3. KNCPageSkeleton — themed full-page skeleton
══════════════════════════════════════════════════════════════════════════ */
export function KNCPageSkeleton({ AppLayout }) {
  const Shim = ({ style }) => <div className="skel" style={style} />;
  const heroHeight = "clamp(300px,55vw,520px)";

  return (
    <AppLayout>
      <div style={{
        width:"100%", height:"3px", background:"var(--bg3)", borderRadius:"2px",
        overflow:"hidden", marginBottom:"var(--s6)", position:"relative",
      }}>
        <div style={{
          position:"absolute", top:0, left:0, height:"100%", width:"45%",
          background:"linear-gradient(90deg,var(--brand),var(--gold))",
          borderRadius:"2px", animation:"knc-bar-slide 1.4s var(--ease) infinite",
        }}/>
      </div>

      <Shim style={{ height:heroHeight, borderRadius:"var(--r4)", marginBottom:"var(--s8)" }}/>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s4)" }}>
        <Shim style={{ width:"160px", height:"24px", borderRadius:"var(--r2)" }}/>
        <Shim style={{ width:"60px",  height:"18px", borderRadius:"var(--r2)" }}/>
      </div>

      {/* Category squares skeleton */}
      <div style={{ display:"flex", gap:"var(--s3)", marginBottom:"var(--s8)", overflow:"hidden" }}>
        {[1,2,3,4,5].map(i => (
          <Shim key={i} style={{ flexShrink:0, width:"104px", height:"104px", borderRadius:"var(--r4)" }}/>
        ))}
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s4)" }}>
        <Shim style={{ width:"180px", height:"24px", borderRadius:"var(--r2)" }}/>
        <Shim style={{ width:"48px",  height:"18px", borderRadius:"var(--r2)" }}/>
      </div>

      <div className="product-grid" style={{ marginBottom:"var(--s8)" }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
            <Shim style={{ aspectRatio:"4/3", borderRadius:"var(--r4)" }}/>
            <Shim style={{ height:"18px", width:"80%", borderRadius:"var(--r2)" }}/>
            <Shim style={{ height:"14px", width:"50%", borderRadius:"var(--r2)" }}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <Shim style={{ height:"20px", width:"60px", borderRadius:"var(--r2)" }}/>
              <Shim style={{ width:"34px", height:"34px", borderRadius:"var(--r3)" }}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"var(--s6) 0" }}>
        <KNCSpinner size={32} label="Loading menu…" />
      </div>

      <style>{`
        @keyframes knc-bar-slide { 0%{left:-45%} 100%{left:110%} }
      `}</style>
    </AppLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   4. usePageLoader
══════════════════════════════════════════════════════════════════════════ */
export function usePageLoader(minMs = 0) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (minMs <= 0) { setLoading(false); return; }
    const t = setTimeout(() => setLoading(false), minMs);
    return () => clearTimeout(t);
  }, [minMs]);
  return { loading, setLoading };
}
