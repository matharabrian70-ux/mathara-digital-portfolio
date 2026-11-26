import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MENU_CSV_BYTES,
  MAX_MENU_COLUMNS,
  MAX_MENU_ROWS,
  buildReviewDraft,
  canApproveMenuItem,
  parseMenuCsv,
  reviewedMenuToCsv,
  validateMenuItem
} from "./draft-model.js";

test("parses quoted commas, escaped quotes and CRLF rows", () => {
  const csv = [
    "name,price,description,category",
    '"Burger, Classic",850,"The chef said ""fresh"" daily",Mains',
    '"Iced Tea",120,"Lemon, mint and ice",Drinks'
  ].join("\r\n");
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
  ].join("\n");
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
  assert.throws(() => parseMenuCsv("name,description\nTea,Hot drink"), /columns: name, price/);
});

test("rejects an unclosed quoted field", () => {
  assert.throws(() => parseMenuCsv('name,price\n"Tea,120'), /unclosed quoted field/);
});

test("approval requires a non-empty name and finite non-negative numeric price", () => {
  assert.equal(canApproveMenuItem({ name: "Tea", price: 0 }), true);
  assert.equal(canApproveMenuItem({ name: "Tea", price: 120 }), true);
  assert.equal(canApproveMenuItem({ name: "", price: 120 }), false);
  assert.equal(canApproveMenuItem({ name: "Tea", price: null }), false);
  assert.equal(canApproveMenuItem({ name: "Tea", price: "120" }), true);
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
  assert.equal(draft.items[0].priceMinor, 12000);
  assert.equal(draft.items[1].approvedByMerchant, false);
  assert.equal(draft.summary.approvedItemCount, 1);
  assert.equal(draft.summary.itemsNeedingInput, 1);
  assert.match(draft.reviewScope.taxRules, /not captured/);
  assert.match(draft.reviewScope.imageRights, /not captured/);
});

test("rejects exponent, negative, over-precision and unsafe minor-unit prices", () => {
  const items = parseMenuCsv([
    "name,price",
    "Exponent,1e3",
    "Negative,-1",
    "Over precision,12.345",
    "Unsafe minor units,90071992547409.92",
    "Valid decimal,850.00"
  ].join("\n"));
  assert.equal(items.length, 5);
  assert.equal(items.slice(0, 4).every(item => !canApproveMenuItem(item)), true);
  assert.equal(canApproveMenuItem(items[4]), true);
  assert.equal(items[0].sourcePriceText, "1e3");
  assert.match(items[0].validationErrors.join(" "), /plain non-negative decimal/);
});

test("manual price text must match the numeric value and use at most two decimals", () => {
  assert.equal(canApproveMenuItem({ name: "Tea", price: 1000, sourcePriceText: "1e3" }), false);
  assert.equal(canApproveMenuItem({ name: "Tea", price: 12.345, sourcePriceText: "12.345" }), false);
  assert.equal(canApproveMenuItem({ name: "Tea", price: 12.34, sourcePriceText: "12.34" }), true);
});

test("rejects duplicate, empty and inconsistent CSV columns", () => {
  assert.throws(() => parseMenuCsv("name,name,price\nTea,Tea,120"), /duplicate headers/);
  assert.throws(() => parseMenuCsv("name,,price\nTea,Drinks,120"), /empty header/);
  assert.throws(() => parseMenuCsv("name,price,category\nTea,120"), /expected 3/);
});

test("enforces input size, row and column limits", () => {
  assert.throws(() => parseMenuCsv("x".repeat(MAX_MENU_CSV_BYTES + 1)), /2 MiB/);
  assert.throws(() => parseMenuCsv("😀".repeat(600000)), /2 MiB/);
  const tooManyRows = ["name,price", ...Array.from({ length: MAX_MENU_ROWS + 1 }, (_, i) => "Item " + i + ",1")].join("\n");
  assert.throws(() => parseMenuCsv(tooManyRows), /10,000-row/);
  const tooManyColumns = Array.from({ length: MAX_MENU_COLUMNS + 1 }, (_, i) => "c" + i).join(",");
  assert.throws(() => parseMenuCsv(tooManyColumns + "\n" + Array(MAX_MENU_COLUMNS + 1).fill("x").join(",")), /50-column/);
});

test("reviewed CSV neutralizes formula-like values in all exported cells", () => {
  const csv = reviewedMenuToCsv([{
    name: '=HYPERLINK("https://example.invalid","open")',
    description: "\t+SUM(1,1)",
    category: "@SUM(1,1)",
    price: null,
    sourcePriceText: "=1+1",
    approved: false,
    sourceRow: 2
  }]);
  assert.match(csv, /"'=HYPERLINK/);
  assert.match(csv, /"'\t\+SUM/);
  assert.match(csv, /"'@SUM/);
  assert.match(csv, /"'=1\+1/);
  assert.match(csv, /\r\n$/);
});