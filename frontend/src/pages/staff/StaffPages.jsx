/**
 * StaffPages.jsx — Phase 4
 * Exports: QueuePage, StockPage, NewOrderPage
 *
 * Design: Kitchen Display System × editorial dark
 *
 * QueuePage   — Bold token numbers, one-tap status buttons, live pulse,
 *               15s auto-refresh, elapsed time, carried-over warning
 * StockPage   — Alert banners, colour-coded remaining counts,
 *               top-up modal with quick-add presets
 * NewOrderPage — Split: menu grid left, sticky order summary right
 *                Walk-in customer info, order type selector
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import AppLayout from "../../components/layout/AppLayout";
import { useAuth } from "../../context/AuthContext";
import { notify } from "../../components/common/NotificationSystem";
import axiosClient from "../../api/axiosClient";
import {
  getOrderQueue, getCompletedOrders, updateOrderStatus,
  getStockDashboard, topUpStock, ackAlerts, placeOrder,
} from "../../api/orders";
import { getItems } from "../../api/menu";
import { formatPrice, formatTime } from "../../utils/format";
import { STATUS_META } from "../../utils/constants";

/* ─── Status → next action map ──────────────────────────────────────── */
const NEXT = {
  placed:    { label:"Confirm",       next:"confirmed", bg:"var(--info)",  text:"#fff" },
  confirmed: { label:"Start cooking", next:"preparing", bg:"var(--warn)",  text:"#fff" },
  preparing: { label:"Mark ready",    next:"ready",     bg:"var(--ok)",    text:"#fff" },
  ready:     { label:"Complete",      next:"completed", bg:"var(--t3)",    text:"#fff" },
};

/* ─── Shared icons ──────────────────────────────────────────────────── */
const Ic = {
  Alert:  () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>,
  Back:   () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round"/></svg>,
  Search: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>,
  Clock:  () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>,
  Refresh:() => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeLinecap="round"/></svg>,
  Check:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>,
  Plus:   () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>,
  Trash:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinejoin="round"/></svg>,
  People: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
};

/* ─── Web-Audio bell for UPI payment alerts ──────────────────────────── */
function playUPIBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // First strike — high bell
    const o1 = ctx.createOscillator(), g1 = ctx.createGain();
    o1.connect(g1); g1.connect(ctx.destination);
    o1.type = "sine"; o1.frequency.value = 1046; // C6
    g1.gain.setValueAtTime(0.7, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    o1.start(); o1.stop(ctx.currentTime + 1.4);
    // Second strike — mid bell (50 ms later)
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.type = "sine"; o2.frequency.value = 784; // G5
    g2.gain.setValueAtTime(0, ctx.currentTime + 0.05);
    g2.gain.setValueAtTime(0.5, ctx.currentTime + 0.06);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    o2.start(ctx.currentTime + 0.05); o2.stop(ctx.currentTime + 1.0);
    // Third strike — low bell (200 ms later)
    const o3 = ctx.createOscillator(), g3 = ctx.createGain();
    o3.connect(g3); g3.connect(ctx.destination);
    o3.type = "sine"; o3.frequency.value = 523; // C5
    g3.gain.setValueAtTime(0, ctx.currentTime + 0.2);
    g3.gain.setValueAtTime(0.45, ctx.currentTime + 0.21);
    g3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    o3.start(ctx.currentTime + 0.2); o3.stop(ctx.currentTime + 1.2);
  } catch {}
}

