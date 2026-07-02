import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Home, MoveLeft, ShoppingBag } from 'lucide-react'

const NotFound = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Animated Illustration Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          <div className="text-[150px] font-black text-gray-100 dark:text-white/5 select-none">
            404
          </div>
          <motion.div 
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <ShoppingBag size={80} className="text-ozo-red" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4">
            Oops! Page Not <span className="text-gradient">Found.</span>
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            The page you're looking for seems to have vanished from our shelves. 
            Don't worry, our delivery partners are fast, but they can't find this one!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/"
              className="btn btn-primary flex items-center justify-center gap-2 group"
            >
              <Home className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              Back to Home
            </Link>
            <Link 
              to="/products"
              className="btn border-2 border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Browse Products
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-12"
        >
          <button 
            onClick={() => window.history.back()}
            className="text-gray-500 hover:text-ozo-red flex items-center gap-2 mx-auto transition-colors"
          >
            <MoveLeft className="w-4 h-4" />
            <span>Go back to previous page</span>
          </button>
        </motion.div>
      </div>
    </div>
  )
}

export default NotFound
