/**
 * api/orders.js — orders, offers, stock, loyalty
 */
import axiosClient from "./axiosClient";
const BID = () => localStorage.getItem("branch_id") || "";

// Offers
export const getOffers      = ()   => axiosClient.get(`/offers/?branch_id=${BID()}`);
export const getOfferDetail = (id) => axiosClient.get(`/offers/${id}/`);

// Orders
export const placeOrder         = (data)        => axiosClient.post("/orders/", data);
export const getMyOrders        = ()            => axiosClient.get("/orders/my/");
export const getOrderDetail     = (id)          => axiosClient.get(`/orders/${id}/`);
export const getOrderQueue      = ()            => axiosClient.get("/orders/queue/");
export const updateOrderStatus  = (id, status) => axiosClient.patch(`/orders/${id}/status/`, { status });
export const getCompletedOrders = ()            => axiosClient.get("/orders/completed/");

// Stock
export const getStockDashboard  = ()   => axiosClient.get("/stock/");
export const topUpStock         = (d)  => axiosClient.post("/stock/topup/", d);
export const getStockLog        = (p)  => axiosClient.get("/stock/log/", { params: p });
export const ackAlerts          = ()   => axiosClient.patch("/stock/alerts/ack/");

// Analytics
export const getAnalytics = (branchId) =>
  axiosClient.get("/orders/analytics/", { params: branchId ? { branch_id: branchId } : {} });

// Loyalty
export const redeemLoyaltyPoints = (points) => axiosClient.post("/orders/loyalty/redeem/", { points });

// Branch QR
export const getBranchQR     = (branchId) => axiosClient.get(`/branches/${branchId}/qr/`);
export const regenerateBranchQR = (branchId) => axiosClient.post(`/branches/${branchId}/qr/`);

// Cancel order (customer: placed only | staff/admin: any non-completed)
export const cancelOrder = (orderId) => axiosClient.patch(`/orders/${orderId}/cancel/`);

// Mark payment (staff)
export const markOrderPayment = (orderId, data) => axiosClient.patch(`/orders/${orderId}/payment/`, data);
