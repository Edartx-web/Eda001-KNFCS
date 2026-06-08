import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Keep the Render backend warm — ping every 9 min so it never cold-starts
// (Render free tier sleeps after 15 min of inactivity)
const PING_URL = (() => {
  const h = window.location.hostname;
  if (h.endsWith("knfcs.com") || h.endsWith("onrender.com")) return "https://knfc-backend.onrender.com/api/v1/branches/";
  return null;
})();
if (PING_URL) {
  const ping = () => fetch(PING_URL, { method:"GET", mode:"no-cors" }).catch(()=>{});
  ping(); // immediate ping on first load
  setInterval(ping, 9 * 60 * 1000);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
