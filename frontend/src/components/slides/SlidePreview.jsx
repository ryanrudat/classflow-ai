/**
 * SlidePreview - Miniature preview of a slide
 * Shows how the slide will appear to students
 */
export default function SlidePreview({ slide, isActive = false, onClick }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  return (
    <div
      onClick={onClick}
      className={`relative bg-white border-2 rounded-lg p-4 cursor-pointer transition-all ${
        isActive
          ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      {/* Slide number badge */}
      <div className="absolute -top-2 -left-2 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow">
        {slide.slideNumber}
      </div>

      {/* Slide content preview */}
      <div className="space-y-2">
        {/* Title */}
        {slide.title && (
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {slide.title}
          </h3>
        )}

        {/* Body (truncated) */}
        {slide.body && (
          <div
            className="text-xs text-gray-600 line-clamp-2 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: slide.body }}
          />
        )}

        {/* Image thumbnail */}
        {slide.image && (
          <div className="mt-2">
            <img
              src={`${API_URL}${slide.image.url}`}
              alt={slide.image.alt || ''}
              className="w-full h-16 object-cover rounded"
            />
          </div>
        )}

        {/* Question indicator */}
        {slide.question && (
          <div className="flex items-center gap-1 text-xs text-blue-600 mt-2">
            <span>❓</span>
            <span className="font-medium">Question</span>
          </div>
        )}

        {/* Type badge */}
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs px-2 py-1 rounded ${
            slide.type === 'title' ? 'bg-purple-100 text-purple-700' :
            slide.type === 'content' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {slide.type}
          </span>

          {/* Difficulty badge for variants */}
          {slide.difficultyLevel && slide.difficultyLevel !== 'medium' && (
            <span className={`text-xs px-2 py-1 rounded ${
              slide.difficultyLevel === 'easy' ? 'bg-green-100 text-green-700' :
              slide.difficultyLevel === 'hard' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {slide.difficultyLevel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
