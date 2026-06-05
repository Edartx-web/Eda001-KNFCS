/**
 * SpinWheel.jsx — Premium fullscreen spin wheel overlay.
 * Usage:
 *   <SpinWheel open prizes={[...]} onWin={fn} onClose={fn} spinsLeft={1} />
 *
 * Prize object:
 *   label        string   — segment text
 *   color        string   — base hex color for segment
 *   prob         number   — probability 0–1
 *   discount_pct number   — discount % (0 = non-discount)
 *   pct          number   — alias for discount_pct
 *   emoji        string   — emoji drawn on segment
 */
import React, { useRef, useState, useEffect, useCallback } from "react";

const DEFAULT_PRIZES = [
  { label:"5% OFF",    emoji:"💰", discount_pct:5,  color:"#E8521A", prob:0.30 },
  { label:"10% OFF",   emoji:"🔥", discount_pct:10, color:"#2563EB", prob:0.25 },
  { label:"Free Drink",emoji:"🥤", discount_pct:0,  color:"#059669", prob:0.15 },
  { label:"15% OFF",   emoji:"🎯", discount_pct:15, color:"#7C3AED", prob:0.12 },
  { label:"Try Again", emoji:"😅", discount_pct:0,  color:"#4B5563", prob:0.10 },
  { label:"20% OFF",   emoji:"🏆", discount_pct:20, color:"#DC2626", prob:0.05 },
  { label:"Free Side", emoji:"🍟", discount_pct:0,  color:"#D97706", prob:0.03 },
];

function normPrize(p) {
  return { ...p, pct: p.pct ?? p.discount_pct ?? 0 };
}

function pickPrize(prizes) {
  const r = Math.random();
  let acc = 0;
  for (const p of prizes) { acc += (p.prob || 0); if (r < acc) return p; }
  return prizes[0];
}

