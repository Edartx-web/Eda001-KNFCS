/**
 * BroadcastPage.jsx — SuperAdmin broadcast centre
 *
 * Mode 1 — Offer Broadcast:
 *   Pick active offer → caption auto-generated → target auto-set to offer's branch
 *   (super admin can override to all)
 *
 * Mode 2 — Custom Message:
 *   Free caption + optional image upload → choose target (all / specific branch)
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import Header      from "../../components/layout/Header";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";

const BRAND  = "#E8521A";
const GREEN  = "#16a34a";
const RED    = "#dc2626";
const YELLOW = "#d97706";
const GRAY   = "#6b7280";

/* ── Shared small components ─────────────────────────────────────────────── */
function BcastBadge({ status }) {
  const map = {
    pending: { label:"Pending",  bg:"#f3f4f6", color:GRAY   },
    running: { label:"Running",  bg:"#fef3c7", color:YELLOW },
    done:    { label:"Done",     bg:"#dcfce7", color:GREEN  },
    failed:  { label:"Failed",   bg:"#fee2e2", color:RED    },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:"999px", fontSize:".6875rem", fontWeight:700, background:s.bg, color:s.color }}>
      {s.label}
    </span>
  );
}

function ProgressBar({ sent, total }) {
  if (!total) return null;
  const pct = Math.min(100, Math.round((sent / total) * 100));
  return (
    <div style={{ marginTop:"4px" }}>
      <div style={{ height:"4px", background:"#e5e7eb", borderRadius:"4px", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:GREEN, borderRadius:"4px", transition:"width .4s" }} />
      </div>
      <div style={{ fontSize:".6875rem", color:GRAY, marginTop:"3px" }}>{sent}/{total} sent ({pct}%)</div>
    </div>
  );
}

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const ChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

