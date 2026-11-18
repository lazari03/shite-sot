# MASTER PROMPT — SHITESOT

## ROLE

Act as a senior software architect, full-stack engineer, product designer, security engineer, and startup CTO.

Your task is to design and build **ShiteSot**, a modern, mobile-first marketplace initially targeting Albania, with the architecture necessary to expand internationally.

Do not build a generic classifieds website or a basic clone of MerrJep, Facebook Marketplace, or OLX.

The objective is to create a distinct marketplace built around **fast selling, daily bargains, fresh inventory, and direct buyer–seller communication**.

Build a real, functional product, not a static demonstration.

## 1. PRODUCT VISION

**Brand:** ShiteSot

**Initial market:** Albania

**Language:** Albanian by default, with English localization support.

**Currency:** Albanian Lek (ALL).

**Business model:** Free marketplace with optional paid listing promotions and professional seller tools.

**Long-term ambition:** Become a major Albanian commerce platform and eventually expand throughout the Balkans and Europe.

### Core positioning

**ShiteSot — Shite shpejt. Gjej lirë.**

ShiteSot is a marketplace where individuals and businesses can sell used or new products quickly.

Unlike traditional classifieds platforms, ShiteSot emphasizes freshness, urgency, real price reductions, and relevant notifications.

Buyers should have a reason to visit every day because new bargains appear continuously.

Sellers should be motivated to publish because the platform delivers relevant buyer attention.

### Product principles

- Free to browse and create ordinary listings.
- No account required for browsing.
- Fast listing creation, especially on mobile.
- Genuine products and reachable sellers.
- No fake inventory, artificial engagement, or misleading countdowns.
- Transparent paid promotions.
- Mobile-first performance.
- Privacy and security by design.
- Simple enough for non-technical users.

## 2. TARGET AUDIENCE

### Individual sellers

People selling phones, laptops, furniture, clothes, gaming consoles, appliances, bicycles, and other belongings.

### Professional sellers

Secondhand shops, electronics resellers, refurbished-device businesses, furniture stores, and small retailers.

### Buyers

People looking for bargains, secondhand products, urgent sales, and local deals.

Initially prioritize **used electronics in Tirana**, followed by Shkodër and other Albanian cities.

The architecture must support additional categories and locations without substantial rewrites.

## 3. CORE DIFFERENTIATION

ShiteSot is not just a place to publish advertisements.

It combines three concepts:

### A. Fresh marketplace

Listings have visible publication dates and availability status.

Individual sellers can optionally launch a genuine 48-hour urgent sale.

Ordinary listings should not automatically disappear after 48 hours.

### B. Daily bargains

A dedicated discovery section shows:

- Newly listed products.
- Genuine price reductions.
- Urgent sales.
- Products matching saved searches.
- Trending categories.

Never display fabricated discounts or manipulate original prices.

### C. Buyer-driven notifications

Users can save searches and receive alerts when relevant products appear or prices decrease.

For example:

A user saves:

"iPhone 13 Pro, under 35,000 lek, Tirana."

When a matching product is published, the system sends a relevant notification.

Avoid excessive or irrelevant alerts.

## 4. TECHNICAL ARCHITECTURE

First inspect the repository and existing infrastructure.

If the project is new, propose a simple, maintainable architecture.

### Preferred stack

- Next.js with TypeScript.
- React.
- Tailwind CSS.
- PostgreSQL.
- Prisma ORM.
- Object storage for product images.
- Secure authentication.
- Background jobs for scheduled tasks.
- Transactional email provider.
- PWA support.
- Docker for local development and optional self-hosting.

Use established libraries rather than unnecessarily implementing infrastructure from scratch.

The platform must be designed to scale without premature microservices.

### Important requirements

- Server-side input validation.
- Role-based access control.
- Database indexes for search and filtering.
- Image optimization and responsive delivery.
- Rate limiting.
- Anti-spam protections.
- Secure file uploads.
- Audit logs for administrative changes.
- Monitoring and error reporting.
- Automated tests and deployment checks.

Create development, staging, and production configuration boundaries.

Do not expose credentials or API keys in source code.

## 5. USER ACCOUNTS

Support three roles:

**Buyer:** Browse, save products, contact sellers, and create alerts.

**Seller:** Publish listings, manage inventory, communicate with buyers, and purchase promotions.

**Admin:** Moderate listings, manage users, review transactions, and monitor platform health.

