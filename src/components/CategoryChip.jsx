import { memo } from 'react'
import { motion } from 'framer-motion'
import { getOptimizedImageUrl } from '../utils/imageOptimizer'
import { 
  ChevronRight, 
  Apple, 
  Milk, 
  Popcorn, 
  CupSoda, 
  Soup, 
  Coffee, 
  Croissant, 
  Candy, 
  Wheat, 
  Droplets, 
  Sparkles, 
  User, 
  Baby, 
  Dog, 
  Pill,
  Box,
  Leaf,
  Flame,
  Sun,
  IceCream
} from 'lucide-react'
import * as Lucide from 'lucide-react'

// Helper to identify categories that are listing/coming soon (fruits, vegetables, etc.)
export const isCategoryListingSoon = (category) => {
  if (!category) return false
  const slug = (category.slug || '').toLowerCase()
  const name = (category.name || '').toLowerCase()
  
  return (
    slug === 'fruits' ||
    slug === 'vegetables' ||
    slug === 'fresh-fruits' ||
    slug === 'dry-fruits-nuts' ||
    slug === 'root-vegetables' ||
    slug === 'leafy-greens' ||
    slug === 'fruiting-vegetables' ||
    slug === 'flower-vegetables' ||
    slug === 'pods-legumes' ||
    slug === 'mushrooms' ||
    slug.includes('fruit') ||
    slug.includes('veg') ||
    name.includes('fruit') ||
    name.includes('vegetable')
  )
}

// Dynamically resolve category icons (supporting emojis, mapped items, and custom Lucide names)
export const resolveCategoryIcon = (category) => {
  if (!category) return Box

  const iconName = category.icon?.trim()
  if (iconName) {
    // 1. Direct Lucide icon component name check (case-insensitive)
    const directIconKey = Object.keys(Lucide).find(
      key => key.toLowerCase() === iconName.toLowerCase()
    )
    if (directIconKey && Lucide[directIconKey]) {
      return Lucide[directIconKey]
    }
  }

  // 2. Keyword check on slug/name to find matching icon dynamically
  const slug = category.slug?.toLowerCase() || ''
  const name = category.name?.toLowerCase() || ''
  const searchKey = `${slug} ${name}`

  if (searchKey.includes('summer') || searchKey.includes('selection')) return Sun
  if (searchKey.includes('ice cream') || searchKey.includes('icecream') || searchKey.includes('dessert')) return IceCream
  if (searchKey.includes('veg') || searchKey.includes('spice') || searchKey.includes('season')) return Leaf
  if (searchKey.includes('fruit')) return Apple
  if (searchKey.includes('dairy') || searchKey.includes('milk') || searchKey.includes('breakfast')) return Milk
  if (searchKey.includes('snack') || searchKey.includes('munch') || searchKey.includes('popcorn') || searchKey.includes('namkeen')) return Popcorn
  if (searchKey.includes('drink') || searchKey.includes('juice') || searchKey.includes('beverage')) return CupSoda
  if (searchKey.includes('bakery') || searchKey.includes('bread') || searchKey.includes('grain') || searchKey.includes('biscuit')) return Croissant
  if (searchKey.includes('sweet') || searchKey.includes('candy') || searchKey.includes('baking')) return Candy
  if (searchKey.includes('dal') || searchKey.includes('wheat') || searchKey.includes('rice') || searchKey.includes('pulse') || searchKey.includes('grain')) return Wheat
  if (searchKey.includes('oil') || searchKey.includes('fat') || searchKey.includes('drop')) return Droplets
  if (searchKey.includes('clean') || searchKey.includes('house') || searchKey.includes('special')) return Sparkles
  if (searchKey.includes('personal') || searchKey.includes('care') || searchKey.includes('hygiene') || searchKey.includes('user')) return User
  if (searchKey.includes('baby') || searchKey.includes('infant')) return Baby
  if (searchKey.includes('pet') || searchKey.includes('dog') || searchKey.includes('cat')) return Dog
  if (searchKey.includes('pharma') || searchKey.includes('well') || searchKey.includes('pill')) return Pill
  if (searchKey.includes('pooja') || searchKey.includes('spirit') || searchKey.includes('flame')) return Flame
  if (searchKey.includes('frozen') || searchKey.includes('ready') || searchKey.includes('instant') || searchKey.includes('soup') || searchKey.includes('pickle')) return Soup

  return Box
}

