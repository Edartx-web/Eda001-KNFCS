/**
 * BranchSelector.jsx — Modern card-grid branch picker
 */

import React, { useEffect, useState, useRef } from "react";
import { gsap }              from "gsap";
import { getPublicBranches } from "../../api/auth";

export default function BranchSelector({ onSelected, allowDismiss = false, onDismiss }) {
  const overlayRef  = useRef(null);
  const sheetRef    = useRef(null);

  const [branches,    setBranches]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [confirming,  setConfirming]  = useState(false);
  const [search,      setSearch]      = useState("");
  const [locLoading,  setLocLoading]  = useState(false);
  const [nearbyOrder, setNearbyOrder] = useState(null);
  const [error,       setError]       = useState("");

  useEffect(() => {
    // 1. Show cached branches instantly so the UI is never blank
    const cached = (() => {
      try { return JSON.parse(localStorage.getItem("knfc_branches_cache") || "[]"); } catch { return []; }
    })().filter(b => b.is_active !== false);

    if (cached.length) {
      if (cached.length === 1) { onSelected(cached[0]); return; }
      setBranches(cached);
      setLoading(false);
    }

    // 2. Refresh from API in background (updates cache for next visit)
    getPublicBranches()
      .then(res => {
        const bs = (res.data.branches || []).filter(b => b.is_active !== false);
        if (bs.length) {
          localStorage.setItem("knfc_branches_cache", JSON.stringify(bs));
          if (bs.length === 1) { onSelected(bs[0]); return; }
          setBranches(bs);
        }
      })
      .catch(() => {
        // API failed — cached list is already showing, no error needed
        if (!cached.length) setError("Couldn't load branches. Please refresh.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !overlayRef.current) return;
    gsap.fromTo(overlayRef.current, { opacity:0 }, { opacity:1, duration:.22, ease:"power2.out" });
    if (sheetRef.current) {
      gsap.fromTo(sheetRef.current, { opacity:0, y:28, scale:.97 }, { opacity:1, y:0, scale:1, duration:.36, ease:"power2.out", delay:.06 });
    }
  }, [loading]);

  const findNearby = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude:lat, longitude:lng } = pos.coords;
      const sorted = [...branches].map(b => {
        if (!b.latitude || !b.longitude) return { ...b, _dist:Infinity };
        const dlat = (parseFloat(b.latitude) - lat) * Math.PI / 180;
        const dlng = (parseFloat(b.longitude) - lng) * Math.PI / 180;
        const a    = Math.sin(dlat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(parseFloat(b.latitude)*Math.PI/180)*Math.sin(dlng/2)**2;
        return { ...b, _dist: 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) };
      }).sort((a,b) => a._dist - b._dist);
      setNearbyOrder(sorted.map(b => b.id));
      setBranches(sorted);
      if (sorted[0]?._dist < 2) setSelected(sorted[0]);
      setLocLoading(false);
    }, () => setLocLoading(false), { timeout:6000 });
  };

  const handleConfirm = () => {
    if (!selected) return;
    setConfirming(true);
    setTimeout(() => onSelected(selected), 260);
  };

  const displayed = (nearbyOrder ? branches : branches).filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || (b.address||"").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return null;

  return (
    <div ref={overlayRef} style={{ position:"fixed", inset:0, zIndex:900, background:"rgba(0,0,0,.68)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div ref={sheetRef} style={{ width:"100%", maxWidth:"580px", background:"var(--bgc)", borderRadius:"24px", boxShadow:"0 32px 80px rgba(0,0,0,.28)", overflow:"hidden", maxHeight:"calc(100dvh - 32px)", display:"flex", flexDirection:"column", border:"1px solid var(--bd)" }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ padding:"24px 24px 0" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:"var(--brand)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 18px rgba(232,82,26,.4)", flexShrink:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, letterSpacing:"-.025em", color:"var(--t1)", lineHeight:1.1 }}>
                  Pick your branch
                </div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:2 }}>
                  {branches.length} location{branches.length !== 1 ? "s" : ""} near you
                </div>
              </div>
            </div>
            {allowDismiss && (
              <button onClick={onDismiss} style={{ width:32, height:32, borderRadius:"50%", border:"1px solid var(--bd)", background:"var(--bg2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--t3)", flexShrink:0, transition:"all 160ms" }}
                onMouseEnter={e => { e.currentTarget.style.background="var(--bg3)"; e.currentTarget.style.color="var(--t1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="var(--bg2)"; e.currentTarget.style.color="var(--t3)"; }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>

          {/* Search + Near me */}
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:12, padding:"0 14px" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search branches…"
                style={{ flex:1, border:"none", background:"transparent", color:"var(--t1)", fontSize:".875rem", outline:"none", padding:"10px 0", fontFamily:"var(--ff-b)" }}/>
              {search && (
                <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t3)", display:"flex", padding:"2px" }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                </button>
              )}
            </div>
            <button onClick={findNearby} disabled={locLoading}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", borderRadius:12, border:"1px solid var(--bd)", background:nearbyOrder?"var(--brand-tint)":"var(--bg2)", color:nearbyOrder?"var(--brand)":"var(--t2)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, fontFamily:"var(--ff-b)", whiteSpace:"nowrap", transition:"all 160ms", opacity:locLoading?.6:1 }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {locLoading ? "Locating…" : "Near me"}
            </button>
          </div>
        </div>

        {/* ── Branch grid ─────────────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 24px 8px" }}>
          {error ? (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="1.5" style={{ marginBottom:12, opacity:.5 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>
              <p style={{ color:"var(--err)", fontSize:".875rem", marginBottom:14 }}>{error}</p>
              <button onClick={() => window.location.reload()} style={{ padding:"8px 20px", borderRadius:10, border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t1)", cursor:"pointer", fontSize:".875rem", fontFamily:"var(--ff-b)", fontWeight:600 }}>Retry</button>
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--t4)" strokeWidth="1.5" style={{ marginBottom:12 }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <p style={{ color:"var(--t3)", fontSize:".875rem" }}>{search ? "No branches match your search." : "No branches open right now."}</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10, paddingBottom:8 }}>
              {displayed.map((branch, i) => {
                const isSel = selected?.id === branch.id;
                return (
                  <button key={branch.id} onClick={() => setSelected(isSel ? null : branch)}
                    style={{ textAlign:"left", cursor:"pointer", padding:"16px", background:isSel?"linear-gradient(135deg,var(--brand-tint),rgba(232,82,26,.04))":"var(--bg2)", border:`2px solid ${isSel?"var(--brand)":"var(--bd)"}`, borderRadius:16, transition:"all 180ms", boxShadow:isSel?"0 0 0 3px var(--brand-tint), var(--sh-sm)":"var(--sh-xs)", position:"relative", overflow:"hidden" }}
                    onMouseEnter={e => { if (!isSel) { e.currentTarget.style.borderColor="var(--bd2)"; e.currentTarget.style.boxShadow="var(--sh-md)"; } }}
                    onMouseLeave={e => { if (!isSel) { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.boxShadow="var(--sh-xs)"; } }}>

                    {/* Selected check */}
                    {isSel && (
                      <div style={{ position:"absolute", top:12, right:12, width:22, height:22, borderRadius:"50%", background:"var(--brand)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}

                    {/* Nearby badge */}
                    {nearbyOrder && nearbyOrder[0] === branch.id && (
                      <div style={{ position:"absolute", top:12, left:12, fontSize:".625rem", fontWeight:800, padding:"2px 7px", borderRadius:20, background:"rgba(232,82,26,.12)", color:"var(--brand)", border:"1px solid rgba(232,82,26,.2)", textTransform:"uppercase", letterSpacing:".05em" }}>
                        Nearest
                      </div>
                    )}

                    {/* Icon + name */}
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, marginTop: nearbyOrder && nearbyOrder[0]===branch.id ? 20 : 0 }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:isSel?"var(--brand)":"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 180ms", flexShrink:0 }}>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={isSel?"#fff":"var(--t3)"} strokeWidth="1.8">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:700, color:isSel?"var(--brand)":"var(--t1)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-.01em" }}>
                          {branch.name}
                        </div>
                        {branch._dist != null && branch._dist < 100 && (
                          <div style={{ fontSize:".6875rem", color:"var(--t3)", marginTop:1 }}>
                            {branch._dist < 1 ? `${Math.round(branch._dist*1000)}m away` : `${branch._dist.toFixed(1)}km away`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    {branch.address && (
                      <div style={{ display:"flex", alignItems:"flex-start", gap:5, fontSize:".75rem", color:"var(--t3)", lineHeight:1.4, marginBottom:8 }}>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:1 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>{branch.address}</span>
                      </div>
                    )}

                    {/* Phone */}
                    {branch.phone && (
                      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:".75rem", color:"var(--t3)" }}>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.86 9.11a19.79 19.79 0 01-3.07-8.63A2 2 0 012.8 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 9.91a16 16 0 006 6l.97-.97a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 17.2z"/></svg>
                        <span>{branch.phone}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer CTA ──────────────────────────────────────────────── */}
        {!error && branches.length > 0 && (
          <div style={{ padding:"16px 24px 20px", borderTop:"1px solid var(--bd)", flexShrink:0 }}>
            {selected ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.2)", borderRadius:12, marginBottom:12 }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
                <span style={{ fontSize:".875rem", color:"var(--ok)", fontWeight:600 }}>{selected.name} selected</span>
              </div>
            ) : (
              <div style={{ textAlign:"center", fontSize:".8125rem", color:"var(--t3)", marginBottom:12 }}>
                Tap a location above to select it
              </div>
            )}
            <button onClick={handleConfirm} disabled={!selected || confirming}
              style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", cursor:!selected||confirming?"not-allowed":"pointer", fontFamily:"var(--ff-b)", fontSize:"1rem", fontWeight:800, background:!selected?"var(--bg3)":"var(--brand)", color:!selected?"var(--t4)":"#fff", transition:"all .2s", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:selected?"0 6px 20px rgba(232,82,26,.35)":"none" }}>
              {confirming ? (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ animation:"spin 1s linear infinite" }}><path d="M21 12a9 9 0 01-9 9M3 12a9 9 0 019-9"/></svg>
                  Entering…
                </>
              ) : selected ? (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
                  Go to {selected.name}
                </>
              ) : "Select a branch to continue"}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