/* ── Hex color helpers ──────────────────────────────────────────────── */
function hexToRgb(hex) {
  const h = hex.replace("#","");
  const n = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function lighten(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}
function darken(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}

/* ── Confetti burst ─────────────────────────────────────────────────── */
function launchConfetti(ox, oy) {
  const COLORS = ["#E8521A","#FFD700","#2563EB","#059669","#DC2626","#F59E0B","#7C3AED","#FF69B4","#00CED1","#ADFF2F"];
  const ox2 = ox || window.innerWidth  / 2;
  const oy2 = oy || window.innerHeight / 3;
  for (let i = 0; i < 130; i++) {
    const size  = 5 + Math.random() * 13;
    const angle = Math.random() * Math.PI * 2;
    const dist  = 10 + Math.random() * (window.innerWidth * 0.4);
    const p = document.createElement("div");
    p.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999;
      width:${size}px; height:${size}px;
      background:${COLORS[Math.floor(Math.random()*COLORS.length)]};
      border-radius:${Math.random()>.4?"50%":"2px"};
      left:${ox2 + Math.cos(angle)*Math.random()*30}px;
      top:${oy2  + Math.sin(angle)*Math.random()*30}px;
      animation: sw2-fall ${1.4+Math.random()*1.8}s ease-out ${Math.random()*.4}s forwards;
      --sdx:${Math.cos(angle)*dist}px; --sdy:${Math.sin(angle)*dist+100}px;
      --sr:${(Math.random()-0.5)*900}deg;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }
}

/* ── CSS injected once ──────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("sw2-css")) {
  const s = document.createElement("style");
  s.id = "sw2-css";
  s.textContent = `
    @keyframes sw2-overlay-in { from{opacity:0} to{opacity:1} }
    @keyframes sw2-card-in    { from{opacity:0;transform:scale(.87) translateY(28px)} to{opacity:1;transform:none} }
    @keyframes sw2-prize-pop  { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
    @keyframes sw2-pointer-bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-5px)} }
    @keyframes sw2-fall {
      0%   { transform:translate(0,0) rotate(0deg) scale(1); opacity:1; }
      80%  { opacity:1; }
      100% { transform:translate(var(--sdx),var(--sdy)) rotate(var(--sr)) scale(.2); opacity:0; }
    }
    @keyframes sw2-pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(232,82,26,0), 0 0 60px rgba(0,0,0,.6); }
      50%  { box-shadow: 0 0 0 18px rgba(232,82,26,.12), 0 0 60px rgba(0,0,0,.6); }
      100% { box-shadow: 0 0 0 0 rgba(232,82,26,0), 0 0 60px rgba(0,0,0,.6); }
    }
    @keyframes sw2-spin-glow { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.18)} }
    @keyframes sw2-winner-glow {
      0%,100% { box-shadow: 0 0 0 0 rgba(255,215,0,0); }
      50%     { box-shadow: 0 0 0 14px rgba(255,215,0,.3), 0 0 40px 8px rgba(255,215,0,.25); }
    }
    @keyframes sw2-shimmer {
      0%   { background-position:-200% center; }
      100% { background-position: 200% center; }
    }
    .sw2-prize-label {
      background: linear-gradient(90deg,#DAA520 0%,#FFE566 30%,#FFFACD 50%,#FFD700 70%,#DAA520 100%);
      background-size:200% auto;
      -webkit-background-clip:text; background-clip:text;
      -webkit-text-fill-color:transparent;
      animation: sw2-shimmer 2s linear infinite;
    }
  `;
  document.head.appendChild(s);
}

/* ── WheelCanvas ────────────────────────────────────────────────────── */
function WheelCanvas({ prizes: rawPrizes, size, onWin, spinsLeft }) {
  const prizes     = rawPrizes.map(normPrize);
  const canvasRef  = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [result,   setResult]   = useState(null);
  const [used,     setUsed]     = useState(0);
  const angleRef   = useRef(0);
  const rafRef     = useRef(null);
  const lockRef    = useRef(false);

  const n   = prizes.length;
  const arc = (Math.PI * 2) / n;

  /* ── Premium draw ──────────────────────────────────────────────────── */
  const draw = useCallback((angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;
    const R  = cx - 8;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* ── Outer decorative ring ────────── */
    const ringW = 10;
    const ringGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    ringGrad.addColorStop(0,   "#7A4E00");
    ringGrad.addColorStop(.25, "#FFD700");
    ringGrad.addColorStop(.5,  "#FFFACD");
    ringGrad.addColorStop(.75, "#C68C00");
    ringGrad.addColorStop(1,   "#7A4E00");
    ctx.beginPath();
    ctx.arc(cx, cy, R + ringW, 0, Math.PI * 2);
    ctx.fillStyle = ringGrad;
    ctx.fill();

    /* Outer ring shadow rim */
    ctx.beginPath();
    ctx.arc(cx, cy, R + ringW, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,.5)";
    ctx.lineWidth   = 3;
    ctx.stroke();

    /* ── Segments ────────────────────── */
    prizes.forEach((p, i) => {
      const start = angle + i * arc - Math.PI / 2;
      const end   = start + arc;
      const midA  = start + arc / 2;

      /* Gradient fill: lighter at rim, darker at center */
      const gradR = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
      gradR.addColorStop(0,   darken(p.color || "#555", 30));
      gradR.addColorStop(0.5, p.color || "#555");
      gradR.addColorStop(1,   lighten(p.color || "#555", 40));

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, end);
      ctx.closePath();
      ctx.fillStyle = gradR;
      ctx.fill();

      /* Segment border */
      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.lineWidth   = 2;
      ctx.stroke();

      /* Rim dot decoration */
      const dotX = cx + Math.cos(start) * (R - 6);
      const dotY = cy + Math.sin(start) * (R - 6);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.fill();

      /* Save + rotate for text */
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(midA);

      const fs = R > 160 ? 13 : 10;

      /* Emoji near center */
      if (p.emoji) {
        ctx.font = `${R > 160 ? 18 : 14}px system-ui, sans-serif`;
        ctx.textAlign    = "right";
        ctx.textBaseline = "middle";
        ctx.shadowBlur   = 0;
        ctx.fillText(p.emoji, R * 0.42, 0);
      }

      /* Label */
      ctx.textAlign    = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle    = "#fff";
      ctx.font         = `800 ${fs}px system-ui, sans-serif`;
      ctx.shadowColor  = "rgba(0,0,0,.7)";
      ctx.shadowBlur   = 5;
      ctx.fillText(p.label, R - 18, 0);
      ctx.shadowBlur = 0;

      ctx.restore();
    });

    /* ── Inner circle (shadow rim over segments) ── */
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.fill();

    /* ── Metallic center hub ─────────── */
    const hubGrad = ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 32);
    hubGrad.addColorStop(0,   "#fff");
    hubGrad.addColorStop(.25, "#F0C040");
    hubGrad.addColorStop(.6,  "#E8521A");
    hubGrad.addColorStop(1,   "#8B2500");
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.fill();

    /* Hub border */
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    /* Hub inner shadow */
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    const hubShadow = ctx.createRadialGradient(cx, cy, 28, cx, cy, 32);
    hubShadow.addColorStop(0,   "rgba(0,0,0,0)");
    hubShadow.addColorStop(1,   "rgba(0,0,0,.45)");
    ctx.fillStyle = hubShadow;
    ctx.fill();

    /* SPIN label */
    ctx.fillStyle    = "#fff";
    ctx.font         = "900 12px system-ui, sans-serif";
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor  = "rgba(0,0,0,.5)";
    ctx.shadowBlur   = 3;
    ctx.fillText("SPIN", cx, cy);
    ctx.shadowBlur = 0;
  }, [prizes, arc]);

  useEffect(() => { draw(0); }, [draw]);

  const spin = useCallback(() => {
    if (lockRef.current || used >= spinsLeft) return;
    if (result && result.label !== "Try Again") return;

    lockRef.current = true;
    setSpinning(true);
    setResult(null);

    const prize    = pickPrize(prizes);
    const prizeIdx = prizes.indexOf(prize);
    const target   = Math.PI * 2 * (7 + Math.random()) + (Math.PI * 2 - (prizeIdx * arc + arc / 2));
    const startA   = angleRef.current;
    const finalA   = startA + target;
    const duration = 5000 + Math.random() * 1200;
    const startT   = performance.now();

    /* Quartic ease-out for satisfying slow-down */
    const ease = t => 1 - Math.pow(1 - t, 4);

    const step = (now) => {
      const t = Math.min((now - startT) / duration, 1);
      draw(startA + (finalA - startA) * ease(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        angleRef.current = finalA % (Math.PI * 2);
        lockRef.current  = false;
        setSpinning(false);
        setResult(prize);
        if (prize.label !== "Try Again") {
          setUsed(u => u + 1);
          const canvas = canvasRef.current;
          if (canvas) {
            const r = canvas.getBoundingClientRect();
            launchConfetti(r.left + r.width / 2, r.top + r.height / 2);
          }
        }
        onWin?.(prize);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [prizes, arc, draw, onWin, result, used, spinsLeft]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const canSpin = !spinning && used < spinsLeft && (!result || result.label === "Try Again");

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:24 }}>
      {/* Wheel + pointer */}
      <div style={{ position:"relative", display:"inline-block" }}>
        {/* Downward pointer arrow — sits above the wheel rim */}
        <div style={{
          position:"absolute",
          top: -2,
          left:"50%",
          transform:"translateX(-50%)",
          zIndex:4,
          animation: canSpin ? "sw2-pointer-bounce 1.4s ease-in-out infinite" : "none",
        }}>
          {/* Glow halo behind arrow */}
          <div style={{
            position:"absolute", top:6, left:"50%",
            transform:"translateX(-50%)",
            width:24, height:24, borderRadius:"50%",
            background:"rgba(232,82,26,.6)",
            filter:"blur(8px)", zIndex:-1,
          }}/>
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
            <polygon points="14,34 0,4 28,4"
              fill="url(#ptr-grad)"
              stroke="rgba(255,255,255,.8)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="ptr-grad" x1="14" y1="0" x2="14" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0"   stopColor="#fff"/>
                <stop offset="0.4" stopColor="#FFD700"/>
                <stop offset="1"   stopColor="#E8521A"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={size} height={size}
          onClick={spin}
          style={{
            borderRadius:"50%",
            display:"block",
            cursor: canSpin ? "pointer" : "default",
            marginTop:20,
            boxShadow:"0 16px 64px rgba(0,0,0,.55), 0 0 0 4px rgba(255,255,255,.08)",
            animation: spinning ? "sw2-spin-glow 1s ease-in-out infinite, sw2-pulse-ring 1s ease-in-out infinite" : "none",
            transition:"box-shadow .3s",
          }}
        />
      </div>

      {/* Spin button */}
      <button
        type="button"
        onClick={spin}
        disabled={!canSpin}
        style={{
          padding:"16px 56px",
          borderRadius:40,
          border: canSpin ? "2px solid rgba(255,255,255,.25)" : "2px solid rgba(255,255,255,.08)",
          background: canSpin
            ? "linear-gradient(135deg,#ff8c5a 0%,#E8521A 60%,#b83c0c 100%)"
            : "rgba(255,255,255,.08)",
          color: canSpin ? "#fff" : "rgba(255,255,255,.3)",
          fontWeight:900,
          fontSize:"1.125rem",
          cursor: canSpin ? "pointer" : "not-allowed",
          fontFamily:"system-ui,sans-serif",
          boxShadow: canSpin ? "0 10px 32px rgba(232,82,26,.55), inset 0 1px 0 rgba(255,255,255,.25)" : "none",
          transition:"all .25s",
          letterSpacing:".06em",
        }}
        onMouseEnter={e => { if (canSpin) e.currentTarget.style.transform="scale(1.04)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
      >
        {spinning ? "Spinning…" : used >= spinsLeft ? "Spin used ✓" : "SPIN THE WHEEL"}
      </button>

      {/* Result panel */}
      {result && result.label !== "Try Again" && (
        <div style={{
          textAlign:"center",
          padding:"20px 32px",
          background:"rgba(255,255,255,.06)",
          backdropFilter:"blur(12px)",
          border:"1px solid rgba(255,215,0,.35)",
          borderRadius:20,
          animation:"sw2-prize-pop .55s cubic-bezier(.34,1.56,.64,1) both, sw2-winner-glow 2s ease-in-out .55s infinite",
          minWidth:240,
        }}>
          <div style={{ fontSize:"1.75rem", lineHeight:1, marginBottom:6 }}>
            {result.emoji || "🏆"}
          </div>
          <div className="sw2-prize-label" style={{
            fontFamily:"system-ui,sans-serif",
            fontSize:"2.25rem",
            fontWeight:900,
            letterSpacing:"-.01em",
            lineHeight:1.1,
            marginBottom:8,
          }}>
            {result.label}
          </div>
          <div style={{
            fontSize:".875rem",
            color:"rgba(255,255,255,.7)",
            fontWeight:500,
            lineHeight:1.5,
          }}>
            {result.pct > 0 ? "Discount applied to your next order!" : "Redeemable at the counter."}
          </div>
        </div>
      )}

      {result?.label === "Try Again" && (
        <div style={{
          textAlign:"center", color:"rgba(255,255,255,.55)",
          fontSize:"1rem", fontWeight:600,
          display:"flex", alignItems:"center", gap:8,
        }}>
          <span>{result.emoji}</span> Better luck next time! Spin again above
        </div>
      )}

      {spinsLeft > 1 && (
        <div style={{ fontSize:".8125rem", color:"rgba(255,255,255,.4)", marginTop:-8 }}>
          {spinsLeft - used} spin{spinsLeft - used !== 1 ? "s" : ""} remaining
        </div>
      )}
    </div>
  );
}

/* ── Public export ─────────────────────────────────────────────────── */
export default function SpinWheel({
  open,
  onClose,
  prizes   = DEFAULT_PRIZES,
  onWin,
  spinsLeft = 1,
}) {
  const size = open !== undefined
    ? Math.min(window.innerWidth - 100, 440)
    : 280;

  if (open !== undefined) {
    if (!open) return null;
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:850,
        background:"radial-gradient(ellipse at 50% 30%, rgba(60,20,5,.98) 0%, rgba(10,3,0,.99) 100%)",
        backdropFilter:"blur(16px)",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"24px 16px",
        animation:"sw2-overlay-in .3s ease-out both",
        overflowY:"auto",
      }}>
        {/* Close button */}
        <button type="button" onClick={onClose} style={{
          position:"absolute", top:20, right:20,
          width:44, height:44, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)",
          color:"#fff", fontSize:"22px", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"background .2s",
        }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.2)"}
           onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}>
          ×
        </button>

        {/* Decorative background stars */}
        {[...Array(14)].map((_,i) => (
          <div key={i} style={{
            position:"absolute",
            left:`${5 + Math.floor((i * 7.3) % 90)}%`,
            top: `${5 + Math.floor((i * 13.1) % 85)}%`,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius:"50%",
            background:`rgba(255,215,0,${.2 + (i % 4) * .15})`,
            pointerEvents:"none",
          }}/>
        ))}

        {/* Title */}
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={{
            fontFamily:"system-ui,sans-serif",
            fontSize:"clamp(1.5rem,5vw,2.25rem)",
            fontWeight:900, color:"#fff",
            letterSpacing:"-.025em", lineHeight:1,
          }}>
            Spin &amp; Win
          </div>
          <div style={{
            fontSize:".9rem", color:"rgba(255,255,255,.45)",
            marginTop:6, fontWeight:400,
          }}>
            Spin the wheel for an instant discount!
          </div>
        </div>

        <WheelCanvas
          prizes={prizes}
          size={size}
          onWin={onWin}
          spinsLeft={spinsLeft}
        />
      </div>
    );
  }

  /* Inline mode (legacy) */
  return <WheelCanvas prizes={prizes} size={size} onWin={onWin} spinsLeft={spinsLeft} />;
}