export const premiumGradients = [
  'from-green-500/10 to-green-600/10 text-green-600',
  'from-amber-500/10 to-orange-600/10 text-orange-600',
  'from-yellow-500/10 to-yellow-600/10 text-yellow-600',
  'from-blue-500/10 to-blue-600/10 text-blue-600',
  'from-orange-500/10 to-orange-600/10 text-orange-600',
  'from-cyan-500/10 to-cyan-600/10 text-cyan-600',
  'from-red-500/10 to-red-600/10 text-red-600',
  'from-pink-500/10 to-pink-600/10 text-pink-600',
  'from-purple-500/10 to-purple-600/10 text-purple-600',
  'from-teal-500/10 to-teal-600/10 text-teal-600'
]

export const getGradient = (slug, name) => {
  const key = slug || name || ''
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % premiumGradients.length
  return premiumGradients[index]
}

const CategoryChip = memo(({ category, isActive = false, onClick, size = 'default' }) => {
  const sizes = {
    small: {
      container: 'w-[75px] md:w-[110px] h-auto p-1',
      iconWrapper: 'w-14 h-14 md:w-20 md:h-20',
      iconSize: 24,
      textSize: 'text-[9px] md:text-xs'
    },
    default: {
      container: 'w-[85px] md:w-[130px] h-auto p-2',
      iconWrapper: 'w-16 h-16 md:w-24 md:h-24',
      iconSize: 28,
      textSize: 'text-[10px] md:text-sm'
    },
    large: {
      container: 'w-[100px] md:w-[150px] h-auto p-3',
      iconWrapper: 'w-20 h-20 md:w-28 md:h-28',
      iconSize: 32,
      textSize: 'text-xs md:text-base'
    }
  }
  const currentSize = sizes[size] || sizes.default
  const isEmoji = category?.icon && category.icon.codePointAt(0) > 127
  const IconComponent = resolveCategoryIcon(category)
  const gradientClasses = getGradient(category?.slug, category?.name) || 'from-zinc-500/10 to-zinc-600/10 text-zinc-600'
  const isListingSoon = isCategoryListingSoon(category)

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        flex flex-col items-center transition-all duration-300 relative group
        ${currentSize.container}
        ${isActive ? 'opacity-100' : 'opacity-80 hover:opacity-100'}
      `}
    >
      <div className={`
        ${currentSize.iconWrapper}
        flex items-center justify-center rounded-[1.5rem] md:rounded-[2.5rem] mb-2 transition-all duration-500 relative backdrop-blur-sm
        bg-gradient-to-br ${gradientClasses?.split?.(' ')?.slice?.(0, 2)?.join?.(' ')}
        ${isActive ? 'ring-2 ring-ozo-red ring-offset-2 dark:ring-offset-[#0a0a0a] shadow-lg shadow-ozo-red/20' : 'border border-white/20 dark:border-white/5 shadow-sm hover:shadow-md'}
      `}>
        {isEmoji ? (
          <span 
            className="transition-transform duration-500 group-hover:scale-110"
            style={{ fontSize: `${currentSize.iconSize}px` }}
          >
            {category?.icon}
          </span>
        ) : (
          <IconComponent 
            size={currentSize.iconSize} 
            className={`${gradientClasses?.split?.(' ')?.[2] || ''} transition-transform duration-500 group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}
            strokeWidth={2}
          />
        )}
        
        {isActive && (
          <motion.div 
            layoutId="active-dot"
            className="absolute -bottom-1 w-1.5 h-1.5 bg-ozo-red rounded-full"
          />
        )}

        {isListingSoon && (
          <div className="absolute inset-0 bg-black/5 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center">
            <span className="bg-amber-500 text-white text-[8px] md:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-md scale-95">
              Soon
            </span>
          </div>
        )}
      </div>

      <span className={`
        ${currentSize.textSize} font-black text-center leading-tight transition-colors duration-300 w-full px-1
        ${isActive ? 'text-ozo-red' : 'text-zinc-800 dark:text-zinc-300'}
        line-clamp-2
      `}>
        {category?.name}
      </span>
    </motion.button>
  )
})

