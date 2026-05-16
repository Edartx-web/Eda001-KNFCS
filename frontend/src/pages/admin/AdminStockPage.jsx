/**
 * AdminStockPage.jsx
 * Route: /admin/stock  (BranchAdmin)
 *
 * Morning workflow — two modes:
 *   "Set opening stock" — enter today's opening quantity for each item
 *    POST /stock/topup/ with is_opening=true
 *
 *   "Top-up" — add stock mid-day for specific items
 *    POST /stock/topup/ with is_opening=false
 *
 * Always shows current dashboard state at top.
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link }                      from "react-router-dom";
import { gsap }                      from "gsap";
import AppLayout                     from "../../components/layout/AppLayout";
import KNCLoader, { usePageLoader }  from "../../components/common/KNCLoader";
import { useAuth }                   from "../../context/AuthContext";
import axiosClient                   from "../../api/axiosClient";
import { adminGetItems }             from "../../api/menu";
import { formatPrice }               from "../../utils/format";

const topUp = d => axiosClient.post("/stock/topup/", d);
const getStock = () => axiosClient.get("/stock/");
const ackAlerts = () => axiosClient.patch("/stock/alerts/ack/");

/* ─── Icons ──────────────────────────────────────────────────────────── */
const Ic = {
  Alert:  () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>,
  Plus:   () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/></svg>,
  Check:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>,
  Save:   () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Box:    () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Sun:    () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/></svg>,
};

/* ─── Quick presets ──────────────────────────────────────────────────── */
const PRESETS = [10, 20, 30, 50, 100];

