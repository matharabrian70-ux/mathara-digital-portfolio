import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewDraft, canApproveMenuItem, parseMenuCsv, validateMenuItem } from "./draft-model.js";

test("parses quoted commas, escaped quotes and CRLF rows", () => {
  const csv = [
    "name,price,description,category",
    '"Burger, Classic",850,"The chef said ""fresh"" daily",Mains',
    '"Iced Tea",120,"Lemon, mint and ice",Drinks'
  ].join("\\r\\n");
  const items = parseMenuCsv(csv);
  assert.equal(items.length, 2);
  assert.equal(items[0].name, "Burger, Classic");
  assert.equal(items[0].description, 'The chef said "fresh" daily');
  assert.equal(items[1].description, "Lemon, mint and ice");
  assert.equal(items.every(item => item.approved === false), true);
  assert.equal(items.every(item => validateMenuItem(item).length === 0), true);
});

test("retains rows with missing, non-numeric or negative prices for review", () => {
  const csv = [
    "name,price,description,category",
    "Tea,,Hot drink,Drinks",
    "Soda,abc,Soft drink,Drinks",
    "Juice,-5,Fresh juice,Drinks",
    ",120,Unnamed item,Other"
  ].join("\\n");
  const items = parseMenuCsv(csv);
  assert.equal(items.length, 4);
  assert.equal(items[0].price, null);
  assert.equal(items[1].price, null);
  assert.equal(items[2].price, null);
  assert.equal(items[3].name, "");
  assert.equal(items.every(item => item.approved === false), true);
  assert.equal(items.every(item => item.validationErrors.length > 0), true);
  assert.equal(items[1].sourcePriceText, "abc");
  assert.equal(items[2].sourcePriceText, "-5");
});

test("rejects CSV without required headers", () => {
  assert.throws(() => parseMenuCsv("name,description\\nTea,Hot drink"), /columns: name, price/);
});

test("rejects an unclosed quoted field", () => {
  assert.throws(() => parseMenuCsv('name,price\\n"Tea,120'), /unclosed quoted field/);
});

test("approval requires a non-empty name and finite non-negative numeric price", () => {
  assert.equal(canApproveMenuItem({ name: "Tea", price: 0 }), true);
  assert.equal(canApproveMenuItem({ name: "Tea", price: 120 }), true);
  assert.equal(canApproveMenuItem({ name: "", price: 120 }), false);
  assert.equal(canApproveMenuItem({ name: "Tea", price: null }), false);
  assert.equal(canApproveMenuItem({ name: "Tea", price: "120" }), false);
  assert.equal(canApproveMenuItem({ name: "Tea", price: -1 }), false);
});

test("review export cannot connect, modify or publish a merchant website", () => {
  const draft = buildReviewDraft({
    site: { publicUrl: "https://example.com/menu", merchantName: "Demo Restaurant", currency: "KES" },
    items: [
      { name: "Tea", price: 120, approved: true },
      { name: "Missing price", price: null, approved: true }
    ],
    sourceType: "merchant-supplied-csv-or-edited-browser-data"
  });
  assert.equal(draft.brand, "Mathara Digitals");
  assert.equal(draft.status, "review-draft-only");
  assert.equal(draft.publishable, false);
  assert.equal(draft.source.networkFetchPerformed, false);
  assert.equal(draft.integration.connected, false);
  assert.equal(draft.integration.merchantAuthorizationRecorded, false);
  assert.equal(draft.integration.websiteModified, false);
  assert.equal(draft.integration.published, false);
  assert.equal(draft.security.passwordsCollected, false);
  assert.equal(draft.security.paymentCredentialsCollected, false);
  assert.equal(draft.items[0].approvedByMerchant, true);
  assert.equal(draft.items[1].approvedByMerchant, false);
  assert.equal(draft.summary.approvedItemCount, 1);
  assert.equal(draft.summary.itemsNeedingInput, 1);
  assert.match(draft.reviewScope.taxRules, /not captured/);
  assert.match(draft.reviewScope.imageRights, /not captured/);
});
