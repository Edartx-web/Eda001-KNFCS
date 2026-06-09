/**
 * AdminStockPage.jsx
 * Route: /admin/stock  (BranchAdmin + SuperAdmin)
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { gsap }                      from "gsap";
import AppLayout                     from "../../components/layout/AppLayout";
import KNCLoader, { usePageLoader }  from "../../components/common/KNCLoader";
import { useAuth }                   from "../../context/AuthContext";
import axiosClient                   from "../../api/axiosClient";
import {
  IcBox, IcRefresh, IcLock, IcHistory, IcSun,
  StockCard, TopUpModal, OpeningStockPanel,
  StockLockBanner, StockActivityLog,
  lockStock,
} from "./StockComponents";

const ackAlerts = () => axiosClient.patch("/stock/alerts/ack/");

// localStorage key: mark that carryover was already decided for today
const carryoverKey = (branchId) => `knfc_carryover_decided_${branchId}_${new Date().toISOString().slice(0,10)}`;

export default function AdminStockPage() {
  const { user } = useAuth();
  const { loading: pageLoading } = usePageLoader(800);
  const headerRef = useRef(null);
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin      = user?.role === "branch_admin" || isSuperAdmin;

  const [stock,               setStock]               = useState([]);
  const [alertCount,          setAlertCount]          = useState(0);
  const [loading,             setLoading]             = useState(true);
  const [topUpItem,           setTopUpItem]           = useState(null);
  const [branches,            setBranches]            = useState([]);
  const [activeBranchId,      setActiveBranchId]      = useState(user?.branch_id || "");
  const [acknowledged,        setAcknowledged]        = useState(new Set());
  const [isLocked,            setIsLocked]            = useState(false);
  const [lockInfo,            setLockInfo]            = useState(null);
  const [locking,             setLocking]             = useState(false);
  const [lockNote,            setLockNote]            = useState("");
  const [showLockModal,       setShowLockModal]       = useState(false);
  const [activeTab,           setActiveTab]           = useState("stock");

  // Carryover confirmation (one-shot per day per branch)
  const [showCarryoverModal,  setShowCarryoverModal]  = useState(false);
  const [carryoverWorking,    setCarryoverWorking]    = useState(false);

  // Full reset to zero
  const [showResetModal,      setShowResetModal]      = useState(false);
  const [resetReason,         setResetReason]         = useState("");
  const [resetting,           setResetting]           = useState(false);

  // Opening stock panel — menu items list
  const [menuItems,           setMenuItems]           = useState([]);
  const [menuLoading,         setMenuLoading]         = useState(false);

  // Bulk set all items to N quantity
  const [bulkQty,             setBulkQty]             = useState(20);
  const [showBulkSetModal,    setShowBulkSetModal]    = useState(false);
  const [bulkSetting,         setBulkSetting]         = useState(false);

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
      setAlertCount(res.data.alert_count || 0);
      setIsLocked(res.data.is_locked || false);
      setLockInfo(res.data.lock_info || null);
    } finally { setLoading(false); }
  }, [effectiveBranchId, isSuperAdmin]);

  useEffect(() => {
    if (!effectiveBranchId) return;
    loadStock().then(() => {
      if (isAdmin && !localStorage.getItem(carryoverKey(effectiveBranchId))) {
        setShowCarryoverModal(true);
      }
    });
  }, [effectiveBranchId]);

  useEffect(() => {
    if (!headerRef.current || typeof gsap === "undefined") return;
    gsap.from(headerRef.current, { y:-12, opacity:0, duration:.45, ease:"power2.out" });
  }, []);

  useEffect(() => { setAcknowledged(new Set()); }, [effectiveBranchId]);

  const loadMenuItems = useCallback(async () => {
    if (!effectiveBranchId) return;
    setMenuLoading(true);
    try {
      const res = await axiosClient.get("/menu/admin/items/", {
        params: { branch_id: effectiveBranchId, page_size: 200 },
      });
      const raw = res.data.results ?? res.data.items ?? res.data ?? [];
      setMenuItems(Array.isArray(raw) ? raw : []);
    } catch {}
    finally { setMenuLoading(false); }
  }, [effectiveBranchId]);

  useEffect(() => {
    if (activeTab === "opening") loadMenuItems();
  }, [activeTab]);

  const handleAckAlerts = async () => { await ackAlerts(); setAlertCount(0); };

  const handleLock = async () => {
    setLocking(true);
    try {
      await lockStock({ note: lockNote, branch_id: effectiveBranchId });
      setShowLockModal(false);
      setLockNote("");
      await loadStock();
    } catch (e) {
      alert(e.response?.data?.error || "Failed to lock stock.");
    } finally { setLocking(false); }
  };

  const handleCarryoverDecision = async (action) => {
    setCarryoverWorking(true);
    try {
      await axiosClient.post("/stock/bulk-carryover/", { action, branch_id: effectiveBranchId });
      localStorage.setItem(carryoverKey(effectiveBranchId), action);
      setShowCarryoverModal(false);
      await loadStock();
    } catch (e) {
      alert(e.response?.data?.error || "Failed to apply carryover decision.");
    } finally { setCarryoverWorking(false); }
  };

  const handleCarryoverSkip = () => {
    // Mark as decided so modal doesn't show again today, but take no action
    localStorage.setItem(carryoverKey(effectiveBranchId), "skip");
    setShowCarryoverModal(false);
  };

  const handleBulkSet = async () => {
    const qty = parseInt(bulkQty, 10);
    if (!qty || qty <= 0) { alert("Enter a valid quantity."); return; }
    setBulkSetting(true);
    try {
      const res = await axiosClient.post("/stock/bulk-set/", {
        quantity: qty,
        branch_id: effectiveBranchId,
      });
      setShowBulkSetModal(false);
      await loadStock();
      alert(res.data.message || `Set ${qty} units for all items.`);
    } catch (e) {
      alert(e.response?.data?.error || "Bulk set failed.");
    } finally { setBulkSetting(false); }
  };

  const handleReset = async () => {
    if (!isSuperAdmin && !resetReason.trim()) {
      alert("Please enter a reason for the reset.");
      return;
    }
    setResetting(true);
    try {
      await axiosClient.post("/stock/reset/", {
        branch_id: effectiveBranchId,
        reason: resetReason.trim(),
      });
      setShowResetModal(false);
      setResetReason("");
      await loadStock();
    } catch (e) {
      alert(e.response?.data?.error || "Reset failed.");
    } finally { setResetting(false); }
  };

  if (pageLoading) return <KNCLoader visible label="Loading stock…" />;

  const outCount  = stock.filter(s => s.status === "out").length;
  const lowCount  = stock.filter(s => s.status === "low" || s.status === "critical").length;
  const okCount   = stock.filter(s => s.status === "ok").length;
  const totalLeft = stock.reduce((a, s) => a + s.remaining_stock, 0);

  return (
    <AppLayout>
      <div ref={headerRef} style={{ maxWidth:"1100px", margin:"0 auto" }}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s5)", flexWrap:"wrap", gap:"var(--s3)" }}>
          <div>
            <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"var(--brand)", display:"flex", alignItems:"center", gap:"var(--s2)", marginBottom:"var(--s1)" }}>
              <IcBox />
              {isSuperAdmin
                ? (branches.find(b => b.id === activeBranchId)?.name || "All Branches")
                : (user?.branch_name || "Branch")
              } · Inventory
            </div>
            <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.375rem,2.5vw,1.875rem)", fontWeight:900, letterSpacing:"-.025em", lineHeight:1.1, margin:0 }}>
              Stock Refill
            </h2>
            <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:"var(--s1)" }}>
              {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })}
              {alertCount > 0 && (
                <button onClick={handleAckAlerts}
                  style={{ marginLeft:"var(--s3)", background:"none", border:"none", cursor:"pointer", color:"var(--warn)", fontWeight:700, fontSize:".875rem", fontFamily:"var(--ff-b)", padding:0 }}>
                  · ⚠ {alertCount} alert{alertCount !== 1 ? "s" : ""} — mark seen ✓
                </button>
              )}
            </p>
          </div>

          <div style={{ display:"flex", gap:"var(--s2)", alignItems:"center", flexWrap:"wrap" }}>
            {isSuperAdmin && branches.length > 0 && (
              <select value={activeBranchId} onChange={e => setActiveBranchId(e.target.value)}
                style={{ padding:"8px 12px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", cursor:"pointer", fontWeight:600, outline:"none" }}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <button onClick={loadStock}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".875rem", fontWeight:600, color:"var(--t2)" }}>
              <IcRefresh /> Refresh
            </button>
            {isAdmin && !isLocked && (
              <button onClick={() => setShowBulkSetModal(true)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", borderRadius:"var(--r3)", border:"1.5px solid rgba(29,158,117,.35)", background:"rgba(29,158,117,.06)", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".875rem", fontWeight:700, color:"var(--ok)" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Set All Stock
              </button>
            )}
            {isAdmin && !isLocked && (
              <button onClick={() => setShowResetModal(true)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", borderRadius:"var(--r3)", border:"1.5px solid rgba(226,75,74,.25)", background:"rgba(226,75,74,.04)", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".875rem", fontWeight:700, color:"var(--err)" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeLinecap="round"/></svg>
                Reset to Zero
              </button>
            )}
            {isAdmin && !isLocked && (
              <button onClick={() => setShowLockModal(true)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", borderRadius:"var(--r3)", border:"1.5px solid rgba(226,75,74,.4)", background:"rgba(226,75,74,.06)", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".875rem", fontWeight:700, color:"var(--err)" }}>
                <IcLock /> Lock Today
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:0, marginBottom:"var(--s4)", borderBottom:"2px solid var(--bd)" }}>
          {[
            { id:"stock",    label:"Stock Overview", icon:<IcBox /> },
            { id:"opening",  label:"Opening Stock",  icon:<IcSun /> },
            { id:"activity", label:"Activity Log",   icon:<IcHistory /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 20px", border:"none", borderBottom:`2.5px solid ${activeTab===tab.id?"var(--brand)":"transparent"}`, background:"transparent", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, color:activeTab===tab.id?"var(--brand)":"var(--t3)", marginBottom:"-2px", transition:"color var(--d1) var(--ease)" }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "stock" && (
          <>
            {/* ── Lock banner ──────────────────────────────────────── */}
            {isLocked && lockInfo && (
              <StockLockBanner lockInfo={lockInfo} isSuperAdmin={isSuperAdmin} onUnlock={loadStock} />
            )}

            {/* ── Stats row ────────────────────────────────────────── */}
            <div className="stats-grid" style={{ marginBottom:"var(--s5)" }}>
              {[
                { label:"Out of stock",    value:outCount,  color:"var(--err)",  sub:"Needs refill" },
                { label:"Low / critical",  value:lowCount,  color:"var(--warn)", sub:"Below threshold" },
                { label:"Well stocked",    value:okCount,   color:"var(--ok)",   sub:"Sufficient supply" },
                { label:"Total remaining", value:totalLeft, color:"var(--info)", sub:"Units left today" },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:`linear-gradient(90deg,${s.color},transparent)`, borderRadius:"var(--r4) var(--r4) 0 0" }}/>
                  <div className="stat-lbl">{s.label}</div>
                  <div className="stat-val" style={{ color:s.color }}>{s.value}</div>
                  <div className="stat-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Stock cards ──────────────────────────────────────── */}
            {loading ? (
              <div style={{ padding:"var(--s12)", textAlign:"center", color:"var(--t3)" }}>Loading stock…</div>
            ) : stock.length === 0 ? (
              <div style={{ padding:"var(--s10)", textAlign:"center", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)" }}>
                <div style={{ width:56, height:56, borderRadius:"var(--r4)", background:"rgba(232,82,26,.08)", border:"1px solid rgba(232,82,26,.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s4)" }}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                <p style={{ fontWeight:800, fontSize:"1.0625rem", marginBottom:"var(--s2)" }}>No stock data yet</p>
                <p style={{ color:"var(--t3)", fontSize:".875rem", marginBottom:"var(--s5)" }}>Use <strong>Opening Stock</strong> to set today's starting quantities for all items at once.</p>
                <button onClick={() => setActiveTab("opening")}
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 22px", borderRadius:"var(--r3)", background:"var(--brand)", color:"#fff", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, border:"none", cursor:"pointer", boxShadow:"var(--sh-br)" }}>
                  <IcSun /> Set Opening Stock
                </button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))", gap:"var(--s4)" }}>
                {stock.map(s => (
                  <StockCard
                    key={s.menu_item_id}
                    s={s}
                    branchId={effectiveBranchId}
                    onTopUp={setTopUpItem}
                    onReload={loadStock}
                    isAcknowledged={acknowledged.has(s.menu_item_id)}
                    onAcknowledge={id => setAcknowledged(prev => new Set([...prev, id]))}
                    isLocked={isLocked}
                  />
                ))}
              </div>
            )}

            <div style={{ textAlign:"center", marginTop:"var(--s5)", fontSize:".8125rem", color:"var(--t4)" }}>
              Stock auto-resets at midnight · Next rollover in {24 - new Date().getHours()}h · Pending stock saved in daily snapshot
            </div>
          </>
        )}

        {activeTab === "opening" && (
          <>
            {/* ── Opening Stock intro card ──────────────────────────── */}
            <div style={{ background:"linear-gradient(135deg,rgba(232,82,26,.08),rgba(232,82,26,.03))", border:"1px solid rgba(232,82,26,.2)", borderRadius:"var(--r5)", padding:"var(--s5)", marginBottom:"var(--s5)", display:"flex", alignItems:"flex-start", gap:"var(--s4)" }}>
              <div style={{ width:42, height:42, borderRadius:"var(--r3)", background:"var(--brand)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2, color:"#fff" }}>
                <IcSun />
              </div>
              <div>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, color:"var(--brand)", marginBottom:"var(--s1)" }}>Set Opening Stock</div>
                <p style={{ fontSize:".875rem", color:"var(--t2)", margin:0, lineHeight:1.6 }}>
                  Enter today's starting quantities for each menu item. Use the preset buttons for quick entry or type a custom amount. Click <strong>Save all</strong> when ready.
                </p>
              </div>
            </div>

            {menuLoading ? (
              <div style={{ padding:"var(--s12)", textAlign:"center", color:"var(--t3)" }}>Loading menu items…</div>
            ) : menuItems.length === 0 ? (
              <div style={{ padding:"var(--s10)", textAlign:"center", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)" }}>
                <p style={{ fontWeight:700 }}>No menu items found</p>
                <p style={{ color:"var(--t3)", fontSize:".875rem" }}>Add menu items first to set opening stock.</p>
              </div>
            ) : (
              <OpeningStockPanel
                menuItems={menuItems}
                branchId={effectiveBranchId}
                onClose={() => setActiveTab("stock")}
                onDone={loadStock}
              />
            )}
          </>
        )}

        {activeTab === "activity" && (
          <StockActivityLog branchId={effectiveBranchId} isSuperAdmin={isSuperAdmin} />
        )}
      </div>

      {/* ── Top-Up Modal ───────────────────────────────────────────── */}
      {topUpItem && (
        <TopUpModal item={topUpItem} onClose={() => setTopUpItem(null)} onDone={loadStock} />
      )}

      {/* ── Lock Confirmation Modal ─────────────────────────────────── */}
      {showLockModal && (
        <div onClick={() => setShowLockModal(false)}
          style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.6)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:420, background:"var(--bgc)", borderRadius:"var(--r5)", padding:"var(--s6)", boxShadow:"var(--sh-xl)", border:"1px solid var(--bd)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
              <div style={{ width:42, height:42, borderRadius:"var(--r3)", background:"rgba(226,75,74,.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <IcLock />
              </div>
              <div>
                <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:900, margin:0 }}>Lock today's stock?</h3>
                <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:2 }}>No more top-ups or changes after locking. Only SuperAdmin can unlock.</p>
              </div>
            </div>

            <div style={{ marginBottom:"var(--s4)" }}>
              <label style={{ fontSize:".875rem", fontWeight:600, display:"block", marginBottom:"var(--s2)" }}>Note (optional)</label>
              <input type="text" value={lockNote} onChange={e => setLockNote(e.target.value)}
                placeholder="e.g. End of day count done"
                style={{ width:"100%", padding:"10px 14px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".9375rem", fontFamily:"var(--ff-b)", outline:"none", boxSizing:"border-box" }} />
            </div>

            {/* Live stats preview */}
            <div style={{ padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", marginBottom:"var(--s5)", fontSize:".875rem", color:"var(--t3)" }}>
              Snapshot will capture: <strong style={{ color:"var(--t1)" }}>{stock.length}</strong> items ·{" "}
              <strong style={{ color:"var(--ok)" }}>+{stock.reduce((a,s) => a+s.new_stock_added, 0)}</strong> added ·{" "}
              <strong style={{ color:"var(--info)" }}>{totalLeft}</strong> pending for tomorrow
            </div>

            <div style={{ display:"flex", gap:"var(--s2)" }}>
              <button onClick={handleLock} disabled={locking}
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", padding:"12px 20px", borderRadius:"var(--r3)", background:"var(--err)", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, color:"#fff", opacity:locking?.7:1 }}>
                <IcLock /> {locking ? "Locking…" : "Yes, lock stock"}
              </button>
              <button onClick={() => setShowLockModal(false)} className="btn btn-s btn-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Carryover Confirmation Modal (one-shot per day) ─────────── */}
      {showCarryoverModal && (
        <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,.65)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:440, background:"var(--bgc)", borderRadius:"var(--r5)", padding:"var(--s6)", boxShadow:"var(--sh-xl)", border:"1px solid var(--bd)" }}>
            {/* Icon */}
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s5)" }}>
              <div style={{ width:46, height:46, borderRadius:"var(--r3)", background:"rgba(96,165,250,.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeLinecap="round"/></svg>
              </div>
              <div>
                <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:900, margin:0 }}>Yesterday's remaining stock</h3>
                <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:3, lineHeight:1.5 }}>
                  Do you want to carry over yesterday's unsold stock into today's inventory?
                </p>
              </div>
            </div>

            <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(96,165,250,.06)", border:"1px solid rgba(96,165,250,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s5)", fontSize:".875rem", color:"var(--t3)", lineHeight:1.6 }}>
              <strong style={{ color:"var(--t1)" }}>Keep</strong> — adds yesterday's leftover units to today's opening count.<br/>
              <strong style={{ color:"var(--t1)" }}>Discard</strong> — starts today at zero; yesterday's stock is written off.
            </div>

            <div style={{ display:"flex", gap:"var(--s2)", marginBottom:"var(--s3)" }}>
              <button onClick={() => handleCarryoverDecision("keep")} disabled={carryoverWorking}
                style={{ flex:1, padding:"12px 16px", borderRadius:"var(--r3)", border:"1.5px solid rgba(29,158,117,.4)", background:"rgba(29,158,117,.08)", cursor:carryoverWorking?"not-allowed":"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, color:"var(--ok)", opacity:carryoverWorking?.6:1 }}>
                {carryoverWorking ? "Applying…" : "↩ Yes, keep yesterday's stock"}
              </button>
              <button onClick={() => handleCarryoverDecision("discard")} disabled={carryoverWorking}
                style={{ flex:1, padding:"12px 16px", borderRadius:"var(--r3)", border:"1.5px solid rgba(226,75,74,.35)", background:"rgba(226,75,74,.06)", cursor:carryoverWorking?"not-allowed":"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, color:"var(--err)", opacity:carryoverWorking?.6:1 }}>
                {carryoverWorking ? "Applying…" : "✕ No, discard all"}
              </button>
            </div>
            <button onClick={handleCarryoverSkip}
              style={{ width:"100%", padding:"9px 16px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"transparent", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".875rem", fontWeight:600, color:"var(--t3)" }}>
              Decide later — ask me again next visit
            </button>
          </div>
        </div>
      )}

      {/* ── Reset to Zero Modal ──────────────────────────────────────── */}
      {showResetModal && (
        <div onClick={() => setShowResetModal(false)}
          style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.6)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:440, background:"var(--bgc)", borderRadius:"var(--r5)", padding:"var(--s6)", boxShadow:"var(--sh-xl)", border:"1px solid var(--bd)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
              <div style={{ width:46, height:46, borderRadius:"var(--r3)", background:"rgba(226,75,74,.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeLinecap="round"/></svg>
              </div>
              <div>
                <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:900, margin:0, color:"var(--err)" }}>Reset all stock to zero?</h3>
                <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:3, lineHeight:1.5 }}>
                  Every item's stock count will be set to <strong>0</strong>. This is logged in the audit trail and cannot be undone.
                </p>
              </div>
            </div>

            {/* BranchAdmin must give a reason; SuperAdmin doesn't need to */}
            {!isSuperAdmin && (
              <div style={{ marginBottom:"var(--s4)" }}>
                <label style={{ fontSize:".875rem", fontWeight:700, display:"block", marginBottom:"var(--s2)", color:"var(--t1)" }}>
                  Reason <span style={{ color:"var(--err)" }}>*</span>
                  <span style={{ fontWeight:400, color:"var(--t3)", marginLeft:6 }}>(required — will be sent to SuperAdmin)</span>
                </label>
                <textarea value={resetReason} onChange={e => setResetReason(e.target.value)}
                  placeholder="e.g. Recount after spoilage incident, restarting from scratch…"
                  rows={3}
                  style={{ width:"100%", padding:"10px 14px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }}/>
              </div>
            )}

            {isSuperAdmin && (
              <div style={{ marginBottom:"var(--s4)" }}>
                <label style={{ fontSize:".875rem", fontWeight:600, display:"block", marginBottom:"var(--s2)" }}>Note (optional)</label>
                <input type="text" value={resetReason} onChange={e => setResetReason(e.target.value)}
                  placeholder="e.g. Scheduled full reset"
                  style={{ width:"100%", padding:"10px 14px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", outline:"none", boxSizing:"border-box" }}/>
              </div>
            )}

            <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(226,75,74,.05)", borderRadius:"var(--r3)", marginBottom:"var(--s4)", fontSize:".8125rem", color:"var(--t3)" }}>
              Will reset: <strong style={{ color:"var(--t1)" }}>{stock.length}</strong> items ·{" "}
              <strong style={{ color:"var(--err)" }}>{stock.reduce((a,s)=>a+s.remaining_stock,0)}</strong> total units lost
            </div>

            <div style={{ display:"flex", gap:"var(--s2)" }}>
              <button onClick={handleReset} disabled={resetting || (!isSuperAdmin && !resetReason.trim())}
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", padding:"12px 20px", borderRadius:"var(--r3)", background:"var(--err)", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, color:"#fff", opacity:(resetting||(!isSuperAdmin&&!resetReason.trim()))?.5:1 }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeLinecap="round"/></svg>
                {resetting ? "Resetting…" : "Reset all to zero"}
              </button>
              <button onClick={() => { setShowResetModal(false); setResetReason(""); }} className="btn btn-s btn-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Set All Stock Modal ──────────────────────────────────── */}
      {showBulkSetModal && (
        <div onClick={() => setShowBulkSetModal(false)}
          style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.6)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:420, background:"var(--bgc)", borderRadius:"var(--r5)", padding:"var(--s6)", boxShadow:"var(--sh-xl)", border:"1px solid var(--bd)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s5)" }}>
              <div style={{ width:46, height:46, borderRadius:"var(--r3)", background:"rgba(29,158,117,.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div>
                <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:900, margin:0 }}>Set All Stock</h3>
                <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:3, lineHeight:1.5 }}>
                  Set every item in this branch to the same opening quantity instantly.
                </p>
              </div>
            </div>

            <label style={{ fontSize:".875rem", fontWeight:700, display:"block", marginBottom:"var(--s2)", color:"var(--t1)" }}>
              Quantity for all items <span style={{ color:"var(--err)" }}>*</span>
            </label>
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", marginBottom:"var(--s4)" }}>
              <button onClick={() => setBulkQty(q => Math.max(1, Number(q)-1))}
                style={{ width:40, height:40, borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:"20px", fontWeight:700, color:"var(--t1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>−</button>
              <input type="number" min="1" max="9999" value={bulkQty}
                onChange={e => setBulkQty(Math.max(1, Math.min(9999, parseInt(e.target.value)||1)))}
                style={{ flex:1, textAlign:"center", padding:"10px", borderRadius:"var(--r3)", border:"2px solid var(--ok)", background:"var(--bgc)", color:"var(--t1)", fontSize:"1.5rem", fontWeight:900, fontFamily:"var(--ff-d)", outline:"none", letterSpacing:"-.02em" }}/>
              <button onClick={() => setBulkQty(q => Math.min(9999, Number(q)+1))}
                style={{ width:40, height:40, borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:"20px", fontWeight:700, color:"var(--t1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>+</button>
            </div>

            {/* Quick preset buttons */}
            <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap", marginBottom:"var(--s4)" }}>
              {[10, 15, 20, 25, 30, 50].map(n => (
                <button key={n} onClick={() => setBulkQty(n)}
                  style={{ padding:"6px 14px", borderRadius:"var(--rf)", border:`1.5px solid ${bulkQty===n?"var(--ok)":"var(--bd)"}`, background:bulkQty===n?"rgba(29,158,117,.1)":"var(--bg2)", cursor:"pointer", fontSize:".875rem", fontWeight:700, color:bulkQty===n?"var(--ok)":"var(--t2)", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}>
                  {n}
                </button>
              ))}
            </div>

            <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(29,158,117,.05)", border:"1px solid rgba(29,158,117,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s5)", fontSize:".8125rem", color:"var(--t2)", lineHeight:1.6 }}>
              Will set <strong style={{ color:"var(--ok)" }}>{bulkQty}</strong> units for{" "}
              <strong style={{ color:"var(--t1)" }}>{stock.length}</strong> item{stock.length!==1?"s":""}.
              Any stock already used today is kept — remaining = {bulkQty} − used.
            </div>

            <div style={{ display:"flex", gap:"var(--s2)" }}>
              <button onClick={handleBulkSet} disabled={bulkSetting}
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", padding:"12px 20px", borderRadius:"var(--r3)", background:"var(--ok)", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, color:"#fff", opacity:bulkSetting?.6:1 }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                {bulkSetting ? "Setting stock…" : `Set all to ${bulkQty}`}
              </button>
              <button onClick={() => setShowBulkSetModal(false)} className="btn btn-s btn-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
