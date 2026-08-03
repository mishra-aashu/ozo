# OZO Troubleshooting Guide

This guide compiles common technical issues, symptoms, and their direct solutions.

---

## 1. WebSocket Timeout / Realtime Disconnects
* **Symptom:** Order feeds do not update automatically; QR webcam capture sessions or real-time order status checks time out.
* **Explanation:** Caching proxies or Cloudflare proxy layers (which terminate long-lived TCP/WebSocket connections) are routing the traffic instead of direct Supabase instances.
* **Fix:** Verify that `VITE_SUPABASE_DIRECT_URL` in your `.env` points directly to your Supabase project endpoint `*.supabase.co` rather than through an edge proxy routing layer.

---

## 2. "Invalid File Format" during Captures
* **Symptom:** Onboarding documents, rider verification images, or webcam photos fail to upload with validation errors.
* **Explanation:** OZO inspects the binary headers (magic numbers) of files on the client side to verify format integrity (protecting against malicious attachments masquerading as images).
* **Fix:** Ensure you are uploading native, unmodified format files (e.g., standard `.jpg`, `.png`, `.webp`, or `.pdf`). Avoid uploading compressed ZIP files or files with manually altered file extensions.

---

## 3. Access Denied to Dashboards
* **Symptom:** Accessing `/admin` or `/mart` redirects you back to the home page.
* **Explanation:** Your user is successfully authenticated but lacks the necessary database role to bypass RLS and security checks on dashboard routers.
* **Fix:** Assign the role manually in your Supabase SQL Editor:
  ```sql
  UPDATE public.users 
  SET role = 'admin' 
  WHERE email = 'your-email@example.com';
  ```
  Change `'admin'` to `'mart'` if you are testing merchant dashboard flows.
