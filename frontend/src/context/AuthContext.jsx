/**
 * context/AuthContext.jsx
 *
 * Global auth + branch state.
 *
 * Branch selection (customers):
 *   selectedBranch  — full branch object { id, name, address, ... } | null
 *   selectBranch(b) — saves to localStorage + cartStore
 *   clearBranch()   — clears selection (e.g. on logout)
 *
 * Auth (all roles):
 *   login(userData, tokens)
 *   loginWithApi(role, creds)
 *   logout()
 */

import React, {
  createContext, useContext,
  useState, useEffect, useCallback,
} from "react";
import { clearAuthTokens } from "../api/axiosClient";
import {
  staffLogin        as apiStaffLogin,
  adminLogin        as apiAdminLogin,
  refreshJwt,
  getPublicBranches,
} from "../api/auth";

function _haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _pickNearest(list, lat, lon) {
  const withCoords = list.filter(b => b.latitude != null && b.longitude != null);
  if (!withCoords.length) return list[0];
  return withCoords.reduce((best, b) => {
    const d  = _haversineKm(lat, lon, Number(b.latitude),    Number(b.longitude));
    const bd = _haversineKm(lat, lon, Number(best.latitude), Number(best.longitude));
    return d < bd ? b : best;
  });
}

const AuthContext = createContext(null);

const BRANCH_KEY        = "knfc_selected_branch";
const BRANCHES_CACHE    = "knfc_branches_cache";   // last-known branch list (survives 429s)
const SUGGESTION_KEY    = "knfc_branch_suggestion_dismissed"; // date when last dismissed

/* Read cached branch list — used as instant fallback when API fails */
function _cachedBranches() {
  try { return JSON.parse(localStorage.getItem(BRANCHES_CACHE) || "[]"); } catch { return []; }
}

/* IP-based geo was removed — external services (ip-api.com etc.) are
   routinely blocked by ad-blockers (ERR_BLOCKED_BY_CLIENT).
   Branch selection uses: list[0] instantly → browser GPS suggestion in background. */

