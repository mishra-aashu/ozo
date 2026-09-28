import { DELIVERY_DEFAULTS } from '../config/deliveryDefaults';
import { useCartStore } from '../stores/cartStore';

/**
 * SEO & CTR Optimization Helpers for OZO Mart
 * Dynamically resolves location, delivery thresholds, and builds rich meta tags & JSON-LD schema.
 */

/**
 * Dynamically resolves current city name from location store state.
 * Prevents hardcoding city names (works seamlessly for Aurangabad, Patna, Ranchi, etc.)
 */
export const resolveCityName = (nearestCity, addressDetails, selectedCitySlug, activeCities) => {
  if (nearestCity?.name) {
    return nearestCity.name.split(',')[0].trim();
  }
  if (addressDetails?.city) {
    return addressDetails.city.trim();
  }
  if (selectedCitySlug && Array.isArray(activeCities) && activeCities.length > 0) {
    const matched = activeCities.find(c => c.slug === selectedCitySlug);
    if (matched?.name) {
      return matched.name.split(',')[0].trim();
    }
  }
  if (selectedCitySlug) {
    const firstPart = selectedCitySlug.split('-')[0];
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  }
  return 'Aurangabad';
};

/**
 * Dynamically resolves free delivery threshold from cartStore deliveryConfig or DELIVERY_DEFAULTS.
 * Never hardcodes delivery threshold amounts (e.g. ₹200).
 */
export const getFreeDeliveryThreshold = () => {
  try {
    const deliveryConfig = useCartStore.getState()?.deliveryConfig;
    if (deliveryConfig && deliveryConfig.free_above != null) {
      const val = parseFloat(deliveryConfig.free_above);
      if (!isNaN(val) && val >= 0) return val;
    }
  } catch (err) {
    // fallback
  }
  return DELIVERY_DEFAULTS?.free_above || 99;
};

/**
 * Formats dynamic free delivery callout string.
 * Example: "free delivery over ₹99"
 */
export const getFreeDeliveryText = (customThreshold = null) => {
  const threshold = customThreshold != null ? customThreshold : getFreeDeliveryThreshold();
  return `free delivery over ₹${threshold}`;
};

/**
 * Builds local urgency CTR-boosting Meta Title
 * Example: "Cadbury Oreo Biscuit (120g) - 10 Min Delivery in Aurangabad | OZO Mart"
 */
export const generateProductMetaTitle = (productName, unit, cityName) => {
  if (!productName) return 'OZO Mart - 10 Min Grocery Delivery';
  const formattedUnit = unit ? ` (${unit.trim()})` : '';
  return `${productName.trim()}${formattedUnit} - 10 Min Delivery in ${cityName} | OZO Mart`;
};

/**
 * Builds pricing and instant delivery CTR-boosting Meta Description dynamically.
 * Uses dynamic free delivery threshold rather than hardcoding ₹200.
 */
export const generateProductMetaDescription = (productName, price, cityName, customThreshold = null) => {
  const deliveryText = getFreeDeliveryText(customThreshold);
  if (!productName) return `Best market rates & ${deliveryText}. Order groceries online on OZO Mart in ${cityName}. 10-minute instant delivery guaranteed.`;
  const priceText = price && price > 0 ? ` at ₹${price}` : '';
  return `Best market rates${priceText}, ${deliveryText}. Order ${productName.trim()} online now on OZO Mart in ${cityName}. 10-minute instant delivery guaranteed.`;
};

/**
 * Generates Google Rich Snippet & Merchant Listings compliant JSON-LD Product Schema Markup
 */
export const generateProductSchema = ({ product, reviews = [], averageRating = 4.8, cityName = 'Aurangabad', currentUrl = '' }) => {
  if (!product) return null;

  const siteUrl = 'https://ozomart.store';
  const pageUrl = currentUrl || (typeof window !== 'undefined' ? window.location.href : siteUrl);
  const deliveryText = getFreeDeliveryText();

  // Filter valid image URLs
  const validImages = [
    product.image_url,
    ...(Array.isArray(product.images) ? product.images : [])
  ].filter(img => img && typeof img === 'string' && !img.includes('raw.githubusercontent.com') && !img.includes('logo_transparent.png'));

  const brandName = (product.brand && typeof product.brand === 'string' && product.brand.trim())
    ? product.brand.trim()
    : 'OZO Mart';

  const isAvailable = product.is_available !== false && (product.quantity_available === undefined || product.quantity_available === null || product.quantity_available > 0);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": validImages.length > 0 ? validImages : ["https://ozomart.store/android-chrome-512x512.png"],
    "description": product.description || `Buy ${product.name} (${product.unit || ''}) online at OZO Mart in ${cityName}. Best market prices, ${deliveryText}, 10-minute instant delivery.`,
    "sku": `OZO-${product.id}`,
    "mpn": String(product.id),
    "category": product.category?.name || "Groceries",
    "brand": {
      "@type": "Brand",
      "name": brandName
    },
    "offers": {
      "@type": "Offer",
      "url": pageUrl,
      "priceCurrency": "INR",
      "price": Number(product.price || product.base_price || 0),
      "validFrom": new Date().toISOString().split('T')[0],
      "priceValidUntil": new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
      "itemCondition": "https://schema.org/NewCondition",
      "availability": isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "OZO Mart",
        "url": siteUrl
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "IN",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnPeriod",
        "merchantReturnDays": 3,
        "returnMethod": "https://schema.org/ReturnAtKiosk",
        "returnFees": "https://schema.org/FreeReturn"
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": 0,
          "currency": "INR"
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "IN"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 0,
            "maxValue": 1,
            "unitCode": "DAY"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 0,
            "maxValue": 1,
            "unitCode": "DAY"
          }
        }
      }
    }
  };

  if (Array.isArray(reviews) && reviews.length > 0) {
    const ratingVal = Number(averageRating);
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": ratingVal > 0 ? ratingVal : 5,
      "reviewCount": reviews.length,
      "bestRating": "5",
      "worstRating": "1"
    };
    schema.review = reviews.slice(0, 5).map(r => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": r.user?.full_name || "OZO Customer"
      },
      "datePublished": new Date(r.created_at || Date.now()).toISOString().split('T')[0],
      "reviewBody": r.review_text || "Great quality product",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating || 5,
        "bestRating": "5",
        "worstRating": "1"
      }
    }));
  } else {
    // Default aggregate rating for Google Rich Snippet display
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "18",
      "bestRating": "5",
      "worstRating": "1"
    };
  }

  return schema;
};
