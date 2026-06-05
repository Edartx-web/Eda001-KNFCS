/**
 * AuthPages.jsx — Redesigned
 * Exports: StaffLogin, AdminLogin
 *
 * Design: Warm off-white editorial × structured minimal
 * - Single-column centered card layout, no left panel
 * - Brand accent: deep amber/orange (#C85A1A)
 * - Typography: Playfair Display for headings, DM Sans for body
 * - Fully responsive — perfect on 375px mobile up to wide desktop
 * - Subtle grain texture, animated entrance, micro-interactions
 */
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { gsap } from "gsap";
import { useAuth } from "../../context/AuthContext";
import KNCLoader from "../../components/common/KNCLoader";
import useTheme from "../../hooks/useTheme";
import { staffLogin, adminLogin } from "../../api/auth";

/* ─── Global styles injected once ───────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');

  :root {
    --brand:       #C85A1A;
    --brand-d:     #9E3F0E;
    --brand-tint:  rgba(200,90,26,.08);
    --brand-border:rgba(200,90,26,.22);

    --bg:          #FAF7F4;
    --bg-card:     #FFFFFF;
    --bg2:         #F2EDE8;

    --t1: #1A1208;
    --t2: #3D2E1E;
    --t3: #8B7560;
    --t4: #B5A494;

    --bd:  rgba(0,0,0,.08);
    --bd2: rgba(0,0,0,.13);

    --err:   #C0392B;
    --err-t: #FDF2F2;
    --info:  #1A6DB5;
    --info-t:rgba(26,109,181,.07);

    --r2: 6px;
    --r3: 10px;
    --r4: 14px;
    --r5: 20px;

    --sh-card: 0 2px 8px rgba(0,0,0,.06), 0 12px 40px rgba(0,0,0,.08);
    --sh-btn:  0 2px 8px rgba(200,90,26,.35);

    --ff-d: 'Playfair Display', Georgia, serif;
    --ff-b: 'DM Sans', system-ui, sans-serif;

    --d1: .18s;
    --ease: cubic-bezier(.4,0,.2,1);
  }

  [data-theme="dark"] {
    --bg:        #100A05;
    --bg-card:   #1C1208;
    --bg2:       #251A0E;
    --t1: #F5EDDF;
    --t2: #C9B89E;
    --t3: #7D6B55;
    --t4: #4A3C2C;
    --bd:  rgba(255,255,255,.07);
    --bd2: rgba(255,255,255,.12);
    --err-t: rgba(192,57,43,.12);
    --brand-tint: rgba(200,90,26,.12);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { font-family: var(--ff-b); background: var(--bg); color: var(--t1); }

  /* ── Auth wrapper ── */
  .auth-page {
    min-height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px 40px;
    background: var(--bg);
    position: relative;
    overflow: hidden;
  }

  /* Decorative grain */
  .auth-page::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    opacity: .025;
    pointer-events: none;
    z-index: 0;
  }

  /* Decorative blob */
  .auth-blob {
    position: fixed;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(200,90,26,.12) 0%, transparent 70%);
    top: -120px;
    right: -120px;
    pointer-events: none;
    z-index: 0;
  }
  .auth-blob-2 {
    position: fixed;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(200,90,26,.07) 0%, transparent 70%);
    bottom: -100px;
    left: -80px;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Card ── */
  .auth-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 440px;
    background: var(--bg-card);
    border: 1px solid var(--bd);
    border-radius: var(--r5);
    box-shadow: var(--sh-card);
    padding: 40px 36px 36px;
    animation: cardIn .5s cubic-bezier(.22,.68,0,1.2) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(22px) scale(.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }

  @media (max-width: 480px) {
    .auth-card { padding: 32px 22px 28px; border-radius: var(--r4); }
  }

  /* ── Brand mark ── */
  .auth-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 28px;
  }
  .auth-brand-icon {
    width: 38px; height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--brand), var(--brand-d));
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(200,90,26,.35);
  }
  .auth-brand-name {
    font-family: var(--ff-d);
    font-size: 1.0625rem;
    font-weight: 900;
    color: var(--t1);
    letter-spacing: -.01em;
  }

  /* ── Headings ── */
  .auth-heading {
    font-family: var(--ff-d);
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -.03em;
    line-height: 1.1;
    color: var(--t1);
    margin-bottom: 8px;
  }
  .auth-sub {
    font-size: .9375rem;
    color: var(--t3);
    line-height: 1.6;
    margin-bottom: 28px;
  }

  @media (max-width: 480px) {
    .auth-heading { font-size: 1.75rem; }
  }

  /* ── Divider ── */
  .auth-divider {
    height: 1px;
    background: var(--bd);
    margin: 22px 0;
  }

  /* ── Role cards ── */
  .role-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 26px;
  }
  .role-card {
    padding: 14px 12px;
    border-radius: var(--r3);
    border: 1.5px solid var(--bd);
    background: var(--bg2);
    cursor: pointer;
    text-align: left;
    font-family: var(--ff-b);
    transition: border-color var(--d1) var(--ease), background var(--d1) var(--ease), box-shadow var(--d1) var(--ease);
  }
  .role-card:hover { border-color: var(--bd2); }
  .role-card.active {
    border-color: var(--brand);
    background: var(--brand-tint);
    box-shadow: 0 0 0 3px rgba(200,90,26,.1);
  }
  .role-card-icon {
    color: var(--t3);
    margin-bottom: 8px;
    transition: color var(--d1);
  }
  .role-card.active .role-card-icon { color: var(--brand); }
  .role-card-label {
    font-size: .875rem;
    font-weight: 700;
    color: var(--t2);
    margin-bottom: 2px;
    transition: color var(--d1);
  }
  .role-card.active .role-card-label { color: var(--brand); }
  .role-card-desc {
    font-size: .75rem;
    color: var(--t3);
    line-height: 1.4;
  }

  /* ── Field ── */
  .field-label {
    display: block;
    font-size: .6875rem;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: var(--t3);
    margin-bottom: 7px;
  }
  .field-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1.5px solid var(--bd2);
    border-radius: var(--r3);
    background: var(--bg);
    padding: 0 14px;
    height: 48px;
    transition: border-color var(--d1) var(--ease), box-shadow var(--d1) var(--ease);
    margin-bottom: 16px;
  }
  .field-wrap:focus-within {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px rgba(200,90,26,.1);
  }
  .field-icon { color: var(--t4); flex-shrink: 0; }
  .field-input {
    flex: 1;
    border: none;
    background: transparent;
    font-family: var(--ff-b);
    font-size: .9375rem;
    color: var(--t1);
    outline: none;
    min-width: 0;
  }
  .field-input::placeholder { color: var(--t4); }
  .eye-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--t3);
    display: flex;
    padding: 4px;
    flex-shrink: 0;
    transition: color var(--d1);
  }
  .eye-btn:hover { color: var(--t1); }

  /* ── Error box ── */
  .error-box {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 11px 14px;
    background: var(--err-t);
    border: 1px solid rgba(192,57,43,.2);
    border-radius: var(--r3);
    font-size: .875rem;
    color: var(--err);
    line-height: 1.5;
    margin-bottom: 16px;
  }
  .error-icon { flex-shrink: 0; margin-top: 1px; }

  /* ── Primary button ── */
  .btn-primary {
    width: 100%;
    height: 50px;
    border: none;
    border-radius: var(--r3);
    background: linear-gradient(135deg, var(--brand), var(--brand-d));
    color: #fff;
    font-family: var(--ff-b);
    font-size: .9375rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: var(--sh-btn);
    transition: filter var(--d1), transform var(--d1), box-shadow var(--d1);
    letter-spacing: .01em;
  }
  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.08);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(200,90,26,.45);
  }
  .btn-primary:active:not(:disabled) { transform: translateY(0); filter: brightness(.96); }
  .btn-primary:disabled { opacity: .6; cursor: not-allowed; }

  .spin {
    display: inline-block;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Footer links ── */
  .auth-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid var(--bd);
  }
  .auth-link {
    font-size: .8125rem;
    color: var(--t3);
    text-decoration: none;
    transition: color var(--d1);
  }
  .auth-link:hover { color: var(--t1); }
  .auth-link-brand {
    font-size: .8125rem;
    color: var(--brand);
    font-weight: 600;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 3px;
    transition: opacity var(--d1);
  }
  .auth-link-brand:hover { opacity: .8; }

  /* ── Notice banner ── */
  .notice-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 14px;
    padding: 11px 14px;
    background: var(--info-t);
    border: 1px solid rgba(26,109,181,.15);
    border-radius: var(--r3);
  }
  .notice-text {
    font-size: .8125rem;
    color: var(--t2);
    line-height: 1.45;
  }
  .notice-text strong { color: var(--info); }
  .notice-link {
    font-size: .8125rem;
    color: var(--info);
    font-weight: 700;
    white-space: nowrap;
    text-decoration: none;
  }

  /* ── Theme toggle ── */
  .theme-toggle {
    display: flex;
    justify-content: center;
    margin-top: 18px;
  }
  .theme-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: .8125rem;
    color: var(--t4);
    font-family: var(--ff-b);
    padding: 4px 8px;
    border-radius: var(--r2);
    transition: color var(--d1), background var(--d1);
  }
  .theme-btn:hover { color: var(--t2); background: var(--bg2); }

  /* ── Forgot link ── */
  .forgot-row {
    text-align: right;
    margin-top: -8px;
    margin-bottom: 18px;
  }
  .forgot-link {
    font-size: .8125rem;
    color: var(--brand);
    font-weight: 500;
    text-decoration: none;
  }
  .forgot-link:hover { text-decoration: underline; }
