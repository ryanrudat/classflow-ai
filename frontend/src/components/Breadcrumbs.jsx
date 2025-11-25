import { Link } from 'react-router-dom'

/**
 * Breadcrumbs Component
 * Provides navigation context and location awareness for sub-pages
 *
 * @param {Array} items - Array of breadcrumb items: { label: string, path?: string }
 *   The last item is treated as current page (no link)
 */
export default function Breadcrumbs({ items = [] }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-2 text-sm">
        {/* Home/Dashboard link */}
        <li className="flex items-center">
          <Link
            to="/dashboard"
            className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="sr-only">Dashboard</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center">
              {/* Separator */}
              <svg
                className="w-4 h-4 text-gray-400 mx-1"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>

              {isLast ? (
                // Current page - no link, bold text
                <span
                  className="font-medium text-gray-900"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                // Ancestor page - link
                <Link
                  to={item.path}
                  className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
