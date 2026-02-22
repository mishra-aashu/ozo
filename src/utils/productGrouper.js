/**
 * Groups similar products (e.g. variants of Brinjal, Tomato, Potato, etc.) into virtual products.
 * This prevents identical or highly similar products from cluttering the listing pages.
 */
export const groupProducts = (products) => {
  if (!products || products.length === 0) return [];

  // Group definitions with keywords and exclusions
  const GROUPS = [
    {
      key: 'brinjal',
      name: 'Brinjal (Baigan)',
      keywords: ['brinjal', 'eggplant', 'baigan'],
    },
    {
      key: 'tomato',
      name: 'Tomato (Tamatar)',
      keywords: ['tomato', 'tomatoes'],
      exclude: ['salad kit'],
    },
    {
      key: 'potato',
      name: 'Potato (Aloo)',
      keywords: ['potato', 'aloo'],
      exclude: ['sweet potato', 'shakarkand'],
    },
    {
      key: 'onion',
      name: 'Onion (Pyaz)',
      keywords: ['onion', 'pyaz'],
    },
    {
      key: 'carrot',
      name: 'Carrot (Gajar)',
      keywords: ['carrot', 'gajar'],
    },
    {
      key: 'broccoli',
      name: 'Broccoli',
      keywords: ['broccoli'],
      exclude: ['salad kit'],
    },
    {
      key: 'cabbage',
      name: 'Cabbage (Patta Gobhi)',
      keywords: ['cabbage', 'gobhi'],
      exclude: ['cauliflower', 'phool gobhi', 'broccoli'],
    },
    {
      key: 'cauliflower',
      name: 'Cauliflower (Phool Gobhi)',
      keywords: ['cauliflower', 'phool gobhi'],
    },
    {
      key: 'lauki',
      name: 'Bottle Gourd (Lauki)',
      keywords: ['bottle gourd', 'lauki', 'ghiya'],
      exclude: ['bitter gourd', 'karela'],
    },
    {
      key: 'bitter_gourd',
      name: 'Bitter Gourd (Karela)',
      keywords: ['bitter gourd', 'karela'],
    },
    {
      key: 'papaya',
      name: 'Papaya (Papita)',
      keywords: ['papaya', 'papita'],
    },
    {
      key: 'capsicum',
      name: 'Capsicum (Shimla Mirch)',
      keywords: ['capsicum', 'bell pepper', 'shimla mirch'],
    },
  ];

  // Specific high-quality short names for UI pills/buttons
  const shortNames = {
    // Eggplants
    "Organic Long Purple Eggplant (Baigan)": "Organic Long",
    "Fresh Round Eggplant (Bharta Baigan)": "Bharta (Round)",
    "Green Long Brinjal": "Green Long",
    "Small Round Purple Brinjal (Katai Baigan)": "Katai Baigan",
    "Striped Brinjal (Graffiti Eggplant)": "Graffiti Striped",

    // Tomatoes
    "Fresh Hybrid Tomatoes (Local)": "Hybrid Local",
    "Fresh Red Tomatoes": "Fresh Red",
    "Green Tomatoes (Kacha Tamatar)": "Kacha (Green)",
    "Organic Vine Tomatoes": "Vine Organic",
    "Cherry Tomatoes": "Sweet Cherry",

    // Potatoes
    "Premium Potato (Aloo)": "Premium",
    "Baby Potato (Chhota Aloo)": "Baby Potato",
    "Jyoti Potato (Best for French Fries)": "Jyoti (Fries)",
    "New Crop Potato (Naya Aloo)": "New Crop",

    // Onions
    "Fresh Red Onion (Pyaz)": "Red Onion",

    // Carrots
    "Fresh Orange Carrot (Gajar)": "Orange",
    "Red Carrot (Delhi Gajar)": "Delhi Red",
    "Local Farm Carrots": "Local",
    "Organic Carrot Pack": "Organic Pack",
    "Baby Carrots (Ooty)": "Baby (Ooty)",

    // Broccoli
    "Fresh Broccoli Crowns": "Crowns",
    "Local Farm Broccoli": "Local Farm",
    "Organic Broccoli (Pack of 2)": "Organic x2",
    "Premium Green Broccoli": "Premium Green",
    "Tender Baby Broccoli": "Tender Baby",

    // Cabbage
    "Fresh Cabbage (Patta Gobhi)": "Fresh Regular",
    "Organic Green Cabbage": "Organic Green",
    "Red Cabbage (Lal Patta Gobhi)": "Red Cabbage",
    "Savoy Cabbage": "Savoy Premium",
    "Shredded / Local Cabbage": "Shredded/Local",

    // Cauliflower
    "Fresh Cauliflower (Phool Gobhi)": "Fresh Regular",
    "Local Farm Phool Gobhi": "Local Farm",
    "Organic Cauliflower (Gobhi)": "Organic Gobhi",
    "Purple Cauliflower (Exotic)": "Purple Exotic",
    "Yellow Cauliflower (Exotic)": "Yellow Exotic",

    // Bottle Gourds
    "Fresh Bottle Gourd (Lauki)": "Fresh Regular",
    "Desi Lauki (Local)": "Desi Local",
    "Long Green Lauki": "Long Green",
    "Tender Bottle Gourd": "Tender Gourd",
    "Organic Round Bottle Gourd (Ghiya)": "Round Ghiya",

    // Bitter Gourds
    "Fresh Bitter Gourd (Karela)": "Fresh Regular",
    "Desi Karela (Local Farm)": "Desi Local",
    "Organic Green Bitter Gourd": "Organic Green",
    "Small Bitter Gourd (Chhota Karela)": "Small Chhota",
    "Premium Bitter Gourd (Pack of 2)": "Premium x2",

    // Papayas
    "Fresh Ripe Papaya (Papita)": "Ripe Papaya",
    "Premium Sweet Papaya": "Premium Sweet",
    "Raw Green Papaya (Kacha Papita)": "Raw Green",
    "Red Lady Papaya": "Red Lady",
    "Semi-Ripe Papaya": "Semi-Ripe",

    // Capsicums
    "Fresh Green Capsicum (Shimla Mirch)": "Green",
    "Fresh Red Bell Pepper (Lal Shimla Mirch)": "Red Bell",
    "Fresh Yellow Bell Pepper": "Yellow Bell",
    "Orange Bell Pepper": "Orange Bell",
    "Assorted Bell Peppers (Color Capsicum Mix)": "Color Mix",
  };

  const groupedList = [];
  const processedIds = new Set();

  for (const groupDef of GROUPS) {
    const matchingProducts = products.filter(p => {
      if (processedIds.has(p.id)) return false;
      
      const nameLower = p.name.toLowerCase();
      
      const matchesKeyword = groupDef.keywords.some(kw => nameLower.includes(kw));
      if (!matchesKeyword) return false;
      
      if (groupDef.exclude) {
        const matchesExclude = groupDef.exclude.some(ex => nameLower.includes(ex));
        if (matchesExclude) return false;
      }
      
      return true;
    });

    if (matchingProducts.length > 0) {
      // Mark matching products as processed
      matchingProducts.forEach(p => processedIds.add(p.id));

      // Sort variants by price ascending so the cheapest displays first
      matchingProducts.sort((a, b) => a.price - b.price);

      // Create variants array with short names
      const variants = matchingProducts.map(p => ({
        ...p,
        variantName: shortNames[p.name] || p.name
      }));

      // Base product is the first one in sorted order
      const baseProduct = { ...matchingProducts[0] };

      groupedList.push({
        ...baseProduct,
        name: groupDef.name,
        variants
      });
    }
  }

  // Add all other products that did not fit into any group
  products.forEach(p => {
    if (!processedIds.has(p.id)) {
      groupedList.push(p);
    }
  });

  return groupedList;
};

