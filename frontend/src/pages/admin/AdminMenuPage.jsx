/**
 * AdminMenuPage.jsx
 *
 * Full menu management for Branch Admin.
 * Sections:
 *   Categories — list, add, edit, delete, reorder
 *   Items      — filterable table, toggle availability, edit, delete
 *   Add/Edit   — full item form in a modal drawer
 *   Reviews    — list with admin reply
 *
 * Endpoints used:
 *   GET/POST   /menu/admin/categories/
 *   PATCH/DEL  /menu/admin/categories/:id/
 *   GET/POST   /menu/admin/items/
 *   PATCH/DEL  /menu/admin/items/:id/
 *   PATCH      /menu/admin/items/:id/toggle/
 *   PATCH      /menu/admin/reviews/:id/reply/
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import AppLayout from "../../components/layout/AppLayout";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import { useAuth } from "../../context/AuthContext";
import {
  adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
  adminGetItems, adminGetItem, adminCreateItem, adminUpdateItem, adminDeleteItem,
  adminToggleAvail, adminReplyReview, adminGetReviews, adminToggleReviewVis,
} from "../../api/menu";
import { getBranches } from "../../api/auth";
import { formatPrice, formatUnit } from "../../utils/format";

/* ── Icon set ─────────────────────────────────────────────────────────── */
const Ic = {
  Plus:   () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/></svg>,
  Edit:   () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:  () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Eye:    () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>,
  Star:   () => <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Search: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>,
  X:      () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>,
  Img:    () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Tag:    () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>,
  Check:  () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

/* ── Shared field components ─────────────────────────────────────────── */
function FL({ children, required }) {
  return (
    <label style={{ display:"block", fontSize:".75rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s1)" }}>
      {children}{required && <span style={{ color:"var(--err)", marginLeft:"3px" }}>*</span>}
    </label>
  );
}
function FE({ msg }) {
  if (!msg) return null;
  return <p style={{ fontSize:".75rem", color:"var(--err)", marginTop:"var(--s1)", marginBottom:"var(--s2)" }}>{msg}</p>;
}
function Divider() { return <div className="divider" />; }

/* ── Image picker with preview ───────────────────────────────────────── */
function ImagePicker({ value, onChange, label = "Image", existingUrl }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(existingUrl || null);

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    onChange(f);
    setPreview(URL.createObjectURL(f));
  };

  return (
    <div style={{ marginBottom:"var(--s4)" }}>
      <FL>{label}</FL>
      <div
        onClick={() => ref.current?.click()}
        style={{
          border: `2px dashed ${preview?"var(--brand)":"var(--bd)"}`,
          borderRadius:"var(--r3)", height:"120px",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", overflow:"hidden", position:"relative",
          background:"var(--bg2)", transition:"border-color var(--d1) var(--ease)",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor="var(--brand)"}
        onMouseLeave={e => e.currentTarget.style.borderColor=preview?"var(--brand)":"var(--bd)"}
      >
        {preview ? (
          <img loading="lazy" src={preview} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        ) : (
          <div style={{ textAlign:"center", color:"var(--t3)" }}>
            <Ic.Img />
            <div style={{ fontSize:".8125rem", marginTop:"var(--s2)" }}>Click to upload</div>
            <div style={{ fontSize:".75rem", color:"var(--t4)", marginTop:"3px" }}>JPG, PNG, WebP</div>
          </div>
        )}
        {preview && (
          <button
            onClick={e => { e.stopPropagation(); setPreview(null); onChange(null); }}
            style={{ position:"absolute", top:"6px", right:"6px", width:"24px", height:"24px", borderRadius:"50%", background:"rgba(0,0,0,.55)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <Ic.X />
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
    </div>
  );
}

/* ── Drawer / Modal ──────────────────────────────────────────────────── */
function Drawer({ open, onClose, title, width = "480px", children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || typeof gsap === "undefined") return;
    gsap.to(ref.current, {
      x: open ? 0 : "100%",
      duration: .35,
      ease: open ? "power2.out" : "power2.in",
    });
  }, [open]);

  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.5)", backdropFilter:"blur(4px)", animation:"fadeIn .2s ease" }} />
      )}
      <div ref={ref} style={{
        position:"fixed", top:0, right:0, bottom:0, zIndex:310,
        width:`min(${width}, 96vw)`, background:"var(--bgc)",
        borderLeft:"1px solid var(--bd)", boxShadow:"var(--sh-xl)",
        display:"flex", flexDirection:"column", overflow:"hidden",
        transform:"translateX(100%)",
      }}>
        {/* Header */}
        <div style={{ padding:"var(--s5) var(--s6)", borderBottom:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:700 }}>{title}</h2>
          <button onClick={onClose} className="btn btn-g btn-ico"><Ic.X /></button>
        </div>
        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"var(--s6)" }}>
          {children}
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </>
  );
}

/* ── Confirm dialog ──────────────────────────────────────────────────── */
function Confirm({ open, title, message, onConfirm, onCancel, danger = true }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--s4)" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s6)", width:"100%", maxWidth:"380px", boxShadow:"var(--sh-xl)" }}>
        <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:700, marginBottom:"var(--s2)" }}>{title}</h3>
        <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)", lineHeight:1.6 }}>{message}</p>
        <div style={{ display:"flex", gap:"var(--s2)" }}>
          <button onClick={onConfirm} className={`btn ${danger?"btn-p":"btn-s"}`} style={{ flex:1, background:danger?"var(--err)":undefined, borderColor:danger?"var(--err)":undefined }}>
            {danger ? "Delete" : "Confirm"}
          </button>
          <button onClick={onCancel} className="btn btn-s" style={{ flex:1 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Dietary / Spice badge ───────────────────────────────────────────── */
const DIETARY_COLORS = { veg:"var(--ok)", non_veg:"var(--err)", vegan:"var(--ok)" };
const DIETARY_LABELS = { veg:"Veg", non_veg:"Non-veg", vegan:"Vegan" };
const SPICE_LABELS   = { mild:"Mild", medium:"Medium", hot:"Hot", extra:"Extra Hot" };

function DietaryDot({ type }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:"4px" }}>
      <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:DIETARY_COLORS[type]||"var(--t4)", display:"inline-block", flexShrink:0 }}/>
      <span style={{ fontSize:".75rem", color:"var(--t3)" }}>{DIETARY_LABELS[type]||type}</span>
    </span>
  );
}

