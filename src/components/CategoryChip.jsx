import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

const CategoryChip = ({ category, isActive = false, onClick, size = 'default' }) => {
  const sizeClasses = {
    small: 'min-w-[80px] p-3',
    default: 'min-w-[100px] p-4',
    large: 'min-w-[120px] p-5',
  }

  const iconSizes = {
    small: 'text-2xl',
    default: 'text-4xl',
    large: 'text-5xl',
  }

  const textSizes = {
    small: 'text-xs',
    default: 'text-sm',
    large: 'text-base',
  }

  // Category icons mapping
  const categoryIcons = {
    'fruits-vegetables': '🥬',
    'dairy-breakfast': '🥛',
    'snacks-munchies': '🍿',
    'cold-drinks-juices': '🥤',
    'instant-frozen-food': '🍜',
    'tea-coffee-health': '☕',
    'bakery-biscuits': '🍪',
    'sweet-tooth': '🍫',
    'atta-rice-dal': '🌾',
    'masala-oil': '🧂',
    'cleaning-essentials': '🧹',
    'personal-care': '🧴',
    'baby-care': '👶',
    'pet-care': '🐕',
    'pharma-wellness': '💊',
  }

  const chipVariants = {
    idle: {
      scale: 1,
      borderColor: 'transparent',
    },
    hover: {
      scale: 1.05,
      borderColor: '#E23744',
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
    tap: {
      scale: 0.95,
    },
    active: {
      borderColor: '#E23744',
      backgroundColor: '#FEF2F2',
    },
  }

  return (
    <motion.button
      variants={chipVariants}
      initial="idle"
      whileHover="hover"
      whileTap="tap"
      animate={isActive ? 'active' : 'idle'}
      onClick={onClick}
      className={`
        category-chip
        ${sizeClasses[size]}
        ${isActive ? 'category-chip-active' : ''}
        group
      `}
    >
      {/* Icon/Image */}
      <div className="relative">
        {category.image_url ? (
          <div className={`${iconSizes[size]} rounded-lg overflow-hidden`}>
            <img
              src={category.image_url}
              alt={category.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <span className={`category-icon ${iconSizes[size]}`}>
            {categoryIcons[category.slug] || category.icon || '📦'}
          </span>
        )}

        {/* Badge for item count */}
        {category.product_count && (
          <span className="absolute -top-2 -right-2 bg-ozo-red text-white text-xs rounded-full px-2 py-0.5 font-semibold">
            {category.product_count}
          </span>
        )}
      </div>

      {/* Category Name */}
      <span className={`category-name ${textSizes[size]} mt-2`}>
        {category.name}
      </span>

      {/* Hover indicator */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-ozo-red pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isActive ? 0.2 : 0 }}
        whileHover={{ opacity: 0.2 }}
      />

      {/* Arrow for navigation (optional) */}
      {size === 'large' && (
        <ChevronRight className="w-4 h-4 text-ozo-gray group-hover:text-ozo-red transition-colors absolute right-2 top-1/2 -translate-y-1/2" />
      )}
    </motion.button>
  )
}

// Category Grid Component
export const CategoryGrid = ({ categories, onCategoryClick, activeCategory }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
      {categories.map((category) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CategoryChip
            category={category}
            isActive={activeCategory === category.id}
            onClick={() => onCategoryClick(category)}
            size="default"
          />
        </motion.div>
      ))}
    </div>
  )
}

// Category Slider Component
export const CategorySlider = ({ categories, onCategoryClick, activeCategory }) => {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-3 pb-2">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <CategoryChip
              category={category}
              isActive={activeCategory === category.id}
              onClick={() => onCategoryClick(category)}
              size="small"
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Category List Component (for sidebar)
export const CategoryList = ({ categories, onCategoryClick, activeCategory }) => {
  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <motion.button
          key={category.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: 5 }}
          onClick={() => onCategoryClick(category)}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
            ${
              activeCategory === category.id
                ? 'bg-gradient-ozo text-white shadow-ozo'
                : 'hover:bg-ozo-gray-bg text-ozo-gray'
            }
          `}
        >
          <span className="text-2xl">
            {categoryIcons[category.slug] || category.icon || '📦'}
          </span>
          <span className="flex-1 text-left font-medium">{category.name}</span>
          {category.product_count && (
            <span
              className={`
                px-2 py-0.5 rounded-full text-xs font-semibold
                ${
                  activeCategory === category.id
                    ? 'bg-white/20 text-white'
                    : 'bg-ozo-gray-bg text-ozo-gray'
                }
              `}
            >
              {category.product_count}
            </span>
          )}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      ))}
    </div>
  )
}

export default CategoryChip