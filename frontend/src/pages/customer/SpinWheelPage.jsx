/**
 * SpinWheelPage.jsx
 * Customer-facing spin-the-wheel page.
 * Fetches prizes + daily limit from /api/v1/branches/config/ (public)
 * Records each spin via POST /api/v1/branches/spin/ (auth required)
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout  from "../../components/layout/AppLayout";
import SpinWheel  from "../../components/common/SpinWheel";
import axiosClient from "../../api/axiosClient";
import { useAuth }  from "../../context/AuthContext";

const DEFAULT_PRIZES = [
  { label: "5% OFF",     pct: 5,  color: "#E8521A", prob: 0.30 },
  { label: "10% OFF",    pct: 10, color: "#2563EB", prob: 0.25 },
  { label: "Free Drink", pct: 0,  color: "#059669", prob: 0.15 },
  { label: "15% OFF",    pct: 15, color: "#7C3AED", prob: 0.12 },
  { label: "Try Again",  pct: 0,  color: "#6B7280", prob: 0.10 },
  { label: "20% OFF",    pct: 20, color: "#DC2626", prob: 0.05 },
  { label: "Free Side",  pct: 0,  color: "#D97706", prob: 0.03 },
];

export default function SpinWheelPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [prizes,      setPrizes]     = useState(DEFAULT_PRIZES);
  const [spinsLeft,   setSpinsLeft]  = useState(0);
  const [spinEnabled, setSpinEnabled] = useState(true);
  const [loading,     setLoading]    = useState(true);
  const [recordErr,   setRecordErr]  = useState(null);
  const [wonPrize,    setWonPrize]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, spinRes] = await Promise.all([
        axiosClient.get("/branches/config/"),
        user ? axiosClient.get("/branches/spin/") : Promise.resolve(null),
      ]);
      const cfg = cfgRes.data.config || {};
      if (!cfg.spin_enabled) { setSpinEnabled(false); setLoading(false); return; }
      if (Array.isArray(cfg.spin_prizes) && cfg.spin_prizes.length >= 2) {
        setPrizes(cfg.spin_prizes);
      }
      if (spinRes) {
        setSpinsLeft(spinRes.data.spins_left ?? 0);
      } else {
        setSpinsLeft(cfg.spin_max_uses ?? 1);
      }
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleWin = async (prize) => {
    if (prize.label === "Try Again") return;
    setWonPrize(prize);
    setRecordErr(null);
    if (!user) return;
    try {
      const { data } = await axiosClient.post("/branches/spin/", {
        label:       prize.label,
        prize_pct:   prize.pct   ?? 0,
        prize_color: prize.color ?? "#E8521A",
      });
      setSpinsLeft(data.spins_left ?? 0);
    } catch (e) {
      const msg = e?.response?.data?.error;
      if (msg) setRecordErr(msg);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
          <div style={{ fontSize:".9375rem", color:"var(--t3)" }}>Loading spin wheel…</div>
        </div>
      </AppLayout>
    );
  }

  if (!spinEnabled) {
    return (
      <AppLayout>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:"12px", padding:"32px" }}>
          <div style={{ display:"flex", justifyContent:"center", color:"var(--brand)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="12" x2="15" y2="15"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
          </div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontWeight:900, fontSize:"1.5rem", color:"var(--t1)" }}>
            Spin Wheel Unavailable
          </h2>
          <p style={{ color:"var(--t3)", textAlign:"center", maxWidth:"340px" }}>
            The spin wheel is currently disabled. Check back later!
          </p>
          <button onClick={() => navigate(-1)}
            style={{ padding:"10px 24px", borderRadius:"10px", background:"var(--brand)", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", marginTop:"8px" }}>
            Go Back
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px clamp(16px,4vw,48px)",
        background: "linear-gradient(160deg, rgba(20,5,0,.04) 0%, transparent 60%)",
      }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:"32px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", fontSize:"clamp(1.5rem,4vw,2rem)", fontFamily:"var(--ff-d)", fontWeight:900, color:"var(--t1)", letterSpacing:"-.025em", marginBottom:"8px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="12" x2="15" y2="15"/><circle cx="12" cy="12" r="1" fill="var(--brand)"/></svg>
            Spin &amp; Win
          </div>
          <p style={{ fontSize:".9375rem", color:"var(--t3)", maxWidth:"340px" }}>
            Spin the wheel for an instant discount on your next order!
          </p>
          {!user && (
            <div style={{ marginTop:"12px", padding:"10px 18px", background:"rgba(232,82,26,.08)", borderRadius:"10px", border:"1px solid rgba(232,82,26,.2)" }}>
              <span style={{ fontSize:".875rem", color:"#E8521A", fontWeight:600 }}>
                Login to save your prize and use it at checkout.
              </span>
              {" "}
              <button onClick={() => navigate("/login")}
                style={{ background:"none", border:"none", color:"#E8521A", fontWeight:700, cursor:"pointer", textDecoration:"underline", fontSize:".875rem" }}>
                Login →
              </button>
            </div>
          )}
        </div>

        {/* Wheel */}
        <SpinWheel
          prizes={prizes}
          onWin={handleWin}
          spinsLeft={spinsLeft}
        />

        {/* Won prize confirmation */}
        {wonPrize && wonPrize.label !== "Try Again" && (
          <div style={{
            marginTop: "28px",
            padding: "18px 28px",
            background: "var(--bgc)",
            border: "1.5px solid var(--bd2)",
            borderRadius: "16px",
            textAlign: "center",
            maxWidth: "360px",
            width: "100%",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", fontWeight:900, fontSize:"1.25rem", color:"var(--t1)", marginBottom:"6px", justifyContent:"center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              You won: {wonPrize.label}
            </div>
            {wonPrize.pct > 0 && (
              <p style={{ fontSize:".875rem", color:"var(--t3)", margin:0 }}>
                Apply your discount at checkout. Valid today only.
              </p>
            )}
            {wonPrize.pct === 0 && (
              <p style={{ fontSize:".875rem", color:"var(--t3)", margin:0 }}>
                Show this to our staff at the counter when ordering.
              </p>
            )}
            <button onClick={() => navigate("/")}
              style={{ marginTop:"14px", padding:"9px 22px", borderRadius:"9px", background:"var(--brand)", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:".875rem" }}>
              Order Now →
            </button>
          </div>
        )}

        {recordErr && (
          <div style={{ marginTop:"16px", padding:"10px 16px", background:"rgba(220,38,38,.08)", border:"1px solid rgba(220,38,38,.2)", borderRadius:"10px", color:"#dc2626", fontSize:".875rem", maxWidth:"360px", textAlign:"center" }}>
            {recordErr}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
