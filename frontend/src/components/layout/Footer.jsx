/**
 * Footer.jsx — two-in-one footer
 * Desktop (≥1024px): rich 4-col footer (.desk-footer)
 * Mobile  (<1024px): fixed bottom tab bar (.mob-tabbar)
 */

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth }  from "../../context/AuthContext";
import useCartStore from "../../store/cartStore";

/* ── Brand colors — hard-coded so SVG strokes never depend on CSS vars ── */
const BRAND = "#E8521A";
const MUTED = "#8C8A86";

/* ── Social media links ──────────────────────────────────────────────────── */
const SOCIAL = [
  {
    label:"Instagram", href:"https://www.instagram.com/kanchinewfriedchicken", hover:"#E1306C",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>,
  },
  {
    label:"Facebook", href:"https://facebook.com/knfcfriedchicken", hover:"#1877F2",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>,
  },
  {
    label:"WhatsApp", href:"https://wa.me/919999999999", hover:"#25D366",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>,
  },
];

/* ── Icon set — each takes (color) string, returns SVG ──────────────────── */
const T = {
  Home:  c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Browse:c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  Cart:  c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  Clock: c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>,
  User:  c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Queue: c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7M7 16h5"/></svg>,
  Box:   c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Plus:  c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  Grid:  c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Tag:   c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3"/></svg>,
  Ppl:   c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  Logo:  () => <img src="/KNFC-logo.svg" alt="KNFC" width="36" height="36" style={{ objectFit:"contain", borderRadius:"8px" }} />,
  WA:    c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  Cast:  c => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 .01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>,
};

/* ── Tab definitions per role ────────────────────────────────────────────── */
const TABS = {
  customer: [
    { key:"home",    path:"/menu",         label:"Home",    Icon:T.Home              },
    { key:"browse",  path:"/menu/all",     label:"Browse",  Icon:T.Grid              },
    { key:"cart",    path:"/cart",         label:"Order",   Icon:T.Cart, badge:true  },
    { key:"offers",  path:"/offers",       label:"Offer",   Icon:T.Tag               },
    { key:"acct",    path:"/account",      label:"Account", Icon:T.User              },
  ],
  staff: [
    { key:"queue",  path:"/staff/queue",     label:"Queue",     Icon:T.Queue },
    { key:"stock",  path:"/staff/stock",     label:"Stock",     Icon:T.Box   },
    { key:"new",    path:"/staff/new-order", label:"New Order", Icon:T.Plus  },
  ],
  branch_admin: [
    { key:"dash",  path:"/admin/dashboard", label:"Dashboard", Icon:T.Grid },
    { key:"staff", path:"/admin/staff",     label:"Staff",     Icon:T.Ppl  },
    { key:"stock", path:"/admin/stock",     label:"Stock",     Icon:T.Box  },
    { key:"offer", path:"/admin/offers",    label:"Offers",    Icon:T.Tag  },
  ],
  super_admin: [
    { key:"dash",  path:"/superadmin/dashboard", label:"Dashboard", Icon:T.Grid },
    { key:"staff", path:"/superadmin/staff",     label:"Staff",     Icon:T.Ppl  },
    { key:"wa",    path:"/superadmin/whatsapp",  label:"WhatsApp",  Icon:T.WA   },
    { key:"cast",  path:"/superadmin/broadcast", label:"Broadcast", Icon:T.Cast },
  ],
};

const FOOTER_LINKS = {
  Company: [["About","/about"],["Careers","/careers"],["Blog","/blog"],["Press","/press"]],
  Help:    [["FAQ","/faq"],["Contact","/contact"],["Track order","/order/track"]],
  Legal:   [["Privacy","/privacy"],["Terms","/terms"],["Cookie policy","/cookies"]],
};

