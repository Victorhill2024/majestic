// The storefront's chrome on a phone, from "Majestic Roobee Mobile.dc.html".
//
// A desktop header is two tiers of labelled destinations and a category rail
// that opens on hover. None of that survives a 390px screen with no pointer, so
// the phone gets the shape every shopping app has settled on: a slim header
// (menu or back, the logo, search, account), a row of the three things that
// change what the shop shows you — city, currency, the Perfume Studio — and a
// tab bar under the thumb for the five places a shopper actually goes: home,
// the shop, deals, what they saved, and their cart.
//
// Everything a desktop reaches through a hover menu — categories, search, the
// store picker, choosing a size — slides up in a sheet instead.
import React, { useEffect, useState } from "react";
import { catTree, countIn } from "../lib/categories.js";
import { ImageSlot } from "../ds/components.jsx";
import { AnnouncementBar, ConsentBanner, LeaveNudge, PurchaseProof, ChatWidget } from "./chrome.jsx";
import { I, BtnM, Sheet, Radio, Stepper, FreeShipBar, chipTone, eyebrowM, fieldM } from "./mobile-ui.jsx";

const LOGO = { dark: "/logo.png", light: "/logo-light.png" };

// The pages a tab leads to. On these the header keeps its menu button; one
// level down it becomes a back arrow.
const ROOT_PAGES = ["home", "categories", "cart", "wishlist", "account"];

// Where the floating location and chat buttons appear: the browsing pages. A
// product page, the cart and checkout have their own jobs (and their own
// "Change" link for the city).
const BROWSE_PAGES = ["home", "categories", "shop", "wishlist"];

// The tab bar steps aside for the pages that pin their own action to the
// bottom of the screen — "Add to cart" on a product, "Pay" at checkout.
const NO_TABS = ["product", "checkout"];

const SHELVES = [
  { label: "New arrivals", fSeg: "new-arrivals" },
  { label: "Deals", fSeg: "deals", hot: true },
  { label: "Best sellers", fSeg: "best-sellers" },
  { label: "Gift sets", fSeg: "gift-sets" },
];

/** Into the shop grid from anywhere on a phone, with nothing left over from before. */
export function goShop(ctx, extra = {}) {
  ctx.setSearch("");
  ctx.nav("shop", { fCat: "all", fCol: null, fSeg: null, fBrand: "", ...extra });
}

const hot = (style) => (
  <span style={{ background: "var(--mr-orchid-600)", color: "#fff", fontFamily: "var(--font-sans)", fontSize: 8.5, fontWeight: 600, letterSpacing: "0.08em", padding: "2px 5px", borderRadius: "var(--radius-xs)", ...style }}>HOT</span>
);

const iconBtn = { width: 44, height: 44, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mr-purple-900)", padding: 0, flex: "none" };

function Logo({ ctx, height, tone = "dark", max = "46vw" }) {
  const s = ctx.settings;
  const src = (tone === "light" ? s.logoLightUrl : s.logoUrl) || LOGO[tone];
  return <img src={src} alt="Majestic Roobee" style={{ height, width: "auto", display: "block", maxWidth: max, objectFit: "contain", objectPosition: "left center" }} />;
}