// High quality fallback images — exact filenames verified in git (public/images/products/)
const categoryFallbackImages = {
  // Summer Specials
  'summer-specials':     '/images/products/baskin-robbins-almond-caramel-ice-cream-stick-pack-of-2-2x65ml.png',
  'cold-drinks':         '/images/products/pepsi-soft-drink-750ml.png',
  'ice-creams-desserts': '/images/products/baskin-robbins-almond-caramel-ice-cream-stick-pack-of-2-2x65ml.png',

  // Fruits & Vegetables
  'fruits-vegetables':   '/images/products/fresh-red-apple-seb-fres.jpg',
  'fruits':              '/images/products/fresh-red-apple-seb-fres.jpg',
  'fresh-fruits':        '/images/products/litchi-500-g-500g.png',
  'vegetables':          '/images/products/hybrid-tomato-tamatar-500g.png',
  'leafy':               '/images/products/fresh-coriander-leaves-dhaniya-2102b8.jpg',
  'root-veg':            '/images/products/fresh-ginger-adrak-cf1992.jpg',
  'fruiting-veg':        '/images/products/kakdi-500g.png',
  'pods':                '/images/products/fresh-green-peas-hari-matar-ab446b.jpg',
  'mushroom':            '/images/products/fresh-green-peas-hari-matar-ab446b.jpg',
  'dry-fruits':          '/images/products/kelloggs-almonds-honey-corn-flakes-pringles-scorchin-red-hot-chilli-potato-chips-combo-168g40g.png',
  // Dairy
  'dairy':               '/images/products/amul-taaza-toned-milk-500-ml.png',
  'milk':                '/images/products/amul-taaza-toned-milk-500-ml.png',
  'curd':                '/images/products/amul-taaza-toned-milk-500-ml.png',
  'butter':              '/images/products/fortune-multigrain-atta-5kg.png',
  'cheese':              '/images/products/amul-creami-cheese-spread-pack-of-2-2x180g.png',
  'paneer':              '/images/products/amul-creami-cheese-spread-pack-of-2-2x180g.png',
  'cream':               '/images/products/amul-cream-cheese-180g.png',
  // Bakery & Grains
  'bakery':              '/images/products/britannia-good-day-chunkies-coconut-cookies-100g.png',
  'biscuit':             '/images/products/parle-marie-biscuits-800g.png',
  'cake':                '/images/products/britannia-english-pound-cake-250g.png',
  'bread':               '/images/products/id-whole-wheat-chapati-10-pieces-10pcs.png',
  'rusk':                '/images/products/bb-bharat-bazaar-gur-rusk-600g.png',
  'flour':               '/images/products/fortune-multigrain-atta-5kg.png',
  'atta':                '/images/products/fortune-multigrain-atta-5kg.png',
  'rice':                '/images/products/india-gate-classic-gold-standard-basmati-rice-extra-long-grain-1kg.png',
  'cereal':              '/images/products/kelloggs-almonds-honey-corn-flakes-pringles-scorchin-red-hot-chilli-potato-chips-combo-168g40g.png',
  // Pulses & Lentils
  'dals':                '/images/products/fortune-kala-chana-unpolished-500g.png',
  'pulse':               '/images/products/fortune-kala-chana-unpolished-500g.png',
  'lentil':              '/images/products/fortune-kala-chana-unpolished-500g.png',
  'sprout':              '/images/products/mixed-sprouts-200g.png',
  // Spices & Seasonings
  'spices':              '/images/products/catch-kashmiri-red-chilli-powder-100-g.png',
  'masala':              '/images/products/mdh-kitchen-king-masala-100-g.png',
  'mixed-spice':         '/images/products/mdh-garam-masala-100-g_1.png',
  // Oils & Fats
  'oil':                 '/images/products/dove-serum-bar-soap-with-sandalwood-oil-3x125g.png',
  'ghee':                '/images/products/the-chakki-co-desi-ghee-atta-jaggery-bakery-biscuits-400g.png',
  // Pickles, Sauces
  'pickle':              '/images/products/mithila-special-homemade-mango-pickle.jpg',
  'sauce':               '/images/products/mithila-special-homemade-mango-pickle.jpg',
  'chutney':             '/images/products/mithila-special-homemade-mango-pickle.jpg',
  // Snacks
  'snacks':              '/images/products/haldirams-aloo-bhujia-1kg.png',
  'namkeen':             '/images/products/lets-try-khatta-meetha-namkeen-173g.png',
  'munchies':            '/images/products/lays-american-style-cream-onion-flavour-potato-chips-26g.png',
  // Beverages
  'beverage':            '/images/products/pepsi-soft-drink-750ml.png',
  'soft-drink':          '/images/products/pepsi-soft-drink-750ml.png',
  'tea':                 '/images/products/kesar-gold-tea-500g.png',
  'coffee':              '/images/products/beanly-choco-hazelnut-spread-with-breadsticks-52g.png',
  'juice':               '/images/products/real-fruit-power-alphonso-nectar-mango-drink-1ltr.png',
  'health-drink':        '/images/products/nestle-milo-rtd-malt-drink-with-millets-pack-of-2-2x180ml.png',
  // Instant & Frozen
  'noodles':             '/images/products/yippee-magic-masala-instant-noodles-with-added-veggies-2904g.png',
  'instant':             '/images/products/yippee-magic-masala-instant-noodles-with-added-veggies-2904g.png',
  'frozen':              '/images/products/baskin-robbins-vanilla-ice-cream-tub-450ml.png',
  'ice-cream':           '/images/products/baskin-robbins-almond-caramel-ice-cream-stick-pack-of-2-2x65ml.png',
  // Baking & Sweets
  'baking':              '/images/products/aashirvaad-low-gi-sugar-release-control-atta-5kg.png',
  'sweet':               '/images/products/bauli-moonfils-choco-vanilla-twin-crme-soft-croissant-eggless-110g.png',
  'mithai':              '/images/products/bikano-all-time-mixture-namkeen-200g.png',
  // Mithila Specials
  'mithila':             '/images/products/thekua.png',
  'bihar':               '/images/products/thekua.png',
  // Personal Care
  'personal-care':       '/images/products/dove-serum-bar-soap-with-sandalwood-oil-3x125g.png',
  'hygiene':             '/images/products/dove-serum-bar-soap-with-sandalwood-oil-3x125g.png',
  'skin':                '/images/products/nivea-aloe-hydration-body-lotion-400ml.png',
  'hair':                '/images/products/dove-intense-repair-shampoo-for-dry-damaged-hair-340ml.png',
  'oral':                '/images/products/colgate-strong-teeth-toothpaste-with-free-toothbrush-300g.png',
  'deo':                 '/images/products/nivea-fresh-natural-womens-deodorant-150ml.png',
  'mens':                '/images/products/park-avenue-good-morning-mens-grooming-kit-1pc.png',
  // Baby & Infant
  'baby':                '/images/products/baby-care-category.png',
  'infant':              '/images/products/baby-care-category.png',
  // Pet
  'pet':                 '/images/products/haldirams-aloo-bhujia-1kg.png',
  'dog':                 '/images/products/haldirams-aloo-bhujia-1kg.png',
  'cat':                 '/images/products/haldirams-aloo-bhujia-1kg.png',
  // Household & Cleaning
  'household':           '/images/products/dove-serum-bar-soap-with-sandalwood-oil-3x125g.png',
  'cleaning':            '/images/products/dove-serum-bar-soap-with-sandalwood-oil-3x125g.png',
  'detergent':           '/images/products/dove-serum-bar-soap-with-sandalwood-oil-3x125g.png',
  'dishwash':            '/images/products/dove-serum-bar-soap-with-sandalwood-oil-3x125g.png',
  'floor':               '/images/products/dove-serum-bar-soap-with-sandalwood-oil-3x125g.png',
  'tissue':              '/images/products/dove-serum-bar-soap-with-sandalwood-oil-3x125g.png',
  // Pooja & Spiritual
  'pooja':               '/images/products/thekua.png',
  'spiritual':           '/images/products/thekua.png',
};

