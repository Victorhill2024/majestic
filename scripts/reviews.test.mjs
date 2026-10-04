// Ratings and reviews, exercised directly.
//
// The stars on a product card are only worth showing if they can be trusted,
// so the rules are pinned here:
//
//   · a rating is a whole number from 1 to 5, and nothing else gets saved
//   · the quick chips can only ever be ones from the house's list
//   · the average is what is shown, to one decimal place
//   · "Top rated" ranks by a damped average: one five-star review doesn't
//     outrank forty reviews averaging 4.8
//   · a product nobody has rated is never on the Top rated shelf
//   · a review page token is long, random and checked for shape before lookup
//   · a review is shown with a first name and city — never contact details
import { cleanReview, summarise, distribution, mintToken, tokenLooksValid, reviewOut, siteAddress, REVIEW_TAGS, BODY_MAX } from "../worker/reviews.js";
import { topRated, computeSegments } from "../worker/merch.js";

let failures = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${ok ? "" : `\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`}`);
};

// ---- What gets saved -------------------------------------------------------
check("a 4-star review with words and chips is kept",
  cleanReview({ productId: "p1", rating: 4, body: "  Lasts all day ", tags: ["Long-lasting", "Perfect gift"] }),
  { productId: "p1", rating: 4, body: "Lasts all day", tags: ["Long-lasting", "Perfect gift"] });
check("no stars is not a review", cleanReview({ productId: "p1", rating: 0 }), null);
check("six stars is not a review", cleanReview({ productId: "p1", rating: 6 }), null);
check("a non-number is not a review", cleanReview({ productId: "p1", rating: "lots" }), null);
check("a fractional rating rounds to a whole star", cleanReview({ productId: "p1", rating: 4.6 }).rating, 5);
check("chips not on the house's list are dropped, duplicates collapse",
  cleanReview({ productId: "p1", rating: 5, tags: ["Smells amazing", "<script>", "Smells amazing"] }).tags, ["Smells amazing"]);
check("chips can arrive comma-separated", cleanReview({ productId: "p1", rating: 5, tags: "Great value,Fast delivery" }).tags, ["Great value", "Fast delivery"]);
check("the words are capped", cleanReview({ productId: "p1", rating: 3, body: "x".repeat(BODY_MAX + 50) }).body.length, BODY_MAX);
check("every chip is a short phrase", REVIEW_TAGS.every((t) => t.length <= 20), true);

// ---- Averages ----------------------------------------------------------------
const rows = [
  { product_id: "a", rating: 5 }, { product_id: "a", rating: 4 }, { product_id: "a", rating: 4 },
  { product_id: "b", rating: 5 },
  { product_id: "c", rating: 9 }, // bad data never counts
];
check("summary: average to one decimal, with the count", summarise(rows), { a: { avg: 4.3, count: 3 }, b: { avg: 5, count: 1 } });
check("distribution: 5 to 1", distribution(rows.filter((r) => r.product_id === "a")), { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 });

// ---- Top rated -------------------------------------------------------------------
const products = ["one-review", "forty-reviews", "unrated", "middling", "poor"].map((id) => ({ id }));
const ratings = {
  "one-review": { avg: 5, count: 1 },
  "forty-reviews": { avg: 4.8, count: 40 },
  middling: { avg: 4.0, count: 6 },
  poor: { avg: 2.4, count: 12 },
};
const ranked = topRated(products, ratings);
check("forty reviews at 4.8 outrank a single five-star review", ranked[0], "forty-reviews");
check("an unrated product is never on the shelf", ranked.includes("unrated"), false);
check("a poorly rated product is not 'top rated'", ranked.includes("poor"), false);
check("no reviews at all: an empty shelf, not a padded one", topRated(products, {}), []);
check("computeSegments carries the shelf",
  computeSegments({ products, ratings, minShelf: 4 })["top-rated"], ranked);
check("...and leaves it empty, never topped up, before any reviews",
  computeSegments({ products, minShelf: 4 })["top-rated"], []);

// ---- Tokens ----------------------------------------------------------------------
const t1 = mintToken();
const t2 = mintToken();
check("a token is long and URL-safe", tokenLooksValid(t1), true);
check("two tokens are never the same", t1 === t2, false);
check("an order number is not a token", tokenLooksValid("MR-10234"), false);
check("a path is not a token", tokenLooksValid("../../admin"), false);

// ---- What is shown -----------------------------------------------------------------
const shown = reviewOut({ id: 1, rating: 5, body: "Gorgeous", tags: "Smells amazing,Long-lasting", author: "Dorothy", city: "Abuja", created_at: "2026-10-01 10:00:00", email: "d@example.com", phone: "0803" });
check("a review shows a first name, a city and a date", [shown.author, shown.city, shown.date], ["Dorothy", "Abuja", "2026-10-01"]);
check("...and never an email or a phone number", "email" in shown || "phone" in shown, false);
check("...and is marked as from a verified buyer", shown.verified, true);
check("a review with no name reads as a verified buyer", reviewOut({ rating: 4 }).author, "A verified buyer");

// ---- Links -----------------------------------------------------------------------
check("the shop's address comes from settings, without a trailing slash", siteAddress({ siteUrl: "https://majesticroobee.shop/" }), "https://majesticroobee.shop");
check("no address set anywhere: nothing to link to", siteAddress({}, {}), "");

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll review checks passed");
