# Mathara Digitals

Official company website and product catalogue for **Mathara Digitals**.

The site presents the company as a software and digital-systems studio focused on restaurant ordering, hospitality websites, business operations software and automation.

## Brand and product integrity

- Canonical public brand: **Mathara Digitals**.
- DevPortfolio Pro is a legacy identity. Existing Whop product names and customer entitlements are retained until the seller account is correctly authenticated and a separate product-level review is approved.
- The catalogue intentionally separates prepared resources, existing listings requiring verification, and systems still under development.
- No live checkout or automated provisioning is advertised until the correct seller account, payment webhooks, production database, tenant isolation and end-to-end delivery checks are verified.
- The Restaurant Website-to-Ordering Bridge is a planned onboarding workflow. A public URL may create a draft only; the merchant reviews and approves the extracted information and separately authorizes the chosen site integration. No website password is required or collected.

## Run locally

Open `index.html` in a browser.

## Deploy

The repository uses GitHub Actions in `.github/workflows/deploy-pages.yml`. Configure GitHub Pages to use **GitHub Actions** under **Settings → Pages**.

## Core project links

- Restaurant Ordering Platform: https://github.com/matharabrian70-ux/restaurant-ordering-platform
- Restaurant Business AI: https://github.com/matharabrian70-ux/restaurant-business-ai
- Hospitality website demo: https://matharabrian70-ux.github.io/hotel-website-demo/

## Status note

The website catalogue is a marketing and product-status surface. A product card does not by itself prove the product is publicly purchasable or production-ready. Update each product's status only when verified evidence exists.

## Browser prototypes

- Website-to-Ordering Bridge: `demos/website-to-ordering-bridge/` — browser-only merchant onboarding prototype. It captures a public URL as a reference, accepts merchant-provided menu CSV, supports edits and per-item approval, and exports a JSON/CSV draft. It does not fetch the website, connect an account, publish or change the merchant's site.
- Menu Engineering Workbench: `demos/menu-engineering-workbench/` — browser-only menu contribution calculator with sales volume and relative menu categories.

Both demos are prototypes, not production SaaS services or live Whop products. They do not have a backend, login, shared data storage, billing or automated provisioning.
