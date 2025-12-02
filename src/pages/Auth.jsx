import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShoppingBag,
  Truck,
  Shield,
  Gift,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({})

  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signUp, isAuthenticated } = useAuthStore()

  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  const validateForm = () => {
    const newErrors = {}

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Sign up validations
    if (!isLogin) {
      if (!formData.fullName) {
        newErrors.fullName = 'Full name is required'
      } else if (formData.fullName.length < 3) {
        newErrors.fullName = 'Name must be at least 3 characters'
      }

      if (formData.phone && formData.phone.length !== 10) {
        newErrors.phone = 'Phone number must be 10 digits'
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors')
      return
    }

    setIsLoading(true)

    try {
      let result
      if (isLogin) {
        result = await signIn(formData.email, formData.password)
      } else {
        result = await signUp(formData.email, formData.password, formData.fullName)
      }

      if (result.success) {
        toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!')
        navigate(from, { replace: true })
      }
    } catch (error) {
      console.error('Auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const features = [
    { icon: ShoppingBag, text: 'Wide range of products' },
    { icon: Truck, text: '10 minute delivery' },
    { icon: Shield, text: 'Secure payments' },
    { icon: Gift, text: 'Exclusive offers' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex items-center justify-center p-8 bg-white"
      >
        <div className="w-full max-w-md">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-ozo rounded-2xl text-white text-4xl font-bold mb-4 shadow-ozo">
              🛒
            </div>
            <h1 className="text-3xl font-bold text-gradient">Welcome to OZO</h1>
            <p className="text-ozo-gray mt-2">
              {isLogin ? 'Login to continue shopping' : 'Create your account'}
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Full Name (Sign up only) */}
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <label className="label">Full Name</label>
                  <div className="input-group">
                    <User className="input-icon" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className={`input input-with-icon ${errors.fullName ? 'input-error' : ''}`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-sm text-ozo-red mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.fullName}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <motion.div variants={itemVariants}>
              <label className="label">Email</label>
              <div className="input-group">
                <Mail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className={`input input-with-icon ${errors.email ? 'input-error' : ''}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-ozo-red mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                      {errors.email}
                    </p>
                  )}
                </motion.div>

                {/* Phone (Sign up only - optional) */}
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      <label className="label">Phone Number (Optional)</label>
                      <div className="input-group">
                        <Phone className="input-icon" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Enter 10 digit number"
                          maxLength="10"
                          pattern="[0-9]{10}"
                          className={`input input-with-icon ${errors.phone ? 'input-error' : ''}`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-sm text-ozo-red mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.phone}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password */}
                <motion.div variants={itemVariants}>
                  <label className="label">Password</label>
                  <div className="input-group">
                    <Lock className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password"
                      className={`input input-with-icon pr-12 ${errors.password ? 'input-error' : ''}`}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ozo-gray hover:text-ozo-dark"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-ozo-red mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.password}
                    </p>
                  )}
                </motion.div>

                {/* Confirm Password (Sign up only) */}
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      <label className="label">Confirm Password</label>
                      <div className="input-group">
                        <Lock className="input-icon" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="Confirm password"
                          className={`input input-with-icon ${errors.confirmPassword ? 'input-error' : ''}`}
                          autoComplete="new-password"
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-ozo-red mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.confirmPassword}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Forgot Password */}
                {isLogin && (
                  <motion.div variants={itemVariants} className="text-right">
                    <button
                      type="button"
                      className="text-sm text-ozo-red hover:underline"
                      onClick={() => toast.info('Password reset coming soon!')}
                    >
                      Forgot Password?
                    </button>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.div variants={itemVariants}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {isLogin ? 'Login' : 'Create Account'}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </motion.div>

                {/* Toggle Login/Signup */}
                <motion.div variants={itemVariants} className="text-center">
                  <p className="text-ozo-gray">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(!isLogin)
                        setErrors({})
                        setFormData({
                          email: '',
                          password: '',
                          fullName: '',
                          phone: '',
                          confirmPassword: '',
                        })
                      }}
                      className="ml-2 text-ozo-red font-semibold hover:underline"
                    >
                      {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                  </p>
                </motion.div>
              </motion.form>
            </div>
          </motion.div>

          {/* Right Side - Hero */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex flex-1 bg-gradient-ozo text-white p-12 items-center justify-center"
          >
            <div className="max-w-md">
              <h2 className="text-4xl font-bold mb-6">
                Groceries delivered in 10 minutes!
              </h2>
              <p className="text-lg mb-8 opacity-90">
                Join thousands of happy customers who save time and money shopping with OZO.
              </p>

              {/* Features */}
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <span>{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )
    }

    export default Auth