// The header carries everything that changes how the whole shop reads — search,
// the currency, the Perfume Studio and the account — so the page under it can
// start with the shop itself. The delivery city used to sit here too, as a row
// of chips on every page; it is asked once a visit now (the welcome sheet) and
// lives on a floating button after that.
function MobileHeader({ ctx }) {
  const back = ctx.canGoBack && !ROOT_PAGES.includes(ctx.page);
  const initial = ctx.cust ? (ctx.cust.name || ctx.cust.email || "?").trim().charAt(0).toUpperCase() : "";
  const consult = ctx.consultation || {};
  const usd = ctx.currency === "USD";
  const switchCurrency = () => {
    ctx.toggleCurrency();
    ctx.flash(usd ? "Prices now in Naira (₦)" : "Prices now in US Dollars ($)");
  };
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100, height: "var(--mr-head-h)", display: "flex", alignItems: "center", gap: 2, padding: "0 6px 0 4px", background: "rgba(250,246,241,0.95)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid var(--border-hairline)" }}>
      {back
        ? <button onClick={ctx.goBack} aria-label="Back" style={iconBtn}>{I.back()}</button>
        : <button onClick={() => ctx.setSheet({ kind: "menu" })} aria-label="Menu" style={iconBtn}>{I.menu()}</button>}
      <a href="/" onClick={(e) => { e.preventDefault(); ctx.nav("home"); }} aria-label="Majestic Roobee — home" style={{ display: "flex", alignItems: "center", padding: "0 2px", minWidth: 0 }}>
        <Logo ctx={ctx} height={30} max="32vw" />
      </a>
      <div style={{ flex: 1 }} />
      <button onClick={() => ctx.setSheet({ kind: "search" })} aria-label="Search" style={{ ...iconBtn, width: 40 }}>{I.search()}</button>
      <button onClick={switchCurrency} aria-label={`Prices in ${usd ? "US Dollars" : "Naira"}. Switch currency.`} title="Switch currency"
        style={{ flex: "none", height: 30, minWidth: 30, padding: "0 9px", margin: "0 3px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-strong)", background: "var(--surface-card)", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--mr-purple-900)", cursor: "pointer", whiteSpace: "nowrap" }}>
        {usd ? "$ USD" : "₦ NGN"}
      </button>
      {consult.on && (
        <button onClick={() => ctx.nav("consultation")} aria-label={consult.ctaLabel || "Book a consultation"}
          style={{ flex: "none", height: 30, display: "flex", alignItems: "center", gap: 5, padding: "0 10px", margin: "0 3px", borderRadius: "var(--radius-pill)", border: "none", background: "var(--accent-gold)", fontFamily: "var(--font-condensed)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--mr-purple-950)", cursor: "pointer" }}>
          {I.cal(12)}Book
        </button>
      )}
      <button onClick={() => ctx.nav("account")} aria-label="Your account" style={{ ...iconBtn, width: 40 }}>
        {ctx.cust
          ? <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--mr-purple-900)", color: "var(--mr-cream)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 13 }}>{initial}</span>
          : I.user()}
      </button>
    </header>
  );
}

const pill = { flex: "none", height: 34, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", background: "var(--surface-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--mr-purple-800)", cursor: "pointer", whiteSpace: "nowrap" };

// The shopping location, floating above the chat button on the browsing pages.
// It says the city for a moment when a page opens — so a shopper always knows
// whose shelf they are looking at — then folds back to the pin.
function LocationFab({ ctx }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
    const t = setTimeout(() => setOpen(false), 3200);
    return () => clearTimeout(t);
  }, [ctx.page, ctx.city]);
  return (
    <button onClick={() => ctx.setSheet({ kind: "city" })} aria-label={`Shopping in ${ctx.cityName}. Change location.`}
      style={{ position: "fixed", right: 18, bottom: "calc(var(--mr-tabs-h) + var(--mr-bar-h) + 78px)", zIndex: 130, height: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: open ? "0 14px 0 12px" : 0, borderRadius: "var(--radius-pill)", border: "1px solid var(--border-hairline)", background: "rgba(255,255,255,0.97)", color: "var(--mr-purple-900)", boxShadow: "var(--shadow-md)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", transition: "padding 220ms var(--ease-standard, ease)" }}>
      {I.pin(18)}
      {open && <span>{ctx.cityName}</span>}
    </button>
  );
}

