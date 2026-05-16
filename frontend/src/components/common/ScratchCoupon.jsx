/**
 * ScratchCoupon.jsx
 * Gold-foil scratch card with particle sparks during scratch
 * and full confetti burst on reveal.
 */
import React, { useRef, useState, useEffect } from "react";

/* ── Inject CSS once ──────────────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("scratch-css")) {
  const s = document.createElement("style");
  s.id = "scratch-css";
  s.textContent = `
    @keyframes gold-spark {
      0%   { transform:translate(0,0) scale(1); opacity:1; }
      100% { transform:translate(var(--dx),var(--dy)) scale(0); opacity:0; }
    }
    @keyframes sc-confetti-fall {
      0%   { transform:translateY(0) rotate(0deg) scale(1); opacity:1; }
      100% { transform:translateY(700px) rotate(720deg) scale(.4); opacity:0; }
    }
    @keyframes sc-reveal-pop {
      0%   { transform:scale(.86); opacity:0; }
      60%  { transform:scale(1.07); }
      100% { transform:scale(1);   opacity:1; }
    }
    @keyframes sc-glow {
      0%,100% { box-shadow:0 8px 40px rgba(0,0,0,.25), 0 0 0 2px rgba(255,215,0,.3); }
      50%     { box-shadow:0 8px 40px rgba(0,0,0,.3),  0 0 24px 6px rgba(255,215,0,.55); }
    }
  `;
  document.head.appendChild(s);
}

/* ── Gold spark particles ─────────────────────────────────────────────────── */
const GOLD = ["#FFD700","#FFC200","#FFE566","#E8B800","#FFFACD","#F5D680","#FFAA00","#DAA520"];

function spawnSpark(cx, cy) {
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const size = 3 + Math.random() * 7;
    const dx   = (Math.random() - .5) * 100;
    const dy   = -12 - Math.random() * 60;
    const dur  = .35 + Math.random() * .45;
    const el   = document.createElement("div");
    el.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999;
      left:${cx - size/2}px; top:${cy - size/2}px;
      width:${size}px; height:${size}px;
      background:${GOLD[Math.floor(Math.random()*GOLD.length)]};
      border-radius:${Math.random()>.4?"50%":"2px"};
      box-shadow:0 0 6px 2px rgba(255,215,0,.75);
      --dx:${dx}px; --dy:${dy}px;
      animation:gold-spark ${dur}s ease-out forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur + .12) * 1000);
  }
}

/* ── Confetti celebration ─────────────────────────────────────────────────── */
const CONFET = ["#FFD700","#E8521A","#2563EB","#059669","#DC2626","#F59E0B","#7C3AED","#FF69B4","#00CED1"];

function burstConfetti() {
  for (let i = 0; i < 100; i++) {
    const size = 5 + Math.random() * 10;
    const el   = document.createElement("div");
    el.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999;
      width:${size}px; height:${size}px;
      background:${CONFET[Math.floor(Math.random()*CONFET.length)]};
      border-radius:${Math.random()>.5?"50%":"2px"};
      left:${8+Math.random()*84}%; top:${5+Math.random()*28}%;
      animation:sc-confetti-fall ${1.2+Math.random()*1.8}s ease-out ${Math.random()*.55}s forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }
}

/* ── Component ────────────────────────────────────────────────────────────── */
const W = 320, H = 156;

