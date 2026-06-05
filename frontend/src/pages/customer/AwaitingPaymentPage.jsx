/**
 * AwaitingPaymentPage.jsx
 * Shown after a UPI order is placed. Polls for staff payment confirmation.
 * 5-minute countdown → auto-cancel if not paid.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import axiosClient from "../../api/axiosClient";
import { formatPrice } from "../../utils/format";

const TIMEOUT_SECONDS = 300;

const CANCEL_LABELS = {
  customer_request: "Cancelled at your request",
  out_of_stock:     "Item(s) became unavailable",
  long_wait:        "Wait time too long",
  duplicate_order:  "Duplicate or accidental order",
  payment_failed:   "Payment not received",
  payment_timeout:  "Payment window expired (5 minutes)",
  timeout:          "No staff confirmation within 30 minutes",
};

/* ── Inject CSS once ────────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("awp-css")) {
  const s = document.createElement("style");
  s.id = "awp-css";
  s.textContent = `
    @keyframes awp-ring-spin   { to { stroke-dashoffset: var(--awp-offset); } }
    @keyframes awp-pulse-ring  {
      0%,100% { transform:scale(1);   opacity:.35; }
      50%     { transform:scale(1.06);opacity:.6;  }
    }
    @keyframes awp-pulse-ring2 {
      0%,100% { transform:scale(1);   opacity:.18; }
      50%     { transform:scale(1.12);opacity:.38; }
    }
    @keyframes awp-digit-pop {
      0%   { transform:translateY(-6px) scale(.92); opacity:0; }
      60%  { transform:translateY(2px)  scale(1.04); opacity:1; }
      100% { transform:translateY(0)   scale(1);   opacity:1; }
    }
    @keyframes awp-shake {
      0%,100% { transform:translateX(0); }
      20%     { transform:translateX(-5px); }
      40%     { transform:translateX(5px); }
      60%     { transform:translateX(-3px); }
      80%     { transform:translateX(3px); }
    }
    @keyframes awp-dot-blink {
      0%,100% { opacity:1; }
      50%     { opacity:.25; }
    }
    @keyframes awp-btn-press {
      0%   { transform:scale(1); }
      50%  { transform:scale(.96); }
      100% { transform:scale(1); }
    }
    @keyframes awp-appear {
      from { opacity:0; transform:translateY(12px); }
      to   { opacity:1; transform:none; }
    }
    .awp-pay-btn:active { animation: awp-btn-press .15s ease both; }
    .awp-appear { animation: awp-appear .4s ease both; }
  `;
  document.head.appendChild(s);
}

/* ── Logos ──────────────────────────────────────────────────────────── */
const GoogleGLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);
const PhonePeLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="12" fill="#5f259f"/>
    <path d="M13 13h15a9 9 0 010 18H19v8h-6V13zm6 12h9a3 3 0 000-6h-9v6z" fill="#fff"/>
  </svg>
);

