import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * Toast Context for managing toast notifications globally
 */
const ToastContext = createContext()

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

/**
 * Toast Provider Component
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    const newToast = {
      id,
      type: toast.type || 'info',
      title: toast.title,
      message: toast.message,
      duration: toast.duration || 5000,
      action: toast.action,
      onAction: toast.onAction
    }

    setToasts(prev => [...prev, newToast])

    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  // Convenience methods
  const toast = {
    success: (title, message, options = {}) =>
      addToast({ type: 'success', title, message, ...options }),
    error: (title, message, options = {}) =>
      addToast({ type: 'error', title, message, ...options }),
    warning: (title, message, options = {}) =>
      addToast({ type: 'warning', title, message, ...options }),
    info: (title, message, options = {}) =>
      addToast({ type: 'info', title, message, ...options }),
    custom: (toast) => addToast(toast),
    dismiss: (id) => removeToast(id)
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

/**
 * Toast Container - renders all active toasts
 */
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-md">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  )
}

/**
 * Individual Toast Item
 */
function ToastItem({ toast, onDismiss }) {
  const styles = {
    success: {
      container: 'bg-white border-green-500 shadow-lg',
      icon: '✅',
      iconBg: 'bg-green-100 text-green-600',
      progressBar: 'bg-green-500'
    },
    error: {
      container: 'bg-white border-red-500 shadow-lg',
      icon: '❌',
      iconBg: 'bg-red-100 text-red-600',
      progressBar: 'bg-red-500'
    },
    warning: {
      container: 'bg-white border-yellow-500 shadow-lg',
      icon: '⚠️',
      iconBg: 'bg-yellow-100 text-yellow-600',
      progressBar: 'bg-yellow-500'
    },
    info: {
      container: 'bg-white border-blue-500 shadow-lg',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100 text-blue-600',
      progressBar: 'bg-blue-500'
    }
  }

  const style = styles[toast.type] || styles.info

  return (
    <div
      className={`${style.container} rounded-lg border-l-4 p-4 animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={`${style.iconBg} rounded-full p-2 flex-shrink-0`}>
          <span className="text-lg">{style.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="font-semibold text-gray-900 text-sm mb-0.5">
              {toast.title}
            </h4>
          )}
          {toast.message && (
            <p className="text-gray-700 text-sm">{toast.message}</p>
          )}
          {toast.action && toast.onAction && (
            <button
              onClick={() => {
                toast.onAction()
                onDismiss()
              }}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {toast.action}
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Progress bar for auto-dismiss */}
      {toast.duration > 0 && (
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${style.progressBar} animate-shrink-width`}
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Hook for common toast notifications
 */
export function useNotifications() {
  const toast = useToast()

  return {
    // Success notifications
    notifySuccess: (message) => toast.success('Success', message),
    notifySessionCreated: () => toast.success('Session Created', 'Your session has been created successfully.'),
    notifyActivityPushed: () => toast.success('Activity Pushed', 'Content has been sent to all students.'),
    notifyStudentJoined: (studentName) => toast.info('Student Joined', `${studentName} has joined the session.`),
    notifyContentGenerated: () => toast.success('Content Generated', 'AI has finished generating your content.'),

    // Error notifications
    notifyError: (message) => toast.error('Error', message),
    notifyNetworkError: () => toast.error('Connection Error', 'Unable to connect. Please check your internet.'),
    notifyGenerationFailed: () => toast.error('Generation Failed', 'Could not generate content. Please try again.'),

    // Warning notifications
    notifyWarning: (message) => toast.warning('Warning', message),
    notifySessionEnding: () => toast.warning('Session Ending', 'This session will end in 5 minutes.'),

    // Info notifications
    notifyInfo: (message) => toast.info('Info', message),
    notifyStudentLeft: (studentName) => toast.info('Student Left', `${studentName} has left the session.`),

    // Custom toast
    notify: toast.custom,
    dismiss: toast.dismiss
  }
}
