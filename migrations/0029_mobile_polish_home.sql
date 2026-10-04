-- The home page, tidied for the phone and its copy tightened.
--
-- Every change below is guarded on the text that is live today, so anything
-- the house has already rewritten in Admin → Home page is left exactly as it
-- is. Each one can be changed back from that same screen.

-- "2Sexy2Resist" — a single-product feature band. Switched off, not deleted:
-- Admin → Home page can turn it back on, or point it at another product.
UPDATE home_blocks SET live = 0, updated_at = datetime('now')
 WHERE id = 'featured' AND lower(title) LIKE '%2sexy2resist%';

-- "The fragrance everyone is talking about" becomes the Top rated shelf: what
-- verified buyers rate highest (worker/reviews.js, worker/merch.js). Shorter,
-- and it now means what it says. It stays hidden until the first reviews are
-- in — a "Top rated" shelf of unrated products would be a claim, not a fact.
UPDATE home_blocks
   SET eyebrow = 'Top rated',
       title = 'Five-star favourites',
       sub = 'The scents our verified buyers rate highest.',
       source = 'segment', ref_id = 'top-rated',
       cta_label = 'See all top rated', cta_target = '/top-rated',
       updated_at = datetime('now')
 WHERE id = 'shelf-best' AND ref_id = 'best-sellers'
   AND title = 'The fragrance everyone is talking about';

-- "Most shopped" — what buyers actually buy most (paid orders over the
-- best-seller window), where the phone used to show "Recently viewed". Placed
-- straight after the trust strip, near the top of the page.
INSERT OR IGNORE INTO home_blocks (id, kind, source, ref_id, count, layout, dark, eyebrow, title, sub, lines, cta_label, cta_target, sort, live) VALUES
  ('shelf-most-shopped', 'shelf', 'segment', 'best-sellers', 8, 'product-band', 1,
   'Most shopped', 'Flying off the shelves',
   'What our customers buy most, ranked by real orders.',
   '', 'See all', '/best-sellers', 150, 1);

-- The founder's block gets a heading that says what it is.
UPDATE home_blocks SET title = 'Message from our Founder', updated_at = datetime('now')
 WHERE id = 'story' AND title = '';

-- ---- Copy ------------------------------------------------------------------
--
-- Shorter headings that name the product, one clear line under each, and
-- buttons that say where they go — the way the big fragrance stores write.

UPDATE home_blocks
   SET title = 'Gentle, plant-based feminine care',
       lines = 'Non-toxic intimate care for everyday freshness and confidence.',
       updated_at = datetime('now')
 WHERE id = 'band-care' AND title = 'The products your intimate area needs';

UPDATE home_blocks
   SET lines = 'Soft and feminine, warm and sensual, fresh and effortless, or bold and commanding?
There''s a signature scent for every version of you.',
       updated_at = datetime('now')
 WHERE id = 'cta-personality' AND lines LIKE 'Are you soft and feminine?%';

UPDATE home_blocks
   SET title = 'A signature scent for your home',
       lines = 'Candles, diffusers and room sprays that make every room feel warmer, fresher and more inviting.',
       updated_at = datetime('now')
 WHERE id = 'band-home' AND title = 'Your home deserves a signature scent too';

UPDATE home_blocks SET cta_label = 'Start earning rewards', updated_at = datetime('now')
 WHERE id = 'rewards' AND cta_label IN ('Shop to earn your points now', 'Shop to earn your points');

UPDATE home_blocks
   SET sub = 'New scents, restocks and members-only offers, straight to your inbox.',
       updated_at = datetime('now')
 WHERE id = 'newsletter'
   AND sub = 'Be the first to know about new scents, restocks, special offers and everything happening at Majestic Roobee.';

-- The hero's line under the headline: the same promise, a third shorter, so
-- it sits in two lines on a phone instead of five.
UPDATE settings
   SET value = json_set(value, '$.heroSub', 'Non-toxic perfumes, perfume oils, body mists and home fragrances for men and women who want to smell as good as they feel.')
 WHERE key = 'site'
   AND json_extract(value, '$.heroSub') = 'Discover beautifully crafted non-toxic perfumes, perfume oils, body mists and home fragrances made for men and women who want to smell as good as they feel.';
