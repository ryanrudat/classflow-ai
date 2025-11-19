import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

/**
 * Navigation Component
 * Persistent top navigation bar for authenticated users
 */
export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  // Don't show nav on login/register pages or student-only pages
  const hideNavRoutes = ['/login', '/register', '/join']
  const isStudentJoinRoute = location.pathname.startsWith('/join')

  if (!user || hideNavRoutes.includes(location.pathname) || isStudentJoinRoute) {
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path)
  }

  const navLinkClass = (path) => {
    const baseClass = "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    return isActive(path)
      ? `${baseClass} bg-blue-600 text-white`
      : `${baseClass} text-gray-700 hover:bg-gray-100`
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="hidden sm:inline">ClassFlow AI</span>
            </Link>

            {/* Main Navigation Links */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/dashboard"
                className={navLinkClass('/dashboard')}
                aria-current={isActive('/dashboard') ? 'page' : undefined}
              >
                Dashboard
              </Link>
              <Link
                to="/library"
                className={navLinkClass('/library')}
                aria-current={isActive('/library') ? 'page' : undefined}
              >
                Library
              </Link>
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3 pt-2 flex gap-2">
          <Link
            to="/dashboard"
            className={`${navLinkClass('/dashboard')} flex-1 text-center`}
            aria-current={isActive('/dashboard') ? 'page' : undefined}
          >
            Dashboard
          </Link>
          <Link
            to="/library"
            className={`${navLinkClass('/library')} flex-1 text-center`}
            aria-current={isActive('/library') ? 'page' : undefined}
          >
            Library
          </Link>
        </div>
      </div>
    </nav>
  )
}
