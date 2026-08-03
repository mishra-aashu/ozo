# Developer Onboarding & Local Setup Guide

Welcome to the **OZO** project! This guide provides all necessary setup commands, requirements, and migration sequences to start developing locally.

---

## 1. Prerequisites
Ensure you have the following installed on your local machine:
- **Node.js** (v18.0.0 or higher) & `npm`
- **Python** (v3.10 or higher)
- **Supabase CLI** (optional, but recommended for database migrations)
- Access keys for **ImageKit** or **ImgBB**

---

## 2. Frontend Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mishra-aashu/Ozo.git
   cd Ozo
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a local `.env` file at the project root based on the template:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your Supabase, Payment Gateway, and Image CDN credentials.

4. **Start Vite local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## 3. Local Catalog Image Enrichment Tool (`OzoMartImageTool`)

The image tool is a local Python-based Flask service that scans your database for products missing images, scrapes search engines (OpenSERP), downloads candidate images, optimizes them, uploads them to your CDN, and updates Supabase.

1. **Navigate to the root directory and activate a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r image_tool/requirements.txt
   ```

3. **Run the build execution script:**
   ```bash
   python3 run_image_tool.py
   ```
   This starts the helper service at `http://localhost:5000` (or next free port) and links automatically with your OzoMart Admin Portal layout.

---

## 4. Database Migration Execution

Database migration files are located under `supabase/migrations/`. If you are setting up a fresh Supabase database instance, apply these migration scripts in chronological sequence:

1. **Core Schema Setup:** Create standard table structures (users, products, categories, orders, carts) and apply basic Row Level Security (RLS) policies.
2. **Session Limiters:** Run `20260611020000_session_limit_trigger.sql` to restrict concurrent user logins.
3. **Smart Pricing Triggers:** Run `20260705150000_mart_specific_margin_pricing.sql` and `20260705170000_margin_rule_sync_triggers.sql` to enable brand- and category-specific pricing waterfalls.
4. **Catalog Webcam Captures:** Run `20260705185000_allow_webcam_phone_enrichment_sources.sql` and `20260705185500_add_product_id_to_capture_sessions.sql` to enable real-time mobile QR capture websocket channels.
