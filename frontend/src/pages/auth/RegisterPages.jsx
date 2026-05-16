/**
 * RegisterPages.jsx
 *
 * ALL imports at top — no mid-file imports.
 *
 * Exports:
 *   StaffRegisterPage        — BranchAdmin/SuperAdmin creates a new staff
 *   BranchAdminRegisterPage  — SuperAdmin creates a new Branch Admin
 *   StaffVerifyEmailPage     — Staff activates account via OTP email
 *   ForgotPasswordPage       — Staff/Admin requests password reset OTP
 *   ResetPasswordPage        — Staff/Admin sets new password via OTP
 *
 * Backend endpoints used:
 *   POST /auth/admin/staff/            { name, email, user_id_login, password, mobile?, branch_id? }
 *   POST /auth/admin/branch-admins/    { name, email, password, branch_id }
 *   POST /auth/staff/verify-email/     { email, otp }
 *   POST /auth/staff/forgot-password/  { email }
 *   POST /auth/staff/reset-password/   { email, otp, new_password }
 *   GET  /branches/                    { branches: [...] }
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { gsap }                           from "gsap";
import { useAuth }                        from "../../context/AuthContext";
import KNCLoader                          from "../../components/common/KNCLoader";
import useTheme                           from "../../hooks/useTheme";
import {
  createStaff,
  createBranchAdmin,
  getBranches,
  staffVerifyEmail,
  staffResendOTP,
  staffForgotPassword,
  staffResetPassword,
} from "../../api/auth";
import "../../styles/global.css";

/* ── Shared UI primitives ─────────────────────────────────────────────── */

function FieldLabel({ children, required }) {
  return (
    <label style={{ display:"block", fontSize:".75rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s1)" }}>
      {children}
      {required && <span style={{ color:"var(--err)", marginLeft:"3px" }}>*</span>}
    </label>
  );
}

function InputGroup({ icon, children, error }) {
  return (
    <div className={`input-wrap${error ? " err" : ""}`} style={{ marginBottom: error ? "var(--s1)" : "var(--s4)" }}>
      {icon && <span style={{ color:"var(--t3)", display:"flex", flexShrink:0 }}>{icon}</span>}
      {children}
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p style={{ fontSize:".75rem", color:"var(--err)", marginBottom:"var(--s3)", marginTop:"-var(--s1)", paddingLeft:"var(--s1)" }}>
      {message}
    </p>
  );
}

function AlertBox({ type = "error", children }) {
  const styles = {
    error:   { bg:"var(--err-t)",  bd:"rgba(226,75,74,.25)",  txt:"var(--err)"  },
    success: { bg:"var(--ok-t)",   bd:"rgba(29,158,117,.25)", txt:"var(--ok)"   },
    info:    { bg:"var(--info-t)", bd:"rgba(55,138,221,.25)", txt:"var(--info)" },
  }[type];
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:"var(--s2)", padding:"var(--s3)", background:styles.bg, border:`1px solid ${styles.bd}`, borderRadius:"var(--r3)", fontSize:".875rem", color:styles.txt, marginBottom:"var(--s4)" }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:"1px" }}>
        {type === "success"
          ? <><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></>
          : <><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></>
        }
      </svg>
      <span>{children}</span>
    </div>
  );
}

function EyeBtn({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t3)", display:"flex", padding:"4px" }}>
      {show
        ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
      }
    </button>
  );
}

