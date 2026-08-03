# <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shopping-cart.svg" width="32" height="32" /> OZO - Hyper-Local Instant Grocery Delivery Platform

<div align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.4.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-2.39.0-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4.0-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Zustand-4.4.7-orange?style=for-the-badge" alt="Zustand" />
  <img src="https://img.shields.io/badge/Flask-3.0-blue?style=for-the-badge&logo=flask&logoColor=white" alt="Flask" />
</div>

<div align="center">
  <h3><img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/rocket.svg" width="24" height="24" /> India's Lightning-Fast Grocery Delivery Ecosystem — 10 to 30 Minute Delivery</h3>
  <p>Built using React, Supabase Realtime DB, Vercel Serverless APIs, and a custom Local Catalog Image Enrichment Engine.</p>
</div>

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sparkles.svg" width="24" height="24" /> Project Overview

OZO is a hyper-local, high-concurrency grocery delivery ecosystem designed for microsecond synchronization, robust database-level security rules (RLS), and custom catalog-building utilities. Drawing inspiration from leaders like Zepto and Instamart, OZO implements a full-fledged platform supporting four distinct roles, automated rider payouts, geofenced address serviceability checks, automated price indexers, and a server-side crawler layout renderer for maximized SEO performance.

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/users.svg" width="24" height="24" /> Multi-Role Platform Ecosystem

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shopping-bag.svg" width="20" height="20" /> 1. Customer Experience
* **Instant Delivery Windows**: Rapid delivery estimation optimized by distance calculations.
* **Multilingual Localization**: Instant client-side localization toggles supporting English, Hindi, Tamil, Telugu, and Kannada.
* **Geofenced Address Map Picker**: Leaflet-based map pin selector checking delivery range against active store coordinates (Haversine calculations).
* **Cart & Wishlist Engine**: Client-side Zustand stores with real-time stock sync, platform fees, and promotional coupon rules.
* **Dual-Payment Gateways**: Razorpay and Cashfree SDK integrations backed by secure Edge Function payment verification.
* **Referral & Delivery Credits**: Referral sharing pipeline granting free delivery credits to users with a minimum order limit.

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/store.svg" width="20" height="20" /> 2. Mart / Merchant Operator Dashboard
* **Self-Onboarding Pipeline**: Document validation and warehouse geolocation registration flow.
* **Live Orders Checklist**: Auto-updating order feed with interactive checkable items, preparing timer, and auditory chime notifications.
* **Dynamic Margins & Markup Control**: Automatically calculates user pricing based on customizable profit-margin rules (by product, category, or brand).
* **Instant Inventory Toggles**: Mark products in/out of stock or update quantities directly with instant client reflection.

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/truck.svg" width="20" height="20" /> 3. Delivery Captain Terminal
* **Rider Application Verification**: File upload validation (Aadhar, Driver's License, Selfie) with client-side magic number byte headers check to block malicious archives or fake extensions.
* **Active Radar Feed**: Map-based radar showing packed orders awaiting pickup in the rider's immediate zone.
* **Distance-Based Payouts**: Automated calculation of earnings using the Haversine formula based on warehouse-to-customer coordinate distance.
* **Rider Route Simulator**: In-app GPS simulator allowing testing of coordinates updates along real routes.

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg" width="20" height="20" /> 4. Admin Control Panel
* **Live Revenue Analytics**: Advanced tracking of active orders, GMV, and mart profit vs. admin margins.
* **System Catalogs Manager**: Direct UI management for products, categories, coupons, and operating cities.
* **SQL Query Console**: Interactive browser console for administrative query execution directly on Supabase.
* **SEO & Sitelinks Control**: Visual dashboard for monitoring indexing requests, search engine crawlers, and sitemaps.

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/folder-tree.svg" width="24" height="24" /> Directory Structure

```
ozo-grocery-app/
├── api/                       # Serverless Functions (Vercel)
│   ├── cron/                  # Scheduled Serverless Cron Jobs
│   │   └── order-manager.ts   # Stuck/expired order manager
│   ├── _ratelimit.ts          # API-level rate-limiting helper
│   ├── _supabase.ts           # Vercel-side Supabase client
│   ├── geocode.ts             # Coordinates reverse geocoding API
│   ├── image.ts               # Dynamic ImageKit URL proxy & signer
│   ├── index-product.ts       # Product crawl & search indexing API
│   ├── indexnow-key.ts        # Search engine IndexNow verification keys
│   ├── mandi-sync.ts          # Daily mandi fresh vegetable & fruits price synchronization
│   ├── proxy.ts               # Cloudflare proxy controller to bypass client limitations
│   ├── render-seo.ts          # Server-side HTML renderer for crawlers/spiders
│   ├── search-image.ts        # Image resolver crawl backend
│   └── sitemap.ts             # Dynamic XML sitemap generator (City, Product, Static)
├── image_tool/                # OzoMartImageTool Local Desktop Assistant (Flask)
│   ├── app.py                 # Flask server exposing catalog crawler endpoints
│   ├── cache.py               # Local positive/negative barcode search caching
│   ├── config.py              # Port and credentials registry
│   ├── requirements.txt       # Python environment dependencies
│   ├── searcher.py            # Image crawling resolver (JioMart, DuckDuckGo, Amazon)
│   ├── supabase_client.py     # Local DB sync client
│   ├── templates/             # Local desktop dashboard layout HTML
│   └── uploader.py            # Downloader & ImgBB/ImageKit CDN uploader
├── src/                       # React Frontend Application
│   ├── assets/                # CSS templates, images, and visual elements
│   ├── components/            # Reusable UI components
│   │   ├── admin/             # Admin widgets, tables, indicators
│   │   ├── mart/              # Mart checklists, importing layouts
│   │   ├── AddressForm.jsx
│   │   ├── CashfreeShield.jsx
│   │   ├── LocationPicker.jsx
│   │   ├── OzoSplashScreen.jsx
│   │   ├── RazorpayShield.jsx
│   │   └── SEO.jsx            # Dynamic meta tags manager
│   ├── layouts/               # Page layouts (Admin, Captain, Main)
│   ├── lib/                   # Integrations & client wrappers
│   │   ├── addressHelpers.js
│   │   ├── geocoding.js
│   │   └── supabase.js        # Dual-URL client configuration
│   ├── pages/                 # Routing views
│   │   ├── admin/             # Admin console views
│   │   ├── captain/           # Captain onboarding and active radar
│   │   ├── mart/              # Mart dashboard, profiles, bulk imports
│   │   ├── Checkout.jsx
│   │   ├── Home.jsx
│   │   ├── PhoneCapture.jsx   # QR-code mobile webcam capture flow
│   │   └── ProductDetail.jsx
│   ├── stores/                # Zustand global state stores
│   └── utils/                 # Utilities (Image optimization, OneSignal setup)
├── supabase/                  # Database Schema, Functions & Migrations
│   ├── functions/             # Deno Edge Functions
│   │   ├── cashfree-payment/
│   │   ├── imagekit-auth/
│   │   ├── send-push-notification/
│   │   └── verify-razorpay-payment/
│   └── migrations/            # Versioned SQL schema changes
├── index.html                 # Main Entrypoint Template
├── package.json               # Node Dependencies and Scripts
├── tailwind.config.js         # Tailwind layout configuration
└── vite.config.js             # Bundler build configuration
```

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/cpu.svg" width="24" height="24" /> Core Technical Systems

### 1. Catalog Image Enrichment Pipeline
To ensure high-quality product images without tedious manual entry, OZO employs a dual-channel Catalog Enrichment Engine:

* **Mobile QR-Code Webcam Link (`PhoneCapture.jsx`)**:
  Desktop operators who do not have high-quality webcams can generate an ephemeral QR-code session. Scanning this code on a mobile device establishes a real-time WebSocket connection to the capture session in Supabase. The operator can use their mobile camera to snap:
  1. **Front View** (Name/Brand)
  2. **Back View** (Ingredients/Label)
  3. **MRP & Barcode Block**
  
  The images bypass the client disk, analyze binary headers to confirm format safety, upload directly to the CDN, and trigger real-time updates on the desktop operator's screen via Supabase Realtime channels.

* **Local Image Search Assistant (`OzoMartImageTool`)**:
  A local Python desktop application running Flask that automates barcode image enrichment. It takes files of missing images, scrapes search engines (DuckDuckGo, Amazon, JioMart), handles request pacing to prevent rate limits, downloads, uploads to the ImgBB CDN, and updates the database catalog.

### 2. Intelligent Database-Level Security & Triggers
OZO enforces security and consistency directly inside PostgreSQL:
* **Session Limit Trigger**: Restricts concurrent active logins. Logs in a new device automatically drop and revoke older tokens at the database level.
* **Proximity Routing Rules**: Haversine distance calculations check order routing coordinates against merchant locations to assign deliveries dynamically.
* **Mart Margin Rules Trigger**: Calculates target selling prices by applying brand- or category-specific markup percentages to merchant base prices:
  $$\text{Customer Price} = \text{Mart Price} \times \left(1 + \frac{\text{Margin Percentage}}{100}\right)$$
  Enforces minimum markups in INR.
* **Catalog Synchronization Triggers**: Automatically updates products availability status and total stock counts based on real-time changes inside the `mart_inventory` tables.

### 3. Serverless API and Advanced SEO Optimization (Vercel)
* **SEO User-Agent Rewrite Proxy**: Incoming request headers are analyzed at the routing edge. Web crawlers (Googlebot, Bingbot, Yandex) are transparently redirected to `api/render-seo.ts` which serves static, server-side pre-rendered HTML layouts containing precise JSON-LD structured schema metadata. Real users receive the standard single-page app (SPA).
* **Mandi Synchronization**: A daily cron job (`api/mandi-sync.ts`) runs at 5 AM, crawling local market rates and adjusting base prices for vegetables and fresh farm items.
* **IndexNow Support**: Auto-submits newly added products or price updates to search engines using the IndexNow API with secure key verification.

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/book-open.svg" width="24" height="24" /> Project Documentation & Resources

For detailed installation instructions, architecture breakdown, and database migrations sequence, please refer to the following documents in the [docs/](./docs) directory:

* **[Architecture Audit & Review](./docs/architecture_audit_report.md)**: Deep technical review of components, database design, and scaling action plans.
* **[Developer Onboarding & Local Setup](./docs/onboarding_and_setup.md)**: Guide on configuring your local workspace, setting up Vite, running the local Flask scraper, and launching the application.
* **[Database Migrations Sequence](./docs/onboarding_and_setup.md#4-database-migration-execution)**: Step-by-step SQL scripts applying process and table setups.
* **[Troubleshooting Guide](./docs/troubleshooting.md)**: Standard resolutions for WebSockets issues, invalid file formats, and dashboard authorization redirects.

---


<div align="center">
  <h3>Made with <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/heart.svg" width="20" height="20" /> by the OZO Team</h3>
</div>