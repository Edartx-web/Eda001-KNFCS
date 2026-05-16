/**
 * components/common/BranchSelector.jsx
 *
 * Full-screen overlay popup shown to customers when they
 * land on /menu without a branch selected.
 *
 * Flow:
 *   1. Fetch GET /branches/public/ — no auth needed
 *   2. If only 1 active branch → auto-select + show brief confirmation toast
 *   3. If multiple → show branch cards; customer taps to select
 *   4. On select → AuthContext.selectBranch(branch) → localStorage persists
 *   5. If already selected → show small "switch" chip in the corner
 *
 * Props:
 *   onSelected(branch) — called once selection is confirmed
 *   allowDismiss       — if true, show an X button (e.g. for "switch branch" modal)
 *   onDismiss          — called when X pressed (only if allowDismiss=true)
 */

import React, { useEffect, useState, useRef } from "react";
import { gsap }              from "gsap";
import { getPublicBranches } from "../../api/auth";

/* ── Branch card ────────────────────────────────────────────────────── */
function BranchCard({ branch, selected, onSelect, animDelay }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || typeof gsap === "undefined") return;
    gsap.fromTo(ref.current,
      { opacity:0, y:22, scale:.97 },
      { opacity:1, y:0, scale:1, duration:.42, ease:"power2.out", delay: animDelay }
    );
  }, []);

  const isSelected = selected?.id === branch.id;

  return (
    <button
      ref={ref}
      onClick={() => onSelect(branch)}
      style={{
        width:"100%", textAlign:"left", cursor:"pointer",
        padding:"var(--s4) var(--s5)",
        background: isSelected ? "linear-gradient(135deg,var(--brand-tint),rgba(232,82,26,.06))" : "var(--bgc)",
        border: `2px solid ${isSelected ? "var(--brand)" : "var(--bd)"}`,
        borderRadius:"var(--r4)",
        transition:"all .2s var(--ease)",
        boxShadow: isSelected ? "0 0 0 4px var(--brand-tint), var(--sh-sm)" : "var(--sh-xs)",
        position:"relative",
        overflow:"hidden",
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor="var(--bd2)"; e.currentTarget.style.boxShadow="var(--sh-md)"; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.boxShadow="var(--sh-xs)"; }}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div style={{
          position:"absolute", top:"12px", right:"12px",
          width:"22px", height:"22px", borderRadius:"50%",
          background:"var(--brand)", display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s2)" }}>
        {/* Icon */}
        <div style={{
          width:"40px", height:"40px", borderRadius:"var(--r3)", flexShrink:0,
          background: isSelected ? "var(--brand)" : "var(--bg2)",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"background .2s var(--ease)",
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
            stroke={isSelected ? "#fff" : "var(--t3)"} strokeWidth="1.8">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:700,
            letterSpacing:"-.01em",
            color: isSelected ? "var(--brand)" : "var(--t1)",
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
          }}>
            {branch.name}
          </div>
          {!branch.is_active && (
            <span className="badge badge-err" style={{ fontSize:".625rem", marginTop:"2px" }}>Closed</span>
          )}
        </div>
      </div>

      {/* Address */}
      <div style={{ fontSize:".8125rem", color:"var(--t2)", lineHeight:1.5, paddingLeft:"52px" }}>
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          style={{ marginRight:"4px", flexShrink:0, display:"inline" }}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        {branch.address}
      </div>

      {/* Operating hours */}
      {branch.phone && (
        <div style={{ fontSize:".8125rem", color:"var(--t2)", marginTop:"4px", paddingLeft:"52px" }}>
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            style={{ marginRight:"4px", display:"inline" }}>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.86 9.11a19.79 19.79 0 01-3.07-8.63A2 2 0 012.8 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 9.91a16 16 0 006 6l.97-.97a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 17.2z"/>
          </svg>
          {branch.phone}
        </div>
      )}
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function BranchSelector({ onSelected, allowDismiss = false, onDismiss }) {
  const overlayRef = useRef(null);
  const cardRef    = useRef(null);

  const [branches,   setBranches]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [nearbyIds,  setNearbyIds]  = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [error,    setError]    = useState("");
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);

  /* Load branches */
  // Find nearest branch using browser geolocation
  const findNearby = () => {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      // Sort branches by distance
      const withDist = branches.map(b => {
        if (!b.latitude || !b.longitude) return { ...b, dist: Infinity };
        const dlat = (parseFloat(b.latitude) - lat) * Math.PI / 180;
        const dlng = (parseFloat(b.longitude) - lng) * Math.PI / 180;
        const a = Math.sin(dlat/2)**2 + Math.cos(lat*Math.PI/180) * Math.cos(parseFloat(b.latitude)*Math.PI/180) * Math.sin(dlng/2)**2;
        const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return { ...b, dist };
      }).sort((a,b) => a.dist - b.dist);
      setNearbyIds(withDist.map(b => b.id));
      setBranches(withDist);
      setLocLoading(false);
    }, () => { setLocLoading(false); }, { timeout: 5000 });
  };

  useEffect(() => {
    getPublicBranches()
      .then(res => {
        const bs = (res.data.branches || []).filter(b => b.is_active);
        setBranches(bs);
        // Auto-select if only one branch
        if (bs.length === 1) {
          setSelected(bs[0]);
        }
      })
      .catch(() => setError("Couldn't load branches. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  /* Entrance animation */
  useEffect(() => {
    if (loading || !overlayRef.current || typeof gsap === "undefined") return;
    gsap.from(overlayRef.current, { opacity:0, duration:.25, ease:"power2.out" });
    if (cardRef.current) {
      gsap.from(cardRef.current, { opacity:0, y:32, scale:.97, duration:.4, ease:"power2.out", delay:.05 });
    }
  }, [loading]);

  const handleConfirm = () => {
    if (!selected) return;
    setConfirming(true);
    // Brief delay so the checkmark animates
    setTimeout(() => {
      onSelected(selected);
    }, 280);
  };

  return (
    <div
      ref={overlayRef}
      style={{
        position:"fixed", inset:0, zIndex:900,
        background:"rgba(0,0,0,.72)",
        backdropFilter:"blur(10px)",
        WebkitBackdropFilter:"blur(10px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"var(--s4)",
        overflowY:"auto",
      }}
    >
      <div
        ref={cardRef}
        style={{
          width:"100%", maxWidth:"520px",
          background:"var(--bgc)",
          borderRadius:"var(--r5)",
          boxShadow:"var(--sh-xl)",
          overflow:"hidden",
          position:"relative",
          maxHeight:"calc(100vh - 40px)",
          display:"flex", flexDirection:"column",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          padding:"var(--s6) var(--s6) var(--s5)",
          borderBottom:"1px solid var(--bd)",
          background:"linear-gradient(135deg,var(--bg),var(--bg2))",
          flexShrink:0,
        }}>
          {/* Brand + dismiss */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s4)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
              <div style={{
                width:"36px", height:"36px", borderRadius:"10px",
                background:"var(--brand)", display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"var(--sh-br)",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" strokeWidth="1.5"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3.5"/>
                  <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3.5"/>
                </svg>
              </div>
              <span style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem",color:"var(--t1)", fontWeight:800, letterSpacing:"-.02em" }}>KNFC</span>
            </div>
            {allowDismiss && (
              <button onClick={onDismiss}
                style={{ width:"32px", height:"32px", borderRadius:"50%", border:"1px solid var(--bd)", background:"var(--bg2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--t2)" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <h2 style={{
            fontFamily:"var(--ff-d)", fontSize:"clamp(1.375rem,4vw,1.875rem)",
            fontWeight:800, letterSpacing:"-.025em", lineHeight:1.15, marginBottom:"var(--s2)",color:"var(--t1)"
          }}>
            Choose your branch
          </h2>
          <p style={{ fontSize:".9375rem", color:"var(--t2)", lineHeight:1.6 }}>
            Select the KNFC location you're visiting. The menu and prices are specific to each branch.
          </p>
        </div>

        {/* ── Branch list ────────────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:"auto", padding:"var(--s4) var(--s5)" }}>
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
              {[1,2,3].map(i => (
                <div key={i} className="skel" style={{ height:"90px", borderRadius:"var(--r4)" }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign:"center", padding:"var(--s8)" }}>
              <div style={{ fontSize:"2rem", marginBottom:"var(--s3)" }}>⚠️</div>
              <p style={{ color:"var(--err)", fontSize:".9375rem", marginBottom:"var(--s4)" }}>{error}</p>
              <button onClick={() => window.location.reload()} className="btn btn-s btn-lg">
                Retry
              </button>
            </div>
          ) : branches.length === 0 ? (
            <div style={{ textAlign:"center", padding:"var(--s8)" }}>
              <div style={{ fontSize:"2rem", marginBottom:"var(--s3)" }}>🏪</div>
              <p style={{ color:"var(--t2)", fontSize:".9375rem" }}>No branches are currently open.</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
              {branches.map((branch, i) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  selected={selected}
                  onSelect={setSelected}
                  animDelay={i * 0.06}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer / CTA ────────────────────────────────────────────── */}
        {!loading && !error && branches.length > 0 && (
          <div style={{
            padding:"var(--s4) var(--s5) var(--s5)",
            borderTop:"1px solid var(--bd)",
            background:"var(--bgc)",
            flexShrink:0,
          }}>
            {selected ? (
              <div style={{ marginBottom:"var(--s3)", padding:"var(--s3) var(--s4)", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.2)", borderRadius:"var(--r3)", display:"flex", alignItems:"center", gap:"var(--s2)" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize:".875rem", color:"var(--ok)", fontWeight:600 }}>
                  {selected.name} selected
                </span>
              </div>
            ) : (
              <div style={{ marginBottom:"var(--s3)", fontSize:".8125rem", color:"var(--t2)", textAlign:"center" }}>
                Tap a branch above to select it
              </div>
            )}
            <button
              onClick={handleConfirm}
              disabled={!selected || confirming}
              className="btn btn-p btn-xl btn-full"
              style={{ fontSize:"1rem", fontWeight:700 }}
            >
              {confirming
                ? <><span className="spin">⟳</span> Entering…</>
                : selected
                ? `Go to ${selected.name} menu →`
                : "Select a branch to continue"
              }
            </button>
            <p style={{ textAlign:"center", fontSize:".75rem", color:"var(--t2)", marginTop:"var(--s3)" }}>
              You can switch branches anytime from the menu
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
