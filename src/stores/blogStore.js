import { create } from 'zustand'
import { supabaseAdmin as supabase, uploadToImgbb } from '../lib/supabase'
import toast from 'react-hot-toast'

// Helper to ensure public bucket "blogs" exists
const ensureBucketExists = async () => {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) throw listError

    const exists = buckets.some(b => b.name === 'blogs')
    if (!exists) {
      const { error: createError } = await supabase.storage.createBucket('blogs', {
        public: true,
        allowedMimeTypes: ['application/json'],
      })
      if (createError) {
        console.warn('Could not auto-create "blogs" bucket. Verify Supabase Storage permissions:', createError)
      }
    }
  } catch (err) {
    console.warn('Bucket verification warning (continuing normally):', err)
  }
}

// Initial seed post data
const seedPosts = [
  {
    title: 'How OZO Delivers Fresh Produce in 30 Minutes Flat',
    slug: 'how-ozo-delivers-fresh-produce-in-30-minutes-flat',
    category: 'Tech & Ops',
    date: 'May 24, 2026',
    author: 'Aashu Mishra',
    readTime: '5 min read',
    excerpt: 'Go behind the scenes of our proprietary dark store network and smart route mapping algorithm.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60',
    status: 'published',
    created_at: new Date('2026-05-24T10:00:00.000Z').toISOString(),
    updated_at: new Date('2026-05-24T10:00:00.000Z').toISOString()
  }
]

const seedPostDetail = {
  title: 'How OZO Delivers Fresh Produce in 30 Minutes Flat',
  slug: 'how-ozo-delivers-fresh-produce-in-30-minutes-flat',
  category: 'Tech & Ops',
  date: 'May 24, 2026',
  author: 'Aashu Mishra',
  readTime: '5 min read',
  excerpt: 'Go behind the scenes of our proprietary dark store network and smart route mapping algorithm.',
  image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60',
  status: 'published',
  body: `
    <h2>The Tech Behind the Speed</h2>
    <p>At OZO, our mission is to deliver fresh vegetables, fruits, and groceries in less time than it takes to cook them. But how do we achieve a consistent 30-minute delivery time across the city?</p>
    
    <h3>1. Optimized Dark Store Network</h3>
    <p>Instead of relying on large central warehouses outside the city boundaries, OZO operates strategically located micro-fulfillment centers, which we call "Dark Stores." These stores are optimized for quick picking and packing, with high-demand products stored closest to the packing stations.</p>
    
    <h3>2. Real-Time Routing Algorithm</h3>
    <p>Our smart route planner analyzes local traffic patterns, delivery locations, and rider assignments in real-time. By packing orders in parallel and dispatching riders on optimal routes, we reduce transit times by up to 25%.</p>
    
    <h3>3. Direct Partner Farm Sourcing</h3>
    <p>Every morning, our sourcing partners fetch fresh produce directly from local farms. The vegetables are quality-checked, packed, and distributed to our dark store network by 6:00 AM, ensuring that the spinach or tomatoes you order in the afternoon are as fresh as they get.</p>
    
    <blockquote>"By combining hyper-local logistics with predictive inventory tracking, we keep waste minimal and freshness maximal."</blockquote>
    
    <p>Stay tuned for more updates on our delivery infrastructure and technological expansion in Aurangabad and beyond!</p>
  `,
  created_at: new Date('2026-05-24T10:00:00.000Z').toISOString(),
  updated_at: new Date('2026-05-24T10:00:00.000Z').toISOString()
}

