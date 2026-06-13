/**
 * StockComponents.jsx
 * Shared stock UI — used by AdminStockPage and the SuperAdmin stock tab.
 */
import React, { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import axiosClient from "../../api/axiosClient";

export const topUpStock      = d => axiosClient.post("/stock/topup/", d);
export const rejectCarryover = d => axiosClient.post("/stock/reject-carryover/", d);
export const rollbackStock   = d => axiosClient.post("/stock/rollback/", d);
export const lockStock       = d => axiosClient.post("/stock/lock/", d);
export const unlockStock     = () => axiosClient.delete("/stock/lock/");
export const getLockStatus   = () => axiosClient.get("/stock/lock/");
export const getActivity     = p  => axiosClient.get("/stock/activity/", { params: p });

export const PRESETS = [10, 20, 30, 50, 100];

/* ─── Icons ──────────────────────────────────────────────────────────── */
export const IcPlus    = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/></svg>;
export const IcCheck   = () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>;
export const IcAlert   = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>;
export const IcSave    = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
export const IcSun     = () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/></svg>;
export const IcX       = () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/></svg>;
export const IcRefresh = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round"/></svg>;
export const IcBox     = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
export const IcLock    = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/></svg>;
export const IcUnlock  = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1" strokeLinecap="round"/></svg>;
export const IcHistory = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeLinecap="round"/></svg>;
export const IcRollback= () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 010 8h-1" strokeLinecap="round"/></svg>;

/* ─── ItemAvatar ─────────────────────────────────────────────────────── */
export function ItemAvatar({ item, size = 44 }) {
  const [imgErr, setImgErr] = useState(false);
  const src = item.image_url || null;
  if (src && !imgErr) {
    return <img src={src} alt={item.menu_item_name || item.name || ""} onError={() => setImgErr(true)}
      style={{ width:size, height:size, borderRadius:"var(--r3)", objectFit:"cover", flexShrink:0, display:"block" }} />;
  }
  if (item.emoji) {
    return <span style={{ fontSize:Math.round(size*.72)+"px", flexShrink:0, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center", width:size, height:size }}>{item.emoji}</span>;
  }
  const initial = ((item.menu_item_name || item.name || "?")[0] || "?").toUpperCase();
  return <div style={{ width:size, height:size, borderRadius:"var(--r3)", background:"var(--bg3)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--ff-d)", fontWeight:900, fontSize:Math.round(size*.42)+"px", color:"var(--t3)" }}>{initial}</div>;
}

/* ─── ThresholdCell ──────────────────────────────────────────────────── */
export function ThresholdCell({ item, onSaved, disabled }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(item.threshold || 10);
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await axiosClient.patch("/stock/threshold/", { menu_item_id: item.menu_item, low_stock_threshold: Number(val) });
      setEditing(false);
      onSaved();
    } catch {}
    finally { setSaving(false); }
  };

  if (disabled) return (
    <span style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:"var(--r2)", border:"1px dashed var(--bd)", fontSize:".8125rem", fontWeight:600, color:"var(--t4)" }}>
      <IcAlert /> {item.threshold || 10}
    </span>
  );

  if (editing) return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <span style={{ fontSize:".75rem", color:"var(--t4)", fontWeight:600 }}>Alert:</span>
      <input type="number" min="1" max="9999" value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key==="Enter") save(); if (e.key==="Escape") setEditing(false); }}
        autoFocus style={{ width:48, padding:"4px 6px", borderRadius:"var(--r2)", border:"1.5px solid var(--brand)", background:"var(--bgc)", color:"var(--t1)", fontSize:".8125rem", fontFamily:"var(--ff-d)", fontWeight:700, outline:"none", textAlign:"center" }} />
      <button onClick={save} disabled={saving} style={{ width:24, height:24, borderRadius:"var(--r2)", border:"none", background:"var(--ok)", cursor:"pointer", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {saving ? "…" : <IcCheck />}
      </button>
      <button onClick={() => setEditing(false)} style={{ width:24, height:24, borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", color:"var(--t3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><IcX /></button>
    </div>
  );

  return (
    <button onClick={() => { setVal(item.threshold || 10); setEditing(true); }} title="Click to edit alert threshold"
      style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:"var(--r2)", border:"1px dashed var(--bd)", background:"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--t3)", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.color="var(--t1)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.color="var(--t3)"; }}>
      <IcAlert /> {item.threshold || 10}
    </button>
  );
}

/* ─── CarryoverToggle ────────────────────────────────────────────────── */
export function CarryoverToggle({ item, onSaved, disabled }) {
  const [on,     setOn]     = useState(item.carries_over !== false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setOn(item.carries_over !== false); }, [item.carries_over]);

  const toggle = async () => {
    if (disabled) return;
    const next = !on;
    setSaving(true);
    try {
      await axiosClient.patch("/stock/carryover/", { menu_item_id: item.menu_item, carries_over: next });
      setOn(next);
      onSaved();
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <button onClick={toggle} disabled={saving || disabled}
      title={on ? "Rolls over midnight — click to reset daily" : "Resets to 0 at midnight — click to enable rollover"}
      style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:"var(--r2)", border:`1px solid ${on?"rgba(29,158,117,.35)":"var(--bd)"}`, background:on?"rgba(29,158,117,.08)":"transparent", cursor:disabled?"default":"pointer", fontSize:".8125rem", fontWeight:700, fontFamily:"var(--ff-b)", color:on?"var(--ok)":"var(--t4)", opacity:(saving||disabled)?.6:1 }}>
      {on ? "↻ Rolls" : "✕ Resets"}
    </button>
  );
}

/* ─── CarryoverPrompt — fixed with error state ───────────────────────── */
export function CarryoverPrompt({ item, branchId, onDiscard, onKeep }) {
  const [discarding, setDiscarding] = useState(false);
  const [error,      setError]      = useState("");

  const handleDiscard = async () => {
    setDiscarding(true);
    setError("");
    try {
      const payload = { menu_item_id: item.menu_item };
      if (branchId) payload.branch_id = branchId;
      await rejectCarryover(payload);
      onDiscard();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to discard carryover. Try again.");
      setDiscarding(false);
    }
  };

  return (
    <div style={{ margin:"0 var(--s3) var(--s3)", padding:"var(--s3) var(--s4)", background:"rgba(96,165,250,.07)", border:"1px solid rgba(96,165,250,.28)", borderRadius:"var(--r3)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:"160px" }}>
          <span style={{ fontSize:".8125rem", fontWeight:700, color:"#60a5fa" }}>↩ {item.yesterday_remaining} units from yesterday</span>
          <span style={{ fontSize:".8125rem", color:"var(--t3)", marginLeft:"var(--s2)" }}>— include in today?</span>
        </div>
        <div style={{ display:"flex", gap:"var(--s2)", flexShrink:0 }}>
          <button onClick={onKeep}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:"var(--r2)", border:"1.5px solid rgba(29,158,117,.4)", background:"rgba(29,158,117,.1)", cursor:"pointer", fontSize:".875rem", fontWeight:700, color:"var(--ok)", fontFamily:"var(--ff-b)" }}>
            <IcCheck /> Yes, keep
          </button>
          <button onClick={handleDiscard} disabled={discarding}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:"var(--r2)", border:"1.5px solid rgba(226,75,74,.35)", background:"rgba(226,75,74,.07)", cursor:"pointer", fontSize:".875rem", fontWeight:700, color:"var(--err)", fontFamily:"var(--ff-b)", opacity:discarding?.6:1 }}>
            <IcX /> {discarding ? "Discarding…" : "No, discard"}
          </button>
        </div>
      </div>
      {error && (
        <div style={{ marginTop:"var(--s2)", fontSize:".8125rem", color:"var(--err)", fontWeight:600 }}>⚠ {error}</div>
      )}
    </div>
  );
}

