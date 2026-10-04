// Product ratings and reviews — from buyers, by email, the Temu way.
//
// How a star gets onto a product card:
//
//   1. An order is marked Delivered or Collected in the admin. That schedules
//      one review request for the order, due `delay_minutes` later (the
//      `review_request` automation; three days by default). An order nobody
//      ever marks delivered still gets its request: once it has been paid for
//      `FALLBACK_DAYS`, the cron schedules it anyway.
//   2. The cron sends the request through the automation outbox, so it is
//      written in the admin, sent in the letterhead and logged like every other
//      email. Its last line is a button to /review/<token>.
//   3. That page lists the order's products, each with five stars and a few
//      quick chips. Submitting writes one review per product (re-opening the
//      link edits them rather than adding more).
//   4. The storefront reads the published reviews as { avg, count } on each
//      product, and `topRated` (worker/merch.js) turns them into the "Top
//      rated" shelf.
//
// Everything decision-shaped is a pure function here so the tests can hold it
// to account without a database.

import { firstName } from "./merch.js";
import { getSettings } from "./util.js";

/** The chips a buyer can tap instead of (or as well as) writing. */
export const REVIEW_TAGS = [
  "Smells amazing", "Long-lasting", "Great value", "Lovely packaging", "Perfect gift", "Fast delivery", "Would buy again",
];

export const BODY_MAX = 600;

// An order that was paid for this many days ago and never marked delivered is
// asked anyway — a house that ships without updating the status shouldn't lose
// every review because of it.
export const FALLBACK_DAYS = 7;
// ...but only orders this recent, so switching the feature on doesn't email
// everyone who ever bought anything.
export const LOOKBACK_DAYS = 45;
// How many requests one cron run will send — a backlog drains over a few runs
// instead of arriving at Resend as a burst.
export const PER_RUN = 25;

// The statuses that mean the shopper has the product in their hands.
export const RECEIVED = ["Delivered", "Collected"];

/** The shop's public address, for links in an email: Admin → Settings, else the Worker's SITE_URL. */
export const siteAddress = (settings = {}, env = {}) => String(settings.siteUrl || env.SITE_URL || "").trim().replace(/\/$/, "");

/** A long, unguessable, URL-safe token. */
export function mintToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Tokens are the only key to a review page — anything not shaped like one is refused before any lookup. */
export const tokenLooksValid = (t) => /^[A-Za-z0-9_-]{24,64}$/.test(String(t || ""));

/**
 * One submitted review, cleaned — or null when it can't be saved.
 * Stars are whole numbers 1–5; the words are trimmed and capped; chips are
 * only ever ones from the list.
 */
export function cleanReview(input = {}) {
  const rating = Math.round(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  const body = String(input.body || "").replace(/\s+\n/g, "\n").trim().slice(0, BODY_MAX);
  const picked = Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(",");
  const tags = [...new Set(picked.map((t) => String(t).trim()).filter((t) => REVIEW_TAGS.includes(t)))];
  return { productId: String(input.productId || ""), rating, body, tags };
}

/**
 * { productId: { avg, count } } from published review rows ({ product_id, rating }).
 * `avg` is rounded to one decimal place, which is how it is shown.
 */
export function summarise(rows = []) {
  const acc = new Map();
  for (const r of rows) {
    const id = r.product_id || r.productId;
    const n = Number(r.rating);
    if (!id || !(n >= 1 && n <= 5)) continue;
    const a = acc.get(id) || { sum: 0, count: 0 };
    a.sum += n;
    a.count += 1;
    acc.set(id, a);
  }
  const out = {};
  for (const [id, a] of acc) out[id] = { avg: Math.round((a.sum / a.count) * 10) / 10, count: a.count };
  return out;
}

/** The 5-to-1 breakdown a product page draws as bars. */
export function distribution(rows = []) {
  const d = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of rows) if (d[r.rating] !== undefined) d[r.rating] += 1;
  return d;
}

/** How a review is shown publicly. Never the email, the phone or the surname. */
export function reviewOut(r) {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body || "",
    tags: String(r.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
    author: r.author || "A verified buyer",
    city: r.city || "",
    size: r.size || "",
    reply: r.reply || "",
    date: String(r.created_at || "").slice(0, 10),
    verified: true,
  };
}

// ---- Database ------------------------------------------------------------

/** { productId: { avg, count } } for every product with a published review. */
export async function loadRatings(db) {
  try {
    const rows = (await db.prepare("SELECT product_id, rating FROM product_reviews WHERE status='published'").all()).results;
    return summarise(rows);
  } catch {
    // Before the migration has run, the shop simply has no stars yet.
    return {};
  }
}

/**
 * Schedule an order's review request, once. Later calls for the same order are
 * no-ops — whichever of "marked delivered" and "paid a week ago" comes first
 * decides when it goes out.
 */
export async function scheduleReviewRequest(db, orderNo, delayMinutes = 0) {
  const mins = Math.max(0, parseInt(delayMinutes, 10) || 0);
  await db.prepare(
    "INSERT OR IGNORE INTO review_requests (token, order_no, due_at) VALUES (?, ?, datetime('now', ?))"
  ).bind(mintToken(), orderNo, `+${mins} minutes`).run();
}

/** Called when the admin moves an order on: a delivered order is a reviewable one. */
export async function onOrderStatus(env, orderNo, status) {
  if (!RECEIVED.includes(status)) return;
  const auto = await env.DB.prepare("SELECT delay_minutes FROM automations WHERE id='review_request' AND enabled=1").first();
  if (!auto) return;
  await scheduleReviewRequest(env.DB, orderNo, auto.delay_minutes);
}

