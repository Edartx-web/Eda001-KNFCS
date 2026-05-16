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
          <span style={{ fontSize:"1.5rem" }}>{icon}</span>
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
            <div style={{ fontSize:"3rem" }}>✅</div>
            <div style={{ fontWeight:700, color:GREEN }}>WhatsApp Connected</div>
            {phone && <div style={{ fontSize:".875rem", color:GRAY }}>+{phone}</div>}
            <p style={{ fontSize:".8125rem", color:GRAY, maxWidth:"280px", textAlign:"center" }}>
              This number is ready to send {name === "otp" ? "OTP messages" : "broadcast offers"}.
            </p>
          </>
        ) : status === "service_down" ? (
          <>
            <div style={{ fontSize:"2.5rem" }}>🔌</div>
            <div style={{ fontWeight:700, color:GRAY }}>WhatsApp service is not running</div>
            <p style={{ fontSize:".8125rem", color:GRAY, maxWidth:"280px" }}>
              Start it with: <code style={{ background:"#f3f4f6", padding:"2px 6px", borderRadius:"4px" }}>cd whatsapp-service && npm start</code>
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize:"2.5rem" }}>📵</div>
            <div style={{ fontWeight:700, color:RED }}>Disconnected</div>
            <p style={{ fontSize:".8125rem", color:GRAY, maxWidth:"280px" }}>
              Waiting for QR… The service will generate one shortly.
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
      <div style={{ paddingTop:"60px" }}>
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
              Manage Baileys WhatsApp sessions for OTP delivery and offer broadcasts.
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
                icon="🔑"
                sessionData={waState?.otp}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />
              <SessionCard
                name="broadcast"
                label="Broadcast Number"
                icon="📢"
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