/* ── Status pill ────────────────────────────────────────────────────── */
function AvailBadge({ available }) {
  return (
    <span className={`badge ${available ? "badge-ok" : "badge-err"}`}>
      {available ? "Available" : "Unavailable"}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CATEGORY FORM
═══════════════════════════════════════════════════════════════════════ */
function CategoryForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    gradient_from: initial?.gradient_from || "#1A0800",
    gradient_to:   initial?.gradient_to   || "#2D1200",
    display_order: initial?.display_order ?? 0,
    is_active:     initial?.is_active     ?? true,
    all_branches:  initial?.all_branches  ?? false,
  });
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({...f, [k]:v})); setErrors(e => ({...e, [k]:""})); };

  const handleSubmit = e => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    if (image) fd.append("image", image);
    onSave(fd);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FL required>Category name</FL>
      <div className={`input-wrap${errors.name?" err":""}`} style={{ marginBottom:errors.name?"var(--s1)":"var(--s4)" }}>
        <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
          placeholder="e.g. Crispy Chicken" className="input-field" autoFocus />
      </div>
      <FE msg={errors.name} />

      <FL>Description</FL>
      <textarea value={form.description} onChange={e => set("description", e.target.value)}
        placeholder="Short description shown on the category page…" rows={3}
        style={{ width:"100%", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"var(--s3)", color:"var(--t1)", fontSize:".9375rem", fontFamily:"var(--ff-b)", resize:"vertical", outline:"none", marginBottom:"var(--s4)", transition:"border-color var(--d1) var(--ease)" }}
        onFocus={e => e.target.style.borderColor="var(--brand)"}
        onBlur={e  => e.target.style.borderColor="var(--bd)"}
      />

      {/* Gradient preview */}
      <FL>Background gradient</FL>
      <div style={{ display:"flex", gap:"var(--s3)", alignItems:"center", marginBottom:"var(--s4)" }}>
        <div>
          <div style={{ fontSize:".75rem", color:"var(--t3)", marginBottom:"4px" }}>From</div>
          <input type="color" value={form.gradient_from} onChange={e => set("gradient_from", e.target.value)}
            style={{ width:"48px", height:"36px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", cursor:"pointer", padding:"2px" }} />
        </div>
        <div style={{ flex:1, height:"44px", borderRadius:"var(--r3)", background:`linear-gradient(135deg, ${form.gradient_from}, ${form.gradient_to})`, border:"1px solid var(--bd)" }} />
        <div>
          <div style={{ fontSize:".75rem", color:"var(--t3)", marginBottom:"4px" }}>To</div>
          <input type="color" value={form.gradient_to} onChange={e => set("gradient_to", e.target.value)}
            style={{ width:"48px", height:"36px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", cursor:"pointer", padding:"2px" }} />
        </div>
      </div>

      <ImagePicker onChange={setImage} label="Category image (optional)" existingUrl={initial?.image} />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s5)" }}>
        <div>
          <FL>Display order</FL>
          <div className="input-wrap">
            <input type="number" min="0" value={form.display_order} onChange={e => set("display_order", e.target.value)} className="input-field" />
          </div>
        </div>
        <div>
          <FL>Status</FL>
          <button type="button"
            onClick={() => set("is_active", !form.is_active)}
            className={`toggle ${form.is_active?"on":"off"}`}
            style={{ marginTop:"10px" }}>
            <div className="toggle-knob" />
          </button>
          <span style={{ fontSize:".875rem", marginLeft:"var(--s2)", color: form.is_active?"var(--ok)":"var(--t3)" }}>
            {form.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* All branches toggle */}
      <div onClick={() => set("all_branches", !form.all_branches)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s4)", marginBottom:"var(--s5)", borderRadius:"var(--r3)", border:`1.5px solid ${form.all_branches?"var(--brand)":"var(--bd)"}`, background:form.all_branches?"var(--brand-tint)":"var(--bg2)", cursor:"pointer", transition:"all var(--d1) var(--ease)" }}>
        <div>
          <div style={{ fontWeight:700, fontSize:".9375rem", color:form.all_branches?"var(--brand)":"var(--t1)" }}>Available at all branches</div>
          <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>Show this category on every branch menu, not just this branch</div>
        </div>
        <button type="button" className={`toggle ${form.all_branches?"on":"off"}`} style={{ flexShrink:0 }}>
          <div className="toggle-knob"/>
        </button>
      </div>

      <div style={{ display:"flex", gap:"var(--s2)" }}>
        <button type="submit" disabled={saving} className="btn btn-p btn-lg" style={{ flex:1 }}>
          {saving ? <><span className="spin">⟳</span> Saving…</> : initial ? "Save changes" : "Create category"}
        </button>
        <button type="button" onClick={onClose} className="btn btn-s">Cancel</button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ITEM FORM