/* ─── RollbackButton — pull yesterday's remaining into today ─────────── */
export function RollbackButton({ item, branchId, onDone }) {
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const handleRollback = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = { menu_item_id: item.menu_item };
      if (branchId) payload.branch_id = branchId;
      await rollbackStock(payload);
      setDone(true);
      setTimeout(() => { onDone(); }, 800);
    } catch (e) {
      setError(e.response?.data?.error || "Rollback failed.");
      setLoading(false);
    }
  };

  if (done) return <span style={{ fontSize:".8125rem", fontWeight:700, color:"var(--ok)", display:"flex", alignItems:"center", gap:4 }}><IcCheck /> Rolled back</span>;

  return (
    <div>
      <button onClick={handleRollback} disabled={loading}
        title="Pull yesterday's remaining stock into today"
        style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:"var(--r2)", border:"1px solid rgba(96,165,250,.4)", background:"rgba(96,165,250,.08)", cursor:"pointer", fontSize:".8125rem", fontWeight:700, color:"#60a5fa", fontFamily:"var(--ff-b)", opacity:loading?.6:1 }}>
        <IcRollback /> {loading ? "Rolling back…" : "↩ Rollback yesterday"}
      </button>
      {error && <div style={{ fontSize:".75rem", color:"var(--err)", marginTop:4, fontWeight:600 }}>⚠ {error}</div>}
    </div>
  );
}

