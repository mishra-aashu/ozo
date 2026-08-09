import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from "@sentry/react"
import { AlertCircle, RefreshCcw } from 'lucide-react'
import toast, { Toaster, ToastBar, useToasterStore } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'
import './lib/firebase'
import { logError } from './utils/logger'

// Global Uncaught Exception Handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.error) {
      logError({
        error: event.error,
        message: event.message,
        componentName: 'Global Window Error',
        severity: 'error'
      })
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    logError({
      error: reason instanceof Error ? reason : null,
      message: reason?.message || String(reason || 'Unhandled Promise Rejection'),
      componentName: 'Unhandled Promise Rejection',
      severity: 'error'
    })
  })
}

// Safely extract text content from toast message to deduplicate identical toasts
const getToastMessageText = (message) => {
  if (!message) return '';
  if (typeof message === 'string') return message;
  if (typeof message === 'number') return String(message);
  if (typeof message === 'object') {
    if (message.props && message.props.children) {
      const children = message.props.children;
      if (Array.isArray(children)) {
        return children.map(getToastMessageText).join('');
      }
      return getToastMessageText(children);
    }
  }
  return '';
};

// Limit the number of visible toasts to avoid stacking and prevent duplicate notifications
const ToastLimitController = () => {
  const { toasts } = useToasterStore();
  const limit = 1;

  React.useEffect(() => {
    // 1. Deduplicate same messages among visible toasts
    const visibleToasts = toasts.filter((t) => t.visible);
    const seenMessages = new Set();
    
    // Scan from newest to oldest
    for (let i = visibleToasts.length - 1; i >= 0; i--) {
      const t = visibleToasts[i];
      const text = getToastMessageText(t.message);
      
      // If we've seen this message recently, dismiss the older one
      if (text && seenMessages.has(text)) {
        toast.dismiss(t.id);
      } else if (text) {
        seenMessages.add(text);
      }
    }

    // 2. Enforce the global visible toasts limit
    const currentVisible = toasts.filter((t) => t.visible);
    if (currentVisible.length > limit) {
      const excess = currentVisible.slice(0, currentVisible.length - limit);
      excess.forEach((t) => toast.dismiss(t.id));
    }
  }, [toasts, limit]);

  return null;
};

