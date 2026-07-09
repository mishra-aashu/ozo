import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useLocationStore } from '../stores/locationStore';
import { useCartStore } from '../stores/cartStore';

export const PAGINATION_LIMIT = 24;

export function useProductPagination() {
  const [products, setProducts] = useState([]);
  const [spellingSuggestion, setSpellingSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  // Keep track of current filter query to prevent race conditions
  const queryKeyRef = useRef('');
  const isLoadingRef = useRef(false);

  const fetchProductsPage = useCallback(async (options = {}, isLoadMore = false) => {
    if (isLoadMore && isLoadingRef.current) return;
    isLoadingRef.current = true;
    const currentOffset = isLoadMore ? offsetRef.current : 0;
    
    // Generate key based on filter parameters
    const filterKey = JSON.stringify({
      categoryId: options.categoryId || null,
      categorySlug: options.categorySlug || null,
      featured: !!options.featured,
      bestseller: !!options.bestseller,
      search: options.search || null
    });

    if (!isLoadMore) {
      setIsLoading(true);
      setIsError(false);
      setProducts([]);
      setSpellingSuggestion(null);
      offsetRef.current = 0;
      setHasMore(true);
      queryKeyRef.current = filterKey;
    } else {
      setIsLoadingMore(true);
    }

    try {
      const runQuery = async (applyFeatured, applyBestseller) => {
        let query;
        
        // If a search query is active, use fuzzy & full-text search RPC
        if (options.search) {
          query = supabase.rpc('search_products_fuzzy', { 
            search_term: options.search,
            similarity_threshold: 0.2
          }).select(`
            *,
            category:categories (
              id,
              name,
              slug,
              parent_id,
              is_active
            )
          `);

          // Fetch spelling suggestion in parallel for page 1
          if (!isLoadMore) {
            try {
              const { data: suggestionData } = await supabase.rpc('get_spelling_suggestion', { 
                search_term: options.search 
              });
              if (queryKeyRef.current === filterKey) {
                setSpellingSuggestion(suggestionData || null);
              }
            } catch (sErr) {
              console.error('[useProductPagination] Spelling suggestion error:', sErr);
            }
          }
        } else {
          query = supabase.from('products').select(`
            *,
            category:categories (
              id,
              name,
              slug,
              parent_id,
              is_active
            )
          `);
        }

        // 1. Filter by category slug (resolving subcategories) if provided
        if (options.categorySlug) {
          // Find category id
          const { data: category } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', options.categorySlug)
            .eq('is_active', true)
            .single();

          if (category) {
            // Find subcategories
            const { data: subcategories } = await supabase
              .from('categories')
              .select('id')
              .eq('parent_id', category.id)
              .eq('is_active', true);

            let categoryIds = [category.id];
            if (subcategories && subcategories.length > 0) {
              categoryIds = [...categoryIds, ...subcategories.map(s => s.id)];
            }
            query = query.in('category_id', categoryIds);
          }
        } else if (options.categoryId) {
          // Find subcategories for this parent category ID
          const { data: subcategories } = await supabase
            .from('categories')
            .select('id')
            .eq('parent_id', options.categoryId)
            .eq('is_active', true);

          let categoryIds = [options.categoryId];
          if (subcategories && subcategories.length > 0) {
            categoryIds = [...categoryIds, ...subcategories.map(s => s.id)];
          }
          query = query.in('category_id', categoryIds);
        }

        if (applyFeatured) {
          query = query.eq('is_featured', true);
        }

        if (applyBestseller) {
          query = query.eq('is_bestseller', true);
        }

        // Ordering: Use standard order if explicitly specified, otherwise preserve relevance-based FTS search order
        if (!options.search) {
          query = query
            .order('is_available', { ascending: false })
            .order('is_upcoming', { ascending: true });
        }

        if (options.sortBy && options.sortBy !== 'relevance') {
          const ascending = options.ascending !== undefined ? options.ascending : true;
          query = query.order(options.sortBy, { ascending });
        } else if (!options.search) {
          const sortBy = options.sortBy || 'name';
          const ascending = options.ascending !== undefined ? options.ascending : true;
          query = query.order(sortBy, { ascending });
        }

        // Range (Limit & Offset)
        const from = currentOffset;
        const to = from + PAGINATION_LIMIT - 1;
        query = query.range(from, to);

        return await query;
      };

      let { data, error } = await runQuery(!!options.featured, !!options.bestseller);
      if (error) throw error;

      // Fallback: If query returned no products and bestseller/featured filter was applied, run it again without them
      if ((!data || data.length === 0) && (options.featured || options.bestseller)) {
        const fallbackRes = await runQuery(false, false);
        if (!fallbackRes.error) {
          data = fallbackRes.data;
        }
      }

      // Base format: filter inactive categories, parse numerics
      let formatted = (data || [])
        .filter(product => !(product.category && product.category.is_active === false))
        .map(product => {
          const isImageMissing = !product.image_url || 
            product.image_url.includes('raw.githubusercontent.com') || 
            product.image_url.includes('logo_transparent.png');

          const isAdminOrMart = typeof window !== 'undefined' && 
            (window.location.pathname.includes('/admin') || 
             window.location.pathname.includes('/mart'));

          if (isImageMissing && !isAdminOrMart) return null;

          return {
            ...product,
            price: parseFloat(product.price),
            mrp: parseFloat(product.mrp),
            discount_percentage: parseFloat(product.discount_percentage || 0),
            randomWeight: currentOffset + Math.random()
          };
        }).filter(Boolean);

      // Apply city-level overrides from product_city_availability
      // This ensures city-specific is_available, city_price, city_mrp are respected
      try {
        const citySlug = useLocationStore.getState().selectedCitySlug;

        if (citySlug && formatted.length > 0) {
          const productIds = formatted.map(p => p.id);
          const { data: cityData } = await supabase
            .from('product_city_availability')
            .select('product_id, city_price, city_mrp, is_available, is_featured, is_upcoming')
            .eq('city_slug', citySlug)
            .in('product_id', productIds);

          if (cityData && cityData.length > 0) {
            const cityMap = new Map(cityData.map(row => [row.product_id, row]));
            const launchConfig = useCartStore.getState().launchConfig;
            const launchModeEnabled = !!launchConfig?.launch_mode_enabled;

            formatted = formatted.map(product => {
              const pca = cityMap.get(product.id);
              if (!pca) return product; // No city override → use global values as-is

              const isAvailable = pca.is_available !== null && pca.is_available !== undefined
                ? pca.is_available
                : product.is_available;

              const isUpcomingRaw = pca.is_upcoming !== null && pca.is_upcoming !== undefined
                ? pca.is_upcoming
                : (product.is_upcoming || false);

              const isUpcoming = (launchModeEnabled && !isAvailable) ? true : isUpcomingRaw;

              const priceVal = pca.city_price !== null && pca.city_price !== undefined
                ? parseFloat(pca.city_price)
                : product.price;
              const mrpVal = pca.city_mrp !== null && pca.city_mrp !== undefined
                ? parseFloat(pca.city_mrp)
                : product.mrp;

              return {
                ...product,
                price: priceVal,
                mrp: mrpVal,
                is_available: isAvailable,
                is_upcoming: isUpcoming,
                is_featured: pca.is_featured !== null && pca.is_featured !== undefined
                  ? pca.is_featured
                  : product.is_featured,
                discount_percentage: (mrpVal && mrpVal > priceVal)
                  ? Math.round(((mrpVal - priceVal) / mrpVal) * 100)
                  : product.discount_percentage,
              };
            });
          }
        }
      } catch (cityErr) {
        // Non-fatal: if city override fails, continue with global values
        console.warn('[useProductPagination] City override fetch failed:', cityErr);
      }

      // Sort: in-stock first, out-of-stock / upcoming last
      formatted.sort((a, b) => {
        const aOOS = !a.is_available || (a.quantity_available !== undefined && a.quantity_available === 0) || a.is_upcoming;
        const bOOS = !b.is_available || (b.quantity_available !== undefined && b.quantity_available === 0) || b.is_upcoming;
        if (aOOS && !bOOS) return 1;
        if (!aOOS && bOOS) return -1;
        return 0;
      });

      // Avoid setting state if query has changed in the meantime
      if (queryKeyRef.current === filterKey) {
        setProducts(prev => {
          if (!isLoadMore) return formatted;
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueFormatted = formatted.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueFormatted];
        });
        setHasMore((data || []).length === PAGINATION_LIMIT);
        offsetRef.current = currentOffset + PAGINATION_LIMIT;
      }
    } catch (err) {
      console.error('[useProductPagination] Error:', err);
      if (queryKeyRef.current === filterKey) {
        setIsError(true);
      }
    } finally {
      isLoadingRef.current = false;
      if (queryKeyRef.current === filterKey) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setProducts([]);
    setSpellingSuggestion(null);
    offsetRef.current = 0;
    setHasMore(true);
    setIsLoading(false);
    setIsLoadingMore(false);
    setIsError(false);
    isLoadingRef.current = false;
  }, []);

  return {
    products,
    spellingSuggestion,
    isLoading,
    isLoadingMore,
    isError,
    hasMore,
    fetchProductsPage,
    reset
  };
}
