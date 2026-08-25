/**
 * DiscoveryPopup Component
 *
 * Shows when a student discovers a new vocabulary item.
 * Displays the word prominently with the image and optional response text.
 */
export default function DiscoveryPopup({
  word,
  imageUrl,
  responseText,
  isNew = true,
  onClose,
  ageLevel = 2
}) {
  // Sizing based on age level
  const wordSize = ageLevel === 1 ? 'text-5xl' : ageLevel === 2 ? 'text-4xl' : 'text-3xl'
  const responseSize = ageLevel === 1 ? 'text-xl' : ageLevel === 2 ? 'text-lg' : 'text-base'

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Popup content */}
      <div
        className="relative bg-white rounded-3xl p-8 shadow-2xl transform animate-popIn max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* New discovery badge */}
        {isNew && (
          <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-sm shadow-lg animate-bounce">
            NEW! ⭐
          </div>
        )}

        {/* Image */}
        {imageUrl && (
          <div className="flex justify-center mb-4">
            <img
              src={imageUrl}
              alt={word}
              className="w-32 h-32 object-contain animate-itemReveal"
            />
          </div>
        )}

        {/* Word - large and prominent */}
        <h2
          className={`${wordSize} font-bold text-center text-gray-800 mb-2 animate-wordReveal`}
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        >
          {word?.toUpperCase()}
        </h2>

        {/* Response text (optional) */}
        {responseText && (
          <p className={`${responseSize} text-center text-gray-600 italic animate-fadeInUp`}>
            "{responseText}"
          </p>
        )}

        {/* Touch to continue hint */}
        <p className="text-center text-gray-400 text-sm mt-4 animate-fadeIn">
          Tap anywhere to continue
        </p>

        {/* Sparkle decorations */}
        <div className="absolute top-4 left-4 text-2xl animate-sparkle">✨</div>
        <div className="absolute bottom-4 right-4 text-2xl animate-sparkle" style={{ animationDelay: '0.3s' }}>✨</div>

        <style>{`
          @keyframes popIn {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.05); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes itemReveal {
            0% { transform: scale(0) rotate(-10deg); opacity: 0; }
            60% { transform: scale(1.1) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes wordReveal {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes fadeInUp {
            0% { transform: translateY(10px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes sparkle {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
            50% { transform: scale(1.2) rotate(180deg); opacity: 0.7; }
          }
          .animate-popIn { animation: popIn 0.4s ease-out; }
          .animate-itemReveal { animation: itemReveal 0.5s ease-out 0.1s both; }
          .animate-wordReveal { animation: wordReveal 0.4s ease-out 0.2s both; }
          .animate-fadeInUp { animation: fadeInUp 0.4s ease-out 0.3s both; }
          .animate-fadeIn { animation: fadeIn 0.4s ease-out 0.5s both; }
          .animate-sparkle { animation: sparkle 1s ease-in-out infinite; }
        `}</style>
      </div>
    </div>
  )
}
