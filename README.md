# <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shopping-cart.svg" width="32" height="32" /> OZO - Lightning Fast Grocery Delivery App

<div align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.4.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-2.39.0-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4.0-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Zustand-4.4.7-orange?style=for-the-badge" alt="Zustand" />
</div>

<div align="center">
  <h3><img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/rocket.svg" width="24" height="24" /> India's Lightning-Fast Grocery Delivery Application - 30-Minute Delivery Guaranteed</h3>
  <p>Built with <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/heart.svg" width="16" height="16" /> using React, Supabase, and modern performance-optimized web architectures</p>
</div>

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sparkles.svg" width="24" height="24" /> Project Overview

OZO is a hyper-local grocery delivery platform designed for high concurrency, microsecond synchronization, and robust security. Drawing inspiration from industry leaders like Zepto and Instamart, OZO implements a full-fledged ecosystem supporting four distinct user roles, automated delivery payouts, geofenced address serviceability checks, serverless API optimizations, and custom database-level security rules.

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/users.svg" width="24" height="24" /> Multi-Role Platform Ecosystem

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shopping-bag.svg" width="20" height="20" /> Customer Interface
- **30-Minute Magic**: Rapid delivery window processing optimized by distance calculations.
- **Multilingual Support**: Fully localized in English, Hindi, Tamil, Telugu, and Kannada with instant translation toggling.
- **Dynamic Address geofencing**: Leaflet-based interactive map picker checking delivery range against active merchant warehouses.
- **Cart & Wishlist Systems**: Real-time quantity controls, coupon eligibility, and catalog caching.
- **Payment Verification**: Razorpay integration backed by secure serverless verification rules.
- **Live Notifications**: Toast notifications and alert sounds triggered by database changes.

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/store.svg" width="20" height="20" /> Merchant / Mart Partner Dashboard
- **Onboarding Pipeline**: Seamless application submission for local grocery merchants.
- **Live Orders Checklist**: Order incoming feed with item checklists, prep time status updates, and audio chimes.
- **Inventory Control**: Instantly mark products in/out of stock and modify prices live.
- **Real-time Synchronization**: Supabase Postgres channel subscriptions ensuring zero delay on incoming orders.

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/truck.svg" width="20" height="20" /> Delivery Captain Terminal
- **Rider Onboarding**: Document upload (Aadhar, Driver's License, Selfie) with secure image uploads.
- **Active Radar Feed**: Map-based listing of packed orders waiting for pickup.
- **Distance-Based Payouts**: Automated calculation of earnings using the Haversine formula based on warehouse-to-customer distance.
- **Duty Toggle**: Quick online/offline status updates modifying dispatch radar availability.
- **Location Simulation**: GPS coordinates update system simulating driver paths in real-time.

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg" width="20" height="20" /> Admin Control Center
- **Analytics & Insights**: Performance statistics, revenue tracking, and active order counts.
- **System Catalogs**: Full GUI management for products, categories, cities, and promotional coupons.
- **Application Verification**: Panel to review and verify merchant and captain onboarding requests.
- **Interactive SQL Console**: Direct query execution dashboard for administrative database management.
- **SEO & Sitelinks Control**: Visual dashboard for monitoring indexing requests and sitemap generations.

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/server.svg" width="24" height="24" /> Technical Architecture

```
                                  +-----------------------+
                                  |    Customer Page /    |
                                  |    Admin Dashboard /  |
                                  |  Captain Terminal    |
                                  +-----------+-----------+
                                              |
                     +------------------------+------------------------+
                     | (REST / Auth)                                   | (Realtime WSS)
                     v                                                 v
        +------------+------------+                       +------------+------------+
        |     Cloudflare Proxy    |                       |      Direct Supabase    |
        +------------+------------+                       +------------+------------+
                     |                                                 |
                     +------------------------+------------------------+
                                              |
                                              v
                                  +-----------------------+
                                  |   Supabase Database   |
                                  +-----------------------+
```

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/activity.svg" width="20" height="20" /> Dual-URL Client Configuration
To prevent latency bottlenecks and protect key functions, OZO uses a dual-URL architecture:
1. **REST API & Authentication (`VITE_SUPABASE_URL`)**: Requests are routed through a Cloudflare Proxy to handle rate-limiting and shield against DDoS.
2. **Real-time WebSockets (`VITE_SUPABASE_DIRECT_URL`)**: Subscriptions bypass the proxy and establish a direct connection to Supabase WebSockets. This prevents proxy timeouts during long-lived connections.

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/file-warning.svg" width="20" height="20" /> Upload Security & Validation
Image uploads are protected against DDoS and malicious file attachments (e.g. zip bomb files or renamed extensions):
- **Magic Number Verification**: Files are evaluated by reading binary headers (`Uint8Array`) on the client before upload.
- **Allowed Formats**: White-listed to PNG (`89504E47`), JPEG (`FFD8FF`), WEBP (`52494646`), and PDF (`25504446`). All compressed archive formats are blocked.

### <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/key-round.svg" width="20" height="20" /> Session Limit Trigger
To secure user accounts, a database trigger restricts the number of concurrent active sessions:
- **Maximum Sessions**: Enforced on the database level.
- **Revocation**: Automatically terminates older active tokens on new logins, keeping authentication scopes clean.

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/folder-tree.svg" width="24" height="24" /> Directory Structure

```
ozo-grocery-app/
├── api/                   # Serverless Functions (Vercel)
│   ├── _supabase.ts       # Backend Supabase client
│   ├── geocode.ts         # Coordinates-to-address geocoding api
│   ├── index-product.ts   # Product indexing API
│   ├── indexnow-key.ts    # Verification key endpoint for search engines
│   ├── render-seo.ts      # Server-side crawler layout renderer
│   └── sitemap-static.ts  # Sitemap generation scripts
├── src/                   # React Frontend App
│   ├── assets/            # CSS, images, and visual components
│   ├── components/        # Reusable components
│   │   ├── admin/         # Admin bulk controls & settings components
│   │   ├── AddressForm.jsx
│   │   ├── LocationPicker.jsx
│   │   ├── OzoSplashScreen.jsx
│   │   └── RazorpayShield.jsx
│   ├── layouts/           # Page structural layouts
│   │   ├── AdminLayout.jsx
│   │   ├── CaptainLayout.jsx
│   │   └── MainLayout.jsx
│   ├── lib/               # Lib modules & API wrappers
│   │   ├── geocoding.js
│   │   └── supabase.js    # Dual-URL client & storage managers
│   ├── pages/             # Route views
│   │   ├── admin/         # Admin CRUD, settings, and SQL views
│   │   ├── captain/       # Captain onboarding, dashboard, & radar
│   │   ├── mart/          # Mart onboarding and live checklist
│   │   ├── Home.jsx
│   │   ├── ProductDetail.jsx
│   │   └── Checkout.jsx
│   ├── stores/            # Zustand global state stores
│   │   ├── authStore.js
│   │   ├── captainStore.js
│   │   ├── cartStore.js
│   │   ├── languageStore.js
│   │   ├── locationStore.js
│   │   ├── martStore.js
│   │   └── themeStore.js
│   └── App.jsx            # Routing and initialization logic
├── supabase/              # Database scripts and Edge functions
│   ├── functions/         # Supabase Edge Functions (Deno runtime)
│   │   ├── send-push-notification/
│   │   └── verify-razorpay-payment/
│   └── migrations/        # SQL migration files
├── index.html             # Client entry layout
├── package.json           # Dependencies and scripts
└── vite.config.js         # Build configuration
```

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/wrench.svg" width="24" height="24" /> Tech Stack

### Frontend & UI
- **React 18 & Vite 6**: Fast bundling, hot module replacement, and optimal compilation.
- **React Router DOM v6**: Client-side routing with route guards.
- **TailwindCSS**: Responsive, dark-mode adaptive styling framework.
- **Zustand**: Lightweight, decoupled state management.
- **Framer Motion**: Smooth transitions, loading animations, and gesture-driven actions.
- **React Leaflet**: OpenStreetMap maps integration.
- **Swiper**: Mobile-touch sliders.

### Backend Services
- **Supabase**: PostgreSQL database, JWT session management, realtime websocket listeners, and bucket storage.
- **Edge Functions**: Payment verification and push notification triggers.
- **ImgBB API**: Secure asset hosting.

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/settings.svg" width="24" height="24" /> Local Setup & Configuration

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)
- ImgBB Developer API key

