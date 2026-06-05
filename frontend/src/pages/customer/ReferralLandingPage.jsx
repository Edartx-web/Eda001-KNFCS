/**
 * ReferralLandingPage.jsx
 * Route: /refer/:code
 *
 * Landing page for friends who clicked a referral link.
 * 1. Calls POST /offers/referral/track/ to get referrer name + reward preview
 * 2. Stores the referral code in localStorage for auto-claim after signup
 * 3. Redirects the new user to /login/customer
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import KNCLoader from "../../components/common/KNCLoader";

const REFERRAL_PENDING_KEY = "knfc_pending_referral";

/* ── CSS injected once ─────────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("ref-land-css")) {
  const s = document.createElement("style");
  s.id = "ref-land-css";
  s.textContent = `
    @keyframes ref-fade-in  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
    @keyframes ref-pulse-in { 0%{transform:scale(.88);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
    @keyframes ref-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes ref-glow     { 0%,100%{box-shadow:0 0 0 0 rgba(232,82,26,.3)} 50%{box-shadow:0 0 0 12px rgba(232,82,26,.0)} }
    @keyframes ref-spin-slow { to{transform:rotate(360deg)} }
  `;
  document.head.appendChild(s);
}

export default function ReferralLandingPage() {
  const { code }    = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [info,    setInfo]    = useState(null);  // { referrer_name, offer_name, reward_preview }
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [joining, setJoining] = useState(false);

  /* Track the referral visit & store code for post-signup claim */
  useEffect(() => {
    if (!code) { navigate("/menu"); return; }

    axiosClient.post("/offers/referral/track/", { code })
      .then(r => {
        setInfo(r.data);
        localStorage.setItem(REFERRAL_PENDING_KEY, code);
      })
      .catch(e => {
        setError(e.response?.data?.error || "This referral link is invalid or has expired.");
      })
      .finally(() => setLoading(false));
  }, [code]);

  /* If already logged-in customer, try to claim immediately */
  useEffect(() => {
    if (!user || user.role !== "customer" || !code) return;
    axiosClient.post("/offers/referral/claim/", { code })
      .then(() => {
        localStorage.removeItem(REFERRAL_PENDING_KEY);
        navigate("/offers", { replace: true });
      })
      .catch(() => navigate("/offers", { replace: true }));
  }, [user, code]);

  const handleJoin = () => {
    setJoining(true);
    setTimeout(() => navigate("/login/customer"), 300);
  };

  if (loading) return <KNCLoader visible label="Loading referral…" />;

  if (error) return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg,#1A0800,#2D1200)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24, gap: 16, textAlign: "center",
    }}>
      <div style={{ fontSize: "3rem" }}>😔</div>
      <div style={{ fontFamily: "system-ui", fontWeight: 900, fontSize: "1.25rem", color: "#fff" }}>
        Link not valid
      </div>
      <p style={{ color: "rgba(255,255,255,.6)", fontSize: ".9375rem", maxWidth: 320, lineHeight: 1.6 }}>
        {error}
      </p>
      <Link to="/menu" style={{
        padding: "12px 28px", borderRadius: 40,
        background: "var(--brand,#E8521A)", color: "#fff",
        fontWeight: 800, fontSize: ".9375rem", textDecoration: "none",
        boxShadow: "0 4px 18px rgba(232,82,26,.4)",
      }}>
        Go to menu →
      </Link>
    </div>
  );

  const referrerName  = info?.referrer_name  || "A friend";
  const rewardPreview = info?.reward_preview  || "a special discount";
  const offerName     = info?.offer_name      || "KNFC Special";

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#1A0800 0%,#2D1200 45%,#3D1A00 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      overflow: "hidden",
      position: "relative",
    }}>

      {/* Decorative circles */}
      <div style={{ position:"absolute", top:-100, right:-80, width:380, height:380, borderRadius:"50%", background:"rgba(232,82,26,.07)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:-80, left:-80, width:280, height:280, borderRadius:"50%", background:"rgba(255,215,0,.05)", pointerEvents:"none" }}/>

      {/* KNFC Logo chip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 18px", borderRadius: 40,
        background: "rgba(255,255,255,.08)",
        border: "1px solid rgba(255,255,255,.14)",
        marginBottom: 32,
        animation: "ref-fade-in .5s ease-out both",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand,#E8521A)" strokeWidth="2">
          <circle cx="8" cy="17" r="4"/><line x1="11.5" y1="13.5" x2="19" y2="6"/><circle cx="20" cy="5" r="1.5"/>
        </svg>
        <span style={{ fontWeight: 800, fontSize: ".8125rem", color: "rgba(255,255,255,.8)", letterSpacing: ".08em", textTransform: "uppercase" }}>
          KNFC Fried Chicken
        </span>
      </div>

      {/* Gift icon */}
      <div style={{
        fontSize: "4rem", lineHeight: 1, marginBottom: 20,
        animation: "ref-float 3s ease-in-out infinite, ref-pulse-in .6s .1s ease-out both",
        filter: "drop-shadow(0 8px 24px rgba(232,82,26,.4))",
      }}>
        🎁
      </div>

      {/* Headline */}
      <div style={{
        textAlign: "center", marginBottom: 10,
        animation: "ref-fade-in .5s .15s ease-out both",
      }}>
        <div style={{ fontSize: ".875rem", fontWeight: 700, color: "rgba(255,255,255,.55)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
          You've been invited by
        </div>
        <h1 style={{
          fontFamily: "system-ui,sans-serif",
          fontSize: "clamp(1.8rem,6vw,2.8rem)",
          fontWeight: 900, color: "#fff",
          letterSpacing: "-.02em", lineHeight: 1.1,
          textShadow: "0 4px 20px rgba(0,0,0,.4)",
        }}>
          {referrerName}
        </h1>
      </div>

      {/* Reward card */}
      <div style={{
        width: "100%", maxWidth: 400,
        background: "linear-gradient(135deg,rgba(232,82,26,.18),rgba(232,82,26,.06))",
        border: "1.5px solid rgba(232,82,26,.4)",
        borderRadius: 20,
        padding: "24px 28px",
        textAlign: "center",
        marginTop: 20, marginBottom: 28,
        animation: "ref-fade-in .5s .25s ease-out both",
        boxShadow: "0 12px 40px rgba(232,82,26,.2)",
      }}>
        <div style={{ fontSize: ".75rem", fontWeight: 800, color: "rgba(232,82,26,.8)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>
          Your Welcome Reward
        </div>
        <div style={{
          fontFamily: "system-ui,sans-serif",
          fontSize: "clamp(1.6rem,5vw,2.4rem)",
          fontWeight: 900, lineHeight: 1.1,
          background: "linear-gradient(135deg,#E8521A,#FF8C00,#FFD700)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: 6,
        }}>
          {rewardPreview}
        </div>
        <div style={{ fontSize: ".875rem", color: "rgba(255,255,255,.6)", lineHeight: 1.5 }}>
          {offerName} — Sign up to claim this reward automatically
        </div>
      </div>

      {/* How it works */}
      <div style={{
        width: "100%", maxWidth: 400, marginBottom: 28,
        animation: "ref-fade-in .5s .35s ease-out both",
      }}>
        <div style={{ fontSize: ".75rem", fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>
          3 easy steps
        </div>
        {[
          { n: "1", label: "Sign up with your phone" },
          { n: "2", label: "Reward is applied automatically" },
          { n: "3", label: "Order & enjoy the discount!" },
        ].map(step => (
          <div key={step.n} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", marginBottom: 6,
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 12,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(232,82,26,.25)",
              border: "1.5px solid rgba(232,82,26,.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: ".8125rem", color: "#E8521A", flexShrink: 0,
            }}>
              {step.n}
            </div>
            <span style={{ fontSize: ".9rem", color: "rgba(255,255,255,.8)", fontWeight: 500 }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        width: "100%", maxWidth: 400,
        animation: "ref-fade-in .5s .45s ease-out both",
      }}>
        <button
          onClick={handleJoin}
          disabled={joining}
          style={{
            width: "100%", padding: "16px 24px",
            borderRadius: 40, border: "none",
            background: joining ? "rgba(255,255,255,.2)" : "linear-gradient(135deg,#E8521A,#C03A10)",
            color: "#fff", fontWeight: 900,
            fontSize: "1.0625rem", cursor: joining ? "not-allowed" : "pointer",
            fontFamily: "system-ui,sans-serif", letterSpacing: ".02em",
            boxShadow: joining ? "none" : "0 8px 28px rgba(232,82,26,.5), inset 0 1px 0 rgba(255,255,255,.2)",
            transition: "all .22s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            animation: "ref-glow 2.4s ease-in-out infinite",
          }}
          onMouseEnter={e => { if (!joining) e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
          {joining ? (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "ref-spin-slow 1s linear infinite" }}><path d="M21 12a9 9 0 11-3-6.7" strokeLinecap="round"/></svg> Redirecting…</>
          ) : (
            <>🍗 Sign Up &amp; Claim Reward</>
          )}
        </button>

        <p style={{ textAlign: "center", fontSize: ".8rem", color: "rgba(255,255,255,.38)", marginTop: 12 }}>
          Already have an account?{" "}
          <button onClick={handleJoin} style={{ background: "none", border: "none", color: "rgba(232,82,26,.8)", fontWeight: 700, cursor: "pointer", fontSize: ".8rem" }}>
            Log in to claim →
          </button>
        </p>
      </div>

      {/* Referrer info footer */}
      <div style={{
        marginTop: 32, fontSize: ".75rem", color: "rgba(255,255,255,.3)",
        textAlign: "center", lineHeight: 1.6,
        animation: "ref-fade-in .5s .55s ease-out both",
      }}>
        Referred by <strong style={{ color: "rgba(255,255,255,.5)" }}>{referrerName}</strong>
        {" · "}
        <Link to="/menu" style={{ color: "rgba(232,82,26,.6)", textDecoration: "none" }}>
          Browse menu without signing up →
        </Link>
      </div>
    </div>
  );
}
