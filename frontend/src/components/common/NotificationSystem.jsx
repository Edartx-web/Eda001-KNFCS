/**
 * NotificationSystem.jsx
 * Global toast + sound notification system for all roles.
 *
 * Usage:
 *   import { notify } from "./NotificationSystem";
 *   notify("Order T042 is ready!", "success");
 *   notify("New order placed", "order", { sound: true });
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
      // Two-tone "ding-dong"
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
const listeners = new Set();

export function notify(message, type = "info", options = {}) {
  const id = Date.now() + Math.random();
  const toast = { id, message, type, options };
  listeners.forEach(fn => fn(toast));
  return id;
}

/* ── Icons ───────────────────────────────────────────────────────── */
const ICONS = {
  success: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  error:   () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  warning: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>,
  order:   () => <span style={{ fontSize:"1rem" }}>🔔</span>,
  info:    () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>,
};

const COLORS = {
  success: { bg:"var(--ok-t)",   border:"rgba(29,158,117,.3)",  color:"var(--ok)"   },
  error:   { bg:"var(--err-t)",  border:"rgba(226,75,74,.3)",   color:"var(--err)"  },
  warning: { bg:"var(--warn-t)", border:"rgba(239,159,39,.3)",  color:"var(--warn)" },
  order:   { bg:"var(--brand-tint)", border:"rgba(232,82,26,.3)", color:"var(--brand)" },
  info:    { bg:"var(--info-t)", border:"rgba(55,138,221,.3)",  color:"var(--info)" },
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

/* ── Notification provider — mount once in App.jsx ───────────────── */
export function NotificationProvider() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(toast => {
    setToasts(t => [...t.slice(-4), toast]); // keep max 5
    if (toast.options?.sound !== false) {
      playSound(toast.type);
    }
    // Also send browser notification for important events
    if (toast.type === "order" && "Notification" in window && Notification.permission === "granted") {
      new Notification("KNFC", { body: toast.message, icon: "/favicon.ico" });
    }
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => listeners.delete(addToast);
  }, [addToast]);

  const remove = id => setToasts(t => t.filter(x => x.id !== id));

  if (!toasts.length) return null;

  return (
    <div style={{
      position:"fixed", bottom:"calc(var(--tab-h, 72px) + 12px)", right:"12px",
      zIndex:9999, display:"flex", flexDirection:"column-reverse", gap:"8px",
      pointerEvents:"none",
    }}>
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}`}</style>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents:"all" }}>
          <Toast toast={t} onRemove={remove}/>
        </div>
      ))}
    </div>
  );
}

export default NotificationProvider;
