# Website-to-Ordering Bridge — prototype

This is a browser-only onboarding prototype for **Mathara Digitals**.

## Included workflow

- Capture a public website URL as a reference only. The prototype makes no network request and does not verify public reachability.
- Enter merchant-confirmed business details.
- Import a merchant-supplied CSV with item name, price, description and category columns.
- Preserve incomplete rows and flag missing or invalid names/prices instead of silently dropping them.
- Edit menu items and approve each item only when its name and non-negative numeric price are present.
- Preview only complete, merchant-reviewed items.
- Export a review-draft JSON or CSV.

## Explicit limitations

This prototype does not crawl or fetch a website, connect to a restaurant account, authenticate to a CMS/POS, publish a menu, process payment, provision a tenant or modify a merchant website.

The prototype only supports item name/price review. Options and modifiers, tax rules, delivery areas, availability and image rights are not fully captured or verified and require separate merchant confirmation before any production workflow.

No merchant passwords or payment credentials are requested or collected. Exported data is labelled \`review-draft-only\` and is not publishable.

## Local tests

Run the pure validation tests with Node.js:

    node --test draft-model.test.mjs

Open \`index.html\` in a modern browser to try the prototype. The HTML imports \`app.js\` and \`draft-model.js\` as local ES modules.
