/**
 * AdminPages.jsx — Redesigned
 * - Single navigation (Header only, no duplicate sidebar nav)
 * - Fully responsive (mobile → tablet → desktop)
 * - Clean tab-bar navigation inside pages
 * - BranchDashboard + SuperAdminDashboard
 */
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { gsap } from "gsap";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/layout/Header";
import axiosClient from "../../api/axiosClient";
import { formatPrice, formatTime } from "../../utils/format";

/* ─── Inline responsive styles injected once ─────────────────────────── */
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --nav-h: 60px;
    --tab-h: 52px;
    --page-px: clamp(16px, 4vw, 48px);
    --page-py: 28px;
    --radius: 14px;
    --radius-sm: 8px;
    --radius-xs: 6px;
    --card-bg: var(--bgc, #fff);
    --gap: 16px;
    --gap-lg: 24px;
    --transition: 180ms cubic-bezier(.4,0,.2,1);
    --font-body: var(--ff-b, 'DM Sans', sans-serif);
    --font-display: var(--ff-d, 'Syne', sans-serif);
  }

  /* ── Page shell ── */
  .adm-shell {
    min-height: 100vh;
    padding-top: var(--nav-h);
    background: var(--bg, #f5f5f5);
    display: flex;
    flex-direction: column;
  }
  /* SuperAdmin uses row layout with sidebar */
  .adm-shell.adm-shell--row {
    flex-direction: row;
    padding-top: 0;
    min-height: calc(100vh - var(--nav-h));
    margin-top: var(--nav-h);
  }

  /* ── Tab bar ── */
  .adm-tabs {
    position: sticky;
    top: var(--nav-h);
    z-index: 100;
    background: var(--bgc, #fff);
    border-bottom: 1px solid var(--bd, #e5e7eb);
    display: flex;
    align-items: stretch;
    padding: 0 var(--page-px);
    gap: 4px;
    height: var(--tab-h);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .adm-tabs::-webkit-scrollbar { display: none; }

  .adm-tab-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: .875rem;
    font-weight: 500;
    color: var(--t3, #6b7280);
    white-space: nowrap;
    border-bottom: 2.5px solid transparent;
    transition: all var(--transition);
    text-decoration: none;
    flex-shrink: 0;
    margin-bottom: -1px;
  }
  .adm-tab-btn:hover { color: var(--t1, #111); background: var(--bg2, #f9fafb); border-radius: var(--radius-sm) var(--radius-sm) 0 0; }
  .adm-tab-btn.active { color: var(--brand, #e8490f); border-bottom-color: var(--brand, #e8490f); font-weight: 700; }
  .adm-tab-btn .tab-icon { font-size: 1rem; opacity: .7; }
  .adm-tab-btn.active .tab-icon { opacity: 1; }

  .adm-tab-badge {
    background: var(--err, #e24b4a);
    color: #fff;
    font-size: .5625rem;
    font-weight: 800;
    padding: 2px 5px;
    border-radius: 20px;
    letter-spacing: .02em;
  }

  /* ── Page content ── */
  .adm-content {
    flex: 1;
    padding: var(--page-py) var(--page-px);
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
  }

  /* ── Page header ── */
  .adm-page-hdr {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .adm-page-title {
    font-family: var(--font-display);
    font-size: clamp(1.375rem, 3vw, 2rem);
    font-weight: 900;
    letter-spacing: -.025em;
    line-height: 1.1;
  }
  .adm-page-sub {
    font-size: .875rem;
    color: var(--t3, #6b7280);
    margin-top: 4px;
  }
  .adm-eyebrow {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--t3, #6b7280);
    margin-bottom: 4px;
  }

  /* ── Stats grid ── */
  .adm-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--gap);
    margin-bottom: var(--gap-lg);
  }
  @media (max-width: 1023px) { .adm-stats { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 479px)  { .adm-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; } }

  .adm-stat {
    position: relative;
    background: var(--bgc, #fff);
    border: 1px solid var(--bd, #e5e7eb);
    border-radius: var(--radius);
    padding: 18px 20px 16px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
    transition: box-shadow var(--transition), transform var(--transition);
  }
  .adm-stat:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); transform: translateY(-1px); }
  .adm-stat-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: var(--radius) var(--radius) 0 0; }
  .adm-stat-lbl { font-size: .6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--t3, #6b7280); margin-bottom: 8px; }
  .adm-stat-val { font-family: var(--font-display); font-size: clamp(1.25rem, 2.5vw, 1.75rem); font-weight: 900; line-height: 1; margin-bottom: 4px; }
  .adm-stat-sub { font-size: .75rem; color: var(--t3, #6b7280); }

  /* ── Cards ── */
  .adm-card {
    background: var(--bgc, #fff);
    border: 1px solid var(--bd, #e5e7eb);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
  }
  .adm-card-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid var(--bd, #e5e7eb);
    background: var(--bg2, #f9fafb);
    gap: 12px;
    flex-wrap: wrap;
  }
  .adm-card-title { font-family: var(--font-display); font-size: .9375rem; font-weight: 800; }

  /* ── Overview grid ── */
  .adm-overview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--gap-lg);
  }
  @media (max-width: 767px) { .adm-overview { grid-template-columns: 1fr; } }

  /* ── Quick actions ── */
  .adm-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--gap);
  }
  @media (max-width: 479px) { .adm-actions { grid-template-columns: 1fr; } }

  .adm-action-btn {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px;
    background: var(--bg2, #f9fafb);
    border: 1.5px solid var(--bd, #e5e7eb);
    border-radius: var(--radius);
    text-align: left;
    cursor: pointer;
    transition: all var(--transition);
    font-family: var(--font-body);
    text-decoration: none;
    color: var(--t1, #111);
  }
  .adm-action-btn:hover {
    background: var(--bgc, #fff);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,.08);
  }
  .adm-action-icon { font-size: 1.625rem; }
  .adm-action-label { font-size: .875rem; font-weight: 700; margin-bottom: 2px; }
  .adm-action-desc { font-size: .75rem; color: var(--t3, #6b7280); }

  /* ── Table rows ── */
  .adm-row {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid var(--bd, #e5e7eb);
    gap: 12px;
    transition: background var(--transition);
    cursor: default;
  }
  .adm-row:last-child { border-bottom: none; }
  .adm-row:hover { background: var(--bg2, #f9fafb); }

  /* ── Staff grid header / row ── */
  .staff-grid { display: grid; grid-template-columns: 1fr 120px 100px 90px 80px 60px; gap: 12px; align-items: center; padding: 12px 20px; }
  @media (max-width: 900px) { .staff-grid { grid-template-columns: 1fr 90px 80px 60px; } .staff-col-userid, .staff-col-branch { display: none !important; } }
  @media (max-width: 600px) { .staff-grid { grid-template-columns: 1fr 70px 52px; gap: 8px; } .staff-col-status { display: none !important; } }

  /* ── Branch card ── */
  .adm-branch-card {
    background: var(--bgc, #fff);
    border: 1px solid var(--bd, #e5e7eb);
    border-radius: var(--radius);
    padding: 20px 24px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
    transition: box-shadow var(--transition);
  }
  .adm-branch-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.08); }
  .adm-branch-mini-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 16px;
  }
  @media (max-width: 600px) { .adm-branch-mini-stats { grid-template-columns: repeat(2, 1fr); } }
  .adm-branch-hdr {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  /* ── Badges ── */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: .625rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
  .badge-ok   { background: rgba(29,158,117,.12); color: var(--ok, #1d9e75); }
  .badge-err  { background: rgba(226,75,74,.1);  color: var(--err, #e24b4a); }
  .badge-warn { background: rgba(251,191,36,.15); color: #b45309; }
  .badge-p    { background: rgba(232,73,15,.1);   color: var(--brand, #e8490f); }

  /* ── Toggle ── */
  .adm-toggle { position: relative; width: 36px; height: 20px; border-radius: 20px; border: none; cursor: pointer; transition: background var(--transition); flex-shrink: 0; }
  .adm-toggle.on  { background: var(--brand, #e8490f); }
  .adm-toggle.off { background: var(--bd, #d1d5db); }
  .adm-toggle-knob { position: absolute; top: 3px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: left var(--transition); box-shadow: 0 1px 3px rgba(0,0,0,.2); }
  .adm-toggle.on  .adm-toggle-knob { left: 19px; }
  .adm-toggle.off .adm-toggle-knob { left: 3px; }

  /* ── Buttons ── */
  .adm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); border: none; cursor: pointer; font-family: var(--font-body); font-size: .875rem; font-weight: 600; transition: all var(--transition); white-space: nowrap; text-decoration: none; }
  .adm-btn-primary { background: var(--brand, #e8490f); color: #fff; }
  .adm-btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(232,73,15,.3); }
  .adm-btn-ghost { background: var(--bg2, #f9fafb); color: var(--t2, #374151); border: 1px solid var(--bd, #e5e7eb); }
  .adm-btn-ghost:hover { background: var(--bg3, #f3f4f6); }
  .adm-btn-danger { background: rgba(226,75,74,.1); color: var(--err, #e24b4a); border: 1px solid rgba(226,75,74,.2); }
  .adm-btn-danger:hover { background: rgba(226,75,74,.18); }
  .adm-btn-sm { padding: 5px 10px; font-size: .8125rem; border-radius: var(--radius-xs); }
  .adm-btn-ico { padding: 6px; border-radius: var(--radius-xs); background: var(--bg2, #f9fafb); border: 1px solid var(--bd, #e5e7eb); color: var(--t3, #6b7280); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--transition); }
  .adm-btn-ico:hover { color: var(--err, #e24b4a); border-color: rgba(226,75,74,.3); background: rgba(226,75,74,.06); }

  /* ── Inputs ── */
  .adm-input-wrap { display: flex; align-items: center; gap: 8px; background: var(--bg2, #f9fafb); border: 1.5px solid var(--bd, #e5e7eb); border-radius: var(--radius-sm); padding: 0 12px; height: 44px; transition: border-color var(--transition); }
  .adm-input-wrap:focus-within { border-color: var(--brand, #e8490f); background: var(--bgc, #fff); }
  .adm-input-wrap.err { border-color: var(--err, #e24b4a); }
  .adm-input-wrap input { flex: 1; border: none; background: transparent; font-family: var(--font-body); font-size: .9375rem; color: var(--t1, #111); outline: none; min-width: 0; }
  .adm-input-wrap input::placeholder { color: var(--t4, #9ca3af); }
  .adm-field-lbl { display: block; font-size: .75rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--t3, #6b7280); margin-bottom: 6px; }
  .adm-field-err { font-size: .75rem; color: var(--err, #e24b4a); margin-top: 3px; }
  .adm-textarea { width: 100%; background: var(--bg2, #f9fafb); border: 1.5px solid var(--bd, #e5e7eb); border-radius: var(--radius-sm); padding: 10px 12px; font-family: var(--font-body); font-size: .9375rem; color: var(--t1, #111); outline: none; resize: vertical; transition: border-color var(--transition); }
  .adm-textarea:focus { border-color: var(--brand, #e8490f); background: var(--bgc, #fff); }
  .adm-select { height: 44px; background: var(--bg2, #f9fafb); border: 1.5px solid var(--bd, #e5e7eb); border-radius: var(--radius-sm); padding: 0 12px; font-family: var(--font-body); font-size: .875rem; color: var(--t1, #111); outline: none; cursor: pointer; transition: border-color var(--transition); }
  .adm-select:focus { border-color: var(--brand, #e8490f); }

  /* ── Modal ── */
  .adm-modal-overlay { position: fixed; inset: 0; z-index: 400; background: rgba(0,0,0,.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .adm-modal { width: 100%; max-width: 520px; background: var(--bgc, #fff); border-radius: var(--radius); box-shadow: 0 24px 64px rgba(0,0,0,.25); overflow: hidden; max-height: calc(100vh - 32px); display: flex; flex-direction: column; }
  .adm-modal-hdr { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--bd, #e5e7eb); background: var(--bg2, #f9fafb); flex-shrink: 0; gap: 12px; }
  .adm-modal-title { font-family: var(--font-display); font-size: 1.0625rem; font-weight: 800; }
  .adm-modal-sub { font-size: .8125rem; color: var(--t3, #6b7280); margin-top: 2px; }
  .adm-modal-body { padding: 24px; overflow-y: auto; flex: 1; }

  /* ── Status pill ── */
  .adm-status-pill { display: flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 20px; font-size: .8125rem; font-weight: 700; white-space: nowrap; }
  .adm-status-pill.open { background: rgba(29,158,117,.1); color: var(--ok, #1d9e75); border: 1px solid rgba(29,158,117,.25); }
  .adm-status-pill.closed { background: rgba(226,75,74,.1); color: var(--err, #e24b4a); border: 1px solid rgba(226,75,74,.25); }
  .adm-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  /* ── Error box ── */
  .adm-err-box { display: flex; align-items: center; gap: 8px; padding: 12px 14px; background: rgba(226,75,74,.07); border: 1px solid rgba(226,75,74,.2); border-radius: var(--radius-sm); margin-bottom: 16px; font-size: .875rem; color: var(--err, #e24b4a); }

  /* ── Toast ── */
  .adm-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 600; background: var(--t1, #111); color: var(--bg, #fff); padding: 10px 20px; border-radius: 20px; font-size: .875rem; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,.25); white-space: nowrap; pointer-events: none; }

  /* ── Skeleton ── */
  .skel { background: linear-gradient(90deg, var(--bg2, #f3f4f6) 25%, var(--bg3, #e9eaeb) 50%, var(--bg2, #f3f4f6) 75%); background-size: 200% 100%; animation: skel-shine 1.4s infinite; border-radius: var(--radius-sm); }
  @keyframes skel-shine { 0%{ background-position: 200% 0 } 100%{ background-position: -200% 0 } }

  /* ── Empty state ── */
  .adm-empty { text-align: center; padding: 56px 24px; background: var(--bg2, #f9fafb); border-radius: var(--radius); border: 2px dashed var(--bd, #e5e7eb); }
  .adm-empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
  .adm-empty-title { font-family: var(--font-display); font-size: 1.0625rem; font-weight: 700; margin-bottom: 6px; }
  .adm-empty-sub { font-size: .875rem; color: var(--t3, #6b7280); margin-bottom: 16px; }

  /* ── Hours grid ── */
  .hours-grid { display: grid; grid-template-columns: 56px 1fr 1fr 68px; gap: 10px; align-items: center; }
  @media (max-width: 480px) { .hours-grid { grid-template-columns: 48px 1fr 1fr 52px; gap: 6px; } }
  .hours-time-input { border: 1.5px solid var(--bd, #e5e7eb); border-radius: var(--radius-xs); background: var(--bg2, #f9fafb); color: var(--t1, #111); padding: 6px 8px; font-size: .875rem; font-family: var(--font-body); outline: none; width: 100%; }
  .hours-time-input:focus { border-color: var(--brand, #e8490f); background: var(--bgc, #fff); }

  /* ── Two-col form grid ── */
  .adm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 480px) { .adm-form-grid { grid-template-columns: 1fr; } }

  /* ── QR panel ── */
  .adm-qr-inner { display: flex; align-items: flex-start; gap: 28px; padding: 20px; flex-wrap: wrap; }

  /* ── Confirm modal ── */
  .adm-confirm { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .adm-confirm-box { width: 100%; max-width: 360px; background: var(--bgc, #fff); border-radius: var(--radius); padding: 28px; box-shadow: 0 24px 64px rgba(0,0,0,.2); }

  /* ── Mini stat box ── */
  .mini-stat { background: var(--bg2, #f9fafb); border: 1px solid var(--bd, #e5e7eb); border-radius: var(--radius-sm); padding: 12px 14px; text-align: center; }
  .mini-stat-val { font-family: var(--font-display); font-size: 1.25rem; font-weight: 900; line-height: 1.1; }
  .mini-stat-lbl { font-size: .6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--t3, #6b7280); margin-top: 3px; }

  /* ── Avatar ── */
  .adm-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--brand, #e8490f), #c23d0c); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; color: #fff; font-size: .875rem; flex-shrink: 0; }

  /* ── Responsive helpers ── */
  @media (max-width: 767px) {
    .adm-page-hdr { flex-direction: column; }
    .adm-page-hdr > *:last-child { width: 100%; }
    .adm-branch-hdr > *:last-child { width: 100%; justify-content: flex-start; }
  }

  /* ── Sidebar ── */
  .adm-sidebar {
    width: 220px;
    flex-shrink: 0;
    height: calc(100vh - var(--nav-h));
    position: sticky;
    top: var(--nav-h);
    overflow-y: auto;
    border-right: 1px solid var(--bd, #e5e7eb);
    background: var(--bgc, #fff);
    display: flex;
    flex-direction: column;
    scrollbar-width: none;
    z-index: 10;
  }
  .adm-sidebar::-webkit-scrollbar { display: none; }

  .adm-sidebar-profile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 16px 14px;
    border-bottom: 1px solid var(--bd, #e5e7eb);
    flex-shrink: 0;
  }

  .adm-sidebar-nav {
    flex: 1;
    padding: 10px 0;
    display: flex;
    flex-direction: column;
  }

  .adm-sidebar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 18px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: .875rem;
    font-weight: 500;
    color: var(--t2, #374151);
    width: 100%;
    text-align: left;
    transition: all var(--transition);
    text-decoration: none;
    white-space: nowrap;
    position: relative;
    border-radius: 0;
  }
  .adm-sidebar-item:hover { color: var(--t1, #111); background: var(--bg2, #f9fafb); }
  .adm-sidebar-item.active { color: var(--brand, #e8490f); background: rgba(232,73,15,.07); font-weight: 700; }
  .adm-sidebar-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    background: var(--brand, #e8490f);
    border-radius: 0 3px 3px 0;
  }
  .adm-sidebar-icon { font-size: 1rem; flex-shrink: 0; width: 20px; text-align: center; }

  .adm-sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 9;
    background: rgba(0,0,0,.45);
    backdrop-filter: blur(2px);
  }

  /* ── Main area ── */
  .adm-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /* ── Mobile topbar (hamburger) ── */
  .adm-mobile-topbar {
    display: none;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--bd, #e5e7eb);
    background: var(--bgc, #fff);
    position: sticky;
    top: var(--nav-h);
    z-index: 8;
    flex-shrink: 0;
  }
  .adm-hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--bd, #e5e7eb);
    border-radius: var(--radius-sm);
    background: var(--bg2, #f9fafb);
    cursor: pointer;
    color: var(--t1, #111);
    flex-shrink: 0;
    transition: all var(--transition);
  }
  .adm-hamburger:hover { background: var(--bg3, #f3f4f6); }

  /* ── Table ── */
  .adm-table-wrap {
    width: 100%;
    overflow-x: auto;
    border: 1px solid var(--bd, #e5e7eb);
    border-radius: var(--radius);
    -webkit-overflow-scrolling: touch;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
  }
  .adm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: .875rem;
  }
  .adm-table thead tr { background: var(--bg2, #f9fafb); }
  .adm-table th {
    padding: 11px 16px;
    text-align: left;
    font-size: .625rem;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--t3, #6b7280);
    border-bottom: 1px solid var(--bd, #e5e7eb);
    white-space: nowrap;
  }
  .adm-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--bd, #e5e7eb);
    vertical-align: middle;
    color: var(--t1, #111);
  }
  .adm-table tbody tr:last-child td { border-bottom: none; }
  .adm-table tbody tr:hover { background: var(--bg2, #f9fafb); }

  /* ── Payment filter bar ── */
  .adm-filter-bar {
    display: flex;
    gap: var(--gap);
    flex-wrap: wrap;
    margin-bottom: var(--gap-lg);
    align-items: flex-end;
  }
  .adm-filter-group { display: flex; flex-direction: column; gap: 5px; }
  @media (max-width: 600px) {
    .adm-filter-bar { flex-direction: column; }
    .adm-filter-bar > * { width: 100%; }
    .adm-filter-group .adm-select,
    .adm-filter-group .adm-input-wrap { width: 100%; }
  }

  /* ── Mobile sidebar breakpoint ── */
  @media (max-width: 900px) {
    .adm-sidebar {
      position: fixed;
      left: -240px;
      top: var(--nav-h);
      bottom: 0;
      height: auto;
      width: 240px;
      z-index: 10;
      transition: left .25s cubic-bezier(.4,0,.2,1);
    }
    .adm-sidebar.open { left: 0; box-shadow: 4px 0 28px rgba(0,0,0,.18); }
    .adm-mobile-topbar { display: flex; }
    .adm-shell--row .adm-content { padding-top: var(--page-py); }
  }
`;

/* ─── Inject / update CSS ────────────────────────────────────────────── */
{
  let _s = document.getElementById("adm-global-css");
  if (!_s) { _s = document.createElement("style"); _s.id = "adm-global-css"; document.head.appendChild(_s); }
  _s.textContent = GLOBAL_CSS;
}

/* ─── Icons ──────────────────────────────────────────────────────────── */
const Ic = {
  X:      () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>,
  Plus:   () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/></svg>,
  User:   () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Mail:   () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Alert:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>,
  Trash:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  Search: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>,
  Loc:    () => <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Home:   () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Info:   () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>,
  Check:  () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
};

/* ─── Small helpers ──────────────────────────────────────────────────── */
const FL = ({ children, req }) => (
  <label className="adm-field-lbl">{children}{req && <span style={{ color: "var(--err)", marginLeft: 3 }}>*</span>}</label>
);
const FE = ({ msg }) => msg ? <p className="adm-field-err">{msg}</p> : null;
const ErrBox = ({ msg }) => !msg ? null : (
  <div className="adm-err-box"><Ic.Alert />{msg}</div>
);

/* ─── Modal ──────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, subtitle, children, width = "520px" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open || !ref.current) return;
    gsap.fromTo(ref.current, { opacity: 0, scale: .96, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: .25, ease: "power2.out" });
  }, [open]);
  if (!open) return null;
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div ref={ref} className="adm-modal" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        <div className="adm-modal-hdr">
          <div>
            <div className="adm-modal-title">{title}</div>
            {subtitle && <div className="adm-modal-sub">{subtitle}</div>}
          </div>
          <button className="adm-btn-ico" onClick={onClose}><Ic.X /></button>
        </div>
        <div className="adm-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState("");
  const show = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const el = toast ? <div className="adm-toast">{toast}</div> : null;
  return [el, show];
}

/* ─── Toggle ─────────────────────────────────────────────────────────── */
function Toggle({ on, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`adm-toggle ${on ? "on" : "off"}`}
      style={{ opacity: disabled ? .35 : 1 }}>
      <div className="adm-toggle-knob" />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STAFF MANAGER
═══════════════════════════════════════════════════════════════════════════ */
function StaffManager({ branchId, branches = [], isSuperAdmin }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterB, setFilterB] = useState(branchId || "");
  const [confirm, setConfirm] = useState(null);
  const [toggling, setToggling] = useState({});
  const [ToastEl, showToast] = useToast();
  const listRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (isSuperAdmin && filterB) params.branch_id = filterB;
      const r = await axiosClient.get("/auth/admin/staff-list/", { params });
      setStaff(r.data.staff || []);
    } catch { setStaff([]); }
    finally { setLoading(false); }
  }, [filterB, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  // Poll every 30s so on-duty status refreshes without manual reload
  useEffect(() => {
    const t = setInterval(() => load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (loading || !listRef.current) return;
    gsap.fromTo(listRef.current.querySelectorAll(".staff-anim"),
      { opacity: 0, x: -6 }, { opacity: 1, x: 0, stagger: .03, duration: .28, ease: "power2.out" });
  }, [loading]);

  const handleToggle = async (member, field) => {
    const key = `${member.id}_${field}`;
    setToggling(t => ({ ...t, [key]: true }));
    try {
      await axiosClient.patch(`/auth/admin/staff-list/${member.id}/`, { [field]: !member[field] });
      showToast(`${member.name} updated`);
      load();
    } catch { showToast("Update failed."); }
    finally { setToggling(t => ({ ...t, [key]: false })); }
  };

  const handleDeactivate = async () => {
    if (!confirm) return;
    try {
      await axiosClient.delete(`/auth/admin/staff-list/${confirm.id}/`);
      showToast(`${confirm.name} deactivated.`);
      setConfirm(null); load();
    } catch { showToast("Failed."); setConfirm(null); }
  };

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !s.user_id_login.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 800 }}>Staff accounts</h2>
          <p style={{ fontSize: ".8125rem", color: "var(--t3)", marginTop: 3 }}>
            {filtered.filter(s => s.is_active).length} active · {filtered.filter(s => !s.is_active).length} inactive
          </p>
        </div>
        <Link to="/admin/staff/create" className="adm-btn adm-btn-primary"><Ic.Plus /> Add staff</Link>
      </div>

      {/* Mini stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total", value: filtered.length, color: "var(--t1)" },
          { label: "Active", value: filtered.filter(s => s.is_active && s.is_verified).length, color: "var(--ok)" },
          { label: "Unverified", value: filtered.filter(s => s.is_active && !s.is_verified).length, color: "#b45309" },
          { label: "On duty", value: filtered.filter(s => s.is_on_duty).length, color: "var(--brand)" },
        ].map(s => (
          <div key={s.label} className="mini-stat">
            <div className="mini-stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="mini-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="adm-input-wrap" style={{ flex: 1, minWidth: 200 }}>
          <Ic.Search />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ID, email…" />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", fontSize: 16, padding: 0 }}>×</button>}
        </div>
        {isSuperAdmin && branches.length > 0 && (
          <select value={filterB} onChange={e => setFilterB(e.target.value)} className="adm-select">
            <option value="">All branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skel" style={{ height: 60 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
          <div className="adm-empty-title">{search ? `No results for "${search}"` : "No staff yet"}</div>
          {!search && <Link to="/admin/staff/create" className="adm-btn adm-btn-primary" style={{ marginTop: 8 }}><Ic.Plus /> Add first staff</Link>}
        </div>
      ) : (
        <div ref={listRef} className="adm-card">
          {/* Header row */}
          <div className="staff-grid" style={{ background: "var(--bg2)", borderBottom: "1px solid var(--bd)" }}>
            {["Staff member", "User ID", isSuperAdmin ? "Branch" : "Role", "Status", "On duty", ""].map((h, i) => (
              <div key={i} className={`staff-col-${["name","userid","branch","status","duty","actions"][i]}`}
                style={{ fontSize: ".5625rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--t4)", textAlign: i > 1 ? "center" : "left" }}>{h}</div>
            ))}
          </div>

          {filtered.map((s, idx) => (
            <div key={s.id} className="staff-grid staff-anim"
              style={{ borderBottom: idx < filtered.length - 1 ? "1px solid var(--bd)" : "none", transition: "background var(--transition)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div className="adm-avatar">{s.name[0].toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: ".875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: ".75rem", color: "var(--t3)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Ic.Mail />{s.email || "—"}
                  </div>
                </div>
              </div>

              {/* User ID */}
              <div className="staff-col-userid" style={{ textAlign: "center" }}>
                <code style={{ fontSize: ".75rem", fontWeight: 700, padding: "2px 7px", background: "var(--bg2)", borderRadius: 6, border: "1px solid var(--bd)", color: "var(--brand)" }}>
                  {s.user_id_login || "—"}
                </code>
              </div>

              {/* Branch/Role */}
              <div className="staff-col-branch" style={{ fontSize: ".8125rem", color: "var(--t3)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isSuperAdmin ? s.branch_name : "Staff"}
              </div>

              {/* Status */}
              <div className="staff-col-status" style={{ textAlign: "center" }}>
                <span className={`badge ${s.is_active ? (s.is_verified ? "badge-ok" : "badge-warn") : "badge-err"}`}>
                  {s.is_active ? (s.is_verified ? "Active" : "Unverified") : "Inactive"}
                </span>
              </div>

              {/* On duty */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Toggle on={s.is_on_duty} onClick={() => handleToggle(s, "is_on_duty")}
                  disabled={toggling[`${s.id}_is_on_duty`] || !s.is_active} />
              </div>

              {/* Delete */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                {s.is_active ? (
                  <button onClick={() => setConfirm(s)} className="adm-btn-ico" title="Deactivate"><Ic.Trash /></button>
                ) : (
                  <span style={{ fontSize: ".75rem", color: "var(--t4)" }}>—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm deactivate */}
      {confirm && (
        <div className="adm-confirm" onClick={() => setConfirm(null)}>
          <div className="adm-confirm-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.0625rem", fontWeight: 700, marginBottom: 8 }}>Deactivate account?</h3>
            <p style={{ fontSize: ".9375rem", color: "var(--t3)", marginBottom: 20, lineHeight: 1.6 }}>
              <strong>{confirm.name}</strong> ({confirm.user_id_login}) will no longer be able to log in.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDeactivate} className="adm-btn adm-btn-primary" style={{ flex: 1, background: "var(--err)", justifyContent: "center" }}>Deactivate</button>
              <button onClick={() => setConfirm(null)} className="adm-btn adm-btn-ghost" style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {ToastEl}
    </div>
  );
}

/* ─── Shop Hours Panel ───────────────────────────────────────────────── */
const DAYS = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
const DEFAULT_DAY = { open: "09:00", close: "22:00", closed: false };

function ShopHoursPanel({ hours, isOpen, loading, branchId, onUpdated }) {
  const [saving, setSaving] = useState(false);
  const [localSched, setLocalSched] = useState(() => {
    const s = {};
    DAYS.forEach(([k]) => { s[k] = { ...DEFAULT_DAY }; });
    return s;
  });
  const [extendMin, setExtendMin] = useState("60");
  const [showExtend, setShowExtend] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync from server whenever hours prop changes (initial load or after external update)
  useEffect(() => {
    if (!hours || dirty) return;
    const schedule = hours.schedule || {};
    const s = {};
    DAYS.forEach(([k]) => { s[k] = schedule[k] ? { ...schedule[k] } : { ...DEFAULT_DAY }; });
    setLocalSched(s);
  }, [hours]);

  const updateDay = (day, field, val) => {
    setLocalSched(s => ({ ...s, [day]: { ...s[day], [field]: val } }));
    setDirty(true);
  };

  const saveSchedule = async () => {
    if (!branchId) return;
    setSaving(true);
    try {
      const r = await axiosClient.patch(`/branches/${branchId}/hours/`, { schedule: localSched });
      onUpdated(r.data.operating_hours || {}, r.data.is_open_now ?? true);
      setDirty(false);
    } catch { }
    finally { setSaving(false); }
  };

  const handleExtend = async () => {
    if (!branchId) return;
    const until = new Date(Date.now() + parseInt(extendMin) * 60 * 1000).toISOString();
    setSaving(true);
    try {
      const r = await axiosClient.patch(`/branches/${branchId}/hours/`, { manual_override: "open", override_until: until });
      onUpdated(r.data.operating_hours || {}, r.data.is_open_now ?? true);
      setShowExtend(false);
    } catch { }
    finally { setSaving(false); }
  };

  return (
    <div className="adm-card" style={{ marginTop: 24 }}>
      <div className="adm-card-hdr">
        <div className="adm-card-title">Operating hours</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isOpen && (
            <button onClick={() => setShowExtend(v => !v)} className="adm-btn adm-btn-ghost adm-btn-sm">
              Extend hours
            </button>
          )}
          <button onClick={saveSchedule} disabled={saving} className="adm-btn adm-btn-primary adm-btn-sm" style={{ opacity: saving ? .6 : 1 }}>
            {saving ? "Saving…" : "Save schedule"}
          </button>
        </div>
      </div>

      {showExtend && (
        <div style={{ padding: "12px 20px", background: "rgba(55,138,221,.05)", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: ".875rem", color: "var(--t2)", fontWeight: 600 }}>Stay open for</span>
          {[30, 60, 90, 120].map(m => (
            <button key={m} onClick={() => setExtendMin(String(m))}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${extendMin === String(m) ? "var(--brand)" : "var(--bd)"}`, background: extendMin === String(m) ? "rgba(232,73,15,.08)" : "var(--bg2)", cursor: "pointer", fontSize: ".875rem", fontWeight: 700, color: extendMin === String(m) ? "var(--brand)" : "var(--t2)", fontFamily: "var(--font-body)" }}>
              {m < 60 ? `${m}m` : `${m / 60}h`}
            </button>
          ))}
          <button onClick={handleExtend} disabled={saving} className="adm-btn adm-btn-primary adm-btn-sm">Confirm</button>
        </div>
      )}

      <div style={{ padding: "16px 20px" }}>
        <div className="hours-grid" style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--bd)" }}>
          {["Day", "Opens (IST)", "Closes (IST)", "Closed?"].map(h => (
            <div key={h} style={{ fontSize: ".5625rem", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t4)", textAlign: h === "Closed?" ? "center" : "left" }}>{h}</div>
          ))}
        </div>
        {DAYS.map(([key, label]) => {
          const d = localSched[key] || DEFAULT_DAY;
          return (
            <div key={key} className="hours-grid" style={{ padding: "8px 0", borderBottom: "1px solid var(--bd)", opacity: d.closed ? .4 : 1, transition: "opacity var(--transition)" }}>
              <div style={{ fontWeight: 700, fontSize: ".9375rem" }}>{label}</div>
              <input type="time" value={d.open} disabled={d.closed} onChange={e => updateDay(key, "open", e.target.value)} className="hours-time-input" />
              <input type="time" value={d.close} disabled={d.closed} onChange={e => updateDay(key, "close", e.target.value)} className="hours-time-input" />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Toggle on={d.closed} onClick={() => updateDay(key, "closed", !d.closed)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── QR Panel ───────────────────────────────────────────────────────── */
function BranchQRPanel({ branchId, branchName }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegen] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    axiosClient.get(`/branches/${branchId}/qr/`).then(r => setQrUrl(r.data.qr_url)).catch(() => { }).finally(() => setLoading(false));
  }, [branchId]);

  const handleRegenerate = async () => {
    setRegen(true);
    try { const r = await axiosClient.post(`/branches/${branchId}/qr/`); setQrUrl(r.data.qr_url); }
    catch { }
    finally { setRegen(false); }
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl; a.download = `${branchName || "branch"}-qr.png`; a.target = "_blank"; a.click();
  };

  return (
    <div className="adm-card" style={{ marginTop: 24 }}>
      <div className="adm-card-hdr">
        <div className="adm-card-title">Table QR code</div>
        <div style={{ display: "flex", gap: 8 }}>
          {qrUrl && <button onClick={handleDownload} className="adm-btn adm-btn-ghost adm-btn-sm">⬇ Download</button>}
          <button onClick={handleRegenerate} disabled={regenerating} className="adm-btn adm-btn-primary adm-btn-sm" style={{ opacity: regenerating ? .6 : 1 }}>
            {regenerating ? "…" : "Regenerate"}
          </button>
        </div>
      </div>
      <div className="adm-qr-inner">
        {loading ? (
          <div className="skel" style={{ width: 148, height: 148, borderRadius: 12, flexShrink: 0 }} />
        ) : qrUrl ? (
          <img src={qrUrl} alt="Branch QR" style={{ width: 148, height: 148, borderRadius: 12, border: "3px solid var(--bd)", background: "#fff", flexShrink: 0 }} loading="lazy" />
        ) : (
          <div style={{ width: 148, height: 148, borderRadius: 12, border: "2px dashed var(--bd)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t4)", fontSize: ".875rem", flexShrink: 0 }}>No QR yet</div>
        )}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.0625rem", fontWeight: 800, marginBottom: 8 }}>{branchName}</div>
          <p style={{ fontSize: ".875rem", color: "var(--t3)", lineHeight: 1.65, marginBottom: 12 }}>
            Customers scan this QR to open your menu directly on their phone. Place it on tables, entrance, or packaging.
          </p>
          <code style={{ fontSize: ".75rem", color: "var(--t4)", background: "var(--bg2)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--bd)" }}>
            /menu?branch_id={branchId?.slice(0, 8)}…
          </code>
        </div>
      </div>
    </div>
  );
}

/* ─── Order Modes Panel ──────────────────────────────────────────────── */
function OrderModesPanel({ branchId, enablePickup, enableDineIn, pickupUpiOnly, onUpdated }) {
  const [saving, setSaving] = useState(null);

  const toggle = async (field, value) => {
    if (!branchId) return;
    setSaving(field);
    try {
      await axiosClient.patch(`/branches/${branchId}/`, { [field]: value });
      onUpdated(field, value);
    } catch { }
    finally { setSaving(null); }
  };

  const bothOff = !enablePickup && !enableDineIn;

  return (
    <div className="adm-card" style={{ marginTop: 24 }}>
      <div className="adm-card-hdr">
        <div className="adm-card-title">Order modes</div>
        <div style={{ fontSize: ".75rem", color: "var(--t4)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Admin only</div>
      </div>
      <div style={{ padding: "4px 20px 20px" }}>
        {[
          { field: "enable_dine_in",   label: "Dine-in",          desc: "Customers order at a table inside the branch",         on: enableDineIn   },
          { field: "enable_pickup",    label: "Pickup",            desc: "Customers collect their order at the counter",         on: enablePickup   },
          { field: "pickup_upi_only",  label: "Pickup — UPI only", desc: "Force UPI payment for all pickup orders (hides Cash)", on: pickupUpiOnly, disabled: !enablePickup },
        ].map(({ field, label, desc, on, disabled }, i) => (
          <div key={field} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: i < 2 ? "1px solid var(--bd)" : "none", opacity: disabled ? .45 : 1 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: ".9375rem", display: "flex", alignItems: "center", gap: 8 }}>
                {label}
                <span style={{ fontSize: ".6875rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: on ? "var(--ok-t)" : "var(--bg3)", color: on ? "var(--ok)" : "var(--t4)", border: "1px solid " + (on ? "rgba(29,158,117,.2)" : "var(--bd)") }}>
                  {on ? "ON" : "OFF"}
                </span>
              </div>
              <div style={{ fontSize: ".8125rem", color: "var(--t3)", marginTop: 3 }}>{desc}</div>
            </div>
            <Toggle on={on} disabled={saving !== null || disabled} onClick={() => !disabled && toggle(field, !on)} />
          </div>
        ))}
        {bothOff && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--err-t)", borderRadius: "var(--radius-sm)", fontSize: ".8125rem", color: "var(--err)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg> Both modes are off — customers cannot place any orders
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BRANCH DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
export function BranchDashboard() {
  const { user } = useAuth();
  const { loading: pageLoading } = usePageLoader(900);
  const statsRef = useRef(null);
  const [ToastEl, showToast] = useToast();

  const [data, setData] = useState({ orders: [], revenue: 0, alerts: 0, out: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [hours, setHours] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [enablePickup,  setEnablePickup]  = useState(true);
  const [enableDineIn,  setEnableDineIn]  = useState(true);
  const [pickupUpiOnly, setPickupUpiOnly] = useState(false);

  const loadHours = useCallback(async () => {
    if (!user?.branch_id) return;
    try {
      const r = await axiosClient.get(`/branches/${user.branch_id}/hours/`);
      setHours(r.data.operating_hours || {}); setIsOpen(r.data.is_open_now ?? true);
      setEnablePickup(r.data.enable_pickup ?? true);
      setEnableDineIn(r.data.enable_dine_in ?? true);
      setPickupUpiOnly(r.data.pickup_upi_only ?? false);
    } catch { }
  }, [user?.branch_id]);

  const handleOverride = async (override) => {
    if (!user?.branch_id) return;
    setHoursLoading(true);
    try {
      const r = await axiosClient.patch(`/branches/${user.branch_id}/hours/`, { manual_override: override, override_until: null });
      setHours(r.data.operating_hours || {}); setIsOpen(r.data.is_open_now ?? true);
    } catch { }
    finally { setHoursLoading(false); }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [oR, sR] = await Promise.all([
          axiosClient.get(`/orders/admin/?date=${new Date().toISOString().slice(0, 10)}`).catch(() => ({ data: { orders: [], total_revenue: 0 } })),
          axiosClient.get("/stock/").catch(() => ({ data: { alert_count: 0, out_of_stock: 0 } })),
        ]);
        setData({ orders: oR.data.orders || [], revenue: oR.data.total_revenue || 0, alerts: sR.data.alert_count || 0, out: sR.data.out_of_stock || 0 });
      } finally { setLoading(false); }
    };
    load(); loadHours();
  }, [loadHours]);

  useEffect(() => {
    if (loading || !statsRef.current) return;
    gsap.fromTo(statsRef.current.children, { y: 12, opacity: 0 }, { y: 0, opacity: 1, stagger: .06, duration: .35, ease: "power2.out" });
  }, [loading]);

  if (pageLoading) return <KNCLoader visible label="Loading dashboard…" />;


  return (
    <>
      <Header />
      <div className="adm-shell">
        {/* ── Main content ── */}
        <div className="adm-content">
          {/* Page header */}
          <div className="adm-page-hdr">
            <div>
              <div className="adm-eyebrow">{user?.branch_name || "Branch"}</div>
              <h1 className="adm-page-title">
                {tab === "overview" ? "Dashboard" : tab === "staff" ? "Staff manager" : "Orders today"}
              </h1>
              <p className="adm-page-sub">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {data.alerts > 0 && tab !== "stock" && (
                <Link to="/staff/stock" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "rgba(226,75,74,.08)", border: "1px solid rgba(226,75,74,.2)", borderRadius: 20, color: "var(--err)", fontWeight: 700, fontSize: ".8125rem", textDecoration: "none" }}>
                  <Ic.Alert />{data.alerts} alert{data.alerts !== 1 ? "s" : ""}
                </Link>
              )}
              <div className={`adm-status-pill ${isOpen ? "open" : "closed"}`}>
                <div className="adm-dot" style={{ background: isOpen ? "var(--ok)" : "var(--err)" }} />
                {isOpen ? "Shop Open" : "Shop Closed"}
              </div>
              <button onClick={() => handleOverride(isOpen ? "closed" : "open")} disabled={hoursLoading}
                className="adm-btn adm-btn-ghost" style={{ opacity: hoursLoading ? .6 : 1 }}>
                {hoursLoading ? "…" : isOpen ? "Force close" : "Force open"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div ref={statsRef} className="adm-stats">
            {[
              { label: "Revenue today",  value: formatPrice(data.revenue),   color: "var(--brand)", sub: "All order types" },
              { label: "Orders today",   value: data.orders.length,          color: "var(--info)",  sub: `${data.orders.filter(o => o.status !== "cancelled").length} successful` },
              { label: "Stock alerts",   value: data.alerts,                 color: data.alerts > 0 ? "var(--err)" : "var(--ok)", sub: data.out > 0 ? `${data.out} out of stock` : "All stocked" },
              { label: "Avg order",      value: data.orders.length ? formatPrice(data.revenue / data.orders.length) : "—", color: "#b45309", sub: "Per order today" },
            ].map(s => (
              <div key={s.label} className="adm-stat">
                <div className="adm-stat-bar" style={{ background: `linear-gradient(90deg,${s.color},transparent)` }} />
                <div className="adm-stat-lbl">{s.label}</div>
                <div className="adm-stat-val" style={{ color: s.color }}>{s.value}</div>
                <div className="adm-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <>
              <div className="adm-overview" style={{ marginBottom: 24 }}>
                {/* Quick actions */}
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: ".9375rem", fontWeight: 700, marginBottom: 14, color: "var(--t2)" }}>Quick actions</div>
                  <div className="adm-actions">
                    {[
                      { label: "Menu manager",  desc: "Items & categories", icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>, isLink: true, to: "/admin/menu" },
                      { label: "Staff manager", desc: "Accounts & shifts",  icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, onClick: () => setTab("staff") },
                      { label: "Order history", desc: "Today's orders",     icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>, onClick: () => setTab("orders") },
                      { label: "Stock",         desc: "Top up & alerts",    icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>, isLink: true, to: "/staff/stock" },
                    ].map(a =>
                      a.isLink
                        ? <Link key={a.label} to={a.to} className="adm-action-btn">
                          <span className="adm-action-icon">{a.icon}</span>
                          <div>
                            <div className="adm-action-label">{a.label}</div>
                            <div className="adm-action-desc">{a.desc}</div>
                          </div>
                        </Link>
                        : <button key={a.label} onClick={a.onClick} className="adm-action-btn">
                          <span className="adm-action-icon">{a.icon}</span>
                          <div>
                            <div className="adm-action-label">{a.label}</div>
                            <div className="adm-action-desc">{a.desc}</div>
                          </div>
                        </button>
                    )}
                  </div>
                </div>

                {/* Recent orders */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: ".9375rem", fontWeight: 700, color: "var(--t2)" }}>Recent orders</div>
                    {data.orders.length > 0 && <button onClick={() => setTab("orders")} style={{ fontSize: ".8125rem", color: "var(--brand)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>View all →</button>}
                  </div>
                  <div className="adm-card">
                    {loading
                      ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 52 }} />)}</div>
                      : data.orders.length === 0
                        ? <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--t3)", fontSize: ".875rem" }}>No orders today yet</div>
                        : data.orders.slice(0, 6).map((o, i) => (
                          <div key={o.id} className="adm-row">
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: ".875rem", padding: "3px 10px", borderRadius: 6, background: "var(--brand)", color: "#fff", minWidth: 40, textAlign: "center", flexShrink: 0 }}>{o.token_number}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: ".875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.customer_name}</div>
                              <div style={{ fontSize: ".75rem", color: "var(--t3)" }}>{o.item_count} items · {o.order_type === "dine_in" ? `T${o.table_number}` : "Pickup"}</div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontWeight: 700, color: "var(--brand)", fontSize: ".9375rem" }}>{formatPrice(o.total)}</div>
                              <div style={{ fontSize: ".6875rem", color: "var(--t3)" }}>{o.status_display}</div>
                            </div>
                          </div>
                        ))
                    }
                  </div>
                </div>
              </div>

              <ShopHoursPanel hours={hours} isOpen={isOpen} loading={hoursLoading} branchId={user?.branch_id}
                onUpdated={(h, o) => { setHours(h); setIsOpen(o); }} />
              <OrderModesPanel pickupUpiOnly={pickupUpiOnly}
                branchId={user?.branch_id}
                enablePickup={enablePickup}
                enableDineIn={enableDineIn}
                onUpdated={(field, val) => {
                  if (field === "enable_pickup")   setEnablePickup(val);
                  else if (field === "enable_dine_in") setEnableDineIn(val);
                  else if (field === "pickup_upi_only") setPickupUpiOnly(val);
                }}
              />
              <BranchQRPanel branchId={user?.branch_id} branchName={user?.branch_name} />
            </>
          )}

          {/* ── STAFF ── */}
          {tab === "staff" && <StaffManager branchId={user?.branch_id} isSuperAdmin={false} />}

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 800 }}>Today's orders</h2>
                <Link to="/staff/queue" className="adm-btn adm-btn-primary adm-btn-sm">Open live queue →</Link>
              </div>
              <div className="adm-card">
                {data.orders.length === 0
                  ? <div style={{ padding: "56px 20px", textAlign: "center", color: "var(--t3)" }}>No orders today yet.</div>
                  : data.orders.map((o, i) => (
                    <div key={o.id} className="adm-row">
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: ".875rem", padding: "4px 12px", borderRadius: 6, background: "var(--brand)", color: "#fff", flexShrink: 0 }}>{o.token_number}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.customer_name}</div>
                        <div style={{ fontSize: ".8125rem", color: "var(--t3)" }}>{o.item_count} items · {o.order_type === "dine_in" ? `Dine-in T${o.table_number}` : "Pickup"} · {formatTime(o.created_at)}</div>
                      </div>
                      <span className={`badge ${o.status === "completed" ? "badge-ok" : o.status === "cancelled" ? "badge-err" : o.status === "ready" ? "badge-p" : "badge-warn"}`}>
                        {o.status_display || o.status}
                      </span>
                      <div style={{ fontWeight: 700, color: "var(--brand)", fontSize: ".9375rem", flexShrink: 0 }}>{formatPrice(o.total)}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
      {ToastEl}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUPER ADMIN DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════
   SUPERADMIN TAB COMPONENTS
   ══════════════════════════════════════════════════════════════════ */

/* ── Users Tab ─────────────────────────────────────────────────── */
function SuperAdminUsersTab() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [role,    setRole]    = useState("all");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = {};
    if (role !== "all") params.role = role;
    if (search)         params.search = search;
    axiosClient.get("/auth/admin/users/", { params })
      .then(r => setUsers(r.data.users || []))
      .catch(e => setError(e.response?.data?.error || "Failed to load users"))
      .finally(() => setLoading(false));
  }, [role]);

  // Client-side search filter (debounced by typing)
  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const ROLE_COLORS = {
    customer:     "var(--info)",
    staff:        "var(--ok)",
    branch_admin: "var(--warn)",
    super_admin:  "var(--brand)"
  };

  if (error) return (
    <div style={{ padding:"var(--s6)", textAlign:"center" }}>
      <div style={{ marginBottom:"var(--s3)", display:"flex", justifyContent:"center" }}><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg></div>
      <div style={{ color:"var(--err)", fontWeight:700, marginBottom:"var(--s2)" }}>{error}</div>
      <div style={{ color:"var(--t3)", fontSize:".875rem" }}>
        If you see a database column error, run: <code style={{ background:"var(--bg2)", padding:"2px 8px", borderRadius:"4px" }}>python manage.py migrate</code>
      </div>
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ display:"flex", gap:"var(--s3)", marginBottom:"var(--s4)", flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:"var(--s1)", flexWrap:"wrap" }}>
          {["all","customer","staff","branch_admin"].map(r => (
            <button key={r} onClick={() => setRole(r)}
              style={{ padding:"6px 14px", borderRadius:"var(--rf)", border:`1.5px solid ${role===r?"var(--brand)":"var(--bd)"}`, background:role===r?"var(--brand-tint)":"var(--bg2)", color:role===r?"var(--brand)":"var(--t2)", fontWeight:role===r?700:500, fontSize:".8125rem", cursor:"pointer", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)" }}>
              {r === "all" ? "All" : r === "branch_admin" ? "Admins" : r.charAt(0).toUpperCase()+r.slice(1)+"s"}
            </button>
          ))}
        </div>
        <div style={{ flex:1, minWidth:"200px", display:"flex", alignItems:"center", gap:"var(--s2)", border:"1px solid var(--bd)", borderRadius:"var(--r2)", padding:"0 var(--s3)", background:"var(--bg2)" }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone…"
            style={{ flex:1, border:"none", background:"transparent", padding:"9px 0", fontSize:".875rem", outline:"none", color:"var(--t1)" }}/>
          {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t4)", fontSize:"16px" }}>×</button>}
        </div>
        <span style={{ fontSize:".8125rem", color:"var(--t3)", flexShrink:0 }}>{filtered.length} users</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skel" style={{ height:"60px", borderRadius:"var(--r3)" }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
          <div className="adm-empty-title">No users found</div>
          <div className="adm-empty-sub">{search ? "Try a different search" : "No users in this category yet"}</div>
        </div>
      ) : (
        <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
          {/* Header */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr", gap:"var(--s3)", padding:"10px var(--s4)", background:"var(--bg3)", borderBottom:"1px solid var(--bd)", fontSize:".75rem", fontWeight:700, color:"var(--t3)", textTransform:"uppercase", letterSpacing:".06em" }}>
            <span>Name</span><span>Contact</span><span>Role</span><span>Points</span><span>Duty</span><span>Last Login</span>
          </div>
          {filtered.map((u, i) => (
            <div key={u.id} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr", gap:"var(--s3)", padding:"12px var(--s4)", borderTop:i>0?"1px solid var(--bd)":"none", alignItems:"center", fontSize:".875rem" }}>
              <div>
                <div style={{ fontWeight:600, color:"var(--t1)" }}>{u.name || "—"}</div>
                {u.user_id_login && <div style={{ fontSize:".75rem", color:"var(--t4)" }}>ID: {u.user_id_login}</div>}
              </div>
              <div>
                <div style={{ color:"var(--t2)", fontSize:".875rem" }}>{u.email || u.phone || "—"}</div>
                {u.email && u.phone && <div style={{ fontSize:".75rem", color:"var(--t4)" }}>{u.phone}</div>}
              </div>
              <span style={{ fontSize:".75rem", fontWeight:700, padding:"3px 9px", borderRadius:"var(--rf)", background:`${ROLE_COLORS[u.role] || "var(--t3)"}18`, color:ROLE_COLORS[u.role] || "var(--t3)", display:"inline-block" }}>
                {u.role?.replace(/_/g," ")}
              </span>
              <span style={{ fontWeight:600, color:"var(--brand)" }}>{u.loyalty_points ?? 0} pts</span>
              <span style={{ fontSize:".75rem", fontWeight:700, color:u.is_on_duty ? "var(--ok)" : "var(--t4)" }}>
                {u.is_on_duty ? "● On" : "○ Off"}
              </span>
              <span style={{ fontSize:".75rem", color:"var(--t3)" }}>
                {u.last_login
                  ? new Date(u.last_login).toLocaleDateString("en-IN", { day:"numeric", month:"short" }) + " " +
                    new Date(u.last_login).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })
                  : "Never"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Stock History Tab ─────────────────────────────────────────── */
function SuperAdminStockTab({ branches }) {
  const [records,   setRecords]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [branchId,  setBranchId]  = useState(branches[0]?.id || "");
  const [dateFrom,  setDateFrom]  = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0,10);
  });
  const [dateTo,    setDateTo]    = useState(new Date().toISOString().slice(0,10));

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    axiosClient.get("/stock/history/", { params:{ branch_id:branchId, date_from:dateFrom, date_to:dateTo } })
      .then(r => setRecords(r.data.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [branchId, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!branchId && branches.length) setBranchId(branches[0].id);
  }, [branches]);

  return (
    <div>
      {/* Stock Refill CTA */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"var(--s3)", marginBottom:"var(--s4)", padding:"var(--s3) var(--s4)", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)" }}>
        <div>
          <div style={{ fontWeight:700, fontSize:".9375rem" }}>Stock History</div>
          <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>View past stock records. To top up or set opening stock, use Stock Refill.</div>
        </div>
        <a href="/superadmin/stock" style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"9px 18px", borderRadius:"var(--r2)", background:"var(--brand)", color:"#fff", fontWeight:700, fontSize:".875rem", textDecoration:"none", whiteSpace:"nowrap", flexShrink:0 }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <line x1="12" y1="9" x2="12" y2="15"/><line x1="9" y1="12" x2="15" y2="12"/>
          </svg>
          Stock Refill
        </a>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:"var(--s3)", marginBottom:"var(--s4)", flexWrap:"wrap", alignItems:"flex-end" }}>
        <div>
          <div style={{ fontSize:".75rem", fontWeight:600, color:"var(--t3)", marginBottom:"4px" }}>Branch</div>
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            style={{ padding:"9px var(--s3)", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t1)", fontSize:".875rem", cursor:"pointer", outline:"none" }}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:".75rem", fontWeight:600, color:"var(--t3)", marginBottom:"4px" }}>From</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding:"9px var(--s3)", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t1)", fontSize:".875rem" }}/>
        </div>
        <div>
          <div style={{ fontSize:".75rem", fontWeight:600, color:"var(--t3)", marginBottom:"4px" }}>To</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding:"9px var(--s3)", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t1)", fontSize:".875rem" }}/>
        </div>
        <button onClick={load} style={{ padding:"9px 18px", borderRadius:"var(--r2)", border:"none", background:"var(--brand)", color:"#fff", fontWeight:700, fontSize:".875rem", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"60px" }}/>)}
        </div>
      ) : records.length === 0 ? (
        <div className="adm-empty"><div className="adm-empty-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg></div><div className="adm-empty-title">No stock records</div><div className="adm-empty-sub">Stock records appear once items are topped up for the day.</div></div>
      ) : (
        <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr 1fr 1fr", gap:"var(--s2)", padding:"10px var(--s4)", background:"var(--bg3)", borderBottom:"1px solid var(--bd)", fontSize:".75rem", fontWeight:700, color:"var(--t3)", textTransform:"uppercase", letterSpacing:".06em" }}>
            <span>Item</span><span>Date</span><span>Opening</span><span>Added</span><span>Total</span><span>Used</span><span>Remaining</span>
          </div>
          {records.map((r, i) => {
            const pct = r.today_stock > 0 ? Math.round((r.remaining_stock / r.today_stock) * 100) : 0;
            const statusColor = pct === 0 ? "var(--err)" : pct < 25 ? "var(--warn)" : "var(--ok)";
            return (
              <div key={r.id || i} style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr 1fr 1fr", gap:"var(--s2)", padding:"12px var(--s4)", borderTop:i>0?"1px solid var(--bd)":"none", alignItems:"center", fontSize:".875rem" }}>
                <div style={{ fontWeight:600 }}>{r.menu_item_name}</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)" }}>{r.date}</div>
                <div style={{ color:"var(--t3)" }}>{r.opening_stock || 0}</div>
                <div style={{ color:"var(--info)", fontWeight:600 }}>+{r.new_stock_added || 0}</div>
                <div style={{ fontWeight:700 }}>{r.today_stock || 0}</div>
                <div style={{ color:"var(--err)" }}>{r.used_stock || 0}</div>
                <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)" }}>
                  <span style={{ fontWeight:700, color:statusColor }}>{r.remaining_stock || 0}</span>
                  <span style={{ fontSize:".6875rem", color:statusColor }}>({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Redemptions Tab ───────────────────────────────────────────── */
function SuperAdminRedemptionsTab() {
  const [redemptions, setRedemptions] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    axiosClient.get("/offers/admin/redemptions/")
      .then(r => setRedemptions(r.data.redemptions || []))
      .catch(() => setRedemptions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"60px" }}/>)}
        </div>
      ) : redemptions.length === 0 ? (
        <div className="adm-empty"><div className="adm-empty-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg></div><div className="adm-empty-title">No redemptions yet</div><div className="adm-empty-sub">Offer redemptions will appear here once customers start using offers.</div></div>
      ) : (
        <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr", gap:"var(--s3)", padding:"10px var(--s4)", background:"var(--bg3)", borderBottom:"1px solid var(--bd)", fontSize:".75rem", fontWeight:700, color:"var(--t3)", textTransform:"uppercase", letterSpacing:".06em" }}>
            <span>Offer</span><span>Customer</span><span>Savings</span><span>Order</span><span>Date</span>
          </div>
          {redemptions.map((r, i) => (
            <div key={r.id || i} style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr", gap:"var(--s3)", padding:"12px var(--s4)", borderTop:i>0?"1px solid var(--bd)":"none", alignItems:"center", fontSize:".875rem" }}>
              <div>
                <div style={{ fontWeight:600 }}>{r.offer_name}</div>
                <div style={{ fontSize:".75rem", color:"var(--t4)" }}>{r.offer_type}</div>
              </div>
              <div style={{ color:"var(--t2)" }}>{r.customer_name || "Guest"}</div>
              <div style={{ fontWeight:700, color:"var(--ok)" }}>₹{r.savings}</div>
              <div style={{ fontSize:".8125rem", color:"var(--brand)" }}>#{r.order_token || "—"}</div>
              <div style={{ fontSize:".75rem", color:"var(--t3)" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Settings Tab helpers — module-level so React never remounts on re-render ── */
const SettingsCtx = React.createContext(null);

function SettingsSection({ title, children }) {
  return (
    <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", padding:"var(--s5)", marginBottom:"var(--s4)" }}>
      <h3 style={{ fontWeight:800, fontSize:"1rem", marginBottom:"var(--s4)", color:"var(--t1)" }}>{title}</h3>
      {children}
    </div>
  );
}
function SettingsRow({ label, help, children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:"var(--s3)", marginBottom:"var(--s3)", borderBottom:"1px solid var(--bd)" }}>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:".9375rem" }}>{label}</div>
        {help && <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:"2px" }}>{help}</div>}
      </div>
      <div style={{ flexShrink:0, marginLeft:"var(--s4)" }}>{children}</div>
    </div>
  );
}
function SettingsToggle({ k }) {
  const { form, set } = React.useContext(SettingsCtx);
  return (
    <button type="button" onClick={() => set(k, !form[k])} style={{ width:"48px", height:"26px", borderRadius:"13px", background:form[k]?"var(--ok)":"var(--bg3)", border:`1px solid ${form[k]?"var(--ok)":"var(--bd)"}`, position:"relative", cursor:"pointer", transition:"all .2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:"3px", width:"18px", height:"18px", borderRadius:"50%", background:"#fff", left:form[k]?"26px":"3px", transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.25)" }}/>
    </button>
  );
}
function SettingsNum({ k, min, max, step=1, suffix="" }) {
  const { form, set } = React.useContext(SettingsCtx);
  const isFloat = step < 1;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
      <input type="number" min={min} max={max} step={step}
        value={form[k] ?? 0}
        onChange={e => {
          const raw = e.target.value;
          const v = isFloat ? parseFloat(raw) : parseInt(raw, 10);
          set(k, isNaN(v) ? 0 : Math.min(max, Math.max(min, v)));
        }}
        style={{ width:"80px", padding:"7px 10px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".9375rem", fontWeight:700, textAlign:"center", outline:"none" }}/>
      {suffix && <span style={{ fontSize:".875rem", color:"var(--t3)" }}>{suffix}</span>}
    </div>
  );
}

/* ── Settings Tab (SiteConfig — SuperAdmin only) ───────────────── */
function SuperAdminSettingsTab() {
  const [cfg,       setCfg]       = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveErr,   setSaveErr]   = useState("");
  const [form,      setForm]      = useState(null);
  const [loginImg,  setLoginImg]  = useState(null);
  const [imgPreview,setImgPreview]= useState(null);
  const [clearImg,  setClearImg]  = useState(false);

  useEffect(() => {
    axiosClient.get("/branches/config/")
      .then(r => { setCfg(r.data.config); setForm(r.data.config); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const handleImgChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoginImg(file);
    setClearImg(false);
    const reader = new FileReader();
    reader.onload = ev => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleClearImg = () => {
    setLoginImg(null); setImgPreview(null); setClearImg(true);
  };

  const save = async () => {
    setSaving(true); setSaved(false); setSaveErr("");
    try {
      // Sanitise: replace NaN/null numbers with 0 before sending
      const payload = { ...form };
      ["loyalty_earn_rate","loyalty_redeem_rate","loyalty_min_redeem","loyalty_redeem_step",
       "loyalty_max_redeem_pct","spin_max_uses","scratch_discount_pct","scratch_max_uses"].forEach(k => {
        if (payload[k] == null || (typeof payload[k] === "number" && isNaN(payload[k]))) payload[k] = 0;
      });
      if (!payload.scratch_coupon_code?.trim()) payload.scratch_coupon_code = "SCRATCH15";
      await axiosClient.patch("/branches/config/", payload);
      if (loginImg || clearImg) {
        const fd = new FormData();
        if (loginImg) fd.append("login_image", loginImg);
        if (clearImg) fd.append("login_image_clear", "true");
        await axiosClient.patch("/branches/config/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setCfg(payload); setForm(payload); setSaved(true);
      setLoginImg(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveErr(e.response?.data?.error || e.response?.data?.detail || "Save failed — please try again.");
    }
    finally { setSaving(false); }
  };

  if (loading || !form) return <div style={{ padding:"var(--s6)", textAlign:"center", color:"var(--t3)" }}>Loading settings…</div>;

  const updatePrize = (i, k, v) => set("spin_prizes", (form.spin_prizes||[]).map((p, j) => j===i ? {...p,[k]:v} : p));
  const removePrize = i => set("spin_prizes", (form.spin_prizes||[]).filter((_, j) => j!==i));
  const addPrize    = () => set("spin_prizes", [...(form.spin_prizes||[]), { label:"New Prize", emoji:"🎁", color:"#6B7280", prob:0.10, discount_pct:0 }]);

  return (
    <SettingsCtx.Provider value={{ form, set }}>
    <div>
      {/* Loyalty */}
      <SettingsSection title="Loyalty Programme">
        <SettingsRow label="Enable loyalty points" help="Master switch — turns off all earning and redemption if disabled"><SettingsToggle k="loyalty_enabled"/></SettingsRow>
        <SettingsRow label="Earn rate" help="Points earned per ₹1 spent on each order"><SettingsNum k="loyalty_earn_rate" min={0} max={100} step={0.1} suffix="pts / ₹1"/></SettingsRow>
        <SettingsRow label="Redeem rate" help="₹ value of 1 loyalty point (e.g. 0.10 = 100 pts = ₹10)"><SettingsNum k="loyalty_redeem_rate" min={0} max={1} step={0.01} suffix="₹ / pt"/></SettingsRow>
        <SettingsRow label="Minimum to redeem" help="Minimum points required in one transaction"><SettingsNum k="loyalty_min_redeem" min={0} max={10000} suffix="pts"/></SettingsRow>
        <SettingsRow label="Redeem step" help="Points must be in multiples of this number"><SettingsNum k="loyalty_redeem_step" min={1} max={1000} suffix="pts"/></SettingsRow>
        <SettingsRow label="Max redeem %" help="Max % of order total payable by loyalty points"><SettingsNum k="loyalty_max_redeem_pct" min={0} max={100} suffix="%"/></SettingsRow>
      </SettingsSection>

      {/* Spin Wheel */}
      <SettingsSection title="Spin-the-Wheel Game">
        <SettingsRow label="Enable spin wheel" help="Show spin wheel on customer Offers page"><SettingsToggle k="spin_enabled"/></SettingsRow>
        <SettingsRow label="Max spins per customer per day" help="0 = unlimited"><SettingsNum k="spin_max_uses" min={0} max={10}/></SettingsRow>
        <SettingsRow label="Prizes" help="Each segment on the wheel — label, emoji, colour, probability % (all should total ~100%), discount %">
          <div style={{ display:"flex", flexDirection:"column", gap:"6px", width:"100%", maxWidth:"520px" }}>
            {/* Column headers */}
            <div style={{ display:"flex", gap:"6px", alignItems:"center", fontSize:".6875rem", fontWeight:700, color:"var(--t3)", textTransform:"uppercase", letterSpacing:".05em", paddingBottom:"2px" }}>
              <div style={{ width:"34px" }}>Colour</div>
              <div style={{ flex:2 }}>Label</div>
              <div style={{ width:"44px", textAlign:"center" }}>Emoji</div>
              <div style={{ width:"58px", textAlign:"center" }}>Prob %</div>
              <div style={{ width:"58px", textAlign:"center" }}>Disc %</div>
              <div style={{ width:"28px" }}/>
            </div>
            {(form.spin_prizes||[]).map((p, i) => (
              <div key={i} style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                <input type="color" value={p.color||"#999999"} onChange={e => updatePrize(i,"color",e.target.value)}
                  style={{ width:"34px", height:"32px", padding:"2px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", cursor:"pointer", background:"var(--bg)" }}/>
                <input type="text" value={p.label||""} placeholder="5% OFF"
                  onChange={e => updatePrize(i,"label",e.target.value)}
                  style={{ flex:2, padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".8125rem", outline:"none" }}/>
                <input type="text" value={p.emoji||""} placeholder="🎁" maxLength={4}
                  onChange={e => updatePrize(i,"emoji",e.target.value)}
                  style={{ width:"44px", padding:"6px 4px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:"1rem", textAlign:"center", outline:"none" }}/>
                <input type="number" min={1} max={100} value={Math.round((p.prob||0)*100)}
                  onChange={e => updatePrize(i,"prob", Math.min(1, Math.max(0, (parseInt(e.target.value,10)||0)/100)))}
                  style={{ width:"58px", padding:"6px 4px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".8125rem", textAlign:"center", outline:"none" }}/>
                <input type="number" min={0} max={100} value={p.discount_pct ?? p.pct ?? 0}
                  onChange={e => updatePrize(i,"discount_pct", parseInt(e.target.value,10)||0)}
                  style={{ width:"58px", padding:"6px 4px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".8125rem", textAlign:"center", outline:"none" }}/>
                <button type="button" onClick={() => removePrize(i)}
                  style={{ width:"28px", height:"32px", borderRadius:"var(--r2)", border:"1px solid rgba(226,75,74,.3)", background:"var(--err-t)", color:"var(--err)", cursor:"pointer", fontSize:"1rem", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={addPrize}
              style={{ padding:"6px 14px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg)", color:"var(--t2)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, alignSelf:"flex-start", marginTop:"2px" }}>
              + Add prize
            </button>
            <div style={{ fontSize:".75rem", color:"var(--t4)", marginTop:"2px" }}>
              Prob % total: <strong style={{ color: Math.abs((form.spin_prizes||[]).reduce((s,p)=>s+(p.prob||0),0)-1) < 0.02 ? "var(--ok)" : "var(--err)" }}>
                {Math.round((form.spin_prizes||[]).reduce((s,p)=>s+(p.prob||0),0)*100)}%
              </strong> (should equal 100%)
            </div>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Scratch Card */}
      <SettingsSection title="Scratch Coupon Game">
        <SettingsRow label="Enable scratch card" help="Show scratch card on customer Offers page"><SettingsToggle k="scratch_enabled"/></SettingsRow>
        <SettingsRow label="Discount %" help="Percentage discount revealed by scratch card"><SettingsNum k="scratch_discount_pct" min={1} max={100} suffix="%"/></SettingsRow>
        <SettingsRow label="Max uses per customer per day" help="0 = unlimited"><SettingsNum k="scratch_max_uses" min={0} max={10}/></SettingsRow>
        <SettingsRow label="Coupon code" help="Code customer enters at cart to redeem">
          <input value={form.scratch_coupon_code ?? ""} onChange={e => set("scratch_coupon_code", e.target.value.toUpperCase())}
            maxLength={20} autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
            style={{ padding:"8px 12px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".9375rem", fontWeight:700, fontFamily:"monospace", letterSpacing:".08em", width:"140px", outline:"none", textTransform:"uppercase" }}/>
        </SettingsRow>
      </SettingsSection>

      {/* Login Page */}
      <SettingsSection title="Login Page">
        <SettingsRow label="Login background image" help="Shown on the customer login page. Replaces the default hero video on mobile.">
          <div style={{ display:"flex", flexDirection:"column", gap:"8px", alignItems:"flex-start" }}>
            {(imgPreview || (form.login_image_url && !clearImg)) && (
              <img src={imgPreview || form.login_image_url} alt="Login bg"
                style={{ width:"160px", height:"90px", objectFit:"cover", borderRadius:"var(--r3)", border:"1px solid var(--bd)" }}/>
            )}
            <div style={{ display:"flex", gap:"8px" }}>
              <label style={{ padding:"6px 14px", borderRadius:"var(--r2)", border:"1.5px solid var(--bd)", background:"var(--bg)", color:"var(--t2)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--ff-b)" }}>
                {loginImg ? loginImg.name.slice(0,20) : "Choose image"}
                <input type="file" accept="image/*" onChange={handleImgChange} style={{ display:"none" }}/>
              </label>
              {(imgPreview || (form.login_image_url && !clearImg)) && (
                <button type="button" onClick={handleClearImg}
                  style={{ padding:"6px 12px", borderRadius:"var(--r2)", border:"1px solid rgba(226,75,74,.3)", background:"var(--err-t)", color:"var(--err)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--ff-b)" }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </SettingsRow>
        <SettingsRow label="Login hero video URL" help="Direct link to an MP4 video for the desktop login hero. Leave blank to use the default KNFC video.">
          <input value={form.login_video_url || ""} onChange={e => set("login_video_url", e.target.value)}
            placeholder="https://…/your-video.mp4"
            style={{ width:"280px", padding:"8px 12px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none" }}/>
        </SettingsRow>
      </SettingsSection>

      {/* Save */}
      <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
        <button type="button" onClick={save} disabled={saving}
          style={{ padding:"12px 32px", borderRadius:"var(--r3)", border:"none", background:"var(--brand)", color:"#fff", fontWeight:800, fontSize:"1rem", cursor:saving?"not-allowed":"pointer", fontFamily:"var(--ff-b)", boxShadow:"0 4px 16px rgba(232,82,26,.35)", opacity:saving?.7:1 }}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span style={{ color:"var(--ok)", fontWeight:700, fontSize:".9375rem", display:"flex", alignItems:"center", gap:"5px" }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg> Saved!</span>}
        {saveErr && <span style={{ color:"var(--err)", fontWeight:600, fontSize:".875rem" }}>{saveErr}</span>}
        <span style={{ fontSize:".8125rem", color:"var(--t4)" }}>Changes apply immediately to all users.</span>
      </div>
    </div>
    </SettingsCtx.Provider>
  );
}

/* ── WhatsApp Broadcast Tab ────────────────────────────────────── */
const Spin = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
    style={{animation:"spin 1s linear infinite",flexShrink:0}}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
  </svg>
);

/* ── Export CSV Tab ────────────────────────────────────────────── */
function SuperAdminExportTab({ branches }) {
  const [branchId,  setBranchId]  = useState(branches[0]?.id || "");
  const [dateFrom,  setDateFrom]  = useState(() => { const d=new Date(); d.setDate(d.getDate()-29); return d.toISOString().slice(0,10); });
  const [dateTo,    setDateTo]    = useState(new Date().toISOString().slice(0,10));

  useEffect(() => { if (!branchId && branches.length) setBranchId(branches[0].id); }, [branches]);

  const download = (url, filename) => {
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.target="_blank"; a.click();
  };

  const exportOrders = () => {
    if (!branchId) return;
    const params = new URLSearchParams({ branch_id:branchId, date_from:dateFrom, date_to:dateTo });
    download(`/api/v1/orders/export/csv/?${params}`, `orders_${dateFrom}_${dateTo}.csv`);
  };

  const exportCustomers = () => {
    if (!branchId) return;
    download(`/api/v1/orders/export/customers/?branch_id=${branchId}`, "customers.csv");
  };

  const ExportCard = ({ icon, title, desc, onExport }) => (
    <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--radius)", padding:"24px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"16px", flexWrap:"wrap" }}>
      <div>
        <div style={{ fontSize:"1.75rem", marginBottom:"8px" }}>{icon}</div>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1rem", marginBottom:"4px" }}>{title}</div>
        <div style={{ fontSize:".875rem", color:"var(--t3)", lineHeight:1.5 }}>{desc}</div>
      </div>
      <button onClick={onExport} disabled={!branchId} className="adm-btn adm-btn-primary" style={{ flexShrink:0, alignSelf:"flex-end", opacity:branchId?1:.5 }}>
        ⬇ Download CSV
      </button>
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ display:"flex", gap:"var(--gap)", marginBottom:"var(--gap-lg)", flexWrap:"wrap", alignItems:"flex-end" }}>
        <div>
          <label className="adm-field-lbl">Branch</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="adm-select">
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="adm-field-lbl">From date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding:"9px 12px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--bd)", background:"var(--bg2)", color:"var(--t1)", fontSize:".875rem", outline:"none" }}/>
        </div>
        <div>
          <label className="adm-field-lbl">To date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding:"9px 12px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--bd)", background:"var(--bg2)", color:"var(--t1)", fontSize:".875rem", outline:"none" }}/>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"var(--gap)" }}>
        <ExportCard icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} title="Orders CSV"
          desc={`All orders between ${dateFrom} and ${dateTo}. Includes token, date, customer, items, payment, status, cancellation reason.`}
          onExport={exportOrders}/>
        <ExportCard icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>} title="Customers CSV"
          desc="All customers who have ordered from this branch — name, phone, email, loyalty points, order count, last order date."
          onExport={exportCustomers}/>
      </div>
    </div>
  );
}

/* ─── Branch card (SuperAdmin branches tab) ──────────────────────────── */
function BranchCard({ branch: b, onEdit, onDeactivate, onReactivate, onModeToggled }) {
  const [toggling,     setToggling]     = useState(null);
  const [reactivating, setReactivating] = useState(false);

  const toggleMode = async (field) => {
    setToggling(field);
    try {
      const newVal = !b[field];
      await axiosClient.patch(`/branches/${b.id}/`, { [field]: newVal });
      onModeToggled(b.id, field, newVal);
    } catch { }
    finally { setToggling(null); }
  };

  const handleReactivate = async () => {
    if (!window.confirm(`Reactivate branch "${b.name}"? It will become visible to customers again.`)) return;
    setReactivating(true);
    try {
      await axiosClient.patch(`/branches/${b.id}/`, { is_active: true });
      onReactivate(b.id);
    } catch { }
    finally { setReactivating(false); }
  };

  return (
    <div className="adm-card" style={{ opacity: b.is_active ? 1 : .55 }}>
      <div className="adm-card-hdr">
        <div>
          <div className="adm-card-title">{b.name}</div>
          <div style={{ fontSize: ".8125rem", color: "var(--t3)", marginTop: 2 }}>{b.address}</div>
        </div>
        <span style={{ fontSize: ".6875rem", fontWeight: 700, padding: "3px 9px", borderRadius: "var(--rf)", background: b.is_active ? "var(--ok-t)" : "var(--bg3)", color: b.is_active ? "var(--ok)" : "var(--t4)", border: "1px solid " + (b.is_active ? "rgba(29,158,117,.2)" : "var(--bd)"), flexShrink: 0 }}>
          {b.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div style={{ padding: "12px 20px", display: "flex", gap: "var(--gap)", fontSize: ".8125rem", color: "var(--t3)", flexWrap: "wrap" }}>
        {b.phone && <span style={{display:"flex",alignItems:"center",gap:"4px"}}><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72"/></svg>{b.phone}</span>}
        {b.email && <span>{b.email}</span>}
        {b.today_orders != null && <span style={{ color: "var(--brand)", fontWeight: 700 }}>{b.today_orders} orders today</span>}
      </div>

      {/* Order mode toggles */}
      <div style={{ padding: "10px 20px", borderTop: "1px solid var(--bd)", borderBottom: "1px solid var(--bd)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--t4)", letterSpacing: ".04em", textTransform: "uppercase", marginRight: 4 }}>Order modes</span>
        {[
          { field: "enable_dine_in", label: "Dine-in" },
          { field: "enable_pickup",  label: "Pickup" },
        ].map(({ field, label }) => (
          <button key={field} onClick={() => b.is_active && toggleMode(field)} disabled={!b.is_active || toggling !== null}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: "1.5px solid " + (b[field] ? "rgba(29,158,117,.35)" : "var(--bd)"), background: b[field] ? "var(--ok-t)" : "var(--bg2)", cursor: b.is_active ? "pointer" : "default", transition: "all 160ms ease", opacity: !b.is_active || (toggling && toggling !== field) ? .5 : 1 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: b[field] ? "var(--ok)" : "var(--t4)", flexShrink: 0 }} />
            <span style={{ fontSize: ".75rem", fontWeight: 700, color: b[field] ? "var(--ok)" : "var(--t3)" }}>{label}</span>
            <span style={{ fontSize: ".625rem", fontWeight: 700, color: b[field] ? "var(--ok)" : "var(--t4)" }}>{b[field] ? "ON" : "OFF"}</span>
          </button>
        ))}
        {!b.enable_pickup && !b.enable_dine_in && b.is_active && (
          <span style={{ fontSize: ".75rem", color: "var(--err)", fontWeight: 700 }}><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="var(--err)" strokeWidth="2" style={{display:"inline",marginRight:"3px"}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg> No orders accepted</span>
        )}
      </div>

      <div style={{ padding: "10px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onEdit} className="adm-btn adm-btn-ghost" style={{ fontSize: ".8125rem", padding: "6px 12px" }}>Edit</button>
        {b.is_active ? (
          <button onClick={onDeactivate} className="adm-btn" style={{ fontSize: ".8125rem", padding: "6px 12px", background: "transparent", border: "1px solid rgba(226,75,74,.3)", color: "var(--err)" }}>Deactivate</button>
        ) : (
          <button onClick={handleReactivate} disabled={reactivating} className="adm-btn adm-btn-primary" style={{ fontSize: ".8125rem", padding: "6px 12px", opacity: reactivating ? .6 : 1 }}>
            {reactivating ? "…" : "Reactivate"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Payment Logs Tab (Super Admin only) ──────────────────────────────── */
function PaymentLogsTab({ branches }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [date,    setDate]    = useState(new Date().toISOString().slice(0,10));
  const [total,   setTotal]   = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchId) params.set("branch_id", branchId);
      if (date)     params.set("date", date);
      const r = await axiosClient.get(`/orders/payment-logs/?${params}`);
      const data = r.data.logs || [];
      setLogs(data);
      setTotal(data.reduce((s, l) => s + (l.total || 0), 0));
    } catch {}
    finally { setLoading(false); }
  }, [branchId, date]);

  useEffect(() => { load(); }, [load]);

  const methodBadge = (m) => {
    const c = m === "upi" ? { bg:"rgba(55,138,221,.12)", color:"var(--info)", label:"UPI" }
            : m === "card" ? { bg:"rgba(95,37,159,.12)", color:"#7c3aed", label:"Card" }
            : { bg:"var(--ok-t)", color:"var(--ok)", label:"Cash" };
    return (
      <span style={{ fontSize:".6875rem", fontWeight:800, padding:"2px 8px", borderRadius:"var(--rf)", background:c.bg, color:c.color, border:`1px solid ${c.color}33`, textTransform:"uppercase" }}>
        {c.label}
      </span>
    );
  };

  const exportCSV = () => {
    const hdr = ["Serial","Token","Branch","Customer","Method","Amount","Marked By","Date"];
    const rows = logs.map(l => [
      l.payment_serial || "—",
      l.token_number,
      l.branch_name,
      l.customer_name || "Walk-in",
      l.payment_method.toUpperCase(),
      l.total.toFixed(2),
      l.marked_by || "—",
      new Date(l.created_at).toLocaleString("en-IN"),
    ]);
    const csv = [hdr, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    a.download = `payment-log-${date}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Filters */}
      <div className="adm-filter-bar">
        <div className="adm-filter-group">
          <label className="adm-field-lbl">Branch</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="adm-select" style={{ minWidth:"180px" }}>
            <option value="">All branches</option>
            {(branches||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="adm-filter-group">
          <label className="adm-field-lbl">Date</label>
          <div className="adm-input-wrap">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--t3)" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ flex:1, border:"none", background:"transparent", fontFamily:"var(--font-body)", fontSize:".875rem", color:"var(--t1)", outline:"none" }}/>
          </div>
        </div>
        <button onClick={load} className="adm-btn adm-btn-ghost" disabled={loading} style={{ alignSelf:"flex-end" }}>
          {loading ? "…" : "↻ Refresh"}
        </button>
        {logs.length > 0 && (
          <button onClick={exportCSV} className="adm-btn adm-btn-primary" style={{ marginLeft:"auto", alignSelf:"flex-end" }}>
            ⬇ Export CSV
          </button>
        )}
      </div>

      {/* Summary cards */}
      {logs.length > 0 && (
        <div className="adm-stats" style={{ marginBottom:"var(--gap)" }}>
          {[
            { label:"Total collected",  value:formatPrice(total),  color:"var(--brand)" },
            { label:"Transactions",     value:logs.length,          color:"var(--info)"  },
            { label:"UPI payments",     value:logs.filter(l=>l.payment_method==="upi").length,  color:"#3b82f6" },
            { label:"Cash payments",    value:logs.filter(l=>l.payment_method==="cash").length, color:"var(--ok)" },
          ].map(s => (
            <div key={s.label} className="adm-stat">
              <div className="adm-stat-bar" style={{ background:`linear-gradient(90deg,${s.color},transparent)` }}/>
              <div className="adm-stat-lbl">{s.label}</div>
              <div className="adm-stat-val" style={{ color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skel" style={{ height:52, borderRadius:"var(--radius-sm)" }}/>)}
        </div>
      ) : logs.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
          <div className="adm-empty-title">No payments found</div>
          <div className="adm-empty-sub">Adjust the filters to see payment records.</div>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr>
              <th>Serial</th>
              <th>Token</th>
              <th>Branch</th>
              <th>Customer</th>
              <th>Method</th>
              <th style={{ textAlign:"right" }}>Amount</th>
              <th>Marked by</th>
              <th>Time</th>
            </tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.order_id}>
                  <td><code style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:".875rem", color:"var(--brand)" }}>{l.payment_serial || "—"}</code></td>
                  <td><span style={{ fontFamily:"var(--ff-d)", fontWeight:800 }}>{l.token_number}</span></td>
                  <td>{l.branch_name}</td>
                  <td>{l.customer_name || "Walk-in"}</td>
                  <td>{methodBadge(l.payment_method)}</td>
                  <td style={{ textAlign:"right", fontWeight:700 }}>{formatPrice(l.total)}</td>
                  <td style={{ color:"var(--t3)", fontSize:".8125rem" }}>{l.marked_by || "—"}</td>
                  <td style={{ color:"var(--t3)", fontSize:".75rem" }}>
                    {new Date(l.created_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SuperAdminDashboard() {
  const { loading: pageLoading } = usePageLoader(1000);
  const statsRef = useRef(null);
  const [ToastEl, showToast] = useToast();

  const [branches,     setBranches]     = useState([]);
  const [tab,          setTab]          = useState("branches");
  const [loading,      setLoading]      = useState(true);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  const [branchModal, setBranchModal]   = useState(false);
  const [branchForm,  setBranchForm]    = useState({ name:"", address:"", phone:"", email:"", latitude:"", longitude:"" });
  const [branchErrors,setBranchErrors]  = useState({});
  const [branchApiErr,setBranchApiErr]  = useState("");
  const [branchSaving,setBranchSaving]  = useState(false);

  const [adminModal,  setAdminModal]    = useState(false);
  const [adminForm,   setAdminForm]     = useState({ name:"", email:"", password:"" });
  const [adminErrors, setAdminErrors]   = useState({});
  const [adminApiErr, setAdminApiErr]   = useState("");
  const [adminSaving, setAdminSaving]   = useState(false);
  const [adminBranchId, setAdminBranchId] = useState("");
  const [adminSuccess, setAdminSuccess] = useState(null);

  const totalRev    = branches.reduce((s,b) => s + (Number(b.today_revenue) || 0), 0);
  const totalOrders = branches.reduce((s,b) => s + (Number(b.today_orders)  || 0), 0);

  const loadBranches = useCallback(() => {
    setLoading(true);
    axiosClient.get("/branches/")
      .then(r => setBranches(r.data.branches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  useEffect(() => {
    if (!loading && statsRef.current) {
      gsap.fromTo(statsRef.current.querySelectorAll(".adm-stat"),
        { y:20, opacity:0 },
        { y:0, opacity:1, stagger:.07, duration:.45, ease:"power2.out" }
      );
    }
  }, [loading, tab]);

  const handleCreateBranch = async e => {
    e.preventDefault();
    setBranchSaving(true); setBranchApiErr(""); setBranchErrors({});
    try {
      await axiosClient.post("/branches/", branchForm);
      setBranchModal(false);
      setBranchForm({ name:"", address:"", phone:"", email:"", latitude:"", longitude:"" });
      loadBranches();
      showToast("Branch created successfully!");
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) setBranchErrors(d.errors);
      else setBranchApiErr(d?.error || "Failed to create branch.");
    } finally { setBranchSaving(false); }
  };

  const handleDeleteBranch = async (branch) => {
    if (!window.confirm("Deactivate branch \"" + branch.name + "\"? This hides it from customers.")) return;
    try {
      await axiosClient.delete("/branches/" + branch.id + "/");
      loadBranches();
      showToast("Branch deactivated.");
    } catch (e) {
      showToast(e.response?.data?.error || "Could not delete branch.");
    }
  };

  const handleCreateAdmin = async e => {
    e.preventDefault();
    setBranchSaving(true); setAdminApiErr(""); setAdminErrors({});
    try {
      await axiosClient.post("/auth/create-staff/", { ...adminForm, role:"branch_admin", branch_id: adminBranchId });
      setAdminModal(false);
      setAdminForm({ name:"", email:"", password:"" });
      setAdminSuccess({ name: adminForm.name, email: adminForm.email });
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) setAdminErrors(d.errors);
      else setAdminApiErr(d?.error || "Failed.");
    } finally { setBranchSaving(false); }
  };

  const SA_TABS = [
    { key:"branches",      icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label:"Branches" },
    { key:"payments",      icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, label:"Payments" },
    { key:"users",         icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, label:"Users" },
    { key:"stock",         icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>, label:"Stock History" },
    { key:"stock-refill",  icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><line x1="12" y1="9" x2="12" y2="15" strokeLinecap="round"/><line x1="9" y1="12" x2="15" y2="12" strokeLinecap="round"/></svg>, label:"Stock Refill", isLink:true, to:"/superadmin/stock" },
    { key:"redemptions",   icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>, label:"Redemptions" },
    { key:"export",        icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>, label:"Export" },
    { key:"staff",         icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label:"Staff" },
    { key:"reports",       icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, label:"Analytics" },
    { key:"settings",      icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>, label:"Settings" },
  ];

  if (pageLoading) return <KNCLoader visible label="Loading dashboard…"/>;

  return (
    <>
      <Header />
      <div className="adm-shell adm-shell--row">

        {/* ── Mobile sidebar overlay ── */}
        {sidebarOpen && <div className="adm-sidebar-overlay" onClick={() => setSidebarOpen(false)}/>}

        {/* ── Left sidebar ── */}
        <aside className={`adm-sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="adm-sidebar-profile">
            <div className="adm-avatar">SA</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>Super Admin</div>
              <div style={{ fontSize:".6875rem", color:"var(--t3)" }}>KNFC Command</div>
            </div>
          </div>
          <nav className="adm-sidebar-nav">
            {SA_TABS.map(t => t.isLink ? (
              <a key={t.key} href={t.to}
                className="adm-sidebar-item"
                style={{ textDecoration:"none" }}
                onClick={() => setSidebarOpen(false)}>
                <span className="adm-sidebar-icon">{t.icon}</span>
                {t.label}
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft:"auto", opacity:.5 }}>
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ) : (
              <button key={t.key} type="button"
                className={"adm-sidebar-item" + (tab===t.key ? " active" : "")}
                onClick={() => { setTab(t.key); setSidebarOpen(false); window.scrollTo({ top:0, behavior:"instant" }); }}>
                <span className="adm-sidebar-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main area ── */}
        <div className="adm-main">

          {/* Mobile topbar — hamburger + current section name */}
          <div className="adm-mobile-topbar">
            <button className="adm-hamburger" onClick={() => setSidebarOpen(o => !o)}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/></svg>
            </button>
            <span style={{ fontWeight:700, fontSize:".9375rem" }}>
              {SA_TABS.find(t => t.key===tab)?.icon}&nbsp;{SA_TABS.find(t => t.key===tab)?.label}
            </span>
          </div>

        {/* ── Content ── */}
        <div className="adm-content">

          {/* Page header */}
          <div className="adm-page-hdr">
            <div>
              <div className="adm-eyebrow">Super Admin</div>
              <h1 className="adm-page-title">
                { SA_TABS.find(t => t.key===tab)?.label || "Dashboard" }
              </h1>
              <p className="adm-page-sub">{new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })}</p>
            </div>
            <div style={{ display:"flex", gap:"var(--gap)" }}>
              {tab === "branches" && (
                <>
                  <button onClick={() => setAdminModal(true)} className="adm-btn adm-btn-ghost">
                    + Create admin
                  </button>
                  <button onClick={() => setBranchModal(true)} className="adm-btn adm-btn-primary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New branch
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── BRANCHES ── */}
          {tab === "branches" && (<>
            {/* Stats */}
            <div ref={statsRef} className="adm-stats">
              {[
                { label:"Total revenue",   value:formatPrice(totalRev),                                     color:"var(--brand)", sub:"All branches today" },
                { label:"Total orders",    value:totalOrders,                                               color:"var(--info)",  sub:"Across all branches" },
                { label:"Active branches", value:branches.filter(b=>b.is_active).length,                    color:"var(--ok)",   sub:branches.length+" total" },
                { label:"Avg per branch",  value:branches.length?formatPrice(totalRev/branches.length):"—", color:"#b45309",     sub:"Revenue / branch" },
              ].map(s => (
                <div key={s.label} className="adm-stat">
                  <div className="adm-stat-bar" style={{ background:"linear-gradient(90deg,"+s.color+",transparent)" }}/>
                  <div className="adm-stat-lbl">{s.label}</div>
                  <div className="adm-stat-val" style={{ color:s.color }}>{s.value}</div>
                  <div className="adm-stat-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"var(--gap)" }}>
                {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"80px", borderRadius:"var(--radius)" }}/>)}
              </div>
            ) : branches.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                <div className="adm-empty-title">No branches yet</div>
                <div className="adm-empty-sub">Create your first KNFC location.</div>
                <button onClick={() => setBranchModal(true)} className="adm-btn adm-btn-primary">+ Create branch</button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"var(--gap)" }}>
                {branches.map(b => (
                  <BranchCard key={b.id} branch={b}
                    onEdit={() => { setBranchForm({ name:b.name, address:b.address||"", phone:b.phone||"", email:b.email||"", latitude:b.latitude||"", longitude:b.longitude||"" }); setBranchModal(true); }}
                    onDeactivate={() => handleDeleteBranch(b)}
                    onReactivate={id => setBranches(bs => bs.map(x => x.id === id ? { ...x, is_active: true } : x))}
                    onModeToggled={(id, field, val) => setBranches(bs => bs.map(x => x.id === id ? { ...x, [field]: val } : x))}
                  />
                ))}
              </div>
            )}
          </>)}

          {/* ── USERS ── */}
          {tab === "users"       && <SuperAdminUsersTab/>}
          {tab === "stock"       && <SuperAdminStockTab branches={branches}/>}
          {tab === "redemptions" && <SuperAdminRedemptionsTab/>}
          {tab === "payments"    && <PaymentLogsTab branches={branches}/>}
          {tab === "export"      && <SuperAdminExportTab branches={branches}/>}
          {tab === "staff"       && <StaffManager isSuperAdmin branches={branches}/>}
          {tab === "reports"     && (
            <div className="adm-empty">
              <div className="adm-empty-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
              <div className="adm-empty-title">Analytics dashboard</div>
              <div className="adm-empty-sub">Revenue trends, bestsellers, peak hours, and order breakdowns across all branches.</div>
              <Link to="/superadmin/analytics" className="adm-btn adm-btn-primary">Open analytics →</Link>
            </div>
          )}
          {tab === "settings" && <SuperAdminSettingsTab/>}

        </div>{/* /adm-content */}
        </div>{/* /adm-main */}
      </div>{/* /adm-shell--row */}

      {/* ── Create Branch Modal ── */}
      <Modal open={branchModal} onClose={() => { setBranchModal(false); setBranchErrors({}); setBranchApiErr(""); }} title="Create / edit branch" subtitle="Add or update a KNFC location">
        <form onSubmit={handleCreateBranch}>
          <ErrBox msg={branchApiErr}/>
          <div style={{ marginBottom:14 }}>
            <FL req>Branch name</FL>
            <div className={"adm-input-wrap"+(branchErrors.name?" err":"")}>
              <input className="adm-input" value={branchForm.name} onChange={e => setBranchForm(f=>({...f,name:e.target.value}))} placeholder="KNFC Kozhikode" required/>
            </div>
            <ErrBox msg={branchErrors.name}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <FL req>Address</FL>
            <div className="adm-input-wrap">
              <input className="adm-input" value={branchForm.address} onChange={e => setBranchForm(f=>({...f,address:e.target.value}))} placeholder="123 Main Street, City"/>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--gap)", marginBottom:14 }}>
            <div>
              <FL>Phone</FL>
              <div className="adm-input-wrap"><input className="adm-input" value={branchForm.phone} onChange={e => setBranchForm(f=>({...f,phone:e.target.value}))} placeholder="+91 9876543210"/></div>
            </div>
            <div>
              <FL>Email</FL>
              <div className="adm-input-wrap"><input className="adm-input" type="email" value={branchForm.email} onChange={e => setBranchForm(f=>({...f,email:e.target.value}))} placeholder="branch@knfc.in"/></div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--gap)", marginBottom:14 }}>
            <div>
              <FL>Latitude</FL>
              <div className="adm-input-wrap"><input className="adm-input" value={branchForm.latitude} onChange={e => setBranchForm(f=>({...f,latitude:e.target.value}))} placeholder="11.2588"/></div>
            </div>
            <div>
              <FL>Longitude</FL>
              <div className="adm-input-wrap"><input className="adm-input" value={branchForm.longitude} onChange={e => setBranchForm(f=>({...f,longitude:e.target.value}))} placeholder="75.7804"/></div>
            </div>
          </div>
          <div style={{ display:"flex", gap:"var(--gap)", justifyContent:"flex-end" }}>
            <button type="button" onClick={() => setBranchModal(false)} className="adm-btn adm-btn-ghost">Cancel</button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={branchSaving}>{branchSaving?"Saving…":"Save branch"}</button>
          </div>
        </form>
      </Modal>

      {/* ── Create Branch Admin Modal ── */}
      <Modal open={adminModal} onClose={() => { setAdminModal(false); setAdminErrors({}); setAdminApiErr(""); setAdminSuccess(null); }} title="Create Branch Admin" subtitle="New admin account for a branch">
        {adminSuccess ? (
          <div style={{ textAlign:"center", padding:"var(--gap-lg) 0" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"var(--gap)" }}><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
            <div style={{ fontWeight:800, fontSize:"1.125rem", marginBottom:8 }}>Admin created!</div>
            <div style={{ fontSize:".9rem", color:"var(--t3)", marginBottom:"var(--gap-lg)" }}>
              {adminSuccess.name} ({adminSuccess.email}) can now log in via the admin portal.
            </div>
            <button onClick={() => { setAdminModal(false); setAdminSuccess(null); }} className="adm-btn adm-btn-primary">Done</button>
          </div>
        ) : (
          <form onSubmit={handleCreateAdmin}>
            <ErrBox msg={adminApiErr}/>
            <div style={{ marginBottom:14 }}>
              <FL req>Full name</FL>
              <div className="adm-input-wrap"><input className="adm-input" value={adminForm.name} onChange={e=>setAdminForm(f=>({...f,name:e.target.value}))} required placeholder="Admin Name"/></div>
              <ErrBox msg={adminErrors.name}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <FL req>Email</FL>
              <div className="adm-input-wrap"><input className="adm-input" type="email" value={adminForm.email} onChange={e=>setAdminForm(f=>({...f,email:e.target.value}))} required placeholder="admin@knfc.in"/></div>
              <ErrBox msg={adminErrors.email}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <FL req>Password</FL>
              <div className="adm-input-wrap"><input className="adm-input" type="password" value={adminForm.password} onChange={e=>setAdminForm(f=>({...f,password:e.target.value}))} required placeholder="Min 8 characters"/></div>
              <ErrBox msg={adminErrors.password}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <FL req>Assign to branch</FL>
              <select value={adminBranchId} onChange={e=>setAdminBranchId(e.target.value)} required className="adm-select" style={{ width:"100%" }}>
                <option value="">Select branch…</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <ErrBox msg={adminErrors.branch_id}/>
            </div>
            <div style={{ display:"flex", gap:"var(--gap)", justifyContent:"flex-end" }}>
              <button type="button" onClick={() => setAdminModal(false)} className="adm-btn adm-btn-ghost">Cancel</button>
              <button type="submit" className="adm-btn adm-btn-primary" disabled={adminSaving}>{adminSaving?"Creating…":"Create admin"}</button>
            </div>
          </form>
        )}
      </Modal>

      {ToastEl}
    </>
  );
}

export default BranchDashboard;
