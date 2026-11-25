export function validateMenuItem(item) {
  const errors = [];
  const name = String(item?.name ?? "").trim();
  if (!name) errors.push("Item name is required.");
  const price = item?.price;
  if (price === null || price === undefined || price === "") {
    errors.push("Price is required.");
  } else if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    errors.push("Price must be a finite, non-negative number.");
  }
  return errors;
}

export function canApproveMenuItem(item) {
  return validateMenuItem(item).length === 0;
}

function parseCsvRows(input) {
  if (typeof input !== "string") throw new TypeError("CSV input must be text.");
  const text = input.replace(/^\\uFEFF/, "");
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
    } else if ((current === "\\n" || current === "\\r") && !quoted) {
      if (current === "\\r" && next === "\\n") i += 1;
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
  const headers = rows[0].map(value => value.trim().toLowerCase());
  const indexOf = name => headers.indexOf(name);
  if (indexOf("name") < 0 || indexOf("price") < 0) {
    throw new Error("CSV needs at least the columns: name, price.");
  }

  return rows.slice(1).map((row, index) => {
    const value = name => {
      const column = indexOf(name);
      return column >= 0 ? String(row[column] ?? "") : "";
    };
    const name = value("name").trim();
    const sourcePriceText = value("price").trim();
    let price = null;
    if (sourcePriceText !== "") {
      const parsed = Number(sourcePriceText);
      if (Number.isFinite(parsed) && parsed >= 0) price = parsed;
    }
    const item = {
      name,
      description: value("description").trim(),
      category: value("category").trim(),
      price,
      sourceRow: index + 2,
      sourcePriceText,
      approved: false
    };
    item.validationErrors = validateMenuItem(item);
    return item;
  });
}

export function buildReviewDraft({ site = {}, items = [], sourceType = "sample-or-manual-entry" } = {}) {
  const reviewedItems = items.map(item => {
    const validationErrors = validateMenuItem(item);
    const approved = Boolean(item.approved) && validationErrors.length === 0;
    return { ...item, approved, approvedByMerchant: approved, validationErrors };
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