const getCategoryFallbackImage = (slug, name) => {
  const cleanSlug = (slug || '')?.toLowerCase();
  const cleanName = (name || '')?.toLowerCase();
  const key = Object.keys(categoryFallbackImages).find(k => 
    cleanSlug.includes(k) || cleanName.includes(k)
  );
  return key ? categoryFallbackImages[key] : '/images/products/fresh-red-apple-seb-fres.jpg';
};

// Helper to find relevant product image for a category
const getCategoryProductImage = (category, products) => {
  if (!category) return null;
  
  const isPlaceholder = (url) => !url || url === 'null' || url.includes('unsplash.com') || url.includes('photo-1542838132');
  
  // 0. Prioritize category's own valid image_url from database
  if (category.image_url && !isPlaceholder(category.image_url)) {
    return category.image_url;
  }
  
  const slug = category.slug?.toLowerCase() || '';
  const name = category.name?.toLowerCase() || '';
  
  // 1. Exact or parent category ID matching
  let match = products?.find(p => 
    (p.category_id === category.id || 
     p.category?.id === category.id ||
     p.category?.parent_id === category.id) &&
    !isPlaceholder(p.image_url)
  );
  if (match?.image_url) return match.image_url;
  
  // 2. Slug keyword matching
  match = products?.find(p => {
    const pSlug = p.category?.slug?.toLowerCase() || '';
    return pSlug && (pSlug.includes(slug) || slug.includes(pSlug)) && !isPlaceholder(p.image_url);
  });
  if (match?.image_url) return match.image_url;

  // 3. Fallback matching based on category slug keywords
  const lowerName = (p) => p.name?.toLowerCase() || '';
  
  if (slug.includes('fruit')) {
    match = products?.find(p => lowerName(p).match(/apple|banana|mango|fruit|seb|kela/) && !isPlaceholder(p.image_url));
  } else if (slug.includes('veg')) {
    match = products?.find(p => lowerName(p).match(/broccoli|spinach|potato|onion|tomato|palak|aloo|pyaz/) && !isPlaceholder(p.image_url));
  } else if (slug.includes('mithila')) {
    match = products?.find(p => lowerName(p).match(/thekua|makhana|pickle|mithila/) && !isPlaceholder(p.image_url));
  } else if (slug.includes('dairy') || slug.includes('milk')) {
    match = products?.find(p => lowerName(p).match(/amul|cream|milk|butter|cheese|paneer|ghee/) && !isPlaceholder(p.image_url));
  } else if (slug.includes('bakery') || slug.includes('grain')) {
    match = products?.find(p => lowerName(p).match(/croissant|bread|bun|cookie|cake|toast/) && !isPlaceholder(p.image_url));
  } else if (slug.includes('beverage') || slug.includes('drink')) {
    match = products?.find(p => lowerName(p).match(/pepsi|coke|drink|juice|soda/) && !isPlaceholder(p.image_url));
  } else if (slug.includes('snack') || slug.includes('munch') || slug.includes('sweet') || slug.includes('tooth')) {
    match = products?.find(p => lowerName(p).match(/bhujia|namkeen|chips|kurkure|snack|candy|gum/) && !isPlaceholder(p.image_url));
  } else if (slug.includes('oil') || slug.includes('fat')) {
    match = products?.find(p => lowerName(p).match(/oil|mustard|refine|ghee/) && !isPlaceholder(p.image_url));
  } else if (slug.includes('spice') || slug.includes('season')) {
    match = products?.find(p => lowerName(p).match(/masala|spice|chilli|turmeric/) && !isPlaceholder(p.image_url));
  } else if (slug.includes('pickle') || slug.includes('sauce') || slug.includes('chutney')) {
    match = products?.find(p => lowerName(p).match(/pickle|sauce|chutney/) && !isPlaceholder(p.image_url));
  }
  
  if (match?.image_url) return match.image_url;
  
  // 4. Return category-specific fallback image to ensure no wrong products are shown
  return getCategoryFallbackImage(slug, name);
};