`;

function InjectStyles() {
  useEffect(() => {
    const id = "auth-page-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => { /* keep styles */ };
  }, []);
  return null;
}

/* ─── Shared primitives ─────────────────────────────────────────────── */
function EyeToggle({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle} className="eye-btn" aria-label={show ? "Hide password" : "Show password"}>
      {show
        ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
      }
    </button>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="field-wrap">
        <span className="field-icon">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="error-box" role="alert">
      <svg className="error-icon" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
      {msg}
    </div>
  );
}

function BrandMark({ suffix }) {
  return (
    <div className="auth-brand">
      <div className="auth-brand-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <circle cx="12" cy="12" r="9" strokeWidth="1.5"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3.5"/>
          <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3.5"/>
        </svg>
      </div>
      <span className="auth-brand-name">KNFC {suffix}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STAFF LOGIN
══════════════════════════════════════════════════════════════════════ */
export function StaffLogin() {
  const navigate   = useNavigate();
  const { login }  = useAuth();
  const { isDark, toggle } = useTheme();

  const [userId,   setUserId]   = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handle = async e => {
    e.preventDefault();
    if (!userId.trim())         { setError("Enter your User ID");                      return; }
    if (userId.trim().length < 3){ setError("User ID must be at least 3 characters"); return; }
    if (!password)              { setError("Enter your password");                     return; }
    if (password.length < 6)    { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    try {
      // Location is REQUIRED — login blocked if denied
      let locPayload = {};
      if (!navigator.geolocation) {
        setLoading(false);
        setError("Location access is not supported by your browser. Use a modern browser (Chrome/Safari).");
        return;
      }
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000, enableHighAccuracy: false })
        );
        locPayload = {
          lat:  pos.coords.latitude,
          lng:  pos.coords.longitude,
          addr: `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`,
        };
      } catch {
        setLoading(false);
        setError("Location permission is required to log in. Tap 'Allow' when the browser asks, then try again.");
        return;
      }

      const { data } = await staffLogin({ user_id: userId.trim(), password, ...locPayload });
      if (data.requires_verification) {
        navigate(
          `/login/staff/verify?email=${encodeURIComponent(data.email)}`,
          { state: { dev_otp: data.dev_otp || "" } }
        );
        return;
      }
      login(data.user, data.tokens);
      navigate("/staff/queue");
    } catch (err) {
      setError(err.response?.data?.errors?.error?.[0] || err.response?.data?.error || "Invalid credentials. Check your User ID and password.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <InjectStyles />
      {loading && <KNCLoader visible label="Signing in…" />}

      <div className="auth-page" data-theme={isDark ? "dark" : undefined}>
        <div className="auth-blob" />
        <div className="auth-blob-2" />

        <div className="auth-card">
          <BrandMark suffix="Staff" />

          <h1 className="auth-heading">Staff sign in</h1>
          <p className="auth-sub">Enter your staff User ID and password to access the portal.</p>

          <form onSubmit={handle} noValidate>
            <Field
              label="User ID"
              icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            >
              <input
                type="text"
                className="field-input"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="e.g. STAFF001"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
              />
            </Field>

            <Field
              label="Password"
              icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
            >
              <input
                type={showPw ? "text" : "password"}
                className="field-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <EyeToggle show={showPw} onToggle={() => setShowPw(v => !v)} />
            </Field>

            <div className="forgot-row">
              <Link to="/login/staff/forgot" className="forgot-link">Forgot password?</Link>
            </div>

            <ErrorBox msg={error} />

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><span className="spin">⟳</span> Signing in…</> : <>Sign in <span style={{ fontSize: "1.1em" }}>→</span></>}
            </button>
          </form>

          <div className="notice-banner">
            <p className="notice-text"><strong>New account?</strong> Verify your email first.</p>
            <Link to="/login/staff/verify" className="notice-link">Verify →</Link>
          </div>

          <div className="auth-footer">
            <Link to="/login/customer" className="auth-link">Customer login</Link>
            <Link to="/login/admin" className="auth-link-brand">Admin portal →</Link>
          </div>

          <div className="theme-toggle">
            <button onClick={toggle} className="theme-btn">
              {isDark ? "☀ Light mode" : "☾ Dark mode"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ADMIN LOGIN
══════════════════════════════════════════════════════════════════════ */
export function AdminLogin() {
  const navigate   = useNavigate();
  const { login }  = useAuth();
  const { isDark, toggle } = useTheme();

  const [role,     setRole]     = useState("branch_admin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handle = async e => {
    e.preventDefault();
    if (!email.trim())                              { setError("Enter your email");                      return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address"); return; }
    if (!password)                                  { setError("Enter your password");                  return; }
    if (password.length < 6)                        { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    try {
      let locPayload = {};
      if (role === "branch_admin") {
        // Branch admin MUST provide location
        if (!navigator.geolocation) {
          setLoading(false);
          setError("Location access is not supported by your browser. Use a modern browser (Chrome/Safari).");
          return;
        }
        try {
          const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000, enableHighAccuracy: false })
          );
          locPayload = {
            lat:  pos.coords.latitude,
            lng:  pos.coords.longitude,
            addr: `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`,
          };
        } catch {
          setLoading(false);
          setError("Location permission is required for Branch Admin login. Tap 'Allow' when the browser asks, then try again.");
          return;
        }
      } else {
        // Super admin — location optional
        try {
          const pos = await new Promise((res, rej) =>
            navigator.geolocation?.getCurrentPosition(res, rej, { timeout: 4000 })
          );
          locPayload = {
            lat:  pos.coords.latitude,
            lng:  pos.coords.longitude,
            addr: `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`,
          };
        } catch {}
      }
      const { data } = await adminLogin({ email: email.trim().toLowerCase(), password, ...locPayload });
      const actualRole = data.user.role;
      if (actualRole !== role) {
        setError(`This account is a ${actualRole.replace("_", " ")}. Please select the correct role.`);
        return;
      }
      login(data.user, data.tokens);
      navigate(role === "super_admin" ? "/superadmin/dashboard" : "/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally { setLoading(false); }
  };

  const ROLES = [
    {
      key: "branch_admin",
      label: "Branch Admin",
      desc: "Manage one location",
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      key: "super_admin",
      label: "Super Admin",
      desc: "All branches",
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    },
  ];

  return (
    <>
      <InjectStyles />
      {loading && <KNCLoader visible label="Signing in…" />}

      <div className="auth-page" data-theme={isDark ? "dark" : undefined}>
        <div className="auth-blob" />
        <div className="auth-blob-2" />

        <div className="auth-card">
          <BrandMark suffix="Admin" />

          <h1 className="auth-heading">Admin sign in</h1>
          <p className="auth-sub">Select your role then sign in to continue.</p>

          {/* Role selector */}
          <div className="role-grid" role="group" aria-label="Select role">
            {ROLES.map(r => (
              <button
                key={r.key}
                type="button"
                className={`role-card${role === r.key ? " active" : ""}`}
                onClick={() => setRole(r.key)}
                aria-pressed={role === r.key}
              >
                <div className="role-card-icon">{r.icon}</div>
                <div className="role-card-label">{r.label}</div>
                <div className="role-card-desc">{r.desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handle} noValidate>
            <Field
              label="Email address"
              icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            >
              <input
                type="email"
                className="field-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@knfc.com"
                autoFocus
                autoComplete="email"
              />
            </Field>

            <Field
              label="Password"
              icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
            >
              <input
                type={showPw ? "text" : "password"}
                className="field-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <EyeToggle show={showPw} onToggle={() => setShowPw(v => !v)} />
            </Field>

            <ErrorBox msg={error} />

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><span className="spin">⟳</span> Signing in…</> : <>Sign in <span style={{ fontSize: "1.1em" }}>→</span></>}
            </button>
          </form>

          <div style={{ textAlign:"center", marginTop:"12px" }}>
            <Link to="/login/admin/forgot" className="forgot-link">Forgot password?</Link>
          </div>

          <div className="auth-footer">
            <Link to="/login/customer" className="auth-link">Customer login</Link>
            <Link to="/login/staff" className="auth-link-brand">Staff portal →</Link>
          </div>

          <div className="theme-toggle">
            <button onClick={toggle} className="theme-btn">
              {isDark ? "☀ Light mode" : "☾ Dark mode"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default StaffLogin;

/* ── AdminForgotPassword ──────────────────────────────────────── */
export function AdminForgotPassword() {
  const navigate   = useNavigate();
  const [step,     setStep]    = useState("email"); // email | otp | done
  const [email,    setEmail]   = useState("");
  const [otp,      setOtp]     = useState(["","","","","",""]);
  const [newPass,  setNewPass] = useState("");
  const [confirm,  setConfirm] = useState("");
  const [showPw,   setShowPw]  = useState(false);
  const [loading,  setLoading] = useState(false);
  const [sending,  setSending] = useState(false);
  const [error,    setError]   = useState("");
  const { isDark, toggle }     = useTheme();
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  const sendOTP = async e => {
    e.preventDefault();
    if (!email.trim()) { setError("Enter your admin email"); return; }
    setLoading(true); setError("");
    try {
      const { default: ax } = await import("../../api/axiosClient");
      await ax.post("/auth/admin/forgot-password/", { email: email.trim() });
      setStep("otp");
      setTimeout(() => otpRefs[0].current?.focus(), 120);
    } catch { setError("Could not send OTP. Check the email and try again."); }
    finally { setLoading(false); }
  };

  const resendOTP = async () => {
    setSending(true);
    try {
      const { default: ax } = await import("../../api/axiosClient");
      await ax.post("/auth/admin/forgot-password/", { email: email.trim() });
    } catch {}
    finally { setSending(false); }
  };

  const resetPass = async e => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6)    { setError("Enter the 6-digit code"); return; }
    if (!newPass)            { setError("Enter a new password"); return; }
    if (newPass.length < 8)  { setError("Password must be at least 8 characters"); return; }
    if (newPass !== confirm)  { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    try {
      const { default: ax } = await import("../../api/axiosClient");
      await ax.post("/auth/admin/reset-password/", { email, otp: code, new_password: newPass });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired OTP.");
      setOtp(["","","","","",""]);
      setTimeout(() => otpRefs[0].current?.focus(), 50);
    }
    finally { setLoading(false); }
  };

  const handleOtpChange = (i, e) => {
    const val = e.target.value.replace(/\D/g,"").slice(0,1);
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) otpRefs[i+1].current?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs[i-1].current?.focus();
  };
  const handleOtpPaste = (e) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6).split("");
    if (digits.length) { setOtp([...digits,...Array(6-digits.length).fill("")]); otpRefs[Math.min(digits.length,5)].current?.focus(); }
    e.preventDefault();
  };

  const digitStyle = (filled) => ({
    width:"44px", height:"54px", textAlign:"center",
    fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:800,
    background:"var(--bg)", border:`2px solid ${filled?"var(--brand)":"var(--bd2)"}`,
    borderRadius:"var(--r3)", color:"var(--t1)", outline:"none",
    transition:"border-color var(--d1) var(--ease)",
    boxShadow: filled ? "0 0 0 3px rgba(200,90,26,.1)" : "none",
  });

  const pwChecks = [
    { ok: newPass.length >= 8 },
    { ok: /[A-Z]/.test(newPass) },
    { ok: /[a-z]/.test(newPass) },
    { ok: /[\d!@#$%^&*]/.test(newPass) },
  ];
  const pwScore  = pwChecks.filter(c => c.ok).length;
  const pwColors = ["","var(--err)","#E8A01A","#8BC34A","#1D9E75"];

  return (
    <>
      <InjectStyles />
      <div className="auth-page" data-theme={isDark ? "dark" : undefined}>
        <div className="auth-blob" />
        <div className="auth-blob-2" />

        <div className="auth-card">
          <BrandMark suffix="Admin" />

          {step === "done" ? (
            <div style={{ textAlign:"center", padding:"8px 0 4px" }}>
              <div style={{ width:"56px", height:"56px", borderRadius:"50%", background:"rgba(29,158,117,.1)", border:"1.5px solid rgba(29,158,117,.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#1D9E75" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h2 className="auth-heading" style={{ fontSize:"1.625rem" }}>Password reset!</h2>
              <p className="auth-sub">Your password has been updated. You can now sign in.</p>
              <button onClick={() => navigate("/login/admin")} className="btn-primary">
                Go to admin login →
              </button>
            </div>

          ) : step === "otp" ? (
            <>
              <h2 className="auth-heading">Check your email</h2>
              <p className="auth-sub">
                We sent a 6-digit code to <strong style={{ color:"var(--t1)" }}>{email}</strong>. Enter it below and set your new password.
              </p>
              <form onSubmit={resetPass}>
                <ErrorBox msg={error} />

                <label className="field-label">6-digit code from email</label>
                <div style={{ display:"flex", gap:"8px", justifyContent:"center", marginBottom:"6px" }}>
                  {otp.map((d,i) => (
                    <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handleOtpChange(i,e)} onKeyDown={e => handleOtpKeyDown(i,e)} onPaste={handleOtpPaste}
                      autoFocus={i===0} style={digitStyle(!!d)} />
                  ))}
                </div>
                <button type="button" onClick={resendOTP} disabled={sending}
                  style={{ display:"block", margin:"0 auto 20px", background:"none", border:"none", color:"var(--brand)", fontWeight:600, fontSize:".8125rem", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
                  {sending ? "Sending…" : "Resend code"}
                </button>

                <label className="field-label">New password</label>
                <div className="field-wrap" style={{ marginBottom:"4px" }}>
                  <span className="field-icon">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </span>
                  <input type={showPw?"text":"password"} value={newPass} onChange={e => setNewPass(e.target.value)}
                    placeholder="Min. 8 characters" className="field-input" />
                  <EyeToggle show={showPw} onToggle={() => setShowPw(v=>!v)} />
                </div>
                {newPass && (
                  <div style={{ display:"flex", gap:"3px", marginBottom:"16px" }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex:1, height:"3px", borderRadius:"2px", background: i<=pwScore ? pwColors[pwScore] : "var(--bd)", transition:"background .3s" }}/>
                    ))}
                  </div>
                )}

                <label className="field-label">Confirm new password</label>
                <div className="field-wrap">
                  <span className="field-icon">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </span>
                  <input type={showPw?"text":"password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password" className="field-input" />
                </div>
                {confirm && newPass !== confirm && (
                  <p style={{ fontSize:".75rem", color:"var(--err)", marginTop:"-10px", marginBottom:"14px" }}>Passwords don't match</p>
                )}

                <button type="submit" disabled={loading || !!(confirm && newPass !== confirm)} className="btn-primary">
                  {loading ? <><span className="spin">⟳</span> Resetting…</> : "Reset password →"}
                </button>
              </form>
            </>

          ) : (
            <>
              <h2 className="auth-heading">Forgot password?</h2>
              <p className="auth-sub">Enter your admin email — we'll send a one-time reset code.</p>
              <form onSubmit={sendOTP}>
                <ErrorBox msg={error} />
                <Field label="Admin email"
                  icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                    placeholder="admin@knfc.in" className="field-input" autoFocus />
                </Field>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <><span className="spin">⟳</span> Sending code…</> : "Send reset code →"}
                </button>
              </form>
            </>
          )}

          <div className="auth-footer">
            <Link to="/login/admin" className="auth-link">← Back to admin login</Link>
            <button onClick={toggle} className="theme-btn">{isDark ? "☀ Light" : "☾ Dark"}</button>
          </div>
        </div>
      </div>
    </>
  );
}