/**
 * Gets all variants of a product from a list of products (used on details page)
 */
export const getProductVariants = (product, allProducts) => {
  if (!product || !allProducts || allProducts.length === 0) return [];
  
  const GROUPS = [
    {
      key: 'brinjal',
      keywords: ['brinjal', 'eggplant', 'baigan'],
    },
    {
      key: 'tomato',
      keywords: ['tomato', 'tomatoes'],
      exclude: ['salad kit'],
    },
    {
      key: 'potato',
      keywords: ['potato', 'aloo'],
      exclude: ['sweet potato', 'shakarkand'],
    },
    {
      key: 'onion',
      keywords: ['onion', 'pyaz'],
    },
    {
      key: 'carrot',
      keywords: ['carrot', 'gajar'],
    },
    {
      key: 'broccoli',
      keywords: ['broccoli'],
      exclude: ['salad kit'],
    },
    {
      key: 'cabbage',
      keywords: ['cabbage', 'gobhi'],
      exclude: ['cauliflower', 'phool gobhi', 'broccoli'],
    },
    {
      key: 'cauliflower',
      keywords: ['cauliflower', 'phool gobhi'],
    },
    {
      key: 'lauki',
      keywords: ['bottle gourd', 'lauki', 'ghiya'],
      exclude: ['bitter gourd', 'karela'],
    },
    {
      key: 'bitter_gourd',
      keywords: ['bitter gourd', 'karela'],
    },
    {
      key: 'papaya',
      keywords: ['papaya', 'papita'],
    },
    {
      key: 'capsicum',
      keywords: ['capsicum', 'bell pepper', 'shimla mirch'],
    },
  ];

  const nameLower = product.name.toLowerCase();
  const matchedGroup = GROUPS.find(g => {
    const matchesKeyword = g.keywords.some(kw => nameLower.includes(kw));
    if (!matchesKeyword) return false;
    
    if (g.exclude) {
      const matchesExclude = g.exclude.some(ex => nameLower.includes(ex));
      if (matchesExclude) return false;
    }
    return true;
  });

  if (!matchedGroup) return [];

  const shortNames = {
    "Organic Long Purple Eggplant (Baigan)": "Organic Long",
    "Fresh Round Eggplant (Bharta Baigan)": "Bharta (Round)",
    "Green Long Brinjal": "Green Long",
    "Small Round Purple Brinjal (Katai Baigan)": "Katai Baigan",
    "Striped Brinjal (Graffiti Eggplant)": "Graffiti Striped",
    "Fresh Hybrid Tomatoes (Local)": "Hybrid Local",
    "Fresh Red Tomatoes": "Fresh Red",
    "Green Tomatoes (Kacha Tamatar)": "Kacha (Green)",
    "Organic Vine Tomatoes": "Vine Organic",
    "Cherry Tomatoes": "Sweet Cherry",
    "Premium Potato (Aloo)": "Premium",
    "Baby Potato (Chhota Aloo)": "Baby Potato",
    "Jyoti Potato (Best for French Fries)": "Jyoti (Fries)",
    "New Crop Potato (Naya Aloo)": "New Crop",
    "Fresh Red Onion (Pyaz)": "Red Onion",
    "Fresh Orange Carrot (Gajar)": "Orange",
    "Red Carrot (Delhi Gajar)": "Delhi Red",
    "Local Farm Carrots": "Local",
    "Organic Carrot Pack": "Organic Pack",
    "Baby Carrots (Ooty)": "Baby (Ooty)",
    "Fresh Broccoli Crowns": "Crowns",
    "Local Farm Broccoli": "Local Farm",
    "Organic Broccoli (Pack of 2)": "Organic x2",
    "Premium Green Broccoli": "Premium Green",
    "Tender Baby Broccoli": "Tender Baby",
    "Fresh Cabbage (Patta Gobhi)": "Fresh Regular",
    "Organic Green Cabbage": "Organic Green",
    "Red Cabbage (Lal Patta Gobhi)": "Red Cabbage",
    "Savoy Cabbage": "Savoy Premium",
    "Shredded / Local Cabbage": "Shredded/Local",
    "Fresh Cauliflower (Phool Gobhi)": "Fresh Regular",
    "Local Farm Phool Gobhi": "Local Farm",
    "Organic Cauliflower (Gobhi)": "Organic Gobhi",
    "Purple Cauliflower (Exotic)": "Purple Exotic",
    "Yellow Cauliflower (Exotic)": "Yellow Exotic",
    "Fresh Bottle Gourd (Lauki)": "Fresh Regular",
    "Desi Lauki (Local)": "Desi Local",
    "Long Green Lauki": "Long Green",
    "Tender Bottle Gourd": "Tender Gourd",
    "Organic Round Bottle Gourd (Ghiya)": "Round Ghiya",
    "Fresh Bitter Gourd (Karela)": "Fresh Regular",
    "Desi Karela (Local Farm)": "Desi Local",
    "Organic Green Bitter Gourd": "Organic Green",
    "Small Bitter Gourd (Chhota Karela)": "Small Chhota",
    "Premium Bitter Gourd (Pack of 2)": "Premium x2",
    "Fresh Ripe Papaya (Papita)": "Ripe Papaya",
    "Premium Sweet Papaya": "Premium Sweet",
    "Raw Green Papaya (Kacha Papita)": "Raw Green",
    "Red Lady Papaya": "Red Lady",
    "Semi-Ripe Papaya": "Semi-Ripe",
    "Fresh Green Capsicum (Shimla Mirch)": "Green",
    "Fresh Red Bell Pepper (Lal Shimla Mirch)": "Red Bell",
    "Fresh Yellow Bell Pepper": "Yellow Bell",
    "Orange Bell Pepper": "Orange Bell",
    "Assorted Bell Peppers (Color Capsicum Mix)": "Color Mix",
  };

  return allProducts
    .filter(p => {
      const pNameLower = p.name.toLowerCase();
      const matchesKeyword = matchedGroup.keywords.some(kw => pNameLower.includes(kw));
      if (!matchesKeyword) return false;
      
      if (matchedGroup.exclude) {
        const matchesExclude = matchedGroup.exclude.some(ex => pNameLower.includes(ex));
        if (matchesExclude) return false;
      }
      return true;
    })
    .map(p => ({
      ...p,
      variantName: shortNames[p.name] || p.name
    }))
    .sort((a, b) => a.price - b.price);
};
