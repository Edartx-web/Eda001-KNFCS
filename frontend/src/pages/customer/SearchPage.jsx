/**
 * SearchPage.jsx — Phase 4B
 * Route: /menu/search?q=
 *
 * Features:
 *  - Live debounced search (300ms) hitting /menu/search/
 *  - Category filter pills from results
 *  - Diet filter (all / veg / non-veg)
 *  - Grid + list view
 *  - "No results" → similar items from featured
 *  - Deep-link: /menu/search?q=chicken pre-fills input
 *  - Keyboard shortcut: / to focus anywhere on /menu routes
 */
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import AppLayout from "../../components/layout/AppLayout";
import KNCLoader, { usePageLoader } from "../../components/common/KNCLoader";
import { searchItems, getCategories, getFeatured } from "../../api/menu";
import { formatPrice } from "../../utils/format";
import { DIETARY_DOT } from "../../utils/constants";
import useCartStore from "../../store/cartStore";

/* ─── Icons ──────────────────────────────────────────────────────────── */
const Ic = {
  Search: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>,
  Clear:  () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Arrow:  () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round"/></svg>,
  Star:   () => <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Clock:  () => <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15" strokeLinecap="round"/></svg>,
  Check:  () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>,
  Fire:   () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>,
};

/* ─── Product card ───────────────────────────────────────────────────── */
function SearchCard({ item, navigate, highlight }) {
  const addItem   = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const updateQty = useCartStore(s => s.updateQuantity);
  const btnRef    = useRef(null);
  const [imgErr, setImgErr]   = useState(false);
  const [added,  setAdded]    = useState(false);

  const inCart  = cartItems.find(i => i.id === item.id);
  const isOOS   = item.stock_status === "out" || !item.is_available;
  const dietary = DIETARY_DOT[item.dietary_type] || DIETARY_DOT.non_veg;
  const price   = item.discounted_price && Number(item.discounted_price) < Number(item.price)
    ? item.discounted_price : (item.offer_price || item.price);

  const handleAdd = e => {
    e.stopPropagation();
    if (isOOS) return;
    addItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1300);
    if (btnRef.current && typeof gsap !== "undefined") {
      gsap.timeline()
        .to(btnRef.current, { scale:.75, duration:.08 })
        .to(btnRef.current, { scale:1.2, duration:.14, ease:"back.out(3)" })
        .to(btnRef.current, { scale:1, duration:.1 });
    }
  };

  /* Highlight matching text */
  const hl = (text) => {
    if (!highlight || !text) return text;
    const re = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(re);
    return parts.map((p, i) =>
      re.test(p) ? <mark key={i} style={{ background:"rgba(232,82,26,.2)", color:"var(--brand)", borderRadius:"2px", padding:"0 1px" }}>{p}</mark> : p
    );
  };

  return (
    <article
      onClick={() => !isOOS && navigate(`/menu/product/${item.slug}`)}
      style={{ display:"flex", gap:"0", background:"var(--bgc)", border:"1px solid var(--bd)", borderRadius:"var(--r4)", overflow:"hidden", cursor:isOOS?"default":"pointer", opacity:isOOS?.5:1, transition:"box-shadow var(--d1) var(--ease), border-color var(--d1) var(--ease)" }}
      onMouseEnter={e => { if(!isOOS){e.currentTarget.style.boxShadow="var(--sh-md)";e.currentTarget.style.borderColor="var(--bd2)"; }}}
      onMouseLeave={e => {e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="var(--bd)";}}>

      {/* Image */}
      <div style={{ width:"110px", minWidth:"110px", position:"relative", background:item.image_url&&!imgErr?"var(--bg3)":`linear-gradient(135deg,${item.gradient_from||"#1A0800"},${item.gradient_to||"#2D1200"})`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        {item.image_url && !imgErr
          ? <img loading="lazy" src={item.image_url} alt={item.name} onError={() => setImgErr(true)} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
          : <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"><path d="M24 6C13 6 7 15 7 24s6 18 17 18c5 0 9-2 11-5 4-2 6-5 6-8 0-8-8-14-17-14v-9z" strokeLinejoin="round"/><path d="M24 16c5 0 9 4 9 8" strokeLinecap="round"/></svg>
        }
        <div title={dietary.label} style={{ position:"absolute", top:"7px", left:"7px", width:"8px", height:"8px", borderRadius:"50%", background:dietary.color, border:"1.5px solid rgba(255,255,255,.6)" }}/>
        {(item.is_bestseller || item.is_featured) && (
          <div style={{ position:"absolute", bottom:"5px", left:"5px", background:"var(--brand)", color:"#fff", fontSize:".5rem", fontWeight:800, padding:"2px 6px", borderRadius:"var(--rf)", display:"flex", alignItems:"center", gap:"3px" }}>
            <Ic.Fire/> Best
          </div>
        )}
        {isOOS && <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:".5625rem", fontWeight:800, color:"rgba(255,255,255,.8)", letterSpacing:".08em" }}>SOLD OUT</span></div>}
      </div>

      {/* Body */}
      <div style={{ flex:1, padding:"var(--s3) var(--s4) var(--s3) var(--s3)", display:"flex", flexDirection:"column", justifyContent:"space-between", minWidth:0 }}>
        <div>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"var(--s2)", marginBottom:"3px" }}>
            <div style={{ fontWeight:700, fontSize:".9375rem", color:"var(--t1)", lineHeight:1.3 }}>{hl(item.name)}</div>
            {item.category_name && (
              <span style={{ fontSize:".625rem", fontWeight:700, padding:"2px 6px", borderRadius:"var(--rf)", background:"var(--bg2)", color:"var(--t2)", border:"1px solid var(--bd)", flexShrink:0, textTransform:"uppercase", letterSpacing:".06em" }}>
                {item.category_name}
              </span>
            )}
          </div>
          {item.description && (
            <p style={{ fontSize:".8125rem", color:"var(--t2)", lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", marginBottom:"5px" }}>
              {hl(item.description)}
            </p>
          )}
          {item.avg_rating > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:"4px", color:"var(--gold)" }}>
              <Ic.Star/>
              <span style={{ fontSize:".75rem", color:"var(--t2)", fontWeight:500 }}>{Number(item.avg_rating).toFixed(1)}</span>
              <span style={{ color:"var(--bd2)" }}>·</span>
              <span style={{ color:"var(--t4)" }}><Ic.Clock/></span>
              <span style={{ fontSize:".75rem", color:"var(--t2)" }}>{item.prep_time_display || "8–15 min"}</span>
            </div>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"var(--s2)" }}>
          <div>
            <span className="price" style={{ fontSize:"1.0625rem" }}>{formatPrice(price)}</span>
            {price !== item.price && <span style={{ fontSize:".8125rem", color:"var(--t4)", textDecoration:"line-through", marginLeft:"5px" }}>{formatPrice(item.price)}</span>}
          </div>
          {!isOOS && (
            inCart
              ? <div style={{ display:"flex", alignItems:"center", gap:"5px" }} onClick={e => e.stopPropagation()}>
                  <button onClick={e => { e.stopPropagation(); updateQty(inCart._key, inCart.quantity-1); }}
                    style={{ width:"28px", height:"28px", borderRadius:"var(--r2)", background:"var(--bg2)", border:"1px solid var(--bd)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", fontWeight:700 }}>−</button>
                  <span style={{ fontWeight:800, minWidth:"18px", textAlign:"center", fontFamily:"var(--ff-d)" }}>{inCart.quantity}</span>
                  <button ref={btnRef} onClick={e => { e.stopPropagation(); updateQty(inCart._key, inCart.quantity+1); }}
                    style={{ width:"28px", height:"28px", borderRadius:"var(--r2)", background:"var(--brand)", border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", fontWeight:700 }}>+</button>
                </div>
              : <button ref={btnRef} onClick={handleAdd}
                  style={{ padding:"8px 18px", borderRadius:"var(--r3)", background:added?"var(--ok)":"var(--brand)", border:"none", color:"#fff", fontSize:".875rem", fontWeight:700, cursor:"pointer", fontFamily:"var(--ff-b)", boxShadow:added?"0 4px 12px rgba(29,158,117,.4)":"0 3px 10px rgba(232,82,26,.3)", transition:"background .25s, box-shadow .25s", display:"flex", alignItems:"center", gap:"5px" }}>
                  {added ? <><Ic.Check/> Added</> : "Add +"}
                </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── Recent searches (localStorage) ───────────────────────────────── */
const STORAGE_KEY = "knfc_recent_searches";
function getRecent() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function addRecent(q) {
  if (!q?.trim()) return;
  const list = [q, ...getRecent().filter(x => x !== q)].slice(0, 8);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

/* ─── Main page ─────────────────────────────────────────────────────── */
export default function SearchPage() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const inputRef        = useRef(null);
  const resultsRef      = useRef(null);
  const debounceRef     = useRef(null);
  const cartCount  = useCartStore(s => s.items.reduce((a,i) => a+i.quantity, 0));
  const cartTotal  = useCartStore(s => s.items.reduce((a,i) => a+i.lineTotal, 0));

  const [query,      setQuery]      = useState(searchParams.get("q") || "");
  const [results,    setResults]    = useState([]);
  const [offers,     setOffers]     = useState([]);
  const [suggested,  setSuggested]  = useState([]); // featured when no query
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [catFilter,  setCatFilter]  = useState("all");
  const [dietFilter, setDietFilter] = useState("all");
  const [recent,     setRecent]     = useState(getRecent());

  const doSearch = useCallback(async (q) => {
    if (!q?.trim()) { setResults([]); setOffers([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try {
      const res = await searchItems(q.trim());
      const items = res.data.results || [];
      setResults(items);
      setOffers(res.data.offers || []);
      if (resultsRef.current && typeof gsap !== "undefined" && items.length > 0) {
        gsap.fromTo(resultsRef.current.querySelectorAll("article"),
          { y:12, opacity:0 },
          { y:0, opacity:1, stagger:.04, duration:.32, ease:"power2.out" }
        );
      }
    } catch { setResults([]); setOffers([]); }
    finally { setLoading(false); }
  }, []);

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Load categories + featured for empty state
  useEffect(() => {
    getCategories().then(r => setCategories(r.data.categories || [])).catch(() => {});
    getFeatured().then(r => setSuggested(r.data.featured?.slice(0, 8) || [])).catch(() => {});
  }, []);

  /* Re-run search whenever the URL ?q= param changes — this fires when
     Header navigates to /menu/search?q=xxx even if page is already mounted */
  const qParam = searchParams.get("q") || "";
  useEffect(() => {
    if (qParam) {
      setQuery(qParam);
      doSearch(qParam);
    } else {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [qParam, doSearch]);

  const handleInput = e => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    if (!v.trim()) { setResults([]); setSearched(false); return; }
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (query.trim()) { addRecent(query.trim()); doSearch(query.trim()); }
  };

  const handleRecentClick = q => {
    setQuery(q);
    addRecent(q);
    doSearch(q);
  };

  const handleClear = () => {
    setQuery(""); setResults([]); setOffers([]); setSearched(false);
    inputRef.current?.focus();
  };

  // Filter results
  const visibleResults = results.filter(item => {
  const catOk  = catFilter === "all" || item.category_slug === catFilter || item.category_name === catFilter;
    const dietOk = dietFilter === "all" || item.dietary_type === dietFilter || (dietFilter === "veg" && (item.dietary_type === "veg" || item.dietary_type === "vegan"));
    return catOk && dietOk;
  });

  // Category pills from results
  const resultCats = [...new Set(results.filter(i => i.category_name).map(i => ({ name:i.category_name, slug:i.category_slug })).map(c => JSON.stringify(c)))].map(s => JSON.parse(s));

  const DIET_OPTIONS = [
    { key:"all",     label:"All" },
    { key:"veg",     label:"Veg" },
    { key:"non_veg", label:"Non-veg" },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth:"760px", margin:"0 auto" }}>

        {/* ── Search bar ────────────────────────────────────────── */}
        <div style={{ position:"sticky", top:"var(--nav-h)", zIndex:20, padding:"var(--s3) 0 var(--s4)", background:"var(--bg)", marginLeft:"calc(-1 * var(--s4))", marginRight:"calc(-1 * var(--s4))", paddingLeft:"var(--s4)", paddingRight:"var(--s4)" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display:"flex", alignItems:"center", gap:"var(--s2)", background:"var(--bgc)", border:"1.5px solid var(--bd)", borderRadius:"var(--rf)", padding:"0 var(--s4)", boxShadow:"var(--sh-sm)", transition:"border-color var(--d1) var(--ease), box-shadow var(--d1) var(--ease)" }}
              onFocusCapture={e => { e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.boxShadow="0 0 0 3px var(--brand-tint)"; }}
              onBlurCapture={e  => { e.currentTarget.style.borderColor="var(--bd)";    e.currentTarget.style.boxShadow="var(--sh-sm)"; }}>
              <span style={{ color:"var(--t2)", flexShrink:0, display:"flex" }}><Ic.Search/></span>
              <input
                ref={inputRef}
                value={query}
                onChange={handleInput}
                placeholder="Search for chicken, burgers, drinks…"
                style={{ flex:1, border:"none", background:"transparent", color:"var(--t1)", fontSize:"1rem", outline:"none", padding:"14px 0", fontFamily:"var(--ff-b)" }}
              />
              {loading && (
                <div style={{ width:"16px", height:"16px", borderRadius:"50%", border:"2px solid var(--brand)", borderTopColor:"transparent", animation:"spin .7s linear infinite", flexShrink:0 }}/>
              )}
              {query && !loading && (
                <button type="button" onClick={handleClear}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t2)", display:"flex", padding:"4px", flexShrink:0, borderRadius:"var(--r2)" }}>
                  <Ic.Clear/>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── EMPTY STATE — no query ────────────────────────────── */}
        {!query && !searched && (
          <div>
            {/* Recent searches */}
            {recent.length > 0 && (
              <section style={{ marginBottom:"var(--s6)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"var(--s3)" }}>
                  <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:700 }}>Recent searches</h2>
                  <button onClick={() => { localStorage.removeItem(STORAGE_KEY); setRecent([]); }}
                    style={{ fontSize:".8125rem", color:"var(--brand)", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>Clear</button>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"var(--s2)" }}>
                  {recent.map(q => (
                    <button key={q} onClick={() => handleRecentClick(q)}
                      style={{ padding:"7px 14px", borderRadius:"var(--rf)", border:"1px solid var(--bd)", background:"var(--bg2)", color:"var(--t2)", fontSize:".875rem", cursor:"pointer", fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)", display:"flex", alignItems:"center", gap:"6px" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor="var(--brand)"; e.currentTarget.style.color="var(--brand)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor="var(--bd)"; e.currentTarget.style.color="var(--t2)"; }}>
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="15 13 12 12 12 8" strokeLinecap="round"/></svg>
                      {q}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Browse categories */}
            {categories.length > 0 && (
              <section style={{ marginBottom:"var(--s6)" }}>
                <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:700, marginBottom:"var(--s3)" }}>Browse categories</h2>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:"var(--s2)" }}>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => navigate(`/menu/category/${cat.slug}`)}
                      style={{ padding:"var(--s3)", borderRadius:"var(--r4)", border:"1px solid var(--bd)", background:"var(--bg2)", cursor:"pointer", textAlign:"center", transition:"all var(--d1) var(--ease)" }}
                      onMouseEnter={e => { e.currentTarget.style.background="var(--brand-tint)"; e.currentTarget.style.borderColor="var(--brand)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background="var(--bg2)"; e.currentTarget.style.borderColor="var(--bd)"; }}>
                      <div style={{ fontSize:"1.5rem", marginBottom:"4px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {cat.emoji || <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M3 12h18M8 18h8"/><circle cx="12" cy="6" r="2" fill="currentColor" fillOpacity=".15"/></svg>}
                      </div>
                      <div style={{ fontSize:".8125rem", fontWeight:600, color:"var(--t1)" }}>{cat.name}</div>
                      <div style={{ fontSize:".6875rem", color:"var(--t2)", marginTop:"2px" }}>{cat.available_count || cat.item_count || 0} items</div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Popular suggestions */}
            {suggested.length > 0 && (
              <section>
                <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1rem", fontWeight:700, marginBottom:"var(--s3)", display:"flex", alignItems:"center", gap:"var(--s2)" }}>
                  <span style={{ color:"var(--brand)" }}><Ic.Fire/></span> Popular picks
                </h2>
                <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                  {suggested.map(item => (
                    <SearchCard key={item.id} item={item} navigate={navigate} highlight=""/>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── RESULTS ──────────────────────────────────────────── */}
        {searched && (
          <div>
            {/* Filter row */}
            {results.length > 0 && (
              <div style={{ display:"flex", gap:"var(--s2)", flexWrap:"wrap", marginBottom:"var(--s4)", alignItems:"center" }}>
                {/* Category pills */}
                {resultCats.length > 1 && (
                  <div style={{ display:"flex", gap:"var(--s1)", background:"var(--bg2)", borderRadius:"var(--rf)", padding:"3px", border:"1px solid var(--bd)" }}>
                    <button onClick={() => setCatFilter("all")}
                      style={{ padding:"5px 12px", borderRadius:"var(--rf)", border:"none", background:catFilter==="all"?"var(--bgc)":"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:catFilter==="all"?700:400, fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)", boxShadow:catFilter==="all"?"var(--sh-xs)":"none" }}>
                      All
                    </button>
                    {resultCats.map(c => (
                      <button key={c.slug || c.name} onClick={() => setCatFilter(c.slug || c.name)}
                        style={{ padding:"5px 12px", borderRadius:"var(--rf)", border:"none", background:catFilter===(c.slug||c.name)?"var(--bgc)":"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:catFilter===(c.slug||c.name)?700:400, fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)", boxShadow:catFilter===(c.slug||c.name)?"var(--sh-xs)":"none" }}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                {/* Diet filter */}
                <div style={{ display:"flex", gap:"var(--s1)", background:"var(--bg2)", borderRadius:"var(--rf)", padding:"3px", border:"1px solid var(--bd)" }}>
                  {DIET_OPTIONS.map(d => (
                    <button key={d.key} onClick={() => setDietFilter(d.key)}
                      style={{ padding:"5px 12px", borderRadius:"var(--rf)", border:"none", background:dietFilter===d.key?"var(--bgc)":"transparent", cursor:"pointer", fontSize:".8125rem", fontWeight:dietFilter===d.key?700:400, fontFamily:"var(--ff-b)", transition:"all var(--d1) var(--ease)", boxShadow:dietFilter===d.key?"var(--sh-xs)":"none" }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Result count */}
            {results.length > 0 && (
              <div style={{ fontSize:".8125rem", color:"var(--t2)", marginBottom:"var(--s4)", display:"flex", alignItems:"center", gap:"var(--s2)" }}>
                <span style={{ fontWeight:700, color:"var(--t1)" }}>{visibleResults.length}</span> result{visibleResults.length !== 1 ? "s" : ""} for
                <span style={{ fontWeight:700, color:"var(--brand)" }}>"{query}"</span>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                {[1,2,3,4].map(i => <div key={i} className="skel" style={{ height:"100px", borderRadius:"var(--r4)" }}/>)}
              </div>
            )}

            {/* No results */}
            {!loading && results.length === 0 && offers.length === 0 && (
              <div style={{ textAlign:"center", padding:"var(--s12) var(--s4)", background:"var(--bg2)", borderRadius:"var(--r5)", border:"1px dashed var(--bd)" }}>
                <div style={{ fontSize:"3rem", marginBottom:"var(--s4)" }}>🔍</div>
                <h2 style={{ fontFamily:"var(--ff-d)", fontSize:"1.375rem", fontWeight:800, marginBottom:"var(--s2)" }}>Nothing found</h2>
                <p style={{ color:"var(--t2)", marginBottom:"var(--s5)" }}>
                  No results for "{query}". Try a different keyword.
                </p>
                <button onClick={handleClear} className="btn btn-p">Clear search</button>

                {/* Suggested alternatives */}
                {suggested.length > 0 && (
                  <div style={{ marginTop:"var(--s8)", textAlign:"left" }}>
                    <div style={{ fontFamily:"var(--ff-d)", fontWeight:700, marginBottom:"var(--s3)", textAlign:"center", fontSize:".9375rem", color:"var(--t2)" }}>
                      You might like instead
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                      {suggested.slice(0,4).map(item => (
                        <SearchCard key={item.id} item={item} navigate={navigate} highlight=""/>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Offers results */}
            {!loading && offers.length > 0 && (
              <div style={{ marginBottom:"var(--s5)" }}>
                <div style={{ fontFamily:"var(--ff-d)", fontWeight:700, fontSize:".875rem", color:"var(--t2)", letterSpacing:".04em", textTransform:"uppercase", marginBottom:"var(--s3)" }}>
                  Offers
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                  {offers.map(offer => (
                    <div key={offer.id}
                      onClick={() => navigate("/offers")}
                      style={{ display:"flex", alignItems:"center", gap:"var(--s3)", padding:"var(--s3) var(--s4)", background:"var(--bgc)", border:`1px solid ${offer.accent_color}33`, borderLeft:`4px solid ${offer.accent_color}`, borderRadius:"var(--r4)", cursor:"pointer", transition:"box-shadow var(--d1) var(--ease)" }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow="var(--sh-md)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
                      <span style={{ fontSize:"1.5rem", flexShrink:0 }}>{offer.emoji}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:".9375rem", color:"var(--t1)" }}>{offer.name}</div>
                        {offer.tagline && <div style={{ fontSize:".8125rem", color:"var(--t2)", marginTop:"2px" }}>{offer.tagline}</div>}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        {offer.discount_percentage
                          ? <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:"1rem", color:offer.accent_color }}>{offer.discount_percentage}% OFF</span>
                          : offer.discount_flat
                          ? <span style={{ fontFamily:"var(--ff-d)", fontWeight:800, fontSize:"1rem", color:offer.accent_color }}>₹{offer.discount_flat} OFF</span>
                          : null}
                        {offer.coupon_code && <div style={{ fontSize:".6875rem", fontFamily:"monospace", fontWeight:700, color:"var(--t4)", marginTop:"2px" }}>{offer.coupon_code}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results list */}
            {!loading && visibleResults.length > 0 && (
              <div ref={resultsRef} style={{ display:"flex", flexDirection:"column", gap:"var(--s2)" }}>
                {visibleResults.map(item => (
                  <SearchCard key={item.id} item={item} navigate={navigate} highlight={query}/>
                ))}
              </div>
            )}

            {/* Filtered-to-zero within filtered set */}
            {!loading && results.length > 0 && visibleResults.length === 0 && (
              <div style={{ textAlign:"center", padding:"var(--s8)", color:"var(--t2)" }}>
                No results in this filter. <button onClick={() => { setCatFilter("all"); setDietFilter("all"); }} style={{ color:"var(--brand)", fontWeight:700, background:"none", border:"none", cursor:"pointer" }}>Clear filters</button>
              </div>
            )}
          </div>
        )}

        {/* Cart FAB */}
        {cartCount > 0 && (
          <button className="cart-fab-btn" onClick={() => navigate("/cart")} style={{ background:"var(--brand)", color:"#fff" }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            {cartCount} · {formatPrice(cartTotal)} <Ic.Arrow/>
          </button>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  );
}
