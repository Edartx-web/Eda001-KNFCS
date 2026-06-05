/**
 * AnalyticsDashboard.jsx — Phase 4B
 * Route: /admin/analytics  /superadmin/analytics
 *
 * Sections:
 *  - Today summary: 4 stat cards
 *  - Revenue last 7 days: pure CSS bar chart
 *  - Top 5 items this month: horizontal bar chart
 *  - Peak hours heatmap: 24-slot grid
 *  - Order type split + status breakdown
 */
import React, { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import AppLayout from "../../components/layout/AppLayout";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import { useAuth } from "../../context/AuthContext";
import { getAnalytics } from "../../api/orders";
import { formatPrice } from "../../utils/format";
import axiosClient from "../../api/axiosClient";

/* ── Inject layout CSS (not in global sheet) ───────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("analytics-css")) {
  const s = document.createElement("style");
  s.id = "analytics-css";
  s.textContent = `
    /* Stat cards — 4-col desktop, 2-col mobile */
    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
    @media (max-width:700px) { .stats-grid { grid-template-columns:repeat(2,1fr); gap:10px; } }
    @media (max-width:380px) { .stats-grid { grid-template-columns:1fr; } }

    /* Revenue + Top-items — side-by-side on desktop */
    .an-two-col { display:grid; grid-template-columns:1fr 1fr; gap:var(--s5); }
    @media (max-width:760px) { .an-two-col { grid-template-columns:1fr; } }

    .an-card { background:var(--bgc); border:1px solid var(--bd); border-radius:var(--r5); }
    .card { background:var(--bgc); border:1px solid var(--bd); border-radius:var(--r5); }
  `;
  document.head.appendChild(s);
}

/* ─── Stat card ──────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s4) var(--s5)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:`linear-gradient(90deg,${color},transparent)`, borderRadius:"var(--r4) var(--r4) 0 0" }}/>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s3)" }}>
        <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)" }}>{label}</div>
        {icon && <span style={{ color, opacity:.6, fontSize:"1.1rem" }}>{icon}</span>}
      </div>
      <div style={{ fontFamily:"var(--ff-d)", fontSize:"2rem", fontWeight:900, letterSpacing:"-.02em", color, lineHeight:1, marginBottom:"4px" }}>{value}</div>
      {sub && <div style={{ fontSize:".75rem", color:"var(--t3)" }}>{sub}</div>}
    </div>
  );
}

/* ─── Revenue bar chart ──────────────────────────────────────────────── */
function RevenueChart({ data }) {
  const max = Math.max(...data.map(d => Number(d.revenue) || 0), 1);
  const barRef = useRef(null);

  useEffect(() => {
    if (!barRef.current || typeof gsap === "undefined") return;
    gsap.fromTo(
      barRef.current.querySelectorAll(".rev-bar"),
      { scaleY:0, transformOrigin:"bottom" },
      { scaleY:1, stagger:.06, duration:.45, ease:"power2.out", delay:.1 }
    );
  }, [data]);

  const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const fmt = d => {
    const dt = new Date(d);
    return DAY_LABELS[dt.getDay()];
  };

  return (
    <div ref={barRef} style={{ display:"flex", alignItems:"flex-end", gap:"var(--s2)", height:"160px", padding:"0 var(--s2)" }}>
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        const isToday = i === data.length - 1;
        return (
          <div key={d.date} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"var(--s2)" }}>
            {/* Tooltip */}
            <div style={{ fontSize:".625rem", color:"var(--t3)", fontWeight:600, whiteSpace:"nowrap" }}>
              {(d.revenue || 0) > 0 ? `₹${Math.round((d.revenue||0)/1000)}k` : "—"}
            </div>
            {/* Bar */}
            <div style={{ width:"100%", background:"var(--bg3)", borderRadius:"var(--r2) var(--r2) 0 0", overflow:"hidden", flex:1, display:"flex", alignItems:"flex-end" }}>
              <div className="rev-bar"
                style={{ width:"100%", height:`${Math.max(pct, 2)}%`, background:isToday?"linear-gradient(180deg,var(--brand),var(--brand-d))":"linear-gradient(180deg,var(--info),#2563EB)", borderRadius:"var(--r2) var(--r2) 0 0", transformOrigin:"bottom", transition:"height .3s" }}/>
            </div>
            {/* Label */}
            <div style={{ fontSize:".6875rem", color:isToday?"var(--brand)":"var(--t4)", fontWeight:isToday?800:400 }}>
              {fmt(d.date)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Horizontal bar (top items) ─────────────────────────────────────── */
function HBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom:"var(--s3)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"6px" }}>
        <span style={{ fontSize:".9375rem", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"60%" }}>{label}</span>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, color }}>{value}</span>
          {sub && <span style={{ fontSize:".75rem", color:"var(--t3)", marginLeft:"5px" }}>{sub}</span>}
        </div>
      </div>
      <div style={{ height:"6px", borderRadius:"3px", background:"var(--bg3)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${color},${color}aa)`, borderRadius:"3px", transition:"width .6s var(--ease)" }}/>
      </div>
    </div>
  );
}

