import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useProductStore = create((set, get) => ({
  // State
  products: [],
  featuredProducts: [],
  bestsellerProducts: [],
  categories: [],
  offers: [],
  isLoading: false,
  currentProduct: null,
  searchResults: [],
  filters: {
    category: null,
    priceRange: [0, 10000],
    sortBy: 'name',
    inStock: true,
  },

  // Fetch all products
  fetchProducts: async (options = {}) => {
    try {
      set({ isLoading: true })

      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories (
            id,
            name,
            slug
          )
        `)
        .eq('is_available', true)

      // Apply filters
      if (options.categoryId) {
        query = query.eq('category_id', options.categoryId)
      }

      if (options.featured) {
        query = query.eq('is_featured', true)
      }

      if (options.bestseller) {
        query = query.eq('is_bestseller', true)
      }

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`)
      }

      // Sorting
      const sortBy = options.sortBy || 'created_at'
      const ascending = options.ascending !== undefined ? options.ascending : false
      query = query.order(sortBy, { ascending })

      // Limit
      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error

      const products = data.map(product => ({
        ...product,
        price: parseFloat(product.price),
        mrp: parseFloat(product.mrp),
        discount_percentage: parseFloat(product.discount_percentage || 0),
      }))

      set({ products, isLoading: false })
      return { success: true, data: products }
    } catch (error) {
      console.error('Fetch products error:', error)
      set({ isLoading: false })
      return { success: false, error }
    }
  },

  // Fetch featured products
  fetchFeaturedProducts: async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories (
            id,
            name,
            slug
          )
        `)
        .eq('is_featured', true)
        .eq('is_available', true)
        .limit(10)

      if (error) throw error

      const products = data.map(product => ({
        ...product,
        price: parseFloat(product.price),
        mrp: parseFloat(product.mrp),
        discount_percentage: parseFloat(product.discount_percentage || 0),
      }))

      set({ featuredProducts: products })
      return { success: true, data: products }
    } catch (error) {
      console.error('Fetch featured products error:', error)
      return { success: false, error }
    }
  },

  // Fetch bestseller products
  fetchBestsellerProducts: async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories (
            id,
            name,
            slug
          )
        `)
        .eq('is_bestseller', true)
        .eq('is_available', true)
        .limit(10)

      if (error) throw error

      const products = data.map(product => ({
        ...product,
        price: parseFloat(product.price),
        mrp: parseFloat(product.mrp),
        discount_percentage: parseFloat(product.discount_percentage || 0),
      }))

      set({ bestsellerProducts: products })
      return { success: true, data: products }
    } catch (error) {
      console.error('Fetch bestseller products error:', error)
      return { success: false, error }
    }
  },

  // Fetch single product by slug
  fetchProductBySlug: async (slug) => {
    try {
      set({ isLoading: true })

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories (
            id,
            name,
            slug
          )
        `)
        .eq('slug', slug)
        .single()

      if (error) throw error

      const product = {
        ...data,
        price: parseFloat(data.price),
        mrp: parseFloat(data.mrp),
        discount_percentage: parseFloat(data.discount_percentage || 0),
      }

      set({ currentProduct: product, isLoading: false })
      return { success: true, data: product }
    } catch (error) {
      console.error('Fetch product error:', error)
      set({ isLoading: false })
      return { success: false, error }
    }
  },

  // Fetch categories
  fetchCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error

      set({ categories: data })
      return { success: true, data }
    } catch (error) {
      console.error('Fetch categories error:', error)
      return { success: false, error }
    }
  },

  // Fetch offers/banners
  fetchOffers: async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error

      set({ offers: data })
      return { success: true, data }
    } catch (error) {
      console.error('Fetch offers error:', error)
      return { success: false, error }
    }
  },

  // Search products
  searchProducts: async (searchTerm) => {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        set({ searchResults: [] })
        return { success: true, data: [] }
      }

      set({ isLoading: true })

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories (
            id,
            name,
            slug
          )
        `)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`)
        .eq('is_available', true)
        .limit(20)

      if (error) throw error

      const products = data.map(product => ({
        ...product,
        price: parseFloat(product.price),
        mrp: parseFloat(product.mrp),
        discount_percentage: parseFloat(product.discount_percentage || 0),
      }))

      set({ searchResults: products, isLoading: false })
      return { success: true, data: products }
    } catch (error) {
      console.error('Search products error:', error)
      set({ isLoading: false })
      return { success: false, error }
    }
  },

  // Get products by category
  getProductsByCategory: async (categorySlug) => {
    try {
      set({ isLoading: true })

      // First get category
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()

      if (categoryError) throw categoryError

      // Then get products
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories (
            id,
            name,
            slug
          )
        `)
        .eq('category_id', category.id)
        .eq('is_available', true)
        .order('name', { ascending: true })

      if (error) throw error

      const products = data.map(product => ({
        ...product,
        price: parseFloat(product.price),
        mrp: parseFloat(product.mrp),
        discount_percentage: parseFloat(product.discount_percentage || 0),
      }))

      set({ products, isLoading: false })
      return { success: true, data: products }
    } catch (error) {
      console.error('Get products by category error:', error)
      set({ isLoading: false })
      return { success: false, error }
    }
  },

  // Apply filters
  applyFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } })
  },

  // Reset filters
  resetFilters: () => {
    set({
      filters: {
        category: null,
        priceRange: [0, 10000],
        sortBy: 'name',
        inStock: true,
      },
    })
  },

  // Clear search results
  clearSearchResults: () => {
    set({ searchResults: [] })
  },
}))