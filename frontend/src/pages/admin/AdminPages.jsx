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
import { adminGetItems } from "../../api/menu";
import {
  IcSun, IcRefresh,
  StockCard, TopUpModal, OpeningStockPanel, StockActivityLog,
} from "./StockComponents";

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
    /* Offset content below sticky mobile topbar (height ~48px) */
    .adm-shell--row .adm-content { padding-top: var(--page-py); }
    /* BranchAdmin: account for the 72px mob-tabbar at bottom */
    .adm-shell:not(.adm-shell--row) .adm-content {
      padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px) + var(--page-py));
    }
  }

  /* Scroll-lock when SuperAdmin sidebar overlay is visible */
  body.adm-sidebar-open { overflow: hidden; }

  /* Notification bell: desktop shows in page header, mobile shows in topbar */
  .sa-bell-mobile  { display: none; align-items: center; }
  .sa-bell-desktop { display: flex; align-items: center; }
  @media (max-width: 900px) {
    .sa-bell-mobile  { display: flex; }
    .sa-bell-desktop { display: none; }
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

  const handleActivate = async (member) => {
    const key = `${member.id}_is_active`;
    setToggling(t => ({ ...t, [key]: true }));
    try {
      await axiosClient.patch(`/auth/admin/staff-list/${member.id}/`, { is_active: true });
      showToast(`${member.name} reactivated.`);
      load();
    } catch { showToast("Activate failed."); }
    finally { setToggling(t => ({ ...t, [key]: false })); }
  };

  const handleDeactivate = async () => {
    if (!confirm) return;
    try {
      await axiosClient.patch(`/auth/admin/staff-list/${confirm.id}/`, { is_active: false });
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
            {["Staff member", "User ID", isSuperAdmin ? "Branch" : "Role", "Status", "On duty", "Actions"].map((h, i) => (
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
                  {s.last_login && (() => {
                    const ago = (Date.now() - new Date(s.last_login)) / 60000;
                    const dot = ago < 30 ? "#22c55e" : ago < 480 ? "#f59e0b" : "var(--bd2)";
                    const lbl = ago < 30 ? "Active now" : ago < 60 ? `${Math.round(ago)}m ago` : ago < 1440 ? `${Math.round(ago/60)}h ago` : `${Math.round(ago/1440)}d ago`;
                    return (
                      <div style={{ fontSize:".6875rem", color:"var(--t4)", display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:dot, flexShrink:0, display:"inline-block" }}/>
                        {lbl}
                      </div>
                    );
                  })()}
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

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {s.is_active ? (
                  <button
                    onClick={() => setConfirm(s)}
                    disabled={toggling[`${s.id}_is_active`]}
                    className="adm-btn adm-btn-sm adm-btn-danger"
                    style={{ fontSize: ".6875rem", padding: "4px 10px" }}>
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(s)}
                    disabled={toggling[`${s.id}_is_active`]}
                    className="adm-btn adm-btn-sm adm-btn-ghost"
                    style={{ fontSize: ".6875rem", padding: "4px 10px", color: "var(--ok)", borderColor: "var(--ok)" }}>
                    Activate
                  </button>
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
    // Send UTC ISO — Django converts to IST via USE_TZ + TIME_ZONE = Asia/Kolkata
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
        <div>
          <div className="adm-card-title">Operating hours</div>
          <div style={{ fontSize:".75rem", color:"var(--t4)", marginTop:2 }}>
            All times are <strong>IST (Asia/Kolkata)</strong>. The server compares the schedule against the current IST clock to decide if the shop is open.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isOpen && (
            <button onClick={() => setShowExtend(v => !v)} className="adm-btn adm-btn-ghost adm-btn-sm">
              Extend hours
            </button>
          )}
          <button onClick={saveSchedule} disabled={saving || !dirty} className="adm-btn adm-btn-primary adm-btn-sm" style={{ opacity: (saving || !dirty) ? .6 : 1 }}>
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
        <div className="adm-card-title">Branch QR Code</div>
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
            Customers scan this QR to open your branch menu directly on their phone.
            Place it on your entrance, counter, packaging, or anywhere visible.
            The QR always links to <strong>this branch only</strong>.
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

/* ─── BranchTablesManager ────────────────────────────────────────────────── */
const SEATING_TYPES = [
  { value:"indoor",  label:"Indoor"       },
  { value:"outdoor", label:"Outdoor"      },
  { value:"window",  label:"Window Side"  },
  { value:"counter", label:"Counter / Bar"},
  { value:"private", label:"Private Room" },
  { value:"family",  label:"Family Table" },
  { value:"booth",   label:"Booth"        },
];

function BranchTablesManager({ branchId }) {
  const [tables,  setTables]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState({ table_number:"", label:"", seating_type:"indoor", capacity:4 });
  const [editId,  setEditId]  = useState(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const r = await axiosClient.get(`/branches/${branchId}/tables/`);
      setTables(r.data.tables || []);
    } catch { setTables([]); }
    finally { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ table_number:"", label:"", seating_type:"indoor", capacity:4 }); setEditId(null); setError(""); };

  const handleSave = async () => {
    if (!form.table_number || !form.label) { setError("Table number and label are required."); return; }
    setSaving(true); setError("");
    try {
      if (editId) {
        await axiosClient.patch(`/branches/${branchId}/tables/${editId}/`, form);
      } else {
        await axiosClient.post(`/branches/${branchId}/tables/`, form);
      }
      await load(); resetForm();
    } catch (e) {
      setError(e.response?.data?.errors?.non_field_errors?.[0] || e.response?.data?.error || "Save failed.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (tid) => {
    if (!window.confirm("Remove this table? Customers will no longer see it.")) return;
    try { await axiosClient.delete(`/branches/${branchId}/tables/${tid}/`); load(); } catch {}
  };

  const startEdit = (t) => {
    setForm({ table_number: t.table_number, label: t.label, seating_type: t.seating_type, capacity: t.capacity });
    setEditId(t.id); setError("");
  };

  const SEAT_COLOR = { indoor:"var(--info)", outdoor:"var(--ok)", window:"var(--brand)", counter:"var(--warn)", private:"#7C3AED", family:"var(--ok)", booth:"var(--t3)" };

  return (
    <div>
      <div style={{ fontFamily:"var(--font-display)", fontSize:"1.0625rem", fontWeight:800, marginBottom:20 }}>
        Dine-In Tables — {branchId ? "Your Branch" : ""}
      </div>

      {/* ── Add / Edit form ── */}
      <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--radius)", padding:20, marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:".875rem", marginBottom:14, color:"var(--t2)" }}>
          {editId ? "Edit Table" : "Add New Table"}
        </div>
        {error && <div style={{ padding:"8px 12px", background:"var(--err-t)", border:"1px solid rgba(226,75,74,.25)", borderRadius:8, color:"var(--err)", fontSize:".8125rem", marginBottom:12 }}>{error}</div>}

        <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 160px 80px", gap:10, alignItems:"end", flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", marginBottom:4 }}>Table #</div>
            <input type="number" min="1" value={form.table_number}
              onChange={e => setForm(f => ({...f, table_number: e.target.value}))}
              style={{ width:"100%", padding:"8px 10px", border:"1px solid var(--bd)", borderRadius:8, background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem" }}
              placeholder="1"/>
          </div>
          <div>
            <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", marginBottom:4 }}>Display Label</div>
            <input value={form.label}
              onChange={e => setForm(f => ({...f, label: e.target.value}))}
              style={{ width:"100%", padding:"8px 10px", border:"1px solid var(--bd)", borderRadius:8, background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem" }}
              placeholder="e.g. Window Table A"/>
          </div>
          <div>
            <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", marginBottom:4 }}>Seating Type</div>
            <select value={form.seating_type} onChange={e => setForm(f => ({...f, seating_type: e.target.value}))}
              style={{ width:"100%", padding:"8px 10px", border:"1px solid var(--bd)", borderRadius:8, background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem" }}>
              {SEATING_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--t3)", marginBottom:4 }}>Seats</div>
            <input type="number" min="1" max="20" value={form.capacity}
              onChange={e => setForm(f => ({...f, capacity: parseInt(e.target.value)||1}))}
              style={{ width:"100%", padding:"8px 10px", border:"1px solid var(--bd)", borderRadius:8, background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem" }}/>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={handleSave} disabled={saving}
            className="adm-btn adm-btn-primary" style={{ opacity:saving?.6:1 }}>
            {saving ? "Saving…" : editId ? "Save changes" : "Add table"}
          </button>
          {editId && <button onClick={resetForm} className="adm-btn adm-btn-ghost">Cancel</button>}
        </div>
      </div>

      {/* ── Table list ── */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:60, borderRadius:10 }}/>)}
        </div>
      ) : tables.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 20px", background:"var(--bg2)", borderRadius:"var(--radius)", border:"1px dashed var(--bd)", color:"var(--t3)", fontSize:".875rem" }}>
          No tables added yet. Add your first table above.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {tables.map(t => (
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:10 }}>
              {/* Number badge */}
              <div style={{ width:40, height:40, borderRadius:10, background:`${SEAT_COLOR[t.seating_type] || "var(--brand)"}18`, border:`1.5px solid ${SEAT_COLOR[t.seating_type] || "var(--brand)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:".9375rem", color:SEAT_COLOR[t.seating_type] || "var(--brand)" }}>{t.table_number}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:".9375rem", color:"var(--t1)", marginBottom:2 }}>{t.label}</div>
                <div style={{ display:"flex", gap:8 }}>
                  <span style={{ fontSize:".6875rem", fontWeight:600, padding:"1px 7px", borderRadius:20, background:`${SEAT_COLOR[t.seating_type] || "var(--brand)"}15`, color:SEAT_COLOR[t.seating_type] || "var(--brand)" }}>
                    {SEATING_TYPES.find(s => s.value === t.seating_type)?.label || t.seating_type}
                  </span>
                  <span style={{ fontSize:".6875rem", color:"var(--t4)", fontWeight:600 }}>{t.capacity} seats</span>
                </div>
              </div>
              {/* Availability dot */}
              <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background: t.is_available ? "var(--ok)" : "var(--err)" }}/>
                <span style={{ fontSize:".75rem", color:"var(--t4)" }}>{t.is_available ? "Free" : "Occupied"}</span>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                <button onClick={() => startEdit(t)}
                  style={{ padding:"5px 12px", borderRadius:8, border:"1px solid var(--bd)", background:"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)" }}>Edit</button>
                <button onClick={() => handleDelete(t.id)}
                  style={{ padding:"5px 12px", borderRadius:8, border:"1px solid rgba(226,75,74,.3)", background:"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:600, color:"var(--err)", fontFamily:"var(--ff-b)" }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── BranchOrdersTab ────────────────────────────────────────────────────── */
function BranchOrdersTab({ branchId }) {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [updating,    setUpdating]    = useState(null); // order id being updated
  const [date,        setDate]        = useState(new Date().toISOString().slice(0,10));
  const [status,      setStatus]      = useState("");
  const [ToastEl,     showToast]      = useToast();
  const [upiPayOrder, setUpiPayOrder] = useState(null); // order pending "mark paid"
  const [upiRef,      setUpiRef]      = useState("");
  const [payLoading,  setPayLoading]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (status) params.set("status", status);
      const r = await axiosClient.get(`/orders/admin/?${params}`);
      setOrders(r.data.orders || []);
    } catch {}
    finally { setLoading(false); }
  }, [date, status]);

  useEffect(() => { load(); }, [load]);

  const advance = async (order) => {
    const next = {
      placed: "confirmed", confirmed: "preparing",
      preparing: "ready", ready: "completed",
    }[order.status];
    if (!next) return;
    setUpdating(order.id);
    try {
      await axiosClient.patch(`/orders/${order.id}/status/`, { status: next });
      showToast(`Token ${order.token_number} → ${next}`);
      load();
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to update order.", "error");
    } finally { setUpdating(null); }
  };

  const cancel = async (order) => {
    if (!window.confirm(`Cancel order T${order.token_number}?`)) return;
    setUpdating(order.id);
    try {
      await axiosClient.patch(`/orders/${order.id}/status/`, { status: "cancelled" });
      showToast(`Token ${order.token_number} cancelled.`);
      load();
    } catch { } finally { setUpdating(null); }
  };

  const handleMarkPaid = async () => {
    if (!upiPayOrder) return;
    setPayLoading(true);
    try {
      const body = { payment_status: "paid" };
      if (upiRef.trim()) body.upi_ref = upiRef.trim();
      const res = await axiosClient.patch(`/orders/${upiPayOrder.id}/payment/`, body);
      const serial = res.data.payment_serial || "";
      showToast(`Payment confirmed${serial ? ` · ${serial}` : ""}`, "success");
      setUpiPayOrder(null); setUpiRef("");
      load();
    } catch (e) {
      showToast(e.response?.data?.error || "Could not mark as paid.", "error");
    } finally { setPayLoading(false); }
  };

  const NEXT_LABEL = {
    placed: "Confirm", confirmed: "Start cooking",
    preparing: "Mark ready", ready: "Complete",
  };

  const statusColor = s => s === "completed" ? "var(--ok)" : s === "cancelled" ? "var(--err)" : s === "ready" ? "var(--brand)" : s === "preparing" ? "var(--warn)" : "var(--info)";

  const needsPay = o => o.payment_method === "upi" && o.payment_status === "pending";

  return (
    <div>
      {/* Mark-Paid confirmation modal */}
      {upiPayOrder && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"var(--bgc)", borderRadius:"var(--r5)", padding:24, maxWidth:400, width:"100%", boxShadow:"var(--sh-xl)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
              <div style={{ width:44, height:44, borderRadius:"var(--r3)", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.25)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--ok)", flexShrink:0 }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
              </div>
              <div>
                <div style={{ fontWeight:900, fontSize:"1rem", fontFamily:"var(--font-display)" }}>Mark Payment Received</div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:2 }}>
                  Token {upiPayOrder.token_number} · {formatPrice(upiPayOrder.total)} · UPI
                </div>
              </div>
            </div>
            <div style={{ padding:"10px 14px", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px solid var(--bd)", marginBottom:16 }}>
              <div style={{ fontSize:".75rem", color:"var(--t3)", marginBottom:2 }}>Customer</div>
              <div style={{ fontWeight:700 }}>{upiPayOrder.customer_name || "Walk-in"}</div>
            </div>
            <label style={{ fontSize:".8125rem", fontWeight:700, display:"block", marginBottom:6 }}>
              UPI Transaction ID <span style={{ fontWeight:400, color:"var(--t3)" }}>(optional)</span>
            </label>
            <input value={upiRef} onChange={e => setUpiRef(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleMarkPaid()}
              placeholder="e.g. 316524897412"
              style={{ width:"100%", padding:"10px 14px", border:"1.5px solid var(--bd)", borderRadius:"var(--r3)", background:"var(--bg2)", color:"var(--t1)", fontSize:".9375rem", fontFamily:"var(--font-display)", outline:"none", boxSizing:"border-box", marginBottom:4 }}/>
            <p style={{ fontSize:".75rem", color:"var(--t4)", marginBottom:16 }}>Enter the UPI ref from customer's screenshot (optional).</p>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={handleMarkPaid} disabled={payLoading}
                style={{ flex:2, padding:"12px", borderRadius:"var(--r3)", border:"none", background:"var(--ok)", color:"#fff", fontWeight:800, fontSize:".9375rem", cursor:payLoading?"not-allowed":"pointer", opacity:payLoading?.7:1, boxShadow:"0 4px 14px rgba(29,158,117,.35)" }}>
                {payLoading ? "Recording…" : "✓ Confirm Payment Received"}
              </button>
              <button onClick={() => { setUpiPayOrder(null); setUpiRef(""); }} disabled={payLoading}
                style={{ flex:1, padding:"12px", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontWeight:600, fontSize:".9375rem", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="adm-filter-bar" style={{ marginBottom:16 }}>
        <div className="adm-filter-group">
          <label className="adm-field-lbl">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="adm-input" style={{ width:150 }}/>
        </div>
        <div className="adm-filter-group">
          <label className="adm-field-lbl">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="adm-select">
            <option value="">All</option>
            {["placed","confirmed","preparing","ready","completed","cancelled"].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
            ))}
          </select>
        </div>
        <button onClick={load} className="adm-btn adm-btn-ghost adm-btn-sm">Refresh</button>
        <Link to="/staff/queue" className="adm-btn adm-btn-primary adm-btn-sm" style={{ marginLeft:"auto" }}>Live queue →</Link>
      </div>

      <div className="adm-card">
        {loading ? (
          <div style={{ padding:24, display:"flex", flexDirection:"column", gap:8 }}>
            {[1,2,3].map(i => <div key={i} className="skel" style={{ height:64 }}/>)}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding:"56px 20px", textAlign:"center", color:"var(--t3)" }}>No orders for {date}.</div>
        ) : orders.map(o => {
          const busy    = updating === o.id;
          const nextLbl = NEXT_LABEL[o.status];
          const active  = !["completed","cancelled"].includes(o.status);
          const upiPend = needsPay(o);
          return (
            <div key={o.id} style={{ borderBottom:"1px solid var(--bd)" }}>
              {/* UPI pending banner */}
              {upiPend && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"8px 16px", background:"linear-gradient(135deg,rgba(239,159,39,.14),rgba(239,159,39,.04))", borderBottom:"1px solid rgba(239,159,39,.3)", flexWrap:"wrap" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, color:"var(--warn)", fontWeight:700, fontSize:".8125rem" }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg>
                    UPI payment pending — verify before confirming
                  </div>
                  <button onClick={() => { setUpiPayOrder(o); setUpiRef(""); }}
                    style={{ padding:"7px 16px", borderRadius:20, border:"none", background:"var(--ok)", color:"#fff", fontWeight:800, fontSize:".8125rem", cursor:"pointer", display:"flex", alignItems:"center", gap:5, boxShadow:"0 2px 8px rgba(29,158,117,.35)", flexShrink:0 }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
                    Mark as Paid
                  </button>
                </div>
              )}
              <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                {/* Token */}
                <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:".9375rem", padding:"4px 12px", borderRadius:6, background:"var(--brand)", color:"#fff", flexShrink:0 }}>
                  {o.token_number}
                </div>
                {/* Info */}
                <div style={{ flex:1, minWidth:120 }}>
                  <div style={{ fontWeight:700, fontSize:".9375rem" }}>{o.customer_name || o.walkin_name || "Walk-in"}</div>
                  <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:2, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span>{o.item_count} items · {o.order_type === "dine_in" ? `Dine-in T${o.table_number}` : "Pickup"} · {formatTime(o.created_at)}</span>
                    {o.payment_method && (
                      <span style={{ fontWeight:800, textTransform:"uppercase", padding:"1px 7px", borderRadius:20, background: upiPend ? "rgba(239,159,39,.15)" : o.payment_status === "paid" ? "var(--ok-t)" : "var(--bg2)", color: upiPend ? "var(--warn)" : o.payment_status === "paid" ? "var(--ok)" : "var(--t3)", border:`1px solid ${upiPend ? "rgba(239,159,39,.3)" : o.payment_status === "paid" ? "rgba(29,158,117,.2)" : "var(--bd)"}` }}>
                        {o.payment_method.toUpperCase()}{o.payment_status === "paid" ? " ✓" : ""}
                      </span>
                    )}
                  </div>
                </div>
                {/* Amount */}
                <div style={{ fontWeight:800, color:"var(--brand)", fontSize:".9375rem", flexShrink:0 }}>{formatPrice(o.total)}</div>
                {/* Status badge */}
                <span style={{ fontSize:".6875rem", fontWeight:800, padding:"3px 10px", borderRadius:20, background:`${statusColor(o.status)}18`, color:statusColor(o.status), border:`1px solid ${statusColor(o.status)}44`, flexShrink:0 }}>
                  {o.status_display || o.status}
                </span>
                {/* Action buttons */}
                {active && (
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {/* Block Confirm/advance if UPI is still pending */}
                    {upiPend ? (
                      <button onClick={() => { setUpiPayOrder(o); setUpiRef(""); }}
                        className="adm-btn adm-btn-sm"
                        style={{ background:"var(--ok)", color:"#fff", border:"none", fontWeight:800 }}>
                        Mark Paid First
                      </button>
                    ) : nextLbl && (
                      <button onClick={() => advance(o)} disabled={busy} className="adm-btn adm-btn-primary adm-btn-sm" style={{ opacity:busy?0.6:1 }}>
                        {busy ? "…" : nextLbl}
                      </button>
                    )}
                    <button onClick={() => cancel(o)} disabled={busy} className="adm-btn adm-btn-ghost adm-btn-sm" style={{ color:"var(--err)", borderColor:"rgba(226,75,74,.3)", opacity:busy?0.6:1 }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {ToastEl}
    </div>
  );
}

/* ─── BranchStockHistoryPanel ────────────────────────────────────────────── */
function BranchStockHistoryPanel({ branchId }) {
  return (
    <div>
      <p style={{ fontSize:".875rem", color:"var(--t3)", marginBottom:16, lineHeight:1.6 }}>
        Shows every stock change for this branch: opening sets, top-ups, carryovers, locks, and waste entries.
        All times in <strong>IST</strong>. Past dates can be selected using the date picker.
      </p>
      <StockActivityLog branchId={branchId} isSuperAdmin={false} />
    </div>
  );
}

/* ─── BranchPaymentsPanel ────────────────────────────────────────────────── */
function BranchPaymentsPanel({ branchId }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [date,    setDate]    = useState(new Date().toISOString().slice(0,10));
  const [method,  setMethod]  = useState("");
  const [totals,  setTotals]  = useState({ upi:0, cash:0, card:0, all:0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (method) params.set("method", method);
      const r = await axiosClient.get(`/orders/payment-logs/?${params}`);
      const data = r.data.logs || [];
      setLogs(data);
      const t = { upi:0, cash:0, card:0, all:0 };
      data.forEach(l => { t[l.payment_method] = (t[l.payment_method]||0) + (l.total||0); t.all += (l.total||0); });
      setTotals(t);
    } catch {}
    finally { setLoading(false); }
  }, [date, method]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const hdr = ["Serial","Token","Customer","Method","Amount","Marked By","Time"];
    const rows = logs.map(l => [
      l.payment_serial||"—", l.token_number,
      l.customer_name||"Walk-in", l.payment_method.toUpperCase(),
      (l.total||0).toFixed(2), l.marked_by||"—",
      new Date(l.created_at).toLocaleString("en-IN", { timeZone:"Asia/Kolkata" }),
    ]);
    const csv = [hdr,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = `payments-${date}.csv`; a.click();
  };

  const methodStyle = m => m === "upi" ? { bg:"rgba(55,138,221,.12)", color:"var(--info)" }
    : m === "card" ? { bg:"rgba(95,37,159,.12)", color:"#7c3aed" }
    : { bg:"var(--ok-t)", color:"var(--ok)" };

  return (
    <div>
      {/* Summary chips */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { label:"Total", value:totals.all, color:"var(--brand)" },
          { label:"UPI",   value:totals.upi,  color:"var(--info)" },
          { label:"Cash",  value:totals.cash, color:"var(--ok)" },
          { label:"Card",  value:totals.card, color:"#7c3aed" },
        ].map(c => (
          <div key={c.label} style={{ padding:"10px 16px", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", minWidth:110 }}>
            <div style={{ fontSize:".625rem", fontWeight:800, textTransform:"uppercase", letterSpacing:".08em", color:"var(--t4)", marginBottom:3 }}>{c.label}</div>
            <div style={{ fontFamily:"var(--ff-d)", fontWeight:900, fontSize:"1.125rem", color:c.color }}>{formatPrice(c.value)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="adm-filter-bar" style={{ marginBottom:14 }}>
        <div className="adm-filter-group">
          <label className="adm-field-lbl">Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="adm-input" style={{ width:150 }}/>
        </div>
        <div className="adm-filter-group">
          <label className="adm-field-lbl">Method</label>
          <select value={method} onChange={e=>setMethod(e.target.value)} className="adm-select">
            <option value="">All</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
        </div>
        <button onClick={load} className="adm-btn adm-btn-ghost adm-btn-sm">Refresh</button>
        {logs.length > 0 && (
          <button onClick={exportCSV} className="adm-btn adm-btn-ghost adm-btn-sm" style={{ marginLeft:"auto" }}>⬇ CSV</button>
        )}
      </div>

      <div className="adm-card">
        {loading ? (
          <div style={{ padding:24, display:"flex", flexDirection:"column", gap:8 }}>
            {[1,2,3].map(i=><div key={i} className="skel" style={{ height:52 }}/>)}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding:"56px 20px", textAlign:"center", color:"var(--t3)" }}>No payment records for {date}.</div>
        ) : logs.map(l => {
          const ms = methodStyle(l.payment_method);
          return (
            <div key={l.id} style={{ padding:"12px 16px", borderBottom:"1px solid var(--bd)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:".8125rem", padding:"3px 10px", borderRadius:6, background:"var(--bg2)", border:"1px solid var(--bd)", color:"var(--t2)", flexShrink:0 }}>
                {l.token_number}
              </div>
              <div style={{ flex:1, minWidth:120 }}>
                <div style={{ fontWeight:700, fontSize:".9375rem" }}>{l.customer_name || "Walk-in"}</div>
                <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:2 }}>
                  {l.payment_serial ? `#${l.payment_serial} · ` : ""}
                  {new Date(l.created_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", timeZone:"Asia/Kolkata" })} IST
                  {l.marked_by ? ` · by ${l.marked_by}` : ""}
                </div>
              </div>
              <span style={{ fontSize:".6875rem", fontWeight:800, padding:"3px 10px", borderRadius:20, background:ms.bg, color:ms.color, border:`1px solid ${ms.color}33`, textTransform:"uppercase", flexShrink:0 }}>
                {l.payment_method}
              </span>
              <div style={{ fontWeight:800, color:"var(--brand)", fontSize:"1rem", flexShrink:0 }}>
                {formatPrice(l.total||0)}
              </div>
            </div>
          );
        })}
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
  const [nextOpenAt, setNextOpenAt] = useState(null);
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
      setNextOpenAt(r.data.next_open_at || null);
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
                {tab === "overview" ? "Dashboard" : tab === "staff" ? "Staff manager" : tab === "orders" ? "Orders" : tab === "tables" ? "Tables" : "Payments"}
              </h1>
              <p className="adm-page-sub">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {data.alerts > 0 && (
                <Link to="/admin/stock" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "rgba(226,75,74,.08)", border: "1px solid rgba(226,75,74,.2)", borderRadius: 20, color: "var(--err)", fontWeight: 700, fontSize: ".8125rem", textDecoration: "none" }}>
                  <Ic.Alert />{data.alerts} alert{data.alerts !== 1 ? "s" : ""}
                </Link>
              )}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                <div className={`adm-status-pill ${isOpen ? "open" : "closed"}`}>
                  <div className="adm-dot" style={{ background: isOpen ? "var(--ok)" : "var(--err)" }} />
                  {isOpen ? "Open (IST)" : "Closed (IST)"}
                </div>
                {!isOpen && nextOpenAt && (
                  <div style={{ fontSize:".6875rem", color:"var(--t4)", fontWeight:600 }}>
                    Opens {new Date(nextOpenAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", timeZone:"Asia/Kolkata" })} IST
                  </div>
                )}
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
                      { label: "Staff",       desc: "Accounts & shifts",   icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, onClick: () => setTab("staff") },
                      { label: "Orders",      desc: "View & complete",      icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, onClick: () => setTab("orders") },
                      { label: "New order",   desc: "POS / walk-in",        icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>, isLink: true, to: "/staff/queue" },
                      { label: "Stock",       desc: "Inventory & history",  icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>, isLink: true, to: "/admin/stock" },
                      { label: "Payments",    desc: "Bills & UPI / Cash",   icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, onClick: () => setTab("payments") },
                      { label: "Tables",      desc: "Dine-in seat config",   icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="10" width="18" height="8" rx="2"/><path d="M7 10V6a5 5 0 0110 0v4"/><line x1="12" y1="18" x2="12" y2="22"/></svg>, onClick: () => setTab("tables") },
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
            <BranchOrdersTab branchId={user?.branch_id} />
          )}

          {/* ── PAYMENTS ── */}
          {tab === "payments" && (
            <BranchPaymentsPanel branchId={user?.branch_id} />
          )}

          {/* ── TABLES ── */}
          {tab === "tables" && (
            <BranchTablesManager branchId={user?.branch_id} />
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

/* ── Stock Tab (Refill + History combined) ─────────────────────── */
/* ── Branch Admin Activity Log panel ─────────────────────────────── */
function AdminActivityLogPanel({ branches }) {
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [role, setRole]         = useState("all"); // default to all-roles so resets by any user are visible
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!branchId && !role) return;
    setLoading(true);
    try {
      const params = { date, role };
      if (branchId) params.branch_id = branchId;
      const r = await axiosClient.get("/stock/admin-log/", { params });
      setData(r.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [branchId, date, role]);

  useEffect(() => { load(); }, [load]);

  const CHANGE_LABELS = {
    opening_set: "Opening Set", top_up: "Top-Up", auto_deduction: "Order Deduction",
    manual_correction: "Correction", carryover: "Carryover", rollback: "Rollback",
    waste: "Waste", lock: "Stock Lock",
  };
  const CHANGE_COLORS = {
    opening_set:"var(--brand)", top_up:"var(--ok)", auto_deduction:"var(--t3)",
    manual_correction:"var(--warn)", carryover:"#60a5fa", rollback:"#60a5fa",
    waste:"var(--err)", lock:"var(--err)",
  };
  // Detect full reset entries (manual_correction where reason contains "reset")
  const isResetLog = (log) =>
    log.change_type === "manual_correction" &&
    typeof log.reason === "string" &&
    log.reason.toLowerCase().includes("reset");

  return (
    <div>
      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <select value={branchId} onChange={e => setBranchId(e.target.value)}
          style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
          <option value="">All branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)" }} />
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
          <option value="branch_admin">Branch Admin only</option>
          <option value="staff">Staff only</option>
          <option value="all">All roles</option>
        </select>
        <button onClick={load}
          style={{ padding:"8px 14px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".875rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)" }}>
          Refresh
        </button>
      </div>

      {/* Daily lock summary */}
      {data?.locks?.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:".6875rem", fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"var(--t4)", marginBottom:8 }}>Daily Lock Summary</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {data.locks.map((lk, i) => (
              <div key={i} style={{ padding:"10px 14px", borderRadius:"var(--radius-sm)", border:"1px solid rgba(226,75,74,.25)", background:"rgba(226,75,74,.05)", minWidth:200 }}>
                <div style={{ fontWeight:700, fontSize:".875rem", color:"var(--err)", marginBottom:4 }}>
                  {lk.branch} — Locked
                </div>
                <div style={{ fontSize:".8125rem", color:"var(--t3)", lineHeight:1.6 }}>
                  By: <strong style={{ color:"var(--t1)" }}>{lk.locked_by}</strong><br/>
                  Added: {lk.total_added} · Used: — · Left: {lk.total_remaining}<br/>
                  {lk.note && <span>Note: {lk.note}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log table */}
      {loading ? (
        <div style={{ padding:"40px", textAlign:"center", color:"var(--t3)" }}>Loading…</div>
      ) : !data || data.logs.length === 0 ? (
        <div style={{ padding:"40px", textAlign:"center", color:"var(--t4)", fontSize:".875rem" }}>
          No activity found for selected filters.
        </div>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".875rem" }}>
            <thead>
              <tr style={{ background:"var(--bg2)", borderBottom:"2px solid var(--bd)" }}>
                {["Branch","Item","Action","Before","Change","After","By","Time","Note"].map(h => (
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:".6875rem", fontWeight:800, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t4)", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.logs.map(log => {
                const isReset = isResetLog(log);
                return (
                <tr key={log.id}
                  style={{ borderBottom:"1px solid var(--bd)", transition:"background .1s", background: isReset ? "rgba(226,75,74,.04)" : "transparent" }}
                  onMouseEnter={e => e.currentTarget.style.background = isReset ? "rgba(226,75,74,.08)" : "var(--bg2)"}
                  onMouseLeave={e => e.currentTarget.style.background = isReset ? "rgba(226,75,74,.04)" : "transparent"}>
                  <td style={{ padding:"8px 12px", color:"var(--t3)", whiteSpace:"nowrap" }}>{log.branch}</td>
                  <td style={{ padding:"8px 12px", fontWeight:600, color:"var(--t1)", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.item}</td>
                  <td style={{ padding:"8px 12px", whiteSpace:"nowrap" }}>
                    <span style={{ padding:"2px 8px", borderRadius:"var(--rf)", background: isReset ? "rgba(226,75,74,.15)" : `${CHANGE_COLORS[log.change_type] || "var(--t4)"}18`, color: isReset ? "var(--err)" : (CHANGE_COLORS[log.change_type] || "var(--t4)"), fontSize:".6875rem", fontWeight:800, textTransform:"uppercase" }}>
                      {isReset ? "Full Reset" : (CHANGE_LABELS[log.change_type] || log.change_type)}
                    </span>
                  </td>
                  <td style={{ padding:"8px 12px", color:"var(--t3)", textAlign:"right" }}>{log.qty_before}</td>
                  <td style={{ padding:"8px 12px", fontWeight:700, color:log.qty_changed > 0 ? "var(--ok)" : log.qty_changed < 0 ? "var(--err)" : "var(--t3)", textAlign:"right" }}>
                    {log.qty_changed > 0 ? `+${log.qty_changed}` : log.qty_changed}
                  </td>
                  <td style={{ padding:"8px 12px", fontWeight:700, color:"var(--t1)", textAlign:"right" }}>{log.qty_after}</td>
                  <td style={{ padding:"8px 12px", color:"var(--t2)", whiteSpace:"nowrap" }}>{log.changed_by}</td>
                  <td style={{ padding:"8px 12px", color:"var(--t4)", whiteSpace:"nowrap", fontSize:".8125rem" }}>
                    {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                  </td>
                  <td style={{ padding:"8px 12px", color: isReset ? "var(--err)" : "var(--t3)", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight: isReset ? 700 : 400 }}>{log.reason || "—"}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SuperAdminStockTab({ branches }) {
  const [subTab, setSubTab] = useState("refill");

  const SUB = [
    { key:"refill",   label:"Stock Refill",  icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><line x1="12" y1="9" x2="12" y2="15" strokeLinecap="round"/><line x1="9" y1="12" x2="15" y2="12" strokeLinecap="round"/></svg> },
    { key:"history",  label:"Stock History", icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { key:"adminlog", label:"Admin Log",     icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  ];

  return (
    <div>
      {/* Sub-tab switcher */}
      <div style={{ display:"flex", gap:4, marginBottom:20, background:"var(--bg2)", padding:4, borderRadius:"var(--radius-sm)", width:"fit-content", border:"1px solid var(--bd)" }}>
        {SUB.map(s => (
          <button key={s.key} onClick={() => setSubTab(s.key)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:6, border:"none", cursor:"pointer", fontSize:".875rem", fontWeight:subTab===s.key?700:500, background:subTab===s.key?"var(--bgc)":"transparent", color:subTab===s.key?"var(--brand)":"var(--t2)", boxShadow:subTab===s.key?"var(--sh-sm)":"none", transition:"all 160ms", fontFamily:"var(--ff-b)" }}>
            <span style={{ color:subTab===s.key?"var(--brand)":"var(--t3)" }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {subTab === "refill"   && <StockRefillPanel   branches={branches}/>}
      {subTab === "history"  && <StockHistoryPanel  branches={branches}/>}
      {subTab === "adminlog" && <AdminActivityLogPanel branches={branches}/>}
    </div>
  );
}

function StockRefillPanel({ branches }) {
  const [branchId,     setBranchId]     = useState(branches[0]?.id || "");
  const [stock,        setStock]        = useState([]);
  const [menuItems,    setMenuItems]    = useState([]);
  const [alertCount,   setAlertCount]   = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [topUpItem,    setTopUpItem]    = useState(null);
  const [showOpening,  setShowOpening]  = useState(false);
  const [search,       setSearch]       = useState("");
  const [acknowledged, setAcknowledged] = useState(new Set());

  useEffect(() => {
    if (!branchId && branches.length) setBranchId(branches[0].id);
  }, [branches]);

  const loadStock = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    axiosClient.get("/stock/", { params: { branch_id: branchId } })
      .then(r => { setStock(r.data.stock || []); setAlertCount(r.data.alert_count || 0); })
      .catch(() => setStock([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    loadStock();
    if (branchId) {
      adminGetItems({}, branchId)
        .then(r => setMenuItems(r.data.items || []))
        .catch(() => {});
    }
  }, [branchId]);

  useEffect(() => { setAcknowledged(new Set()); }, [branchId]);

  const filtered = search
    ? stock.filter(i => i.menu_item_name.toLowerCase().includes(search.toLowerCase()))
    : stock;

  const outCount  = stock.filter(s => s.status === "out").length;
  const lowCount  = stock.filter(s => s.status === "low" || s.status === "critical").length;
  const okCount   = stock.filter(s => s.status === "ok").length;
  const totalLeft = stock.reduce((a, s) => a + s.remaining_stock, 0);

  return (
    <div>
      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <select value={branchId} onChange={e => { setBranchId(e.target.value); setSearch(""); }}
          style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", cursor:"pointer", fontFamily:"var(--ff-b)" }}>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
          style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", flex:1, minWidth:140 }}/>
        <button onClick={loadStock}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", fontSize:".875rem", fontWeight:600, color:"var(--t2)", fontFamily:"var(--ff-b)" }}>
          <IcRefresh /> Refresh
        </button>
        {alertCount > 0 && (
          <button onClick={() => axiosClient.patch("/stock/alerts/ack/").then(() => setAlertCount(0))}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:"var(--radius-sm)", border:"1px solid rgba(245,158,11,.3)", background:"rgba(245,158,11,.08)", cursor:"pointer", fontSize:".875rem", fontWeight:700, color:"var(--warn)", fontFamily:"var(--ff-b)" }}>
            ⚠ {alertCount} alert{alertCount!==1?"s":""} — mark seen
          </button>
        )}
        <button onClick={() => setShowOpening(v => !v)}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:"var(--radius-sm)", border:`1.5px solid ${showOpening?"var(--brand)":"var(--bd)"}`, background:showOpening?"var(--brand-tint)":"var(--bg2)", cursor:"pointer", fontSize:".875rem", fontWeight:700, color:showOpening?"var(--brand)":"var(--t2)", fontFamily:"var(--ff-b)", transition:"all 160ms" }}>
          <IcSun /> {showOpening ? "Close" : "Set Opening Stock"}
        </button>
      </div>

      {/* Stats mini-row */}
      {stock.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8, marginBottom:16 }}>
          {[
            { label:"Out",        value:outCount,  color:"var(--err)"  },
            { label:"Low",        value:lowCount,  color:"var(--warn)" },
            { label:"Good",       value:okCount,   color:"var(--ok)"   },
            { label:"Total left", value:totalLeft, color:"var(--info)" },
          ].map(s => (
            <div key={s.label} style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--radius-sm)", padding:"10px 14px" }}>
              <div style={{ fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", color:"var(--t3)", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Opening stock panel */}
      {showOpening && menuItems.length > 0 && (
        <OpeningStockPanel
          menuItems={menuItems}
          branchId={branchId}
          onClose={() => setShowOpening(false)}
          onDone={loadStock}
        />
      )}

      {/* Stock cards grid */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skel" style={{ height:180, borderRadius:"var(--radius-sm)" }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-title">No items</div>
          <div className="adm-empty-sub">Select a branch or clear the search.</div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
          {filtered.map(s => (
            <StockCard
              key={s.menu_item_id}
              s={s}
              branchId={branchId}
              onTopUp={setTopUpItem}
              onReload={loadStock}
              isAcknowledged={acknowledged.has(s.menu_item_id)}
              onAcknowledge={id => setAcknowledged(prev => new Set([...prev, id]))}
            />
          ))}
        </div>
      )}

      {topUpItem && (
        <TopUpModal item={topUpItem} onClose={() => setTopUpItem(null)} onDone={loadStock} />
      )}
    </div>
  );
}

function StockHistoryPanel({ branches }) {
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
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!branchId && branches.length) setBranchId(branches[0].id);
  }, [branches]);

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div>
          <div style={{ fontSize:".75rem", fontWeight:600, color:"var(--t3)", marginBottom:4 }}>Branch</div>
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", cursor:"pointer" }}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:".75rem", fontWeight:600, color:"var(--t3)", marginBottom:4 }}>From</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem" }}/>
        </div>
        <div>
          <div style={{ fontSize:".75rem", fontWeight:600, color:"var(--t3)", marginBottom:4 }}>To</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem" }}/>
        </div>
        <button onClick={load} className="adm-btn adm-btn-primary" style={{ padding:"8px 16px" }}>Apply</button>
        <span style={{ fontSize:".6875rem", padding:"3px 8px", borderRadius:20, background:"rgba(29,158,117,.12)", color:"var(--ok)", fontWeight:800, border:"1px solid rgba(29,158,117,.2)", alignSelf:"flex-end", marginBottom:1 }}>LIVE · 30s</span>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>{[1,2,3].map(i => <div key={i} className="skel" style={{ height:52 }}/>)}</div>
      ) : records.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg></div>
          <div className="adm-empty-title">No stock records</div>
          <div className="adm-empty-sub">Stock records appear once items are topped up for the day.</div>
        </div>
      ) : (
        <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".875rem" }}>
            <thead>
              <tr style={{ background:"var(--bg3)", borderBottom:"1px solid var(--bd)" }}>
                {["Item","Date","Opening","Added","Total","Used","Remaining"].map(h => (
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:700, fontSize:".6875rem", textTransform:"uppercase", letterSpacing:".06em", color:"var(--t3)", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const pct = r.today_stock > 0 ? Math.round((r.remaining_stock / r.today_stock) * 100) : 0;
                const sc  = pct === 0 ? "var(--err)" : pct < 25 ? "var(--warn)" : "var(--ok)";
                return (
                  <tr key={r.id || i} style={{ borderBottom:"1px solid var(--bd)" }}>
                    <td style={{ padding:"10px 14px", fontWeight:600 }}>{r.menu_item_name}</td>
                    <td style={{ padding:"10px 14px", color:"var(--t3)", fontSize:".8125rem" }}>{r.date}</td>
                    <td style={{ padding:"10px 14px", color:"var(--t3)" }}>{r.opening_stock || 0}</td>
                    <td style={{ padding:"10px 14px", color:"var(--info)", fontWeight:600 }}>+{r.new_stock_added || 0}</td>
                    <td style={{ padding:"10px 14px", fontWeight:700 }}>{r.today_stock || 0}</td>
                    <td style={{ padding:"10px 14px", color:"var(--err)" }}>{r.used_stock || 0}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontWeight:700, color:sc }}>{r.remaining_stock || 0}</span>
                      <span style={{ fontSize:".6875rem", color:sc, marginLeft:4 }}>({pct}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    <div className="stt-section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
function SettingsRow({ label, help, children, wide = false }) {
  return (
    <div className={`stt-row${wide ? " stt-row--wide" : ""}`}>
      <div className="stt-row-label">
        <strong>{label}</strong>
        {help && <span>{help}</span>}
      </div>
      <div className="stt-row-ctrl">{children}</div>
    </div>
  );
}
function SettingsToggle({ k }) {
  const { form, set } = React.useContext(SettingsCtx);
  return (
    <button type="button" onClick={() => set(k, !form[k])}
      style={{ width:48, height:26, borderRadius:13, background:form[k]?"var(--ok)":"var(--bg3)", border:`1px solid ${form[k]?"var(--ok)":"var(--bd)"}`, position:"relative", cursor:"pointer", transition:"all .2s", flexShrink:0, display:"block" }}>
      <div style={{ position:"absolute", top:3, width:18, height:18, borderRadius:"50%", background:"#fff", left:form[k]?26:3, transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.25)" }}/>
    </button>
  );
}
function SettingsNum({ k, min, max, step=1, suffix="" }) {
  const { form, set } = React.useContext(SettingsCtx);
  const isFloat = step < 1;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <input type="number" min={min} max={max} step={step}
        value={form[k] ?? 0}
        onChange={e => {
          const raw = e.target.value;
          const v = isFloat ? parseFloat(raw) : parseInt(raw, 10);
          set(k, isNaN(v) ? 0 : Math.min(max, Math.max(min, v)));
        }}
        style={{ width:80, padding:"7px 10px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".9375rem", fontWeight:700, textAlign:"center", outline:"none" }}/>
      {suffix && <span style={{ fontSize:".875rem", color:"var(--t3)", whiteSpace:"nowrap" }}>{suffix}</span>}
    </div>
  );
}

/* ── Home Page Ads Panel (inline within Settings) ─────────────── */
/* ── Home Section Images Panel ────────────────────────────────────── */
const SECTION_DEFS = [
  { key:"is_hotdeals",    label:"Hot Deals",     emoji:"🔥" },
  { key:"is_chicken",     label:"Chicken Items", emoji:"🍗" },
  { key:"is_snacks",      label:"Snacks",        emoji:"🍟" },
  { key:"is_cold_drinks", label:"Cold Drinks",   emoji:"🥤" },
];

/* ── VideoUploadField ────────────────────────────────────────────────────── */
function VideoUploadField({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState("");

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) { setErr("Please select a video file (MP4, MOV, etc.)"); return; }
    setUploading(true); setErr("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await axiosClient.post("/branches/upload-media/", fd, { headers:{ "Content-Type":"multipart/form-data" } });
      if (r.data.url) onChange(r.data.url);
    } catch (e) {
      setErr(e.response?.data?.error || "Upload failed.");
    } finally { setUploading(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%" }}>
      {value && (
        <video src={value} controls muted
          style={{ width:"100%", maxWidth:360, height:130, objectFit:"cover", borderRadius:"var(--r3)", border:"1px solid var(--bd)", background:"#000" }}/>
      )}
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder="Paste .mp4 URL or upload →"
          className="stt-input stt-input--wide" style={{ flex:1, minWidth:160 }}/>
        <label style={{ padding:"6px 14px", borderRadius:"var(--r2)", border:"1.5px solid var(--bd)", background:"var(--bg)", color:"var(--t2)", fontSize:".8125rem", fontWeight:600, cursor:uploading?"not-allowed":"pointer", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", flexShrink:0, opacity:uploading?0.65:1 }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {uploading ? "Uploading…" : "Upload video"}
          <input type="file" accept="video/*" onChange={e => handleUpload(e.target.files[0])} style={{ display:"none" }} disabled={uploading}/>
        </label>
        {value && (
          <button type="button" onClick={() => onChange("")}
            style={{ padding:"6px 12px", borderRadius:"var(--r2)", border:"1px solid rgba(226,75,74,.3)", background:"var(--err-t)", color:"var(--err)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--ff-b)", flexShrink:0 }}>
            Remove
          </button>
        )}
      </div>
      {err && <div style={{ fontSize:".8125rem", color:"var(--err)", fontWeight:600 }}>⚠ {err}</div>}
      <div style={{ fontSize:".75rem", color:"var(--t4)" }}>MP4 recommended · Max ~50 MB · Plays silently on desktop login</div>
    </div>
  );
}

/* ── LoginSlidesEditor ─────────────────────────────────────────────────── */
const DEFAULT_SLIDE = {
  word:"CRAVE", sub:"Crispy fried chicken",
  gradient:"linear-gradient(160deg,#1c0800 0%,#5c1f00 55%,#b34400 100%)",
  accent:"#e06000", img:"/assets/image/dishes/dish-0.png",
};

/* Mirror of MOB_SLIDES in CustomerLogin.jsx — pre-populates the editor */
const DEFAULT_SLIDES_FOR_EDITOR = [
  { word:"CRAVE",  sub:"Crispy fried chicken",  gradient:"linear-gradient(160deg,#1c0800 0%,#5c1f00 55%,#b34400 100%)", accent:"#e06000", img:"/assets/image/dishes/dish-0.png" },
  { word:"SMASH",  sub:"Juicy smash burgers",   gradient:"linear-gradient(160deg,#0c0020 0%,#2d0060 55%,#6600cc 100%)", accent:"#a855f7", img:"/assets/image/dishes/dish-1.png" },
  { word:"ENJOY",  sub:"Golden crispy fries",   gradient:"linear-gradient(160deg,#001408 0%,#003d18 55%,#007330 100%)", accent:"#22c55e", img:"/assets/image/dishes/dish-2.png" },
  { word:"RELISH", sub:"Ice-cold beverages",    gradient:"linear-gradient(160deg,#000d1a 0%,#002a50 55%,#005599 100%)", accent:"#3b82f6", img:"/assets/image/dishes/dish-3.png" },
  { word:"FEAST",  sub:"Spicy loaded combos",   gradient:"linear-gradient(160deg,#1a0000 0%,#4d0000 55%,#990000 100%)", accent:"#ef4444", img:"/assets/image/dishes/dish-4.png" },
];

function LoginSlidesEditor({ slides, onChange }) {
  const [uploading, setUploading] = useState({});

  const update = (i, k, v) => onChange(slides.map((s, j) => j === i ? { ...s, [k]: v } : s));
  const remove = (i) => onChange(slides.filter((_, j) => j !== i));
  const add    = () => onChange([...slides, { ...DEFAULT_SLIDE }]);
  const move   = (i, dir) => {
    const arr = [...slides];
    const to = i + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[i], arr[to]] = [arr[to], arr[i]];
    onChange(arr);
  };

  const handleImgUpload = async (i, file) => {
    if (!file) return;
    setUploading(u => ({ ...u, [i]: true }));
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await axiosClient.post("/branches/upload-media/", fd, { headers:{ "Content-Type":"multipart/form-data" } });
      if (r.data.url) update(i, "img", r.data.url);
    } catch {}
    finally { setUploading(u => ({ ...u, [i]: false })); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"14px", width:"100%", maxWidth:"620px" }}>
      {slides.length === 0 && (
        <div style={{ padding:"var(--s4)", background:"var(--bg2)", borderRadius:"var(--r3)", border:"1px dashed var(--bd)", fontSize:".875rem", color:"var(--t3)", textAlign:"center" }}>
          No custom slides — defaults are used. Add a slide to override.
        </div>
      )}

      {slides.map((sl, i) => (
        <div key={i} style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden" }}>
          {/* Slide header with mini-preview */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 14px", borderBottom:"1px solid var(--bd)", background:"var(--bgc)" }}>
            {/* Mini gradient preview */}
            <div style={{ width:48, height:64, borderRadius:"var(--r3)", background:sl.gradient, flexShrink:0, position:"relative", overflow:"hidden", border:"1px solid rgba(255,255,255,.1)" }}>
              {sl.img && <img src={sl.img} alt="" style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", height:"80%", objectFit:"contain" }} onError={e => e.currentTarget.style.display="none"}/>}
              <div style={{ position:"absolute", bottom:2, left:0, right:0, textAlign:"center", fontSize:6, fontWeight:900, color:"#fff", letterSpacing:1, textShadow:"0 1px 4px rgba(0,0,0,.8)" }}>
                {sl.word}
              </div>
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:".875rem", color:"var(--t1)" }}>{sl.word || "—"}</div>
              <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:1 }}>{sl.sub || "—"}</div>
            </div>

            {/* Accent dot */}
            <div style={{ width:20, height:20, borderRadius:"50%", background:sl.accent, border:"2px solid var(--bd)", flexShrink:0 }}/>

            {/* Move up/down */}
            <div style={{ display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
              <button type="button" onClick={() => move(i, -1)} disabled={i===0}
                style={{ width:22, height:22, border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t3)", cursor:i===0?"not-allowed":"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", opacity:i===0?0.35:1 }}>
                ▲
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i===slides.length-1}
                style={{ width:22, height:22, border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t3)", cursor:i===slides.length-1?"not-allowed":"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", opacity:i===slides.length-1?0.35:1 }}>
                ▼
              </button>
            </div>

            <button type="button" onClick={() => remove(i)}
              style={{ width:28, height:28, borderRadius:"var(--r2)", border:"1px solid rgba(226,75,74,.3)", background:"var(--err-t)", color:"var(--err)", cursor:"pointer", fontSize:"1rem", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              ×
            </button>
          </div>

          {/* Fields */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", padding:"12px 14px" }}>
            {/* Word */}
            <div>
              <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--t4)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Headline word</div>
              <input value={sl.word || ""} onChange={e => update(i,"word",e.target.value.toUpperCase())}
                placeholder="CRAVE"
                style={{ width:"100%", padding:"7px 10px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bgc)", color:"var(--t1)", fontSize:".9375rem", fontWeight:800, fontFamily:"var(--ff-d)", letterSpacing:".04em", outline:"none", boxSizing:"border-box", textTransform:"uppercase" }}/>
            </div>

            {/* Sub text */}
            <div>
              <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--t4)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Subtitle</div>
              <input value={sl.sub || ""} onChange={e => update(i,"sub",e.target.value)}
                placeholder="Crispy fried chicken"
                style={{ width:"100%", padding:"7px 10px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", outline:"none", boxSizing:"border-box" }}/>
            </div>

            {/* Dish image URL + upload */}
            <div style={{ gridColumn:"1 / -1" }}>
              <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--t4)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Dish image</div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <input value={sl.img || ""} onChange={e => update(i,"img",e.target.value)}
                  placeholder="/assets/image/dishes/dish-0.png or https://..."
                  style={{ flex:1, padding:"7px 10px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bgc)", color:"var(--t1)", fontSize:".8125rem", fontFamily:"monospace", outline:"none" }}/>
                <label style={{ padding:"6px 12px", borderRadius:"var(--r2)", border:"1.5px solid var(--bd)", background:"var(--bg)", color:"var(--t2)", fontSize:".8125rem", fontWeight:600, cursor:uploading[i]?"not-allowed":"pointer", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", flexShrink:0, opacity:uploading[i]?0.65:1 }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {uploading[i] ? "Uploading…" : "Upload"}
                  <input type="file" accept="image/*" onChange={e => handleImgUpload(i, e.target.files[0])} style={{ display:"none" }} disabled={uploading[i]}/>
                </label>
              </div>
            </div>

            {/* Accent color */}
            <div>
              <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--t4)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Accent colour</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="color" value={sl.accent || "#e06000"} onChange={e => update(i,"accent",e.target.value)}
                  style={{ width:38, height:34, padding:2, border:"1px solid var(--bd)", borderRadius:"var(--r2)", cursor:"pointer", background:"var(--bg)", flexShrink:0 }}/>
                <input value={sl.accent || ""} onChange={e => update(i,"accent",e.target.value)}
                  placeholder="#e06000"
                  style={{ flex:1, padding:"7px 10px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bgc)", color:"var(--t1)", fontSize:".8125rem", fontFamily:"monospace", outline:"none" }}/>
              </div>
            </div>

            {/* Background gradient */}
            <div>
              <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--t4)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Background gradient</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:38, height:34, borderRadius:"var(--r2)", background:sl.gradient, border:"1px solid var(--bd)", flexShrink:0 }}/>
                <input value={sl.gradient || ""} onChange={e => update(i,"gradient",e.target.value)}
                  placeholder="linear-gradient(160deg,#000 0%,#333 100%)"
                  style={{ flex:1, padding:"7px 10px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bgc)", color:"var(--t1)", fontSize:".75rem", fontFamily:"monospace", outline:"none" }}/>
              </div>
              <div style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:4 }}>
                Tip: use a dark-to-medium gradient. Example: <code style={{fontSize:".6875rem"}}>linear-gradient(160deg,#0c0020 0%,#2d0060 55%,#6600cc 100%)</code>
              </div>
            </div>
          </div>
        </div>
      ))}

      {slides.length < 6 && (
        <button type="button" onClick={add}
          style={{ padding:"8px 16px", borderRadius:"var(--r3)", border:"1.5px dashed var(--bd)", background:"transparent", color:"var(--t3)", cursor:"pointer", fontSize:".875rem", fontWeight:600, alignSelf:"flex-start", transition:"all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.color="var(--brand)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.color="var(--t3)"; }}>
          + Add slide
        </button>
      )}

      <div style={{ fontSize:".75rem", color:"var(--t4)" }}>
        {slides.length === 0 ? "Using built-in defaults (5 slides)." : `${slides.length} custom slide${slides.length !== 1 ? "s" : ""}. Changes save with the main Save button.`}
      </div>
    </div>
  );
}

function HomeSectionImagesPanel({ form, set }) {
  const imgs = (typeof form.home_section_images === "object" && form.home_section_images !== null)
    ? form.home_section_images : {};
  const [uploading,  setUploading]  = useState({});
  const [previews,   setPreviews]   = useState({});

  const update = (key, field, val) =>
    set("home_section_images", { ...imgs, [key]: { ...(imgs[key] || {}), [field]: val } });

  const handleUpload = async (key, file) => {
    if (!file) return;
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = ev => setPreviews(p => ({ ...p, [key]: ev.target.result }));
    reader.readAsDataURL(file);

    setUploading(u => ({ ...u, [key]: true }));
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await axiosClient.post("/branches/upload-media/", fd, { headers:{ "Content-Type":"multipart/form-data" } });
      if (r.data.url) {
        update(key, "image_url", r.data.url);
        setPreviews(p => ({ ...p, [key]: null })); // clear local preview; use server URL
      }
    } catch {}
    finally { setUploading(u => ({ ...u, [key]: false })); }
  };

  const handleRemove = (key) => {
    update(key, "image_url", "");
    setPreviews(p => ({ ...p, [key]: null }));
  };

  const IS = { padding:"7px 10px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none", width:"100%", boxSizing:"border-box" };

  return (
    <SettingsSection title="Home Screen Section Panels">
      <SettingsRow label="Section images" help="Banner shown above each home page section. Leave blank to auto-use the first item's image." wide>
        <div style={{ display:"flex", flexDirection:"column", gap:14, width:"100%", maxWidth:520 }}>
          {SECTION_DEFS.map(({ key, label, emoji }) => {
            const sec       = imgs[key] || {};
            const imgSrc    = previews[key] || sec.image_url || null;
            const isLoading = uploading[key];

            return (
              <div key={key} style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>

                {/* Section header */}
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:"1.25rem" }}>{emoji}</span>
                  <span style={{ fontWeight:800, fontSize:".9375rem", color:"var(--t1)" }}>{label}</span>
                </div>

                {/* Image preview */}
                {imgSrc && (
                  <img src={imgSrc} alt={label}
                    style={{ width:"160px", height:"90px", objectFit:"cover", borderRadius:"var(--r3)", border:"1px solid var(--bd)" }}
                    onError={e => e.currentTarget.style.display="none"}/>
                )}

                {/* Banner image — URL input + upload button + remove */}
                <div>
                  <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--t3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:5 }}>Banner image</div>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                    <input value={sec.image_url || ""} onChange={e => { update(key,"image_url",e.target.value); setPreviews(p=>({...p,[key]:null})); }}
                      placeholder="Paste image URL…" style={{ ...IS, flex:1, minWidth:160 }}/>
                    <label style={{ padding:"6px 12px", borderRadius:"var(--r2)", border:"1.5px solid var(--bd)", background:"var(--bg)", color:"var(--t2)", fontSize:".8125rem", fontWeight:600, cursor:isLoading?"not-allowed":"pointer", fontFamily:"var(--ff-b)", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", opacity:isLoading?0.65:1, flexShrink:0 }}>
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {isLoading ? "Uploading…" : "Upload"}
                      <input type="file" accept="image/*" onChange={e => handleUpload(key, e.target.files[0])} style={{ display:"none" }} disabled={isLoading}/>
                    </label>
                    {imgSrc && (
                      <button type="button" onClick={() => handleRemove(key)}
                        style={{ padding:"6px 12px", borderRadius:"var(--r2)", border:"1px solid rgba(226,75,74,.3)", background:"var(--err-t)", color:"var(--err)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--ff-b)", flexShrink:0 }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Tagline */}
                <div>
                  <div style={{ fontSize:".6875rem", fontWeight:700, color:"var(--t3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:5 }}>Tagline (optional)</div>
                  <input value={sec.tagline || ""} onChange={e => update(key,"tagline",e.target.value)}
                    placeholder={`e.g. Today's best ${label}`} style={IS}/>
                </div>
              </div>
            );
          })}
          <p style={{ fontSize:".75rem", color:"var(--t4)" }}>
            Recommended size: 1200×400 px, landscape. Leave blank to auto-use the first item image.
          </p>
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}

function HomeAdsPanel({ form, set }) {
  const [newAd,       setNewAd]       = useState({ title:"", image_url:"", link:"" });
  const [addOpen,     setAddOpen]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadErr,   setUploadErr]   = useState("");
  const [imgPreview,  setImgPreview]  = useState("");

  const ads = form.home_ads || [];

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true); setUploadErr("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await axiosClient.post("/branches/upload-media/", fd, { headers:{ "Content-Type":"multipart/form-data" } });
      if (r.data.url) {
        setNewAd(n => ({ ...n, image_url: r.data.url }));
        setImgPreview(r.data.url);
      }
    } catch (e) {
      setUploadErr(e.response?.data?.error || "Upload failed.");
    } finally { setUploading(false); }
  };

  const addAd = () => {
    if (!newAd.title.trim() || !newAd.image_url.trim()) return;
    set("home_ads", [...ads, { id: Date.now().toString(), ...newAd, active: true }]);
    setNewAd({ title:"", image_url:"", link:"" }); setImgPreview(""); setAddOpen(false);
  };

  const removeAd = id => set("home_ads", ads.filter(a => a.id !== id));
  const toggleAd = id => set("home_ads", ads.map(a => a.id === id ? {...a, active:!a.active} : a));

  const inputStyle = { padding:"8px 12px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", outline:"none", width:"100%" };

  return (
    <SettingsSection title="Home Page Ads">
      <SettingsRow label="Banner ads" help="Banners appear in the hero section on the customer home page.">
        <div style={{ width:"100%", maxWidth:"600px" }}>
          {ads.length === 0 ? (
            <div style={{ padding:"16px 0", color:"var(--t3)", fontSize:".875rem" }}>No ads yet. Add a banner below.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
              {ads.map(ad => (
                <div key={ad.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", opacity:ad.active?1:.5 }}>
                  {ad.image_url && (
                    <img src={ad.image_url} alt={ad.title}
                      style={{ width:60, height:38, objectFit:"cover", borderRadius:"var(--r2)", flexShrink:0, border:"1px solid var(--bd)" }}
                      onError={e => e.target.style.display="none"}/>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ad.title}</div>
                    {ad.link && <div style={{ fontSize:".6875rem", color:"var(--t3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ad.link}</div>}
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button type="button" onClick={() => toggleAd(ad.id)}
                      style={{ padding:"4px 10px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:ad.active?"var(--ok-t)":"var(--bg3)", color:ad.active?"var(--ok)":"var(--t3)", fontSize:".75rem", fontWeight:700, cursor:"pointer" }}>
                      {ad.active ? "Active" : "Hidden"}
                    </button>
                    <button type="button" onClick={() => removeAd(ad.id)}
                      style={{ padding:"4px 8px", borderRadius:"var(--r2)", border:"1px solid rgba(226,75,74,.3)", background:"var(--err-t)", color:"var(--err)", fontSize:".75rem", cursor:"pointer" }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {addOpen ? (
            <div style={{ padding:16, background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", display:"flex", flexDirection:"column", gap:10 }}>
              <input placeholder="Ad title *" value={newAd.title} onChange={e => setNewAd(n=>({...n,title:e.target.value}))} style={inputStyle}/>

              {/* Image: upload OR paste URL */}
              <div>
                <div style={{ fontSize:".6875rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:6 }}>Image *</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"center" }}>
                  <input placeholder="Paste image URL or upload →" value={newAd.image_url} onChange={e => { setNewAd(n=>({...n,image_url:e.target.value})); setImgPreview(e.target.value); }} style={inputStyle}/>
                  <label style={{ padding:"8px 12px", borderRadius:"var(--r2)", border:"1.5px dashed var(--bd)", background:"var(--bgc)", color:"var(--t2)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {uploading ? "Uploading…" : "Upload"}
                    <input type="file" accept="image/*,video/mp4" style={{ display:"none" }} onChange={e => handleUpload(e.target.files[0])} disabled={uploading}/>
                  </label>
                </div>
                {uploadErr && <p style={{ fontSize:".75rem", color:"var(--err)", marginTop:4 }}>{uploadErr}</p>}
                {imgPreview && <img src={imgPreview} alt="preview" style={{ marginTop:8, width:"100%", maxHeight:80, objectFit:"cover", borderRadius:"var(--r2)", border:"1px solid var(--bd)" }} onError={e=>e.target.style.display="none"}/>}
              </div>

              <input placeholder="Click destination URL (optional)" value={newAd.link} onChange={e => setNewAd(n=>({...n,link:e.target.value}))} style={inputStyle}/>

              <div style={{ display:"flex", gap:8 }}>
                <button type="button" onClick={addAd} disabled={!newAd.title.trim()||!newAd.image_url.trim()}
                  style={{ padding:"7px 20px", borderRadius:"var(--r2)", border:"none", background:"var(--brand)", color:"#fff", fontWeight:700, fontSize:".875rem", cursor:"pointer", opacity:(!newAd.title.trim()||!newAd.image_url.trim())?.5:1 }}>
                  Add banner
                </button>
                <button type="button" onClick={() => { setAddOpen(false); setNewAd({ title:"", image_url:"", link:"" }); setImgPreview(""); }}
                  style={{ padding:"7px 14px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"transparent", color:"var(--t2)", fontSize:".875rem", cursor:"pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAddOpen(true)}
              style={{ padding:"8px 16px", borderRadius:"var(--r2)", border:"1.5px dashed var(--bd)", background:"transparent", color:"var(--t2)", fontSize:".875rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add banner ad
            </button>
          )}
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}

/* ── Support Tickets Tab ────────────────────────────────────────── */
function SupportTicketsTab({ branches }) {
  const [tickets,   setTickets]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [branchId,  setBranchId]  = useState("");
  const [statusF,   setStatusF]   = useState("");
  const [selected,  setSelected]  = useState(null);  // ticket being replied to
  const [reply,     setReply]     = useState("");
  const [replying,  setReplying]  = useState(false);
  const [ToastEl,   showToast]    = useToast();

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (branchId) params.branch_id = branchId;
    if (statusF)  params.status    = statusF;
    axiosClient.get("/support/tickets/", { params })
      .then(r => setTickets(r.data.tickets || []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [branchId, statusF]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async () => {
    if (!reply.trim() || !selected) return;
    setReplying(true);
    try {
      await axiosClient.patch(`/support/tickets/${selected.id}/`, { admin_reply: reply, status: "resolved" });
      showToast("Reply sent!");
      setSelected(null); setReply("");
      load();
    } catch { showToast("Failed to send reply."); }
    finally { setReplying(false); }
  };

  const STATUS_COLORS = {
    open:      "var(--err)",
    in_review: "var(--warn)",
    resolved:  "var(--ok)",
    closed:    "var(--t4)",
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
        <select value={branchId} onChange={e=>setBranchId(e.target.value)} className="adm-select" style={{ minWidth:160 }}>
          <option value="">All branches</option>
          {(branches||[]).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div style={{ display:"flex", gap:4, background:"var(--bg2)", padding:4, borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)" }}>
          {["","open","in_review","resolved","closed"].map(s=>(
            <button key={s} onClick={()=>setStatusF(s)} className="adm-btn adm-btn-sm"
              style={{ background:statusF===s?"var(--bgc)":"transparent", color:statusF===s?"var(--brand)":"var(--t2)", fontWeight:statusF===s?700:500, boxShadow:statusF===s?"var(--sh-xs)":"none" }}>
              {s||"All"}
            </button>
          ))}
        </div>
        <button onClick={load} className="adm-btn adm-btn-ghost adm-btn-sm">Refresh</button>
        <span style={{ marginLeft:"auto", fontSize:".8125rem", color:"var(--t3)" }}>{tickets.length} ticket{tickets.length!==1?"s":""}</span>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[1,2,3].map(i=><div key={i} className="skel" style={{ height:72, borderRadius:"var(--radius-sm)" }}/>)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
          <div className="adm-empty-title">No support tickets</div>
          <div className="adm-empty-sub">Customer messages will appear here.</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {tickets.map(t => (
            <div key={t.id} style={{ background:"var(--bgc)", border:`1px solid ${selected?.id===t.id?"var(--brand)":"var(--bd)"}`, borderRadius:"var(--radius)", overflow:"hidden", transition:"border-color var(--transition)" }}>
              {/* Ticket header */}
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", cursor:"pointer" }}
                onClick={()=>{ setSelected(selected?.id===t.id?null:t); setReply(t.admin_reply||""); }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,var(--brand),var(--brand-d))", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"#fff", fontSize:".9375rem", flexShrink:0 }}>
                  {(t.name||"?")[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:".9375rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.subject}</div>
                  <div style={{ fontSize:".75rem", color:"var(--t3)" }}>{t.name} · {t.email}{t.branch&&t.branch!=="—"?` · ${t.branch}`:""}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                  <span style={{ fontSize:".6875rem", fontWeight:700, padding:"2px 8px", borderRadius:"var(--rf)", background:`${STATUS_COLORS[t.status]}18`, color:STATUS_COLORS[t.status], border:`1px solid ${STATUS_COLORS[t.status]}33`, textTransform:"uppercase" }}>{t.status.replace("_"," ")}</span>
                  <span style={{ fontSize:".6875rem", color:"var(--t4)" }}>{new Date(t.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ transform:selected?.id===t.id?"rotate(180deg)":"none", transition:"transform .2s" }}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>

              {/* Expanded detail */}
              {selected?.id === t.id && (
                <div style={{ borderTop:"1px solid var(--bd)", padding:"16px 18px", background:"var(--bg2)" }}>
                  <p style={{ fontSize:".9375rem", color:"var(--t1)", lineHeight:1.7, marginBottom:12, whiteSpace:"pre-wrap" }}>{t.message}</p>
                  {t.photo_url && (
                    <img src={t.photo_url} alt="Attachment" style={{ maxWidth:"100%", maxHeight:200, borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)", marginBottom:12, display:"block" }}/>
                  )}
                  {t.phone && <p style={{ fontSize:".8125rem", color:"var(--t3)", marginBottom:12 }}>Phone: {t.phone}</p>}
                  {t.admin_reply && (
                    <div style={{ background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.2)", borderRadius:"var(--radius-sm)", padding:"10px 14px", marginBottom:12 }}>
                      <div style={{ fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--ok)", marginBottom:4 }}>Previous reply by {t.replied_by||"Admin"}</div>
                      <p style={{ fontSize:".875rem", color:"var(--t1)", margin:0, whiteSpace:"pre-wrap" }}>{t.admin_reply}</p>
                    </div>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder="Type your reply…" rows={3}
                      style={{ border:"1.5px solid var(--bd)", borderRadius:"var(--radius-sm)", padding:"10px 12px", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", outline:"none", resize:"vertical", fontFamily:"var(--font-body)", width:"100%", boxSizing:"border-box" }}
                      onFocus={e=>e.target.style.borderColor="var(--brand)"}
                      onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={handleReply} disabled={!reply.trim()||replying} className="adm-btn adm-btn-primary adm-btn-sm">
                        {replying?"Sending…":"Send reply & resolve"}
                      </button>
                      <button onClick={()=>{ axiosClient.patch(`/support/tickets/${t.id}/`,{status:"closed"}); showToast("Ticket closed."); load(); }} className="adm-btn adm-btn-ghost adm-btn-sm">
                        Close ticket
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {ToastEl}
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
       "loyalty_max_redeem_pct","spin_max_uses","scratch_discount_pct","scratch_max_uses",
       "reengagement_default_days"].forEach(k => {
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
    <div className="stt-wrap">
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
            className="stt-input stt-input--mono" style={{ fontWeight:700, textTransform:"uppercase" }}/>
        </SettingsRow>
      </SettingsSection>

      {/* Login Page */}
      <SettingsSection title="Login Page Customisation">
        {/* Desktop hero video */}
        <SettingsRow label="Desktop hero video URL" help="URL of an MP4 video to play on the desktop login panel. Leave blank to use the built-in KNFC video. Paste a direct .mp4 link or upload below.">
          <VideoUploadField value={form.login_video_url || ""} onChange={v => set("login_video_url", v)} />
        </SettingsRow>

        {/* Desktop hero image */}
        <SettingsRow label="Desktop hero image" help="Shown instead of the video if set. Leave blank to play the video." wide>
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

        {/* Mobile swiper slides */}
        <SettingsRow label="Mobile swiper slides" help="Full-screen slides on the customer login page (mobile). Edit image, headline, subtitle and colours per slide. Changes take effect after Save." wide>
          <LoginSlidesEditor
            slides={form.login_slides?.length >= 1 ? form.login_slides : DEFAULT_SLIDES_FOR_EDITOR}
            onChange={v => set("login_slides", v)}
          />
        </SettingsRow>
      </SettingsSection>

      {/* Home Page Ads */}
      {/* Home Section Images */}
      <HomeSectionImagesPanel form={form} set={set} />

      <HomeAdsPanel form={form} set={set} />

      {/* Re-engagement default */}
      <SettingsSection title="Re-engagement Offers">
        <SettingsRow label="Default inactive days" help="Default 'inactive after X days' pre-filled when creating a Re-engage offer">
          <SettingsNum k="reengagement_default_days" min={1} max={365} suffix="days"/>
        </SettingsRow>
      </SettingsSection>

      {/* Contact Us */}
      <SettingsSection title="Contact &amp; Support">
        <SettingsRow label="Phone number" help="Shown on Contact page and footer">
          <input value={form.contact_phone ?? ""} onChange={e => set("contact_phone", e.target.value)}
            placeholder="+91 98765 43210" className="stt-input"/>
        </SettingsRow>
        <SettingsRow label="Support email" help="Support email address shown on Contact page">
          <input value={form.contact_email ?? ""} onChange={e => set("contact_email", e.target.value)}
            placeholder="support@knfcs.com" type="email" className="stt-input"/>
        </SettingsRow>
        <SettingsRow label="WhatsApp number" help="For chat support — digits only including country code (e.g. 919876543210)">
          <input value={form.contact_wa_number ?? ""} onChange={e => set("contact_wa_number", e.target.value)}
            placeholder="919876543210" className="stt-input stt-input--mono"/>
        </SettingsRow>
        <SettingsRow label="Address" help="Physical location shown on Contact page and About page" wide>
          <textarea value={form.contact_address ?? ""} onChange={e => set("contact_address", e.target.value)}
            placeholder="123 Main Street, City, State 600001" rows={3}
            className="stt-input stt-input--wide" style={{ resize:"vertical", fontFamily:"var(--ff-b)", lineHeight:1.6 }}/>
        </SettingsRow>
      </SettingsSection>

      {/* About Page */}
      <SettingsSection title="About Page">
        <SettingsRow label="Headline" help="Main heading on the About page">
          <input value={form.about_headline ?? ""} onChange={e => set("about_headline", e.target.value)}
            placeholder="About KNFC Fried Chicken" className="stt-input stt-input--wide"/>
        </SettingsRow>
        <SettingsRow label="Tagline" help="Short line under the headline">
          <input value={form.about_tagline ?? ""} onChange={e => set("about_tagline", e.target.value)}
            placeholder="Crispy. Juicy. Unforgettable." className="stt-input stt-input--wide"/>
        </SettingsRow>
        <SettingsRow label="Content" help="Body paragraphs for the About page" wide>
          <textarea value={form.about_content ?? ""} onChange={e => set("about_content", e.target.value)}
            placeholder="Write your brand story here…" rows={6}
            className="stt-input stt-input--wide" style={{ resize:"vertical", fontFamily:"var(--ff-b)", lineHeight:1.7 }}/>
        </SettingsRow>
        {/* Stats — card-based row editor */}
        <SettingsRow label="Stats" help="Numbers shown on the About page hero strip (e.g. Branches, Happy Customers)">
          <div style={{ display:"flex", flexDirection:"column", gap:6, width:"100%", maxWidth:480 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:6, fontSize:".6875rem", fontWeight:700, color:"var(--t3)", textTransform:"uppercase", letterSpacing:".05em", paddingBottom:2 }}>
              <div>Label</div><div>Value</div><div/>
            </div>
            {(Array.isArray(form.about_stats) ? form.about_stats : []).map((s, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:6, alignItems:"center" }}>
                <input value={s.label||""} onChange={e => set("about_stats", form.about_stats.map((x,j)=>j===i?{...x,label:e.target.value}:x))}
                  placeholder="Branches" style={{ padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none" }}/>
                <input value={s.value||""} onChange={e => set("about_stats", form.about_stats.map((x,j)=>j===i?{...x,value:e.target.value}:x))}
                  placeholder="3+" style={{ padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none" }}/>
                <button type="button" onClick={() => set("about_stats", form.about_stats.filter((_,j)=>j!==i))}
                  style={{ width:28, height:30, borderRadius:"var(--r2)", border:"1px solid rgba(226,75,74,.3)", background:"var(--err-t)", color:"var(--err)", cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              </div>
            ))}
            <button type="button" onClick={() => set("about_stats", [...(form.about_stats||[]), {label:"",value:""}])}
              style={{ padding:"5px 12px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg)", color:"var(--t2)", cursor:"pointer", fontSize:".8125rem", fontWeight:600, alignSelf:"flex-start" }}>
              + Add stat
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Blog posts — card-based editor */}
      <SettingsSection title="Blog Posts">
        <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:600 }}>
          {(Array.isArray(form.blog_posts) ? form.blog_posts : []).map((p, i) => (
            <div key={i} style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8, position:"relative" }}>
              <div style={{ position:"absolute", top:8, right:8 }}>
                <button type="button" onClick={() => set("blog_posts", form.blog_posts.filter((_,j)=>j!==i))}
                  style={{ width:24, height:24, borderRadius:"var(--r2)", border:"1px solid rgba(226,75,74,.3)", background:"var(--err-t)", color:"var(--err)", cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              </div>
              <div style={{ fontWeight:700, fontSize:".75rem", color:"var(--brand)", letterSpacing:".06em", textTransform:"uppercase" }}>Post {i+1}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:700, marginBottom:3 }}>Title *</div>
                  <input value={p.title||""} onChange={e => set("blog_posts", form.blog_posts.map((x,j)=>j===i?{...x,title:e.target.value}:x))}
                    placeholder="Post title" style={{ width:"100%", padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div>
                  <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:700, marginBottom:3 }}>Date (e.g. June 2026)</div>
                  <input value={p.date||""} onChange={e => set("blog_posts", form.blog_posts.map((x,j)=>j===i?{...x,date:e.target.value}:x))}
                    placeholder="June 2026" style={{ width:"100%", padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div>
                  <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:700, marginBottom:3 }}>Tag / Category</div>
                  <input value={p.tag||""} onChange={e => set("blog_posts", form.blog_posts.map((x,j)=>j===i?{...x,tag:e.target.value}:x))}
                    placeholder="Recipe, News, Health…" style={{ width:"100%", padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div>
                  <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:700, marginBottom:3 }}>Image URL (optional)</div>
                  <input value={p.image_url||""} onChange={e => set("blog_posts", form.blog_posts.map((x,j)=>j===i?{...x,image_url:e.target.value}:x))}
                    placeholder="https://…/image.jpg" style={{ width:"100%", padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none", boxSizing:"border-box" }}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:700, marginBottom:3 }}>Excerpt / Summary *</div>
                <textarea value={p.summary||p.excerpt||""} onChange={e => set("blog_posts", form.blog_posts.map((x,j)=>j===i?{...x,summary:e.target.value,excerpt:e.target.value}:x))}
                  placeholder="Short summary of this blog post…" rows={2}
                  style={{ width:"100%", padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none", resize:"vertical", fontFamily:"var(--ff-b)", lineHeight:1.5, boxSizing:"border-box" }}/>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => set("blog_posts", [...(form.blog_posts||[]), {title:"",date:"",tag:"",image_url:"",summary:""}])}
            style={{ padding:"8px 16px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg)", color:"var(--t2)", cursor:"pointer", fontSize:".875rem", fontWeight:600, alignSelf:"flex-start" }}>
            + Add blog post
          </button>
        </div>
      </SettingsSection>

      {/* Careers — form-based editor */}
      <SettingsSection title="Careers Page">
        <SettingsRow label="Intro text" help="Opening paragraph on the Careers page">
          <textarea value={form.careers_intro ?? ""} onChange={e => set("careers_intro", e.target.value)}
            placeholder="Join the KNFC family! We're always looking for passionate people…" rows={3}
            style={{ padding:"8px 12px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", width:"440px", maxWidth:"100%", outline:"none", resize:"vertical", fontFamily:"var(--ff-b)", lineHeight:1.7 }}/>
        </SettingsRow>
        <SettingsRow label="Job openings" help="Add each role separately — no JSON needed">
          <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:600 }}>
            {(Array.isArray(form.careers_openings) ? form.careers_openings : []).map((o, i) => (
              <div key={i} style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--r3)", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8, position:"relative" }}>
                <div style={{ position:"absolute", top:8, right:8 }}>
                  <button type="button" onClick={() => set("careers_openings", form.careers_openings.filter((_,j)=>j!==i))}
                    style={{ width:24, height:24, borderRadius:"var(--r2)", border:"1px solid rgba(226,75,74,.3)", background:"var(--err-t)", color:"var(--err)", cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
                <div style={{ fontWeight:700, fontSize:".75rem", color:"var(--brand)", letterSpacing:".06em", textTransform:"uppercase" }}>Opening {i+1}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    {k:"title",      ph:"Shift Manager",    lb:"Job title *"},
                    {k:"department", ph:"Operations",       lb:"Department"},
                    {k:"location",   ph:"All Branches",     lb:"Location"},
                    {k:"type",       ph:"Full-time",        lb:"Type (Full-time/Part-time…)"},
                    {k:"apply_email",ph:"careers@knfc.in",  lb:"Apply email"},
                  ].map(f => (
                    <div key={f.k}>
                      <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:700, marginBottom:3 }}>{f.lb}</div>
                      <input value={o[f.k]||""} onChange={e => set("careers_openings", form.careers_openings.map((x,j)=>j===i?{...x,[f.k]:e.target.value}:x))}
                        placeholder={f.ph} style={{ width:"100%", padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none", boxSizing:"border-box" }}/>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:".6875rem", color:"var(--t3)", fontWeight:700, marginBottom:3 }}>Job description *</div>
                  <textarea value={o.description||o.desc||""} onChange={e => set("careers_openings", form.careers_openings.map((x,j)=>j===i?{...x,description:e.target.value,desc:e.target.value}:x))}
                    placeholder="Describe the role…" rows={2}
                    style={{ width:"100%", padding:"6px 8px", border:"1px solid var(--bd)", borderRadius:"var(--r2)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none", resize:"vertical", fontFamily:"var(--ff-b)", lineHeight:1.5, boxSizing:"border-box" }}/>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => set("careers_openings", [...(form.careers_openings||[]), {title:"",department:"",location:"",type:"Full-time",description:"",apply_email:"careers@knfc.in"}])}
              style={{ padding:"8px 16px", borderRadius:"var(--r2)", border:"1px solid var(--bd)", background:"var(--bg)", color:"var(--t2)", cursor:"pointer", fontSize:".875rem", fontWeight:600, alignSelf:"flex-start" }}>
              + Add opening
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Footer map */}
      <SettingsSection title="Footer">
        <SettingsRow label="Show map in footer" help="Display Google Maps embed in the desktop footer"><SettingsToggle k="footer_show_map"/></SettingsRow>
        <SettingsRow label="Map search query" help="Google Maps search term for the footer embed (e.g. KNFC+Fried+Chicken+Coimbatore)">
          <input value={form.footer_map_query ?? ""} onChange={e => set("footer_map_query", e.target.value)}
            placeholder="KNFC+Fried+Chicken" className="stt-input stt-input--wide"/>
        </SettingsRow>
      </SettingsSection>

      {/* Save */}
      <div className="stt-save-bar">
        <button type="button" onClick={save} disabled={saving}
          style={{ padding:"12px 32px", borderRadius:"var(--r3)", border:"none", background:"var(--brand)", color:"#fff", fontWeight:800, fontSize:"1rem", cursor:saving?"not-allowed":"pointer", fontFamily:"var(--ff-b)", boxShadow:"0 4px 16px rgba(232,82,26,.35)", opacity:saving?0.7:1 }}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved    && <span style={{ color:"var(--ok)",  fontWeight:700, fontSize:".9375rem", display:"flex", alignItems:"center", gap:5 }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg> Saved!</span>}
        {saveErr  && <span style={{ color:"var(--err)", fontWeight:600, fontSize:".875rem" }}>{saveErr}</span>}
        {!saveErr && !saved && <span style={{ fontSize:".8125rem", color:"var(--t4)" }}>Changes apply immediately to all users.</span>}
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

/* ─── Branch QR Modal ─────────────────────────────────────────────────── */
function BranchQRModal({ branch, onClose }) {
  const siteUrl = (localStorage.getItem("site_url") || window.location.origin) + `/?branch_id=${branch.id}`;
  const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(siteUrl)}&color=1A0500&bgcolor=FFFFFF&margin=2`;

  const download = () => {
    const link = document.createElement("a");
    link.href = qrUrl + "&format=png";
    link.download = `KNFC_QR_${branch.name.replace(/\s+/g,"_")}.png`;
    link.click();
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.55)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"var(--bgc)", borderRadius:"var(--radius)", boxShadow:"0 24px 64px rgba(0,0,0,.3)", padding:"28px 32px", maxWidth:340, width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <div style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:"1.0625rem", color:"var(--t1)", textAlign:"center" }}>
          {branch.name} — Menu QR
        </div>
        <img src={qrUrl} alt="Branch menu QR" style={{ width:220, height:220, borderRadius:12, border:"1px solid var(--bd)" }} loading="lazy"/>
        <div style={{ fontSize:".75rem", color:"var(--t3)", textAlign:"center", wordBreak:"break-all" }}>
          {siteUrl}
        </div>
        <div style={{ fontSize:".8125rem", color:"var(--t4)", textAlign:"center" }}>
          Customers scan this to open your branch menu directly.
        </div>
        <div style={{ display:"flex", gap:8, width:"100%" }}>
          <button onClick={download} className="adm-btn adm-btn-primary" style={{ flex:1 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PNG
          </button>
          <button onClick={() => { navigator.clipboard.writeText(siteUrl).catch(()=>{}); }} className="adm-btn adm-btn-ghost" style={{ flex:1 }}>
            Copy link
          </button>
        </div>
        <button onClick={onClose} className="adm-btn adm-btn-ghost" style={{ width:"100%" }}>Close</button>
      </div>
    </div>
  );
}

/* ─── Branch card (SuperAdmin branches tab) ──────────────────────────── */
function BranchCard({ branch: b, onEdit, onDeactivate, onReactivate, onModeToggled }) {
  const [toggling,     setToggling]     = useState(null);
  const [reactivating, setReactivating] = useState(false);
  const [isOpenNow,    setIsOpenNow]    = useState(null);
  const [showQR,       setShowQR]       = useState(false);

  useEffect(() => {
    if (!b.id) return;
    axiosClient.get(`/branches/${b.id}/hours/`)
      .then(r => setIsOpenNow(r.data.is_open_now ?? null))
      .catch(() => {});
  }, [b.id]);

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
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {isOpenNow !== null && b.is_active && (
            <span style={{ fontSize:".625rem", fontWeight:800, padding:"3px 8px", borderRadius:"var(--rf)", background:isOpenNow?"rgba(29,158,117,.12)":"rgba(226,75,74,.1)", color:isOpenNow?"var(--ok)":"var(--err)", border:"1px solid "+(isOpenNow?"rgba(29,158,117,.25)":"rgba(226,75,74,.25)"), letterSpacing:".04em", textTransform:"uppercase" }}>
              {isOpenNow ? "Open" : "Closed"}
            </span>
          )}
          <span style={{ fontSize: ".6875rem", fontWeight: 700, padding: "3px 9px", borderRadius: "var(--rf)", background: b.is_active ? "var(--ok-t)" : "var(--bg3)", color: b.is_active ? "var(--ok)" : "var(--t4)", border: "1px solid " + (b.is_active ? "rgba(29,158,117,.2)" : "var(--bd)") }}>
            {b.is_active ? "Active" : "Inactive"}
          </span>
        </div>
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
        <button onClick={() => setShowQR(true)} className="adm-btn adm-btn-ghost" style={{ fontSize: ".8125rem", padding: "6px 12px", display:"flex", alignItems:"center", gap:5 }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v5M21 21v.01M16 16v3"/></svg>
          Menu QR
        </button>
        {b.is_active ? (
          <button onClick={onDeactivate} className="adm-btn" style={{ fontSize: ".8125rem", padding: "6px 12px", background: "transparent", border: "1px solid rgba(226,75,74,.3)", color: "var(--err)" }}>Deactivate</button>
        ) : (
          <button onClick={handleReactivate} disabled={reactivating} className="adm-btn adm-btn-primary" style={{ fontSize: ".8125rem", padding: "6px 12px", opacity: reactivating ? .6 : 1 }}>
            {reactivating ? "…" : "Reactivate"}
          </button>
        )}
      </div>
      {showQR && <BranchQRModal branch={b} onClose={() => setShowQR(false)}/>}
    </div>
  );
}

/* ── Payment Logs Tab (Super Admin only) ──────────────────────────────── */
function PaymentLogsTab({ branches }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [date,    setDate]    = useState(new Date().toISOString().slice(0,10));
  const [method,  setMethod]  = useState("");
  const [total,   setTotal]   = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchId) params.set("branch_id", branchId);
      if (date)     params.set("date", date);
      if (method)   params.set("method", method);
      const r = await axiosClient.get(`/orders/payment-logs/?${params}`);
      const data = r.data.logs || [];
      setLogs(data);
      setTotal(data.reduce((s, l) => s + (l.total || 0), 0));
    } catch {}
    finally { setLoading(false); }
  }, [branchId, date, method]);

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
        <div className="adm-filter-group">
          <label className="adm-field-lbl">Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="adm-select" style={{ minWidth:"120px" }}>
            <option value="">All methods</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
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

/* ── Dashboard Login History (inline mini-panel) ───────────────── */
function DashboardLoginHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const fetchSessions = useCallback(() => {
    setLoading(true);
    Promise.all([
      axiosClient.get("/auth/sessions/", { params:{ date_from: today } }),
    ])
      .then(([r]) => setSessions((r.data.sessions || []).slice(0, 20)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [today]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  /* 30s live polling */
  useEffect(() => {
    const t = setInterval(fetchSessions, 30_000);
    return () => clearInterval(t);
  }, [fetchSessions]);

  return (
    <div className="adm-card">
      <div className="adm-card-hdr">
        <span className="adm-card-title">Login activity today</span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:".6875rem", fontWeight:700, color:"var(--ok)", display:"flex", alignItems:"center", gap:3 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--ok)", display:"inline-block" }}/>
            LIVE
          </span>
          <span style={{ fontSize:".75rem", color:"var(--t3)" }}>Staff &amp; admins · most recent 20</span>
        </div>
      </div>
      {loading ? (
        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:8 }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:44 }}/>)}
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ padding:"28px 20px", textAlign:"center", color:"var(--t3)", fontSize:".875rem" }}>No logins recorded today</div>
      ) : (
        <div>
          {sessions.map(s => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px", borderBottom:"1px solid var(--bd)" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".8125rem", fontWeight:800, color:"var(--t2)", flexShrink:0 }}>
                {s.staff_name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.staff_name}</div>
                <div style={{ fontSize:".75rem", color:"var(--t3)" }}>{s.branch_name} · {new Date(s.login_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}</div>
              </div>
              {s.lat && s.lng ? (
                <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:".6875rem", color:"var(--info)", display:"flex", alignItems:"center", gap:3, textDecoration:"none", flexShrink:0 }}>
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Located
                </a>
              ) : (
                <span style={{ fontSize:".6875rem", color:"var(--err)", flexShrink:0 }}>No GPS</span>
              )}
              <span className={`badge ${s.is_active ? "badge-ok" : "badge-err"}`} style={{ flexShrink:0 }}>
                {s.is_active ? "Online" : "Offline"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Analytics Tab ─────────────────────────────────────────────── */
function SuperAdminAnalyticsTab({ branches }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [branchId, setBranchId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = branchId ? { branch_id: branchId } : {};
      const r = await axiosClient.get("/orders/analytics/", { params });
      setData(r.data);
    } catch {}
    finally { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ display:"flex", flexDirection:"column", gap:10 }}>{[1,2,3].map(i => <div key={i} className="skel" style={{ height:80, borderRadius:"var(--radius)" }}/>)}</div>;
  if (!data) return <div className="adm-empty"><div className="adm-empty-title">No analytics data</div></div>;

  const { today_summary: ts, revenue_by_day: rev, top_items, peak_hours, order_type_split, status_breakdown } = data;
  const maxRev = Math.max(...(rev||[]).map(r => r.revenue), 1);
  const maxHr  = Math.max(...(peak_hours||[]).map(h => h.orders), 1);

  return (
    <div>
      {/* Branch filter */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <select value={branchId} onChange={e => setBranchId(e.target.value)} className="adm-select" style={{ minWidth:180 }}>
          <option value="">All branches</option>
          {(branches||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button onClick={load} className="adm-btn adm-btn-ghost">↻ Refresh</button>
      </div>

      {/* Today summary */}
      <div className="adm-stats" style={{ marginBottom:20 }}>
        {[
          { label:"Orders today",    value:ts?.count || 0,                                         color:"var(--info)"  },
          { label:"Revenue today",   value:formatPrice(ts?.revenue || 0),                          color:"var(--brand)" },
          { label:"Avg order value", value:ts?.count ? formatPrice(ts.revenue / ts.count) : "—",  color:"#b45309"      },
          { label:"Completed",       value:ts?.completed || 0,                                     color:"var(--ok)"    },
        ].map(s => (
          <div key={s.label} className="adm-stat">
            <div className="adm-stat-bar" style={{ background:`linear-gradient(90deg,${s.color},transparent)` }}/>
            <div className="adm-stat-lbl">{s.label}</div>
            <div className="adm-stat-val" style={{ color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart (7 days) */}
      <div className="adm-card" style={{ marginBottom:16 }}>
        <div className="adm-card-hdr"><span className="adm-card-title">Revenue — last 7 days</span></div>
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
            {(rev||[]).map((r, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ fontSize:".625rem", color:"var(--t3)", fontWeight:700 }}>{formatPrice(r.revenue)}</div>
                <div style={{ width:"100%", background:"var(--brand)", borderRadius:"4px 4px 0 0", height:`${Math.max(4, (r.revenue/maxRev)*80)}px`, opacity:.85, transition:"height .3s" }}/>
                <div style={{ fontSize:".625rem", color:"var(--t4)", whiteSpace:"nowrap" }}>{new Date(r.date).toLocaleDateString("en-IN",{weekday:"short"})}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Top items */}
        <div className="adm-card">
          <div className="adm-card-hdr"><span className="adm-card-title">Top 5 items (30 days)</span></div>
          <div style={{ padding:"8px 0" }}>
            {(top_items||[]).map((item, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px", borderBottom:"1px solid var(--bd)" }}>
                <span style={{ fontFamily:"var(--ff-d)", fontWeight:900, fontSize:"1.125rem", color:"var(--brand)", minWidth:24 }}>{i+1}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name_snapshot}</div>
                  <div style={{ fontSize:".75rem", color:"var(--t3)" }}>{item.total_qty} sold · {formatPrice(item.total_revenue)}</div>
                </div>
              </div>
            ))}
            {!top_items?.length && <div style={{ padding:"20px", textAlign:"center", color:"var(--t3)", fontSize:".875rem" }}>No data yet</div>}
          </div>
        </div>

        {/* Order type + status */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="adm-card">
            <div className="adm-card-hdr"><span className="adm-card-title">Order types (today)</span></div>
            <div style={{ padding:"12px 20px", display:"flex", gap:12 }}>
              {[
                { label:"Dine-in", value:order_type_split?.dine_in||0, color:"var(--brand)" },
                { label:"Pickup",  value:order_type_split?.pickup||0,  color:"var(--info)"  },
              ].map(s => (
                <div key={s.label} style={{ flex:1, textAlign:"center", padding:"12px 8px", background:"var(--bg2)", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)" }}>
                  <div style={{ fontFamily:"var(--ff-d)", fontWeight:900, fontSize:"1.5rem", color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="adm-card">
            <div className="adm-card-hdr"><span className="adm-card-title">Status breakdown (today)</span></div>
            <div style={{ padding:"8px 20px" }}>
              {Object.entries(status_breakdown||{}).map(([st, cnt]) => (
                <div key={st} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--bd)", fontSize:".875rem" }}>
                  <span style={{ color:"var(--t2)", textTransform:"capitalize" }}>{st.replace(/_/g," ")}</span>
                  <span style={{ fontWeight:700 }}>{cnt}</span>
                </div>
              ))}
              {!Object.keys(status_breakdown||{}).length && <div style={{ padding:"12px 0", color:"var(--t3)", fontSize:".875rem" }}>No orders today</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Peak hours */}
      <div className="adm-card">
        <div className="adm-card-hdr"><span className="adm-card-title">Peak hours (last 7 days)</span></div>
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:60 }}>
            {(peak_hours||[]).map((h, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{ width:"100%", background:h.orders>0?"var(--brand)":"var(--bg3)", borderRadius:"3px 3px 0 0", height:`${Math.max(2, (h.orders/maxHr)*50)}px`, transition:"height .3s" }}/>
                {i % 3 === 0 && <div style={{ fontSize:".5rem", color:"var(--t4)", marginTop:2 }}>{h.hour}h</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── BranchAdmin Users Tab ─────────────────────────────────────── */
function BranchAdminUsersTab({ branches }) {
  const [admins,   setAdmins]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [confirm,  setConfirm]  = useState(null);
  const [toggling, setToggling] = useState({});
  const [ToastEl,  showToast]   = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axiosClient.get("/auth/admin/users/", { params: { role: "branch_admin" } });
      setAdmins(r.data.users || []);
    } catch { setAdmins([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* 30s live polling */
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const handleToggleActive = async (u, activate) => {
    const key = `${u.id}_active`;
    setToggling(t => ({ ...t, [key]: true }));
    try {
      await axiosClient.patch(`/auth/admin/users/${u.id}/`, { is_active: activate });
      showToast(`${u.name} ${activate ? "activated" : "deactivated"}.`);
      load();
    } catch { showToast("Update failed."); }
    finally { setToggling(t => ({ ...t, [key]: false })); }
  };

  const handleDeactivate = async () => {
    if (!confirm) return;
    try {
      await axiosClient.patch(`/auth/admin/users/${confirm.id}/`, { is_active: false });
      showToast(`${confirm.name} deactivated.`);
      setConfirm(null); load();
    } catch { showToast("Failed."); setConfirm(null); }
  };

  const filtered = admins.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.branch_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"1.125rem", fontWeight:800 }}>Branch Admins</h2>
          <p style={{ fontSize:".8125rem", color:"var(--t3)", marginTop:3 }}>
            {filtered.filter(u => u.is_active).length} active · {filtered.filter(u => !u.is_active).length} inactive
            <span style={{ marginLeft:12, fontSize:".6875rem", fontWeight:700, color:"var(--ok)", display:"inline-flex", alignItems:"center", gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--ok)", display:"inline-block", animation:"pulse 2s infinite" }}/>
              LIVE · 30s
            </span>
          </p>
        </div>
        <button onClick={load} className="adm-btn adm-btn-ghost" disabled={loading}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          Refresh
        </button>
      </div>

      {/* Mini stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"Total",    value: filtered.length,                            color:"var(--t1)"  },
          { label:"Active",   value: filtered.filter(u => u.is_active).length,  color:"var(--ok)"  },
          { label:"Inactive", value: filtered.filter(u => !u.is_active).length, color:"var(--err)" },
        ].map(s => (
          <div key={s.label} className="mini-stat">
            <div className="mini-stat-val" style={{ color:s.color }}>{s.value}</div>
            <div className="mini-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom:16 }}>
        <div className="adm-input-wrap" style={{ maxWidth:340 }}>
          <Ic.Search />
          <input className="adm-input" placeholder="Search name, email, branch…" value={search} onChange={e => setSearch(e.target.value)}/>
          {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t3)", fontSize:16, padding:0 }}>×</button>}
        </div>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:60, borderRadius:"var(--radius-sm)" }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty"><div className="adm-empty-title">No branch admins found</div></div>
      ) : (
        <div className="adm-card" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ minWidth:"820px" }}>
          {/* Header */}
          <div style={{ display:"grid", gridTemplateColumns:"minmax(200px,1fr) 160px 130px 100px 150px", gap:12, padding:"8px 16px", background:"var(--bg2)", borderBottom:"1px solid var(--bd)" }}>
            {["Admin", "Branch", "Last Login", "Status", "Actions"].map((h, i) => (
              <div key={h} style={{ fontSize:".5625rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", color:"var(--t4)", textAlign: i > 1 ? "center" : "left" }}>{h}</div>
            ))}
          </div>

          {filtered.map((u, idx) => (
            <div key={u.id}
              style={{ display:"grid", gridTemplateColumns:"minmax(200px,1fr) 160px 130px 100px 150px", gap:12, padding:"12px 16px", borderBottom: idx < filtered.length-1 ? "1px solid var(--bd)" : "none", alignItems:"center", opacity: u.is_active ? 1 : 0.6, transition:"background var(--transition)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

              {/* Name */}
              <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                <div className="adm-avatar" style={{ background: u.is_active ? "var(--brand)" : "var(--t4)", flexShrink:0 }}>
                  {u.name?.[0]?.toUpperCase() || "A"}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name}</div>
                  <div style={{ fontSize:".75rem", color:"var(--t3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                </div>
              </div>

              {/* Branch */}
              <div style={{ fontSize:".8125rem", color:"var(--t2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {u.branch_name || "—"}
              </div>

              {/* Last login */}
              <div style={{ textAlign:"center", fontSize:".75rem", color:"var(--t3)" }}>
                {u.last_login
                  ? new Date(u.last_login).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:true})
                  : "Never"}
              </div>

              {/* Status */}
              <div style={{ textAlign:"center" }}>
                <span style={{
                  display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:".6875rem", fontWeight:700, letterSpacing:".04em",
                  background: u.is_active ? "rgba(29,158,117,.12)" : "rgba(226,75,74,.12)",
                  color: u.is_active ? "var(--ok)" : "var(--err)",
                  border: `1px solid ${u.is_active ? "rgba(29,158,117,.25)" : "rgba(226,75,74,.25)"}`,
                }}>
                  {u.is_active ? "Active" : "Deactive"}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display:"flex", justifyContent:"center", gap:6 }}>
                {u.is_active ? (
                  <button
                    onClick={() => setConfirm(u)}
                    disabled={toggling[`${u.id}_active`]}
                    className="adm-btn adm-btn-sm adm-btn-danger"
                    style={{ fontSize:".6875rem", padding:"4px 10px" }}>
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleActive(u, true)}
                    disabled={toggling[`${u.id}_active`]}
                    className="adm-btn adm-btn-sm adm-btn-ghost"
                    style={{ fontSize:".6875rem", padding:"4px 10px", color:"var(--ok)", borderColor:"var(--ok)" }}>
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>{/* end minWidth wrapper */}
        </div>
      )}

      {/* Confirm deactivate */}
      {confirm && (
        <div className="adm-confirm" onClick={() => setConfirm(null)}>
          <div className="adm-confirm-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1.0625rem", fontWeight:700, marginBottom:8 }}>Deactivate admin?</h3>
            <p style={{ fontSize:".9375rem", color:"var(--t3)", marginBottom:20, lineHeight:1.6 }}>
              <strong>{confirm.name}</strong> ({confirm.email}) will no longer be able to log in.
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={handleDeactivate} className="adm-btn adm-btn-primary" style={{ flex:1, background:"var(--err)", justifyContent:"center" }}>Deactivate</button>
              <button onClick={() => setConfirm(null)} className="adm-btn adm-btn-ghost" style={{ flex:1, justifyContent:"center" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {ToastEl}
    </div>
  );
}

/* ── Combined Login Records Tab (Staff + Admins split) ─────────── */
function CombinedLoginRecordsTab({ branches }) {
  const [subTab,    setSubTab]   = useState("staff");
  const [sessions,  setSessions] = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [branchId,  setBranchId] = useState("");
  const [dateRange, setDateRange] = useState("7d");

  const load = useCallback(() => {
    setLoading(true);
    setSessions([]);
    const params = { role: subTab === "staff" ? "staff" : "branch_admin" };
    if (branchId) params.branch_id = branchId;
    if (dateRange !== "all") {
      const days = dateRange === "today" ? 0 : dateRange === "7d" ? 7 : 30;
      const from = new Date(); from.setDate(from.getDate() - days);
      params.date_from = from.toISOString().slice(0, 10);
    }
    axiosClient.get("/auth/sessions/", { params })
      .then(r => setSessions(r.data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [subTab, branchId, dateRange]);

  useEffect(() => { load(); }, [load]);

  /* 30s live polling */
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const SUB = [
    { key:"staff",  label:"Staff Logins",       icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/></svg> },
    { key:"admins", label:"Branch Admin Logins", icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
  ];

  return (
    <div>
      {/* Sub-tab switcher */}
      <div style={{ display:"flex", gap:4, marginBottom:16, background:"var(--bg2)", padding:4, borderRadius:"var(--radius-sm)", width:"fit-content", border:"1px solid var(--bd)" }}>
        {SUB.map(s => (
          <button key={s.key} onClick={() => setSubTab(s.key)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:6, border:"none", cursor:"pointer", fontSize:".875rem", fontWeight:subTab===s.key?700:500, background:subTab===s.key?"var(--bgc)":"transparent", color:subTab===s.key?"var(--brand)":"var(--t2)", boxShadow:subTab===s.key?"var(--sh-sm)":"none", transition:"all 160ms", fontFamily:"var(--ff-b)" }}>
            <span style={{ color:subTab===s.key?"var(--brand)":"var(--t3)" }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <select value={branchId} onChange={e => setBranchId(e.target.value)} className="adm-select" style={{ minWidth:180 }}>
          <option value="">All branches</option>
          {(branches||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="adm-select">
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
        <button onClick={load} className="adm-btn adm-btn-ghost" disabled={loading}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          {loading ? "Loading…" : "Refresh"}
        </button>
        <span style={{ fontSize:".6875rem", fontWeight:700, color:"var(--ok)", display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--ok)", display:"inline-block", animation:"pulse 2s infinite" }}/>
          LIVE · 30s
        </span>
        <span style={{ fontSize:".8125rem", color:"var(--t3)", marginLeft:"auto" }}>
          {sessions.length} record{sessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Summary stats */}
      {sessions.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:8, marginBottom:16 }}>
          {[
            { label:"Total logins",   value:sessions.length,                                color:"var(--info)" },
            { label:"Active now",     value:sessions.filter(s=>s.is_active).length,         color:"var(--ok)"   },
            { label:"With GPS",       value:sessions.filter(s=>s.lat&&s.lng).length,        color:"var(--brand)"},
            { label:"Unique users",   value:new Set(sessions.map(s=>s.staff_name)).size,    color:"#b45309"     },
          ].map(stat => (
            <div key={stat.label} style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--radius-sm)", padding:"10px 14px" }}>
              <div style={{ fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", color:"var(--t3)", marginBottom:4 }}>{stat.label}</div>
              <div style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:900, color:stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table / Cards */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[1,2,3,4].map(i => <div key={i} className="skel" style={{ height:52, borderRadius:"var(--radius-sm)" }}/>)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div className="adm-empty-title">No login records</div>
          <div className="adm-empty-sub">
            {subTab === "staff" ? "Staff login history will appear here." : "Branch admin login history will appear here."}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="adm-table-wrap lr-table">
            <table className="adm-table">
              <thead><tr>
                <th>{subTab === "staff" ? "Staff" : "Admin"}</th>
                <th>Branch</th>
                <th>Role</th>
                <th>Login time</th>
                <th>Duration</th>
                <th>Location</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                {sessions.map(s => {
                  const statusLabel = s.logout_at ? "Logged out" : s.is_active ? "Online" : "Idle";
                  const statusCls   = s.logout_at ? "badge-err" : s.is_active ? "badge-ok" : "badge-warn";
                  return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".75rem", fontWeight:800, color:"var(--t2)", flexShrink:0 }}>
                          {(s.staff_name||"?").charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight:600, fontSize:".875rem" }}>{s.staff_name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize:".875rem", color:"var(--t2)" }}>{s.branch_name || "—"}</td>
                    <td style={{ fontSize:".75rem" }}>
                      <span style={{ padding:"2px 7px", borderRadius:"var(--rf)", fontSize:".625rem", fontWeight:800, textTransform:"uppercase", background:s.staff_role==="branch_admin"?"rgba(180,83,9,.12)":"var(--info-t)", color:s.staff_role==="branch_admin"?"#b45309":"var(--info)" }}>
                        {s.staff_role === "branch_admin" ? "Admin" : "Staff"}
                      </span>
                    </td>
                    <td style={{ fontSize:".8125rem", color:"var(--t3)" }}>
                      {new Date(s.login_at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:true})}
                    </td>
                    <td style={{ fontSize:".8125rem", color:"var(--t2)" }}>{s.duration_minutes ? `${s.duration_minutes}m` : s.logout_at ? "—" : "Active"}</td>
                    <td style={{ fontSize:".75rem" }}>
                      {s.lat && s.lng ? (
                        <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer"
                          style={{ color:"var(--info)", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:3 }}>
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {s.addr ? s.addr.slice(0, 28) + (s.addr.length > 28 ? "…" : "") : `${Number(s.lat).toFixed(3)}, ${Number(s.lng).toFixed(3)}`}
                        </a>
                      ) : <span style={{ color:"var(--t4)" }}>No GPS</span>}
                    </td>
                    <td><span className={`badge ${statusCls}`}>{statusLabel}</span></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lr-cards">
            {sessions.map(s => {
              const statusLabel = s.logout_at ? "Logged out" : s.is_active ? "Online" : "Idle";
              const statusCls   = s.logout_at ? "badge-err" : s.is_active ? "badge-ok" : "badge-warn";
              return (
                <div key={s.id} style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--radius-sm)", padding:"14px 16px", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,var(--brand),var(--brand-d))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".875rem", fontWeight:800, color:"#fff", flexShrink:0 }}>
                        {(s.staff_name||"?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:".9375rem" }}>{s.staff_name}</div>
                        <div style={{ fontSize:".75rem", color:"var(--t3)" }}>{s.branch_name || "—"}</div>
                      </div>
                    </div>
                    <span className={`badge ${statusCls}`}>{statusLabel}</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 12px", fontSize:".8125rem" }}>
                    <div><span style={{ color:"var(--t4)", fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>Login</span><div style={{ color:"var(--t2)" }}>{new Date(s.login_at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:true})}</div></div>
                    <div><span style={{ color:"var(--t4)", fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>Duration</span><div style={{ color:"var(--t2)" }}>{s.duration_minutes ? `${s.duration_minutes}m` : s.logout_at ? "—" : "Active"}</div></div>
                    {s.lat && s.lng && (
                      <div style={{ gridColumn:"1/-1" }}>
                        <span style={{ color:"var(--t4)", fontSize:".6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>Location</span>
                        <div><a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer" style={{ color:"var(--info)", display:"inline-flex", alignItems:"center", gap:3, textDecoration:"none" }}>
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {s.addr || `${Number(s.lat).toFixed(4)}, ${Number(s.lng).toFixed(4)}`}
                        </a></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <style>{`.lr-table{display:block}.lr-cards{display:none}@media(max-width:640px){.lr-table{display:none!important}.lr-cards{display:block!important}}`}</style>
        </>
      )}
    </div>
  );
}

/* ── User Reviews Tab ──────────────────────────────────────────── */
function SuperAdminReviewsTab({ branches }) {
  const [reviews,  setReviews]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [branchId, setBranchId] = useState("");
  const [rating,   setRating]   = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (branchId) params.branch_id = branchId;
    if (rating)   params.rating    = rating;
    axiosClient.get("/menu/admin/reviews/", { params })
      .then(r => setReviews(r.data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId, rating]);

  useEffect(() => { load(); }, [load]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const StarBadge = ({ n }) => (
    <span style={{ display:"inline-flex", alignItems:"center", gap:2, fontWeight:700, fontSize:".8125rem" }}>
      {"★".repeat(n)}<span style={{ color:"var(--t4)", fontWeight:400 }}>{"★".repeat(5-n)}</span>
    </span>
  );

  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div>
          <label className="adm-field-lbl">Branch</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="adm-select" style={{ minWidth:180 }}>
            <option value="">All branches</option>
            {(branches||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="adm-field-lbl">Rating</label>
          <select value={rating} onChange={e => setRating(e.target.value)} className="adm-select">
            <option value="">All ratings</option>
            {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} star</option>)}
          </select>
        </div>
        <button onClick={load} className="adm-btn adm-btn-ghost" style={{ alignSelf:"flex-end" }}>↻ Refresh</button>
      </div>

      {reviews.length > 0 && (
        <div className="adm-stats" style={{ marginBottom:16 }}>
          {[
            { label:"Total reviews", value:reviews.length,                                    color:"var(--info)"  },
            { label:"Avg rating",    value:`${avgRating} ★`,                                  color:"var(--gold)"  },
            { label:"5-star",        value:reviews.filter(r=>r.rating===5).length,             color:"var(--ok)"    },
            { label:"Below 3-star",  value:reviews.filter(r=>r.rating<3).length,              color:"var(--err)"   },
          ].map(s => (
            <div key={s.label} className="adm-stat">
              <div className="adm-stat-bar" style={{ background:`linear-gradient(90deg,${s.color},transparent)` }}/>
              <div className="adm-stat-lbl">{s.label}</div>
              <div className="adm-stat-val" style={{ color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skel" style={{ height:72, borderRadius:"var(--radius-sm)" }}/>)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="adm-empty"><div className="adm-empty-title">No reviews found</div><div className="adm-empty-sub">Customer reviews will appear here once submitted.</div></div>
      ) : (
        <div className="adm-card">
          {reviews.map((r, i) => (
            <div key={r.id} style={{ padding:"14px 20px", borderBottom:"1px solid var(--bd)", display:"flex", gap:14 }}>
              <div style={{ flexShrink:0, width:36, height:36, borderRadius:"50%", background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.25rem" }}>
                {r.item_emoji || "🍗"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:".9375rem" }}>{r.item_name}</span>
                  <span style={{ fontSize:".75rem", color:"var(--t3)" }}>{r.branch_name}</span>
                  <StarBadge n={r.rating}/>
                </div>
                {r.comment && <p style={{ fontSize:".875rem", color:"var(--t2)", margin:0, marginBottom:4 }}>{r.comment}</p>}
                <div style={{ fontSize:".75rem", color:"var(--t3)", display:"flex", gap:10 }}>
                  <span>{r.customer_name}</span>
                  <span>{new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>
                  <span style={{ color:r.is_visible?"var(--ok)":"var(--err)" }}>{r.is_visible?"Visible":"Hidden"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Offers Tab (SuperAdmin) ───────────────────────────────────── */
function SuperAdminOffersTab({ branches }) {
  const [offers,          setOffers]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [modal,           setModal]           = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [apiErr,          setApiErr]          = useState("");
  const [image,           setImage]           = useState(null);
  const [menuItems,       setMenuItems]       = useState([]);
  const [categories,      setCategories]      = useState([]);
  const [comboItems,      setComboItems]      = useState([]);
  const [appliesTo,       setAppliesTo]       = useState([]);
  const [itemSearch,      setItemSearch]      = useState("");
  const [appliesToSearch, setAppliesToSearch] = useState("");

  const BLANK = () => ({
    name:"", tagline:"", offer_type:"percentage",
    discount_percentage:"", discount_flat:"", original_price:"", offer_price:"",
    emoji:"🔥", is_active:true, all_branches:false, branch_id: branches?.[0]?.id || "",
    coupon_code:"", require_coupon:false, min_order_value:"",
    start_at: new Date().toISOString().slice(0,16), end_at:"", lifetime:true,
    first_order_only:false, max_redemptions_per_user:0, category_id:"",
    welcome_bonus_amount:"",
    referral_reward_type:"coupon", referral_reward_value:"",
    referral_min_friend_order:"", referral_reward_on_signup:false,
    inactive_days:7, reengagement_message:"", auto_broadcast:false,
  });
  const [form, setForm] = useState(BLANK);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const COMBO_TYPES = ["combo", "free_item", "bogo"];
  const isCombo = COMBO_TYPES.includes(form.offer_type);

  useEffect(() => {
    if (!form.branch_id) return;
    axiosClient.get("/menu/items/", { params: { branch_id: form.branch_id } })
      .then(r => setMenuItems(r.data.items || [])).catch(() => {});
    axiosClient.get(`/menu/categories/?branch_id=${form.branch_id}`)
      .then(r => setCategories(r.data.categories || [])).catch(() => {});
  }, [form.branch_id]);

  const loadOffers = useCallback(() => {
    setLoading(true);
    axiosClient.get("/offers/admin/")
      .then(r => setOffers(r.data.offers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const openModal = () => {
    setForm(BLANK());
    setImage(null); setComboItems([]); setAppliesTo([]);
    setItemSearch(""); setAppliesToSearch(""); setApiErr("");
    setModal(true);
  };

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true); setApiErr("");
    try {
      const fd = new FormData();
      const BOOLS = ["is_active","auto_broadcast","all_branches","first_order_only","require_coupon","referral_reward_on_signup"];
      const { lifetime, ...fields } = form;
      Object.entries(fields).forEach(([k, v]) => {
        if (k === "end_at" && lifetime) return;
        if (BOOLS.includes(k)) { fd.set(k, v ? "true" : "false"); return; }
        if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
      });
      if (!form.all_branches && !form.branch_id && branches?.length) fd.set("branch_id", branches[0].id);
      if (image) fd.append("image", image);
      if (isCombo && comboItems.length > 0)
        fd.append("offer_items", JSON.stringify(comboItems.map(c => ({ menu_item_id:c.menu_item_id, quantity:Number(c.quantity)||1, notes:c.notes||"" }))));
      fd.append("applies_to_ids", JSON.stringify(appliesTo.map(i => i.id)));
      await axiosClient.post("/offers/admin/", fd);
      setModal(false);
      loadOffers();
    } catch (err) {
      setApiErr(err.response?.data?.error || "Failed to create offer.");
    } finally { setSaving(false); }
  };

  const toggleActive = async (offer) => {
    try { await axiosClient.patch(`/offers/admin/${offer.id}/`, { is_active: !offer.is_active }); loadOffers(); } catch {}
  };
  const deleteOffer = async (offer) => {
    if (!window.confirm(`Delete offer "${offer.name}"?`)) return;
    try { await axiosClient.delete(`/offers/admin/${offer.id}/`); loadOffers(); } catch {}
  };

  const OFFER_TYPES = [
    ["percentage","% Discount"],["flat","₹ Flat Off"],
    ["combo","Combo Deal"],["free_item","Buy X Get Y"],["bogo","BOGO"],
    ["welcome","Welcome Bonus"],["referral","Share & Earn"],["re_engagement","Re-engage"],
  ];

  const SH = ({ children }) => (
    <div style={{ fontSize:".625rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"var(--t4)", padding:"12px 0 8px", borderTop:"1px solid var(--bd)", marginTop:4, marginBottom:10 }}>
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button onClick={openModal} className="adm-btn adm-btn-primary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New offer
        </button>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>{[1,2,3].map(i => <div key={i} className="skel" style={{ height:70, borderRadius:"var(--radius)" }}/>)}</div>
      ) : offers.length === 0 ? (
        <div className="adm-empty"><div className="adm-empty-title">No offers yet</div><div className="adm-empty-sub">Create your first offer for customers.</div></div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {offers.map(o => (
            <div key={o.id} className="adm-card" style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:12, opacity:o.is_active?1:.5 }}>
              <span style={{ fontSize:"1.5rem", flexShrink:0 }}>{o.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:".9375rem" }}>{o.name}</div>
                <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:2, display:"flex", gap:8, flexWrap:"wrap" }}>
                  <span>{o.offer_type.replace(/_/g," ")}</span>
                  <span>{o.branch_name}</span>
                  {o.all_branches && <span style={{ background:"var(--brand)", color:"#fff", padding:"1px 6px", borderRadius:10, fontSize:".625rem", fontWeight:800 }}>ALL BRANCHES</span>}
                  {o.first_order_only && <span style={{ background:"rgba(55,138,221,.12)", color:"var(--info)", padding:"1px 6px", borderRadius:10, fontSize:".625rem", fontWeight:800 }}>FIRST ORDER</span>}
                  {o.coupon_code && <span style={{ background:"var(--brand-tint)", color:"var(--brand)", padding:"1px 6px", borderRadius:10, fontSize:".625rem", fontWeight:800 }}>CODE: {o.coupon_code}</span>}
                  {o.end_at && <span style={{ color:"var(--t4)" }}>Expires {new Date(o.end_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                <button onClick={() => toggleActive(o)} className={`adm-btn adm-btn-sm ${o.is_active ? "adm-btn-ghost" : "adm-btn-primary"}`}>{o.is_active ? "Deactivate" : "Activate"}</button>
                <button onClick={() => deleteOffer(o)} className="adm-btn adm-btn-sm adm-btn-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create offer modal ── */}
      <Modal open={modal} onClose={() => { setModal(false); setApiErr(""); }} title="Create offer" subtitle="New offer for customers" width="600px">
        <form onSubmit={handleCreate}>
          <ErrBox msg={apiErr}/>

          {/* Basic info */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 80px", gap:12, marginBottom:14 }}>
            <div>
              <FL req>Offer name</FL>
              <div className="adm-input-wrap"><input className="adm-input" value={form.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. Mega Monday"/></div>
            </div>
            <div>
              <FL>Emoji</FL>
              <div className="adm-input-wrap"><input className="adm-input" value={form.emoji} onChange={e => set("emoji", e.target.value)} placeholder="🔥" maxLength={4} style={{ textAlign:"center", fontSize:"1.125rem" }}/></div>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <FL>Tagline</FL>
            <div className="adm-input-wrap"><input className="adm-input" value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Limited time deal — don't miss out!"/></div>
          </div>

          {/* Offer type chips */}
          <SH>Offer Type</SH>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
            {OFFER_TYPES.map(([v, l]) => (
              <button key={v} type="button" onClick={() => set("offer_type", v)}
                style={{ padding:"7px 13px", borderRadius:"var(--radius-sm)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", border:`1.5px solid ${form.offer_type===v?"var(--brand)":"var(--bd)"}`, background:form.offer_type===v?"var(--brand-tint)":"var(--bg2)", color:form.offer_type===v?"var(--brand)":"var(--t2)", fontFamily:"var(--ff-b)", transition:"all .15s ease" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Pricing */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <FL>Discount %</FL>
              <div className="adm-input-wrap"><input type="number" className="adm-input" value={form.discount_percentage} onChange={e => set("discount_percentage", e.target.value)} placeholder="e.g. 30"/></div>
            </div>
            <div>
              <FL>Flat discount (₹)</FL>
              <div className="adm-input-wrap"><input type="number" className="adm-input" value={form.discount_flat} onChange={e => set("discount_flat", e.target.value)} placeholder="e.g. 50"/></div>
            </div>
            <div>
              <FL>Original price (₹)</FL>
              <div className="adm-input-wrap"><input type="number" className="adm-input" value={form.original_price} onChange={e => set("original_price", e.target.value)} placeholder="MRP"/></div>
            </div>
            <div>
              <FL>Offer price (₹)</FL>
              <div className="adm-input-wrap"><input type="number" className="adm-input" value={form.offer_price} onChange={e => set("offer_price", e.target.value)} placeholder="Deal price"/></div>
            </div>
          </div>

          {/* Combo items builder */}
          {isCombo && (
            <>
              <SH>Combo Items</SH>
              <div className="adm-input-wrap" style={{ marginBottom:8 }}>
                <input className="adm-input" value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                  placeholder={form.branch_id ? "Search menu items to add…" : "Select branch first"} disabled={!form.branch_id}/>
              </div>
              {itemSearch.length > 0 && (
                <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--radius-sm)", marginBottom:8, maxHeight:140, overflowY:"auto", boxShadow:"0 4px 16px rgba(0,0,0,.1)" }}>
                  {menuItems.filter(m => m.name.toLowerCase().includes(itemSearch.toLowerCase())).slice(0,6).map(m => (
                    <button key={m.id} type="button"
                      onClick={() => { if (!comboItems.find(c=>c.menu_item_id===m.id)) setComboItems(ci=>[...ci,{menu_item_id:m.id,name:m.name,quantity:1,notes:""}]); setItemSearch(""); }}
                      style={{ width:"100%", textAlign:"left", padding:"8px 12px", background:"none", border:"none", borderBottom:"1px solid var(--bd)", cursor:"pointer", fontSize:".875rem", display:"flex", justifyContent:"space-between" }}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <span>{m.name}</span><span style={{ color:"var(--t3)" }}>₹{m.price}</span>
                    </button>
                  ))}
                </div>
              )}
              {comboItems.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
                  {comboItems.map((ci, idx) => (
                    <div key={ci.menu_item_id} style={{ display:"grid", gridTemplateColumns:"1fr 60px 1fr auto", gap:6, alignItems:"center", padding:"6px 10px", background:"var(--bg2)", borderRadius:"var(--radius-sm)", border:"1px solid var(--bd)" }}>
                      <span style={{ fontWeight:600, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ci.name}</span>
                      <input type="number" min="1" max="20" value={ci.quantity}
                        onChange={e => setComboItems(items=>items.map((x,i)=>i===idx?{...x,quantity:e.target.value}:x))}
                        style={{ border:"1px solid var(--bd)", borderRadius:4, padding:"4px 6px", fontSize:".875rem", background:"var(--bgc)", textAlign:"center", outline:"none" }}/>
                      <input value={ci.notes} onChange={e => setComboItems(items=>items.map((x,i)=>i===idx?{...x,notes:e.target.value}:x))}
                        placeholder="Note (optional)"
                        style={{ border:"1px solid var(--bd)", borderRadius:4, padding:"4px 6px", fontSize:".8125rem", background:"var(--bgc)", outline:"none", width:"100%" }}/>
                      <button type="button" onClick={() => setComboItems(ci=>ci.filter((_,i)=>i!==idx))}
                        style={{ width:20, height:20, borderRadius:4, border:"none", background:"rgba(239,68,68,.12)", cursor:"pointer", color:"#dc2626", fontSize:13 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Schedule */}
          <SH>Schedule</SH>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <FL req>Start</FL>
              <input type="datetime-local" value={form.start_at||""} onChange={e => set("start_at", e.target.value)}
                style={{ width:"100%", padding:"9px 12px", border:"1.5px solid var(--bd)", borderRadius:"var(--radius-sm)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none" }}/>
            </div>
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <FL>End</FL>
                <button type="button" onClick={() => set("lifetime", !form.lifetime)}
                  style={{ display:"flex", alignItems:"center", gap:4, fontSize:".75rem", fontWeight:700, color:form.lifetime?"var(--ok)":"var(--t3)", background:"none", border:"none", cursor:"pointer" }}>
                  <div style={{ width:26, height:14, borderRadius:7, background:form.lifetime?"var(--ok)":"var(--bg3)", border:`1px solid ${form.lifetime?"var(--ok)":"var(--bd)"}`, position:"relative", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:2, width:9, height:9, borderRadius:"50%", background:"#fff", left:form.lifetime?"14px":"2px", transition:"left .15s ease" }}/>
                  </div>
                  {form.lifetime ? "∞ Lifetime" : "Set end"}
                </button>
              </div>
              {form.lifetime
                ? <div style={{ padding:"9px 12px", background:"var(--ok-t)", border:"1px solid rgba(29,158,117,.25)", borderRadius:"var(--radius-sm)", fontSize:".8125rem", color:"var(--ok)", fontWeight:600 }}>∞ Never expires</div>
                : <input type="datetime-local" value={form.end_at||""} onChange={e => set("end_at", e.target.value)}
                    style={{ width:"100%", padding:"9px 12px", border:"1.5px solid var(--bd)", borderRadius:"var(--radius-sm)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", outline:"none" }}/>
              }
            </div>
          </div>

          {/* Branch & visibility */}
          <SH>Branch &amp; Visibility</SH>
          <div style={{ marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:form.all_branches?"var(--ok-t)":"var(--bg2)", border:`1px solid ${form.all_branches?"rgba(29,158,117,.3)":"var(--bd)"}`, borderRadius:"var(--radius-sm)", cursor:"pointer" }}
            onClick={() => set("all_branches", !form.all_branches)}>
            <div>
              <div style={{ fontWeight:700, fontSize:".875rem", color:form.all_branches?"var(--ok)":"var(--t1)" }}>All branches</div>
              <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:2 }}>Show this offer across ALL branches</div>
            </div>
            <button type="button" className={`adm-toggle ${form.all_branches?"on":"off"}`}><span className="adm-toggle-knob"/></button>
          </div>
          {!form.all_branches && (
            <div style={{ marginBottom:14 }}>
              <FL>Branch</FL>
              <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)} className="adm-select" style={{ width:"100%" }}>
                <option value="">— Select branch —</option>
                {(branches||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          {/* Rules & limits */}
          <SH>Rules &amp; Limits</SH>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <FL>Min. order value (₹)</FL>
              <div className="adm-input-wrap"><input type="number" className="adm-input" value={form.min_order_value} onChange={e => set("min_order_value", e.target.value)} placeholder="e.g. 199 (leave blank = any)"/></div>
            </div>
            <div>
              <FL>Max uses / customer</FL>
              <div className="adm-input-wrap"><input type="number" className="adm-input" min={0} value={form.max_redemptions_per_user} onChange={e => set("max_redemptions_per_user", parseInt(e.target.value)||0)} placeholder="0 = unlimited"/></div>
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom:14 }}>
            <FL>Category restriction <span style={{ fontWeight:400, color:"var(--t4)" }}>(optional)</span></FL>
            <select value={form.category_id} onChange={e => set("category_id", e.target.value)} className="adm-select" style={{ width:"100%" }}>
              <option value="">All categories (entire order)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Coupon code + require toggle */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:4 }}>
            <div>
              <FL>Coupon code <span style={{ fontWeight:400, color:"var(--t4)" }}>(optional)</span></FL>
              <div className="adm-input-wrap"><input className="adm-input" value={form.coupon_code} onChange={e => set("coupon_code", e.target.value.toUpperCase())} placeholder="e.g. KNFC20" maxLength={30} style={{ fontFamily:"monospace", fontWeight:700, letterSpacing:".05em" }}/></div>
            </div>
            {form.coupon_code.trim().length > 0 && (
              <div style={{ display:"flex", alignItems:"flex-end" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:form.require_coupon?"var(--brand-tint)":"var(--bg2)", border:`1px solid ${form.require_coupon?"rgba(232,82,26,.3)":"var(--bd)"}`, borderRadius:"var(--radius-sm)", cursor:"pointer", width:"100%", gap:8 }}
                  onClick={() => set("require_coupon", !form.require_coupon)}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:".8125rem", color:form.require_coupon?"var(--brand)":"var(--t1)" }}>Require code</div>
                    <div style={{ fontSize:".6875rem", color:"var(--t3)", marginTop:1 }}>Offer hidden without this code</div>
                  </div>
                  <button type="button" className={`adm-toggle ${form.require_coupon?"on":"off"}`}><span className="adm-toggle-knob"/></button>
                </div>
              </div>
            )}
          </div>
          <p style={{ fontSize:".6875rem", color:"var(--t4)", marginBottom:14 }}>Leave blank for an auto-applied offer. Customers enter the code at cart checkout.</p>

          {/* First order / auto-broadcast toggles */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:form.first_order_only?"rgba(55,138,221,.06)":"var(--bg2)", border:`1px solid ${form.first_order_only?"rgba(55,138,221,.25)":"var(--bd)"}`, borderRadius:"var(--radius-sm)", cursor:"pointer" }}
              onClick={() => set("first_order_only", !form.first_order_only)}>
              <div>
                <div style={{ fontWeight:700, fontSize:".875rem", color:form.first_order_only?"var(--info)":"var(--t1)" }}>First order only</div>
                <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:2 }}>Only on customer's first order</div>
              </div>
              <button type="button" className={`adm-toggle ${form.first_order_only?"on":"off"}`}><span className="adm-toggle-knob"/></button>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:form.auto_broadcast?"var(--brand-tint)":"var(--bg2)", border:`1px solid ${form.auto_broadcast?"var(--bdb)":"var(--bd)"}`, borderRadius:"var(--radius-sm)", cursor:"pointer" }}
              onClick={() => set("auto_broadcast", !form.auto_broadcast)}>
              <div>
                <div style={{ fontWeight:700, fontSize:".875rem", color:form.auto_broadcast?"var(--brand)":"var(--t1)" }}>Auto-broadcast</div>
                <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:2 }}>WhatsApp blast when activated</div>
              </div>
              <button type="button" className={`adm-toggle ${form.auto_broadcast?"on":"off"}`}><span className="adm-toggle-knob"/></button>
            </div>
          </div>

          {/* Specific items restriction (non-combo types) */}
          {!isCombo && (
            <>
              <SH>Specific Items — restrict discount to these items only</SH>
              <div className="adm-input-wrap" style={{ marginBottom:8 }}>
                <input className="adm-input" value={appliesToSearch} onChange={e => setAppliesToSearch(e.target.value)}
                  placeholder={form.branch_id ? "Search menu items to restrict to…" : "Select branch first"} disabled={!form.branch_id}/>
              </div>
              {appliesToSearch.length > 0 && (
                <div style={{ background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--radius-sm)", marginBottom:8, maxHeight:130, overflowY:"auto", boxShadow:"0 4px 16px rgba(0,0,0,.1)" }}>
                  {menuItems.filter(m => m.name.toLowerCase().includes(appliesToSearch.toLowerCase()) && !appliesTo.find(a=>a.id===m.id)).slice(0,6).map(m => (
                    <button key={m.id} type="button"
                      onClick={() => { setAppliesTo(a=>[...a,{id:m.id,name:m.name}]); setAppliesToSearch(""); }}
                      style={{ width:"100%", textAlign:"left", padding:"8px 12px", background:"none", border:"none", borderBottom:"1px solid var(--bd)", cursor:"pointer", fontSize:".875rem", display:"flex", justifyContent:"space-between" }}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <span>{m.name}</span><span style={{ color:"var(--t3)" }}>₹{m.price}</span>
                    </button>
                  ))}
                </div>
              )}
              {appliesTo.length > 0 ? (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
                  {appliesTo.map(item => (
                    <span key={item.id} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px 3px 12px", background:"var(--brand-tint)", border:"1px solid rgba(232,82,26,.25)", borderRadius:20, fontSize:".8125rem", fontWeight:600, color:"var(--brand)" }}>
                      {item.name}
                      <button type="button" onClick={() => setAppliesTo(a=>a.filter(x=>x.id!==item.id))}
                        style={{ background:"none", border:"none", cursor:"pointer", color:"var(--brand)", fontSize:15, lineHeight:1, padding:0, opacity:.7 }}>×</button>
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize:".6875rem", color:"var(--t4)", marginBottom:14 }}>Leave empty = discount applies to the entire cart.</p>
              )}
            </>
          )}

          {/* WELCOME extras */}
          {form.offer_type === "welcome" && (
            <>
              <SH>Welcome Bonus Settings</SH>
              <div style={{ marginBottom:14 }}>
                <FL req>Bonus amount (₹)</FL>
                <div className="adm-input-wrap"><input type="number" className="adm-input" value={form.welcome_bonus_amount} onChange={e => set("welcome_bonus_amount", e.target.value)} placeholder="e.g. 50"/></div>
                <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:4 }}>Fixed ₹ discount for new customers on their first order. Set Min Order Value (above) to require a minimum spend.</p>
              </div>
            </>
          )}

          {/* REFERRAL extras */}
          {form.offer_type === "referral" && (
            <>
              <SH>Share &amp; Earn Settings</SH>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                {[["coupon","Coupon Code"],["scratch","Scratch Card"],["discount","Direct Discount"]].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => set("referral_reward_type", v)}
                    style={{ padding:"6px 12px", borderRadius:"var(--radius-sm)", fontSize:".8125rem", fontWeight:600, cursor:"pointer", border:`1.5px solid ${form.referral_reward_type===v?"var(--brand)":"var(--bd)"}`, background:form.referral_reward_type===v?"var(--brand-tint)":"var(--bg2)", color:form.referral_reward_type===v?"var(--brand)":"var(--t2)", fontFamily:"var(--ff-b)" }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                <div>
                  <FL req>Reward value (₹)</FL>
                  <div className="adm-input-wrap"><input type="number" className="adm-input" value={form.referral_reward_value} onChange={e => set("referral_reward_value", e.target.value)} placeholder="e.g. 30"/></div>
                  <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:3 }}>₹ earned by referrer per qualified friend</p>
                </div>
                <div>
                  <FL>Friend's min order (₹)</FL>
                  <div className="adm-input-wrap"><input type="number" className="adm-input" value={form.referral_min_friend_order} onChange={e => set("referral_min_friend_order", e.target.value)} placeholder="0 = any order"/></div>
                  <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:3 }}>Min spend to trigger the reward</p>
                </div>
              </div>
              <div style={{ marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:form.referral_reward_on_signup?"var(--ok-t)":"var(--bg2)", border:`1px solid ${form.referral_reward_on_signup?"rgba(29,158,117,.3)":"var(--bd)"}`, borderRadius:"var(--radius-sm)", cursor:"pointer" }}
                onClick={() => set("referral_reward_on_signup", !form.referral_reward_on_signup)}>
                <div>
                  <div style={{ fontWeight:700, fontSize:".875rem", color:form.referral_reward_on_signup?"var(--ok)":"var(--t1)" }}>Reward on signup (instant)</div>
                  <div style={{ fontSize:".75rem", color:"var(--t3)", marginTop:2 }}>Give reward as soon as friend signs up — no order needed</div>
                </div>
                <button type="button" className={`adm-toggle ${form.referral_reward_on_signup?"on":"off"}`}><span className="adm-toggle-knob"/></button>
              </div>
            </>
          )}

          {/* RE_ENGAGEMENT extras */}
          {form.offer_type === "re_engagement" && (
            <>
              <SH>Re-engagement Settings</SH>
              <div style={{ marginBottom:14 }}>
                <FL req>Inactive after (days)</FL>
                <div className="adm-input-wrap"><input type="number" className="adm-input" min="1" max="365" value={form.inactive_days} onChange={e => set("inactive_days", e.target.value)} placeholder="7"/></div>
                <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:4 }}>Target customers who have not ordered in this many days</p>
              </div>
              <div style={{ marginBottom:14 }}>
                <FL>Custom WhatsApp message <span style={{ fontWeight:400, color:"var(--t4)" }}>(optional)</span></FL>
                <textarea value={form.reengagement_message} onChange={e => set("reengagement_message", e.target.value)}
                  placeholder={"We miss you, {name}! Come back and get {discount} off with code {code} 🍗"}
                  rows={3}
                  style={{ width:"100%", padding:"9px 12px", border:"1.5px solid var(--bd)", borderRadius:"var(--radius-sm)", background:"var(--bg)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", resize:"vertical", outline:"none", boxSizing:"border-box" }}/>
                <p style={{ fontSize:".6875rem", color:"var(--t4)", marginTop:3 }}>Placeholders: {"{name}"} · {"{discount}"} · {"{code}"}</p>
              </div>
            </>
          )}

          {/* Poster image upload */}
          <SH>Poster Image (optional)</SH>
          <div onClick={() => document.getElementById("sa-offer-img").click()}
            style={{ border:`2px dashed ${image?"var(--brand)":"var(--bd)"}`, borderRadius:"var(--radius-sm)", height:80, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", background:"var(--bg2)", overflow:"hidden", position:"relative", marginBottom:18, transition:"border-color .15s ease" }}>
            {image
              ? <img src={URL.createObjectURL(image)} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : <div style={{ textAlign:"center", color:"var(--t3)", fontSize:".8125rem" }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{display:"block",margin:"0 auto 4px"}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Click to upload offer poster
                </div>
            }
            {image && <button type="button" onClick={e=>{e.stopPropagation();setImage(null);}} style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,.6)", border:"none", cursor:"pointer", color:"#fff", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>}
          </div>
          <input id="sa-offer-img" type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} style={{ display:"none" }}/>

          <div style={{ display:"flex", gap:"var(--gap)", justifyContent:"flex-end" }}>
            <button type="button" onClick={() => { setModal(false); setApiErr(""); }} className="adm-btn adm-btn-ghost">Cancel</button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>{saving?"Creating…":"Create offer"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ── SuperAdmin Orders Tab (branch-wise) ───────────────────────── */
function SuperAdminOrdersTab({ branches }) {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [branchFilter, setBranchFilter] = useState("");
  const [dateFilter,   setDateFilter]   = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState("");
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);
  const [totalRev,     setTotalRev]     = useState(0);
  const PER_PAGE = 20;

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = { page: pg };
      if (branchFilter) params.branch_id = branchFilter;
      if (dateFilter)   params.date       = dateFilter;
      if (statusFilter) params.status     = statusFilter;
      const r = await axiosClient.get("/orders/admin/", { params });
      setOrders(r.data.orders || []);
      setTotal(r.data.total   || 0);
      setTotalRev(r.data.total_revenue || 0);
      setPage(pg);
    } catch {}
    finally { setLoading(false); }
  }, [branchFilter, dateFilter, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const statusColors = {
    placed:      "var(--info)",
    confirmed:   "var(--brand)",
    preparing:   "#b45309",
    ready:       "var(--ok)",
    completed:   "var(--ok)",
    cancelled:   "var(--err)",
  };

  return (
    <div>
      {/* Stats row */}
      <div className="adm-stats" style={{ marginBottom: 16 }}>
        {[
          { label: "Orders shown",    value: total,                    color: "var(--info)"  },
          { label: "Total revenue",   value: formatPrice(totalRev),    color: "var(--brand)" },
          { label: "Avg order value", value: total ? formatPrice(totalRev / total) : "—", color: "#b45309" },
        ].map(s => (
          <div key={s.label} className="adm-stat">
            <div className="adm-stat-bar" style={{ background: `linear-gradient(90deg,${s.color},transparent)` }}/>
            <div className="adm-stat-lbl">{s.label}</div>
            <div className="adm-stat-val" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", cursor:"pointer" }}>
          <option value="">All branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)" }}/>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:"1px solid var(--bd)", background:"var(--bgc)", color:"var(--t1)", fontSize:".875rem", fontFamily:"var(--ff-b)", cursor:"pointer" }}>
          <option value="">All statuses</option>
          {["placed","confirmed","preparing","ready","completed","cancelled"].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <button onClick={() => load(1)} className="adm-btn adm-btn-primary" style={{ padding:"7px 16px" }}>Apply</button>
        <button onClick={() => { setBranchFilter(""); setDateFilter(new Date().toISOString().slice(0,10)); setStatusFilter(""); }}
          className="adm-btn adm-btn-ghost" style={{ padding:"7px 12px" }}>Reset</button>
        <button onClick={() => { setBranchFilter(""); setDateFilter(""); setStatusFilter(""); }}
          className="adm-btn adm-btn-ghost" style={{ padding:"7px 12px" }}>All orders</button>
      </div>

      {/* Table */}
      <div className="adm-card" style={{ overflow:"auto" }}>
        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:8, padding:16 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skel" style={{ height:44, borderRadius:8 }}/>)}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 24px", color:"var(--t3)" }}>
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom:12, opacity:.4 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <div style={{ fontWeight:600, marginBottom:4 }}>No orders found</div>
            <div style={{ fontSize:".8125rem" }}>Try adjusting filters</div>
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".875rem" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--bd)" }}>
                {["Token","Branch","Type","Customer","Items","Total","Status","Time"].map(h => (
                  <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:".75rem", textTransform:"uppercase", letterSpacing:".05em", color:"var(--t3)", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom:"1px solid var(--bd)" }}
                  onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 12px", fontFamily:"var(--ff-d)", fontWeight:800, color:"var(--brand)" }}>#{o.token_number}</td>
                  <td style={{ padding:"10px 12px", fontWeight:500, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.branch_name}</td>
                  <td style={{ padding:"10px 12px", color:"var(--t2)", fontSize:".8125rem" }}>{(o.order_type||"").replace("_"," ")}</td>
                  <td style={{ padding:"10px 12px", color:"var(--t2)", fontSize:".8125rem", maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.customer_name || o.walkin_name || "—"}</td>
                  <td style={{ padding:"10px 12px", color:"var(--t2)" }}>{(o.items||[]).length}</td>
                  <td style={{ padding:"10px 12px", fontWeight:700 }}>{formatPrice(o.total)}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ fontSize:".6875rem", fontWeight:800, padding:"2px 8px", borderRadius:"var(--rf)", background:(statusColors[o.status]||"var(--t4)")+"22", color:statusColors[o.status]||"var(--t4)", border:`1px solid ${(statusColors[o.status]||"var(--t4)")}44`, whiteSpace:"nowrap" }}>
                      {o.status_emoji} {o.status_display || o.status}
                    </span>
                  </td>
                  <td style={{ padding:"10px 12px", color:"var(--t3)", fontSize:".75rem", whiteSpace:"nowrap" }}>{formatTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > PER_PAGE && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12, flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:".8125rem", color:"var(--t3)" }}>
            Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,total)} of {total}
          </span>
          <div style={{ display:"flex", gap:4 }}>
            <button disabled={page<=1} onClick={() => load(page-1)}
              className="adm-btn adm-btn-ghost" style={{ padding:"5px 12px", opacity:page<=1?.4:1 }}>← Prev</button>
            <button disabled={page*PER_PAGE>=total} onClick={() => load(page+1)}
              className="adm-btn adm-btn-ghost" style={{ padding:"5px 12px", opacity:page*PER_PAGE>=total?.4:1 }}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SA Live Notification Bell ────────────────────────────────────── */
function SANotificationBell() {
  const [open,     setOpen]    = useState(false);
  const [notifs,   setNotifs]  = useState([]);
  const [unread,   setUnread]  = useState(0);
  const seenRef    = useRef(new Set());
  const firstRef   = useRef(true);
  const panelRef   = useRef(null);

  const poll = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [sR, oR] = await Promise.all([
        axiosClient.get("/auth/sessions/", { params: { date_from: today } }).catch(() => ({ data: { sessions: [] } })),
        axiosClient.get("/orders/admin/",            { params: { date: today, page_size: 20 } }).catch(() => ({ data: { orders: [] } })),
      ]);

      const sessionNotifs = (sR.data.sessions || []).map(s => ({
        id:   `sess-${s.id}`,
        icon: "👤",
        msg:  `${s.user_name || s.name || "Staff"} logged in`,
        sub:  s.branch_name || "",
        time: s.login_at,
      }));
      const orderNotifs = (oR.data.orders || []).map(o => ({
        id:   `ord-${o.id}`,
        icon: "🛒",
        msg:  `Order #${o.order_number || String(o.id).slice(-6).toUpperCase()}`,
        sub:  o.branch_name || "",
        time: o.created_at,
      }));

      const all = [...sessionNotifs, ...orderNotifs].sort((a, b) => new Date(b.time) - new Date(a.time));

      if (!firstRef.current) {
        let newCount = 0;
        all.forEach(n => { if (!seenRef.current.has(n.id)) newCount++; });
        if (newCount > 0) setUnread(u => u + newCount);
      }
      all.forEach(n => seenRef.current.add(n.id));
      firstRef.current = false;
      setNotifs(all.slice(0, 30));
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fmtTime = iso => new Date(iso).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });

  return (
    <div ref={panelRef} style={{ position:"relative" }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) setUnread(0); }}
        style={{ width:36, height:36, borderRadius:"50%", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", flexShrink:0 }}>
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{ position:"absolute", top:-3, right:-3, minWidth:16, height:16, borderRadius:8, background:"var(--err,#e24b4a)", color:"#fff", fontSize:".5rem", fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px", lineHeight:1 }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, width:320, background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--radius)", boxShadow:"var(--sh-xl,0 8px 32px rgba(0,0,0,.18))", zIndex:600, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--bd)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg2)" }}>
            <span style={{ fontWeight:700, fontSize:".8125rem" }}>
              Live Activity
              {notifs.length > 0 && <span style={{ color:"var(--t4)", fontWeight:400, marginLeft:4 }}>({notifs.length})</span>}
            </span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:".6875rem", color:"var(--t3)" }}>30s refresh</span>
              {notifs.length > 0 && (
                <button
                  onClick={() => { setNotifs([]); setUnread(0); seenRef.current.clear(); }}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"var(--err)", fontSize:".6875rem", fontWeight:700, padding:0, fontFamily:"var(--ff-b)" }}>
                  Clear
                </button>
              )}
            </div>
          </div>
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding:"24px 16px", textAlign:"center", color:"var(--t3)", fontSize:".8125rem" }}>No activity today</div>
            ) : notifs.map(n => (
              <div key={n.id} style={{ padding:"9px 14px", borderBottom:"1px solid var(--bd)", display:"flex", gap:9, alignItems:"flex-start" }}>
                <span style={{ fontSize:".9375rem", flexShrink:0, marginTop:1 }}>{n.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:".8125rem", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.msg}</div>
                  {n.sub && <div style={{ fontSize:".6875rem", color:"var(--t3)" }}>{n.sub}</div>}
                </div>
                <div style={{ fontSize:".6250rem", color:"var(--t4)", flexShrink:0, paddingTop:2 }}>{fmtTime(n.time)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SuperAdminDashboard() {
  const { loading: pageLoading } = usePageLoader(1000);
  const statsRef = useRef(null);
  const [ToastEl, showToast] = useToast();

  const location = useLocation();
  const _INLINE_TABS = ["dashboard","branches","sa-orders","payments","users","stock","redemptions","export","staff","admins","login-records","reviews","offers","reports","settings"];
  const _urlSeg = location.pathname.replace(/^\/superadmin\/?/, "").split("/")[0];

  const [branches,     setBranches]     = useState([]);
  const [tab,          setTab]          = useState(_INLINE_TABS.includes(_urlSeg) ? _urlSeg : "dashboard");
  const [loading,      setLoading]      = useState(true);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  const [branchModal,     setBranchModal]     = useState(false);
  const [editingBranchId, setEditingBranchId] = useState(null); // null = create, UUID string = edit
  const [branchForm,      setBranchForm]      = useState({ name:"", address:"", phone:"", email:"", latitude:"", longitude:"", upi_id:"" });
  const [branchErrors,    setBranchErrors]    = useState({});
  const [branchApiErr,    setBranchApiErr]    = useState("");
  const [branchSaving,    setBranchSaving]    = useState(false);

  const [adminModal,  setAdminModal]    = useState(false);
  const [adminForm,   setAdminForm]     = useState({ name:"", email:"" });
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
    document.body.classList.toggle("adm-sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("adm-sidebar-open");
  }, [sidebarOpen]);

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
    setBranchApiErr(""); setBranchErrors({});

    // Client-side validation
    const errs = {};
    if (!branchForm.name.trim()) errs.name = "Branch name is required.";
    if (branchForm.phone) {
      const ph = branchForm.phone.replace(/\D/g, "");
      if (ph.length !== 10) errs.phone = "Enter a 10-digit mobile number.";
      else if (!/^[6-9]/.test(ph)) errs.phone = "Indian numbers must start with 6, 7, 8, or 9.";
    }
    if (branchForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branchForm.email))
      errs.email = "Enter a valid email address.";
    if (branchForm.upi_id && !branchForm.upi_id.includes("@"))
      errs.upi_id = "UPI ID must contain @ (e.g. knfc.branch@upi).";
    if (branchForm.latitude  && isNaN(parseFloat(branchForm.latitude)))
      errs.latitude = "Enter a valid decimal (e.g. 11.2588).";
    if (branchForm.longitude && isNaN(parseFloat(branchForm.longitude)))
      errs.longitude = "Enter a valid decimal (e.g. 75.7804).";

    if (Object.keys(errs).length) { setBranchErrors(errs); return; }

    setBranchSaving(true);
    try {
      if (editingBranchId) {
        await axiosClient.patch(`/branches/${editingBranchId}/`, branchForm);
        showToast("Branch updated successfully!");
      } else {
        await axiosClient.post("/branches/", branchForm);
        showToast("Branch created successfully!");
      }
      setBranchModal(false);
      setEditingBranchId(null);
      setBranchForm({ name:"", address:"", phone:"", email:"", latitude:"", longitude:"", upi_id:"" });
      loadBranches();
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) setBranchErrors(d.errors);
      else setBranchApiErr(d?.error || (editingBranchId ? "Failed to update branch." : "Failed to create branch."));
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
    setAdminApiErr(""); setAdminErrors({});

    const errs = {};
    if (!adminForm.name.trim()) errs.name = "Name is required.";
    else if (/[0-9]/.test(adminForm.name)) errs.name = "Name should not contain numbers.";
    if (!adminForm.email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) errs.email = "Enter a valid email address.";
    if (!adminBranchId) errs.branch_id = "Please assign a branch.";

    if (Object.keys(errs).length) { setAdminErrors(errs); return; }

    setAdminSaving(true);
    try {
      await axiosClient.post("/auth/admin/branch-admins/", { name: adminForm.name, email: adminForm.email, branch_id: adminBranchId });
      setAdminSuccess({ name: adminForm.name, email: adminForm.email });
      setAdminForm({ name:"", email:"" });
      setAdminBranchId("");
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) setAdminErrors(d.errors);
      else setAdminApiErr(d?.error || "Failed.");
    } finally { setAdminSaving(false); }
  };

  const SA_TABS = [
    { key:"dashboard",     icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label:"Dashboard" },
    { key:"branches",      icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label:"Branches" },
    { key:"sa-orders",     icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, label:"Orders" },
    { key:"payments",      icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, label:"Payments" },
    { key:"users",         icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, label:"Users" },
    { key:"stock",         icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>, label:"Stock" },
    { key:"redemptions",   icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>, label:"Redemptions" },
    { key:"export",        icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>, label:"Export" },
    { key:"staff",          icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label:"Staff" },
    { key:"admins",         icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, label:"Admins" },
    { key:"login-records",  icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>, label:"Login Records" },
    { key:"reviews",        icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, label:"Reviews" },
    { key:"offers",  isLink:true, to:"/admin/offers", icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>, label:"Offers" },
    { key:"menu",    isLink:true, to:"/admin/menu", icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>, label:"Menu" },
    { key:"reports", icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, label:"Analytics" },
    { key:"whatsapp",  isLink:true, to:"/superadmin/whatsapp",  icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>, label:"WhatsApp" },
    { key:"broadcast", isLink:true, to:"/superadmin/broadcast", icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round"/></svg>, label:"Broadcast" },
    { key:"support",  icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label:"Support" },
    { key:"settings", icon:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>, label:"Settings" },
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
              <Link key={t.key} to={t.to}
                className="adm-sidebar-item"
                style={{ textDecoration:"none" }}
                onClick={() => setSidebarOpen(false)}>
                <span className="adm-sidebar-icon">{t.icon}</span>
                {t.label}
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft:"auto", opacity:.5 }}>
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
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

          {/* Mobile topbar — hamburger · section name (centre) · bell (right) */}
          <div className="adm-mobile-topbar" style={{ justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button className="adm-hamburger" onClick={() => setSidebarOpen(o => !o)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/></svg>
              </button>
              {tab !== "dashboard" && (
                <button onClick={() => { setTab("dashboard"); window.scrollTo({ top:0, behavior:"instant" }); }}
                  style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 8px", borderRadius:"var(--radius-sm)", border:"none", background:"var(--bg2)", cursor:"pointer", color:"var(--t2)", fontSize:".75rem", fontWeight:600 }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Back
                </button>
              )}
            </div>
            <span style={{ fontWeight:700, fontSize:".9375rem", display:"flex", alignItems:"center", gap:5 }}>
              {SA_TABS.find(t => t.key===tab)?.icon}
              {SA_TABS.find(t => t.key===tab)?.label || "Dashboard"}
            </span>
            <div className="sa-bell-mobile">
              <SANotificationBell />
            </div>
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
            <div style={{ display:"flex", gap:"var(--gap)", alignItems:"center" }}>
              <div className="sa-bell-desktop"><SANotificationBell /></div>
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

          {/* ── DASHBOARD OVERVIEW ── */}
          {tab === "dashboard" && (
            <div>
              <div ref={statsRef} className="adm-stats">
                {[
                  { label:"Total revenue today",   value:formatPrice(totalRev),                                     color:"var(--brand)", sub:"All branches combined" },
                  { label:"Orders today",           value:totalOrders,                                               color:"var(--info)",  sub:"Across all branches" },
                  { label:"Active branches",        value:branches.filter(b=>b.is_active).length,                   color:"var(--ok)",    sub:`${branches.length} total` },
                  { label:"Revenue per branch",     value:branches.length?formatPrice(totalRev/branches.length):"—",color:"#b45309",      sub:"Average today" },
                ].map(s => (
                  <div key={s.label} className="adm-stat">
                    <div className="adm-stat-bar" style={{ background:"linear-gradient(90deg,"+s.color+",transparent)" }}/>
                    <div className="adm-stat-lbl">{s.label}</div>
                    <div className="adm-stat-val" style={{ color:s.color }}>{s.value}</div>
                    <div className="adm-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Branch status grid */}
              <h2 style={{ fontFamily:"var(--font-display)", fontSize:"1rem", fontWeight:800, marginBottom:12, marginTop:8 }}>Branch overview</h2>
              {loading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[1,2].map(i=><div key={i} className="skel" style={{ height:60, borderRadius:8 }}/>)}
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {branches.map(b => (
                    <div key={b.id} className="adm-card" style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:12, opacity:b.is_active?1:.5 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:".9375rem", marginBottom:2 }}>{b.name}</div>
                        <div style={{ fontSize:".75rem", color:"var(--t3)" }}>{b.address}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                        {b.today_orders != null && (
                          <span style={{ fontSize:".75rem", fontWeight:700, color:"var(--brand)" }}>{b.today_orders} orders</span>
                        )}
                        {b.today_revenue != null && (
                          <span style={{ fontSize:".75rem", fontWeight:700, color:"var(--ok)" }}>{formatPrice(b.today_revenue)}</span>
                        )}
                        <span style={{ fontSize:".625rem", fontWeight:800, padding:"2px 8px", borderRadius:"var(--rf)", background:b.is_active?"var(--ok-t)":"var(--bg3)", color:b.is_active?"var(--ok)":"var(--t4)", border:"1px solid "+(b.is_active?"rgba(29,158,117,.2)":"var(--bd)") }}>
                          {b.is_active?"Active":"Inactive"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <h2 style={{ fontFamily:"var(--font-display)", fontSize:"1rem", fontWeight:800, marginBottom:12, marginTop:20 }}>Quick actions</h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8, marginBottom:24 }}>
                {[
                  { label:"Branches",    icon:"🏪", action:()=>setTab("branches")       },
                  { label:"Orders",      icon:"📋", action:()=>setTab("sa-orders")      },
                  { label:"Staff list",  icon:"👥", action:()=>setTab("staff")          },
                  { label:"Admins",      icon:"🔑", action:()=>setTab("admins")         },
                  { label:"Payments",    icon:"💳", action:()=>setTab("payments")       },
                  { label:"Analytics",   icon:"📊", action:()=>setTab("reports")        },
                  { label:"Reviews",     icon:"⭐", action:()=>setTab("reviews")        },
                  { label:"Offers",      icon:"🏷",  action:()=>setTab("offers")         },
                ].map(a => (
                  <button key={a.label} onClick={a.action}
                    style={{ padding:"14px 12px", borderRadius:10, border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", textAlign:"left", transition:"all 160ms", display:"flex", flexDirection:"column", gap:6 }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.background="var(--brand-tint, rgba(232,73,15,.05))";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.background="var(--bg2)";}}>
                    <span style={{ fontSize:"1.25rem", lineHeight:1 }}>{a.icon}</span>
                    <span style={{ fontSize:".8125rem", fontWeight:700, color:"var(--t1)" }}>{a.label}</span>
                  </button>
                ))}
              </div>

              {/* Login history (today) */}
              <DashboardLoginHistory/>
            </div>
          )}

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
                    onEdit={() => {
                      setEditingBranchId(b.id);
                      setBranchForm({ name:b.name, address:b.address||"", phone:b.phone||"", email:b.email||"", latitude:b.latitude||"", longitude:b.longitude||"", upi_id:b.upi_id||"" });
                      setBranchErrors({}); setBranchApiErr("");
                      setBranchModal(true);
                    }}
                    onDeactivate={() => handleDeleteBranch(b)}
                    onReactivate={id => setBranches(bs => bs.map(x => x.id === id ? { ...x, is_active: true } : x))}
                    onModeToggled={(id, field, val) => setBranches(bs => bs.map(x => x.id === id ? { ...x, [field]: val } : x))}
                  />
                ))}
              </div>
            )}
          </>)}

          {/* ── USERS ── */}
          {tab === "sa-orders"      && <SuperAdminOrdersTab branches={branches}/>}
          {tab === "users"          && <SuperAdminUsersTab/>}
          {tab === "stock"          && <SuperAdminStockTab branches={branches}/>}
          {tab === "redemptions"    && <SuperAdminRedemptionsTab/>}
          {tab === "payments"       && <PaymentLogsTab branches={branches}/>}
          {tab === "export"         && <SuperAdminExportTab branches={branches}/>}
          {tab === "staff"          && <StaffManager isSuperAdmin branches={branches}/>}
          {tab === "admins"         && <BranchAdminUsersTab branches={branches}/>}
          {tab === "login-records"  && <CombinedLoginRecordsTab branches={branches}/>}
          {tab === "reviews"        && <SuperAdminReviewsTab branches={branches}/>}
          {tab === "reports"        && <SuperAdminAnalyticsTab branches={branches}/>}
          {tab === "support"        && <SupportTicketsTab branches={branches}/>}
          {tab === "settings"       && <SuperAdminSettingsTab/>}

        </div>{/* /adm-content */}
        </div>{/* /adm-main */}
      </div>{/* /adm-shell--row */}

      {/* ── Create / Edit Branch Modal ── */}
      <Modal
        open={branchModal}
        onClose={() => { setBranchModal(false); setBranchErrors({}); setBranchApiErr(""); setEditingBranchId(null); setBranchForm({ name:"", address:"", phone:"", email:"", latitude:"", longitude:"", upi_id:"" }); }}
        title={editingBranchId ? "Edit Branch" : "New Branch"}
        subtitle={editingBranchId ? "Update this branch's details" : "Add a KNFC location"}
      >
        <form onSubmit={handleCreateBranch}>
          <ErrBox msg={branchApiErr}/>

          <div style={{ marginBottom:14 }}>
            <FL req>Branch name</FL>
            <div className={"adm-input-wrap"+(branchErrors.name?" err":"")}>
              <input className="adm-input" value={branchForm.name} onChange={e => setBranchForm(f=>({...f,name:e.target.value}))} placeholder="KNFC Kozhikode" autoFocus/>
            </div>
            {branchErrors.name && <p className="adm-field-err">{branchErrors.name}</p>}
          </div>

          <div style={{ marginBottom:14 }}>
            <FL>Address</FL>
            <div className="adm-input-wrap">
              <input className="adm-input" value={branchForm.address} onChange={e => setBranchForm(f=>({...f,address:e.target.value}))} placeholder="Street, City, State"/>
            </div>
          </div>

          <div className="adm-form-grid" style={{ marginBottom:14 }}>
            <div>
              <FL>Phone <span style={{ fontWeight:400, color:"var(--t3)", fontSize:".75rem" }}>10 digits</span></FL>
              <div className={"adm-input-wrap"+(branchErrors.phone?" err":"")}>
                <input className="adm-input" type="tel" inputMode="numeric" maxLength={10} value={branchForm.phone} onChange={e => setBranchForm(f=>({...f,phone:e.target.value.replace(/\D/g,"")}))} placeholder="9876543210"/>
              </div>
              {branchErrors.phone && <p className="adm-field-err">{branchErrors.phone}</p>}
            </div>
            <div>
              <FL>Email</FL>
              <div className={"adm-input-wrap"+(branchErrors.email?" err":"")}>
                <input className="adm-input" type="email" value={branchForm.email} onChange={e => setBranchForm(f=>({...f,email:e.target.value}))} placeholder="branch@knfc.in"/>
              </div>
              {branchErrors.email && <p className="adm-field-err">{branchErrors.email}</p>}
            </div>
          </div>

          <div className="adm-form-grid" style={{ marginBottom:14 }}>
            <div>
              <FL>Latitude <span style={{ fontWeight:400, color:"var(--t3)", fontSize:".75rem" }}>optional</span></FL>
              <div className={"adm-input-wrap"+(branchErrors.latitude?" err":"")}>
                <input className="adm-input" inputMode="decimal" value={branchForm.latitude} onChange={e => setBranchForm(f=>({...f,latitude:e.target.value}))} placeholder="11.2588"/>
              </div>
              {branchErrors.latitude && <p className="adm-field-err">{branchErrors.latitude}</p>}
            </div>
            <div>
              <FL>Longitude <span style={{ fontWeight:400, color:"var(--t3)", fontSize:".75rem" }}>optional</span></FL>
              <div className={"adm-input-wrap"+(branchErrors.longitude?" err":"")}>
                <input className="adm-input" inputMode="decimal" value={branchForm.longitude} onChange={e => setBranchForm(f=>({...f,longitude:e.target.value}))} placeholder="75.7804"/>
              </div>
              {branchErrors.longitude && <p className="adm-field-err">{branchErrors.longitude}</p>}
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <FL>UPI ID <span style={{ fontWeight:400, color:"var(--t3)", fontSize:".75rem" }}>for payment QR — optional</span></FL>
            <div className={"adm-input-wrap"+(branchErrors.upi_id?" err":"")}>
              <input className="adm-input" value={branchForm.upi_id} onChange={e => setBranchForm(f=>({...f,upi_id:e.target.value}))} placeholder="knfc.branchname@upi"/>
            </div>
            {branchErrors.upi_id
              ? <p className="adm-field-err">{branchErrors.upi_id}</p>
              : <p style={{ fontSize:".75rem", color:"var(--t3)", marginTop:4 }}>Used to generate the UPI payment QR code for customers.</p>
            }
          </div>

          <div style={{ display:"flex", gap:"var(--gap)", justifyContent:"flex-end", borderTop:"1px solid var(--bd)", paddingTop:16 }}>
            <button type="button" onClick={() => { setBranchModal(false); setBranchErrors({}); setBranchApiErr(""); setEditingBranchId(null); setBranchForm({ name:"", address:"", phone:"", email:"", latitude:"", longitude:"", upi_id:"" }); }} className="adm-btn adm-btn-ghost">Cancel</button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={branchSaving}>
              {branchSaving
                ? (editingBranchId ? "Saving…" : "Creating…")
                : (editingBranchId ? "Save changes" : "Create branch")}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Create Branch Admin Modal ── */}
      <Modal open={adminModal} onClose={() => { setAdminModal(false); setAdminErrors({}); setAdminApiErr(""); setAdminSuccess(null); }} title="Create Branch Admin" subtitle="New admin account — login credentials sent via email">
        {adminSuccess ? (
          <div>
            <div style={{ textAlign:"center", padding:"24px 0 16px" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(29,158,117,.12)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.125rem", marginBottom:6 }}>Admin account created!</div>
              <p style={{ fontSize:".875rem", color:"var(--t3)" }}>Login credentials have been sent to their email.</p>
            </div>

            <div style={{ background:"var(--bg2)", border:"1px solid var(--bd)", borderRadius:"var(--radius)", padding:16, marginBottom:16 }}>
              {[["Name", adminSuccess.name], ["Email", adminSuccess.email], ["Password", "Auto-generated · sent via email"]].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid var(--bd)" }}>
                  <span style={{ fontSize:".8125rem", color:"var(--t3)", fontWeight:600 }}>{k}</span>
                  <span style={{ fontSize:".875rem", fontWeight:700, color:k==="Password"?"var(--brand)":"var(--t1)" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button className="adm-btn adm-btn-ghost" style={{ flex:1 }}
                onClick={() => {
                  navigator.clipboard?.writeText(`Branch Admin Login\nEmail: ${adminSuccess.email}\nPassword: (sent to email)`).then(() => showToast("Copied!")).catch(() => {});
                }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy
              </button>
              <button onClick={() => { setAdminModal(false); setAdminSuccess(null); }} className="adm-btn adm-btn-primary" style={{ flex:1 }}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateAdmin}>
            <ErrBox msg={adminApiErr}/>
            <div style={{ marginBottom:14 }}>
              <FL req>Full name</FL>
              <div className={"adm-input-wrap"+(adminErrors.name?" err":"")}>
                <input className="adm-input" value={adminForm.name} onChange={e=>setAdminForm(f=>({...f,name:e.target.value}))} placeholder="Full name" autoFocus/>
              </div>
              {adminErrors.name && <p className="adm-field-err">{adminErrors.name}</p>}
            </div>
            <div style={{ marginBottom:14 }}>
              <FL req>Email address</FL>
              <div className={"adm-input-wrap"+(adminErrors.email?" err":"")}>
                <input className="adm-input" type="email" value={adminForm.email} onChange={e=>setAdminForm(f=>({...f,email:e.target.value}))} placeholder="admin@knfc.in"/>
              </div>
              {adminErrors.email && <p className="adm-field-err">{adminErrors.email}</p>}
            </div>
            <div style={{ marginBottom:20 }}>
              <FL req>Branch</FL>
              <select value={adminBranchId} onChange={e=>setAdminBranchId(e.target.value)} className={"adm-select"+(adminErrors.branch_id?" err":"")} style={{ width:"100%" }}>
                <option value="">Select branch…</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {adminErrors.branch_id && <p className="adm-field-err">{adminErrors.branch_id}</p>}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", borderTop:"1px solid var(--bd)", paddingTop:16 }}>
              <button type="button" onClick={() => { setAdminModal(false); setAdminErrors({}); }} className="adm-btn adm-btn-ghost">Cancel</button>
              <button type="submit" className="adm-btn adm-btn-primary" disabled={adminSaving}>
                {adminSaving ? "Creating…" : "Create admin"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {ToastEl}
    </>
  );
}

export default BranchDashboard;
