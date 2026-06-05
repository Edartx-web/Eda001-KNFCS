/**
 * WhatsAppPage.jsx — SuperAdmin: Baileys session management
 * Shows QR code + connection status for OTP and Broadcast WhatsApp numbers.
 * Polls /api/v1/notifications/whatsapp/status/ every 3 s when a session is in 'qr' state.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header      from "../../components/layout/Header";
import axiosClient from "../../api/axiosClient";

/* ── colour constants ───────────────────────────────────────────────────────── */
const BRAND   = "#E8521A";
const GREEN   = "#16a34a";
const RED     = "#dc2626";
const YELLOW  = "#d97706";
const GRAY    = "#6b7280";

/* ── status pill ─────────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const map = {
    connected:    { label: "Connected",    color: GREEN,  bg: "#dcfce7" },
    qr:           { label: "Scan QR",      color: YELLOW, bg: "#fef3c7" },
    disconnected: { label: "Disconnected", color: RED,    bg: "#fee2e2" },
    service_down: { label: "Service Down", color: GRAY,   bg: "#f3f4f6" },
  };
  const s = map[status] || map.disconnected;
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      gap:           "6px",
      padding:       "3px 10px",
      borderRadius:  "999px",
      fontSize:      ".75rem",
      fontWeight:    700,
      background:    s.bg,
      color:         s.color,
    }}>
      <span style={{
        width: "7px", height: "7px", borderRadius: "50%",
        background: s.color,
        animation: status === "qr" ? "pulse 1.4s ease-in-out infinite" : "none",
      }} />
      {s.label}
    </span>
  );
}

/* ── single session card ─────────────────────────────────────────────────────── */
function SessionCard({ name, label, icon, sessionData, onLogout, loggingOut }) {
  const { status, qr, phone } = sessionData || { status: "disconnected", qr: null, phone: null };

  return (
    <div style={{
      background:   "#fff",
      border:       "1px solid #e5e7eb",
      borderRadius: "16px",
      overflow:     "hidden",
      boxShadow:    "0 1px 4px rgba(0,0,0,.06)",
    }}>
      {/* Card header */}
      <div style={{
        padding:       "18px 24px",
        borderBottom:  "1px solid #f3f4f6",
        background:    "#fafafa",
        display:       "flex",
        alignItems:    "center",
        justifyContent:"space-between",
        flexWrap:      "wrap",
        gap:           "10px",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ display:"flex", alignItems:"center", justifyContent:"center", width:36, height:36, borderRadius:"var(--r3,10px)", background:"var(--brand-tint,rgba(232,82,26,.1))", flexShrink:0 }}>{icon}</span>
          <div>
            <div style={{ fontFamily:"var(--ff-d,Syne,sans-serif)", fontWeight:800, fontSize:"1rem" }}>
              {label}
            </div>
            {phone && (
              <div style={{ fontSize:".75rem", color:GRAY, marginTop:"2px" }}>
                +{phone}
              </div>
            )}
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* QR code or connected state */}
      <div style={{ padding:"28px 24px", textAlign:"center", minHeight:"260px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px" }}>
        {status === "qr" && qr ? (
          <>
            <p style={{ fontSize:".8125rem", color:GRAY, marginBottom:"4px" }}>
              Open WhatsApp → Linked Devices → Link a Device
            </p>
            <img
              src={qr}
              alt="WhatsApp QR"
              style={{ width:"220px", height:"220px", borderRadius:"12px", border:"2px solid #e5e7eb" }}
            />
            <p style={{ fontSize:".6875rem", color:GRAY }}>QR refreshes automatically</p>
          </>
        ) : status === "connected" ? (
          <>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"#dcfce7", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontWeight:700, fontSize:"1rem", color:GREEN }}>WhatsApp Connected</div>
            {phone && <div style={{ fontSize:".875rem", color:GRAY, fontWeight:600 }}>+{phone}</div>}
            <p style={{ fontSize:".8125rem", color:GRAY, maxWidth:"280px", textAlign:"center" }}>
              Ready to send {name === "otp" ? "OTP messages" : "broadcast offers"}.
            </p>
          </>
        ) : status === "service_down" ? (
          <>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke={GRAY} strokeWidth="1.8"><path d="M18.36 6.64A9 9 0 0121 12a9 9 0 01-9 9 9 9 0 01-5.37-1.77M12 3a9 9 0 016.36 15.36M3 3l18 18" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontWeight:700, fontSize:"1rem", color:GRAY }}>Service Offline</div>
            <p style={{ fontSize:".8125rem", color:GRAY, maxWidth:"280px" }}>
              The WhatsApp service is not running. Please contact your administrator.
            </p>
          </>
        ) : (
          <>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"#fee2e2", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke={RED} strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><circle cx="12" cy="16" r=".5" fill={RED}/></svg>
            </div>
            <div style={{ fontWeight:700, fontSize:"1rem", color:RED }}>Not Connected</div>
            <p style={{ fontSize:".8125rem", color:GRAY, maxWidth:"280px" }}>
              Waiting for connection. Scan the QR code when it appears.
            </p>
          </>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ padding:"16px 24px", borderTop:"1px solid #f3f4f6", display:"flex", justifyContent:"flex-end", gap:"10px" }}>
        <button
          onClick={() => onLogout(name)}
          disabled={loggingOut === name}
          style={{
            padding:      "8px 18px",
            borderRadius: "8px",
            border:       "1px solid #e5e7eb",
            background:   loggingOut === name ? "#f3f4f6" : "#fff",
            color:        RED,
            fontWeight:   600,
            fontSize:     ".8125rem",
            cursor:       loggingOut === name ? "not-allowed" : "pointer",
          }}
        >
          {loggingOut === name ? "Logging out…" : "Logout & Re-scan"}
        </button>
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────────── */
export default function WhatsAppPage() {
  const navigate          = useNavigate();
  const [waState, setWaState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [loggingOut, setLoggingOut] = useState(null);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await axiosClient.get("/notifications/whatsapp/status/");
      setWaState(data);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to fetch WhatsApp status");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Poll every 3 s so QR updates in near-real-time */
  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, [fetchStatus]);

  const handleLogout = async (session) => {
    if (!window.confirm(`Logout ${session.toUpperCase()} WhatsApp? A new QR will appear.`)) return;
    setLoggingOut(session);
    try {
      await axiosClient.post("/notifications/whatsapp/logout/", { session });
      await fetchStatus();
    } catch (e) {
      alert(e?.response?.data?.error || "Logout failed");
    } finally {
      setLoggingOut(null);
    }
  };

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg,#f5f5f5)" }}>
      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; }
          50%      { opacity:.4; }
        }
      `}</style>
      <Header />
      <div style={{ paddingTop:"60px", paddingBottom:"calc(72px + env(safe-area-inset-bottom,0px))" }}>
        <div style={{ maxWidth:"960px", margin:"0 auto", padding:"32px clamp(16px,4vw,40px)" }}>

          {/* Page header */}
          <div style={{ marginBottom:"28px" }}>
            <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:GRAY, marginBottom:"6px" }}>
              Super Admin
            </div>
            <h1 style={{ fontFamily:"var(--ff-d,Syne,sans-serif)", fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:900, letterSpacing:"-.025em", lineHeight:1.1, marginBottom:"6px" }}>
              WhatsApp Management
            </h1>
            <p style={{ fontSize:".9375rem", color:GRAY }}>
              Manage WhatsApp connections for OTP delivery and offer broadcasts.
            </p>
          </div>

          {/* Alert banner */}
          {error && (
            <div style={{ padding:"12px 16px", background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:"10px", color:RED, fontSize:".875rem", marginBottom:"20px" }}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && !waState ? (
            <div style={{ textAlign:"center", padding:"60px", color:GRAY }}>Connecting to WhatsApp service…</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:"20px" }}>
              <SessionCard
                name="otp"
                label="OTP Number"
                icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={BRAND} strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                sessionData={waState?.otp}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />
              <SessionCard
                name="broadcast"
                label="Broadcast Number"
                icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={BRAND} strokeWidth="1.8"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round"/></svg>}
                sessionData={waState?.broadcast}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />
            </div>
          )}

          {/* Info box */}
          <div style={{
            marginTop:"28px",
            padding:"16px 20px",
            background:"#fffbeb",
            border:"1px solid #fde68a",
            borderRadius:"12px",
            fontSize:".8125rem",
            color:"#92400e",
            lineHeight:1.7,
          }}>
            <strong>How it works:</strong><br />
            • <strong>OTP Number</strong> — sends a 6-digit code to each customer when they log in.<br />
            • <strong>Broadcast Number</strong> — sends offer images and captions to all customers.<br />
            • If a session disconnects, you'll receive an email alert and this page will show a new QR to scan.
          </div>

        </div>
      </div>
    </div>
  );
}
