import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, getActiveCities } from './_supabase.js';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

function renderPageWrapper(params: {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  schemas: any[];
  contentHTML: string;
  isAvailable?: boolean;
  activeCities: any[];
  currentCitySlug?: string;
}) {
  const {
    title,
    description,
    keywords,
    canonicalUrl,
    schemas,
    contentHTML,
    isAvailable = true,
    activeCities,
    currentCitySlug = activeCities?.[0]?.slug || ''
  } = params;

  const schemaScripts = schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ');

  return `
<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="google-site-verification" content="JOAuyG3VG9hC5sNhbRAP9UQxD5NxrrFW1xc6rFnqWw8">
  
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${keywords}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="author" content="OZO Mart">
  <meta name="theme-color" content="#E23744">
  <link rel="apple-touch-icon" href="https://ozomart.store/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="https://ozomart.store/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="https://ozomart.store/favicon-16x16.png">

  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://ozomart.store/android-chrome-512x512.png">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="OZO Mart">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://ozomart.store/android-chrome-512x512.png">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap" rel="stylesheet">
  
  ${schemaScripts}
  
  <style>
    :root {
      --primary: #E23744;
      --primary-grad: linear-gradient(135deg, #E23744 0%, #C41E3A 100%);
      --success: #16a34a;
      --bg: #0a0a0a;
      --card-bg: #121212;
      --border: rgba(255, 255, 255, 0.08);
      --text: #e5e7eb;
      --text-muted: #9ca3af;
    }
    
    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 0;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    
    .header {
      background: rgba(18, 18, 18, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 16px 20px;
    }

    .header-content {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-size: 24px;
      font-weight: 900;
      color: var(--primary);
      text-decoration: none;
      letter-spacing: 1px;
    }

    .logo span {
      color: #fff;
    }

    .badge-top {
      background: rgba(226, 55, 68, 0.1);
      color: var(--primary);
      border: 1px solid rgba(226, 55, 68, 0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 20px;
    }

    /* Category lists */
    .grid-links {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 20px;
      margin-bottom: 40px;
    }

    .grid-link-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      text-decoration: none;
      color: #fff;
      font-weight: 800;
      transition: transform 0.2s, border-color 0.2s;
    }

    .grid-link-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
    }

    .grid-link-card .icon {
      font-size: 32px;
      margin-bottom: 8px;
      display: block;
    }

    /* Product Grid */
    .product-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 40px;
      margin-bottom: 60px;
    }

    @media (min-width: 768px) {
      .product-grid {
        grid-template-columns: 1fr 1fr;
        align-items: start;
      }
    }

    .image-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 32px;
      padding: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      position: sticky;
      top: 100px;
    }

    .image-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .product-info {
      padding: 10px 0;
    }

    .category-tag {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
      margin-bottom: 16px;
    }

    h1 {
      font-size: 32px;
      font-weight: 900;
      color: #fff;
      margin: 0 0 8px 0;
      line-height: 1.2;
    }

    @media (min-width: 768px) {
      h1 {
        font-size: 40px;
      }
    }

    .unit {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    .price-box {
      background: #181818;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .price-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }

    .price {
      font-size: 36px;
      font-weight: 900;
      color: #fff;
    }

    .mrp {
      font-size: 20px;
      text-decoration: line-through;
      color: var(--text-muted);
      font-weight: 600;
    }

    .discount-badge {
      background: var(--success);
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      padding: 4px 10px;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
    }

    .stock-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${isAvailable ? 'var(--success)' : 'var(--primary)'};
    }

    .stock-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${isAvailable ? 'var(--success)' : 'var(--primary)'};
      box-shadow: 0 0 8px ${isAvailable ? 'var(--success)' : 'var(--primary)'};
    }

    .cta-button {
      display: block;
      width: 100%;
      background: var(--primary-grad);
      color: #fff;
      text-align: center;
      padding: 16px 24px;
      border-radius: 16px;
      text-decoration: none;
      font-weight: 800;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 8px 20px rgba(226, 55, 68, 0.3);
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(226, 55, 68, 0.4);
    }

    /* Section Titles */
    .section-title {
      font-size: 20px;
      font-weight: 900;
      color: #fff;
      margin: 40px 0 20px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-left: 4px solid var(--primary);
      padding-left: 12px;
    }

    .description-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 24px;
      font-size: 15px;
      color: var(--text-muted);
    }

    .description-box p {
      margin: 0 0 16px 0;
    }

    .description-box p:last-child {
      margin: 0;
    }

    /* USPs */
    .usps {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 40px;
    }

    @media (min-width: 640px) {
      .usps {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .usps {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .usp-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .usp-icon {
      font-size: 24px;
      background: rgba(226, 55, 68, 0.1);
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .usp-details h3 {
      margin: 0;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      color: #fff;
    }

    .usp-details p {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Delivery Timeline */
    .delivery-timeline {
      background: #181818;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      margin-top: 24px;
      margin-bottom: 20px;
    }

    .timeline-title {
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 16px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #fff;
    }

    .timeline-steps {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .step {
      text-align: center;
      flex: 1;
    }

    .step-icon {
      font-size: 24px;
      margin-bottom: 4px;
    }

    .step-text {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 2px;
    }

    .step-time {
      font-size: 11px;
      font-weight: 900;
      color: var(--primary);
    }

    /* Reviews section */
    .reviews-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin-top: 20px;
    }

    @media (min-width: 768px) {
      .reviews-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .review-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .reviewer-name {
      font-weight: 700;
      color: #fff;
    }

    .rating {
      color: #fbbf24;
      font-size: 14px;
    }

    .review-text {
      color: var(--text-muted);
      font-size: 14px;
      margin: 0 0 8px 0;
    }

    .review-date {
      font-size: 11px;
      color: var(--text-muted);
      opacity: 0.7;
    }

    /* Related products grid */
    .related-products {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .related-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      transition: transform 0.2s;
    }

    .related-card a {
      text-decoration: none;
      color: inherit;
      display: block;
    }

    .related-card:hover {
      transform: translateY(-4px);
    }

    .related-card img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: contain;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .related-card h3 {
      font-size: 14px;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .related-card p {
      font-size: 16px;
      font-weight: 900;
      color: var(--primary);
      margin: 0;
    }

    /* FAQ Section */
    .faq-container {
      margin-top: 40px;
    }

    .faq-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 16px;
    }

    .faq-card h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 800;
      color: #fff;
    }

    .faq-card p {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }

    .footer {
      text-align: center;
      margin-top: 80px;
      padding: 40px 20px;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
    }
    
    .footer a {
      color: var(--text-muted);
      text-decoration: none;
      margin: 0 8px;
      transition: color 0.2s;
    }

    .footer a:hover {
      color: var(--primary);
    }

    .static-content h2 {
      color: #fff;
      font-size: 24px;
      font-weight: 800;
      margin-top: 30px;
      margin-bottom: 16px;
    }

    .static-content p {
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.7;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <a href="/" class="logo">OZO<span>Mart</span></a>
      <span class="badge-top">10 Min Delivery</span>
    </div>
  </header>
  
  <div class="container">
    ${contentHTML}
  </div>

  <footer class="footer">
    <p>© 2025 OZO Mart - 10 Minute Grocery Delivery</p>
    <p style="margin-top: 12px;">
      <a href="/about">About Us</a> |
      <a href="/contact">Contact</a> |
      <a href="/privacy">Privacy Policy</a> |
      <a href="/terms">Terms of Service</a> |
      <a href="/sitemap.xml">Sitemap</a>
    </p>
  </footer>
</body>
</html>
  `.trim();
}