/* ─── Peak hours heatmap ─────────────────────────────────────────────── */
function PeakHours({ data }) {
  const max = Math.max(...data.map(d => d.orders), 1);
  const LABELS = ["12a","1a","2a","3a","4a","5a","6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p","9p","10p","11p"];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:"var(--s1)" }}>
      {data.map((d, i) => {
        const intensity = d.orders > 0 ? Math.max(0.1, d.orders / max) : 0;
        const bg = d.orders === 0
          ? "var(--bg3)"
          : `rgba(232,82,26,${intensity.toFixed(2)})`;
        return (
          <div key={i} title={`${LABELS[i]}: ${d.orders} orders`}
            style={{ aspectRatio:"1", borderRadius:"var(--r2)", background:bg, display:"flex", alignItems:"center", justifyContent:"center", cursor:"default", transition:"transform var(--d1) var(--ease)" }}
            onMouseEnter={e => e.currentTarget.style.transform="scale(1.15)"}
            onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
            {d.orders > 0 && (
              <span style={{ fontSize:".5rem", fontWeight:800, color:intensity > .5 ? "#fff" : "var(--brand)", lineHeight:1 }}>{d.orders}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Donut-style split ──────────────────────────────────────────────── */
function SplitBar({ dineIn, pickup }) {
  const total = dineIn + pickup || 1;
  const dPct  = Math.round((dineIn / total) * 100);
  return (
    <div>
      <div style={{ height:"12px", borderRadius:"6px", overflow:"hidden", display:"flex", marginBottom:"var(--s3)" }}>
        <div style={{ width:`${dPct}%`, background:"var(--ok)", transition:"width .6s var(--ease)" }}/>
        <div style={{ flex:1, background:"var(--info)" }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:"var(--ok)" }}/>
          <span style={{ fontSize:".875rem", color:"var(--t2)" }}>Dine-in</span>
          <span style={{ fontFamily:"var(--ff-d)", fontWeight:800 }}>{dineIn}</span>
          <span style={{ fontSize:".75rem", color:"var(--t3)" }}>({dPct}%)</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:"var(--info)" }}/>
          <span style={{ fontSize:".875rem", color:"var(--t2)" }}>Pickup</span>
          <span style={{ fontFamily:"var(--ff-d)", fontWeight:800 }}>{pickup}</span>
          <span style={{ fontSize:".75rem", color:"var(--t3)" }}>({100-dPct}%)</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────── */
export default function AnalyticsDashboard() {
  const { user }   = useAuth();
  const { loading: pageLoading } = usePageLoader(800);
  const pageRef    = useRef(null);
  const isSuperAdmin = user?.role === "super_admin";

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [branches,    setBranches]    = useState([]);
  const [branchId,    setBranchId]    = useState(""); // "" = all branches
  const [compareId,   setCompareId]   = useState(""); // "" = no comparison
  const [dataB,       setDataB]       = useState(null); // comparison branch data
  const [loadingB,    setLoadingB]    = useState(false);
  const [staffStats,  setStaffStats]  = useState([]);
  const [staffLoad,   setStaffLoad]   = useState(false);

  // Load branches list for SuperAdmin selector
  useEffect(() => {
    if (!isSuperAdmin) return;
    import("../../api/auth").then(({ getBranches }) => {
      getBranches()
        .then(r => setBranches(r.data.branches || []))
        .catch(() => {});
    });
  }, [isSuperAdmin]);

  // Load analytics — re-fetch when branchId changes
  const loadAnalytics = (bid) => {
    setLoading(true); setError("");
    getAnalytics(bid || undefined)
      .then(r => setData(r.data))
      .catch(() => setError("Could not load analytics. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAnalytics(branchId); }, [branchId]);

  // Load per-staff completion stats for today
  useEffect(() => {
    setStaffLoad(true);
    const url = branchId ? `/orders/completion-stats/?branch_id=${branchId}` : "/orders/completion-stats/";
    axiosClient.get(url)
      .then(r => setStaffStats(r.data.staff_stats || []))
      .catch(() => {})
      .finally(() => setStaffLoad(false));
  }, [branchId]);

  // Load comparison branch data when compareId changes
  useEffect(() => {
    if (!compareId) { setDataB(null); return; }
    setLoadingB(true);
    getAnalytics(compareId)
      .then(r => setDataB(r.data))
      .catch(() => setDataB(null))
      .finally(() => setLoadingB(false));
  }, [compareId]);

  useEffect(() => {
    if (!loading && data && pageRef.current && typeof gsap !== "undefined") {
      gsap.fromTo(
        pageRef.current.querySelectorAll(".an-card"),
        { y:16, opacity:0 },
        { y:0, opacity:1, stagger:.07, duration:.42, ease:"power2.out" }
      );
    }
  }, [loading, data]);

  // CSV export
  const handleExportCSV = () => {
    if (!data) return;
    const fmtRev = v => (Number(v) || 0).toFixed(2);
    const rows = [
      ["Date", "Revenue (₹)", "Orders"],
      ...data.revenue_by_day.map(d => [d.date, fmtRev(d.revenue), d.order_count]),
      [],
      ["Item", "Qty Sold", "Revenue (₹)"],
      ...data.top_items.map(i => [i.name, i.quantity_sold, fmtRev(i.revenue)]),
      [],
      ["Summary"],
      ["Total Revenue (7d)", fmtRev(data.revenue_by_day.reduce((s, d) => s + (d.revenue || 0), 0))],
      ["Total Orders (7d)", data.revenue_by_day.reduce((s, d) => s + (d.order_count || 0), 0)],
      ["Today Orders",      data.today_summary?.orders  || 0],
      ["Today Revenue",     fmtRev(data.today_summary?.revenue)],
      ["Today Completed",   data.today_summary?.completed || 0],
      ["Dine-in (today)",   data.order_type_split?.dine_in || 0],
      ["Pickup (today)",    data.order_type_split?.pickup  || 0],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const selectedBranch = branches.find(b => b.id === branchId);
    a.href     = url;
    a.download = `knfc-analytics-${selectedBranch?.name || "all"}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (pageLoading) return <KNCLoader visible label="Loading analytics…"/>;

  return (
    <AppLayout>
      <div ref={pageRef} style={{ maxWidth:"960px", margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s6)", flexWrap:"wrap", gap:"var(--s4)" }}>
          <div>
            <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"var(--brand)", marginBottom:"var(--s2)" }}>
              {isSuperAdmin ? (branchId ? branches.find(b=>b.id===branchId)?.name || "Branch" : "All branches") : "Your branch"}
            </div>
            <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.75rem,4vw,2.5rem)", fontWeight:900, letterSpacing:"-.025em" }}>Analytics</h1>
            <p style={{ color:"var(--t3)", fontSize:".9375rem", marginTop:"4px" }}>
              Last 7 days · Updated live
            </p>
          </div>
          <div style={{ display:"flex", gap:"var(--s2)", alignItems:"center", flexWrap:"wrap" }}>
            {/* SuperAdmin branch selector */}
            {isSuperAdmin && branches.length > 0 && (
              <select value={branchId} onChange={e => { setBranchId(e.target.value); setCompareId(""); }}
                style={{ padding:"8px 12px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", cursor:"pointer", fontWeight:600, outline:"none" }}>
                <option value="">All branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            {/* Compare branch selector — only when a branch is selected */}
            {isSuperAdmin && branches.length > 1 && branchId && (
              <select value={compareId} onChange={e => setCompareId(e.target.value)}
                style={{ padding:"8px 12px", borderRadius:"var(--r3)", border:`1px solid ${compareId?"var(--info)":"var(--bd)"}`, background:compareId?"var(--info-t)":"var(--bgc)", color:compareId?"var(--info)":"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", cursor:"pointer", fontWeight:600, outline:"none" }}>
                <option value="">vs. branch…</option>
                {branches.filter(b => b.id !== branchId).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            {/* CSV export */}
            <button onClick={handleExportCSV} disabled={!data || loading}
              style={{ padding:"8px 16px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bgc)", cursor:data&&!loading?"pointer":"not-allowed", fontSize:".875rem", fontFamily:"var(--ff-b)", fontWeight:700, color:"var(--t2)", display:"flex", alignItems:"center", gap:"6px", opacity:data&&!loading?1:.5, transition:"all var(--d1) var(--ease)" }}
              onMouseEnter={e=>{if(data&&!loading){e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.color="var(--brand)";}}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.color="var(--t2)";}}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding:"var(--s4)", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.2)", borderRadius:"var(--r4)", color:"var(--err)", marginBottom:"var(--s5)" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="stats-grid" style={{ marginBottom:"var(--s5)" }}>
            {[1,2,3,4].map(i => <div key={i} className="skel" style={{ height:"110px", borderRadius:"var(--r4)" }}/>)}
          </div>
        ) : data && (
          <>
            {/* ── Cross-branch comparison ───────────────────────────── */}
            {compareId && dataB && (
              <section className="an-card card" style={{ padding:"var(--s5)", marginBottom:"var(--s5)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s5)" }}>
                  <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, letterSpacing:"-.015em" }}>
                    Revenue comparison — last 7 days
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"var(--s4)", fontSize:".8125rem" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      <div style={{ width:"12px", height:"12px", borderRadius:"2px", background:"var(--brand)" }}/>
                      <span style={{ fontWeight:600, color:"var(--t2)" }}>{branches.find(b=>b.id===branchId)?.name}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      <div style={{ width:"12px", height:"12px", borderRadius:"2px", background:"var(--info)" }}/>
                      <span style={{ fontWeight:600, color:"var(--t2)" }}>{branches.find(b=>b.id===compareId)?.name}</span>
                    </div>
                  </div>
                </div>
                {/* Grouped bar chart */}
                <div style={{ display:"flex", alignItems:"flex-end", gap:"var(--s3)", height:"180px", padding:"0 var(--s2)" }}>
                  {data.revenue_by_day.map((d, i) => {
                    const dB      = dataB.revenue_by_day[i] || { revenue:0 };
                    const maxVal  = Math.max(...data.revenue_by_day.map(x=>x.revenue), ...dataB.revenue_by_day.map(x=>x.revenue), 1);
                    const pctA    = (d.revenue / maxVal) * 100;
                    const pctB    = (dB.revenue / maxVal) * 100;
                    const DAY     = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                    const label   = DAY[new Date(d.date).getDay()];
                    const isToday = i === data.revenue_by_day.length - 1;
                    return (
                      <div key={d.date} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"var(--s2)" }}>
                        <div style={{ width:"100%", display:"flex", alignItems:"flex-end", gap:"2px", flex:1 }}>
                          {/* Branch A bar */}
                          <div style={{ flex:1, background:"var(--bg3)", borderRadius:"var(--r2) var(--r2) 0 0", overflow:"hidden", height:"100%", display:"flex", alignItems:"flex-end" }}>
                            <div style={{ width:"100%", height:`${Math.max(pctA,1.5)}%`, background:`linear-gradient(180deg,var(--brand),var(--brand-d))`, borderRadius:"var(--r2) var(--r2) 0 0", transition:"height .4s" }}/>
                          </div>
                          {/* Branch B bar */}
                          <div style={{ flex:1, background:"var(--bg3)", borderRadius:"var(--r2) var(--r2) 0 0", overflow:"hidden", height:"100%", display:"flex", alignItems:"flex-end" }}>
                            <div style={{ width:"100%", height:`${Math.max(pctB,1.5)}%`, background:"linear-gradient(180deg,var(--info),#2563EB)", borderRadius:"var(--r2) var(--r2) 0 0", transition:"height .4s" }}/>
                          </div>
                        </div>
                        <div style={{ fontSize:".6875rem", color:isToday?"var(--brand)":"var(--t4)", fontWeight:isToday?800:400 }}>{label}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Summary row */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s4)", marginTop:"var(--s5)" }}>
                  {[
                    { label: branches.find(b=>b.id===branchId)?.name, d: data,  color:"var(--brand)" },
                    { label: branches.find(b=>b.id===compareId)?.name, d: dataB, color:"var(--info)"  },
                  ].map(({ label, d, color }) => (
                    <div key={label} style={{ background:"var(--bg2)", borderRadius:"var(--r3)", padding:"var(--s3) var(--s4)", borderLeft:`3px solid ${color}` }}>
                      <div style={{ fontSize:".75rem", fontWeight:700, color, letterSpacing:".04em", textTransform:"uppercase", marginBottom:"var(--s2)" }}>{label}</div>
                      <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, color }}>
                        {formatPrice(d.revenue_by_day.reduce((s,x)=>s+(x.revenue||0),0))}
                      </div>
                      <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>
                        {d.revenue_by_day.reduce((s,x)=>s+(x.order_count||0),0)} orders · 7 days
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {loadingB && compareId && (
              <div className="skel" style={{ height:"260px", borderRadius:"var(--r5)", marginBottom:"var(--s5)" }}/>
            )}

            {/* ── Today summary ────────────────────────────────────── */}
            <section className="an-card stats-grid" style={{ marginBottom:"var(--s5)" }}>
              <StatCard label="Orders today"    value={data.today_summary?.orders    || 0}                             color="var(--info)"  icon="📋" sub="All statuses"/>
              <StatCard label="Revenue today"   value={formatPrice(data.today_summary?.revenue || 0)}               color="var(--brand)" icon="💰" sub={`Avg ${formatPrice(data.today_summary?.avg_order_value || 0)}`}/>
              <StatCard label="Completed"       value={data.today_summary?.completed || 0}                          color="var(--ok)"    icon="✅" sub="Fully served"/>
              <StatCard label="In queue"        value={data.status_breakdown?.placed  || 0}                         color="var(--warn)"  icon="🍳" sub={`+${data.status_breakdown?.confirmed || 0} confirmed`}/>
            </section>

            {/* ── Revenue chart ─────────────────────────────────────── */}
            <div style={{ marginBottom:"var(--s5)" }} className="an-two-col">
              <section className="an-card card" style={{ padding:"var(--s5)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, marginBottom:"var(--s5)", letterSpacing:"-.015em" }}>
                  Revenue — last 7 days
                </div>
                <RevenueChart data={data.revenue_by_day}/>
                <div style={{ display:"flex", gap:"var(--s4)", marginTop:"var(--s4)", paddingTop:"var(--s3)", borderTop:"1px solid var(--bd)" }}>
                  <div>
                    <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"3px" }}>7-day total</div>
                    <div className="price" style={{ fontSize:"1.375rem" }}>
                      {formatPrice(data.revenue_by_day.reduce((s,d) => s + (d.revenue || 0), 0))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:"3px" }}>7-day orders</div>
                    <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, color:"var(--info)" }}>
                      {data.revenue_by_day.reduce((s,d) => s + (Number(d.order_count) || 0), 0)}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Top items ─────────────────────────────────────── */}
              <section className="an-card card" style={{ padding:"var(--s5)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, marginBottom:"var(--s5)", letterSpacing:"-.015em" }}>
                  Top items — this month
                </div>
                {data.top_items.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"var(--s8)", color:"var(--t3)" }}>No data yet</div>
                ) : data.top_items.map((item, i) => (
                  <HBar
                    key={item.name}
                    label={`${i+1}. ${item.name}`}
                    value={Number(item.quantity_sold) || 0}
                    max={Math.max(Number(data.top_items[0]?.quantity_sold) || 0, 1)}
                    color="var(--brand)"
                    sub={`sold · ${formatPrice(item.revenue || 0)}`}
                  />
                ))}
              </section>
            </div>

            {/* ── Peak hours ────────────────────────────────────────── */}
            <section className="an-card card" style={{ padding:"var(--s5)", marginBottom:"var(--s5)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"var(--s5)" }}>
                <div>
                  <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, letterSpacing:"-.015em" }}>Peak hours</div>
                  <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:"3px" }}>Order density by hour — last 7 days</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
                  <div style={{ width:"10px", height:"10px", borderRadius:"2px", background:"var(--bg3)" }}/>
                  <span style={{ fontSize:".75rem", color:"var(--t3)" }}>Low</span>
                  <div style={{ width:"10px", height:"10px", borderRadius:"2px", background:"rgba(232,82,26,.5)" }}/>
                  <span style={{ fontSize:".75rem", color:"var(--t3)" }}>High</span>
                </div>
              </div>
              <PeakHours data={data.peak_hours}/>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:"var(--s1)", marginTop:"var(--s2)" }}>
                {["12a","","","","4a","","","","8a","","","","12p","","","","4p","","","","8p","","",""].slice(0,12).map((l,i) => (
                  <div key={i} style={{ fontSize:".5rem", color:"var(--t4)", textAlign:"center" }}>{i===0?"12a":i===4?"4a":i===8?"8a":""}</div>
                ))}
              </div>
              {/* Find peak */}
              {(() => {
                const peak = data.peak_hours.reduce((a,b) => (Number(b.orders)||0) > (Number(a.orders)||0) ? b : a, data.peak_hours[0] || { hour:0, orders:0 });
                const HOURS = ["12am","1am","2am","3am","4am","5am","6am","7am","8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm","10pm","11pm"];
                return peak.orders > 0 ? (
                  <div style={{ marginTop:"var(--s4)", padding:"var(--s3) var(--s4)", background:"var(--brand-tint)", border:"1px solid var(--bdb)", borderRadius:"var(--r3)", fontSize:".875rem" }}>
                    🔥 Peak hour: <strong style={{ color:"var(--brand)" }}>{HOURS[peak.hour]}</strong> with {peak.orders} orders on average
                  </div>
                ) : null;
              })()}
            </section>

            {/* ── Order type split ──────────────────────────────────── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s5)", marginBottom:"var(--s5)" }} className="an-two-col-sm">
              <section className="an-card card" style={{ padding:"var(--s5)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, marginBottom:"var(--s4)", letterSpacing:"-.015em" }}>
                  Order type — today
                </div>
                <SplitBar
                  dineIn={Number(data.order_type_split?.dine_in) || 0}
                  pickup={Number(data.order_type_split?.pickup)  || 0}
                />
              </section>

              <section className="an-card card" style={{ padding:"var(--s5)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, marginBottom:"var(--s4)", letterSpacing:"-.015em" }}>
                  Status breakdown — today
                </div>
                {Object.entries({
                  placed:"Placed",confirmed:"Confirmed",preparing:"Preparing",
                  ready:"Ready",completed:"Completed",cancelled:"Cancelled"
                }).map(([key, label]) => {
                  const n = data.status_breakdown[key] || 0;
                  const colors = { placed:"var(--info)",confirmed:"var(--ok)",preparing:"var(--warn)",ready:"var(--brand)",completed:"var(--t3)",cancelled:"var(--err)" };
                  return n > 0 ? (
                    <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"var(--s2) 0", borderBottom:"1px solid var(--bd)" }}>
                      <span style={{ fontSize:".875rem", color:"var(--t2)" }}>{label}</span>
                      <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, color:colors[key] }}>{n}</span>
                    </div>
                  ) : null;
                })}
                {Object.values(data.status_breakdown).every(v => !v) && (
                  <p style={{ color:"var(--t3)", fontSize:".875rem" }}>No orders today yet</p>
                )}
              </section>
            </div>
            {/* ── Staff performance ─────────────────────────────────── */}
            <section className="an-card card" style={{ padding:"var(--s5)", marginBottom:"var(--s5)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s5)" }}>
                <div>
                  <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, letterSpacing:"-.015em" }}>Staff Performance</div>
                  <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>Orders completed today · by staff member</div>
                </div>
                <span style={{ fontSize:"1.25rem" }}>🏆</span>
              </div>
              {staffLoad ? (
                <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                  {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"52px", borderRadius:"var(--r3)" }}/>)}
                </div>
              ) : staffStats.length === 0 ? (
                <div style={{ textAlign:"center", padding:"var(--s8)", color:"var(--t3)", fontSize:".9375rem" }}>
                  No completions recorded today yet
                </div>
              ) : (
                <div>
                  {[...staffStats].sort((a,b) => b.completed - a.completed).map((s, i) => {
                    const medal = i===0 ? "#F5A623" : i===1 ? "#9EA8B7" : i===2 ? "#cd7f32" : "var(--bg3)";
                    const pct   = Math.round((s.completed / Math.max(...staffStats.map(x=>x.completed),1)) * 100);
                    return (
                      <div key={s.staff_id} style={{ display:"flex", alignItems:"center", gap:"var(--s3)", padding:"var(--s3) 0", borderBottom: i < staffStats.length-1 ? "1px solid var(--bd)" : "none" }}>
                        <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:medal, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--ff-d)", fontSize:".8125rem", fontWeight:800, color:i<3?"#000":"var(--t3)", flexShrink:0 }}>
                          {i+1}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:".9375rem", marginBottom:"3px" }}>{s.name}</div>
                          <div style={{ height:"4px", background:"var(--bg3)", borderRadius:"var(--rf)", overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,var(--ok),var(--brand))`, borderRadius:"var(--rf)", transition:"width .4s" }}/>
                          </div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, color:"var(--ok)", lineHeight:1 }}>{s.completed}</div>
                          <div style={{ fontSize:".6875rem", color:"var(--t4)", fontWeight:700, letterSpacing:".04em", textTransform:"uppercase" }}>{s.role === "branch_admin" ? "Admin" : "Staff"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <style>{`
        @media(min-width:900px){
          .an-two-col{grid-template-columns:1fr 1fr !important}
          .an-two-col-sm{grid-template-columns:1fr 1fr !important}
        }
      `}</style>
    </AppLayout>
  );
}
