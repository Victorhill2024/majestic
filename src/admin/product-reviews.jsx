// Admin → Product reviews: the stars buyers give from their review-request
// email (worker/reviews.js). The house can hide a review that is abusive or
// isn't about the product, and reply in public. It can't edit what a buyer
// wrote or the stars they gave — a rating the shop can rewrite is not a rating.
import React, { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { Button } from "../ds/components.jsx";

const card = { background: "var(--surface-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" };
const linkBtn = { background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--mr-purple-700)", padding: 0 };
const stars = (n) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

export function ProductReviewsPage({ ctx }) {
  const [status, setStatus] = useState("all");
  const [data, setData] = useState(null);
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState("");

  const load = useCallback(() => {
    api.get(`/api/admin/product-reviews?status=${status}`, ctx.token).then(setData).catch(ctx.authFail);
  }, [status, ctx.token, ctx.authFail]);
  useEffect(() => { load(); }, [load]);

  const patch = async (r, body, note) => {
    try {
      await api.patch(`/api/admin/product-reviews/${r.id}`, body, ctx.token);
      ctx.flash(note);
      load();
    } catch (e) { ctx.authFail(e); ctx.flash(e.message); }
  };

  const stat = (label, value, sub) => (
    <div style={{ ...card, padding: "14px 16px", flex: "1 1 140px" }}>
      <div style={{ fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <main style={{ padding: "26px 28px 48px", maxWidth: 980 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-strong)", margin: "0 0 6px" }}>Product reviews</h2>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text-body)", margin: "0 0 18px", maxWidth: "72ch" }}>
        Stars and reviews from people who bought the product. Each buyer is emailed a link a few days after their order is marked
        <strong> Delivered</strong> or <strong>Collected</strong> (or a week after paying, if it never is). Their stars appear on product
        cards and pages and decide the <strong>Top rated</strong> shelf. The email&apos;s words and timing are under
        Integrations → Automations → <em>Review request after delivery</em>.
      </p>
      {data && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            {stat("Average rating", data.totals.count ? `${data.totals.avg.toFixed(1)} ★` : "—", `${data.totals.count} ${data.totals.count === 1 ? "review" : "reviews"}`)}
            {stat("Requests sent", data.funnel.sent, `${data.funnel.scheduled - data.funnel.sent} scheduled`)}
            {stat("Opened", data.funnel.opened, data.funnel.sent ? `${Math.round((data.funnel.opened / data.funnel.sent) * 100)}% of sent` : "")}
            {stat("Reviewed", data.funnel.completed, data.funnel.sent ? `${Math.round((data.funnel.completed / data.funnel.sent) * 100)}% of sent` : "")}
          </div>
          {data.siteUrlMissing && (
            <div style={{ ...card, padding: "12px 16px", marginBottom: 16, background: "var(--mr-gold-200)", fontSize: 13, lineHeight: 1.6 }}>
              <strong>Review emails are waiting.</strong> They link buyers back to the shop, so they can&apos;t go out until the shop knows its
              own address: set <em>The shop&apos;s web address</em> in Settings (e.g. https://majesticroobee.shop). Waiting requests send on the next run after that.
            </div>
          )}
          {data.automation && !data.automation.enabled && (
            <div style={{ ...card, padding: "12px 16px", marginBottom: 16, background: "var(--mr-gold-200)", fontSize: 13 }}>
              Review requests are switched off — turn on <em>Review request after delivery</em> in Integrations → Automations to start collecting stars.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["all", "All"], ["published", "Published"], ["hidden", "Hidden"]].map(([id, label]) => (
              <button key={id} onClick={() => setStatus(id)}
                style={{ cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500, padding: "7px 14px", borderRadius: "var(--radius-pill)", border: `1px solid ${status === id ? "var(--mr-purple-900)" : "var(--border-hairline)"}`, background: status === id ? "var(--mr-purple-900)" : "var(--surface-card)", color: status === id ? "var(--mr-cream)" : "var(--mr-purple-800)" }}>
                {label}
              </button>
            ))}
          </div>
          {!data.reviews.length && (
            <div style={{ ...card, padding: 24, textAlign: "center", fontSize: 13.5, color: "var(--text-muted)" }}>
              No reviews here yet. They arrive as buyers answer their review-request emails.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.reviews.map((r) => (
              <div key={r.id} style={{ ...card, padding: 16, opacity: r.status === "hidden" ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>{r.productName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{r.author}{r.city ? ` · ${r.city}` : ""} · order {r.orderNo} · {r.date}</div>
                  </div>
                  <div style={{ color: "var(--mr-gold-600, #a8842f)", fontSize: 16, letterSpacing: 1 }} aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</div>
                </div>
                {r.body && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-body)", margin: "10px 0 0", whiteSpace: "pre-line" }}>{r.body}</p>}
                {r.tags.length > 0 && <div style={{ fontSize: 12, color: "var(--mr-purple-700)", marginTop: 6 }}>{r.tags.join(" · ")}</div>}
                {r.reply && replying !== r.id && <div style={{ fontSize: 12.5, marginTop: 10, padding: "8px 10px", background: "var(--surface-sunken)", borderRadius: "var(--radius-sm)" }}><strong>Your reply:</strong> {r.reply}</div>}
                {replying === r.id && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={600} placeholder="Thank them, or answer their question — this shows publicly under the review."
                      style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, padding: 10, border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="primary" size="sm" onClick={() => { patch(r, { reply }, reply.trim() ? "Reply published" : "Reply removed"); setReplying(null); }}>Save reply</Button>
                      <Button variant="secondary" size="sm" onClick={() => setReplying(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                  {replying !== r.id && <button style={linkBtn} onClick={() => { setReplying(r.id); setReply(r.reply || ""); }}>{r.reply ? "Edit reply" : "Reply"}</button>}
                  {r.status === "published"
                    ? <button style={{ ...linkBtn, color: "#c0587a" }} onClick={() => patch(r, { status: "hidden" }, "Review hidden from the shop")}>Hide from shop</button>
                    : <button style={linkBtn} onClick={() => patch(r, { status: "published" }, "Review published")}>Publish again</button>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