/* Password strength meter */
function PasswordStrength({ password }) {
  if (!password) return null;

  const checks = [
    { label:"8+ characters",     ok: password.length >= 8 },
    { label:"Uppercase letter",   ok: /[A-Z]/.test(password) },
    { label:"Lowercase letter",   ok: /[a-z]/.test(password) },
    { label:"Number or symbol",   ok: /[\d!@#$%^&*]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["","var(--err)","var(--warn)","var(--gold)","var(--ok)"];
  const labels = ["","Weak","Fair","Good","Strong"];
  return (
    <div style={{ marginBottom:"var(--s4)" }}>
      <div style={{ display:"flex", gap:"3px", marginBottom:"5px" }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex:1, height:"3px", borderRadius:"2px", background: i <= score ? colors[score] : "var(--bd)", transition:"background .3s" }}/>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"var(--s1)" }}>
          {checks.map(c => (
            <span key={c.label} style={{ fontSize:".6875rem", color: c.ok ? "var(--ok)" : "var(--t4)", display:"flex", alignItems:"center", gap:"2px" }}>
              {c.ok ? "✓" : "○"} {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span style={{ fontSize:".75rem", fontWeight:700, color:colors[score], flexShrink:0 }}>
            {labels[score]}
          </span>
        )}
      </div>
    </div>
  );
}

/* Page wrapper — full-screen centered form */
function PageShell({ title, subtitle, backTo, backLabel, icon, children }) {
  const formRef = useRef(null);
  const { isDark, toggle } = useTheme();

  useEffect(() => {
    if (!formRef.current || typeof gsap === "undefined") return;
    gsap.fromTo(formRef.current, { opacity:0, y:20 }, { opacity:1, y:0, duration:.5, ease:"power3.out", delay:.05 });
  }, []);

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--bg)", alignItems:"center", justifyContent:"center", padding:"var(--s4) var(--s3)", backgroundImage:"radial-gradient(ellipse at 50% 0%, rgba(232,82,26,.1) 0%, transparent 55%)" }}>
      <div ref={formRef} style={{ width:"100%", maxWidth:"480px" }}>

        {/* Back link */}
        {backTo && (
          <Link to={backTo} style={{ display:"inline-flex", alignItems:"center", gap:"var(--s2)", fontSize:".875rem", color:"var(--t3)", marginBottom:"var(--s5)", transition:"color var(--d1) var(--ease)", fontWeight:500 }}
            onMouseEnter={e => e.currentTarget.style.color="var(--brand)"}
            onMouseLeave={e => e.currentTarget.style.color="var(--t3)"}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {backLabel || "Back"}
          </Link>
        )}

        {/* Card */}
        <div className="card" style={{ padding:"clamp(var(--s4),4vw,var(--s6))", borderRadius:"var(--r5)", boxShadow:"var(--sh-lg)" }}>
          {/* Icon + Title */}
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", marginBottom:"var(--s2)" }}>
            <div style={{ width:"48px", height:"48px", borderRadius:"var(--r3)", background:"linear-gradient(135deg,var(--brand),var(--brand-d))", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"#fff", boxShadow:"var(--sh-br)" }}>
              {icon}
            </div>
            <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"1.625rem", fontWeight:900, letterSpacing:"-.025em" }}>
              {title}
            </h1>
          </div>
          {subtitle && (
            <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s6)", lineHeight:1.6, paddingLeft:"60px" }}>
              {subtitle}
            </p>
          )}

          {children}
        </div>

        <div style={{ display:"flex", justifyContent:"center", marginTop:"var(--s4)" }}>
          <button onClick={toggle} style={{ background:"none", border:"none", cursor:"pointer", fontSize:".8125rem", color:"var(--t4)", fontFamily:"var(--ff-b)" }}>
            {isDark ? "☀ Light mode" : "☾ Dark mode"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STAFF REGISTER PAGE
   Access: BranchAdmin or SuperAdmin
   Endpoint: POST /auth/admin/staff/
   Fields: name, email, user_id_login, password, mobile (optional)
   SuperAdmin must also pick branch_id
══════════════════════════════════════════════════════════════════════════ */
export function StaffRegisterPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const isSuperAdmin = user?.role === "super_admin";

  const [form, setForm]     = useState({
    name: "", email: "", user_id_login: "", password: "", mobile: "", branch_id: "",
  });

  const [branches, setBranches] = useState([]);
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(isSuperAdmin);
  const [errors,   setErrors]   = useState({});
  const [success,  setSuccess]  = useState(null); // { name, email, user_id_login }
  const [apiError, setApiError] = useState("");

  /* Load branches for SuperAdmin */
  useEffect(() => {
    if (!isSuperAdmin) return;
    setFetching(true);
    getBranches()
      .then(res => setBranches(res.data.branches || []))
      .catch(() => setApiError("Failed to load branches."))
      .finally(() => setFetching(false));
  }, [isSuperAdmin]);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: "" }));
  };

  /* Client-side validation */
  const validate = () => {
    const e = {};
    if (!form.name.trim())                        e.name          = "Name is required";
    else if (form.name.trim().length < 2)         e.name          = "Name must be at least 2 characters";
    else if (/\d/.test(form.name))                e.name          = "Name should not contain numbers";
    if (!form.email.trim())                       e.email         = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (!form.user_id_login.trim())               e.user_id_login = "User ID is required";
    else if (form.user_id_login.length < 4)       e.user_id_login = "User ID must be at least 4 characters";
    else if (!/^[A-Z0-9_]+$/.test(form.user_id_login)) e.user_id_login = "Only letters, numbers and underscores allowed";
    if (form.mobile.trim() && !/^\+?\d{7,15}$/.test(form.mobile.trim().replace(/\s/g, "")))
                                                  e.mobile        = "Enter a valid mobile number (7–15 digits)";
    if (!form.password)                           e.password      = "Password is required";
    else if (form.password.length < 8)            e.password      = "Password must be at least 8 characters";
    if (isSuperAdmin && !form.branch_id)          e.branch_id     = "Select a branch";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }

    setApiError(""); setLoading(true);
    try {
      const payload = {
        name:          form.name.trim(),
        email:         form.email.trim().toLowerCase(),
        user_id_login: form.user_id_login.trim().toUpperCase(),
        password:      form.password,
      };
      if (form.mobile.trim()) payload.mobile    = form.mobile.trim();
      if (isSuperAdmin)       payload.branch_id = form.branch_id;

      await createStaff(payload);
      setSuccess({
        name:          payload.name,
        email:         payload.email,
        user_id_login: payload.user_id_login,
        branch:        isSuperAdmin
          ? branches.find(b => b.id === form.branch_id)?.name
          : user?.branch_name,
      });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        // Map backend field errors to our form fields
        const mapped = {};
        Object.entries(data.errors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(mapped);
      } else {
        setApiError(data?.error || "Failed to create staff account. Please try again.");
      }
    } finally { setLoading(false); }
  };

  /* Success state */
  if (success) {
    return (
      <PageShell
        title="Account created"
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
        backTo="/admin/staff"
        backLabel="Back to staff"
      >
        <div style={{ textAlign:"center", padding:"var(--s6) 0" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"var(--ok-t)", border:"1.5px solid rgba(29,158,117,.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s4)" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:700, marginBottom:"var(--s2)" }}>
            {success.name} added
          </h2>
          <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)", lineHeight:1.6 }}>
            When <strong style={{ color:"var(--t1)" }}>{success.name}</strong> first tries to log in with the User ID and temporary password, a verification code will be sent to <strong style={{ color:"var(--t1)" }}>{success.email}</strong>. They'll set their own password during that step.
          </p>
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s4)", textAlign:"left", marginBottom:"var(--s5)" }}>
            <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s3)" }}>
              Account details
            </div>
            {[
              ["Name",     success.name],
              ["Email",    success.email],
              ["User ID",  success.user_id_login],
              ["Branch",   success.branch || "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"var(--s2) 0", borderBottom:"1px solid var(--bd)", fontSize:".875rem" }}>
                <span style={{ color:"var(--t3)" }}>{label}</span>
                <span style={{ fontWeight:600, color:"var(--t1)" }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"var(--s2)" }}>
            <button onClick={() => { setSuccess(null); setForm({ name:"", email:"", user_id_login:"", password:"", mobile:"", branch_id:"" }); setErrors({}); }} className="btn btn-s" style={{ flex:1 }}>
              Add another staff
            </button>
            <button onClick={() => navigate("/admin/staff")} className="btn btn-p" style={{ flex:1 }}>
              View staff list
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Add staff member"
      subtitle={`Create a staff account for ${isSuperAdmin ? "any branch" : "your branch"}. They'll receive a verification email to activate their account.`}
      icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
      backTo={isSuperAdmin ? "/superadmin/dashboard" : "/admin/staff"}
      backLabel="Back"
    >
      {fetching ? (
        <div style={{ textAlign:"center", padding:"var(--s8)", color:"var(--t3)" }}>
          <div className="spin" style={{ display:"inline-block", fontSize:"1.5rem" }}>⟳</div>
          <p style={{ marginTop:"var(--s3)", fontSize:".875rem" }}>Loading branches…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {apiError && <AlertBox type="error">{apiError}</AlertBox>}

          {/* Name */}
          <FieldLabel required>Full name</FieldLabel>
          <InputGroup
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            error={errors.name}
          >
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Arun Kumar" className="input-field" autoFocus />
          </InputGroup>
          <FieldError message={errors.name} />

          {/* Email */}
          <FieldLabel required>Email address</FieldLabel>
          <InputGroup
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            error={errors.email}
          >
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
              placeholder="staff@knfc.com" className="input-field" autoComplete="off" />
          </InputGroup>
          <FieldError message={errors.email} />

          {/* User ID */}
          <FieldLabel required>User ID (login identifier)</FieldLabel>
          <InputGroup
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h8" strokeLinecap="round"/></svg>}
            error={errors.user_id_login}
          >
            <input type="text" value={form.user_id_login} onChange={e => set("user_id_login", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g,""))}
              placeholder="e.g. STAFF002" className="input-field" autoCapitalize="characters" autoCorrect="off" />
          </InputGroup>
          <FieldError message={errors.user_id_login} />
          <p style={{ fontSize:".75rem", color:"var(--t4)", marginBottom:"var(--s4)", marginTop:"-8px" }}>
            Staff will use this ID to log in — letters, numbers, underscores only.
          </p>

          {/* Mobile (optional) */}
          <FieldLabel>Mobile number <span style={{ color:"var(--t4)", fontWeight:400, textTransform:"none", fontSize:".75rem" }}>(optional)</span></FieldLabel>
          <InputGroup
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg>}
            error={errors.mobile}
          >
            <input type="tel" value={form.mobile} onChange={e => set("mobile", e.target.value)}
              placeholder="+91 98765 43210" className="input-field" />
          </InputGroup>
          <FieldError message={errors.mobile} />

          {/* Branch — SuperAdmin only */}
          {isSuperAdmin && (
            <>
              <FieldLabel required>Branch</FieldLabel>
              <div className={`input-wrap${errors.branch_id ? " err" : ""}`} style={{ marginBottom: errors.branch_id ? "var(--s1)" : "var(--s4)" }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)}
                  style={{ flex:1, border:"none", background:"transparent", color: form.branch_id ? "var(--t1)" : "var(--t4)", fontSize:".9375rem", outline:"none", padding:"0 var(--s2)", fontFamily:"var(--ff-b)", cursor:"pointer" }}>
                  <option value="">Select a branch…</option>
                  {branches.filter(b => b.is_active).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <FieldError message={errors.branch_id} />
            </>
          )}

          {/* Password */}
          <FieldLabel required>Password</FieldLabel>
          <InputGroup
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
            error={errors.password}
          >
            <input type={showPw ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)}
              placeholder="Min. 8 characters" className="input-field" />
            <EyeBtn show={showPw} onToggle={() => setShowPw(v => !v)} />
          </InputGroup>
          <FieldError message={errors.password} />
          <PasswordStrength password={form.password} />

          {/* Info note */}
          <div style={{ display:"flex", gap:"var(--s2)", padding:"var(--s3)", background:"var(--info-t)", border:"1px solid rgba(55,138,221,.2)", borderRadius:"var(--r3)", fontSize:".8125rem", color:"var(--info)", marginBottom:"var(--s5)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:"1px" }}>
              <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
            </svg>
            A verification email will be sent to the staff member. They must verify before logging in.
          </div>

          <button type="submit" disabled={loading} className="btn btn-p btn-xl btn-full">
            {loading ? <><span className="spin">⟳</span> Creating account…</> : "Create staff account →"}
          </button>
        </form>
      )}
    </PageShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   BRANCH ADMIN REGISTER PAGE
   Access: SuperAdmin only
   Endpoint: POST /auth/admin/branch-admins/
   Fields: name, email, password, branch_id (from GET /branches/)
══════════════════════════════════════════════════════════════════════════ */
export function BranchAdminRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Guard — only SuperAdmin
  if (user && user.role !== "super_admin") {
    return (
      <PageShell title="Access denied" icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} backTo="/superadmin/dashboard" backLabel="Dashboard">
        <AlertBox type="error">Only Super Admins can create Branch Admin accounts.</AlertBox>
      </PageShell>
    );
  }

  const [form, setForm]     = useState({ name:"", email:"", branch_id:"" });
  const [showPw,   setShowPw]   = useState(false);
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors,   setErrors]   = useState({});
  const [success,  setSuccess]  = useState(null);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    getBranches()
      .then(res => setBranches(res.data.branches || []))
      .catch(() => setApiError("Failed to load branches."))
      .finally(() => setFetching(false));
  }, []);

  const set = (field, val) => { setForm(f => ({...f,[field]:val})); setErrors(e => ({...e,[field]:""})); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                        e.name      = "Name is required";
    else if (form.name.trim().length < 2)         e.name      = "Name must be at least 2 characters";
    else if (/\d/.test(form.name))                e.name      = "Name should not contain numbers";
    if (!form.email.trim())                       e.email     = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (!form.branch_id)                          e.branch_id = "Select a branch";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fe = validate();
    if (Object.keys(fe).length > 0) { setErrors(fe); return; }

    setApiError(""); setLoading(true);
    try {
      const payload = {
        name:      form.name.trim(),
        email:     form.email.trim().toLowerCase(),
        branch_id: form.branch_id,
      };
      await createBranchAdmin(payload);
      const branch = branches.find(b => b.id === form.branch_id);
      setSuccess({ name: payload.name, email: payload.email, branch: branch?.name });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const mapped = {};
        Object.entries(data.errors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(mapped);
      } else {
        setApiError(data?.error || "Failed to create Branch Admin. Please try again.");
      }
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <PageShell title="Branch Admin created" icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>} backTo="/superadmin/dashboard" backLabel="Dashboard">
        <div style={{ textAlign:"center", padding:"var(--s6) 0" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"var(--ok-t)", border:"1.5px solid rgba(29,158,117,.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s4)" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:700, marginBottom:"var(--s2)" }}>
            {success.name} is now a Branch Admin
          </h2>
          <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)", lineHeight:1.6 }}>
            A welcome email has been sent to <strong style={{ color:"var(--t1)" }}>{success.email}</strong> with login instructions.
          </p>
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s4)", textAlign:"left", marginBottom:"var(--s5)" }}>
            <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s3)" }}>Account details</div>
            {[["Name",success.name],["Email",success.email],["Branch",success.branch||"—"],["Role","Branch Admin"]].map(([l,v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"var(--s2) 0", borderBottom:"1px solid var(--bd)", fontSize:".875rem" }}>
                <span style={{ color:"var(--t3)" }}>{l}</span>
                <span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"var(--s2)" }}>
            <button onClick={() => { setSuccess(null); setForm({name:"",email:"",password:"",branch_id:""}); setErrors({}); }} className="btn btn-s" style={{ flex:1 }}>Add another</button>
            <button onClick={() => navigate("/superadmin/dashboard")} className="btn btn-p" style={{ flex:1 }}>Dashboard →</button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Add Branch Admin"
      subtitle="Create a Branch Admin account and assign them to a branch. A welcome email with login instructions will be sent automatically."
      icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
      backTo="/superadmin/dashboard"
      backLabel="Dashboard"
    >
      {fetching ? (
        <div style={{ textAlign:"center", padding:"var(--s8)", color:"var(--t3)" }}>
          <div className="spin" style={{ display:"inline-block", fontSize:"1.5rem" }}>⟳</div>
          <p style={{ marginTop:"var(--s3)", fontSize:".875rem" }}>Loading branches…</p>
        </div>
      ) : branches.length === 0 ? (
        <div style={{ textAlign:"center", padding:"var(--s8)" }}>
          <AlertBox type="info">No branches exist yet. Create a branch first from the Super Admin dashboard.</AlertBox>
          <button onClick={() => navigate("/superadmin/branches/create")} className="btn btn-p btn-lg">Create a branch →</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {apiError && <AlertBox type="error">{apiError}</AlertBox>}

          {/* Branch selector — shown first because it's the most important context */}
          <FieldLabel required>Assign to branch</FieldLabel>
          <div className={`input-wrap${errors.branch_id ? " err" : ""}`} style={{ marginBottom: errors.branch_id ? "var(--s1)" : "var(--s4)" }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)}
              style={{ flex:1, border:"none", background:"transparent", color: form.branch_id?"var(--t1)":"var(--t4)", fontSize:".9375rem", outline:"none", padding:"0 var(--s2)", fontFamily:"var(--ff-b)", cursor:"pointer" }}>
              <option value="">Choose a branch…</option>
              {branches.filter(b => b.is_active).map(b => (
                <option key={b.id} value={b.id}>{b.name} — {b.address?.split(",")[0] || ""}</option>
              ))}
            </select>
          </div>
          <FieldError message={errors.branch_id} />

          {/* Branch details preview */}
          {form.branch_id && (() => {
            const b = branches.find(x => x.id === form.branch_id);
            return b ? (
              <div style={{ padding:"var(--s3)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", marginBottom:"var(--s4)", fontSize:".875rem" }}>
                <div style={{ fontWeight:700, marginBottom:"3px" }}>{b.name}</div>
                <div style={{ color:"var(--t3)" }}>{b.address}</div>
                {b.phone && <div style={{ color:"var(--t3)", marginTop:"2px" }}>{b.phone}</div>}
              </div>
            ) : null;
          })()}

          {/* Name */}
          <FieldLabel required>Full name</FieldLabel>
          <InputGroup icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} error={errors.name}>
            <input type="text" value={form.name} onChange={e => set("name",e.target.value)} placeholder="e.g. Priya Sharma" className="input-field" autoFocus />
          </InputGroup>
          <FieldError message={errors.name} />

          {/* Email */}
          <FieldLabel required>Email address</FieldLabel>
          <InputGroup icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>} error={errors.email}>
            <input type="email" value={form.email} onChange={e => set("email",e.target.value)} placeholder="admin@branch.com" className="input-field" autoComplete="off" />
          </InputGroup>
          <FieldError message={errors.email} />

          {/* Password */}
          <FieldLabel required>Temporary password</FieldLabel>
          <InputGroup icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>} error={errors.password}>
            <input type={showPw?"text":"password"} value={form.password} onChange={e => set("password",e.target.value)} placeholder="Min. 8 characters" className="input-field" />
            <EyeBtn show={showPw} onToggle={() => setShowPw(v=>!v)} />
          </InputGroup>
          <FieldError message={errors.password} />
          <PasswordStrength password={form.password} />

          <div style={{ display:"flex", gap:"var(--s2)", padding:"var(--s3)", background:"var(--info-t)", border:"1px solid rgba(55,138,221,.2)", borderRadius:"var(--r3)", fontSize:".8125rem", color:"var(--info)", marginBottom:"var(--s5)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:"1px" }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
            The Branch Admin will receive a welcome email with these credentials and a prompt to change their password.
          </div>

          <button type="submit" disabled={loading} className="btn btn-p btn-xl btn-full">
            {loading ? <><span className="spin">⟳</span> Creating account…</> : "Create Branch Admin →"}
          </button>
        </form>
      )}
    </PageShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STAFF VERIFY EMAIL PAGE
   Endpoint: POST /auth/staff/verify-email/ { email, otp, new_password }
   Step 1: Enter email → send OTP
   Step 2: Enter OTP + set your own password (combined in one submit)
   Step 3: Success → go to login
