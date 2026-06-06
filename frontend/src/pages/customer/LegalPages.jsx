import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { reopenCookieBanner } from "../../components/common/CookieBanner";
import AppLayout from "../../components/layout/AppLayout";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import usePageProtection from "../../hooks/usePageProtection";
import useSEO from "../../hooks/useSEO";

const CONTACT_EMAIL_DEFAULT = "CustomerSupportKNFC@gmail.com";

/* ── Fetch site config once (cached in module) ───────────────────────── */
let _cfgCache = null;
function useSiteConfig() {
  const [cfg, setCfg] = useState(_cfgCache);
  useEffect(() => {
    if (_cfgCache) return;
    axiosClient.get("/branches/config/")
      .then(r => { _cfgCache = r.data.config; setCfg(r.data.config); })
      .catch(() => {});
  }, []);
  return cfg || {};
}

/* ── Shared shell ────────────────────────────────────────────────────── */
function LegalShell({ title, subtitle, children }) {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div style={{ maxWidth:"780px", margin:"0 auto", paddingBottom:"var(--s12)" }}>
        <button onClick={() => navigate(-1)}
          style={{ display:"flex", alignItems:"center", gap:"6px", background:"none", border:"none", color:"var(--t2)", fontSize:".875rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--ff-b)", marginBottom:"var(--s5)", padding:0 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round"/></svg>
          Back
        </button>

        <div style={{ marginBottom:"var(--s8)" }}>
          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.75rem,5vw,2.75rem)", fontWeight:900, letterSpacing:"-.03em", marginBottom:"var(--s2)" }}>{title}</h1>
          {subtitle && <p style={{ fontSize:".9375rem", color:"var(--t2)" }}>{subtitle}</p>}
          <div style={{ height:"3px", width:"48px", background:"var(--brand)", borderRadius:"var(--rf)", marginTop:"var(--s4)" }}/>
        </div>

        <div style={{ fontSize:".9375rem", lineHeight:1.85, color:"var(--t1)" }}>
          {children}
        </div>
      </div>
    </AppLayout>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom:"var(--s7)" }}>
      <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.125rem", fontWeight:800, color:"var(--brand)", marginBottom:"var(--s3)", letterSpacing:"-.015em" }}>{title}</h2>
      {children}
    </section>
  );
}

function P({ children, style }) {
  return <p style={{ marginBottom:"var(--s3)", ...style }}>{children}</p>;
}

