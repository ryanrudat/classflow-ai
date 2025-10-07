import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authAPI } from '../services/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const setAuth = useAuthStore(state => state.setAuth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
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
      // Try to login, if fails, register first then login
      try {
        const { user, token } = await authAPI.login('demo@classflow.ai', 'demo123')
        setAuth(user, token)
        navigate('/dashboard')
      } catch (loginErr) {
        // If login fails, register the demo account
        if (loginErr.response?.status === 401) {
          await authAPI.register({
            name: 'Demo Teacher',
            email: 'demo@classflow.ai',
            password: 'demo123',
            school: 'Demo School'
          })
          // Then login
          const { user, token } = await authAPI.login('demo@classflow.ai', 'demo123')
          setAuth(user, token)
          navigate('/dashboard')
        } else {
          throw loginErr
        }
      }
    } catch (err) {
      setError('Demo login failed. Please try manual login.')
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
              disabled={loading}
            />
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
