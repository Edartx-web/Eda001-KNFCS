/**
 * AdminStaffPage.jsx
 * Route: /admin/staff (BranchAdmin) / /superadmin/staff (SuperAdmin)
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import AppLayout from "../../components/layout/AppLayout";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";

/* ─── Icons ──────────────────────────────────────────────────────────── */
const Ic = {
  Plus: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" /></svg>,
  Search: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>,
  Mail: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  Trash: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinejoin="round" /></svg>,
  Check: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" /></svg>,
  Eye: () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Shield: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
};

/* ─── Toast ──────────────────────────────────────────────────────────── */
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: "var(--s8)", left: "50%", transform: "translateX(-50%)",
      zIndex: 600, background: "var(--t1)", color: "var(--bg)", padding: "var(--s3) var(--s5)",
      borderRadius: "var(--rf)", fontSize: ".875rem", fontWeight: 600, boxShadow: "var(--sh-xl)",
      whiteSpace: "nowrap", pointerEvents: "none"
    }}>
      {msg}
    </div>
  );
}

/* ─── Confirm Modal ──────────────────────────────────────────────────── */
function ConfirmModal({ member, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current,
        { scale: 0.92, opacity: 0, y: 16 },
        { scale: 1, opacity: 1, y: 0, duration: 0.28, ease: "back.out(1.8)" }
      );
    }
  }, []);

  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.6)",
      backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "var(--s4)"
    }}>
      <div ref={ref} onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: "380px", background: "var(--bgc)", borderRadius: "var(--r5)",
        padding: "var(--s6)", boxShadow: "var(--sh-xl)", border: "1px solid var(--bd)"
      }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%", background: "var(--err-t)",
          border: "1px solid rgba(226,75,74,.2)", display: "flex",
          alignItems: "center", justifyContent: "center", marginBottom: "var(--s4)"
        }}>
          <Ic.Trash />
        </div>

        <h3 style={{ fontFamily: "var(--ff-d)", fontSize: "1.125rem", fontWeight: 800, marginBottom: "var(--s2)" }}>
          Deactivate account?
        </h3>
        <p style={{ fontSize: ".9375rem", color: "var(--t3)", marginBottom: "var(--s5)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--t1)" }}>{member.name}</strong> ({member.user_id_login}) will lose access immediately.
        </p>

        <div style={{ display: "flex", gap: "var(--s2)" }}>
          <button onClick={onConfirm} className="btn btn-lg" style={{ flex: 1, background: "var(--err)", color: "#fff", border: "none" }}>
            Deactivate
          </button>
          <button onClick={onCancel} className="btn btn-s btn-lg" style={{ flex: 1 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Staff Row ──────────────────────────────────────────────────────── */
const STAFF_ROW_CSS = `
  .sr{display:grid;grid-template-columns:1fr 130px 110px 100px 140px 88px 64px;gap:12px;padding:14px 20px;align-items:center;border-bottom:1px solid var(--bd);transition:background var(--d1) var(--ease)}
  .sr:hover{background:var(--bg2)}
  .sr-mob{display:none;flex-direction:column;border-bottom:1px solid var(--bd)}
  .sr-mob-top{display:flex;align-items:center;gap:12px;padding:14px 16px 10px}
  .sr-mob-body{padding:0 16px 12px;display:flex;flex-direction:column;gap:8px}
  .sr-mob-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
  @media(max-width:700px){.sr{display:none!important}.sr-mob{display:flex!important}.staff-tbl-hdr{display:none!important}}
`;

function StaffRow({ member, isSuperAdmin, onToggle, onDeactivate, onTerminate, toggling, onShiftSave }) {
  const [editShift, setEditShift] = useState(false);
  const [shiftStart, setShiftStart] = useState(member.shift_start || "");
  const [shiftEnd, setShiftEnd] = useState(member.shift_end || "");
  const [savingShift, setSavingShift] = useState(false);

  const statusColor = member.is_active
    ? member.is_verified ? "var(--ok)" : "var(--warn)"
    : "var(--err)";
  const statusLabel = member.is_active
    ? member.is_verified ? "Active" : "Unverified"
    : "Inactive";

  const nowInShift = () => {
    if (!member.shift_start || !member.shift_end) return null;
    const now = new Date();
    const [sh, sm] = member.shift_start.split(":").map(Number);
    const [eh, em] = member.shift_end.split(":").map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
  };

  const inShift = nowInShift();

  const handleShiftSave = async () => {
    setSavingShift(true);
    try {
      await onShiftSave(member.id, shiftStart, shiftEnd);
      setEditShift(false);
    } finally {
      setSavingShift(false);
    }
  };

  const shiftCell = editShift ? (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)}
          style={{ width:82, fontSize:".75rem", border:"1px solid var(--bd)", borderRadius:"var(--r2)", padding:"2px 6px", background:"var(--bgc)", color:"var(--t1)" }} />
        <span style={{ color:"var(--t3)" }}>–</span>
        <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)}
          style={{ width:82, fontSize:".75rem", border:"1px solid var(--bd)", borderRadius:"var(--r2)", padding:"2px 6px", background:"var(--bgc)", color:"var(--t1)" }} />
      </div>
      <div style={{ display:"flex", gap:4 }}>
        <button onClick={handleShiftSave} disabled={savingShift}
          style={{ padding:"3px 10px", background:"var(--ok)", color:"#fff", borderRadius:"var(--r2)", fontSize:".75rem", border:"none", cursor:"pointer" }}>
          {savingShift ? "…" : "Save"}
        </button>
        <button onClick={() => setEditShift(false)}
          style={{ padding:"3px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", fontSize:".75rem", cursor:"pointer", background:"none", color:"var(--t2)" }}>×</button>
      </div>
    </div>
  ) : (
    <button onClick={() => setEditShift(true)} title="Edit shift"
      style={{ background:"none", border:"1px dashed var(--bd)", borderRadius:"var(--r2)", padding:"4px 8px", fontSize:".75rem", color:"var(--t3)", cursor:"pointer", whiteSpace:"nowrap" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.color="var(--brand)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.color="var(--t3)"; }}>
      {member.shift_start && member.shift_end
        ? <><span style={{ color:inShift?"var(--ok)":"var(--t3)", fontWeight:600 }}>{member.shift_start}</span>–<span style={{ color:inShift?"var(--ok)":"var(--t3)", fontWeight:600 }}>{member.shift_end}</span>{inShift !== null && <span style={{ marginLeft:4 }}>{inShift ? "🟢" : "⚪"}</span>}</>
        : <span style={{ fontSize:".6875rem" }}>+ Set shift</span>
      }
    </button>
  );

  const dutyToggle = (
    <button onClick={() => onToggle(member, "is_on_duty")}
      disabled={toggling[`${member.id}_is_on_duty`] || !member.is_active}
      className={`toggle ${member.is_on_duty ? "on" : "off"}`}
      title={member.is_on_duty ? "On duty" : "Off duty"}>
      <div className="toggle-knob" />
    </button>
  );

  const actionBtn = (
    <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
      {member.is_active ? (
        <button onClick={() => onDeactivate(member)} title="Deactivate (keep account)"
          style={{ width:32, height:32, borderRadius:"var(--r2)", background:"none", border:"1px solid var(--bd)", color:"var(--t4)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e => { e.currentTarget.style.background="var(--err-t)"; e.currentTarget.style.color="var(--err)"; }}
          onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color="var(--t4)"; }}>
          <Ic.Trash />
        </button>
      ) : (
        <button onClick={() => onToggle(member, "is_active")} title="Reactivate"
          style={{ padding:"4px 12px", borderRadius:"var(--r2)", background:"none", border:"1px solid var(--bd)", fontSize:".7rem", fontWeight:700, color:"var(--ok)", cursor:"pointer" }}>
          Activate
        </button>
      )}
      {/* SuperAdmin only: Terminate Profile (irreversible) */}
      {isSuperAdmin && onTerminate && (
        <button onClick={() => onTerminate(member)} title="Terminate profile permanently"
          style={{ width:32, height:32, borderRadius:"var(--r2)", background:"none", border:"1px dashed rgba(226,75,74,.5)", color:"rgba(226,75,74,.5)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".6rem", fontWeight:900, letterSpacing:"-.02em" }}
          onMouseEnter={e => { e.currentTarget.style.background="var(--err-t)"; e.currentTarget.style.borderColor="var(--err)"; e.currentTarget.style.color="var(--err)"; }}
          onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.borderColor="rgba(226,75,74,.5)"; e.currentTarget.style.color="rgba(226,75,74,.5)"; }}>
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </button>
      )}
    </div>
  );

  const avatar = (
    <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,var(--brand),var(--brand-d))", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--ff-d)", fontWeight:900, color:"#fff", fontSize:".9375rem", flexShrink:0, outline:member.is_on_duty?"2px solid var(--ok)":"none", outlineOffset:2 }}>
      {member.name?.[0]?.toUpperCase() || "?"}
    </div>
  );

  return (
    <>
      {/* Desktop table row */}
      <div className="staff-row sr">
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", minWidth:0 }}>
          {avatar}
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:".9375rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{member.name}</div>
            <div style={{ fontSize:".75rem", color:"var(--t3)", display:"flex", alignItems:"center", gap:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}><Ic.Mail />{member.email || "—"}</div>
          </div>
        </div>
        <div style={{ textAlign:"center" }}>
          <code style={{ fontSize:".8125rem", fontWeight:700, padding:"3px 10px", background:"var(--bg2)", borderRadius:"var(--r2)", border:"1px solid var(--bd)", color:"var(--brand)" }}>{member.user_id_login || "—"}</code>
        </div>
        <div style={{ fontSize:".8125rem", color:"var(--t3)", textAlign:"center" }}>{isSuperAdmin ? (member.branch_name || "—") : "Staff"}</div>
        <div style={{ textAlign:"center" }}>
          <span style={{ fontSize:".6875rem", fontWeight:700, padding:"3px 9px", borderRadius:"var(--rf)", background:`${statusColor}18`, color:statusColor, border:`1px solid ${statusColor}33` }}>{statusLabel}</span>
        </div>
        <div style={{ textAlign:"center" }}>{shiftCell}</div>
        <div style={{ display:"flex", justifyContent:"center" }}>{dutyToggle}</div>
        <div style={{ display:"flex", justifyContent:"center" }}>{actionBtn}</div>
      </div>

      {/* Mobile card */}
      <div className="staff-row sr-mob">
        <div className="sr-mob-top">
          {avatar}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:"1rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{member.name}</div>
            <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:2 }}>{member.email || member.user_id_login || "—"}</div>
          </div>
          <span style={{ fontSize:".6875rem", fontWeight:700, padding:"3px 9px", borderRadius:"var(--rf)", background:`${statusColor}18`, color:statusColor, border:`1px solid ${statusColor}33`, flexShrink:0 }}>{statusLabel}</span>
        </div>
        <div className="sr-mob-body">
          {isSuperAdmin && member.branch_name && (
            <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>Branch: <strong style={{ color:"var(--t2)" }}>{member.branch_name}</strong></div>
          )}
          <div className="sr-mob-row">
            <div>
              <div style={{ fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--t4)", marginBottom:4 }}>Shift</div>
              {shiftCell}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--t4)", marginBottom:4 }}>On Duty</div>
                {dutyToggle}
              </div>
              {actionBtn}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function AdminStaffPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading: pageLoading } = usePageLoader();
  const isSuperAdmin = user?.role === "super_admin";

  const headerRef = useRef(null);
  const listRef = useRef(null);

  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterB, setFilterB] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirm,   setConfirm]   = useState(null);
  const [terminate, setTerminate] = useState(null); // for SuperAdmin hard-terminate
  const [toggling, setToggling] = useState({});
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState("staff");
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  // Load Sessions
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await axiosClient.get("/auth/sessions/");
      setSessions(res.data.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // Load Staff + Branches
  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = isSuperAdmin && filterB ? { branch_id: filterB } : {};
      const [staffRes, branchRes] = await Promise.all([
        axiosClient.get("/auth/admin/staff-list/", { params }),
        isSuperAdmin
          ? axiosClient.get("/branches/").catch(() => ({ data: { branches: [] } }))
          : Promise.resolve({ data: { branches: [] } })
      ]);

      setStaff(staffRes.data.staff || []);
      if (isSuperAdmin) setBranches(branchRes.data.branches || []);
    } catch (err) {
      console.error(err);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [filterB, isSuperAdmin]);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { if (activeTab === "sessions") loadSessions(); }, [activeTab, loadSessions]);

  // Auto-refresh every 3 minutes
  useEffect(() => {
    const interval = setInterval(loadStaff, 180000);
    return () => clearInterval(interval);
  }, [loadStaff]);

  // Filtered Staff — must be declared before any useEffect that reads filtered.length
  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      s.name?.toLowerCase().includes(q) ||
      s.user_id_login?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterStatus === "active") return s.is_active && s.is_verified;
    if (filterStatus === "duty") return s.is_on_duty && s.is_active;
    if (filterStatus === "inactive") return !s.is_active;
    return true;
  });

  // GSAP Animations
  useEffect(() => {
    if (loading || !listRef.current) return;
    gsap.fromTo(listRef.current.querySelectorAll(".staff-row"),
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, stagger: 0.025, duration: 0.35, ease: "power2.out" }
    );
  }, [loading, filtered.length]);

  useEffect(() => {
    if (headerRef.current) {
      gsap.from(headerRef.current, { y: -15, opacity: 0, duration: 0.5, ease: "power2.out" });
    }
  }, []);

  const handleToggle = async (member, field) => {
    const key = `${member.id}_${field}`;
    setToggling(prev => ({ ...prev, [key]: true }));

    try {
      await axiosClient.patch(`/auth/admin/staff-list/${member.id}/`, {
        [field]: !member[field]
      });
      showToast(`${member.name} updated successfully`);
      loadStaff();
    } catch {
      showToast("Failed to update");
    } finally {
      setToggling(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleShiftSave = async (id, start, end) => {
    try {
      await axiosClient.patch(`/auth/admin/staff-list/${id}/`, {
        shift_start: start,
        shift_end: end
      });
      showToast("Shift schedule updated");
      loadStaff();
    } catch {
      showToast("Failed to save shift");
    }
  };

  const handleDeactivate = async () => {
    if (!confirm) return;
    try {
      await axiosClient.patch(`/auth/admin/staff-list/${confirm.id}/`, { is_active: false });
      showToast(`${confirm.name} has been deactivated`);
      setConfirm(null);
      loadStaff();
    } catch {
      showToast("Failed to deactivate");
    }
  };

  const handleTerminate = async () => {
    if (!terminate) return;
    try {
      await axiosClient.delete(`/auth/admin/users/${terminate.id}/terminate/`);
      showToast(`${terminate.name} profile permanently terminated`);
      setTerminate(null);
      loadStaff();
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to terminate profile");
      setTerminate(null);
    }
  };

  const total = staff.length;
  const active = staff.filter(s => s.is_active && s.is_verified).length;
  const onDuty = staff.filter(s => s.is_on_duty).length;
  const unverified = staff.filter(s => s.is_active && !s.is_verified).length;

  const createStaffPath      = "/admin/staff/create";
  const createBranchAdminPath = "/superadmin/branch-admin/create";

  if (pageLoading) return <KNCLoader visible label="Loading staff…" />;

  return (
    <AppLayout>
      <div ref={headerRef} style={{ maxWidth: "1100px", margin: "0 auto", padding: "var(--s4)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--s4)", marginBottom: "var(--s6)" }}>
          <div>
            <div style={{ fontSize: ".625rem", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--brand)", marginBottom: "var(--s1)" }}>
              <Ic.Shield /> {isSuperAdmin ? "SUPER ADMIN" : user?.branch_name || "BRANCH"}
            </div>
            <h1 style={{ fontFamily: "var(--ff-d)", fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 900, letterSpacing: "-.03em", margin: 0 }}>
              Staff Manager
            </h1>
            <p style={{ color: "var(--t3)", marginTop: "var(--s1)" }}>
              {total} accounts • {onDuty} on duty now
            </p>
          </div>

          <div style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap" }}>
            {isSuperAdmin && (
              <Link to={createBranchAdminPath} className="btn btn-s btn-lg" style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
                <Ic.Shield /> Add Branch Admin
              </Link>
            )}
            <Link to={createStaffPath} className="btn btn-p btn-lg" style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
              <Ic.Plus /> Add Staff
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: "var(--s6)" }}>
          {[
            { label: "Total", value: total, color: "var(--info)", sub: "All accounts" },
            { label: "Active", value: active, color: "var(--ok)", sub: "Verified & active" },
            { label: "On Duty", value: onDuty, color: "var(--brand)", sub: "Currently working" },
            { label: "Unverified", value: unverified, color: "var(--warn)", sub: "Awaiting verification" },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ height: "3px", background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
              <div className="stat-lbl">{s.label}</div>
              <div className="stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "var(--s1)", marginBottom: "var(--s5)", borderBottom: "1px solid var(--bd)" }}>
          {[
            { key: "staff", label: "Staff Accounts" },
            { key: "sessions", label: "Login Sessions" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 20px",
                borderBottom: `2px solid ${activeTab === tab.key ? "var(--brand)" : "transparent"}`,
                background: "none",
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? "var(--brand)" : "var(--t3)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s4)" }}>
              <p style={{ color: "var(--t3)" }}>Active and past login sessions</p>
              <button onClick={loadSessions} className="btn btn-s">↻ Refresh</button>
            </div>

            {sessionsLoading ? (
              <div style={{ textAlign: "center", padding: "var(--s10)", color: "var(--t4)" }}>Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--s12)", color: "var(--t4)" }}>No login sessions yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
                {sessions.map(s => (
                  <div key={s.id} style={{
                    background: "var(--bg2)", borderRadius: "var(--r4)", padding: "var(--s4)",
                    border: `1px solid ${s.is_active ? "rgba(29,158,117,.3)" : "var(--bd)"}`
                  }}>
                    {/* Session content here (same as before) */}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <strong>{s.staff_name}</strong> {s.staff_id && <span style={{ fontSize: ".75rem", color: "var(--t4)" }}>({s.staff_id})</span>}
                      </div>
                      <div style={{ fontSize: ".75rem", color: "var(--t4)" }}>
                        {new Date(s.last_seen).toLocaleTimeString([], { timeStyle: "short" })} last seen
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === "staff" && (
          <>
            {/* Controls */}
            <div style={{ display: "flex", gap: "var(--s3)", flexWrap: "wrap", marginBottom: "var(--s5)", alignItems: "center" }}>
              <div className="input-wrap" style={{ flex: 1, minWidth: "260px" }}>
                <Ic.Search />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, ID, or email..."
                  className="input-field"
                />
                {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none" }}>×</button>}
              </div>

              {/* Status Filter */}
              <div style={{ display: "flex", background: "var(--bg2)", border: "1px solid var(--bd)", borderRadius: "var(--rf)", padding: "3px" }}>
                {["all", "active", "duty", "inactive"].map(key => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--rf)",
                      background: filterStatus === key ? "var(--bgc)" : "transparent",
                      fontWeight: filterStatus === key ? 700 : 400,
                    }}
                  >
                    {key === "all" ? "All" : key === "duty" ? "On Duty" : key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>

              {isSuperAdmin && branches.length > 0 && (
                <select value={filterB} onChange={e => setFilterB(e.target.value)} style={{ height: "44px", minWidth: "180px" }}>
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="skel" style={{ height: "72px", borderRadius: "var(--r4)" }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--s16)", background: "var(--bg2)", borderRadius: "var(--r5)" }}>
                <h2>No staff found</h2>
                <p style={{ color: "var(--t3)" }}>{search ? "Try different keywords" : "Add your first staff member"}</p>
                {!search && <Link to={createStaffPath} className="btn btn-p">Add First Staff</Link>}
              </div>
            ) : (
              <div ref={listRef} style={{ background: "var(--bgc)", border: "1px solid var(--bd)", borderRadius: "var(--r5)", overflow: "hidden" }}>
                <style>{STAFF_ROW_CSS}</style>
                {/* Desktop header */}
                <div className="sr staff-tbl-hdr" style={{ background:"var(--bg2)", borderBottom:"1px solid var(--bd)", fontSize:".625rem", fontWeight:800, textTransform:"uppercase", letterSpacing:".08em", color:"var(--t4)", padding:"var(--s3) var(--s5)" }}>
                  <div>Staff Member</div>
                  <div style={{ textAlign:"center" }}>User ID</div>
                  <div style={{ textAlign:"center" }}>{isSuperAdmin ? "Branch" : "Role"}</div>
                  <div style={{ textAlign:"center" }}>Status</div>
                  <div style={{ textAlign:"center" }}>Shift</div>
                  <div style={{ textAlign:"center" }}>On Duty</div>
                  <div />
                </div>

                {filtered.map(member => (
                  <StaffRow
                    key={member.id}
                    member={member}
                    isSuperAdmin={isSuperAdmin}
                    onToggle={handleToggle}
                    onDeactivate={setConfirm}
                    onTerminate={isSuperAdmin ? setTerminate : null}
                    onShiftSave={handleShiftSave}
                    toggling={toggling}
                  />
                ))}
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div style={{ textAlign: "center", marginTop: "var(--s5)", color: "var(--t4)", fontSize: ".8125rem" }}>
                Showing {filtered.length} of {total} accounts
              </div>
            )}
          </>
        )}
      </div>

      {confirm && <ConfirmModal member={confirm} onConfirm={handleDeactivate} onCancel={() => setConfirm(null)} />}

      {/* Terminate Profile — SuperAdmin only, irreversible */}
      {terminate && (
        <div onClick={() => setTerminate(null)} style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,.65)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:"400px", background:"var(--bgc)", borderRadius:"var(--r5)", padding:"var(--s6)", boxShadow:"var(--sh-xl)", border:"2px solid rgba(226,75,74,.4)" }}>
            {/* Icon */}
            <div style={{ width:52, height:52, borderRadius:"50%", background:"var(--err-t)", border:"2px solid rgba(226,75,74,.3)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"var(--s4)" }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>
            </div>
            <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:900, color:"var(--err)", marginBottom:"var(--s2)" }}>
              Permanently terminate profile?
            </h3>
            <p style={{ fontSize:".9375rem", color:"var(--t2)", marginBottom:"var(--s3)", lineHeight:1.6 }}>
              This will <strong>permanently remove all personal data</strong> for{" "}
              <strong style={{ color:"var(--t1)" }}>{terminate.name}</strong> ({terminate.user_id_login || terminate.email}).
            </p>
            <div style={{ padding:"10px 14px", background:"rgba(226,75,74,.07)", border:"1px solid rgba(226,75,74,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s5)", fontSize:".8125rem", color:"var(--err)", lineHeight:1.55 }}>
              Their name, email, phone, and login ID will be anonymised. Their orders and work history remain intact.
              <strong> This action cannot be undone.</strong>
            </div>
            <div style={{ display:"flex", gap:"var(--s2)" }}>
              <button onClick={handleTerminate} className="btn btn-lg" style={{ flex:1, background:"var(--err)", color:"#fff", border:"none" }}>
                Yes, terminate permanently
              </button>
              <button onClick={() => setTerminate(null)} className="btn btn-s btn-lg" style={{ flex:1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast} />
    </AppLayout>
  );
}