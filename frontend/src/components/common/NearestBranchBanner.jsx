/**
 * NearestBranchBanner.jsx
 *
 * Shown after customer login when a closer branch is detected.
 * Non-blocking — slides in from the top, auto-dismisses after 12s.
 * "Switch" immediately changes the branch and reloads.
 * "Keep current" dismisses for today.
 */
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import useBranch from "../../hooks/useBranch";

export default function NearestBranchBanner() {
  const {
    selectedBranch, suggestedBranch,
    selectBranch, dismissBranchSuggestion,
  } = useBranch();

  const ref       = useRef(null);
  const timerRef  = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!suggestedBranch) return;
    setVisible(true);
    if (ref.current) {
      gsap.fromTo(ref.current,
        { y: -80, opacity: 0 },
        { y: 0, opacity: 1, duration: .4, ease: "power3.out", delay: .2 },
      );
    }
    // Auto-dismiss after 12 seconds
    timerRef.current = setTimeout(handleDismiss, 12000);
    return () => clearTimeout(timerRef.current);
  }, [suggestedBranch]);

  const handleSwitch = () => {
    clearTimeout(timerRef.current);
    selectBranch(suggestedBranch);   // reloads page
  };

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    if (!ref.current) { dismissBranchSuggestion(); setVisible(false); return; }
    gsap.to(ref.current, {
      y: -80, opacity: 0, duration: .28, ease: "power2.in",
      onComplete: () => { dismissBranchSuggestion(); setVisible(false); },
    });
  };

  if (!visible || !suggestedBranch) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed", top: "calc(var(--nav-h) + 10px)", left: "50%",
        transform: "translateX(-50%)",
        zIndex: 350, width: "calc(100% - 32px)", maxWidth: 520,
        background: "var(--bgc)", border: "1.5px solid var(--brand)",
        borderRadius: "var(--r4)", boxShadow: "var(--sh-lg)",
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
      }}
    >
      {/* Location dot */}
      <div style={{
        width: 36, height: 36, borderRadius: "var(--r3)",
        background: "rgba(232,82,26,.1)", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
          stroke="var(--brand)" strokeWidth="2" strokeLinecap="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: ".875rem", color: "var(--t1)", lineHeight: 1.3 }}>
          <span style={{ color: "var(--brand)" }}>{suggestedBranch.name}</span> is closest to you
        </div>
        <div style={{ fontSize: ".75rem", color: "var(--t3)", marginTop: 2 }}>
          Currently on <strong>{selectedBranch?.name || "Default branch"}</strong>
          {suggestedBranch._dist != null && suggestedBranch._dist < 50
            ? ` · ${suggestedBranch._dist < 1 ? `${Math.round(suggestedBranch._dist * 1000)}m` : `${suggestedBranch._dist.toFixed(1)}km`} away`
            : ""}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={handleSwitch}
          style={{
            padding: "7px 14px", borderRadius: "var(--r3)", border: "none",
            background: "var(--brand)", color: "#fff",
            fontFamily: "var(--ff-b)", fontSize: ".8125rem", fontWeight: 700,
            cursor: "pointer", whiteSpace: "nowrap",
          }}>
          Switch
        </button>
        <button onClick={handleDismiss}
          style={{
            width: 30, height: 30, borderRadius: "var(--r2)",
            border: "1px solid var(--bd)", background: "var(--bg2)",
            color: "var(--t3)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
