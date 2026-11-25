import { buildReviewDraft, canApproveMenuItem, parseMenuCsv, validateMenuItem } from "./draft-model.js";

const $ = id => document.getElementById(id);
let menuItems = [];

const sample = {
  name: "The Green Fork (Demo)",
  url: "https://example.com/green-fork",
  currency: "KES",
  timezone: "Africa/Nairobi",
  hours: "Mon–Sat 10:00–21:00",
  delivery: "Pickup available. Demo delivery radius: 5 km. All service details require merchant confirmation.",
  items: [
    { name: "Grilled Chicken Bowl", description: "Herb rice, grilled chicken, seasonal greens and house dressing.", category: "Bowls", price: 850, approved: false },
    { name: "Garden Falafel Wrap", description: "Crispy falafel, fresh vegetables and tahini yoghurt.", category: "Wraps", price: 620, approved: false },
    { name: "Mango Passion Juice", description: "Fresh mango and passion fruit blend.", category: "Drinks", price: 280, approved: false },
    { name: "Chocolate Brownie", description: "Warm chocolate brownie (demo item).", category: "Desserts", price: 350, approved: false }
  ]
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function validUrl() {
  const value = $("siteUrl").value.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function markStage(stage) {
  for (let i = 1; i <= 4; i += 1) {
    $("stage" + i).className = i < stage ? "done" : i === stage ? "active" : "";
  }
}

function itemStatus(item) {
  const errors = validateMenuItem(item);
  if (errors.length) return { label: "NEEDS INPUT", className: "pending", errors };
  if (item.approved) return { label: "ITEM REVIEWED", className: "approved", errors };
  return { label: "AWAITING REVIEW", className: "pending", errors };
}

function validationText(item) {
  const status = itemStatus(item);
  if (status.errors.length) return status.errors.join(" ");
  return "Name and price pass this prototype gate. Options, taxes, delivery areas, availability and image rights need separate confirmation.";
}

function updateCounts() {
  const approved = menuItems.filter(item => item.approved && canApproveMenuItem(item)).length;
  const needsInput = menuItems.filter(item => !canApproveMenuItem(item)).length;
  $("count").textContent = menuItems.length + " ITEMS · " + approved + " REVIEWED · " + needsInput + " NEED INPUT";
  $("exportJson").disabled = menuItems.length === 0;
  $("exportCsv").disabled = menuItems.length === 0;
}

function refreshItemCard(card, item) {
  const status = itemStatus(item);
  const badge = card.querySelector(".item-status");
  const checkbox = card.querySelector('[data-field="approved"]');
  const note = card.querySelector("[data-validation]");
  badge.textContent = status.label;
  badge.className = "item-status " + status.className;
  checkbox.disabled = status.errors.length > 0;
  checkbox.checked = Boolean(item.approved) && status.errors.length === 0;
  note.textContent = validationText(item);
}

function render() {
  const root = $("items");
  root.innerHTML = menuItems.length
    ? menuItems.map((item, index) => {
      const status = itemStatus(item);
      const approved = Boolean(item.approved) && status.errors.length === 0;
      if (!approved) item.approved = false;
      return '<article class="item" data-index="' + index + '">' +
        '<div class="itemhead"><strong>Item ' + String(index + 1).padStart(2, "0") + '</strong>' +
        '<span class="item-status ' + status.className + '">' + status.label + '</span></div>' +
        '<div class="itemgrid">' +
        '<input aria-label="Item name" data-field="name" value="' + esc(item.name) + '" placeholder="Item name">' +
        '<input aria-label="Category" data-field="category" value="' + esc(item.category) + '" placeholder="Category">' +
        '<input aria-label="Price" data-field="price" type="number" min="0" step=".01" value="' + esc(item.price ?? "") + '" placeholder="Price">' +
        '</div>' +
        '<textarea aria-label="Item description" data-field="description" placeholder="Description">' + esc(item.description) + '</textarea>' +
        '<small data-validation style="display:block;margin-top:8px;color:' + (status.errors.length ? '#f4c879' : '#9aabc6') + ';font-size:.68rem;line-height:1.5">' + esc(validationText(item)) + '</small>' +
        '<div class="itemhead" style="margin-top:8px">' +
        '<label class="toggle"><input type="checkbox" data-field="approved" ' + (approved ? "checked" : "") + (status.errors.length ? " disabled" : "") + '> Confirm item review</label>' +
        '<button class="btn ghost" data-remove="' + index + '" style="padding:6px 9px">Remove</button>' +
        '</div></article>';
    }).join("")
    : '<div class="empty">No menu items. Import a CSV, add an item, or load the synthetic sample venue.</div>';

  root.querySelectorAll("[data-field]").forEach(element => {
    const field = element.dataset.field;
    element.addEventListener(field === "approved" ? "change" : "input", event => {
      const card = event.target.closest("[data-index]");
      const item = menuItems[Number(card.dataset.index)];

      if (field === "approved") {
        if (event.target.checked && !canApproveMenuItem(item)) {
          item.approved = false;
          event.target.checked = false;
        } else {
          item.approved = event.target.checked;
        }
        render();
        return;
      }

      if (field === "price") {
        const raw = event.target.value.trim();
        item.price = raw === "" ? null : Number(raw);
      } else {
        item[field] = event.target.value;
      }
      item.approved = false;
      refreshItemCard(card, item);
      updateCounts();
    });
  });

  root.querySelectorAll("[data-remove]").forEach(element => {
    element.addEventListener("click", () => {
      menuItems.splice(Number(element.dataset.remove), 1);
      render();
    });
  });

  updateCounts();
  markStage(menuItems.some(item => item.approved && canApproveMenuItem(item)) ? 3 : menuItems.length ? 2 : 1);
}

function loadSample() {
  $("siteUrl").value = sample.url;
  $("merchantName").value = sample.name;
  $("currency").value = sample.currency;
  $("timezone").value = sample.timezone;
  $("hours").value = sample.hours;
  $("delivery").value = sample.delivery;
  menuItems = sample.items.map(item => ({ ...item }));
  $("businessStatus").textContent = "Synthetic demo profile loaded. No external website was accessed.";
  $("reviewStatus").textContent = "Review and edit the sample menu. Each item starts unapproved.";
  render();
}

function clearDraft() {
  ["siteUrl", "merchantName", "hours", "delivery"].forEach(id => { $(id).value = ""; });
  $("csvFile").value = "";
  $("currency").value = "KES";
  $("timezone").value = "Africa/Nairobi";
  menuItems = [];
  $("businessStatus").textContent = "Draft cleared in this browser session.";
  $("reviewStatus").textContent = "No file was exported or published.";
  $("previewBox").classList.add("hidden");
  render();
}

function addItem() {
  menuItems.push({ name: "", description: "", category: "", price: null, approved: false });
  render();
}

function download(name, content, type) {
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type }));
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function draftData() {
  const fileSelected = $("csvFile").files.length > 0;
  return buildReviewDraft({
    site: {
      publicUrl: validUrl(),
      merchantName: $("merchantName").value,
      currency: $("currency").value,
      timezone: $("timezone").value,
      openingHours: $("hours").value,
      deliveryNotes: $("delivery").value
    },
    items: menuItems,
    sourceType: fileSelected ? "merchant-supplied-csv-or-edited-browser-data" : "sample-or-manual-entry"
  });
}