### 1. Repository Setup
```bash
git clone https://github.com/mishra-aashu/Ozo.git
cd Ozo
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# Dual URL Configuration
VITE_SUPABASE_URL=https://your-cloudflare-proxy-domain.com
VITE_SUPABASE_ANON_KEY=your_supabase_anon_jwt_key
VITE_SUPABASE_DIRECT_URL=https://your-project.supabase.co

# Third-Party Credentials
VITE_IMGBB_API_KEY=your_imgbb_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key

# Optional Dev Flags
VITE_ENABLE_MOCK_PAYMENT=true
```

### 3. Database Execution
- Log into your Supabase Dashboard.
- Open the SQL Editor.
- Apply the migrations from the `supabase/migrations/` folder in order.
- Set up the notification table and indexes using the schema defined in `schema.sql`.

### 4. Running the Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/database.svg" width="24" height="24" /> Database Migrations & Schemas

OZO uses database constraints and Row-Level Security (RLS) to secure client data:
- **`20260608180000_inventory_stock_rules.sql`**: Trigger-based rules that adjust availability based on stock counts.
- **`20260610220000_order_pukka_addresses.sql`**: Restricts order placements to verified geofenced coordinate pins.
- **`20260611020000_session_limit_trigger.sql`**: Automatically drops old session tokens if a user logs in on a new device.
- **`20260611050000_captains_and_orders_security.sql`**: Ensures captain profiles and locations are visible only to active customers and administrators.

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/layout.svg" width="24" height="24" /> Customization & Fine-Tuning