async function renderHomepage(res: VercelResponse, activeCities: any[]) {
  const currentCitySlug = activeCities[0]?.slug || '';
  
  let categories: any[] = [];
  try {
    const { data } = await supabase
      .from('categories')
      .select('slug, name, icon')
      .eq('is_active', true)
      .is('parent_id', null)
      .order('display_order', { ascending: true });
    if (data) categories = data;
  } catch (err) {
    console.error('Error fetching categories for homepage SEO:', err);
  }

  let products: any[] = [];
  try {
    const { data } = await supabase
      .from('products')
      .select('slug, name, base_price, unit, image_url')
      .eq('is_available', true)
      .limit(24);
    if (data) products = data;
  } catch (err) {
    console.error('Error fetching products for homepage SEO:', err);
  }

  const title = "OZO Mart | Jo Chahiye, Jab Chahiye | Online Grocery Delivery";
  const description = "Order fresh vegetables, organic fruits, daily essentials, and Mithila regional specialities online on OZO Mart (OZO). Fast 10-30 min delivery in Aurangabad, Bihar. सोचो मत, #OZOपेखोजो!";
  const keywords = "OZO, OZO Mart, OZO Grocery, online grocery, grocery delivery, fresh fruits, fresh vegetables, Mithila specials, makhana, thekua, quick commerce, Bihar grocery delivery";
  const canonicalUrl = "https://ozomart.store";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://ozomart.store/#organization",
    "name": "OZO Mart",
    "alternateName": ["OZO", "Ozo Mart", "Ozo Grocery", "Ozo Delivery"],
    "url": "https://ozomart.store",
    "logo": "https://ozomart.store/android-chrome-512x512.png",
    "sameAs": [
      "https://play.google.com/store/apps/details?id=com.ozomart"
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://ozomart.store/#website",
    "name": "OZO Mart",
    "url": "https://ozomart.store",
    "publisher": { "@id": "https://ozomart.store/#organization" },
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://ozomart.store/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is OZO?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "OZO (also operating as OZO Mart) is a hyperlocal quick commerce grocery delivery service that delivers fresh fruits, vegetables, daily essentials, and local Bihar specialties directly to customers within 10-30 minutes."
        }
      },

      {
        "@type": "Question",
        "name": "How fast does OZO deliver?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "OZO delivers fresh groceries and vegetables in 10 to 30 minutes in Aurangabad, Bihar."
        }
      }
    ]
  };

  const categoriesListHTML = categories.map(c => `
    <a href="/${currentCitySlug}/category/${c.slug}" class="grid-link-card">
      <span class="icon">${c.icon || '📦'}</span>
      <span>${c.name}</span>
    </a>
  `).join('');

  const citiesListHTML = activeCities.map(c => `
    <a href="/${c.slug}" class="grid-link-card" style="padding: 16px;">
      <span style="font-size: 24px; margin-bottom: 6px; display: block;">📍</span>
      <span>OZO ${c.name.split(',')[0]}</span>
    </a>
  `).join('');

  const featuredProductsHTML = products.map(p => `
    <div class="related-card">
      <a href="/${currentCitySlug}/${p.slug}">
        <img src="${p.image_url}" alt="${p.name} - Fresh delivery in Aurangabad" loading="lazy" />
        <h3>${p.name}</h3>
        <p>₹${p.base_price}</p>
        <span style="font-size: 11px; color: var(--text-muted);">${p.unit}</span>
      </a>
    </div>
  `).join('');

  const contentHTML = `
    <h1 style="text-align: center; margin-top: 20px;">OZO Mart | Jo Chahiye, Jab Chahiye</h1>
    <p style="text-align: center; max-width: 700px; margin: 0 auto 40px auto; color: var(--text-muted); font-size: 16px;">
      Order fresh vegetables, organic fruits, groceries, dairy, and authentic Mithila regional specialities online on <strong>OZO Mart (OZO)</strong>.
      Get everything delivered directly to your doorstep in just 10 to 30 minutes. सोचो मत, #OZOपेखोजो!
    </p>

    <h2 class="section-title">Shop by Category</h2>
    <div class="grid-links">
      ${categoriesListHTML}
    </div>

    <h2 class="section-title">Operational Cities</h2>
    <div class="grid-links" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));">
      ${citiesListHTML}
    </div>

    <h2 class="section-title">Popular Items on OZO</h2>
    <div class="related-products">
      ${featuredProductsHTML}
    </div>

    <div class="usps" style="margin-top: 60px;">
      <div class="usp-card">
        <div class="usp-icon">⚡</div>
        <div class="usp-details">
          <h3>10 Min Delivery</h3>
          <p>Super-fast delivery straight to you</p>
        </div>
      </div>
      <div class="usp-card">
        <div class="usp-icon">🥬</div>
        <div class="usp-details">
          <h3>Always Fresh</h3>
          <p>Handpicked farm-fresh produce</p>
        </div>
      </div>
      <div class="usp-card">
        <div class="usp-icon">💰</div>
        <div class="usp-details">
          <h3>Best Prices</h3>
          <p>Unbeatable daily deals and discounts</p>
        </div>
      </div>
      <div class="usp-card">
        <div class="usp-icon">🤝</div>
        <div class="usp-details">
          <h3>Local Support</h3>
          <p>Sourced directly from local farmers</p>
        </div>
      </div>
    </div>

    <div class="faq-container">
      <h2 class="section-title">Frequently Asked Questions</h2>
      
      <div class="faq-card">
        <h3>What is OZO?</h3>
        <p>OZO (also known as OZO Mart) is a hyperlocal quick commerce grocery delivery service that delivers fresh fruits, vegetables, daily essentials, and local Bihar specialties directly to customers within 10-30 minutes.</p>
      </div>



      <div class="faq-card">
        <h3>Where is OZO Mart active?</h3>
        <p>We are currently fully operational in Aurangabad, Bihar, and expanding rapidly to other cities in Bihar, including Patna and Gaya.</p>
      </div>
    </div>
  `;

  const html = renderPageWrapper({
    title,
    description,
    keywords,
    canonicalUrl,
    schemas: [organizationSchema, websiteSchema, faqSchema],
    contentHTML,
    activeCities,
    currentCitySlug
  });

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60');
  return res.status(200).send(html);
}