export const useBlogStore = create((set, get) => ({
  posts: [],
  currentPost: null,
  isLoading: false,

  // Fetch the global index of blog posts
  fetchPosts: async (force = false) => {
    if (get().posts.length > 0 && !force) return { success: true, data: get().posts }
    
    set({ isLoading: true })
    await ensureBucketExists()

    try {
      const { data, error } = await supabase.storage
        .from('blogs')
        .download('posts.json')

      if (error) {
        // If file doesn't exist, seed default database or set empty
        if (error.message?.includes('Object not found') || error.status === 404 || error.message?.includes('does not exist')) {
          console.log('posts.json not found in Storage. Seeding default post...')
          await get().seedDefaultPost()
          set({ isLoading: false })
          return { success: true, data: get().posts }
        }
        throw error
      }

      const text = await data.text()
      const posts = JSON.parse(text)
      
      // Sort by created_at desc
      posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      set({ posts, isLoading: false })
      return { success: true, data: posts }
    } catch (err) {
      console.error('Error fetching blogs index:', err)
      set({ posts: [], isLoading: false })
      return { success: false, error: err }
    }
  },

  // Fetch detail for a specific post by slug
  fetchPostBySlug: async (slug) => {
    set({ isLoading: true, currentPost: null })
    try {
      const { data, error } = await supabase.storage
        .from('blogs')
        .download(`posts/${slug}.json`)

      if (error) {
        // Fallback for seed post if bucket was cleared but index was seeded
        if (slug === seedPostDetail.slug) {
          set({ currentPost: seedPostDetail, isLoading: false })
          return { success: true, data: seedPostDetail }
        }
        throw error
      }

      const text = await data.text()
      const post = JSON.parse(text)
      set({ currentPost: post, isLoading: false })
      return { success: true, data: post }
    } catch (err) {
      console.error(`Error fetching post details for ${slug}:`, err)
      set({ currentPost: null, isLoading: false })
      return { success: false, error: err }
    }
  },

  // Save (Create/Update) a blog post
  savePost: async (postData, imageFile = null) => {
    set({ isLoading: true })
    try {
      let coverImageUrl = postData.image

      // 1. Upload new image if provided
      if (imageFile) {
        const uploadToast = toast.loading('Uploading cover image to OZO CDN...')
        const uploadResult = await uploadToImgbb(imageFile, `blog-${postData.slug}`)
        toast.dismiss(uploadToast)

        if (uploadResult.error || !uploadResult.url) {
          throw new Error('Image upload failed: ' + (uploadResult.error?.message || 'Unknown error'))
        }
        coverImageUrl = uploadResult.url
      }

      const dateStr = postData.date || new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })

      const now = new Date().toISOString()
      const slug = postData.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')

      // Detailed post object
      const fullPost = {
        title: postData.title,
        slug,
        category: postData.category,
        date: dateStr,
        author: postData.author || 'Admin',
        readTime: postData.readTime || '3 min read',
        excerpt: postData.excerpt,
        image: coverImageUrl,
        status: postData.status || 'draft',
        body: postData.body || '',
        created_at: postData.created_at || now,
        updated_at: now
      }

      // Summary post object (Index representation)
      const summaryPost = {
        title: fullPost.title,
        slug: fullPost.slug,
        category: fullPost.category,
        date: fullPost.date,
        author: fullPost.author,
        readTime: fullPost.readTime,
        excerpt: fullPost.excerpt,
        image: fullPost.image,
        status: fullPost.status,
        created_at: fullPost.created_at,
        updated_at: fullPost.updated_at
      }

      // 2. Upload the individual detail file to storage
      const detailBlob = new Blob([JSON.stringify(fullPost, null, 2)], { type: 'application/json' })
      const { error: detailUploadError } = await supabase.storage
        .from('blogs')
        .upload(`posts/${slug}.json`, detailBlob, {
          contentType: 'application/json',
          upsert: true
        })

      if (detailUploadError) throw detailUploadError

      // 3. Update the global posts.json index
      // Refresh current posts index first
      await get().fetchPosts(true)
      const currentPosts = [...get().posts]
      const existingIndex = currentPosts.findIndex(p => p.slug === slug)
      const previousStatus = existingIndex > -1 ? currentPosts[existingIndex].status : null
      const isNewlyPublished = fullPost.status === 'published' && (!previousStatus || previousStatus !== 'published')

      if (existingIndex > -1) {
        currentPosts[existingIndex] = summaryPost
      } else {
        currentPosts.unshift(summaryPost)
      }

      // Sort index
      currentPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      const indexBlob = new Blob([JSON.stringify(currentPosts, null, 2)], { type: 'application/json' })
      const { error: indexUploadError } = await supabase.storage
        .from('blogs')
        .upload('posts.json', indexBlob, {
          contentType: 'application/json',
          upsert: true
        })

      if (indexUploadError) throw indexUploadError

      set({ posts: currentPosts, isLoading: false })

      // Send push notification broadcast if newly published
      if (isNewlyPublished) {
        (async () => {
          try {
            console.log('[PUSH] Dispatching blog broadcast notification for:', fullPost.title)
            const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
              body: {
                title: `✍️ New Blog: ${fullPost.title}`,
                message: fullPost.excerpt || 'Read our latest article on OZO.',
                type: 'blog',
                broadcast: true,
                data: {
                  slug: fullPost.slug,
                  category: fullPost.category,
                  url: `https://ozomart.store/blog/${fullPost.slug}`
                }
              }
            })
            if (pushError) {
              console.warn('[PUSH] Blog push notification error:', pushError)
            } else {
              console.log('[PUSH] Blog push notification broadcasted successfully!')
            }
          } catch (pushErr) {
            console.warn('[PUSH] Failed to invoke push notification for blog:', pushErr)
          }
        })()
      }

      toast.success(existingIndex > -1 ? 'Blog post updated successfully!' : 'Blog post published successfully!')
      return { success: true, slug }
    } catch (err) {
      console.error('Error saving blog post:', err)
      set({ isLoading: false })
      toast.error('Failed to save blog post: ' + err.message)
      return { success: false, error: err }
    }
  },

  // Delete a blog post
  deletePost: async (slug) => {
    set({ isLoading: true })
    try {
      // 1. Remove individual file
      const { error: removeError } = await supabase.storage
        .from('blogs')
        .remove([`posts/${slug}.json`])
      
      if (removeError) {
        console.warn(`Post file posts/${slug}.json delete failed or already removed:`, removeError)
      }

      // 2. Update global posts.json index
      await get().fetchPosts(true)
      const updatedPosts = get().posts.filter(p => p.slug !== slug)

      const indexBlob = new Blob([JSON.stringify(updatedPosts, null, 2)], { type: 'application/json' })
      const { error: indexUploadError } = await supabase.storage
        .from('blogs')
        .upload('posts.json', indexBlob, {
          contentType: 'application/json',
          upsert: true
        })

      if (indexUploadError) throw indexUploadError

      set({ posts: updatedPosts, isLoading: false })
      toast.success('Blog post deleted successfully!')
      return { success: true }
    } catch (err) {
      console.error('Error deleting blog post:', err)
      set({ isLoading: false })
      toast.error('Failed to delete blog: ' + err.message)
      return { success: false, error: err }
    }
  },

  // Seeds default demo post when starting fresh
  seedDefaultPost: async () => {
    try {
      // Write detailed file
      const detailBlob = new Blob([JSON.stringify(seedPostDetail, null, 2)], { type: 'application/json' })
      await supabase.storage
        .from('blogs')
        .upload(`posts/${seedPostDetail.slug}.json`, detailBlob, {
          contentType: 'application/json',
          upsert: true
        })

      // Write index file
      const indexBlob = new Blob([JSON.stringify(seedPosts, null, 2)], { type: 'application/json' })
      await supabase.storage
        .from('blogs')
        .upload('posts.json', indexBlob, {
          contentType: 'application/json',
          upsert: true
        })

      set({ posts: seedPosts })
    } catch (err) {
      console.error('Failed to seed default blog post:', err)
    }
  }
}))