A single user should be able to both buy and sell.

### Authentication

Use email authentication, with optional Google sign-in.

Phone verification can be introduced when necessary for trust or higher-risk actions.

Do not require registration merely to browse products.

## 6. PRODUCT LISTINGS

Each listing should support:

- Product title.
- Description.
- Category and subcategory.
- Price in ALL.
- City and approximate location.
- New or used condition.
- Multiple photographs.
- Seller identity and profile.
- Publication date.
- Availability status.
- Optional urgent-sale deadline.
- Price history.
- Product specifications where applicable.

### Listing creation

Design an extremely simple workflow:

1. Upload photographs.
2. Enter title and description.
3. Choose category and condition.
4. Set price and city.
5. Preview and publish.

Optimize for completion in under two minutes, where the seller has the necessary information ready.

### Listing states

- Draft.
- Pending review.
- Active.
- Reserved.
- Sold.
- Expired.
- Removed.

Allow sellers to mark products as sold.

Periodically request availability confirmation for stale listings.

## 7. PRODUCT IMPORT SYSTEM

This is one of the most important features for initial marketplace growth.

Professional sellers must be able to add many products without entering them individually.

### Supported imports

- CSV files.
- Excel spreadsheets.
- XML feeds.
- WooCommerce catalogs.
- Additional integrations in later phases.

### Import workflow

1. Seller uploads a file or connects an authorized catalog.
2. System detects the supported fields.
3. Seller maps any missing fields.
4. Platform validates the data.
5. Seller previews the products.
6. Seller confirms publication.
7. Listings appear in the marketplace.

Support product updates through stable external identifiers.

Prevent duplicate listings and unauthorized copying of third-party content.

Never scrape Facebook Marketplace, MerrJep, or other platforms without authorization.

### Inventory synchronization

For supported integrations, allow merchants to synchronize availability, prices and product details.

Products marked as sold in the merchant's source system should be updated accordingly.

## 8. SEARCH AND DISCOVERY

Search quality is central to the product.

Implement:

- Full-text product search.
- Category filters.
- City filters.
- Minimum and maximum price.
- Condition filters.
- Sorting by newest and price.
- Urgent-sale filter.
- Price-drop filter.
- Saved searches.
- Relevant recommendations.

Start with PostgreSQL full-text search and appropriate indexes.

Do not introduce expensive search infrastructure until traffic justifies it.

### Homepage

The homepage should prioritize useful, real inventory.

Suggested sections:

- Search bar.
- Categories.
- Newly listed.
- Price drops.
- Urgent sales.
- Recommended nearby items.
- Professional sellers.

Do not populate production with fake products.

Use clearly labeled demo data only in development and testing.

## 9. PRICE DROPS

Allow sellers to reduce listing prices.

Display a price-drop indicator only when there is a genuine recorded reduction.

Maintain price history so users can understand the change.

Example:

Original price: 25,000 lek.

Current price: 22,000 lek.

Price decrease: 3,000 lek.

Avoid artificially inflated reference prices.

Notify users who saved the listing or a matching search, subject to notification preferences.

## 10. URGENT SALES

Sellers can create genuine time-limited promotions.

Example:

"Shitet brenda 48 orëve."

The deadline must reflect the seller's selected availability period.

At the end of the period, remove the urgent-sale designation or move the listing into the appropriate state.

Do not fabricate scarcity or reset deadlines automatically to manipulate buyers.

## 11. BUYER–SELLER COMMUNICATION

For the MVP, allow buyers to contact sellers through WhatsApp or another seller-approved contact method.

Generate a prefilled message containing the product title and listing reference.

Example:

"Përshëndetje, jam i interesuar për produktin që keni publikuar në ShiteSot."

Do not expose private contact information without the seller's consent.

An internal messaging system can be added later.

### Future capabilities

- In-app messaging.
- Offer negotiation.
- Reservation requests.
- Seller response statistics.
- Transaction confirmations.

## 12. MONETIZATION

Do not charge buyers to browse.

Do not charge ordinary sellers to create their first listings.

Initially monetize visibility and professional selling tools.

### Proposed pricing

| Feature | Price |
|---|---:|
| Standard listing | Free |
| Boost for 24 hours | 100 lek |
| Featured listing for 48 hours | 300 lek |
| Urgent-sale promotion | 200 lek |
| Five-boost bundle | 500 lek |
| Professional seller plan | 2,000 lek/month |