/* ─── Top-up modal ───────────────────────────────────────────────────── */
/* ── Threshold inline editor ─────────────────────────────────────────── */
function ThresholdCell({ item, onSaved }) {
  const [editing,  setEditing]  = useState(false);
  const [val,      setVal]      = useState(item.threshold || 10);
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await axiosClient.patch("/stock/threshold/", {
        menu_item_id:       item.menu_item_id,
        low_stock_threshold: Number(val),
      });
      setEditing(false);
      onSaved();
    } catch {}
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:"4px", justifyContent:"center" }}>
        <input
          type="number" min="1" max="9999"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter") save(); if (e.key==="Escape") setEditing(false); }}
          autoFocus
          style={{ width:"52px", padding:"4px 6px", borderRadius:"var(--r2)", border:"1.5px solid var(--brand)", background:"var(--bgc)", color:"var(--t1)", fontSize:".8125rem", fontFamily:"var(--ff-b)", outline:"none", textAlign:"center" }}
        />
        <button onClick={save} disabled={saving}
          style={{ width:"22px", height:"22px", borderRadius:"var(--r2)", border:"none", background:"var(--ok)", cursor:"pointer", color:"#fff", fontSize:"12px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {saving ? "…" : "✓"}
        </button>
        <button onClick={() => setEditing(false)}
          style={{ width:"22px", height:"22px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", color:"var(--t3)", fontSize:"12px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => { setVal(item.threshold || 10); setEditing(true); }}
      title="Click to edit alert threshold"
      style={{ textAlign:"center", width:"100%", background:"none", border:"1px dashed transparent", borderRadius:"var(--r2)", cursor:"pointer", padding:"4px", transition:"all var(--d1) var(--ease)", fontFamily:"var(--ff-d)", fontWeight:700, color:"var(--t3)", fontSize:".875rem" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.color="var(--t1)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="transparent"; e.currentTarget.style.color="var(--t3)"; }}>
      {item.threshold || 10}
    </button>
  );
}

/* ── Carryover toggle ────────────────────────────────────────────────── */
function CarryoverToggle({ item, onSaved }) {
  const [on,      setOn]      = useState(item.carries_over !== false);
  const [saving,  setSaving]  = useState(false);

  const toggle = async () => {
    const next = !on;
    setSaving(true);
    try {
      await axiosClient.patch("/stock/carryover/", {
        menu_item_id: item.menu_item_id,
        carries_over: next,
      });
      setOn(next);
      onSaved();
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
      <button onClick={toggle} disabled={saving}
        title={on ? "Stock rolls over midnight → click to reset daily" : "Stock resets to 0 at midnight → click to enable rollover"}
        style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 8px", borderRadius:"var(--r2)", border:`1px solid ${on?"rgba(29,158,117,.3)":"var(--bd)"}`, background:on?"rgba(29,158,117,.08)":"var(--bg2)", cursor:"pointer", fontSize:".75rem", fontWeight:700, fontFamily:"var(--ff-b)", color:on?"var(--ok)":"var(--t4)", transition:"all var(--d1) var(--ease)", opacity:saving?.6:1 }}>
        <span>{on ? "↻" : "✕"}</span>
        <span>{on ? "Rolls" : "Resets"}</span>
      </button>
    </div>
  );
}

function TopUpModal({ item, onClose, onDone }) {
  const [qty,        setQty]        = useState("");
  const [isOpening,  setIsOpening]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (ref.current && typeof gsap !== "undefined")
      gsap.fromTo(ref.current, { scale:.92, opacity:0, y:16 }, { scale:1, opacity:1, y:0, duration:.28, ease:"back.out(1.8)" });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async () => {
    const q = parseInt(qty);
    if (!q || q <= 0) return;
    setSubmitting(true);
    try {
      const payload = { menu_item_id: item.menu_item_id || item.id, quantity: q, is_opening: isOpening };
      if (item.branch_id) payload.branch_id = item.branch_id; // SuperAdmin explicit branch
      await topUp(payload);
      setDone(true);
      setTimeout(() => { onDone(); onClose(); }, 900);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.6)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
      <div ref={ref} onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:"400px", background:"var(--bgc)", borderRadius:"var(--r5)", padding:"var(--s6)", boxShadow:"var(--sh-xl)", border:"1px solid var(--bd)" }}>
        <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, marginBottom:"var(--s2)", letterSpacing:"-.015em" }}>
          Add stock
        </h3>
        <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)" }}>
          {item.menu_item_name || item.name}
          {item.remaining_stock != null && (
            <span style={{ marginLeft:"var(--s2)", fontFamily:"var(--ff-d)", fontWeight:800, color:item.status==="out"?"var(--err)":item.status==="low"?"var(--warn)":"var(--ok)" }}>
              · {item.remaining_stock} left
            </span>
          )}
        </p>

        {/* Opening stock toggle */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s4)", background:isOpening?"linear-gradient(135deg,rgba(232,82,26,.08),rgba(232,82,26,.03))":"var(--bg2)", border:`1px solid ${isOpening?"var(--bdb)":"var(--bd)"}`, borderRadius:"var(--r3)", marginBottom:"var(--s4)", cursor:"pointer", transition:"all var(--d1) var(--ease)" }}
          onClick={() => setIsOpening(v => !v)}>
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
            <Ic.Sun/>
            <div>
              <div style={{ fontSize:".9375rem", fontWeight:700, color:isOpening?"var(--brand)":"var(--t1)" }}>Opening stock</div>
              <div style={{ fontSize:".75rem", color:"var(--t3)" }}>Sets today's starting quantity (OPENING_SET)</div>
            </div>
          </div>
          <button className={`toggle ${isOpening?"on":"off"}`} onClick={e => e.stopPropagation()} onClickCapture={e => { e.stopPropagation(); setIsOpening(v => !v); }}>
            <div className="toggle-knob"/>
          </button>
        </div>

        {/* Quick presets */}
        <div style={{ marginBottom:"var(--s3)" }}>
          <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s2)" }}>Quick add</div>
          <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap" }}>
            {PRESETS.map(p => (
              <button key={p} onClick={() => setQty(String(p))}
                style={{ flex:1, minWidth:"52px", padding:"8px 4px", borderRadius:"var(--r3)", border:`1.5px solid ${qty===String(p)?"var(--brand)":"var(--bd)"}`, background:qty===String(p)?"var(--brand-tint)":"var(--bg2)", cursor:"pointer", fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, color:qty===String(p)?"var(--brand)":"var(--t2)", transition:"all var(--d1) var(--ease)" }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom qty */}
        <div className="input-wrap" style={{ marginBottom:"var(--s5)" }}>
          <span style={{ fontFamily:"var(--ff-d)", fontWeight:900, color:"var(--t3)", fontSize:"1.125rem" }}>#</span>
          <input ref={inputRef} type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
            placeholder="Custom quantity…" className="input-field"
            style={{ fontFamily:"var(--ff-d)", fontWeight:700, fontSize:"1.125rem" }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}/>
        </div>

        <div style={{ display:"flex", gap:"var(--s2)" }}>
          <button onClick={handleSubmit} disabled={submitting || done || !qty}
            className="btn btn-p btn-lg" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", background:done?"var(--ok)":undefined }}>
            {done ? <><Ic.Check/> Added!</> : submitting ? "Adding…" : <><Ic.Plus/> Add {qty || "?"}</>}
          </button>
          <button onClick={onClose} className="btn btn-s btn-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Opening stock set UI ───────────────────────────────────────────── */
function OpeningStockPanel({ menuItems, branchId, onClose, onDone }) {
  // quantities[id] = string value
  const [quantities, setQuantities] = useState({});
  const [saving,     setSaving]     = useState({});
  const [saved,      setSaved]      = useState({});
  const [saveAll,    setSaveAll]    = useState(false);
  const [allDone,    setAllDone]    = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (panelRef.current && typeof gsap !== "undefined") {
      gsap.from(panelRef.current, { y:24, opacity:1, duration:.45, ease:"power2.out" });
    }
    // Pre-fill with 0
    const init = {};
    menuItems.forEach(i => { init[i.id] = ""; });
    setQuantities(init);
  }, []);

  const handleSaveOne = async (item) => {
    const qty = parseInt(quantities[item.id]);
    if (!qty || qty <= 0) return;
    setSaving(s => ({...s, [item.id]:true}));
    try {
      const payload = { menu_item_id: item.id, quantity: qty, is_opening: true };
      if (branchId) payload.branch_id = branchId;
      await topUp(payload);
      setSaved(s => ({...s, [item.id]:true}));
    } catch {}
    finally { setSaving(s => ({...s, [item.id]:false})); }
  };

  const handleSaveAll = async () => {
    setSaveAll(true);
    const items = menuItems.filter(i => parseInt(quantities[i.id]) > 0);
    await Promise.all(items.map(item => {
      const payload = { menu_item_id: item.id, quantity: parseInt(quantities[item.id]), is_opening: true };
      if (branchId) payload.branch_id = branchId;
      return topUp(payload)
        .then(() => setSaved(s => ({...s, [item.id]:true})))
        .catch(() => {});
    }));
    setSaveAll(false);
    setAllDone(true);
    setTimeout(() => { onDone(); onClose(); }, 1000);
  };

  const filled = Object.values(quantities).filter(v => parseInt(v) > 0).length;

  return (
    <div ref={panelRef} style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden", marginBottom:"var(--s6)" }}>
      {/* Panel header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s4) var(--s5)", background:"linear-gradient(135deg,rgba(232,82,26,.08),rgba(232,82,26,.03))", borderBottom:"1px solid var(--bd)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"var(--r3)", background:"var(--brand)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Ic.Sun/>
          </div>
          <div>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, color:"var(--brand)" }}>Set opening stock</div>
            <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>Enter today's starting quantities — {filled} of {menuItems.length} filled</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"var(--s2)" }}>
          <button onClick={handleSaveAll} disabled={saveAll || allDone || filled === 0}
            className="btn btn-p btn-lg" style={{ display:"flex", alignItems:"center", gap:"var(--s2)", background:allDone?"var(--ok)":undefined }}>
            {allDone ? <><Ic.Check/> Saved all!</> : saveAll ? "Saving…" : <><Ic.Save/> Save all ({filled})</>}
          </button>
          <button onClick={onClose} className="btn btn-g">Cancel</button>
        </div>
      </div>

      {/* Header row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 120px 80px", gap:"var(--s3)", padding:"var(--s2) var(--s5)", background:"var(--bg2)", borderBottom:"1px solid var(--bd)" }}>
        {["Item","Category","Opening qty",""].map((h, i) => (
          <div key={i} style={{ fontSize:".5625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", textAlign:i > 1 ? "center" : "left" }}>{h}</div>
        ))}
      </div>

      {/* Items */}
      <div style={{ maxHeight:"60vh", overflowY:"auto" }}>
        {menuItems.map((item, idx) => {
          const isSaved = saved[item.id];
          const qty = quantities[item.id] || "";
          return (
            <div key={item.id}
              style={{ display:"grid", gridTemplateColumns:"1fr 120px 120px 80px", gap:"var(--s3)", padding:"var(--s3) var(--s5)", borderBottom:idx < menuItems.length-1?"1px solid var(--bd)":"none", alignItems:"center", background:isSaved?"rgba(29,158,117,.04)":"transparent", transition:"background var(--d1) var(--ease)" }}>

              {/* Name */}
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", minWidth:0 }}>
                {item.emoji && <span style={{ fontSize:"1.125rem", flexShrink:0 }}>{item.emoji}</span>}
                <div>
                  <div style={{ fontWeight:600, fontSize:".9375rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                  {!item.is_available && <span style={{ fontSize:".625rem", color:"var(--err)", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em" }}>Unavailable</span>}
                </div>
              </div>

              {/* Category */}
              <div style={{ fontSize:".8125rem", color:"var(--t3)", textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {item.category_name || "—"}
              </div>

              {/* Input */}
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", justifyContent:"center" }}>
                {PRESETS.slice(0,3).map(p => (
                  <button key={p} onClick={() => setQuantities(q => ({...q, [item.id]:String(p)}))}
                    style={{ padding:"3px 8px", borderRadius:"var(--r2)", border:`1px solid ${qty===String(p)?"var(--brand)":"var(--bd)"}`, background:qty===String(p)?"var(--brand-tint)":"transparent", cursor:"pointer", fontSize:".75rem", fontWeight:700, color:qty===String(p)?"var(--brand)":"var(--t3)", transition:"all var(--d1) var(--ease)" }}>
                    {p}
                  </button>
                ))}
                <input type="number" min="0" value={qty}
                  onChange={e => setQuantities(q => ({...q, [item.id]:e.target.value}))}
                  placeholder="0"
                  style={{ width:"60px", border:`1px solid ${qty&&parseInt(qty)>0?"var(--brand)":"var(--bd)"}`, borderRadius:"var(--r2)", background:"var(--bg2)", color:"var(--t1)", fontSize:".9375rem", fontFamily:"var(--ff-d)", fontWeight:700, outline:"none", padding:"5px var(--s2)", textAlign:"center", transition:"border-color var(--d1) var(--ease)" }}/>
              </div>

              {/* Save / saved */}
              <div style={{ display:"flex", justifyContent:"center" }}>
                {isSaved ? (
                  <span style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:".75rem", fontWeight:700, color:"var(--ok)" }}>
                    <Ic.Check/> Saved
                  </span>
                ) : (
                  <button onClick={() => handleSaveOne(item)}
                    disabled={saving[item.id] || !qty || parseInt(qty) <= 0}
                    style={{ padding:"5px 14px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:(!qty||parseInt(qty)<=0)?"default":"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)", opacity:(!qty||parseInt(qty)<=0)?.4:1, transition:"all var(--d1) var(--ease)" }}
                    onMouseEnter={e => { if(qty&&parseInt(qty)>0){e.currentTarget.style.background="var(--brand-tint)";e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.color="var(--brand)";} }}
                    onMouseLeave={e => { e.currentTarget.style.background="var(--bg2)";e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.color="var(--t2)"; }}>
                    {saving[item.id] ? "…" : "Set"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function AdminStockPage() {
  const { user } = useAuth();
  const { loading: pageLoading } = usePageLoader(800);
  const headerRef = useRef(null);
  const isSuperAdmin = user?.role === "super_admin";

  const [stock,       setStock]       = useState([]);
  const [menuItems,   setMenuItems]   = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [alertCount,  setAlertCount]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [topUpItem,   setTopUpItem]   = useState(null);
  const [showOpening, setShowOpening] = useState(false);
  const [branches,    setBranches]    = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(user?.branch_id || "");

  // Load branches list for SuperAdmin
  useEffect(() => {
    if (!isSuperAdmin) return;
    import("../../api/auth").then(({ getBranches }) => {
      getBranches()
        .then(r => {
          const bs = r.data.branches || [];
          setBranches(bs);
          if (!activeBranchId && bs.length > 0) setActiveBranchId(bs[0].id);
        })
        .catch(() => {});
    });
  }, [isSuperAdmin]);

  const effectiveBranchId = isSuperAdmin ? activeBranchId : (user?.branch_id || "");

  const loadStock = useCallback(async () => {
    if (!effectiveBranchId) return;
    setLoading(true);
    try {
      const params = isSuperAdmin ? { branch_id: effectiveBranchId } : {};
      const res = await axiosClient.get("/stock/", { params });
      setStock(res.data.stock || []);
      setAlerts(res.data.alerts || []);
      setAlertCount(res.data.alert_count || 0);
    } finally { setLoading(false); }
  }, [effectiveBranchId, isSuperAdmin]);

  useEffect(() => {
    if (!effectiveBranchId) return;
    loadStock();
    adminGetItems({}, effectiveBranchId)
      .then(r => setMenuItems(r.data.items || []))
      .catch(() => {});
  }, [effectiveBranchId]);

  useEffect(() => {
    if (!headerRef.current || typeof gsap === "undefined") return;
    gsap.from(headerRef.current, { y:-12, opacity:0, duration:.45, ease:"power2.out" });
  }, []);

  const handleAck = async () => { await ackAlerts(); setAlertCount(0); setAlerts([]); };

  if (pageLoading) return <KNCLoader visible label="Loading stock…"/>;

  const outCount  = stock.filter(s => s.status === "out").length;
  const lowCount  = stock.filter(s => s.status === "low").length;
  const okCount   = stock.filter(s => s.status === "ok").length;
  const totalStock= stock.reduce((a, s) => a + s.remaining_stock, 0);

  return (
    <AppLayout>
      <div ref={headerRef} style={{ maxWidth:"1000px", margin:"0 auto" }}>

        {/* ── Page header ───────────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s6)", flexWrap:"wrap", gap:"var(--s4)" }}>
          <div>
            <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"var(--brand)", marginBottom:"var(--s2)", display:"flex", alignItems:"center", gap:"var(--s2)" }}>
              <Ic.Box/>
              {isSuperAdmin
                ? (branches.find(b=>b.id===activeBranchId)?.name || "All branches")
                : (user?.branch_name || "Branch")
              } · Stock
            </div>
            <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.75rem,3.5vw,2.5rem)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.05, marginBottom:"var(--s2)" }}>
              Stock dashboard
            </h1>
            <p style={{ fontSize:".9375rem", color:"var(--t3)" }}>
              {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })} · Today's inventory
            </p>
          </div>
          <div style={{ display:"flex", gap:"var(--s2)", alignItems:"center", flexWrap:"wrap" }}>
            {/* SuperAdmin branch selector */}
            {isSuperAdmin && branches.length > 0 && (
              <select value={activeBranchId} onChange={e => setActiveBranchId(e.target.value)}
                style={{ padding:"8px 12px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", cursor:"pointer", fontWeight:600, outline:"none" }}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <button onClick={() => setShowOpening(v => !v)}
              style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"10px 18px", borderRadius:"var(--r3)", border:`1.5px solid ${showOpening?"var(--brand)":"var(--bd)"}`, background:showOpening?"var(--brand-tint)":"var(--bg2)", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, color:showOpening?"var(--brand)":"var(--t2)", transition:"all var(--d1) var(--ease)" }}>
              <Ic.Sun/> {showOpening ? "Close" : "Set opening stock"}
            </button>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────── */}
        <div className="stats-grid" style={{ marginBottom:"var(--s6)" }}>
          {[
            { label:"Out of stock", value:outCount,  color:"var(--err)",  sub:"Needs replenishment" },
            { label:"Low stock",    value:lowCount,  color:"var(--warn)", sub:`Below threshold` },
            { label:"Well stocked", value:okCount,   color:"var(--ok)",   sub:"Sufficient supply" },
            { label:"Total units",  value:totalStock,color:"var(--info)", sub:"Remaining today" },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:`linear-gradient(90deg,${s.color},transparent)`, borderRadius:"var(--r4) var(--r4) 0 0" }}/>
              <div className="stat-lbl">{s.label}</div>
              <div className="stat-val" style={{ color:s.color }}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Alert banners ─────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div style={{ marginBottom:"var(--s5)", display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
            {alerts.slice(0, 5).map(a => {
              const stockItem = stock.find(s => s.menu_item_name === a.menu_item_name);
              return (
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:"var(--s3)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.22)", borderRadius:"var(--r4)", padding:"var(--s3) var(--s4)", borderLeft:"3px solid var(--err)" }}>
                  <div style={{ color:"var(--err)", flexShrink:0 }}><Ic.Alert/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontWeight:700, color:"var(--err)" }}>{a.menu_item_name}</span>
                    <span style={{ color:"var(--t2)", marginLeft:"var(--s2)" }}>
                      — {a.alert_type === "out" ? "Out of stock" : "Running low"}
                    </span>
                  </div>
                  <button onClick={() => setTopUpItem(stockItem || { menu_item_id: a.menu_item_id, menu_item_name: a.menu_item_name, remaining_stock: 0, status:"out" })}
                    style={{ padding:"6px 14px", borderRadius:"var(--r2)", background:"var(--err)", color:"#fff", border:"none", cursor:"pointer", fontSize:".8125rem", fontWeight:700, fontFamily:"var(--ff-b)", flexShrink:0, display:"flex", alignItems:"center", gap:"5px" }}>
                    <Ic.Plus/> Add stock
                  </button>
                </div>
              );
            })}
            <button onClick={handleAck}
              style={{ alignSelf:"flex-start", padding:"7px 16px", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--rf)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--ff-b)", color:"var(--t2)" }}>
              Mark {alertCount} alert{alertCount!==1?"s":""} as seen ✓
            </button>
          </div>
        )}

        {/* ── Opening stock panel ───────────────────────────────────── */}
        {showOpening && menuItems.length > 0 && (
          <OpeningStockPanel
            menuItems={menuItems}
            branchId={effectiveBranchId}
            onClose={() => setShowOpening(false)}
            onDone={loadStock}
          />
        )}

        {/* ── Stock table ───────────────────────────────────────────── */}
        <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden" }}>
          {/* Header */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 90px 80px 80px 90px", gap:"var(--s3)", padding:"var(--s3) var(--s5)", background:"var(--bg2)", borderBottom:"1px solid var(--bd)" }}>
            {["Item", "Total", "Used", "Left", "Alert at", "Rollover", "Action"].map((h, i) => (
              <div key={i} style={{ fontSize:".5625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", textAlign:i > 0 ? "center" : "left" }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding:"var(--s8)", textAlign:"center", color:"var(--t3)" }}>Loading…</div>
          ) : stock.length === 0 ? (
            <div style={{ padding:"var(--s12)", textAlign:"center" }}>
              <div style={{ fontSize:"3rem", marginBottom:"var(--s4)" }}>📦</div>
              <p style={{ fontWeight:700, marginBottom:"var(--s2)", fontSize:".9375rem" }}>No stock data today</p>
              <p style={{ color:"var(--t3)", marginBottom:"var(--s5)", fontSize:".875rem" }}>Set opening stock to get started.</p>
              <button onClick={() => setShowOpening(true)} className="btn btn-p btn-lg">
                <Ic.Sun/> Set opening stock
              </button>
            </div>
          ) : stock.map((s, i) => {
            const c = s.status === "out" ? "var(--err)" : s.status === "low" ? "var(--warn)" : "var(--ok)";
            return (
              <div key={s.menu_item_id}
                style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 90px 80px 80px 90px", gap:"var(--s3)", padding:"var(--s4) var(--s5)", borderBottom:i < stock.length-1?"1px solid var(--bd)":"none", alignItems:"center", borderLeft:`3px solid ${s.status!=="ok"?c:"transparent"}`, background:s.status!=="ok"?`${c}05`:"transparent", transition:"background var(--d1) var(--ease)" }}
                onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                onMouseLeave={e => e.currentTarget.style.background=s.status!=="ok"?`${c}05`:"transparent"}>

                <div>
                  <div style={{ fontWeight:600, fontSize:".9375rem" }}>{s.menu_item_name}</div>
                  {s.status !== "ok" && (
                    <div style={{ fontSize:".6875rem", fontWeight:800, textTransform:"uppercase", letterSpacing:".06em", color:c, marginTop:"2px" }}>
                      {s.status === "out" ? "⚠ Out of stock" : "⚠ Running low"}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:"center", fontWeight:600, color:"var(--t3)", fontFamily:"var(--ff-d)" }}>{s.today_stock}</div>
                <div style={{ textAlign:"center", fontWeight:600, color:"var(--t3)", fontFamily:"var(--ff-d)" }}>{s.used_stock}</div>
                <div style={{ textAlign:"center" }}>
                  <span style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, color:c }}>{s.remaining_stock}</span>
                </div>
                {/* Threshold inline editor */}
                <ThresholdCell item={s} onSaved={loadStock} />
                {/* Carryover toggle */}
                <CarryoverToggle item={s} onSaved={loadStock} />
                <div style={{ display:"flex", justifyContent:"center" }}>
                  <button onClick={() => setTopUpItem({...s, branch_id: effectiveBranchId})}
                    style={{ padding:"7px 16px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)", display:"inline-flex", alignItems:"center", gap:"4px" }}
                    onMouseEnter={e => { e.currentTarget.style.background="var(--brand-tint)"; e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.color="var(--brand)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="var(--bg2)"; e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.color="var(--t2)"; }}>
                    <Ic.Plus/> Top up
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign:"center", marginTop:"var(--s4)", fontSize:".8125rem", color:"var(--t4)" }}>
          Stock resets midnight · Next carryover in {24 - new Date().getHours()}h
        </div>
      </div>

      {/* Top-up modal */}
      {topUpItem && (
        <TopUpModal
          item={topUpItem}
          onClose={() => setTopUpItem(null)}
          onDone={loadStock}
        />
      )}
    </AppLayout>
  );
}
