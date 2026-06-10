/**
 * ProfilePage.jsx
 * Route: /profile  (Staff + BranchAdmin)
 *
 * Shows: name, email, user ID, role, branch
 * Actions: edit name, change password
 */
import React, { useState, useEffect } from "react";
import { useNavigate }   from "react-router-dom";
import AppLayout         from "../../components/layout/AppLayout";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import { useAuth }       from "../../context/AuthContext";
import axiosClient       from "../../api/axiosClient";

/* ── helpers ─────────────────────────────────────────────────────────────── */
function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join("");
}

const ROLE_LABEL = {
  staff:        "Staff",
  branch_admin: "Branch Admin",
  super_admin:  "Super Admin",
};
const ROLE_COLOR = {
  staff:        { bg:"var(--info-t)",  color:"var(--info)" },
  branch_admin: { bg:"rgba(180,83,9,.12)", color:"#b45309" },
  super_admin:  { bg:"var(--brand-tint)", color:"var(--brand)" },
};

function Field({ label, value, mono }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value || "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  return (
    <div style={{ marginBottom:"var(--s4)" }}>
      <div style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:4 }}>
        {label}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{
          flex:1, padding:"10px 14px",
          background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)",
          fontSize:".9375rem", fontFamily: mono ? "monospace" : "var(--ff-b)",
          fontWeight: mono ? 700 : 500, letterSpacing: mono ? ".06em" : "normal",
          color:"var(--t1)", wordBreak:"break-all",
        }}>
          {value || <span style={{ color:"var(--t4)" }}>—</span>}
        </div>
        {value && (
          <button onClick={copy} title="Copy" style={{
            flexShrink:0, width:34, height:34, borderRadius:"var(--r2)",
            border:"1px solid var(--bd)", background:copied?"var(--ok)":"var(--bg2)",
            color:copied?"#fff":"var(--t3)", cursor:"pointer", display:"flex",
            alignItems:"center", justifyContent:"center", transition:"all .2s",
          }}>
            {copied
              ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
              : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            }
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Edit Name form ──────────────────────────────────────────────────────── */
function EditNameForm({ currentName, onSaved, onCancel }) {
  const [name,    setName]    = useState(currentName || "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("Name cannot be empty"); return; }
    setLoading(true); setError("");
    try {
      await axiosClient.patch("/auth/me/", { name: name.trim() });
      onSaved(name.trim());
    } catch (e) {
      setError(e.response?.data?.error || "Failed to update name");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ marginBottom:"var(--s5)" }}>
      <div style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:4 }}>Name</div>
      <div style={{ display:"flex", gap:8 }}>
        <input
          value={name} onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSave()}
          autoFocus maxLength={100}
          style={{ flex:1, padding:"10px 14px", border:`1.5px solid ${error?"var(--err)":"var(--brand)"}`, borderRadius:"var(--r3)", fontSize:".9375rem", background:"var(--bgc)", color:"var(--t1)", outline:"none", fontFamily:"var(--ff-b)" }}
        />
        <button onClick={handleSave} disabled={loading || !name.trim()}
          style={{ padding:"10px 18px", borderRadius:"var(--r3)", border:"none", background:"var(--brand)", color:"#fff", fontWeight:700, fontSize:".875rem", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--ff-b)", opacity:loading?.7:1 }}>
          {loading ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"10px 14px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontWeight:600, fontSize:".875rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
      {error && <p style={{ fontSize:".75rem", color:"var(--err)", marginTop:4 }}>{error}</p>}
    </div>
  );
}

