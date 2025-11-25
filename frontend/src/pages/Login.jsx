import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authAPI } from '../services/api'
import { FieldError } from '../components/ErrorMessages'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const setAuth = useAuthStore(state => state.setAuth)

  const validateForm = () => {
    const errors = {}

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { user, token } = await authAPI.login(email, password)
      setAuth(user, token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setEmail('demo@classflow.ai')
    setPassword('demo123')
    setError('')
    setLoading(true)

    try {
      // Try to login with demo credentials
      try {
        const { user, token } = await authAPI.login('demo@classflow.ai', 'demo123')
        setAuth(user, token)
        navigate('/dashboard')
        return
      } catch (loginErr) {
        console.log('Demo login attempt failed, trying to create account:', loginErr.response?.status)

        // If login fails due to invalid credentials (401), try to register
        if (loginErr.response?.status === 401 || loginErr.response?.status === 404) {
          try {
            // Try to register demo account
            await authAPI.register({
              name: 'Demo Teacher',
              email: 'demo@classflow.ai',
              password: 'demo123',
              school: 'Demo School'
            })
            console.log('Demo account created successfully')
          } catch (registerErr) {
            // If registration fails because account exists, that's fine - continue to login
            if (registerErr.response?.status !== 409 && registerErr.response?.status !== 400) {
              console.error('Registration error:', registerErr)
              throw new Error(`Failed to create demo account: ${registerErr.response?.data?.message || registerErr.message}`)
            }
            console.log('Demo account already exists, continuing to login')
          }

          // Now try login again (account should exist now)
          const { user, token } = await authAPI.login('demo@classflow.ai', 'demo123')
          setAuth(user, token)
          navigate('/dashboard')
        } else {
          throw loginErr
        }
      }
    } catch (err) {
      console.error('Demo login error:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Demo login failed'
      setError(`Demo login failed: ${errorMessage}. Please try manual login or contact support.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="card w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          ClassFlow AI
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' })
              }}
              className={`input-field ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              autoComplete="email"
              disabled={loading}
              aria-invalid={fieldErrors.email ? 'true' : 'false'}
            />
            {fieldErrors.email && <FieldError message={fieldErrors.email} />}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' })
              }}
              className={`input-field ${fieldErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
              autoComplete="current-password"
              disabled={loading}
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
            />
            {fieldErrors.password && <FieldError message={fieldErrors.password} />}
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={handleDemoLogin}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            disabled={loading}
          >
            🚀 Quick Demo Login
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Instantly login with demo account (auto-creates if needed)
          </p>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