/* ─── StockLockBanner ────────────────────────────────────────────────── */
export function StockLockBanner({ lockInfo, isSuperAdmin, onUnlock }) {
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      await unlockStock();
      onUnlock();
    } catch {
      setUnlocking(false);
    }
  };

  const lockedAt = lockInfo?.locked_at ? new Date(lockInfo.locked_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }) : "";
  const isSystem = lockInfo?.is_system;

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"var(--s3)", padding:"var(--s3) var(--s5)", marginBottom:"var(--s4)", background:"rgba(226,75,74,.06)", border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--r4)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
        <div style={{ width:34, height:34, borderRadius:"var(--r3)", background:"rgba(226,75,74,.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <IcLock />
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:".9375rem", color:"var(--err)" }}>
            {isSystem ? "Day closed — midnight snapshot saved" : "Stock locked for today"}
          </div>
          <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:2 }}>
            {isSystem
              ? `Auto-locked at ${lockedAt} by system · Pending stock saved for tomorrow`
              : `Locked at ${lockedAt} by ${lockInfo?.locked_by}${lockInfo?.note ? ` · "${lockInfo.note}"` : ""}`
            }
          </div>
        </div>
      </div>
      {isSuperAdmin && !isSystem && (
        <button onClick={handleUnlock} disabled={unlocking}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:"var(--r3)", border:"1px solid rgba(226,75,74,.35)", background:"transparent", cursor:"pointer", fontSize:".875rem", fontWeight:700, color:"var(--err)", fontFamily:"var(--ff-b)", opacity:unlocking?.6:1 }}>
          <IcUnlock /> {unlocking ? "Unlocking…" : "Unlock"}
        </button>
      )}
    </div>
  );
}