/* ─── Mobile-responsive CSS for queue cards ──────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("staff-queue-css")) {
  const s = document.createElement("style");
  s.id = "staff-queue-css";
  s.textContent = `
    /* Stats grid — 2 cols on mobile, 4 on desktop */
    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media (max-width:640px) {
      .stats-grid { grid-template-columns:repeat(2,1fr); gap:8px; }
    }

    /* Tabs — scrollable on mobile */
    .tabs { display:flex; gap:8px; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:4px; scrollbar-width:none; }
    .tabs::-webkit-scrollbar { display:none; }

    /* Order grid — 1 col on mobile */
    .order-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:16px; }
    @media (max-width:640px) {
      .order-grid { grid-template-columns:1fr; gap:12px; }
    }

    /* Order card action row — stack vertically on mobile */
    .order-card-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    @media (max-width:480px) {
      .order-card-actions { flex-direction:column; align-items:stretch; }
      .order-card-actions .action-main { width:100%; justify-content:center; font-size:1rem; padding:14px 18px; }
      .order-card-actions .action-sec  { width:100%; justify-content:center; }
    }

    /* Item pills — horizontal scroll on mobile */
    .item-pills { display:flex; flex-wrap:wrap; gap:6px; }
    @media (max-width:480px) {
      .item-pills { flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:4px; scrollbar-width:none; }
      .item-pills::-webkit-scrollbar { display:none; }
      .item-pills span { flex-shrink:0; }
    }

    /* UPI banner — stack on narrow screens */
    @media (max-width:380px) {
      .upi-banner { flex-direction:column; gap:8px; }
      .upi-banner .upi-banner-btn { width:100%; justify-content:center; }
    }
  `;
  document.head.appendChild(s);
}

/* ─── Stat card ─────────────────────────────────────────────────────── */
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s4) var(--s5)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:`linear-gradient(90deg,${color},transparent)`, borderRadius:"var(--r4) var(--r4) 0 0" }}/>
      <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s2)" }}>{label}</div>
      <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.875rem", fontWeight:900, letterSpacing:"-.02em", lineHeight:1, color }}>{value}</div>
      {sub && <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:"var(--s1)" }}>{sub}</div>}
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────────────────── */
function Empty({ title, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"var(--s16) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
      <div style={{ color:"var(--t3)", display:"flex", justifyContent:"center", marginBottom:"var(--s4)" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M17 4h1a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
      </div>
      <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:800, marginBottom:"var(--s2)" }}>{title}</div>
      <div style={{ fontSize:".9375rem", color:"var(--t3)" }}>{sub}</div>
    </div>
  );
}

/* ─── KOT print ──────────────────────────────────────────────────────── */
function printKOT(order) {
  const time = new Date(order.created_at).toLocaleTimeString("en-IN", {
    hour:"2-digit", minute:"2-digit", hour12:true
  });
  const typeLabel = order.order_type === "dine_in"
    ? `Dine-in · Table ${order.table_number}`
    : "Pickup";

  const rows = (order.items || []).map(item => `
    <tr>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;font-size:15px;">${item.name_snapshot}</td>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:center;font-weight:900;font-size:16px;">${item.quantity}</td>
    </tr>
    ${item.special_instructions ? `<tr><td colspan="2" style="padding:0 4px 6px;font-size:12px;color:#555;font-style:italic;border-bottom:1px dashed #ccc;">↳ ${item.special_instructions}</td></tr>` : ""}
  `).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>KOT ${order.token_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Courier New',monospace; font-size:14px; color:#000; width:80mm; }
    .header { text-align:center; padding:12px 8px 8px; border-bottom:2px solid #000; }
    .brand { font-size:22px; font-weight:900; letter-spacing:2px; }
    .token { font-size:48px; font-weight:900; letter-spacing:4px; margin:8px 0; }
    .meta { font-size:13px; margin:4px 0; }
    .divider { border-top:1px dashed #000; margin:8px 0; }
    table { width:100%; border-collapse:collapse; }
    th { font-size:11px; text-transform:uppercase; letter-spacing:.06em; padding:4px; text-align:left; border-bottom:2px solid #000; }
    th.qty { text-align:center; width:40px; }
    .footer { text-align:center; padding:10px 0; font-size:11px; color:#555; border-top:2px solid #000; margin-top:8px; }
    @media print { @page { margin:4mm; size:80mm auto; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">KNFC</div>
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-top:2px;">Kitchen Order Ticket</div>
    <div class="token">${order.token_number}</div>
    <div class="meta"><strong>${typeLabel}</strong></div>
    <div class="meta">${order.customer_name || "Walk-in"} · ${time}</div>
  </div>
  <div style="padding:8px;">
    <table>
      <thead><tr><th>Item</th><th class="qty">Qty</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  ${order.special_instructions ? `<div style="padding:4px 8px 0;font-size:12px;border-top:1px dashed #000;"><strong>Note:</strong> ${order.special_instructions}</div>` : ""}
  <div class="footer">Printed ${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})} · KNFC POS</div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=340,height=600");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); w.onafterprint = () => w.close(); };
}

/* ─── Cancel Reason Modal ────────────────────────────────────────────── */
const CANCEL_REASONS = [
  { key:"customer_request", label:"Customer requested cancellation", icon:"" },
  { key:"out_of_stock", label:"Item(s) out of stock", icon:"" },
  { key:"long_wait", label:"Customer unwilling to wait", icon:"" },
  { key:"duplicate_order", label:"Duplicate / accidental order", icon:"" },
  { key:"payment_failed", label:"Payment not received", icon:"" },
];

function CancelReasonModal({ order, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [note,   setNote]   = useState("");
  const canSubmit = !!reason;

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:"72px", background:"rgba(0,0,0,.55)", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
      <div style={{ background:"var(--bg)", borderRadius:"var(--r5)", padding:"var(--s5)", maxWidth:"420px", width:"100%", boxShadow:"var(--sh-lg)" }}>
        <div style={{ marginBottom:"var(--s4)" }}>
          <h3 style={{ fontFamily:"var(--ff-d)", fontWeight:900, fontSize:"1.125rem", marginBottom:"4px" }}>Cancel order {order.token_number}</h3>
          <p style={{ fontSize:".875rem", color:"var(--t3)" }}>Select a reason before cancelling</p>
        </div>

        {/* Reason options */}
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)", marginBottom:"var(--s4)" }}>
          {CANCEL_REASONS.map(r => (
            <button key={r.key} onClick={() => setReason(r.key)} type="button"
              style={{ display:"flex", alignItems:"center", gap:"var(--s3)", padding:"var(--s3) var(--s4)", borderRadius:"var(--r3)", border:`1.5px solid ${reason===r.key?"var(--err)":"var(--bd)"}`, background:reason===r.key?"var(--err-t)":"var(--bg2)", cursor:"pointer", textAlign:"left", transition:"all var(--d1) var(--ease)" }}>
              <span style={{ fontSize:"1.125rem", flexShrink:0 }}>{r.icon}</span>
              <span style={{ fontSize:".9rem", fontWeight:reason===r.key?700:500, color:reason===r.key?"var(--err)":"var(--t1)" }}>{r.label}</span>
              {reason===r.key && <span style={{ marginLeft:"auto", color:"var(--err)", flexShrink:0 }}>●</span>}
            </button>
          ))}
        </div>

        {/* Optional note */}
        <div style={{ marginBottom:"var(--s4)" }}>
          <label style={{ fontSize:".8125rem", fontWeight:600, color:"var(--t3)", display:"block", marginBottom:"6px" }}>Additional note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={200}
            placeholder="Any extra detail for the customer or kitchen…"
            style={{ width:"100%", padding:"var(--s3)", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg2)", color:"var(--t1)", fontSize:".875rem", resize:"none", outline:"none", fontFamily:"var(--ff-b)", boxSizing:"border-box" }}/>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:"var(--s2)" }}>
          <button onClick={() => onConfirm(reason, note)} disabled={!canSubmit}
            style={{ flex:1, padding:"11px", borderRadius:"var(--r3)", border:"none", background:canSubmit?"var(--err)":"var(--bg3)", color:canSubmit?"#fff":"var(--t4)", fontWeight:800, fontSize:".9375rem", cursor:canSubmit?"pointer":"not-allowed", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}>
            Cancel order
          </button>
          <button onClick={onClose}
            style={{ flex:1, padding:"11px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t1)", fontWeight:600, fontSize:".9375rem", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
            Keep order
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Payment Confirm Modal — payment_serial is auto-generated server-side ── */
function PaymentSerialModal({ order, onConfirm, onClose }) {
  const [upiRef,  setUpiRef]  = useState("");
  const [loading, setLoading] = useState(false);

  const isUpi = order.payment_method === "upi";

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // payment_serial is auto-generated server-side — only send upi_ref for UPI orders
      await onConfirm(order.id, upiRef.trim());
    } finally {
      setLoading(false);
    }
  };

  const methodLabel = isUpi ? "UPI / QR" : order.payment_method === "card" ? "Card" : "Cash";
  const methodIcon  = isUpi
    ? <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    : order.payment_method === "card"
    ? <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    : <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><circle cx="12" cy="12" r="3"/></svg>;

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:"72px", background:"rgba(0,0,0,.65)", zIndex:160, display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
      <div style={{ background:"var(--bgc)", borderRadius:"var(--r5)", padding:"var(--s6)", maxWidth:"420px", width:"100%", boxShadow:"var(--sh-xl)" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s5)" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"var(--r3)", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.25)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--ok)", flexShrink:0 }}>
            {methodIcon}
          </div>
          <div>
            <h3 style={{ fontFamily:"var(--ff-d)", fontWeight:900, fontSize:"1.125rem", marginBottom:"2px" }}>Mark Payment Received</h3>
            <p style={{ fontSize:".875rem", color:"var(--t3)" }}>
              Token {order.token_number} · {formatPrice(order.total)} · {methodLabel}
            </p>
          </div>
        </div>

        {/* Customer */}
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", marginBottom:"var(--s4)" }}>
          <span style={{ fontSize:".8125rem", color:"var(--t3)" }}>Customer:</span>
          <span style={{ fontSize:".9375rem", fontWeight:700 }}>{order.customer_name || "Walk-in"}</span>
        </div>

        {/* Payment serial — read-only, assigned by server */}
        <div style={{ padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", marginBottom:"var(--s4)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:2 }}>Payment Serial</div>
            <div style={{ fontSize:".875rem", color:"var(--t3)" }}>Auto-assigned by system on confirmation</div>
          </div>
          <span style={{ fontSize:".75rem", fontWeight:700, padding:"3px 10px", borderRadius:"var(--rf)", background:"var(--ok-t)", color:"var(--ok)", border:"1px solid rgba(29,158,117,.2)", flexShrink:0 }}>
            Auto · Read-only
          </span>
        </div>

        {/* UPI ref input — only for UPI payments */}
        {isUpi && (
          <div style={{ marginBottom:"var(--s5)" }}>
            <label style={{ fontSize:".8125rem", fontWeight:800, color:"var(--t1)", display:"block", marginBottom:"8px" }}>
              UPI Transaction ID <span style={{ color:"var(--t3)", fontWeight:500 }}>(from customer screenshot)</span>
            </label>
            <input
              value={upiRef}
              onChange={e => setUpiRef(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              maxLength={50}
              placeholder="e.g. 316524897412"
              style={{ width:"100%", padding:"12px var(--s4)", border:"1.5px solid var(--bd)", borderRadius:"var(--r3)", background:"var(--bg2)", color:"var(--t1)", fontSize:"1rem", fontFamily:"var(--ff-d)", outline:"none", boxSizing:"border-box" }}
            />
            <p style={{ fontSize:".75rem", color:"var(--t4)", marginTop:6 }}>Optional — enter the UPI transaction reference from the customer's payment screenshot.</p>
          </div>
        )}

        <div style={{ display:"flex", gap:"var(--s2)" }}>
          <button onClick={handleSubmit} disabled={loading}
            style={{ flex:2, padding:"13px", borderRadius:"var(--r3)", border:"none", background:"var(--ok)", color:"#fff", fontWeight:800, fontSize:".9375rem", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--ff-b)", opacity:loading?.7:1, boxShadow:"0 4px 14px rgba(29,158,117,.35)" }}>
            {loading ? "Recording…" : "✓ Confirm Payment Received"}
          </button>
          <button onClick={onClose} disabled={loading}
            style={{ flex:1, padding:"13px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontWeight:600, fontSize:".9375rem", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--ff-b)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bill print ─────────────────────────────────────────────────────── */
function printBill(order) {
  const time = new Date(order.created_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
  const date = new Date(order.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  const typeLabel = order.order_type === "dine_in" ? `Dine-in &middot; Table ${order.table_number}` : "Pickup";
  const method    = (order.payment_method || "cash").toUpperCase();
  const isPaid    = order.payment_status === "paid";

  const rows = (order.items || []).map(item => `
    <tr>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;">${item.name_snapshot}${item.special_instructions ? `<br/><span style="font-size:11px;color:#666;font-style:italic;">&#8627; ${item.special_instructions}</span>` : ""}</td>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:center;">${item.quantity}</td>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:right;">&#8377;${parseFloat(item.price_snapshot).toFixed(2)}</td>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:right;font-weight:700;">&#8377;${parseFloat(item.line_total).toFixed(2)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Bill #${order.token_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Courier New',monospace; font-size:13px; color:#000; width:80mm; }
    .header { text-align:center; padding:12px 8px 10px; border-bottom:2px solid #000; }
    .brand { font-size:26px; font-weight:900; letter-spacing:4px; }
    .slogan { font-size:10px; letter-spacing:.08em; margin:3px 0 6px; color:#333; }
    .token { font-size:34px; font-weight:900; letter-spacing:3px; margin:6px 0 2px; }
    .divider { border-top:1px dashed #000; margin:6px 0; }
    table { width:100%; border-collapse:collapse; }
    th { font-size:10px; text-transform:uppercase; letter-spacing:.06em; padding:4px; text-align:left; border-bottom:2px solid #000; }
    .total-row td { padding:8px 4px; font-size:15px; font-weight:900; border-top:2px solid #000; }
    .pay-box { border:1px solid #000; border-radius:3px; padding:6px 8px; margin:8px 0; font-size:12px; }
    .pay-row { display:flex; justify-content:space-between; margin:2px 0; }
    .no-refund { border:1px dashed #000; padding:5px 8px; margin:8px 0; font-size:10px; text-align:center; font-weight:700; }
    .footer { text-align:center; padding:10px 0 4px; font-size:10px; color:#555; border-top:1px dashed #000; margin-top:6px; }
    @media print { @page { margin:4mm; size:80mm auto; } body { -webkit-print-color-adjust:exact; } .no-print { display:none !important; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">KNFC</div>
    <div class="slogan">Hot, Crispy &amp; Always Fresh!</div>
    <div class="divider"></div>
    <div style="font-size:11px;margin:3px 0;">${date} &middot; ${time}</div>
    <div class="token">TOKEN ${order.token_number}</div>
    <div style="font-size:12px;">${typeLabel}</div>
    <div style="font-size:11px;margin-top:3px;color:#555;">${order.customer_name || "Walk-in"}</div>
  </div>

  <div style="padding:8px 4px;">
    <table>
      <thead><tr>
        <th>Item</th>
        <th style="text-align:center;width:30px;">Qty</th>
        <th style="text-align:right;width:50px;">Rate</th>
        <th style="text-align:right;width:55px;">Amt</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="divider"></div>
    <table>
      <tr><td style="padding:3px 4px;">Subtotal</td><td style="padding:3px 4px;text-align:right;">&#8377;${parseFloat(order.subtotal||0).toFixed(2)}</td></tr>
      ${parseFloat(order.discount||0)>0 ? `<tr><td style="padding:3px 4px;color:#555;">Discount</td><td style="padding:3px 4px;text-align:right;color:#555;">-&#8377;${parseFloat(order.discount).toFixed(2)}</td></tr>` : ""}
      <tr class="total-row"><td>TOTAL</td><td style="text-align:right;">&#8377;${parseFloat(order.total||0).toFixed(2)}</td></tr>
    </table>

    <div class="pay-box">
      <div class="pay-row"><span>Method:</span> <strong>${method}</strong></div>
      ${order.upi_ref ? `<div class="pay-row"><span>UPI Ref:</span> <span>${order.upi_ref}</span></div>` : ""}
      <div class="pay-row"><span>Status:</span> <strong>${isPaid ? "PAID" : "PENDING"}</strong></div>
    </div>

    ${order.special_instructions ? `<div style="font-size:11px;padding:4px;color:#555;border-top:1px dashed #ccc;"><em>Note: ${order.special_instructions}</em></div>` : ""}

    <div class="no-refund">No Refund Policy &mdash; All sales are final</div>
  </div>

  <div class="footer">
    <div>Thank you for choosing KNFC!</div>
    <div style="margin-top:4px;font-size:9px;">Order ID: ${String(order.id).slice(0,8).toUpperCase()}</div>
  </div>
</body>
</html>`;

  const btnBar = `
  <div style="position:sticky;bottom:0;background:#fff;border-top:1px dashed #ccc;padding:10px 8px;display:flex;gap:8px;justify-content:center;margin-top:8px;no-print">
    <button onclick="window.print()" style="padding:8px 20px;background:#E8521A;color:#fff;border:none;border-radius:6px;font-family:'Courier New',monospace;font-weight:700;font-size:13px;cursor:pointer;">
      &#128438; Print / Save PDF
    </button>
    <button onclick="window.close()" style="padding:8px 16px;background:#eee;color:#333;border:none;border-radius:6px;font-family:'Courier New',monospace;font-weight:700;font-size:13px;cursor:pointer;">
      Close
    </button>
  </div>`;
  const fullHtml = html.replace("</body>", btnBar + "</body>");

  const w = window.open("", "_blank", "width=380,height=750");
  if (!w) { notify("Popup blocked. Allow popups to print bill.", "warning"); return; }
  w.document.write(fullHtml);
  w.document.close();
  w.onload = () => { w.print(); w.onafterprint = () => w.close(); };
}

/* ─── Order card (queue) ─────────────────────────────────────────────── */
/* onCancel(order) — just signals QueuePage to open the cancel modal there */
function OrderCard({ order, updating, onStatus, onMarkPaid, onCancel }) {
  const cardRef = useRef(null);
  const next    = NEXT[order.status];
  const meta    = STATUS_META[order.status] || STATUS_META.placed;
  const elapsed = Math.floor((Date.now() - new Date(order.created_at)) / 60000);
  const isLate  = elapsed >= 15;
  const needsPayment = order.payment_method === "upi" && order.payment_status === "pending";

  const statusBadgeStyle = {
    placed:    { bg:"var(--info-t)",  color:"var(--info)",  border:"rgba(55,138,221,.2)"   },
    confirmed: { bg:"var(--ok-t)",    color:"var(--ok)",    border:"rgba(29,158,117,.2)"   },
    preparing: { bg:"var(--warn-t)",  color:"var(--warn)",  border:"rgba(239,159,39,.2)"   },
    ready:     { bg:"var(--brand-tint)", color:"var(--brand)", border:"rgba(232,82,26,.2)" },
  };
  const sbs = statusBadgeStyle[order.status] || statusBadgeStyle.placed;

  return (
    <div ref={cardRef} data-order={order.id}
      style={{ background:"var(--bgc)", border:`1px solid ${needsPayment?"rgba(239,159,39,.6)":order.carried_over?"rgba(226,75,74,.35)":isLate?"rgba(239,159,39,.3)":"var(--bd)"}`, borderRadius:"var(--r5)", overflow:"hidden", transition:"box-shadow var(--d1) var(--ease)", boxShadow: needsPayment?"0 0 0 2px rgba(239,159,39,.4), var(--sh-md)":order.status === "ready" ? "0 0 0 2px var(--brand), var(--sh-md)" : "var(--sh-xs)" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = needsPayment?"0 0 0 2px rgba(239,159,39,.6), var(--sh-lg)":order.status === "ready" ? "0 0 0 2px var(--brand), var(--sh-lg)" : "var(--sh-md)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = needsPayment?"0 0 0 2px rgba(239,159,39,.4), var(--sh-md)":order.status === "ready" ? "0 0 0 2px var(--brand), var(--sh-md)" : "var(--sh-xs)"}>

      {/* UPI awaiting payment banner — shown for ALL UPI-pending orders (pickup and dine-in) */}
      {needsPayment && (
        <div className="upi-banner" style={{ background:"linear-gradient(135deg,rgba(239,159,39,.18),rgba(239,159,39,.05))", borderBottom:"2px solid rgba(239,159,39,.45)", padding:"var(--s3) var(--s4)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", color:"var(--warn)", fontWeight:700, fontSize:".8125rem", minWidth:0 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg>
            <span>UPI payment pending — verify before confirming</span>
          </div>
          <button className="upi-banner-btn" onClick={() => onMarkPaid(order)}
            style={{ flexShrink:0, padding:"8px 18px", borderRadius:"var(--rf)", border:"none", background:"var(--ok)", color:"#fff", fontWeight:800, fontSize:".875rem", cursor:"pointer", fontFamily:"var(--ff-b)", boxShadow:"0 2px 8px rgba(29,158,117,.4)", display:"flex", alignItems:"center", gap:6 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
            Mark Paid
          </button>
        </div>
      )}

      {/* Card header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background: order.status === "ready" ? "linear-gradient(135deg,rgba(232,82,26,.08),transparent)" : "var(--bg2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
          {/* Big token */}
          <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:900, padding:"6px 18px", borderRadius:"var(--r3)", background:order.status==="ready"?"var(--brand)":"linear-gradient(135deg,var(--brand),var(--brand-d))", color:"#fff", boxShadow:"0 4px 12px rgba(232,82,26,.4)", letterSpacing:".04em", lineHeight:1, flexShrink:0 }}>
            {order.token_number}
          </div>
          {order.carried_over && (
            <span style={{ fontSize:".5625rem", fontWeight:800, padding:"3px 8px", borderRadius:"var(--rf)", background:"var(--err-t)", color:"var(--err)", border:"1px solid rgba(226,75,74,.2)", letterSpacing:".08em", textTransform:"uppercase" }}>
              CARRIED OVER
            </span>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
          <span style={{ fontSize:".6875rem", fontWeight:700, padding:"3px 9px", borderRadius:"var(--rf)", background:sbs.bg, color:sbs.color, border:`1px solid ${sbs.border}` }}>
            {meta.label}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:".75rem", color:isLate?"var(--warn)":"var(--t4)", fontWeight:isLate?700:400 }}>
            <Ic.Clock/>
            {elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed/60)}h ${elapsed%60}m`}
            {isLate && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--warn)" strokeWidth="2" style={{marginLeft:"4px"}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding:"var(--s4) var(--s5)" }}>
        {/* Customer + type row */}
        <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap", marginBottom:"var(--s3)" }}>
          <span style={{ fontSize:".8125rem", fontWeight:600, padding:"4px 10px", borderRadius:"var(--rf)", background:"var(--bg2)", border:"1px solid var(--bd)", display:"flex", alignItems:"center", gap:"5px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", fontSize:".875rem", color:"var(--t2)" }}>
              <Ic.People/> {order.customer_name || "Walk-in"}
              {order.customer_phone && (
                <a href={`tel:${order.customer_phone}`}
                  onClick={e => e.stopPropagation()}
                  style={{ display:"flex", alignItems:"center", gap:"3px", padding:"3px 8px", borderRadius:"var(--rf)", background:"rgba(29,158,117,.08)", border:"1px solid rgba(29,158,117,.2)", color:"var(--ok)", fontSize:".75rem", fontWeight:700, textDecoration:"none", marginLeft:"4px" }}
                  title={`Call ${order.customer_phone}`}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  {order.customer_phone}
                </a>
              )}
            </div>
          </span>
          <span style={{ fontSize:".8125rem", fontWeight:600, padding:"4px 10px", borderRadius:"var(--rf)", background:"var(--bg2)", border:"1px solid var(--bd)" }}>
            {order.order_type === "dine_in" ? `Table ${order.table_number}` : "Pickup"}
          </span>
          <span style={{ fontSize:".8125rem", fontWeight:600, padding:"4px 10px", borderRadius:"var(--rf)", background:"var(--bg2)", border:"1px solid var(--bd)" }}>
            {order.item_count} item{order.item_count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Item pills */}
        <div className="item-pills" style={{ marginBottom:"var(--s4)" }}>
          {(order.items || []).map(item => (
            <span key={item.id}
              style={{ fontSize:".875rem", fontWeight:500, padding:"5px 12px", borderRadius:"var(--r2)", background:"var(--bg2)", border:"1px solid var(--bd)", color:"var(--t2)", lineHeight:1.3 }}>
              {item.name_snapshot}
              {item.quantity > 1 && <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, color:"var(--brand)", marginLeft:"5px" }}>×{item.quantity}</span>}
              {item.special_instructions && (
                <span style={{ display:"block", fontSize:".6875rem", color:"var(--t4)", fontStyle:"italic", marginTop:"2px" }}>
                  "{item.special_instructions}"
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Footer: total + price row */}
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", flexWrap:"wrap", marginBottom:"var(--s3)" }}>
          <span className="price" style={{ fontSize:"1.25rem" }}>{formatPrice(order.total)}</span>
          {order.payment_method === "upi" && (
            <span style={{ fontSize:".6875rem", fontWeight:700, padding:"3px 8px", borderRadius:"var(--rf)", background:order.payment_status==="paid"?"var(--ok-t)":"rgba(55,138,221,.12)", color:order.payment_status==="paid"?"var(--ok)":"var(--info)", border:`1px solid ${order.payment_status==="paid"?"rgba(29,158,117,.25)":"rgba(55,138,221,.25)"}` }}>
              {order.payment_status==="paid" ? <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg> UPI paid</> : <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg> UPI pending</>}
            </span>
          )}
          {order.status === "completed" && (
            <span style={{ fontSize:".8125rem", fontWeight:700, color:"var(--ok)", display:"flex", alignItems:"center", gap:"5px", marginLeft:"auto" }}>
              <Ic.Check/> Done
            </span>
          )}
        </div>

        {/* Action buttons row — wraps on mobile */}
        {/* UPI PAYMENT FLOW: show "Mark as Paid" first; Confirm only after payment confirmed */}
        {needsPayment && (
          <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(55,138,221,.06)", border:"1px solid rgba(55,138,221,.25)", borderRadius:"var(--r3)", marginBottom:"var(--s2)", fontSize:".8125rem", color:"var(--info)", fontWeight:700, display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
            Awaiting Payment Confirmation — mark payment received before confirming the order
          </div>
        )}
        <div className="order-card-actions" style={{ display:"flex", alignItems:"center", gap:"var(--s2)", flexWrap:"wrap" }}>
          {/* UPI pending: show "Mark as Paid" prominently; hide Confirm until paid */}
          {needsPayment ? (
            <button onClick={() => onMarkPaid(order)}
              className="action-main"
              style={{ flex:"1 1 auto", minWidth:"160px", padding:"12px 18px", borderRadius:"var(--r3)", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:800, background:"var(--info)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", boxShadow:"0 4px 14px rgba(55,138,221,.4)" }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
              Mark as Paid
            </button>
          ) : (
            /* Main status action after payment is confirmed */
            next && (
              <button onClick={() => onStatus(order.id, next.next)} disabled={updating}
                className="action-main"
                style={{ flex:"1 1 auto", minWidth:"140px", padding:"12px 18px", borderRadius:"var(--r3)", border:"none", cursor:updating?"not-allowed":"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:800, background:updating?"var(--bg3)":next.bg, color:updating?"var(--t3)":next.text, opacity:updating?.7:1, transition:"all var(--d1) var(--ease)", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", boxShadow:updating?"none":`0 4px 14px ${next.bg}55` }}>
                {updating ? <>⟳ Updating…</> : <>{next.label} →</>}
              </button>
            )
          )}
          {/* KOT */}
          <button onClick={() => printKOT(order)} title="Print kitchen ticket"
            className="action-sec"
            style={{ flex:"0 0 auto", padding:"10px 14px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", gap:"5px", transition:"all var(--d1) var(--ease)" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.color="var(--brand)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.color="var(--t2)";}}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            KOT
          </button>
          {/* Bill */}
          <button onClick={() => printBill(order)} title="Print / download bill"
            className="action-sec"
            style={{ flex:"0 0 auto", padding:"10px 14px", borderRadius:"var(--r3)", border:"1px solid rgba(29,158,117,.3)", background:"var(--ok-t)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--ok)", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", gap:"5px", transition:"all var(--d1) var(--ease)" }}
            onMouseEnter={e=>{e.currentTarget.style.background="var(--ok)";e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="var(--ok)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="var(--ok-t)";e.currentTarget.style.color="var(--ok)";e.currentTarget.style.borderColor="rgba(29,158,117,.3)";}}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Bill
          </button>
          {/* Cancel */}
          {order.status !== "completed" && order.status !== "cancelled" && onCancel && (
            <button onClick={() => onCancel(order)}
              className="action-sec"
              style={{ flex:"0 0 auto", padding:"10px 12px", borderRadius:"var(--r3)", border:"1px solid rgba(226,75,74,.3)", background:"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--err)", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", gap:"4px", transition:"all var(--d1) var(--ease)" }}
              onMouseEnter={e=>{e.currentTarget.style.background="var(--err-t)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   QUEUE PAGE
══════════════════════════════════════════════════════════════════════ */
/* ─── Daily On-Duty Prompt ────────────────────────────────────────── */
function DutyPromptModal({ user, onConfirm, onDismiss }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:"72px", background:"rgba(0,0,0,.55)", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
      <div style={{ background:"var(--bg)", borderRadius:"var(--r5)", padding:"var(--s6)", maxWidth:"380px", width:"100%", boxShadow:"var(--sh-lg)", textAlign:"center" }}>
        <div style={{ marginBottom:"var(--s3)" }}><svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 010 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></div>
        <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.4rem", fontWeight:900, marginBottom:"var(--s2)" }}>
          {greeting}, {user?.name?.split(" ")[0] || "there"}!
        </h2>
        <p style={{ color:"var(--t3)", fontSize:".9375rem", marginBottom:"var(--s5)", lineHeight:1.5 }}>
          Please confirm you're on duty today. This helps your admin track who's available and working.
        </p>
        <button onClick={onConfirm}
          style={{ width:"100%", padding:"13px", borderRadius:"var(--r3)", border:"none", background:"linear-gradient(135deg,var(--brand),#c94010)", color:"#fff", fontWeight:800, fontSize:"1rem", cursor:"pointer", fontFamily:"var(--ff-b)", marginBottom:"var(--s2)", boxShadow:"0 6px 20px rgba(232,82,26,.35)" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg> Yes, I'm on duty today
        </button>
        <button onClick={onDismiss}
          style={{ width:"100%", padding:"11px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontWeight:600, fontSize:".9375rem", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
          Remind me later
        </button>
      </div>
    </div>
  );
}

export function QueuePage() {
  const { user }   = useAuth();
  const listRef    = useRef(null);
  const { loading: pageLoading } = usePageLoader(800);

  const [tab,         setTab]         = useState("queue");
  const [queue,       setQueue]       = useState([]);
  const [completed,   setCompleted]   = useState([]);
  const [stock,       setStock]       = useState([]);
  const [alertCount,  setAlertCount]  = useState(0);
  const [updating,    setUpdating]    = useState({});
  const [upiOrder,    setUpiOrder]    = useState(null); // order awaiting mark-paid confirmation
  const [cancelOrder, setCancelOrder] = useState(null); // order awaiting cancel confirmation
  const [dataLoading, setDataLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [wsStatus,    setWsStatus]    = useState("connecting");
  const [showDutyPrompt, setShowDutyPrompt] = useState(false); // daily on-duty prompt
  const prevQueueLen  = useRef(0);
  const wsRef         = useRef(null);
  const upiPendingRef = useRef(new Set()); // tracks order IDs with UPI payment pending
  const upiReminderRef= useRef(null);      // periodic bell reminder interval

  // Show daily on-duty prompt if staff hasn't confirmed today
  useEffect(() => {
    const key = `duty_confirmed_${new Date().toISOString().slice(0, 10)}`;
    const confirmed = localStorage.getItem(key);
    if (!confirmed && user?.role === "staff") {
      setTimeout(() => setShowDutyPrompt(true), 1500);
    }
  }, [user]);

  const alertNewOrder = (newQueue) => {
    // ── UPI payment pending detection ───────────────────────────────────
    const nowUpiIds = new Set(
      newQueue
        .filter(o => o.payment_method === "upi" && o.payment_status === "pending")
        .map(o => o.id)
    );
    const newUpi = [...nowUpiIds].filter(id => !upiPendingRef.current.has(id));
    if (newUpi.length > 0) {
      playUPIBell();
      notify(
        `${newUpi.length} UPI order${newUpi.length > 1 ? "s" : ""} awaiting payment — mark paid before confirming!`,
        "warning",
      );
      if (navigator.vibrate) navigator.vibrate([100, 60, 100, 60, 200]);
    }
    upiPendingRef.current = nowUpiIds;

    // ── Periodic reminder: ring every 60 s while any UPI order is unpaid ─
    clearInterval(upiReminderRef.current);
    if (nowUpiIds.size > 0) {
      upiReminderRef.current = setInterval(() => {
        if (upiPendingRef.current.size > 0) {
          playUPIBell();
          notify(
            `Reminder: ${upiPendingRef.current.size} UPI payment${upiPendingRef.current.size > 1 ? "s" : ""} still pending!`,
            "warning",
          );
        } else {
          clearInterval(upiReminderRef.current);
        }
      }, 60_000);
    }

    // ── Standard new-order alert ─────────────────────────────────────────
    if (newQueue.length <= prevQueueLen.current) return;
    const diff = newQueue.length - prevQueueLen.current;
    notify(
      `${diff} new order${diff > 1 ? "s" : ""} in the queue`,
      "order",
    );
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    if (listRef.current && typeof gsap !== "undefined") {
      gsap.fromTo(listRef.current,
        { borderColor:"var(--brand)", boxShadow:"0 0 0 3px var(--brand-tint)" },
        { borderColor:"transparent", boxShadow:"none", duration:1.2 });
    }
  };

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setDataLoading(true);
    try {
      const [qR, cR, sR] = await Promise.all([
        getOrderQueue().catch(() => ({ data:{ queue:[] } })),
        getCompletedOrders().catch(() => ({ data:{ completed:[] } })),
        getStockDashboard().catch(() => ({ data:{ stock:[], alert_count:0 } })),
      ]);
      const newQueue = qR.data.queue || [];
      if (silent) alertNewOrder(newQueue);
      prevQueueLen.current = newQueue.length;
      setQueue(newQueue);
      setCompleted(cR.data.completed || []);
      setStock(sR.data.stock || []);
      setAlertCount(sR.data.alert_count || 0);
      setLastRefresh(Date.now());
    } finally { setDataLoading(false); }
  }, []);

  // WebSocket setup — connects to ws/queue/<branch_id>/?token=<jwt>
  useEffect(() => {
    const branchId = user?.branch_id || localStorage.getItem("branch_id");
    const token    = localStorage.getItem("access_token");
    if (!branchId || !token) { setWsStatus("polling"); return; }

    const proto   = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost  = process.env.REACT_APP_WS_HOST || (() => {
      const h = window.location.hostname;
      return h.endsWith("knfcs.com") ? "api.knfcs.com" : h;
    })();
    const wsPort  = (!process.env.REACT_APP_WS_HOST && window.location.port && window.location.port !== "443" && window.location.port !== "80")
      ? `:${window.location.port}`
      : "";
    const url     = `${proto}://${wsHost}${wsPort}/ws/queue/${branchId}/?token=${token}`;

    let ws;
    let reconnectTimer;

    const connect = () => {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("live");
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "queue_update" && msg.queue) {
            const newQueue = msg.queue;
            alertNewOrder(newQueue);
            prevQueueLen.current = newQueue.length;
            setQueue(newQueue);
            if (msg.completed)   setCompleted(msg.completed);
            if (msg.alert_count !== undefined) setAlertCount(msg.alert_count);
            setLastRefresh(Date.now());
            setDataLoading(false);
          } else if (msg.type === "new_order") {
            // Just received a new order event — do a full HTTP refresh for stock too
            loadAll(true);
          }
        } catch {}
      };

      ws.onerror = () => { setWsStatus("polling"); };

      ws.onclose = () => {
        setWsStatus("polling");
        // Reconnect after 5s
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(upiReminderRef.current);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [user?.branch_id]);

  // Initial HTTP load + notification permission
  useEffect(() => {
    loadAll();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // HTTP polling fallback — only active when WebSocket is NOT live
  useEffect(() => {
    if (wsStatus === "live") return;
    const t = setInterval(() => loadAll(true), 15000);
    return () => clearInterval(t);
  }, [loadAll, wsStatus]);

  // Called when staff clicks "Mark paid" — opens UPI ref modal
  const handleMarkPaid = (order) => {
    setUpiOrder(order);
  };

  // Called from PaymentSerialModal on confirm
  // payment_serial is auto-generated server-side; we only pass upi_ref if provided
  const handleConfirmPayment = async (orderId, upiRef = "") => {
    try {
      const body = { payment_status: "paid" };
      if (upiRef) body.upi_ref = upiRef;
      const res = await axiosClient.patch(`/orders/${orderId}/payment/`, body);
      const serial = res.data.payment_serial || "";
      notify(`Payment confirmed${serial ? ` · ${serial}` : ""}`, "success");
      setUpiOrder(null);
      await loadAll(true);
    } catch (e) {
      notify(e.response?.data?.error || "Could not mark as paid. Please try again.", "error");
    }
  };

  const handleCancelOrder = async (orderId, reason = "customer_request", note = "") => {
    setCancelOrder(null);
    try {
      await axiosClient.patch(`/orders/${orderId}/cancel/`, { reason, note });
      notify(`Order cancelled — ${reason.replace(/_/g," ")}`, "warning");
      await loadAll(true);
    } catch (e) {
      notify(e.response?.data?.error || "Could not cancel order", "error");
    }
  };

  const handleStatus = async (orderId, next) => {
    setUpdating(u => ({...u, [orderId]:true}));
    try {
      await updateOrderStatus(orderId, next);
      await loadAll(true);
      if (next === "ready")     notify("Order is ready for pickup!", "order");
      if (next === "completed") notify("Order completed ✓", "success");
      const el = listRef.current?.querySelector(`[data-order="${orderId}"]`);
      if (el && typeof gsap !== "undefined") {
        gsap.fromTo(el, { scale:.97, opacity:.6 }, { scale:1, opacity:1, duration:.35, ease:"back.out(1.5)" });
      }
    } catch {
      notify("Failed to update order status", "error");
    } finally { setUpdating(u => ({...u, [orderId]:false})); }
  };

  const handleAck = async () => { await ackAlerts(); setAlertCount(0); };

  if (pageLoading) return <KNCLoader visible label="Loading queue…"/>;

  const carriedOver = queue.filter(o => o.carried_over);
  const todayRev    = completed.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const mins        = Math.floor((Date.now() - lastRefresh) / 1000);

  const TABS = [
    { key:"queue",  label:"Live queue",   badge:queue.length,     badgeColor:"var(--brand)" },
    { key:"done",   label:"Completed",    badge:completed.length, badgeColor:"var(--ok)"    },
    { key:"stock",  label:"Stock",        badge:alertCount > 0 ? alertCount : null, badgeColor:"var(--err)" },
  ];

  const handleDutyConfirm = async () => {
    const key = `duty_confirmed_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(key, "1");
    setShowDutyPrompt(false);
    try { await axiosClient.patch("/auth/me/", { is_on_duty: true }); } catch {}
    notify(`Welcome ${user?.name?.split(" ")[0] || ""}! You're on duty today.`, "success");
  };

  return (
    <AppLayout>
      {/* Daily on-duty prompt */}
      {showDutyPrompt && (
        <DutyPromptModal user={user} onConfirm={handleDutyConfirm} onDismiss={() => setShowDutyPrompt(false)}/>
      )}
      {/* UPI payment confirmation modal */}
      {upiOrder && (
        <PaymentSerialModal order={upiOrder} onConfirm={handleConfirmPayment} onClose={() => setUpiOrder(null)}/>
      )}
      {/* Cancel reason modal — rendered at page level so it's never clipped by overflow:hidden cards */}
      {cancelOrder && (
        <CancelReasonModal
          order={cancelOrder}
          onConfirm={(reason, note) => handleCancelOrder(cancelOrder.id, reason, note)}
          onClose={() => setCancelOrder(null)}
        />
      )}
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s4)", gap:"var(--s3)", flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"3px" }}>KNFC Staff</div>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.25rem,5vw,1.625rem)", fontWeight:900, letterSpacing:"-.02em" }}>
            {user?.name || "Staff"}
          </h1>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", flexWrap:"wrap" }}>
          {/* Refresh */}
          <button onClick={() => loadAll()} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"8px 12px", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--rf)", fontSize:".75rem", color:"var(--t3)", cursor:"pointer", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}
            onMouseEnter={e => e.currentTarget.style.borderColor="var(--brand)"}
            onMouseLeave={e => e.currentTarget.style.borderColor="var(--bd)"}>
            <Ic.Refresh/> {mins < 5 ? "Just now" : `${mins}s ago`}
          </button>

          {/* Alert count */}
          {alertCount > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"8px 12px", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--rf)" }}>
              <Ic.Alert/>
              <span style={{ fontSize:".75rem", fontWeight:700, color:"var(--err)" }}>{alertCount}</span>
            </div>
          )}

          {/* On duty + WS status combined pill */}
          <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 12px", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.2)", borderRadius:"var(--rf)" }}>
            <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:wsStatus==="live"?"var(--ok)":wsStatus==="connecting"?"var(--warn)":"var(--t4)", animation:wsStatus==="live"?"pulse 2s infinite":"none", flexShrink:0 }}/>
            <span style={{ fontSize:".75rem", fontWeight:700, color:"var(--ok)" }}>
              {wsStatus==="live" ? "Live" : wsStatus==="connecting" ? "Connecting…" : "On duty"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:"var(--s5)" }}>
        <StatCard label="In queue"    value={queue.length}            color="var(--info)"  />
        <StatCard label="Done today"  value={completed.length}        color="var(--ok)"    />
        <StatCard label="Revenue"     value={formatPrice(todayRev)}   color="var(--brand)" />
        <StatCard label="Stock alerts" value={alertCount}             color={alertCount > 0 ? "var(--err)" : "var(--ok)"} sub={alertCount > 0 ? "Needs attention" : "All good"} />
      </div>

      {/* Today date strip */}
      <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s4)", padding:"var(--s2) var(--s3)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)" }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span style={{ fontSize:".75rem", fontWeight:700, color:"var(--t2)" }}>
          {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}
        </span>
        <span style={{ marginLeft:"auto", fontSize:".6875rem", fontWeight:700, padding:"2px 8px", borderRadius:"var(--rf)", background:"var(--ok-t)", color:"var(--ok)", border:"1px solid rgba(29,158,117,.2)" }}>
          Queue resets at midnight
        </span>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:"var(--s5)" }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-item${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.badge !== null && t.badge !== undefined && (
              <span style={{ marginLeft:"6px", fontSize:".6875rem", fontWeight:800, padding:"1px 6px", borderRadius:"var(--rf)", background:tab===t.key?`${t.badgeColor}22`:"var(--bg3)", color:tab===t.key?t.badgeColor:"var(--t4)", border:tab===t.key?`1px solid ${t.badgeColor}33`:"1px solid transparent" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── QUEUE TAB ───────────────────────────────────────────────── */}
      {tab === "queue" && (
        <div ref={listRef}>
          {carriedOver.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.2)", borderRadius:"var(--r4)", padding:"var(--s3) var(--s4)", marginBottom:"var(--s4)" }}>
              <Ic.Alert/>
              <span style={{ fontSize:".9375rem", fontWeight:700, color:"var(--err)" }}>
                {carriedOver.length} order{carriedOver.length !== 1 ? "s" : ""} carried over from yesterday
              </span>
            </div>
          )}

          {dataLoading ? (
            <div className="order-grid">
              {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"200px", borderRadius:"var(--r5)" }}/>)}
            </div>
          ) : queue.length === 0 ? (
            <Empty title="Queue is clear" sub="No active orders right now. Ready for the next one!"/>
          ) : (
            <div className="order-grid">
              {queue.map(order => (
                <OrderCard key={order.id} order={order} updating={updating[order.id]} onStatus={handleStatus} onMarkPaid={handleMarkPaid} onCancel={order => setCancelOrder(order)}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DONE TAB ────────────────────────────────────────────────── */}
      {tab === "done" && (
        <div>
          {completed.length === 0 ? (
            <Empty title="No completed orders" sub="Completed orders will appear here during the shift."/>
          ) : (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"var(--s4)", padding:"var(--s3) var(--s4)", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.2)", borderRadius:"var(--r3)" }}>
                <span style={{ fontSize:".875rem", color:"var(--t3)" }}>{completed.length} orders today</span>
                <span style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:900, color:"var(--ok)" }}>{formatPrice(todayRev)}</span>
              </div>

              <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden" }}>
                {completed.map((o, i) => (
                  <div key={o.id}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s5)", borderBottom:i<completed.length-1?"1px solid var(--bd)":"none", transition:"background var(--d1) var(--ease)" }}
                    onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
                      <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:900, padding:"4px 12px", borderRadius:"var(--r2)", background:"var(--ok-t)", color:"var(--ok)", border:"1px solid rgba(29,158,117,.2)", minWidth:"60px", textAlign:"center" }}>
                        {o.token_number}
                      </div>
                      <div>
                        <div style={{ fontSize:".9375rem", fontWeight:600, marginBottom:"2px" }}>{o.customer_name || "Walk-in"}</div>
                        <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>
                          {o.item_count} items · {o.order_type === "dine_in" ? `Table ${o.table_number}` : "Pickup"}
                          {o.confirmed_by_name && <> · <span style={{ color:"var(--ok)", fontWeight:600 }}>by {o.confirmed_by_name}</span></>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right", display:"flex", alignItems:"center", gap:"var(--s3)" }}>
                      <div>
                        <div className="price" style={{ fontSize:"1rem" }}>{formatPrice(o.total)}</div>
                        {o.completed_at && <div style={{ fontSize:".75rem", color:"var(--t4)", marginTop:"2px" }}>{formatTime(o.completed_at)}</div>}
                      </div>
                      <button onClick={() => printKOT(o)} title="Print KOT"
                        style={{ padding:"6px 10px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".75rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", gap:"4px", flexShrink:0, transition:"all var(--d1) var(--ease)" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.color="var(--brand)";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.color="var(--t2)";}}>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        KOT
                      </button>
                      <button onClick={() => printBill(o)} title="Print bill"
                        style={{ padding:"6px 10px", borderRadius:"var(--r2)", border:"1px solid rgba(29,158,117,.3)", background:"var(--ok-t)", cursor:"pointer", fontSize:".75rem", fontWeight:600, color:"var(--ok)", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", gap:"4px", flexShrink:0, transition:"all var(--d1) var(--ease)" }}
                        onMouseEnter={e=>{e.currentTarget.style.background="var(--ok)";e.currentTarget.style.color="#fff";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="var(--ok-t)";e.currentTarget.style.color="var(--ok)";}}>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Bill
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STOCK TAB ───────────────────────────────────────────────── */}
      {tab === "stock" && (
        <div>
          {alertCount > 0 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"var(--s3)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.22)", borderRadius:"var(--r4)", padding:"var(--s3) var(--s4)", marginBottom:"var(--s4)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", color:"var(--err)" }}>
                <Ic.Alert/>
                <span style={{ fontSize:".9375rem", fontWeight:700 }}>{alertCount} stock alert{alertCount !== 1 ? "s" : ""} need attention</span>
              </div>
              <button onClick={handleAck} className="btn btn-danger btn-sm">
                Mark seen ✓
              </button>
            </div>
          )}

          <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden" }}>
            {/* Table header — hidden on mobile via CSS */}
            <div className="stock-table-header" style={{ display:"grid", gridTemplateColumns:"1fr 64px 64px 80px", gap:"var(--s2)", padding:"var(--s3) var(--s5)", background:"var(--bg2)", borderBottom:"1px solid var(--bd)" }}>
              {["Item","Total","Used","Left"].map((h, i) => (
                <div key={h} style={{ fontSize:".5625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", textAlign:i > 0 ? "center" : "left" }}>{h}</div>
              ))}
            </div>
            {stock.length === 0 && (
              <div style={{ padding:"var(--s8)", textAlign:"center", color:"var(--t3)", fontSize:".9375rem" }}>
                No stock data for today
              </div>
            )}
            {stock.map((s, i) => {
              const statusColor = s.status === "out" ? "var(--err)" : s.status === "low" ? "var(--warn)" : "var(--ok)";
              return (
                <div key={s.menu_item_id} className="stock-table-row"
                  style={{ display:"grid", gridTemplateColumns:"1fr 64px 64px 80px", gap:"var(--s2)", padding:"var(--s4) var(--s5)", borderBottom:i < stock.length-1 ? "1px solid var(--bd)" : "none", alignItems:"center", background:s.status !== "ok" ? `${statusColor}05` : "transparent", borderLeft:s.status !== "ok" ? `3px solid ${statusColor}` : "3px solid transparent", transition:"background var(--d1) var(--ease)" }}>
                  <div>
                    <div style={{ fontSize:".9375rem", fontWeight:600 }}>{s.menu_item_name}</div>
                    {s.status !== "ok" && (
                      <div style={{ fontSize:".6875rem", fontWeight:800, textTransform:"uppercase", letterSpacing:".06em", color:statusColor, marginTop:"2px" }}>
                        {s.status === "out" ? "Out of stock" : "Running low"}
                      </div>
                    )}
                  </div>
                  {/* Numbers row — shown inline on desktop, stacked on mobile */}
                  <div className="stock-table-num-cell" style={{ textAlign:"center", fontSize:".9375rem", fontWeight:600, color:"var(--t3)" }}>
                    <span className="stock-mobile-label" style={{ display:"none", fontSize:".6875rem", color:"var(--t4)", marginRight:"4px" }}>Total:</span>
                    {s.today_stock}
                  </div>
                  <div className="stock-table-num-cell" style={{ textAlign:"center", fontSize:".9375rem", fontWeight:600, color:"var(--t3)" }}>
                    <span className="stock-mobile-label" style={{ display:"none", fontSize:".6875rem", color:"var(--t4)", marginRight:"4px" }}>Used:</span>
                    {s.used_stock}
                  </div>
                  <div className="stock-table-num-cell" style={{ textAlign:"center" }}>
                    <span className="stock-mobile-label" style={{ display:"none", fontSize:".6875rem", color:"var(--t4)", marginRight:"4px" }}>Left:</span>
                    <span style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, color:statusColor }}>{s.remaining_stock}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </AppLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STOCK PAGE (standalone /staff/stock route)
══════════════════════════════════════════════════════════════════════ */
export function StockPage() {
  const { loading: pageLoading } = usePageLoader(800);
  const { user } = useAuth();
  const isAdmin  = user?.role === "branch_admin" || user?.role === "super_admin";
  const [stock,      setStock]      = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [topUpItem,  setTopUpItem]  = useState(null);
  const [topUpQty,   setTopUpQty]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const modalRef     = useRef(null);

  const load = async () => {
    const res = await getStockDashboard().catch(() => ({ data:{ stock:[], alerts:[] } }));
    setStock(res.data.stock || []);
    setAlerts(res.data.alerts || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!topUpItem || !modalRef.current || typeof gsap === "undefined") return;
    gsap.fromTo(modalRef.current, { scale:.94, opacity:0, y:16 }, { scale:1, opacity:1, y:0, duration:.3, ease:"back.out(1.8)" });
  }, [topUpItem]);

  const handleTopUp = async () => {
    if (!topUpItem || !topUpQty) return;
    setSubmitting(true);
    try {
      await topUpStock({ menu_item_id:topUpItem.menu_item_id, quantity:parseInt(topUpQty) });
      setTopUpItem(null); setTopUpQty("");
      await load();
    } finally { setSubmitting(false); }
  };

  if (pageLoading) return <KNCLoader visible label="Loading stock…"/>;

  const QUICK = [5, 10, 20, 50];

  return (
    <AppLayout>
      <div style={{ maxWidth:"840px", margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s6)" }}>
          <div>
            <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.75rem", fontWeight:900, letterSpacing:"-.025em" }}>Stock dashboard</h1>
            <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:"3px" }}>Today's inventory at a glance</p>
          </div>
          {alerts.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 14px", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--rf)" }}>
              <Ic.Alert/>
              <span style={{ fontSize:".875rem", fontWeight:700, color:"var(--err)" }}>{alerts.length} alert{alerts.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Alert banners */}
        {alerts.length > 0 && (
          <div style={{ marginBottom:"var(--s5)", display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
            {alerts.map(a => (
              <div key={a.id}
                style={{ display:"flex", alignItems:"center", gap:"var(--s3)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.22)", borderRadius:"var(--r4)", padding:"var(--s3) var(--s4)", borderLeft:"3px solid var(--err)" }}>
                <div style={{ color:"var(--err)", flexShrink:0 }}><Ic.Alert/></div>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:".9375rem", fontWeight:700, color:"var(--err)" }}>{a.menu_item_name}</span>
                  <span style={{ fontSize:".9375rem", color:"var(--t2)", marginLeft:"var(--s2)" }}>
                    — {a.alert_type === "out" ? "Out of stock" : "Running low"}
                  </span>
                </div>
                <button onClick={() => setTopUpItem(stock.find(s => s.menu_item_name === a.menu_item_name))} className="btn btn-danger btn-sm">
                  + Add stock
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stock table */}
        <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr repeat(4,80px)", padding:"var(--s3) var(--s5)", background:"var(--bg2)", borderBottom:"1px solid var(--bd)" }}>
            {["Item","Total","Used","Left",""].map((h, i) => (
              <div key={i} style={{ fontSize:".5625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", textAlign:i > 0 ? "center" : "left" }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding:"var(--s8)", textAlign:"center", color:"var(--t3)" }}>Loading…</div>
          ) : stock.map((s, i) => {
            const c = s.status === "out" ? "var(--err)" : s.status === "low" ? "var(--warn)" : "var(--ok)";
            return (
              <div key={s.menu_item_id}
                style={{ display:"grid", gridTemplateColumns:"1fr repeat(4,80px)", padding:"var(--s4) var(--s5)", borderBottom:i < stock.length-1 ? "1px solid var(--bd)" : "none", alignItems:"center", borderLeft:`3px solid ${s.status !== "ok" ? c : "transparent"}`, background:s.status !== "ok" ? `${c}05` : "transparent", transition:"background var(--d1) var(--ease)" }}
                onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                onMouseLeave={e => e.currentTarget.style.background=s.status !== "ok" ? `${c}05` : "transparent"}>
                <div style={{ fontSize:".9375rem", fontWeight:600 }}>{s.menu_item_name}</div>
                <div style={{ textAlign:"center", fontWeight:600, color:"var(--t3)" }}>{s.today_stock}</div>
                <div style={{ textAlign:"center", fontWeight:600, color:"var(--t3)" }}>{s.used_stock}</div>
                <div style={{ textAlign:"center" }}>
                  <span style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, color:c }}>{s.remaining_stock}</span>
                </div>
                <div style={{ textAlign:"center" }}>
                  {isAdmin ? (
                    <button onClick={() => setTopUpItem(s)}
                      style={{ padding:"6px 12px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)", display:"inline-flex", alignItems:"center", gap:"4px" }}
                      onMouseEnter={e => { e.currentTarget.style.background="var(--brand-tint)"; e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.color="var(--brand)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background="var(--bg2)"; e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.color="var(--t2)"; }}>
                      <Ic.Plus/> Add
                    </button>
                  ) : (
                    <span style={{ fontSize:".75rem", color:"var(--t4)" }}>View only</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top-up modal */}
      {topUpItem && (
        <div
          style={{ position:"fixed", top:0, left:0, right:0, bottom:"72px", zIndex:200, background:"rgba(0,0,0,.55)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}
          onClick={e => { if (e.target === e.currentTarget) { setTopUpItem(null); setTopUpQty(""); } }}>
          <div ref={modalRef} style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", padding:"var(--s6)", width:"100%", maxWidth:"400px", boxShadow:"var(--sh-xl)" }}>
            <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, letterSpacing:"-.015em", marginBottom:"var(--s2)" }}>
              Add stock
            </h3>
            <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)" }}>
              {topUpItem.menu_item_name} — currently
              <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, color:topUpItem.remaining_stock < 5 ? "var(--err)" : "var(--ok)", marginLeft:"5px" }}>
                {topUpItem.remaining_stock}
              </span> left
            </p>

            {/* Quick presets */}
            <div style={{ marginBottom:"var(--s4)" }}>
              <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", marginBottom:"var(--s2)", letterSpacing:".04em" }}>Quick add</div>
              <div style={{ display:"flex", gap:"var(--s2)" }}>
                {QUICK.map(q => (
                  <button key={q} onClick={() => setTopUpQty(String(q))}
                    style={{ flex:1, padding:"8px", borderRadius:"var(--r3)", border:`1px solid ${topUpQty === String(q) ? "var(--brand)" : "var(--bd)"}`, background:topUpQty === String(q) ? "var(--brand-tint)" : "var(--bg2)", cursor:"pointer", fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, color:topUpQty === String(q) ? "var(--brand)" : "var(--t2)", transition:"all var(--d1) var(--ease)" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-wrap" style={{ marginBottom:"var(--s5)" }}>
              <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, color:"var(--t3)", fontSize:"1rem" }}>#</span>
              <input type="number" min="1" value={topUpQty} onChange={e => setTopUpQty(e.target.value)}
                placeholder="Custom quantity…" className="input-field" autoFocus style={{ fontFamily:"var(--ff-d)", fontWeight:700, fontSize:"1.125rem" }}/>
            </div>

            <div style={{ display:"flex", gap:"var(--s2)" }}>
              <button onClick={handleTopUp} disabled={submitting || !topUpQty} className="btn btn-p btn-lg" style={{ flex:1 }}>
                {submitting ? "Adding…" : `Add ${topUpQty || "?"} to stock`}
              </button>
              <button onClick={() => { setTopUpItem(null); setTopUpQty(""); }} className="btn btn-s btn-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   NEW ORDER PAGE (walk-in)
══════════════════════════════════════════════════════════════════════ */
export function NewOrderPage() {
  const navigate = useNavigate();
  const { loading: pageLoading } = usePageLoader(800);

  const [items,        setItems]        = useState([]);
  const [stockMap,     setStockMap]     = useState({});  // menu_item_id → remaining_stock
  const [itemsLoading, setItemsLoading] = useState(true);
  const [search,       setSearch]       = useState("");
  const [cart,         setCart]         = useState([]);
  const [walkinName,   setWalkinName]   = useState("");
  const [walkinPhone,  setWalkinPhone]  = useState("");
  const [orderType,    setOrderType]    = useState("pickup");
  const [tableNum,     setTableNum]     = useState("");
  const [placing,      setPlacing]      = useState(false);
  const [placed,       setPlaced]       = useState(false);
  const [placeError,   setPlaceError]   = useState(null);
  const [imgErrors,    setImgErrors]    = useState({});

  useEffect(() => {
    const bid = localStorage.getItem("branch_id");
    if (!bid) { setItemsLoading(false); return; }
    setItemsLoading(true);
    // Load menu items AND stock in parallel
    Promise.all([
      getItems({ branch_id: bid, available: false }),
      getStockDashboard(bid),
    ])
      .then(([itemsRes, stockRes]) => {
        setItems(itemsRes.data.items || []);
        // Build stock lookup map by menu_item_id
        const map = {};
        for (const s of (stockRes.data.stock || [])) {
          map[s.menu_item_id] = s.remaining_stock;
        }
        setStockMap(map);
      })
      .catch(() => {})
      .finally(() => setItemsLoading(false));
  }, []);

  const filtered = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items.slice(0, 24);

  const addToCart = item => {
    setCart(c => {
      const ex = c.find(x => x.id === item.id);
      return ex ? c.map(x => x.id === item.id ? {...x, qty:x.qty+1} : x) : [...c, {...item, qty:1}];
    });
  };

  const updateQty = (id, qty) =>
    qty <= 0
      ? setCart(c => c.filter(x => x.id !== id))
      : setCart(c => c.map(x => x.id === id ? {...x, qty} : x));

  const total = cart.reduce((s, i) => s + i.qty * parseFloat(i.offer_price || i.price), 0);

  // India mobile validation: 10 digits, starts with 6/7/8/9
  const validatePhone = (p) => {
    if (!p) return true; // optional — allow blank
    const clean = p.replace(/\D/g, "");
    return clean.length === 10 && /^[6-9]/.test(clean);
  };

  const handlePlace = async () => {
    if (!cart.length) return;
    // Phone validation for walk-in (if provided)
    if (walkinPhone && !validatePhone(walkinPhone)) {
      setPlaceError("Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).");
      return;
    }
    setPlacing(true);
    setPlaceError(null);
    try {
      await placeOrder({
        order_type:   orderType,
        table_number: tableNum ? parseInt(tableNum) : undefined,
        walkin_name:  walkinName || undefined,
        walkin_phone: walkinPhone || undefined,
        placed_by:    "staff",
        items:        cart.map(i => ({ menu_item_id:i.id, quantity:i.qty })),
      });
      setPlaced(true);
      setTimeout(() => navigate("/staff/queue"), 1200);
    } catch (err) {
      setPlaceError(
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to place order. Please try again."
      );
    } finally { setPlacing(false); }
  };

  if (pageLoading) return <KNCLoader visible label="New walk-in order…"/>;

  return (
    <AppLayout>
      <div style={{ maxWidth:"960px", margin:"0 auto" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s6)" }}>
          <button onClick={() => navigate("/staff/queue")} className="btn btn-g btn-ico"><Ic.Back/></button>
          <div>
            <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.75rem", fontWeight:900, letterSpacing:"-.025em" }}>Walk-in order</h1>
            <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:"2px" }}>Add items and place the order for a customer at the counter</p>
          </div>
        </div>

        <div className="no-grid">
          {/* ── LEFT: menu grid ──────────────────────────────────── */}
          <div>
            {/* Search */}
            <div className="input-wrap" style={{ marginBottom:"var(--s4)" }}>
              <span style={{ color:"var(--t3)", display:"flex", flexShrink:0 }}><Ic.Search/></span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu…" className="input-field"/>
              {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t3)", fontSize:"18px", lineHeight:1, flexShrink:0 }}>×</button>}
            </div>

            {/* Stock warning — if no stock records found for today */}
            {!itemsLoading && Object.keys(stockMap).length === 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", padding:"var(--s3) var(--s4)", background:"rgba(239,159,39,.08)", border:"1px solid rgba(239,159,39,.3)", borderRadius:"var(--r3)", marginBottom:"var(--s4)", fontSize:".875rem" }}>
                <Ic.Alert/>
                <span style={{ fontWeight:700, color:"var(--warn)" }}>Stock not updated for today.</span>
                <span style={{ color:"var(--t2)" }}>Set opening stock before creating walk-in orders.</span>
              </div>
            )}

            {/* Grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"var(--s2)" }} className="no-item-grid">
              {itemsLoading && [1,2,3,4,5,6].map(i => (
                <div key={i} style={{ background:"var(--bg2)", borderRadius:"var(--r4)", padding:"var(--s3)", height:"88px", animation:"pulse 1.4s ease-in-out infinite" }}/>
              ))}
              {!itemsLoading && filtered.length === 0 && (
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"var(--s8) var(--s4)", color:"var(--t3)", fontSize:".875rem" }}>
                  {search ? "No items match your search." : "No menu items available."}
                </div>
              )}
              {!itemsLoading && filtered.map(item => {
                const inCart      = cart.find(x => x.id === item.id);
                const stockLeft   = stockMap[item.id]; // undefined = no stock record
                const stockSet    = stockLeft !== undefined;
                // Block if explicitly 0 stock, or if item is unavailable
                const isOOS       = !item.is_available || (stockSet && stockLeft <= 0);
                const noStockData = !stockSet && item.is_available;  // stock not updated today
                // Block walk-in orders if stock has not been set for the day
                const blocked     = isOOS || noStockData;

                const borderColor = inCart ? "var(--brand)" : isOOS ? "rgba(226,75,74,.3)" : noStockData ? "rgba(239,159,39,.35)" : "var(--bd)";
                const bgColor     = inCart ? "var(--brand-tint)" : "var(--bgc)";

                return (
                  <div key={item.id}
                    onClick={() => !blocked && addToCart(item)}
                    title={noStockData ? "Stock not updated — set opening stock first" : isOOS ? "Out of stock" : ""}
                    style={{ background:bgColor, border:`1px solid ${borderColor}`, borderRadius:"var(--r4)", padding:"var(--s3)", cursor:blocked?"not-allowed":"pointer", opacity:blocked?.5:1, transition:"all var(--d1) var(--ease)", position:"relative", overflow:"hidden" }}
                    onMouseEnter={e => { if (!blocked) { e.currentTarget.style.background="var(--brand-tint)"; e.currentTarget.style.borderColor="var(--brand)"; } }}
                    onMouseLeave={e => { e.currentTarget.style.background=inCart?"var(--brand-tint)":"var(--bgc)"; e.currentTarget.style.borderColor=borderColor; }}>

                    {inCart && (
                      <div style={{ position:"absolute", top:"6px", right:"6px", width:"20px", height:"20px", borderRadius:"50%", background:"var(--brand)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:".625rem", fontWeight:900, fontFamily:"var(--ff-d)" }}>
                        {inCart.qty}
                      </div>
                    )}

                    {/* Small image */}
                    {item.image_url && !imgErrors[item.id] && (
                      <div style={{ height:"56px", borderRadius:"var(--r2)", overflow:"hidden", marginBottom:"var(--s2)", background:"var(--bg3)" }}>
                        <img src={item.image_url} alt={item.name}
                          onError={() => setImgErrors(e => ({...e, [item.id]:true}))}
                          style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      </div>
                    )}

                    <div style={{ fontSize:".875rem", fontWeight:600, marginBottom:"4px", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.3 }}>{item.name}</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:2 }}>
                      <span className="price" style={{ fontSize:".875rem" }}>{formatPrice(item.offer_price || item.price)}</span>
                      {isOOS      && <span className="badge badge-err"  style={{ fontSize:".5625rem" }}>Out</span>}
                      {noStockData && <span className="badge badge-warn" style={{ fontSize:".5625rem" }}>No stock</span>}
                      {!blocked && stockSet && <span style={{ fontSize:".625rem", color:"var(--t4)", fontWeight:600 }}>{stockLeft} left</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: order summary ─────────────────────────────── */}
          <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", padding:"var(--s5)", position:"sticky", top:`calc(var(--nav-h) + var(--s4))`, maxHeight:"calc(100vh - var(--nav-h) - 2rem)", overflowY:"auto" }}>
            <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, marginBottom:"var(--s5)", letterSpacing:"-.015em" }}>Order summary</h3>

            {/* Customer info */}
            <div style={{ marginBottom:"var(--s4)", display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
              <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s1)" }}>Customer (optional)</div>
              <div className="input-wrap">
                <Ic.People/>
                <input value={walkinName} onChange={e => setWalkinName(e.target.value)} placeholder="Name" className="input-field"/>
              </div>
              <div className="input-wrap" style={{ border: walkinPhone && !validatePhone(walkinPhone) ? "1.5px solid var(--err)" : undefined }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg>
                <input
                  value={walkinPhone}
                  onChange={e => setWalkinPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Phone (optional)"
                  inputMode="numeric"
                  maxLength={10}
                  className="input-field"
                />
                {walkinPhone && validatePhone(walkinPhone) && (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
                )}
              </div>
              {walkinPhone && !validatePhone(walkinPhone) && (
                <p style={{ fontSize:".75rem", color:"var(--err)", marginTop:2, padding:"0 var(--s3)" }}>Valid Indian mobile: 10 digits, starts with 6-9</p>
              )}
            </div>

            {/* Order type */}
            <div style={{ marginBottom:"var(--s3)" }}>
              <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s2)" }}>Order type</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s2)" }}>
                {[["pickup","Pickup"],["dine_in","Dine-in"]].map(([v,l]) => (
                  <button key={v} onClick={() => setOrderType(v)}
                    style={{ padding:"var(--s2) var(--s3)", borderRadius:"var(--r3)", cursor:"pointer", fontFamily:"var(--ff-b)", border:`1.5px solid ${orderType===v?"var(--brand)":"var(--bd)"}`, background:orderType===v?"var(--brand-tint)":"transparent", color:orderType===v?"var(--brand)":"var(--t2)", fontWeight:700, fontSize:".875rem", transition:"all var(--d1) var(--ease)" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {orderType === "dine_in" && (
              <div className="input-wrap" style={{ marginBottom:"var(--s3)" }}>
                <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, color:"var(--t3)" }}>#</span>
                <input type="number" value={tableNum} onChange={e => setTableNum(e.target.value)} placeholder="Table no." className="input-field" style={{ fontFamily:"var(--ff-d)", fontWeight:700 }}/>
              </div>
            )}

            <div style={{ height:"1px", background:"var(--bd)", marginBottom:"var(--s4)" }}/>

            {/* Cart items */}
            {cart.length === 0 ? (
              <div style={{ textAlign:"center", padding:"var(--s8) var(--s4)", color:"var(--t3)", fontSize:".875rem" }}>
                
                Tap items on the left to add them
              </div>
            ) : (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:"var(--s1)", marginBottom:"var(--s4)" }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s2) 0", borderBottom:"1px solid var(--bd)" }}>
                      <span style={{ fontSize:".875rem", fontWeight:500, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginRight:"var(--s2)" }}>{item.name}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:"var(--s1)", flexShrink:0 }}>
                        <button onClick={() => updateQty(item.id, item.qty - 1)}
                          style={{ width:"24px", height:"24px", borderRadius:"var(--r1)", background:"var(--bg2)", border:"1px solid var(--bd)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700 }}>−</button>
                        <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, minWidth:"20px", textAlign:"center", fontSize:".9375rem" }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)}
                          style={{ width:"24px", height:"24px", borderRadius:"var(--r1)", background:"var(--brand)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, color:"#fff" }}>+</button>
                        <span className="price" style={{ fontSize:".875rem", minWidth:"52px", textAlign:"right" }}>
                          {formatPrice(item.qty * parseFloat(item.offer_price || item.price))}
                        </span>
                        <button onClick={() => updateQty(item.id, 0)}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t4)", padding:"3px", display:"flex", borderRadius:"var(--r1)", transition:"color var(--d1) var(--ease)" }}
                          onMouseEnter={e => e.currentTarget.style.color="var(--err)"}
                          onMouseLeave={e => e.currentTarget.style.color="var(--t4)"}>
                          <Ic.Trash/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"var(--s4)", padding:"var(--s2) 0" }}>
                  <span style={{ fontWeight:700 }}>Total</span>
                  <span className="price" style={{ fontSize:"1.5rem" }}>{formatPrice(total)}</span>
                </div>

                {placeError && (
                  <div style={{ marginBottom:"var(--s3)", padding:"var(--s3) var(--s4)", borderRadius:"var(--r3)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.25)", color:"var(--err)", fontSize:".8125rem", fontWeight:500, display:"flex", alignItems:"flex-start", gap:"var(--s2)" }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:"1px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {placeError}
                  </div>
                )}
                <button onClick={handlePlace} disabled={placing || placed}
                  style={{ width:"100%", padding:"14px", borderRadius:"var(--r4)", border:"none", cursor:placing||placed?"not-allowed":"pointer", fontFamily:"var(--ff-b)", fontSize:"1rem", fontWeight:800, background:placed?"var(--ok)":placing?"var(--bg3)":"var(--brand)", color:placing?"var(--t3)":"#fff", boxShadow:placed?"0 8px 24px rgba(29,158,117,.4)":placing?"none":"var(--sh-br)", transition:"all .3s var(--ease)", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                  {placed ? <><Ic.Check/> Order placed!</> : placing ? "Placing…" : "Place order →"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .no-grid{display:grid;gap:var(--s5);grid-template-columns:1fr}
        @media(min-width:900px){.no-grid{grid-template-columns:1fr 340px;align-items:start}}
        .no-item-grid{grid-template-columns:repeat(2,1fr)}
        @media(min-width:640px){.no-item-grid{grid-template-columns:repeat(3,1fr)}}
        @media(min-width:900px){.no-item-grid{grid-template-columns:repeat(2,1fr)}}
        @media(min-width:1200px){.no-item-grid{grid-template-columns:repeat(3,1fr)}}
      `}</style>
    </AppLayout>
  );
}

export default QueuePage;
