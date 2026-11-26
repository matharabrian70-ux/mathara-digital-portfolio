export const MAX_MENU_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_MENU_ROWS = 10_000;
export const MAX_MENU_COLUMNS = 50;

function parseMoneyMinorUnits(value) {
  const text = String(value ?? "").trim();
  if (text.length > 17) return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const minor = BigInt(match[1]) * 100n + BigInt(fraction || "0");
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(minor);
}

export function validateMenuItem(item) {
  const errors = [];
  const name = String(item?.name ?? "").trim();
  if (!name) errors.push("Item name is required.");

  const price = item?.price;
  const sourcePriceText = typeof item?.sourcePriceText === "string" && item.sourcePriceText.trim() !== ""
    ? item.sourcePriceText.trim()
    : (price === null || price === undefined || price === "" ? "" : String(price));

  if (price === null || price === undefined || price === "") {
    errors.push(sourcePriceText
      ? "Price must be a plain non-negative decimal with at most two fractional digits and a safe minor-unit value."
      : "Price is required.");
  } else if ((typeof price !== "number" && typeof price !== "string") ||
      (typeof price === "number" && !Number.isFinite(price)) ||
      parseMoneyMinorUnits(sourcePriceText) === null || Number(sourcePriceText) !== Number(price)) {
    errors.push("Price must be a plain non-negative decimal with at most two fractional digits and a safe minor-unit value.");
  }
  return errors;
}

export function canApproveMenuItem(item) {
  return validateMenuItem(item).length === 0;
}

function parseCsvRows(input) {
  if (typeof input !== "string") throw new TypeError("CSV input must be text.");
  if (input.length > MAX_MENU_CSV_BYTES || new TextEncoder().encode(input).byteLength > MAX_MENU_CSV_BYTES) {
    throw new Error("CSV exceeds the 2 MiB file-size limit.");
  }
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const current = text[i];
    const next = text[i + 1];
    if (current === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (current === '"') {
      quoted = !quoted;
    } else if (current === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((current === "\n" || current === "\r") && !quoted) {
      if (current === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += current;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell);
  if (row.some(value => value.trim() !== "")) rows.push(row);
  return rows;
}

export function parseMenuCsv(input) {
  const rows = parseCsvRows(input);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one menu item.");
  if (rows.length - 1 > MAX_MENU_ROWS) throw new Error("CSV exceeds the 10,000-row limit.");

  const headers = rows[0].map(value => value.trim().toLowerCase());
  if (headers.length > MAX_MENU_COLUMNS) throw new Error("CSV exceeds the 50-column limit.");
  if (headers.some(header => !header)) throw new Error("CSV contains an empty header.");
  if (new Set(headers).size !== headers.length) throw new Error("CSV contains duplicate headers.");
  const indexOf = name => headers.indexOf(name);
  if (indexOf("name") < 0 || indexOf("price") < 0) {
    throw new Error("CSV needs at least the columns: name, price.");
  }

  return rows.slice(1).map((row, index) => {
    if (row.length !== headers.length) {
      throw new Error("CSV row " + (index + 2) + " has " + row.length + " cells; expected " + headers.length + ".");
    }
    const value = name => {
      const column = indexOf(name);
      return column >= 0 ? String(row[column] ?? "") : "";
    };
    const name = value("name").trim();
    const sourcePriceText = value("price").trim();
    const parsedMinor = sourcePriceText === "" ? null : parseMoneyMinorUnits(sourcePriceText);
    const price = parsedMinor === null ? null : sourcePriceText;
    const item = {
      name,
      description: value("description").trim(),
      category: value("category").trim(),
      price,
      priceMinor: parsedMinor,
      sourceRow: index + 2,
      sourcePriceText,
      approved: false
    };
    item.validationErrors = validateMenuItem(item);
    return item;
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  const safeText = /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + safeText.replace(/"/g, '""') + '"';
}

export function reviewedMenuToCsv(items) {
  const fields = ["name", "description", "category", "price", "approved", "validationErrors", "sourceRow"];
  const rows = items.map(item => fields.map(field => {
    if (field === "price") {
      const raw = typeof item.sourcePriceText === "string" && item.sourcePriceText.trim() !== ""
        ? item.sourcePriceText
        : item.price;
      return csvCell(raw);
    }
    if (field === "validationErrors") return csvCell(validateMenuItem(item).join("; "));
    return csvCell(item[field]);
  }).join(","));
  return [fields.join(","), ...rows].join("\r\n") + "\r\n";
}

export function buildReviewDraft({ site = {}, items = [], sourceType = "sample-or-manual-entry" } = {}) {
  const reviewedItems = items.map(item => {
    const validationErrors = validateMenuItem(item);
    const sourcePriceText = typeof item?.sourcePriceText === "string" && item.sourcePriceText.trim() !== ""
      ? item.sourcePriceText.trim()
      : (item?.price === null || item?.price === undefined ? "" : String(item.price));
    const priceMinor = parseMoneyMinorUnits(sourcePriceText);
    const approved = Boolean(item.approved) && validationErrors.length === 0;
    return { ...item, priceMinor, approved, approvedByMerchant: approved, validationErrors };
  });

  return {
    schema: "mathara-website-to-ordering-draft-v1",
    brand: "Mathara Digitals",
    createdAt: new Date().toISOString(),
    mode: "browser-prototype",
    status: "review-draft-only",
    publishable: false,
    site: {
      publicUrl: String(site.publicUrl ?? ""),
      merchantName: String(site.merchantName ?? "").trim(),
      currency: String(site.currency ?? "KES"),
      timezone: String(site.timezone ?? "").trim(),
      openingHours: String(site.openingHours ?? "").trim(),
      deliveryNotes: String(site.deliveryNotes ?? "").trim()
    },
    source: {
      type: sourceType,
      networkFetchPerformed: false,
      sourceUrlIsReferenceOnly: true
    },
    reviewScope: {
      itemName: "reviewed per item",
      itemPrice: "reviewed per item; invalid or missing values block item approval",
      categoryAndDescription: "editable merchant-supplied fields",
      optionsAndModifiers: "not captured by this prototype; separate confirmation required",
      taxRules: "not captured by this prototype; separate confirmation required",
      deliveryAreas: "free-text note only; no delivery-zone validation",
      availability: "not verified by this prototype",
      imageRights: "not captured; no source image is imported or published"
    },
    items: reviewedItems,
    summary: {
      itemCount: reviewedItems.length,
      approvedItemCount: reviewedItems.filter(item => item.approved).length,
      itemsNeedingInput: reviewedItems.filter(item => item.validationErrors.length > 0).length
    },
    integration: {
      connected: false,
      merchantAuthorizationRecorded: false,
      websiteModified: false,
      published: false
    },
    security: {
      passwordsCollected: false,
      paymentCredentialsCollected: false
    },
    nextSteps: [
      "Merchant confirms every item name and price.",
      "Merchant separately confirms options, modifiers, taxes, availability and delivery areas.",
      "Merchant confirms image ownership or usage rights before any image is used.",
      "Merchant separately authorizes an available integration.",
      "Run acceptance tests before production publishing."
    ]
  };
}