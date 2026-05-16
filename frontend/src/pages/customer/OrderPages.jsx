/**
 * OrderPages.jsx — Phase 4
 * Exports: OrderConfirmPage, OrderTrackPage
 * Design: Domino's tracker × editorial
 * - Confirm: spring token hero, points earned, witty microcopy
 * - Track: animated progress bar, celebration on READY, live pulse dot
 */
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { gsap } from "gsap";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import AppLayout from "../../components/layout/AppLayout";
import { getOrderDetail } from "../../api/orders";
import { submitReview }   from "../../api/menu";
import { formatPrice, formatTime } from "../../utils/format";
import { STATUS_META } from "../../utils/constants";
import { notify } from "../../components/common/NotificationSystem";
import GoogleReviewBanner from "../../components/common/GoogleReviewBanner";

const MICROCOPY = [
  "Your chicken is getting its spa treatment. Won't be long!",
  "The chef is putting in extra love for your order.",
  "Sizzling sounds detected from the kitchen. Good sign.",
  "Your order is marinating in greatness right now.",
  "Crispy things are happening behind that counter.",
  "The fryer is humming your order into existence.",
];

const STEPS = [
  { key:"placed",    label:"Placed",    icon:<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
  { key:"confirmed", label:"Confirmed", icon:<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg> },
  { key:"preparing", label:"Cooking",   icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg> },
  { key:"ready",     label:"Ready",     icon:<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> },
  { key:"completed", label:"Done",      icon:<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg> },
];

const STATUS_MSG = {
  placed:    { title:"Order received",   sub:"Waiting for staff confirmation.",           icon:<svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--info)" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>, color:"var(--info)"  },
  confirmed: { title:"Confirmed!",       sub:"Preparation will begin shortly.",           icon:<svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, color:"var(--ok)"    },
  preparing: { title:"We're cooking!",   sub:"Your order is in the kitchen.",             icon:<svg width="40" height="40" viewBox="0 0 24 24" fill="var(--warn)"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>, color:"var(--warn)"  },
  ready:     { title:"Ready to collect!",sub:"Show your token at the collection counter.",icon:<svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>, color:"var(--brand)" },
  completed: { title:"Order complete!",  sub:"Thanks for dining with us. See you soon!",  icon:<svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, color:"var(--t2)"   },
  cancelled: { title:"Order cancelled",  sub:"Please speak to a staff member.",           icon:<svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>, color:"var(--err)"  },
};

/* ══════════════════════════════════════════════════════════════════════
   ORDER CONFIRM PAGE
══════════════════════════════════════════════════════════════════════ */
// UPI VPA — set to the shop's registered UPI ID
const UPI_VPA  = import.meta.env?.VITE_UPI_VPA  || "knfc@upi";
const UPI_NAME = import.meta.env?.VITE_UPI_NAME || "KNFC Fried Chicken";

const RECEIPT_LOGO = import.meta.env?.VITE_RECEIPT_LOGO || "";

/* ─── Bill print helper ─────────────────────────────────────────────── */
function printBill(order) {
  const time = new Date(order.created_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
  const date = new Date(order.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  const typeLabel = order.order_type === "dine_in" ? `Dine-in · Table ${order.table_number}` : "Pickup";
  const payMethod = (order.payment_method || "cash").toUpperCase();

  const rows = (order.items || []).map(item => `
    <tr>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;">${item.name_snapshot}${item.special_instructions ? `<br/><span style="font-size:11px;color:#666;font-style:italic;">↳ ${item.special_instructions}</span>` : ""}</td>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:center;">${item.quantity}</td>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:right;">₹${parseFloat(item.price_snapshot).toFixed(2)}</td>
      <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:right;font-weight:700;">₹${parseFloat(item.line_total).toFixed(2)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt #${order.token_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Courier New',monospace; font-size:13px; color:#000; width:80mm; }
    .header { text-align:center; padding:10px 8px 8px; border-bottom:2px solid #000; }
    .brand { font-size:26px; font-weight:900; letter-spacing:4px; }
    .slogan { font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:#444; margin:2px 0 6px; }
    .token { font-size:38px; font-weight:900; letter-spacing:3px; margin:4px 0 2px; }
    .divider { border-top:1px dashed #000; margin:6px 0; }
    .divider-solid { border-top:2px solid #000; margin:6px 0; }
    table { width:100%; border-collapse:collapse; }
    th { font-size:10px; text-transform:uppercase; letter-spacing:.06em; padding:4px; text-align:left; border-bottom:2px solid #000; }
    .total-row td { padding:8px 4px; font-size:15px; font-weight:900; border-top:2px solid #000; }
    .pay-box { padding:5px 4px; font-size:12px; }
    .no-refund { text-align:center; padding:6px 4px; font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#333; border:1px solid #000; margin:6px 0; }
    .footer { text-align:center; padding:8px 0 4px; font-size:10px; color:#555; border-top:2px solid #000; margin-top:6px; }
    @media print { @page { margin:4mm; size:80mm auto; } }
  </style>
</head>
<body>
  <div class="header">
    ${RECEIPT_LOGO ? `<img src="${RECEIPT_LOGO}" alt="KNFC" style="width:60px;height:60px;object-fit:contain;margin-bottom:6px;"/>` : ""}
    <div class="brand">KNFC</div>
    <div class="slogan">Hot, Crispy &amp; Always Fresh!</div>
    <div style="font-size:9px;color:#555;margin-bottom:4px;">KNFC Fried Chicken — Customer Receipt</div>
    <div class="divider"></div>
    <div style="font-size:12px;margin:3px 0;">${date} &nbsp;·&nbsp; ${time}</div>
    <div class="token">TOKEN ${order.token_number}</div>
    <div style="font-size:12px;">${typeLabel}</div>
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
      <tr><td style="padding:3px 4px;">Subtotal</td><td style="padding:3px 4px;text-align:right;">₹${parseFloat(order.subtotal||0).toFixed(2)}</td></tr>
      ${parseFloat(order.discount||0)>0 ? `<tr><td style="padding:3px 4px;color:#555;">Discount</td><td style="padding:3px 4px;text-align:right;color:#555;">-₹${parseFloat(order.discount).toFixed(2)}</td></tr>` : ""}
      <tr class="total-row"><td>TOTAL PAID</td><td style="text-align:right;">₹${parseFloat(order.total||0).toFixed(2)}</td></tr>
    </table>

    <div class="divider"></div>
    <div class="pay-box">
      <div><strong>Payment Method:</strong> ${payMethod}</div>
      ${order.upi_ref ? `<div style="margin-top:3px;"><strong>UPI Ref:</strong> ${order.upi_ref}</div>` : ""}
      ${order.payment_status ? `<div style="margin-top:3px;"><strong>Status:</strong> ${order.payment_status.toUpperCase()}</div>` : ""}
    </div>

    <div class="no-refund">No Refund Policy — All sales are final</div>
  </div>

  <div class="footer">
    <div style="font-weight:700;margin-bottom:3px;">Thank you for choosing KNFC!</div>
    <div style="margin-bottom:2px;">We hope to see you again soon</div>
    <div style="color:#888;">Order ID: ${String(order.id).slice(0,8).toUpperCase()}</div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=360,height=700");
  if (!w) { alert("Allow popups to download bill."); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); w.onafterprint = () => w.close(); };
}

/* ─── UPI Payment Panel ─────────────────────────────────────────────── */
function UPIPaymentPanel({ order }) {
  const amount   = Number(order.total).toFixed(2);
  const note     = encodeURIComponent(`Order ${order.token_number}`);
  const vpa      = encodeURIComponent(UPI_VPA);
  const name     = encodeURIComponent(UPI_NAME);

  // upi:// deep link opens any UPI app directly
  const upiLink  = `upi://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;

  // Fallback individual app links
  const gpay    = `tez://upi/pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;
  const phonepe = `phonepe://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;
  const paytm   = `paytmmp://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;

  return (
    <div style={{ background:"linear-gradient(135deg,rgba(55,138,221,.08),rgba(55,138,221,.03))", border:"1px solid rgba(55,138,221,.3)", borderRadius:"var(--r4)", padding:"var(--s5)", marginBottom:"var(--s4)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
        <div style={{ width:"40px", height:"40px", borderRadius:"var(--r3)", background:"var(--info)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg></div>
        <div>
          <div style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:"1rem" }}>Pay via UPI</div>
          <div style={{ fontSize:".8125rem", color:"var(--t2)" }}>Tap to open your UPI app · ₹{amount}</div>
        </div>
      </div>

      {/* Primary deep link button */}
      <a href={upiLink}
        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", width:"100%", padding:"13px", borderRadius:"var(--r4)", background:"var(--info)", color:"#fff", fontFamily:"var(--ff-b)", fontWeight:800, fontSize:"1rem", textDecoration:"none", marginBottom:"var(--s3)", boxShadow:"0 4px 16px rgba(55,138,221,.4)", transition:"all var(--d1) var(--ease)" }}
        onMouseEnter={e=>e.currentTarget.style.opacity=".9"}
        onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        Pay ₹{amount} · Open UPI app →
      </a>

      {/* App-specific quick buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"var(--s2)", marginBottom:"var(--s4)" }}>
        {[
          { href:gpay,    label:"GPay",    color:"#1a73e8", bg:"rgba(26,115,232,.1)"  },
          { href:phonepe, label:"PhonePe", color:"#5f259f", bg:"rgba(95,37,159,.1)"  },
          { href:paytm,   label:"Paytm",   color:"#00b9f1", bg:"rgba(0,185,241,.1)"  },
        ].map(a => (
          <a key={a.label} href={a.href}
            style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"9px", borderRadius:"var(--r3)", border:`1px solid ${a.color}33`, background:a.bg, color:a.color, fontFamily:"var(--ff-b)", fontWeight:700, fontSize:".8125rem", textDecoration:"none", transition:"all var(--d1) var(--ease)" }}
            onMouseEnter={e=>e.currentTarget.style.opacity=".8"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            {a.label}
          </a>
        ))}
      </div>

      {/* UPI ID to copy */}
      <div style={{ background:"var(--bg2)", borderRadius:"var(--r3)", padding:"var(--s3) var(--s4)", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:".875rem" }}>
        <div>
          <div style={{ fontSize:".6875rem", color:"var(--t4)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", marginBottom:"2px" }}>UPI ID</div>
          <div style={{ fontWeight:700, fontFamily:"var(--ff-d)", letterSpacing:".02em" }}>{UPI_VPA}</div>
        </div>
        <button onClick={() => navigator.clipboard?.writeText(UPI_VPA)}
          style={{ padding:"6px 12px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bgc)", cursor:"pointer", fontSize:".75rem", fontWeight:700, fontFamily:"var(--ff-b)", color:"var(--t2)", transition:"all var(--d1) var(--ease)" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--info)";e.currentTarget.style.color="var(--info)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.color="var(--t2)";}}>
          Copy
        </button>
      </div>

      <p style={{ fontSize:".75rem", color:"var(--t4)", marginTop:"var(--s3)", textAlign:"center", lineHeight:1.5 }}>
        After payment, show staff your UPI transaction ID. Staff will mark your order as paid.
      </p>
    </div>
  );
}

/* ─── Cancel Order Button ───────────────────────────────────────────── */
function CancelOrderButton({ orderId, onCancelled }) {
  const [confirming, setConfirming] = useState(false);
  const [loading,    setLoading]    = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const { default: axiosClient } = await import("../../api/axiosClient");
      await axiosClient.patch(`/orders/${orderId}/cancel/`);
      onCancelled();
    } catch (err) {
      alert(err?.response?.data?.error || "Could not cancel order. Please speak to staff.");
    } finally { setLoading(false); setConfirming(false); }
  };

  if (confirming) {
    return (
      <div style={{ padding:"var(--s4)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--r4)", marginBottom:"var(--s4)" }}>
        <p style={{ fontSize:".9375rem", fontWeight:600, color:"var(--err)", marginBottom:"var(--s3)" }}>
          Cancel this order? This cannot be undone.
        </p>
        <div style={{ display:"flex", gap:"var(--s2)" }}>
          <button onClick={handleCancel} disabled={loading}
            style={{ flex:1, padding:"10px", borderRadius:"var(--r3)", border:"none", background:"var(--err)", color:"#fff", fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:"var(--ff-b)", fontSize:".875rem" }}>
            {loading ? "Cancelling…" : "Yes, cancel order"}
          </button>
          <button onClick={() => setConfirming(false)}
            style={{ flex:1, padding:"10px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t1)", fontWeight:700, cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".875rem" }}>
            Keep order
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)}
      style={{ width:"100%", padding:"11px", borderRadius:"var(--r3)", border:"1px solid rgba(226,75,74,.3)", background:"transparent", color:"var(--err)", fontSize:".875rem", fontWeight:700, cursor:"pointer", fontFamily:"var(--ff-b)", marginBottom:"var(--s4)", transition:"all var(--d1) var(--ease)", display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)" }}
      onMouseEnter={e=>{e.currentTarget.style.background="var(--err-t)";}}
      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      Cancel order
    </button>
  );
}

/* ─── UPI Payment Waiting Page ───────────────────────────────────────── */
function UpiPaymentWaiting({ order, onPaid }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 600);
    return () => clearInterval(t);
  }, []);

  // Poll every 5 s for payment_status to become "paid"
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await getOrderDetail(order.id);
        if (res.data.order?.payment_status === "paid") { onPaid(res.data.order); }
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [order.id, onPaid]);

  return (
    <AppLayout>
      <div style={{ maxWidth:"480px", margin:"0 auto" }}>

        {/* Waiting header */}
        <div style={{ textAlign:"center", padding:"var(--s8) var(--s5) var(--s6)", background:"linear-gradient(180deg,rgba(55,138,221,.08) 0%,transparent 100%)", borderRadius:"var(--r5)", marginBottom:"var(--s5)", border:"1px solid rgba(55,138,221,.15)" }}>
          <div style={{ width:"68px", height:"68px", borderRadius:"50%", background:"rgba(55,138,221,.12)", border:"2px solid rgba(55,138,221,.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s4)" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--info)" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg>
          </div>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.75rem", fontWeight:900, letterSpacing:"-.025em", marginBottom:"var(--s2)" }}>
            Complete Payment
          </h1>
          <p style={{ fontSize:".9375rem", color:"var(--t2)", marginBottom:"var(--s3)" }}>
            Pay below and show your screenshot to staff
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"6px 14px", borderRadius:"var(--rf)", background:"rgba(55,138,221,.1)", border:"1px solid rgba(55,138,221,.2)" }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"var(--info)", animation:"pulse 1.5s infinite" }}/>
            <span style={{ fontSize:".8125rem", fontWeight:700, color:"var(--info)" }}>Waiting for staff confirmation{dots}</span>
          </div>
        </div>

        {/* Token number */}
        <div style={{ textAlign:"center", marginBottom:"var(--s5)" }}>
          <p style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s3)" }}>Your token</p>
          <div style={{ display:"inline-block", background:"linear-gradient(135deg,var(--brand),var(--brand-d))", borderRadius:"var(--r4)", padding:"var(--s4) var(--s10)", boxShadow:"var(--sh-br)" }}>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(2.5rem,10vw,4rem)", fontWeight:900, letterSpacing:".08em", lineHeight:1, color:"#fff" }}>
              {order.token_number}
            </div>
          </div>
          <p style={{ fontSize:".8125rem", color:"var(--t4)", marginTop:"var(--s2)" }}>
            Show this token + payment screenshot to staff
          </p>
        </div>

        {/* Amount callout */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s4) var(--s5)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", marginBottom:"var(--s4)" }}>
          <span style={{ fontSize:".875rem", color:"var(--t2)", fontWeight:600 }}>Amount to pay</span>
          <span className="price" style={{ fontSize:"1.75rem" }}>{formatPrice(order.total)}</span>
        </div>

        {/* UPI payment panel */}
        <UPIPaymentPanel order={order}/>

        {/* Instructions */}
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)", padding:"var(--s4)", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.2)", borderRadius:"var(--r4)", marginTop:"var(--s4)" }}>
          {[
            "Tap one of the UPI buttons above to open your payment app",
            "Pay ₹" + formatPrice(order.total).replace("₹","") + " to KNFC",
            "Show your payment screenshot to the staff at the counter",
            "Staff will mark your payment and confirm your order",
          ].map((step, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"var(--s3)" }}>
              <div style={{ width:"22px", height:"22px", borderRadius:"50%", background:"var(--ok)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".6875rem", fontWeight:900, flexShrink:0, marginTop:"1px" }}>{i+1}</div>
              <span style={{ fontSize:".875rem", color:"var(--t2)", lineHeight:1.5 }}>{step}</span>
            </div>
          ))}
        </div>

        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    </AppLayout>
  );
}

export function OrderConfirmPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const tokenRef   = useRef(null);
  const cardsRef   = useRef(null);
  const { loading: pageLoading } = usePageLoader(900);
  const [order,      setOrder]      = useState(null);
  const [loaded,     setLoaded]     = useState(false);
  const [siteConfig, setSiteConfig] = useState(null);

  useEffect(() => {
    import("../../api/axiosClient").then(({ default: ax }) =>
      ax.get("/branches/config/").then(r => setSiteConfig(r.data.config)).catch(() => {})
    );
  }, []);

  const copy = MICROCOPY[Math.floor(Math.random() * MICROCOPY.length)];

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getOrderDetail(id);
        const o = res.data.order;
        setOrder(o);
        localStorage.setItem("active_order", JSON.stringify(o));
      } catch {
        const stored = localStorage.getItem("active_order");
        if (stored) { try { setOrder(JSON.parse(stored)); } catch {} }
      } finally { setLoaded(true); }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!loaded || typeof gsap === "undefined") return;
    if (tokenRef.current) {
      gsap.fromTo(tokenRef.current, { scale:.4, opacity:0 }, { scale:1, opacity:1, duration:.75, ease:"back.out(2.5)", delay:.15 });
    }
    if (cardsRef.current) {
      gsap.fromTo(cardsRef.current.children, { y:22, opacity:0 }, { y:0, opacity:1, stagger:.1, duration:.45, ease:"power2.out", delay:.55 });
    }
  }, [loaded]);

  // When staff marks payment — navigate to track page
  const handlePaid = (updatedOrder) => {
    localStorage.setItem("active_order", JSON.stringify(updatedOrder));
    notify("Payment confirmed by staff!", "success");
    navigate(`/order/track/${id}`, { replace: true });
  };

  if (pageLoading || !order) return <KNCLoader visible label="Confirming order…"/>;

  // UPI + pending → show ONLY the payment waiting page
  if (order.payment_method === "upi" && order.payment_status === "pending") {
    return <UpiPaymentWaiting order={order} onPaid={handlePaid}/>;
  }

  const pointsEarned = Math.round(parseFloat(order.total || 0) * 0.1);

  return (
    <AppLayout>
      <div style={{ maxWidth:"540px", margin:"0 auto" }}>

        {/* Success banner */}
        <div style={{ textAlign:"center", padding:"var(--s8) var(--s5) var(--s6)", background:"linear-gradient(180deg,var(--ok-t) 0%,transparent 100%)", borderRadius:"var(--r5)", marginBottom:"var(--s6)", border:"1px solid rgba(29,158,117,.12)" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"var(--ok-t)", border:"2px solid rgba(29,158,117,.4)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s4)" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"2rem", fontWeight:900, letterSpacing:"-.025em", marginBottom:"var(--s2)" }}>Order placed!</h1>
          <p style={{ fontSize:".9375rem", color:"var(--t2)" }}>
            {order.order_type === "dine_in" ? `Dine-in · Table ${order.table_number}` : "Pickup"}
            {order.created_at ? ` · ${formatTime(order.created_at)}` : ""}
          </p>
        </div>

        {/* Token — spring animation */}
        <div ref={tokenRef} style={{ textAlign:"center", marginBottom:"var(--s6)" }}>
          <p style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s3)" }}>Your token number</p>
          <div style={{ display:"inline-block", background:"linear-gradient(135deg,var(--brand),var(--brand-d))", borderRadius:"var(--r5)", padding:"var(--s5) var(--s12)", boxShadow:"var(--sh-br), 0 0 0 1px rgba(232,82,26,.15), 0 0 60px rgba(232,82,26,.2)" }}>
            <p style={{ fontSize:".5625rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.65)", marginBottom:"6px" }}>Show at counter</p>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(3rem,10vw,5.5rem)", fontWeight:900, letterSpacing:".08em", lineHeight:1, color:"#fff" }}>
              {order.token_number}
            </div>
          </div>
          <p style={{ fontSize:".8125rem", color:"var(--t4)", marginTop:"var(--s3)" }}>Call your token at the collection counter</p>
        </div>

        <div ref={cardsRef} style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
          {/* Points earned */}
          {siteConfig?.loyalty_enabled !== false && (
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s4)", background:"linear-gradient(135deg,rgba(245,166,35,.1),rgba(232,82,26,.06))", border:"1px solid rgba(245,166,35,.22)", borderRadius:"var(--r4)", padding:"var(--s4)" }}>
            <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:"rgba(245,166,35,.15)", border:"1px solid rgba(245,166,35,.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
              <p style={{ fontSize:".9375rem", fontWeight:700, marginBottom:"2px" }}>+{pointsEarned} points earned</p>
              <p style={{ fontSize:".8125rem", color:"var(--t2)" }}>Redeem 500 pts for ₹50 off your next order</p>
            </div>
          </div>
          )}

          {/* Prep estimate */}
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", background:"var(--warn-t)", border:"1px solid rgba(239,159,39,.22)", borderRadius:"var(--r4)", padding:"var(--s3) var(--s4)" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--warn)" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>
            <div>
              <p style={{ fontSize:".875rem", fontWeight:700 }}>Estimated 10–15 min</p>
              <p style={{ fontSize:".8125rem", color:"var(--t2)" }}>You'll be notified when ready</p>
            </div>
          </div>

          {/* Microcopy */}
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s4)", textAlign:"center" }}>
            <p style={{ fontSize:".9375rem", color:"var(--t2)", fontStyle:"italic", lineHeight:1.65 }}>"{copy}"</p>
          </div>

          {/* Order summary */}
          <div className="card" style={{ padding:"var(--s5)" }}>
            <p style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s4)" }}>Order summary</p>
            {(order.items || []).map(item => (
              <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"var(--s2) 0", borderBottom:"1px solid var(--bd)" }}>
                <div>
                  <span style={{ fontSize:".9375rem", fontWeight:500 }}>{item.name_snapshot}</span>
                  {item.customisations?.length > 0 && (
                    <span style={{ fontSize:".75rem", color:"var(--t2)", display:"block" }}>{item.customisations.map(c=>c.name).join(", ")}</span>
                  )}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
                  <span style={{ color:"var(--t2)" }}>×{item.quantity}</span>
                  <span style={{ fontWeight:700 }}>{formatPrice(item.line_total)}</span>
                </div>
              </div>
            ))}
            {order.discount > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", padding:"var(--s2) 0", fontSize:".875rem" }}>
                <span style={{ color:"var(--t2)" }}>Discount</span>
                <span style={{ color:"var(--ok)", fontWeight:600 }}>−{formatPrice(order.discount)}</span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", paddingTop:"var(--s3)", borderTop:"1px solid var(--bd)", marginTop:"var(--s2)" }}>
              <span style={{ fontSize:".9375rem", fontWeight:700 }}>Total paid</span>
              <span className="price" style={{ fontSize:"1.5rem" }}>{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"var(--s2)" }}>
            <button onClick={() => navigate(`/order/track/${order.id}`)} className="btn btn-p btn-lg">
              Track live status →
            </button>
            <button onClick={() => navigate("/menu")} className="btn btn-s btn-lg">Menu</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ORDER TRACK PAGE
══════════════════════════════════════════════════════════════════════ */
export function OrderTrackPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { loading: pageLoading } = usePageLoader(700);
  const msgRef     = useRef(null);
  const stepRef    = useRef(null);
  const prevStatus = useRef(null);

  const [order,      setOrder]      = useState(null);
  const [loaded,     setLoaded]     = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratings,    setRatings]    = useState({}); // {menu_item_id: star}
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingDone,       setRatingDone]       = useState(false);

  const fetchOrder = async (silent = false) => {
    try {
      const res = await getOrderDetail(id);
      const o   = res.data.order;
      if (prevStatus.current && prevStatus.current !== o.status) {
        if (msgRef.current && typeof gsap !== "undefined") {
          gsap.fromTo(msgRef.current, { x:-12, opacity:.4 }, { x:0, opacity:1, duration:.45, ease:"power3.out" });
        }
        // Notify customer of status changes
        if (o.status === "confirmed")  notify("Your order has been confirmed!", "success");
        if (o.status === "preparing")  notify("Kitchen is preparing your order…", "info");
        if (o.status === "ready")      notify("Your order is READY for pickup!", "order");
        if (o.status === "completed")  notify("Order completed. Enjoy your meal!", "success");
        if (o.status === "cancelled")  notify("Your order was cancelled.", "warning");

        if (o.status === "ready" && !celebrated) {
          setCelebrated(true);
          if (stepRef.current && typeof gsap !== "undefined") {
            gsap.fromTo(stepRef.current, { scale:.97 }, { scale:1, duration:.4, ease:"back.out(2)" });
          }
        }
        if (o.status === "completed" && prevStatus.current !== "completed") {
          setTimeout(() => setShowRating(true), 1200);
        }
      }
      prevStatus.current = o.status;
      setOrder(o);
      if (["completed","cancelled"].includes(o.status)) localStorage.removeItem("active_order");
      else localStorage.setItem("active_order", JSON.stringify(o));
    } catch {
      const stored = localStorage.getItem("active_order");
      if (stored) { try { setOrder(JSON.parse(stored)); } catch {} }
    } finally { setLoaded(true); }
  };

  useEffect(() => {
    const stored = localStorage.getItem("active_order");
    if (stored) {
      try {
        const o = JSON.parse(stored);
        if (o.id === id) { setOrder(o); setLoaded(true); prevStatus.current = o.status; }
      } catch {}
    }
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!order || ["completed","cancelled"].includes(order.status)) return;
    const t = setInterval(() => fetchOrder(true), 10000);
    return () => clearInterval(t);
  }, [id, order?.status]);

  const handleSubmitRatings = async () => {
    const entries = Object.entries(ratings).filter(([,r]) => r > 0);
    if (!entries.length) { setShowRating(false); return; }
    setSubmittingRating(true);
    try {
      await Promise.all(entries.map(([menu_item_id, rating]) => {
        return submitReview(menu_item_id, rating, '', null, order.id).catch(() => {});
      }));
      setRatingDone(true);
      setTimeout(() => setShowRating(false), 1500);
    } finally { setSubmittingRating(false); }
  };

  if (pageLoading || !order) return <KNCLoader visible label="Loading order status…"/>;

  const stepIdx  = STEPS.findIndex(s => s.key === order.status);
  const msg      = STATUS_MSG[order.status] || STATUS_MSG.placed;
  const isReady  = order.status === "ready";
  const isDone   = order.status === "completed";
  const isWaiting= ["placed","confirmed","preparing"].includes(order.status);
  const canCancel= order.status === "placed"; // customer can only cancel while 'placed'

  return (
    <AppLayout>
      <div style={{ maxWidth:"600px", margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s5)" }}>
          <button onClick={() => navigate("/menu")} className="btn btn-g btn-sm">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round"/></svg>
            Menu
          </button>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800 }}>Order status</h1>
          {!isDone && (
            <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
              <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"var(--ok)", animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:".75rem", fontWeight:700, color:"var(--ok)" }}>Live</span>
            </div>
          )}
        </div>

        {/* Token + branch card */}
        <div className="card" style={{ padding:"var(--s5)", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s4)" }}>
          <div style={{ background:"linear-gradient(135deg,var(--brand),var(--brand-d))", borderRadius:"var(--r4)", padding:"var(--s3) var(--s5)", textAlign:"center", boxShadow:"var(--sh-br)" }}>
            <p style={{ fontSize:".5625rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.7)", marginBottom:"4px" }}>Token</p>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"2.75rem", fontWeight:900, color:"#fff", letterSpacing:".06em", lineHeight:1 }}>{order.token_number}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:".9375rem", fontWeight:700, marginBottom:"3px" }}>{order.branch_name || "KNFC"}</p>
            <p style={{ fontSize:".8125rem", color:"var(--t2)", marginBottom:"2px" }}>
              {order.order_type === "dine_in" ? `Dine-in · Table ${order.table_number}` : "Pickup"}
            </p>
            {order.created_at && <p style={{ fontSize:".75rem", color:"var(--t4)" }}>{formatTime(order.created_at)}</p>}
          </div>
        </div>

        {/* Progress stepper */}
        <div ref={stepRef} className="card" style={{ padding:"var(--s5)", marginBottom:"var(--s4)" }}>
          {/* Track bar */}
          <div style={{ position:"relative", marginBottom:"var(--s5)" }}>
            <div style={{ position:"absolute", top:"16px", left:"16px", right:"16px", height:"3px", background:"var(--bg3)", borderRadius:"2px" }}>
              <div style={{ height:"100%", width:`${stepIdx > 0 ? Math.min((stepIdx / (STEPS.length - 1)) * 100, 100) : 0}%`, background:`linear-gradient(90deg,var(--ok),var(--brand))`, borderRadius:"2px", transition:"width .6s var(--ease)" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", position:"relative" }}>
              {STEPS.map((step, i) => {
                const done   = i < stepIdx;
                const active = i === stepIdx;
                return (
                  <div key={step.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
                    <div style={{ width:"34px", height:"34px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:done?"14px":"16px", background:done?"var(--ok)":active?`linear-gradient(135deg,var(--brand),var(--brand-d))`:"var(--bg3)", border:`2px solid ${done?"var(--ok)":active?"var(--brand)":"var(--bd)"}`, color:(done||active)?"#fff":"var(--t4)", boxShadow:active?"0 0 0 4px var(--brand-tint)":done?"0 0 0 3px rgba(29,158,117,.15)":"none", transition:"all .4s var(--ease)", zIndex:1 }}>
                      {done ? "✓" : step.icon}
                    </div>
                    <span style={{ fontSize:".5625rem", fontWeight:done||active?800:400, color:done?"var(--ok)":active?"var(--t1)":"var(--t4)", whiteSpace:"nowrap", letterSpacing:".02em" }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status message */}
        <div ref={msgRef} style={{ display:"flex", alignItems:"center", gap:"var(--s4)", background:isReady?"linear-gradient(135deg,var(--brand-tint),rgba(232,82,26,.04))":isWaiting?"var(--warn-t)":isDone?"var(--ok-t)":"var(--bg2)", border:`1px solid ${isReady?"var(--bdb)":isWaiting?"rgba(239,159,39,.25)":isDone?"rgba(29,158,117,.25)":"var(--bd)"}`, borderRadius:"var(--r4)", padding:"var(--s5)", marginBottom:"var(--s4)" }}>
          <span style={{ display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{msg.icon}</span>
          <div>
            <p style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, marginBottom:"4px" }}>{msg.title}</p>
            <p style={{ fontSize:".9375rem", color:"var(--t2)", lineHeight:1.5 }}>{msg.sub}</p>
          </div>
        </div>

        {/* READY celebration */}
        {isReady && (
          <div style={{ position:"relative", overflow:"hidden", background:"linear-gradient(135deg,rgba(29,158,117,.12),rgba(29,158,117,.04))", border:"1px solid rgba(29,158,117,.35)", borderRadius:"var(--r4)", padding:"var(--s6)", textAlign:"center", marginBottom:"var(--s4)", animation:"popIn .5s var(--ease-s) both" }}>
            {/* CSS confetti dots */}
            {[...Array(12)].map((_,i) => (
              <div key={i} style={{ position:"absolute", width:"8px", height:"8px", borderRadius:"2px", background:["var(--brand)","var(--gold)","var(--ok)","var(--info)"][i%4], left:`${8+i*7}%`, top:"-10px", animation:`confettiFall ${1+i*0.12}s ${i*0.08}s ease-in forwards`, transformOrigin:"center", pointerEvents:"none" }}/>
            ))}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"var(--s3)", animation:"bounce .6s var(--ease-s) 0.3s both" }}><svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>
            <p style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, color:"var(--ok)", marginBottom:"var(--s2)" }}>Ready to collect!</p>
            <p style={{ fontSize:"1rem", color:"var(--t2)" }}>
              Show token <strong style={{ fontFamily:"var(--ff-d)", color:"var(--brand)", fontSize:"1.25rem" }}>{order.token_number}</strong> at the counter
            </p>
          </div>
        )}

        {/* Offer while waiting */}
        {isWaiting && (
          <div onClick={() => navigate("/offers")}
            style={{ display:"flex", alignItems:"center", gap:"var(--s3)", background:"linear-gradient(135deg,rgba(245,166,35,.08),rgba(232,82,26,.04))", border:"1px solid rgba(245,166,35,.2)", borderRadius:"var(--r4)", padding:"var(--s4)", cursor:"pointer", marginBottom:"var(--s4)", transition:"border-color var(--d1) var(--ease)" }}
            onMouseEnter={e => e.currentTarget.style.borderColor="rgba(245,166,35,.4)"}
            onMouseLeave={e => e.currentTarget.style.borderColor="rgba(245,166,35,.2)"}>
            <div style={{ width:"40px", height:"40px", borderRadius:"var(--r3)", background:"rgba(245,166,35,.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="var(--warn)"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg></div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:".9375rem", fontWeight:700, marginBottom:"2px" }}>Check today's deals while you wait</p>
              <p style={{ fontSize:".8125rem", color:"var(--t2)" }}>New offers available →</p>
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="card" style={{ padding:"var(--s5)", marginBottom:isDone?"var(--s4)":"0" }}>
          <p style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s4)" }}>Your order</p>
          {(order.items || []).map(item => (
            <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"var(--s2) 0", borderBottom:"1px solid var(--bd)", fontSize:".875rem" }}>
              <div>
                <span>{item.name_snapshot}</span>
                {item.special_instructions && <span style={{ fontSize:".75rem", color:"var(--t4)", display:"block", fontStyle:"italic" }}>{item.special_instructions}</span>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
                <span style={{ color:"var(--t4)" }}>×{item.quantity}</span>
                <span style={{ fontWeight:700 }}>{formatPrice(item.line_total)}</span>
              </div>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", paddingTop:"var(--s3)", borderTop:"1px solid var(--bd)", marginTop:"var(--s2)" }}>
            <span style={{ fontWeight:700 }}>Total</span>
            <span className="price" style={{ fontSize:"1.375rem" }}>{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* UPI payment panel — shown when customer chose UPI and payment is still pending */}
        {/* 30-minute pickup reminder */}
        {order.order_type === "pickup" && !isDone && (
          <div style={{ display:"flex", alignItems:"flex-start", gap:"var(--s2)", padding:"var(--s3) var(--s4)", background:"rgba(239,159,39,.08)", border:"1px solid rgba(239,159,39,.25)", borderRadius:"var(--r3)", marginBottom:"var(--s3)", fontSize:".8125rem", color:"var(--warn)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--warn)" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>
            <span><strong>Please pick up within 30 minutes</strong> of placing your order. Your food will be freshest within this window — and our staff will be waiting!</span>
          </div>
        )}

        {order.payment_method === "upi" && order.payment_status === "pending" && !isDone && (
          <UPIPaymentPanel order={order}/>
        )}
        {order.payment_method === "upi" && order.payment_status === "paid" && (
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"var(--s3) var(--s4)", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.25)", borderRadius:"var(--r4)", marginBottom:"var(--s4)", fontSize:".875rem", fontWeight:700, color:"var(--ok)" }}>
            UPI payment received — you're all set!
          </div>
        )}

        {/* Cancel order — only available while order is 'placed' */}
        {canCancel && (
          <CancelOrderButton orderId={order.id} onCancelled={() => fetchOrder()} />
        )}

        {/* Bill print — shown when order is completed */}
        {isDone && (
          <button
            onClick={() => printBill(order)}
            style={{ width:"100%", padding:"12px", borderRadius:"var(--r3)", border:"1px solid rgba(29,158,117,.3)", background:"var(--ok-t)", color:"var(--ok)", fontWeight:700, fontSize:".9375rem", cursor:"pointer", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", marginBottom:"var(--s3)", transition:"all var(--d1) var(--ease)" }}
            onMouseEnter={e=>{e.currentTarget.style.background="var(--ok)";e.currentTarget.style.color="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.background="var(--ok-t)";e.currentTarget.style.color="var(--ok)";}}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print / Download Receipt
          </button>
        )}

        {isDone && (
          <GoogleReviewBanner style={{ marginBottom:"var(--s3)" }}/>
        )}

        {isDone && (
          <div style={{ display:"flex", gap:"var(--s2)", marginTop:"var(--s4)" }}>
            {!ratingDone && (
              <button onClick={() => setShowRating(true)}
                style={{ flex:1, padding:"13px", borderRadius:"var(--r4)", border:"1.5px solid var(--gold)", background:"rgba(245,166,35,.08)", cursor:"pointer", fontFamily:"var(--ff-b)", fontSize:".9375rem", fontWeight:700, color:"var(--gold-d)", display:"flex", alignItems:"center", justifyContent:"center", gap:"var(--s2)", transition:"all var(--d1) var(--ease)" }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,166,35,.15)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(245,166,35,.08)";}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Rate your order
              </button>
            )}
            <button onClick={() => navigate("/menu")} className="btn btn-p btn-xl" style={{ flex:1 }}>
              Order again →
            </button>
          </div>
        )}
      </div>

      {/* ── RATING MODAL ─────────────────────────────────────────────── */}
      {showRating && (
        <div onClick={() => !submittingRating && setShowRating(false)}
          style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,.65)", backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"var(--s4)" }}>
          <div onClick={e=>e.stopPropagation()}
            style={{ width:"100%", maxWidth:"480px", background:"var(--bgc)", borderRadius:"var(--r5) var(--r5) var(--r3) var(--r3)", padding:"var(--s6)", boxShadow:"var(--sh-xl)", marginBottom:"env(safe-area-inset-bottom,0)" }}>

            {ratingDone ? (
              <div style={{ textAlign:"center", padding:"var(--s6) 0" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"var(--s3)" }}><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, marginBottom:"var(--s2)" }}>Thank you!</div>
                <p style={{ color:"var(--t2)", fontSize:".9375rem" }}>Your reviews help us improve.</p>
              </div>
            ) : (
              <>
                <div style={{ textAlign:"center", marginBottom:"var(--s5)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"var(--s2)" }}><svg width="28" height="28" viewBox="0 0 24 24" fill="var(--gold)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                  <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:900, marginBottom:"4px" }}>How was your order?</div>
                  <p style={{ fontSize:".875rem", color:"var(--t2)" }}>Rate each item — it takes 10 seconds</p>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:"var(--s4)", marginBottom:"var(--s5)", maxHeight:"50vh", overflowY:"auto" }}>
                  {(order.items || []).map(item => (
                    <div key={item.id} style={{ display:"flex", alignItems:"center", gap:"var(--s3)", padding:"var(--s3)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px solid var(--bd)" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:".9375rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name_snapshot}</div>
                        <div style={{ fontSize:".75rem", color:"var(--t2)" }}>×{item.quantity}</div>
                      </div>
                      <div style={{ display:"flex", gap:"3px", flexShrink:0 }}>
                        {[1,2,3,4,5].map(n => (
                          <button key={n} type="button"
                            onClick={() => setRatings(r => ({...r, [item.menu_item]: n}))}
                            style={{ background:"none", border:"none", cursor:"pointer", padding:"2px", fontSize:"1.375rem", lineHeight:1, transition:"transform var(--d1) var(--ease)", transform:n <= (ratings[item.menu_item]||0) ? "scale(1.15)" : "scale(1)", color:n <= (ratings[item.menu_item]||0) ? "var(--gold)" : "var(--bg3)" }}>
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", gap:"var(--s2)" }}>
                  <button onClick={handleSubmitRatings} disabled={submittingRating}
                    className="btn btn-p btn-lg" style={{ flex:1, opacity:submittingRating?.6:1 }}>
                    {submittingRating ? "Submitting…" : "Submit ratings"}
                  </button>
                  <button onClick={() => setShowRating(false)} className="btn btn-g btn-lg">
                    Skip
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes popIn{from{opacity:0;transform:scale(.88) translateY(16px)}to{opacity:1;transform:none}} @keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(180px) rotate(360deg);opacity:0}} @keyframes bounce{0%,100%{transform:scale(1)}40%{transform:scale(1.3)}70%{transform:scale(.9)}}`}</style>
    </AppLayout>
  );
}

export default OrderConfirmPage;
