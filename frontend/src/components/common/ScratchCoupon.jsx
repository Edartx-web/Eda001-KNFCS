/**
 * ScratchCoupon.jsx — v3 complete redesign
 * KNFC brand orange theme · Lottery-ticket style · Silver scratch surface
 * Props:
 *   open       boolean
 *   onClose    fn
 *   code       string   — coupon code
 *   discount   string   — e.g. "15% OFF"
 *   onRevealed fn(code) — called once after scratch reveal
 */
import React, { useRef, useState, useEffect, useCallback } from "react";

/* ── inject styles once ─────────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("sc3-css")) {
  const s = document.createElement("style");
  s.id = "sc3-css";
  s.textContent = `
    @keyframes sc3-overlay-in  { from{opacity:0} to{opacity:1} }
    @keyframes sc3-card-in     { from{opacity:0;transform:scale(.86) translateY(36px)} to{opacity:1;transform:none} }
    @keyframes sc3-prize-pop   { 0%{transform:scale(.55) rotate(-4deg);opacity:0} 60%{transform:scale(1.07) rotate(1deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
    @keyframes sc3-result-in   { 0%{opacity:0;transform:translateY(18px)} 100%{opacity:1;transform:none} }
    @keyframes sc3-hint        { 0%,100%{transform:translate(-3px,-3px) rotate(-8deg)} 50%{transform:translate(16px,12px) rotate(10deg)} }
    @keyframes sc3-spark       { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--sx),var(--sy)) scale(0);opacity:0} }
    @keyframes sc3-confetti    { 0%{transform:translateY(0) rotate(0) scale(1);opacity:1} 80%{opacity:1} 100%{transform:translateY(110vh) rotate(var(--sr)) scale(.2);opacity:0} }
    @keyframes sc3-badge-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    @keyframes sc3-circles     { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    @keyframes sc3-code-shine  {
      0%  { background-position: -200% center }
      100%{ background-position:  200% center }
    }
    .sc3-code-text {
      background: linear-gradient(90deg,#E8521A 0%,#FF8C00 30%,#FFD700 50%,#FF8C00 70%,#E8521A 100%);
      background-size:200% auto;
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
      background-clip:text;
      animation: sc3-code-shine 2.2s linear infinite;
    }
  `;
  document.head.appendChild(s);
}

/* ── particles ──────────────────────────────────────────────────────────── */
const SILVER_SPARKS = ["#C8C8C8","#AAAAAA","#E0E0E0","#F2F2F2","#B4B4B4","#D6D6D6"];
const CONFETTI_COLORS = ["#E8521A","#FFD700","#FF8C00","#FF1744","#2979FF","#00E676","#FF4081","#FFAB40","#7C4DFF","#64FFDA"];