// Ozo-style detailed category grid
export const OzoCategoryGrid = memo(({ categories, products = [], onCategoryClick }) => {
  return (
    <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-2 xs:gap-2.5 sm:gap-4.5 w-full">
      {categories?.map((category) => {
        const categoryFallback = getCategoryFallbackImage(category?.slug, category?.name);
        const imageUrl = getCategoryProductImage(category, products) || categoryFallback;
        const gradientClasses = getGradient(category?.slug, category?.name) || 'from-zinc-500/10 to-zinc-600/10 text-zinc-600';
        const isListingSoon = isCategoryListingSoon(category);
        
        return (
          <motion.button
            key={category?.id}
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onCategoryClick?.(category)}
            className="flex flex-col items-center justify-start p-2 xs:p-3 sm:p-4 rounded-[1.75rem] sm:rounded-[2rem] border border-black/[0.05] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/10 hover:border-ozo-red/20 dark:hover:border-ozo-red/30 transition-all duration-300 hover:shadow-premium group cursor-pointer w-full relative"
          >
            {/* Image Container with subtle category gradient background */}
            <div className={`
              w-full aspect-square flex items-center justify-center rounded-xl sm:rounded-2xl overflow-hidden mb-2 relative p-1.5 xs:p-2 sm:p-3 transition-all duration-500
              bg-gradient-to-br ${gradientClasses?.split?.(' ')?.slice?.(0, 2)?.join?.(' ')}
              group-hover:scale-105 shadow-inner
            `}>
              <img 
                src={getOptimizedImageUrl(imageUrl, { width: 150, quality: 80 })} 
                alt={category?.name}
                loading="lazy"
                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal rounded-lg drop-shadow-sm filter dark:brightness-95"
                onError={(e) => {
                  const currentSrc = e.target.src;
                  if (!currentSrc.includes(categoryFallback)) {
                    e.target.src = categoryFallback;
                  } else if (!currentSrc.includes('fresh-red-apple-seb-fres.jpg')) {
                    e.target.src = '/images/products/fresh-red-apple-seb-fres.jpg';
                  }
                }}
              />
              
              {isListingSoon && (
                <div className="absolute inset-0 bg-black/5 flex items-center justify-center transition-all duration-300">
                  <span className="bg-amber-500 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                    Listing Soon
                  </span>
                </div>
              )}
            </div>
            
            {/* Label container to prevent truncation and allow proper line wrapping */}
            <div className="w-full min-h-[30px] xs:min-h-[34px] sm:min-h-[44px] flex items-center justify-center">
              <span className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-bold text-center leading-tight text-zinc-800 dark:text-zinc-200 line-clamp-2 break-words w-full px-0.5 group-hover:text-ozo-red transition-colors">
                {category?.name}
              </span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
})

export const CategoryGrid = OzoCategoryGrid

// Category Slider Component
export const CategorySlider = memo(({ categories, onCategoryClick, activeCategory, rows = 1 }) => {
  const shouldScroll = categories?.length > 5;
  
  if (!shouldScroll) {
    return (
      <div className="flex flex-nowrap overflow-x-auto scrollbar-hide items-center gap-4 md:gap-8 py-2 w-full">
        {categories?.map((category) => (
          <div
            key={category?.id}
            className="flex-shrink-0"
          >
            <CategoryChip
              category={category}
              isActive={activeCategory === category?.id}
              onClick={() => onCategoryClick?.(category)}
              size="default"
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 group">
      <div 
        className="flex w-max animate-marquee hover-pause"
        style={{
          '--marquee-duration': `${categories?.length > 0 ? categories.length * 3.5 : 20}s`
        }}
      >
        <div className={`grid grid-flow-col ${rows === 2 ? 'grid-rows-2 gap-y-3 md:gap-y-4' : 'grid-rows-1'} gap-x-2 md:gap-x-6 px-2`}>
          {[...(categories || []), ...(categories || [])]?.map((category, index) => (
            <div
              key={`${category?.id}-${index}`}
              className="flex-shrink-0 px-1 md:px-2"
            >
              <CategoryChip
                category={category}
                isActive={activeCategory === category?.id}
                onClick={() => onCategoryClick?.(category)}
                size="small"
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white dark:from-[#111] via-white/50 dark:via-[#111]/50 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white dark:from-[#111] via-white/50 dark:via-[#111]/50 to-transparent z-10 pointer-events-none" />
    </div>
  )
})

// Category List Component (for sidebar)
export const CategoryList = memo(({ categories, onCategoryClick, activeCategory }) => {
  return (
    <div className="space-y-2">
      {categories?.map((category) => {
        const isListingSoon = isCategoryListingSoon(category);
        return (
          <motion.button
            key={category?.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: 5 }}
            onClick={() => onCategoryClick?.(category)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border border-transparent hover:bg-white/50 dark:hover:bg-white/5
              ${
                activeCategory === category?.id
                  ? 'bg-gradient-ozo text-white shadow-ozo'
                  : 'text-ozo-gray dark:text-gray-300'
              }
            `}
          >
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-xl transition-colors
              ${activeCategory === category?.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10'}
            `}>
              {(() => {
                const isEmoji = category?.icon && category.icon.codePointAt(0) > 127
                if (isEmoji) {
                  return <span className="text-lg">{category?.icon}</span>
                }
                const IconComponent = resolveCategoryIcon(category)
                return <IconComponent size={20} />
              })()}
            </div>
            <span className="flex-1 text-left font-bold text-sm">{category?.name}</span>
            {isListingSoon ? (
              <span
                className={`
                  px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider
                  ${
                    activeCategory === category?.id
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }
                `}
              >
                Soon
              </span>
            ) : category?.product_count && (
              <span
                className={`
                  px-2 py-0.5 rounded-full text-xs font-semibold
                  ${
                    activeCategory === category?.id
                      ? 'bg-white/20 text-white'
                      : 'bg-ozo-gray-bg dark:bg-white/10 text-ozo-gray dark:text-gray-400'
                  }
                `}
              >
                {category?.product_count}
              </span>
            )}
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )
      })}
    </div>
  )
})

export default CategoryChip