import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope)

        // Handle updates safely
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New content available, page will refresh...')
              // Optionally auto-refresh or notify user
            }
          })
        })

        // Check for updates periodically with error handling
        setInterval(() => {
          registration.update().catch(err => {
            // Silently ignore update check failures
            console.debug('Service Worker update check skipped:', err.message)
          })
        }, 60000) // Check every minute
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error)
      })
  })
}