═══════════════════════════════════════════════════════════════════════ */
function ItemForm({ initial, categories, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    name:            initial?.name || "",
    category_id:     initial?.category || "",
    description:     initial?.description || "",
    price:           initial?.price || "",
    dietary_type:    initial?.dietary_type || "non_veg",
    has_spice:       (initial?.spice_level && initial?.spice_level !== "none") ? true : false,
    spice_level:     initial?.spice_level || "medium",
    calories:        initial?.calories || "",
    prep_time_min:   initial?.prep_time_min || 8,
    prep_time_max:   initial?.prep_time_max || 15,
    is_available:    initial?.is_available ?? true,
    is_featured:     initial?.is_featured ?? false,
    is_new:          initial?.is_new ?? true,
    is_bestseller:   initial?.is_bestseller ?? false,
    is_hotdeals:     initial?.is_hotdeals    ?? false,
    is_buckets:      initial?.is_buckets     ?? false,
    is_combo:        initial?.is_combo       ?? false,
    is_chicken:      initial?.is_chicken     ?? false,
    is_snacks:       initial?.is_snacks      ?? false,
    is_cold_drinks:  initial?.is_cold_drinks ?? false,
    discount:        initial?.discount || "",
    measurement_unit: initial?.measurement_unit || "pcs",
    unit_quantity:    initial?.unit_quantity    || "",
    display_order:   initial?.display_order ?? 0,
    low_stock_threshold: initial?.low_stock_threshold || 10,
    all_branches:        initial?.all_branches ?? false,
  });
  const [image, setImage] = useState(null);
  // Gallery: existing images from server [{id,url}], new files to upload, IDs to remove
  const [existingGallery, setExistingGallery] = useState(
    (initial?.gallery_images || []).map(g => typeof g === "string" ? { id: null, url: g } : g)
  );
  const [newGalleryFiles, setNewGalleryFiles] = useState([]);   // [{file, preview}]
  const [removedGalleryIds, setRemovedGalleryIds] = useState([]); // backend IDs to delete
  const galleryInputRef = useRef(null);
  const [customisations, setCustomisations] = useState(
    initial?.customisations?.map(c => ({ name:c.name, extra_price:c.extra_price })) || []
  );
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({...f, [k]:v})); setErrors(e => ({...e, [k]:""})); };

  const addCustom = () => setCustomisations(c => [...c, { name:"", extra_price:"0" }]);
  const removeCustom = i => setCustomisations(c => c.filter((_,j) => j !== i));
  const setCustom = (i, k, v) => setCustomisations(c => c.map((x,j) => j===i ? {...x,[k]:v} : x));

  const handleSubmit = e => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim())      errs.name       = "Name is required";
    if (!form.category_id)      errs.category_id= "Select a category";
    if (!form.price)            errs.price      = "Price is required";
    else if (isNaN(form.price)) errs.price      = "Enter a valid price";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === "has_spice") return;  // internal flag, not sent to backend
      if (k === "spice_level" && !form.has_spice) { fd.append("spice_level", "none"); return; }
      if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
    });
    if (image) fd.append("image", image);
    if (customisations.length) fd.append("customisations", JSON.stringify(customisations));
    // Gallery: new files to upload
    newGalleryFiles.forEach(g => fd.append("gallery_add", g.file));
    // Gallery: IDs to remove
    if (removedGalleryIds.length) fd.append("gallery_remove", JSON.stringify(removedGalleryIds));
    onSave(fd);
  };

  const DIETS   = [["veg","Vegetarian"],["non_veg","Non-veg"],["vegan","Vegan"]];
  const SPICES  = [["mild","Mild"],["medium","Medium"],["hot","Hot"],["extra","Extra Hot"]];
  const UNITS   = [["pcs","Pcs"],["g","Grams"],["kg","Kg"],["ml","ml"],["l","Litre"],["portion","Portion"],["box","Box"],["cup","Cup"]];

  return (
    <form onSubmit={handleSubmit}>
      {/* Name */}
      <FL required>Item name</FL>
      <div className={`input-wrap${errors.name?" err":""}`} style={{ marginBottom:errors.name?"var(--s1)":"var(--s4)" }}>
        <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
          placeholder="e.g. Crispy Chicken Bucket" className="input-field" autoFocus />
      </div>
      <FE msg={errors.name} />

      {/* Category */}
      <FL required>Category</FL>
      <div className={`input-wrap${errors.category_id?" err":""}`} style={{ marginBottom:errors.category_id?"var(--s1)":"var(--s4)" }}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>
        <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
          style={{ flex:1, border:"none", background:"transparent", color:form.category_id?"var(--t1)":"var(--t4)", fontSize:".9375rem", outline:"none", padding:"0 var(--s2)", fontFamily:"var(--ff-b)", cursor:"pointer" }}>
          <option value="">Select category…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <FE msg={errors.category_id} />

      {/* Description */}
      <FL>Description</FL>
      <textarea value={form.description} onChange={e => set("description", e.target.value)}
        placeholder="Describe this item…" rows={2}
        style={{ width:"100%", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"var(--s3)", color:"var(--t1)", fontSize:".9375rem", fontFamily:"var(--ff-b)", resize:"vertical", outline:"none", marginBottom:"var(--s4)" }}
        onFocus={e => e.target.style.borderColor="var(--brand)"}
        onBlur={e  => e.target.style.borderColor="var(--bd)"}
      />

      {/* Price + Discount + Calories row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
        <div>
          <FL required>Price (₹)</FL>
          <div className={`input-wrap${errors.price?" err":""}`}>
            <span style={{ color:"var(--t3)", fontSize:".9375rem", paddingRight:"var(--s1)" }}>₹</span>
            <input type="number" min="0" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} className="input-field" placeholder="0.00" />
          </div>
          <FE msg={errors.price} />
        </div>
        <div>
          <FL>Discount (%)</FL>
          <div className="input-wrap">
            <span style={{ color:"var(--t3)", fontSize:".875rem" }}>%</span>
            <input type="number" min="0" max="100" value={form.discount} onChange={e => set("discount", e.target.value)} className="input-field" placeholder="0 = none" />
          </div>
        </div>
        <div>
          <FL>Calories (kcal)</FL>
          <div className="input-wrap">
            <input type="number" min="0" value={form.calories} onChange={e => set("calories", e.target.value)} className="input-field" placeholder="Optional" />
          </div>
        </div>
      </div>

      {/* Measurement unit + quantity */}
      <FL>Measurement unit & quantity</FL>
      <div style={{ display:"flex", gap:"var(--s3)", marginBottom:"var(--s4)", alignItems:"flex-start" }}>
        {/* Unit selector */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"var(--s1)", flex:1 }}>
          {UNITS.map(([val, lbl]) => (
            <button key={val} type="button" onClick={() => set("measurement_unit", val)}
              style={{ padding:"6px 12px", borderRadius:"var(--r2)", fontSize:".8125rem", fontWeight:form.measurement_unit===val?700:400, fontFamily:"var(--ff-b)", cursor:"pointer", transition:"all var(--d1) var(--ease)", border:`1.5px solid ${form.measurement_unit===val?"var(--brand)":"var(--bd)"}`, background:form.measurement_unit===val?"var(--brand-tint)":"var(--bg2)", color:form.measurement_unit===val?"var(--brand)":"var(--t2)" }}>
              {lbl}
            </button>
          ))}
        </div>
        {/* Quantity value — e.g. 500 (for 500g), 1 (for 1kg), 6 (for 6 pcs) */}
        <div style={{ width:"100px", flexShrink:0 }}>
          <div className="input-wrap">
            <input type="number" min="1" value={form.unit_quantity || ""} onChange={e => set("unit_quantity", e.target.value)}
              placeholder={form.measurement_unit === "pcs" ? "6" : form.measurement_unit === "g" ? "500" : form.measurement_unit === "ml" ? "250" : "1"}
              className="input-field" style={{ textAlign:"center", fontFamily:"var(--ff-d)", fontWeight:700 }}/>
          </div>
          <p style={{ fontSize:".625rem", color:"var(--t4)", marginTop:"3px", textAlign:"center" }}>
            e.g. {form.unit_quantity || "?"} {form.measurement_unit}
          </p>
        </div>
      </div>

      {/* Dietary type */}
      <FL>Dietary type</FL>
      <div style={{ display:"flex", gap:"var(--s2)", marginBottom:"var(--s4)" }}>
        {DIETS.map(([val, lbl]) => (
          <button key={val} type="button"
            onClick={() => set("dietary_type", val)}
            style={{ flex:1, padding:"8px var(--s2)", borderRadius:"var(--r2)", fontSize:".8125rem", fontWeight:600, fontFamily:"var(--ff-b)", cursor:"pointer", transition:"all var(--d1) var(--ease)", border:`1.5px solid ${form.dietary_type===val?"var(--brand)":"var(--bd)"}`, background:form.dietary_type===val?"var(--brand-tint)":"var(--bg2)", color:form.dietary_type===val?"var(--brand)":"var(--t2)" }}>
            <span style={{ width:"7px", height:"7px", borderRadius:"50%", background:DIETARY_COLORS[val], display:"inline-block", marginRight:"5px" }} />
            {lbl}
          </button>
        ))}
      </div>

      {/* Spice — opt-in */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s3)" }}>
        <FL>Has spice level</FL>
        <button type="button" onClick={() => set("has_spice", !form.has_spice)}
          className={`toggle ${form.has_spice?"on":"off"}`} style={{ marginBottom:0 }}>
          <div className="toggle-knob"/>
        </button>
      </div>
      {form.has_spice && (
        <div style={{ display:"flex", gap:"var(--s2)", marginBottom:"var(--s4)" }}>
          {SPICES.map(([val, lbl]) => (
            <button key={val} type="button"
              onClick={() => set("spice_level", val)}
              style={{ flex:1, padding:"8px var(--s1)", borderRadius:"var(--r2)", fontSize:".8125rem", fontWeight:form.spice_level===val?700:400, fontFamily:"var(--ff-b)", cursor:"pointer", transition:"all var(--d1) var(--ease)", border:`1.5px solid ${form.spice_level===val?"var(--brand)":"var(--bd)"}`, background:form.spice_level===val?"var(--brand-tint)":"var(--bg2)", color:form.spice_level===val?"var(--brand)":"var(--t2)" }}>
              {SPICE_LABELS[val]}
            </button>
          ))}
        </div>
      )}

      {/* Prep time */}
      <FL>Prep time (minutes)</FL>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
        <div>
          <div style={{ fontSize:".75rem", color:"var(--t4)", marginBottom:"4px" }}>Min</div>
          <div className="input-wrap">
            <input type="number" min="1" value={form.prep_time_min} onChange={e => set("prep_time_min", e.target.value)} className="input-field" />
          </div>
        </div>
        <div>
          <div style={{ fontSize:".75rem", color:"var(--t4)", marginBottom:"4px" }}>Max</div>
          <div className="input-wrap">
            <input type="number" min="1" value={form.prep_time_max} onChange={e => set("prep_time_max", e.target.value)} className="input-field" />
          </div>
        </div>
      </div>

      <ImagePicker onChange={setImage} label="Product image" existingUrl={initial?.image_url} />

      {/* Gallery images */}
      <div style={{ marginBottom:"var(--s5)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s2)" }}>
          <FL>Gallery images (optional)</FL>
          <button type="button" onClick={() => galleryInputRef.current?.click()}
            className="btn btn-s btn-sm" style={{ fontSize:".75rem" }}>
            <Ic.Plus /> Add photo
          </button>
        </div>
        <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display:"none" }}
          onChange={e => {
            const files = Array.from(e.target.files);
            setNewGalleryFiles(prev => [
              ...prev,
              ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) })),
            ]);
            e.target.value = "";
          }}
        />
        {existingGallery.length === 0 && newGalleryFiles.length === 0 && (
          <p style={{ fontSize:".8125rem", color:"var(--t4)", fontStyle:"italic" }}>
            No gallery images — add extra product photos here
          </p>
        )}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"var(--s2)", marginTop:"var(--s2)" }}>
          {/* Existing gallery images */}
          {existingGallery.map((g, i) => (
            <div key={g.id || i} style={{ position:"relative", width:"72px", height:"72px", borderRadius:"var(--r3)", overflow:"hidden", border:"1px solid var(--bd)" }}>
              <img loading="lazy" src={g.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              <button type="button"
                onClick={() => {
                  setExistingGallery(prev => prev.filter((_, j) => j !== i));
                  if (g.id) setRemovedGalleryIds(prev => [...prev, g.id]);
                }}
                style={{ position:"absolute", top:"3px", right:"3px", width:"18px", height:"18px", borderRadius:"50%", background:"rgba(0,0,0,.6)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
          {/* New (queued) gallery images */}
          {newGalleryFiles.map((g, i) => (
            <div key={i} style={{ position:"relative", width:"72px", height:"72px", borderRadius:"var(--r3)", overflow:"hidden", border:"2px solid var(--brand)", boxSizing:"border-box" }}>
              <img loading="lazy" src={g.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              <button type="button"
                onClick={() => setNewGalleryFiles(prev => prev.filter((_, j) => j !== i))}
                style={{ position:"absolute", top:"3px", right:"3px", width:"18px", height:"18px", borderRadius:"50%", background:"rgba(0,0,0,.6)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,.5)", fontSize:".5rem", color:"#fff", textAlign:"center", padding:"1px 0" }}>NEW</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stock Available — most critical field, shown prominently */}
      <div onClick={() => set("is_available", !form.is_available)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s4)", marginBottom:"var(--s4)", borderRadius:"var(--r3)", border:`2px solid ${form.is_available?"rgba(29,158,117,.4)":"rgba(226,75,74,.4)"}`, background:form.is_available?"rgba(29,158,117,.07)":"rgba(226,75,74,.07)", cursor:"pointer", transition:"all var(--d1) var(--ease)" }}>
        <div>
          <div style={{ fontWeight:800, fontSize:".9375rem", color:form.is_available?"var(--ok)":"var(--err)" }}>
            {form.is_available ? <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5" style={{display:"inline",marginRight:"5px"}}><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>Stock Available — taking orders</> : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2.5" style={{display:"inline",marginRight:"5px"}}><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>Not Available — orders blocked</>}
          </div>
          <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>
            {form.is_available
              ? "Customers can add this item to cart. Update stock daily via Stock Manager."
              : "This item will not appear on the menu. No orders accepted until marked available."}
          </div>
        </div>
        <button type="button" className={`toggle ${form.is_available?"on":"off"}`} style={{ flexShrink:0 }}>
          <div className="toggle-knob"/>
        </button>
      </div>

      {/* Flags — badges */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"var(--s3)", marginBottom:"var(--s4)" }}>
        {[
          ["is_featured",   "Featured"],
          ["is_new",        "New badge"],
          ["is_bestseller", "Bestseller"],
        ].map(([key, label]) => (
          <div key={key}>
            <div style={{ fontSize:".6875rem", color:"var(--t3)", marginBottom:"6px", fontWeight:700, textTransform:"uppercase", letterSpacing:".04em" }}>{label}</div>
            <button type="button" onClick={() => set(key, !form[key])}
              className={`toggle ${form[key]?"on":"off"}`}>
              <div className="toggle-knob" />
            </button>
          </div>
        ))}
      </div>

      {/* Home page sections */}
      <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"var(--s3) var(--s4)", marginBottom:"var(--s5)" }}>
        <div style={{ fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"var(--t3)", marginBottom:"var(--s3)" }}>
          Home page sections
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--s3)" }}>
          {[
            ["is_hotdeals",    "Hot Deals",     "var(--err)"],
            ["is_buckets",     "Buckets",       "#d97706"],
            ["is_combo",       "Combos",        "var(--ok)"],
            ["is_chicken",     "Chicken Items", "var(--brand)"],
            ["is_snacks",      "Snacks",        "var(--warn)"],
            ["is_cold_drinks", "Cold Drinks",   "var(--info)"],
          ].map(([key, label, accent]) => (
            <div key={key}
              onClick={() => set(key, !form[key])}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s2) var(--s3)", borderRadius:"var(--r2)", border:`1px solid ${form[key]?accent:"var(--bd)"}`, background:form[key]?`${accent}11`:"transparent", cursor:"pointer", transition:"all var(--d1) var(--ease)" }}>
              <span style={{ fontSize:".875rem", fontWeight:form[key]?700:500, color:form[key]?accent:"var(--t2)" }}>{label}</span>
              <button type="button" className={`toggle ${form[key]?"on":"off"}`} style={{ flexShrink:0 }}>
                <div className="toggle-knob"/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* All branches */}
      <div onClick={() => set("all_branches", !form.all_branches)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--s3) var(--s4)", marginBottom:"var(--s4)", borderRadius:"var(--r3)", border:`1.5px solid ${form.all_branches?"var(--brand)":"var(--bd)"}`, background:form.all_branches?"var(--brand-tint)":"var(--bg2)", cursor:"pointer", transition:"all var(--d1) var(--ease)" }}>
        <div>
          <div style={{ fontWeight:700, fontSize:".9375rem", color:form.all_branches?"var(--brand)":"var(--t1)" }}>Available at all branches</div>
          <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>Show this item on every branch menu, not just this branch</div>
        </div>
        <button type="button" className={`toggle ${form.all_branches?"on":"off"}`} style={{ flexShrink:0 }}>
          <div className="toggle-knob"/>
        </button>
      </div>

      {/* Customisations */}
      <Divider />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s3)" }}>
        <div style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:700 }}>Customisations</div>
        <button type="button" onClick={addCustom} className="btn btn-s btn-sm">
          <Ic.Plus /> Add option
        </button>
      </div>
      {customisations.length === 0 && (
        <p style={{ fontSize:".8125rem", color:"var(--t4)", marginBottom:"var(--s4)", fontStyle:"italic" }}>
          No customisations — e.g. "Extra Spicy", "No Sauce (+₹20)"
        </p>
      )}
      {customisations.map((c, i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:"var(--s2)", marginBottom:"var(--s2)", alignItems:"center" }}>
          <div className="input-wrap" style={{ marginBottom:0 }}>
            <input value={c.name} onChange={e => setCustom(i,"name",e.target.value)}
              placeholder="Option name" className="input-field" style={{ padding:"9px 0" }} />
          </div>
          <div className="input-wrap" style={{ marginBottom:0, width:"90px" }}>
            <span style={{ color:"var(--t3)", fontSize:".875rem" }}>₹</span>
            <input type="number" min="0" step="0.01" value={c.extra_price} onChange={e => setCustom(i,"extra_price",e.target.value)}
              placeholder="0" className="input-field" style={{ padding:"9px 0" }} />
          </div>
          <button type="button" onClick={() => removeCustom(i)} className="btn btn-g btn-ico" style={{ padding:"9px" }}>
            <Ic.Trash />
          </button>
        </div>
      ))}

      <Divider />
      <div style={{ display:"flex", gap:"var(--s2)", paddingTop:"var(--s3)" }}>
        <button type="submit" disabled={saving} className="btn btn-p btn-lg" style={{ flex:1 }}>
          {saving ? <><span className="spin">⟳</span> Saving…</> : initial ? "Save changes" : "Create item"}
        </button>
        <button type="button" onClick={onClose} className="btn btn-s">Cancel</button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CATEGORIES TAB
═══════════════════════════════════════════════════════════════════════ */
function CategoriesTab({ categories: categoriesProp, loading, onRefresh, activeBranchId }) {
  const [categories, setCategories] = useState(categoriesProp);
  const [drawer,  setDrawer]  = useState(null);  // null | "create" | category obj
  const [confirm, setConfirm] = useState(null);  // null | id
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState("");
  const listRef = useRef(null);

  // Sync local categories when parent refreshes
  useEffect(() => { setCategories(categoriesProp); }, [categoriesProp]);

  useEffect(() => {
    if (!loading && listRef.current && typeof gsap !== "undefined") {
      gsap.fromTo(listRef.current.children,
        { y:12, opacity:0 },
        { y:0, opacity:1, stagger:.04, duration:.35, ease:"power2.out" }
      );
    }
  }, [loading]);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const handleSave = async (fd) => {
    setSaving(true);
    try {
      if (drawer === "create") {
        await adminCreateCategory(fd, activeBranchId);
        showToast("Category created!");
      } else {
        await adminUpdateCategory(drawer.id, fd);
        showToast("Category updated!");
      }
      setDrawer(null);
      onRefresh();
    } catch (e) {
      showToast("Error: " + (e.response?.data?.error || "Try again"));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await adminDeleteCategory(confirm);
      showToast("Category deleted.");
      onRefresh();
    } catch (e) {
      showToast("Cannot delete — items still linked.");
    } finally { setConfirm(null); }
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--s5)" }}>
        <div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:700 }}>Categories</h2>
          <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:"3px" }}>
            {categories.length} categories · drag to reorder
          </p>
        </div>
        <button onClick={() => setDrawer("create")} className="btn btn-p">
          <Ic.Plus /> New category
        </button>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"72px", borderRadius:"var(--r4)" }} />)}
        </div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign:"center", padding:"var(--s12) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:"var(--s3)" }}><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg></div>
          <p style={{ fontSize:".9375rem", fontWeight:600, marginBottom:"var(--s2)" }}>No categories yet</p>
          <p style={{ fontSize:".875rem", color:"var(--t3)", marginBottom:"var(--s4)" }}>Add your first menu category</p>
          <button onClick={() => setDrawer("create")} className="btn btn-p">
            <Ic.Plus /> Create category
          </button>
        </div>
      ) : (
        <div ref={listRef} style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
          {categories.map((cat, idx) => (
            <div key={cat.id}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain", String(idx)); e.currentTarget.style.opacity="0.45"; }}
              onDragEnd={e => { e.currentTarget.style.opacity="1"; }}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect="move"; e.currentTarget.style.background="var(--brand-tint)"; e.currentTarget.style.borderColor="var(--brand)"; }}
              onDragLeave={e => { e.currentTarget.style.background=""; e.currentTarget.style.borderColor=""; }}
              onDrop={async e => {
                e.preventDefault();
                e.currentTarget.style.background=""; e.currentTarget.style.borderColor="";
                const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
                const toIdx   = idx;
                if (fromIdx === toIdx) return;
                // Reorder local state
                const reordered = [...categories];
                const [moved]   = reordered.splice(fromIdx, 1);
                reordered.splice(toIdx, 0, moved);
                // Assign new display_order values
                const updated = reordered.map((c, i) => ({ ...c, display_order: i }));
                setCategories(updated);
                // Persist to backend — PATCH each changed order
                try {
                  await Promise.all(
                    updated
                      .filter((c, i) => c.display_order !== categories.findIndex(x => x.id === c.id))
                      .map(c => adminUpdateCategory(c.id, { display_order: c.display_order }))
                  );
                  showToast("Category order saved.");
                } catch { showToast("Failed to save order."); }
              }}
              className="card"
              style={{ padding:"var(--s4) var(--s5)", display:"flex", alignItems:"center", gap:"var(--s4)", cursor:"grab", transition:"background var(--d1) var(--ease), border-color var(--d1) var(--ease)", userSelect:"none" }}>

              {/* Drag handle */}
              <div style={{ color:"var(--t4)", flexShrink:0, fontSize:"1.125rem", lineHeight:1, cursor:"grab" }} title="Drag to reorder">
                ⠿
              </div>

              {/* Color swatch / image */}
              <div style={{ width:"52px", height:"52px", borderRadius:"var(--r3)", overflow:"hidden", flexShrink:0, background:`linear-gradient(135deg,${cat.gradient_from||"#1A0800"},${cat.gradient_to||"#2D1200"})`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                {cat.image
                  ? <img loading="lazy" src={typeof cat.image==="string"?cat.image:URL.createObjectURL(cat.image)} alt={cat.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                  : <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
                }
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", marginBottom:"3px" }}>
                  <span style={{ fontFamily:"var(--ff-d)", fontSize:".9375rem", fontWeight:700 }}>{cat.name}</span>
                  {!cat.is_active && <span className="badge badge-err">Inactive</span>}
                  {cat.all_branches && (
                    <span className="badge badge-brand" style={{ fontSize:".5625rem" }}>
                      <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      All branches
                    </span>
                  )}
                </div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>
                  {cat.item_count} items · {cat.available_count} available · order #{cat.display_order}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:"flex", gap:"var(--s2)", flexShrink:0 }}>
                <button onClick={() => setDrawer(cat)} className="btn btn-s btn-sm">
                  <Ic.Edit /> Edit
                </button>
                <button onClick={() => setConfirm(cat.id)} className="btn btn-g btn-sm" style={{ color:"var(--err)" }}>
                  <Ic.Trash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:"var(--s8)", left:"50%", transform:"translateX(-50%)", zIndex:500, background:"var(--t1)", color:"var(--bg)", padding:"var(--s3) var(--s5)", borderRadius:"var(--rf)", fontSize:".875rem", fontWeight:600, whiteSpace:"nowrap", boxShadow:"var(--sh-xl)", animation:"popIn .3s ease" }}>
          {toast}
        </div>
      )}

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer==="create" ? "New category" : `Edit: ${drawer?.name}`} width="440px">
        {!!drawer && (
          <CategoryForm
            initial={drawer==="create" ? null : drawer}
            onSave={handleSave}
            onClose={() => setDrawer(null)}
            saving={saving}
          />
        )}
      </Drawer>

      <Confirm
        open={!!confirm}
        title="Delete category?"
        message="All items in this category will be unlinked. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ITEMS TAB
