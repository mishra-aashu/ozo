// OZO System Architecture Mind Map Data
// Generated dynamically using Groq Llama-3.3-70b-versatile Model

const OZO_MINDMAP_TREE = {
  "name": "OZO Platform",
  "description": "Premium On-Demand Grocery Delivery App Ecosystem",
  "role": "System Architecture Root",
  "type": "root",
  "children": [
    {
      "name": "Frontend Application (Vite + React)",
      "role": "Client Interfaces & UI Logic",
      "type": "category",
      "children": [
        {
          "name": "State Management (Zustand)",
          "role": "Global Reactive Stores",
          "type": "subcategory",
          "children": [
            {
              "name": "wishlistStore.js",
              "path": "src/stores/wishlistStore.js",
              "description": "Manages user wishlist data",
              "role": "Wishlist Manager",
              "lines": 307,
              "size": 9440,
              "exports": [
                "useWishlistStore"
              ],
              "type": "file_code"
            },
            {
              "name": "languageStore.js",
              "path": "src/stores/languageStore.js",
              "description": "Handles language settings and translations",
              "role": "Language Controller",
              "lines": 393,
              "size": 25416,
              "exports": [
                "LANGUAGES",
                "TRANSLATIONS"
              ],
              "type": "file_code"
            },
            {
              "name": "blogStore.js",
              "path": "src/stores/blogStore.js",
              "description": "Manages blog-related data and functionality",
              "role": "Blog Manager",
              "lines": 346,
              "size": 13046,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "captainStore.js",
              "path": "src/stores/captainStore.js",
              "description": "Manages captain-related data and functionality",
              "role": "Captain Controller",
              "lines": 796,
              "size": 26097,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "martStore.js",
              "path": "src/stores/martStore.js",
              "description": "Manages mart-related data and functionality",
              "role": "Mart Manager",
              "lines": 1170,
              "size": 38727,
              "exports": [
                "useMartStore"
              ],
              "type": "file_code"
            },
            {
              "name": "themeStore.js",
              "path": "src/stores/themeStore.js",
              "description": "Handles theme settings and preferences",
              "role": "Theme Controller",
              "lines": 38,
              "size": 1145,
              "exports": [
                "useThemeStore"
              ],
              "type": "file_code"
            },
            {
              "name": "orderStore.js",
              "path": "src/stores/orderStore.js",
              "description": "Manages order-related data and functionality",
              "role": "Order Manager",
              "lines": 805,
              "size": 25202,
              "exports": [
                "useOrderStore"
              ],
              "type": "file_code"
            },
            {
              "name": "cartStore.js",
              "path": "src/stores/cartStore.js",
              "description": "Manages cart-related data and functionality",
              "role": "Cart Controller",
              "lines": 1123,
              "size": 44461,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "notificationStore.js",
              "path": "src/stores/notificationStore.js",
              "description": "Manages notification-related data and functionality",
              "role": "Notification Manager",
              "lines": 236,
              "size": 6597,
              "exports": [
                "useNotificationStore"
              ],
              "type": "file_code"
            },
            {
              "name": "authStore.js",
              "path": "src/stores/authStore.js",
              "description": "Handles user authentication and authorization",
              "role": "Auth Manager",
              "lines": 856,
              "size": 33968,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "locationStore.js",
              "path": "src/stores/locationStore.js",
              "description": "Manages location-related data and functionality",
              "role": "Location Controller",
              "lines": 1048,
              "size": 41336,
              "exports": [
                "useLocationStore"
              ],
              "type": "file_code"
            },
            {
              "name": "adminIndicatorStore.js",
              "path": "src/stores/adminIndicatorStore.js",
              "description": "Manages admin indicator-related data and functionality",
              "role": "Admin Indicator",
              "lines": 192,
              "size": 5424,
              "exports": [
                "useAdminIndicatorStore"
              ],
              "type": "file_code"
            },
            {
              "name": "productStore.js",
              "path": "src/stores/productStore.js",
              "description": "Manages product-related data and functionality",
              "role": "Product Manager",
              "lines": 1035,
              "size": 37208,
              "exports": [],
              "type": "file_code"
            }
          ]
        },
        {
          "name": "User Pages & Routing",
          "role": "Application Screens",
          "type": "subcategory",
          "children": [
            {
              "name": "Customer Interface",
              "role": "Customer Grocery Experience",
              "type": "subcategory_group",
              "children": [
                {
                  "name": "Auth.jsx",
                  "path": "src/pages/Auth.jsx",
                  "description": "Handles user authentication and login",
                  "role": "Auth Handler",
                  "lines": 266,
                  "size": 12906,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Careers.jsx",
                  "path": "src/pages/Careers.jsx",
                  "description": "Displays careers and job listings page",
                  "role": "Careers Page",
                  "lines": 204,
                  "size": 10712,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Developer.jsx",
                  "path": "src/pages/Developer.jsx",
                  "description": "Renders the developer page and information",
                  "role": "Developer Page",
                  "lines": 495,
                  "size": 26634,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "RefundPolicy.jsx",
                  "path": "src/pages/RefundPolicy.jsx",
                  "description": "Displays refund policy and related information",
                  "role": "Refund Policy",
                  "lines": 96,
                  "size": 5936,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "MartProfile.jsx",
                  "path": "src/pages/MartProfile.jsx",
                  "description": "Handles mart profile display and management",
                  "role": "Mart Profile",
                  "lines": 1646,
                  "size": 78463,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Orders.jsx",
                  "path": "src/pages/Orders.jsx",
                  "description": "Displays user orders and related information",
                  "role": "Order Manager",
                  "lines": 334,
                  "size": 16692,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Categories.jsx",
                  "path": "src/pages/Categories.jsx",
                  "description": "Renders the categories page and display",
                  "role": "Category Page",
                  "lines": 136,
                  "size": 5463,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "TermsOfService.jsx",
                  "path": "src/pages/TermsOfService.jsx",
                  "description": "Displays terms of service and related information",
                  "role": "Terms Page",
                  "lines": 1091,
                  "size": 72615,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Offers.jsx",
                  "path": "src/pages/Offers.jsx",
                  "description": "Displays product offers",
                  "role": "Offer Page",
                  "lines": 241,
                  "size": 11510,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Addresses.jsx",
                  "path": "src/pages/Addresses.jsx",
                  "description": "Manages user addresses",
                  "role": "Address Manager",
                  "lines": 779,
                  "size": 35117,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "PhoneCapture.jsx",
                  "path": "src/pages/PhoneCapture.jsx",
                  "description": "Handles phone number capture",
                  "role": "Phone Capturer",
                  "lines": 767,
                  "size": 27825,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Home.jsx",
                  "path": "src/pages/Home.jsx",
                  "description": "Renders the home page",
                  "role": "Home Page",
                  "lines": 2650,
                  "size": 128396,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Press.jsx",
                  "path": "src/pages/Press.jsx",
                  "description": "Displays press information",
                  "role": "Press Page",
                  "lines": 115,
                  "size": 5920,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "SelectLocation.jsx",
                  "path": "src/pages/SelectLocation.jsx",
                  "description": "Allows location selection",
                  "role": "Location Selector",
                  "lines": 1157,
                  "size": 53818,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Settings.jsx",
                  "path": "src/pages/Settings.jsx",
                  "description": "Manages user settings",
                  "role": "Settings Manager",
                  "lines": 170,
                  "size": 7280,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "PrivacyPolicy.jsx",
                  "path": "src/pages/PrivacyPolicy.jsx",
                  "description": "Displays privacy policy",
                  "role": "Privacy Policy",
                  "lines": 104,
                  "size": 5648,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "OrderDetail.jsx",
                  "path": "src/pages/OrderDetail.jsx",
                  "description": "Displays order details",
                  "role": "Order Viewer",
                  "lines": 2026,
                  "size": 96677,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Contact.jsx",
                  "path": "src/pages/Contact.jsx",
                  "description": "Handles contact information",
                  "role": "Contact Page",
                  "lines": 261,
                  "size": 11235,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Blog.jsx",
                  "path": "src/pages/Blog.jsx",
                  "description": "Displays blog posts",
                  "role": "Blog Page",
                  "lines": 218,
                  "size": 11174,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "SearchedPage.jsx",
                  "path": "src/pages/SearchedPage.jsx",
                  "description": "Displays search results",
                  "role": "Search Results",
                  "lines": 831,
                  "size": 35182,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Cart.jsx",
                  "path": "src/pages/Cart.jsx",
                  "description": "Manages the shopping cart",
                  "role": "Cart Manager",
                  "lines": 967,
                  "size": 42603,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Search.jsx",
                  "path": "src/pages/Search.jsx",
                  "description": "Handles search functionality",
                  "role": "Search Handler",
                  "lines": 284,
                  "size": 12987,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Referral.jsx",
                  "path": "src/pages/Referral.jsx",
                  "description": "Manages referrals",
                  "role": "Referral Manager",
                  "lines": 344,
                  "size": 14803,
                  "exports": [
                    "function"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "Profile.jsx",
                  "path": "src/pages/Profile.jsx",
                  "description": "Displays user profile",
                  "role": "Profile Page",
                  "lines": 758,
                  "size": 40203,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "About.jsx",
                  "path": "src/pages/About.jsx",
                  "description": "Displays about information",
                  "role": "About Page",
                  "lines": 164,
                  "size": 8722,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "ShippingPolicy.jsx",
                  "path": "src/pages/ShippingPolicy.jsx",
                  "description": "Displays shipping policy",
                  "role": "Shipping Policy",
                  "lines": 101,
                  "size": 6039,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "CompleteProfile.jsx",
                  "path": "src/pages/CompleteProfile.jsx",
                  "description": "Completes user profile",
                  "role": "Profile Completer",
                  "lines": 193,
                  "size": 6825,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Notifications.jsx",
                  "path": "src/pages/Notifications.jsx",
                  "description": "Manages notifications",
                  "role": "Notification Manager",
                  "lines": 250,
                  "size": 10970,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Checkout.jsx",
                  "path": "src/pages/Checkout.jsx",
                  "description": "Handles checkout process",
                  "role": "Checkout Handler",
                  "lines": 2061,
                  "size": 102380,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "BlogDetail.jsx",
                  "path": "src/pages/BlogDetail.jsx",
                  "description": "Displays blog post details",
                  "role": "Blog Post Viewer",
                  "lines": 263,
                  "size": 12039,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Products.jsx",
                  "path": "src/pages/Products.jsx",
                  "description": "Displays products",
                  "role": "Product Page",
                  "lines": 846,
                  "size": 38950,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "CategoryProducts.jsx",
                  "path": "src/pages/CategoryProducts.jsx",
                  "description": "Displays category products",
                  "role": "Category Page",
                  "lines": 1624,
                  "size": 79309,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "ComboDetail.jsx",
                  "path": "src/pages/ComboDetail.jsx",
                  "description": "Displays combo details",
                  "role": "Combo Viewer",
                  "lines": 519,
                  "size": 26374,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "AuthCallback.jsx",
                  "path": "src/pages/AuthCallback.jsx",
                  "description": "Handles authentication callback",
                  "role": "Auth Callback",
                  "lines": 154,
                  "size": 5385,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Security.jsx",
                  "path": "src/pages/Security.jsx",
                  "description": "Manages security settings",
                  "role": "Security Manager",
                  "lines": 406,
                  "size": 15585,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Wishlist.jsx",
                  "path": "src/pages/Wishlist.jsx",
                  "description": "Displays user wishlist",
                  "role": "Wishlist Page",
                  "lines": 218,
                  "size": 10923,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "NotFound.jsx",
                  "path": "src/pages/NotFound.jsx",
                  "description": "Displays not found page",
                  "role": "Not Found Page",
                  "lines": 85,
                  "size": 3014,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "CookiePolicy.jsx",
                  "path": "src/pages/CookiePolicy.jsx",
                  "description": "Displays cookie policy",
                  "role": "Cookie Policy",
                  "lines": 95,
                  "size": 5232,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Payments.jsx",
                  "path": "src/pages/Payments.jsx",
                  "description": "Manages payments",
                  "role": "Payment Manager",
                  "lines": 445,
                  "size": 18138,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "ProductDetail.jsx",
                  "path": "src/pages/ProductDetail.jsx",
                  "description": "Displays product details",
                  "role": "Product Viewer",
                  "lines": 1859,
                  "size": 88967,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Help.jsx",
                  "path": "src/pages/Help.jsx",
                  "description": "Displays help information",
                  "role": "Help Page",
                  "lines": 1231,
                  "size": 61878,
                  "exports": [],
                  "type": "file_code"
                }
              ]
            },
            {
              "name": "Admin Dashboard",
              "role": "Platform Management Console",
              "type": "subcategory_group",
              "children": [
                {
                  "name": "SqlConsole.jsx",
                  "path": "src/pages/admin/SqlConsole.jsx",
                  "description": "Provides SQL console functionality",
                  "role": "SQL Console",
                  "lines": 377,
                  "size": 16135,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Dashboard.jsx",
                  "path": "src/pages/admin/Dashboard.jsx",
                  "description": "Renders admin dashboard",
                  "role": "Admin Dashboard",
                  "lines": 1091,
                  "size": 49974,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Cities.jsx",
                  "path": "src/pages/admin/Cities.jsx",
                  "description": "Manages city-related data",
                  "role": "City Manager",
                  "lines": 1696,
                  "size": 79363,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Reviews.jsx",
                  "path": "src/pages/admin/Reviews.jsx",
                  "description": "Handles review-related functionality",
                  "role": "Review Manager",
                  "lines": 637,
                  "size": 28246,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Orders.jsx",
                  "path": "src/pages/admin/Orders.jsx",
                  "description": "Manages order-related data",
                  "role": "Order Manager",
                  "lines": 2687,
                  "size": 144844,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Categories.jsx",
                  "path": "src/pages/admin/Categories.jsx",
                  "description": "Manages category-related data",
                  "role": "Category Manager",
                  "lines": 1354,
                  "size": 64066,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Messages.jsx",
                  "path": "src/pages/admin/Messages.jsx",
                  "description": "Handles message-related functionality",
                  "role": "Message Manager",
                  "lines": 1102,
                  "size": 52014,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Offers.jsx",
                  "path": "src/pages/admin/Offers.jsx",
                  "description": "Manages offer-related data",
                  "role": "Offer Manager",
                  "lines": 1632,
                  "size": 82346,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Requests.jsx",
                  "path": "src/pages/admin/Requests.jsx",
                  "description": "Handles request-related functionality",
                  "role": "Request Manager",
                  "lines": 1541,
                  "size": 78659,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "RiderManageAdmin.jsx",
                  "path": "src/pages/admin/RiderManageAdmin.jsx",
                  "description": "Manages rider-related data",
                  "role": "Rider Manager",
                  "lines": 1306,
                  "size": 65530,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "MartPayoutsAdmin.jsx",
                  "path": "src/pages/admin/MartPayoutsAdmin.jsx",
                  "description": "Handles mart payout-related functionality",
                  "role": "Mart Payouts",
                  "lines": 918,
                  "size": 42434,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Settings.jsx",
                  "path": "src/pages/admin/Settings.jsx",
                  "description": "Provides settings management functionality",
                  "role": "Settings Manager",
                  "lines": 3689,
                  "size": 191743,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Backup.jsx",
                  "path": "src/pages/admin/Backup.jsx",
                  "description": "Handles backup-related functionality",
                  "role": "Backup Manager",
                  "lines": 1848,
                  "size": 77982,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Blog.jsx",
                  "path": "src/pages/admin/Blog.jsx",
                  "description": "Manages blog-related data",
                  "role": "Blog Manager",
                  "lines": 938,
                  "size": 45310,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Users.jsx",
                  "path": "src/pages/admin/Users.jsx",
                  "description": "Handles user-related functionality",
                  "role": "User Manager",
                  "lines": 1846,
                  "size": 96570,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "PhoneCaptureSandbox.jsx",
                  "path": "src/pages/admin/PhoneCaptureSandbox.jsx",
                  "description": "Provides phone capture sandbox functionality",
                  "role": "Phone Capture",
                  "lines": 693,
                  "size": 31540,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Products.jsx",
                  "path": "src/pages/admin/Products.jsx",
                  "description": "Manages product-related data",
                  "role": "Product Manager",
                  "lines": 2628,
                  "size": 122316,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Festivals.jsx",
                  "path": "src/pages/admin/Festivals.jsx",
                  "description": "Handles festival-related functionality",
                  "role": "Festival Manager",
                  "lines": 1046,
                  "size": 50734,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "MartManageAdmin.jsx",
                  "path": "src/pages/admin/MartManageAdmin.jsx",
                  "description": "Manages mart-related data",
                  "role": "Mart Manager",
                  "lines": 1577,
                  "size": 77873,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "ProfitOptimizer.jsx",
                  "path": "src/pages/admin/ProfitOptimizer.jsx",
                  "description": "Provides profit optimization functionality",
                  "role": "Profit Optimizer",
                  "lines": 1361,
                  "size": 62434,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "MartAdmin.jsx",
                  "path": "src/pages/admin/MartAdmin.jsx",
                  "description": "Handles mart administration functionality",
                  "role": "Mart Admin",
                  "lines": 215,
                  "size": 11248,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "RiderAdmin.jsx",
                  "path": "src/pages/admin/RiderAdmin.jsx",
                  "description": "Manages rider-related data",
                  "role": "Rider Admin",
                  "lines": 581,
                  "size": 29167,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "SeoDashboard.jsx",
                  "path": "src/pages/admin/SeoDashboard.jsx",
                  "description": "Provides SEO dashboard functionality",
                  "role": "SEO Dashboard",
                  "lines": 874,
                  "size": 39448,
                  "exports": [],
                  "type": "file_code"
                }
              ]
            },
            {
              "name": "Mart Operator Portal",
              "role": "Store & Inventory Manager",
              "type": "subcategory_group",
              "children": [
                {
                  "name": "Dashboard.jsx",
                  "path": "src/pages/mart/Dashboard.jsx",
                  "description": "Renders mart dashboard",
                  "role": "Mart Dashboard",
                  "lines": 535,
                  "size": 25662,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "InventoryView.jsx",
                  "path": "src/pages/mart/InventoryView.jsx",
                  "description": "Handles inventory-related functionality",
                  "role": "Inventory Manager",
                  "lines": 2494,
                  "size": 136232,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "BulkImportWizard.jsx",
                  "path": "src/pages/mart/BulkImportWizard.jsx",
                  "description": "Provides bulk import functionality",
                  "role": "Bulk Import",
                  "lines": 1723,
                  "size": 79573,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "StoreProfileView.jsx",
                  "path": "src/pages/mart/StoreProfileView.jsx",
                  "description": "Manages store profile-related data",
                  "role": "Store Profile",
                  "lines": 671,
                  "size": 36523,
                  "exports": [
                    "parseTimeString"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "LiveOrdersView.jsx",
                  "path": "src/pages/mart/LiveOrdersView.jsx",
                  "description": "Handles live orders functionality",
                  "role": "Live Orders",
                  "lines": 1127,
                  "size": 60325,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "EarningsView.jsx",
                  "path": "src/pages/mart/EarningsView.jsx",
                  "description": "Provides earnings-related functionality",
                  "role": "Earnings Manager",
                  "lines": 808,
                  "size": 45586,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "MartOnboarding.jsx",
                  "path": "src/pages/mart/MartOnboarding.jsx",
                  "description": "Manages mart onboarding process",
                  "role": "Mart Onboarding",
                  "lines": 214,
                  "size": 9529,
                  "exports": [],
                  "type": "file_code"
                }
              ]
            },
            {
              "name": "Delivery Captain Radar",
              "role": "Logistics & Fulfillment Radar",
              "type": "subcategory_group",
              "children": [
                {
                  "name": "Dashboard.jsx",
                  "path": "src/pages/captain/Dashboard.jsx",
                  "description": "Displays captain dashboard",
                  "role": "Captain Dashboard",
                  "lines": 431,
                  "size": 20289,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "CaptainRadar.jsx",
                  "path": "src/pages/captain/CaptainRadar.jsx",
                  "description": "Displays captain radar",
                  "role": "Captain Radar",
                  "lines": 1151,
                  "size": 61948,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "CaptainProfile.jsx",
                  "path": "src/pages/captain/CaptainProfile.jsx",
                  "description": "Handles captain profile rendering",
                  "role": "Captain Profile",
                  "lines": 165,
                  "size": 8987,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "CaptainOnboarding.jsx",
                  "path": "src/pages/captain/CaptainOnboarding.jsx",
                  "description": "Manages captain onboarding process",
                  "role": "Captain Onboarding",
                  "lines": 316,
                  "size": 13665,
                  "exports": [],
                  "type": "file_code"
                }
              ]
            }
          ]
        },
        {
          "name": "Reusable UI Components",
          "role": "Interactive Widgets",
          "type": "subcategory",
          "children": [
            {
              "name": "Shared Widgets",
              "role": "Generic UI Widgets",
              "type": "subcategory_group",
              "children": [
                {
                  "name": "ReasonSelector.jsx",
                  "path": "src/components/ReasonSelector.jsx",
                  "description": "Renders a reason selection component",
                  "role": "Reason Selector",
                  "lines": 115,
                  "size": 4203,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "ProductSkeleton.jsx",
                  "path": "src/components/ProductSkeleton.jsx",
                  "description": "Renders a product skeleton component",
                  "role": "Product Skeleton",
                  "lines": 69,
                  "size": 2633,
                  "exports": [
                    "function"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "OzoMapPicker.jsx",
                  "path": "src/components/OzoMapPicker.jsx",
                  "description": "Renders a map picker component",
                  "role": "Map Picker",
                  "lines": 1421,
                  "size": 55217,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "TopCategories.jsx",
                  "path": "src/components/TopCategories.jsx",
                  "description": "Renders top categories component",
                  "role": "Top Categories",
                  "lines": 240,
                  "size": 11990,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "OzoLogo.jsx",
                  "path": "src/components/OzoLogo.jsx",
                  "description": "Renders the Ozo logo component",
                  "role": "Ozo Logo",
                  "lines": 92,
                  "size": 2945,
                  "exports": [
                    "function"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "CashfreeShield.jsx",
                  "path": "src/components/CashfreeShield.jsx",
                  "description": "Renders a Cashfree shield component",
                  "role": "Cashfree Shield",
                  "lines": 520,
                  "size": 22489,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "SortDropdown.jsx",
                  "path": "src/components/SortDropdown.jsx",
                  "description": "Renders a sort dropdown component",
                  "role": "Sort Dropdown",
                  "lines": 185,
                  "size": 6596,
                  "exports": [
                    "sortOptions"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "ProductCard.jsx",
                  "path": "src/components/ProductCard.jsx",
                  "description": "Renders a product card component",
                  "role": "Product Card",
                  "lines": 697,
                  "size": 30608,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "SEO.jsx",
                  "path": "src/components/SEO.jsx",
                  "description": "Handles SEO metadata for pages",
                  "role": "SEO Handler",
                  "lines": 114,
                  "size": 3930,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "AddressForm.jsx",
                  "path": "src/components/AddressForm.jsx",
                  "description": "Manages address input and validation",
                  "role": "Address Validator",
                  "lines": 1317,
                  "size": 56152,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Breadcrumb.jsx",
                  "path": "src/components/Breadcrumb.jsx",
                  "description": "Displays navigation breadcrumbs",
                  "role": "Breadcrumb Display",
                  "lines": 175,
                  "size": 6244,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "RazorpayShield.jsx",
                  "path": "src/components/RazorpayShield.jsx",
                  "description": "Integrates Razorpay payment shield",
                  "role": "Payment Shield",
                  "lines": 630,
                  "size": 25168,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "LocationPicker.jsx",
                  "path": "src/components/LocationPicker.jsx",
                  "description": "Allows users to pick locations",
                  "role": "Location Picker",
                  "lines": 1155,
                  "size": 56650,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "OptimizedImage.jsx",
                  "path": "src/components/OptimizedImage.jsx",
                  "description": "Optimizes image loading and display",
                  "role": "Image Optimizer",
                  "lines": 168,
                  "size": 5678,
                  "exports": [
                    "function"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "ScrollToTop.jsx",
                  "path": "src/components/ScrollToTop.jsx",
                  "description": "Scrolls to top of page on navigation",
                  "role": "Scroll Handler",
                  "lines": 17,
                  "size": 299,
                  "exports": [
                    "ScrollToTop"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "SuggestedProducts.jsx",
                  "path": "src/components/SuggestedProducts.jsx",
                  "description": "Displays suggested products to users",
                  "role": "Product Suggester",
                  "lines": 419,
                  "size": 15863,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "ServiceabilityModal.jsx",
                  "path": "src/components/ServiceabilityModal.jsx",
                  "description": "Handles serviceability checks and modal display",
                  "role": "Serviceability Checker",
                  "lines": 223,
                  "size": 10450,
                  "exports": [
                    "function"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "LanguageModal.jsx",
                  "path": "src/components/LanguageModal.jsx",
                  "description": "Manages language selection and display",
                  "role": "Language Manager",
                  "lines": 116,
                  "size": 4439,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "BrowsingBanner.jsx",
                  "path": "src/components/BrowsingBanner.jsx",
                  "description": "Displays browsing location banner",
                  "role": "Browsing Banner",
                  "lines": 61,
                  "size": 2250,
                  "exports": [
                    "function"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "AdminLockScreen.jsx",
                  "path": "src/components/AdminLockScreen.jsx",
                  "description": "Handles admin lock screen functionality",
                  "role": "Admin Lock",
                  "lines": 146,
                  "size": 6474,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "ConfirmModal.jsx",
                  "path": "src/components/ConfirmModal.jsx",
                  "description": "Displays confirmation modals to users",
                  "role": "Confirm Modal",
                  "lines": 101,
                  "size": 4036,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "CategoryChip.jsx",
                  "path": "src/components/CategoryChip.jsx",
                  "description": "Displays category chips and information",
                  "role": "Category Display",
                  "lines": 565,
                  "size": 27551,
                  "exports": [
                    "isCategoryListingSoon"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "ImageUpload.jsx",
                  "path": "src/components/ImageUpload.jsx",
                  "description": "Handles image upload functionality",
                  "role": "Image Uploader",
                  "lines": 546,
                  "size": 19458,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "OzoLoadingGuard.jsx",
                  "path": "src/components/OzoLoadingGuard.jsx",
                  "description": "Manages loading states and displays",
                  "role": "Loading Guard",
                  "lines": 49,
                  "size": 2288,
                  "exports": [
                    "OzoLoadingGuard"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "Header.jsx",
                  "path": "src/components/Header.jsx",
                  "description": "Renders the application header",
                  "role": "Header Controller",
                  "lines": 1144,
                  "size": 55557,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "OzoSplashScreen.jsx",
                  "path": "src/components/OzoSplashScreen.jsx",
                  "description": "Displays the application splash screen",
                  "role": "Splash Screen",
                  "lines": 302,
                  "size": 8897,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "Footer.jsx",
                  "path": "src/components/Footer.jsx",
                  "description": "Renders the application footer",
                  "role": "Footer Controller",
                  "lines": 220,
                  "size": 10400,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "UserAvatar.jsx",
                  "path": "src/components/UserAvatar.jsx",
                  "description": "Handles user avatar display and generation",
                  "role": "User Avatar",
                  "lines": 37,
                  "size": 1397,
                  "exports": [
                    "getAvatarUrl"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "NotificationPromptModal.jsx",
                  "path": "src/components/NotificationPromptModal.jsx",
                  "description": "Displays notification prompt modals",
                  "role": "Notification Prompt",
                  "lines": 176,
                  "size": 8851,
                  "exports": [
                    "function"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "LocationPromptModal.jsx",
                  "path": "src/components/LocationPromptModal.jsx",
                  "description": "Handles location prompt modals and functionality",
                  "role": "Location Prompt",
                  "lines": 411,
                  "size": 16598,
                  "exports": [
                    "isAddressIncomplete"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "BottomNav.jsx",
                  "path": "src/components/BottomNav.jsx",
                  "description": "Renders the bottom navigation bar",
                  "role": "Bottom Nav",
                  "lines": 315,
                  "size": 12820,
                  "exports": [],
                  "type": "file_code"
                }
              ]
            },
            {
              "name": "Admin Widgets",
              "role": "Admin Panel Helpers",
              "type": "subcategory_group",
              "children": [
                {
                  "name": "ProductCityManager.jsx",
                  "path": "src/components/admin/ProductCityManager.jsx",
                  "description": "Manages product cities and related functionality",
                  "role": "Product City Manager",
                  "lines": 435,
                  "size": 17721,
                  "exports": [
                    "function"
                  ],
                  "type": "file_code"
                },
                {
                  "name": "AdminMapPickerModal.jsx",
                  "path": "src/components/admin/AdminMapPickerModal.jsx",
                  "description": "Handles admin map picker modal display",
                  "role": "Admin Map Picker",
                  "lines": 361,
                  "size": 13891,
                  "exports": [],
                  "type": "file_code"
                },
                {
                  "name": "BulkControlPanel.jsx",
                  "path": "src/components/admin/BulkControlPanel.jsx",
                  "description": "Renders the bulk control panel for admins",
                  "role": "Bulk Controller",
                  "lines": 1373,
                  "size": 67733,
                  "exports": [
                    "function"
                  ],
                  "type": "file_code"
                }
              ]
            },
            {
              "name": "Mart Widgets",
              "role": "Mart Operations Widgets",
              "type": "subcategory_group",
              "children": [
                {
                  "name": "BarcodeEnrichmentModal.jsx",
                  "path": "src/components/mart/BarcodeEnrichmentModal.jsx",
                  "description": "Handles barcode enrichment modal display",
                  "role": "Barcode Enrichment",
                  "lines": 1473,
                  "size": 66230,
                  "exports": [],
                  "type": "file_code"
                }
              ]
            }
          ]
        },
        {
          "name": "Hooks, Utilities & Libraries",
          "role": "Utility Helpers & Integrations",
          "type": "subcategory",
          "children": [
            {
              "name": "useProductPagination.js",
              "path": "src/hooks/useProductPagination.js",
              "description": "Handles product pagination functionality",
              "role": "Pagination Helper",
              "lines": 313,
              "size": 11711,
              "exports": [
                "useProductPagination",
                "PAGINATION_LIMIT"
              ],
              "type": "file_code"
            },
            {
              "name": "useTranslation.js",
              "path": "src/hooks/useTranslation.js",
              "description": "Provides translation functionality",
              "role": "Translation Helper",
              "lines": 7,
              "size": 233,
              "exports": [
                "useTranslation"
              ],
              "type": "file_code"
            },
            {
              "name": "useOzoQuery.js",
              "path": "src/hooks/useOzoQuery.js",
              "description": "Handles data fetching for Ozo pages",
              "role": "Data Fetcher",
              "lines": 117,
              "size": 3978,
              "exports": [
                "useOzoQuery"
              ],
              "type": "file_code"
            },
            {
              "name": "rpc.js",
              "path": "src/lib/rpc.js",
              "description": "Handles RPC-related functionality",
              "role": "RPC Handler",
              "lines": 95,
              "size": 3367,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "geocoding.js",
              "path": "src/lib/geocoding.js",
              "description": "Provides geocoding functionality",
              "role": "Geocoding Helper",
              "lines": 428,
              "size": 15195,
              "exports": [
                "getServiceableStreets"
              ],
              "type": "file_code"
            },
            {
              "name": "addressHelpers.js",
              "path": "src/lib/addressHelpers.js",
              "description": "Provides address formatting and parsing functionality",
              "role": "Address Helper",
              "lines": 41,
              "size": 1483,
              "exports": [
                "formatLandmark",
                "parseLandmark"
              ],
              "type": "file_code"
            },
            {
              "name": "supabase.js",
              "path": "src/lib/supabase.js",
              "description": "Handles Supabase database interactions",
              "role": "Supabase Client",
              "lines": 1384,
              "size": 50221,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "firebase.js",
              "path": "src/lib/firebase.js",
              "description": "Handles Firebase interactions",
              "role": "Firebase Client",
              "lines": 178,
              "size": 6622,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "productUtils.js",
              "path": "src/utils/productUtils.js",
              "description": "Provides product-related utility functions",
              "role": "Product Utils",
              "lines": 19,
              "size": 629,
              "exports": [
                "isProductImageMissing"
              ],
              "type": "file_code"
            },
            {
              "name": "onesignal.js",
              "path": "src/utils/onesignal.js",
              "description": "Handles OneSignal push notification functionality",
              "role": "OneSignal Helper",
              "lines": 322,
              "size": 11232,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "productGrouper.js",
              "path": "src/utils/productGrouper.js",
              "description": "Groups similar products together",
              "role": "Product Grouper",
              "lines": 364,
              "size": 11355,
              "exports": [
                "groupProducts"
              ],
              "type": "file_code"
            },
            {
              "name": "imageOptimizer.js",
              "path": "src/utils/imageOptimizer.js",
              "description": "Optimizes and compresses images",
              "role": "Image Optimizer",
              "lines": 48,
              "size": 1811,
              "exports": [
                "getOptimizedImageUrl"
              ],
              "type": "file_code"
            }
          ]
        },
        {
          "name": "Config & Setup",
          "role": "Build Configs",
          "type": "subcategory",
          "children": [
            {
              "name": "App.jsx",
              "path": "src/App.jsx",
              "description": "Defines main application component",
              "role": "App Router",
              "lines": 762,
              "size": 28986,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "main.jsx",
              "path": "src/main.jsx",
              "description": "Initializes React application",
              "role": "App Entry",
              "lines": 230,
              "size": 7961,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "index.html",
              "path": "index.html",
              "description": "Serves as main HTML entry point",
              "role": "Web Entry",
              "lines": 266,
              "size": 14828,
              "exports": [],
              "type": "file_html"
            }
          ]
        }
      ]
    },
    {
      "name": "Backend APIs & Serverless Controllers",
      "role": "Serverless API Gateway",
      "type": "category",
      "children": [
        {
          "name": "_ratelimit.ts",
          "path": "api/_ratelimit.ts",
          "description": "Handles rate limiting functionality",
          "role": "Rate Limiter",
          "lines": 177,
          "size": 5551,
          "exports": [],
          "type": "file_code"
        },
        {
          "name": "image.ts",
          "path": "api/image.ts",
          "description": "Provides image-related functionality",
          "role": "Image Manager",
          "lines": 128,
          "size": 5314,
          "exports": [
            "async",
            "config"
          ],
          "type": "file_code"
        },
        {
          "name": "index-product.ts",
          "path": "api/index-product.ts",
          "description": "Handles product indexing functionality",
          "role": "Product Indexer",
          "lines": 94,
          "size": 3470,
          "exports": [
            "async"
          ],
          "type": "file_code"
        },
        {
          "name": "render-seo.ts",
          "path": "api/render-seo.ts",
          "description": "Handles SEO page rendering",
          "role": "SEO Handler",
          "lines": 2520,
          "size": 75349,
          "exports": [],
          "type": "file_code"
        },
        {
          "name": "_supabase.ts",
          "path": "api/_supabase.ts",
          "description": "Supabase client configuration",
          "role": "Supabase Config",
          "lines": 48,
          "size": 1302,
          "exports": [
            "supabase"
          ],
          "type": "file_code"
        },
        {
          "name": "proxy.ts",
          "path": "api/proxy.ts",
          "description": "Proxy server configuration",
          "role": "Proxy Server",
          "lines": 351,
          "size": 13348,
          "exports": [
            "config"
          ],
          "type": "file_code"
        },
        {
          "name": "search-image.ts",
          "path": "api/search-image.ts",
          "description": "Searches for images",
          "role": "Image Search",
          "lines": 394,
          "size": 15181,
          "exports": [],
          "type": "file_code"
        },
        {
          "name": "sitemap.ts",
          "path": "api/sitemap.ts",
          "description": "Generates sitemap",
          "role": "Sitemap Generator",
          "lines": 187,
          "size": 6864,
          "exports": [
            "async"
          ],
          "type": "file_code"
        },
        {
          "name": "mandi-sync.ts",
          "path": "api/mandi-sync.ts",
          "description": "Synchronizes mandi data",
          "role": "Mandi Sync",
          "lines": 468,
          "size": 16445,
          "exports": [],
          "type": "file_code"
        },
        {
          "name": "geocode.ts",
          "path": "api/geocode.ts",
          "description": "Handles geocoding",
          "role": "Geocode Handler",
          "lines": 345,
          "size": 11785,
          "exports": [],
          "type": "file_code"
        },
        {
          "name": "indexnow-key.ts",
          "path": "api/indexnow-key.ts",
          "description": "Handles IndexNow key",
          "role": "IndexNow Key",
          "lines": 24,
          "size": 901,
          "exports": [
            "async"
          ],
          "type": "file_code"
        },
        {
          "name": "order-manager.ts",
          "path": "api/cron/order-manager.ts",
          "description": "Manages orders",
          "role": "Order Manager",
          "lines": 56,
          "size": 2345,
          "exports": [
            "async"
          ],
          "type": "file_code"
        },
        {
          "name": "Supabase Edge Functions",
          "role": "Deno Edge Runtime Workers",
          "type": "subcategory",
          "children": [
            {
              "name": "index.ts",
              "path": "supabase/functions/verify-razorpay-payment/index.ts",
              "description": "Verifies Razorpay payments",
              "role": "Payment Verifier",
              "lines": 805,
              "size": 30021,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "index.ts",
              "path": "supabase/functions/cashfree-payment/index.ts",
              "description": "Handles Cashfree payments",
              "role": "Payment Handler",
              "lines": 704,
              "size": 28095,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "index.ts",
              "path": "supabase/functions/send-push-notification/index.ts",
              "description": "Sends push notifications",
              "role": "Notification Sender",
              "lines": 341,
              "size": 14162,
              "exports": [],
              "type": "file_code"
            },
            {
              "name": "index.ts",
              "path": "supabase/functions/imagekit-auth/index.ts",
              "description": "Handles ImageKit authentication",
              "role": "ImageKit Auth",
              "lines": 128,
              "size": 4372,
              "exports": [],
              "type": "file_code"
            }
          ]
        }
      ]
    },
    {
      "name": "Database Schemas & Security (Supabase)",
      "role": "PostgreSQL Backend & RBAC Policies",
      "type": "category",
      "children": [
        {
          "name": "Captains And Orders Security",
          "path": "supabase/migrations/20260611050000_captains_and_orders_security.sql",
          "description": "Secures captains and orders",
          "role": "Security Migration",
          "lines": 227,
          "size": 8331,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Secure Mart Customer Details",
          "path": "supabase/migrations/20260622223000_secure_mart_customer_details.sql",
          "description": "Secures mart customer details",
          "role": "Security Migration",
          "lines": 30,
          "size": 1509,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Order Pukka Addresses",
          "path": "supabase/migrations/20260610220000_order_pukka_addresses.sql",
          "description": "Adds pukka addresses to orders",
          "role": "Order Migration",
          "lines": 316,
          "size": 10614,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Fix Order Cancellation Stock Sync",
          "path": "supabase/migrations/20260709200500_fix_order_cancellation_stock_sync.sql",
          "description": "Fixes order cancellation stock sync",
          "role": "Order Migration",
          "lines": 237,
          "size": 9581,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Harden Security And Performance",
          "path": "supabase/migrations/20260702130000_harden_security_and_performance.sql",
          "description": "Hardens security and performance",
          "role": "Security Migration",
          "lines": 57,
          "size": 2144,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Inventory Stock Rules",
          "path": "supabase/migrations/20260608180000_inventory_stock_rules.sql",
          "description": "Creates inventory stock rules",
          "role": "Inventory Migration",
          "lines": 309,
          "size": 10604,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Add Summer Specials Category",
          "path": "supabase/migrations/20260624093000_add_summer_specials_category.sql",
          "description": "Adds summer specials category",
          "role": "Category Migration",
          "lines": 42,
          "size": 2073,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Onesignal Lifecycle",
          "path": "supabase/migrations/20260614183000_onesignal_lifecycle.sql",
          "description": "Sets up OneSignal lifecycle",
          "role": "Notification Migration",
          "lines": 146,
          "size": 6063,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Harden Rate Limiting",
          "path": "supabase/migrations/20260626070000_harden_rate_limiting.sql",
          "description": "Hardens rate limiting",
          "role": "Rate Limiting Migration",
          "lines": 101,
          "size": 3882,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Fuzzy Product Matching",
          "path": "supabase/migrations/20260707190000_fuzzy_product_matching.sql",
          "description": "Enables fuzzy product matching",
          "role": "Product Migration",
          "lines": 117,
          "size": 3713,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Add Allow Invoice To Orders",
          "path": "supabase/migrations/20260625161000_add_allow_invoice_to_orders.sql",
          "description": "Adds allow invoice to orders",
          "role": "Order Migration",
          "lines": 2,
          "size": 144,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Order State Machine",
          "path": "supabase/migrations/20260620000000_order_state_machine.sql",
          "description": "Sets up order state machine",
          "role": "Order Migration",
          "lines": 674,
          "size": 24842,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Harden Inventory Sync Rules",
          "path": "supabase/migrations/20260709202500_harden_inventory_sync_rules.sql",
          "description": "Hardens inventory sync rules",
          "role": "Inventory Migration",
          "lines": 991,
          "size": 36235,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Sync Product Catalog Availability",
          "path": "supabase/migrations/20260705183000_sync_product_catalog_availability.sql",
          "description": "Syncs product catalog availability",
          "role": "Product Migration",
          "lines": 113,
          "size": 4101,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Add City Manager To Users Role Check",
          "path": "supabase/migrations/20260719164500_add_city_manager_to_users_role_check.sql",
          "description": "Adds city manager to users role check",
          "role": "User Migration",
          "lines": 63,
          "size": 2255,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Friendly Product Name Errors",
          "path": "supabase/migrations/20260728100000_friendly_product_name_errors.sql",
          "description": "Replaces product UUIDs with names in errors",
          "role": "Error Migration",
          "lines": 471,
          "size": 16915,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Add Is Cancelled To Order Items",
          "path": "supabase/migrations/20260626173500_add_is_cancelled_to_order_items.sql",
          "description": "Adds is cancelled to order items",
          "role": "Order Migration",
          "lines": 3,
          "size": 144,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Fix Order Notification Lifecycle",
          "path": "supabase/migrations/20260711170000_fix_order_notification_lifecycle.sql",
          "description": "Fixes order notification lifecycle",
          "role": "Notification Migration",
          "lines": 209,
          "size": 9158,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Allow Webcam Phone Enrichment Sources",
          "path": "supabase/migrations/20260705185000_allow_webcam_phone_enrichment_sources.sql",
          "description": "Allows webcam and phone enrichment sources",
          "role": "Enrichment Migration",
          "lines": 8,
          "size": 523,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Create Scoped Rbac System",
          "path": "supabase/migrations/20260715125203_create_scoped_rbac_system.sql",
          "description": "Creates scoped RBAC system",
          "role": "RBAC Migration",
          "lines": 261,
          "size": 8259,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Fix Create Order City Slug",
          "path": "supabase/migrations/20260622060000_fix_create_order_city_slug.sql",
          "description": "Fixes create order city slug",
          "role": "Order Migration",
          "lines": 428,
          "size": 15478,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Bulk Logs Security",
          "path": "supabase/migrations/20260611040000_bulk_logs_security.sql",
          "description": "Secures bulk logs",
          "role": "Security Migration",
          "lines": 11,
          "size": 504,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Proximity Routing And Product Margins",
          "path": "supabase/migrations/20260705160000_proximity_routing_and_product_margins.sql",
          "description": "Adds latitude and longitude columns to marts table",
          "role": "Location Data",
          "lines": 664,
          "size": 23793,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Database Rate Limiting",
          "path": "supabase/migrations/20260623091200_database_rate_limiting.sql",
          "description": "Creates rate limit tracking table",
          "role": "Rate Limiter",
          "lines": 152,
          "size": 5576,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Secure User Role Updates",
          "path": "supabase/migrations/20260608190000_secure_user_role_updates.sql",
          "description": "Restricts role updates to admins only",
          "role": "Role Manager",
          "lines": 18,
          "size": 574,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Revoke All Other Sessions",
          "path": "supabase/migrations/20260611030000_revoke_all_other_sessions.sql",
          "description": "Revokes all other user sessions",
          "role": "Session Manager",
          "lines": 20,
          "size": 574,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Add Order Items Packed Columns",
          "path": "supabase/migrations/20260621114000_add_order_items_packed_columns.sql",
          "description": "Adds packed columns to order items table",
          "role": "Order Manager",
          "lines": 11,
          "size": 415,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Allow Mart Operator Insert Products",
          "path": "supabase/migrations/20260705184000_allow_mart_operator_insert_products.sql",
          "description": "Allows mart operators to insert products",
          "role": "Product Manager",
          "lines": 6,
          "size": 269,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Festival Planner System",
          "path": "supabase/migrations/20260714100000_festival_planner_system.sql",
          "description": "Creates festival planner table and triggers",
          "role": "Event Planner",
          "lines": 150,
          "size": 5201,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Add Cancelled By Mart Status",
          "path": "supabase/migrations/20260627154000_add_cancelled_by_mart_status.sql",
          "description": "Adds cancelled by mart status to orders table",
          "role": "Order Status",
          "lines": 329,
          "size": 13480,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Order Review Integrity Security",
          "path": "supabase/migrations/20260615170000_order_review_integrity_security.sql",
          "description": "Secures order review integrity",
          "role": "Security Enforcer",
          "lines": 218,
          "size": 9523,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Security Hardening And Indexes",
          "path": "supabase/migrations/20260705180000_security_hardening_and_indexes.sql",
          "description": "Hardens security and optimizes indexes",
          "role": "Security Optimizer",
          "lines": 234,
          "size": 12312,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Session Limit Trigger",
          "path": "supabase/migrations/20260611020000_session_limit_trigger.sql",
          "description": "Creates session limit trigger",
          "role": "Session Limiter",
          "lines": 49,
          "size": 1725,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "User Active Sessions",
          "path": "supabase/migrations/20260611010000_user_active_sessions.sql",
          "description": "Manages user active sessions",
          "role": "Session Manager",
          "lines": 44,
          "size": 1058,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Fix Scoped Rbac Onboarding Triggers",
          "path": "supabase/migrations/20260715125300_fix_scoped_rbac_onboarding_triggers.sql",
          "description": "Fixes scoped RBAC onboarding triggers",
          "role": "RBAC Manager",
          "lines": 115,
          "size": 4307,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Grant Rls Functions Execute",
          "path": "supabase/migrations/20260710235900_grant_rls_functions_execute.sql",
          "description": "Grants execute permissions on RLS functions",
          "role": "Permission Manager",
          "lines": 8,
          "size": 484,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Notify Mart Operator New Order",
          "path": "supabase/migrations/20260710234900_notify_mart_operator_new_order.sql",
          "description": "Notifies mart operator of new orders",
          "role": "Notification Sender",
          "lines": 142,
          "size": 6030,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Fix Admin Permissive Policies",
          "path": "supabase/migrations/20260611060000_fix_admin_permissive_policies.sql",
          "description": "Fixes admin permissive policies",
          "role": "Policy Manager",
          "lines": 62,
          "size": 2800,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Platform Fee",
          "path": "supabase/migrations/20260621121000_platform_fee.sql",
          "description": "Adds platform fee to orders table",
          "role": "Fee Manager",
          "lines": 434,
          "size": 15916,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Harden Rate Limiter Triggers",
          "path": "supabase/migrations/20260710225500_harden_rate_limiter_triggers.sql",
          "description": "Hardens rate limiter triggers",
          "role": "Rate Limiter",
          "lines": 39,
          "size": 1574,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Create User Fcm Tokens",
          "path": "supabase/migrations/20260710234300_create_user_fcm_tokens.sql",
          "description": "Creates user FCM tokens table",
          "role": "Token Manager",
          "lines": 34,
          "size": 1175,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Allow Blinkit Bigbasket Enrichment Sources",
          "path": "supabase/migrations/20260708170000_allow_blinkit_bigbasket_enrichment_sources.sql",
          "description": "Allows Blinkit and BigBasket enrichment sources",
          "role": "Enrichment Manager",
          "lines": 8,
          "size": 556,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Fix Coupon Query In Create Order Secure",
          "path": "supabase/migrations/20260712180000_fix_coupon_query_in_create_order_secure.sql",
          "description": "Fixes coupon query in create order secure function",
          "role": "Order Manager",
          "lines": 472,
          "size": 16938,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Margin Rule Sync Triggers",
          "path": "supabase/migrations/20260705170000_margin_rule_sync_triggers.sql",
          "description": "Creates margin rule sync triggers",
          "role": "Margin Manager",
          "lines": 118,
          "size": 6061,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Update Verify Admin Login For City Managers",
          "path": "supabase/migrations/20260719163000_update_verify_admin_login_for_city_managers.sql",
          "description": "Updates verify admin login for city managers",
          "role": "Login Manager",
          "lines": 45,
          "size": 1427,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Payment Verification Rules",
          "path": "supabase/migrations/20260608170000_payment_verification_rules.sql",
          "description": "Creates payment verification rules",
          "role": "Payment Verifier",
          "lines": 59,
          "size": 2089,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Mart Specific Margin Pricing",
          "path": "supabase/migrations/20260705150000_mart_specific_margin_pricing.sql",
          "description": "Creates mart-specific margin pricing table",
          "role": "Pricing Manager",
          "lines": 641,
          "size": 23269,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Onesignal Notification Webhook",
          "path": "supabase/migrations/20260609223000_onesignal_notification_webhook.sql",
          "description": "Creates OneSignal notification webhook",
          "role": "Notification Sender",
          "lines": 62,
          "size": 1835,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Fix Serviceable Streets Security Invoker",
          "path": "supabase/migrations/20260710150000_fix_serviceable_streets_security_invoker.sql",
          "description": "Fixes serviceable streets security invoker",
          "role": "Security Fixer",
          "lines": 46,
          "size": 1340,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Support Tickets Customer Policies",
          "path": "supabase/migrations/20260710224500_support_tickets_customer_policies.sql",
          "description": "Creates customer policies for support tickets",
          "role": "Ticket Manager",
          "lines": 19,
          "size": 804,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Secure Admin Panel Password",
          "path": "supabase/migrations/20260712190000_secure_admin_panel_password.sql",
          "description": "Secures admin panel password",
          "role": "Password Manager",
          "lines": 159,
          "size": 4625,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Add Product Id To Capture Sessions",
          "path": "supabase/migrations/20260705185500_add_product_id_to_capture_sessions.sql",
          "description": "Adds product ID to capture sessions table",
          "role": "Session Manager",
          "lines": 5,
          "size": 358,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Referral System",
          "path": "supabase/migrations/20260621120000_referral_system.sql",
          "description": "Creates referral system",
          "role": "Referral Manager",
          "lines": 541,
          "size": 19530,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Create Support Ticket Messages",
          "path": "supabase/migrations/20260616223000_create_support_ticket_messages.sql",
          "description": "Creates support ticket messages table",
          "role": "Message Manager",
          "lines": 78,
          "size": 2880,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Capture Sessions Rls Anonymous",
          "path": "supabase/migrations/20260705182000_capture_sessions_rls_anonymous.sql",
          "description": "Adjusts capture sessions RLS for anonymous users",
          "role": "RLS Manager",
          "lines": 40,
          "size": 1887,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Add Product Barcode",
          "path": "supabase/migrations/20260620013000_add_product_barcode.sql",
          "description": "Adds product barcode column",
          "role": "Product Manager",
          "lines": 107,
          "size": 4038,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Catalog Enrichment",
          "path": "supabase/migrations/20260705120000_catalog_enrichment.sql",
          "description": "Creates catalog enrichment system",
          "role": "Enrichment Manager",
          "lines": 52,
          "size": 2604,
          "exports": [],
          "type": "file_sql"
        },
        {
          "name": "Mart Pending Products",
          "path": "supabase/migrations/20260707200000_mart_pending_products.sql",
          "description": "Creates mart pending products table",
          "role": "DB Migration",
          "lines": 70,
          "size": 2620,
          "exports": [],
          "type": "file_sql"
        }
      ]
    }
  ]
};

const OZO_MINDMAP_LINKS = [
  {
    "source": "src/stores/wishlistStore.js",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/stores/wishlistStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/blogStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/captainStore.js",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/stores/captainStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/captainStore.js",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/stores/martStore.js",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/stores/martStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/orderStore.js",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/stores/orderStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/orderStore.js",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/stores/cartStore.js",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/stores/cartStore.js",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/stores/cartStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/notificationStore.js",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/stores/notificationStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/authStore.js",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/stores/authStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/authStore.js",
    "target": "src/utils/onesignal.js"
  },
  {
    "source": "src/stores/locationStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/locationStore.js",
    "target": "src/lib/geocoding.js"
  },
  {
    "source": "src/stores/adminIndicatorStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/productStore.js",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/stores/productStore.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/stores/productStore.js",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/hooks/useProductPagination.js",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/hooks/useProductPagination.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/hooks/useProductPagination.js",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/hooks/useTranslation.js",
    "target": "src/stores/languageStore.js"
  },
  {
    "source": "src/layouts/MainLayout.jsx",
    "target": "src/stores/productStore.js"
  },
  {
    "source": "src/layouts/MainLayout.jsx",
    "target": "src/components/BottomNav.jsx"
  },
  {
    "source": "src/layouts/MainLayout.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/layouts/MainLayout.jsx",
    "target": "src/components/Footer.jsx"
  },
  {
    "source": "src/layouts/MainLayout.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/layouts/MainLayout.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/layouts/MainLayout.jsx",
    "target": "src/stores/wishlistStore.js"
  },
  {
    "source": "src/layouts/MainLayout.jsx",
    "target": "src/components/Header.jsx"
  },
  {
    "source": "src/layouts/AdminLayout.jsx",
    "target": "src/components/OzoLogo.jsx"
  },
  {
    "source": "src/lib/rpc.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/lib/geocoding.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/lib/firebase.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/utils/onesignal.js",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/utils/onesignal.js",
    "target": "src/lib/firebase.js"
  },
  {
    "source": "src/components/OzoMapPicker.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/components/OzoMapPicker.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/components/OzoMapPicker.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/components/OzoMapPicker.jsx",
    "target": "src/lib/geocoding.js"
  },
  {
    "source": "src/components/TopCategories.jsx",
    "target": "src/stores/productStore.js"
  },
  {
    "source": "src/components/TopCategories.jsx",
    "target": "src/components/CategoryChip.jsx"
  },
  {
    "source": "src/components/CashfreeShield.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/components/CashfreeShield.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/components/ProductCard.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/components/ProductCard.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/components/ProductCard.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/components/ProductCard.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/components/ProductCard.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/components/ProductCard.jsx",
    "target": "src/stores/wishlistStore.js"
  },
  {
    "source": "src/components/ProductCard.jsx",
    "target": "src/utils/onesignal.js"
  },
  {
    "source": "src/components/AddressForm.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/components/AddressForm.jsx",
    "target": "src/lib/geocoding.js"
  },
  {
    "source": "src/components/RazorpayShield.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/components/RazorpayShield.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/components/LocationPicker.jsx",
    "target": "src/components/AddressForm.jsx"
  },
  {
    "source": "src/components/LocationPicker.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/components/LocationPicker.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/components/LocationPicker.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/components/LocationPicker.jsx",
    "target": "src/lib/addressHelpers.js"
  },
  {
    "source": "src/components/LocationPicker.jsx",
    "target": "src/components/OzoMapPicker.jsx"
  },
  {
    "source": "src/components/OptimizedImage.jsx",
    "target": "src/stores/themeStore.js"
  },
  {
    "source": "src/components/OptimizedImage.jsx",
    "target": "src/utils/imageOptimizer.js"
  },
  {
    "source": "src/components/SuggestedProducts.jsx",
    "target": "src/utils/productUtils.js"
  },
  {
    "source": "src/components/SuggestedProducts.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/components/SuggestedProducts.jsx",
    "target": "src/components/ProductCard.jsx"
  },
  {
    "source": "src/components/SuggestedProducts.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/components/ServiceabilityModal.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/components/LanguageModal.jsx",
    "target": "src/stores/languageStore.js"
  },
  {
    "source": "src/components/BrowsingBanner.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/components/AdminLockScreen.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/components/AdminLockScreen.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/components/CategoryChip.jsx",
    "target": "src/utils/imageOptimizer.js"
  },
  {
    "source": "src/components/ImageUpload.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/components/Header.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/components/Footer.jsx",
    "target": "src/components/OzoLogo.jsx"
  },
  {
    "source": "src/components/Footer.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/components/NotificationPromptModal.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/components/NotificationPromptModal.jsx",
    "target": "src/utils/onesignal.js"
  },
  {
    "source": "src/components/LocationPromptModal.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/components/LocationPromptModal.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/components/BottomNav.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/components/BottomNav.jsx",
    "target": "src/stores/orderStore.js"
  },
  {
    "source": "src/components/BottomNav.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/components/admin/ProductCityManager.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/components/mart/BarcodeEnrichmentModal.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Auth.jsx",
    "target": "src/components/OzoLogo.jsx"
  },
  {
    "source": "src/pages/Auth.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/Careers.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/RefundPolicy.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/Orders.jsx",
    "target": "src/stores/orderStore.js"
  },
  {
    "source": "src/pages/Orders.jsx",
    "target": "src/hooks/useTranslation.js"
  },
  {
    "source": "src/pages/Orders.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/Orders.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/Orders.jsx",
    "target": "src/hooks/useOzoQuery.js"
  },
  {
    "source": "src/pages/Orders.jsx",
    "target": "src/components/Breadcrumb.jsx"
  },
  {
    "source": "src/pages/Orders.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/Categories.jsx",
    "target": "src/stores/productStore.js"
  },
  {
    "source": "src/pages/Categories.jsx",
    "target": "src/hooks/useTranslation.js"
  },
  {
    "source": "src/pages/Categories.jsx",
    "target": "src/components/CategoryChip.jsx"
  },
  {
    "source": "src/pages/Categories.jsx",
    "target": "src/hooks/useOzoQuery.js"
  },
  {
    "source": "src/pages/Categories.jsx",
    "target": "src/components/Breadcrumb.jsx"
  },
  {
    "source": "src/pages/Categories.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/TermsOfService.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/Offers.jsx",
    "target": "src/stores/productStore.js"
  },
  {
    "source": "src/pages/Offers.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Offers.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/Offers.jsx",
    "target": "src/hooks/useOzoQuery.js"
  },
  {
    "source": "src/pages/Offers.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/Offers.jsx",
    "target": "src/components/ProductCard.jsx"
  },
  {
    "source": "src/pages/Addresses.jsx",
    "target": "src/components/AddressForm.jsx"
  },
  {
    "source": "src/pages/Addresses.jsx",
    "target": "src/hooks/useTranslation.js"
  },
  {
    "source": "src/pages/Addresses.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/Addresses.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/Addresses.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/pages/Addresses.jsx",
    "target": "src/lib/addressHelpers.js"
  },
  {
    "source": "src/pages/Addresses.jsx",
    "target": "src/components/OzoMapPicker.jsx"
  },
  {
    "source": "src/pages/PhoneCapture.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Press.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/SelectLocation.jsx",
    "target": "src/components/AddressForm.jsx"
  },
  {
    "source": "src/pages/SelectLocation.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/SelectLocation.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/SelectLocation.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/pages/SelectLocation.jsx",
    "target": "src/lib/addressHelpers.js"
  },
  {
    "source": "src/pages/SelectLocation.jsx",
    "target": "src/components/OzoMapPicker.jsx"
  },
  {
    "source": "src/pages/Settings.jsx",
    "target": "src/stores/themeStore.js"
  },
  {
    "source": "src/pages/Settings.jsx",
    "target": "src/components/LanguageModal.jsx"
  },
  {
    "source": "src/pages/Settings.jsx",
    "target": "src/stores/languageStore.js"
  },
  {
    "source": "src/pages/PrivacyPolicy.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/OrderDetail.jsx",
    "target": "src/stores/orderStore.js"
  },
  {
    "source": "src/pages/OrderDetail.jsx",
    "target": "src/stores/languageStore.js"
  },
  {
    "source": "src/pages/OrderDetail.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/OrderDetail.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/OrderDetail.jsx",
    "target": "src/hooks/useOzoQuery.js"
  },
  {
    "source": "src/pages/OrderDetail.jsx",
    "target": "src/components/Breadcrumb.jsx"
  },
  {
    "source": "src/pages/OrderDetail.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/Contact.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Contact.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/Blog.jsx",
    "target": "src/stores/blogStore.js"
  },
  {
    "source": "src/pages/Blog.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/Blog.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/SearchedPage.jsx",
    "target": "src/stores/productStore.js"
  },
  {
    "source": "src/pages/SearchedPage.jsx",
    "target": "src/components/ProductSkeleton.jsx"
  },
  {
    "source": "src/pages/SearchedPage.jsx",
    "target": "src/components/CategoryChip.jsx"
  },
  {
    "source": "src/pages/SearchedPage.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/SearchedPage.jsx",
    "target": "src/hooks/useOzoQuery.js"
  },
  {
    "source": "src/pages/SearchedPage.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/pages/SearchedPage.jsx",
    "target": "src/hooks/useProductPagination.js"
  },
  {
    "source": "src/pages/SearchedPage.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/SearchedPage.jsx",
    "target": "src/components/ProductCard.jsx"
  },
  {
    "source": "src/pages/Cart.jsx",
    "target": "src/stores/productStore.js"
  },
  {
    "source": "src/pages/Cart.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Cart.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/Cart.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/Cart.jsx",
    "target": "src/components/SuggestedProducts.jsx"
  },
  {
    "source": "src/pages/Cart.jsx",
    "target": "src/stores/locationStore.js"
  },
  {
    "source": "src/pages/Cart.jsx",
    "target": "src/stores/wishlistStore.js"
  },
  {
    "source": "src/pages/Search.jsx",
    "target": "src/stores/productStore.js"
  },
  {
    "source": "src/pages/Search.jsx",
    "target": "src/components/CategoryChip.jsx"
  },
  {
    "source": "src/pages/Search.jsx",
    "target": "src/hooks/useOzoQuery.js"
  },
  {
    "source": "src/pages/Search.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/Search.jsx",
    "target": "src/components/ProductCard.jsx"
  },
  {
    "source": "src/pages/Referral.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/Referral.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Profile.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/Profile.jsx",
    "target": "src/hooks/useTranslation.js"
  },
  {
    "source": "src/pages/Profile.jsx",
    "target": "src/components/UserAvatar.jsx"
  },
  {
    "source": "src/pages/About.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/About.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/ShippingPolicy.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/ShippingPolicy.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/CompleteProfile.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/CompleteProfile.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Notifications.jsx",
    "target": "src/hooks/useOzoQuery.js"
  },
  {
    "source": "src/pages/Notifications.jsx",
    "target": "src/stores/notificationStore.js"
  },
  {
    "source": "src/pages/Notifications.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/Notifications.jsx",
    "target": "src/stores/languageStore.js"
  },
  {
    "source": "src/pages/BlogDetail.jsx",
    "target": "src/stores/blogStore.js"
  },
  {
    "source": "src/pages/BlogDetail.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/BlogDetail.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/Products.jsx",
    "target": "src/stores/productStore.js"
  },
  {
    "source": "src/pages/Products.jsx",
    "target": "src/components/SortDropdown.jsx"
  },
  {
    "source": "src/pages/Products.jsx",
    "target": "src/components/ProductSkeleton.jsx"
  },
  {
    "source": "src/pages/Products.jsx",
    "target": "src/components/CategoryChip.jsx"
  },
  {
    "source": "src/pages/Products.jsx",
    "target": "src/components/TopCategories.jsx"
  },
  {
    "source": "src/pages/Products.jsx",
    "target": "src/hooks/useProductPagination.js"
  },
  {
    "source": "src/pages/Products.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/Products.jsx",
    "target": "src/components/ProductCard.jsx"
  },
  {
    "source": "src/pages/Products.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/stores/productStore.js"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/components/SortDropdown.jsx"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/hooks/useTranslation.js"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/components/ProductSkeleton.jsx"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/components/CategoryChip.jsx"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/hooks/useProductPagination.js"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/components/Breadcrumb.jsx"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/components/ProductCard.jsx"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/utils/onesignal.js"
  },
  {
    "source": "src/pages/CategoryProducts.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/ComboDetail.jsx",
    "target": "src/hooks/useTranslation.js"
  },
  {
    "source": "src/pages/ComboDetail.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/ComboDetail.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/ComboDetail.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/ComboDetail.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/ComboDetail.jsx",
    "target": "src/components/Breadcrumb.jsx"
  },
  {
    "source": "src/pages/ComboDetail.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/AuthCallback.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/AuthCallback.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Security.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Security.jsx",
    "target": "src/stores/languageStore.js"
  },
  {
    "source": "src/pages/Wishlist.jsx",
    "target": "src/hooks/useTranslation.js"
  },
  {
    "source": "src/pages/Wishlist.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/Wishlist.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/Wishlist.jsx",
    "target": "src/hooks/useOzoQuery.js"
  },
  {
    "source": "src/pages/Wishlist.jsx",
    "target": "src/components/OzoLoadingGuard.jsx"
  },
  {
    "source": "src/pages/Wishlist.jsx",
    "target": "src/stores/wishlistStore.js"
  },
  {
    "source": "src/pages/CookiePolicy.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/Payments.jsx",
    "target": "src/stores/languageStore.js"
  },
  {
    "source": "src/pages/ProductDetail.jsx",
    "target": "src/components/Breadcrumb.jsx"
  },
  {
    "source": "src/pages/ProductDetail.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/Help.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/Help.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/Help.jsx",
    "target": "src/components/SEO.jsx"
  },
  {
    "source": "src/pages/Help.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/captain/Dashboard.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/captain/Dashboard.jsx",
    "target": "src/pages/captain/CaptainRadar.jsx"
  },
  {
    "source": "src/pages/captain/Dashboard.jsx",
    "target": "src/pages/captain/CaptainProfile.jsx"
  },
  {
    "source": "src/pages/captain/Dashboard.jsx",
    "target": "src/stores/captainStore.js"
  },
  {
    "source": "src/pages/captain/Dashboard.jsx",
    "target": "src/stores/themeStore.js"
  },
  {
    "source": "src/pages/captain/Dashboard.jsx",
    "target": "src/pages/captain/CaptainOnboarding.jsx"
  },
  {
    "source": "src/pages/captain/Dashboard.jsx",
    "target": "src/utils/onesignal.js"
  },
  {
    "source": "src/pages/captain/CaptainRadar.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/captain/CaptainRadar.jsx",
    "target": "src/stores/cartStore.js"
  },
  {
    "source": "src/pages/captain/CaptainRadar.jsx",
    "target": "src/stores/captainStore.js"
  },
  {
    "source": "src/pages/captain/CaptainRadar.jsx",
    "target": "src/components/ImageUpload.jsx"
  },
  {
    "source": "src/pages/captain/CaptainRadar.jsx",
    "target": "src/lib/addressHelpers.js"
  },
  {
    "source": "src/pages/captain/CaptainProfile.jsx",
    "target": "src/stores/captainStore.js"
  },
  {
    "source": "src/pages/captain/CaptainProfile.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/captain/CaptainOnboarding.jsx",
    "target": "src/stores/captainStore.js"
  },
  {
    "source": "src/pages/captain/CaptainOnboarding.jsx",
    "target": "src/components/ImageUpload.jsx"
  },
  {
    "source": "src/pages/admin/SqlConsole.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/Dashboard.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/admin/Dashboard.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/Cities.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/admin/Cities.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/Reviews.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/admin/Reviews.jsx",
    "target": "src/components/UserAvatar.jsx"
  },
  {
    "source": "src/pages/admin/Reviews.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/Categories.jsx",
    "target": "src/components/ImageUpload.jsx"
  },
  {
    "source": "src/pages/admin/Categories.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/Categories.jsx",
    "target": "src/components/ConfirmModal.jsx"
  },
  {
    "source": "src/pages/admin/Messages.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/Messages.jsx",
    "target": "src/stores/adminIndicatorStore.js"
  },
  {
    "source": "src/pages/admin/Offers.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/Requests.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/MartPayoutsAdmin.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/Blog.jsx",
    "target": "src/stores/blogStore.js"
  },
  {
    "source": "src/pages/admin/Blog.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/admin/PhoneCaptureSandbox.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/Festivals.jsx",
    "target": "src/components/ImageUpload.jsx"
  },
  {
    "source": "src/pages/admin/Festivals.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/ProfitOptimizer.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/RiderAdmin.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/admin/SeoDashboard.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/mart/Dashboard.jsx",
    "target": "src/stores/martStore.js"
  },
  {
    "source": "src/pages/mart/Dashboard.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/mart/Dashboard.jsx",
    "target": "src/pages/mart/LiveOrdersView.jsx"
  },
  {
    "source": "src/pages/mart/Dashboard.jsx",
    "target": "src/stores/authStore.js"
  },
  {
    "source": "src/pages/mart/Dashboard.jsx",
    "target": "src/pages/mart/EarningsView.jsx"
  },
  {
    "source": "src/pages/mart/Dashboard.jsx",
    "target": "src/pages/mart/MartOnboarding.jsx"
  },
  {
    "source": "src/pages/mart/Dashboard.jsx",
    "target": "src/components/mart/BarcodeEnrichmentModal.jsx"
  },
  {
    "source": "src/pages/mart/Dashboard.jsx",
    "target": "src/pages/mart/StoreProfileView.jsx"
  },
  {
    "source": "src/pages/mart/Dashboard.jsx",
    "target": "src/pages/mart/InventoryView.jsx"
  },
  {
    "source": "src/pages/mart/InventoryView.jsx",
    "target": "src/stores/martStore.js"
  },
  {
    "source": "src/pages/mart/InventoryView.jsx",
    "target": "src/pages/mart/BulkImportWizard.jsx"
  },
  {
    "source": "src/pages/mart/InventoryView.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/mart/InventoryView.jsx",
    "target": "src/components/mart/BarcodeEnrichmentModal.jsx"
  },
  {
    "source": "src/pages/mart/BulkImportWizard.jsx",
    "target": "src/stores/martStore.js"
  },
  {
    "source": "src/pages/mart/BulkImportWizard.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/mart/BulkImportWizard.jsx",
    "target": "src/lib/rpc.js"
  },
  {
    "source": "src/pages/mart/BulkImportWizard.jsx",
    "target": "src/components/mart/BarcodeEnrichmentModal.jsx"
  },
  {
    "source": "src/pages/mart/StoreProfileView.jsx",
    "target": "src/stores/martStore.js"
  },
  {
    "source": "src/pages/mart/StoreProfileView.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/mart/LiveOrdersView.jsx",
    "target": "src/stores/martStore.js"
  },
  {
    "source": "src/pages/mart/LiveOrdersView.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/mart/EarningsView.jsx",
    "target": "src/stores/martStore.js"
  },
  {
    "source": "src/pages/mart/EarningsView.jsx",
    "target": "src/components/OptimizedImage.jsx"
  },
  {
    "source": "src/pages/mart/EarningsView.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/pages/mart/MartOnboarding.jsx",
    "target": "src/stores/martStore.js"
  },
  {
    "source": "src/App.jsx",
    "target": "src/lib/supabase.js"
  },
  {
    "source": "src/App.jsx",
    "target": "src/layouts/MainLayout.jsx"
  },
  {
    "source": "src/App.jsx",
    "target": "src/components/OzoSplashScreen.jsx"
  },
  {
    "source": "src/App.jsx",
    "target": "src/layouts/AdminLayout.jsx"
  },
  {
    "source": "src/main.jsx",
    "target": "src/lib/firebase.js"
  },
  {
    "source": "src/main.jsx",
    "target": "src/App.jsx"
  }
];

const OZO_FLAT_FILES = [
  {
    "path": "src/stores/wishlistStore.js",
    "name": "wishlistStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 307,
    "size": 9440,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [
      "useWishlistStore"
    ],
    "description": "Manages user wishlist data",
    "role": "Wishlist Manager"
  },
  {
    "path": "src/stores/languageStore.js",
    "name": "languageStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 393,
    "size": 25416,
    "imports": [],
    "exports": [
      "LANGUAGES",
      "TRANSLATIONS"
    ],
    "description": "Handles language settings and translations",
    "role": "Language Controller"
  },
  {
    "path": "src/stores/blogStore.js",
    "name": "blogStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 346,
    "size": 13046,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Manages blog-related data and functionality",
    "role": "Blog Manager"
  },
  {
    "path": "src/stores/captainStore.js",
    "name": "captainStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 796,
    "size": 26097,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js",
      "src/stores/cartStore.js"
    ],
    "exports": [],
    "description": "Manages captain-related data and functionality",
    "role": "Captain Controller"
  },
  {
    "path": "src/stores/martStore.js",
    "name": "martStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 1170,
    "size": 38727,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [
      "useMartStore"
    ],
    "description": "Manages mart-related data and functionality",
    "role": "Mart Manager"
  },
  {
    "path": "src/stores/themeStore.js",
    "name": "themeStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 38,
    "size": 1145,
    "imports": [],
    "exports": [
      "useThemeStore"
    ],
    "description": "Handles theme settings and preferences",
    "role": "Theme Controller"
  },
  {
    "path": "src/stores/orderStore.js",
    "name": "orderStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 805,
    "size": 25202,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js",
      "src/stores/cartStore.js"
    ],
    "exports": [
      "useOrderStore"
    ],
    "description": "Manages order-related data and functionality",
    "role": "Order Manager"
  },
  {
    "path": "src/stores/cartStore.js",
    "name": "cartStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 1123,
    "size": 44461,
    "imports": [
      "src/stores/locationStore.js",
      "src/stores/authStore.js",
      "src/lib/supabase.js",
      "src/config/deliveryDefaults.js"
    ],
    "exports": [],
    "description": "Manages cart-related data and functionality",
    "role": "Cart Controller"
  },
  {
    "path": "src/stores/notificationStore.js",
    "name": "notificationStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 236,
    "size": 6597,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [
      "useNotificationStore"
    ],
    "description": "Manages notification-related data and functionality",
    "role": "Notification Manager"
  },
  {
    "path": "src/stores/authStore.js",
    "name": "authStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 856,
    "size": 33968,
    "imports": [
      "src/stores/locationStore.js",
      "src/lib/supabase.js",
      "src/utils/onesignal.js"
    ],
    "exports": [],
    "description": "Handles user authentication and authorization",
    "role": "Auth Manager"
  },
  {
    "path": "src/stores/locationStore.js",
    "name": "locationStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 1048,
    "size": 41336,
    "imports": [
      "src/config/deliveryDefaults.js",
      "src/lib/supabase.js",
      "src/lib/geocoding.js"
    ],
    "exports": [
      "useLocationStore"
    ],
    "description": "Manages location-related data and functionality",
    "role": "Location Controller"
  },
  {
    "path": "src/stores/adminIndicatorStore.js",
    "name": "adminIndicatorStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 192,
    "size": 5424,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [
      "useAdminIndicatorStore"
    ],
    "description": "Manages admin indicator-related data and functionality",
    "role": "Admin Indicator"
  },
  {
    "path": "src/stores/productStore.js",
    "name": "productStore.js",
    "type": "code",
    "folder": "src/stores",
    "lines": 1035,
    "size": 37208,
    "imports": [
      "src/stores/locationStore.js",
      "src/lib/supabase.js",
      "src/stores/cartStore.js"
    ],
    "exports": [],
    "description": "Manages product-related data and functionality",
    "role": "Product Manager"
  },
  {
    "path": "src/hooks/useProductPagination.js",
    "name": "useProductPagination.js",
    "type": "code",
    "folder": "src/hooks",
    "lines": 313,
    "size": 11711,
    "imports": [
      "src/stores/locationStore.js",
      "src/lib/supabase.js",
      "src/stores/cartStore.js"
    ],
    "exports": [
      "useProductPagination",
      "PAGINATION_LIMIT"
    ],
    "description": "Handles product pagination functionality",
    "role": "Pagination Helper"
  },
  {
    "path": "src/hooks/useTranslation.js",
    "name": "useTranslation.js",
    "type": "code",
    "folder": "src/hooks",
    "lines": 7,
    "size": 233,
    "imports": [
      "src/stores/languageStore.js"
    ],
    "exports": [
      "useTranslation"
    ],
    "description": "Provides translation functionality",
    "role": "Translation Helper"
  },
  {
    "path": "src/hooks/useOzoQuery.js",
    "name": "useOzoQuery.js",
    "type": "code",
    "folder": "src/hooks",
    "lines": 117,
    "size": 3978,
    "imports": [],
    "exports": [
      "useOzoQuery"
    ],
    "description": "Handles data fetching for Ozo pages",
    "role": "Data Fetcher"
  },
  {
    "path": "src/layouts/MainLayout.jsx",
    "name": "MainLayout.jsx",
    "type": "code",
    "folder": "src/layouts",
    "lines": 111,
    "size": 3829,
    "imports": [
      "src/stores/productStore.js",
      "src/components/BottomNav.jsx",
      "src/stores/authStore.js",
      "src/components/Footer.jsx",
      "src/stores/cartStore.js",
      "src/stores/locationStore.js",
      "src/stores/wishlistStore.js",
      "src/components/Header.jsx"
    ],
    "exports": [],
    "description": "Renders the main application layout",
    "role": "Main Layout"
  },
  {
    "path": "src/layouts/AdminLayout.jsx",
    "name": "AdminLayout.jsx",
    "type": "code",
    "folder": "src/layouts",
    "lines": 553,
    "size": 20469,
    "imports": [
      "src/components/OzoLogo.jsx"
    ],
    "exports": [],
    "description": "Renders the admin application layout",
    "role": "Admin Layout"
  },
  {
    "path": "src/lib/rpc.js",
    "name": "rpc.js",
    "type": "code",
    "folder": "src/lib",
    "lines": 95,
    "size": 3367,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles RPC-related functionality",
    "role": "RPC Handler"
  },
  {
    "path": "src/lib/geocoding.js",
    "name": "geocoding.js",
    "type": "code",
    "folder": "src/lib",
    "lines": 428,
    "size": 15195,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [
      "getServiceableStreets"
    ],
    "description": "Provides geocoding functionality",
    "role": "Geocoding Helper"
  },
  {
    "path": "src/lib/addressHelpers.js",
    "name": "addressHelpers.js",
    "type": "code",
    "folder": "src/lib",
    "lines": 41,
    "size": 1483,
    "imports": [],
    "exports": [
      "formatLandmark",
      "parseLandmark"
    ],
    "description": "Provides address formatting and parsing functionality",
    "role": "Address Helper"
  },
  {
    "path": "src/lib/supabase.js",
    "name": "supabase.js",
    "type": "code",
    "folder": "src/lib",
    "lines": 1384,
    "size": 50221,
    "imports": [],
    "exports": [],
    "description": "Handles Supabase database interactions",
    "role": "Supabase Client"
  },
  {
    "path": "src/lib/firebase.js",
    "name": "firebase.js",
    "type": "code",
    "folder": "src/lib",
    "lines": 178,
    "size": 6622,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles Firebase interactions",
    "role": "Firebase Client"
  },
  {
    "path": "src/utils/productUtils.js",
    "name": "productUtils.js",
    "type": "code",
    "folder": "src/utils",
    "lines": 19,
    "size": 629,
    "imports": [],
    "exports": [
      "isProductImageMissing"
    ],
    "description": "Provides product-related utility functions",
    "role": "Product Utils"
  },
  {
    "path": "src/utils/onesignal.js",
    "name": "onesignal.js",
    "type": "code",
    "folder": "src/utils",
    "lines": 322,
    "size": 11232,
    "imports": [
      "src/lib/supabase.js",
      "src/lib/firebase.js"
    ],
    "exports": [],
    "description": "Handles OneSignal push notification functionality",
    "role": "OneSignal Helper"
  },
  {
    "path": "src/utils/productGrouper.js",
    "name": "productGrouper.js",
    "type": "code",
    "folder": "src/utils",
    "lines": 364,
    "size": 11355,
    "imports": [],
    "exports": [
      "groupProducts"
    ],
    "description": "Groups similar products together",
    "role": "Product Grouper"
  },
  {
    "path": "src/utils/imageOptimizer.js",
    "name": "imageOptimizer.js",
    "type": "code",
    "folder": "src/utils",
    "lines": 48,
    "size": 1811,
    "imports": [],
    "exports": [
      "getOptimizedImageUrl"
    ],
    "description": "Optimizes and compresses images",
    "role": "Image Optimizer"
  },
  {
    "path": "src/components/ReasonSelector.jsx",
    "name": "ReasonSelector.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 115,
    "size": 4203,
    "imports": [],
    "exports": [],
    "description": "Renders a reason selection component",
    "role": "Reason Selector"
  },
  {
    "path": "src/components/ProductSkeleton.jsx",
    "name": "ProductSkeleton.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 69,
    "size": 2633,
    "imports": [],
    "exports": [
      "function"
    ],
    "description": "Renders a product skeleton component",
    "role": "Product Skeleton"
  },
  {
    "path": "src/components/OzoMapPicker.jsx",
    "name": "OzoMapPicker.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 1421,
    "size": 55217,
    "imports": [
      "src/config/deliveryDefaults.js",
      "src/lib/supabase.js",
      "src/stores/cartStore.js",
      "src/stores/locationStore.js",
      "src/lib/geocoding.js"
    ],
    "exports": [],
    "description": "Renders a map picker component",
    "role": "Map Picker"
  },
  {
    "path": "src/components/TopCategories.jsx",
    "name": "TopCategories.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 240,
    "size": 11990,
    "imports": [
      "src/stores/productStore.js",
      "src/components/CategoryChip.jsx"
    ],
    "exports": [],
    "description": "Renders top categories component",
    "role": "Top Categories"
  },
  {
    "path": "src/components/OzoLogo.jsx",
    "name": "OzoLogo.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 92,
    "size": 2945,
    "imports": [],
    "exports": [
      "function"
    ],
    "description": "Renders the Ozo logo component",
    "role": "Ozo Logo"
  },
  {
    "path": "src/components/CashfreeShield.jsx",
    "name": "CashfreeShield.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 520,
    "size": 22489,
    "imports": [
      "src/lib/supabase.js",
      "src/stores/cartStore.js"
    ],
    "exports": [],
    "description": "Renders a Cashfree shield component",
    "role": "Cashfree Shield"
  },
  {
    "path": "src/components/SortDropdown.jsx",
    "name": "SortDropdown.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 185,
    "size": 6596,
    "imports": [],
    "exports": [
      "sortOptions"
    ],
    "description": "Renders a sort dropdown component",
    "role": "Sort Dropdown"
  },
  {
    "path": "src/components/ProductCard.jsx",
    "name": "ProductCard.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 697,
    "size": 30608,
    "imports": [
      "src/lib/supabase.js",
      "src/components/OptimizedImage.jsx",
      "src/stores/authStore.js",
      "src/stores/cartStore.js",
      "src/stores/locationStore.js",
      "src/stores/wishlistStore.js",
      "src/utils/onesignal.js"
    ],
    "exports": [],
    "description": "Renders a product card component",
    "role": "Product Card"
  },
  {
    "path": "src/components/SEO.jsx",
    "name": "SEO.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 114,
    "size": 3930,
    "imports": [],
    "exports": [],
    "description": "Handles SEO metadata for pages",
    "role": "SEO Handler"
  },
  {
    "path": "src/components/AddressForm.jsx",
    "name": "AddressForm.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 1317,
    "size": 56152,
    "imports": [
      "src/stores/locationStore.js",
      "src/lib/geocoding.js"
    ],
    "exports": [],
    "description": "Manages address input and validation",
    "role": "Address Validator"
  },
  {
    "path": "src/components/Breadcrumb.jsx",
    "name": "Breadcrumb.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 175,
    "size": 6244,
    "imports": [],
    "exports": [],
    "description": "Displays navigation breadcrumbs",
    "role": "Breadcrumb Display"
  },
  {
    "path": "src/components/RazorpayShield.jsx",
    "name": "RazorpayShield.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 630,
    "size": 25168,
    "imports": [
      "src/lib/supabase.js",
      "src/stores/cartStore.js"
    ],
    "exports": [],
    "description": "Integrates Razorpay payment shield",
    "role": "Payment Shield"
  },
  {
    "path": "src/components/LocationPicker.jsx",
    "name": "LocationPicker.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 1155,
    "size": 56650,
    "imports": [
      "src/components/AddressForm.jsx",
      "src/stores/authStore.js",
      "src/stores/cartStore.js",
      "src/stores/locationStore.js",
      "src/lib/addressHelpers.js",
      "src/components/OzoMapPicker.jsx"
    ],
    "exports": [],
    "description": "Allows users to pick locations",
    "role": "Location Picker"
  },
  {
    "path": "src/components/OptimizedImage.jsx",
    "name": "OptimizedImage.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 168,
    "size": 5678,
    "imports": [
      "src/stores/themeStore.js",
      "src/utils/imageOptimizer.js"
    ],
    "exports": [
      "function"
    ],
    "description": "Optimizes image loading and display",
    "role": "Image Optimizer"
  },
  {
    "path": "src/components/ScrollToTop.jsx",
    "name": "ScrollToTop.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 17,
    "size": 299,
    "imports": [],
    "exports": [
      "ScrollToTop"
    ],
    "description": "Scrolls to top of page on navigation",
    "role": "Scroll Handler"
  },
  {
    "path": "src/components/SuggestedProducts.jsx",
    "name": "SuggestedProducts.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 419,
    "size": 15863,
    "imports": [
      "src/utils/productUtils.js",
      "src/lib/supabase.js",
      "src/components/ProductCard.jsx",
      "src/stores/cartStore.js"
    ],
    "exports": [],
    "description": "Displays suggested products to users",
    "role": "Product Suggester"
  },
  {
    "path": "src/components/ServiceabilityModal.jsx",
    "name": "ServiceabilityModal.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 223,
    "size": 10450,
    "imports": [
      "src/stores/locationStore.js"
    ],
    "exports": [
      "function"
    ],
    "description": "Handles serviceability checks and modal display",
    "role": "Serviceability Checker"
  },
  {
    "path": "src/components/LanguageModal.jsx",
    "name": "LanguageModal.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 116,
    "size": 4439,
    "imports": [
      "src/stores/languageStore.js"
    ],
    "exports": [],
    "description": "Manages language selection and display",
    "role": "Language Manager"
  },
  {
    "path": "src/components/BrowsingBanner.jsx",
    "name": "BrowsingBanner.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 61,
    "size": 2250,
    "imports": [
      "src/stores/locationStore.js"
    ],
    "exports": [
      "function"
    ],
    "description": "Displays browsing location banner",
    "role": "Browsing Banner"
  },
  {
    "path": "src/components/AdminLockScreen.jsx",
    "name": "AdminLockScreen.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 146,
    "size": 6474,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles admin lock screen functionality",
    "role": "Admin Lock"
  },
  {
    "path": "src/components/ConfirmModal.jsx",
    "name": "ConfirmModal.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 101,
    "size": 4036,
    "imports": [],
    "exports": [],
    "description": "Displays confirmation modals to users",
    "role": "Confirm Modal"
  },
  {
    "path": "src/components/CategoryChip.jsx",
    "name": "CategoryChip.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 565,
    "size": 27551,
    "imports": [
      "src/utils/imageOptimizer.js"
    ],
    "exports": [
      "isCategoryListingSoon"
    ],
    "description": "Displays category chips and information",
    "role": "Category Display"
  },
  {
    "path": "src/components/ImageUpload.jsx",
    "name": "ImageUpload.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 546,
    "size": 19458,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles image upload functionality",
    "role": "Image Uploader"
  },
  {
    "path": "src/components/OzoLoadingGuard.jsx",
    "name": "OzoLoadingGuard.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 49,
    "size": 2288,
    "imports": [],
    "exports": [
      "OzoLoadingGuard"
    ],
    "description": "Manages loading states and displays",
    "role": "Loading Guard"
  },
  {
    "path": "src/components/Header.jsx",
    "name": "Header.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 1144,
    "size": 55557,
    "imports": [
      "src/stores/authStore.js"
    ],
    "exports": [],
    "description": "Renders the application header",
    "role": "Header Controller"
  },
  {
    "path": "src/components/OzoSplashScreen.jsx",
    "name": "OzoSplashScreen.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 302,
    "size": 8897,
    "imports": [],
    "exports": [],
    "description": "Displays the application splash screen",
    "role": "Splash Screen"
  },
  {
    "path": "src/components/Footer.jsx",
    "name": "Footer.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 220,
    "size": 10400,
    "imports": [
      "src/components/OzoLogo.jsx",
      "src/stores/cartStore.js"
    ],
    "exports": [],
    "description": "Renders the application footer",
    "role": "Footer Controller"
  },
  {
    "path": "src/components/UserAvatar.jsx",
    "name": "UserAvatar.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 37,
    "size": 1397,
    "imports": [],
    "exports": [
      "getAvatarUrl"
    ],
    "description": "Handles user avatar display and generation",
    "role": "User Avatar"
  },
  {
    "path": "src/components/NotificationPromptModal.jsx",
    "name": "NotificationPromptModal.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 176,
    "size": 8851,
    "imports": [
      "src/stores/authStore.js",
      "src/utils/onesignal.js"
    ],
    "exports": [
      "function"
    ],
    "description": "Displays notification prompt modals",
    "role": "Notification Prompt"
  },
  {
    "path": "src/components/LocationPromptModal.jsx",
    "name": "LocationPromptModal.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 411,
    "size": 16598,
    "imports": [
      "src/stores/locationStore.js",
      "src/stores/authStore.js"
    ],
    "exports": [
      "isAddressIncomplete"
    ],
    "description": "Handles location prompt modals and functionality",
    "role": "Location Prompt"
  },
  {
    "path": "src/components/BottomNav.jsx",
    "name": "BottomNav.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 315,
    "size": 12820,
    "imports": [
      "src/stores/authStore.js",
      "src/stores/orderStore.js",
      "src/stores/cartStore.js"
    ],
    "exports": [],
    "description": "Renders the bottom navigation bar",
    "role": "Bottom Nav"
  },
  {
    "path": "src/components/admin/ProductCityManager.jsx",
    "name": "ProductCityManager.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 435,
    "size": 17721,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [
      "function"
    ],
    "description": "Manages product cities and related functionality",
    "role": "Product City Manager"
  },
  {
    "path": "src/components/admin/AdminMapPickerModal.jsx",
    "name": "AdminMapPickerModal.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 361,
    "size": 13891,
    "imports": [],
    "exports": [],
    "description": "Handles admin map picker modal display",
    "role": "Admin Map Picker"
  },
  {
    "path": "src/components/admin/BulkControlPanel.jsx",
    "name": "BulkControlPanel.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 1373,
    "size": 67733,
    "imports": [],
    "exports": [
      "function"
    ],
    "description": "Renders the bulk control panel for admins",
    "role": "Bulk Controller"
  },
  {
    "path": "src/components/mart/BarcodeEnrichmentModal.jsx",
    "name": "BarcodeEnrichmentModal.jsx",
    "type": "code",
    "folder": "src/components",
    "lines": 1473,
    "size": 66230,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles barcode enrichment modal display",
    "role": "Barcode Enrichment"
  },
  {
    "path": "src/pages/Auth.jsx",
    "name": "Auth.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 266,
    "size": 12906,
    "imports": [
      "src/components/OzoLogo.jsx",
      "src/stores/authStore.js"
    ],
    "exports": [],
    "description": "Handles user authentication and login",
    "role": "Auth Handler"
  },
  {
    "path": "src/pages/Careers.jsx",
    "name": "Careers.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 204,
    "size": 10712,
    "imports": [
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays careers and job listings page",
    "role": "Careers Page"
  },
  {
    "path": "src/pages/Developer.jsx",
    "name": "Developer.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 495,
    "size": 26634,
    "imports": [],
    "exports": [],
    "description": "Renders the developer page and information",
    "role": "Developer Page"
  },
  {
    "path": "src/pages/RefundPolicy.jsx",
    "name": "RefundPolicy.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 96,
    "size": 5936,
    "imports": [
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays refund policy and related information",
    "role": "Refund Policy"
  },
  {
    "path": "src/pages/MartProfile.jsx",
    "name": "MartProfile.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1646,
    "size": 78463,
    "imports": [],
    "exports": [],
    "description": "Handles mart profile display and management",
    "role": "Mart Profile"
  },
  {
    "path": "src/pages/Orders.jsx",
    "name": "Orders.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 334,
    "size": 16692,
    "imports": [
      "src/stores/orderStore.js",
      "src/hooks/useTranslation.js",
      "src/components/OptimizedImage.jsx",
      "src/stores/cartStore.js",
      "src/hooks/useOzoQuery.js",
      "src/components/Breadcrumb.jsx",
      "src/components/OzoLoadingGuard.jsx"
    ],
    "exports": [],
    "description": "Displays user orders and related information",
    "role": "Order Manager"
  },
  {
    "path": "src/pages/Categories.jsx",
    "name": "Categories.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 136,
    "size": 5463,
    "imports": [
      "src/stores/productStore.js",
      "src/hooks/useTranslation.js",
      "src/components/CategoryChip.jsx",
      "src/hooks/useOzoQuery.js",
      "src/components/Breadcrumb.jsx",
      "src/components/OzoLoadingGuard.jsx"
    ],
    "exports": [],
    "description": "Renders the categories page and display",
    "role": "Category Page"
  },
  {
    "path": "src/pages/TermsOfService.jsx",
    "name": "TermsOfService.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1091,
    "size": 72615,
    "imports": [
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays terms of service and related information",
    "role": "Terms Page"
  },
  {
    "path": "src/pages/Offers.jsx",
    "name": "Offers.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 241,
    "size": 11510,
    "imports": [
      "src/stores/productStore.js",
      "src/lib/supabase.js",
      "src/stores/cartStore.js",
      "src/hooks/useOzoQuery.js",
      "src/components/OzoLoadingGuard.jsx",
      "src/components/ProductCard.jsx"
    ],
    "exports": [],
    "description": "Displays product offers",
    "role": "Offer Page"
  },
  {
    "path": "src/pages/Addresses.jsx",
    "name": "Addresses.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 779,
    "size": 35117,
    "imports": [
      "src/components/AddressForm.jsx",
      "src/hooks/useTranslation.js",
      "src/stores/authStore.js",
      "src/stores/cartStore.js",
      "src/stores/locationStore.js",
      "src/lib/addressHelpers.js",
      "src/components/OzoMapPicker.jsx"
    ],
    "exports": [],
    "description": "Manages user addresses",
    "role": "Address Manager"
  },
  {
    "path": "src/pages/PhoneCapture.jsx",
    "name": "PhoneCapture.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 767,
    "size": 27825,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles phone number capture",
    "role": "Phone Capturer"
  },
  {
    "path": "src/pages/Home.jsx",
    "name": "Home.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 2650,
    "size": 128396,
    "imports": [],
    "exports": [],
    "description": "Renders the home page",
    "role": "Home Page"
  },
  {
    "path": "src/pages/Press.jsx",
    "name": "Press.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 115,
    "size": 5920,
    "imports": [
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays press information",
    "role": "Press Page"
  },
  {
    "path": "src/pages/SelectLocation.jsx",
    "name": "SelectLocation.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1157,
    "size": 53818,
    "imports": [
      "src/components/AddressForm.jsx",
      "src/stores/authStore.js",
      "src/stores/cartStore.js",
      "src/stores/locationStore.js",
      "src/lib/addressHelpers.js",
      "src/components/OzoMapPicker.jsx"
    ],
    "exports": [],
    "description": "Allows location selection",
    "role": "Location Selector"
  },
  {
    "path": "src/pages/Settings.jsx",
    "name": "Settings.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 170,
    "size": 7280,
    "imports": [
      "src/stores/themeStore.js",
      "src/components/LanguageModal.jsx",
      "src/stores/languageStore.js"
    ],
    "exports": [],
    "description": "Manages user settings",
    "role": "Settings Manager"
  },
  {
    "path": "src/pages/PrivacyPolicy.jsx",
    "name": "PrivacyPolicy.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 104,
    "size": 5648,
    "imports": [
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays privacy policy",
    "role": "Privacy Policy"
  },
  {
    "path": "src/pages/OrderDetail.jsx",
    "name": "OrderDetail.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 2026,
    "size": 96677,
    "imports": [
      "src/stores/orderStore.js",
      "src/stores/languageStore.js",
      "src/stores/authStore.js",
      "src/stores/cartStore.js",
      "src/hooks/useOzoQuery.js",
      "src/components/Breadcrumb.jsx",
      "src/components/OzoLoadingGuard.jsx"
    ],
    "exports": [],
    "description": "Displays order details",
    "role": "Order Viewer"
  },
  {
    "path": "src/pages/Contact.jsx",
    "name": "Contact.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 261,
    "size": 11235,
    "imports": [
      "src/lib/supabase.js",
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Handles contact information",
    "role": "Contact Page"
  },
  {
    "path": "src/pages/Blog.jsx",
    "name": "Blog.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 218,
    "size": 11174,
    "imports": [
      "src/stores/blogStore.js",
      "src/components/OptimizedImage.jsx",
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays blog posts",
    "role": "Blog Page"
  },
  {
    "path": "src/pages/SearchedPage.jsx",
    "name": "SearchedPage.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 831,
    "size": 35182,
    "imports": [
      "src/stores/productStore.js",
      "src/components/ProductSkeleton.jsx",
      "src/components/CategoryChip.jsx",
      "src/stores/cartStore.js",
      "src/hooks/useOzoQuery.js",
      "src/stores/locationStore.js",
      "src/hooks/useProductPagination.js",
      "src/components/OzoLoadingGuard.jsx",
      "src/components/ProductCard.jsx"
    ],
    "exports": [],
    "description": "Displays search results",
    "role": "Search Results"
  },
  {
    "path": "src/pages/Cart.jsx",
    "name": "Cart.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 967,
    "size": 42603,
    "imports": [
      "src/stores/productStore.js",
      "src/lib/supabase.js",
      "src/stores/authStore.js",
      "src/stores/cartStore.js",
      "src/components/SuggestedProducts.jsx",
      "src/stores/locationStore.js",
      "src/stores/wishlistStore.js"
    ],
    "exports": [],
    "description": "Manages the shopping cart",
    "role": "Cart Manager"
  },
  {
    "path": "src/pages/Search.jsx",
    "name": "Search.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 284,
    "size": 12987,
    "imports": [
      "src/stores/productStore.js",
      "src/components/CategoryChip.jsx",
      "src/hooks/useOzoQuery.js",
      "src/components/OzoLoadingGuard.jsx",
      "src/components/ProductCard.jsx"
    ],
    "exports": [],
    "description": "Handles search functionality",
    "role": "Search Handler"
  },
  {
    "path": "src/pages/Referral.jsx",
    "name": "Referral.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 344,
    "size": 14803,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [
      "function"
    ],
    "description": "Manages referrals",
    "role": "Referral Manager"
  },
  {
    "path": "src/pages/Profile.jsx",
    "name": "Profile.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 758,
    "size": 40203,
    "imports": [
      "src/stores/authStore.js",
      "src/hooks/useTranslation.js",
      "src/components/UserAvatar.jsx"
    ],
    "exports": [],
    "description": "Displays user profile",
    "role": "Profile Page"
  },
  {
    "path": "src/pages/About.jsx",
    "name": "About.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 164,
    "size": 8722,
    "imports": [
      "src/components/OptimizedImage.jsx",
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays about information",
    "role": "About Page"
  },
  {
    "path": "src/pages/ShippingPolicy.jsx",
    "name": "ShippingPolicy.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 101,
    "size": 6039,
    "imports": [
      "src/components/SEO.jsx",
      "src/stores/cartStore.js"
    ],
    "exports": [],
    "description": "Displays shipping policy",
    "role": "Shipping Policy"
  },
  {
    "path": "src/pages/CompleteProfile.jsx",
    "name": "CompleteProfile.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 193,
    "size": 6825,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Completes user profile",
    "role": "Profile Completer"
  },
  {
    "path": "src/pages/Notifications.jsx",
    "name": "Notifications.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 250,
    "size": 10970,
    "imports": [
      "src/hooks/useOzoQuery.js",
      "src/stores/notificationStore.js",
      "src/components/OzoLoadingGuard.jsx",
      "src/stores/languageStore.js"
    ],
    "exports": [],
    "description": "Manages notifications",
    "role": "Notification Manager"
  },
  {
    "path": "src/pages/Checkout.jsx",
    "name": "Checkout.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 2061,
    "size": 102380,
    "imports": [],
    "exports": [],
    "description": "Handles checkout process",
    "role": "Checkout Handler"
  },
  {
    "path": "src/pages/BlogDetail.jsx",
    "name": "BlogDetail.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 263,
    "size": 12039,
    "imports": [
      "src/stores/blogStore.js",
      "src/components/OptimizedImage.jsx",
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays blog post details",
    "role": "Blog Post Viewer"
  },
  {
    "path": "src/pages/Products.jsx",
    "name": "Products.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 846,
    "size": 38950,
    "imports": [
      "src/stores/productStore.js",
      "src/components/SortDropdown.jsx",
      "src/components/ProductSkeleton.jsx",
      "src/components/CategoryChip.jsx",
      "src/components/TopCategories.jsx",
      "src/hooks/useProductPagination.js",
      "src/components/OzoLoadingGuard.jsx",
      "src/components/ProductCard.jsx",
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays products",
    "role": "Product Page"
  },
  {
    "path": "src/pages/CategoryProducts.jsx",
    "name": "CategoryProducts.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1624,
    "size": 79309,
    "imports": [
      "src/stores/productStore.js",
      "src/components/SortDropdown.jsx",
      "src/hooks/useTranslation.js",
      "src/components/ProductSkeleton.jsx",
      "src/components/CategoryChip.jsx",
      "src/hooks/useProductPagination.js",
      "src/components/Breadcrumb.jsx",
      "src/components/OzoLoadingGuard.jsx",
      "src/components/ProductCard.jsx",
      "src/utils/onesignal.js",
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays category products",
    "role": "Category Page"
  },
  {
    "path": "src/pages/ComboDetail.jsx",
    "name": "ComboDetail.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 519,
    "size": 26374,
    "imports": [
      "src/hooks/useTranslation.js",
      "src/lib/supabase.js",
      "src/components/OptimizedImage.jsx",
      "src/stores/authStore.js",
      "src/stores/cartStore.js",
      "src/components/Breadcrumb.jsx",
      "src/components/OzoLoadingGuard.jsx"
    ],
    "exports": [],
    "description": "Displays combo details",
    "role": "Combo Viewer"
  },
  {
    "path": "src/pages/AuthCallback.jsx",
    "name": "AuthCallback.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 154,
    "size": 5385,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles authentication callback",
    "role": "Auth Callback"
  },
  {
    "path": "src/pages/Security.jsx",
    "name": "Security.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 406,
    "size": 15585,
    "imports": [
      "src/lib/supabase.js",
      "src/stores/languageStore.js"
    ],
    "exports": [],
    "description": "Manages security settings",
    "role": "Security Manager"
  },
  {
    "path": "src/pages/Wishlist.jsx",
    "name": "Wishlist.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 218,
    "size": 10923,
    "imports": [
      "src/hooks/useTranslation.js",
      "src/components/OptimizedImage.jsx",
      "src/stores/cartStore.js",
      "src/hooks/useOzoQuery.js",
      "src/components/OzoLoadingGuard.jsx",
      "src/stores/wishlistStore.js"
    ],
    "exports": [],
    "description": "Displays user wishlist",
    "role": "Wishlist Page"
  },
  {
    "path": "src/pages/NotFound.jsx",
    "name": "NotFound.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 85,
    "size": 3014,
    "imports": [],
    "exports": [],
    "description": "Displays not found page",
    "role": "Not Found Page"
  },
  {
    "path": "src/pages/CookiePolicy.jsx",
    "name": "CookiePolicy.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 95,
    "size": 5232,
    "imports": [
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays cookie policy",
    "role": "Cookie Policy"
  },
  {
    "path": "src/pages/Payments.jsx",
    "name": "Payments.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 445,
    "size": 18138,
    "imports": [
      "src/stores/languageStore.js"
    ],
    "exports": [],
    "description": "Manages payments",
    "role": "Payment Manager"
  },
  {
    "path": "src/pages/ProductDetail.jsx",
    "name": "ProductDetail.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1859,
    "size": 88967,
    "imports": [
      "src/components/Breadcrumb.jsx",
      "src/components/SEO.jsx"
    ],
    "exports": [],
    "description": "Displays product details",
    "role": "Product Viewer"
  },
  {
    "path": "src/pages/Help.jsx",
    "name": "Help.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1231,
    "size": 61878,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js",
      "src/components/SEO.jsx",
      "src/stores/cartStore.js"
    ],
    "exports": [],
    "description": "Displays help information",
    "role": "Help Page"
  },
  {
    "path": "src/pages/captain/Dashboard.jsx",
    "name": "Dashboard.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 431,
    "size": 20289,
    "imports": [
      "src/stores/authStore.js",
      "src/pages/captain/CaptainRadar.jsx",
      "src/pages/captain/CaptainProfile.jsx",
      "src/stores/captainStore.js",
      "src/stores/themeStore.js",
      "src/pages/captain/CaptainOnboarding.jsx",
      "src/utils/onesignal.js"
    ],
    "exports": [],
    "description": "Displays captain dashboard",
    "role": "Captain Dashboard"
  },
  {
    "path": "src/pages/captain/CaptainRadar.jsx",
    "name": "CaptainRadar.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1151,
    "size": 61948,
    "imports": [
      "src/components/OptimizedImage.jsx",
      "src/stores/cartStore.js",
      "src/stores/captainStore.js",
      "src/components/ImageUpload.jsx",
      "src/lib/addressHelpers.js"
    ],
    "exports": [],
    "description": "Displays captain radar",
    "role": "Captain Radar"
  },
  {
    "path": "src/pages/captain/CaptainProfile.jsx",
    "name": "CaptainProfile.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 165,
    "size": 8987,
    "imports": [
      "src/stores/captainStore.js",
      "src/stores/authStore.js"
    ],
    "exports": [],
    "description": "Handles captain profile rendering",
    "role": "Captain Profile"
  },
  {
    "path": "src/pages/captain/CaptainOnboarding.jsx",
    "name": "CaptainOnboarding.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 316,
    "size": 13665,
    "imports": [
      "src/stores/captainStore.js",
      "src/components/ImageUpload.jsx"
    ],
    "exports": [],
    "description": "Manages captain onboarding process",
    "role": "Captain Onboarding"
  },
  {
    "path": "src/pages/admin/SqlConsole.jsx",
    "name": "SqlConsole.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 377,
    "size": 16135,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Provides SQL console functionality",
    "role": "SQL Console"
  },
  {
    "path": "src/pages/admin/Dashboard.jsx",
    "name": "Dashboard.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1091,
    "size": 49974,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Renders admin dashboard",
    "role": "Admin Dashboard"
  },
  {
    "path": "src/pages/admin/Cities.jsx",
    "name": "Cities.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1696,
    "size": 79363,
    "imports": [
      "src/stores/authStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Manages city-related data",
    "role": "City Manager"
  },
  {
    "path": "src/pages/admin/Reviews.jsx",
    "name": "Reviews.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 637,
    "size": 28246,
    "imports": [
      "src/components/OptimizedImage.jsx",
      "src/components/UserAvatar.jsx",
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles review-related functionality",
    "role": "Review Manager"
  },
  {
    "path": "src/pages/admin/Orders.jsx",
    "name": "Orders.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 2687,
    "size": 144844,
    "imports": [],
    "exports": [],
    "description": "Manages order-related data",
    "role": "Order Manager"
  },
  {
    "path": "src/pages/admin/Categories.jsx",
    "name": "Categories.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1354,
    "size": 64066,
    "imports": [
      "src/components/ImageUpload.jsx",
      "src/lib/supabase.js",
      "src/components/ConfirmModal.jsx"
    ],
    "exports": [],
    "description": "Manages category-related data",
    "role": "Category Manager"
  },
  {
    "path": "src/pages/admin/Messages.jsx",
    "name": "Messages.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1102,
    "size": 52014,
    "imports": [
      "src/lib/supabase.js",
      "src/stores/adminIndicatorStore.js"
    ],
    "exports": [],
    "description": "Handles message-related functionality",
    "role": "Message Manager"
  },
  {
    "path": "src/pages/admin/Offers.jsx",
    "name": "Offers.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1632,
    "size": 82346,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Manages offer-related data",
    "role": "Offer Manager"
  },
  {
    "path": "src/pages/admin/Requests.jsx",
    "name": "Requests.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1541,
    "size": 78659,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles request-related functionality",
    "role": "Request Manager"
  },
  {
    "path": "src/pages/admin/RiderManageAdmin.jsx",
    "name": "RiderManageAdmin.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1306,
    "size": 65530,
    "imports": [],
    "exports": [],
    "description": "Manages rider-related data",
    "role": "Rider Manager"
  },
  {
    "path": "src/pages/admin/MartPayoutsAdmin.jsx",
    "name": "MartPayoutsAdmin.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 918,
    "size": 42434,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles mart payout-related functionality",
    "role": "Mart Payouts"
  },
  {
    "path": "src/pages/admin/Settings.jsx",
    "name": "Settings.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 3689,
    "size": 191743,
    "imports": [],
    "exports": [],
    "description": "Provides settings management functionality",
    "role": "Settings Manager"
  },
  {
    "path": "src/pages/admin/Backup.jsx",
    "name": "Backup.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1848,
    "size": 77982,
    "imports": [],
    "exports": [],
    "description": "Handles backup-related functionality",
    "role": "Backup Manager"
  },
  {
    "path": "src/pages/admin/Blog.jsx",
    "name": "Blog.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 938,
    "size": 45310,
    "imports": [
      "src/stores/blogStore.js",
      "src/stores/authStore.js"
    ],
    "exports": [],
    "description": "Manages blog-related data",
    "role": "Blog Manager"
  },
  {
    "path": "src/pages/admin/Users.jsx",
    "name": "Users.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1846,
    "size": 96570,
    "imports": [],
    "exports": [],
    "description": "Handles user-related functionality",
    "role": "User Manager"
  },
  {
    "path": "src/pages/admin/PhoneCaptureSandbox.jsx",
    "name": "PhoneCaptureSandbox.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 693,
    "size": 31540,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Provides phone capture sandbox functionality",
    "role": "Phone Capture"
  },
  {
    "path": "src/pages/admin/Products.jsx",
    "name": "Products.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 2628,
    "size": 122316,
    "imports": [],
    "exports": [],
    "description": "Manages product-related data",
    "role": "Product Manager"
  },
  {
    "path": "src/pages/admin/Festivals.jsx",
    "name": "Festivals.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1046,
    "size": 50734,
    "imports": [
      "src/components/ImageUpload.jsx",
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Handles festival-related functionality",
    "role": "Festival Manager"
  },
  {
    "path": "src/pages/admin/MartManageAdmin.jsx",
    "name": "MartManageAdmin.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1577,
    "size": 77873,
    "imports": [],
    "exports": [],
    "description": "Manages mart-related data",
    "role": "Mart Manager"
  },
  {
    "path": "src/pages/admin/ProfitOptimizer.jsx",
    "name": "ProfitOptimizer.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1361,
    "size": 62434,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Provides profit optimization functionality",
    "role": "Profit Optimizer"
  },
  {
    "path": "src/pages/admin/MartAdmin.jsx",
    "name": "MartAdmin.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 215,
    "size": 11248,
    "imports": [],
    "exports": [],
    "description": "Handles mart administration functionality",
    "role": "Mart Admin"
  },
  {
    "path": "src/pages/admin/RiderAdmin.jsx",
    "name": "RiderAdmin.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 581,
    "size": 29167,
    "imports": [
      "src/config/deliveryDefaults.js",
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Manages rider-related data",
    "role": "Rider Admin"
  },
  {
    "path": "src/pages/admin/SeoDashboard.jsx",
    "name": "SeoDashboard.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 874,
    "size": 39448,
    "imports": [
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Provides SEO dashboard functionality",
    "role": "SEO Dashboard"
  },
  {
    "path": "src/pages/mart/Dashboard.jsx",
    "name": "Dashboard.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 535,
    "size": 25662,
    "imports": [
      "src/stores/martStore.js",
      "src/lib/supabase.js",
      "src/pages/mart/LiveOrdersView.jsx",
      "src/stores/authStore.js",
      "src/pages/mart/EarningsView.jsx",
      "src/pages/mart/MartOnboarding.jsx",
      "src/components/mart/BarcodeEnrichmentModal.jsx",
      "src/pages/mart/StoreProfileView.jsx",
      "src/pages/mart/InventoryView.jsx"
    ],
    "exports": [],
    "description": "Renders mart dashboard",
    "role": "Mart Dashboard"
  },
  {
    "path": "src/pages/mart/InventoryView.jsx",
    "name": "InventoryView.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 2494,
    "size": 136232,
    "imports": [
      "src/stores/martStore.js",
      "src/pages/mart/BulkImportWizard.jsx",
      "src/lib/supabase.js",
      "src/components/mart/BarcodeEnrichmentModal.jsx"
    ],
    "exports": [],
    "description": "Handles inventory-related functionality",
    "role": "Inventory Manager"
  },
  {
    "path": "src/pages/mart/BulkImportWizard.jsx",
    "name": "BulkImportWizard.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1723,
    "size": 79573,
    "imports": [
      "src/stores/martStore.js",
      "src/lib/supabase.js",
      "src/lib/rpc.js",
      "src/components/mart/BarcodeEnrichmentModal.jsx"
    ],
    "exports": [],
    "description": "Provides bulk import functionality",
    "role": "Bulk Import"
  },
  {
    "path": "src/pages/mart/StoreProfileView.jsx",
    "name": "StoreProfileView.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 671,
    "size": 36523,
    "imports": [
      "src/stores/martStore.js",
      "src/lib/supabase.js"
    ],
    "exports": [
      "parseTimeString"
    ],
    "description": "Manages store profile-related data",
    "role": "Store Profile"
  },
  {
    "path": "src/pages/mart/LiveOrdersView.jsx",
    "name": "LiveOrdersView.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 1127,
    "size": 60325,
    "imports": [
      "src/stores/martStore.js",
      "src/components/OptimizedImage.jsx"
    ],
    "exports": [],
    "description": "Handles live orders functionality",
    "role": "Live Orders"
  },
  {
    "path": "src/pages/mart/EarningsView.jsx",
    "name": "EarningsView.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 808,
    "size": 45586,
    "imports": [
      "src/stores/martStore.js",
      "src/components/OptimizedImage.jsx",
      "src/lib/supabase.js"
    ],
    "exports": [],
    "description": "Provides earnings-related functionality",
    "role": "Earnings Manager"
  },
  {
    "path": "src/pages/mart/MartOnboarding.jsx",
    "name": "MartOnboarding.jsx",
    "type": "code",
    "folder": "src/pages",
    "lines": 214,
    "size": 9529,
    "imports": [
      "src/stores/martStore.js"
    ],
    "exports": [],
    "description": "Manages mart onboarding process",
    "role": "Mart Onboarding"
  },
  {
    "path": "api/_ratelimit.ts",
    "name": "_ratelimit.ts",
    "type": "code",
    "folder": "api",
    "lines": 177,
    "size": 5551,
    "imports": [],
    "exports": [],
    "description": "Handles rate limiting functionality",
    "role": "Rate Limiter"
  },
  {
    "path": "api/image.ts",
    "name": "image.ts",
    "type": "code",
    "folder": "api",
    "lines": 128,
    "size": 5314,
    "imports": [
      "api/_ratelimit.js"
    ],
    "exports": [
      "async",
      "config"
    ],
    "description": "Provides image-related functionality",
    "role": "Image Manager"
  },
  {
    "path": "api/index-product.ts",
    "name": "index-product.ts",
    "type": "code",
    "folder": "api",
    "lines": 94,
    "size": 3470,
    "imports": [
      "api/_supabase.js",
      "api/_ratelimit.js"
    ],
    "exports": [
      "async"
    ],
    "description": "Handles product indexing functionality",
    "role": "Product Indexer"
  },
  {
    "path": "api/render-seo.ts",
    "name": "render-seo.ts",
    "type": "code",
    "folder": "api",
    "lines": 2520,
    "size": 75349,
    "imports": [
      "api/_supabase.js",
      "api/_ratelimit.js"
    ],
    "exports": [],
    "description": "Handles SEO page rendering",
    "role": "SEO Handler"
  },
  {
    "path": "api/_supabase.ts",
    "name": "_supabase.ts",
    "type": "code",
    "folder": "api",
    "lines": 48,
    "size": 1302,
    "imports": [],
    "exports": [
      "supabase"
    ],
    "description": "Supabase client configuration",
    "role": "Supabase Config"
  },
  {
    "path": "api/proxy.ts",
    "name": "proxy.ts",
    "type": "code",
    "folder": "api",
    "lines": 351,
    "size": 13348,
    "imports": [
      "api/_ratelimit.js"
    ],
    "exports": [
      "config"
    ],
    "description": "Proxy server configuration",
    "role": "Proxy Server"
  },
  {
    "path": "api/search-image.ts",
    "name": "search-image.ts",
    "type": "code",
    "folder": "api",
    "lines": 394,
    "size": 15181,
    "imports": [
      "api/_ratelimit.js"
    ],
    "exports": [],
    "description": "Searches for images",
    "role": "Image Search"
  },
  {
    "path": "api/sitemap.ts",
    "name": "sitemap.ts",
    "type": "code",
    "folder": "api",
    "lines": 187,
    "size": 6864,
    "imports": [
      "api/_supabase.js",
      "api/_ratelimit.js"
    ],
    "exports": [
      "async"
    ],
    "description": "Generates sitemap",
    "role": "Sitemap Generator"
  },
  {
    "path": "api/mandi-sync.ts",
    "name": "mandi-sync.ts",
    "type": "code",
    "folder": "api",
    "lines": 468,
    "size": 16445,
    "imports": [
      "api/_supabase.js",
      "api/_ratelimit.js"
    ],
    "exports": [],
    "description": "Synchronizes mandi data",
    "role": "Mandi Sync"
  },
  {
    "path": "api/geocode.ts",
    "name": "geocode.ts",
    "type": "code",
    "folder": "api",
    "lines": 345,
    "size": 11785,
    "imports": [
      "api/_ratelimit.js"
    ],
    "exports": [],
    "description": "Handles geocoding",
    "role": "Geocode Handler"
  },
  {
    "path": "api/indexnow-key.ts",
    "name": "indexnow-key.ts",
    "type": "code",
    "folder": "api",
    "lines": 24,
    "size": 901,
    "imports": [
      "api/_ratelimit.js"
    ],
    "exports": [
      "async"
    ],
    "description": "Handles IndexNow key",
    "role": "IndexNow Key"
  },
  {
    "path": "api/cron/order-manager.ts",
    "name": "order-manager.ts",
    "type": "code",
    "folder": "api",
    "lines": 56,
    "size": 2345,
    "imports": [
      "api/_supabase.js",
      "api/_ratelimit.js"
    ],
    "exports": [
      "async"
    ],
    "description": "Manages orders",
    "role": "Order Manager"
  },
  {
    "path": "supabase/functions/verify-razorpay-payment/index.ts",
    "name": "index.ts",
    "type": "code",
    "folder": "supabase/functions",
    "lines": 805,
    "size": 30021,
    "imports": [],
    "exports": [],
    "description": "Verifies Razorpay payments",
    "role": "Payment Verifier"
  },
  {
    "path": "supabase/functions/cashfree-payment/index.ts",
    "name": "index.ts",
    "type": "code",
    "folder": "supabase/functions",
    "lines": 704,
    "size": 28095,
    "imports": [],
    "exports": [],
    "description": "Handles Cashfree payments",
    "role": "Payment Handler"
  },
  {
    "path": "supabase/functions/send-push-notification/index.ts",
    "name": "index.ts",
    "type": "code",
    "folder": "supabase/functions",
    "lines": 341,
    "size": 14162,
    "imports": [],
    "exports": [],
    "description": "Sends push notifications",
    "role": "Notification Sender"
  },
  {
    "path": "supabase/functions/imagekit-auth/index.ts",
    "name": "index.ts",
    "type": "code",
    "folder": "supabase/functions",
    "lines": 128,
    "size": 4372,
    "imports": [],
    "exports": [],
    "description": "Handles ImageKit authentication",
    "role": "ImageKit Auth"
  },
  {
    "path": "supabase/migrations/20260611050000_captains_and_orders_security.sql",
    "name": "20260611050000_captains_and_orders_security.sql",
    "clean_name": "Captains And Orders Security",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 227,
    "size": 8331,
    "imports": [],
    "exports": [],
    "description": "Secures captains and orders",
    "role": "Security Migration"
  },
  {
    "path": "supabase/migrations/20260622223000_secure_mart_customer_details.sql",
    "name": "20260622223000_secure_mart_customer_details.sql",
    "clean_name": "Secure Mart Customer Details",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 30,
    "size": 1509,
    "imports": [],
    "exports": [],
    "description": "Secures mart customer details",
    "role": "Security Migration"
  },
  {
    "path": "supabase/migrations/20260610220000_order_pukka_addresses.sql",
    "name": "20260610220000_order_pukka_addresses.sql",
    "clean_name": "Order Pukka Addresses",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 316,
    "size": 10614,
    "imports": [],
    "exports": [],
    "description": "Adds pukka addresses to orders",
    "role": "Order Migration"
  },
  {
    "path": "supabase/migrations/20260709200500_fix_order_cancellation_stock_sync.sql",
    "name": "20260709200500_fix_order_cancellation_stock_sync.sql",
    "clean_name": "Fix Order Cancellation Stock Sync",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 237,
    "size": 9581,
    "imports": [],
    "exports": [],
    "description": "Fixes order cancellation stock sync",
    "role": "Order Migration"
  },
  {
    "path": "supabase/migrations/20260702130000_harden_security_and_performance.sql",
    "name": "20260702130000_harden_security_and_performance.sql",
    "clean_name": "Harden Security And Performance",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 57,
    "size": 2144,
    "imports": [],
    "exports": [],
    "description": "Hardens security and performance",
    "role": "Security Migration"
  },
  {
    "path": "supabase/migrations/20260608180000_inventory_stock_rules.sql",
    "name": "20260608180000_inventory_stock_rules.sql",
    "clean_name": "Inventory Stock Rules",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 309,
    "size": 10604,
    "imports": [],
    "exports": [],
    "description": "Creates inventory stock rules",
    "role": "Inventory Migration"
  },
  {
    "path": "supabase/migrations/20260624093000_add_summer_specials_category.sql",
    "name": "20260624093000_add_summer_specials_category.sql",
    "clean_name": "Add Summer Specials Category",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 42,
    "size": 2073,
    "imports": [],
    "exports": [],
    "description": "Adds summer specials category",
    "role": "Category Migration"
  },
  {
    "path": "supabase/migrations/20260614183000_onesignal_lifecycle.sql",
    "name": "20260614183000_onesignal_lifecycle.sql",
    "clean_name": "Onesignal Lifecycle",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 146,
    "size": 6063,
    "imports": [],
    "exports": [],
    "description": "Sets up OneSignal lifecycle",
    "role": "Notification Migration"
  },
  {
    "path": "supabase/migrations/20260626070000_harden_rate_limiting.sql",
    "name": "20260626070000_harden_rate_limiting.sql",
    "clean_name": "Harden Rate Limiting",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 101,
    "size": 3882,
    "imports": [],
    "exports": [],
    "description": "Hardens rate limiting",
    "role": "Rate Limiting Migration"
  },
  {
    "path": "supabase/migrations/20260707190000_fuzzy_product_matching.sql",
    "name": "20260707190000_fuzzy_product_matching.sql",
    "clean_name": "Fuzzy Product Matching",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 117,
    "size": 3713,
    "imports": [],
    "exports": [],
    "description": "Enables fuzzy product matching",
    "role": "Product Migration"
  },
  {
    "path": "supabase/migrations/20260625161000_add_allow_invoice_to_orders.sql",
    "name": "20260625161000_add_allow_invoice_to_orders.sql",
    "clean_name": "Add Allow Invoice To Orders",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 2,
    "size": 144,
    "imports": [],
    "exports": [],
    "description": "Adds allow invoice to orders",
    "role": "Order Migration"
  },
  {
    "path": "supabase/migrations/20260620000000_order_state_machine.sql",
    "name": "20260620000000_order_state_machine.sql",
    "clean_name": "Order State Machine",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 674,
    "size": 24842,
    "imports": [],
    "exports": [],
    "description": "Sets up order state machine",
    "role": "Order Migration"
  },
  {
    "path": "supabase/migrations/20260709202500_harden_inventory_sync_rules.sql",
    "name": "20260709202500_harden_inventory_sync_rules.sql",
    "clean_name": "Harden Inventory Sync Rules",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 991,
    "size": 36235,
    "imports": [],
    "exports": [],
    "description": "Hardens inventory sync rules",
    "role": "Inventory Migration"
  },
  {
    "path": "supabase/migrations/20260705183000_sync_product_catalog_availability.sql",
    "name": "20260705183000_sync_product_catalog_availability.sql",
    "clean_name": "Sync Product Catalog Availability",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 113,
    "size": 4101,
    "imports": [],
    "exports": [],
    "description": "Syncs product catalog availability",
    "role": "Product Migration"
  },
  {
    "path": "supabase/migrations/20260719164500_add_city_manager_to_users_role_check.sql",
    "name": "20260719164500_add_city_manager_to_users_role_check.sql",
    "clean_name": "Add City Manager To Users Role Check",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 63,
    "size": 2255,
    "imports": [],
    "exports": [],
    "description": "Adds city manager to users role check",
    "role": "User Migration"
  },
  {
    "path": "supabase/migrations/20260728100000_friendly_product_name_errors.sql",
    "name": "20260728100000_friendly_product_name_errors.sql",
    "clean_name": "Friendly Product Name Errors",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 471,
    "size": 16915,
    "imports": [],
    "exports": [],
    "description": "Replaces product UUIDs with names in errors",
    "role": "Error Migration"
  },
  {
    "path": "supabase/migrations/20260626173500_add_is_cancelled_to_order_items.sql",
    "name": "20260626173500_add_is_cancelled_to_order_items.sql",
    "clean_name": "Add Is Cancelled To Order Items",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 3,
    "size": 144,
    "imports": [],
    "exports": [],
    "description": "Adds is cancelled to order items",
    "role": "Order Migration"
  },
  {
    "path": "supabase/migrations/20260711170000_fix_order_notification_lifecycle.sql",
    "name": "20260711170000_fix_order_notification_lifecycle.sql",
    "clean_name": "Fix Order Notification Lifecycle",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 209,
    "size": 9158,
    "imports": [],
    "exports": [],
    "description": "Fixes order notification lifecycle",
    "role": "Notification Migration"
  },
  {
    "path": "supabase/migrations/20260705185000_allow_webcam_phone_enrichment_sources.sql",
    "name": "20260705185000_allow_webcam_phone_enrichment_sources.sql",
    "clean_name": "Allow Webcam Phone Enrichment Sources",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 8,
    "size": 523,
    "imports": [],
    "exports": [],
    "description": "Allows webcam and phone enrichment sources",
    "role": "Enrichment Migration"
  },
  {
    "path": "supabase/migrations/20260715125203_create_scoped_rbac_system.sql",
    "name": "20260715125203_create_scoped_rbac_system.sql",
    "clean_name": "Create Scoped Rbac System",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 261,
    "size": 8259,
    "imports": [],
    "exports": [],
    "description": "Creates scoped RBAC system",
    "role": "RBAC Migration"
  },
  {
    "path": "supabase/migrations/20260622060000_fix_create_order_city_slug.sql",
    "name": "20260622060000_fix_create_order_city_slug.sql",
    "clean_name": "Fix Create Order City Slug",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 428,
    "size": 15478,
    "imports": [],
    "exports": [],
    "description": "Fixes create order city slug",
    "role": "Order Migration"
  },
  {
    "path": "supabase/migrations/20260611040000_bulk_logs_security.sql",
    "name": "20260611040000_bulk_logs_security.sql",
    "clean_name": "Bulk Logs Security",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 11,
    "size": 504,
    "imports": [],
    "exports": [],
    "description": "Secures bulk logs",
    "role": "Security Migration"
  },
  {
    "path": "supabase/migrations/20260705160000_proximity_routing_and_product_margins.sql",
    "name": "20260705160000_proximity_routing_and_product_margins.sql",
    "clean_name": "Proximity Routing And Product Margins",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 664,
    "size": 23793,
    "imports": [],
    "exports": [],
    "description": "Adds latitude and longitude columns to marts table",
    "role": "Location Data"
  },
  {
    "path": "supabase/migrations/20260623091200_database_rate_limiting.sql",
    "name": "20260623091200_database_rate_limiting.sql",
    "clean_name": "Database Rate Limiting",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 152,
    "size": 5576,
    "imports": [],
    "exports": [],
    "description": "Creates rate limit tracking table",
    "role": "Rate Limiter"
  },
  {
    "path": "supabase/migrations/20260608190000_secure_user_role_updates.sql",
    "name": "20260608190000_secure_user_role_updates.sql",
    "clean_name": "Secure User Role Updates",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 18,
    "size": 574,
    "imports": [],
    "exports": [],
    "description": "Restricts role updates to admins only",
    "role": "Role Manager"
  },
  {
    "path": "supabase/migrations/20260611030000_revoke_all_other_sessions.sql",
    "name": "20260611030000_revoke_all_other_sessions.sql",
    "clean_name": "Revoke All Other Sessions",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 20,
    "size": 574,
    "imports": [],
    "exports": [],
    "description": "Revokes all other user sessions",
    "role": "Session Manager"
  },
  {
    "path": "supabase/migrations/20260621114000_add_order_items_packed_columns.sql",
    "name": "20260621114000_add_order_items_packed_columns.sql",
    "clean_name": "Add Order Items Packed Columns",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 11,
    "size": 415,
    "imports": [],
    "exports": [],
    "description": "Adds packed columns to order items table",
    "role": "Order Manager"
  },
  {
    "path": "supabase/migrations/20260705184000_allow_mart_operator_insert_products.sql",
    "name": "20260705184000_allow_mart_operator_insert_products.sql",
    "clean_name": "Allow Mart Operator Insert Products",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 6,
    "size": 269,
    "imports": [],
    "exports": [],
    "description": "Allows mart operators to insert products",
    "role": "Product Manager"
  },
  {
    "path": "supabase/migrations/20260714100000_festival_planner_system.sql",
    "name": "20260714100000_festival_planner_system.sql",
    "clean_name": "Festival Planner System",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 150,
    "size": 5201,
    "imports": [],
    "exports": [],
    "description": "Creates festival planner table and triggers",
    "role": "Event Planner"
  },
  {
    "path": "supabase/migrations/20260627154000_add_cancelled_by_mart_status.sql",
    "name": "20260627154000_add_cancelled_by_mart_status.sql",
    "clean_name": "Add Cancelled By Mart Status",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 329,
    "size": 13480,
    "imports": [],
    "exports": [],
    "description": "Adds cancelled by mart status to orders table",
    "role": "Order Status"
  },
  {
    "path": "supabase/migrations/20260615170000_order_review_integrity_security.sql",
    "name": "20260615170000_order_review_integrity_security.sql",
    "clean_name": "Order Review Integrity Security",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 218,
    "size": 9523,
    "imports": [],
    "exports": [],
    "description": "Secures order review integrity",
    "role": "Security Enforcer"
  },
  {
    "path": "supabase/migrations/20260705180000_security_hardening_and_indexes.sql",
    "name": "20260705180000_security_hardening_and_indexes.sql",
    "clean_name": "Security Hardening And Indexes",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 234,
    "size": 12312,
    "imports": [],
    "exports": [],
    "description": "Hardens security and optimizes indexes",
    "role": "Security Optimizer"
  },
  {
    "path": "supabase/migrations/20260611020000_session_limit_trigger.sql",
    "name": "20260611020000_session_limit_trigger.sql",
    "clean_name": "Session Limit Trigger",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 49,
    "size": 1725,
    "imports": [],
    "exports": [],
    "description": "Creates session limit trigger",
    "role": "Session Limiter"
  },
  {
    "path": "supabase/migrations/20260611010000_user_active_sessions.sql",
    "name": "20260611010000_user_active_sessions.sql",
    "clean_name": "User Active Sessions",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 44,
    "size": 1058,
    "imports": [],
    "exports": [],
    "description": "Manages user active sessions",
    "role": "Session Manager"
  },
  {
    "path": "supabase/migrations/20260715125300_fix_scoped_rbac_onboarding_triggers.sql",
    "name": "20260715125300_fix_scoped_rbac_onboarding_triggers.sql",
    "clean_name": "Fix Scoped Rbac Onboarding Triggers",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 115,
    "size": 4307,
    "imports": [],
    "exports": [],
    "description": "Fixes scoped RBAC onboarding triggers",
    "role": "RBAC Manager"
  },
  {
    "path": "supabase/migrations/20260710235900_grant_rls_functions_execute.sql",
    "name": "20260710235900_grant_rls_functions_execute.sql",
    "clean_name": "Grant Rls Functions Execute",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 8,
    "size": 484,
    "imports": [],
    "exports": [],
    "description": "Grants execute permissions on RLS functions",
    "role": "Permission Manager"
  },
  {
    "path": "supabase/migrations/20260710234900_notify_mart_operator_new_order.sql",
    "name": "20260710234900_notify_mart_operator_new_order.sql",
    "clean_name": "Notify Mart Operator New Order",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 142,
    "size": 6030,
    "imports": [],
    "exports": [],
    "description": "Notifies mart operator of new orders",
    "role": "Notification Sender"
  },
  {
    "path": "supabase/migrations/20260611060000_fix_admin_permissive_policies.sql",
    "name": "20260611060000_fix_admin_permissive_policies.sql",
    "clean_name": "Fix Admin Permissive Policies",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 62,
    "size": 2800,
    "imports": [],
    "exports": [],
    "description": "Fixes admin permissive policies",
    "role": "Policy Manager"
  },
  {
    "path": "supabase/migrations/20260621121000_platform_fee.sql",
    "name": "20260621121000_platform_fee.sql",
    "clean_name": "Platform Fee",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 434,
    "size": 15916,
    "imports": [],
    "exports": [],
    "description": "Adds platform fee to orders table",
    "role": "Fee Manager"
  },
  {
    "path": "supabase/migrations/20260710225500_harden_rate_limiter_triggers.sql",
    "name": "20260710225500_harden_rate_limiter_triggers.sql",
    "clean_name": "Harden Rate Limiter Triggers",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 39,
    "size": 1574,
    "imports": [],
    "exports": [],
    "description": "Hardens rate limiter triggers",
    "role": "Rate Limiter"
  },
  {
    "path": "supabase/migrations/20260710234300_create_user_fcm_tokens.sql",
    "name": "20260710234300_create_user_fcm_tokens.sql",
    "clean_name": "Create User Fcm Tokens",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 34,
    "size": 1175,
    "imports": [],
    "exports": [],
    "description": "Creates user FCM tokens table",
    "role": "Token Manager"
  },
  {
    "path": "supabase/migrations/20260708170000_allow_blinkit_bigbasket_enrichment_sources.sql",
    "name": "20260708170000_allow_blinkit_bigbasket_enrichment_sources.sql",
    "clean_name": "Allow Blinkit Bigbasket Enrichment Sources",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 8,
    "size": 556,
    "imports": [],
    "exports": [],
    "description": "Allows Blinkit and BigBasket enrichment sources",
    "role": "Enrichment Manager"
  },
  {
    "path": "supabase/migrations/20260712180000_fix_coupon_query_in_create_order_secure.sql",
    "name": "20260712180000_fix_coupon_query_in_create_order_secure.sql",
    "clean_name": "Fix Coupon Query In Create Order Secure",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 472,
    "size": 16938,
    "imports": [],
    "exports": [],
    "description": "Fixes coupon query in create order secure function",
    "role": "Order Manager"
  },
  {
    "path": "supabase/migrations/20260705170000_margin_rule_sync_triggers.sql",
    "name": "20260705170000_margin_rule_sync_triggers.sql",
    "clean_name": "Margin Rule Sync Triggers",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 118,
    "size": 6061,
    "imports": [],
    "exports": [],
    "description": "Creates margin rule sync triggers",
    "role": "Margin Manager"
  },
  {
    "path": "supabase/migrations/20260719163000_update_verify_admin_login_for_city_managers.sql",
    "name": "20260719163000_update_verify_admin_login_for_city_managers.sql",
    "clean_name": "Update Verify Admin Login For City Managers",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 45,
    "size": 1427,
    "imports": [],
    "exports": [],
    "description": "Updates verify admin login for city managers",
    "role": "Login Manager"
  },
  {
    "path": "supabase/migrations/20260608170000_payment_verification_rules.sql",
    "name": "20260608170000_payment_verification_rules.sql",
    "clean_name": "Payment Verification Rules",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 59,
    "size": 2089,
    "imports": [],
    "exports": [],
    "description": "Creates payment verification rules",
    "role": "Payment Verifier"
  },
  {
    "path": "supabase/migrations/20260705150000_mart_specific_margin_pricing.sql",
    "name": "20260705150000_mart_specific_margin_pricing.sql",
    "clean_name": "Mart Specific Margin Pricing",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 641,
    "size": 23269,
    "imports": [],
    "exports": [],
    "description": "Creates mart-specific margin pricing table",
    "role": "Pricing Manager"
  },
  {
    "path": "supabase/migrations/20260609223000_onesignal_notification_webhook.sql",
    "name": "20260609223000_onesignal_notification_webhook.sql",
    "clean_name": "Onesignal Notification Webhook",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 62,
    "size": 1835,
    "imports": [],
    "exports": [],
    "description": "Creates OneSignal notification webhook",
    "role": "Notification Sender"
  },
  {
    "path": "supabase/migrations/20260710150000_fix_serviceable_streets_security_invoker.sql",
    "name": "20260710150000_fix_serviceable_streets_security_invoker.sql",
    "clean_name": "Fix Serviceable Streets Security Invoker",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 46,
    "size": 1340,
    "imports": [],
    "exports": [],
    "description": "Fixes serviceable streets security invoker",
    "role": "Security Fixer"
  },
  {
    "path": "supabase/migrations/20260710224500_support_tickets_customer_policies.sql",
    "name": "20260710224500_support_tickets_customer_policies.sql",
    "clean_name": "Support Tickets Customer Policies",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 19,
    "size": 804,
    "imports": [],
    "exports": [],
    "description": "Creates customer policies for support tickets",
    "role": "Ticket Manager"
  },
  {
    "path": "supabase/migrations/20260712190000_secure_admin_panel_password.sql",
    "name": "20260712190000_secure_admin_panel_password.sql",
    "clean_name": "Secure Admin Panel Password",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 159,
    "size": 4625,
    "imports": [],
    "exports": [],
    "description": "Secures admin panel password",
    "role": "Password Manager"
  },
  {
    "path": "supabase/migrations/20260705185500_add_product_id_to_capture_sessions.sql",
    "name": "20260705185500_add_product_id_to_capture_sessions.sql",
    "clean_name": "Add Product Id To Capture Sessions",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 5,
    "size": 358,
    "imports": [],
    "exports": [],
    "description": "Adds product ID to capture sessions table",
    "role": "Session Manager"
  },
  {
    "path": "supabase/migrations/20260621120000_referral_system.sql",
    "name": "20260621120000_referral_system.sql",
    "clean_name": "Referral System",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 541,
    "size": 19530,
    "imports": [],
    "exports": [],
    "description": "Creates referral system",
    "role": "Referral Manager"
  },
  {
    "path": "supabase/migrations/20260616223000_create_support_ticket_messages.sql",
    "name": "20260616223000_create_support_ticket_messages.sql",
    "clean_name": "Create Support Ticket Messages",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 78,
    "size": 2880,
    "imports": [],
    "exports": [],
    "description": "Creates support ticket messages table",
    "role": "Message Manager"
  },
  {
    "path": "supabase/migrations/20260705182000_capture_sessions_rls_anonymous.sql",
    "name": "20260705182000_capture_sessions_rls_anonymous.sql",
    "clean_name": "Capture Sessions Rls Anonymous",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 40,
    "size": 1887,
    "imports": [],
    "exports": [],
    "description": "Adjusts capture sessions RLS for anonymous users",
    "role": "RLS Manager"
  },
  {
    "path": "supabase/migrations/20260620013000_add_product_barcode.sql",
    "name": "20260620013000_add_product_barcode.sql",
    "clean_name": "Add Product Barcode",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 107,
    "size": 4038,
    "imports": [],
    "exports": [],
    "description": "Adds product barcode column",
    "role": "Product Manager"
  },
  {
    "path": "supabase/migrations/20260705120000_catalog_enrichment.sql",
    "name": "20260705120000_catalog_enrichment.sql",
    "clean_name": "Catalog Enrichment",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 52,
    "size": 2604,
    "imports": [],
    "exports": [],
    "description": "Creates catalog enrichment system",
    "role": "Enrichment Manager"
  },
  {
    "path": "supabase/migrations/20260707200000_mart_pending_products.sql",
    "name": "20260707200000_mart_pending_products.sql",
    "clean_name": "Mart Pending Products",
    "type": "sql",
    "folder": "supabase/migrations",
    "lines": 70,
    "size": 2620,
    "imports": [],
    "exports": [],
    "description": "Creates mart pending products table",
    "role": "DB Migration"
  },
  {
    "path": "src/App.jsx",
    "name": "App.jsx",
    "type": "code",
    "folder": "root",
    "lines": 762,
    "size": 28986,
    "imports": [
      "src/lib/supabase.js",
      "src/layouts/MainLayout.jsx",
      "src/components/OzoSplashScreen.jsx",
      "src/layouts/AdminLayout.jsx",
      "src/firebase.js"
    ],
    "exports": [],
    "description": "Defines main application component",
    "role": "App Router"
  },
  {
    "path": "src/main.jsx",
    "name": "main.jsx",
    "type": "code",
    "folder": "root",
    "lines": 230,
    "size": 7961,
    "imports": [
      "src/lib/firebase.js",
      "src/App.jsx",
      "src/index.css"
    ],
    "exports": [],
    "description": "Initializes React application",
    "role": "App Entry"
  },
  {
    "path": "index.html",
    "name": "index.html",
    "type": "html",
    "folder": "root",
    "lines": 266,
    "size": 14828,
    "imports": [],
    "exports": [],
    "description": "Serves as main HTML entry point",
    "role": "Web Entry"
  }
];