function spawnSilverSparks(cx, cy, count = 6) {
  for (let i = 0; i < count; i++) {
    const size  = 3 + Math.random() * 7;
    const angle = Math.random() * Math.PI * 2;
    const dist  = 22 + Math.random() * 65;
    const dur   = 0.28 + Math.random() * 0.38;
    const el    = document.createElement("div");
    el.style.cssText = `
      position:fixed;pointer-events:none;z-index:9999;
      left:${cx - size / 2}px;top:${cy - size / 2}px;
      width:${size}px;height:${size}px;
      background:${SILVER_SPARKS[Math.floor(Math.random() * SILVER_SPARKS.length)]};
      border-radius:50%;
      --sx:${Math.cos(angle) * dist}px;
      --sy:${Math.sin(angle) * dist - 14}px;
      animation:sc3-spark ${dur}s ease-out forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur + 0.1) * 1000);
  }
}

function burstConfetti(cx, cy) {
  for (let i = 0; i < 160; i++) {
    const size   = 5 + Math.random() * 11;
    const angle  = Math.random() * Math.PI * 2;
    const dist   = 24 + Math.random() * (window.innerWidth * 0.42);
    const startX = cx + Math.cos(angle) * Math.random() * 28;
    const startY = cy + Math.sin(angle) * Math.random() * 28;
    const el     = document.createElement("div");
    el.style.cssText = `
      position:fixed;pointer-events:none;z-index:9999;
      width:${size}px;height:${size}px;
      background:${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
      border-radius:${Math.random() > 0.45 ? "50%" : "2px"};
      left:${startX}px;top:${startY}px;
      --sr:${(Math.random() - 0.5) * 1260}deg;
      animation:sc3-confetti ${1.4 + Math.random() * 2.2}s ease-out ${Math.random() * 0.45}s forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
  spawnSilverSparks(cx, cy, 22);
}

/* ── card dimensions ────────────────────────────────────────────────────── */
function getCardSize() {
  const w = Math.min(window.innerWidth - 40, 460);
  const h = Math.round(w * 0.5);
  return { w, h };
}

/* ── scratch canvas ─────────────────────────────────────────────────────── */
function ScratchCanvas({ code, discount, onRevealed, onRevealDone }) {
  const canvasRef    = useRef(null);
  const [revealed,   setRevealed]   = useState(false);
  const [pct,        setPct]        = useState(0);
  const drawing      = useRef(false);
  const lastSpark    = useRef({ x: -9999, y: -9999 });
  const revealedRef  = useRef(false);
  const { w, h }     = getCardSize();

  /* draw silver metallic surface */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    /* silver gradient */
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0,    "#4A4A4A");
    g.addColorStop(0.08, "#909090");
    g.addColorStop(0.22, "#D8D8D8");
    g.addColorStop(0.38, "#F4F4F4");
    g.addColorStop(0.50, "#FFFFFF");
    g.addColorStop(0.62, "#E4E4E4");
    g.addColorStop(0.78, "#AAAAAA");
    g.addColorStop(0.92, "#787878");
    g.addColorStop(1,    "#3E3E3E");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    /* crosshatch texture */
    for (let i = 0; i <= w; i += 6) {
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.09})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let j = 0; j <= h; j += 9) {
      ctx.strokeStyle = "rgba(0,0,0,.035)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
    }

    /* diagonal sheen */
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0,    "rgba(255,255,255,0)");
    sheen.addColorStop(0.44, "rgba(255,255,255,.13)");
    sheen.addColorStop(0.50, "rgba(255,255,255,.30)");
    sheen.addColorStop(0.56, "rgba(255,255,255,.13)");
    sheen.addColorStop(1,    "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    /* embossed label */
    ctx.shadowColor  = "rgba(0,0,0,.4)";
    ctx.shadowBlur   = 5;
    ctx.fillStyle    = "rgba(30,30,30,.5)";
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(w * 0.046)}px system-ui,sans-serif`;
    ctx.fillText("SCRATCH TO REVEAL YOUR PRIZE", w / 2, h / 2 - h * 0.15);

    ctx.font = `${Math.round(w * 0.11)}px system-ui`;
    ctx.fillText("🎟", w / 2, h / 2 + h * 0.04);

    ctx.shadowBlur = 3;
    ctx.font = `600 ${Math.round(w * 0.036)}px system-ui,sans-serif`;
    ctx.fillStyle = "rgba(30,30,30,.42)";
    ctx.fillText("✦  Use your finger or mouse  ✦", w / 2, h - h * 0.12);
    ctx.shadowBlur = 0;
  }, [w, h]);

  const getPos = (e, canvas) => {
    const r   = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top, cx: src.clientX, cy: src.clientY };
  };

  const scratch = useCallback((e) => {
    if (!drawing.current || revealedRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const { x, y, cx, cy } = getPos(e, canvas);

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.fill();

    const dist = Math.hypot(cx - lastSpark.current.x, cy - lastSpark.current.y);
    if (dist > 13) {
      lastSpark.current = { x: cx, y: cy };
      spawnSilverSparks(cx, cy, 3 + Math.floor(Math.random() * 4));
    }

    const data    = ctx.getImageData(0, 0, w, h).data;
    let cleared   = 0;
    for (let i = 3; i < data.length; i += 4) { if (data[i] === 0) cleared++; }
    const newPct  = Math.round((cleared / (w * h)) * 100);
    setPct(newPct);

    if (newPct > 50 && !revealedRef.current) {
      revealedRef.current = true;
      setRevealed(true);
      ctx.clearRect(0, 0, w, h);
      const rect = canvas.getBoundingClientRect();
      burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      onRevealed?.(code);
      setTimeout(() => onRevealDone?.(), 650);
    }
  }, [w, h, code, onRevealed, onRevealDone]);

  return (
    <div style={{ position: "relative", width: w, height: h }}>

      {/* Prize layer — visible once canvas is cleared */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 10,
        background: "linear-gradient(145deg,#FFF8F2,#FFF3E6,#FFEDDA)",
        borderRadius: 0,
        animation: revealed ? "sc3-prize-pop .65s cubic-bezier(.34,1.56,.64,1) both" : "none",
        padding: "0 24px",
      }}>
        <div style={{ fontSize: ".6rem", fontWeight: 800, color: "rgba(232,82,26,.55)", textTransform: "uppercase", letterSpacing: ".15em" }}>
          Your Reward
        </div>
        <div className="sc3-code-text" style={{
          fontFamily: "system-ui,sans-serif",
          fontSize: `clamp(1.9rem,${w * 0.1}px,3.2rem)`,
          fontWeight: 900, letterSpacing: ".04em", lineHeight: 1, textAlign: "center",
        }}>
          {discount}
        </div>
        <div style={{
          fontFamily: "monospace",
          fontSize: `clamp(.9rem,${w * 0.046}px,1.2rem)`,
          fontWeight: 900, color: "#E8521A",
          background: "rgba(232,82,26,.08)",
          padding: "7px 22px", borderRadius: 8,
          border: "2px dashed rgba(232,82,26,.38)",
          letterSpacing: ".16em", marginTop: 4,
        }}>
          {code}
        </div>
      </div>

      {/* Silver canvas overlay */}
      {!revealed && (
        <canvas
          ref={canvasRef}
          width={w} height={h}
          style={{
            position: "absolute", inset: 0,
            borderRadius: 0, cursor: "crosshair", touchAction: "none", display: "block",
          }}
          onMouseDown={()  => { drawing.current = true; }}
          onMouseUp={()    => { drawing.current = false; }}
          onMouseLeave={() => { drawing.current = false; }}
          onMouseMove={scratch}
          onTouchStart={e => { e.preventDefault(); drawing.current = true; }}
          onTouchEnd={()   => { drawing.current = false; }}
          onTouchMove={scratch}
        />
      )}

      {/* Finger hint */}
      {!revealed && pct < 28 && (
        <div style={{
          position: "absolute", bottom: 12, right: 16,
          pointerEvents: "none",
          animation: "sc3-hint 1.8s ease-in-out infinite",
          fontSize: "1.75rem", lineHeight: 1, opacity: .78,
          filter: "drop-shadow(0 2px 5px rgba(0,0,0,.25))",
        }}>
          👆
        </div>
      )}
    </div>
  );
}

/* ── main export ─────────────────────────────────────────────────────────── */
export default function ScratchCoupon({
  open,
  onClose,
  code     = "KNFC15",
  discount = "15% OFF",
  onRevealed,
}) {
  const [showResult, setShowResult] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const { w }       = getCardSize();

  useEffect(() => { if (open) { setShowResult(false); setCopied(false); } }, [open]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    });
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900,
      background: "linear-gradient(145deg,#E8521A 0%,#C03A10 45%,#8A1E00 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "20px 16px",
      animation: "sc3-overlay-in .28s ease-out both",
      overflow: "hidden",
    }}>

      {/* Decorative background circles */}
      <div style={{ position:"absolute", top:"-130px", right:"-90px", width:"420px", height:"420px", borderRadius:"50%", background:"rgba(255,255,255,.05)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:"-110px", left:"-110px", width:"360px", height:"360px", borderRadius:"50%", background:"rgba(0,0,0,.1)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", top:"30%", left:"-60px", width:"180px", height:"180px", borderRadius:"50%", background:"rgba(255,255,255,.04)", pointerEvents:"none" }}/>

      {/* Close button */}
      <button type="button" onClick={onClose} style={{
        position: "absolute", top: 18, right: 18,
        width: 42, height: 42, borderRadius: "50%",
        background: "rgba(0,0,0,.28)", border: "1.5px solid rgba(255,255,255,.25)",
        color: "#fff", fontSize: "22px", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background .2s", zIndex: 1,
      }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,.45)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,.28)"}>
        ×
      </button>

      {/* Header */}
      <div style={{
        textAlign: "center", marginBottom: 22,
        animation: "sc3-card-in .45s .04s ease-out both",
      }}>
        <div style={{
          fontFamily: "system-ui,sans-serif",
          fontSize: "clamp(1.7rem,6vw,2.5rem)",
          fontWeight: 900, color: "#fff",
          letterSpacing: "-.02em", lineHeight: 1,
          textShadow: "0 3px 14px rgba(0,0,0,.35)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{ animation: "sc3-badge-pulse 2s ease-in-out infinite", display: "inline-block" }}>🎟</span>
          Scratch &amp; Win!
        </div>
        <div style={{ fontSize: ".9rem", color: "rgba(255,255,255,.72)", marginTop: 7, fontWeight: 400 }}>
          Uncover your secret discount — scratch the silver card
        </div>
      </div>

      {/* Ticket card */}
      <div style={{
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 28px 72px rgba(0,0,0,.45), 0 0 0 2px rgba(255,255,255,.18)",
        animation: "sc3-card-in .48s .08s ease-out both",
        width: w,
        flexShrink: 0,
      }}>
        {/* Ticket top strip — dark brand bar */}
        <div style={{
          background: "linear-gradient(135deg,#1A0800 0%,#2D1200 100%)",
          padding: "9px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: 900, fontSize: ".7rem", color: "rgba(255,140,0,.9)", letterSpacing: ".1em", textTransform: "uppercase" }}>
            🍗 KNFC Fried Chicken
          </span>
          <span style={{ fontWeight: 800, fontSize: ".68rem", color: "rgba(255,255,255,.45)", letterSpacing: ".07em", textTransform: "uppercase" }}>
            Scratch Card
          </span>
        </div>

        {/* Canvas area */}
        <ScratchCanvas
          code={code}
          discount={discount}
          onRevealed={onRevealed}
          onRevealDone={() => setShowResult(true)}
        />

        {/* Ticket bottom strip — perforated dots */}
        <div style={{
          background: "linear-gradient(135deg,#1A0800 0%,#2D1200 100%)",
          padding: "7px 18px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,.14)" }} />
          ))}
        </div>
      </div>

      {/* Result panel */}
      {showResult ? (
        <div style={{
          marginTop: 22, textAlign: "center",
          animation: "sc3-result-in .5s .05s ease-out both",
        }}>
          <p style={{
            fontWeight: 800, color: "#fff", fontSize: "1rem",
            marginBottom: 8,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            textShadow: "0 1px 8px rgba(0,0,0,.3)",
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round"/>
            </svg>
            Prize revealed!
          </p>
          <p style={{ fontSize: ".875rem", color: "rgba(255,255,255,.78)", marginBottom: 16, lineHeight: 1.65 }}>
            Enter code{" "}
            <strong style={{ fontFamily: "monospace", color: "#FFD700", letterSpacing: ".1em" }}>{code}</strong>
            {" "}at checkout to get <strong style={{ color: "#FFD700" }}>{discount}</strong>
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleCopy} style={{
              padding: "12px 24px", borderRadius: 40,
              border: "2px solid rgba(255,255,255,.38)",
              background: copied ? "rgba(255,255,255,.26)" : "rgba(255,255,255,.14)",
              color: "#fff", fontWeight: 800, fontSize: ".9375rem", cursor: "pointer",
              fontFamily: "system-ui,sans-serif", letterSpacing: ".04em",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all .22s", backdropFilter: "blur(6px)",
            }}>
              {copied ? (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Copy Code
                </>
              )}
            </button>
            <button onClick={onClose} style={{
              padding: "12px 26px", borderRadius: 40,
              border: "none",
              background: "rgba(255,255,255,.94)",
              color: "#E8521A", fontWeight: 900, fontSize: ".9375rem", cursor: "pointer",
              fontFamily: "system-ui,sans-serif", letterSpacing: ".01em",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 18px rgba(0,0,0,.22)",
              transition: "transform .2s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
              Use at Cart →
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          marginTop: 14, fontSize: ".8125rem",
          color: "rgba(255,255,255,.52)", textAlign: "center",
          animation: "sc3-card-in .5s .14s ease-out both",
        }}>
          Scratch the silver surface to reveal your coupon
        </div>
      )}
    </div>
  );
}
