import { useEffect } from 'react';

const SEO = ({ title, description, keywords, canonical, schema }) => {
  useEffect(() => {
    // 1. Update document title
    if (title) {
      document.title = title;
    }

    // 2. Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (description) {
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
    }

    // 3. Update meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (keywords) {
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords);
    }

    // 4. Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', canonical);
    } else {
      // Default canonical to current URL
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', window.location.origin + window.location.pathname);
    }

    // 5. Update Open Graph and Twitter Meta Tags
    const updateMeta = (propertyAttr, propertyVal, contentVal) => {
      let element = document.querySelector(`meta[${propertyAttr}="${propertyVal}"]`);
      if (contentVal) {
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute(propertyAttr, propertyVal);
          document.head.appendChild(element);
        }
        element.setAttribute('content', contentVal);
      } else if (element) {
        element.remove();
      }
    };

    // Update OG & Twitter titles
    if (title) {
      updateMeta('property', 'og:title', title);
      updateMeta('name', 'twitter:title', title);
    }

    // Update OG & Twitter descriptions
    if (description) {
      updateMeta('property', 'og:description', description);
      updateMeta('name', 'twitter:description', description);
    }

    // Update OG URL & Twitter URL (critical for correct social share URL)
    const currentUrl = window.location.origin + window.location.pathname;
    updateMeta('property', 'og:url', currentUrl);
    updateMeta('name', 'twitter:url', currentUrl);

    // Update OG & Twitter images
    const defaultImage = 'https://ozomart.store/android-chrome-512x512.png';
    updateMeta('property', 'og:image', defaultImage);
    updateMeta('name', 'twitter:image', defaultImage);

    // 6. Update JSON-LD schema script
    let schemaScript = document.getElementById('ozo-page-schema');
    if (schema) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.id = 'ozo-page-schema';
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schema);
    } else if (schemaScript) {
      schemaScript.remove();
    }

    return () => {
      // Clean up dynamic schema when unmounted to prevent pollution
      const currentSchemaScript = document.getElementById('ozo-page-schema');
      if (currentSchemaScript) {
        currentSchemaScript.remove();
      }
    };
  }, [title, description, keywords, canonical, schema]);

  return null;
};

export default SEO;
