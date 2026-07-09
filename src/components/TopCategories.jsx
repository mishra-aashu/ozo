import React, { useEffect, useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useProductStore } from '../stores/productStore';
import { ChevronRight, ChevronDown, X, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveCategoryIcon } from './CategoryChip';

const TopCategories = memo(({ selectedCategory, onSelectCategory }) => {
  const categories = useProductStore(state => state.categories);
  const fetchCategories = useProductStore(state => state.fetchCategories);
  const isCategoriesLoading = useProductStore(state => state.isCategoriesLoading);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState({});

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories, fetchCategories]);

  // Group categories into parent-child hierarchy
  const structuredCategories = useMemo(() => {
    const parents = categories.filter(c => !c.parent_id);
    const children = categories.filter(c => c.parent_id);
    return parents.map(parent => ({
      ...parent,
      subcategories: children.filter(child => child.parent_id === parent.id)
    }));
  }, [categories]);

  // Filter only main (parent) categories from the database
  const mainCategories = useMemo(() => [
    { id: 'all', name: 'All' },
    ...categories.filter((cat) => !cat.parent_id)
  ], [categories]);

  // Automatically expand parent category if active
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all' && categories.length > 0) {
      const current = categories.find(c => c.id === selectedCategory);
      if (current && current.parent_id) {
        setExpandedParents(prev => ({
          ...prev,
          [current.parent_id]: true
        }));
      }
    }
  }, [selectedCategory, categories]);

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
    <>
      <div className="relative flex items-center w-full mb-6">
        {/* Horizontal scroll container with right padding so chips don't clip behind the button */}
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth pr-14">
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

        {/* Premium fading background overlay */}
        <div className="absolute right-9 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-ozo-gray-bg dark:to-[#0a0a0a] pointer-events-none z-10" />

        {/* Right Arrow trigger button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-200 hover:text-ozo-red dark:hover:text-white transition-all shadow-md flex items-center justify-center hover:border-ozo-red/50 hover:bg-gray-50 dark:hover:bg-white/10"
          title="All Categories"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Categories Sliding Drawer from Left with createPortal to escape z-index constraints */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isDrawerOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
              />

              {/* Sliding Panel */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed top-0 bottom-0 left-0 w-[300px] max-w-[85vw] bg-white dark:bg-[#121212] p-6 z-[10000] border-r border-gray-100 dark:border-white/5 flex flex-col shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <Box size={18} className="text-ozo-red" />
                    Categories
                  </h3>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                  {/* All Products Option */}
                  <button
                    onClick={() => {
                      onSelectCategory('all');
                      setIsDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left border ${
                      selectedCategory === 'all'
                        ? 'bg-gradient-to-r from-ozo-red/10 to-transparent border-ozo-red/20 text-ozo-red font-bold'
                        : 'bg-transparent text-gray-800 dark:text-gray-300 border-transparent hover:bg-gray-105/70 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                    }`}
                  >
                    <Box size={20} className={selectedCategory === 'all' ? 'text-ozo-red' : 'text-gray-400 dark:text-gray-500'} strokeWidth={2} />
                    <span className="text-[14px] font-bold flex-1">All Products</span>
                  </button>

                  {/* Categories and Subcategories Tree */}
                  {structuredCategories.map((parent) => {
                    const CatIcon = resolveCategoryIcon(parent);
                    const isParentActive = selectedCategory === parent.id;
                    const hasSubs = parent.subcategories && parent.subcategories.length > 0;
                    const isExpanded = !!expandedParents[parent.id];

                    return (
                      <div key={parent.id} className="space-y-1">
                        <div
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all border ${
                            isParentActive
                              ? 'bg-gradient-to-r from-ozo-red/10 to-transparent border-ozo-red/20 text-ozo-red font-bold'
                              : 'bg-transparent text-gray-800 dark:text-gray-300 border-transparent hover:bg-gray-105/70 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                          }`}
                        >
                          <button
                            onClick={() => {
                              onSelectCategory(parent.id);
                              if (!hasSubs) {
                                setIsDrawerOpen(false);
                              } else {
                                setExpandedParents(prev => ({
                                  ...prev,
                                  [parent.id]: !prev[parent.id]
                                }));
                              }
                            }}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <CatIcon size={20} className={isParentActive ? 'text-ozo-red' : 'text-gray-400 dark:text-gray-500'} strokeWidth={1.8} />
                            <span className="text-[14px] font-bold whitespace-normal break-words leading-tight flex-1">{parent.name}</span>
                          </button>

                          {hasSubs && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedParents(prev => ({
                                  ...prev,
                                  [parent.id]: !prev[parent.id]
                                }));
                              }}
                              className="p-1.5 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg transition-all text-gray-550 dark:text-gray-400 hover:text-ozo-red dark:hover:text-white ml-1.5 flex-shrink-0"
                            >
                              <ChevronDown
                                size={15}
                                className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Subcategories */}
                        {hasSubs && isExpanded && (
                          <div className="ml-5 pl-3.5 border-l-2 border-gray-200 dark:border-white/5 space-y-1 py-1">
                            {parent.subcategories.map((child) => {
                              const isChildActive = selectedCategory === child.id;
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => {
                                    onSelectCategory(child.id);
                                    setIsDrawerOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left text-xs border ${
                                    isChildActive
                                      ? 'bg-ozo-red/5 dark:bg-ozo-red/10 border-ozo-red/10 text-ozo-red font-bold'
                                      : 'bg-transparent text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isChildActive ? 'bg-ozo-red' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                  <span className="font-bold text-xs whitespace-normal break-words leading-tight flex-1">{child.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        , document.body)}
    </>
  );
});

TopCategories.displayName = 'TopCategories';

export default TopCategories;