═══════════════════════════════════════════════════════════════════════ */
function ItemsTab({ items, categories, loading, onRefresh, activeBranchId }) {
  const [drawer,    setDrawer]   = useState(null);
  const [confirm,   setConfirm]  = useState(null);
  const [toast,     setToast]    = useState("");
  const [saving,    setSaving]   = useState(false);
  const [toggling,  setToggling] = useState({});
  const [searchQ,   setSearchQ]  = useState("");
  const [catFilter, setCatFilter]= useState("all");
  const [availFilter,setAvailFilter] = useState("all");
  const tableRef = useRef(null);

  useEffect(() => {
    if (!loading && tableRef.current && typeof gsap !== "undefined") {
      const rows = tableRef.current.querySelectorAll(".item-row");
      gsap.fromTo(rows, { opacity:0, x:-8 }, { opacity:1, x:0, stagger:.025, duration:.3, ease:"power2.out" });
    }
  }, [loading, searchQ, catFilter, availFilter]);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const handleSave = async (fd) => {
    setSaving(true);
    try {
      if (drawer === "create") {
        await adminCreateItem(fd, activeBranchId);
        showToast("Item created!");
      } else {
        await adminUpdateItem(drawer.id, fd);
        showToast("Item updated!");
      }
      setDrawer(null);
      onRefresh();
    } catch (e) {
      showToast("Error: " + (e.response?.data?.error || "Try again"));
    } finally { setSaving(false); }
  };

  const handleToggle = async (item) => {
    setToggling(t => ({...t, [item.id]:true}));
    try {
      await adminToggleAvail(item.id);
      showToast(`${item.name} is now ${item.is_available?"unavailable":"available"}.`);
      onRefresh();
    } catch { showToast("Toggle failed."); }
    finally { setToggling(t => ({...t, [item.id]:false})); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await adminDeleteItem(confirm);
      showToast("Item deleted.");
      onRefresh();
    } catch { showToast("Delete failed."); }
    finally { setConfirm(null); }
  };

  // Filter
  const filtered = items.filter(item => {
    const q = searchQ.trim().toLowerCase();
    if (q && !item.name.toLowerCase().includes(q)) return false;
    if (catFilter !== "all" && item.category !== catFilter) return false;
    if (availFilter === "available" && !item.is_available) return false;
    if (availFilter === "unavailable" && item.is_available) return false;
    return true;
  });

  return (
    <div>
      {/* Controls */}
      <div style={{ display:"flex", gap:"var(--s3)", alignItems:"center", marginBottom:"var(--s5)", flexWrap:"wrap" }}>
        <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:700, flex:"0 0 auto" }}>
          Menu items
        </div>
        <div className="input-wrap" style={{ flex:1, minWidth:"200px", maxWidth:"320px" }}>
          <Ic.Search />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search items…" className="input-field" />
          {searchQ && <button onClick={() => setSearchQ("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t3)", fontSize:"17px" }}>×</button>}
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"10px var(--s3)", fontSize:".875rem", color:"var(--t1)", outline:"none", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
          <option value="all">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={availFilter} onChange={e => setAvailFilter(e.target.value)}
          style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"10px var(--s3)", fontSize:".875rem", color:"var(--t1)", outline:"none", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
          <option value="all">All status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <button onClick={() => setDrawer("create")} className="btn btn-p" style={{ marginLeft:"auto", flexShrink:0 }}>
          <Ic.Plus /> New item
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:"var(--s4)", marginBottom:"var(--s4)", padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", fontSize:".875rem" }}>
        <span><strong style={{ color:"var(--t1)" }}>{filtered.length}</strong> <span style={{ color:"var(--t3)" }}>shown</span></span>
        <span style={{ color:"var(--bd2)" }}>·</span>
        <span><strong style={{ color:"var(--ok)" }}>{filtered.filter(i=>i.is_available).length}</strong> <span style={{ color:"var(--t3)" }}>available</span></span>
        <span style={{ color:"var(--bd2)" }}>·</span>
        <span><strong style={{ color:"var(--err)" }}>{filtered.filter(i=>!i.is_available).length}</strong> <span style={{ color:"var(--t3)" }}>unavailable</span></span>
        {items.filter(i=>i.is_featured).length > 0 && <>
          <span style={{ color:"var(--bd2)" }}>·</span>
          <span><strong style={{ color:"var(--gold)" }}>{items.filter(i=>i.is_featured).length}</strong> <span style={{ color:"var(--t3)" }}>featured</span></span>
        </>}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skel" style={{ height:"60px", borderRadius:"var(--r3)" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"var(--s12)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
          <p style={{ fontSize:".9375rem", color:"var(--t3)" }}>
            {searchQ ? `No items match "${searchQ}"` : "No items in this view"}
          </p>
          {!searchQ && (
            <button onClick={() => setDrawer("create")} className="btn btn-p" style={{ marginTop:"var(--s4)" }}>
              <Ic.Plus /> Add first item
            </button>
          )}
        </div>
      ) : (
        <div ref={tableRef} className="card" style={{ overflow:"hidden" }}>
          {/* Horizontal scroll wrapper — collapses gracefully on mobile */}
          <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ minWidth:"720px" }}>
          {/* Table header */}
          <div style={{ display:"grid", gridTemplateColumns:"40px 1fr 100px 110px 80px 80px 90px 80px", gap:"var(--s3)", padding:"var(--s3) var(--s4)", background:"var(--bg2)", borderBottom:"1px solid var(--bd)" }}>
            {["","Name","Category","Price","Dietary","Stock","Availability","Actions"].map((h,i) => (
              <div key={i} style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t4)", textAlign:i>1?"center":"left" }}>
                {h}
              </div>
            ))}
          </div>

          {filtered.map((item, idx) => (
            <div key={item.id} className="item-row" style={{ display:"grid", gridTemplateColumns:"40px 1fr 100px 110px 80px 80px 90px 80px", gap:"var(--s3)", padding:"var(--s3) var(--s4)", borderBottom:idx<filtered.length-1?"1px solid var(--bd)":"none", alignItems:"center", transition:"background var(--d1) var(--ease)" }}
              onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}
            >
              {/* Thumb */}
              <div style={{ width:"36px", height:"36px", borderRadius:"var(--r2)", overflow:"hidden", background:`linear-gradient(135deg,#1A0800,#2D1200)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {item.image_url
                  ? <img loading="lazy" src={item.image_url} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
                }
              </div>

              {/* Name */}
              <div style={{ minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"4px", overflow:"hidden" }}>
                  <span style={{ fontSize:".9375rem", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</span>
                  {item.all_branches && (
                    <span className="badge badge-brand" style={{ fontSize:".5625rem", flexShrink:0 }}>
                      <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      All branches
                    </span>
                  )}
                </div>
                <div style={{ fontSize:".75rem", color:"var(--t3)", display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
                  {item.avg_rating > 0 && <><Ic.Star />{Number(item.avg_rating).toFixed(1)} · </>}
                  {item.prep_time_display}
                  {formatUnit(item.unit_quantity, item.measurement_unit) && (
                    <span style={{ color:"var(--t4)", fontWeight:600 }}>· {formatUnit(item.unit_quantity, item.measurement_unit)}</span>
                  )}
                  {item.is_featured && <span className="badge badge-gold" style={{ fontSize:".5625rem" }}>Featured</span>}
                  {item.is_new && <span className="badge badge-ok" style={{ fontSize:".5625rem" }}>New</span>}
                </div>
              </div>

              {/* Category */}
              <div style={{ fontSize:".8125rem", color:"var(--t3)", textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {categories.find(c=>c.id===item.category)?.name || "—"}
              </div>

              {/* Price */}
              <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:"2px" }}>
                {item.discount > 0 ? (
                  <>
                    <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, color:"var(--brand)", fontSize:".9375rem", lineHeight:1 }}>
                      {formatPrice(item.discounted_price || item.price)}
                    </span>
                    <span style={{ fontSize:".6875rem", textDecoration:"line-through", color:"var(--t4)", lineHeight:1 }}>
                      {formatPrice(item.price)}
                    </span>
                    <span style={{ fontSize:".625rem", fontWeight:800, color:"var(--ok)", letterSpacing:".04em", background:"color-mix(in srgb,var(--ok) 12%,transparent)", padding:"1px 5px", borderRadius:"4px" }}>
                      {item.discount}% OFF
                    </span>
                  </>
                ) : (
                  <span style={{ fontFamily:"var(--ff-d)", fontWeight:700, color:"var(--brand)", fontSize:".9375rem" }}>
                    {formatPrice(item.price)}
                  </span>
                )}
              </div>

              {/* Dietary */}
              <div style={{ display:"flex", justifyContent:"center" }}>
                <DietaryDot type={item.dietary_type} />
              </div>

              {/* Stock — remaining count with colour */}
              <div style={{ textAlign:"center" }}>
                {item.stock_remaining != null ? (
                  <div>
                    <div style={{ fontFamily:"var(--ff-d)", fontWeight:900, fontSize:"1rem", color:item.stock_status==="out"?"var(--err)":item.stock_status==="low"?"var(--warn)":"var(--ok)", lineHeight:1 }}>
                      {item.stock_remaining}
                    </div>
                    <div style={{ fontSize:".5625rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:item.stock_status==="out"?"var(--err)":item.stock_status==="low"?"var(--warn)":"var(--t4)", marginTop:"2px" }}>
                      {item.stock_status === "out" ? "out" : item.stock_status === "low" ? "low" : "ok"}
                    </div>
                  </div>
                ) : (
                  <span style={{ color:"var(--t4)", fontSize:".75rem" }}>—</span>
                )}
              </div>

              {/* Availability toggle */}
              <div style={{ display:"flex", justifyContent:"center" }}>
                <button
                  onClick={() => handleToggle(item)}
                  disabled={toggling[item.id]}
                  className={`toggle ${item.is_available?"on":"off"}`}
                  title={item.is_available ? "Click to make unavailable" : "Click to make available"}
                  style={{ opacity:toggling[item.id]?.6:1 }}>
                  <div className="toggle-knob" />
                </button>
              </div>

              {/* Actions */}
              <div style={{ display:"flex", justifyContent:"center", gap:"var(--s1)" }}>
                <button onClick={async () => {
                    try {
                      const res = await adminGetItem(item.id);
                      setDrawer(res.data.item || item);
                    } catch {
                      setDrawer(item);
                    }
                  }} className="btn btn-s btn-sm" style={{ padding:"5px 8px" }} title="Edit">
                  <Ic.Edit />
                </button>
                <button onClick={() => setConfirm(item.id)} className="btn btn-g btn-sm" style={{ padding:"5px 8px", color:"var(--err)" }} title="Delete">
                  <Ic.Trash />
                </button>
              </div>
            </div>
          ))}
          </div>{/* end minWidth wrapper */}
          </div>{/* end overflow-x scroll */}
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:"var(--s8)", left:"50%", transform:"translateX(-50%)", zIndex:500, background:"var(--t1)", color:"var(--bg)", padding:"var(--s3) var(--s5)", borderRadius:"var(--rf)", fontSize:".875rem", fontWeight:600, whiteSpace:"nowrap", boxShadow:"var(--sh-xl)", animation:"popIn .3s ease" }}>
          {toast}
        </div>
      )}

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer==="create" ? "New menu item" : `Edit: ${drawer?.name}`} width="560px">
        {!!drawer && (
          <ItemForm
            initial={drawer==="create" ? null : drawer}
            categories={categories}
            onSave={handleSave}
            onClose={() => setDrawer(null)}
            saving={saving}
          />
        )}
      </Drawer>

      <Confirm
        open={!!confirm}
        title="Delete item?"
        message="This item will be removed from the menu and all future orders. Past order records are preserved."
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   REVIEWS TAB
═══════════════════════════════════════════════════════════════════════ */
function ReviewsTab({ activeBranchId }) {
  const [reviews,     setReviews]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText,   setReplyText]   = useState("");
  const [saving,      setSaving]      = useState(false);
  const [toggling,    setToggling]    = useState({});
  const [toast,       setToast]       = useState("");
  const [filterVis,   setFilterVis]   = useState("all");
  const [filterStar,  setFilterStar]  = useState("all");

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterVis  === "visible") params.visible = "true";
      if (filterVis  === "hidden")  params.visible = "false";
      if (filterStar !== "all")     params.rating  = filterStar;
      const r = await adminGetReviews(params);
      setReviews(r.data.reviews || []);
    } catch { setReviews([]); }
    finally { setLoading(false); }
  }, [filterVis, filterStar]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async (reviewId) => {
    setSaving(true);
    try {
      await adminReplyReview(reviewId, replyText);
      showToast("Reply saved!");
      setReplyTarget(null); setReplyText(""); load();
    } catch { showToast("Failed to save reply."); }
    finally { setSaving(false); }
  };

  const handleToggleVis = async (review) => {
    setToggling(t => ({ ...t, [review.id]: true }));
    try {
      await adminToggleReviewVis(review.id);
      showToast(review.is_visible ? "Review hidden from customers" : "Review shown to customers");
      load();
    } catch { showToast("Failed."); }
    finally { setToggling(t => ({ ...t, [review.id]: false })); }
  };

  const StarRow = ({ rating, size = 12 }) => (
    <div style={{ display:"flex", gap:"2px", color:"var(--gold)" }}>
      {Array(5).fill(0).map((_,i) => (
        <svg key={i} width={size} height={size} fill={i<rating?"currentColor":"none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );

  const visible  = reviews.filter(r => r.is_visible).length;
  const hidden   = reviews.filter(r => !r.is_visible).length;
  const avg = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : "—";

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s5)", flexWrap:"wrap", gap:"var(--s4)" }}>
        <div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.25rem", fontWeight:800, letterSpacing:"-.015em" }}>Customer reviews</h2>
          <p style={{ fontSize:".875rem", color:"var(--t3)", marginTop:"3px" }}>
            {reviews.length} total · {visible} visible · {hidden} hidden · avg {avg}★
          </p>
        </div>
        <button onClick={load} style={{ padding:"7px 14px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, fontFamily:"var(--ff-b)", color:"var(--t2)" }}>↻ Refresh</button>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:"var(--s3)", marginBottom:"var(--s5)", flexWrap:"wrap" }}>
        <div style={{ display:"flex", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--rf)", padding:"3px", gap:"2px" }}>
          {[["all","All"],["visible","Visible"],["hidden","Hidden"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilterVis(v)}
              style={{ padding:"5px 12px", borderRadius:"var(--rf)", border:"none", background:filterVis===v?"var(--bgc)":"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:filterVis===v?700:400, fontFamily:"var(--ff-b)", color:filterVis===v?"var(--t1)":"var(--t3)", boxShadow:filterVis===v?"var(--sh-xs)":"none", transition:"all var(--d1) var(--ease)" }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--rf)", padding:"3px", gap:"2px" }}>
          {[["all","All ★"],["5","5★"],["4","4★"],["3","3★"],["2","2★"],["1","1★"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilterStar(v)}
              style={{ padding:"5px 10px", borderRadius:"var(--rf)", border:"none", background:filterStar===v?"var(--bgc)":"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:filterStar===v?700:400, fontFamily:"var(--ff-b)", color:filterStar===v?"var(--gold)":"var(--t3)", boxShadow:filterStar===v?"var(--sh-xs)":"none", transition:"all var(--d1) var(--ease)" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
          {[1,2,3,4].map(i => <div key={i} className="skel" style={{ height:"120px", borderRadius:"var(--r4)" }} />)}
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign:"center", padding:"var(--s12)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:"var(--s3)" }}><svg width="32" height="32" viewBox="0 0 24 24" fill="var(--gold)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
          <p style={{ fontSize:".9375rem", fontWeight:600, marginBottom:"var(--s2)" }}>No reviews found</p>
          <p style={{ fontSize:".875rem", color:"var(--t3)" }}>Try changing the filters above</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
          {reviews.map(r => (
            <div key={r.id} style={{ background:"var(--bgc)", border:`1px solid ${!r.is_visible?"rgba(226,75,74,.2)":"var(--bd)"}`, borderRadius:"var(--r4)", padding:"var(--s4) var(--s5)", opacity:r.is_visible?1:.7, transition:"all var(--d1) var(--ease)" }}>

              {/* Header row */}
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s3)", gap:"var(--s3)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", minWidth:0 }}>
                  <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"linear-gradient(135deg,var(--brand),var(--brand-d))", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--ff-d)", fontWeight:900, color:"#fff", fontSize:".875rem", flexShrink:0 }}>
                    {(r.customer_name||"?")[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:".9375rem" }}>{r.customer_name}</div>
                    <div style={{ fontSize:".75rem", color:"var(--t3)" }}>on <span style={{ color:"var(--brand)", fontWeight:600 }}>{r.item_emoji} {r.item_name}</span></div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", flexShrink:0 }}>
                  <StarRow rating={r.rating}/>
                  <span style={{ fontSize:".75rem", color:"var(--t3)" }}>{r.rating}/5</span>
                  <span style={{ padding:"2px 8px", borderRadius:"var(--rf)", fontSize:".625rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", background:r.is_visible?"rgba(29,158,117,.1)":"rgba(226,75,74,.1)", color:r.is_visible?"var(--ok)":"var(--err)", border:`1px solid ${r.is_visible?"rgba(29,158,117,.25)":"rgba(226,75,74,.25)"}` }}>
                    {r.is_visible ? "Visible" : "Hidden"}
                  </span>
                </div>
              </div>

              {/* Comment */}
              {r.comment && <p style={{ fontSize:".9375rem", color:"var(--t2)", lineHeight:1.65, marginBottom:"var(--s3)" }}>\"{r.comment}\"</p>}

              {/* Photo */}
              {r.photo_url && <img src={r.photo_url} alt="review" loading="lazy" style={{ width:"80px", height:"80px", objectFit:"cover", borderRadius:"var(--r3)", marginBottom:"var(--s3)", border:"1px solid var(--bd)" }} />}

              {/* Admin reply */}
              {r.admin_reply && replyTarget !== r.id && (
                <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderLeft:"3px solid var(--brand)", borderRadius:"var(--r3)", padding:"var(--s3)", marginBottom:"var(--s3)" }}>
                  <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--brand)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:"4px" }}>Admin reply</div>
                  <p style={{ fontSize:".875rem", color:"var(--t2)", lineHeight:1.55 }}>{r.admin_reply}</p>
                </div>
              )}

              {/* Reply form */}
              {replyTarget === r.id && (
                <div style={{ marginBottom:"var(--s3)" }}>
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="Write your reply…" rows={3}
                    style={{ width:"100%", background:"var(--bg2)", border:"1px solid var(--brand)", borderRadius:"var(--r3)", padding:"var(--s3)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", resize:"vertical", outline:"none", marginBottom:"var(--s2)", boxShadow:"0 0 0 3px var(--brand-tint)" }}
                  />
                  <div style={{ display:"flex", gap:"var(--s2)" }}>
                    <button onClick={() => handleReply(r.id)} disabled={saving||!replyText.trim()} className="btn btn-p btn-sm">{saving?"Saving…":"Post reply"}</button>
                    <button onClick={() => { setReplyTarget(null); setReplyText(""); }} className="btn btn-g btn-sm">Cancel</button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:"flex", gap:"var(--s2)", alignItems:"center", borderTop:"1px solid var(--bd)", paddingTop:"var(--s3)", marginTop:"var(--s3)" }}>
                {replyTarget !== r.id && (
                  <button onClick={() => { setReplyTarget(r.id); setReplyText(r.admin_reply||""); }}
                    style={{ padding:"5px 12px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, fontFamily:"var(--ff-b)", color:"var(--t2)", transition:"all var(--d1) var(--ease)" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.color="var(--brand)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.color="var(--t2)";}}>
                    {r.admin_reply ? "Edit reply" : "Reply"}
                  </button>
                )}
                <button onClick={() => handleToggleVis(r)} disabled={!!toggling[r.id]}
                  style={{ padding:"5px 12px", borderRadius:"var(--r2)", border:`1px solid ${r.is_visible?"rgba(226,75,74,.3)":"rgba(29,158,117,.3)"}`, background:r.is_visible?"rgba(226,75,74,.06)":"rgba(29,158,117,.06)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, fontFamily:"var(--ff-b)", color:r.is_visible?"var(--err)":"var(--ok)", transition:"all var(--d1) var(--ease)", opacity:toggling[r.id]?.5:1 }}>
                  {toggling[r.id] ? "…" : r.is_visible ? "Hide" : "Show"}
                </button>
                <span style={{ marginLeft:"auto", fontSize:".75rem", color:"var(--t4)" }}>
                  {new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:"var(--s8)", left:"50%", transform:"translateX(-50%)", zIndex:500, background:"var(--t1)", color:"var(--bg)", padding:"var(--s3) var(--s5)", borderRadius:"var(--rf)", fontSize:".875rem", fontWeight:600, boxShadow:"var(--sh-xl)", whiteSpace:"nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   SuperAdmin: must pick a branch first → branch selector shown
   BranchAdmin: branch auto-set from JWT, no selector needed
═══════════════════════════════════════════════════════════════════════ */
export default function AdminMenuPage() {
  const { user } = useAuth();
  const { loading: pageLoading } = usePageLoader(900);

  const isSuperAdmin = user?.role === "super_admin";

  // SuperAdmin selects which branch to manage
  // BranchAdmin: always use JWT branch_id — never localStorage (customer-facing)
  const [activeBranchId,   setActiveBranchId]   = useState(
    isSuperAdmin ? "" : (user?.branch_id || "")
  );
  const [activeBranchName, setActiveBranchName] = useState(
    isSuperAdmin ? "" : (user?.branch_name || "Branch")
  );
  const [allBranches,      setAllBranches]      = useState([]);
  const [branchesLoading,  setBranchesLoading]  = useState(isSuperAdmin);

  const [tab,         setTab]        = useState("items");
  const [categories,  setCategories] = useState([]);
  const [items,       setItems]      = useState([]);
  const [loadingData, setLoadingData] = useState(!isSuperAdmin); // don't load until branch chosen

  // Load branches for SuperAdmin
  useEffect(() => {
    if (!isSuperAdmin) return;
    getBranches()
      .then(res => {
        const branches = res.data?.branches || [];
        setAllBranches(branches);
        // Auto-select first branch
        if (branches.length > 0) {
          setActiveBranchId(branches[0].id);
          setActiveBranchName(branches[0].name);
        }
      })
      .catch(() => {})
      .finally(() => setBranchesLoading(false));
  }, [isSuperAdmin]);

  // Load menu data whenever activeBranchId changes
  const loadAll = useCallback(async (silent = false) => {
    if (!activeBranchId) return;
    if (!silent) setLoadingData(true);
    try {
      const [cR, iR] = await Promise.all([
        adminGetCategories(isSuperAdmin ? activeBranchId : null)
          .catch(() => ({ data:{ categories:[] } })),
        adminGetItems({ available:"" }, isSuperAdmin ? activeBranchId : null)
          .catch(() => ({ data:{ items:[] } })),
      ]);
      setCategories(cR.data.categories || []);
      setItems(iR.data.items || []);
    } finally { setLoadingData(false); }
  }, [activeBranchId, isSuperAdmin]);

  useEffect(() => {
    if (activeBranchId) loadAll();
  }, [activeBranchId, loadAll]);

  // When SuperAdmin switches branch
  const handleBranchChange = (branchId) => {
    const branch = allBranches.find(b => b.id === branchId);
    setActiveBranchId(branchId);
    setActiveBranchName(branch?.name || "");
    setCategories([]);
    setItems([]);
  };

  if (pageLoading || branchesLoading) return <KNCLoader visible label="Loading menu manager…" />;

  const TABS = [
    { key:"items",      label:`Items (${items.length})` },
    { key:"categories", label:`Categories (${categories.length})` },
    { key:"reviews",    label:"Reviews" },
  ];

  // SuperAdmin with no branches
  if (isSuperAdmin && allBranches.length === 0) {
    return (
      <AppLayout adminSidebar>
        <div style={{ textAlign:"center", padding:"var(--s16) var(--s4)" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:"var(--s4)" }}><svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:700, marginBottom:"var(--s2)" }}>
            No branches found
          </h2>
          <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:"var(--s5)" }}>
            Create a branch from the Super Admin dashboard first.
          </p>
          <a href="/superadmin/dashboard" className="btn btn-p btn-lg">Go to dashboard →</a>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout adminSidebar>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"var(--s5)", flexWrap:"wrap", gap:"var(--s3)" }}>
        <div>
          <div style={{ fontSize:".75rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s1)" }}>
            {activeBranchName || "Select a branch"} · Menu Manager
          </div>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.5rem,3vw,2.25rem)", fontWeight:800, letterSpacing:"-.025em" }}>
            Menu
          </h1>
        </div>

        <div style={{ display:"flex", gap:"var(--s3)", alignItems:"center", flexShrink:0, flexWrap:"wrap" }}>
          {/* ── SuperAdmin branch selector ──────────────────────────── */}
          {isSuperAdmin && (
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", padding:"var(--s2) var(--s4)", background:"linear-gradient(135deg,var(--brand-tint),rgba(232,82,26,.05))", border:"1px solid var(--bdb)", borderRadius:"var(--r3)" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span style={{ fontSize:".75rem", fontWeight:700, color:"var(--brand)", letterSpacing:".04em", textTransform:"uppercase" }}>Branch:</span>
              <select
                value={activeBranchId}
                onChange={e => handleBranchChange(e.target.value)}
                style={{ border:"none", background:"transparent", color:"var(--t1)", fontSize:".9375rem", fontWeight:700, outline:"none", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
                {allBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quick stats */}
          {activeBranchId && (
            <>
              <div style={{ textAlign:"center", padding:"var(--s3) var(--s4)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:900, color:"var(--ok)" }}>
                  {items.filter(i=>i.is_available).length}
                </div>
                <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:600, textTransform:"uppercase", letterSpacing:".04em" }}>Available</div>
              </div>
              <div style={{ textAlign:"center", padding:"var(--s3) var(--s4)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:900, color:"var(--err)" }}>
                  {items.filter(i=>!i.is_available).length}
                </div>
                <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:600, textTransform:"uppercase", letterSpacing:".04em" }}>Off</div>
              </div>
              <div style={{ textAlign:"center", padding:"var(--s3) var(--s4)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.5rem", fontWeight:900, color:"var(--gold-d)" }}>
                  {items.filter(i=>i.is_featured).length}
                </div>
                <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:600, textTransform:"uppercase", letterSpacing:".04em" }}>Featured</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SuperAdmin info banner */}
      {isSuperAdmin && activeBranchId && (
        <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)", padding:"var(--s3) var(--s4)", background:"var(--info-t)", border:"1px solid rgba(55,138,221,.2)", borderRadius:"var(--r3)", marginBottom:"var(--s5)", fontSize:".875rem" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--info)" strokeWidth="2">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
          </svg>
          <span style={{ color:"var(--info)" }}>
            You are managing <strong>{activeBranchName}</strong> as Super Admin.
            Switch branches using the selector above.
          </span>
        </div>
      )}

      {/* No branch selected yet (SuperAdmin edge case) */}
      {!activeBranchId ? (
        <div style={{ textAlign:"center", padding:"var(--s12) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px dashed var(--bd)" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:"var(--s3)" }}><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          <p style={{ fontSize:".9375rem", fontWeight:600, marginBottom:"var(--s2)" }}>Select a branch to manage</p>
          <p style={{ fontSize:".875rem", color:"var(--t3)" }}>Use the branch selector in the top-right corner</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom:"var(--s6)" }}>
            {TABS.map(t => (
              <button key={t.key} className={`tab-item${tab===t.key?" active":""}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content — pass activeBranchId and isSuperAdmin into children */}
          {tab === "items" && (
            <ItemsTab
              items={items}
              categories={categories}
              loading={loadingData}
              onRefresh={loadAll}
              activeBranchId={isSuperAdmin ? activeBranchId : null}
            />
          )}
          {tab === "categories" && (
            <CategoriesTab
              categories={categories}
              loading={loadingData}
              onRefresh={loadAll}
              activeBranchId={isSuperAdmin ? activeBranchId : null}
            />
          )}
          {tab === "reviews" && (
            <ReviewsTab activeBranchId={isSuperAdmin ? activeBranchId : null} />
          )}
        </>
      )}

      <style>{`@keyframes popIn{from{opacity:0;transform:scale(.88) translateX(-50%) translateY(8px)}to{opacity:1;transform:scale(1) translateX(-50%) translateY(0)}}`}</style>
    </AppLayout>
  );
}
