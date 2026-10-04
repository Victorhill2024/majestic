// Ratings and reviews on the storefront — the page a buyer lands on from their
// "How are you loving your order?" email, and the reviews section on a product
// page. The flow and its rules are in worker/reviews.js.
//
// The review page is modelled on the one shoppers already know from the big
// marketplaces: everything in the order on one screen, big stars to tap, a few
// quick words to pick instead of typing, and one button. No sign-in — the link
// in the email is the key.
import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { ImageSlot } from "../ds/components.jsx";
import { I, BtnM, Stars, chipTone, eyebrowM } from "./mobile-ui.jsx";

const STAR_WORDS = { 1: "Didn't like it", 2: "Not for me", 3: "It's okay", 4: "Really like it", 5: "Love it!" };

function StarPicker({ value, onPick, name }) {
  return (
    <div role="radiogroup" aria-label={`Your rating for ${name}`} style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""} — ${STAR_WORDS[n]}`} onClick={() => onPick(n)}
          style={{ width: 44, height: 44, padding: 0, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z"
              fill={n <= value ? "var(--mr-gold-500, #c9a24e)" : "none"} stroke={n <= value ? "var(--mr-gold-500, #c9a24e)" : "var(--border-strong)"} strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/** /review/<token> — rate everything in one order. */
export function ReviewPage({ ctx }) {
  const token = ctx.reviewToken;
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [drafts, setDrafts] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) return;
    let live = true;
    api.get(`/api/reviews/request/${encodeURIComponent(token)}`)
      .then((d) => {
        if (!live) return;
        setState({ loading: false, error: "", data: d });
        const init = {};
        for (const it of d.items) init[it.productId] = it.review ? { rating: it.review.rating, body: it.review.body || "", tags: it.review.tags || [] } : { rating: 0, body: "", tags: [] };
        setDrafts(init);
      })
      .catch((e) => { if (live) setState({ loading: false, error: e.message || "This review link isn't valid.", data: null }); });
    return () => { live = false; };
  }, [token]);

  const wrap = { maxWidth: 620, margin: "0 auto", padding: "28px 20px 40px" };
  if (state.loading) return <main style={wrap}><p style={{ color: "var(--text-muted)" }}>Loading your order…</p></main>;
  if (state.error || !state.data) {
    return (
      <main style={{ ...wrap, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--text-strong)", margin: 0 }}>We couldn&apos;t open this review link</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--text-body)", margin: 0 }}>{state.error || "It may have expired."} If you&apos;d still like to tell us about your order, we&apos;d love to hear from you.</p>
        <BtnM onClick={() => ctx.nav("contact")}>Contact us</BtnM>
      </main>
    );
  }

  const { items, firstName, orderNo, tags } = state.data;
  const set = (id, patch) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  const rated = items.filter((it) => (drafts[it.productId] || {}).rating > 0);
  const submit = async () => {
    if (!rated.length) { setErr("Tap the stars for at least one item."); return; }
    setErr("");
    setSending(true);
    try {
      await api.post(`/api/reviews/request/${encodeURIComponent(token)}`, {
        reviews: rated.map((it) => ({ productId: it.productId, ...drafts[it.productId] })),
      });
      setSent(true);
      window.scrollTo(0, 0);
    } catch (e) {
      setErr(e.message || "Couldn't send your review just now — please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <main style={{ ...wrap, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 48 }}>
        <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--mr-lavender-200)", color: "var(--mr-purple-900)", display: "flex", alignItems: "center", justifyContent: "center" }}>{I.check(30, 2.2)}</span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-strong)", margin: 0 }}>Thank you{firstName ? `, ${firstName}` : ""}!</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-body)", margin: 0, maxWidth: "40ch" }}>Your review is live and helps other shoppers find their signature scent. You can change it any time from the link in your email.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", paddingTop: 6 }}>
          <BtnM variant="gold" size="lg" onClick={() => ctx.nav("shop", { fCat: "all", fSeg: null })}>Keep shopping</BtnM>
          <BtnM variant="secondary" size="lg" onClick={() => setSent(false)}>Edit my review</BtnM>
        </div>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <div style={eyebrowM}>Order {orderNo}</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1.15, color: "var(--text-strong)", margin: "8px 0 8px" }}>
        {firstName ? `${firstName}, how` : "How"} are you loving your order?
      </h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--text-body)", margin: "0 0 22px" }}>
        Tap the stars for each item. A few words help other shoppers most — but the stars alone are perfect too.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((it) => {
          const d = drafts[it.productId] || { rating: 0, body: "", tags: [] };
          return (
            <section key={it.productId} style={{ background: "var(--surface-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-lg)", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ width: 64, height: 64, borderRadius: "var(--radius-md)", overflow: "hidden", flex: "none", background: "var(--mr-lavender-200)" }}>
                  <ImageSlot src={it.imageUrl} name={it.name} sizes="64px" monoSize={18} style={{ width: "100%", height: "100%" }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.25, color: "var(--text-strong)" }}>{it.name}</div>
                  {it.size && <div style={{ fontSize: 12.5, color: "var(--text-muted)", paddingTop: 2 }}>{it.size}</div>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <StarPicker value={d.rating} name={it.name} onPick={(n) => set(it.productId, { rating: n })} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: d.rating ? "var(--mr-purple-900)" : "var(--text-muted)" }}>{d.rating ? STAR_WORDS[d.rating] : "Tap to rate"}</span>
              </div>
              {d.rating > 0 && (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {tags.map((t) => {
                      const on = d.tags.includes(t);
                      return (
                        <button key={t} type="button" aria-pressed={on} onClick={() => set(it.productId, { tags: on ? d.tags.filter((x) => x !== t) : d.tags.concat(t) })}
                          style={{ height: 36, padding: "0 14px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-sans)", fontSize: 13, cursor: "pointer", ...chipTone(on) }}>
                          {on ? "✓ " : ""}{t}
                        </button>
                      );
                    })}
                  </div>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-body)" }}>
                    <span>Tell other shoppers what you think <span style={{ color: "var(--text-muted)", fontSize: 12 }}>(optional)</span></span>
                    <textarea value={d.body} maxLength={600} rows={3} onChange={(e) => set(it.productId, { body: e.target.value })}
                      placeholder="How does it smell, how long does it last, who complimented you…"
                      style={{ fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.5, padding: "12px 14px", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", background: "var(--mr-cream)", color: "var(--text-strong)", resize: "vertical", outline: "none" }} />
                  </label>
                </>
              )}
            </section>
          );
        })}
      </div>
      {err && <div role="alert" style={{ fontSize: 13.5, color: "var(--mr-orchid-600)", paddingTop: 16 }}>{err}</div>}
      <div style={{ paddingTop: 20 }}>
        <BtnM variant="gold" size="lg" block disabled={sending} onClick={submit}>
          {sending ? "Sending…" : rated.length > 1 ? `Send my ${rated.length} reviews` : "Send my review"}
        </BtnM>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-muted)", textAlign: "center", margin: "12px 0 0" }}>
          Shown with your first name and city as a verified buyer. Never your surname, email or phone.
        </p>
      </div>
    </main>
  );
}

/**
 * The reviews on a product page: the average, the 5-to-1 bars, the quick words
 * buyers chose most, and the reviews themselves — written ones first.
 */
export function ProductReviews({ ctx, product, compact = false }) {
  const [data, setData] = useState(null);
  const [extra, setExtra] = useState([]);
  const [more, setMore] = useState(false);
  const id = product.id;
  useEffect(() => {
    let live = true;
    setData(null);
    setExtra([]);
    api.get(`/api/products/${encodeURIComponent(id)}/reviews`).then((d) => { if (live) { setData(d); setMore(d.more); } }).catch(() => {});
    return () => { live = false; };
  }, [id]);
  const loadMore = () => {
    const offset = (data ? data.reviews.length : 0) + extra.length;
    api.get(`/api/products/${encodeURIComponent(id)}/reviews?offset=${offset}`).then((d) => { setExtra((x) => x.concat(d.reviews)); setMore(d.more); }).catch(() => {});
  };
  const pad = compact ? "0 20px" : 0;
  if (!data) return null;
  const { summary } = data;
  const list = data.reviews.concat(extra);
  const head = (
    <h2 style={{ fontFamily: "var(--font-display)", fontSize: compact ? 22 : "clamp(24px, 3vw, 32px)", color: "var(--text-strong)", letterSpacing: "var(--ls-heading)", margin: "0 0 14px" }}>
      Customer reviews{summary.count ? ` (${summary.count})` : ""}
    </h2>
  );
  if (!summary.count) {
    return (
      <section id="reviews" style={{ padding: pad, paddingTop: compact ? 36 : 56, scrollMarginTop: compact ? 70 : 140 }}>
        {head}
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-lg)", padding: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <Stars value={0} size={18} label={false} />
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text-body)" }}>No reviews yet. Buyers are invited to rate {product.name} a few days after it arrives.</span>
        </div>
      </section>
    );
  }
  return (
    <section id="reviews" style={{ padding: pad, paddingTop: compact ? 36 : 56, scrollMarginTop: compact ? 70 : 140 }}>
      {head}
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "minmax(0, 300px) minmax(0, 1fr)", gap: compact ? 18 : 40, alignItems: "start" }}>
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-lg)", padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 42, lineHeight: 1, color: "var(--text-strong)" }}>{summary.avg.toFixed(1)}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Stars value={summary.avg} size={17} />
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{summary.count} verified {summary.count === 1 ? "rating" : "ratings"}</span>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 14 }}>
            {[5, 4, 3, 2, 1].map((n) => {
              const c = summary.dist[n] || 0;
              const pct = Math.round((c / summary.count) * 100);
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ width: 22 }}>{n}★</span>
                  <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--surface-sunken)", overflow: "hidden" }}>
                    <span style={{ display: "block", width: `${pct}%`, height: "100%", background: "var(--mr-gold-500, #c9a24e)" }} />
                  </span>
                  <span style={{ width: 30, textAlign: "right" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
          {summary.topTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 14 }}>
              {summary.topTags.map((t) => (
                <span key={t.tag} style={{ fontSize: 12, padding: "5px 10px", borderRadius: "var(--radius-pill)", background: "var(--mr-lavender-200)", color: "var(--mr-purple-900)" }}>{t.tag} · {t.n}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {list.map((r) => (
            <article key={r.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--border-hairline)", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Stars value={r.rating} size={14} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>{r.author}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{[r.city, r.size].filter(Boolean).join(" · ")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#3f6b45", fontWeight: 600 }}>{I.check(12, 2.4)} Verified buyer{r.date ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {r.date}</span> : null}</div>
              {r.body && <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-body)", margin: 0, whiteSpace: "pre-line" }}>{r.body}</p>}
              {r.tags.length > 0 && <div style={{ fontSize: 12, color: "var(--mr-purple-700)" }}>{r.tags.join(" · ")}</div>}
              {r.reply && (
                <div style={{ marginTop: 4, background: "var(--mr-lavender-200)", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 13, lineHeight: 1.55, color: "var(--mr-purple-900)" }}>
                  <strong style={{ fontWeight: 600 }}>{(ctx.settings && ctx.settings.siteName) || "Majestic Roobee"} replied:</strong> {r.reply}
                </div>
              )}
            </article>
          ))}
          {more && <div style={{ paddingTop: 16 }}><BtnM variant="secondary" onClick={loadMore}>Show more reviews</BtnM></div>}
        </div>
      </div>
    </section>
  );
}
