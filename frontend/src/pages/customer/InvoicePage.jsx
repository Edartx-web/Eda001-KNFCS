/**
 * InvoicePage.jsx
 * Route: /order/invoice/:orderId  (public — no login required)
 * Professional GST-style invoice. No emoji. Printable.
 */
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API = (() => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const h = window.location.hostname;
  if (h.endsWith("knfcs.com")) return "https://api.knfcs.com/api/v1";
  return `http://${h}:1000/api/v1`;
})();

/* ── Helpers ── */
const fmt = n => "Rs. " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const fmtDt = iso => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    + " at " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
};

/* Convert number to words (Indian system, up to crores) */
function amountInWords(n) {
  const num = Math.round(Number(n) * 100) / 100;
  const rupees = Math.floor(num);
  const paise  = Math.round((num - rupees) * 100);

  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
             "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
             "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function words(n) {
    if (n < 20)  return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + words(n % 100) : "");
    if (n < 100000) return words(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + words(n % 1000) : "");
    if (n < 10000000) return words(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + words(n % 100000) : "");
    return words(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + words(n % 10000000) : "");
  }

  let result = words(rupees) + " Rupees";
  if (paise > 0) result += " and " + words(paise) + " Paise";
  return result + " Only";
}

export default function InvoicePage() {
  const { orderId }   = useParams();
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    axios.get(`${API}/orders/${orderId}/invoice/`)
      .then(r => setInv(r.data.invoice))
      .catch(() => setErr("Invoice not found or link has expired."));
  }, [orderId]);

  if (err) return (
    <div style={S.center}>
      <div style={{ fontSize: 32, marginBottom: 12, color: "#c00" }}>X</div>
      <p style={{ color: "#c00", fontWeight: 700, fontFamily: "Arial, sans-serif" }}>{err}</p>
    </div>
  );

  if (!inv) return (
    <div style={S.center}>
      <div style={S.spinner} />
      <p style={{ color: "#888", marginTop: 14, fontSize: 13, fontFamily: "Arial, sans-serif" }}>Loading invoice...</p>
    </div>
  );

  const discount  = parseFloat(inv.discount || 0);
  const total     = parseFloat(inv.total || 0);
  const isPaid    = inv.payment_status === "paid";
  const typeLabel = inv.order_type === "dine_in"
    ? "Dine-in" + (inv.table_number ? " - Table " + inv.table_number : "")
    : "Pickup";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #e8e8e8; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .invoice-card { box-shadow: none !important; max-width: 100% !important; margin: 0 !important; }
          @page { margin: 6mm; size: A4; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 8px 10px; text-align: left; vertical-align: top; }
      `}</style>

      {/* Top action bar */}
      <div className="no-print" style={S.topBar}>
        <a href="https://knfcs.com" style={S.back}>Back to KNFC</a>
        <button onClick={() => window.print()} style={S.printBtn}>Download / Print</button>
      </div>

      <div style={S.page}>
        <div className="invoice-card" style={S.card}>

          {/* ── Header: Logo + Company Info ── */}
          <div style={S.header}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img
                src="https://knfcs.com/KNFC-logo.svg"
                alt="KNFC"
                style={{ width: 60, height: 60, borderRadius: 10, objectFit: "contain", background: "#fff", padding: 4 }}
                onError={e => { e.target.style.display = "none"; }}
              />
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px", lineHeight: 1 }}>
                  KNFC Fried Chicken
                </div>
                {inv.branch_name    && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{inv.branch_name}</div>}
                {inv.branch_address && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{inv.branch_address}</div>}
                {(inv.branch_phone || inv.branch_email) && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                    {inv.branch_phone}{inv.branch_phone && inv.branch_email ? "  |  " : ""}{inv.branch_email}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Tax Invoice
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: 3, lineHeight: 1 }}>
                {inv.token_number}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
                {fmtDt(inv.created_at)}
              </div>
            </div>
          </div>

          {/* ── Bill-to / Order Details ── */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
            {/* Left: Customer */}
            <div style={{ flex: 1, padding: "14px 20px", borderRight: "1px solid #e5e7eb" }}>
              <div style={S.sectionLabel}>Customer Details</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginTop: 4 }}>{inv.customer_name}</div>
              {inv.customer_phone && <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{inv.customer_phone}</div>}
              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                {typeLabel}
              </div>
            </div>
            {/* Right: Staff */}
            <div style={{ flex: 1, padding: "14px 20px" }}>
              <div style={S.sectionLabel}>Served By</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginTop: 4 }}>
                {inv.served_by || "Staff"}
              </div>
              {inv.confirmed_at && (
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  Confirmed: {fmtDt(inv.confirmed_at)}
                </div>
              )}
              {inv.completed_at && (
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  Completed: {fmtDt(inv.completed_at)}
                </div>
              )}
            </div>
          </div>

          {/* ── Items Table ── */}
          <table>
            <thead>
              <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #d1d5db" }}>
                <th style={{ ...S.th, width: "42%" }}>Item</th>
                <th style={{ ...S.th, width: "10%", textAlign: "center" }}>Qty</th>
                <th style={{ ...S.th, width: "20%", textAlign: "right" }}>Rate</th>
                <th style={{ ...S.th, width: "28%", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{item.name}</div>
                    {item.customisations && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{item.customisations}</div>}
                    {item.note && <div style={{ fontSize: 11, color: "#aaa", fontStyle: "italic", marginTop: 1 }}>Note: {item.note}</div>}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "#444" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right", color: "#555", fontSize: 13 }}>{fmt(item.price)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#111" }}>{fmt(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Totals ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "2px solid #e5e7eb" }}>
            <table style={{ width: "auto", minWidth: 260 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 10px", color: "#666", fontSize: 13 }}>Subtotal</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "#333" }}>{fmt(inv.subtotal)}</td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td style={{ padding: "4px 10px", color: "#1d9e75", fontSize: 13 }}>Discount</td>
                    <td style={{ padding: "4px 10px", textAlign: "right", fontWeight: 600, color: "#1d9e75" }}>- {fmt(discount)}</td>
                  </tr>
                )}
                <tr style={{ borderTop: "2px solid #111" }}>
                  <td style={{ padding: "10px 10px 6px", fontWeight: 800, fontSize: 16 }}>Total</td>
                  <td style={{ padding: "10px 10px 6px", textAlign: "right", fontWeight: 900, fontSize: 18, color: "#111" }}>{fmt(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Amount in Words ── */}
          <div style={{ padding: "8px 20px 12px", background: "#fafafa", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount in Words: </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#333", fontStyle: "italic" }}>{amountInWords(total)}</span>
          </div>

          {/* ── Payment Details ── */}
          <div style={{ padding: "12px 20px", display: "flex", flexWrap: "wrap", gap: "12px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
            <PayCell label="Payment Method" value={inv.payment_method} />
            <PayCell label="Payment Status"  value={isPaid ? "Paid" : "Pending"} color={isPaid ? "#1d9e75" : "#c00"} />
            {inv.payment_serial && <PayCell label="Payment Reference No." value={inv.payment_serial} mono />}
            {inv.upi_ref        && <PayCell label="UPI Transaction Ref."   value={inv.upi_ref}        mono />}
            {inv.points_earned > 0 && <PayCell label="Loyalty Points Earned" value={"+" + inv.points_earned + " pts"} color="#e8520e" />}
          </div>

          {/* ── Taxes note ── */}
          <div style={{ padding: "8px 20px", background: "#fafafa", borderBottom: "1px solid #e5e7eb", fontSize: 11, color: "#888" }}>
            All prices are inclusive of applicable taxes. No additional charges.
          </div>

          {/* ── Support / Contact ── */}
          <div style={{ padding: "14px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
            <div style={S.sectionLabel}>Customer Support</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 24px", marginTop: 6 }}>
              <div style={{ fontSize: 12, color: "#555" }}>
                <span style={{ fontWeight: 600 }}>Email:</span> CustomerSupportKNFC@gmail.com
              </div>
              {inv.branch_phone && (
                <div style={{ fontSize: 12, color: "#555" }}>
                  <span style={{ fontWeight: 600 }}>Phone:</span> {inv.branch_phone}
                </div>
              )}
              <div style={{ fontSize: 12, color: "#555" }}>
                <span style={{ fontWeight: 600 }}>Website:</span> knfcs.com
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>
              For complaints or feedback, please contact us within 24 hours of your order.
            </div>
          </div>

          {/* ── Bottom strip ── */}
          <div style={{ padding: "10px 20px", textAlign: "center", background: "#f5f5f5", fontSize: 11, color: "#999" }}>
            Thank you for choosing KNFC Fried Chicken. We hope to see you again soon.
          </div>

        </div>
      </div>
    </>
  );
}

/* ── Helper components ── */
function PayCell({ label, value, color, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || "#111", fontFamily: mono ? "monospace" : "inherit" }}>{value || "—"}</div>
    </div>
  );
}

/* ── Styles ── */
const S = {
  center:   { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#e8e8e8" },
  spinner:  { width: 36, height: 36, borderRadius: "50%", border: "3px solid #eee", borderTopColor: "#C85A1A", animation: "spin .8s linear infinite" },
  topBar:   { position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  back:     { color: "#555", fontSize: 13, textDecoration: "none", fontWeight: 500 },
  printBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 8, background: "#C85A1A", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit" },
  page:     { minHeight: "100vh", background: "#e8e8e8", padding: "20px 12px 48px", display: "flex", justifyContent: "center" },
  card:     { width: "100%", maxWidth: 720, background: "#fff", borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", fontFamily: "'Inter', Arial, sans-serif" },
  header:   { background: "linear-gradient(135deg, #C85A1A 0%, #8B3510 100%)", padding: "24px 24px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  sectionLabel: { fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#aaa" },
  th:       { fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#777", borderBottom: "2px solid #d1d5db" },
};
