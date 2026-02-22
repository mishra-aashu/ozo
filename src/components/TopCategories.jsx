import React, { useEffect, memo } from 'react';
import { useProductStore } from '../stores/productStore';

const TopCategories = memo(({ selectedCategory, onSelectCategory }) => {
  const categories = useProductStore(state => state.categories);
  const fetchCategories = useProductStore(state => state.fetchCategories);
  const isCategoriesLoading = useProductStore(state => state.isCategoriesLoading);

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories, fetchCategories]);

  // Filter only main (parent) categories from the database
  const mainCategories = React.useMemo(() => [
    { id: 'all', name: 'All' },
    ...categories.filter((cat) => !cat.parent_id)
  ], [categories]);

  if (isCategoriesLoading && categories.length === 0) {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 mb-6 w-full animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 bg-gray-100 dark:bg-white/5 rounded-full flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 mb-6 -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
      {mainCategories.map((cat) => {
        const isActive = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`relative px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap shadow-sm hover:scale-[1.03] active:scale-[0.97] border ${
              isActive
                ? 'bg-gradient-to-r from-ozo-red to-ozo-red-dark text-white border-ozo-red shadow-md shadow-red-500/10'
                : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-150 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
});

TopCategories.displayName = 'TopCategories';

export default TopCategories;
