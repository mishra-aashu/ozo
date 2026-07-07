import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  Folder,
  Layers,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Play
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import ImageUpload from '../../components/ImageUpload'
import ConfirmModal from '../../components/ConfirmModal'

// Helper to generate unique slugs (if needed, though categories usually have fixed slugs)
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 7)
}

// Helper to generate URL-friendly slug while typing
const slugifyForTyping = (text) => {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

const LUCIDE_CATEGORY_ICONS = [
  { name: 'Apple', label: 'Apple' },
  { name: 'Beef', label: 'Meat/Beef' },
  { name: 'Beer', label: 'Beverages/Beer' },
  { name: 'Cake', label: 'Bakery/Cake' },
  { name: 'Carrot', label: 'Veg/Carrot' },
  { name: 'Coffee', label: 'Coffee/Tea' },
  { name: 'Cookie', label: 'Snacks/Cookie' },
  { name: 'Egg', label: 'Eggs/Dairy' },
  { name: 'Fish', label: 'Fish/Seafood' },
  { name: 'IceCream', label: 'Ice Cream' },
  { name: 'Milk', label: 'Milk/Dairy' },
  { name: 'Pizza', label: 'Pizza/Fastfood' },
  { name: 'Soup', label: 'Soup/Hotfood' },
  { name: 'Wine', label: 'Wine/Drinks' },
  { name: 'GlassWater', label: 'Water' },
  { name: 'ChefHat', label: 'Kitchen' },
  { name: 'Sparkles', label: 'Specials' },
  { name: 'Store', label: 'Mart/Store' },
  { name: 'Package', label: 'Staples/Pack' },
  { name: 'Gift', label: 'Offers/Gifts' },
  { name: 'Heart', label: 'Favorites' },
  { name: 'Baby', label: 'Baby Care' },
  { name: 'Flower2', label: 'Pooja/Flower' },
  { name: 'Brush', label: 'Cleaning' },
  { name: 'ShoppingBag', label: 'Bag' },
  { name: 'ShoppingCart', label: 'Cart' },
  { name: 'Leaf', label: 'Vegetables' },
  { name: 'Flame', label: 'Spicy/Hot' },
  { name: 'HeartPulse', label: 'Health' },
  { name: 'Home', label: 'Household' },
  { name: 'Candy', label: 'Sweets/Candy' },
  { name: 'Croissant', label: 'Croissant/Bakery' },
  { name: 'Wheat', label: 'Grains/Staples' },
  { name: 'Droplets', label: 'Oils' },
  { name: 'Dog', label: 'Pet Care' },
  { name: 'Pill', label: 'Pharma' }
]

const COMMON_EMOJIS = [
  // Fruits & Vegetables
  '🥦', '🥬', '🍅', '🥕', '🥔', '🧅', '🧄', '🌽', '🍎', '🍌', '🍊', '🍇', '🍓', '🥭', '🍍', '🍉', '🥑', '🥥',
  // Dairy & Bakery
  '🥛', '🍞', '🥚', '🧀', '🧈', '🥞',
  // Snacks & Packaged Foods
  '🍿', '🍩', '🍪', '🍫', '🍬', '🍭', '🧁', '🍦', '🍟', '🍕', '🍔', '🌭',
  // Beverages
  '🥤', '🧃', '☕', '🍵', '💧',
  // Staples & Cooking
  '🌾', '🍚', '🍜', '🍝', '🧂', '🍯', '🥜',
  // Specials & Bihar
  '✨', '🍘', '🍛', '🍲', '🪔', '🌸', '🔱', '⚜️', '💫',
  // Meat & Fish
  '🍗', '🥩', '🍤', '🐟',
  // Household & Cleaning
  '🧼', '🧻', '🧹', '🧴', '🧺', '🧽', '🕯️',
  // Baby & Personal
  '👶', '💄', '🦷', '🩹',
  // Others
  '🛒', '📦', '🎁', '🏷️', '🛍️'
]

const Categories = () => {
  // Lists
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredImage, setHoveredImage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [iconPickerTab, setIconPickerTab] = useState('emoji') // 'emoji' | 'lucide'
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'inactive'
  const [typeFilter, setTypeFilter] = useState('all') // 'all', 'parent', 'subcategory'
  const [sortBy, setSortBy] = useState('display_order') // 'display_order', 'name', 'created_at'
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Image Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    icon: '',
    parentId: '',
    isActive: true,
    displayOrder: 0
  })

  // Action Pending states for inline operations
  const [pendingActions, setPendingActions] = useState({})

  // SQL Drawer console states
  const [drawerTab, setDrawerTab] = useState('form') // 'form' | 'sql'
  const [customSql, setCustomSql] = useState('')
  const [sqlResult, setSqlResult] = useState(null)
  const [runningSql, setRunningSql] = useState(false)

  const generateCategorySql = () => {
    const name = (formData.name || '').trim().replace(/'/g, "''")
    const slug = (formData.slug || '').trim().replace(/'/g, "''")
    const description = formData.description ? `'${formData.description.trim().replace(/'/g, "''")}'` : 'NULL'
    const imageUrl = formData.imageUrl ? `'${formData.imageUrl.trim().replace(/'/g, "''")}'` : 'NULL'
    const icon = formData.icon ? `'${formData.icon.trim().replace(/'/g, "''")}'` : 'NULL'
    const parentId = formData.parentId ? `'${formData.parentId}'` : 'NULL'
    const isActive = formData.isActive ? 'true' : 'false'
    const displayOrder = parseInt(formData.displayOrder) || 0

    if (editingCategory) {
      return `UPDATE public.categories
SET 
  name = '${name}',
  slug = '${slug}',
  description = ${description},
  image_url = ${imageUrl},
  icon = ${icon},
  parent_id = ${parentId},
  is_active = ${isActive},
  display_order = ${displayOrder},
  updated_at = NOW()
WHERE id = '${editingCategory.id}';`
    } else {
      return `INSERT INTO public.categories (
  name, 
  slug, 
  description, 
  image_url, 
  icon, 
  parent_id, 
  is_active, 
  display_order
) VALUES (
  '${name}', 
  '${slug}', 
  ${description}, 
  ${imageUrl}, 
  ${icon}, 
  ${parentId}, 
  ${isActive}, 
  ${displayOrder}
);`
    }
  }

  const handleRunDrawerSql = async () => {
    if (!customSql.trim()) {
      toast.error('SQL Query cannot be empty!')
      return
    }
    setRunningSql(true)
    setSqlResult(null)
    try {
      let queryToRun = customSql.trim()
      if (/^(SELECT|WITH)\b/i.test(queryToRun)) {
        queryToRun = queryToRun.replace(/;\s*$/, '').trim()
      }
      const { data, error } = await supabase.rpc('exec_sql', {
        query_text: queryToRun
      })
      if (error) {
        setSqlResult({ success: false, error: error.message })
        toast.error('SQL execution failed!')
        return
      }
      if (data && data.success === false) {
        setSqlResult({ success: false, error: data.error })
        toast.error('SQL execution failed!')
      } else {
        setSqlResult({
          success: true,
          message: data.message || 'SQL executed successfully!',
          rowsAffected: data.rows_affected,
          rows: data.rows || []
        })
        toast.success('SQL executed successfully!')
        fetchCategories()
      }
    } catch (err) {
      setSqlResult({ success: false, error: err.message })
      toast.error('System error occurred!')
    } finally {
      setRunningSql(false)
    }
  }

  useEffect(() => {
    if (drawerTab === 'sql') {
      setCustomSql(generateCategorySql())
    }
  }, [drawerTab, formData])

  // Fetch all categories
  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:parent_id (
            id,
            name,
            slug
          )
        `)
        .order('display_order', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Categories load karne me error aayi!')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, typeFilter, sortBy])

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      icon: '',
      parentId: '',
      isActive: true,
      displayOrder: 0
    })
    setEditingCategory(null)
    setDrawerTab('form')
    setSqlResult(null)
    setCustomSql('')
  }

  // Populate form for editing
  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      imageUrl: category.image_url || '',
      icon: category.icon || '',
      parentId: category.parent_id || '',
      isActive: category.is_active ?? true,
      displayOrder: category.display_order || 0
    })
    setDrawerTab('form')
    setSqlResult(null)
    setIsDrawerOpen(true)
  }

  // Handle Create or Update submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting || isUploadingImage) return

    if (!formData.name.trim()) {
      toast.error('Category Name zaroori hai!')
      return
    }
    if (!formData.slug.trim()) {
      toast.error('Category Slug zaroori hai!')
      return
    }

    setSubmitting(true)
    const toastId = toast.loading(editingCategory ? 'Category update ho rahi hai...' : 'Category create ho rahi hai...')

    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        image_url: formData.imageUrl || null,
        icon: formData.icon.trim() || null,
        parent_id: formData.parentId || null,
        is_active: formData.isActive,
        display_order: parseInt(formData.displayOrder) || 0
      }

      if (editingCategory) {
        // Prevent setting itself as its parent
        if (payload.parent_id === editingCategory.id) {
          toast.error('Category khud ki parent nahi ban sakti!', { id: toastId })
          setSubmitting(false)
          return
        }

        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id)

        if (error) throw error

        if (payload.is_active === false) {
          // Cascade deactivation to subcategories in database
          const { error: cascadeError } = await supabase
            .from('categories')
            .update({ is_active: false })
            .eq('parent_id', editingCategory.id)

          if (cascadeError) {
            console.error('Cascade deactivation error:', cascadeError)
          }
        }

        toast.success('Category updated successfully!', { id: toastId })
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([payload])

        if (error) throw error
        toast.success('Category created successfully!', { id: toastId })
      }

      setIsDrawerOpen(false)
      resetForm()
      fetchCategories()
    } catch (error) {
      console.error('Submit category error:', error)
      toast.error(error.message || 'Saving fail ho gaya. Kripya check krein ki slug unique ho.', { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle Category Active Status Inline
  const handleToggleActive = async (category) => {
    const key = `toggle-${category.id}`
    if (pendingActions[key]) return

    setPendingActions(prev => ({ ...prev, [key]: true }))
    try {
      const nextActiveState = !category.is_active
      const { error } = await supabase
        .from('categories')
        .update({ is_active: nextActiveState })
        .eq('id', category.id)

      if (error) throw error
      
      if (nextActiveState === false) {
        // Cascade deactivation to subcategories in database
        const { error: cascadeError } = await supabase
          .from('categories')
          .update({ is_active: false })
          .eq('parent_id', category.id)

        if (cascadeError) {
          console.error('Cascade deactivation error:', cascadeError)
        }

        // Update React state: both this category and its subcategories are set to inactive
        setCategories(prev =>
          prev.map(cat => {
            if (cat.id === category.id || cat.parent_id === category.id) {
              return { ...cat, is_active: false }
            }
            return cat
          })
        )
      } else {
        setCategories(prev =>
          prev.map(cat => (cat.id === category.id ? { ...cat, is_active: true } : cat))
        )
      }
      toast.success(`${category.name} active status updated!`)
    } catch (error) {
      console.error('Toggle active status error:', error)
      toast.error('Status change karne me error aayi.')
    } finally {
      setPendingActions(prev => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
    }
  }

  // Change Category Display Order Inline
  const handleUpdateDisplayOrder = async (category, newOrder) => {
    if (newOrder < 0) return
    const key = `order-${category.id}`
    if (pendingActions[key]) return

    setPendingActions(prev => ({ ...prev, [key]: true }))
    try {
      const { error } = await supabase
        .from('categories')
        .update({ display_order: newOrder })
        .eq('id', category.id)

      if (error) throw error

      setCategories(prev =>
        prev.map(cat => (cat.id === category.id ? { ...cat, display_order: newOrder } : cat))
      )
      toast.success(`${category.name} order updated to ${newOrder}`)
    } catch (error) {
      console.error('Update display order error:', error)
      toast.error('Order change karne me error aayi.')
    } finally {
      setPendingActions(prev => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
    }
  }

  // Delete Category (opens custom confirmation modal)
  const handleDelete = (category) => {
    setConfirmDeleteCategory(category)
  }

  // Actual logic to delete category after confirmation
  const executeDeleteCategory = async (category) => {
    const key = `delete-${category.id}`
    if (pendingActions[key]) return

    setPendingActions(prev => ({ ...prev, [key]: true }))
    const toastId = toast.loading('Category delete ki ja rahi hai...')

    try {
      // Direct delete query
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      if (error) {
        if (error.code === '23503') {
          throw new Error('Yeh category products ya doosri categories se linked hai. Pehle unhe reassign krein.')
        }
        throw error
      }

      toast.success('Category deleted successfully!', { id: toastId })
      fetchCategories()
    } catch (error) {
      console.error('Delete category error:', error)
      toast.error(error.message || 'Category delete nahi ho payi.', { id: toastId })
    } finally {
      setConfirmDeleteCategory(null)
      setPendingActions(prev => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
    }
  }

  // Filtering Logic
  const filteredCategories = categories.filter(category => {
    // Search filter
    const matchesSearch = 
      category.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && category.is_active) ||
      (statusFilter === 'inactive' && !category.is_active)

    // Type filter
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'parent' && !category.parent_id) ||
      (typeFilter === 'subcategory' && category.parent_id)

    return matchesSearch && matchesStatus && matchesType
  }).sort((a, b) => {
    if (sortBy === 'display_order') {
      return a.display_order - b.display_order
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    } else if (sortBy === 'created_at') {
      return new Date(b.created_at) - new Date(a.created_at)
    }
    return 0
  })

  // Options for Parent Dropdown (exclude the category itself and its direct subcategories to avoid loop)
  const getParentOptions = () => {
    if (!editingCategory) {
      return categories.filter(c => !c.parent_id)
    }
    // Filter out itself and any category that lists this one as parent
    return categories.filter(c => 
      c.id !== editingCategory.id && 
      c.parent_id !== editingCategory.id &&
      !c.parent_id // limit to top-level parent categories for clean hierarchy
    )
  }

  // Quick statistics
  const totalCategories = categories.length
  const activeCategories = categories.filter(c => c.is_active).length
  const inactiveCategories = totalCategories - activeCategories
  const subcategoriesCount = categories.filter(c => c.parent_id).length

  return (
    <div className="space-y-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <h1 className="text-3xl font-black text-gradient">Category Management</h1>
          <p className="text-sm text-ozo-gray mt-1">Products ke classifications, categories aur subcategories manage krein.</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsDrawerOpen(true)
          }}
          className="flex items-center justify-center gap-2 bg-gradient-ozo text-white px-5 py-3 rounded-2xl font-bold shadow-ozo hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add New Category
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Total Categories</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600">
              <Folder className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{totalCategories}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Active</span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-green-600">{activeCategories}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Inactive</span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-red-600">{inactiveCategories}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Subcategories</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-blue-600">{subcategoriesCount}</p>
        </div>
      </div>

      {/* Filters and List Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="relative w-full lg:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
          >
            <option value="all" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">All Status</option>
            <option value="active" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Active Only</option>
            <option value="inactive" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Inactive Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
          >
            <option value="all" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">All Types</option>
            <option value="parent" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Root Categories</option>
            <option value="subcategory" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Subcategories Only</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
          >
            <option value="display_order" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Sort: Display Order</option>
            <option value="name" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Sort: Name (A-Z)</option>
            <option value="created_at" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Sort: Recently Added</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchCategories}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-250 dark:border-white/10 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-all active:scale-95"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-ozo-red" />
            <p className="text-sm font-semibold text-gray-500">Categories load ho rahi hain...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-2xl mb-4">
              📂
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Koi categories nahi mili</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1">Filters change karein ya fir naya category register krein.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category Info</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Slug</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Classification</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Display Order</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredCategories.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((category) => {
                  const isDeleting = pendingActions[`delete-${category.id}`]
                  const isToggling = pendingActions[`toggle-${category.id}`]
                  const isOrdering = pendingActions[`order-${category.id}`]

                  return (
                    <tr key={category.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      {/* Name & Icon/Image */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden flex items-center justify-center border border-gray-200/50 dark:border-white/10 text-xl shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-zoom-in relative"
                            onMouseEnter={(e) => {
                              if (category.image_url) {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setHoveredImage({ url: category.image_url, name: category.name, rect })
                              }
                            }}
                            onMouseLeave={() => setHoveredImage(null)}
                          >
                            {category.image_url ? (
                              <img
                                src={category.image_url}
                                alt={category.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null
                                  e.target.style.display = 'none'
                                }}
                              />
                            ) : category.icon ? (
                              <span>{category.icon}</span>
                            ) : (
                              <Folder className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 dark:text-white leading-tight">{category.name}</h4>
                            {category.description && (
                              <p className="text-xs text-gray-450 mt-0.5 line-clamp-1 max-w-[240px]">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="p-4 text-sm text-gray-500 font-mono">
                        {category.slug}
                      </td>

                      {/* Parent classification */}
                      <td className="p-4">
                        {category.parent ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase">
                              Subcategory
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              under {category.parent.name}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/20">
                            Root Category
                          </span>
                        )}
                      </td>

                      {/* Display Order Quick Controls */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/5 px-2 py-1 rounded-xl">
                          <button
                            onClick={() => handleUpdateDisplayOrder(category, category.display_order - 1)}
                            disabled={category.display_order <= 0 || isOrdering}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 rounded-lg transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-black text-gray-900 dark:text-white min-w-[20px]">
                            {category.display_order}
                          </span>
                          <button
                            onClick={() => handleUpdateDisplayOrder(category, category.display_order + 1)}
                            disabled={isOrdering}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 rounded-lg transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Active Status Switch */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleActive(category)}
                          disabled={isToggling}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-ozo-red ${
                            category.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-800'
                          } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              category.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 rounded-xl transition-all active:scale-95"
                            title="Edit Category"
                          >
                            <Pencil className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            disabled={isDeleting}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                            title="Delete Category"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4.5 h-4.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-4.5 h-4.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredCategories.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-bold text-gray-800 dark:text-gray-200">{Math.min(filteredCategories.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">{Math.min(filteredCategories.length, currentPage * pageSize)}</span> of{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">{filteredCategories.length}</span> categories
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Page {currentPage} of {Math.ceil(filteredCategories.length / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredCategories.length / pageSize), prev + 1))}
                disabled={currentPage === Math.ceil(filteredCategories.length / pageSize)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slideout Drawer Modal Panel */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && !isUploadingImage && setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-[#1a1a1a] shadow-2xl z-50 flex flex-col border-l border-gray-100 dark:border-white/5"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingCategory 
                      ? `Edit properties for ${editingCategory.name}`
                      : 'Naya category classification register krein.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  disabled={submitting || isUploadingImage}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setDrawerTab('form')}
                  className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                    drawerTab === 'form'
                      ? 'border-ozo-red text-ozo-red'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  Standard Form
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('sql')}
                  className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                    drawerTab === 'sql'
                      ? 'border-ozo-red text-ozo-red'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <LucideIcons.Terminal className="w-3.5 h-3.5" />
                  SQL Query
                </button>
              </div>

              {drawerTab === 'form' ? (
                <>
                  {/* Drawer Body - Scrollable Form */}
                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Category Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dairy & Eggs, Beverages, Organic"
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        name: newName,
                        // Auto-populate slug only if user hasn't manually overridden it
                        slug: prev.slug === '' || prev.slug === slugifyForTyping(prev.name)
                          ? slugifyForTyping(newName)
                          : prev.slug
                      }))
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                  />
                </div>

                {/* Slug Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Slug Link (SEO Friendly) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dairy-and-eggs"
                    value={formData.slug}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        slug: slugifyForTyping(e.target.value)
                      }))
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                  />
                  <p className="text-[10px] text-gray-450 mt-1">Unique URL path link. Only lowercase, numbers, and dashes.</p>
                </div>

                {/* Classification (Parent Category Selection) */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Classification / Parent Category
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_14px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                  >
                    <option value="" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Root Category (No Parent)</option>
                    {getParentOptions().map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">If this is a subcategory, select its parent folder. Otherwise select Root.</p>
                </div>

                {/* Icon & Display Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Category Icon (Optional)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                        className="flex items-center justify-center w-12 h-12 rounded-xl border border-gray-250 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/5 text-xl transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-ozo-red shrink-0 overflow-hidden"
                        title="Choose Icon"
                      >
                        {(() => {
                          if (!formData.icon) return '❓'
                          const isEmoji = formData.icon.codePointAt(0) > 127
                          if (isEmoji) return formData.icon
                          
                          // Check if it's a lucide icon
                          const IconComp = LucideIcons[formData.icon]
                          if (IconComp) return <IconComp className="w-6 h-6 text-ozo-red" />
                          
                          return '❓'
                        })()}
                      </button>
                      <input
                        type="text"
                        placeholder="e.g. Apple or 🥦"
                        value={formData.icon}
                        onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                      />
                    </div>
                    {isIconPickerOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsIconPickerOpen(false)}
                        />
                        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
                          {/* Tab Header */}
                          <div className="flex border-b border-gray-200 dark:border-white/15 p-1 bg-gray-50 dark:bg-gray-800/50">
                            <button
                              type="button"
                              onClick={() => setIconPickerTab('emoji')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                iconPickerTab === 'emoji'
                                  ? 'bg-white dark:bg-gray-800 text-ozo-red shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                              }`}
                            >
                              Emojis
                            </button>
                            <button
                              type="button"
                              onClick={() => setIconPickerTab('lucide')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                iconPickerTab === 'lucide'
                                  ? 'bg-white dark:bg-gray-800 text-ozo-red shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                              }`}
                            >
                              Lucide Icons
                            </button>
                          </div>
                          
                          {/* Tab Content */}
                          <div className="p-3 max-h-60 overflow-y-auto scrollbar-thin">
                            {iconPickerTab === 'emoji' ? (
                              <div className="grid grid-cols-6 gap-2">
                                {COMMON_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, icon: emoji }))
                                      setIsIconPickerOpen(false)
                                    }}
                                    className={`flex items-center justify-center p-2 rounded-lg text-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
                                      formData.icon === emoji ? 'bg-ozo-red/10 border border-ozo-red' : ''
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-5 gap-2">
                                {LUCIDE_CATEGORY_ICONS.map((item) => {
                                  const IconComponent = LucideIcons[item.name] || LucideIcons.HelpCircle
                                  const isSelected = formData.icon === item.name
                                  return (
                                    <button
                                      key={item.name}
                                      type="button"
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, icon: item.name }))
                                        setIsIconPickerOpen(false)
                                      }}
                                      title={item.label}
                                      className={`flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
                                        isSelected ? 'bg-ozo-red/10 border border-ozo-red text-ozo-red' : 'text-gray-600 dark:text-gray-400'
                                      }`}
                                    >
                                      <IconComponent className="w-5 h-5" />
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide a brief description of what products are inside this category..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                  />
                </div>

                {/* Image Upload Component */}
                <div>
                  <ImageUpload
                    label="Category Image"
                    value={formData.imageUrl}
                    onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                    onUploadingStateChange={setIsUploadingImage}
                    customNamePrefix="category"
                  />
                </div>

                {/* Active Toggle Switch */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5">
                  <div>
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white">Active Status</h5>
                    <p className="text-xs text-gray-500 mt-0.5">Toggle category visibility in product lists</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      formData.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </form>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-gray-100 dark:border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  disabled={submitting || isUploadingImage}
                  className="flex-1 px-4 py-3 bg-gray-150 hover:bg-gray-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-gray-350 text-gray-700 font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || isUploadingImage}
                  className="flex-1 px-4 py-3 bg-gradient-ozo text-white font-bold rounded-xl text-sm shadow-ozo hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Category'
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250/20 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 p-3.5 rounded-xl text-xs leading-relaxed font-semibold">
                  <AlertTriangle className="w-4 h-4 inline mr-1.5 align-text-bottom text-amber-500" />
                  <strong>Warning:</strong> Arbitrary SQL updates the database directly. Be careful with keys and columns.
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    SQL Statement
                  </label>
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-950 dark:bg-black p-3 font-mono text-xs">
                    <textarea
                      value={customSql}
                      onChange={(e) => setCustomSql(e.target.value)}
                      className="w-full bg-transparent text-emerald-400 focus:outline-none min-h-[200px] leading-relaxed resize-y font-mono"
                      spellCheck="false"
                    />
                  </div>
                </div>

                {sqlResult && (
                  <div className={`p-4 rounded-xl text-xs font-mono border ${
                    sqlResult.success 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-50 dark:bg-red-950/20 border-red-250/20 text-red-600 dark:text-red-400'
                  }`}>
                    <p className="font-bold mb-1">{sqlResult.success ? 'Success!' : 'Postgres Error:'}</p>
                    <p className="whitespace-pre-wrap">{sqlResult.message || sqlResult.error}</p>
                    {sqlResult.rowsAffected !== undefined && (
                      <p className="mt-1 opacity-80">Rows affected: {sqlResult.rowsAffected}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/5 flex gap-3 bg-gray-50/50 dark:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setCustomSql(generateCategorySql())}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-gray-350 text-gray-700 font-bold rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  title="Reset to generated SQL"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleRunDrawerSql}
                  disabled={runningSql}
                  className="flex-1 px-4 py-3 bg-gradient-ozo text-white font-bold rounded-xl text-sm shadow-ozo hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {runningSql ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Execute SQL
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {hoveredImage && (
        <div 
          className="fixed z-[9999] pointer-events-none p-1.5 bg-white dark:bg-[#13131c] border-2 border-amber-500/40 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]"
          style={{
            top: `${Math.max(10, Math.min(window.innerHeight - 420, hoveredImage.rect.top + (hoveredImage.rect.height / 2) - 200))}px`,
            left: `${hoveredImage.rect.right + 16 + 400 > window.innerWidth 
              ? hoveredImage.rect.left - 400 - 16 
              : hoveredImage.rect.right + 16}px`,
            width: '400px',
            height: '400px',
          }}
        >
          <img 
            src={hoveredImage.url} 
            alt={hoveredImage.name} 
            className="w-full h-full object-contain rounded-xl bg-gray-50 dark:bg-[#0c0c14]"
          />
        </div>
      )}

      {/* Delete Category Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteCategory !== null}
        onClose={() => setConfirmDeleteCategory(null)}
        onConfirm={() => executeDeleteCategory(confirmDeleteCategory)}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${confirmDeleteCategory?.name || ''}"? This action cannot be undone and may affect linked items.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        isDanger={true}
        isLoading={confirmDeleteCategory && pendingActions[`delete-${confirmDeleteCategory.id}`]}
      />
    </div>
  )
}

export default Categories