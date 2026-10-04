-- Product ratings and reviews, from the people who bought the product.
--
-- The Temu pattern, which is the one shoppers now expect: a few days after an
-- order arrives, the buyer gets one email — "How did we do?" — that opens a
-- page listing everything in that order, each with five stars to tap and an
-- optional line or a few quick words ("Long-lasting", "Perfect gift"). No
-- account, no password: the link itself is the key, and it only ever opens
-- that one order. Those stars are what every product card, product page and the
-- "Top rated" shelf read.
--
-- Two rules keep the stars honest:
--   · only a buyer can rate — a review row always names the order it came from,
--     and the order has to contain the product
--   · one review per product per order, which the buyer can change by opening
--     their link again (UNIQUE below), so a stray double-tap never counts twice

CREATE TABLE product_reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  INTEGER,
  order_no    TEXT NOT NULL REFERENCES orders(no) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT NOT NULL DEFAULT '',
  -- The quick chips the buyer tapped, comma-separated, from a fixed list
  -- (worker/reviews.js REVIEW_TAGS) — never free text.
  tags        TEXT NOT NULL DEFAULT '',
  -- What the shop shows as the reviewer: a first name and the city, never the
  -- surname, the phone or the email. Copied at the time of writing so editing
  -- the order later doesn't rename a published review.
  author      TEXT NOT NULL DEFAULT '',
  city        TEXT NOT NULL DEFAULT '',
  -- published · hidden. Every buyer's review is published as written; the
  -- house can hide one that is abusive or not about the product (Admin →
  -- Product reviews), never edit its words or its stars.
  status      TEXT NOT NULL DEFAULT 'published',
  -- The house's public reply, shown under the review.
  reply       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (order_no, product_id)
);
CREATE INDEX idx_reviews_product ON product_reviews(product_id, status, created_at);
CREATE INDEX idx_reviews_status ON product_reviews(status, created_at);

-- One request per order: when it is due, when it went out, whether it was
-- opened and answered. The token is the whole key to the review page, so it is
-- long and random, and it opens nothing but this order's items.
CREATE TABLE review_requests (
  token        TEXT PRIMARY KEY,
  order_no     TEXT NOT NULL UNIQUE REFERENCES orders(no) ON DELETE CASCADE,
  due_at       TEXT NOT NULL,
  sent_at      TEXT,
  opened_at    TEXT,
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_review_requests_due ON review_requests(sent_at, due_at);

-- The email itself, written in Admin → Integrations → Automations like every
-- other one. `delay_minutes` is how long after an order is marked Delivered or
-- Collected the request goes out (three days: long enough to have worn it).
-- The link to the review page is added to the end of the message by the cron.
INSERT INTO automations (id, name, trigger, action, template_title, template_body, delay_minutes, enabled) VALUES
  ('review_request', 'Review request after delivery', 'cron', 'email',
   'How are you loving your order?',
   'thank you for shopping with Majestic Roobee. Your opinion helps other shoppers find their signature scent — and it takes less than a minute.

Tap the stars for each item, add a few words if you like, and you''re done.',
   4320, 1);
