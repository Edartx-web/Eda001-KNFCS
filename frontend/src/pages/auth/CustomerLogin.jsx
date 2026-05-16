import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { useAuth } from "../../context/AuthContext";
import KNCLoader from "../../components/common/KNCLoader";
import ThemeToggle from "../../components/common/ThemeToggle";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import axiosClient from "../../api/axiosClient";
import "../../styles/global.css";
import "../../styles/authpage/customerlogin.css";
import knfcHeroVideo from "../../components/videoclips/KNFC-hero.mp4";

gsap.registerPlugin(ScrambleTextPlugin);

/* ─── API ─────────────────────────────────────────────────────── */
const API = axiosClient

const customerRegister  = (name, phone) => API.post("auth/customer/register/",   { name, phone });
const customerVerifyOtp = (phone, otp)  => API.post("auth/customer/verify-otp/", { phone, otp  });
const customerResendOtp = (phone)       => API.post("auth/customer/resend-otp/", { phone       });

/* ─── Brand letters ───────────────────────────────────────────── */
const DrumstickIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="17" r="4"/><line x1="11.5" y1="13.5" x2="19" y2="6"/><circle cx="20" cy="5" r="1.5"/>
  </svg>
);
const BurgerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 10c0-3.3 2.7-5 8-5s8 1.7 8 5"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="2" y1="13" x2="22" y2="13"/><path d="M4 16h16c0 1.7-2.7 3-8 3s-8-1.3-8-3z"/>
  </svg>
);
const DrinkIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4h10l-2 16H9L7 4z"/><line x1="5" y1="4" x2="19" y2="4"/><line x1="16" y1="4" x2="19" y2="1"/>
  </svg>
);
const FriesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14l-1.5 9h-11L5 12z"/><line x1="8.5" y1="12" x2="8" y2="4"/><line x1="12" y1="12" x2="12" y2="3"/><line x1="15.5" y1="12" x2="16" y2="4"/>
  </svg>
);
const FlameIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a7 7 0 007-7c0-5-4-7-5-11-1.5 2-2 4-2 5.5-1-1-1.5-2.5-1-4-2 2.5-2 5-2 6a5 5 0 005 5z"/>
  </svg>
);

const BRAND_DATA = [
  { char: "K", icon: <DrumstickIcon /> },
  { char: "N", icon: <BurgerIcon /> },
  { char: "F", icon: <DrinkIcon /> },
  { char: "C", icon: <FriesIcon /> },
];

/* ─── Country codes ───────────────────────────────────────────── */
const COUNTRIES = [
  { code: "+91", name: "India" },
  { code: "+1",  name: "USA"   },
  { code: "+44", name: "UK"    },
  { code: "+61", name: "AU"    },
  { code: "+65", name: "SG"    },
];

/* ─── Mobile Slides ───────────────────────────────────────────── */
const MOB_SLIDES = [
  { word:"CRAVE",  sub:"Crispy fried chicken",  gradient:"linear-gradient(160deg,#1c0800 0%,#5c1f00 55%,#b34400 100%)", accent:"#e06000", img:"/assets/image/dishes/dish-0.png", icon:<DrumstickIcon /> },
  { word:"SMASH",  sub:"Juicy smash burgers",   gradient:"linear-gradient(160deg,#0c0020 0%,#2d0060 55%,#6600cc 100%)", accent:"#a855f7", img:"/assets/image/dishes/dish-1.png", icon:<BurgerIcon /> },
  { word:"ENJOY",  sub:"Golden crispy fries",   gradient:"linear-gradient(160deg,#001408 0%,#003d18 55%,#007330 100%)", accent:"#22c55e", img:"/assets/image/dishes/dish-2.png", icon:<FriesIcon /> },
  { word:"RELISH", sub:"Ice-cold beverages",    gradient:"linear-gradient(160deg,#000d1a 0%,#002a50 55%,#005599 100%)", accent:"#3b82f6", img:"/assets/image/dishes/dish-3.png", icon:<DrinkIcon /> },
  { word:"FEAST",  sub:"Spicy loaded combos",   gradient:"linear-gradient(160deg,#1a0000 0%,#4d0000 55%,#990000 100%)", accent:"#ef4444", img:"/assets/image/dishes/dish-4.png", icon:<FlameIcon /> },
];

