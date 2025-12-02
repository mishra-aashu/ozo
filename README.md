# 🛒 OZO - Lightning Fast Grocery Delivery App

<div align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5.0.8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-2.39.0-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4.0-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Zustand-4.4.7-orange?style=for-the-badge" alt="Zustand" />
</div>

<div align="center">
  <h3>🚀 India ka sabse fast grocery delivery app - 10 minute delivery guaranteed!</h3>
  <p>Built with ❤️ using React, Supabase, and modern web technologies</p>
</div>

---

## ✨ Features

### 🛍️ Customer Features
- **⚡ 10-Minute Delivery** - Super fast delivery at your doorstep
- **📱 Mobile-First Design** - Responsive and optimized for all devices
- **🔐 Secure Authentication** - Email/password based secure login
- **🛒 Smart Cart Management** - Real-time cart updates with quantity controls
- **💚 Wishlist** - Save products for later
- **🏷️ Offers & Coupons** - Apply discount codes and save money
- **📦 Order Tracking** - Track your orders in real-time
- **🔍 Smart Search** - Find products quickly with instant search
- **📊 Order History** - View all your past orders
- **⭐ Product Reviews** - Rate and review products
- **🏠 Address Management** - Save multiple delivery addresses

### 👨‍💼 Admin Features
- **📊 Dashboard** - Analytics and insights at a glance
- **📦 Product Management** - Add, edit, delete products
- **🏷️ Category Management** - Organize products by categories
- **📋 Order Management** - View and manage all orders
- **🎁 Offers Management** - Create and manage promotional offers
- **👥 User Management** - View and manage customer accounts
- **📈 Sales Analytics** - Track revenue and growth

### 🎨 UI/UX Features
- **🌈 Beautiful Animations** - Smooth Framer Motion animations
- **🎨 Red & Green Theme** - Eye-catching color scheme
- **⚡ Lightning Fast** - Optimized performance with Vite
- **📱 PWA Ready** - Install as a mobile app
- **🌙 Glass Morphism** - Modern design elements
- **🔄 Real-time Updates** - Live data synchronization

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn installed
- Supabase account (free tier works)
- Git installed on your system

### 📥 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ozo-grocery-app.git
cd ozo-grocery-app
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the schema from `schema.sql`
   - Get your project URL and anon key from Settings > API

4. **Configure environment variables**
```bash
cp .env.example .env
```
Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. **Start development server**
```bash
npm run dev
# or
yarn dev
```

6. **Open in browser**
```
http://localhost:3000
```

---

## 🏗️ Project Structure

```
ozo-grocery-app/
├── src/
│   ├── assets/          # Static assets
│   ├── components/      # Reusable components
│   │   ├── Header.jsx
│   │   ├── BottomNav.jsx
│   │   ├── ProductCard.jsx
│   │   └── CategoryChip.jsx
│   ├── layouts/         # Layout components
│   │   ├── MainLayout.jsx
│   │   └── AdminLayout.jsx
│   ├── pages/           # Page components
│   │   ├── Home.jsx
│   │   ├── Products.jsx
│   │   ├── Cart.jsx
│   │   ├── Auth.jsx
│   │   └── admin/       # Admin pages
│   ├── stores/          # Zustand stores
│   │   ├── authStore.js
│   │   ├── cartStore.js
│   │   ├── productStore.js
│   │   └── orderStore.js
│   ├── lib/            # External libraries config
│   │   └── supabase.js
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Public assets
├── .env.example        # Environment variables template
├── package.json        # Dependencies
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
└── README.md          # Documentation
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool for blazing fast development
- **React Router v6** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Zustand** - State management
- **React Hot Toast** - Toast notifications
- **Lucide React** - Beautiful icons
- **Swiper** - Touch slider

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Storage for images
  - Row Level Security

### Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

---

## 🎯 Key Features Implementation

### 🔐 Authentication Flow
```javascript
// Sign up new user
const { data, error } = await authHelpers.signUp(email, password, fullName)

// Sign in existing user
const { data, error } = await authHelpers.signIn(email, password)

// Sign out
await authHelpers.signOut()
```

### 🛒 Cart Management
```javascript
// Add to cart
await cartStore.addToCart(product, quantity)

// Update quantity
await cartStore.updateQuantity(cartItemId, newQuantity)

// Remove from cart
await cartStore.removeFromCart(cartItemId)
```

### 📦 Order Placement
```javascript
// Place order
const orderData = {
  addressId,
  subtotal,
  deliveryFee,
  total,
  paymentMethod
}
await orderStore.placeOrder(orderData)
```

---

## 🚀 Deployment

### Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ozo-grocery-app)

1. Click the button above
2. Create a new repository
3. Add environment variables
4. Deploy!

### Deploy to Netlify
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/ozo-grocery-app)

### Manual Deployment
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy dist folder to your hosting provider
```

---

## 🔧 Admin Panel

### Creating Admin User
1. Sign up as a normal user
2. Go to Supabase dashboard
3. Navigate to Table Editor > users
4. Change role from 'customer' to 'admin'
5. Access admin panel at `/admin`


## 📱 PWA Installation

### Android
1. Open app in Chrome
2. Tap "Add to Home Screen"
3. Install the app

### iOS
1. Open app in Safari
2. Tap Share button
3. Tap "Add to Home Screen"

---

## 🎨 Customization

### Change Theme Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  ozo: {
    red: '#E23744',    // Change primary red
    green: '#0D9E4F',  // Change primary green
  }
}
```

### Change Delivery Time
Edit `src/pages/Home.jsx`:
```javascript
const DELIVERY_TIME = 10; // minutes
```

### Add New Categories
Run SQL in Supabase:
```sql
INSERT INTO categories (name, slug, icon, display_order)
VALUES ('Electronics', 'electronics', '📱', 16);
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by Blinkit, Zepto, and Instamart
- Built with love for the Indian grocery market
- Thanks to all contributors and supporters

---

## 📞 Support

For support, email support@ozoapp.com or join our Slack channel.

### Common Issues

**Issue: Supabase connection failed**
- Solution: Check your environment variables

**Issue: Images not loading**
- Solution: Configure Supabase storage bucket as public

**Issue: Admin panel not accessible**
- Solution: Ensure user role is set to 'admin' in database

---

## 🚦 Roadmap

- [ ] Mobile app (React Native)
- [ ] Payment gateway integration
- [ ] Live order tracking
- [ ] Push notifications
- [ ] Voice search
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Seller dashboard
- [ ] Referral system
- [ ] Subscription plans

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/ozo-grocery-app?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/ozo-grocery-app?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/ozo-grocery-app)
![GitHub license](https://img.shields.io/github/license/yourusername/ozo-grocery-app)

---

<div align="center">
  <h3>Made with ❤️ by OZO Team</h3>
  <p>⭐ Star us on GitHub — it motivates us a lot!</p>
</div>