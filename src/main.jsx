import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from "@sentry/react"
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'
import './lib/firebase'

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
            background: '#0a0a0a',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-ozo-red/20 border-t-ozo-red rounded-full animate-spin" />
              <div className="absolute w-8 h-8 border-4 border-ozo-green/20 border-b-ozo-green rounded-full animate-spin [animation-direction:reverse] [animation-duration:1s]" />
            </div>
            <p className="mt-6 text-gray-400 text-xs font-black uppercase tracking-widest animate-pulse notranslate" translate="no">
              Updating OZO to the latest version...
            </p>
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
      />
    </ErrorBoundary>
  </React.StrictMode>,
)