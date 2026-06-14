/**
 * api/menu.js
 * All menu API calls — public + admin management
 */

import axiosClient from "./axiosClient";

const BID = () => localStorage.getItem("branch_id") || "";
const adminBID = (override) => override || BID();

/* ── Public / Customer ────────────────────────────────────────────────── */
export const getCategories     = () => axiosClient.get(`/menu/categories/?branch_id=${BID()}`);
export const getCategoryDetail = (slug) => axiosClient.get(`/menu/categories/${slug}/?branch_id=${BID()}`);
export const getItems          = (params) => axiosClient.get("/menu/items/", { params: { branch_id: BID(), ...params } });
export const getItemDetail     = (slug, branchId) => axiosClient.get(`/menu/items/${slug}/?branch_id=${branchId || BID()}`);
export const getFeatured       = () => axiosClient.get(`/menu/featured/?branch_id=${BID()}`);
export const searchItems       = (q) => axiosClient.get(`/menu/search/?branch_id=${BID()}&q=${q}`);
export const getFavourites     = () => axiosClient.get("/menu/favourites/");
export const getHomeSections   = () => axiosClient.get(`/menu/home-sections/?branch_id=${BID()}`);
export const getHomeBundle     = () => axiosClient.get(`/menu/home-bundle/?branch_id=${BID()}`);
export const getMenuBundle     = (params) => axiosClient.get("/menu/menu-bundle/", { params: { branch_id: BID(), ...params } });
export const toggleFavourite   = (id) => axiosClient.post("/menu/favourites/toggle/", { menu_item_id: id });

export const submitReview = (menuItemId, rating, comment = '', photoFile = null, orderId = null) => {
  const formData = new FormData();
  formData.append('menu_item_id', menuItemId);
  formData.append('rating', rating);
  if (comment) formData.append('comment', comment);
  if (orderId) formData.append('order_id', orderId);
  if (photoFile) formData.append('photo', photoFile);

  return axiosClient.post("/menu/reviews/", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};

/* ── Admin — Categories ───────────────────────────────────────────────── */
export const adminGetCategories = (branchId) =>
  axiosClient.get("/menu/admin/categories/", { params: branchId ? { branch_id: branchId } : {} });

export const adminCreateCategory = (formData, branchId = null) => {
  if (branchId && formData instanceof FormData) {
    formData.append("branch_id", branchId);
  }
  return axiosClient.post("/menu/admin/categories/", formData, {
    headers: { "Content-Type": "multipart/form-data" }   // ← CRITICAL
  });
};

export const adminUpdateCategory = (id, formData) =>
  axiosClient.patch(`/menu/admin/categories/${id}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

export const adminDeleteCategory = (id) => axiosClient.delete(`/menu/admin/categories/${id}/`);

/* ── Admin — Items ────────────────────────────────────────────────────── */
export const adminGetItems = (params = {}, branchId = null) =>
  axiosClient.get("/menu/admin/items/", { 
    params: { ...(branchId ? { branch_id: branchId } : {}), ...params } 
  });

export const adminCreateItem = (formData, branchId = null) => {
  if (branchId && formData instanceof FormData) {
    formData.append("branch_id", branchId);
  }
  return axiosClient.post("/menu/admin/items/", formData, {
    headers: { "Content-Type": "multipart/form-data" }   // ← CRITICAL
  });
};

export const adminUpdateItem = (id, formData, branchId = null) => {
  if (branchId && formData instanceof FormData) {
    formData.append("branch_id", branchId);
  }
  return axiosClient.patch(`/menu/admin/items/${id}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};

export const adminGetItem     = (id) => axiosClient.get(`/menu/admin/items/${id}/`);
export const adminDeleteItem  = (id) => axiosClient.delete(`/menu/admin/items/${id}/`);
export const adminToggleAvail = (id) => axiosClient.patch(`/menu/admin/items/${id}/toggle/`);

/* ── Admin — Reviews ──────────────────────────────────────────────────── */
export const adminReplyReview     = (id, reply) => axiosClient.patch(`/menu/admin/reviews/${id}/reply/`, { admin_reply: reply });
export const adminGetReviews      = (params = {}) => axiosClient.get("/menu/admin/reviews/", { params });
export const adminToggleReviewVis = (id) => axiosClient.patch(`/menu/admin/reviews/${id}/visibility/`);