/* ─── Alert ───────────────────────────────────────────────────── */
function Alert({ type = "error", children }) {
  const colors = {
    error:   { bg:"var(--err-t)",  border:"rgba(226,75,74,.25)",  text:"var(--err)"  },
    info:    { bg:"var(--info-t)", border:"rgba(55,138,221,.25)", text:"var(--info)" },
    success: { bg:"var(--ok-t)",   border:"rgba(29,158,117,.25)", text:"var(--ok)"   },
  };
  const c = colors[type];
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:"8px", padding:"10px 12px",
      background:c.bg, border:`1px solid ${c.border}`, borderRadius:"10px",
      fontSize:".85rem", color:c.text, marginBottom:"12px" }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        strokeWidth="2" style={{ flexShrink:0, marginTop:"1px" }}>
        <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
      </svg>
      <span>{children}</span>
    </div>
  );
}

/* ─── Terms / Privacy Modal ───────────────────────────────────── */
function TermsModal({ type, onClose }) {
  const isTerms = type === "terms";
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isTerms ? "Terms of Service" : "Privacy Policy"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {isTerms ? (
            <>
              <p><strong>Last updated:</strong> January 2025</p>
              <h3>1. Acceptance of Terms</h3>
              <p>By creating an account or using KNFC services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
              <h3>2. Use of Service</h3>
              <p>KNFC provides an online food ordering platform. You agree to use the service only for lawful purposes. You must be at least 13 years old to create an account.</p>
              <h3>3. Account & Authentication</h3>
              <p>You are responsible for maintaining the confidentiality of your OTP and account. You agree to accept responsibility for all activities that occur under your account.</p>
              <h3>4. Orders & Payments</h3>
              <p>All orders are subject to availability and confirmation. Prices may change without notice. We reserve the right to cancel any order for any reason.</p>
              <h3>5. Delivery</h3>
              <p>Delivery times are estimates only. We are not liable for delays caused by traffic, weather, or other unforeseen circumstances.</p>
              <h3>6. Cancellations & Refunds</h3>
              <p>Orders can be cancelled within 2 minutes of placement. Refunds will be processed within 5–7 business days to the original payment method.</p>
              <h3>7. Limitation of Liability</h3>
              <p>KNFC is not liable for any indirect, incidental, or consequential damages arising from use of our services.</p>
              <h3>8. Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance of the updated terms.</p>
            </>
          ) : (
            <>
              <p><strong>Last updated:</strong> January 2025</p>
              <h3>1. Information We Collect</h3>
              <p>We collect your name, phone number, and order history. We may also collect device information and usage data to improve our services.</p>
              <h3>2. How We Use Your Information</h3>
              <p>Your information is used to process orders, send OTPs for authentication, provide support, and improve our services. We do not sell your personal data.</p>
              <h3>3. OTP & Authentication</h3>
              <p>We send one-time passwords via WhatsApp or SMS only when you initiate a login or registration.</p>
              <h3>4. Data Sharing</h3>
              <p>We may share your information with delivery partners to fulfill orders, and with service providers who assist in operating our platform.</p>
              <h3>5. Data Retention</h3>
              <p>We retain your data for as long as your account is active. You may request deletion at any time by contacting support.</p>
              <h3>6. Security</h3>
              <p>We implement industry-standard security measures. However, no method of internet transmission is 100% secure.</p>
              <h3>7. Contact Us</h3>
              <p>For privacy questions, contact us at privacy@knfc.in or through the support section in the app.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function CustomerLogin() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  /* ── Dynamic login media (super admin configurable) ─────────── */
  const [loginImageUrl, setLoginImageUrl] = useState(null);
  const [loginVideoUrl, setLoginVideoUrl] = useState(null);
  const [mobSlides,     setMobSlides]     = useState(MOB_SLIDES);
  useEffect(() => {
    axiosClient.get("/branches/config/").then(r => {
      const cfg = r.data.config || {};
      setLoginImageUrl(cfg.login_image_url || null);
      setLoginVideoUrl(cfg.login_video_url || null);
      if (Array.isArray(cfg.login_slides) && cfg.login_slides.length >= 2) {
        // Merge API slides with default SVG icons (icons can't be stored in JSON)
        const icons = [<DrumstickIcon/>, <BurgerIcon/>, <FriesIcon/>, <DrinkIcon/>, <FlameIcon/>];
        setMobSlides(cfg.login_slides.map((sl, i) => ({
          ...sl,
          icon: icons[i % icons.length],
        })));
      }
    }).catch(() => {});
  }, []);

  /* ── Auth state ──────────────────────────────────────────────── */
  const [step,        setStep]        = useState("phone");
  const [name,        setName]        = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone,       setPhone]       = useState("");
  const [otp,         setOtp]         = useState(["","","","","",""]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [info,        setInfo]        = useState("");
  const [resend,      setResend]      = useState(0);
  const [devOtp,      setDevOtp]      = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [modalType,   setModalType]   = useState(null);

  /* ── Desktop animation state ─────────────────────────────────── */
  const [videoEnded,         setVideoEnded]         = useState(false);
  const [hoveredIndex,       setHoveredIndex]       = useState(null);
  const [animationTriggered, setAnimationTriggered] = useState(false);

  /* ── Mobile swiper state ─────────────────────────────────────── */
  const [mobSlide,    setMobSlide]    = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [dragDx,      setDragDx]      = useState(0);
  const [dragging,    setDragging]    = useState(false);

  /* ── Refs ────────────────────────────────────────────────────── */
  const otpRefs    = useRef([]);
  const wordRefs   = useRef([]);
  const loopTlRef  = useRef(null);
  const formRef    = useRef(null);
  const videoRef   = useRef(null);
  const mobAutoRef = useRef(null);
  const otpAbortRef = useRef(null);

  const smashWords = ["CRAVE", "SMASH", "ENJOY"];
  const country    = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  /* ════════════ MOBILE SWIPER AUTO ══════════════════════════ */
  const startAuto = useCallback(() => {
    clearInterval(mobAutoRef.current);
    mobAutoRef.current = setInterval(() => setMobSlide(s => (s + 1) % mobSlides.length), 3400);
  }, []);
  useEffect(() => { startAuto(); return () => clearInterval(mobAutoRef.current); }, [startAuto]);
  const goTo = (idx) => { setMobSlide(idx); startAuto(); };

  const onTouchStart = (e) => { setTouchStartX(e.touches[0].clientX); setDragDx(0); setDragging(true); clearInterval(mobAutoRef.current); };
  const onTouchMove  = (e) => { if (!dragging) return; setDragDx(e.touches[0].clientX - touchStartX); };
  const onTouchEnd   = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 45) setMobSlide(s => dx < 0 ? (s+1)%mobSlides.length : (s+mobSlides.length-1)%mobSlides.length);
    setDragDx(0); setDragging(false); startAuto();
  };

  /* ════════════ RESEND COUNTDOWN ════════════════════════════ */
  useEffect(() => {
    if (resend <= 0) return;
    const t = setTimeout(() => setResend(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resend]);

  /* ════════════ OTP AUTOFILL — three paths ══════════════════════
   * 1. WebOTP API  (Android Chrome + SMS) — fires automatically
   * 2. OS autofill (Android keyboard / macOS/iOS Safari) — works
   *    via autocomplete="one-time-code" on the first box; the
   *    handleOtpChange below catches multi-digit autofill input
   * 3. Clipboard paste button — manual fallback for WhatsApp
   * ============================================================ */
  useEffect(() => {
    if (step !== "otp") return;
    if (!("OTPCredential" in window)) return;
    const ac = new AbortController();
    otpAbortRef.current = ac;
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then(cred => {
        const digits = (cred?.code || "").replace(/\D/g, "").slice(0, 6);
        if (digits.length === 6) {
          setOtp(digits.split(""));
          setTimeout(() => document.getElementById("otp-submit-btn")?.click(), 80);
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, [step]);

  const handlePasteOtp = useCallback(async () => {
    try {
      const text   = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (!digits.length) { otpRefs.current[0]?.focus(); return; }
      const filled = [...digits.split(""), ...Array(6 - digits.length).fill("")];
      setOtp(filled);
      if (digits.length === 6) {
        setTimeout(() => document.getElementById("otp-submit-btn")?.click(), 80);
      } else {
        otpRefs.current[digits.length]?.focus();
      }
    } catch {
      otpRefs.current[0]?.focus();
    }
  }, []);

  /* ════════════ FORM ENTRANCE ════════════════════════════════ */
  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(formRef.current, { opacity:0, y:24 }, { opacity:1, y:0, duration:0.55, ease:"power3.out", delay:0.1 });
  }, []);

  /* ════════════ DESKTOP VIDEO → GSAP ════════════════════════ */
  useEffect(() => {
    if (!videoEnded) return;
    const tl = gsap.timeline();
    tl.fromTo(wordRefs.current,
      { x:-500, opacity:0, scale:3, filter:"blur(10px)" },
      { x:0, opacity:1, scale:1, filter:"blur(0px)", duration:0.4, stagger:0.15, ease:"expo.out",
        onComplete: () => gsap.to(wordRefs.current, { margin:"0 15px", duration:0.8, ease:"elastic.out(1,0.5)", onComplete: startLoop }) }
    );
    tl.fromTo(".dish-slot, .main-brand-circle",
      { opacity:0, scale:0.8 }, { opacity:1, scale:1, duration:1, ease:"power2.out" }, "-=0.4");
    function startLoop() {
      if (loopTlRef.current) loopTlRef.current.kill();
      const lt = gsap.timeline({ repeat:-1 });
      lt.to(".main-brand-circle", { rotation:360, duration:20, ease:"linear" })
        .to(".dish-slot", { rotation:-360, duration:20, ease:"linear" }, 0);
      loopTlRef.current = lt;
    }
    return () => { if (loopTlRef.current) loopTlRef.current.kill(); };
  }, [videoEnded]);

  const handleTimeUpdate = () => {
    const v = videoRef.current; if (!v) return;
    if (v.currentTime >= v.duration - 2 && !animationTriggered) { setAnimationTriggered(true); setVideoEnded(true); }
  };

  /* ════════════ DESKTOP LETTER HOVER ════════════════════════ */
  const onLetterEnter = (e) => {
    const [letter, svg, line] = ["char-text","char-svg","char-underline"].map(c => e.currentTarget.querySelector(`.${c}`));
    gsap.killTweensOf([letter, svg, line]);
    gsap.timeline()
      .to(letter, { opacity:0, y:-15, duration:0.2, ease:"power2.in" })
      .fromTo(svg, { scale:0, opacity:0, y:15 }, { scale:1, opacity:1, y:0, duration:0.4, ease:"back.out(2)", onStart:()=>gsap.set(letter,{opacity:0}) }, "-=0.1")
      .to(line, { width:"100%", opacity:1, duration:0.3 }, "-=0.4");
  };
  const onLetterLeave = (e) => {
    const [letter, svg, line] = ["char-text","char-svg","char-underline"].map(c => e.currentTarget.querySelector(`.${c}`));
    gsap.killTweensOf([letter, svg, line]);
    gsap.timeline()
      .to(svg, { scale:0, opacity:0, y:15, duration:0.2, onComplete:()=>gsap.set(svg,{opacity:0}) })
      .to(letter, { opacity:1, y:0, duration:0.3, ease:"power2.out" })
      .to(line, { width:"0%", opacity:0, duration:0.2 }, "-=0.3");
  };

  /* ════════════ AUTH HANDLERS ════════════════════════════════ */
  const handleSend = async (e) => {
    e?.preventDefault();
    const trimName  = name.trim();
    const fullPhone = `${country.code}${phone.trim()}`;
    if (!trimName)              { setError("Please enter your name");                          return; }
    if (trimName.length < 2)    { setError("Name must be at least 2 characters");             return; }
    if (/\d/.test(trimName))    { setError("Name should not contain numbers");                 return; }
    if (phone.length === 0)     { setError("Enter your mobile number");                        return; }
    if (phone.length !== 10)    { setError("Enter a valid 10-digit mobile number");            return; }
    if (!agreedTerms)           { setError("Please accept the Terms & Privacy Policy");        return; }
    setError(""); setLoading(true);
    try {
      const res = await customerRegister(trimName, fullPhone);
      const d   = res.data;
      if (d.dev_otp) setDevOtp(d.dev_otp);
      setStep("otp"); setResend(60);
      setInfo(d.message || "OTP sent via WhatsApp.");
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP.");
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the 6-digit code"); return; }
    setError(""); setLoading(true);
    try {
      const res = await customerVerifyOtp(`${country.code}${phone.trim()}`, code);
      login(res.data.user, res.data.tokens);
      navigate("/menu");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP.");
      setOtp(["","","","","",""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resend > 0) return;
    setError(""); setLoading(true);
    try {
      const res = await customerResendOtp(`${country.code}${phone.trim()}`);
      if (res.data.dev_otp) setDevOtp(res.data.dev_otp);
      setResend(60); setInfo("New OTP sent via WhatsApp.");
      setOtp(["","","","","",""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError("Failed to resend OTP.");
    } finally { setLoading(false); }
  };

  const handleOtpChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 1) {
      // OS autofill (Android keyboard suggestion / macOS Safari) delivered multiple digits at once
      const arr = raw.slice(0, 6).split("").concat(Array(6).fill("")).slice(0, 6);
      setOtp(arr);
      const next = Math.min(raw.length, 5);
      otpRefs.current[next]?.focus();
      if (raw.length >= 6) setTimeout(() => document.getElementById("otp-submit-btn")?.click(), 80);
      return;
    }
    const val = [...otp]; val[i] = raw.slice(0, 1); setOtp(val);
    if (val[i] && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKeyDown = (i, e) => { if(e.key==="Backspace"&&!otp[i]&&i>0) otpRefs.current[i-1]?.focus(); };
  const handleOtpPaste   = (e) => { const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6); if(p.length){setOtp(p.split("").concat(Array(6-p.length).fill(""))); otpRefs.current[Math.min(p.length,5)]?.focus();} e.preventDefault(); };

  const vw     = typeof window !== "undefined" ? window.innerWidth : 400;
  const trackX = -(mobSlide * 100) + (dragging ? (dragDx / vw) * 100 : 0);

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <>
      {loading && <KNCLoader visible label="Authenticating…" />}

      {/* ── Theme toggle — self-positions (desktop top-right, mobile bottom-right FAB) */}
      <ThemeToggle />

      {/* Terms / Privacy modal */}
      {modalType && <TermsModal type={modalType} onClose={() => setModalType(null)} />}

      <div className={`auth-shell${step === "otp" ? " auth-shell--otp" : ""}`} style={step === "otp" ? { display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"var(--bg)" } : {}}>

        {/* ═══ LEFT — hidden during OTP step ═══ */}
        {step !== "otp" && <div className="auth-left">

          {/* Mobile Swiper */}
          <div className="mob-swiper" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <div className="mob-track" style={{ transform:`translateX(${trackX}%)`, transition:dragging?"none":"transform 0.48s cubic-bezier(0.4,0,0.2,1)" }}>
              {mobSlides.map((sl, i) => (
                <div key={i} className="mob-slide">
                  <div className="mob-slide-bg" style={{ background:sl.gradient }} />
                  <div className="mob-slide-noise" />
                  <div className="mob-slide-vignette" />
                  <div className="mob-dish-wrap">
                    <img src={sl.img} alt={sl.word} className="mob-dish-img"
                      onError={e=>{e.currentTarget.style.display="none";const fb=e.currentTarget.nextElementSibling;if(fb)fb.style.display="flex";}}/>
                    <div className="mob-dish-fallback" style={{display:"none",color:"#fff",opacity:.6}}>{sl.icon}</div>
                    <div className="mob-dish-mask"/>
                  </div>
                  <div className="mob-slide-content">
                    <div className="mob-brand-row">
                      <div className="mob-logo-sq" style={{background:sl.accent}}>
                        <img src="/KNFC-logo.svg" alt="KNFC" width="18" height="18" style={{objectFit:"contain",borderRadius:"3px"}}/>
                      </div>
                      <div className="mob-brand-letters">
                        {BRAND_DATA.map((b,j)=><div key={j} className="mob-brand-letter">{b.char}</div>)}
                      </div>
                    </div>
                    <div className="mob-hero-word">{sl.word}<span className="mob-hero-line" style={{background:sl.accent}}/></div>
                    <div className="mob-slide-sub">{sl.sub}</div>
                    <div className="mob-slide-tag">Fresh · Crispy · Made with love</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mob-counter">
              <span className="mob-cnt-n">{String(mobSlide+1).padStart(2,"0")}</span>
              <div className="mob-cnt-bar"><div className="mob-cnt-fill" style={{width:`${((mobSlide+1)/mobSlides.length)*100}%`,background:mobSlides[mobSlide]?.accent}}/></div>
              <span className="mob-cnt-n">{String(mobSlides.length).padStart(2,"0")}</span>
            </div>
            <div className="mob-dots">
              {mobSlides.map((sl,i)=>(
                <button key={i} className={`mob-dot${mobSlide===i?" active":""}`}
                  style={mobSlide===i?{background:sl.accent}:{}} onClick={()=>goTo(i)} aria-label={`Slide ${i+1}`}/>
              ))}
            </div>
          </div>

          {/* Desktop Video / Image */}
          <div className="video-container">
            {loginImageUrl && !loginVideoUrl ? (
              <img src={loginImageUrl} alt="KNFC Login"
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
            ) : (
              <video key={loginVideoUrl || "default"} ref={videoRef} autoPlay muted playsInline
                onEnded={()=>setVideoEnded(true)} onTimeUpdate={handleTimeUpdate}
                className="hero-vid" style={{width:"100%",height:"100%",objectFit:"cover"}}>
                <source src={loginVideoUrl || knfcHeroVideo} type="video/mp4"/>
              </video>
            )}
            <div className="video-overlay"/>
          </div>

          {/* Desktop brand header */}
          <div className="brand-header-top">
            <div className="logo-sq">
              <img src="/KNFC-logo.svg" alt="KNFC" width="28" height="28" style={{objectFit:"contain",borderRadius:"4px"}}/>
            </div>
            <div className="interactive-text">
              {BRAND_DATA.map((item,i)=>(
                <div key={i} className="char-box" onMouseEnter={onLetterEnter} onMouseLeave={onLetterLeave}>
                  <span className="char-text">{item.char}</span>
                  <span className="char-svg">{item.icon}</span>
                  <div className="char-underline"/>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop animated content */}
          <div className="auth-left-content">
            {videoEnded && (
              <div className="smash-portal-wrapper">
                <div className="main-brand-circle">
                  {smashWords.map((_,i)=>(
                    <div key={i} className={`dish-slot slot-${i}${hoveredIndex===i?" active":""}`}>
                      <img src={`/assets/image/dishes/dish-${i}.png`} alt="dish" className="dish-ring-img"
                        onError={e=>{e.currentTarget.style.display="none";}}/>
                    </div>
                  ))}
                </div>
                <div className="smash-container">
                  {smashWords.map((word,i)=>(
                    <div key={i} ref={el=>(wordRefs.current[i]=el)} className="word-wrapper"
                      onMouseEnter={()=>setHoveredIndex(i)} onMouseLeave={()=>setHoveredIndex(null)}>
                      <span className="smash-text">{word}</span>
                    </div>
                  ))}
                  <div className="smash-subtext"><p>Fresh. Crispy. Made with love.</p></div>
                </div>
              </div>
            )}
          </div>
        </div>}

        {/* ═══ RIGHT — form ═══ */}
        <div className="auth-right" style={step === "otp" ? { width:"100%", maxWidth:"480px", display:"flex", alignItems:"center", justifyContent:"center" } : {}}>
          <div ref={formRef} className="auth-form-inner" style={step === "otp" ? { width:"100%" } : {}}>

            {step === "phone" && (
              <>
                <h1 className="form-title">Welcome Back</h1>
                <p className="form-sub">Enter your name and phone number to get started.</p>
                <form onSubmit={handleSend} autoComplete="off">
                  <label className="input-label">Your name</label>
                  <div className="input-wrap" style={{marginBottom:"14px"}}>
                    <input type="text" value={name} onChange={e=>setName(e.target.value)}
                      placeholder="e.g. Ravi Kumar" className="input-field" autoComplete="name"/>
                  </div>

                  <label className="input-label">Phone number</label>
                  <div className="phone-row" style={{marginBottom:"14px"}}>
                    <div className="country-wrapper">
                      <select value={countryCode} onChange={e=>setCountryCode(e.target.value)} className="country-sel" >
                        {COUNTRIES.map(c=><option style={{color:"var(--t1)", backgroundColor:"var(--bg)"}} key={c.code} value={c.code}>{c.code} {c.name}</option>)}
                      </select>
                      <svg className="sel-caret" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                      placeholder="98765 43210" className="input-field phone-input" autoComplete="tel"/>
                  </div>

                  <div className="terms-row">
                    <label className="terms-check-label">
                      <input type="checkbox" checked={agreedTerms} onChange={e=>setAgreedTerms(e.target.checked)} className="terms-checkbox"/>
                      <span className="terms-check-box" aria-hidden="true">
                        {agreedTerms && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      <span className="terms-text">
                        I agree to the{" "}
                        <button type="button" className="terms-link" onClick={()=>setModalType("terms")}>Terms of Service</button>
                        {" "}and{" "}
                        <button type="button" className="terms-link" onClick={()=>setModalType("privacy")}>Privacy Policy</button>
                      </span>
                    </label>
                  </div>

                  {error && <Alert type="error">{error}</Alert>}
                  <button type="submit" disabled={loading} className="btn btn-p btn-xl btn-full">
                    {loading ? "Sending…" : "Send OTP →"}
                  </button>
                </form>
              </>
            )}

            {step === "otp" && (
              <>
                {/* Brand mark — full-page OTP */}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", marginBottom:"var(--s6)" }}>
                  <img src="/KNFC-logo.svg" alt="KNFC" width="96" height="96"
                    style={{ objectFit:"contain", borderRadius:"20px", boxShadow:"0 10px 32px rgba(232,82,26,.30)" }}/>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.75rem", fontWeight:900, letterSpacing:"-.04em", color:"var(--t1)", lineHeight:1 }}>
                      KN<span style={{ color:"#E8521A" }}>FC</span>
                    </div>
                    <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".18em", textTransform:"uppercase", color:"var(--t3)", marginTop:"4px" }}>
                      Fried Chicken Shop
                    </div>
                  </div>
                </div>

                <button onClick={()=>setStep("phone")} style={{ background:"none", border:"none", color:"var(--t3)", cursor:"pointer", marginBottom:"16px", padding:0, fontSize:".875rem", display:"flex", alignItems:"center", gap:"4px" }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Back
                </button>
                <h1 className="form-title" style={{ textAlign:"center" }}>Verify your number</h1>
                <p className="form-sub" style={{ textAlign:"center" }}>
                  Check WhatsApp on{" "}
                  <span style={{ fontWeight:700, color:"var(--t1)" }}>{country.code} {phone}</span>
                  {" "}for the 6-digit code
                </p>
                {info   && <Alert type="info">{info}</Alert>}
                {error  && <Alert type="error">{error}</Alert>}
                {devOtp && <Alert type="success">Dev OTP: <strong>{devOtp}</strong></Alert>}
                <form onSubmit={handleVerify}>
                  <div style={{display:"flex",gap:"8px",justifyContent:"center",marginBottom:"10px"}}>
                    {otp.map((digit,i)=>(
                      <input key={i} ref={el=>(otpRefs.current[i]=el)}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        autoComplete={i===0?"one-time-code":"off"}
                        onChange={e=>handleOtpChange(i,e)} onKeyDown={e=>handleOtpKeyDown(i,e)}
                        onPaste={handleOtpPaste} className="otp-box"
                        style={{borderColor:digit?"var(--brand)":"var(--bd)"}}/>
                    ))}
                  </div>

                  {/* Paste OTP — tap Copy Code in WhatsApp then tap this */}
                  <div style={{textAlign:"center",marginBottom:"14px"}}>
                    <button type="button" onClick={handlePasteOtp}
                      style={{background:"none",border:"1px solid var(--bd)",borderRadius:"8px",
                              color:"var(--t2)",cursor:"pointer",fontSize:".8rem",
                              padding:"6px 16px",display:"inline-flex",alignItems:"center",gap:"6px",
                              transition:"border-color .2s,color .2s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.color="var(--brand)";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.color="var(--t2)";}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="2" width="6" height="4" rx="1"/>
                        <path d="M17 4h1a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h1"/>
                      </svg>
                      Paste OTP from WhatsApp
                    </button>
                  </div>

                  <button id="otp-submit-btn" type="submit" disabled={loading||otp.join("").length<6} className="btn btn-p btn-xl btn-full">
                    {loading ? "Verifying…" : "Verify & continue →"}
                  </button>
                </form>
                <div style={{textAlign:"center",marginTop:"14px",fontSize:".875rem",color:"var(--t3)"}}>
                  {resend > 0 ? <span>Resend in {resend}s</span>
                    : <button onClick={handleResend} style={{color:"var(--brand)",background:"none",border:"none",cursor:"pointer"}}>Resend OTP</button>}
                </div>
              </>
            )}

            <div className="powered-by">
              Powered by{" "}
              <a href="https://edartx.com" target="_blank" rel="noopener noreferrer" className="powered-link">Edartx.com</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}