export default function ScratchCoupon({
  code      = "KNFC10",
  discount  = "10% OFF",
  label     = "Scratch to reveal your coupon!",
  onRevealed,
}) {
  const canvasRef  = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [pct,      setPct]      = useState(0);
  const drawing    = useRef(false);
  const lastSpark  = useRef({ x: -999, y: -999 });

  /* Draw gold foil */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0,    "#9A6E00");
    grad.addColorStop(0.18, "#FFD700");
    grad.addColorStop(0.38, "#FFFACD");
    grad.addColorStop(0.5,  "#FFE566");
    grad.addColorStop(0.68, "#FFD700");
    grad.addColorStop(0.85, "#DAA520");
    grad.addColorStop(1,    "#9A6E00");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Fine shimmer lines
    for (let i = 0; i <= W; i += 5) {
      ctx.strokeStyle = `rgba(255,255,255,${.04 + Math.random() * .14})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    for (let i = 0; i <= H; i += 10) {
      ctx.strokeStyle = "rgba(255,255,255,.05)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
    }
    // Diagonal highlight streak
    const streak = ctx.createLinearGradient(0, 0, W, H);
    streak.addColorStop(0,   "rgba(255,255,255,0)");
    streak.addColorStop(.45, "rgba(255,255,255,.18)");
    streak.addColorStop(.55, "rgba(255,255,255,.22)");
    streak.addColorStop(1,   "rgba(255,255,255,0)");
    ctx.fillStyle = streak;
    ctx.fillRect(0, 0, W, H);

    // Coin hint + label
    ctx.shadowColor = "rgba(100,60,0,.6)";
    ctx.shadowBlur  = 4;
    ctx.font        = "22px system-ui";
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle   = "rgba(80,45,0,.85)";
    ctx.fillText("🪙", W / 2, H / 2 - 20);

    ctx.font      = "bold 13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(80,45,0,.8)";
    ctx.shadowBlur = 2;
    ctx.fillText("✦  " + label + "  ✦", W / 2, H / 2 + 10);
    ctx.shadowBlur = 0;
  }, [label]);

  const getPos = (e, canvas) => {
    const r   = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top, cx: src.clientX, cy: src.clientY };
  };

  const scratch = (e) => {
    if (!drawing.current || revealed) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const { x, y, cx, cy } = getPos(e, canvas);

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();

    // Spawn gold sparks (throttled by distance)
    const dist = Math.hypot(cx - lastSpark.current.x, cy - lastSpark.current.y);
    if (dist > 16) {
      lastSpark.current = { x: cx, y: cy };
      spawnSpark(cx, cy);
    }

    // Check scratched area
    const data = ctx.getImageData(0, 0, W, H).data;
    let cleared = 0;
    for (let i = 3; i < data.length; i += 4) { if (data[i] === 0) cleared++; }
    const newPct = Math.round((cleared / (W * H)) * 100);
    setPct(newPct);

    if (newPct > 60 && !revealed) {
      setRevealed(true);
      ctx.clearRect(0, 0, W, H);
      burstConfetti();
      onRevealed?.(code);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"var(--s3)" }}>
      <div style={{
        position:"relative", borderRadius:"var(--r4)", overflow:"hidden",
        background:"linear-gradient(135deg,#1A0800,rgba(232,82,26,.15))",
        border:"2px solid rgba(255,215,0,.35)",
        width:W, height:H,
        animation: !revealed ? "sc-glow 2.4s ease-in-out infinite" : "none",
        boxShadow: revealed ? "0 8px 40px rgba(0,0,0,.25), 0 0 20px 6px rgba(255,215,0,.4)" : undefined,
      }}>
        {/* Prize layer */}
        <div style={{
          position:"absolute", inset:0,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6,
          animation: revealed ? "sc-reveal-pop .55s cubic-bezier(.34,1.56,.64,1) both" : "none",
          padding:"0 16px",
        }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t2)", textTransform:"uppercase", letterSpacing:".08em" }}>
            Your coupon
          </div>
          <div style={{ fontFamily:"var(--ff-d)", fontSize:"2.25rem", fontWeight:900, color:"var(--brand)", letterSpacing:".04em", lineHeight:1 }}>
            {discount}
          </div>
          <div style={{
            fontFamily:"monospace", fontSize:"1.1rem", fontWeight:800,
            color:"var(--t2)", background:"var(--bg2)",
            padding:"4px 14px", borderRadius:"var(--rf)",
            border:"1.5px dashed var(--bd)", letterSpacing:".1em",
          }}>
            {code}
          </div>
        </div>

        {/* Gold foil canvas */}
        {!revealed && (
          <canvas
            ref={canvasRef} width={W} height={H}
            style={{ position:"absolute", inset:0, cursor:"crosshair", touchAction:"none", borderRadius:"var(--r4)", display:"block" }}
            onMouseDown={() => { drawing.current = true; }}
            onMouseUp={()   => { drawing.current = false; }}
            onMouseLeave={()=> { drawing.current = false; }}
            onMouseMove={scratch}
            onTouchStart={e => { e.preventDefault(); drawing.current = true; }}
            onTouchEnd={()  => { drawing.current = false; }}
            onTouchMove={scratch}
          />
        )}
      </div>

      {revealed ? (
        <div style={{ textAlign:"center", animation:"sc-reveal-pop .5s .1s cubic-bezier(.34,1.56,.64,1) both" }}>
          <p style={{ fontWeight:800, color:"var(--ok)", fontSize:"1rem", marginBottom:4 }}>🎉 Coupon revealed!</p>
          <p style={{ fontSize:".8125rem", color:"var(--t2)" }}>
            Use code{" "}
            <strong style={{ color:"var(--brand)", fontFamily:"monospace", letterSpacing:".06em" }}>{code}</strong>
            {" "}at checkout for <strong>{discount}</strong>
          </p>
        </div>
      ) : (
        <p style={{ fontSize:".8125rem", color:"var(--t4)", textAlign:"center" }}>
          {pct > 5 ? `${pct}% scratched — ` : ""}Scratch the gold foil to reveal your discount
        </p>
      )}
    </div>
  );
}