async function renderCityPage(res: VercelResponse, city: any, activeCities: any[]) {
  const cityName = city.name.split(',')[0].trim();
  const title = `OZO Mart ${cityName} | Online Grocery & Food Delivery`;
  const description = `Order fresh vegetables, organic fruits, daily groceries, and Mithila regional specialities online on OZO Mart in ${cityName}. Fast 10-30 minute delivery. Cash on Delivery available.`;
  const keywords = `OZO ${cityName}, OZO Mart ${cityName}, online grocery delivery ${cityName}, buy vegetables online in ${cityName}, quick commerce ${cityName}`;
  const canonicalUrl = `https://ozomart.store/${city.slug}`;

  let categories: any[] = [];
  try {
    const { data } = await supabase
      .from('categories')
      .select('slug, name, icon')
      .eq('is_active', true)
      .is('parent_id', null)
      .order('display_order', { ascending: true });
    if (data) categories = data;
  } catch (err) {
    console.error('Error fetching categories for city page SEO:', err);
  }

  let products: any[] = [];
  try {
    const { data } = await supabase
      .from('products')
      .select('slug, name, base_price, unit, image_url')
      .eq('is_available', true)
      .limit(24);
    if (data) products = data;
  } catch (err) {
    console.error('Error fetching products for city page SEO:', err);
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `https://ozomart.store/${city.slug}/#website`,
    "name": `OZO Mart - ${cityName}`,
    "url": `https://ozomart.store/${city.slug}`
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "@id": `https://ozomart.store/${city.slug}/#localbusiness`,
    "name": `OZO Mart - ${cityName}`,
    "image": "https://ozomart.store/android-chrome-512x512.png",
    "url": `https://ozomart.store/${city.slug}`,
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": cityName,
      "addressRegion": city.state || "Bihar",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": city.latitude || 24.75,
      "longitude": city.longitude || 84.37
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Is OZO Mart delivery available in ${cityName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Yes, OZO Mart offers super-fast 10-30 minute online grocery and fresh vegetable delivery across all serviceable areas in ${cityName}.`
        }
      },
      {
        "@type": "Question",
        "name": `How to order groceries online in ${cityName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Simply visit the OZO Mart website (ozomart.store) or download the OZO Mart Android app, select your address in ${cityName}, add items to your cart, and place your order.`
        }
      }
    ]
  };

  const categoriesListHTML = categories.map(c => `
    <a href="/${city.slug}/category/${c.slug}" class="grid-link-card">
      <span class="icon">${c.icon || '📦'}</span>
      <span>${c.name}</span>
    </a>
  `).join('');

  const featuredProductsHTML = products.map(p => `
    <div class="related-card">
      <a href="/${city.slug}/${p.slug}">
        <img src="${p.image_url}" alt="${p.name} - Fresh delivery in ${cityName}" loading="lazy" />
        <h3>${p.name}</h3>
        <p>₹${p.base_price}</p>
        <span style="font-size: 11px; color: var(--text-muted);">${p.unit}</span>
      </a>
    </div>
  `).join('');

  const contentHTML = `
    <h1 style="text-align: center; margin-top: 20px;">OZO Mart ${cityName}</h1>
    <p style="text-align: center; max-width: 700px; margin: 0 auto 40px auto; color: var(--text-muted); font-size: 16px;">
      Enjoy the fastest online grocery delivery in <strong>${cityName}</strong>. We deliver fresh vegetables, organic fruits, daily essentials, snacks, and Mithila specialties direct to your door in 10-30 minutes. सोचो मत, #OZOपेखोजो!
    </p>

    <h2 class="section-title">Browse Categories in ${cityName}</h2>
    <div class="grid-links">
      ${categoriesListHTML}
    </div>

    <h2 class="section-title">Available Products in ${cityName}</h2>
    <div class="related-products">
      ${featuredProductsHTML}
    </div>

    <div class="faq-container">
      <h2 class="section-title">Frequently Asked Questions for ${cityName}</h2>
      
      <div class="faq-card">
        <h3>Is OZO Mart delivery available in ${cityName}?</h3>
        <p>Yes, OZO Mart offers super-fast 10-30 minute online grocery and fresh vegetable delivery across all serviceable areas in ${cityName}.</p>
      </div>

      <div class="faq-card">
        <h3>How to order groceries online in ${cityName}?</h3>
        <p>Simply visit the OZO Mart website (ozomart.store) or download the OZO Mart Android app, select your address in ${cityName}, add items to your cart, and place your order.</p>
      </div>
    </div>
  `;

  const html = renderPageWrapper({
    title,
    description,
    keywords,
    canonicalUrl,
    schemas: [websiteSchema, localBusinessSchema, faqSchema],
    contentHTML,
    activeCities,
    currentCitySlug: city.slug
  });

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60');
  return res.status(200).send(html);
}

async function renderCategoryPage(res: VercelResponse, categorySlug: string, citySlug: string | null, activeCities: any[]) {
  const currentCitySlug = citySlug || activeCities[0]?.slug || '';
  
  let categoryName = categorySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  let categoryId: string | null = null;
  
  try {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug, icon')
      .eq('slug', categorySlug)
      .maybeSingle();
    if (data) {
      categoryName = data.name;
      categoryId = data.id;
    }
  } catch (err) {
    console.error('Error fetching category:', err);
  }

  let products: any[] = [];
  try {
    let query = supabase
      .from('products')
      .select('slug, name, base_price, unit, image_url')
      .eq('is_available', true)
      .limit(36);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    const { data } = await query;
    if (data) products = data;
  } catch (err) {
    console.error('Error fetching category products for SEO:', err);
  }

  const title = `${categoryName} Online | OZO Mart Grocery Delivery`;
  const description = `Buy fresh ${categoryName} online on OZO Mart. Fast 10-30 minute grocery delivery. सोचो मत, #OZOपेखोजो!`;
  const keywords = `buy ${categoryName} online, ${categoryName} delivery, OZO ${categoryName}, online grocery Bihar`;
  const canonicalUrl = `https://www.ozomart.store/category/${categorySlug}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${categoryName} on OZO Mart`,
    "numberOfItems": products.length,
    "itemListElement": products.map((p, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": p.name,
      "url": `https://ozomart.store/${currentCitySlug}/${p.slug}`
    }))
  };

  const categoryProductsHTML = products.map(p => `
    <div class="related-card">
      <a href="/${currentCitySlug}/${p.slug}">
        <img src="${p.image_url}" alt="${p.name} - ${categoryName} on OZO Mart" loading="lazy" />
        <h3>${p.name}</h3>
        <p>₹${p.base_price}</p>
        <span style="font-size: 11px; color: var(--text-muted);">${p.unit}</span>
      </a>
    </div>
  `).join('');

  const contentHTML = `
    <h1 style="text-align: center; margin-top: 20px;">Buy ${categoryName} Online</h1>
    <p style="text-align: center; max-width: 700px; margin: 0 auto 40px auto; color: var(--text-muted); font-size: 16px;">
      Explore wide selection of fresh <strong>${categoryName}</strong> on OZO Mart. Get 10 to 30 minute express delivery directly to your home. सोचो मत, #OZOपेखोजो!
    </p>

    <h2 class="section-title">${categoryName} Products</h2>
    <div class="related-products">
      ${categoryProductsHTML || '<p style="color: var(--text-muted);">Products loading...</p>'}
    </div>
  `;

  const html = renderPageWrapper({
    title,
    description,
    keywords,
    canonicalUrl,
    schemas: [itemListSchema],
    contentHTML,
    activeCities,
    currentCitySlug
  });

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60');
  return res.status(200).send(html);
}

function renderStaticPage(res: VercelResponse, slug: string, activeCities: any[]) {
  let title = '';
  let description = '';
  let h1 = '';
  let contentHTML = '';

  const canonicalUrl = `https://ozomart.store/${slug}`;
  const keywords = `OZO, OZO Mart, ${slug}, online grocery, Bihar`;

  if (slug === 'about') {
    title = 'About Us | OZO Mart - Online Grocery Delivery';
    description = 'Learn about OZO Mart (OZO), our mission, values, and how we deliver fresh groceries to your doorstep in 10-30 minutes across Bihar.';
    h1 = 'About OZO Mart';
    contentHTML = `
      <div class="static-content">
        <h1>${h1}</h1>
        <p>OZO Mart (commonly known as OZO) is a tech-driven hyperlocal quick-commerce platform dedicated to making grocery shopping effortless, affordable, and incredibly fast for families in Tier 2 and Tier 3 cities of India, starting with Bihar.</p>
        
        <h2>Our Mission</h2>
        <p>Our mission is simple: <strong>"Jo Chahiye, Jab Chahiye!"</strong> (Whatever you need, whenever you need it). We aim to bridge the gap between farm-fresh produce and busy urban households by providing high-quality groceries, organic vegetables, and fruits in under 30 minutes.</p>

        <h2>Supporting Local Communities</h2>
        <p>We source our products directly from local farmers and regional producers. OZO Mart is proud to feature authentic Mithila regional specialties like premium Phool Makhana and handmade Thekua, supporting regional heritage and local economies.</p>
        
        <h2>Fast and Reliable</h2>
        <p>OZO Mart is a dedicated hyperlocal quick commerce startup. We focus entirely on quick, reliable grocery fulfillment in Bihar, ensuring that your daily essentials are delivered to your doorstep in 30 minutes or less.</p>
      </div>
    `;
  } else if (slug === 'contact') {
    title = 'Contact Us | OZO Mart';
    description = 'Get in touch with OZO Mart customer care. Find our email, phone numbers, and address details for support or partnerships.';
    h1 = 'Contact OZO Mart';
    contentHTML = `
      <div class="static-content">
        <h1>${h1}</h1>
        <p>Have questions, feedback, or need help with your order? Our support team is here to assist you!</p>
        
        <h2>Customer Support</h2>
        <p>📧 Email: <a href="mailto:support@ozomart.store" style="color: var(--primary);">support@ozomart.store</a></p>
        <p>📞 Phone: +91-XXXXXXXXXX (Mon-Sun, 8 AM - 10 PM)</p>
        
        <h2>Office Address</h2>
        <p>OZO Mart Headquarters,<br>Aurangabad, Bihar, India - 824101</p>

        <h2>Partner with Us</h2>
        <p>If you are a vendor, farmer, or local store owner wishing to list your products on OZO, please write to us at <a href="mailto:partners@ozomart.store" style="color: var(--primary);">partners@ozomart.store</a>.</p>
      </div>
    `;
  } else if (slug === 'help') {
    title = 'Help & FAQ | OZO Mart';
    description = 'Get answers to frequently asked questions about orders, payments, refunds, and delivery timelines on OZO Mart.';
    h1 = 'Help & Support';
    contentHTML = `
      <div class="static-content">
        <h1>${h1}</h1>
        <p>Find quick answers to common queries regarding OZO Mart services.</p>
        
        <h2>Ordering & Delivery</h2>
        <p><strong>How do I place an order?</strong><br>You can place an order via our Android app or by visiting ozomart.store.</p>
        <p><strong>What are the delivery hours?</strong><br>We deliver daily from 6:00 AM to 11:00 PM.</p>
        <p><strong>How fast is the delivery?</strong><br>Most orders are delivered in 10 to 30 minutes depending on your distance from our micro-fulfillment centers.</p>

        <h2>Payments & Refunds</h2>
        <p><strong>What payment methods are accepted?</strong><br>We accept UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery (COD).</p>
        <p><strong>How do I request a refund?</strong><br>If you receive damaged or incorrect items, you can request a return or refund directly from the app within 24 hours of delivery.</p>
      </div>
    `;
  } else {
    const cleanName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    title = `${cleanName} | OZO Mart`;
    description = `Official ${cleanName} for OZO Mart online grocery delivery services.`;
    h1 = cleanName;
    contentHTML = `
      <div class="static-content">
        <h1>${h1}</h1>
        <p>This is the official page for OZO Mart's ${cleanName}. For detailed inquiries or questions regarding our terms, please contact our legal team at <a href="mailto:legal@ozomart.store" style="color: var(--primary);">legal@ozomart.store</a>.</p>
        <p>OZO Mart is dedicated to providing transparent, safe, and premium quality service to all our customers in Bihar.</p>
      </div>
    `;
  }

  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": description,
    "url": canonicalUrl
  };

  const html = renderPageWrapper({
    title,
    description,
    keywords,
    canonicalUrl,
    schemas: [webpageSchema],
    contentHTML,
    activeCities,
    currentCitySlug: activeCities[0]?.slug || ''
  });

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600');
  return res.status(200).send(html);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply Inbound Rate Limiting (e.g., 60 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 60, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(429).send(`
      <!DOCTYPE html>
      <html lang="hi-IN">
      <head>
        <meta charset="UTF-8">
        <title>Too Many Requests - OZO Mart</title>
        <style>
          body { background: #0a0a0a; color: #e5e7eb; font-family: system-ui, sans-serif; text-align: center; padding: 100px 20px; }
          h1 { color: #E23744; font-size: 36px; margin-bottom: 10px; }
          p { color: #9ca3af; font-size: 18px; }
        </style>
      </head>
      <body>
        <h1>Too Many Requests</h1>
        <p>Rate limit exceeded. Please wait a minute before trying again.</p>
      </body>
      </html>
    `);
  }

  const { city, product, homepage, category } = req.query;

  const activeCities = await getActiveCities();

  if (category) {
    return renderCategoryPage(res, String(category), city ? String(city) : null, activeCities);
  }

  const isHomepage = homepage === 'true' || (!city && !product);

  const STATIC_PAGES = ['about', 'contact', 'privacy', 'terms', 'cookies', 'shipping', 'refund-policy', 'careers', 'blog', 'press', 'developer', 'help', 'offers', 'products', 'categories'];

  let isStaticPage = false;
  let staticPageSlug = '';
  if (city && !product) {
    const cityStrLower = String(city).toLowerCase();
    if (STATIC_PAGES.includes(cityStrLower)) {
      isStaticPage = true;
      staticPageSlug = cityStrLower;
    }
  }

  if (isStaticPage) {
    return renderStaticPage(res, staticPageSlug, activeCities);
  }

  if (isHomepage) {
    return renderHomepage(res, activeCities);
  }

  if (city && !product) {
    let cityStr = String(city).toLowerCase();
    const matchingCity = activeCities.find(c => c.slug === cityStr);
    if (!matchingCity) {
      return renderHomepage(res, activeCities);
    }
    return renderCityPage(res, matchingCity, activeCities);
  }

  // Fallback to existing product rendering logic
  if (!city || !product) {
    return renderHomepage(res, activeCities);
  }

  let cityStr = String(city).toLowerCase();
  const productStr = String(product);

  // If city is literally 'product' (e.g. from /product/:slug crawler route), fallback to first active city
  if (cityStr === 'product') {
    cityStr = activeCities[0]?.slug || '';
  }

  const matchingCity = activeCities.find(c => c.slug === cityStr);

  if (!matchingCity) {
    return res.status(404).send('City Not Serviceable Yet');
  }

  const cleanCityName = matchingCity.name.split(',')[0].trim();

  try {
    // 3. Fetch product details and city availability with left join for fallback
    const { data: productData, error } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        base_price,
        base_mrp,
        image_url,
        brand,
        unit,
        description,
        is_available,
        category_id,
        updated_at,
        categories (name),
        product_city_availability!left(
          city_slug,
          city_price,
          city_mrp,
          is_featured,
          is_available
        )
      `)
      .eq('slug', productStr)
      .eq('is_available', true)
      .maybeSingle();

    if (error || !productData) {
      console.warn(`Product not found or not active: ${productStr}`);
      return res.status(404).send('Product Not Found');
    }

    const pcaList = productData.product_city_availability;
    const pca = Array.isArray(pcaList)
      ? (pcaList.find((p: any) => p.city_slug === cityStr) || null)
      : (pcaList || null);

    const isAvailable = pca && pca.is_available !== null && pca.is_available !== undefined
      ? pca.is_available
      : productData.is_available;

    if (!isAvailable) {
      console.warn(`Product is not available: ${productStr}`);
      return res.status(404).send('Product Not Available');
    }

    const prod = productData;
    const categoryObj = prod.categories as any;
    const cleanCategoryName = (Array.isArray(categoryObj) ? categoryObj[0]?.name : categoryObj?.name) || 'Grocery';

    const citySellingPrice = pca?.city_price !== null && pca?.city_price !== undefined 
      ? parseFloat(pca.city_price) 
      : (prod.base_price ? parseFloat(prod.base_price) : 0);
    
    const finalPrice = citySellingPrice;

    // Fetch related products
    let relatedProducts = [];
    if (prod.category_id) {
      try {
        const { data: relatedData } = await supabase
          .from('products')
          .select(`
            id,
            slug,
            name,
            base_price,
            image_url,
            unit,
            product_city_availability!left(
              city_slug,
              city_price,
              city_mrp,
              is_available
            )
          `)
          .eq('category_id', prod.category_id)
          .eq('is_available', true)
          .neq('id', prod.id)
          .limit(6);

        if (relatedData) {
          relatedProducts = relatedData.map((rp: any) => {
            const rPcaList = rp.product_city_availability;
            const rPca = Array.isArray(rPcaList)
              ? (rPcaList.find((p: any) => p.city_slug === cityStr) || null)
              : (rPcaList || null);
            const rpPrice = rPca?.city_price !== null && rPca?.city_price !== undefined 
              ? parseFloat(rPca.city_price) 
              : parseFloat(rp.base_price || 0);
            return {
              slug: rp.slug,
              name: rp.name,
              price: rpPrice,
              image_url: rp.image_url,
              unit: rp.unit
            };
          });
        }
      } catch (err) {
        console.warn('Failed to fetch related products:', err);
      }
    }

    // Fetch reviews from the database for dynamic aggregateRating and review schema markup
    let dbReviews = [];
    let avgRating = 4.8;
    let reviewsCount = 1;
    try {
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          rating,
          review_text,
          created_at,
          user:users (
            full_name
          )
        `)
        .eq('product_id', prod.id)
        .order('created_at', { ascending: false });

      if (reviewsData && reviewsData.length > 0) {
        dbReviews = reviewsData;
        const totalRating = dbReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        avgRating = totalRating / dbReviews.length;
        reviewsCount = dbReviews.length;
      }
    } catch (err) {
      console.warn('Failed to fetch reviews:', err);
    }

    const reviewsHTML = dbReviews.length > 0 ? dbReviews.slice(0, 5).map(r => {
      const userName = (r.user as any)?.full_name || 'OZO Customer';
      const stars = '⭐'.repeat(r.rating || 5);
      const dateText = new Date(r.created_at || Date.now()).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-name">${userName}</div>
          <div class="rating">${stars}</div>
        </div>
        <p class="review-text">"${r.review_text || 'Excellent product!'}"</p>
        <div class="review-date">${dateText}</div>
      </div>
      `;
    }).join('') : `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-name">OZO Customer</div>
          <div class="rating">⭐⭐⭐⭐⭐</div>
        </div>
        <p class="review-text">"Great quality ${prod.name}! Delivered fresh and fast. Highly recommend OZO Mart."</p>
        <div class="review-date">2 days ago</div>
      </div>
    `;

    // 4. Construct Product and Breadcrumb Schema Markup
    const productSchema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": prod.name,
      "image": {
        "@type": "ImageObject",
        "url": absoluteImageUrl,
        "width": "800",
        "height": "800",
        "caption": `${prod.name} - Fresh delivery in ${cleanCityName}`
      },
      "description": prod.description || `Buy ${prod.name} online in ${cleanCityName} from OZO Mart.`,
      "category": categoryName,
      "sku": prod.id,
      "brand": {
        "@type": "Brand",
        "name": prod.brand || "OZO Mart"
      },
      "offers": {
        "@type": "Offer",
        "url": `https://ozomart.store/${cityStr}/${productStr}`,
        "priceCurrency": "INR",
        "price": finalPrice,
        "availability": isAvailable 
          ? "https://schema.org/InStock" 
          : "https://schema.org/OutOfStock",
        "priceValidUntil": new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": finalPrice,
          "priceCurrency": "INR",
          "valueAddedTaxIncluded": true
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "IN",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnPeriod",
          "merchantReturnDays": 1,
          "returnMethod": "https://schema.org/ReturnAtStore",
          "returnFees": "https://schema.org/FreeReturn"
        },
        "seller": {
          "@type": "LocalBusiness",
          "name": `OZO Mart - ${cleanCityName}`,
          "image": "https://ozomart.store/logo.png",
          "telephone": "+91-XXXXXXXXXX",
          "url": `https://ozomart.store/${cityStr}`,
          "priceRange": "₹₹",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": cleanCityName,
            "addressRegion": matchingCity.state || "Bihar",
            "addressCountry": "IN"
          }
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "0",
            "currency": "INR"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0.007,
              "unitCode": "DAY"
            }
          }
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": avgRating.toFixed(1),
        "reviewCount": String(reviewsCount)
      },
      "review": dbReviews.length > 0 ? dbReviews.slice(0, 5).map(r => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": (r.user as any)?.full_name || "OZO Customer"
        },
        "datePublished": new Date(r.created_at || Date.now()).toISOString().split('T')[0],
        "reviewBody": r.review_text || `Excellent quality product from OZO Mart.`,
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": String(r.rating || 5),
          "bestRating": "5"
        }
      })) : [
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "OZO Customer"
          },
          "datePublished": new Date(prod.updated_at || Date.now()).toISOString().split('T')[0],
          "reviewBody": `High quality ${prod.name} delivered fresh and fast. Highly recommend OZO Mart.`,
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        }
      ]
    };

    const cleanCategorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://ozomart.store"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": cleanCityName,
          "item": `https://ozomart.store/${cityStr}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": categoryName,
          "item": `https://ozomart.store/${cityStr}/${cleanCategorySlug}`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": prod.name,
          "item": `https://ozomart.store/${cityStr}/${productStr}`
        }
      ]
    };

    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": `OZO Mart - ${cleanCityName}`,
      "image": "https://ozomart.store/logo.png",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": cleanCityName,
        "addressRegion": matchingCity.state || "Bihar",
        "addressCountry": "IN"
      },
      "geo": matchingCity.latitude && matchingCity.longitude ? {
        "@type": "GeoCoordinates",
        "latitude": matchingCity.latitude,
        "longitude": matchingCity.longitude
      } : undefined,
      "url": `https://ozomart.store/${cityStr}`,
      "telephone": "+91-XXXXXXXXXX",
      "priceRange": "₹₹",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          "opens": "06:00",
          "closes": "23:00"
        }
      ],
      "servesCuisine": "Grocery & Daily Essentials",
      "areaServed": {
        "@type": "GeoCircle",
        "geoMidpoint": {
          "@type": "GeoCoordinates",
          "latitude": matchingCity.latitude,
          "longitude": matchingCity.longitude
        },
        "geoRadius": (matchingCity.service_radius_km || 15) * 1000
      }
    };

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `Is ${prod.name} delivery available in ${cleanCityName}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Yes, OZO Mart delivers ${prod.name} across all active areas of ${cleanCityName} within 10 minutes.`
          }
        },
        {
          "@type": "Question",
          "name": `What is the price of ${prod.name} in ${cleanCityName} today?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `The current price of ${prod.name} is ₹${finalPrice} for ${prod.unit}. Prices are updated daily.`
          }
        },
        {
          "@type": "Question",
          "name": `Can I pay Cash on Delivery (COD) for ${prod.name}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Yes, Cash on Delivery (COD) as well as online UPI and card payment options are supported.`
          }
        },
        {
          "@type": "Question",
          "name": `Do you deliver ${prod.name} on Sunday in ${cleanCityName}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Yes, we deliver 7 days a week including Sundays from 6 AM to 11 PM.`
          }
        }
      ]
    };

    // 5. Generate beautiful premium static HTML representation for Bots / SEO
    const savings = finalMrp > finalPrice ? finalMrp - finalPrice : 0;
    const discountPercent = finalMrp > finalPrice ? Math.round((savings / finalMrp) * 100) : 0;

    const relatedProductsHTML = relatedProducts.length > 0
      ? `
    <h2 class="section-title">Related Products in ${cleanCityName}</h2>
    <div class="related-products">
      ${relatedProducts.map(rp => `
      <div class="related-card">
        <a href="/${cityStr}/${rp.slug}">
          <img src="${rp.image_url}" alt="${rp.name} - Fresh delivery in ${cleanCityName}" loading="lazy" />
          <h3>${rp.name}</h3>
          <p>₹${rp.price}</p>
        </a>
      </div>
      `).join('')}
    </div>
    `
      : '';

    const SEO_HTML = `
<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="google-site-verification" content="JOAuyG3VG9hC5sNhbRAP9UQxD5NxrrFW1xc6rFnqWw8">
  
  <!-- Title (55-60 chars) -->
  <title>Buy ${prod.name} Online in ${cleanCityName} | OZO Mart - 10 Min Delivery</title>
  
  <!-- Meta Description (150-160 chars) -->
  <meta name="description" content="Order ${prod.name} (${prod.unit}) online in ${cleanCityName}. Price: ₹${finalPrice}. Fast 10-minute delivery. Cash on Delivery available. Fresh quality guaranteed.">
  
  <!-- Keywords -->
  <meta name="keywords" content="${prod.name} ${cleanCityName}, buy ${prod.name} online ${cleanCityName}, ${categoryName} delivery ${cleanCityName}, grocery delivery ${cleanCityName}, ozo mart ${cleanCityName}">
  
  <!-- Robots Meta -->
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">

  <!-- Author -->
  <meta name="author" content="OZO Mart">

  <!-- Theme Color (for mobile browsers) -->
  <meta name="theme-color" content="#E23744">

  <!-- Apple Touch Icon -->
  <link rel="apple-touch-icon" href="https://ozomart.store/apple-touch-icon.png">

  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="https://ozomart.store/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="https://ozomart.store/favicon-16x16.png">

  <!-- Alternate for Hindi & English -->
  <link rel="alternate" hreflang="hi" href="https://ozomart.store/${cityStr}/${productStr}">
  <link rel="alternate" hreflang="en" href="https://ozomart.store/${cityStr}/${productStr}">
  <link rel="alternate" hreflang="x-default" href="https://ozomart.store/${cityStr}/${productStr}">

  <!-- App Deep Link -->
  <meta property="al:android:url" content="ozomart://product/${prod.id}">
  <meta property="al:android:package" content="com.ozomart">
  <meta property="al:android:app_name" content="OZO Mart">

  <!-- Canonical URL -->
  <link rel="canonical" href="https://www.ozomart.store/product/${prod.slug}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="Buy ${prod.name} - OZO Mart ${cleanCityName}">
  <meta property="og:description" content="Get ${prod.name} (${prod.unit}) at ₹${finalPrice} in just 10 minutes from OZO Mart.">
  <meta property="og:image" content="${absoluteImageUrl}">
  <meta property="og:url" content="https://ozomart.store/${cityStr}/${productStr}">
  <meta property="og:site_name" content="OZO Mart">
  <meta property="product:price:amount" content="${finalPrice}">
  <meta property="product:price:currency" content="INR">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Buy ${prod.name} - ${cleanCityName}">
  <meta name="twitter:description" content="Price: ₹${finalPrice} | Fast 10 Min Delivery in ${cleanCityName}">
  <meta name="twitter:image" content="${absoluteImageUrl}">
  
  <!-- Preconnect (Performance) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap" rel="stylesheet">
  
  <!-- Schema Markup -->
  <script type="application/ld+json">${JSON.stringify(productSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(localBusinessSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  
  <style>
    :root {
      --primary: #E23744;
      --primary-grad: linear-gradient(135deg, #E23744 0%, #C41E3A 100%);
      --success: #16a34a;
      --bg: #0a0a0a;
      --card-bg: #121212;
      --border: rgba(255, 255, 255, 0.08);
      --text: #e5e7eb;
      --text-muted: #9ca3af;
    }
    
    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 0;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    
    .header {
      background: rgba(18, 18, 18, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 16px 20px;
    }

    .header-content {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-size: 24px;
      font-weight: 900;
      color: var(--primary);
      text-decoration: none;
      letter-spacing: 1px;
    }

    .logo span {
      color: #fff;
    }

    .badge-top {
      background: rgba(226, 55, 68, 0.1);
      color: var(--primary);
      border: 1px solid rgba(226, 55, 68, 0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 20px;
    }

    /* Breadcrumbs */
    .breadcrumbs {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .breadcrumbs a {
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
    }

    .breadcrumbs a:hover {
      color: var(--primary);
    }

    .breadcrumbs span {
      color: #fff;
    }

    /* Product Grid */
    .product-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 40px;
      margin-bottom: 60px;
    }

    @media (min-width: 768px) {
      .product-grid {
        grid-template-columns: 1fr 1fr;
        align-items: start;
      }
    }

    .image-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 32px;
      padding: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      position: sticky;
      top: 100px;
    }

    .image-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .product-info {
      padding: 10px 0;
    }

    .category-tag {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
      margin-bottom: 16px;
    }

    h1 {
      font-size: 32px;
      font-weight: 900;
      color: #fff;
      margin: 0 0 8px 0;
      line-height: 1.2;
    }

    @media (min-width: 768px) {
      h1 {
        font-size: 40px;
      }
    }

    .unit {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    .price-box {
      background: #181818;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .price-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }

    .price {
      font-size: 36px;
      font-weight: 900;
      color: #fff;
    }

    .mrp {
      font-size: 20px;
      text-decoration: line-through;
      color: var(--text-muted);
      font-weight: 600;
    }

    .discount-badge {
      background: var(--success);
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      padding: 4px 10px;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
    }

    .stock-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${isAvailable ? 'var(--success)' : 'var(--primary)'};
    }

    .stock-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${isAvailable ? 'var(--success)' : 'var(--primary)'};
      box-shadow: 0 0 8px ${isAvailable ? 'var(--success)' : 'var(--primary)'};
    }

    .cta-button {
      display: block;
      width: 100%;
      background: var(--primary-grad);
      color: #fff;
      text-align: center;
      padding: 16px 24px;
      border-radius: 16px;
      text-decoration: none;
      font-weight: 800;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 8px 20px rgba(226, 55, 68, 0.3);
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(226, 55, 68, 0.4);
    }

    /* Section Titles */
    .section-title {
      font-size: 20px;
      font-weight: 900;
      color: #fff;
      margin: 60px 0 20px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-left: 4px solid var(--primary);
      padding-left: 12px;
    }

    .description-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 24px;
      font-size: 15px;
      color: var(--text-muted);
    }

    .description-box p {
      margin: 0 0 16px 0;
    }

    .description-box p:last-child {
      margin: 0;
      border-top: 1px solid var(--border);
      padding-top: 16px;
      margin-top: 16px;
    }

    /* USPs */
    .usps {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    @media (min-width: 640px) {
      .usps {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .usps {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .usp-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .usp-icon {
      font-size: 24px;
      background: rgba(226, 55, 68, 0.1);
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .usp-details h3 {
      margin: 0;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      color: #fff;
    }

    .usp-details p {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: var(--text-muted);
    }

    .skip-link {
      position: absolute;
      top: -100px;
      left: 10px;
      background: var(--primary);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      text-decoration: none;
      z-index: 1000;
      transition: top 0.2s;
    }
    .skip-link:focus {
      top: 10px;
    }

    /* Delivery Timeline */
    .delivery-timeline {
      background: #181818;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      margin-top: 24px;
      margin-bottom: 20px;
    }

    .timeline-title {
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 16px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #fff;
    }

    .timeline-steps {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .step {
      text-align: center;
      flex: 1;
    }

    .step-icon {
      font-size: 24px;
      margin-bottom: 4px;
    }

    .step-text {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 2px;
    }

    .step-time {
      font-size: 11px;
      font-weight: 900;
      color: var(--primary);
    }

    /* Reviews section */
    .reviews-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin-top: 20px;
    }

    @media (min-width: 768px) {
      .reviews-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .review-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .reviewer-name {
      font-weight: 700;
      color: #fff;
    }

    .rating {
      color: #fbbf24;
      font-size: 14px;
    }

    .review-text {
      color: var(--text-muted);
      font-size: 14px;
      margin: 0 0 8px 0;
    }

    .review-date {
      font-size: 11px;
      color: var(--text-muted);
      opacity: 0.7;
    }

    /* Related products grid */
    .related-products {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .related-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      transition: transform 0.2s;
    }

    .related-card a {
      text-decoration: none;
      color: inherit;
      display: block;
    }

    .related-card:hover {
      transform: translateY(-4px);
    }

    .related-card img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: contain;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .related-card h3 {
      font-size: 14px;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .related-card p {
      font-size: 16px;
      font-weight: 900;
      color: var(--primary);
      margin: 0;
    }

    /* FAQ Section */
    .faq-container {
      margin-top: 40px;
    }

    .faq-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 16px;
    }

    .faq-card h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 800;
      color: #fff;
    }

    .faq-card p {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }

    .footer {
      text-align: center;
      margin-top: 80px;
      padding: 40px 20px;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <!-- Structured Data for Delivery Area -->
  <div itemscope itemtype="https://schema.org/LocalBusiness" style="display:none;">
    <span itemprop="name">OZO Mart ${cleanCityName}</span>
    <span itemprop="telephone">+91-XXXXXXXXXX</span>
    <div itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
      <span itemprop="addressLocality">${cleanCityName}</span>
      <span itemprop="addressRegion">${matchingCity.state || 'Bihar'}</span>
      <span itemprop="addressCountry">IN</span>
    </div>
  </div>

  <header class="header">
    <div class="header-content">
      <a href="/" class="logo">OZO<span>Mart</span></a>
      <div class="badge-top">10 Min Delivery</div>
    </div>
  </header>

  <main class="container" id="main-content">
    <!-- Breadcrumbs -->
    <nav class="breadcrumbs">
      <a href="/">Home</a> / 
      <a href="/${cityStr}">${cleanCityName}</a> / 
      <a href="/${cityStr}/${cleanCategorySlug}">${categoryName}</a> / 
      <span>${prod.name}</span>
    </nav>
    
    <!-- Product Grid -->
    <div class="product-grid" itemscope itemtype="https://schema.org/Product">
      <div class="image-container">
        <img 
          src="${absoluteImageUrl}" 
          alt="${prod.name} - Fresh ${categoryName} delivery in ${cleanCityName} by OZO Mart"
          loading="eager"
          width="600"
          height="600"
          role="img"
          aria-label="${prod.name} product image"
        />
      </div>
      
      <div class="product-info">
        <span class="category-tag">${categoryName}</span>
        <h1>Buy ${prod.name} Online in ${cleanCityName}</h1>
        <div class="unit">Unit: ${prod.unit}</div>
        
        <div class="price-box">
          <div class="price-row">
            <span class="price">₹${finalPrice}</span>
            ${finalMrp > finalPrice ? `<span class="mrp">₹${finalMrp}</span>` : ''}
          </div>
          <div style="margin-top: 8px;">
            ${finalMrp > finalPrice ? `<span class="discount-badge">${discountPercent}% OFF (Save ₹${savings})</span>` : ''}
          </div>
          <div class="stock-status">
            <div class="stock-indicator"></div>
            <span>${isAvailable ? 'In Stock' : 'Out of Stock'}</span>
          </div>
        </div>
        
        <a href="https://play.google.com/store/apps/details?id=com.ozomart" class="cta-button">
          Download App to Order
        </a>

        <!-- Delivery Timeline Visual -->
        <div class="delivery-timeline">
          <h3 class="timeline-title">🚚 Delivery Timeline</h3>
          <div class="timeline-steps">
            <div class="step">
              <div class="step-icon">📦</div>
              <div class="step-text">Order Confirmed</div>
              <div class="step-time">0 min</div>
            </div>
            <div class="step">
              <div class="step-icon">🏃</div>
              <div class="step-text">Picked & Packed</div>
              <div class="step-time">2 min</div>
            </div>
            <div class="step">
              <div class="step-icon">🛵</div>
              <div class="step-text">Out for Delivery</div>
              <div class="step-time">5 min</div>
            </div>
            <div class="step">
              <div class="step-icon">🏠</div>
              <div class="step-text">Delivered</div>
              <div class="step-time">10 min</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Product Description -->
    <h2 class="section-title">Product Description</h2>
    <div class="description-box">
      <p>${prod.description || `Order fresh ${prod.name} (${prod.unit}) online in ${cleanCityName}. Sourced from trusted vendors, quality-checked, and delivered directly to your doorstep in just 10 minutes. OZO Mart offers the fastest delivery and cash on delivery option for a seamless shopping experience.`}</p>
      <p><strong>Brand:</strong> ${prod.brand || 'OZO Mart'} | <strong>Category:</strong> ${categoryName} | <strong>Unit:</strong> ${prod.unit}</p>
    </div>

    <!-- Related Products -->
    ${relatedProductsHTML}

    <!-- USPs -->
    <h2 class="section-title">Why Order from OZO Mart?</h2>
    <div class="usps">
      <div class="usp-card">
        <div class="usp-icon">⚡</div>
        <div class="usp-details">
          <h3>10 Min Delivery</h3>
          <p>Superfast delivery to your doorstep.</p>
        </div>
      </div>
      <div class="usp-card">
        <div class="usp-icon">✅</div>
        <div class="usp-details">
          <h3>Fresh Quality</h3>
          <p>100% handpicked fresh groceries.</p>
        </div>
      </div>
      <div class="usp-card">
        <div class="usp-icon">💰</div>
        <div class="usp-details">
          <h3>Best Prices</h3>
          <p>Daily discounts and pocket-friendly rates.</p>
        </div>
      </div>
      <div class="usp-card">
        <div class="usp-icon">🤝</div>
        <div class="usp-details">
          <h3>Local Support</h3>
          <p>Supporting local ${cleanCityName} vendors.</p>
        </div>
      </div>
    </div>

    <!-- Social Proof / Reviews section -->
    <h2 class="section-title">What Customers Say</h2>
    <div class="reviews-grid">
      ${reviewsHTML}
    </div>

    <!-- FAQs -->
    <h2 class="section-title">Frequently Asked Questions</h2>
    <div class="faq-container">
      <div class="faq-card" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
        <h3 itemprop="name">Is ${prod.name} delivery available in ${cleanCityName}?</h3>
        <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
          <p itemprop="text">Yes, OZO Mart delivers ${prod.name} across all active areas of ${cleanCityName} within 10 minutes.</p>
        </div>
      </div>
      
      <div class="faq-card" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
        <h3 itemprop="name">What is the price of ${prod.name} in ${cleanCityName} today?</h3>
        <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
          <p itemprop="text">The current price of ${prod.name} is ₹${finalPrice} for ${prod.unit}. Prices are updated daily to ensure you get the best deal.</p>
        </div>
      </div>

      <div class="faq-card" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
        <h3 itemprop="name">Can I pay Cash on Delivery (COD) for ${prod.name}?</h3>
        <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
          <p itemprop="text">Yes, Cash on Delivery (COD) as well as online UPI and card payment options are fully supported on the OZO Mart app.</p>
        </div>
      </div>
    </div>
  </main>

  <footer class="footer">
    <p>© 2025 OZO Mart - 10 Minute Grocery Delivery in ${cleanCityName}</p>
    <p style="margin-top: 12px;">
      <a href="/privacy-policy" style="color: var(--text-muted); margin: 0 8px; text-decoration: none;">Privacy Policy</a> |
      <a href="/terms" style="color: var(--text-muted); margin: 0 8px; text-decoration: none;">Terms of Service</a> |
      <a href="/sitemap.xml" style="color: var(--text-muted); margin: 0 8px; text-decoration: none;">Sitemap</a> |
      <a href="/contact" style="color: var(--text-muted); margin: 0 8px; text-decoration: none;">Contact</a>
    </p>
  </footer>
</body>
</html>
    `.trim();

    // 6. Set Cache Headers (Edge Caching + CDNs)
    res.setHeader('Content-Type', 'text/html');
    // 🚀 Edge Caching to prevent database hits on every crawl / Googlebot request
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60');
    res.setHeader('CDN-Cache-Control', 'max-age=86400');
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=86400');
    
    // Performance and Custom tracking headers
    res.setHeader('X-Rendered', 'true');
    res.setHeader('X-Render-Engine', 'Vercel-Edge-SEO');
    res.setHeader('X-City', cityStr);
    res.setHeader('X-Product', productStr);

    return res.status(200).send(SEO_HTML);

  } catch (error) {
    console.error('SEO Render Error:', error);
    // Redirect to fallback URL on unexpected system errors
    return res.redirect(302, `/?city=${cityStr}&product=${productStr}`);
  }
}