function UL({ items }) {
  return (
    <ul style={{ paddingLeft:"var(--s5)", marginBottom:"var(--s3)", display:"flex", flexDirection:"column", gap:"var(--s1)" }}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

const UPDATED = "1 January 2025";

/* ══════════════════════════════════════════════════════════════════════
   PRIVACY POLICY
══════════════════════════════════════════════════════════════════════ */
export function PrivacyPage() {
  usePageProtection({ blockCopy: true, blockContextMenu: true, blockPrint: false });
  return (
    <LegalShell title="Privacy Policy" subtitle={`Last updated: ${UPDATED}`}>
      <Section title="1. Information We Collect">
        <P>When you use KNFC services, we collect information you provide directly:</P>
        <UL items={[
          "Name and phone number when registering",
          "Order history and preferences",
          "Branch location you select",
          "Reviews and ratings you submit",
        ]}/>
        <P>We also collect information automatically, such as your device type and usage patterns to improve our service.</P>
      </Section>

      <Section title="2. How We Use Your Information">
        <P>We use the information we collect to:</P>
        <UL items={[
          "Process and fulfil your food orders",
          "Send order status updates and notifications",
          "Manage your loyalty points and rewards",
          "Improve our menu and services based on feedback",
          "Prevent fraud and ensure platform security",
        ]}/>
      </Section>

      <Section title="3. Sharing Your Information">
        <P>We do not sell, trade, or rent your personal information to third parties. We may share your information only with:</P>
        <UL items={[
          "Branch staff to fulfil your order",
          "Payment processors to complete transactions",
          "Service providers who help operate our platform",
        ]}/>
      </Section>

      <Section title="4. Data Retention">
        <P>We retain your account information as long as your account is active. Order history is kept for 2 years for warranty and legal purposes. You may request deletion of your account and data at any time by contacting us.</P>
      </Section>

      <Section title="5. Security">
        <P>We implement industry-standard security measures including encryption in transit (HTTPS), secure password hashing, and access controls. No method of transmission over the Internet is 100% secure, however we strive to protect your data.</P>
      </Section>

      <Section title="6. Contact Us">
        <P>For any privacy-related queries, please speak to staff at your nearest KNFC branch or contact us through the app.</P>
      </Section>
    </LegalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COOKIE POLICY
══════════════════════════════════════════════════════════════════════ */
export function CookiePage() {
  return (
    <LegalShell title="Cookie Policy" subtitle={`Last updated: ${UPDATED}`}>
      <Section title="What Are Cookies?">
        <P>Cookies are small text files stored on your device when you visit our web app. They help us remember your preferences and improve your experience.</P>
      </Section>

      <Section title="Cookies We Use">
        <P><strong>Essential Cookies</strong> — Required for the app to function. These include your session token (login state) and selected branch. You cannot opt out of these.</P>
        <P><strong>Preference Cookies</strong> — Remember your settings such as dark mode, cart contents, and your last selected branch so you don't have to re-enter them.</P>
        <P><strong>Analytics Cookies</strong> — Help us understand how you use the app so we can improve it. These are anonymous and do not identify you personally.</P>
      </Section>

      <Section title="Local Storage">
        <P>In addition to cookies, we use browser local storage to save your active order details, branch selection, and cart contents. This data stays on your device and is not sent to any third party.</P>
      </Section>

      <Section title="Managing Cookies">
        <P>You can update your cookie preferences at any time using the button below, or through your browser settings. Disabling cookies may affect some features of the app, such as staying logged in or remembering your branch.</P>
        <button
          onClick={reopenCookieBanner}
          style={{ marginTop:"var(--s3)", display:"inline-flex", alignItems:"center", gap:"8px", padding:"10px 20px", background:"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--r3)", fontWeight:700, fontSize:".9375rem", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Manage cookie preferences
        </button>
      </Section>

      <Section title="Changes to This Policy">
        <P>We may update this Cookie Policy from time to time. Continued use of the app after changes means you accept the updated policy.</P>
      </Section>
    </LegalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TERMS & CONDITIONS
══════════════════════════════════════════════════════════════════════ */
export function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions" subtitle={`Last updated: ${UPDATED}`}>
      <Section title="1. Acceptance of Terms">
        <P>By accessing or using the KNFC ordering platform, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the service.</P>
      </Section>

      <Section title="2. Ordering & Payment">
        <UL items={[
          "All prices are in Indian Rupees (₹) and include applicable taxes.",
          "Orders are confirmed only after payment is received and verified by staff.",
          "UPI payments must be confirmed by showing your transaction screenshot to staff.",
          "Cash payments must be made at the counter before collecting your order.",
          "We reserve the right to cancel any order at our discretion.",
        ]}/>
      </Section>

      <Section title="3. No Refund Policy">
        <P style={{ fontWeight:700, color:"var(--err)" }}>All sales are final. We do not offer refunds once an order has been placed and accepted by our kitchen.</P>
        <P>If there is an issue with your order (wrong item, quality concern), please speak to our staff immediately at the branch. We will do our best to resolve it promptly.</P>
      </Section>

      <Section title="4. Loyalty Points">
        <P>Loyalty points are earned on eligible orders and can be redeemed for discounts, subject to availability. Points have no cash value and cannot be transferred. KNFC reserves the right to modify, suspend, or terminate the loyalty programme at any time.</P>
      </Section>

      <Section title="5. User Responsibilities">
        <UL items={[
          "You must provide accurate information when registering.",
          "You are responsible for maintaining the security of your account.",
          "You must not misuse offers, coupons, or loyalty rewards.",
          "You must not submit false or misleading reviews.",
        ]}/>
      </Section>

      <Section title="6. Limitation of Liability">
        <P>KNFC is not liable for any indirect or consequential loss arising from use of this platform. Our total liability is limited to the value of your most recent order.</P>
      </Section>

      <Section title="7. Governing Law">
        <P>These terms are governed by the laws of India. Any disputes shall be resolved in the courts of the jurisdiction where the branch is located.</P>
      </Section>
    </LegalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ABOUT US — helpers
══════════════════════════════════════════════════════════════════════ */

const ABOUT_REVIEWS = [
  { name:"Arjun K.",    rating:5, text:"Best fried chicken in town! The crunch is unreal — never soggy.",               loc:"Main Branch" },
  { name:"Priya S.",    rating:5, text:"Ordered for the whole family and everyone loved it. The spicy pieces are amazing!", loc:"City Centre" },
  { name:"Mohammed R.", rating:5, text:"Consistently great every single time. My go-to for a quick, hot meal.",           loc:"Main Branch" },
  { name:"Sneha T.",    rating:5, text:"The loyalty rewards system is brilliant — already redeemed my points twice!",     loc:"Airport Road" },
  { name:"Rahul V.",    rating:5, text:"Fresh, hot, and fast. Exactly what you want from a fried chicken place.",         loc:"City Centre" },
  { name:"Deepa M.",    rating:5, text:"Perfectly seasoned crispy coating every single time. Will definitely be back!",   loc:"Main Branch" },
  { name:"Kiran B.",    rating:4, text:"Solid portions, great flavour, and the app makes ordering super convenient.",     loc:"Airport Road" },
  { name:"Fatima A.",   rating:5, text:"The chicken strips are absolutely incredible. My kids love it here.",             loc:"City Centre" },
  { name:"Suresh P.",   rating:5, text:"Hot, crispy, and consistently delicious. Every single visit. Worth every rupee.", loc:"Main Branch" },
  { name:"Ananya R.",   rating:5, text:"Huge portions and amazing flavour. The digital ordering system is seamless.",     loc:"City Centre" },
];

function AboutStars({ rating }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24"
          fill={i <= rating ? "#F59E0B" : "none"}
          stroke={i <= rating ? "#F59E0B" : "var(--bd2)"}
          strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  );
}

function AboutReviewCard({ review }) {
  return (
    <div style={{
      width:"300px", flexShrink:0,
      background:"var(--bgc)", border:"1px solid var(--bd)",
      borderRadius:"var(--r4)", padding:"var(--s5)",
    }}>
      <AboutStars rating={review.rating}/>
      <p style={{ fontSize:".875rem", color:"var(--t1)", lineHeight:1.65, margin:"var(--s3) 0", fontStyle:"italic" }}>
        "{review.text}"
      </p>
      <div style={{ fontSize:".8125rem", fontWeight:700, color:"var(--t1)" }}>{review.name}</div>
      <div style={{ fontSize:".75rem", color:"var(--t2)", marginTop:2 }}>{review.loc}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ABOUT US
══════════════════════════════════════════════════════════════════════ */
export function AboutPage() {
  useSEO({ title: "About Us", description: "KNFC Fried Chicken — our story, values and mission. Serving India's crispiest chicken since day one." });
  const navigate = useNavigate();
  const cfg      = useSiteConfig();
  const [marqHover,  setMarqHover]  = useState(false);
  const [marqPaused, setMarqPaused] = useState(false);
  const isPaused = marqHover || marqPaused;
  const doubled  = [...ABOUT_REVIEWS, ...ABOUT_REVIEWS];
  const headline = cfg.about_headline || "About KNFC Fried Chicken";
  const tagline  = cfg.about_tagline  || "Fried Chicken Done Right";
  const bodyText = cfg.about_content  || "";
  const stats    = (Array.isArray(cfg.about_stats) && cfg.about_stats.length > 0)
    ? cfg.about_stats
    : [{ value:"3+", label:"Branches" }, { value:"10K+", label:"Happy Customers" }, { value:"50K+", label:"Orders Served" }, { value:"5+", label:"Years Running" }];

  return (
    <AppLayout>
      <style>{`
        @keyframes knfc-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .about-stats { display:grid; grid-template-columns:repeat(2,1fr); }
        @media(min-width:640px) { .about-stats { grid-template-columns:repeat(4,1fr); } }
        .about-story { display:grid; grid-template-columns:1fr; gap:var(--s8); align-items:center; }
        @media(min-width:768px) { .about-story { grid-template-columns:1fr 1fr; gap:var(--s10); } }
      `}</style>

      {/* ── Back nav ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"var(--s5) var(--s4) 0" }}>
        <button onClick={() => navigate(-1)}
          style={{ display:"flex", alignItems:"center", gap:"6px", background:"none", border:"none", color:"var(--t2)", fontSize:".875rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--ff-b)", padding:0 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round"/>
          </svg>
          Back
        </button>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div style={{ background:"linear-gradient(145deg,#C43F0A,#E8521A,#F06B2A)", padding:"var(--s16) var(--s4) var(--s12)", textAlign:"center", position:"relative", overflow:"hidden", marginTop:"var(--s5)" }}>
        <div style={{ position:"absolute", width:320, height:320, borderRadius:"50%", background:"rgba(255,255,255,.05)", top:-100, right:-80, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%", background:"rgba(0,0,0,.07)", bottom:-70, left:-50, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(45deg,rgba(255,255,255,.025) 0px,rgba(255,255,255,.025) 1px,transparent 1px,transparent 30px)", pointerEvents:"none" }}/>

        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:"rgba(255,255,255,.18)", backdropFilter:"blur(8px)", border:"2px solid rgba(255,255,255,.28)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:"var(--s5)" }}>
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="17" stroke="#fff" strokeWidth="2.5"/>
              <circle cx="14" cy="16.5" r="2.2" fill="#fff"/>
              <circle cx="26" cy="16.5" r="2.2" fill="#fff"/>
              <path d="M13 24.5 Q20 30.5 27 24.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>

          <h1 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(3.5rem,12vw,6rem)", fontWeight:900, color:"#fff", letterSpacing:"6px", lineHeight:1, marginBottom:"var(--s3)" }}>
            KNFC
          </h1>
          <p style={{ fontSize:"clamp(1rem,3vw,1.25rem)", color:"rgba(255,255,255,.85)", fontWeight:600, marginBottom:"var(--s8)", letterSpacing:".02em" }}>
            {tagline}
          </p>

          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.14)", borderRadius:999, padding:"9px 22px", fontSize:".8125rem", color:"rgba(255,255,255,.9)", fontWeight:700, backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.22)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            Est. 2020 · Multi-Branch · Always Fresh
          </div>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div style={{ background:"var(--bgc)", borderBottom:"1px solid var(--bd2)" }}>
        <div className="about-stats" style={{ maxWidth:"1100px", margin:"0 auto" }}>
          {stats.map((s, idx) => (
            <div key={s.label || idx} style={{ padding:"var(--s6) var(--s4)", textAlign:"center", borderRight: idx < stats.length - 1 ? "1px solid var(--bd)" : "none" }}>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.5rem,4vw,2.25rem)", fontWeight:900, color:"var(--brand)", lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:".8125rem", color:"var(--t2)", marginTop:4, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Our Story ────────────────────────────────────────────────── */}
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"var(--s12) var(--s4)" }}>
        <div className="about-story">
          <div>
            <div style={{ height:"3px", width:"40px", background:"var(--brand)", borderRadius:"var(--rf)", marginBottom:"var(--s4)" }}/>
            <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.5rem,4vw,2rem)", fontWeight:900, letterSpacing:"-.03em", marginBottom:"var(--s5)", color:"var(--t1)" }}>
              Our Story
            </h2>
            <p style={{ fontSize:".9375rem", lineHeight:1.85, color:"var(--t2)", marginBottom:"var(--s4)" }}>
              KNFC started with a simple belief: great fried chicken doesn't need to be complicated. Using a carefully crafted spice blend and a time-tested frying technique, we set out to create the crunchiest, juiciest chicken possible.
            </p>
            <p style={{ fontSize:".9375rem", lineHeight:1.85, color:"var(--t2)", marginBottom:"var(--s4)" }}>
              What began as a single outlet quickly grew as word spread through neighbourhoods. Today, KNFC serves thousands of loyal customers across multiple branches — but our commitment remains the same: fresh ingredients, consistent quality, and flavour that keeps you coming back.
            </p>
            <p style={{ fontSize:".9375rem", lineHeight:1.85, color:"var(--t2)" }}>
              Every piece is made fresh to order. No shortcuts. No compromises. Just exceptional fried chicken, done right.
            </p>
          </div>

          {/* Decorative illustration panel */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:"100%", maxWidth:"380px", aspectRatio:"1/1", borderRadius:"var(--r5)", background:"linear-gradient(135deg,rgba(232,82,26,.08),var(--bg2))", border:"1px solid var(--bd2)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,var(--bd) 1px,transparent 1px)", backgroundSize:"24px 24px" }}/>
              <svg width="170" height="170" viewBox="0 0 170 170" fill="none" style={{ position:"relative", zIndex:1 }}>
                {/* Shadow plate */}
                <ellipse cx="85" cy="128" rx="62" ry="14" fill="var(--bd)" opacity=".5"/>
                {/* Chicken piece — back */}
                <ellipse cx="105" cy="105" rx="28" ry="20" fill="#C43F0A" opacity=".85"/>
                <ellipse cx="105" cy="103" rx="22" ry="14" fill="#D94D10"/>
                <ellipse cx="105" cy="101" rx="14" ry="9" fill="#E86030" opacity=".6"/>
                {/* Chicken piece — front */}
                <ellipse cx="70" cy="98" rx="32" ry="22" fill="#E8521A" opacity=".9"/>
                <ellipse cx="70" cy="96" rx="24" ry="16" fill="#F06B2A"/>
                <ellipse cx="70" cy="94" rx="16" ry="10" fill="#F5894A" opacity=".65"/>
                {/* Bone handle */}
                <rect x="56" y="94" width="6" height="28" rx="3" fill="#F0E0C0" opacity=".8"/>
                {/* Crispy dots */}
                <circle cx="62" cy="90" r="2" fill="#fff" opacity=".18"/>
                <circle cx="75" cy="98" r="1.5" fill="#fff" opacity=".18"/>
                <circle cx="66" cy="102" r="2" fill="#fff" opacity=".13"/>
                <circle cx="100" cy="97" r="2" fill="#fff" opacity=".18"/>
                <circle cx="112" cy="105" r="1.5" fill="#fff" opacity=".18"/>
                {/* Steam */}
                <path d="M68 72 Q71 62 68 55" stroke="var(--t2)" strokeWidth="1.5" strokeLinecap="round" opacity=".35"/>
                <path d="M80 67 Q83 57 80 50" stroke="var(--t2)" strokeWidth="1.5" strokeLinecap="round" opacity=".35"/>
                <path d="M104 78 Q107 68 104 61" stroke="var(--t2)" strokeWidth="1.5" strokeLinecap="round" opacity=".35"/>
              </svg>
              {/* KNFC badge */}
              <div style={{ position:"absolute", top:"var(--s4)", right:"var(--s4)", background:"var(--brand)", borderRadius:"var(--rf)", padding:"4px 12px", fontSize:".75rem", fontFamily:"var(--ff-d)", fontWeight:900, color:"#fff", letterSpacing:"2px" }}>
                KNFC
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── What Makes Us Different ──────────────────────────────────── */}
      <div style={{ background:"var(--bg2)", padding:"var(--s12) var(--s4)", borderTop:"1px solid var(--bd)", borderBottom:"1px solid var(--bd)" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"var(--s8)" }}>
            <div style={{ height:"3px", width:"40px", background:"var(--brand)", borderRadius:"var(--rf)", margin:"0 auto var(--s4)" }}/>
            <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.5rem,4vw,2rem)", fontWeight:900, letterSpacing:"-.03em", color:"var(--t1)", margin:0 }}>
              What Makes Us Different
            </h2>
            <p style={{ fontSize:".9375rem", color:"var(--t2)", marginTop:"var(--s3)", maxWidth:"480px", margin:"var(--s3) auto 0" }}>
              Not just chicken — a commitment to quality in every single bite.
            </p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:"var(--s4)" }}>
            {[
              {
                title:"Always Fresh",
                desc:"Chicken is never frozen. We prep fresh every single morning so every piece is at its best.",
                icon:<svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
              },
              {
                title:"Signature Crunch",
                desc:"Our proprietary batter recipe — developed and refined over years — gives you that perfect crunch every time.",
                icon:<svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
              },
              {
                title:"Made to Order",
                desc:"Your meal is cooked the moment you order it — not sitting under a heat lamp. Fresh out of the fryer.",
                icon:<svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
              },
              {
                title:"Consistent Quality",
                desc:"Same great taste, same generous portions at every branch. No off days, no shortcuts — guaranteed.",
                icon:<svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>,
              },
            ].map(v => (
              <div key={v.title}
                style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s5)", transition:"border-color .2s,box-shadow .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(232,82,26,.4)"; e.currentTarget.style.boxShadow="0 4px 20px rgba(232,82,26,.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.boxShadow="none"; }}>
                <div style={{ width:48, height:48, borderRadius:"var(--r3)", background:"rgba(232,82,26,.1)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"var(--s4)" }}>
                  {v.icon}
                </div>
                <div style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:800, color:"var(--t1)", marginBottom:"var(--s2)" }}>{v.title}</div>
                <div style={{ fontSize:".875rem", color:"var(--t2)", lineHeight:1.65 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Customer Reviews Marquee ──────────────────────────────────── */}
      <div style={{ padding:"var(--s12) 0" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto var(--s6)", padding:"0 var(--s4)", display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:"var(--s3)" }}>
          <div>
            <div style={{ height:"3px", width:"40px", background:"var(--brand)", borderRadius:"var(--rf)", marginBottom:"var(--s4)" }}/>
            <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.5rem,4vw,2rem)", fontWeight:900, letterSpacing:"-.03em", color:"var(--t1)", margin:0 }}>
              What Our Customers Say
            </h2>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:".8125rem", color:"var(--t2)", fontWeight:600, paddingBottom:4 }}>
            {marqPaused
              ? <>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2.5">
                    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                  </svg>
                  Paused — click to resume
                </>
              : <>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                  Hover or click to pause
                </>
            }
          </div>
        </div>

        <div
          style={{ overflow:"hidden", cursor:"pointer", userSelect:"none" }}
          onMouseEnter={() => setMarqHover(true)}
          onMouseLeave={() => setMarqHover(false)}
          onClick={() => setMarqPaused(p => !p)}
          title={marqPaused ? "Click to resume" : "Click to pause"}
        >
          <div style={{
            display:"flex",
            gap:"var(--s4)",
            padding:"var(--s2) var(--s4)",
            width:"max-content",
            animation:"knfc-marquee 52s linear infinite",
            animationPlayState: isPaused ? "paused" : "running",
          }}>
            {doubled.map((r, i) => <AboutReviewCard key={i} review={r}/>)}
          </div>
        </div>
      </div>

      {/* ── Google Review CTA ─────────────────────────────────────────── */}
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"0 var(--s4) var(--s16)" }}>
        <div style={{ background:"var(--bgc)", border:"1px solid var(--bd2)", borderRadius:"var(--r5)", padding:"var(--s10) var(--s8)", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:"var(--s4)" }}>

          {/* Google "G" coloured SVG */}
          <svg width="52" height="52" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>

          <div>
            <h3 style={{ fontFamily:"var(--ff-d)", fontSize:"clamp(1.25rem,3vw,1.625rem)", fontWeight:900, letterSpacing:"-.025em", color:"var(--t1)", marginBottom:"var(--s2)" }}>
              Enjoyed your meal?
            </h3>
            <p style={{ fontSize:".9375rem", color:"var(--t2)", lineHeight:1.7, maxWidth:"440px", margin:"0 auto" }}>
              A Google review takes under a minute and helps more chicken lovers find us. We read every single one!
            </p>
          </div>

          {/* Five gold stars */}
          <div style={{ display:"flex", gap:4 }}>
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            ))}
          </div>

          <a
            href="https://g.page/r/CUzjX40lu8vLEBM/review"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:8, background:"var(--brand)", color:"#fff", fontFamily:"var(--ff-b)", fontWeight:700, fontSize:".9375rem", padding:"14px 30px", borderRadius:"var(--rf)", textDecoration:"none", letterSpacing:".01em" }}
            onMouseEnter={e => e.currentTarget.style.opacity=".88"}
            onMouseLeave={e => e.currentTarget.style.opacity="1"}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
            Leave a Google Review
          </a>

          <p style={{ fontSize:".75rem", color:"var(--t2)", margin:0 }}>
            Opens Google Reviews in a new tab — get your Place ID from{" "}
            <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" style={{ color:"var(--brand)", textDecoration:"none", fontWeight:600 }}>
              Google Business Profile
            </a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   CAREERS PAGE