export default function Footer() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const cartCount = useCartStore(s => s.items.reduce((a, i) => a + i.quantity, 0));

  const role = user?.role || "customer";
  const tabs = TABS[role] || TABS.customer;
  const active = p =>
    location.pathname === p ||
    (p !== "/menu" && p !== "/" && location.pathname.startsWith(p));

  // Desktop rich footer only for customers (staff/admin have their own layout)
  const isCustomerRole = !role || role === "customer";

  return (
    <>
      {/* ── Desktop rich footer — customers only ─────────────────────── */}
      <footer className={`desk-footer${isCustomerRole ? "" : " desk-footer--hidden"}`}>
        <div className="desk-footer-inner">
          {/* ── Col 1: Brand + social icons ──────────────────────────── */}
          <div>
            <Link to="/menu" style={{ display:"flex", alignItems:"center", gap:"var(--s2)", width:"fit-content", marginBottom:"var(--s4)" }}>
              <T.Logo />
              <div>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, letterSpacing:"-.02em" }}>KNFC</div>
                <div style={{ fontSize:".5625rem", fontWeight:600, color:"var(--t3)", letterSpacing:".08em", textTransform:"uppercase" }}>Fried Chicken</div>
              </div>
            </Link>
            <p style={{ fontSize:".875rem", color:"var(--t3)", lineHeight:1.75, maxWidth:"240px", marginBottom:"var(--s5)" }}>
              Fresh, crispy fried chicken made with love. Order in-store, track your token, enjoy every bite.
            </p>

            {/* Social media icons */}
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {SOCIAL.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  title={s.label}
                  style={{ width:"36px", height:"36px", borderRadius:"8px", background:"var(--bg3)", border:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--t3)", transition:"all .15s", textDecoration:"none" }}
                  onMouseEnter={e => { e.currentTarget.style.color=s.hover; e.currentTarget.style.borderColor=s.hover; e.currentTarget.style.background="var(--bg)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color="var(--t3)"; e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.background="var(--bg3)"; e.currentTarget.style.transform="none"; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:".8125rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s4)" }}>
                {title}
              </div>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                {links.map(([label, path]) => (
                  <li key={label}>
                    <Link to={path} style={{ fontSize:".875rem", color:"var(--t2)", transition:"color var(--d1) var(--ease)" }}
                      onMouseEnter={e => e.target.style.color="var(--brand)"}
                      onMouseLeave={e => e.target.style.color="var(--t2)"}
                    >{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* ── Col 5: Find Us / Google Maps ─────────────────────────── */}
          <div>
            <div style={{ fontFamily:"var(--ff-d)", fontSize:".8125rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"var(--s4)" }}>
              Find Us
            </div>

            {/* Google Maps embed */}
            <div style={{ borderRadius:"10px", overflow:"hidden", border:"1px solid var(--bd)", marginBottom:"var(--s3)" }}>
              <iframe
                title="KNFC Location"
                src="https://www.google.com/maps?q=KNFC+Fried+Chicken&output=embed"
                width="100%"
                height="160"
                style={{ border:0, display:"block" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <a
              href="https://www.google.com/maps/search/KNFC+Fried+Chicken"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:"6px", fontSize:".8125rem", color:"var(--brand)", fontWeight:600, textDecoration:"none", transition:"opacity .15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity=".75"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Open in Google Maps
            </a>
          </div>
        </div>

        <div className="desk-footer-bottom">
          <span style={{ fontSize:".8125rem", color:"var(--t4)" }}>
            © {new Date().getFullYear()} KNFC. All rights reserved.
          </span>
          <div style={{ display:"flex", gap:"var(--s5)" }}>
            {["Privacy","Terms","Cookies"].map(l => (
              <a key={l} href="#" style={{ fontSize:".8125rem", color:"var(--t4)", transition:"color var(--d1) var(--ease)" }}
                onMouseEnter={e => e.target.style.color="var(--t1)"}
                onMouseLeave={e => e.target.style.color="var(--t4)"}
              >{l}</a>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Mobile bottom tab bar — hidden for super_admin (they use sidebar) ── */}
      {role === "super_admin" ? null : <nav className="mob-tabbar">
        {tabs.map(tab => {
          const on  = active(tab.path);
          const clr = on ? BRAND : MUTED;
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="mob-tab"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Active top pill */}
              {on && (
                <div style={{
                  position:"absolute", top:0, left:"50%",
                  transform:"translateX(-50%)",
                  width:"28px", height:"3px",
                  background: BRAND,
                  borderRadius:"0 0 4px 4px",
                }} />
              )}

              {/* Icon — stroke color passed directly, no currentColor */}
              <div style={{ position:"relative" }}>
                {tab.Icon(clr)}
                {tab.badge && cartCount > 0 && (
                  <div style={{
                    position:"absolute", top:"-5px", right:"-8px",
                    background: BRAND, color:"#fff",
                    fontSize:"10px", fontWeight:800,
                    width:"16px", height:"16px", borderRadius:"50%",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    border:"2px solid var(--bgc, #fff)",
                    lineHeight:1,
                  }}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </div>
                )}
              </div>

              {/* Label — color via hard hex */}
              <span style={{
                fontSize:"10px",
                fontWeight: on ? 700 : 500,
                letterSpacing:"0.01em",
                color: clr,
                lineHeight:1,
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>}
    </>
  );
}
