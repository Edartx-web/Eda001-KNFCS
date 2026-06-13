/**
 * AdminOffersPage.jsx
 *
 * SuperAdmin:  Full CRUD — create, edit, delete offers
 * BranchAdmin: Read-only — can VIEW offers for their branch
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { gsap }              from "gsap";
import AppLayout             from "../../components/layout/AppLayout";
import KNCLoader from "../../components/common/KNCLoader";
import { useAuth }           from "../../context/AuthContext";
import { getBranches, createOffer, updateOffer, deleteOffer } from "../../api/auth";
import { getOfferDetail }    from "../../api/orders";
import axiosClient           from "../../api/axiosClient";
import { formatPrice }       from "../../utils/format";

/* ── helpers ────────────────────────────────────────────────────────── */
const BID = () => localStorage.getItem("branch_id") || "";

const getOffers = (branchId) =>
  axiosClient.get(`/offers/?branch_id=${branchId || BID()}`);

/* ── Countdown display ──────────────────────────────────────────────── */
function Countdown({ endAt }) {
  const [secs, setSecs] = useState(() => {
    const delta = new Date(endAt) - Date.now();
    return Math.max(0, Math.floor(delta / 1000));
  });
  useEffect(() => {
    if (!secs) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [!!secs]);
  if (!secs) return <span className="badge badge-err">Expired</span>;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return (
    <span style={{ fontFamily:"var(--ff-d)", fontSize:".8125rem", color:"var(--warn)", fontWeight:700 }}>
      {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
    </span>
  );
}

/* ── Offer type labels ──────────────────────────────────────────────── */
const TYPE_LABELS = {
  percentage:    "% Discount",
  flat:          "₹ Flat Off",
  combo:         "Combo Deal",
  free_item:     "Buy X Get Y",
  bogo:          "Buy 1 Get 1",
  welcome:       "Welcome Bonus",
  referral:      "Share & Earn",
  re_engagement: "Re-engage",
  scratch_card:  "Scratch Card",
};

/* ── Random coupon code generator ──────────────────────────────────── */
function genCoupon(prefix = "KNFC") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${prefix}${rand}`;
}

/* ── Drawer ─────────────────────────────────────────────────────────── */
function Drawer({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || typeof gsap === "undefined") return;
    gsap.to(ref.current, { x: open ? 0 : "100%", duration:.35, ease: open?"power2.out":"power2.in" });
  }, [open]);
  return (
    <>
      {open && <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.5)", backdropFilter:"blur(4px)" }} />}
      <div ref={ref} style={{ position:"fixed", top:0, right:0, bottom:0, zIndex:310, width:"min(560px,96vw)", background:"var(--bgc)", borderLeft:"1px solid var(--bd)", boxShadow:"var(--sh-xl)", display:"flex", flexDirection:"column", transform:"translateX(100%)" }}>
        <div style={{ padding:"var(--s5) var(--s6)", borderBottom:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:700 }}>{title}</h2>
          <button onClick={onClose} className="btn btn-g btn-ico">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"var(--s6)" }}>{children}</div>
      </div>
    </>
  );
}

/* ── Offer form (create / edit) ─────────────────────────────────────── */
function OfferForm({ initial, branches, isSuperAdmin, onSave, onClose, saving }) {
  // branch_scope: "this" | "selected" | "all"
  const initScope = initial?.all_branches
    ? "all"
    : (initial?.selected_branches?.length > 0 ? "selected" : "this");
  const [branchScope,        setBranchScope]        = useState(initScope);
  const [selectedBranchIds,  setSelectedBranchIds]  = useState(
    initial?.selected_branches?.map(b => (typeof b === "object" ? b.id : b)) || []
  );

  const [form, setForm] = useState({
    branch_id:               initial?.branch || "",
    name:                    initial?.name || "",
    tagline:                 initial?.tagline || "",
    offer_type:              initial?.offer_type || "percentage",
    discount_percentage:     initial?.discount_percentage || "",
    discount_flat:           initial?.discount_flat || "",
    original_price:          initial?.original_price || "",
    offer_price:             initial?.offer_price || "",
    start_at:                initial?.start_at ? initial.start_at.slice(0,16) : new Date().toISOString().slice(0,16),
    end_at:                  initial?.end_at ? initial.end_at.slice(0,16) : "",
    carousel_order:          initial?.carousel_order || 0,
    is_active:               initial?.is_active ?? true,
    auto_broadcast:          initial?.auto_broadcast ?? false,
    emoji:                   initial?.emoji || "",
    min_order_value:         initial?.min_order_value || "",
    max_redemptions_per_user: initial?.max_redemptions_per_user || 0,
    first_order_only:        initial?.first_order_only ?? false,
    require_coupon:          initial?.require_coupon ?? false,
    lifetime:                !initial?.end_at,  // UI-only: true = no end date
    category_id:             initial?.category || "",
    coupon_code:             initial?.coupon_code || "",
    // WELCOME
    welcome_bonus_amount:    initial?.welcome_bonus_amount || "",
    // REFERRAL
    referral_reward_type:    initial?.referral_reward_type || "coupon",
    referral_reward_value:   initial?.referral_reward_value || "",
    referral_min_friend_order: initial?.referral_min_friend_order || "",
    referral_reward_on_signup: initial?.referral_reward_on_signup ?? false,
    // RE_ENGAGEMENT
    inactive_days:           initial?.inactive_days || 7,
    reengagement_message:    initial?.reengagement_message || "",
  });

  const [image,          setImage]          = useState(null);
  const [video,          setVideo]          = useState(null);
  const [errors,         setErrors]         = useState({});
  const [comboItems,     setComboItems]     = useState(
    initial?.offer_items?.map(i => ({ menu_item_id: i.menu_item, name: i.menu_item_name || "", quantity: i.quantity, notes: i.notes || "" })) || []
  );
  // applies_to: specific items that get the discount (non-combo types)
  const [appliesTo,      setAppliesTo]      = useState(
    initial?.applies_to_details || []  // [{id, name}]
  );
  const [menuItems,      setMenuItems]      = useState([]);
  const [itemSearch,     setItemSearch]     = useState("");
  const [appliesToSearch, setAppliesToSearch] = useState("");

  const [categories,  setCategories]  = useState([]);
  const COMBO_TYPES = ["combo", "free_item", "bogo"];
  const isCombo = COMBO_TYPES.includes(form.offer_type);

  // Effective branch for loading menu items/categories
  const effectiveBranchId = branchScope === "this" ? form.branch_id
    : branchScope === "selected" ? (selectedBranchIds[0] || "")
    : (branches[0]?.id || "");

  useEffect(() => {
    if (!effectiveBranchId) return;
    axiosClient.get("/menu/items/", { params: { branch_id: effectiveBranchId, available: "" } })
      .then(r => setMenuItems(r.data.items || []))
      .catch(() => {});
  }, [effectiveBranchId]);

  useEffect(() => {
    if (!effectiveBranchId) return;
    axiosClient.get(`/menu/categories/?branch_id=${effectiveBranchId}`)
      .then(r => setCategories(r.data.categories || []))
      .catch(() => {});
  }, [effectiveBranchId]);

  const set = (k, v) => { setForm(f => ({...f,[k]:v})); setErrors(e => ({...e,[k]:""})); };

  const addComboItem = (item) => {
    if (comboItems.find(ci => ci.menu_item_id === item.id)) return; // already added
    setComboItems(ci => [...ci, { menu_item_id: item.id, name: item.name, quantity: 1, notes: "" }]);
    setItemSearch("");
  };

  const updateComboItem = (idx, field, value) => {
    setComboItems(ci => ci.map((item, i) => i === idx ? {...item, [field]: value} : item));
  };

  const removeComboItem = (idx) => {
    setComboItems(ci => ci.filter((_, i) => i !== idx));
  };

  const handleSubmit = e => {
    e.preventDefault();
    const errs = {};
    if (branchScope === "this" && !form.branch_id) errs.branch_scope = "Select a branch";
    if (branchScope === "selected" && selectedBranchIds.length === 0) errs.branch_scope = "Select at least one branch";
    if (!form.name.trim()) errs.name       = "Name is required";
    if (!form.offer_type)  errs.offer_type = "Select offer type";
    if (!form.lifetime && !form.end_at) errs.end_at = "End date is required (or enable Lifetime)";
    if (isCombo && comboItems.length === 0) errs.combo = "Add at least one item to the combo";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const fd = new FormData();
    const BOOL_FIELDS = ["is_active", "auto_broadcast", "first_order_only", "require_coupon", "referral_reward_on_signup"];
    const { lifetime, ...formFields } = form;
    Object.entries(formFields).forEach(([k, v]) => {
      if (k === "branch_id") return; // handled below per scope
      if (k === "end_at" && lifetime) return;
      if (BOOL_FIELDS.includes(k)) { fd.set(k, v ? "true" : "false"); return; }
      if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
    });

    // Branch scope packing
    if (branchScope === "all") {
      fd.set("all_branches", "true");
      fd.set("branch_id", branches[0]?.id || "");
      fd.append("selected_branch_ids", JSON.stringify([]));
    } else if (branchScope === "selected") {
      fd.set("all_branches", "false");
      fd.set("branch_id", selectedBranchIds[0] || "");
      fd.append("selected_branch_ids", JSON.stringify(selectedBranchIds));
    } else {
      fd.set("all_branches", "false");
      fd.set("branch_id", form.branch_id);
      fd.append("selected_branch_ids", JSON.stringify([]));
    }

    if (image) fd.append("image", image);
    if (video) fd.append("video", video);
    if (isCombo && comboItems.length > 0) {
      fd.append("offer_items", JSON.stringify(
        comboItems.map(ci => ({ menu_item_id: ci.menu_item_id, quantity: Number(ci.quantity) || 1, notes: ci.notes || "" }))
      ));
    }
    fd.append("applies_to_ids", JSON.stringify(appliesTo.map(i => i.id)));
    onSave(fd);
  };

  const TYPES = [
    ["percentage","% Discount"],["flat","₹ Flat Off"],
    ["combo","Combo Deal"],["free_item","Buy X Get Y"],["bogo","BOGO"],
    ["welcome","Welcome Bonus"],["referral","Share & Earn"],
    ["re_engagement","Re-engage"],["scratch_card","Scratch Card"],
  ];

  const FL = ({ children, req }) => (
    <label style={{ display:"block", fontSize:".75rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s1)" }}>
      {children}{req && <span style={{ color:"var(--err)", marginLeft:"3px" }}>*</span>}
    </label>
  );

  const SectionHead = ({ children }) => (
    <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", padding:"var(--s3) 0 var(--s2)", borderTop:"1px solid var(--bd)", marginTop:"var(--s2)", marginBottom:"var(--s3)" }}>
      {children}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:0 }}>

      {/* ── Basic Info ───────────────────────────── */}
      {/* Branch Scope */}
      <FL req>Branch Scope</FL>
      <div style={{ display:"flex", gap:"var(--s2)", marginBottom:"var(--s3)", flexWrap:"wrap" }}>
        {[
          ["this",     "This Branch Only"],
          ["selected", "Selected Branches"],
          ...(isSuperAdmin ? [["all", "All Branches"]] : []),
        ].map(([val, lbl]) => (
          <button key={val} type="button"
            onClick={() => setBranchScope(val)}
            style={{ padding:"8px 14px", borderRadius:"var(--r3)", fontSize:".8125rem", fontWeight:600, fontFamily:"var(--ff-b)", cursor:"pointer", transition:"all var(--d1) var(--ease)", border:`1.5px solid ${branchScope===val?"var(--brand)":"var(--bd)"}`, background:branchScope===val?"var(--brand-tint)":"var(--bg2)", color:branchScope===val?"var(--brand)":"var(--t2)" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* This Branch — single dropdown */}
      {branchScope === "this" && (
        <div className={`input-wrap${errors.branch_scope?" err":""}`} style={{ marginBottom:"var(--s4)" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)}
            style={{ flex:1, border:"none", background:"transparent", color:form.branch_id?"var(--t1)":"var(--t4)", fontSize:".9375rem", outline:"none", padding:"0 var(--s2)", fontFamily:"var(--ff-b)", cursor:"pointer" }}>
            <option value="">Select branch…</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {/* Selected Branches — checkboxes */}
      {branchScope === "selected" && (
        <div style={{ border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"var(--s3)", marginBottom:"var(--s4)", display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
          {branches.map(b => {
            const checked = selectedBranchIds.includes(b.id);
            return (
              <label key={b.id} style={{ display:"flex", alignItems:"center", gap:"var(--s2)", cursor:"pointer", fontSize:".9rem", color:"var(--t1)" }}>
                <input type="checkbox" checked={checked}
                  onChange={() => setSelectedBranchIds(ids => checked ? ids.filter(id => id !== b.id) : [...ids, b.id])}
                  style={{ width:"16px", height:"16px", accentColor:"var(--brand)", cursor:"pointer" }} />
                {b.name}
              </label>
            );
          })}
          {branches.length === 0 && <span style={{ color:"var(--t4)", fontSize:".85rem" }}>No branches found</span>}
        </div>
      )}

      {/* All Branches — info chip */}
      {branchScope === "all" && (
        <div style={{ background:"var(--brand-tint)", border:"1px solid var(--brand)", borderRadius:"var(--r3)", padding:"var(--s3) var(--s4)", marginBottom:"var(--s4)", fontSize:".875rem", color:"var(--brand)", fontWeight:600 }}>
          This offer will be visible to customers of ALL branches.
        </div>
      )}

      {errors.branch_scope && <p style={{ color:"var(--err)", fontSize:".75rem", marginTop:"-10px", marginBottom:"var(--s3)" }}>{errors.branch_scope}</p>}

      {/* Name */}
      <FL req>Offer name</FL>
      <div className={`input-wrap${errors.name?" err":""}`} style={{ marginBottom:"var(--s4)" }}>
        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Mega Monday" className="input-field" autoFocus />
      </div>

      {/* Tagline */}
      <FL>Tagline (shown on card)</FL>
      <div className="input-wrap" style={{ marginBottom:"var(--s4)" }}>
        <input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="e.g. Limited time deal — don't miss out!" className="input-field" />
      </div>

      <SectionHead>Offer Type</SectionHead>
      <FL req>Type</FL>
      <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap", marginBottom:"var(--s4)" }}>
        {TYPES.map(([val, lbl]) => (
          <button key={val} type="button" onClick={() => set("offer_type", val)}
            style={{ padding:"8px 14px", borderRadius:"var(--r3)", fontSize:".8125rem", fontWeight:600, fontFamily:"var(--ff-b)", cursor:"pointer", transition:"all var(--d1) var(--ease)", border:`1.5px solid ${form.offer_type===val?"var(--brand)":"var(--bd)"}`, background:form.offer_type===val?"var(--brand-tint)":"var(--bg2)", color:form.offer_type===val?"var(--brand)":"var(--t2)" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Combo item builder — shown only for combo/free_item/bogo */}
      {isCombo && (
        <div style={{ marginBottom:"var(--s4)" }}>
          <FL req>Combo items</FL>
          {/* Item search */}
          <div className="input-wrap" style={{ marginBottom:"var(--s3)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={itemSearch} onChange={e => setItemSearch(e.target.value)}
              placeholder={form.branch_id ? "Search menu items to add…" : "Select a branch first"}
              disabled={!form.branch_id} className="input-field"/>
          </div>
          {/* Dropdown results */}
          {itemSearch.length > 0 && (
            <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", marginBottom:"var(--s3)", maxHeight:"160px", overflowY:"auto", boxShadow:"var(--sh-md)" }}>
              {menuItems.filter(m => m.name.toLowerCase().includes(itemSearch.toLowerCase())).slice(0,8).map(m => (
                <button key={m.id} type="button" onClick={() => addComboItem(m)}
                  style={{ width:"100%", textAlign:"left", padding:"var(--s2) var(--s3)", background:"none", border:"none", borderBottom:"1px solid var(--bd)", cursor:"pointer", fontSize:".875rem", display:"flex", alignItems:"center", gap:"var(--s2)", transition:"background var(--d1) var(--ease)" }}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
                  <span style={{ fontWeight:500 }}>{m.name}</span>
                  <span style={{ marginLeft:"auto", color:"var(--t3)", fontSize:".8125rem" }}>₹{m.price}</span>
                </button>
              ))}
              {menuItems.filter(m => m.name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                <div style={{ padding:"var(--s3)", color:"var(--t3)", fontSize:".875rem", textAlign:"center" }}>No items found</div>
              )}
            </div>
          )}
          {/* Selected items */}
          {comboItems.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)", marginBottom:"var(--s2)" }}>
              {comboItems.map((ci, idx) => (
                <div key={ci.menu_item_id} style={{ display:"grid", gridTemplateColumns:"1fr 60px 1fr auto", gap:"var(--s2)", alignItems:"center", padding:"var(--s2) var(--s3)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)" }}>
                  <div style={{ fontWeight:600, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ci.name}</div>
                  <input type="number" min="1" max="20" value={ci.quantity}
                    onChange={e => updateComboItem(idx, "quantity", e.target.value)}
                    style={{ border:"1px solid var(--bd)", borderRadius:"var(--r2)", padding:"4px 6px", fontSize:".875rem", background:"var(--bgc)", color:"var(--t1)", outline:"none", textAlign:"center", fontFamily:"var(--ff-b)", width:"100%" }}/>
                  <input value={ci.notes} onChange={e => updateComboItem(idx, "notes", e.target.value)}
                    placeholder="Note (optional)"
                    style={{ border:"1px solid var(--bd)", borderRadius:"var(--r2)", padding:"4px var(--s2)", fontSize:".8125rem", background:"var(--bgc)", color:"var(--t1)", outline:"none", fontFamily:"var(--ff-b)", width:"100%" }}/>
                  <button type="button" onClick={() => removeComboItem(idx)}
                    style={{ width:"22px", height:"22px", borderRadius:"var(--r2)", border:"none", background:"var(--err-t)", cursor:"pointer", color:"var(--err)", fontSize:"13px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding:"var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px dashed var(--bd)", textAlign:"center", color:"var(--t3)", fontSize:".875rem", marginBottom:"var(--s2)" }}>
              Search and add items to build this combo
            </div>
          )}
          {errors.combo && <p style={{ color:"var(--err)", fontSize:".75rem", marginBottom:"var(--s2)" }}>{errors.combo}</p>}
        </div>
      )}

      {/* ── Type description badge — explains unique mechanism ─── */}
      {form.offer_type === "welcome" && (
        <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(55,138,221,.06)", border:"1px solid rgba(55,138,221,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s4)", fontSize:".8125rem", color:"var(--info)", lineHeight:1.6 }}>
          <strong>How this works:</strong> Auto-applied on each customer's very first order after signup. No coupon entry needed — the system checks automatically. Each customer can only use it once ever.
        </div>
      )}
      {form.offer_type === "referral" && (
        <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(29,158,117,.06)", border:"1px solid rgba(29,158,117,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s4)", fontSize:".8125rem", color:"var(--ok)", lineHeight:1.6 }}>
          <strong>How this works:</strong> Every customer gets their own unique shareable link. We track exactly who joined through whose link. When their friend qualifies, the referrer earns a reward via WhatsApp automatically — no generic coupon, every link is tied to one specific customer.
        </div>
      )}
      {form.offer_type === "re_engagement" && (
        <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(239,159,39,.06)", border:"1px solid rgba(239,159,39,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s4)", fontSize:".8125rem", color:"var(--warn)", lineHeight:1.6 }}>
          <strong>How this works:</strong> You set an "inactive after X days" threshold. A Celery background job checks daily — any customer who hasn't ordered in that many days gets a WhatsApp message with your coupon code. Each customer only gets it once per offer cycle. You can also fire it manually from the Redemptions tab.
        </div>
      )}
      {form.offer_type === "scratch_card" && (
        <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(124,58,237,.06)", border:"1px solid rgba(124,58,237,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s4)", fontSize:".8125rem", color:"#7C3AED", lineHeight:1.6 }}>
          <strong>How this works:</strong> A digital scratch card appears on the customer's Offers page. They scratch 50%+ of the surface — the coupon code and discount are revealed underneath. They copy the code and enter it at cart checkout to claim the discount. You set the code + discount; the system handles the reveal animation. Each customer can scratch once (or per your max-uses setting).
        </div>
      )}

      {/* ══ WELCOME — bonus amount + min order ══ */}
      {form.offer_type === "welcome" && (
        <>
          <SectionHead>Welcome Bonus</SectionHead>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL req>Bonus amount (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.welcome_bonus_amount}
                  onChange={e => set("welcome_bonus_amount", e.target.value)}
                  placeholder="e.g. 50" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>Fixed ₹ off the customer's first order</p>
            </div>
            <div>
              <FL>Min. order value (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.min_order_value}
                  onChange={e => set("min_order_value", e.target.value)}
                  placeholder="e.g. 199 (leave blank = any)" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>Minimum cart value to claim bonus</p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", padding:"var(--s3) var(--s4)", background:"rgba(55,138,221,.06)", border:"1px solid rgba(55,138,221,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s4)", fontSize:".8125rem", color:"var(--info)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            First-order restriction is always on for Welcome type — customers can only use it once.
          </div>
        </>
      )}

      {/* ══ REFERRAL — reward settings ══ */}
      {form.offer_type === "referral" && (
        <>
          <SectionHead>Reward Settings</SectionHead>
          <FL req>Reward type for referrer</FL>
          <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap", marginBottom:"var(--s4)" }}>
            {[["coupon","Coupon Code"],["scratch","Scratch Card"],["discount","Direct Discount"]].map(([v,l]) => (
              <button key={v} type="button" onClick={() => set("referral_reward_type", v)}
                style={{ padding:"8px 14px", borderRadius:"var(--r3)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", transition:"all var(--d1) var(--ease)", border:`1.5px solid ${form.referral_reward_type===v?"var(--brand)":"var(--bd)"}`, background:form.referral_reward_type===v?"var(--brand-tint)":"var(--bg2)", color:form.referral_reward_type===v?"var(--brand)":"var(--t2)", fontFamily:"var(--ff-b)" }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL req>Reward value (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.referral_reward_value}
                  onChange={e => set("referral_reward_value", e.target.value)}
                  placeholder="e.g. 30" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>₹ reward sent to the referrer per qualified friend</p>
            </div>
            <div>
              <FL>Friend's min order (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.referral_min_friend_order}
                  onChange={e => set("referral_min_friend_order", e.target.value)}
                  placeholder="0 = any order" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>Friend must spend this to trigger the reward</p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s4)", background:form.referral_reward_on_signup?"var(--ok-t)":"var(--bg2)", border:`1px solid ${form.referral_reward_on_signup?"rgba(29,158,117,.3)":"var(--bd)"}`, borderRadius:"var(--r3)", marginBottom:"var(--s4)", cursor:"pointer" }}
            onClick={() => set("referral_reward_on_signup", !form.referral_reward_on_signup)}>
            <div>
              <div style={{ fontWeight:700, fontSize:".9375rem", color:form.referral_reward_on_signup?"var(--ok)":"var(--t1)" }}>Reward on signup (instant)</div>
              <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>Give reward the moment friend signs up — no need to wait for first order</div>
            </div>
            <button type="button" className={`toggle ${form.referral_reward_on_signup?"on":"off"}`} style={{ flexShrink:0 }}><div className="toggle-knob"/></button>
          </div>
          <div>
            <FL>Max uses per customer</FL>
            <div className="input-wrap" style={{ marginBottom:"var(--s2)" }}>
              <input type="number" min="0" value={form.max_redemptions_per_user}
                onChange={e => set("max_redemptions_per_user", e.target.value)}
                placeholder="0 = unlimited" className="input-field"/>
            </div>
            <p style={{ fontSize:".6875rem", color:"var(--t4)", marginBottom:"var(--s4)" }}>Max number of friends a customer can refer for rewards (0 = unlimited)</p>
          </div>
        </>
      )}

      {/* ══ RE_ENGAGEMENT — discount + coupon + inactive days ══ */}
      {form.offer_type === "re_engagement" && (
        <>
          <SectionHead>Re-engagement Offer</SectionHead>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL req>Inactive after (days)</FL>
              <div className="input-wrap">
                <input type="number" min="1" max="365" value={form.inactive_days}
                  onChange={e => set("inactive_days", e.target.value)}
                  placeholder="7" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>Target customers with no orders in this many days</p>
            </div>
            <div>
              <FL>Discount %</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>%</span>
                <input type="number" min="0" max="100" value={form.discount_percentage}
                  onChange={e => set("discount_percentage", e.target.value)}
                  placeholder="e.g. 20" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>% off to offer via WhatsApp</p>
            </div>
            <div>
              <FL>Flat discount (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.discount_flat}
                  onChange={e => set("discount_flat", e.target.value)}
                  placeholder="e.g. 40" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>Flat ₹ off (use % or ₹, not both)</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL req>Coupon code</FL>
              <div style={{ display:"flex", gap:"var(--s2)", marginBottom:0 }}>
                <div className="input-wrap" style={{ flex:1, marginBottom:0 }}>
                  <input value={form.coupon_code} onChange={e => set("coupon_code", e.target.value.toUpperCase())}
                    placeholder="e.g. COMEBACK20" maxLength={30}
                    style={{ flex:1, border:"none", background:"transparent", fontSize:".9375rem", outline:"none", fontFamily:"monospace", fontWeight:700, letterSpacing:".06em", color:"var(--t1)" }}
                    className="input-field"/>
                </div>
                <button type="button" onClick={() => set("coupon_code", genCoupon("RE"))}
                  style={{ padding:"0 var(--s3)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontSize:".75rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  Generate
                </button>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>Included in the WhatsApp message so the customer can paste it at cart</p>
            </div>
            <div>
              <FL>Min. order value (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.min_order_value}
                  onChange={e => set("min_order_value", e.target.value)}
                  placeholder="leave blank = any" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>Minimum spend to redeem</p>
            </div>
          </div>
          <FL>Custom WhatsApp message <span style={{ fontWeight:400, color:"var(--t4)" }}>(optional)</span></FL>
          <textarea value={form.reengagement_message}
            onChange={e => set("reengagement_message", e.target.value)}
            placeholder={"We miss you, {name}! Come back and get {discount} off with code {code} 🍗"}
            rows={3}
            style={{ width:"100%", padding:"var(--s3) var(--s4)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", background:"var(--bg2)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", resize:"vertical", outline:"none", boxSizing:"border-box", marginBottom:"var(--s2)" }}/>
          <p style={{ fontSize:".6875rem", color:"var(--t4)", marginBottom:"var(--s4)" }}>
            Placeholders: <code>{"{name}"}</code> · <code>{"{discount}"}</code> · <code>{"{code}"}</code>
          </p>
        </>
      )}

      {/* ══ PERCENTAGE — discount % + original price ══ */}
      {form.offer_type === "percentage" && (
        <>
          <SectionHead>Discount</SectionHead>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL req>Discount %</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>%</span>
                <input type="number" min="0" max="100" value={form.discount_percentage}
                  onChange={e => set("discount_percentage", e.target.value)} placeholder="e.g. 30" className="input-field"/>
              </div>
            </div>
            <div>
              <FL>Original price (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.original_price}
                  onChange={e => set("original_price", e.target.value)} placeholder="MRP (optional)" className="input-field"/>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ FLAT — flat ₹ off + original price ══ */}
      {form.offer_type === "flat" && (
        <>
          <SectionHead>Discount</SectionHead>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL req>Flat discount (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.discount_flat}
                  onChange={e => set("discount_flat", e.target.value)} placeholder="e.g. 50" className="input-field"/>
              </div>
            </div>
            <div>
              <FL>Original price (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.original_price}
                  onChange={e => set("original_price", e.target.value)} placeholder="MRP (optional)" className="input-field"/>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ COMBO / FREE_ITEM / BOGO — bundle pricing ══ */}
      {isCombo && (
        <>
          <SectionHead>Bundle Pricing <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(optional)</span></SectionHead>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL>Original price (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.original_price}
                  onChange={e => set("original_price", e.target.value)} placeholder="Regular price" className="input-field"/>
              </div>
            </div>
            <div>
              <FL>Bundle / deal price (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.offer_price}
                  onChange={e => set("offer_price", e.target.value)} placeholder="Deal price" className="input-field"/>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ SCRATCH CARD — discount + coupon code revealed on scratch ══ */}
      {form.offer_type === "scratch_card" && (
        <>
          <SectionHead>Scratch Card Prize</SectionHead>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL req>Discount %</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>%</span>
                <input type="number" min="1" max="100" value={form.discount_percentage}
                  onChange={e => set("discount_percentage", e.target.value)} placeholder="e.g. 15" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>This % is shown after the customer scratches</p>
            </div>
            <div>
              <FL req>Coupon code revealed</FL>
              <div style={{ display:"flex", gap:"var(--s2)" }}>
                <div className="input-wrap" style={{ flex:1, marginBottom:0 }}>
                  <input value={form.coupon_code} onChange={e => set("coupon_code", e.target.value.toUpperCase())}
                    placeholder="e.g. SCRATCH15" maxLength={20}
                    style={{ flex:1, border:"none", background:"transparent", fontSize:".9375rem", outline:"none", fontFamily:"monospace", fontWeight:700, letterSpacing:".06em", color:"var(--t1)" }}
                    className="input-field"/>
                </div>
                <button type="button" onClick={() => set("coupon_code", genCoupon("SC"))}
                  style={{ padding:"0 var(--s3)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontSize:".75rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  Generate
                </button>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>This code is hidden under the scratch surface — revealed when scratched</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL>Min. order value (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.min_order_value}
                  onChange={e => set("min_order_value", e.target.value)} placeholder="leave blank = any" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>Minimum cart value to use the revealed code</p>
            </div>
            <div>
              <FL>Max scratches per customer</FL>
              <div className="input-wrap">
                <input type="number" min="0" value={form.max_redemptions_per_user}
                  onChange={e => set("max_redemptions_per_user", e.target.value)} placeholder="1 (recommended)" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>0 = unlimited. Set to 1 to allow one scratch per customer per offer</p>
            </div>
          </div>
          <div style={{ padding:"var(--s3) var(--s4)", background:"rgba(124,58,237,.05)", border:"1px solid rgba(124,58,237,.15)", borderRadius:"var(--r3)", marginBottom:"var(--s4)", fontSize:".8125rem", color:"#7C3AED" }}>
            <strong>Important:</strong> Create an active <em>% Discount</em> offer with the same coupon code (e.g. SCRATCH15 at 15% off) — the scratch card reveals the code but the discount logic lives in that offer. The scratch card is just the delivery/reveal mechanism.
          </div>
        </>
      )}

      <SectionHead>Schedule</SectionHead>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
        <div>
          <FL req>Start date & time</FL>
          <div className="input-wrap">
            <input type="datetime-local" value={form.start_at} onChange={e => set("start_at", e.target.value)} className="input-field" />
          </div>
        </div>
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s1)" }}>
            <FL>End date & time</FL>
            <button type="button" onClick={() => set("lifetime", !form.lifetime)}
              style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:".75rem", fontWeight:700, color:form.lifetime?"var(--ok)":"var(--t3)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--ff-b)", padding:0 }}>
              <div style={{ width:"28px", height:"16px", borderRadius:"8px", background:form.lifetime?"var(--ok)":"var(--bg3)", border:`1px solid ${form.lifetime?"var(--ok)":"var(--bd)"}`, position:"relative", flexShrink:0, transition:"all var(--d1) var(--ease)" }}>
                <div style={{ position:"absolute", top:"2px", width:"10px", height:"10px", borderRadius:"50%", background:"#fff", left:form.lifetime?"15px":"2px", transition:"left var(--d1) var(--ease)", boxShadow:"0 1px 3px rgba(0,0,0,.3)" }}/>
              </div>
              {form.lifetime ? "∞ Lifetime" : "Set end"}
            </button>
          </div>
          {form.lifetime ? (
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"12px var(--s3)", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.25)", borderRadius:"var(--r3)", fontSize:".875rem", color:"var(--ok)", fontWeight:600 }}>
              ∞ Never expires — always available
            </div>
          ) : (
            <>
              <div className={`input-wrap${errors.end_at?" err":""}`}>
                <input type="datetime-local" value={form.end_at} onChange={e => set("end_at", e.target.value)} className="input-field" />
              </div>
              {errors.end_at && <p style={{ color:"var(--err)", fontSize:".75rem", marginTop:"4px" }}>{errors.end_at}</p>}
            </>
          )}
        </div>
      </div>

      <SectionHead>Display</SectionHead>
      <div style={{ display:"grid", gridTemplateColumns:"90px 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
        <div>
          <FL>Emoji</FL>
          <div className="input-wrap">
            <input value={form.emoji} onChange={e => set("emoji", e.target.value)} maxLength={4} className="input-field" style={{ textAlign:"center", fontSize:"1.375rem" }} />
          </div>
        </div>
        <div>
          <FL>Display order</FL>
          <div className="input-wrap">
            <input type="number" min="0" value={form.carousel_order} onChange={e => set("carousel_order", e.target.value)} placeholder="0 = first" className="input-field" />
          </div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
        <div onClick={() => set("is_active", !form.is_active)}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px var(--s4)", background:form.is_active?"var(--ok-t)":"var(--bg2)", border:`1px solid ${form.is_active?"rgba(29,158,117,.3)":"var(--bd)"}`, borderRadius:"var(--r3)", cursor:"pointer", transition:"all var(--d1) var(--ease)" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:".875rem", color:form.is_active?"var(--ok)":"var(--t1)" }}>Active</div>
            <div style={{ fontSize:".6875rem", color:"var(--t3)" }}>Visible to customers</div>
          </div>
          <button type="button" className={`toggle ${form.is_active?"on":"off"}`} style={{ flexShrink:0 }}><div className="toggle-knob"/></button>
        </div>
        <div onClick={() => set("auto_broadcast", !form.auto_broadcast)}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px var(--s4)", background:form.auto_broadcast?"var(--brand-tint)":"var(--bg2)", border:`1px solid ${form.auto_broadcast?"var(--bdb)":"var(--bd)"}`, borderRadius:"var(--r3)", cursor:"pointer", transition:"all var(--d1) var(--ease)" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:".875rem", color:form.auto_broadcast?"var(--brand)":"var(--t1)" }}>Auto-broadcast</div>
            <div style={{ fontSize:".6875rem", color:"var(--t3)" }}>WhatsApp on activate</div>
          </div>
          <button type="button" className={`toggle ${form.auto_broadcast?"on":"off"}`} style={{ flexShrink:0 }}><div className="toggle-knob"/></button>
        </div>
      </div>

      {/* ══ RULES — min order + max uses (only for discount/combo types) ══ */}
      {["percentage", "flat", "combo", "free_item", "bogo"].includes(form.offer_type) && (
        <>
          <SectionHead>Rules</SectionHead>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
            <div>
              <FL>Min. order value (₹)</FL>
              <div className="input-wrap">
                <span style={{ color:"var(--t3)" }}>₹</span>
                <input type="number" min="0" value={form.min_order_value}
                  onChange={e => set("min_order_value", e.target.value)}
                  placeholder="e.g. 199 (leave blank = any)" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>Customer must spend at least this amount</p>
            </div>
            <div>
              <FL>Max uses per customer</FL>
              <div className="input-wrap">
                <input type="number" min="0" value={form.max_redemptions_per_user}
                  onChange={e => set("max_redemptions_per_user", e.target.value)}
                  placeholder="0 = unlimited" className="input-field"/>
              </div>
              <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:"3px" }}>0 = unlimited</p>
            </div>
          </div>
        </>
      )}

      {/* ══ CATEGORY + SPECIFIC ITEMS — only for percentage / flat ══ */}
      {["percentage", "flat"].includes(form.offer_type) && (
        <>
          <SectionHead>Scope — Category &amp; Items</SectionHead>
          <FL>Category restriction <span style={{ fontWeight:400, color:"var(--t4)" }}>(optional)</span></FL>
          <div className="input-wrap" style={{ marginBottom:"var(--s2)" }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
              style={{ flex:1, border:"none", background:"transparent", color:form.category_id?"var(--t1)":"var(--t4)", fontSize:".9375rem", outline:"none", padding:"0 var(--s2)", fontFamily:"var(--ff-b)", cursor:"pointer" }}>
              <option value="">All categories (entire order)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <p style={{ fontSize:".6875rem", color:"var(--t4)", marginBottom:"var(--s4)" }}>
            Discount applies only to items in this category. Leave blank = entire order.
          </p>

          <FL>Specific items <span style={{ fontWeight:400, color:"var(--t4)" }}>(optional — narrows further than category)</span></FL>
          <div className="input-wrap" style={{ marginBottom:"var(--s2)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={appliesToSearch} onChange={e => setAppliesToSearch(e.target.value)}
              placeholder={form.branch_id ? "Search menu items to restrict to…" : "Select a branch first"}
              disabled={!form.branch_id} className="input-field"/>
          </div>
          {appliesToSearch.length > 0 && (
            <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", marginBottom:"var(--s3)", maxHeight:"150px", overflowY:"auto", boxShadow:"var(--sh-md)" }}>
              {menuItems.filter(m => m.name.toLowerCase().includes(appliesToSearch.toLowerCase()) && !appliesTo.find(a => a.id === m.id)).slice(0,8).map(m => (
                <button key={m.id} type="button"
                  onClick={() => { setAppliesTo(a => [...a, { id: m.id, name: m.name }]); setAppliesToSearch(""); }}
                  style={{ width:"100%", textAlign:"left", padding:"var(--s2) var(--s3)", background:"none", border:"none", borderBottom:"1px solid var(--bd)", cursor:"pointer", fontSize:".875rem", display:"flex", alignItems:"center", gap:"var(--s2)" }}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <span style={{ fontWeight:500 }}>{m.name}</span>
                  <span style={{ marginLeft:"auto", color:"var(--t3)", fontSize:".8125rem" }}>₹{m.price}</span>
                </button>
              ))}
              {menuItems.filter(m => m.name.toLowerCase().includes(appliesToSearch.toLowerCase()) && !appliesTo.find(a => a.id === m.id)).length === 0 && (
                <div style={{ padding:"var(--s3)", color:"var(--t3)", fontSize:".875rem", textAlign:"center" }}>No items found</div>
              )}
            </div>
          )}
          {appliesTo.length > 0 ? (
            <div style={{ display:"flex", flexWrap:"wrap", gap:"var(--s2)", marginBottom:"var(--s3)" }}>
              {appliesTo.map(item => (
                <span key={item.id} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px 4px 12px", background:"var(--brand-tint)", border:"1px solid rgba(232,82,26,.25)", borderRadius:"var(--rf)", fontSize:".8125rem", fontWeight:600, color:"var(--brand)" }}>
                  {item.name}
                  <button type="button" onClick={() => setAppliesTo(a => a.filter(x => x.id !== item.id))}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"var(--brand)", fontSize:"15px", lineHeight:1, padding:0, opacity:.7 }}>×</button>
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize:".6875rem", color:"var(--t4)", marginBottom:"var(--s4)" }}>
              Leave empty = applies to whole cart (or chosen category above).
            </p>
          )}
        </>
      )}

      {/* ══ COUPON + FIRST ORDER ONLY — only for discount / combo types ══ */}
      {["percentage", "flat", "combo", "free_item", "bogo"].includes(form.offer_type) && (
        <>
          <SectionHead>Coupon Code <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(optional)</span></SectionHead>
          <div style={{ display:"flex", gap:"var(--s2)", marginBottom:"var(--s2)" }}>
            <div className="input-wrap" style={{ flex:1, marginBottom:0 }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>
              <input value={form.coupon_code} onChange={e => set("coupon_code", e.target.value.toUpperCase())}
                placeholder="e.g. KNFC20 (leave blank = auto-applied)" maxLength={30}
                style={{ flex:1, border:"none", background:"transparent", fontSize:".9375rem", outline:"none", fontFamily:"monospace", fontWeight:700, letterSpacing:".06em", color:"var(--t1)" }}
                className="input-field"/>
            </div>
            <button type="button" onClick={() => set("coupon_code", genCoupon())}
              style={{ padding:"0 var(--s3)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontSize:".75rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
              Generate
            </button>
          </div>
          <p style={{ fontSize:".6875rem", color:"var(--t4)", marginBottom:"var(--s3)" }}>
            Leave blank = offer applies automatically. With a code, customers enter it at cart. Hit <strong>Generate</strong> for a random unique code.
          </p>
          {form.coupon_code.trim().length > 0 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s4)", background:form.require_coupon?"linear-gradient(135deg,rgba(232,82,26,.08),rgba(232,82,26,.03))":"var(--bg2)", border:`1px solid ${form.require_coupon?"rgba(232,82,26,.3)":"var(--bd)"}`, borderRadius:"var(--r3)", marginBottom:"var(--s4)", cursor:"pointer" }}
              onClick={() => set("require_coupon", !form.require_coupon)}>
              <div>
                <div style={{ fontWeight:700, fontSize:".9375rem", color:form.require_coupon?"var(--brand)":"var(--t1)" }}>Require coupon to claim</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>Offer is hidden — only visible when this exact code is entered</div>
              </div>
              <button type="button" className={`toggle ${form.require_coupon?"on":"off"}`} style={{ flexShrink:0 }}><div className="toggle-knob"/></button>
            </div>
          )}

          {["percentage", "flat"].includes(form.offer_type) && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s4)", background:form.first_order_only?"linear-gradient(135deg,rgba(55,138,221,.08),rgba(55,138,221,.03))":"var(--bg2)", border:`1px solid ${form.first_order_only?"rgba(55,138,221,.3)":"var(--bd)"}`, borderRadius:"var(--r3)", marginBottom:"var(--s4)", cursor:"pointer" }}
              onClick={() => set("first_order_only", !form.first_order_only)}>
              <div>
                <div style={{ fontWeight:700, fontSize:".9375rem", color:form.first_order_only?"var(--info)":"var(--t1)" }}>First order only</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>Only applies to a customer's very first order at this branch</div>
              </div>
              <button type="button" className={`toggle ${form.first_order_only?"on":"off"}`} style={{ flexShrink:0 }}><div className="toggle-knob"/></button>
            </div>
          )}
        </>
      )}

      <SectionHead>Image &amp; Video</SectionHead>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
        {/* Image upload */}
        <div>
          <FL>Image <span style={{ fontWeight:400, color:"var(--t4)" }}>(JPG/PNG)</span></FL>
          <div onClick={() => document.getElementById("offer-img-input").click()}
            style={{ border:`2px dashed ${image?"var(--brand)":"var(--bd)"}`, borderRadius:"var(--r3)", height:"90px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", background:"var(--bg2)", overflow:"hidden", position:"relative", transition:"border-color var(--d1) var(--ease)" }}>
            {image
              ? <img src={URL.createObjectURL(image)} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <div style={{ textAlign:"center", color:"var(--t3)", fontSize:".75rem" }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{display:"block",margin:"0 auto 4px"}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Upload image
                </div>
            }
            {image && (
              <button type="button" onClick={e => { e.stopPropagation(); setImage(null); }}
                style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,.6)", border:"none", cursor:"pointer", color:"#fff", fontSize:"13px", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>×</button>
            )}
          </div>
          <input id="offer-img-input" type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} style={{ display:"none" }} />
        </div>

        {/* Video upload */}
        <div>
          <FL>Video <span style={{ fontWeight:400, color:"var(--t4)" }}>(MP4/WebM)</span></FL>
          <div onClick={() => document.getElementById("offer-vid-input").click()}
            style={{ border:`2px dashed ${video?"var(--brand)":"var(--bd)"}`, borderRadius:"var(--r3)", height:"90px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", background:"var(--bg2)", overflow:"hidden", position:"relative", transition:"border-color var(--d1) var(--ease)" }}>
            {video
              ? <>
                  <video src={URL.createObjectURL(video)} style={{ width:"100%", height:"100%", objectFit:"cover" }} muted />
                  <button type="button" onClick={e => { e.stopPropagation(); setVideo(null); }}
                    style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,.6)", border:"none", cursor:"pointer", color:"#fff", fontSize:"13px", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>×</button>
                </>
              : <div style={{ textAlign:"center", color:"var(--t3)", fontSize:".75rem" }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{display:"block",margin:"0 auto 4px"}}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  Upload video
                </div>
            }
          </div>
          <input id="offer-vid-input" type="file" accept="video/mp4,video/webm,video/*" onChange={e => setVideo(e.target.files[0])} style={{ display:"none" }} />
          {video && <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:3 }}>{(video.size/1024/1024).toFixed(1)} MB — {video.name}</p>}
        </div>
      </div>

      <div style={{ display:"flex", gap:"var(--s2)", paddingTop:"var(--s4)", borderTop:"1px solid var(--bd)", marginTop:"var(--s3)", position:"sticky", bottom:0, background:"var(--bgc)", paddingBottom:"var(--s2)" }}>
        <button type="button" onClick={onClose} className="btn btn-s btn-lg">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-p btn-lg" style={{ flex:1 }}>
          {saving
            ? <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ animation:"spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-3-6.7" strokeLinecap="round"/></svg> Saving…</>
            : initial ? "Save changes" : "Create offer"
          }
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </form>
  );
}

/* ── Offer detail (read-only, BranchAdmin) ─────────────────────────── */
function DetailRow({ label, value }) {
  return (
    <div style={{ background:"var(--bg2)", borderRadius:"var(--r3)", padding:"var(--s3) var(--s4)" }}>
      <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--t4)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:"2px" }}>{label}</div>
      <div style={{ fontWeight:600, fontSize:".9375rem", color:"var(--t1)" }}>{value || "—"}</div>
    </div>
  );
}

function OfferDetailView({ offer, branches }) {
  const branchName = branches.find(b => b.id === (offer.branch || offer.branch_id))?.name || "—";
  const disc = offer.discount_percentage
    ? `${Math.round(offer.discount_percentage)}% OFF`
    : offer.discount_flat ? `₹${Math.round(offer.discount_flat)} OFF`
    : TYPE_LABELS[offer.offer_type] || "DEAL";
  const fmtDate = iso => iso
    ? new Date(iso).toLocaleString("en-IN", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
    : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"var(--s5)" }}>
      {/* Hero strip */}
      <div style={{ height:"120px", borderRadius:"var(--r4)", background:`linear-gradient(135deg,${offer.gradient_from||"#1A0500"},${offer.gradient_to||"#2D0A00"})`, position:"relative", overflow:"hidden", display:"flex", alignItems:"flex-end" }}>
        {offer.image && typeof offer.image === "string" && <img src={offer.image} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:.55 }} />}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,.7),transparent)" }} />
        <div style={{ position:"relative", padding:"var(--s3) var(--s4)", display:"flex", alignItems:"center", gap:"var(--s2)" }}>
          <span style={{ background:"var(--gold)", color:"#000", fontSize:".75rem", fontWeight:800, padding:"3px 10px", borderRadius:"var(--rf)", flexShrink:0 }}>{disc}</span>
          <span style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, color:"#fff" }}>{offer.emoji} {offer.name}</span>
        </div>
      </div>

      {/* Status badges */}
      <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap" }}>
        <span className={`badge ${offer.is_active?"badge-ok":"badge-err"}`}>{offer.is_active?"Active":"Inactive"}</span>
        <span className="badge">{TYPE_LABELS[offer.offer_type]}</span>
        {offer.first_order_only && <span className="badge" style={{ background:"var(--warn-t)", color:"var(--warn)", border:"1px solid rgba(239,159,39,.2)" }}>First order only</span>}
        {!offer.end_at && <span className="badge" style={{ background:"var(--ok-t)", color:"var(--ok)", border:"1px solid rgba(29,158,117,.2)" }}>∞ Lifetime</span>}
        {offer.coupon_code && <span className="badge" style={{ background:"var(--info-t)", color:"var(--info)", border:"1px solid rgba(55,138,221,.2)" }}>Code: {offer.coupon_code}</span>}
      </div>

      {/* Key fields */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)" }}>
        <DetailRow label="Branch" value={branchName} />
        <DetailRow label="Type" value={TYPE_LABELS[offer.offer_type]} />
        {offer.discount_percentage ? <DetailRow label="Discount" value={`${Math.round(offer.discount_percentage)}%`} /> : null}
        {offer.discount_flat ? <DetailRow label="Flat discount" value={`₹${Math.round(offer.discount_flat)}`} /> : null}
        {offer.min_order_value ? <DetailRow label="Min order" value={`₹${Math.round(offer.min_order_value)}`} /> : null}
        {offer.max_uses_per_user ? <DetailRow label="Max uses / customer" value={String(offer.max_uses_per_user)} /> : null}
        <DetailRow label="Valid from" value={fmtDate(offer.start_at)} />
        <DetailRow label="Valid until" value={offer.end_at ? fmtDate(offer.end_at) : "∞ Lifetime"} />
      </div>

      {/* Text fields */}
      {offer.tagline && (
        <div>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", marginBottom:"4px", textTransform:"uppercase", letterSpacing:".06em" }}>Tagline</div>
          <div style={{ fontSize:".9375rem", color:"var(--t2)" }}>{offer.tagline}</div>
        </div>
      )}
      {offer.description && (
        <div>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", marginBottom:"4px", textTransform:"uppercase", letterSpacing:".06em" }}>Description</div>
          <div style={{ fontSize:".9375rem", color:"var(--t2)", lineHeight:1.6 }}>{offer.description}</div>
        </div>
      )}

      {/* WhatsApp share link */}
      <button
        onClick={() => {
          const base = window.location.origin;
          const url  = `${base}/offers/${offer.id}`;
          const discText = offer.discount_percentage
            ? `${Math.round(offer.discount_percentage)}% OFF`
            : offer.discount_flat ? `₹${Math.round(offer.discount_flat)} OFF` : "";
          const text = `${offer.emoji || "🔥"} *${offer.name}*${discText ? ` — *${discText}*` : ""}`
            + (offer.tagline ? `\n${offer.tagline}` : "")
            + (offer.coupon_code ? `\nCode: *${offer.coupon_code}*` : "")
            + `\n\nView offer: ${url}\n\n_KNFC Fried Chicken_`;
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        }}
        style={{ width:"100%", padding:"10px 16px", background:"#25D366", border:"none", borderRadius:"var(--r3)", color:"#fff", fontWeight:700, fontSize:".875rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Share on WhatsApp
      </button>
    </div>
  );
}

/* ── Offer card ─────────────────────────────────────────────────────── */
function OfferCard({ offer, isSuperAdmin, onEdit, onDelete, onView, branches }) {
  const branchName = branches.find(b => b.id === (offer.branch || offer.branch_id))?.name || "—";
  const disc = offer.discount_percentage
    ? `${Math.round(offer.discount_percentage)}% OFF`
    : offer.discount_flat ? `₹${Math.round(offer.discount_flat)} OFF`
    : TYPE_LABELS[offer.offer_type] || "DEAL";

  return (
    <div className="card" style={{ overflow:"hidden", position:"relative" }}>
      {/* Hero strip */}
      <div style={{ height:"80px", background:`linear-gradient(135deg,${offer.gradient_from||"#1A0500"},${offer.gradient_to||"#2D0A00"})`, position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {offer.image && <img src={typeof offer.image==="string"?offer.image:URL.createObjectURL(offer.image)} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:.55 }} />}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(0,0,0,.7), transparent 60%)" }} />
        <div style={{ position:"absolute", top:"8px", left:"10px" }}>
          <span style={{ background:"var(--gold)", color:"#000", fontSize:".75rem", fontWeight:800, padding:"3px 10px", borderRadius:"var(--rf)" }}>{disc}</span>
        </div>
        <div style={{ position:"absolute", top:"8px", right:"10px", display:"flex", gap:"5px" }}>
          <span className={`badge ${offer.is_active?"badge-ok":"badge-err"}`} style={{ fontSize:".625rem" }}>
            {offer.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <div style={{ position:"absolute", bottom:"8px", left:"10px" }}>
          <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:700, color:"#fff" }}>{offer.emoji} {offer.name}</div>
        </div>
      </div>

      <div style={{ padding:"var(--s3) var(--s4)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s2)" }}>
          <div>
            {offer.tagline && <div style={{ fontSize:".8125rem", color:"var(--t3)", marginBottom:"3px" }}>{offer.tagline}</div>}
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", fontSize:".8125rem" }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span style={{ color:"var(--t3)" }}>{branchName}</span>
              <span style={{ color:"var(--bd2)" }}>·</span>
              <span style={{ color:"var(--t3)" }}>{TYPE_LABELS[offer.offer_type]}</span>
            </div>
          </div>
          {offer.offer_price && (
            <div style={{ textAlign:"right" }}>
              <div className="price" style={{ fontSize:".9375rem" }}>{formatPrice(offer.offer_price)}</div>
              {offer.original_price && <div className="price-old" style={{ fontSize:".8125rem" }}>{formatPrice(offer.original_price)}</div>}
            </div>
          )}
        </div>

        {/* Countdown */}
        {offer.end_at ? (
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", marginBottom:"var(--s3)", padding:"5px var(--s3)", background:"var(--bg2)", borderRadius:"var(--r2)", fontSize:".8125rem" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>
            <span style={{ color:"var(--t3)" }}>Ends in</span>
            <Countdown endAt={offer.end_at} />
          </div>
        ) : (
          <div style={{ marginBottom:"var(--s3)" }}>
            <span style={{ fontSize:".6875rem", fontWeight:700, padding:"3px 9px", borderRadius:"var(--rf)", background:"var(--ok-t)", color:"var(--ok)", border:"1px solid rgba(29,158,117,.2)" }}>∞ Lifetime offer</span>
          </div>
        )}
        {offer.first_order_only && (
          <div style={{ marginBottom:"var(--s2)" }}>
            <span style={{ fontSize:".6875rem", fontWeight:700, padding:"3px 9px", borderRadius:"var(--rf)", background:"var(--warn-t)", color:"var(--warn)", border:"1px solid rgba(239,159,39,.2)" }}>First order only</span>
          </div>
        )}
        {offer.min_order_value && (
          <div style={{ marginBottom:"var(--s2)" }}>
            <span style={{ fontSize:".6875rem", fontWeight:700, padding:"3px 9px", borderRadius:"var(--rf)", background:"var(--info-t)", color:"var(--info)", border:"1px solid rgba(55,138,221,.2)" }}>Min ₹{Math.round(offer.min_order_value)}</span>
          </div>
        )}

        {/* Actions */}
        {isSuperAdmin ? (
          <div style={{ display:"flex", gap:"var(--s2)" }}>
            <button onClick={() => onEdit(offer)} className="btn btn-s btn-sm" style={{ flex:1 }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button onClick={() => onDelete(offer)} className="btn btn-g btn-sm" style={{ color:"var(--err)" }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        ) : (
          <button onClick={() => onView && onView(offer)} className="btn btn-g btn-sm" style={{ width:"100%", marginTop:"var(--s1)" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
            View Details
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function AdminOffersPage() {
  const { user }  = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [offers,       setOffers]       = useState([]);
  const [branches,     setBranches]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [drawer,       setDrawer]       = useState(null);
  const [viewOffer,    setViewOffer]    = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [confirm,      setConfirm]      = useState(null);
  const [toast,        setToast]        = useState("");
  const [filter,       setFilter]       = useState("all");
  const [pageTab,      setPageTab]      = useState("offers"); // offers | redemptions
  const [redemptions,  setRedemptions]  = useState([]);
  const [redeemStats,  setRedeemStats]  = useState([]);
  const [redeemLoad,   setRedeemLoad]   = useState(false);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const loadRedemptions = useCallback(async () => {
    setRedeemLoad(true);
    try {
      const r = await axiosClient.get("/offers/admin/redemptions/");
      setRedemptions(r.data.redemptions || []);
      setRedeemStats(r.data.stats || []);
    } catch {}
    finally { setRedeemLoad(false); }
  }, []);

  const branchId = isSuperAdmin ? "" : BID();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oR, bR] = await Promise.all([
        isSuperAdmin
          ? Promise.resolve({ data: { offers: [] } })
          : getOffers(branchId).catch(() => ({ data:{ offers:[] } })),
        isSuperAdmin
          ? getBranches().catch(() => ({ data:{ branches:[] } }))
          : Promise.resolve({ data:{ branches: user?.branch_id ? [{ id: user.branch_id, name: user.branch_name }] : [] } }),
      ]);
      // For superadmin get ALL offers (active + inactive + expired)
      if (isSuperAdmin) {
        // Fetch offers for each branch
        const allBranches = bR.data.branches || [];
        setBranches(allBranches);
        const allOffers = [];
        for (const b of allBranches) {
          try {
            const r = await axiosClient.get(`/offers/?branch_id=${b.id}`);
            (r.data.offers || []).forEach(o => { o.branch = b.id; allOffers.push(o); });
          } catch {}
        }
        setOffers(allOffers);
      } else {
        setBranches(bR.data.branches || []);
        setOffers(oR.data.offers || []);
      }
    } finally { setLoading(false); }
  }, [branchId, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (fd) => {
    setSaving(true);
    try {
      if (!drawer || drawer === "create") {
        await createOffer(fd);
        showToast("Offer created!");
      } else {
        await updateOffer(drawer.id, fd);
        showToast("Offer updated!");
      }
      setDrawer(null);
      load();
    } catch (e) {
      showToast("Error: " + (e.response?.data?.error || "Try again"));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteOffer(confirm.id);
      showToast(`"${confirm.name}" deleted.`);
      setConfirm(null);
      load();
    } catch { showToast("Delete failed."); setConfirm(null); }
  };

  if (loading) return <KNCLoader visible label="Loading offers…" />;

  const now = Date.now();
  const filtered = offers.filter(o => {
    if (filter === "active")  return o.is_active && (!o.end_at || new Date(o.end_at) > now);
    if (filter === "expired") return !o.is_active || (o.end_at && new Date(o.end_at) <= now);
    return true;
  });

  return (
    <AppLayout adminSidebar>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s6)", flexWrap:"wrap", gap:"var(--s3)" }}>
        <div>
          <div style={{ fontSize:".75rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s1)" }}>
            {isSuperAdmin ? "Super Admin" : user?.branch_name} · Offers & Promotions
          </div>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.5rem,3vw,2.25rem)", fontWeight:800, letterSpacing:"-.025em" }}>
            Daily Offers
          </h1>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setDrawer("create")} className="btn btn-p">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/></svg>
            New offer
          </button>
        )}
      </div>

      {/* SuperAdmin access banner / BranchAdmin read-only banner */}
      {!isSuperAdmin && (
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", padding:"var(--s3) var(--s4)", background:"var(--info-t)", border:"1px solid rgba(55,138,221,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s5)", fontSize:".875rem" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--info)" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
          <span style={{ color:"var(--info)" }}>
            Offers are managed by Super Admin. You can view active offers for your branch here.
          </span>
        </div>
      )}

      {/* Page-level tabs: Offers | Redemptions */}
      <div className="tabs" style={{ marginBottom:"var(--s5)" }}>
        <button className={`tab-item${pageTab==="offers"?" active":""}`} onClick={() => setPageTab("offers")}>Offers</button>
        <button className={`tab-item${pageTab==="redemptions"?" active":""}`} onClick={() => { setPageTab("redemptions"); loadRedemptions(); }}>
          Redemptions {redemptions.length>0?`(${redemptions.length})`:""}
        </button>
        <button className={`tab-item${pageTab==="howto"?" active":""}`} onClick={() => setPageTab("howto")}>
          How it works
        </button>
      </div>

      {/* ─── Redemptions panel ─── */}
      {pageTab === "redemptions" && (
        <div>
          {redeemStats.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"var(--s3)", marginBottom:"var(--s6)" }}>
              {redeemStats.map(s => (
                <div key={s.offer_id} style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s4)", position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:"linear-gradient(90deg,var(--brand),transparent)" }}/>
                  <div style={{ fontSize:"1.5rem", marginBottom:"var(--s2)" }}>{s.offer_emoji}</div>
                  <div style={{ fontWeight:700, fontSize:".9375rem", marginBottom:"3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.offer_name}</div>
                  <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.75rem", fontWeight:900, color:"var(--brand)", lineHeight:1 }}>{s.count}</div>
                  <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:"3px" }}>uses · ₹{Math.round(s.total_savings)} saved</div>
                </div>
              ))}
            </div>
          )}
          {redeemLoad ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
              {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"52px", borderRadius:"var(--r3)" }}/>)}
            </div>
          ) : redemptions.length === 0 ? (
            <div style={{ textAlign:"center", padding:"var(--s12)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:"var(--s3)" }}><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg></div>
              <p style={{ fontSize:".9375rem", fontWeight:600, marginBottom:"var(--s2)" }}>No redemptions yet</p>
              <p style={{ fontSize:".875rem", color:"var(--t3)" }}>When customers use offers at checkout, they appear here</p>
            </div>
          ) : (
            <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r5)", overflow:"hidden" }}>
              <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <div style={{ minWidth:"560px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 90px 80px 100px", gap:"var(--s3)", padding:"var(--s3) var(--s5)", background:"var(--bg2)", borderBottom:"1px solid var(--bd)" }}>
                {["Customer","Offer","Token","Saved","Date"].map((h,i)=>(
                  <div key={h} style={{ fontSize:".5625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", textAlign:i>0?"center":"left" }}>{h}</div>
                ))}
              </div>
              {redemptions.map((r,i) => (
                <div key={r.id} style={{ display:"grid", gridTemplateColumns:"1fr 140px 90px 80px 100px", gap:"var(--s3)", padding:"var(--s3) var(--s5)", borderBottom:i<redemptions.length-1?"1px solid var(--bd)":"none", alignItems:"center", transition:"background var(--d1) var(--ease)" }}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ fontWeight:600, fontSize:".9375rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.customer_name}</div>
                  <div style={{ textAlign:"center", fontSize:".8125rem", color:"var(--t2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.offer_emoji} {r.offer_name}</div>
                  <div style={{ textAlign:"center" }}><code style={{ fontSize:".8125rem", fontWeight:700, padding:"2px 8px", background:"var(--bg2)", borderRadius:"var(--r2)", border:"1px solid var(--bd)", color:"var(--brand)" }}>{r.order_token}</code></div>
                  <div style={{ textAlign:"center", fontFamily:"var(--ff-d)", fontWeight:800, color:"var(--ok)", fontSize:".9375rem" }}>₹{Math.round(r.savings)}</div>
                  <div style={{ textAlign:"center", fontSize:".75rem", color:"var(--t3)" }}>{new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
                </div>
              ))}
              </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Offers list (only when on offers tab) ─── */}
      {pageTab === "offers" && (<>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom:"var(--s5)" }}>
        {[["all","All offers"],["active","Active"],["expired","Expired"]].map(([k,l]) => (
          <button key={k} className={`tab-item${filter===k?" active":""}`} onClick={() => setFilter(k)}>{l} {k==="all"?`(${offers.length})`:""}</button>
        ))}
      </div>

      {/* Offers grid */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"var(--s4)" }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"200px", borderRadius:"var(--r4)" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"var(--s12) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:"var(--s3)" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="var(--brand)"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg></div>
          <p style={{ fontSize:".9375rem", fontWeight:600, marginBottom:"var(--s2)" }}>No offers yet</p>
          {isSuperAdmin ? (
            <>
              <p style={{ fontSize:".875rem", color:"var(--t3)", marginBottom:"var(--s4)" }}>Create your first offer to attract customers</p>
              <button onClick={() => setDrawer("create")} className="btn btn-p btn-lg">Create offer →</button>
            </>
          ) : (
            <p style={{ fontSize:".875rem", color:"var(--t3)" }}>Contact your Super Admin to create offers for your branch.</p>
          )}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"var(--s4)" }}>
          {filtered.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              isSuperAdmin={isSuperAdmin}
              branches={branches}
              onEdit={setDrawer}
              onDelete={setConfirm}
              onView={setViewOffer}
            />
          ))}
        </div>
      )}

      </>)} {/* end pageTab === "offers" */}

      {/* ─── How it works ─── */}
      {pageTab === "howto" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s4)", maxWidth:"780px" }}>

          {/* HOW COUPONS WORK */}
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"linear-gradient(135deg,rgba(232,82,26,.06),transparent)", display:"flex", alignItems:"center", gap:"var(--s3)" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>
              <div>
                <div style={{ fontWeight:800, fontSize:"1rem" }}>Coupon Codes — How They Work</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>Who generates them, how they reach customers, when they apply</div>
              </div>
            </div>
            <div style={{ padding:"var(--s4) var(--s5)", fontSize:".9rem", lineHeight:1.7, color:"var(--t2)" }}>
              <p><strong>Who generates the code?</strong> You (the admin) set the code when creating an offer — either type one (e.g. SUMMER20) or click the <strong>Generate</strong> button for a random unique code. The system does not auto-create codes by itself.</p>
              <p style={{ marginTop:"var(--s3)" }}><strong>How does it reach the customer?</strong></p>
              <ul style={{ paddingLeft:"var(--s5)", marginTop:"var(--s2)", display:"flex", flexDirection:"column", gap:"var(--s1)" }}>
                <li><strong>% / ₹ Discount offers:</strong> You broadcast the offer via WhatsApp — customers see the code in the message and enter it at cart checkout.</li>
                <li><strong>Scratch Card:</strong> The code is hidden under the scratch surface — revealed only when the customer scratches it.</li>
                <li><strong>Re-engagement:</strong> The code is embedded in the "We Miss You" WhatsApp message sent automatically to inactive customers.</li>
                <li><strong>Referral reward:</strong> A unique code is generated per referrer when their friend qualifies — sent to the referrer via WhatsApp.</li>
              </ul>
              <p style={{ marginTop:"var(--s3)" }}><strong>How does the customer use it?</strong> They go to cart → tap "Apply coupon" → type or paste the code → discount applies instantly if the conditions match (min order value, valid dates, not used up).</p>
              <div style={{ marginTop:"var(--s3)", padding:"var(--s3)", background:"rgba(232,82,26,.05)", borderRadius:"var(--r2)", fontSize:".8125rem", color:"var(--brand)", border:"1px solid rgba(232,82,26,.15)" }}>
                <strong>Require coupon ON:</strong> Offer is invisible in the offers list — only applied when the exact code is entered. Useful for secret/exclusive deals.
                <br/><strong>Require coupon OFF:</strong> Offer is visible in the list and the code is optional — customers can apply it manually or it auto-applies.
              </div>
            </div>
          </div>

          {/* WELCOME BONUS */}
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"linear-gradient(135deg,rgba(55,138,221,.06),transparent)", display:"flex", alignItems:"center", gap:"var(--s3)" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <div>
                <div style={{ fontWeight:800, fontSize:"1rem" }}>Welcome Bonus</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>Auto-applied ₹ discount on a new customer's very first order</div>
              </div>
            </div>
            <div style={{ padding:"var(--s4) var(--s5)", fontSize:".9rem", lineHeight:1.7, color:"var(--t2)" }}>
              <p><strong>How it works — step by step:</strong></p>
              <ol style={{ paddingLeft:"var(--s5)", marginTop:"var(--s2)", display:"flex", flexDirection:"column", gap:"var(--s1)" }}>
                <li>Customer signs up / logs in for the first time.</li>
                <li>They browse, add items, and go to cart.</li>
                <li>The system checks: is this their first-ever order at this branch? If yes → the bonus is auto-applied, reducing the total by the bonus amount (₹).</li>
                <li>If you set a minimum order value, the cart must meet it first.</li>
                <li>The customer cannot use this type more than once — it is permanently a first-order-only offer.</li>
              </ol>
              <p style={{ marginTop:"var(--s3)" }}><strong>No coupon needed</strong> — it appears automatically. You just create the offer, set the bonus amount and (optionally) min order value, and it works for every new signup.</p>
              <div style={{ marginTop:"var(--s3)", padding:"var(--s3)", background:"rgba(55,138,221,.05)", borderRadius:"var(--r2)", fontSize:".8125rem", color:"var(--info)", border:"1px solid rgba(55,138,221,.15)" }}>
                <strong>Example:</strong> Bonus ₹50 off, min order ₹199. New customer signs up, adds ₹250 worth of food → cart automatically shows ₹50 discount → they pay ₹200.
              </div>
            </div>
          </div>

          {/* RE-ENGAGEMENT */}
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"linear-gradient(135deg,rgba(239,159,39,.06),transparent)", display:"flex", alignItems:"center", gap:"var(--s3)" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <div>
                <div style={{ fontWeight:800, fontSize:"1rem" }}>Re-engagement ("We Miss You")</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>WhatsApp offer sent to inactive customers after X days</div>
              </div>
            </div>
            <div style={{ padding:"var(--s4) var(--s5)", fontSize:".9rem", lineHeight:1.7, color:"var(--t2)" }}>
              <p><strong>How timing works:</strong></p>
              <ul style={{ paddingLeft:"var(--s5)", marginTop:"var(--s2)", display:"flex", flexDirection:"column", gap:"var(--s1)" }}>
                <li>You set <strong>Inactive after X days</strong> (e.g. 7 days, 14 days, 30 days).</li>
                <li>A background Celery task runs <strong>once daily at midnight</strong> and checks: which customers have not placed an order in the last X days?</li>
                <li>Each matching customer (who hasn't already received this specific offer) gets a WhatsApp message with your coupon code.</li>
                <li>Once sent, we log it — they will <strong>not be messaged again</strong> for the same offer, even if they stay inactive.</li>
                <li>You can also <strong>trigger it manually</strong> from the Redemptions tab → Re-engagement Preview → Send Now.</li>
              </ul>
              <p style={{ marginTop:"var(--s3)" }}><strong>What the customer gets:</strong> A WhatsApp message like "We miss you [Name]! Come back and get 20% off with code COMEBACK20." They go to the site, add items, enter the code at cart → discount applies.</p>
              <div style={{ marginTop:"var(--s3)", padding:"var(--s3)", background:"rgba(239,159,39,.05)", borderRadius:"var(--r2)", fontSize:".8125rem", color:"var(--warn)", border:"1px solid rgba(239,159,39,.15)" }}>
                <strong>Recommended setup:</strong> inactive_days = 7, discount = 15–20%, coupon code = COMEBACK + random. This brings back ~15–30% of inactive users within 48 hours of the message.
              </div>
            </div>
          </div>

          {/* SCRATCH CARD */}
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"linear-gradient(135deg,rgba(124,58,237,.06),transparent)", display:"flex", alignItems:"center", gap:"var(--s3)" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><path d="M8 14h.01M12 14h.01M16 14h.01" strokeLinecap="round" strokeWidth="2"/></svg>
              <div>
                <div style={{ fontWeight:800, fontSize:"1rem" }}>Scratch Card</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>Customer scratches to reveal a hidden discount code</div>
              </div>
            </div>
            <div style={{ padding:"var(--s4) var(--s5)", fontSize:".9rem", lineHeight:1.7, color:"var(--t2)" }}>
              <p><strong>Two ways to use Scratch Cards:</strong></p>
              <ol style={{ paddingLeft:"var(--s5)", marginTop:"var(--s2)", display:"flex", flexDirection:"column", gap:"var(--s1)" }}>
                <li><strong>Global scratch card (Settings):</strong> Always-visible card on the Offers page for all customers. SuperAdmin enables it in Settings tab, sets the code + discount globally. All customers see the same card. Max 1 scratch per day per customer.</li>
                <li><strong>Offer-type scratch card (this form):</strong> A time-limited scratch card attached to a specific offer. Appears on the Offers page only while the offer is active. You set the exact code and discount % for this specific card — different customers can't share it past the end date.</li>
              </ol>
              <p style={{ marginTop:"var(--s3)" }}><strong>How the reveal works:</strong> Customer finger-swipes / mouse-drags across the card surface. When 50%+ is scratched, the coupon code and discount are revealed with a celebration animation. They tap "Copy code" → paste it in cart.</p>
              <div style={{ marginTop:"var(--s3)", padding:"var(--s3)", background:"rgba(124,58,237,.05)", borderRadius:"var(--r2)", fontSize:".8125rem", color:"#7C3AED", border:"1px solid rgba(124,58,237,.15)" }}>
                <strong>Important:</strong> The scratch card offer type controls the <em>reveal</em>. You must also create a <em>% Discount</em> offer with the same coupon code so the discount actually applies at checkout. Example: Scratch Card offer with code SC9K3M at 15% off → also create a % Discount offer with code SC9K3M, 15% off.
              </div>
            </div>
          </div>

          {/* SHARE & EARN */}
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"linear-gradient(135deg,rgba(29,158,117,.06),transparent)", display:"flex", alignItems:"center", gap:"var(--s3)" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <div>
                <div style={{ fontWeight:800, fontSize:"1rem" }}>Share &amp; Earn (Referral)</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>Each customer gets a unique link — referrer earns when friend joins</div>
              </div>
            </div>
            <div style={{ padding:"var(--s4) var(--s5)", fontSize:".9rem", lineHeight:1.7, color:"var(--t2)" }}>
              <p><strong>Step by step:</strong></p>
              <ol style={{ paddingLeft:"var(--s5)", marginTop:"var(--s2)", display:"flex", flexDirection:"column", gap:"var(--s1)" }}>
                <li>Customer A goes to their Account page → Share &amp; Earn → copies their unique link (e.g. knfcs.com/refer/XK7P2Q).</li>
                <li>Customer A shares it on WhatsApp, Instagram, etc.</li>
                <li>Customer B opens the link → lands on KNFC with a "Your friend referred you" banner → signs up.</li>
                <li>System records: Customer B was referred by Customer A via code XK7P2Q.</li>
                <li>If <strong>Reward on signup</strong> is ON → Customer A immediately gets a WhatsApp message with their reward coupon.</li>
                <li>If <strong>Reward on signup</strong> is OFF → Customer A gets the reward only after Customer B places a qualifying order (meeting the friend's min order value).</li>
              </ol>
              <p style={{ marginTop:"var(--s3)" }}><strong>Unique mechanism:</strong> Every single customer has a different link — so you can track exactly who brought whom, how many signups each referrer drove, and reward only verified referrals. No gaming possible.</p>
            </div>
          </div>

          {/* SPIN WHEEL */}
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"linear-gradient(135deg,rgba(124,58,237,.06),transparent)", display:"flex", alignItems:"center", gap:"var(--s3)" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2v10M12 12l8.5 4.9"/></svg>
              <div>
                <div style={{ fontWeight:800, fontSize:"1rem" }}>Spin-the-Wheel</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>Lucky wheel — probability-weighted prizes, once per day</div>
              </div>
            </div>
            <div style={{ padding:"var(--s4) var(--s5)", fontSize:".9rem", lineHeight:1.7, color:"var(--t2)" }}>
              <p><strong>How it works:</strong> A spinning wheel appears on the Offers page. Customer taps SPIN — the wheel rotates and lands on a random prize segment. Each segment has a probability weight you control (e.g. 40% "Try Again", 10% "Free Drink", 25% "10% OFF"). One spin per customer per day by default.</p>
              <p style={{ marginTop:"var(--s3)" }}><strong>Configure in Settings tab:</strong> Enable/disable, max spins per day, and the prizes JSON with labels, colours, and probabilities.</p>
              <div style={{ marginTop:"var(--s3)", padding:"var(--s3)", background:"rgba(124,58,237,.05)", borderRadius:"var(--r2)", fontSize:".8125rem", color:"#7C3AED", border:"1px solid rgba(124,58,237,.15)" }}>
                <strong>Tip:</strong> Keep "Try Again" at 40–60% probability. Big prizes (free item, 30%+ off) at 5–10%. This feels exciting without giving away too much margin.
              </div>
            </div>
          </div>

          {/* LOYALTY POINTS */}
          <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
            <div style={{ padding:"var(--s4) var(--s5)", borderBottom:"1px solid var(--bd)", background:"linear-gradient(135deg,rgba(217,119,6,.06),transparent)", display:"flex", alignItems:"center", gap:"var(--s3)" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <div>
                <div style={{ fontWeight:800, fontSize:"1rem" }}>Loyalty Points</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>Earn on every order, redeem for ₹ off future orders</div>
              </div>
            </div>
            <div style={{ padding:"var(--s4) var(--s5)", fontSize:".9rem", lineHeight:1.7, color:"var(--t2)" }}>
              <p><strong>How it works:</strong> Customer completes an order → earns points (e.g. 1 pt per ₹1 spent). Points accumulate. On a future order they can redeem points for ₹ off (e.g. 100 pts = ₹10 off).</p>
              <p style={{ marginTop:"var(--s3)" }}><strong>Configure in Settings → Loyalty Programme:</strong> earn rate, redeem rate, minimum points to redeem, step size, max % of order payable with points.</p>
              <div style={{ marginTop:"var(--s3)", padding:"var(--s3)", background:"rgba(217,119,6,.05)", borderRadius:"var(--r2)", fontSize:".8125rem", color:"#b45309", border:"1px solid rgba(217,119,6,.15)" }}>
                <strong>Example:</strong> Earn 1 pt/₹1, redeem 0.10 ₹/pt. Customer spends ₹500 → earns 500 pts. Next order: redeems 200 pts → gets ₹20 off.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Offer detail drawer — BranchAdmin read-only */}
      {!isSuperAdmin && (
        <Drawer open={!!viewOffer} onClose={() => setViewOffer(null)} title={viewOffer?.name || "Offer Details"}>
          {viewOffer && <OfferDetailView offer={viewOffer} branches={branches} />}
        </Drawer>
      )}

      {/* Create/Edit drawer — SuperAdmin only */}
      {isSuperAdmin && (
        <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={!drawer || drawer==="create" ? "Create new offer" : `Edit: ${drawer?.name}`}>
          {!!drawer && (
            <OfferForm
              initial={drawer==="create" ? null : drawer}
              branches={branches}
              isSuperAdmin={isSuperAdmin}
              onSave={handleSave}
              onClose={() => setDrawer(null)}
              saving={saving}
            />
          )}
        </Drawer>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }} onClick={() => setConfirm(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s6)", width:"100%", maxWidth:"380px", boxShadow:"var(--sh-xl)" }}>
            <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:700, marginBottom:"var(--s2)" }}>Delete offer?</h3>
            <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)" }}>
              "{confirm.name}" will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display:"flex", gap:"var(--s2)" }}>
              <button onClick={handleDelete} className="btn btn-p btn-lg" style={{ flex:1, background:"var(--err)", borderColor:"var(--err)" }}>Delete</button>
              <button onClick={() => setConfirm(null)} className="btn btn-s" style={{ flex:1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:"var(--s8)", left:"50%", transform:"translateX(-50%)", zIndex:500, background:"var(--t1)", color:"var(--bg)", padding:"var(--s3) var(--s5)", borderRadius:"var(--rf)", fontSize:".875rem", fontWeight:600, boxShadow:"var(--sh-xl)", whiteSpace:"nowrap", animation:"slideUp .3s ease" }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </AppLayout>
  );
}