══════════════════════════════════════════════════════════════════════ */
export function CareersPage() {
  useSEO({ title: "Careers — Join the KNFC Team", description: "Work at KNFC Fried Chicken. We're hiring kitchen staff, shift managers, delivery riders and more across all our branches." });
  const cfg = useSiteConfig();
  const staticOpenings = [
    { role:"Shift Manager",     location:"All Branches",    type:"Full-time", desc:"Lead daily operations, manage staff schedules, and ensure customer satisfaction.", apply_email:"careers@knfc.in" },
    { role:"Kitchen Staff",     location:"All Branches",    type:"Full-time", desc:"Prepare KNFC signature fried chicken and sides to our quality standards.", apply_email:"careers@knfc.in" },
    { role:"Cashier / Counter", location:"All Branches",    type:"Part-time", desc:"Serve customers, handle orders on the POS system, keep the counter welcoming.", apply_email:"careers@knfc.in" },
    { role:"Delivery Partner",  location:"All Branches",    type:"Freelance", desc:"Deliver hot meals on time using your own vehicle. Flexible per-delivery pay.", apply_email:"careers@knfc.in" },
    { role:"Brand Ambassador",  location:"Remote / Events", type:"Contract",  desc:"Represent KNFC at events and on social media. Passion for food and people.", apply_email:"careers@knfc.in" },
    { role:"Digital Marketing", location:"Head Office",     type:"Full-time", desc:"Run social media campaigns, manage ads, and grow our online presence.", apply_email:"careers@knfc.in" },
  ];
  const openings = (Array.isArray(cfg.careers_openings) && cfg.careers_openings.length > 0)
    ? cfg.careers_openings : staticOpenings;
  const intro = cfg.careers_intro || "";

  return (
    <LegalShell title="Careers at KNFC" subtitle="Join our flock — be part of the KNFC family">
      {intro && <p style={{ fontSize:".9375rem", color:"var(--t2)", lineHeight:1.8, marginBottom:"var(--s6)" }}>{intro}</p>}
      <Section title="Why Work With Us?">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"var(--s4)", marginBottom:"var(--s5)" }}>
          {[
            { icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="17" r="4"/><line x1="11.5" y1="13.5" x2="19" y2="6"/><circle cx="20" cy="5" r="1.5"/></svg>, title:"Free Meals",     desc:"Enjoy KNFC meals during every shift." },
            { icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>, title:"Grow Fast",       desc:"Performance-based promotions." },
            { icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, title:"Team First",      desc:"Supportive, family-like workplace." },
            { icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>, title:"Flexible Hours",  desc:"Shifts that fit your schedule." },
          ].map(b => (
            <div key={b.title} style={{ padding:"var(--s4)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px solid var(--bd)", textAlign:"center" }}>
              <div style={{ color:"var(--brand)", display:"flex", justifyContent:"center", marginBottom:"var(--s2)" }}>{b.icon}</div>
              <div style={{ fontWeight:800, fontSize:".9375rem", marginBottom:"var(--s1)" }}>{b.title}</div>
              <div style={{ fontSize:".8125rem", color:"var(--t2)" }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Current Openings">
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
          {openings.map(o => (
            <div key={o.role} style={{ padding:"var(--s4) var(--s5)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px solid var(--bd)", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"var(--s4)", flexWrap:"wrap" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", marginBottom:"var(--s1)", flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:"1rem" }}>{o.role}</span>
                  <span style={{ fontSize:".6875rem", fontWeight:700, padding:"2px 8px", borderRadius:"var(--rf)", background:"var(--brand-tint)", color:"var(--brand)", border:"1px solid rgba(232,82,26,.2)" }}>{o.type}</span>
                </div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)", marginBottom:"var(--s2)", display:"flex", alignItems:"center", gap:"5px" }}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {o.location}
                </div>
                <div style={{ fontSize:".875rem", color:"var(--t2)", lineHeight:1.6 }}>{o.desc}</div>
              </div>
              <a href={`mailto:${o.apply_email || "careers@knfc.in"}?subject=Application: ${encodeURIComponent(o.role || o.title)}`}
                style={{ padding:"9px 20px", borderRadius:"var(--rf)", background:"var(--brand)", color:"#fff", fontWeight:700, fontSize:".875rem", textDecoration:"none", flexShrink:0, whiteSpace:"nowrap", alignSelf:"flex-start" }}>
                Apply now →
              </a>
            </div>
          ))}
        </div>
      </Section>
      <Section title="How to Apply">
        <P>Send your CV and a short note to <strong>careers@knfc.in</strong>. We review every application and will respond to shortlisted candidates within 5 working days.</P>
        <P>Walk-in interviews are held every <strong>Saturday 10 AM – 1 PM</strong> at your nearest KNFC branch. Bring a printed CV and a valid ID.</P>
      </Section>
    </LegalShell>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   BLOG PAGE
══════════════════════════════════════════════════════════════════════ */
export function BlogPage() {
  const cfg = useSiteConfig();
  const cfgPosts = Array.isArray(cfg.blog_posts) && cfg.blog_posts.length > 0 ? cfg.blog_posts : null;
  const staticPosts = [
    { date:"April 2025", tag:"Recipe", icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="17" r="4"/><line x1="11.5" y1="13.5" x2="19" y2="6"/><circle cx="20" cy="5" r="1.5"/></svg>, title:"The Secret Behind Our Crispy Fried Chicken", summary:"Double-dredging, a 12-hour brine, and a high smoke-point oil blend — we reveal the technique that makes every bite crunch perfectly." },
    { date:"March 2025", tag:"News",   icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, title:"KNFC Hits 10,000 Orders — Thank You!", summary:"From a single branch to thousands of happy customers, we share our journey and what is coming next for the KNFC family." },
    { date:"Feb 2025",   tag:"Health", icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>, title:"Eating Fried Chicken the Healthier Way", summary:"Portion tips, side swaps, and why our air-chilled chicken cuts fat without cutting flavour." },
    { date:"Jan 2025",   tag:"Culture",icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 007-7c0-5-4-7-5-11-1.5 2-2 4-2 5.5-1-1-1.5-2.5-1-4-2 2.5-2 5-2 6a5 5 0 005 5z"/></svg>, title:"Spice Levels Explained — Mild to Fire", summary:"A deep dive into our spice blends and how to choose the heat level that is right for your palate." },
  ];
  const posts = cfgPosts || staticPosts;
  return (
    <LegalShell title="KNFC Blog" subtitle="Stories, recipes, and news from the KNFC kitchen">
      <div style={{ display:"flex", flexDirection:"column", gap:"var(--s5)" }}>
        {posts.map((p, i) => (
          <div key={i} style={{ padding:"var(--s5)", background:"var(--bg2)", borderRadius:"var(--r4)", border:"1px solid var(--bd)", display:"flex", gap:"var(--s4)", flexWrap:"wrap" }}>
            {p.image_url
              ? <img src={p.image_url} alt="" style={{ width:72, height:72, borderRadius:"var(--r3)", objectFit:"cover", flexShrink:0 }}/>
              : <div style={{ width:72, height:72, borderRadius:"var(--r3)", background:"linear-gradient(135deg,var(--brand),#c94010)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{p.icon || <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}</div>
            }
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", marginBottom:"var(--s2)", flexWrap:"wrap" }}>
                {p.tag && <span style={{ fontSize:".6875rem", fontWeight:700, padding:"2px 8px", borderRadius:"var(--rf)", background:"var(--brand-tint)", color:"var(--brand)", border:"1px solid rgba(232,82,26,.2)" }}>{p.tag}</span>}
                <span style={{ fontSize:".75rem", color:"var(--t3)" }}>{p.date}</span>
              </div>
              <div style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:"1.0625rem", marginBottom:"var(--s2)", lineHeight:1.25 }}>{p.title}</div>
              <div style={{ fontSize:".875rem", color:"var(--t2)", lineHeight:1.65 }}>{p.summary || p.excerpt}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Removed: "Stay updated / Follow us" section */}
    </LegalShell>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   FAQ PAGE
══════════════════════════════════════════════════════════════════════ */

const FAQ_DATA = [
  {
    category: "Ordering",
    items: [
      { q: "How do I place an order?", a: "Browse our menu, add items to your cart, and proceed to checkout. Select your branch, choose a payment method (UPI or cash), and confirm your order. Staff will start preparing it right away." },
      { q: "Can I order for dine-in and takeaway?", a: "Yes! When adding to cart or at checkout you can choose Dine-in, Takeaway, or Delivery depending on what your branch has enabled." },
      { q: "Can I modify or cancel my order after placing it?", a: "Once an order is confirmed and accepted by the kitchen, we are unable to modify or cancel it. Please check your order carefully before confirming." },
      { q: "Is there a minimum order value?", a: "There is no minimum order value. However, delivery orders may have a minimum set by individual branches." },
    ],
  },
  {
    category: "Payment",
    items: [
      { q: "What payment methods are accepted?", a: "We accept UPI (Google Pay, PhonePe, BHIM, etc.) and cash at the counter. Show your UPI transaction screenshot to staff for confirmation." },
      { q: "Is it safe to pay through the app?", a: "Yes. UPI payments go directly through your UPI app — we do not store any card or banking details on our servers." },
      { q: "Do you offer refunds?", a: "All sales are final once an order is accepted by the kitchen. If there is an issue with your order (wrong item, quality concern), please speak to our staff immediately at the branch and we will do our best to resolve it." },
    ],
  },
  {
    category: "Loyalty Points",
    items: [
      { q: "How do I earn loyalty points?", a: "You automatically earn points on eligible orders when logged in. Points are credited once your order is marked complete by staff." },
      { q: "How do I redeem loyalty points?", a: "At checkout, if you have enough points, a 'Use loyalty points' option will appear. Toggle it on to apply the discount to your order total." },
      { q: "Do loyalty points expire?", a: "Points are valid as long as your account is active. KNFC reserves the right to update the loyalty programme terms — we will notify users in advance of any changes." },
      { q: "Can I transfer points to another account?", a: "Loyalty points are non-transferable and have no cash value." },
    ],
  },
  {
    category: "Account & App",
    items: [
      { q: "Do I need an account to order?", a: "You can browse the menu without an account. However, you will need to log in to place an order, earn loyalty points, and track your order status." },
      { q: "How do I reset my password?", a: "On the login screen, tap 'Forgot password' and enter your registered phone number or email. We will send a one-time code to verify your identity and let you set a new password." },
      { q: "How do I select a different branch?", a: "Tap the branch selector (shown in the app header or on the home page) to switch to a different KNFC location. Menu availability and pricing may vary by branch." },
      { q: "Is the app available on iOS and Android?", a: "KNFC is a web app — it works on any modern browser on iOS, Android, or desktop. You can add it to your home screen for an app-like experience." },
    ],
  },
  {
    category: "Food & Quality",
    items: [
      { q: "Is your chicken halal?", a: "Yes, all KNFC chicken is sourced from certified halal suppliers. Halal certificates are available at our branches on request." },
      { q: "Do you cater to vegetarians or vegans?", a: "We currently focus on chicken-based dishes. Please check the menu for any vegetarian sides or combos available at your branch." },
      { q: "How fresh is the food?", a: "Every piece is cooked fresh to order. We never use previously fried or reheated chicken. Preparation begins the moment your order is confirmed." },
      { q: "Can I customise my order (spice level, sides)?", a: "Customisation options vary by item. Where available, you will see choices for spice level or add-ons on the item detail screen." },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: "1px solid var(--bd)",
      borderRadius: "var(--r3)",
      overflow: "hidden",
      transition: "border-color .18s",
      ...(open ? { borderColor: "rgba(232,82,26,.35)" } : {}),
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", background: "var(--bg2)",
          border: "none", padding: "14px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "var(--s4)", cursor: "pointer", fontFamily: "var(--ff-b)",
          fontSize: ".9375rem", fontWeight: 700, color: "var(--t1)",
        }}
      >
        <span>{q}</span>
        <svg
          width="16" height="16" fill="none" viewBox="0 0 24 24"
          stroke="var(--brand)" strokeWidth="2.5" style={{ flexShrink: 0, transition: "transform .18s", transform: open ? "rotate(180deg)" : "rotate(0)" }}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding: "4px 18px 16px", fontSize: ".9rem", color: "var(--t2)", lineHeight: 1.75, background: "var(--bgc)", borderTop: "1px solid var(--bd)" }}>
          {a}
        </div>
      )}
    </div>
  );
}

export function FAQPage() {
  useSEO({ title: "FAQ — Frequently Asked Questions", description: "Answers to common questions about KNFC Fried Chicken — orders, delivery, payment, loyalty points and more." });
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", ...FAQ_DATA.map(g => g.category)];
  const visible = activeCategory === "All"
    ? FAQ_DATA
    : FAQ_DATA.filter(g => g.category === activeCategory);

  return (
    <LegalShell title="Frequently Asked Questions" subtitle="Everything you need to know about ordering at KNFC">

      {/* Category filter pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)", marginBottom: "var(--s7)" }}>
        {categories.map(c => (
          <button key={c}
            onClick={() => setActiveCategory(c)}
            style={{
              padding: "6px 16px", borderRadius: "var(--rf)",
              border: "1.5px solid",
              borderColor: activeCategory === c ? "var(--brand)" : "var(--bd)",
              background: activeCategory === c ? "var(--brand)" : "var(--bg2)",
              color: activeCategory === c ? "#fff" : "var(--t2)",
              fontWeight: 700, fontSize: ".8125rem", cursor: "pointer",
              fontFamily: "var(--ff-b)", transition: "all .15s",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {visible.map(group => (
        <Section key={group.category} title={group.category}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
            {group.items.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </Section>
      ))}

      {/* Still have questions */}
      <div style={{ marginTop: "var(--s6)", padding: "var(--s6)", background: "linear-gradient(135deg,rgba(232,82,26,.07),rgba(232,82,26,.03))", borderRadius: "var(--r4)", border: "1px solid rgba(232,82,26,.2)", textAlign: "center" }}>
        <div style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>💬</div>
        <div style={{ fontFamily: "var(--ff-d)", fontWeight: 800, fontSize: "1.0625rem", marginBottom: "var(--s2)", color: "var(--t1)" }}>Still have a question?</div>
        <p style={{ fontSize: ".875rem", color: "var(--t2)", marginBottom: "var(--s4)" }}>Our staff will be happy to help. Visit us at any branch or drop us a message.</p>
        <Link to="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: "var(--r3)", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: ".9rem", textDecoration: "none", fontFamily: "var(--ff-b)" }}>
          Contact us →
        </Link>
      </div>
    </LegalShell>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   CONTACT PAGE
══════════════════════════════════════════════════════════════════════ */
export function ContactPage() {
  useSEO({ title: "Contact Us", description: "Get in touch with KNFC Fried Chicken — customer support, feedback, and general enquiries." });
  const { user }             = useAuth();
  const cfg                  = useSiteConfig();
  const contactEmail         = cfg.contact_email  || CONTACT_EMAIL_DEFAULT;
  const contactPhone         = cfg.contact_phone  || "+91 98765 43210";
  const contactWA            = cfg.contact_wa_number || "919876543210";
  const contactAddress       = cfg.contact_address || "Visit your nearest KNFC branch";

  const [name,    setName]   = useState(user?.name    || "");
  const [email,   setEmail]  = useState(user?.email   || "");
  const [phone,   setPhone]  = useState(user?.phone   || "");
  const [subject, setSubject]= useState("");
  const [message, setMessage]= useState("");
  const [photo,   setPhoto]  = useState(null);
  const [loading, setLoading]= useState(false);
  const [status,  setStatus] = useState(null);
  const [errMsg,  setErrMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setStatus(null);
    try {
      const fd = new FormData();
      fd.append("name",    name);
      fd.append("email",   email);
      fd.append("phone",   phone);
      fd.append("subject", subject);
      fd.append("message", message);
      const bid = localStorage.getItem("branch_id");
      if (bid) fd.append("branch_id", bid);
      if (photo) fd.append("photo", photo);
      await axiosClient.post("/support/submit/", fd, { headers:{ "Content-Type":"multipart/form-data" } });
      setStatus("ok");
      setSubject(""); setMessage(""); setPhoto(null);
    } catch (ex) {
      setErrMsg(ex.response?.data?.error || "Failed to send. Please try again.");
      setStatus("err");
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px",
    border: "1.5px solid var(--bd)", borderRadius: "var(--r2)",
    background: "var(--bg)", color: "var(--t1)", fontSize: ".9375rem",
    outline: "none", fontFamily: "var(--ff-b)", boxSizing: "border-box",
    transition: "border-color .15s",
  };

  return (
    <LegalShell title="Contact Us" subtitle="We'd love to hear from you — reach out any way you prefer">

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--s8)", maxWidth:"100%" }}>

        {/* ── Contact channels ─────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "var(--s4)" }}>
          {[
            {
              icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.2 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
              label: "Call us",
              value: contactPhone,
              sub: "Mon – Sat, 10 AM – 8 PM IST",
              href: `tel:${contactPhone.replace(/\s/g,"")}`,
            },
            {
              icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
              label: "Email us",
              value: contactEmail,
              sub: "We reply within 1 business day",
              href: `mailto:${contactEmail}`,
            },
            {
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
              label: "Visit us",
              value: contactAddress.length > 40 ? contactAddress.slice(0,40)+"…" : contactAddress,
              sub: "Find your nearest KNFC branch",
              href: "/menu",
            },
            {
              icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
              label: "WhatsApp",
              value: "Chat with us",
              sub: "Quick responses during hours",
              href: `https://wa.me/${contactWA}`,
            },
          ].map(ch => (
            <a key={ch.label} href={ch.href} target={ch.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              style={{ display: "flex", flexDirection: "column", gap: "var(--s2)", padding: "var(--s4) var(--s5)", background: "var(--bg2)", border: "1px solid var(--bd)", borderRadius: "var(--r4)", textDecoration: "none", transition: "border-color .15s, box-shadow .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,82,26,.4)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(232,82,26,.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bd)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "var(--r3)", background: "rgba(232,82,26,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>{ch.icon}</div>
              <div style={{ fontWeight: 800, fontSize: ".9rem", color: "var(--t1)", fontFamily: "var(--ff-b)" }}>{ch.label}</div>
              <div style={{ fontWeight: 700, fontSize: ".9375rem", color: "var(--brand)", wordBreak:"break-all", overflowWrap:"anywhere" }}>{ch.value}</div>
              <div style={{ fontSize: ".8125rem", color: "var(--t3)" }}>{ch.sub}</div>
            </a>
          ))}
        </div>

        {/* ── Contact form ─────────────────────────────────── */}
        <div style={{ background: "var(--bg2)", border: "1px solid var(--bd)", borderRadius: "var(--r4)", padding: "var(--s6)" }}>
          <h3 style={{ fontFamily: "var(--ff-d)", fontWeight: 800, fontSize: "1.125rem", marginBottom: "var(--s5)", color: "var(--t1)" }}>Send us a message</h3>

          {status === "ok" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--s4)", padding: "var(--s8) var(--s4)", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily: "var(--ff-d)", fontWeight: 800, fontSize: "1.125rem", color: "var(--t1)" }}>Message sent!</div>
              <p style={{ fontSize: ".9rem", color: "var(--t2)", margin: 0 }}>
                We've received your message and will get back to you at <strong>{contactEmail}</strong> within 1 business day.
              </p>
              <button onClick={() => setStatus(null)} style={{ padding: "9px 22px", borderRadius: "var(--r3)", border: "none", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: ".875rem", cursor: "pointer", fontFamily: "var(--ff-b)" }}>
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s4)" }}>
                <div>
                  <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 700, color: "var(--t2)", marginBottom: "var(--s1)", fontFamily: "var(--ff-b)" }}>Your name *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--brand)"}
                    onBlur={e => e.target.style.borderColor = "var(--bd)"}/>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 700, color: "var(--t2)", marginBottom: "var(--s1)", fontFamily: "var(--ff-b)" }}>Email address *</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--brand)"}
                    onBlur={e => e.target.style.borderColor = "var(--bd)"}/>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 700, color: "var(--t2)", marginBottom: "var(--s1)", fontFamily: "var(--ff-b)" }}>Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Order issue, feedback, general enquiry…" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = "var(--bd)"}/>
              </div>
              {/* Phone number */}
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 700, color: "var(--t2)", marginBottom: "var(--s1)", fontFamily: "var(--ff-b)" }}>Phone number <span style={{ fontWeight:400, color:"var(--t3)" }}>(optional)</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,""))} maxLength={10} placeholder="10-digit mobile number" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = "var(--bd)"}/>
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 700, color: "var(--t2)", marginBottom: "var(--s1)", fontFamily: "var(--ff-b)" }}>Message *</label>
                <textarea required value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us how we can help…" rows={5}
                  style={{ ...inputStyle, resize: "vertical", minHeight: "120px" }}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = "var(--bd)"}/>
              </div>

              {/* Photo upload */}
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 700, color: "var(--t2)", marginBottom: "var(--s1)", fontFamily: "var(--ff-b)" }}>
                  Attach photo <span style={{ fontWeight:400, color:"var(--t3)" }}>(optional — screenshot or photo of issue)</span>
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", border:"1.5px dashed var(--bd)", borderRadius:"var(--r3)", cursor:"pointer", background:"var(--bg)", transition:"border-color .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--brand)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bd)"}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span style={{ fontSize:".875rem", color: photo ? "var(--ok)" : "var(--t3)" }}>
                    {photo ? `✓ ${photo.name}` : "Choose a photo…"}
                  </span>
                  {photo && (
                    <button type="button" onClick={e=>{ e.preventDefault(); setPhoto(null); }}
                      style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"var(--t3)", fontSize:"18px", lineHeight:1 }}>×</button>
                  )}
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => setPhoto(e.target.files[0])} />
                </label>
                {photo && <img src={URL.createObjectURL(photo)} alt="preview" style={{ marginTop:8, width:"100%", maxHeight:160, objectFit:"cover", borderRadius:"var(--r2)", border:"1px solid var(--bd)" }}/>}
              </div>

              {status === "err" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: "var(--r2)", fontSize: ".875rem", color: "var(--err)", fontWeight: 600 }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {errMsg}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "var(--s4)", flexWrap: "wrap" }}>
                <button type="submit" disabled={loading}
                  style={{ padding: "12px 28px", borderRadius: "var(--r3)", border: "none", background: "var(--brand)", color: "#fff", fontWeight: 800, fontSize: ".9375rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--ff-b)", boxShadow: "0 4px 16px rgba(232,82,26,.3)", opacity: loading ? .7 : 1 }}>
                  {loading ? "Sending…" : "Send message"}
                </button>
              </div>
              <p style={{ fontSize: ".75rem", color: "var(--t3)", margin: 0 }}>
                Your message is sent directly to <strong>{contactEmail}</strong> via our server.
              </p>
            </form>
          )}
        </div>

        {/* Follow Us section removed — social links not needed on support page */}

      </div>
    </LegalShell>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   PRESS PAGE
