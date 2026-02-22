import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Premium SEO-Optimized Breadcrumb Component for Ozo Mart
 * 
 * Features:
 * - Full JSON-LD schema (BreadcrumbList) injection for Google Rich Snippets
 * - Semantic HTML microdata structure (itemscope, itemtype, itemprop)
 * - Beautiful premium layout, horizontal scroll on mobile, custom icons
 * - Motion animations for smooth loading
 * 
 * Props:
 * @param {Array} items - Array of breadcrumb items: [{ name: string, url?: string }]
 * @param {boolean} showHomeIcon - Whether to display a home icon for the first link
 * @param {React.ReactNode} separator - Custom separator component (defaults to ChevronRight)
 * @param {string} className - Additional CSS class names
 */
const Breadcrumb = ({ 
  items = [], 
  showHomeIcon = true, 
  separator = <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />,
  className = "" 
}) => {
  
  useEffect(() => {
    if (!items || items.length === 0) return;

    // Generate JSON-LD schema dynamically
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ozomart.store';
    const href = typeof window !== 'undefined' ? window.location.href : 'https://ozomart.store';

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => {
        // Construct absolute URL for SEO validity
        const absoluteUrl = item.url
          ? item.url.startsWith('http')
            ? item.url
            : `${origin}${item.url}`
          : href;

        return {
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": absoluteUrl
        };
      })
    };

    // Inject schema to head
    let schemaScript = document.getElementById('ozo-breadcrumb-schema');
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'ozo-breadcrumb-schema';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(breadcrumbSchema);

    // Clean up on unmount
    return () => {
      const existingScript = document.getElementById('ozo-breadcrumb-schema');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [items]);

  if (!items || items.length === 0) return null;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: -4 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        staggerChildren: 0.05,
        duration: 0.3,
        ease: "easeOut"
      } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`w-full overflow-hidden ${className}`}
    >
      <motion.ol 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        itemScope 
        itemType="https://schema.org/BreadcrumbList"
        className="flex items-center gap-2 text-xs font-bold text-ozo-gray dark:text-gray-400 uppercase tracking-wider overflow-x-auto scrollbar-hide py-2 flex-nowrap whitespace-nowrap"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isHome = index === 0 && (item.url === '/' || item.name.toLowerCase() === 'home');
          
          return (
            <motion.li 
              key={index}
              variants={itemVariants}
              itemProp="itemListElement" 
              itemScope 
              itemType="https://schema.org/ListItem"
              className="flex items-center gap-2"
            >
              {/* Position metadata for SEO */}
              <meta itemProp="position" content={String(index + 1)} />

              {isLast ? (
                // Current page / Active item (no link)
                <span 
                  itemProp="name" 
                  className="text-gray-950 dark:text-white font-black truncate max-w-[260px] md:max-w-md transition-colors duration-300"
                >
                  {isHome && showHomeIcon ? (
                    <span className="flex items-center gap-1.5">
                      <Home size={14} className="text-gray-950 dark:text-white" />
                      <span>{item.name}</span>
                    </span>
                  ) : (
                    item.name
                  )}
                </span>
              ) : (
                // Linked pages
                <>
                  <Link 
                    to={item.url || '/'} 
                    className="group flex items-center gap-1.5 hover:text-ozo-red transition-all duration-300 relative py-1"
                  >
                    {isHome && showHomeIcon ? (
                      <span className="flex items-center gap-1.5 text-ozo-gray hover:text-ozo-red dark:text-gray-400 dark:group-hover:text-ozo-red transition-colors duration-300">
                        <Home size={14} className="text-current transition-transform duration-300 group-hover:scale-110" />
                        <span itemProp="name">{item.name}</span>
                      </span>
                    ) : (
                      <span 
                        itemProp="name" 
                        className="text-current"
                      >
                        {item.name}
                      </span>
                    )}
                  </Link>
                  {/* Microdata absolute URL path for validation compatibility (outside <a> tag to be valid HTML) */}
                  <link itemProp="item" href={item.url ? (item.url.startsWith('http') ? item.url : `${typeof window !== 'undefined' ? window.location.origin : ''}${item.url}`) : '/'} />
                </>
              )}

              {/* Render separator if not the last item */}
              {!isLast && separator}
            </motion.li>
          );
        })}
      </motion.ol>
    </nav>
  );
};

export default Breadcrumb;