function BcastRow({ log, onRefresh }) {
  const [open,       setOpen]       = useState(false);
  const [retrying,   setRetrying]   = useState(false);
  const [forcing,    setForcing]    = useState(false);
  const img = log.image_url || log.offer_image_url;

  const handleRetry = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Re-queue this broadcast via Celery?")) return;
    setRetrying(true);
    try {
      await axiosClient.post(`/notifications/broadcast/${log.id}/retry/`);
      await onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || "Retry failed — is Celery running? Try Force Run instead.");
    } finally {
      setRetrying(false);
    }
  };

  const handleForceRun = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Force-run this broadcast NOW (bypasses Celery, runs in server thread)?")) return;
    setForcing(true);
    try {
      await axiosClient.post(`/notifications/broadcast/${log.id}/retry/?force=1`);
      await onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || "Force run failed.");
    } finally {
      setForcing(false);
    }
  };

  return (
    <div style={{ border:"1px solid #e5e7eb", borderRadius:"10px", overflow:"hidden", background:"#fff" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width:"100%", padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", border:"none", background:"transparent", cursor:"pointer", textAlign:"left", gap:"12px" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"2px" }}>
            <span style={{ fontSize:".625rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", padding:"1px 7px", borderRadius:"4px", background:log.offer ? "#fff5f0" : "#f3f4f6", color:log.offer ? BRAND : GRAY }}>
              {log.offer ? "Offer" : "Custom"}
            </span>
            <span style={{ fontWeight:700, fontSize:".9375rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</span>
          </div>
          <div style={{ fontSize:".75rem", color:GRAY }}>
            {new Date(log.created_at).toLocaleString("en-IN")}
            {log.offer_name && ` · ${log.offer_name}`}
            {log.created_by_name && ` · ${log.created_by_name}`}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
          <BcastBadge status={log.status} />
          <span style={{ color:GRAY }}>{open ? <ChevronUp /> : <ChevronDown />}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding:"0 18px 16px", borderTop:"1px solid #f3f4f6" }}>
          <div style={{ paddingTop:"14px", display:"flex", flexDirection:"column", gap:"10px" }}>
            {img && <img src={img} alt="" style={{ maxWidth:"180px", borderRadius:"8px", border:"1px solid #e5e7eb" }} onError={e => e.target.style.display="none"} />}
            {log.intro_message && <p style={{ fontSize:".8125rem", color:BRAND, fontWeight:600 }}>{log.intro_message}</p>}
            <p style={{ fontSize:".875rem", color:"#374151", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{log.message}</p>
            <div style={{ fontSize:".8125rem", color:GRAY }}>Target: <strong>{log.target === "all" ? "All Customers" : "Branch"}</strong></div>
            {(log.status === "running" || log.status === "done") && (
              <ProgressBar sent={log.sent_count} total={log.total_recipients} />
            )}
            {log.failed_count > 0 && <div style={{ fontSize:".75rem", color:RED }}>{log.failed_count} failed</div>}
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {log.status === "running" && (
                <button onClick={onRefresh} style={{ padding:"5px 12px", borderRadius:"6px", border:"1px solid #e5e7eb", background:"#f9fafb", fontSize:".75rem", cursor:"pointer", color:GRAY }}>
                  Refresh
                </button>
              )}
              {log.status !== "done" && (
                <button onClick={handleForceRun} disabled={forcing}
                  style={{ padding:"5px 14px", borderRadius:"6px", border:`1px solid ${BRAND}`, background:"#fff5f0", fontSize:".75rem", cursor:"pointer", color:BRAND, opacity:forcing?0.6:1, fontWeight:600 }}>
                  {forcing ? "Running…" : "Force Run (No Celery)"}
                </button>
              )}
              {(log.status === "pending" || log.status === "failed") && (
                <button onClick={handleRetry} disabled={retrying}
                  style={{ padding:"5px 14px", borderRadius:"6px", border:`1px solid ${RED}`, background:"#fff", fontSize:".75rem", cursor:"pointer", color:RED, opacity:retrying?0.6:1 }}>
                  {retrying ? "Retrying…" : "Retry (Celery)"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Caption builder (mirrors backend logic) ─────────────────────────────── */
function buildCaption(offer, intro, siteUrl = "") {
  const lines = [];
  if (intro) { lines.push(intro); lines.push(""); }
  lines.push(`${offer.emoji || "🔥"} *${offer.name}*`);
  if (offer.tagline) lines.push(offer.tagline);
  lines.push("");
  if (offer.discount_percentage) lines.push(`💰 *${Number(offer.discount_percentage).toFixed(0)}% OFF*`);
  else if (offer.discount_flat)  lines.push(`💰 *₹${Number(offer.discount_flat).toFixed(0)} OFF*`);
  if (offer.original_price && offer.offer_price)
    lines.push(`~₹${Number(offer.original_price).toFixed(0)}~ → *₹${Number(offer.offer_price).toFixed(0)}*`);
  else if (offer.offer_price)
    lines.push(`Only *₹${Number(offer.offer_price).toFixed(0)}*`);
  if (offer.coupon_code) lines.push(`Code: *${offer.coupon_code}*`);
  lines.push("");
  const base = siteUrl || window.location.origin;
  lines.push(`View offer: ${base}/offers/${offer.id}`);
  lines.push(""); lines.push("Order now at KNFC 🍗"); lines.push("_KNFC Fried Chicken_");
  return lines.join("\n");
}

/* ── Shared field styles ─────────────────────────────────────────────────── */
const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #d1d5db", fontSize:".9375rem", boxSizing:"border-box", outline:"none" };
const labelStyle = { display:"block", fontSize:".8125rem", fontWeight:600, marginBottom:"6px" };
const sectionGap = { display:"flex", flexDirection:"column", gap:"16px" };

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function BroadcastPage() {
  const { user }         = useAuth();
  const isBranchAdmin    = user?.role === "branch_admin";
  const [mode, setMode]  = useState("offer"); // "offer" | "custom" — branch_admin locked to "offer"

  /* shared */
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState(null);
  const [sentOk,  setSentOk]  = useState(false);

  /* data */
  const [offers,      setOffers]      = useState([]);
  const [branches,    setBranches]    = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [siteUrl,     setSiteUrl]     = useState("");
  const [forceAllRunning, setForceAllRunning] = useState(false);

  /* ── Mode 1 (Offer) state ─────────────────────────────────────────────── */
  const [offerId,        setOfferId]        = useState("");
  const [introMessage,   setIntroMessage]   = useState("");
  const [caption,        setCaption]        = useState("");
  const [offerTarget,    setOfferTarget]    = useState("branch");
  const [offerBranchId,  setOfferBranchId]  = useState("");
  const [autoBroadcast,  setAutoBroadcast]  = useState(false);
  const [savingToggle,   setSavingToggle]   = useState(false);

  /* ── Mode 2 (Custom) state ───────────────────────────────────────────── */
  const [title,        setTitle]        = useState("");
  const [custMessage,  setCustMessage]  = useState("");
  const [custTarget,   setCustTarget]   = useState("all");
  const [custBranchId, setCustBranchId] = useState("");
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [waStatus,     setWaStatus]     = useState(null); // null=loading, "connected", "disconnected", "service_down"

  const fileRef = useRef(null);

  /* ── Fetch data ──────────────────────────────────────────────────────── */
  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await axiosClient.get("/notifications/broadcast/");
      setLogs(Array.isArray(data) ? data : data.results || []);
    } catch {}
    setHistLoading(false);
  }, []);

  const fetchWaStatus = useCallback(async () => {
    try {
      const { data } = await axiosClient.get("/notifications/whatsapp/status/");
      setWaStatus(data?.broadcast?.status === "connected" ? "connected" : (data?.broadcast?.status || "disconnected"));
    } catch {
      setWaStatus("service_down");
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchWaStatus();
    axiosClient.get("/branches/").then(({ data }) => {
      setBranches(data.branches || (Array.isArray(data) ? data : []));
    }).catch(() => {});
    axiosClient.get("/offers/admin/").then(({ data }) => {
      const now = new Date();
      const all = data.offers || (Array.isArray(data) ? data : []);
      setOffers(all.filter(o => !o.end_at || new Date(o.end_at) > now));
    }).catch(() => {});
    axiosClient.get("/branches/config/").then(({ data }) => {
      setSiteUrl(data.config?.site_url || "");
    }).catch(() => {});
  }, [fetchLogs, fetchWaStatus]);

  /* ── Auto-generate caption when offer / intro changes ────────────────── */
  const selectedOffer = offers.find(o => o.id === offerId);

  useEffect(() => {
    if (!selectedOffer) { setCaption(""); setOfferBranchId(""); setAutoBroadcast(false); return; }
    setOfferBranchId(selectedOffer.branch || "");
    setAutoBroadcast(!!selectedOffer.auto_broadcast);
    setCaption(buildCaption(selectedOffer, introMessage, siteUrl));
  }, [offerId, introMessage, siteUrl]); // eslint-disable-line

  /* ── Toggle auto_broadcast on the offer ─────────────────────────────── */
  const handleToggleAutoBroadcast = async (newVal) => {
    if (!offerId) return;
    setSavingToggle(true);
    try {
      const { data } = await axiosClient.patch(`/offers/admin/${offerId}/`, { auto_broadcast: newVal });
      const updated = data.offer || data;
      setAutoBroadcast(!!updated.auto_broadcast);
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, auto_broadcast: updated.auto_broadcast } : o));
    } catch {
      // revert on error
    } finally {
      setSavingToggle(false);
    }
  };

  /* ── Mode 1 submit ───────────────────────────────────────────────────── */
  const handleSendOffer = async (e) => {
    e.preventDefault();
    setSendErr(null);
    if (!offerId) return setSendErr("Please select an offer.");
    const effectiveTarget   = isBranchAdmin ? "branch" : offerTarget;
    const effectiveBranchId = isBranchAdmin ? (user?.branch_id || offerBranchId) : offerBranchId;
    if (effectiveTarget === "branch" && !effectiveBranchId)
      return setSendErr("Could not determine branch for this offer.");
    const targetLabel = effectiveTarget === "all"
      ? "ALL customers"
      : `${selectedOffer?.branch_name || "branch"} customers`;
    if (!window.confirm(`Send offer broadcast to ${targetLabel}?\nThis cannot be undone.`)) return;

    setSending(true);
    try {
      const fd = new FormData();
      fd.append("title",         `${selectedOffer.name} — Offer`);
      fd.append("intro_message", introMessage.trim());
      fd.append("message",       caption.trim());
      fd.append("offer_id",      offerId);
      fd.append("target",        effectiveTarget);
      if (effectiveTarget === "branch" && effectiveBranchId) fd.append("branch_id", effectiveBranchId);

      await axiosClient.post("/notifications/broadcast/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSentOk(true);
      setOfferId(""); setIntroMessage(""); setCaption(""); setOfferBranchId("");
      setOfferTarget("branch"); setAutoBroadcast(false);
      await fetchLogs();
    } catch (err) {
      setSendErr(err?.response?.data?.error || "Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  /* ── Mode 2 submit ───────────────────────────────────────────────────── */
  const handleSendCustom = async (e) => {
    e.preventDefault();
    setSendErr(null);
    if (!title.trim())       return setSendErr("Title is required.");
    if (!custMessage.trim()) return setSendErr("Message / caption is required.");
    if (custTarget === "branch" && !custBranchId) return setSendErr("Select a branch.");
    if (!window.confirm(`Send broadcast "${title}" to ${custTarget === "all" ? "ALL customers" : "selected branch"}?\nThis cannot be undone.`)) return;

    setSending(true);
    try {
      const fd = new FormData();
      fd.append("title",   title.trim());
      fd.append("message", custMessage.trim());
      fd.append("target",  custTarget);
      if (custBranchId && custTarget === "branch") fd.append("branch_id", custBranchId);
      if (imageFile) fd.append("image", imageFile);

      await axiosClient.post("/notifications/broadcast/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSentOk(true);
      setTitle(""); setCustMessage(""); setCustTarget("all"); setCustBranchId("");
      setImageFile(null); setImagePreview("");
      if (fileRef.current) fileRef.current.value = "";
      await fetchLogs();
    } catch (err) {
      setSendErr(err?.response?.data?.error || "Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  const resetSent = () => { setSentOk(false); setSendErr(null); };

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg,#f5f5f5)" }}>
      <Header />
      <div style={{ paddingTop:"60px", paddingBottom:"calc(72px + env(safe-area-inset-bottom,0px))" }}>
        <div style={{ maxWidth:"860px", margin:"0 auto", padding:"32px clamp(16px,4vw,40px)" }}>

          {/* Page header */}
          <div style={{ marginBottom:"28px" }}>
            <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:GRAY, marginBottom:"6px" }}>Super Admin</div>
            <h1 style={{ fontFamily:"var(--ff-d,Syne,sans-serif)", fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:900, letterSpacing:"-.025em", lineHeight:1.1, marginBottom:"6px" }}>
              Broadcast
            </h1>
            <p style={{ fontSize:".9375rem", color:GRAY }}>Send offer promotions or custom messages to customers via WhatsApp.</p>
          </div>

          {/* ── Mode switcher — super_admin only ───────────────────────── */}
          {!isBranchAdmin && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"24px" }}>
              {[
                {
                  key:"offer",
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
                  title:"Offer Broadcast",
                  desc:"Pick an offer → auto-caption → send to branch customers"
                },
                {
                  key:"custom",
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
                  title:"Custom Message",
                  desc:"Write any caption or announcement + optional image"
                },
              ].map(m => {
                const active = mode === m.key;
                return (
                  <button key={m.key} onClick={() => { setMode(m.key); setSendErr(null); setSentOk(false); }}
                    style={{ padding:"16px 18px", borderRadius:"12px", border:`2px solid ${active ? BRAND : "#e5e7eb"}`, background:active ? "#fff5f0" : "#fff", cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                    <div style={{ marginBottom:"8px", color:active ? BRAND : GRAY }}>{m.icon}</div>
                    <div style={{ fontFamily:"var(--ff-d,Syne,sans-serif)", fontWeight:800, fontSize:".9375rem", color:active ? BRAND : "#111", marginBottom:"3px" }}>{m.title}</div>
                    <div style={{ fontSize:".75rem", color:GRAY, lineHeight:1.4 }}>{m.desc}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── WhatsApp broadcast session warning ─────────────────────── */}
          {waStatus && waStatus !== "connected" && (
            <div style={{ marginBottom:"20px", padding:"14px 18px", borderRadius:"12px", background: waStatus === "service_down" ? "#fef2f2" : "#fffbeb", border:`1px solid ${waStatus === "service_down" ? "#fca5a5" : "#fcd34d"}`, display:"flex", alignItems:"flex-start", gap:"12px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={waStatus === "service_down" ? RED : YELLOW} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:"1px" }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <div style={{ fontWeight:700, fontSize:".9rem", color: waStatus === "service_down" ? RED : "#92400e" }}>
                  {waStatus === "service_down" ? "WhatsApp service is offline" : `WhatsApp broadcast session not connected (${waStatus})`}
                </div>
                <div style={{ fontSize:".8125rem", color:"#6b7280", marginTop:"3px" }}>
                  {waStatus === "service_down"
                    ? "The Baileys WhatsApp Node service is not running. Start it and scan both QR codes."
                    : "Go to the WhatsApp page and scan the broadcast QR code. Messages will not be delivered until connected."}
                </div>
                <button onClick={fetchWaStatus} style={{ marginTop:"8px", padding:"4px 12px", borderRadius:"6px", border:"1px solid currentColor", background:"transparent", fontSize:".75rem", cursor:"pointer", color: waStatus === "service_down" ? RED : "#92400e", fontWeight:600 }}>
                  Recheck
                </button>
              </div>
            </div>
          )}

          {/* ── Compose card ───────────────────────────────────────────── */}
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", overflow:"hidden", marginBottom:"28px" }}>
            <div style={{ padding:"16px 24px", borderBottom:"1px solid #f3f4f6", background:"#fafafa", display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ color:BRAND }}>
                {mode === "offer"
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                }
              </span>
              <span style={{ fontFamily:"var(--ff-d,Syne,sans-serif)", fontWeight:800 }}>
                {mode === "offer" ? "Offer Broadcast" : "Custom Message"}
              </span>
            </div>

            {sentOk ? (
              <div style={{ padding:"40px 24px", textAlign:"center" }}>
                <div style={{ display:"flex", justifyContent:"center", marginBottom:"12px", color:GREEN }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div style={{ fontWeight:700, fontSize:"1.125rem", marginBottom:"8px", color:GREEN }}>Broadcast queued!</div>
                <p style={{ color:GRAY, fontSize:".875rem", marginBottom:"20px" }}>
                  Sending in batches — check history below for progress.
                </p>
                <button onClick={resetSent}
                  style={{ padding:"9px 22px", borderRadius:"8px", background:BRAND, color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:".875rem" }}>
                  Send another
                </button>
              </div>
            ) : mode === "offer" ? (
              /* ══ MODE 1 — OFFER ══════════════════════════════════════ */
              <form onSubmit={handleSendOffer} style={{ padding:"24px", ...sectionGap }}>

                {/* Offer picker */}
                <div>
                  <label style={labelStyle}>Select Offer <span style={{ color:RED }}>*</span></label>
                  <select value={offerId} onChange={e => setOfferId(e.target.value)}
                    style={{ ...inputStyle, background:"#fff" }}>
                    <option value="">— choose an active offer —</option>
                    {offers.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.emoji} {o.name}
                        {o.discount_percentage ? ` · ${Number(o.discount_percentage).toFixed(0)}% off` : o.discount_flat ? ` · ₹${Number(o.discount_flat).toFixed(0)} off` : ""}
                        {o.branch_name ? ` · ${o.branch_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Offer preview card */}
                {selectedOffer && (
                  <div style={{ display:"flex", gap:"14px", padding:"14px", background:"#fafafa", borderRadius:"10px", border:"1px solid #e5e7eb", alignItems:"flex-start" }}>
                    {selectedOffer.image && (
                      <img src={selectedOffer.image} alt="" onError={e => e.target.style.display="none"}
                        style={{ width:"80px", height:"60px", objectFit:"cover", borderRadius:"6px", flexShrink:0 }} />
                    )}
                    <div>
                      <div style={{ fontWeight:700, fontSize:".9375rem" }}>{selectedOffer.emoji} {selectedOffer.name}</div>
                      {selectedOffer.tagline && <div style={{ fontSize:".8125rem", color:GRAY, marginTop:"2px" }}>{selectedOffer.tagline}</div>}
                      <div style={{ marginTop:"4px", display:"flex", gap:"8px", flexWrap:"wrap" }}>
                        {selectedOffer.discount_percentage && (
                          <span style={{ fontSize:".75rem", fontWeight:700, background:"#fff5f0", color:BRAND, padding:"2px 8px", borderRadius:"6px" }}>
                            {Number(selectedOffer.discount_percentage).toFixed(0)}% OFF
                          </span>
                        )}
                        {selectedOffer.discount_flat && (
                          <span style={{ fontSize:".75rem", fontWeight:700, background:"#fff5f0", color:BRAND, padding:"2px 8px", borderRadius:"6px" }}>
                            ₹{Number(selectedOffer.discount_flat).toFixed(0)} OFF
                          </span>
                        )}
                        {selectedOffer.branch_name && (
                          <span style={{ fontSize:".75rem", color:GRAY, padding:"2px 8px", borderRadius:"6px", background:"#f3f4f6" }}>
                            📍 {selectedOffer.branch_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Intro message */}
                <div>
                  <label style={labelStyle}>
                    Intro Message <span style={{ fontWeight:400, color:GRAY }}>(optional — prepended to caption)</span>
                  </label>
                  <input value={introMessage} onChange={e => setIntroMessage(e.target.value)} maxLength={300}
                    placeholder="e.g. &quot;Good morning! 🌟 Here's today's special for you 🍗&quot;"
                    style={inputStyle} />
                </div>

                {/* Auto-generated caption (editable) */}
                {selectedOffer && (
                  <div>
                    <label style={labelStyle}>
                      Caption <span style={{ fontWeight:400, color:GREEN }}>✓ auto-generated — you can edit</span>
                    </label>
                    <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={8}
                      style={{ ...inputStyle, resize:"vertical", fontFamily:"monospace", lineHeight:1.6 }} />
                    <div style={{ fontSize:".6875rem", color:GRAY, marginTop:"3px" }}>
                      {caption.length} chars · Use *bold*, ~strikethrough~, _italic_ for WhatsApp formatting
                    </div>
                  </div>
                )}

                {/* Auto-broadcast toggle */}
                {selectedOffer && (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", background:"#f9fafb", borderRadius:"10px", border:"1px solid #e5e7eb" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:".875rem" }}>Auto-broadcast when activated</div>
                      <div style={{ fontSize:".75rem", color:GRAY, marginTop:"2px" }}>
                        {autoBroadcast
                          ? "ON — will auto-send to branch customers when this offer goes active"
                          : "OFF — only send manually from this page"}
                      </div>
                    </div>
                    <button type="button" disabled={savingToggle}
                      onClick={() => handleToggleAutoBroadcast(!autoBroadcast)}
                      style={{ flexShrink:0, width:"48px", height:"26px", borderRadius:"999px", border:"none", cursor:savingToggle?"not-allowed":"pointer", background:autoBroadcast?"#25D366":"#d1d5db", position:"relative", transition:"background .2s" }}>
                      <div style={{ position:"absolute", top:"3px", left:autoBroadcast?"24px":"3px", width:"20px", height:"20px", borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,.2)", transition:"left .2s" }} />
                    </button>
                  </div>
                )}

                {/* Target — hidden for branch_admin (auto-set by backend) */}
                {!isBranchAdmin && (
                <div>
                  <label style={labelStyle}>Send To</label>
                  <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
                    {[
                      ["branch", selectedOffer ? `${selectedOffer.branch_name || "Offer's Branch"} customers` : "Offer's Branch"],
                      ["all",    "All Customers (all branches)"],
                    ].map(([val, lbl]) => (
                      <label key={val} style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", padding:"8px 14px", borderRadius:"8px", border:`1.5px solid ${offerTarget===val?BRAND:"#d1d5db"}`, background:offerTarget===val?"#fff5f0":"#fff", fontSize:".875rem", fontWeight:offerTarget===val?700:400 }}>
                        <input type="radio" value={val} checked={offerTarget===val} onChange={() => setOfferTarget(val)} style={{ accentColor:BRAND }} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>
                )}

                {sendErr && (
                  <div style={{ padding:"10px 14px", background:"#fee2e2", borderRadius:"8px", color:RED, fontSize:".875rem" }}>{sendErr}</div>
                )}

                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <button type="submit" disabled={sending || !offerId}
                    style={{ padding:"10px 28px", borderRadius:"9px", background:(sending||!offerId)?"#f3f4f6":BRAND, color:(sending||!offerId)?GRAY:"#fff", border:"none", fontWeight:700, fontSize:".9375rem", cursor:(sending||!offerId)?"not-allowed":"pointer" }}>
                    {sending ? "Queuing…" : "Send Offer Broadcast"}
                  </button>
                </div>
              </form>

            ) : (
              /* ══ MODE 2 — CUSTOM ══════════════════════════════════════ */
              <form onSubmit={handleSendCustom} style={{ padding:"24px", ...sectionGap }}>

                {/* Title */}
                <div>
                  <label style={labelStyle}>Title (internal label) <span style={{ color:RED }}>*</span></label>
                  <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
                    placeholder="e.g. Store Hours Update — May 2026"
                    style={inputStyle} />
                </div>

                {/* Caption / message */}
                <div>
                  <label style={labelStyle}>Caption / Message <span style={{ color:RED }}>*</span></label>
                  <textarea value={custMessage} onChange={e => setCustMessage(e.target.value)} rows={7}
                    placeholder={"Write your message here…\n\nUse *bold*, ~strikethrough~, _italic_ for WhatsApp formatting."}
                    style={{ ...inputStyle, resize:"vertical", fontFamily:"monospace", lineHeight:1.6 }} />
                  <div style={{ fontSize:".6875rem", color:GRAY, marginTop:"3px" }}>{custMessage.length} chars</div>
                </div>

                {/* Image upload */}
                <div>
                  <label style={labelStyle}>
                    Image <span style={{ fontWeight:400, color:GRAY }}>(optional — upload from device)</span>
                  </label>
                  <div style={{ display:"flex", gap:"12px", alignItems:"flex-start", flexWrap:"wrap" }}>
                    {imagePreview && (
                      <div style={{ position:"relative" }}>
                        <img src={imagePreview} alt="" onError={e => e.target.style.display="none"}
                          style={{ width:"120px", height:"90px", objectFit:"cover", borderRadius:"8px", border:"1px solid #e5e7eb" }} />
                        <button type="button" onClick={() => { setImageFile(null); setImagePreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                          style={{ position:"absolute", top:"-6px", right:"-6px", width:"20px", height:"20px", borderRadius:"50%", background:RED, color:"#fff", border:"none", fontSize:"12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          ×
                        </button>
                      </div>
                    )}
                    <div>
                      <input ref={fileRef} type="file" accept="image/*" id="img-upload"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }}
                        style={{ display:"none" }} />
                      <label htmlFor="img-upload"
                        style={{ display:"inline-flex", alignItems:"center", gap:"7px", padding:"9px 16px", borderRadius:"8px", border:"1.5px dashed #d1d5db", background:"#f9fafb", cursor:"pointer", fontSize:".875rem", color:GRAY, fontWeight:600 }}>
                        📷 {imageFile ? "Change image" : "Upload from device"}
                      </label>
                      {imageFile && <div style={{ fontSize:".75rem", color:GRAY, marginTop:"4px" }}>{imageFile.name}</div>}
                    </div>
                  </div>
                </div>

                {/* Target */}
                <div>
                  <label style={labelStyle}>Target Audience</label>
                  <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
                    {[["all","All Customers"],["branch","Specific Branch"]].map(([val,lbl]) => (
                      <label key={val} style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", padding:"8px 14px", borderRadius:"8px", border:`1.5px solid ${custTarget===val?BRAND:"#d1d5db"}`, background:custTarget===val?"#fff5f0":"#fff", fontSize:".875rem", fontWeight:custTarget===val?700:400 }}>
                        <input type="radio" value={val} checked={custTarget===val} onChange={() => setCustTarget(val)} style={{ accentColor:BRAND }} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {custTarget === "branch" && (
                  <div>
                    <label style={labelStyle}>Select Branch</label>
                    <select value={custBranchId} onChange={e => setCustBranchId(e.target.value)}
                      style={{ ...inputStyle, background:"#fff" }}>
                      <option value="">— choose branch —</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}

                {sendErr && (
                  <div style={{ padding:"10px 14px", background:"#fee2e2", borderRadius:"8px", color:RED, fontSize:".875rem" }}>{sendErr}</div>
                )}

                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <button type="submit" disabled={sending}
                    style={{ padding:"10px 28px", borderRadius:"9px", background:sending?"#f3f4f6":BRAND, color:sending?GRAY:"#fff", border:"none", fontWeight:700, fontSize:".9375rem", cursor:sending?"not-allowed":"pointer" }}>
                    {sending ? "Queuing…" : "Send Broadcast"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── History ────────────────────────────────────────────────── */}
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", overflow:"hidden" }}>
            <div style={{ padding:"16px 24px", borderBottom:"1px solid #f3f4f6", background:"#fafafa", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <span style={{ color:GRAY }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                </span>
                <span style={{ fontFamily:"var(--ff-d,Syne,sans-serif)", fontWeight:800 }}>History</span>
              </div>
              <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={async () => {
                  if (!window.confirm("Force-run ALL stuck broadcasts now (bypasses Celery)?")) return;
                  setForceAllRunning(true);
                  try {
                    const { data } = await axiosClient.post("/notifications/broadcast/force-run-all/");
                    alert(data.message || "Done.");
                    await fetchLogs();
                  } catch (err) {
                    alert(err?.response?.data?.error || "Force run all failed.");
                  } finally {
                    setForceAllRunning(false);
                  }
                }} disabled={forceAllRunning}
                  style={{ padding:"5px 12px", borderRadius:"6px", border:`1px solid ${BRAND}`, background:"#fff5f0", fontSize:".75rem", cursor:"pointer", color:BRAND, fontWeight:600, opacity:forceAllRunning?0.6:1 }}>
                  {forceAllRunning ? "Running…" : "Force Run All Stuck"}
                </button>
                <button onClick={fetchLogs}
                  style={{ padding:"5px 12px", borderRadius:"6px", border:"1px solid #e5e7eb", background:"#f9fafb", fontSize:".75rem", cursor:"pointer", color:GRAY }}>
                  Refresh
                </button>
              </div>
            </div>
            <div style={{ padding:"16px" }}>
              {histLoading ? (
                <div style={{ textAlign:"center", padding:"32px", color:GRAY }}>Loading…</div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px", color:GRAY }}>No broadcasts yet.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {logs.map(log => <BcastRow key={log.id} log={log} onRefresh={fetchLogs} />)}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