/* ── Change Password form ────────────────────────────────────────────────── */
function ChangePasswordForm() {
  const [form,    setForm]    = useState({ current:"", next:"", confirm:"" });
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState({ text:"", type:"" });
  const [show,    setShow]    = useState({ current:false, next:false, confirm:false });

  const set = (k, v) => { setForm(f => ({...f,[k]:v})); setMsg({ text:"", type:"" }); };
  const eye  = (k) => (
    <button type="button" onClick={() => setShow(s => ({...s,[k]:!s[k]}))}
      style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t4)", padding:"0 4px", display:"flex", alignItems:"center" }}>
      {show[k]
        ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      }
    </button>
  );

  const handleChange = async e => {
    e.preventDefault();
    if (form.next !== form.confirm) { setMsg({ text:"New passwords don't match", type:"err" }); return; }
    if (form.next.length < 8) { setMsg({ text:"Password must be at least 8 characters", type:"err" }); return; }
    setLoading(true);
    try {
      await axiosClient.post("/auth/change-password/", { current_password: form.current, new_password: form.next });
      setMsg({ text:"Password changed successfully", type:"ok" });
      setForm({ current:"", next:"", confirm:"" });
    } catch (e) {
      setMsg({ text: e.response?.data?.error || "Failed to change password", type:"err" });
    } finally { setLoading(false); }
  };

  const inputRow = (label, key, placeholder) => (
    <div style={{ marginBottom:"var(--s3)" }}>
      <label style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", display:"block", marginBottom:4 }}>{label}</label>
      <div style={{ display:"flex", alignItems:"center", border:"1.5px solid var(--bd)", borderRadius:"var(--r3)", background:"var(--bg2)", overflow:"hidden" }}>
        <input type={show[key]?"text":"password"} value={form[key]} onChange={e => set(key, e.target.value)}
          placeholder={placeholder} autoComplete="new-password"
          style={{ flex:1, padding:"10px 14px", border:"none", background:"transparent", fontSize:".9375rem", color:"var(--t1)", outline:"none", fontFamily:"var(--ff-b)" }}/>
        {eye(key)}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleChange}>
      {inputRow("Current password", "current", "Enter current password")}
      {inputRow("New password", "next", "Min. 8 characters")}
      {inputRow("Confirm new password", "confirm", "Re-enter new password")}
      {msg.text && (
        <div style={{ padding:"10px 14px", borderRadius:"var(--r3)", marginBottom:"var(--s3)", fontSize:".875rem", fontWeight:600, background: msg.type==="ok"?"var(--ok-t)":"var(--err-t)", color: msg.type==="ok"?"var(--ok)":"var(--err)", border:`1px solid ${msg.type==="ok"?"rgba(29,158,117,.2)":"rgba(226,75,74,.2)"}` }}>
          {msg.text}
        </div>
      )}
      <button type="submit" disabled={loading || !form.current || !form.next || !form.confirm}
        style={{ width:"100%", padding:"12px", borderRadius:"var(--r3)", border:"none", background:"var(--brand)", color:"#fff", fontWeight:800, fontSize:".9375rem", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--ff-b)", opacity:loading?.7:1 }}>
        {loading ? "Changing password…" : "Change password"}
      </button>
    </form>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { loading: pageLoading } = usePageLoader();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || "");

  useEffect(() => { setDisplayName(user?.name || ""); }, [user?.name]);

  if (pageLoading) return <KNCLoader visible label="Loading profile…" />;
  if (!user) { navigate("/"); return null; }

  const rc   = ROLE_COLOR[user.role] || ROLE_COLOR.staff;
  const ini  = initials(displayName || user.name);
  const homeRoute = user.role === "staff" ? "/staff/queue" : "/admin/dashboard";

  const handleNameSaved = (newName) => {
    setDisplayName(newName);
    setEditingName(false);
    /* Refresh user in auth context by patching the stored object */
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      stored.name = newName;
      localStorage.setItem("user", JSON.stringify(stored));
    } catch {}
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:640, margin:"0 auto", paddingBottom:"var(--s12)" }}>

        {/* Back */}
        <button onClick={() => navigate(homeRoute)}
          style={{ display:"flex", alignItems:"center", gap:6, marginBottom:"var(--s5)", background:"none", border:"none", cursor:"pointer", color:"var(--t3)", fontFamily:"var(--ff-b)", fontSize:".875rem", fontWeight:600, padding:0 }}
          onMouseEnter={e => e.currentTarget.style.color="var(--t1)"}
          onMouseLeave={e => e.currentTarget.style.color="var(--t3)"}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round"/></svg>
          Back to {user.role === "staff" ? "Queue" : "Dashboard"}
        </button>

        {/* Profile hero */}
        <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", padding:"var(--s6)", marginBottom:"var(--s5)", display:"flex", alignItems:"center", gap:"var(--s5)", flexWrap:"wrap" }}>
          {/* Avatar */}
          <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,var(--brand),var(--brand-d))", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--ff-d)", fontSize:"1.75rem", fontWeight:900, color:"#fff", flexShrink:0, boxShadow:"0 6px 20px rgba(232,82,26,.35)" }}>
            {ini}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, letterSpacing:"-.01em", marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {displayName || "—"}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:".75rem", fontWeight:800, padding:"3px 10px", borderRadius:"var(--rf)", background:rc.bg, color:rc.color, border:`1px solid ${rc.color}30` }}>
                {ROLE_LABEL[user.role] || user.role}
              </span>
              {user.branch_name && (
                <span style={{ fontSize:".8125rem", color:"var(--t3)", display:"flex", alignItems:"center", gap:4 }}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  {user.branch_name}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setEditingName(true)} style={{ flexShrink:0, padding:"8px 16px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontFamily:"var(--ff-b)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.color="var(--brand)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.color="var(--t2)";}}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit name
          </button>
        </div>

        {/* Account info card */}
        <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", padding:"var(--s5)", marginBottom:"var(--s5)" }}>
          <div style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s4)", paddingBottom:"var(--s3)", borderBottom:"1px solid var(--bd)" }}>
            Account details
          </div>

          {editingName ? (
            <EditNameForm currentName={displayName} onSaved={handleNameSaved} onCancel={() => setEditingName(false)} />
          ) : (
            <Field label="Full name" value={displayName || user.name} />
          )}

          <Field label="Email address" value={user.email} />

          {user.user_id_login && (
            <Field label="User ID (login)" value={user.user_id_login} mono />
          )}

          {user.phone && (
            <Field label="Phone" value={user.phone} />
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginTop:"var(--s2)" }}>
            {user.role && (
              <div style={{ padding:"10px 14px", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)" }}>
                <div style={{ fontSize:".625rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"var(--t4)", marginBottom:2 }}>Role</div>
                <div style={{ fontWeight:700, fontSize:".9375rem" }}>{ROLE_LABEL[user.role]}</div>
              </div>
            )}
            {user.branch_name && (
              <div style={{ padding:"10px 14px", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)" }}>
                <div style={{ fontSize:".625rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"var(--t4)", marginBottom:2 }}>Branch</div>
                <div style={{ fontWeight:700, fontSize:".9375rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.branch_name}</div>
              </div>
            )}
          </div>
        </div>

        {/* Change password card */}
        <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", padding:"var(--s5)" }}>
          <div style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"var(--s4)", paddingBottom:"var(--s3)", borderBottom:"1px solid var(--bd)", display:"flex", alignItems:"center", gap:6 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round"/></svg>
            Change password
          </div>
          <ChangePasswordForm />
        </div>

      </div>
    </AppLayout>
  );
}