function BottomTabs({ ctx }) {
  const cartCount = ctx.cart.reduce((n, c) => n + c.qty, 0);
  const deals = ctx.page === "shop" && ctx.fSeg === "deals";
  const tabs = [
    { label: "Home", icon: I.home(), on: ctx.page === "home", go: () => ctx.nav("home") },
    { label: "Shop", icon: I.grid(), on: ctx.page === "categories" || (ctx.page === "shop" && !deals), go: () => ctx.nav("categories") },
    { label: "Deals", icon: I.tag(), on: deals, go: () => goShop(ctx, { fSeg: "deals" }), hot: true },
    { label: "Saved", icon: I.heart(22), on: ctx.page === "wishlist", go: () => ctx.nav("wishlist"), badge: ctx.wishlist.length || null, quiet: true },
    { label: "Cart", icon: I.bag(), on: ctx.page === "cart", go: () => ctx.nav("cart"), badge: cartCount || null },
  ];
  return (
    <nav aria-label="Shop" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 121, height: "var(--mr-tabs-h)", boxSizing: "border-box", padding: "6px 4px env(safe-area-inset-bottom)", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", background: "rgba(255,255,255,0.97)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: "1px solid var(--border-hairline)" }}>
      {tabs.map((t) => (
        <button key={t.label} onClick={t.go} aria-current={t.on ? "page" : undefined}
          style={{ position: "relative", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: t.on ? "var(--mr-purple-900)" : "var(--mr-mute)", fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 500, padding: 0 }}>
          {t.icon}{t.label}
          {t.hot && hot({ position: "absolute", top: 0, left: "50%", marginLeft: 6, fontSize: 8, padding: "1px 4px" })}
          {t.badge && (
            <span style={{ position: "absolute", top: 0, left: "50%", marginLeft: 4, background: t.quiet ? "var(--mr-lavender-300)" : "var(--accent-gold)", color: "var(--mr-purple-950)", fontSize: 10, fontWeight: 600, minWidth: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{t.badge}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

function ChatFab({ ctx }) {
  return (
    <button onClick={() => ctx.setSheet({ kind: "chat" })} aria-label="Chat with us"
      style={{ position: "fixed", right: 14, bottom: "calc(var(--mr-tabs-h) + var(--mr-bar-h) + 14px)", zIndex: 130, width: 52, height: 52, borderRadius: "50%", border: "none", background: "var(--mr-purple-900)", color: "var(--mr-cream)", boxShadow: "var(--shadow-md)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
      {I.chat(22)}
    </button>
  );
}

function NoteToast({ ctx }) {
  if (!ctx.note) return null;
  return (
    <div role="status" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(var(--mr-tabs-h) + var(--mr-bar-h) + 18px)", zIndex: 200, background: "var(--mr-purple-950)", color: "var(--mr-cream)", borderRadius: "var(--radius-pill)", padding: "10px 18px", fontSize: 13, whiteSpace: "nowrap", boxShadow: "var(--shadow-md)", maxWidth: "calc(100vw - 32px)", overflow: "hidden", textOverflow: "ellipsis" }}>{ctx.note}</div>
  );
}

// ---- Sheets ---------------------------------------------------------------

function MenuSheet({ ctx, close }) {
  const [openCat, setOpenCat] = useState(null);
  const cats = catTree(ctx.categories);
  const consult = ctx.consultation || {};
  const first = ctx.cust ? (ctx.cust.name || ctx.cust.email).trim().split(" ")[0] : "";
  const link = { width: "100%", height: 46, padding: "0 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--mr-purple-800)" };
  const count = (id) => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{countIn(ctx.categories, ctx.products, id)}</span>;
  return (
    <Sheet side="left" onClose={close} label="Menu">
      <div style={{ height: 56, flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px 0 16px", borderBottom: "1px solid var(--border-hairline)" }}>
        <Logo ctx={ctx} height={30} />
        <button onClick={close} aria-label="Close menu" style={iconBtn}>{I.close(20, 1.6)}</button>
      </div>
      <div className="mr-rail" style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
        <button onClick={() => ctx.nav("account")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--mr-lavender-200)", border: "none", cursor: "pointer", textAlign: "left", color: "var(--mr-purple-900)" }}>
          {I.user(22)}
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{ctx.cust ? `Hello, ${first}` : "Hello, sign in"}</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--text-body)" }}>Orders, rewards and your wishlist</span>
          </span>
          {I.chevRight(16)}
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "14px 16px 6px" }}>
          {SHELVES.map((sh) => (
            <button key={sh.fSeg} onClick={() => goShop(ctx, { fSeg: sh.fSeg })} style={{ position: "relative", height: 46, borderRadius: "var(--radius-md)", border: "1px solid var(--border-hairline)", background: "var(--surface-card)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "var(--mr-purple-900)", cursor: "pointer" }}>
              {sh.label}
              {sh.hot && hot({ position: "absolute", top: 4, right: 6, fontSize: 8, padding: "1px 4px" })}
            </button>
          ))}
        </div>
        {consult.on && (
          <div style={{ padding: "6px 16px 4px" }}>
            <BtnM variant="gold" block onClick={() => ctx.nav("consultation")}>{I.cal(14)} {consult.ctaLabel || "Book a consultation"}</BtnM>
          </div>
        )}
        <div style={{ ...eyebrowM, padding: "18px 16px 6px" }}>Categories</div>
        {cats.map((c) => (
          <div key={c.id}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => goShop(ctx, { fCat: c.id })} style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", height: 46, padding: "0 8px 0 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-strong)", textAlign: "left" }}>
                <span>{c.label}</span>{count(c.id)}
              </button>
              {c.children.length > 0
                ? (
                  <button onClick={() => setOpenCat(openCat === c.id ? null : c.id)} aria-label={`Show ${c.label} sub-categories`} aria-expanded={openCat === c.id} style={{ ...iconBtn, height: 46, color: "var(--mr-purple-800)" }}>
                    <span style={{ display: "flex", transform: openCat === c.id ? "rotate(90deg)" : "none", transition: "transform 200ms" }}>{I.chevRight(15)}</span>
                  </button>
                )
                : <span style={{ width: 44, flex: "none" }} />}
            </div>
            {openCat === c.id && (
              <div style={{ paddingBottom: 6 }}>
                {c.children.map((sc) => (
                  <button key={sc.id} onClick={() => goShop(ctx, { fCat: sc.id })} style={{ width: "100%", display: "flex", justifyContent: "space-between", height: 42, alignItems: "center", padding: "0 60px 0 32px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-body)" }}>
                    <span>{sc.label}</span>{count(sc.id)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <button onClick={() => goShop(ctx)} style={{ ...link, color: "var(--mr-orchid-600)", fontSize: 14 }}>All products</button>
        <div style={{ height: 1, background: "var(--border-hairline)", margin: "10px 16px" }} />
        {[["Our stores", "locations"], ["Our story", "about"], ["Blog", "blog"], ["Reviews", "reviews"], ["Track order", "track"], ["FAQs", "faq"], ["Contact us", "contact"]].map(([label, page]) => (
          <button key={page} onClick={() => ctx.nav(page)} style={link}>{label}</button>
        ))}
        {ctx.pages.map((pg) => (
          <button key={pg.slug} onClick={() => ctx.nav("info", { pageSlug: pg.slug })} style={{ ...link, fontSize: 13.5, color: "var(--text-body)" }}>{pg.title}</button>
        ))}
        <div style={{ height: 1, background: "var(--border-hairline)", margin: "10px 16px" }} />
        <div style={{ display: "flex", gap: 8, padding: "4px 16px" }}>
          <button onClick={() => ctx.setSheet({ kind: "city" })} style={{ ...pill, flex: 1, height: 42, justifyContent: "center", fontSize: 13 }}>{I.pin(14)}{ctx.cityName}</button>
          <button onClick={ctx.toggleCurrency} style={{ ...pill, flex: 1, height: 42, justifyContent: "center", fontSize: 13, fontWeight: 500 }}>{ctx.currency === "NGN" ? "₦ NGN" : "$ USD"}</button>
        </div>
        <a href="/admin/" style={{ display: "block", padding: "14px 16px 0", fontSize: 12.5, color: "var(--text-muted)" }}>Staff portal →</a>
      </div>
    </Sheet>
  );
}

// Recent searches live in this browser, like the wishlist does before an
// account: they are the shopper's, and a search box that remembers is faster
// with a thumb than one that makes you type "oud" again.
const RECENT_KEY = "mr-recent-q";
const readRecent = () => { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(v) ? v.slice(0, 6) : []; } catch { return []; } };

function SearchSheet({ ctx, close }) {
  const [q, setQ] = useState(ctx.search || "");
  const [recent, setRecent] = useState(readRecent);
  const term = q.trim().toLowerCase();
  // The same haystack the shop grid searches, so "see all" never finds more or
  // fewer than the preview promised.
  const results = term
    ? ctx.listings.filter((e) => {
      const p = e.product;
      const hay = (p.name + " " + p.brand + " " + p.notes + " " + e.variants.map((v) => `${v.size} ${v.sku || ""}`).join(" ")).toLowerCase();
      return hay.includes(term);
    })
    : [];
  const submit = (t) => {
    const s = String(t ?? q).trim();
    if (!s) return;
    const next = [s, ...recent.filter((x) => x.toLowerCase() !== s.toLowerCase())].slice(0, 6);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    ctx.setSearch(s);
    ctx.nav("shop", { fCat: "all", fCol: null, fSeg: null, fBrand: "" });
  };
  const chipBtn = { height: 36, padding: "0 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-hairline)", background: "var(--surface-card)", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--mr-purple-800)", cursor: "pointer" };
  const label = { fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", paddingBottom: 10 };
  const browse = catTree(ctx.categories);
  return (
    <Sheet side="full" onClose={close} label="Search">
      {/* Three ways out, because a full-screen search with one small word in
          the corner is how shoppers got stuck in it: the back arrow where every
          app puts it, "Close" on the right, and the phone's own back gesture
          (the sheet is a history entry — see App.jsx). */}
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ flex: "none", display: "flex", alignItems: "center", gap: 4, padding: "10px 6px 10px 2px", paddingTop: "calc(10px + env(safe-area-inset-top))", borderBottom: "1px solid var(--border-hairline)", background: "var(--mr-cream)" }}>
        <button type="button" onClick={close} aria-label="Close search and go back" style={iconBtn}>{I.back()}</button>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 10px 0 12px", background: "var(--surface-card)", border: "1.5px solid var(--mr-purple-900)", borderRadius: "var(--radius-md)", color: "var(--mr-mute)" }}>
          {I.search(18)}
          {/* autoFocus lands inside the tap that opened the sheet, which is the
              only focus iOS will raise the keyboard for. */}
          <input autoFocus type="search" className="mr-search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Perfumes, oils, mists, notes…" aria-label="Search the store"
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--text-strong)" }} />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search" style={{ width: 30, height: 30, flex: "none", background: "var(--surface-sunken)", borderRadius: "50%", border: "none", cursor: "pointer", color: "var(--text-body)", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{I.close(13, 2.2)}</button>}
        </div>
        <button type="button" onClick={close} style={{ flex: "none", height: 44, padding: "0 8px 0 6px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, color: "var(--mr-purple-800)" }}>Close</button>
      </form>
      <div className="mr-rail" style={{ flex: 1, overflowY: "auto", padding: "20px 20px 32px" }}>
        {!term && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {recent.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={label}>Recent</div>
                  <button onClick={() => { try { localStorage.removeItem(RECENT_KEY); } catch { /* nothing to clear */ } setRecent([]); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--text-muted)" }}>Clear</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {recent.map((t) => <button key={t} onClick={() => submit(t)} style={chipBtn}>{t}</button>)}
                </div>
              </div>
            )}
            <div>
              <div style={{ ...label, paddingBottom: 4 }}>Browse</div>
              {browse.map((c) => (
                <button key={c.id} onClick={() => goShop(ctx, { fCat: c.id })} style={{ width: "100%", height: 46, display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", borderBottom: "1px solid var(--border-hairline)", padding: 0, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-strong)" }}>
                  {c.label}<span style={{ color: "var(--mr-purple-800)", display: "flex" }}>{I.chevRight(14)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {term && results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {results.slice(0, 6).map((e) => {
              const c = ctx.card(e);
              if (!c) return null;
              const v = c.variants.find((x) => x.id === c.defaultVariantId) || c.variants[0];
              return (
                <button key={e.key} onClick={v.open} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", background: "none", border: "none", borderBottom: "1px solid var(--border-hairline)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}>
                  <span style={{ width: 52, height: 52, borderRadius: "var(--radius-sm)", overflow: "hidden", flex: "none", background: "var(--mr-lavender-200)" }}>
                    <ImageSlot src={v.imageUrl} name={c.name} sizes="52px" monoSize={18} style={{ width: "100%", height: "100%" }} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-strong)" }}>{c.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{[c.catLabel, c.sizeLabel].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mr-purple-900)", whiteSpace: "nowrap" }}>{c.priceLabel}</span>
                </button>
              );
            })}
            <div style={{ paddingTop: 14 }}>
              <BtnM block onClick={() => submit()}>See all {results.length} {results.length === 1 ? "result" : "results"}</BtnM>
            </div>
          </div>
        )}
        {term && !results.length && (
          <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text-strong)", margin: 0 }}>Nothing found for “{q.trim()}”.</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Try a note like oud or vanilla, or browse a category.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {browse.map((c) => <button key={c.id} onClick={() => goShop(ctx, { fCat: c.id })} style={{ ...chipBtn, background: "var(--mr-lavender-200)", border: "1px solid var(--border-strong)", color: "var(--mr-purple-900)" }}>{c.label}</button>)}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

// The shopping location. Opened by the floating pin, by "Change" on a product
// page or at checkout — and once a visit on its own (`welcome`), which is what
// replaced the city chips that used to sit on every page. One tap on a city is
// the whole job; the sheet closes behind it.
function CitySheet({ ctx, close }) {
  const welcome = !!(ctx.sheet && ctx.sheet.welcome);
  const pick = (id) => {
    ctx.setCityConfirmed(id);
    close();
  };
  const cur = ctx.locations.find((l) => l.id === ctx.city);
  return (
    <Sheet onClose={close} z={195} label="Shopping location">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--mr-purple-900)" }}>
          <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--mr-lavender-200)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{I.pin(19)}</span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.2, color: "var(--text-strong)" }}>{welcome ? "Where should we deliver?" : "Your shopping location"}</div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: "0 0 6px", color: "var(--text-body)" }}>
          {welcome
            ? "Choose your city to see what's in stock near you, with delivery times and fees."
            : "Prices stay the same everywhere. Your city decides what's in stock, delivery time and fee."}
        </p>
        {ctx.locations.map((l) => {
          const on = l.id === ctx.city;
          return (
            <button key={l.id} onClick={() => pick(l.id)} aria-pressed={on}
              style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 66, padding: "12px 16px", borderRadius: "var(--radius-md)", border: `1.5px solid ${on ? "var(--mr-purple-900)" : "var(--border-hairline)"}`, background: "var(--surface-card)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}>
              <Radio on={on} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "var(--text-strong)" }}>{l.city}</span>
                <span style={{ display: "block", fontSize: 12.5, lineHeight: 1.45, color: "var(--text-muted)", paddingTop: 2 }}>{l.eta ? `Delivery in ${l.eta}` : "Delivery"} · {ctx.fmt(l.shipNGN || 0)} · or collect free at {l.store}</span>
              </span>
            </button>
          );
        })}
        <div style={{ paddingTop: 6 }}>
          <BtnM size="lg" block onClick={() => (welcome && cur ? pick(cur.id) : close())}>{welcome && cur ? `Continue with ${cur.city}` : "Done"}</BtnM>
        </div>
      </div>
    </Sheet>
  );
}

// "Choose a size" — what a card with several sizes opens, so the shopper picks
// rather than the card picking for them.
function VariantSheet({ ctx, close }) {
  const s = ctx.sheet;
  const product = ctx.products.find((p) => p.id === s.productId);
  if (!product) return null;
  const variants = product.variants.filter((v) => (s.variantIds || []).includes(v.id));
  const c = ctx.card({ key: product.id, product, variants, split: false });
  if (!c) return null;
  const vc = c.variants.find((x) => x.id === s.selId) || c.variants[0];
  const v = variants.find((x) => x.id === vc.id);
  const qty = s.qty || 1;
  const set = (patch) => ctx.setSheet({ ...s, ...patch });
  return (
    <Sheet onClose={close} label={`Choose a ${c.optionName.toLowerCase()}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", overflow: "hidden", flex: "none", background: "var(--mr-lavender-200)" }}>
            <ImageSlot src={vc.imageUrl} name={c.name} sizes="64px" monoSize={18} style={{ width: "100%", height: "100%" }} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--text-strong)" }}>{c.name}</div>
            <div style={{ fontSize: 12.5, color: vc.availColor }}>{vc.availLine}</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)", paddingBottom: 8 }}>Choose a {c.optionName.toLowerCase()}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {c.variants.map((x) => <SizeButton key={x.id} v={x} on={x.id === vc.id} onClick={() => set({ selId: x.id, qty: 1 })} />)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>Quantity</span>
          <Stepper value={qty} onDec={() => set({ qty: Math.max(1, qty - 1) })} onInc={() => set({ qty: qty + 1 })} />
        </div>
        <BtnM variant="gold" size="lg" block onClick={() => (vc.soldOut ? ctx.joinWaitlist(product.id, v) : ctx.addToCart(product.id, v, qty))}>
          {vc.soldOut ? "Notify me when back" : `Add to cart · ${ctx.fmt(v.ngn * qty)}`}
        </BtnM>
        <button onClick={vc.open} style={{ alignSelf: "center", background: "none", border: "none", padding: 6, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--mr-purple-700)", cursor: "pointer" }}>View full details</button>
      </div>
    </Sheet>
  );
}

/** A size with its price under it; struck through when no store has it. */
export function SizeButton({ v, on, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={on} title={v.soldOut ? `${v.label} — out of stock` : `${v.label} — ${v.priceLabel}`}
      style={{ minWidth: 96, height: 54, padding: "0 16px", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontFamily: "var(--font-sans)", ...chipTone(on) }}>
      <span style={{ fontSize: 14, fontWeight: 600, textDecoration: v.soldOut ? "line-through" : "none" }}>{v.label}</span>
      <span style={{ fontSize: 11.5, color: on ? "var(--text-on-dark-muted)" : "var(--text-muted)" }}>{v.priceLabel}</span>
    </button>
  );
}

function AddedSheet({ ctx, close }) {
  const s = ctx.sheet;
  const p = ctx.products.find((x) => x.id === s.productId);
  const v = p && p.variants.find((x) => x.id === s.variantId);
  if (!p || !v) return null;
  const n = ctx.cart.reduce((a, c) => a + c.qty, 0);
  return (
    <Sheet onClose={close} label="Added to your cart">
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#3f6b45" }}>{I.check(18)}Added to your cart</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 60, height: 60, borderRadius: "var(--radius-sm)", overflow: "hidden", flex: "none", background: "var(--mr-lavender-200)" }}>
            <ImageSlot src={v.imageUrl || p.imageUrl} name={p.name} sizes="60px" monoSize={18} style={{ width: "100%", height: "100%" }} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--text-strong)" }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{v.size} · Qty {s.qty}</div>
          </div>
        </div>
        <FreeShipBar ctx={ctx} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <BtnM variant="secondary" size="lg" block onClick={close}>Keep shopping</BtnM>
          <BtnM size="lg" block onClick={() => ctx.nav("cart")}>View cart ({n})</BtnM>
        </div>
      </div>
    </Sheet>
  );
}

function ChatSheet({ ctx, close }) {
  const phone = ctx.settings.contactPhone || "";
  const wa = phone.replace(/[^\d]/g, "");
  const consult = ctx.consultation || {};
  const big = { height: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: "var(--radius-pill)", fontFamily: "var(--font-sans)", fontSize: 15, cursor: "pointer", textDecoration: "none" };
  return (
    <Sheet onClose={close} label="Chat with us">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 10 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 21, color: "var(--text-strong)" }}>Chat with us</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, color: "var(--text-body)" }}>Ask about a scent, an order or a gift.</p>
        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" style={{ ...big, background: "var(--mr-purple-900)", color: "var(--mr-cream)", fontWeight: 500 }}>WhatsApp {phone}</a>}
        <button onClick={() => { close(); ctx.setChat((c) => ({ ...c, open: true })); }} style={{ ...big, background: wa ? "none" : "var(--mr-purple-900)", color: wa ? "var(--mr-purple-800)" : "var(--mr-cream)", border: wa ? "1px solid var(--border-strong)" : "none" }}>{I.chat(18)} Message us here</button>
        {phone && <a href={`tel:${phone.replace(/\s+/g, "")}`} style={{ ...big, border: "1px solid var(--border-strong)", color: "var(--mr-purple-800)" }}>Call us</a>}
        {consult.on && <button onClick={() => ctx.nav("consultation")} style={{ ...big, border: "none", background: "var(--accent-gold)", color: "var(--mr-purple-950)", fontWeight: 500 }}>{consult.ctaLabel || "Book a consultation"}</button>}
        <button onClick={() => ctx.nav("track")} style={{ height: 44, background: "none", border: "none", fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--mr-purple-700)", cursor: "pointer" }}>Track an order instead</button>
      </div>
    </Sheet>
  );
}

// The first-order offer, as a sheet from the bottom rather than a box in the
// middle of a small screen.
function PromoSheet({ ctx }) {
  const content = ctx.D && ctx.D.popup ? ctx.D.popup : null;
  return (
    <Sheet onClose={ctx.closePopup} z={210} bg="var(--surface-card)" pad="0 22px" label="First-order offer">
      <div style={{ position: "relative", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 18 }}>
        <button onClick={ctx.closePopup} aria-label="Close" style={{ ...iconBtn, position: "absolute", top: -10, right: -14, color: "var(--text-muted)" }}>{I.close(18)}</button>
        <div style={eyebrowM}>First order</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 27, color: "var(--text-strong)", letterSpacing: "var(--ls-heading)", margin: 0 }}>{content ? content.title : "10% off your first order"}</h2>
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: "0 0 6px", color: "var(--text-body)" }}>{content ? content.message : "Enter your email and we'll send you the code."}</p>
        {ctx.plDone ? (
          <div style={{ width: "100%", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", padding: 16 }}>
            <div style={{ ...eyebrowM, fontSize: 12 }}>Your code</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--mr-purple-900)", marginTop: 4 }}>FIRSTTRAIL</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>We&apos;ve sent it to your inbox too.</div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); ctx.submitLead(); }} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            <input type="email" autoComplete="email" value={ctx.plEmail} onChange={(e) => ctx.setPlEmail(e.target.value)} placeholder="you@email.com" aria-label="Your email address" style={{ ...fieldM, background: "var(--mr-cream)" }} />
            <BtnM type="submit" variant="gold" size="lg" block>Get my code</BtnM>
          </form>
        )}
      </div>
    </Sheet>
  );
}

// ---- Footer ---------------------------------------------------------------

function MobileFooter({ ctx }) {
  const s = ctx.settings;
  const col = { display: "flex", flexDirection: "column", gap: 2 };
  const head = { ...eyebrowM, color: "var(--accent-gold)", paddingBottom: 6 };
  const a = { textAlign: "left", background: "none", border: "none", padding: "7px 0", fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--mr-cream)", cursor: "pointer" };
  return (
    <footer style={{ background: "var(--mr-purple-950)", color: "var(--text-on-dark-muted)", padding: "28px 20px", marginTop: 32, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ alignSelf: "flex-start" }}><Logo ctx={ctx} height={40} tone="light" /></div>
      {s.footerTagline && <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "var(--mr-cream)" }}>{s.footerTagline}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 12px" }}>
        <div style={col}>
          <div style={head}>Shop</div>
          <button style={a} onClick={() => goShop(ctx)}>All products</button>
          {SHELVES.map((sh) => <button key={sh.fSeg} style={a} onClick={() => goShop(ctx, { fSeg: sh.fSeg })}>{sh.label}</button>)}
        </div>
        <div style={col}>
          <div style={head}>Help</div>
          <button style={a} onClick={() => ctx.nav("track")}>Track order</button>
          <button style={a} onClick={() => ctx.nav("faq")}>FAQs</button>
          <button style={a} onClick={() => ctx.nav("locations")}>Our stores</button>
          <button style={a} onClick={() => ctx.nav("about")}>Our story</button>
          <button style={a} onClick={() => ctx.nav("contact")}>Contact us</button>
        </div>
      </div>
      {ctx.pages.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
          {ctx.pages.map((pg) => <button key={pg.slug} style={{ ...a, fontSize: 12.5, color: "var(--text-on-dark-muted)" }} onClick={() => ctx.nav("info", { pageSlug: pg.slug })}>{pg.title}</button>)}
        </div>
      )}
      <div style={{ height: 1, background: "var(--gold-line)" }} />
      <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
        {[s.contactPhone && `WhatsApp ${s.contactPhone}`, s.contactEmail].filter(Boolean).join(" · ")}
        {(s.contactPhone || s.contactEmail) && <br />}
        Secure payment with Paystack · © {new Date().getFullYear()} Majestic Roobee
        <br />
        {/* The published pages above already name the privacy policy when
            there is one; only link it here when they don't. */}
        {!ctx.pages.some((pg) => pg.slug === "privacy") && <>
          <a href="/privacy" onClick={(e) => { e.preventDefault(); ctx.nav("info", { pageSlug: "privacy" }); }} style={{ color: "var(--text-on-dark-muted)", textDecoration: "underline" }}>Privacy &amp; cookies</a>
          {" · "}
        </>}
        <a href="/admin/" style={{ color: "var(--text-on-dark-muted)", textDecoration: "underline" }}>Staff portal</a>
      </div>
    </footer>
  );
}

// ---- The whole thing ------------------------------------------------------

export function MobileChrome({ ctx, children }) {
  const tabs = !NO_TABS.includes(ctx.page);
  const close = () => ctx.setSheet(null);
  const kind = ctx.sheet && ctx.sheet.kind;
  // The purchase note and the chat button stay off the pages where a shopper
  // is deciding or paying — they're already doing the thing both are for.
  const quiet = ["product", "checkout", "confirm", "cart"].includes(ctx.page);
  return (
    <div style={{
      fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--mr-cream)", minHeight: "100vh",
      "--mr-head-h": "58px",
      "--mr-tabs-h": tabs ? "calc(60px + env(safe-area-inset-bottom))" : "0px",
      "--mr-bar-safe": tabs ? "0px" : "env(safe-area-inset-bottom)",
      paddingBottom: "calc(var(--mr-tabs-h) + var(--mr-bar-h))",
      overflowX: "clip",
    }}>
      <AnnouncementBar ctx={ctx} />
      <MobileHeader ctx={ctx} />
      {children}
      <MobileFooter ctx={ctx} />

      {tabs && <BottomTabs ctx={ctx} />}
      {BROWSE_PAGES.includes(ctx.page) && !ctx.chat.open && <ChatFab ctx={ctx} />}
      {BROWSE_PAGES.includes(ctx.page) && !ctx.chat.open && ctx.locations.length > 1 && <LocationFab ctx={ctx} />}
      <NoteToast ctx={ctx} />
      {!quiet && <PurchaseProof ctx={ctx} />}
      <LeaveNudge ctx={ctx} />
      <ConsentBanner ctx={ctx} />
      <ChatWidget ctx={ctx} mobile />

      {kind === "menu" && <MenuSheet ctx={ctx} close={close} />}
      {kind === "search" && <SearchSheet ctx={ctx} close={close} />}
      {kind === "city" && <CitySheet ctx={ctx} close={close} />}
      {kind === "variant" && <VariantSheet ctx={ctx} close={close} />}
      {kind === "added" && <AddedSheet ctx={ctx} close={close} />}
      {kind === "chat" && <ChatSheet ctx={ctx} close={close} />}
      {ctx.popup && !kind && <PromoSheet ctx={ctx} />}
    </div>
  );
}