All prices must be configurable through the admin dashboard.

### Paid promotion logic

Promotions must have clear start and expiration times.

A featured listing should receive additional visibility, but its placement must not destroy search relevance.

Paid placements must be labeled.

Never guarantee sales.

### Payments

Design a provider-independent payment architecture.

Research which payment providers support Albanian businesses before implementing checkout.

Do not assume Stripe is available in Albania.

Support:

- Payment initiation.
- Verified payment callbacks/webhooks.
- Payment history.
- Refund records.
- Promotion activation after confirmed payment.
- Idempotent transaction processing.

For very small purchases, consider prepaid promotion bundles to reduce payment-processing overhead.

Do not implement a transferable monetary wallet without reviewing the relevant regulatory requirements.

## 13. PROFESSIONAL SELLER DASHBOARD

Merchants should have access to:

- Bulk imports.
- Active listings.
- Sold listings.
- Product views.
- Contact clicks.
- Saved-listing counts.
- Promotions.
- Promotion costs.
- Inventory synchronization status.

Show genuine platform statistics.

Do not fabricate sales numbers.

Professional accounts can later gain additional features, including storefronts, staff permissions, and multiple inventory sources.

## 14. ADMIN DASHBOARD

Build a functional administration interface.

Include:

- Total users.
- Active buyers and sellers.
- Active listings.
- New listings per day.
- Listing reports.
- Moderation queue.
- Search activity.
- Product views.
- Seller contact clicks.
- Paid boosts.
- Gross platform revenue.
- Refunds.
- Import failures.
- Suspicious activity.

### Important marketplace metrics

Track:

- Daily active users.
- Weekly active users.
- New listings per day.
- Returning buyers.
- Saved searches.
- Buyer-to-seller contact rate.
- Time to first inquiry.
- Listing freshness.
- Paid promotion conversion.
- Repeat seller activity.

Do not claim that a product was sold merely because someone clicked the WhatsApp button.

## 15. SEO AND ORGANIC GROWTH

Marketplace pages should be search-engine friendly.

Implement:

- Server-rendered public listing pages.
- Unique titles and meta descriptions.
- Canonical URLs.
- Structured product data when applicable.
- XML sitemap generation.
- Category landing pages.
- City-specific discovery pages.
- Open Graph images.
- Fast mobile loading.

Do not index empty search combinations or duplicate filter pages.

Sold and expired listings require a deliberate SEO lifecycle strategy.

### Sharing

Each listing must have a shareable link.

Support WhatsApp, Messenger, Facebook and native browser sharing where available.

Generate useful previews containing the actual product photograph, title and price.

## 16. NOTIFICATIONS AND RETENTION

The marketplace must create reasons for users to return.

Implement:

- Saved-search alerts.
- Price-drop alerts.
- New matching listings.
- Listing expiration reminders.
- Seller inquiry notifications.
- Promotion expiration reminders.

Start with email and in-app notifications.

Web push notifications can follow if supported and appropriate.

Allow users to configure notification frequency and unsubscribe easily.

Use daily digests rather than excessive individual notifications when appropriate.

## 17. TRUST AND MARKETPLACE SAFETY

Design protections against:

- Fake listings.
- Duplicate products.
- Misleading descriptions.
- Counterfeit goods.
- Fraudulent sellers.
- Spam.
- Automated abuse.
- Suspicious price changes.

Implement reporting and moderation tools.

Avoid exposing exact residential addresses by default.

Introduce seller verification progressively, particularly for professional sellers.

Implement applicable privacy notices, data retention settings, account deletion, and consumer transparency requirements.

## 18. DESIGN SYSTEM

ShiteSot should feel like a modern European consumer marketplace, not a generic WordPress classifieds theme.

### Visual direction

- Mobile-first.
- Clean editorial layout.
- Strong product photography.
- Clear pricing.
- Compact product cards.
- Simple filters.
- Minimal friction.
- Accessible typography.
- Distinct Albanian brand identity.

Avoid excessive gradients, decorative animations, and visual clutter.

Prioritize browsing speed and product visibility.

### Mobile navigation

Use a compact navigation structure:

- Home.
- Search.
- Sell.
- Saved.
- Profile.

Make the Sell action prominent.

### Main pages