/* ─── TopUpModal ─────────────────────────────────────────────────────── */
export function TopUpModal({ item, onClose, onDone }) {
  const [qty,        setQty]        = useState("");
  const [isOpening,  setIsOpening]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState("");
  const ref      = useRef(null);
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
    setError("");
    try {
      const payload = { menu_item_id: item.menu_item, quantity: q, is_opening: isOpening };
      if (item.branch_id) payload.branch_id = item.branch_id;
      await topUpStock(payload);
      setDone(true);
      setTimeout(() => { onDone(); onClose(); }, 900);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to add stock.");
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.6)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
      <div ref={ref} onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:400, background:"var(--bgc)", borderRadius:"var(--r5)", padding:"var(--s6)", boxShadow:"var(--sh-xl)", border:"1px solid var(--bd)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
          <ItemAvatar item={item} size={48} />
          <div>
            <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:900, letterSpacing:"-.015em", margin:0 }}>Add stock</h3>
            <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:2 }}>
              {item.menu_item_name || item.name}
              {item.remaining_stock != null && (
                <span style={{ marginLeft:"var(--s2)", fontFamily:"var(--ff-d)", fontWeight:800, color:item.status==="out"?"var(--err)":item.status==="low"?"var(--warn)":"var(--ok)" }}>
                  · {item.remaining_stock} left
                </span>
              )}
            </p>
          </div>
        </div>

        <div onClick={() => setIsOpening(v => !v)}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s4)", background:isOpening?"linear-gradient(135deg,rgba(232,82,26,.08),rgba(232,82,26,.03))":"var(--bg2)", border:`1px solid ${isOpening?"var(--bdb)":"var(--bd)"}`, borderRadius:"var(--r3)", marginBottom:"var(--s4)", cursor:"pointer", transition:"all var(--d1) var(--ease)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
            <IcSun />
            <div>
              <div style={{ fontSize:".9375rem", fontWeight:700, color:isOpening?"var(--brand)":"var(--t1)" }}>Opening stock</div>
              <div style={{ fontSize:".75rem", color:"var(--t3)" }}>Sets today's starting quantity</div>
            </div>
          </div>
          <button className={`toggle ${isOpening?"on":"off"}`} onClick={e => { e.stopPropagation(); setIsOpening(v => !v); }}><div className="toggle-knob"/></button>
        </div>

        <div style={{ marginBottom:"var(--s3)" }}>
          <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s2)" }}>Quick add</div>
          <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap" }}>
            {PRESETS.map(p => (
              <button key={p} onClick={() => setQty(String(p))}
                style={{ flex:1, minWidth:52, padding:"8px 4px", borderRadius:"var(--r3)", border:`1.5px solid ${qty===String(p)?"var(--brand)":"var(--bd)"}`, background:qty===String(p)?"var(--brand-tint)":"var(--bg2)", cursor:"pointer", fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, color:qty===String(p)?"var(--brand)":"var(--t2)" }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="input-wrap" style={{ marginBottom:"var(--s4)" }}>
          <span style={{ fontFamily:"var(--ff-d)", fontWeight:900, color:"var(--t3)", fontSize:"1.125rem" }}>#</span>
          <input ref={inputRef} type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
            placeholder="Custom quantity…" className="input-field"
            style={{ fontFamily:"var(--ff-d)", fontWeight:700, fontSize:"1.125rem" }}
            onKeyDown={e => e.key==="Enter" && handleSubmit()} />
        </div>

        {error && <div style={{ marginBottom:"var(--s3)", padding:"var(--s2) var(--s3)", background:"rgba(226,75,74,.08)", border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--r3)", fontSize:".875rem", color:"var(--err)", fontWeight:600 }}>⚠ {error}</div>}

        <div style={{ display:"flex", gap:"var(--s2)" }}>
          <button onClick={handleSubmit} disabled={submitting || done || !qty}
            className="btn btn-p btn-lg" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", background:done?"var(--ok)":undefined }}>
            {done ? <><IcCheck /> Added!</> : submitting ? "Adding…" : <><IcPlus /> Add {qty || "?"}</>}
          </button>
          <button onClick={onClose} className="btn btn-s btn-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─── OpeningStockPanel ───────────────────────────────────────────────── */
export function OpeningStockPanel({ menuItems, branchId, onClose, onDone, onMount }) {
  const [quantities, setQuantities] = useState({});
  const [saving,     setSaving]     = useState({});
  const [saved,      setSaved]      = useState({});
  const [saveAll,    setSaveAll]    = useState(false);
  const [allDone,    setAllDone]    = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    onMount?.(el);
    if (typeof gsap !== "undefined") {
      gsap.set(el, { overflow: "hidden" });
      gsap.from(el, {
        height: 0,
        opacity: 0,
        duration: .42,
        ease: "power2.out",
        onComplete: () => gsap.set(el, { clearProps: "overflow,height" }),
      });
    }
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
      await topUpStock(payload);
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
      return topUpStock(payload).then(() => setSaved(s => ({...s, [item.id]:true}))).catch(() => {});
    }));
    setSaveAll(false);
    setAllDone(true);
    setTimeout(() => { onDone(); onClose(); }, 1000);
  };

  const filled = Object.values(quantities).filter(v => parseInt(v) > 0).length;

  return (
    /* outer wrapper — no overflow:hidden so sticky children work */
    <div ref={panelRef} style={{ border:"1px solid var(--bd)", borderRadius:"var(--r5)", marginBottom:"var(--s5)" }}>

      {/* ── Sticky action bar ── */}
      <div style={{
        position:"sticky", top:"var(--nav-h)", zIndex:50,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"var(--s4) var(--s5)",
        background:"linear-gradient(135deg,rgba(232,82,26,.1),rgba(232,82,26,.05))",
        borderBottom:"1px solid var(--bd)",
        borderRadius:"var(--r5) var(--r5) 0 0",
        backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
          <div style={{ width:34, height:34, borderRadius:"var(--r3)", background:"var(--brand)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><IcSun /></div>
          <div>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, color:"var(--brand)" }}>Set opening stock</div>
            <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>{filled} of {menuItems.length} filled</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"var(--s2)" }}>
          <button onClick={handleSaveAll} disabled={saveAll || allDone || filled === 0}
            className="btn btn-p btn-lg" style={{ display:"flex", alignItems:"center", gap:"var(--s2)", background:allDone?"var(--ok)":undefined }}>
            {allDone ? <><IcCheck /> Saved all!</> : saveAll ? "Saving…" : <><IcSave /> Save all ({filled})</>}
          </button>
          <button onClick={onClose} className="btn btn-g">Cancel</button>
        </div>
      </div>

      {/* ── Item list — scrolls with the page (no inner scroll box) ── */}
      <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", background:"var(--bgc)", borderRadius:"0 0 var(--r5) var(--r5)" }}>
        <div style={{ minWidth:"720px" }}>

          {/* Column headers */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 120px 240px 80px", gap:"12px",
            padding:"8px 20px", background:"var(--bg2)", borderBottom:"1px solid var(--bd)",
          }}>
            {["Item","Category","Quick set qty",""].map((h, i) => (
              <div key={i} style={{ fontSize:".5625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", textAlign:i > 1 ? "center" : "left" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {menuItems.map((item, idx) => {
            const isSaved = saved[item.id];
            const qty = quantities[item.id] || "";
            return (
              <div key={item.id}
                style={{ display:"grid", gridTemplateColumns:"1fr 120px 240px 80px", gap:"12px", padding:"10px 20px", borderBottom:idx < menuItems.length-1 ? "1px solid var(--bd)" : "none", alignItems:"center", background:isSaved ? "rgba(29,158,117,.04)" : "transparent", transition:"background .2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", minWidth:0 }}>
                  <ItemAvatar item={item} size={32} />
                  <div style={{ fontWeight:600, fontSize:".9375rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                </div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)", textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.category_name || "—"}</div>
                <div style={{ display:"flex", alignItems:"center", gap:"6px", justifyContent:"center" }}>
                  {PRESETS.slice(0, 3).map(p => (
                    <button key={p} onClick={() => setQuantities(q => ({...q, [item.id]:String(p)}))}
                      style={{ padding:"4px 10px", borderRadius:"var(--r2)", border:`1px solid ${qty===String(p)?"var(--brand)":"var(--bd)"}`, background:qty===String(p)?"var(--brand-tint)":"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:700, color:qty===String(p)?"var(--brand)":"var(--t3)", flexShrink:0 }}>
                      {p}
                    </button>
                  ))}
                  <input type="number" min="0" value={qty} onChange={e => setQuantities(q => ({...q, [item.id]:e.target.value}))} placeholder="0"
                    style={{ width:54, border:`1px solid ${qty&&parseInt(qty)>0?"var(--brand)":"var(--bd)"}`, borderRadius:"var(--r2)", background:"var(--bg2)", color:"var(--t1)", fontSize:".9375rem", fontFamily:"var(--ff-d)", fontWeight:700, outline:"none", padding:"5px 6px", textAlign:"center", flexShrink:0 }} />
                </div>
                <div style={{ display:"flex", justifyContent:"center" }}>
                  {isSaved ? (
                    <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:".75rem", fontWeight:700, color:"var(--ok)" }}><IcCheck /> Saved</span>
                  ) : (
                    <button onClick={() => handleSaveOne(item)} disabled={saving[item.id] || !qty || parseInt(qty) <= 0}
                      style={{ padding:"5px 14px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:(!qty||parseInt(qty)<=0)?"default":"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)", opacity:(!qty||parseInt(qty)<=0)?.4:1, transition:"all .15s" }}
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
    </div>
  );
}

/* ─── StockCard ──────────────────────────────────────────────────────── */
export function StockCard({ s, branchId, onTopUp, onReload, isAcknowledged, onAcknowledge, isLocked }) {
  const statusColor  = s.status === "out" ? "var(--err)" : (s.status === "low" || s.status === "critical") ? "var(--warn)" : "var(--ok)";
  const statusLabels = { out:"Out of stock", low:"Low stock", critical:"Critical!", ok:"In stock" };
  const showCarryoverPrompt = s.yesterday_remaining > 0 && s.new_stock_added === 0 && !isAcknowledged && !isLocked;
  // Show rollback option only when no yesterday_remaining is set yet but stock is 0/new
  const showRollback = !isLocked && s.yesterday_remaining === 0 && s.today_stock === 0;

  return (
    <div style={{ background:"var(--bgc)", border:`1px solid ${s.status !== "ok" ? statusColor + "44" : "var(--bd)"}`, borderRadius:"var(--r4)", overflow:"hidden", display:"flex", flexDirection:"column", opacity:isLocked ? .85 : 1 }}>

      {/* Header */}
      <div style={{ padding:"var(--s4) var(--s4) var(--s3)", borderBottom:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"var(--s2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", minWidth:0, flex:1 }}>
          <ItemAvatar item={s} size={44} />
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:".9375rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.menu_item_name}</div>
            <div style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:1 }}>{s.category}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", flexShrink:0 }}>
          {isLocked && <span title="Stock locked" style={{ color:"var(--t4)", display:"flex" }}><IcLock /></span>}
          <span style={{ padding:"3px 10px", borderRadius:"var(--rf)", background:`${statusColor}18`, color:statusColor, fontSize:".625rem", fontWeight:800, textTransform:"uppercase", letterSpacing:".06em" }}>
            {statusLabels[s.status] || s.status}
          </span>
        </div>
      </div>

      {/* Stock breakdown */}
      <div style={{ display:"flex", borderBottom:"1px solid var(--bd)" }}>
        {s.yesterday_remaining > 0 && (
          <div style={{ flex:1, padding:"var(--s3) var(--s2)", textAlign:"center", borderRight:"1px solid var(--bd)" }}>
            <div style={{ fontSize:".5rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:2 }}>Yesterday</div>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, color:"#60a5fa" }}>↩{s.yesterday_remaining}</div>
          </div>
        )}
        {s.new_stock_added > 0 && (
          <div style={{ flex:1, padding:"var(--s3) var(--s2)", textAlign:"center", borderRight:"1px solid var(--bd)" }}>
            <div style={{ fontSize:".5rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:2 }}>Added</div>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, color:"var(--ok)" }}>+{s.new_stock_added}</div>
          </div>
        )}
        <div style={{ flex:1, padding:"var(--s3) var(--s2)", textAlign:"center", borderRight:"1px solid var(--bd)" }}>
          <div style={{ fontSize:".5rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:2 }}>Total</div>
          <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, color:"var(--t2)" }}>{s.today_stock}</div>
        </div>
        <div style={{ flex:1, padding:"var(--s3) var(--s2)", textAlign:"center", borderRight:"1px solid var(--bd)" }}>
          <div style={{ fontSize:".5rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:2 }}>Used</div>
          <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, color:"var(--t3)" }}>{s.used_stock}</div>
        </div>
        <div style={{ flex:1.2, padding:"var(--s3) var(--s2)", textAlign:"center", background:`${statusColor}08` }}>
          <div style={{ fontSize:".5rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:statusColor, marginBottom:2 }}>Left</div>
          <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:900, color:statusColor }}>{s.remaining_stock}</div>
        </div>
      </div>

      {/* Carryover confirmation prompt */}
      {showCarryoverPrompt && (
        <div style={{ padding:"var(--s3) var(--s3) 0" }}>
          <CarryoverPrompt item={s} branchId={branchId} onDiscard={onReload} onKeep={() => onAcknowledge(s.menu_item)} />
        </div>
      )}

      {/* Manual rollback option for items with no today stock */}
      {showRollback && (
        <div style={{ padding:"var(--s3) var(--s4) 0" }}>
          <RollbackButton item={s} branchId={branchId} onDone={onReload} />
        </div>
      )}

      {/* Footer */}
      <div style={{ padding:"var(--s3) var(--s4)", display:"flex", alignItems:"center", gap:"var(--s2)", justifyContent:"space-between", flexWrap:"wrap", background:"var(--bg2)", marginTop:"auto" }}>
        <div style={{ display:"flex", gap:"var(--s2)", alignItems:"center", flexWrap:"wrap" }}>
          <ThresholdCell item={s} onSaved={onReload} disabled={isLocked} />
          <CarryoverToggle item={s} onSaved={onReload} disabled={isLocked} />
        </div>
        {isLocked ? (
          <span style={{ fontSize:".8125rem", color:"var(--t4)", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}><IcLock /> Locked</span>
        ) : (
          <button onClick={() => onTopUp({...s, branch_id: branchId})}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 20px", borderRadius:"var(--r3)", background:"var(--brand)", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, color:"#fff", flexShrink:0 }}
            onMouseEnter={e => e.currentTarget.style.opacity=".85"}
            onMouseLeave={e => e.currentTarget.style.opacity="1"}>
            <IcPlus /> Add Stock
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── StockActivityLog — SuperAdmin daily summary ────────────────────── */
export function StockActivityLog({ branchId, isSuperAdmin }) {
  const [date,    setDate]    = useState(new Date().toISOString().slice(0, 10));
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const load = async () => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const params = { date };
      if (isSuperAdmin && branchId) params.branch_id = branchId;
      const res = await getActivity(params);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load activity.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [date, branchId]);

  const changeTypeLabel = {
    opening_set:       "Opening Set",
    top_up:            "Top-Up",
    carryover:         "Carryover",
    rollback:          "Manual Rollback",
    manual_correction: "Correction",
    lock:              "Stock Locked",
    waste:             "Waste/Damage",
  };

  const changeTypeColor = {
    opening_set:       "#60a5fa",
    top_up:            "var(--ok)",
    carryover:         "#a78bfa",
    rollback:          "#60a5fa",
    manual_correction: "var(--warn)",
    lock:              "var(--err)",
    waste:             "var(--t4)",
  };

  return (
    <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"var(--bg2)", flexWrap:"wrap", gap:"var(--s3)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
          <IcHistory />
          <div>
            <div style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:"1rem" }}>Daily Activity Log</div>
            <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>All stock changes, locks, and rollbacks</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"var(--s2)", alignItems:"center" }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", outline:"none" }} />
          <button onClick={load} style={{ display:"flex", alignItems:"center", gap:5, padding:"9px 14px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".875rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)" }}>
            <IcRefresh /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:"var(--s8)", textAlign:"center", color:"var(--t3)" }}>Loading activity…</div>
      ) : error ? (
        <div style={{ padding:"var(--s5)", color:"var(--err)", textAlign:"center" }}>{error}</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:"var(--s3)", padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)" }}>
            {[
              { label:"Total Added",     value:data.summary?.total_added     ?? 0, color:"var(--ok)" },
              { label:"Total Used",      value:data.summary?.total_used      ?? 0, color:"var(--t2)" },
              { label:"Pending (Left)",  value:data.summary?.total_remaining ?? 0, color:"var(--info)" },
              { label:"Rollbacks",       value:data.rollback_count           ?? 0, color:"#60a5fa" },
              { label:"Items Tracked",   value:data.summary?.items_count     ?? 0, color:"var(--t3)" },
            ].map(c => (
              <div key={c.label} style={{ padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)" }}>
                <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:4 }}>{c.label}</div>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, color:c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Lock status */}
          {data.summary?.locked && (
            <div style={{ margin:"var(--s4) var(--s5) 0", padding:"var(--s3) var(--s4)", background:"rgba(226,75,74,.06)", border:"1px solid rgba(226,75,74,.2)", borderRadius:"var(--r3)", display:"flex", alignItems:"center", gap:"var(--s3)" }}>
              <IcLock />
              <div>
                <span style={{ fontWeight:700, fontSize:".875rem" }}>
                  {data.summary.is_system ? "Auto-locked at midnight" : `Locked by ${data.summary.locked_by}`}
                </span>
                <span style={{ fontSize:".8125rem", color:"var(--t3)", marginLeft:"var(--s2)" }}>
                  at {new Date(data.summary.locked_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                  {data.summary.note ? ` · "${data.summary.note}"` : ""}
                </span>
              </div>
            </div>
          )}

          {/* Log table */}
          {data.logs?.length > 0 ? (
            <div style={{ overflowX:"auto", padding:"var(--s4) var(--s5)" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".875rem" }}>
                <thead>
                  <tr style={{ borderBottom:"2px solid var(--bd)" }}>
                    {["Time","Item","Type","Before","Change","After","By","Note"].map(h => (
                      <th key={h} style={{ textAlign:"left", padding:"var(--s2) var(--s3)", fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map(log => (
                    <tr key={log.id} style={{ borderBottom:"1px solid var(--bd)" }}
                      onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"var(--s2) var(--s3)", color:"var(--t3)", whiteSpace:"nowrap" }}>
                        {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                      </td>
                      <td style={{ padding:"var(--s2) var(--s3)", fontWeight:600, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.item}</td>
                      <td style={{ padding:"var(--s2) var(--s3)" }}>
                        <span style={{ padding:"2px 8px", borderRadius:"var(--rf)", background:`${changeTypeColor[log.change_type] || "var(--t4)"}18`, color:changeTypeColor[log.change_type] || "var(--t4)", fontSize:".75rem", fontWeight:700, whiteSpace:"nowrap" }}>
                          {changeTypeLabel[log.change_type] || log.change_type}
                        </span>
                      </td>
                      <td style={{ padding:"var(--s2) var(--s3)", fontFamily:"var(--ff-d)", fontWeight:700, color:"var(--t3)", textAlign:"right" }}>{log.qty_before}</td>
                      <td style={{ padding:"var(--s2) var(--s3)", fontFamily:"var(--ff-d)", fontWeight:800, color:log.qty_changed > 0 ? "var(--ok)" : log.qty_changed < 0 ? "var(--err)" : "var(--t4)", textAlign:"right" }}>
                        {log.qty_changed > 0 ? "+" : ""}{log.qty_changed}
                      </td>
                      <td style={{ padding:"var(--s2) var(--s3)", fontFamily:"var(--ff-d)", fontWeight:700, textAlign:"right" }}>{log.qty_after}</td>
                      <td style={{ padding:"var(--s2) var(--s3)", color:"var(--t3)", whiteSpace:"nowrap" }}>{log.changed_by} <span style={{ fontSize:".6875rem", opacity:.7 }}>({log.role})</span></td>
                      <td style={{ padding:"var(--s2) var(--s3)", color:"var(--t4)", fontSize:".8125rem", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding:"var(--s8)", textAlign:"center", color:"var(--t3)" }}>No activity for {date}</div>
          )}
        </>
      ) : null}
    </div>
  );
}
