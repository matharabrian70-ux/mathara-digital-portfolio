# Website-to-Ordering Bridge — prototype

This is a browser-only onboarding prototype for **Mathara Digitals**.

## Included workflow

- Capture a public website URL as a reference only. The prototype makes no network request and does not verify public reachability.
- Enter merchant-confirmed business details.
- Import a merchant-supplied CSV with item name, price, description and category columns.
- Preserve incomplete rows and flag missing or invalid names/prices instead of silently dropping them.
- Edit menu items and approve each item only when its name and price pass the prototype's strict validation.
- Preview only complete, merchant-reviewed items.
- Export a review-draft JSON or a formula-mitigated CSV.

## Input safeguards

- Maximum CSV size: 2 MiB.
- Maximum data rows: 10,000.
- Maximum columns: 50.
- Empty or duplicate headers and inconsistent row widths are rejected.
- Prices must be plain non-negative decimal values with at most two fractional digits. Exponent notation, negative values, over-precision and unsafe minor-unit amounts are rejected. The draft includes an exact integer priceMinor value for safe downstream arithmetic; do not use binary floating-point price values for calculations.
- Imported rows with invalid values are retained for correction and remain unapproved.
- CSV export prefixes formula-like cells with an apostrophe to reduce spreadsheet formula-injection risk. Validate in the target spreadsheet application; this is not a universal guarantee.

## Explicit limitations

This prototype does not crawl or fetch a website, connect to a restaurant account, authenticate to a CMS/POS, publish a menu, process payment, provision a tenant or modify a merchant website.

The prototype only supports item name/price review. Options and modifiers, tax rules, delivery areas, availability and image rights are not fully captured or verified and require separate merchant confirmation before any production workflow.

No merchant passwords or payment credentials are requested or collected. Exported data is labelled review-draft-only and is not publishable.

## Local tests

Requirements: Node.js 22 or later and Python 3 (for the static local web server).

Run the pure validation tests:

- PowerShell on Windows: npm.cmd test
- Other shells: npm test

Serve the prototype locally so the ES modules load correctly:

~~~bash
python -m http.server 8000
~~~

Open http://localhost:8000 in a modern browser. The page imports app.js and draft-model.js as local ES modules.