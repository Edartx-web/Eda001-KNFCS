/**
 * NotificationSystem.jsx
 * Global toast + sound notification system for all roles.
 *
 * Usage:
 *   import { notify, clearAll } from "./NotificationSystem";
 *   notify("Order T042 is ready!", "success");
 *   notify("New order placed", "order", { sound: true });
 *   clearAll();  // clear all visible toasts
 *
 * SuperAdmin bell:
 *   import { NotificationBell } from "./NotificationSystem";
 *   <NotificationBell />   ← shows badge count + dropdown panel
 *
 * Toast types: success | error | info | warning | order
 */
import React, { useState, useEffect, useCallback, useRef } from "react";

/* ── Sound engine (Web Audio API — no external file needed) ──────── */
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "order") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {}
}

/* ── Global event bus ────────────────────────────────────────────── */
const addListeners   = new Set();
const clearListeners = new Set();

export function notify(message, type = "info", options = {}) {
  const id = Date.now() + Math.random();
  const toast = { id, message, type, options, timestamp: new Date() };
  addListeners.forEach(fn => fn(toast));
  return id;
}

export function clearAll() {
  clearListeners.forEach(fn => fn());
}

/* ── Icons ───────────────────────────────────────────────────────── */
const ICONS = {
  success: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  error:   () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  warning: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>,
  order:   () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  info:    () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>,
};

const COLORS = {
  success: { bg:"var(--ok-t)",   border:"rgba(29,158,117,.3)",  color:"var(--ok)"   },
  error:   { bg:"var(--err-t)",  border:"rgba(226,75,74,.3)",   color:"var(--err)"  },
  warning: { bg:"var(--warn-t)", border:"rgba(239,159,39,.3)",  color:"var(--warn)" },
  order:   { bg:"var(--brand-tint)", border:"rgba(232,82,26,.3)", color:"var(--brand)" },
  info:    { bg:"var(--info-t)", border:"rgba(55,138,221,.3)",  color:"var(--info)" },
};

const TYPE_LABELS = {
  success: "Success", error: "Error", warning: "Warning",
  order: "Order", info: "Info",
};

/* ── Toast component ─────────────────────────────────────────────── */
function Toast({ toast, onRemove }) {
  const ref = useRef(null);
  const c   = COLORS[toast.type] || COLORS.info;
  const Icon = ICONS[toast.type] || ICONS.info;

  useEffect(() => {
    const d = toast.options?.duration || 4000;
    const t = setTimeout(() => onRemove(toast.id), d);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={ref} style={{
      display:"flex", alignItems:"center", gap:"10px",
      padding:"12px 16px", borderRadius:"var(--r3)",
      background:c.bg, border:`1px solid ${c.border}`,
      color:c.color, boxShadow:"var(--sh-md)",
      fontSize:".875rem", fontWeight:600,
      animation:"slideInRight .25s var(--ease-o)",
      maxWidth:"340px", wordBreak:"break-word",
    }}>
      <span style={{ flexShrink:0 }}><Icon/></span>
      <span style={{ flex:1, color:"var(--t1)", fontWeight:500 }}>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)}
        style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t4)", padding:"2px", flexShrink:0, fontSize:"16px", lineHeight:1 }}>×</button>
    </div>
  );
}