### Changing Geofence Bounds
Edit `src/stores/locationStore.js` and modify `checkDeliveryZoneStatus`:
```javascript
let centerLat = 24.745736; // Warehouse latitude
let centerLng = 84.390014; // Warehouse longitude
let maxRadius = 2.5;       // Service radius limit in KM
```

### Modifying Rider Base Payouts
Update the database `rider_configurations` table or modify the fallback constants in `src/stores/captainStore.js`:
```javascript
const riderConfig = {
  base_payout: 20,            // Flat rate per order
  distance_bonus_per_km: 5    // Distance multiplier
}
```

### Localizing Translations
Add new language nodes in `src/stores/languageStore.js`:
```javascript
export const LANGUAGES = [
  ...
  { code: 'fr', label: 'French (Français)' }
]
```

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/phone.svg" width="24" height="24" /> Troubleshooting

### Real-time Connections Failing
- **Problem**: WebSocket connection times out.
- **Solution**: Ensure `VITE_SUPABASE_DIRECT_URL` points directly to your `supabase.co` URL rather than your proxy domain, as proxies often terminate long-lived WebSocket connections.

### Image Uploads Denied
- **Problem**: Onboarding files fail to upload with "Invalid file content".
- **Solution**: Ensure files are not zipped. The application verifies file headers. Check that the images are valid PNG, JPG, or WEBP formats.

### Admin Dashboard Blank
- **Problem**: Navigating to `/admin` results in access denied or a blank screen.
- **Solution**: In the Supabase SQL editor, change your user's role:
  ```sql
  UPDATE public.users SET role = 'admin' WHERE email = 'your-email@domain.com';
  ```

---

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/milestone.svg" width="24" height="24" /> Roadmap

- [ ] React Native Mobile Apps for Customers & Captains
- [ ] Direct GPS integration for Captain tracking
- [ ] Webhook-based push notifications via OneSignal
- [ ] AI-driven product recommendations based on search terms
- [ ] Dark mode support for admin dashboard tables

---

<div align="center">
  <h3>Made with <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/heart.svg" width="20" height="20" /> by OZO Team</h3>
  <p>Star the repository on GitHub to show your support</p>
</div>