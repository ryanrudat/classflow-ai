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
      duration: toast.duration ?? 2500,  // Reduced from 5000ms to 2500ms
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
 * Individual Toast Item - Compact design
 */
function ToastItem({ toast, onDismiss }) {
  const styles = {
    success: {
      container: 'bg-white border-l-2 border-green-500',
      icon: '✓',
      iconClass: 'text-green-600'
    },
    error: {
      container: 'bg-white border-l-2 border-red-500',
      icon: '✕',
      iconClass: 'text-red-600'
    },
    warning: {
      container: 'bg-white border-l-2 border-yellow-500',
      icon: '!',
      iconClass: 'text-yellow-600'
    },
    info: {
      container: 'bg-white border-l-2 border-blue-500',
      icon: 'i',
      iconClass: 'text-blue-600'
    }
  }

  const style = styles[toast.type] || styles.info

  return (
    <div
      className={`${style.container} rounded shadow-md px-3 py-2 animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span className={`${style.iconClass} font-bold text-sm`}>{style.icon}</span>
        <span className="text-gray-700 text-sm flex-1">
          {toast.message || toast.title}
        </span>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
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
