/**
 * ThemeToggle.jsx
 * ─────────────────────────────────────────────────────────────
 * DESKTOP  → fixed top-right frosted-glass pill
 * TABLET   → fixed top-right smaller pill
 * MOBILE   → fixed top-LEFT tiny icon button (never blocks content)
 *
 * Usage — one line anywhere:
 *   import ThemeToggle from "../../components/common/ThemeToggle";
 *   <ThemeToggle />
 * ─────────────────────────────────────────────────────────────
 */
import React, { useState } from "react";
import useTheme from "../../hooks/useTheme";

function SunIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2"  x2="12" y2="5"/>  <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22"  x2="6.34"  y2="6.34"/>
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
      <line x1="2"  y1="12" x2="5"  y2="12"/>  <line x1="19" y1="12" x2="22" y2="12"/>
      <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66"/>
      <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"/>
    </svg>
  );
}
function MoonIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
    </svg>
  );
}

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  const [spin, setSpin] = useState(false);

  const handleToggle = () => {
    setSpin(true);
    toggle();
    setTimeout(() => setSpin(false), 450);
  };

  const darkCls  = isDark  ? " tt-is-dark"  : "";
  const spinCls  = spin    ? " tt-spinning"  : "";

  return (
    <>
      {/* ══ DESKTOP / TABLET PILL — top-right ══════════════════ */}
      <button
        className={`tt-pill${darkCls}${spinCls}`}
        onClick={handleToggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light mode" : "Dark mode"}
      >
        {/* Mini toggle track */}
        <span className="tt-track">
          <span className="tt-thumb">
            {isDark ? <MoonIcon size={10}/> : <SunIcon size={10}/>}
          </span>
        </span>
        <span className="tt-lbl">{isDark ? "Dark" : "Light"}</span>
      </button>

      {/* ══ MOBILE ICON — top-LEFT, small, out of the way ══════ */}
      <button
        className={`tt-mob-btn${darkCls}${spinCls}`}
        onClick={handleToggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light mode" : "Dark mode"}
      >
        {isDark ? <MoonIcon size={14}/> : <SunIcon size={14}/>}
      </button>

      <style>{`

        /* ── DESKTOP PILL ─────────────────────────────────── */
        .tt-pill {
          position: fixed;
          top: 16px; right: 18px;
          z-index: 9980;
          display: flex; align-items: center; gap: 7px;
          padding: 5px 12px 5px 5px;
          border-radius: 999px;
          border: 1.5px solid transparent;
          cursor: pointer;
          font-size: .72rem; font-weight: 700;
          letter-spacing: .05em; font-family: inherit;
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          transition: background .2s, border-color .2s, color .2s,
                      box-shadow .2s, transform .15s;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          outline: none;
        }
        .tt-pill:focus-visible {
          box-shadow: 0 0 0 3px var(--brand, #e8521a);
        }

        /* Dark appearance */
        .tt-pill.tt-is-dark {
          background: rgba(255,255,255,.09);
          border-color: rgba(255,255,255,.14);
          color: rgba(255,255,255,.78);
          box-shadow: 0 2px 16px rgba(0,0,0,.4);
        }
        .tt-pill.tt-is-dark:hover {
          background: rgba(255,255,255,.16);
          border-color: rgba(255,255,255,.28);
          color: #fff;
          transform: translateY(-1px);
        }

        /* Light appearance */
        .tt-pill:not(.tt-is-dark) {
          background: rgba(255,255,255,.9);
          border-color: rgba(0,0,0,.1);
          color: rgba(0,0,0,.65);
          box-shadow: 0 2px 16px rgba(0,0,0,.12);
        }
        .tt-pill:not(.tt-is-dark):hover {
          background: #fff;
          border-color: rgba(0,0,0,.18);
          color: rgba(0,0,0,.88);
          transform: translateY(-1px);
        }
        .tt-pill:active { transform: scale(.94) !important; }

        /* Inner track */
        .tt-track {
          position: relative;
          width: 28px; height: 16px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .tt-pill.tt-is-dark      .tt-track { background: rgba(255,255,255,.16); }
        .tt-pill:not(.tt-is-dark) .tt-track { background: rgba(0,0,0,.1); }

        /* Sliding thumb */
        .tt-thumb {
          position: absolute;
          width: 12px; height: 12px;
          top: 2px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: left .26s cubic-bezier(.34,1.56,.64,1), background .2s;
        }
        .tt-pill.tt-is-dark      .tt-thumb { left: 14px; background: rgba(255,255,255,.92); color: #1a1a2e; }
        .tt-pill:not(.tt-is-dark) .tt-thumb { left: 2px;  background: #ffa800; color: #fff; box-shadow: 0 0 8px rgba(255,168,0,.5); }

        .tt-lbl { line-height: 1; }

        /* ── MOBILE ICON BTN — top-left ───────────────────── */
        .tt-mob-btn {
          position: fixed;
          top: 12px; left: 12px;
          z-index: 9980;
          width: 36px; height: 36px;
          border-radius: 10px;
          display: none; /* shown via media query */
          align-items: center; justify-content: center;
          border: 1.5px solid transparent;
          cursor: pointer;
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          transition: background .18s, border-color .18s, transform .12s;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          outline: none;
        }
        .tt-mob-btn:focus-visible { box-shadow: 0 0 0 3px var(--brand, #e8521a); }

        .tt-mob-btn.tt-is-dark {
          background: rgba(255,255,255,.1);
          border-color: rgba(255,255,255,.18);
          color: rgba(255,255,255,.82);
        }
        .tt-mob-btn:not(.tt-is-dark) {
          background:rgba(255,255,255,.5);
          border-color: rgba(0,0,0,.1);
          color: rgba(0,0,0,.65);
          box-shadow: 0 2px 10px rgba(0,0,0,.1);
        }
        .tt-mob-btn:active { transform: scale(.86); }

        /* Spin animation on toggle */
        .tt-spinning .tt-thumb,
        .tt-spinning svg {
          animation: _tt-rotate .44s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes _tt-rotate {
          0%   { transform: rotate(-90deg) scale(.55); opacity: .3; }
          55%  { transform: rotate(18deg)  scale(1.12); opacity: 1; }
          100% { transform: rotate(0deg)   scale(1);    opacity: 1; }
        }

        /* ── BREAKPOINTS ─────────────────────────────────── */

        /* Large tablet + desktop: show pill */
        @media (min-width: 601px) {
          .tt-pill    { display: flex !important; }
          .tt-mob-btn { display: none !important; }
        }

        /* Mobile / small tablet portrait: show icon-only top-left */
        @media (max-width: 600px) {
          .tt-pill    { display: none !important; }
          .tt-mob-btn { display: flex !important; }
        }

        /* Tablet landscape special: pill fits fine */
        @media (min-width: 601px) and (max-width: 1024px) and (orientation: landscape) {
          .tt-pill { top: 12px; right: 14px; padding: 4px 10px 4px 4px; font-size: .68rem; }
        }
      `}</style>
    </>
  );
}