/* ── Animated countdown ─────────────────────────────────────────────── */
function AnimatedCountdown({ secsLeft, total }) {
  const R     = 70;
  const SW    = 8;         // stroke width
  const circ  = 2 * Math.PI * R;
  const pct   = secsLeft / total;
  const dash  = circ * pct;
  const isUrgent  = secsLeft <= 60;
  const isCritical = secsLeft <= 20;

  const color = isCritical ? "#ef4444"
              : isUrgent   ? "#f59e0b"
              :               "#5f259f";

  const mins = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const secs = String(secsLeft % 60).padStart(2, "0");

  const SIZE = 180;
  const cx   = SIZE / 2;

  return (
    <div style={{ position:"relative", width:SIZE, height:SIZE, flexShrink:0 }}>
      {/* Outer pulse rings */}
      <div style={{
        position:"absolute",
        inset: -20,
        borderRadius:"50%",
        border:`2px solid ${color}`,
        animation:"awp-pulse-ring 2s ease-in-out infinite",
        pointerEvents:"none",
        transition:"border-color .6s",
      }}/>
      <div style={{
        position:"absolute",
        inset: -36,
        borderRadius:"50%",
        border:`1.5px solid ${color}`,
        animation:"awp-pulse-ring2 2s ease-in-out .5s infinite",
        pointerEvents:"none",
        transition:"border-color .6s",
      }}/>

      {/* SVG rings */}
      <svg width={SIZE} height={SIZE} style={{ transform:"rotate(-90deg)" }}>
        {/* Background track */}
        <circle cx={cx} cy={cx} r={R}
          fill="none"
          stroke="rgba(255,255,255,.08)"
          strokeWidth={SW + 2}
        />
        {/* Second thin outer track */}
        <circle cx={cx} cy={cx} r={R + 14}
          fill="none"
          stroke="rgba(255,255,255,.04)"
          strokeWidth={3}
          strokeDasharray={`${circ * 1.2 * pct * .6} ${circ * 1.2}`}
          strokeLinecap="round"
          style={{ transition:"stroke-dasharray .9s linear" }}
        />
        {/* Main progress arc */}
        <circle cx={cx} cy={cx} r={R}
          fill="none"
          stroke={color}
          strokeWidth={SW}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition:"stroke-dasharray .9s linear, stroke .6s" }}
        />
      </svg>

      {/* Center text — monospace to prevent font-rendering artifacts */}
      <div style={{
        position:"absolute", inset:0,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        animation: isCritical ? "awp-shake .4s ease-in-out infinite" : "none",
      }}>
        <div style={{
          fontFamily:'"Courier New", "Lucida Console", monospace',
          fontSize:"2.6rem",
          fontWeight:700,
          lineHeight:1,
          color,
          letterSpacing:".04em",
          fontVariantNumeric:"tabular-nums",
          transition:"color .6s",
          display:"flex",
          alignItems:"center",
          gap:0,
          userSelect:"none",
        }}>
          <span>{mins}</span>
          <span style={{
            animation:"awp-dot-blink 1s ease-in-out infinite",
            display:"inline-block", margin:"0 1px", marginBottom:3,
          }}>:</span>
          <span>{secs}</span>
        </div>
        <div style={{
          fontSize:".5625rem", fontWeight:800,
          letterSpacing:".12em", textTransform:"uppercase",
          color: isCritical ? "rgba(239,68,68,.7)" : isUrgent ? "rgba(245,158,11,.7)" : "rgba(95,37,159,.6)",
          marginTop:4, transition:"color .6s",
        }}>
          {isCritical ? "HURRY NOW!" : isUrgent ? "< 1 MINUTE" : "REMAINING"}
        </div>
      </div>
    </div>
  );
}

