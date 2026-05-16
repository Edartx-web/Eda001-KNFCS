/**
 * SpinWheel.jsx
 * Full-screen spin wheel overlay.
 * Usage:
 *   <SpinWheel open prizes={[...]} onWin={fn} onClose={fn} />
 *   <SpinWheel prizes={[...]} onWin={fn} spinsLeft={1} />  ← inline (no fullscreen)
 *
 * Prize object fields (from SiteConfig or defaults):
 *   label        string   — text shown on segment (supports emoji prefix)
 *   color        string   — hex color for segment
 *   prob         number   — probability 0–1 (sum should equal ~1)
 *   discount_pct number   — discount % awarded (0 = non-discount prize)
 *   pct          number   — alias for discount_pct (backward compat)
 *   emoji        string   — optional emoji drawn on segment
 */
import React, { useRef, useState, useEffect, useCallback } from "react";

const DEFAULT_PRIZES = [
  { label:"5% OFF",    emoji:"💰", discount_pct:5,  color:"#E8521A", prob:0.30 },
  { label:"10% OFF",   emoji:"🔥", discount_pct:10, color:"#2563EB", prob:0.25 },
  { label:"Free Drink",emoji:"🥤", discount_pct:0,  color:"#059669", prob:0.15 },
  { label:"15% OFF",   emoji:"🎯", discount_pct:15, color:"#7C3AED", prob:0.12 },
  { label:"Try Again", emoji:"😅", discount_pct:0,  color:"#6B7280", prob:0.10 },
  { label:"20% OFF",   emoji:"🏆", discount_pct:20, color:"#DC2626", prob:0.05 },
  { label:"Free Side", emoji:"🍟", discount_pct:0,  color:"#D97706", prob:0.03 },
];

/** Normalise a prize so callers always see .pct regardless of which field was stored */
function normPrize(p) {
  return { ...p, pct: p.pct ?? p.discount_pct ?? 0 };
}

function pickPrize(prizes) {
  const r = Math.random();
  let acc = 0;
  for (const p of prizes) { acc += (p.prob || 0); if (r < acc) return p; }
  return prizes[0];
}

