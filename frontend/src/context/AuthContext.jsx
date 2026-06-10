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
  if (!withCoords.length) return { ...list[0], _dist: null };
  let best = null, bestDist = Infinity;
  for (const b of withCoords) {
    const d = _haversineKm(lat, lon, Number(b.latitude), Number(b.longitude));
    if (d < bestDist) { bestDist = d; best = b; }
  }
  return best ? { ...best, _dist: bestDist } : { ...list[0], _dist: null };
}

const AuthContext = createContext(null);

const BRANCH_KEY        = "knfc_selected_branch";
const BRANCHES_CACHE    = "knfc_branches_cache";
const SUGGESTION_KEY    = "knfc_branch_suggestion_dismissed";
// true  = branch was auto-detected (GPS can silently update it again)
// false = user manually picked a branch (GPS only suggests, never auto-switches)
const BRANCH_AUTO_KEY   = "knfc_branch_auto";

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

        const _persist = (branch, isAuto) => {
          setSelectedBranch(branch);
          localStorage.setItem(BRANCH_KEY,      JSON.stringify(branch));
          localStorage.setItem("branch_id",     branch.id);
          localStorage.setItem(BRANCH_AUTO_KEY, isAuto ? "1" : "0");
          setLoading(false);
        };

        // ── 1. Show list[0] instantly — page is live with zero wait ──────────
        _persist(list[0], true);

        if (list.length <= 1 || !navigator?.geolocation) return;

        // ── 2. GPS runs in background (non-blocking) ─────────────────────────
        // Auto-switch window: 3 s. If GPS responds within 3 s, silently switch
        // to the nearest branch (first visit — user hasn't started browsing yet).
        // After 3 s the user may be actively browsing list[0]; show banner instead.
        let autoSwitchOpen = true;
        const autoSwitchTimer = setTimeout(() => { autoSwitchOpen = false; }, 3000);

        navigator.geolocation.getCurrentPosition(
          pos => {
            clearTimeout(autoSwitchTimer);
            const nearest = _pickNearest(list, pos.coords.latitude, pos.coords.longitude);
            if (!nearest?.id || nearest.id === list[0].id) return;

            if (autoSwitchOpen) {
              // GPS was fast — auto-set nearest silently (no banner, no reload)
              setSelectedBranch(nearest);
              localStorage.setItem(BRANCH_KEY,      JSON.stringify(nearest));
              localStorage.setItem("branch_id",     nearest.id);
              localStorage.setItem(BRANCH_AUTO_KEY, "1");
            } else {
              // GPS was slow — user may be browsing list[0] already, show banner
              setSuggestedBranch(nearest);
            }
          },
          () => { clearTimeout(autoSwitchTimer); /* denied — list[0] is fine */ },
          { timeout: 8000, maximumAge: 300000 },
        );
      };

      const cached = _cachedBranches().filter(b => b.is_active !== false);
      if (cached.length) {
        // Return visits: use cache instantly — zero wait, page renders now
        saveBranchFromList(cached);
        // Silently refresh cache in background (no await, no state changes)
        getPublicBranches()
          .then(res => {
            const list = (res.data?.branches || []).filter(b => b.is_active !== false);
            if (list.length) localStorage.setItem(BRANCHES_CACHE, JSON.stringify(list));
          })
          .catch(() => {});
      } else {
        // First ever visit — must fetch from API
        getPublicBranches()
          .then(res => {
            const list = (res.data?.branches || []).filter(b => b.is_active !== false);
            if (list.length) localStorage.setItem(BRANCHES_CACHE, JSON.stringify(list));
            saveBranchFromList(list);
          })
          .catch(() => {
            saveBranchFromList([]); // shows branch picker if truly no data
          });
      }
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
    const dismissed   = localStorage.getItem(SUGGESTION_KEY);
    const today       = new Date().toISOString().slice(0, 10);
    const wasAutoSet  = localStorage.getItem(BRANCH_AUTO_KEY) === "1";
    if (dismissed === today && !wasAutoSet) return;

    getPublicBranches()
      .then(res => {
        const list = (res.data?.branches || []).filter(b => b.is_active !== false);
        if (!list.length || !navigator?.geolocation) return;

        navigator.geolocation.getCurrentPosition(
          pos => {
            const nearest = _pickNearest(list, pos.coords.latitude, pos.coords.longitude);
            if (!nearest?.id || nearest.id === currentBranch?.id) return;

            if (wasAutoSet) {
              // Branch was auto-detected last time — silently update to nearest
              setSelectedBranch(nearest);
              localStorage.setItem(BRANCH_KEY,      JSON.stringify(nearest));
              localStorage.setItem("branch_id",     nearest.id);
              localStorage.setItem(BRANCH_AUTO_KEY, "1");
            } else {
              // User manually chose this branch — only suggest via banner
              setSuggestedBranch(nearest);
            }
          },
          () => {},
          { timeout: 6000, maximumAge: 300000 },
        );
      })
      .catch(() => {});
  }, []);

  /* ── Branch selection (customers) ────────────────────────────────── */
  const selectBranch = useCallback((branch) => {
    setSelectedBranch(branch);
    localStorage.setItem(BRANCH_KEY,      JSON.stringify(branch));
    localStorage.setItem("branch_id",     branch.id);
    localStorage.setItem(BRANCH_AUTO_KEY, "0"); // user made an explicit choice
    try {
      const { default: useCartStore } = require("../store/cartStore");
      useCartStore.getState().setBranch(branch.id);
    } catch {}
    window.location.reload();
  }, []);

  const clearBranch = useCallback(() => {
    setSelectedBranch(null);
    setSuggestedBranch(null);
    localStorage.removeItem(BRANCH_KEY);
    localStorage.removeItem("branch_id");
    localStorage.removeItem(BRANCH_AUTO_KEY);
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