/* ══ Main page ══════════════════════════════════════════════════════════ */
export default function AwaitingPaymentPage() {
  const { orderId } = useParams();
  const navigate    = useNavigate();

  const [order,        setOrder]        = useState(null);
  const [branchData,   setBranchData]   = useState(null);
  const [secsLeft,     setSecsLeft]     = useState(TIMEOUT_SECONDS);
  const [state,        setState]        = useState("waiting");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote,   setCancelNote]   = useState("");
  const [showQr,       setShowQr]       = useState(false);
  const [qrBlobUrl,    setQrBlobUrl]    = useState(null);
  const [loadingQr,    setLoadingQr]    = useState(false);
  const [cancelling,   setCancelling]   = useState(false);
  const [clickedApp,   setClickedApp]   = useState(null);

  const pollRef     = useRef(null);
  const timerRef    = useRef(null);
  const resolvedRef = useRef(false);

  /* Load order */
  useEffect(() => {
    axiosClient.get(`/orders/${orderId}/`)
      .then(r => {
        const o = r.data.order;
        setOrder(o);
        if (o.payment_status === "paid") {
          resolvedRef.current = true;
          setState("paid");
          setTimeout(() => navigate(`/order/confirm/${orderId}`), 1500);
        }
        // branch_id is not in OrderDetailSerializer — use localStorage (always set when order is placed)
        const bid = localStorage.getItem("branch_id");
        if (bid) {
          axiosClient.get(`/branches/${bid}/payment-info/`)
            .then(b => setBranchData(b.data || {}))
            .catch(() => {});
        }
      })
      .catch(() => setState("error"));
  }, [orderId]);

  /* Poll every 5s */
  useEffect(() => {
    if (state !== "waiting") return;
    pollRef.current = setInterval(async () => {
      if (resolvedRef.current) return;
      try {
        const r = await axiosClient.get(`/orders/${orderId}/`);
        const o = r.data.order;
        if (o.payment_status === "paid") {
          resolvedRef.current = true;
          setState("paid");
          setTimeout(() => navigate(`/order/confirm/${orderId}`), 1500);
        }
        if (o.status === "cancelled") {
          resolvedRef.current = true;
          setCancelReason(o.cancel_reason || "");
          setCancelNote(o.cancel_note || "");
          setState("cancelled");
        }
      } catch {}
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [orderId, state, navigate]);

  /* handleTimeout — defined BEFORE the effects that reference it to avoid TDZ */
  const handleTimeout = useCallback(async (isManual = false) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setCancelling(true);
    const reason = isManual ? "customer_request" : "payment_timeout";
    const note   = isManual ? "Customer cancelled from payment page." : "Payment not received within 5 minutes.";
    try { await axiosClient.patch(`/orders/${orderId}/cancel/`, { reason, note }); } catch {}
    setCancelling(false);
    setCancelReason(reason);
    setCancelNote(note);
    setState("cancelled");
  }, [orderId]);

  /* Countdown — pure tick only, NO side-effects inside updater */
  useEffect(() => {
    if (state !== "waiting") return;
    timerRef.current = setInterval(() => {
      setSecsLeft(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [state]);

  /* Timeout trigger — separate effect watches secsLeft hitting 0 */
  useEffect(() => {
    if (state !== "waiting") return;
    if (secsLeft === 0 && !resolvedRef.current) {
      clearInterval(timerRef.current);
      handleTimeout();
    }
  }, [secsLeft, state, handleTimeout]);

  /* QR blob */
  useEffect(() => {
    if (!showQr || !order) return;
    const bid = localStorage.getItem("branch_id");
    if (!bid) return;
    setLoadingQr(true);
    let objectUrl = null;
    const amt = parseFloat(order.total || 0).toFixed(2);
    axiosClient.get(`/branches/${bid}/payment-info/?am=${amt}`)
      .then(r => {
        const url = r.data?.payment_qr_url;
        if (!url) return;
        return fetch(`${url}&tn=KNFC+Order`, { headers:{ Authorization:`Bearer ${localStorage.getItem("access_token")}` } });
      })
      .then(r => r && r.ok ? r.blob() : null)
      .then(blob => { if (blob) { objectUrl = URL.createObjectURL(blob); setQrBlobUrl(objectUrl); } })
      .catch(() => {})
      .finally(() => setLoadingQr(false));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [showQr, order]);

  /* UPI deep links */
  const links = () => {
    if (!order) return {};
    const amt   = parseFloat(order.total || 0).toFixed(2);
    const bName = encodeURIComponent(branchData?.branch_name || "KNFC Fried Chicken");
    const note  = encodeURIComponent("KNFC Order");
    const gId  = branchData?.gpay_upi_id    || branchData?.upi_id || "";
    const pId  = branchData?.phonepe_upi_id || branchData?.upi_id || "";
    return {
      gpay:    gId ? `tez://upi/pay?pa=${encodeURIComponent(gId)}&pn=${bName}&am=${amt}&cu=INR&tn=${note}` : null,
      phonepe: pId ? `phonepe://pay?pa=${encodeURIComponent(pId)}&pn=${bName}&am=${amt}&cu=INR&tn=${note}` : null,
    };
  };

  /* ── States: Paid ─────────────────────────────────────────────── */
  if (state === "paid") return (
    <AppLayout>
      <div style={{ textAlign:"center", padding:"var(--s16) var(--s4)", maxWidth:380, margin:"0 auto" }}>
        <div style={{ width:88, height:88, borderRadius:"50%", background:"rgba(29,158,117,.12)", border:"3px solid var(--ok)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s5)" }}>
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
        </div>
        <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.875rem", fontWeight:900, color:"var(--ok)", marginBottom:"var(--s3)" }}>Payment confirmed!</h1>
        <p style={{ color:"var(--t2)", fontSize:".9375rem" }}>Redirecting to your order…</p>
      </div>
    </AppLayout>
  );

  /* ── States: Cancelled ────────────────────────────────────────── */
  if (state === "cancelled") {
    const label = CANCEL_LABELS[cancelReason] || cancelReason || "This order was cancelled";
    const byStaff = cancelReason && !["payment_timeout","timeout","customer_request"].includes(cancelReason);
    return (
      <AppLayout>
        <div style={{ textAlign:"center", padding:"var(--s12) var(--s4)", maxWidth:440, margin:"0 auto" }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:"var(--err-t)", border:"2px solid var(--err)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s5)" }}>
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.75rem", fontWeight:900, color:"var(--err)", marginBottom:"var(--s3)" }}>Order cancelled</h1>
          <div style={{ background:"var(--err-t)", border:"1.5px solid rgba(226,75,74,.3)", borderRadius:"var(--r4)", padding:"var(--s4) var(--s5)", marginBottom:"var(--s5)", textAlign:"left" }}>
            <div style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--err)", marginBottom:"var(--s2)" }}>Reason</div>
            <div style={{ fontWeight:700, fontSize:"1rem", color:"var(--t1)", marginBottom:cancelNote?"var(--s2)":0 }}>{label}</div>
            {cancelNote && (
              <div style={{ fontSize:".875rem", color:"var(--t2)", lineHeight:1.55, borderTop:"1px solid rgba(226,75,74,.2)", paddingTop:"var(--s2)", marginTop:"var(--s2)" }}>
                {cancelNote}
              </div>
            )}
          </div>
          <p style={{ color:"var(--t2)", fontSize:".9375rem", lineHeight:1.6, marginBottom:"var(--s6)" }}>
            {byStaff
              ? "A staff member cancelled your order. Please visit the counter or contact support."
              : "Please place a new order and complete payment promptly."}
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
            <button onClick={() => navigate("/menu")} className="btn btn-p btn-lg btn-full">Back to menu →</button>
            <button onClick={() => navigate("/contact")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--brand)", fontWeight:600, fontSize:".875rem", fontFamily:"var(--ff-b)", textDecoration:"underline" }}>Contact support</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ── States: Error ────────────────────────────────────────────── */
  if (state === "error") return (
    <AppLayout>
      <div style={{ textAlign:"center", padding:"var(--s16) var(--s4)" }}>
        <p style={{ color:"var(--err)" }}>Could not load order. Check your orders in the Account page.</p>
        <button onClick={() => navigate("/account")} className="btn btn-g btn-lg" style={{ marginTop:"var(--s4)" }}>Go to Account</button>
      </div>
    </AppLayout>
  );

  /* ── Waiting state ────────────────────────────────────────────── */
  const { gpay, phonepe } = links();
  const amt   = order ? formatPrice(order.total || 0) : "…";
  const token = order?.token_number;
  const isUrgent   = secsLeft <= 60;
  const isCritical = secsLeft <= 20;
  const accentColor = isCritical ? "#ef4444" : isUrgent ? "#f59e0b" : "#5f259f";

  return (
    <AppLayout>
      {/* Inject page-specific bg glow on the payment page */}
      <style>{`
        .awp-countdown-wrap {
          background: radial-gradient(ellipse at 50% 40%, rgba(95,37,159,.12) 0%, transparent 70%);
          transition: background 1s;
        }
        .awp-countdown-wrap.urgent  { background: radial-gradient(ellipse at 50% 40%, rgba(245,158,11,.12) 0%, transparent 70%); }
        .awp-countdown-wrap.critical{ background: radial-gradient(ellipse at 50% 40%, rgba(239,68,68,.14) 0%, transparent 70%); }
      `}</style>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"var(--s2) var(--s4) var(--s12)" }}>

        {/* ── Title ── */}
        <div className="awp-appear" style={{ textAlign:"center", marginBottom:"var(--s7)" }}>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.3rem,4vw,1.75rem)", fontWeight:900, letterSpacing:"-.02em", marginBottom:"var(--s2)" }}>
            Complete your payment
          </h1>
          <p style={{ color:"var(--t2)", fontSize:".875rem", lineHeight:1.6 }}>
            Pay via GPay or PhonePe — staff will confirm once received.
          </p>
        </div>

        {/* ── Order chip ── */}
        {order && (
          <div className="awp-appear" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", background:"var(--bg2)", border:"1.5px solid var(--bd)", borderRadius:"var(--r5)", marginBottom:"var(--s7)" }}>
            <div>
              <div style={{ fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"var(--t4)", marginBottom:2 }}>Total to pay</div>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:"2rem", fontWeight:900, color:"var(--brand)", lineHeight:1 }}>{amt}</div>
            </div>
            {token && (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"var(--t4)", marginBottom:2 }}>Token</div>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"2rem", fontWeight:900, color:"var(--t1)", lineHeight:1 }}>#{token}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Countdown ── */}
        <div
          className={`awp-countdown-wrap${isCritical?" critical":isUrgent?" urgent":""}`}
          style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"var(--s8) var(--s4)", borderRadius:"var(--r5)", border:`1.5px solid ${accentColor}28`, marginBottom:"var(--s7)", position:"relative", overflow:"hidden", transition:"border-color .6s" }}>

          {/* Status label above ring */}
          <div style={{ fontSize:".75rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color: accentColor, marginBottom:"var(--s6)", transition:"color .6s", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:accentColor, display:"inline-block", animation:"awp-dot-blink 1.2s ease-in-out infinite", flexShrink:0, transition:"background .6s" }}/>
            {isCritical ? "Almost out of time!" : isUrgent ? "Less than 1 minute left" : "Waiting for payment"}
          </div>

          <AnimatedCountdown secsLeft={secsLeft} total={TIMEOUT_SECONDS}/>

          <p style={{ marginTop:"var(--s6)", fontSize:".8125rem", color:"var(--t3)", textAlign:"center", lineHeight:1.55 }}>
            {isCritical
              ? "Pay right now or your order will be cancelled."
              : "Order auto-cancels if payment is not received within 5 minutes."}
          </p>

          {/* Polling dot */}
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:"var(--s3)" }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:"var(--ok)", animation:"pulse 1.5s ease-in-out infinite" }}/>
            <span style={{ fontSize:".625rem", color:"var(--t4)", fontWeight:600, letterSpacing:".04em" }}>
              CHECKING EVERY 5 SECONDS
            </span>
          </div>
        </div>

        {/* ── Payment buttons ── */}
        <div style={{ marginBottom:"var(--s5)" }}>
          <p style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".12em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s3)", textAlign:"center" }}>
            Pay now with
          </p>

          <div style={{ display:"flex", gap:"var(--s3)", flexWrap:"wrap" }}>
            {gpay ? (
              <a href={gpay} className="awp-pay-btn"
                onClick={() => setClickedApp("gpay")}
                style={{
                  flex:"1 1 140px", display:"flex", alignItems:"center", justifyContent:"center",
                  gap:10, padding:"18px 0", borderRadius:"var(--r4)",
                  background: clickedApp==="gpay" ? "#e8f0fe" : "var(--bgc)",
                  border: `2.5px solid ${clickedApp==="gpay" ? "#1a73e8" : "#ddd"}`,
                  color:"#1a73e8", fontWeight:800, fontSize:"1.0625rem",
                  textDecoration:"none", fontFamily:"var(--ff-b)",
                  boxShadow: clickedApp==="gpay" ? "0 6px 20px rgba(26,115,232,.2)" : "0 2px 8px rgba(0,0,0,.06)",
                  transition:"all .2s",
                }}>
                <GoogleGLogo size={24}/> GPay
              </a>
            ) : null}

            {phonepe ? (
              <a href={phonepe} className="awp-pay-btn"
                onClick={() => setClickedApp("phonepe")}
                style={{
                  flex:"1 1 140px", display:"flex", alignItems:"center", justifyContent:"center",
                  gap:10, padding:"18px 0", borderRadius:"var(--r4)",
                  background: clickedApp==="phonepe" ? "#f3e8ff" : "var(--bgc)",
                  border: `2.5px solid ${clickedApp==="phonepe" ? "#5f259f" : "#ddd"}`,
                  color:"#5f259f", fontWeight:800, fontSize:"1.0625rem",
                  textDecoration:"none", fontFamily:"var(--ff-b)",
                  boxShadow: clickedApp==="phonepe" ? "0 6px 20px rgba(95,37,159,.2)" : "0 2px 8px rgba(0,0,0,.06)",
                  transition:"all .2s",
                }}>
                <PhonePeLogo size={24}/> PhonePe
              </a>
            ) : null}

            {!gpay && !phonepe && (
              <div style={{ flex:1, padding:"var(--s4)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", fontSize:".875rem", color:"var(--t2)", textAlign:"center", lineHeight:1.6 }}>
                Show token <strong>#{token}</strong> to staff and pay at the counter.
              </div>
            )}
          </div>

          {clickedApp && (
            <div className="awp-appear" style={{ marginTop:"var(--s3)", padding:"var(--s3) var(--s4)", background:"rgba(29,158,117,.07)", border:"1px solid rgba(29,158,117,.25)", borderRadius:"var(--r3)", fontSize:".8125rem", color:"var(--ok)", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
              App opened — return here after payment. Staff will confirm shortly.
            </div>
          )}
        </div>

        {/* ── Already paid? instruction ── */}
        <div style={{
          padding:"var(--s4) var(--s5)",
          background:"linear-gradient(135deg,rgba(95,37,159,.08),rgba(95,37,159,.03))",
          border:"1.5px solid rgba(95,37,159,.25)",
          borderRadius:"var(--r4)",
          marginBottom:"var(--s5)",
          display:"flex", gap:14, alignItems:"flex-start",
        }}>
          <div style={{
            width:36, height:36, borderRadius:"50%", flexShrink:0,
            background:"rgba(95,37,159,.12)", border:"1.5px solid rgba(95,37,159,.3)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#5f259f" strokeWidth="2">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 8v5M12 16h.01" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:".9375rem", color:"var(--t1)", marginBottom:4 }}>
              Already paid?
            </div>
            <p style={{ fontSize:".8125rem", color:"var(--t2)", lineHeight:1.65, margin:0 }}>
              Please <strong>stay on this page</strong> and wait for staff to verify your payment.
              Your order will be confirmed automatically — this usually takes
              <strong> 30–60 seconds</strong>. Do not close this page or go back.
            </p>
          </div>
        </div>

        {/* ── QR toggle ── */}
        <div style={{ border:"1.5px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden", marginBottom:"var(--s5)" }}>
          <button type="button" onClick={() => setShowQr(v => !v)}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"13px 16px", border:"none", background:showQr?"var(--brand-tint)":"transparent", cursor:"pointer", color:showQr?"var(--brand)":"var(--t2)", fontSize:".875rem", fontWeight:700, fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="5" y="5" width="2" height="2" fill="currentColor"/><rect x="17" y="5" width="2" height="2" fill="currentColor"/><rect x="5" y="17" width="2" height="2" fill="currentColor"/></svg>
            Show QR Code — scan at counter
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ marginLeft:"auto", transform:showQr?"rotate(180deg)":"none", transition:"transform .2s" }}><path d="M6 9l6 6 6-6" strokeLinecap="round"/></svg>
          </button>
          {showQr && (
            <div style={{ padding:"16px", display:"flex", flexDirection:"column", alignItems:"center", gap:12, background:"var(--bg2)", borderTop:"1px solid var(--bd)" }}>
              {loadingQr ? (
                <div style={{ width:180, height:180, borderRadius:8, background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".875rem", color:"var(--t4)" }}>Loading QR…</div>
              ) : qrBlobUrl ? (
                <img src={qrBlobUrl} alt="UPI QR" style={{ width:180, height:180, borderRadius:8, border:"1.5px solid var(--bd)", background:"#fff", padding:6, imageRendering:"pixelated" }}/>
              ) : (
                <div style={{ padding:"var(--s4)", fontSize:".875rem", color:"var(--t4)", textAlign:"center" }}>QR unavailable. Use GPay or PhonePe above.</div>
              )}
              {order && <div style={{ fontSize:".8125rem", fontWeight:700, color:"#5f259f" }}>{amt} · KNFC Order</div>}
            </div>
          )}
        </div>

        {/* ── Cancel ── */}
        <div style={{ textAlign:"center" }}>
          <button type="button" onClick={() => { if (window.confirm("Cancel this order? This cannot be undone.")) handleTimeout(true); }}
            disabled={cancelling}
            style={{ background:"none", border:"none", cursor:cancelling?"not-allowed":"pointer", color:"var(--t4)", fontSize:".8125rem", fontFamily:"var(--ff-b)", fontWeight:600, textDecoration:"underline", opacity:cancelling?.5:1 }}>
            {cancelling ? "Cancelling…" : "Cancel this order"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
