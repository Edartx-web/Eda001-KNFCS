/**
 * api/axiosClient.js
 * Central Axios instance — JWT attach, silent refresh, 401 redirect
 */
import axios from "axios";

const determineBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.endsWith("knfcs.com")) return "https://api.knfcs.com/api/v1";
    if (hostname !== "localhost" && hostname !== "127.0.0.1")
      return `http://${hostname}:1000/api/v1`;
  }
  return "http://localhost:1000/api/v1";
};

const BASE = determineBaseUrl();

const axiosClient = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach JWT
axiosClient.interceptors.request.use(
  (cfg) => {
    const t = localStorage.getItem("access_token");
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
  },
  (err) => Promise.reject(err)
);

// Handle 401 — try silent refresh once
let refreshing = false;
let queue = [];

const drain = (err, token = null) => {
  queue.forEach(p => err ? p.reject(err) : p.resolve(token));
  queue = [];
};

axiosClient.interceptors.response.use(
  r => r,
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then(token => { orig.headers.Authorization = `Bearer ${token}`; return axiosClient(orig); });
      }
      orig._retry = true;
      refreshing = true;
      try {
        const ref = localStorage.getItem("refresh_token");
        if (!ref) throw new Error("no refresh token");
        const { data } = await axios.post(`${BASE}/auth/token/refresh/`, { refresh: ref });
        localStorage.setItem("access_token", data.access);
        drain(null, data.access);
        orig.headers.Authorization = `Bearer ${data.access}`;
        return axiosClient(orig);
      } catch (e) {
        drain(e);
        clearAuthTokens();
        window.location.href = "/login/customer";
        return Promise.reject(e);
      } finally { refreshing = false; }
    }
    return Promise.reject(error);
  }
);

export function clearAuthTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export default axiosClient;