/* ── Confetti burst ────────────────────────────────────────────────── */
function launchConfetti() {
  const COLORS = ["#E8521A","#FFD700","#2563EB","#059669","#DC2626","#F59E0B","#7C3AED"];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 10;
    p.style.cssText = `
      position:fixed; width:${size}px; height:${size}px;
      background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
      border-radius:${Math.random() > .5 ? "50%" : "2px"};
      left:${20 + Math.random() * 60}%;
      top:${10 + Math.random() * 20}%;
      pointer-events:none; z-index:9999;
      animation: confetti-fall ${1.2 + Math.random() * 1.5}s ease-out ${Math.random() * .4}s forwards;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
}

/* ── Inline styles injected once ──────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("spinwheel-css")) {
  const s = document.createElement("style");
  s.id = "spinwheel-css";
  s.textContent = `
    @keyframes confetti-fall {
      0%   { transform: translateY(0) rotate(0deg) scale(1); opacity:1; }
      100% { transform: translateY(${window.innerHeight || 600}px) rotate(720deg) scale(.4); opacity:0; }
    }
    @keyframes sw-overlay-in  { from{opacity:0} to{opacity:1} }
    @keyframes sw-card-in     { from{opacity:0;transform:scale(.88) translateY(24px)} to{opacity:1;transform:none} }
    @keyframes sw-prize-pop   { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
    @keyframes sw-glow-pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(232,82,26,0)} 50%{box-shadow:0 0 40px 12px rgba(232,82,26,.45)} }
  `;
  document.head.appendChild(s);
}

/* ── The wheel component ──────────────────────────────────────────── */
function WheelCanvas({ prizes: rawPrizes, size, onWin, spinsLeft }) {
  const prizes    = rawPrizes.map(normPrize);
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [result,   setResult]   = useState(null);
  const [used,     setUsed]     = useState(0);
  const angleRef    = useRef(0);
  const rafRef      = useRef(null);
  const spinLockRef = useRef(false);  // synchronous lock — prevents rapid double-spin

  const n   = prizes.length;
  const arc = (2 * Math.PI) / n;

  const draw = useCallback((angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2; const cy = canvas.height / 2;
    const R  = cx - 6;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prizes.forEach((p, i) => {
      const start = angle + i * arc - Math.PI / 2;
      const end   = start + arc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, end);
      ctx.closePath();
      ctx.fillStyle = p.color || "#999";
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,.3)";
      ctx.lineWidth   = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);

      const fs = R > 160 ? 14 : 11;

      // Emoji on the inner part of the segment
      if (p.emoji) {
        ctx.font = `${R > 160 ? 18 : 14}px system-ui, sans-serif`;
        ctx.textAlign  = "right";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 0;
        ctx.fillText(p.emoji, R * 0.52, 0);
      }

      // Label text on the outer part
      ctx.textAlign  = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle  = "#fff";
      ctx.font = `800 ${fs}px system-ui, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,.55)";
      ctx.shadowBlur  = 4;
      ctx.fillText(p.label, R - 14, 0);
      ctx.restore();
    });

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    ctx.lineWidth   = 4;
    ctx.stroke();

    // Centre button
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 28);
    g.addColorStop(0, "#ff8c5a");
    g.addColorStop(1, "#E8521A");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.5)";
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `900 12px system-ui`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillText("SPIN", cx, cy);
  }, [prizes, arc]);

  useEffect(() => { draw(0); }, [draw]);

  const spin = useCallback(() => {
    // Use ref for synchronous check to prevent rapid double-clicks
    if (spinLockRef.current || used >= spinsLeft) return;
    if (result && result.label !== "Try Again") return;

    spinLockRef.current = true;
    setSpinning(true);
    setResult(null);

    const prize    = pickPrize(prizes);
    const prizeIdx = prizes.indexOf(prize);
    const target   = Math.PI * 2 * (6 + Math.random()) + (Math.PI * 2 - (prizeIdx * arc + arc / 2));
    const startA   = angleRef.current;
    const finalA   = startA + target;
    const duration = 4500 + Math.random() * 1000;
    const startT   = performance.now();

    const ease = t => 1 - Math.pow(1 - t, 4);

    const step = (now) => {
      const t = Math.min((now - startT) / duration, 1);
      draw(startA + (finalA - startA) * ease(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        angleRef.current = finalA % (Math.PI * 2);
        spinLockRef.current = false;
        setSpinning(false);
        setResult(prize);
        if (prize.label !== "Try Again") {
          setUsed(u => u + 1);
          launchConfetti();
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
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
      {/* Pointer */}
      <div style={{ position:"relative", width:size }}>
        <div style={{ position:"absolute", top:-18, left:"50%", transform:"translateX(-50%)", zIndex:2,
          width:0, height:0,
          borderLeft:"13px solid transparent", borderRight:"13px solid transparent",
          borderTop:"24px solid #fff",
          filter:"drop-shadow(0 2px 6px rgba(0,0,0,.5))" }}/>
        <canvas
          ref={canvasRef} width={size} height={size}
          style={{
            borderRadius:"50%",
            boxShadow:"0 12px 60px rgba(0,0,0,.4), inset 0 0 0 3px rgba(255,255,255,.15)",
            display:"block",
            cursor: canSpin ? "pointer" : "default",
            animation: spinning ? "sw-glow-pulse 1.2s ease-in-out infinite" : "none",
          }}
          onClick={spin}
        />
      </div>

      {/* Button */}
      <button type="button" onClick={spin} disabled={!canSpin} style={{
        padding:"14px 48px", borderRadius:40, border:"none",
        background: canSpin
          ? "linear-gradient(135deg,#ff8c5a,#E8521A)"
          : "rgba(255,255,255,.12)",
        color: canSpin ? "#fff" : "rgba(255,255,255,.35)",
        fontWeight:900, fontSize:"1.0625rem",
        cursor: canSpin ? "pointer" : "not-allowed",
        fontFamily:"system-ui,sans-serif",
        boxShadow: canSpin ? "0 8px 24px rgba(232,82,26,.5)" : "none",
        transition:"all .25s",
        letterSpacing:".04em",
      }}>
        {spinning ? "Spinning…" : used >= spinsLeft ? "Spin used ✓" : "SPIN!"}
      </button>

      {/* Result */}
      {result && result.label !== "Try Again" && (
        <div style={{
          textAlign:"center", padding:"18px 28px",
          background:"rgba(255,255,255,.12)",
          backdropFilter:"blur(10px)",
          border:"1px solid rgba(255,255,255,.25)",
          borderRadius:16,
          animation:"sw-prize-pop .5s cubic-bezier(.34,1.56,.64,1) both",
        }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div style={{ fontWeight:900, fontSize:"2rem", color:"#FFD700", fontFamily:"system-ui" }}>
            {result.emoji && <span style={{ marginRight:8 }}>{result.emoji}</span>}{result.label}
          </div>
          <div style={{ fontSize:".875rem", color:"rgba(255,255,255,.8)", marginTop:6 }}>
            {result.pct > 0
              ? "Discount applied to your cart!"
              : "Redeemable at the counter."}
          </div>
        </div>
      )}
      {result?.label === "Try Again" && (
        <div style={{ color:"rgba(255,255,255,.6)", fontSize:".9375rem", fontWeight:600 }}>
          {result.emoji} Better luck next time! Spin again ↑
        </div>
      )}
      {spinsLeft > 1 && (
        <div style={{ fontSize:".75rem", color:"rgba(255,255,255,.5)" }}>
          {spinsLeft - used} spin{spinsLeft - used !== 1 ? "s" : ""} remaining
        </div>
      )}
    </div>
  );
}

/* ── Public export — fullscreen modal or inline ────────────────────── */
export default function SpinWheel({
  open,       // if provided, renders as fullscreen overlay
  onClose,
  prizes = DEFAULT_PRIZES,
  onWin,
  spinsLeft = 1,
}) {
  const size = open ? Math.min(window.innerWidth - 80, 460) : 280;

  if (open !== undefined) {
    if (!open) return null;
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:800,
        background:"linear-gradient(160deg,rgba(20,5,0,.97),rgba(40,10,5,.97))",
        backdropFilter:"blur(12px)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"24px",
        animation:"sw-overlay-in .3s ease-out both",
      }}>
        {/* Close */}
        <button type="button" onClick={onClose} style={{
          position:"absolute", top:20, right:20,
          width:40, height:40, borderRadius:"50%",
          background:"rgba(255,255,255,.12)", border:"1px solid rgba(255,255,255,.2)",
          color:"#fff", fontSize:"20px", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>×</button>

        <div style={{
          fontFamily:"system-ui,sans-serif", fontSize:"clamp(1.25rem,4vw,1.75rem)",
          fontWeight:900, color:"#fff", letterSpacing:"-.02em",
          marginBottom:24, textAlign:"center",
        }}>
          Spin &amp; Win 🎰
          <div style={{ fontSize:".875rem", fontWeight:400, color:"rgba(255,255,255,.55)", marginTop:4 }}>
            Spin the wheel for an instant discount!
          </div>
        </div>

        <WheelCanvas prizes={prizes} size={size} onWin={onWin} spinsLeft={spinsLeft} />
      </div>
    );
  }

  // Inline mode (legacy / offers page)
  return <WheelCanvas prizes={prizes} size={size} onWin={onWin} spinsLeft={spinsLeft} />;
}