══════════════════════════════════════════════════════════════════════ */
export function PressPage() {
  const mentions = [
    { outlet:"The Hindu BusinessLine", date:"March 2025", headline:"KNFC: The Fried Chicken Brand Disrupting Kerala's QSR Market" },
    { outlet:"Mathrubhumi",            date:"Feb 2025",   headline:"KNFC ആകർഷകമായ ഓഫറുകളും ഡിജിറ്റൽ ഓർഡറിംഗ് സംവിധാനവും" },
    { outlet:"YourStory",              date:"Jan 2025",   headline:"How KNFC Built a Full-Stack POS System In-House" },
    { outlet:"StartupTimes India",     date:"Dec 2024",   headline:"KNFC Named Among Kerala's Fastest-Growing Food Brands 2024" },
  ];
  return (
    <LegalShell title="Press & Media" subtitle="KNFC in the news — resources for journalists and media professionals">
      <Section title="Media Mentions">
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s3)" }}>
          {mentions.map((m, i) => (
            <div key={i} style={{ padding:"var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"var(--s4)", flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--brand)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:"var(--s1)" }}>{m.outlet}</div>
                <div style={{ fontWeight:600, fontSize:".9375rem", lineHeight:1.4 }}>{m.headline}</div>
                <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:"var(--s1)" }}>{m.date}</div>
              </div>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8" style={{flexShrink:0}}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Press Kit">
        <P>Download our brand assets, high-resolution logos, and product photography for editorial use.</P>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"var(--s3)", marginTop:"var(--s3)" }}>
          {[
            { label:"Brand Logo Pack",  icon:"🖼️", desc:"SVG + PNG, light/dark variants" },
            { label:"Product Photos",   icon:"📷", desc:"High-res chicken & menu shots" },
            { label:"Brand Guidelines", icon:"📐", desc:"Colours, fonts, usage rules" },
            { label:"Fact Sheet",       icon:"📄", desc:"Company overview & key stats" },
          ].map(a => (
            <div key={a.label} style={{ padding:"var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px dashed var(--bd)", textAlign:"center" }}>
              <div style={{ fontSize:"1.5rem", marginBottom:"var(--s2)" }}>{a.icon}</div>
              <div style={{ fontWeight:700, fontSize:".875rem", marginBottom:"var(--s1)" }}>{a.label}</div>
              <div style={{ fontSize:".75rem", color:"var(--t3)", marginBottom:"var(--s3)" }}>{a.desc}</div>
              <a href="mailto:press@knfc.in?subject=Press Kit Request" style={{ fontSize:".75rem", fontWeight:700, color:"var(--brand)", textDecoration:"none" }}>Request →</a>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Press Contact">
        <P>For interview requests, fact-checking, and editorial enquiries please reach out to our media team:</P>
        <div style={{ padding:"var(--s4) var(--s5)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
          <div style={{ fontWeight:700, fontSize:"1rem" }}>KNFC Media Relations</div>
          <a href="mailto:press@knfc.in" style={{ color:"var(--brand)", fontWeight:600, fontSize:".9375rem" }}>press@knfc.in</a>
          <div style={{ fontSize:".875rem", color:"var(--t2)" }}>We aim to respond within 24 hours on working days.</div>
        </div>
      </Section>
    </LegalShell>
  );
}