function csvCell(value) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

$("sample").addEventListener("click", loadSample);
$("clear").addEventListener("click", clearDraft);
$("addItem").addEventListener("click", addItem);

$("import").addEventListener("click", async () => {
  const file = $("csvFile").files[0];
  if (!file) {
    $("businessStatus").textContent = "Choose a CSV file first.";
    return;
  }
  try {
    menuItems = parseMenuCsv(await file.text());
    const needsInput = menuItems.filter(item => !canApproveMenuItem(item)).length;
    $("businessStatus").textContent = "Imported " + menuItems.length + " rows locally. " + needsInput + " need input or correction; no website was fetched.";
    $("reviewStatus").textContent = "Every imported row remains unapproved. Missing or invalid names/prices are retained and flagged, not silently discarded.";
    render();
  } catch (error) {
    $("businessStatus").textContent = error.message;
  }
});

$("exportJson").addEventListener("click", () => {
  const draft = draftData();
  download("mathara-onboarding-draft.json", JSON.stringify(draft, null, 2), "application/json");
  $("reviewStatus").textContent = "Review draft exported. " + draft.summary.approvedItemCount + " / " + draft.summary.itemCount + " items reviewed. No connection or publication occurred.";
  markStage(4);
});

$("exportCsv").addEventListener("click", () => {
  const fields = ["name", "description", "category", "price", "approved", "validationErrors", "sourceRow"];
  const csv = [
    fields.join(","),
    ...menuItems.map(item => fields.map(field => csvCell(
      field === "validationErrors" ? validateMenuItem(item).join("; ") : item[field]
    )).join(","))
  ].join("\n");
  download("mathara-reviewed-menu.csv", csv, "text/csv");
  $("reviewStatus").textContent = "Reviewed menu CSV exported; it is not published.";
});

$("preview").addEventListener("click", () => {
  const approved = menuItems.filter(item => item.approved && canApproveMenuItem(item));
  $("previewContent").innerHTML = approved.length
    ? approved.map(item =>
      '<div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #294363;padding:9px 0">' +
      '<div><b style="font-size:.8rem">' + esc(item.name) + '</b><div style="font-size:.68rem;color:#9aacc7">' + esc(item.description) + '</div></div>' +
      '<b style="color:#50dcec;font-size:.78rem">' + esc($("currency").value) + ' ' + Number(item.price).toFixed(2) + '</b></div>'
    ).join("")
    : '<p style="color:#9aacc7;font-size:.75rem">No complete, merchant-reviewed items yet. Complete the name and price, then confirm each item.</p>';
  $("previewBox").classList.remove("hidden");
});

$("closePreview").addEventListener("click", () => $("previewBox").classList.add("hidden"));

$("siteUrl").addEventListener("change", () => {
  $("businessStatus").textContent = validUrl()
    ? "HTTP(S) URL format accepted as a reference only. No network request, public reachability check or safety validation occurred."
    : "Enter a syntactically valid HTTP or HTTPS URL. No website request is made by this prototype.";
});

$("year").textContent = new Date().getFullYear();
render();