/**
 * Cron: schedule the fallbacks, then send what is due.
 *
 * `enqueue(automation, payload)` is the outbox's own (worker/events.js), handed
 * in so this file doesn't import the module that imports it.
 */
export async function runReviewRequests(env, enqueue) {
  const db = env.DB;
  const auto = await db.prepare("SELECT * FROM automations WHERE id='review_request' AND enabled=1").first();
  if (!auto) return { scheduled: 0, sent: 0 };

  // Paid a week ago, never marked delivered, never asked: ask now.
  const stale = (await db.prepare(
    `SELECT o.no FROM orders o
      WHERE o.status <> 'Cancelled'
        AND o.pay_status = 'paid'
        AND o.email LIKE '%@%'
        AND COALESCE(o.paid_at, o.placed_at) <= datetime('now', ?)
        AND o.placed_at >= datetime('now', ?)
        AND NOT EXISTS (SELECT 1 FROM review_requests r WHERE r.order_no = o.no)
      LIMIT ?`
  ).bind(`-${FALLBACK_DAYS} days`, `-${LOOKBACK_DAYS} days`, PER_RUN).all()).results;
  for (const o of stale) await scheduleReviewRequest(db, o.no, 0);

  // The email's whole point is its link, and the cron has no request to take
  // an address from — so with no "shop's web address" set (Admin → Settings)
  // requests wait, unsent, rather than going out without the button.
  const site = siteAddress(await getSettings(db), env);
  if (!site) return { scheduled: stale.length, sent: 0, waiting: "no site address" };
  const due = (await db.prepare(
    `SELECT r.token, o.no, o.customer, o.email, o.status
       FROM review_requests r JOIN orders o ON o.no = r.order_no
      WHERE r.sent_at IS NULL AND r.due_at <= datetime('now')
      ORDER BY r.due_at LIMIT ?`
  ).bind(PER_RUN).all()).results;
  let sent = 0;
  for (const r of due) {
    // Mark it first: a request is asked once, even if the send below fails
    // and is retried by the outbox rather than by this loop.
    await db.prepare("UPDATE review_requests SET sent_at = datetime('now') WHERE token = ?").bind(r.token).run();
    // Cancelled since, or no address to write to: nothing to send.
    if (r.status === "Cancelled" || !String(r.email || "").includes("@")) continue;
    await enqueue(auto, {
      name: r.customer, email: r.email, contact: r.email, orderNo: r.no,
      reviewUrl: `${site}/review/${r.token}`,
    });
    sent += 1;
  }
  return { scheduled: stale.length, sent };
}

/** The request behind a token, with the order's products and any reviews already written. */
export async function loadRequest(db, token) {
  if (!tokenLooksValid(token)) return null;
  const req = await db.prepare(
    "SELECT r.*, o.customer, o.city, o.status FROM review_requests r JOIN orders o ON o.no = r.order_no WHERE r.token = ?"
  ).bind(token).first();
  if (!req || req.status === "Cancelled") return null;
  const lines = (await db.prepare(
    `SELECT i.product_id, i.variant_id, i.name, i.size,
            COALESCE((SELECT v.image_url FROM variants v WHERE v.id = i.variant_id), p.image_url) AS image_url,
            p.id AS live_id
       FROM order_items i LEFT JOIN products p ON p.id = i.product_id
      WHERE i.order_no = ? ORDER BY i.id`
  ).bind(req.order_no).all()).results;
  const existing = (await db.prepare("SELECT * FROM product_reviews WHERE order_no = ?").bind(req.order_no).all()).results;
  const seen = new Set();
  const items = [];
  for (const l of lines) {
    // One card per product, even if two sizes of it were bought; a product
    // since deleted from the catalogue can't carry a review.
    if (!l.live_id || seen.has(l.product_id)) continue;
    seen.add(l.product_id);
    const mine = existing.find((e) => e.product_id === l.product_id);
    items.push({
      productId: l.product_id, variantId: l.variant_id || null, name: l.name, size: l.size, imageUrl: l.image_url || null,
      review: mine ? { rating: mine.rating, body: mine.body, tags: String(mine.tags || "").split(",").filter(Boolean) } : null,
    });
  }
  return { req, items, firstName: firstName(req.customer), city: req.city };
}

/**
 * Save a buyer's reviews for their order. Products not in the order are
 * ignored; a product already reviewed from this order is updated in place.
 */
export async function saveReviews(db, loaded, submitted = []) {
  const { req, items } = loaded;
  const byId = new Map(items.map((i) => [i.productId, i]));
  const author = firstName(req.customer) || "";
  const city = String(req.city || "").replace(/^./, (c) => c.toUpperCase());
  let saved = 0;
  for (const raw of Array.isArray(submitted) ? submitted : []) {
    const r = cleanReview(raw);
    if (!r || !byId.has(r.productId)) continue;
    const item = byId.get(r.productId);
    await db.prepare(
      `INSERT INTO product_reviews (product_id, variant_id, order_no, rating, body, tags, author, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(order_no, product_id) DO UPDATE SET
         rating = excluded.rating, body = excluded.body, tags = excluded.tags, updated_at = datetime('now')`
    ).bind(r.productId, item.variantId, req.order_no, r.rating, r.body, r.tags.join(","), author, city).run();
    saved += 1;
  }
  if (saved) await db.prepare("UPDATE review_requests SET completed_at = datetime('now') WHERE token = ?").bind(req.token).run();
  return saved;
}