Sentry.init({
  dsn: "https://c54b8cf774cb2826aa57147a8d5e847c@o4511610232438784.ingest.us.sentry.io/4511610238402560",
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: []
  },
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  // Tracing
  tracesSampleRate: 0.05, // Capture 5% of the transactions in production
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.01, // Sample 1% of sessions in production
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  // Enable logs to be sent to Sentry
  enableLogs: true
});

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    logError({
      error,
      message: error?.message || 'Component crash',
      componentName: 'ErrorBoundary',
      severity: 'fatal',
      additionalInfo: { errorInfo }
    })
  }

  render() {
    if (this.state.hasError) {
      const isChunkReload = this.state.error?.isChunkReload;
      if (isChunkReload) {
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            textAlign: 'center',
            background: '#070709',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Custom Animations & Styles */}
            <style>{`
              @keyframes progressLoad {
                0% { left: -40%; }
                100% { left: 110%; }
              }
              @keyframes pulseSlow {
                0%, 100% { opacity: 0.15; transform: scale(1) translate(-50%, -50%); }
                50% { opacity: 0.3; transform: scale(1.15) translate(-50%, -50%); }
              }
              .main-ambient-glow {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 350px;
                height: 350px;
                background: radial-gradient(circle, rgba(255,42,68,0.15) 0%, rgba(255,42,68,0) 70%);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1;
                animation: pulseSlow 4s ease-in-out infinite;
              }
              .main-progress-track {
                width: 100%;
                max-width: 240px;
                background: rgba(255, 255, 255, 0.05);
                height: 5px;
                border-radius: 10px;
                overflow: hidden;
                position: relative;
                margin-top: 24px;
                border: 1px solid rgba(255, 255, 255, 0.05);
              }
              .main-progress-bar {
                position: absolute;
                top: 0;
                bottom: 0;
                width: 40%;
                background: linear-gradient(90deg, #ff2a44 0%, #ff5268 50%, #00e676 100%);
                border-radius: 10px;
                animation: progressLoad 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              }
              .brand-glow-card {
                position: relative;
                z-index: 10;
                background: rgba(18, 18, 20, 0.6);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 32px;
                padding: 32px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                display: flex;
                flex-direction: column;
                align-items: center;
                max-width: 320px;
                width: 100%;
              }
              .spinning-circles-container {
                position: relative;
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 24px;
              }
              .spinning-outer-ring {
                width: 72px;
                height: 72px;
                border-radius: 20px;
                border: 2px dashed rgba(255, 42, 68, 0.35);
                animation: spin 8s linear infinite;
              }
              .spinning-inner-ring {
                position: absolute;
                width: 56px;
                height: 56px;
                border-radius: 14px;
                border: 1px dashed rgba(0, 230, 118, 0.4);
                animation: spin 6s linear infinite reverse;
              }
              .brand-inner-core {
                position: absolute;
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #ff2a44 0%, #e11d48 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 20px rgba(255, 42, 68, 0.3);
              }
              .brand-icon-logo {
                width: 20px;
                height: 20px;
                background: white;
                mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2050/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m2 7 4.41-3.67A2 2 0 0 1 7.73 3h8.54a2 2 0 0 1 1.32.33L22 7'/><path d='M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8'/><path d='M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4'/></svg>") no-repeat center;
                -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m2 7 4.41-3.67A2 2 0 0 1 7.73 3h8.54a2 2 0 0 1 1.32.33L22 7'/><path d='M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8'/><path d='M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4'/></svg>") no-repeat center;
              }
            `}</style>

            <div className="main-ambient-glow" />

            <div className="brand-glow-card">
              {/* Animated Rings */}
              <div className="spinning-circles-container">
                <div className="spinning-outer-ring" />
                <div className="spinning-inner-ring" />
                <div className="brand-inner-core">
                  <div className="brand-icon-logo" />
                </div>
              </div>

              {/* Tag / Brand */}
              <div style={{
                background: 'rgba(255, 42, 68, 0.1)',
                border: '1px solid rgba(255, 42, 68, 0.2)',
                color: '#ff2a44',
                fontSize: '10px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                padding: '4px 12px',
                borderRadius: '9999px',
                marginBottom: '12px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}>
                OZO UPDATE
              </div>

              <h2 style={{ fontSize: '16px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', color: 'white' }}>
                Updating Ozo
              </h2>

              <p style={{ fontSize: '11px', fontWeight: '600', color: '#a1a1aa', margin: '0 auto', lineHeight: '1.5', maxWidth: '220px' }}>
                Installing the latest features and security updates...
              </p>

              {/* Progress Tracker */}
              <div className="main-progress-track">
                <div className="main-progress-bar" />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
          background: '#0a0a0a',
          color: 'white',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            background: 'rgba(226, 55, 68, 0.1)',
            padding: '2rem',
            borderRadius: '2.5rem',
            border: '1px solid rgba(226, 55, 68, 0.2)',
            maxWidth: '400px',
            width: '100%'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#E23744',
              borderRadius: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem',
              boxShadow: '0 20px 40px rgba(226, 55, 68, 0.3)'
            }}>
              <AlertCircle size={40} color="white" strokeWidth={2.5} />
            </div>
            
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Oops!</h1>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', opacity: 0.9 }}>Something went wrong</h2>
            <p style={{ marginBottom: '2.5rem', opacity: 0.6, fontSize: '0.9rem', lineHeight: '1.6' }}>
              We're sorry for the inconvenience. Our team has been notified. Please try refreshing the page.
            </p>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '16px',
                fontSize: '0.9rem',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                border: 'none',
                borderRadius: '1.2rem',
                background: '#E23744',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 10px 20px rgba(226, 55, 68, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 15px 30px rgba(226, 55, 68, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 10px 20px rgba(226, 55, 68, 0.2)'
              }}
            >
              <RefreshCcw size={20} strokeWidth={3} />
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Render App
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastLimitController />
      <App />
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            letterSpacing: '0.01em',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
            style: {
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#fff',
            },
            style: {
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
              border: '1px solid rgba(244, 63, 94, 0.15)',
            },
          },
          loading: {
            iconTheme: {
              primary: '#f59e0b',
              secondary: '#fff',
            },
            style: {
              background: '#1a1a1a',
              border: '1px solid rgba(245, 158, 11, 0.15)',
            },
          },
        }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <div 
                onClick={() => toast.dismiss(t.id)} 
                className="flex items-center gap-2 cursor-pointer select-none active:scale-[0.99] transition-transform duration-100"
                style={{ width: '100%' }}
              >
                {icon}
                {message}
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
    </ErrorBoundary>
  </React.StrictMode>,
)