- Homepage.
- Search results.
- Category pages.
- Product detail.
- Create listing.
- Saved listings.
- Saved searches.
- Seller profile.
- Seller dashboard.
- Import inventory.
- Pricing and promotions.
- Login and registration.
- Admin dashboard.
- Legal and support pages.

All interfaces must work well on phones.

## 19. INITIAL MARKETPLACE STRATEGY

Do not launch across every Albanian category immediately.

### Phase 1 — Tirana electronics

Start with used phones, laptops, gaming consoles, and related electronics.

Target 300–500 genuine listings from verified or reachable sellers.

### Phase 2 — Expand geographically

Add Shkodër, Durrës, Vlorë, Elbasan, and other cities based on actual activity.

### Phase 3 — Expand categories

Introduce furniture, appliances, bicycles, clothing, and other categories where there is demonstrated demand.

### Phase 4 — Merchant integrations

Add additional storefront integrations and inventory tools.

### Phase 5 — Marketplace infrastructure

Consider integrated delivery, buyer protection, payments, seller storefronts, and cross-border expansion once there is sufficient transaction volume.

## 20. DEVELOPMENT PHASES

### MVP — Build first

Prioritize:

1. Authentication.
2. Seller profiles.
3. Product listing creation.
4. Image uploads.
5. Product search and filters.
6. Product detail pages.
7. WhatsApp contact.
8. Saved listings.
9. Price-drop tracking.
10. Basic administration.
11. SEO and social sharing.
12. Analytics.
13. CSV/Excel inventory imports.

This version should be usable without a payment provider.

### Phase 2 — Engagement

Add saved-search alerts, urgent sales, listing freshness confirmation, and product recommendations.

### Phase 3 — Monetization

Implement paid boosts, featured listings, seller bundles, secure payments, and promotion reporting.

### Phase 4 — Merchant tools

Add WooCommerce synchronization, professional storefronts, staff accounts, and advanced inventory management.

### Phase 5 — Expansion

Introduce additional markets, currencies, categories, logistics integrations, and transaction services.

## 21. BUILD QUALITY

Do not create placeholder buttons that appear functional.

Do not hardcode fake marketplace statistics.

Do not create fake seller accounts or production listings.

Ensure that every implemented feature works end-to-end.

Add automated tests covering critical workflows.

At minimum, test:

- Registration and authentication.
- Listing creation and editing.
- Upload validation.
- Search filtering.
- Seller permissions.
- Import validation.
- Duplicate prevention.
- Sold and expired states.
- Price-drop calculations.
- Promotion expiration.
- Payment webhook idempotency when payments are introduced.
- Abuse and rate-limit protections.

Run linting, type checking, tests, and production build before deployment.

## 22. EXECUTION INSTRUCTIONS

Before implementation:

1. Inspect the repository and determine whether a project already exists.
2. Identify reusable components and infrastructure.
3. Produce a concise architecture and implementation plan.
4. Define database tables, relationships, and indexes.
5. Identify the simplest production-ready deployment approach.
6. Implement the MVP in logical, testable stages.
7. Validate every major user flow.
8. Document environment variables and deployment procedures.
9. Avoid unnecessary dependencies and architectural complexity.
10. Record unfinished work and any external setup requirements.

Do not spend time building advanced features before the basic buyer–seller marketplace works.

Prioritize functional quality, marketplace usability, security, and performance over decorative complexity.

## 23. PRODUCT SUCCESS CRITERIA

The initial goal is not thousands of accounts.

The first milestone is proving that ShiteSot can connect genuine buyers and sellers.

Track these initial targets:

- 300 genuine active listings.
- 30 active sellers.
- 100 daily unique visitors.
- At least 20% of listings receiving a genuine buyer inquiry within seven days.
- Returning visitors using saved searches and price alerts.
- Initial repeat seller activity.

These are validation targets, not guaranteed business results.

Do not activate widespread paid promotions until there is evidence sellers receive meaningful buyer attention.

## FINAL OBJECTIVE

Build ShiteSot as a functional, secure, fast, mobile-first marketplace that can begin in Albania and gradually expand into a larger European commerce platform.

The business should grow through real listings, recurring buyer visits, sharing, search discovery, and optional paid visibility.

**The priority is marketplace liquidity and buyer satisfaction, not feature count.**

Start by inspecting the existing project and implementing the smallest functional marketplace capable of attracting genuine sellers and buyers.