export function AuthProvider({ children }) {
  const [user,            setUser]           = useState(null);
  const [isLoading,       setLoading]        = useState(true);
  const [selectedBranch,  setSelectedBranch] = useState(null);
  const [suggestedBranch, setSuggestedBranch]= useState(null); // nearest ≠ current

  /* ── Restore session ─────────────────────────────────────────────── */
  useEffect(() => {
    const storedUser   = localStorage.getItem("user");
    const accessToken  = localStorage.getItem("access_token");
    const storedBranch = localStorage.getItem(BRANCH_KEY);

    if (storedUser && accessToken) {
      try { setUser(JSON.parse(storedUser)); } catch { clearAuthTokens(); }
    }

    if (storedBranch) {
      try {
        const branch = JSON.parse(storedBranch);
        setSelectedBranch(branch);
        if (branch?.id) localStorage.setItem("branch_id", branch.id);
        setLoading(false);
      } catch { setLoading(false); }
    } else {
      // No branch stored yet.
      // Priority: API list → cached list → show picker (last resort)
      // Branch is ALWAYS set synchronously (list[0]) so the page never waits.
      // IP-geo and browser-geo run silently in the background.

      const saveBranchFromList = (list) => {
        if (!list.length) { setLoading(false); return; }

        // ── 1. Set first branch RIGHT NOW — zero waiting, page renders immediately ──
        const defaultBranch = list[0];
        setSelectedBranch(defaultBranch);
        localStorage.setItem(BRANCH_KEY,  JSON.stringify(defaultBranch));
        localStorage.setItem("branch_id", defaultBranch.id);
        setLoading(false);   // ← page is live here

        // ── 2. Background browser-GPS (only if multiple branches exist) ──
        // Non-blocking: asks for location permission AFTER page has loaded.
        // If a nearer branch is found, the NearestBranchBanner suggests switching.
        if (list.length <= 1 || !navigator?.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          pos => {
            const nearest = _pickNearest(list, pos.coords.latitude, pos.coords.longitude);
            if (nearest?.id && nearest.id !== defaultBranch.id) setSuggestedBranch(nearest);
          },
          () => { /* denied — default branch is fine */ },
          { timeout: 5000, maximumAge: 300000 },
        );
      };

      getPublicBranches()
        .then(res => {
          const list = (res.data?.branches || []).filter(b => b.is_active !== false);
          if (list.length) localStorage.setItem(BRANCHES_CACHE, JSON.stringify(list));
          saveBranchFromList(list);
        })
        .catch(() => {
          // API failed (429, network error) — use cached list from previous visit
          const cached = _cachedBranches().filter(b => b.is_active !== false);
          saveBranchFromList(cached);  // sets loading=false even when cache is empty
        });
    }
  }, []);

  /* ── Persist tokens + user ───────────────────────────────────────── */
  const _persist = useCallback((userData, tokens) => {
    if (tokens?.access)  localStorage.setItem("access_token",  tokens.access);
    if (tokens?.refresh) localStorage.setItem("refresh_token", tokens.refresh);
    localStorage.setItem("user", JSON.stringify(userData));
    // Staff / Admin: their branch_id comes from JWT — store for API calls
    if (userData.branch_id) {
      localStorage.setItem("branch_id", userData.branch_id);
    }
    setUser(userData);
  }, []);

  /* ── Detect nearest branch after customer login (non-blocking) ───── */
  const _detectNearestAfterLogin = useCallback((currentBranch) => {
    // Only run for customers; skip if suggestion was already dismissed today
    const dismissed = localStorage.getItem(SUGGESTION_KEY);
    const today     = new Date().toISOString().slice(0, 10);
    if (dismissed === today) return;

    getPublicBranches()
      .then(res => {
        const list = (res.data?.branches || []).filter(b => b.is_active !== false);
        if (!list.length) return;

        const suggest = (branch) => {
          // Only suggest if it's actually different from the current branch
          if (!branch || branch.id === currentBranch?.id) return;
          setSuggestedBranch(branch);
        };

        if (!navigator?.geolocation) {
          // No geo — default branch is list[0], no suggestion needed
          return;
        }

        navigator.geolocation.getCurrentPosition(
          pos => {
            const nearest = _pickNearest(list, pos.coords.latitude, pos.coords.longitude);
            suggest(nearest);
          },
          () => { /* permission denied — don't suggest */ },
          { timeout: 6000, maximumAge: 300000 },
        );
      })
      .catch(() => {});
  }, []);

  /* ── Branch selection (customers) ────────────────────────────────── */
  const selectBranch = useCallback((branch) => {
    setSelectedBranch(branch);
    localStorage.setItem(BRANCH_KEY,  JSON.stringify(branch));
    localStorage.setItem("branch_id", branch.id);  // used by all API BID() helpers
    // Sync cartStore so buildOrderPayload always has branch_id
    try {
      const { default: useCartStore } = require("../store/cartStore");
      useCartStore.getState().setBranch(branch.id);
    } catch {}
    // Reload so all menu/offer/config fetches re-run with the new branch context
    window.location.reload();
  }, []);

  const clearBranch = useCallback(() => {
    setSelectedBranch(null);
    setSuggestedBranch(null);
    localStorage.removeItem(BRANCH_KEY);
    localStorage.removeItem("branch_id");
  }, []);

  const dismissBranchSuggestion = useCallback(() => {
    setSuggestedBranch(null);
    localStorage.setItem(SUGGESTION_KEY, new Date().toISOString().slice(0, 10));
  }, []);

  /* ── login ───────────────────────────────────────────────────────── */
  const login = useCallback((userData, tokens) => {
    _persist(userData, tokens);
    // For customers: silently check if there's a closer branch after login
    if (userData.role === "customer") {
      const currentBranch = (() => {
        try { return JSON.parse(localStorage.getItem(BRANCH_KEY)); } catch { return null; }
      })();
      // Slight delay so UI settles before geolocation prompt
      setTimeout(() => _detectNearestAfterLogin(currentBranch), 1200);
    }
  }, [_persist, _detectNearestAfterLogin]);

  /* ── loginWithApi ────────────────────────────────────────────────── */
  const loginWithApi = useCallback(async (role, credentials) => {
    if (role === "customer") {
      throw new Error("Use customerVerifyOtp directly for customers.");
    }
    let data;
    if (role === "staff") {
      const res = await apiStaffLogin(credentials.user_id, credentials.password);
      data = res.data;
    } else {
      const res = await apiAdminLogin(credentials.email, credentials.password);
      data = res.data;
      if (role !== data.user.role) {
        throw new Error(
          `This account is a ${data.user.role.replace("_"," ")}, not a ${role.replace("_"," ")}.`
        );
      }
    }
    _persist(data.user, data.tokens);
    return data.user;
  }, [_persist]);

  /* ── logout ──────────────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    // Tell backend to flip is_on_duty=False for staff/branch_admin
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL || "/api/v1"}/auth/logout/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }
    } catch { /* best-effort — proceed with local logout regardless */ }
    clearAuthTokens();
    localStorage.removeItem("branch_id");
    localStorage.removeItem("active_order");
    localStorage.removeItem(BRANCH_KEY);
    setSelectedBranch(null);
    setUser(null);
  }, []);

  /* ── refreshSession ──────────────────────────────────────────────── */
  const refreshSession = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return false;
    try {
      const res = await refreshJwt(refresh);
      localStorage.setItem("access_token", res.data.access);
      return true;
    } catch {
      logout();
      return false;
    }
  }, [logout]);

  const role           = user?.role ?? null;
  const isCustomer     = role === "customer";
  const isStaff        = role === "staff";
  const isBranchAdmin  = role === "branch_admin";
  const isSuperAdmin   = role === "super_admin";
  const isAdminOrAbove = isBranchAdmin || isSuperAdmin;
  const isAuthenticated= Boolean(user);

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated,
      role, isCustomer, isStaff, isBranchAdmin, isSuperAdmin, isAdminOrAbove,
      selectedBranch, selectBranch, clearBranch,
      suggestedBranch, dismissBranchSuggestion,
      login, loginWithApi, logout, refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