══════════════════════════════════════════════════════════════════════════ */
export function StaffVerifyEmailPage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const urlEmail    = new URLSearchParams(location.search).get("email") || "";

  const [email,     setEmail]     = useState(urlEmail);
  const [otp,       setOtp]       = useState(["","","","","",""]);
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [step,      setStep]      = useState(urlEmail ? "otp" : "email"); // email | otp | done
  const [loading,   setLoading]   = useState(false);
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    if (!email.trim()) { setError("Enter your email address"); return; }
    setError(""); setResendMsg(""); setSending(true);
    try {
      await staffResendOTP(email.trim().toLowerCase());
      setStep("otp");
      setResendMsg("Code sent! Check your email inbox.");
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      const msg = err.response?.data?.error || "";
      if (msg.toLowerCase().includes("please wait")) {
        setStep("otp");
        setResendMsg("You already have an active code. Enter it below.");
      } else {
        setError(msg || "Could not send code. Try again.");
      }
    } finally { setSending(false); }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const code = otp.join("");
    if (!email)           { setError("Enter your email address"); return; }
    if (code.length < 6)  { setError("Enter the 6-digit code");  return; }
    if (!password)        { setError("Set your password to continue"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }

    setError(""); setLoading(true);
    try {
      await staffVerifyEmail({ email: email.trim().toLowerCase(), otp: code, new_password: password });
      setStep("done");
    } catch (err) {
      const msg = err.response?.data?.error || "Invalid or expired code. Please request a new one.";
      setError(msg);
      setOtp(["","","","","",""]);
      setTimeout(() => otpRefs[0].current?.focus(), 50);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResendMsg(""); setSending(true);
    try {
      await staffResendOTP(email.trim().toLowerCase());
      setResendMsg("New code sent! Check your inbox.");
    } catch (err) {
      const msg = err.response?.data?.error || "";
      setResendMsg(msg.includes("wait") ? msg : "Could not resend. Try again shortly.");
    } finally { setSending(false); }
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

  /* ── Success ── */
  if (step === "done") {
    return (
      <PageShell title="Account activated!" icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}>
        <div style={{ textAlign:"center", padding:"var(--s6) 0" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"var(--ok-t)", border:"1.5px solid rgba(29,158,117,.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s4)" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:700, marginBottom:"var(--s2)" }}>You're all set!</h2>
          <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)", lineHeight:1.6 }}>
            Your email is verified and your password is set. Sign in with your User ID and the password you just created.
          </p>
          <button onClick={() => navigate("/login/staff")} className="btn btn-p btn-lg btn-full">
            Go to staff login →
          </button>
        </div>
      </PageShell>
    );
  }

  /* ── OTP + Set Password step ── */
  if (step === "otp") {
    return (
      <PageShell
        title="Verify & set password"
        subtitle={`Enter the 6-digit code sent to ${email} and choose your login password.`}
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
        backTo="/login/staff"
        backLabel="Back to login"
      >
        <form onSubmit={handleVerify} style={{ display:"flex", flexDirection:"column" }}>
          {error     && <AlertBox type="error">{error}</AlertBox>}
          {resendMsg && <AlertBox type={resendMsg.includes("New code") ? "success" : "info"}>{resendMsg}</AlertBox>}

          {/* Info banner */}
          <div style={{ display:"flex", gap:"var(--s2)", padding:"var(--s3)", background:"var(--info-t)", border:"1px solid rgba(55,138,221,.2)", borderRadius:"var(--r3)", fontSize:".8125rem", color:"var(--info)", marginBottom:"var(--s4)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:"1px" }}>
              <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
            </svg>
            Email: <strong style={{ marginLeft:"4px" }}>{email}</strong>
            <button type="button" onClick={() => { setStep("email"); setOtp(["","","","","",""]); setError(""); setResendMsg(""); }}
              style={{ marginLeft:"auto", background:"none", border:"none", color:"var(--brand)", fontWeight:600, fontSize:".8125rem", cursor:"pointer", fontFamily:"var(--ff-b)", padding:0, flexShrink:0 }}>
              Change
            </button>
          </div>

          {/* OTP boxes */}
          <FieldLabel required>6-digit verification code</FieldLabel>
          <div style={{ display:"flex", gap:"var(--s2)", justifyContent:"center", marginBottom:"var(--s2)" }}>
            {otp.map((d,i) => (
              <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleOtpChange(i,e)} onKeyDown={e => handleOtpKeyDown(i,e)} onPaste={handleOtpPaste}
                autoFocus={i===0}
                style={{ width:"46px", height:"56px", textAlign:"center", fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:800, background:"var(--bg2)", border:`2px solid ${d?"var(--brand)":"var(--bd)"}`, borderRadius:"var(--r3)", color:"var(--t1)", outline:"none", transition:"border-color var(--d1) var(--ease)", boxShadow:d?"0 0 0 3px var(--brand-tint)":"none" }}
              />
            ))}
          </div>
          <button type="button" disabled={sending} onClick={handleResend}
            style={{ alignSelf:"center", background:"none", border:"none", color:"var(--brand)", fontWeight:600, fontSize:".8125rem", cursor:"pointer", fontFamily:"var(--ff-b)", padding:"4px 8px", marginBottom:"var(--s4)" }}>
            {sending ? "Sending…" : "Didn't receive it? Resend code"}
          </button>

          {/* Password */}
          <FieldLabel required>Set your password</FieldLabel>
          <InputGroup
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
          >
            <input type={showPw?"text":"password"} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters" className="input-field" />
            <EyeBtn show={showPw} onToggle={() => setShowPw(v=>!v)} />
          </InputGroup>
          <PasswordStrength password={password} />

          <FieldLabel required>Confirm password</FieldLabel>
          <InputGroup
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
            error={!!(confirm && password !== confirm)}
          >
            <input type={showPw?"text":"password"} value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" className="input-field" />
          </InputGroup>
          {confirm && password !== confirm && <FieldError message="Passwords don't match" />}

          <button type="submit" disabled={loading || !!(confirm && password !== confirm)} className="btn btn-p btn-xl btn-full" style={{ marginTop:"var(--s3)" }}>
            {loading ? <><span className="spin">⟳</span> Activating account…</> : "Verify & activate account →"}
          </button>
        </form>
      </PageShell>
    );
  }

  /* ── Email step ── */
  return (
    <PageShell
      title="Activate your account"
      subtitle="Enter your staff email to receive a verification code and set your login password."
      icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
      backTo="/login/staff"
      backLabel="Back to login"
    >
      {error && <AlertBox type="error">{error}</AlertBox>}
      <FieldLabel required>Staff email address</FieldLabel>
      <InputGroup icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}>
        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
          placeholder="your@email.com" className="input-field" autoFocus />
      </InputGroup>
      <button type="button" disabled={sending} onClick={handleSendOTP} className="btn btn-p btn-xl btn-full">
        {sending ? <><span className="spin">⟳</span> Sending code…</> : "Send verification code →"}
      </button>
    </PageShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FORGOT PASSWORD PAGE  (3-step inline: email → OTP+new password → done)
   Endpoints:
     POST /auth/staff/forgot-password/ { email }
     POST /auth/staff/reset-password/  { email, otp, new_password }
══════════════════════════════════════════════════════════════════════════ */
export function ForgotPasswordPage() {
  const navigate  = useNavigate();
  const [step,     setStep]    = useState("email"); // email | otp | done
  const [email,    setEmail]   = useState("");
  const [otp,      setOtp]     = useState(["","","","","",""]);
  const [password, setPassword]= useState("");
  const [confirm,  setConfirm] = useState("");
  const [showPw,   setShowPw]  = useState(false);
  const [loading,  setLoading] = useState(false);
  const [resending,setResending]=useState(false);
  const [error,    setError]   = useState("");
  const [resendMsg,setResendMsg]=useState("");
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    if (!email.trim()) { setError("Enter your email address"); return; }
    setError(""); setLoading(true);
    try {
      await staffForgotPassword({ email: email.trim().toLowerCase() });
      setStep("otp");
      setTimeout(() => otpRefs[0].current?.focus(), 120);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResendMsg(""); setResending(true);
    try {
      await staffForgotPassword({ email: email.trim().toLowerCase() });
      setResendMsg("Code resent! Check your inbox.");
    } catch { setResendMsg("Could not resend. Please wait a moment."); }
    finally { setResending(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6)      { setError("Enter the 6-digit code"); return; }
    if (!password)            { setError("Enter a new password"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm)  { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      await staffResetPassword({ email: email.trim().toLowerCase(), otp: code, new_password: password });
      setStep("done");
    } catch (err) {
      const msg = err.response?.data?.error || "Invalid or expired OTP. Please try again.";
      setError(msg);
      setOtp(["","","","","",""]);
      setTimeout(() => otpRefs[0].current?.focus(), 50);
    } finally { setLoading(false); }
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

  /* Success */
  if (step === "done") {
    return (
      <PageShell
        title="Password reset!"
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
        backTo="/login/staff"
        backLabel="Back to login"
      >
        <div style={{ textAlign:"center", padding:"var(--s6) 0" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"var(--ok-t)", border:"1.5px solid rgba(29,158,117,.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s4)" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:700, marginBottom:"var(--s2)" }}>Password updated</h2>
          <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)", lineHeight:1.6 }}>
            You can now sign in with your new password.
          </p>
          <button onClick={() => navigate("/login/staff")} className="btn btn-p btn-lg btn-full">
            Go to staff login →
          </button>
        </div>
      </PageShell>
    );
  }

  /* OTP + new password step */
  if (step === "otp") {
    return (
      <PageShell
        title="Enter reset code"
        subtitle={`We sent a 6-digit code to ${email}. Enter it below and choose a new password.`}
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
        backTo="/login/staff/forgot"
        backLabel="Back"
      >
        <form onSubmit={handleReset} style={{ display:"flex", flexDirection:"column" }}>
          {error && <AlertBox type="error">{error}</AlertBox>}
          {resendMsg && <AlertBox type={resendMsg.includes("resent") ? "success" : "info"}>{resendMsg}</AlertBox>}

          <FieldLabel required>6-digit code from email</FieldLabel>
          <div style={{ display:"flex", gap:"var(--s2)", justifyContent:"center", marginBottom:"var(--s3)" }}>
            {otp.map((d,i) => (
              <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleOtpChange(i,e)} onKeyDown={e => handleOtpKeyDown(i,e)} onPaste={handleOtpPaste}
                autoFocus={i===0}
                style={{ width:"46px", height:"56px", textAlign:"center", fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:800, background:"var(--bg2)", border:`2px solid ${d?"var(--brand)":"var(--bd)"}`, borderRadius:"var(--r3)", color:"var(--t1)", outline:"none", transition:"border-color var(--d1) var(--ease)", boxShadow:d?"0 0 0 3px var(--brand-tint)":"none" }}
              />
            ))}
          </div>

          <button type="button" disabled={resending} onClick={handleResend}
            style={{ alignSelf:"center", background:"none", border:"none", color:"var(--brand)", fontWeight:600, fontSize:".8125rem", cursor:"pointer", fontFamily:"var(--ff-b)", padding:"4px 8px", marginBottom:"var(--s5)" }}>
            {resending ? "Sending…" : "Didn't receive it? Resend code"}
          </button>

          <FieldLabel required>New password</FieldLabel>
          <InputGroup
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
            error={!!error && error.toLowerCase().includes("password")}
          >
            <input type={showPw?"text":"password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" className="input-field" />
            <EyeBtn show={showPw} onToggle={() => setShowPw(v=>!v)} />
          </InputGroup>
          <PasswordStrength password={password} />

          <FieldLabel required>Confirm new password</FieldLabel>
          <InputGroup
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
            error={!!(confirm && password !== confirm)}
          >
            <input type={showPw?"text":"password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" className="input-field" />
          </InputGroup>
          {confirm && password !== confirm && <FieldError message="Passwords don't match" />}

          <button type="submit" disabled={loading || !!(confirm && password !== confirm)} className="btn btn-p btn-xl btn-full" style={{ marginTop:"var(--s3)" }}>
            {loading ? <><span className="spin">⟳</span> Resetting…</> : "Reset password →"}
          </button>
        </form>
      </PageShell>
    );
  }

  /* Email step */
  return (
    <PageShell
      title="Forgot password"
      subtitle="Enter your staff email. If an account exists, we'll send you a reset code."
      icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
      backTo="/login/staff"
      backLabel="Back to login"
    >
      <form onSubmit={handleSendOTP}>
        {error && <AlertBox type="error">{error}</AlertBox>}
        <FieldLabel required>Email address</FieldLabel>
        <InputGroup icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="your@email.com" className="input-field" autoFocus />
        </InputGroup>
        <button type="submit" disabled={loading} className="btn btn-p btn-xl btn-full">
          {loading ? <><span className="spin">⟳</span> Sending…</> : "Send reset code →"}
        </button>
      </form>
    </PageShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RESET PASSWORD PAGE
   Endpoint: POST /auth/staff/reset-password/ { email, otp, new_password }
   Email pre-filled from URL query param (?email=...)
══════════════════════════════════════════════════════════════════════════ */
export function ResetPasswordPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const params    = new URLSearchParams(location.search);

  const [email,      setEmail]     = useState(params.get("email") || "");
  const [otp,        setOtp]       = useState(["","","","","",""]);
  const [password,   setPassword]  = useState("");
  const [confirm,    setConfirm]   = useState("");
  const [showPw,     setShowPw]    = useState(false);
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState("");
  const [success,    setSuccess]   = useState(false);
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (!email)         { setError("Enter your email");          return; }
    if (code.length < 6){ setError("Enter the 6-digit OTP");    return; }
    if (!password)      { setError("Enter a new password");      return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm)  { setError("Passwords do not match"); return; }

    setError(""); setLoading(true);
    try {
      await staffResetPassword({ email: email.trim().toLowerCase(), otp: code, new_password: password });
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.error || "Reset failed. Check your OTP and try again.";
      setError(msg);
      setOtp(["","","","","",""]);
      otpRefs[0].current?.focus();
    } finally { setLoading(false); }
  };

  const handleOtpChange = (i, e) => {
    const val = e.target.value.replace(/\D/g,"").slice(0,1);
    const next=[...otp]; next[i]=val; setOtp(next);
    if (val && i < 5) otpRefs[i+1].current?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key==="Backspace" && !otp[i] && i > 0) otpRefs[i-1].current?.focus();
  };
  const handlePaste = (e) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6).split("");
    if (digits.length) { setOtp([...digits,...Array(6-digits.length).fill("")]); otpRefs[Math.min(digits.length,5)].current?.focus(); }
    e.preventDefault();
  };

  if (success) {
    return (
      <PageShell title="Password reset!" icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>} backTo="/login/staff" backLabel="Staff login">
        <div style={{ textAlign:"center", padding:"var(--s6) 0" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"var(--ok-t)", border:"1.5px solid rgba(29,158,117,.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--s4)" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:700, marginBottom:"var(--s2)" }}>Password updated</h2>
          <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)" }}>You can now sign in with your new password.</p>
          <button onClick={() => navigate("/login/staff")} className="btn btn-p btn-lg btn-full">Go to login →</button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Reset password"
      subtitle="Enter the OTP from your email and choose a new password."
      icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
      backTo="/login/staff/forgot"
      backLabel="Back"
    >
      <form onSubmit={handleSubmit}>
        {error && <AlertBox type="error">{error}</AlertBox>}

        <FieldLabel required>Email address</FieldLabel>
        <InputGroup icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input-field" />
        </InputGroup>

        <FieldLabel required>6-digit OTP from email</FieldLabel>
        <div style={{ display:"flex", gap:"var(--s2)", justifyContent:"center", marginBottom:"var(--s5)" }}>
          {otp.map((d,i) => (
            <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleOtpChange(i,e)} onKeyDown={e => handleOtpKeyDown(i,e)} onPaste={handlePaste}
              style={{ width:"46px", height:"56px", textAlign:"center", fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:800, background:"var(--bg2)", border:`2px solid ${d?"var(--brand)":"var(--bd)"}`, borderRadius:"var(--r3)", color:"var(--t1)", outline:"none", transition:"border-color var(--d1) var(--ease)", boxShadow:d?"0 0 0 3px var(--brand-tint)":"none" }}
            />
          ))}
        </div>

        <FieldLabel required>New password</FieldLabel>
        <InputGroup icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>} error={!!error && error.includes("password")}>
          <input type={showPw?"text":"password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" className="input-field" />
          <EyeBtn show={showPw} onToggle={() => setShowPw(v=>!v)} />
        </InputGroup>
        <PasswordStrength password={password} />

        <FieldLabel required>Confirm new password</FieldLabel>
        <InputGroup icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>} error={confirm && password !== confirm}>
          <input type={showPw?"text":"password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" className="input-field" />
        </InputGroup>
        {confirm && password !== confirm && (
          <FieldError message="Passwords don't match" />
        )}

        <button type="submit" disabled={loading || (confirm && password !== confirm)} className="btn btn-p btn-xl btn-full" style={{ marginTop:"var(--s4)" }}>
          {loading ? <><span className="spin">⟳</span> Resetting…</> : "Reset password →"}
        </button>
      </form>
    </PageShell>
  );
}
