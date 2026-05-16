/**
 * ChangePasswordPage.jsx
 *
 * Shown immediately after Branch Admin first login (must_change_password=true).
 * Cannot be dismissed — must set a new password before accessing dashboard.
 *
 * POST /api/v1/auth/change-password/ { current_password, new_password }
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate }     from "react-router-dom";
import { gsap }            from "gsap";
import { useAuth }         from "../../context/AuthContext";
import KNCLoader           from "../../components/common/KNCLoader";
import { changePassword }  from "../../api/auth";

/* ── Password strength ─────────────────────────────────────────────── */
function StrengthBar({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[\d!@#$%^&*]/.test(password),
  ];
  const score  = checks.filter(Boolean).length;
  const colors = ["", "var(--err)", "var(--warn)", "var(--gold)", "var(--ok)"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div style={{ marginBottom:"var(--s4)" }}>
      <div style={{ display:"flex", gap:"3px", marginBottom:"5px" }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex:1, height:"3px", borderRadius:"2px",
            background: i <= score ? colors[score] : "var(--bd)",
            transition:"background .3s" }} />
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:".6875rem" }}>
        <span style={{ color:"var(--t4)" }}>
          {["8+ chars", "Uppercase", "Lowercase", "Number/symbol"].map((l, i) => (
            <span key={l} style={{ color: checks[i] ? "var(--ok)" : "var(--t4)", marginRight:"8px" }}>
              {checks[i] ? "✓" : "○"} {l}
            </span>
          ))}
        </span>
        {score > 0 && <span style={{ fontWeight:700, color:colors[score] }}>{labels[score]}</span>}
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const navigate        = useNavigate();
  const { user, login, logout } = useAuth();
  const cardRef         = useRef(null);

  const [current,   setCurrent]   = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  useEffect(() => {
    if (!cardRef.current || typeof gsap === "undefined") return;
    gsap.fromTo(cardRef.current,
      { opacity:0, y:28, scale:.97 },
      { opacity:1, y:0, scale:1, duration:.5, ease:"power2.out", delay:.1 }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!current)             { setError("Enter your current (temporary) password"); return; }
    if (!newPw)               { setError("Enter a new password"); return; }
    if (newPw.length < 8)     { setError("New password must be at least 8 characters"); return; }
    if (newPw === current)    { setError("New password must be different from temporary password"); return; }
    if (newPw !== confirm)    { setError("Passwords do not match"); return; }

    setError(""); setLoading(true);
    try {
      await changePassword(current, newPw);
      setSuccess(true);
      // Auto-redirect after 2s — user must log in again with new password
      setTimeout(() => {
        logout();
        navigate("/login/admin");
      }, 2200);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password. Try again.");
    } finally { setLoading(false); }
  };
  
  const EyeBtn = ({ show, toggle }) => (
    <button type="button" onClick={toggle}
      style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t3)", display:"flex", padding:"4px" }}>
      {show
        ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
      }
    </button>
  );

  return (
    <>
      {loading && <KNCLoader visible label="Updating password…" />}

      {/* Full-screen lock — no bypass */}
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"var(--bg)", padding:"var(--s4)",
        backgroundImage:"radial-gradient(ellipse at 50% 0%, rgba(232,82,26,.12) 0%, transparent 55%)",
      }}>
        <div ref={cardRef} style={{ width:"100%", maxWidth:"480px" }}>

          {/* Security notice banner */}
          <div style={{
            display:"flex", alignItems:"center", gap:"var(--s3)",
            padding:"var(--s3) var(--s4)", marginBottom:"var(--s4)",
            background:"rgba(239,159,39,.1)", border:"1px solid rgba(239,159,39,.3)",
            borderRadius:"var(--r4)",
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--warn)" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <div>
              <div style={{ fontSize:".875rem", fontWeight:700, color:"var(--warn)" }}>
                Security action required
              </div>
              <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>
                You must set a new password before accessing the dashboard.
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="card" style={{ padding:"var(--s6)", borderRadius:"var(--r5)" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s5)" }}>
              <div style={{
                width:"48px", height:"48px", borderRadius:"var(--r3)", flexShrink:0,
                background:"var(--brand)", display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"var(--sh-br)",
              }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <div>
                <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:800, letterSpacing:"-.02em" }}>
                  Set your password
                </h1>
                <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:"2px" }}>
                  Hello {user?.name || "there"} — first login for {user?.branch_name || "your branch"}
                </p>
              </div>
            </div>

            {success ? (
              <div style={{ textAlign:"center", padding:"var(--s6) 0" }}>
                <div style={{
                  width:"64px", height:"64px", borderRadius:"50%",
                  background:"var(--ok-t)", border:"1.5px solid rgba(29,158,117,.35)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  margin:"0 auto var(--s4)",
                }}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:700, marginBottom:"var(--s2)" }}>
                  Password set successfully!
                </h2>
                <p style={{ fontSize:".9375rem", color:"var(--t3)" }}>
                  Redirecting you to login…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>

                {/* Current (temp) password */}
                <label style={{ display:"block", fontSize:".75rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s1)" }}>
                  Temporary password (from email)
                </label>
                <div className="input-wrap" style={{ marginBottom:"var(--s4)" }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input type={showCur ? "text" : "password"} value={current}
                    onChange={e => { setCurrent(e.target.value); setError(""); }}
                    placeholder="Enter temp password from email"
                    className="input-field" autoFocus autoComplete="current-password" />
                  <EyeBtn show={showCur} toggle={() => setShowCur(v => !v)} />
                </div>

                {/* New password */}
                <label style={{ display:"block", fontSize:".75rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s1)" }}>
                  New password
                </label>
                <div className="input-wrap" style={{ marginBottom:"var(--s2)" }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <input type={showNew ? "text" : "password"} value={newPw}
                    onChange={e => { setNewPw(e.target.value); setError(""); }}
                    placeholder="Min. 8 characters"
                    className="input-field" autoComplete="new-password" />
                  <EyeBtn show={showNew} toggle={() => setShowNew(v => !v)} />
                </div>
                <StrengthBar password={newPw} />

                {/* Confirm */}
                <label style={{ display:"block", fontSize:".75rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s1)" }}>
                  Confirm new password
                </label>
                <div className={`input-wrap${confirm && newPw !== confirm ? " err" : ""}`} style={{ marginBottom:"var(--s4)" }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <input type={showNew ? "text" : "password"} value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(""); }}
                    placeholder="Repeat new password"
                    className="input-field" autoComplete="new-password" />
                  {confirm && newPw !== confirm && (
                    <span style={{ color:"var(--err)", fontSize:"11px", flexShrink:0 }}>✗</span>
                  )}
                  {confirm && newPw === confirm && newPw.length >= 8 && (
                    <span style={{ color:"var(--ok)", fontSize:"11px", flexShrink:0 }}>✓</span>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    display:"flex", alignItems:"center", gap:"var(--s2)",
                    padding:"var(--s3)", background:"var(--err-t)",
                    border:"1px solid rgba(226,75,74,.25)", borderRadius:"var(--r3)",
                    marginBottom:"var(--s4)", fontSize:".875rem", color:"var(--err)",
                  }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
                    </svg>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || (confirm && newPw !== confirm)}
                  className="btn btn-p btn-xl btn-full">
                  {loading
                    ? <><span className="spin">⟳</span> Setting password…</>
                    : "Set new password →"
                  }
                </button>

                <p style={{ textAlign:"center", fontSize:".8125rem", color:"var(--t4)", marginTop:"var(--s4)" }}>
                  After setting your password, you'll be redirected to login again.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
