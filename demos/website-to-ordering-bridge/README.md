# Website-to-Ordering Bridge — prototype
This is a browser-only onboarding prototype for Mathara Digitals.

Features:
- Capture public website URL as a reference (the prototype makes no fetch request).
- Enter merchant-confirmed details.
- Import a CSV with name, price, description and category columns.
- Edit menu items and mark them approved individually.
- Preview approved items.
- Export a review-draft JSON and CSV.

Safety boundary: it does not crawl websites, authenticate to restaurant systems, connect a CMS/POS, publish a menu, process payment or modify a merchant website. A production version needs a permitted public-site discovery service, source evidence per extracted item, explicit merchant approval, a supported authorized integration, secure tenant isolation, payment/webhook checks and acceptance tests. It does not collect merchant passwords or payment keys.