/* ── Notification Provider — mount once in App.jsx ───────────────── */
export function NotificationProvider() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(toast => {
    setToasts(t => [...t.slice(-4), toast]);
    if (toast.options?.sound !== false) playSound(toast.type);
    if (toast.type === "order" && "Notification" in window && Notification.permission === "granted") {
      new Notification("KNFC", { body: toast.message, icon: "/favicon.ico" });
    }
  }, []);

  const clearToasts = useCallback(() => setToasts([]), []);

  useEffect(() => {
    addListeners.add(addToast);
    clearListeners.add(clearToasts);
    return () => {
      addListeners.delete(addToast);
      clearListeners.delete(clearToasts);
    };
  }, [addToast, clearToasts]);

  const remove = id => setToasts(t => t.filter(x => x.id !== id));

  if (!toasts.length) return null;

  return (
    <div style={{
      position:"fixed", bottom:"calc(var(--tab-h, 72px) + 12px)", right:"12px",
      zIndex:9999, display:"flex", flexDirection:"column-reverse", gap:"8px",
      pointerEvents:"none",
    }}>
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}`}</style>

      {/* Clear all — shown when 2+ toasts */}
      {toasts.length >= 2 && (
        <div style={{ pointerEvents:"all", display:"flex", justifyContent:"flex-end" }}>
          <button
            onClick={() => setToasts([])}
            style={{
              padding:"5px 12px", borderRadius:"var(--r2)",
              background:"var(--bg2)", border:"1px solid var(--bd)",
              color:"var(--t3)", fontSize:".75rem", fontWeight:600,
              cursor:"pointer", fontFamily:"var(--ff-b)",
              transition:"all var(--d1) var(--ease)",
            }}
            onMouseEnter={e => { e.currentTarget.style.color="var(--err)"; e.currentTarget.style.borderColor="var(--err)"; }}
            onMouseLeave={e => { e.currentTarget.style.color="var(--t3)"; e.currentTarget.style.borderColor="var(--bd)"; }}
          >
            Clear all
          </button>
        </div>
      )}

      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents:"all" }}>
          <Toast toast={t} onRemove={remove}/>
        </div>
      ))}
    </div>
  );
}

/* ── NotificationBell — persistent log panel for SuperAdmin ──────── */
export function NotificationBell() {
  const [log,  setLog]  = useState([]);   // persists across dismissals
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const unread = log.filter(n => !n.read).length;

  useEffect(() => {
    const handler = toast => {
      setLog(prev => [{ ...toast, read: false }, ...prev].slice(0, 50));
    };
    addListeners.add(handler);
    return () => addListeners.delete(handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const markAllRead = () => setLog(prev => prev.map(n => ({ ...n, read: true })));
  const clearLog    = () => { setLog([]); setOpen(false); clearAll(); };

  return (
    <div ref={panelRef} style={{ position:"relative" }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(v => !v); if (!open) markAllRead(); }}
        title="Notifications"
        style={{
          width:"36px", height:"36px", borderRadius:"var(--r2)",
          background: open ? "var(--brand-tint)" : "var(--bg2)",
          border:`1.5px solid ${open ? "var(--bdb)" : "var(--bd)"}`,
          cursor:"pointer", display:"flex", alignItems:"center",
          justifyContent:"center", color: open ? "var(--brand)" : "var(--t2)",
          position:"relative", flexShrink:0, transition:"all var(--d1) var(--ease)",
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.color="var(--brand)"; e.currentTarget.style.borderColor="var(--bdb)"; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.color="var(--t2)"; e.currentTarget.style.borderColor="var(--bd)"; } }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round"/>
        </svg>
        {unread > 0 && (
          <div style={{
            position:"absolute", top:"-4px", right:"-4px",
            width:"16px", height:"16px", borderRadius:"50%",
            background:"var(--err)", color:"#fff",
            fontSize:".5rem", fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"2px solid var(--bg)",
          }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 8px)", right:0,
          width:"320px", background:"var(--bgc)",
          border:"1px solid var(--bd)", borderRadius:"var(--r4)",
          boxShadow:"var(--sh-xl)", zIndex:500, overflow:"hidden",
        }}>
          {/* Header */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"12px 16px", borderBottom:"1px solid var(--bd)",
            background:"var(--bg2)",
          }}>
            <span style={{ fontWeight:700, fontSize:".875rem" }}>
              Notifications {log.length > 0 && <span style={{ color:"var(--t4)", fontWeight:400 }}>({log.length})</span>}
            </span>
            <button
              onClick={clearLog}
              style={{
                background:"none", border:"none", cursor:"pointer",
                color:"var(--err)", fontSize:".75rem", fontWeight:700,
                fontFamily:"var(--ff-b)", padding:"2px 6px",
              }}
            >
              Clear all
            </button>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight:"360px", overflowY:"auto" }}>
            {log.length === 0 ? (
              <div style={{ padding:"32px 16px", textAlign:"center", color:"var(--t4)", fontSize:".875rem" }}>
                No notifications yet
              </div>
            ) : log.map(n => {
              const c = COLORS[n.type] || COLORS.info;
              const Icon = ICONS[n.type] || ICONS.info;
              const time = n.timestamp
                ? new Date(n.timestamp).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })
                : "";
              return (
                <div key={n.id} style={{
                  display:"flex", gap:"10px", padding:"10px 14px",
                  borderBottom:"1px solid var(--bd)",
                  background: n.read ? "transparent" : `${c.bg}`,
                  opacity: n.read ? 0.7 : 1,
                }}>
                  <span style={{ color:c.color, flexShrink:0, marginTop:"2px" }}><Icon /></span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:".8125rem", fontWeight:500, color:"var(--t1)", lineHeight:1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"2px" }}>
                      {TYPE_LABELS[n.type] || n.type} · {time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationProvider;
