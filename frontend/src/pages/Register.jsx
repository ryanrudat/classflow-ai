import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authAPI } from '../services/api'
import { FieldError } from '../components/ErrorMessages'
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    school: ''
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const setAuth = useAuthStore(state => state.setAuth)

  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
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
      const { user, token } = await authAPI.register(formData)
      setAuth(user, token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ''
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12">
      <div className="card w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Create Account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input-field ${fieldErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
              autoComplete="name"
              disabled={loading}
              aria-invalid={fieldErrors.name ? 'true' : 'false'}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            />
            {fieldErrors.name && <FieldError message={fieldErrors.name} />}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`input-field ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              autoComplete="email"
              disabled={loading}
              aria-invalid={fieldErrors.email ? 'true' : 'false'}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`input-field ${fieldErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
              autoComplete="new-password"
              disabled={loading}
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              aria-describedby="password-requirements"
            />
            {fieldErrors.password && <FieldError message={fieldErrors.password} />}
            <PasswordStrengthIndicator password={formData.password} />
            <p id="password-requirements" className="mt-1 text-xs text-gray-500">
              Minimum 6 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School (Optional)
            </label>
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleChange}
              className="input-field"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
