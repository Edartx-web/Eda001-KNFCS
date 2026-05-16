/**
 * api/auth.js
 * Auth, branches, and offers API calls
 */
import axiosClient from "./axiosClient";

/* ── Staff / Admin Auth ────────────────────────────────────────────────── */
export const staffLogin          = (data) => axiosClient.post("/auth/staff/login/", data);
export const adminLogin          = (data) => axiosClient.post("/auth/admin/login/", data);
export const refreshJwt          = (refresh) => axiosClient.post("/auth/token/refresh/", { refresh });
export const changePassword = (current, newPw) =>
  axiosClient.post("/auth/change-password/", {
    current_password: current,
    new_password:     newPw,
  });

/* ── Admin Management of Staff ────────────────────────────────────────── */
export const createStaff         = (data) => axiosClient.post("/auth/admin/staff/", data);
export const createBranchAdmin   = (data) => axiosClient.post("/auth/admin/branch-admins/", data);
export const staffVerifyEmail    = (data) => axiosClient.post("/auth/staff/verify-email/", data);
export const staffResendOTP      = (email) => axiosClient.post("/auth/staff/resend-otp/", { email });
export const staffForgotPassword = (data) => axiosClient.post("/auth/staff/forgot-password/", data);
export const staffResetPassword  = (data) => axiosClient.post("/auth/staff/reset-password/", data);

/* ── Branches ────────────────────────────────────────────────────────── */
export const getPublicBranches = () => axiosClient.get("/branches/public/");
export const getBranches       = (params) => axiosClient.get("/branches/", { params });

/* ── Offers ──────────────────────────────────────────────────────────── */
export const getOffers         = (params) => axiosClient.get("/offers/", { params });
export const createOffer       = (data) => {
  const headers = data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
  return axiosClient.post("/offers/admin/", data, { headers });
};
export const updateOffer       = (id, data) => {
  const headers = data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
  return axiosClient.patch(`/offers/admin/${id}/`, data, { headers });
};
export const deleteOffer       = (id) => axiosClient.delete(`/offers/admin/${id}/`);
