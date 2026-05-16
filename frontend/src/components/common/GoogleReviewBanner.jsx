import React from "react";

const REVIEW_URL = "https://g.page/r/CUzjX40lu8vLEBM/review";

export default function GoogleReviewBanner({ style }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      gap:"var(--s4)", padding:"var(--s4) var(--s5)",
      background:"var(--bgc)", border:"1px solid var(--bd2)",
      borderRadius:"var(--r4)", flexWrap:"wrap",
      ...style,
    }}>
      {/* Left: Google G + text */}
      <div style={{ display:"flex", alignItems:"center", gap:"var(--s3)" }}>
        {/* Google "G" coloured SVG */}
        <svg width="32" height="32" viewBox="0 0 48 48" style={{ flexShrink:0 }}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>

        <div>
          <div style={{ fontWeight:700, fontSize:".9375rem", color:"var(--t1)", lineHeight:1.3 }}>
            Loved your meal?
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            ))}
            <span style={{ fontSize:".75rem", color:"var(--t2)", marginLeft:3 }}>Leave a Google review</span>
          </div>
        </div>
      </div>

      {/* Right: CTA */}
      <a
        href={REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display:"inline-flex", alignItems:"center", gap:6,
          background:"var(--brand)", color:"#fff",
          fontWeight:700, fontSize:".875rem",
          padding:"9px 18px", borderRadius:"var(--rf)",
          textDecoration:"none", whiteSpace:"nowrap", flexShrink:0,
        }}
        onMouseEnter={e => e.currentTarget.style.opacity=".88"}
        onMouseLeave={e => e.currentTarget.style.opacity="1"}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
        Review us
      </a>
    </div>
  );
}
