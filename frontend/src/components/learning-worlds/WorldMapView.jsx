import { useState, useRef, useEffect } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { useAudioManager } from '../../hooks/useAudioManager'

/**
 * World Map View Component
 *
 * A zoomable, pannable map showing all lands in a world.
 * - Click/tap a land to zoom in and navigate
 * - Smooth CSS transitions for navigation
 * - Large touch targets for young learners
 */
export default function WorldMapView({ world, onSelectLand, ageLevel = 2 }) {
  const transformRef = useRef(null)
  const { playTap, playWhoosh } = useAudioManager()
  const [selectedLand, setSelectedLand] = useState(null)
  const [isZooming, setIsZooming] = useState(false)

  // Touch target sizes based on age level
  const touchTargetSize = ageLevel === 1 ? 80 : ageLevel === 2 ? 64 : 48

  // Get world lands (mock data if not available)
  const lands = world.lands || []

  function handleLandClick(land) {
    if (isZooming) return

    playTap()
    setSelectedLand(land)
    setIsZooming(true)

    // Zoom to land position
    if (transformRef.current) {
      const scale = 2
      const x = -(land.map_position_x / 100) * window.innerWidth * (scale - 1)
      const y = -(land.map_position_y / 100) * window.innerHeight * (scale - 1)

      transformRef.current.setTransform(x, y, scale, 800, 'easeInOut')
    }

    // Navigate after zoom animation
    setTimeout(() => {
      playWhoosh?.()
      onSelectLand(land.id)
    }, 900)
  }

  // Reset zoom when coming back to map
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform()
    }
    setSelectedLand(null)
    setIsZooming(false)
  }, [])

  return (
    <div className="w-full h-screen overflow-hidden relative">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: world.map_background_color || '#87CEEB',
          backgroundImage: world.map_background_url ? `url(${world.map_background_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Decorative clouds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
      </div>

      {/* World Title */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg text-center">
          {world.name}
        </h1>
      </div>

      {/* Zoomable Map Container */}
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.5}
        maxScale={3}
        centerOnInit
        limitToBounds={false}
        disabled={isZooming}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <div className="relative w-full h-full">
            {/* Land Icons */}
            {lands.map(land => (
              <LandIcon
                key={land.id}
                land={land}
                size={touchTargetSize}
                onClick={() => handleLandClick(land)}
                isSelected={selectedLand?.id === land.id}
                ageLevel={ageLevel}
              />
            ))}

            {/* No lands message */}
            {lands.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center max-w-md">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">No Lands Yet</h2>
                  <p className="text-gray-600">
                    This world is empty. Add lands in the editor to get started.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* Instructions (for young learners) */}
      {ageLevel === 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
          <p className="text-lg text-gray-700 font-medium flex items-center gap-2">
            <span className="text-2xl">👆</span>
            Tap a place to explore!
          </p>
        </div>
      )}

      {/* Cloud Animation Styles */}
      <style>{`
        .cloud {
          position: absolute;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 100px;
          animation: float 20s infinite ease-in-out;
        }
        .cloud::before,
        .cloud::after {
          content: '';
          position: absolute;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
        }
        .cloud-1 {
          width: 200px;
          height: 60px;
          top: 15%;
          left: -10%;
          animation-delay: 0s;
        }
        .cloud-2 {
          width: 150px;
          height: 50px;
          top: 25%;
          left: 60%;
          animation-delay: 5s;
        }
        .cloud-3 {
          width: 180px;
          height: 55px;
          top: 10%;
          left: 30%;
          animation-delay: 10s;
        }
        @keyframes float {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(100vw);
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Land Icon Component
 *
 * Represents a land on the world map.
 * Large, colorful, and easy to tap for young learners.
 */
function LandIcon({ land, size, onClick, isSelected, ageLevel }) {
  const [isHovered, setIsHovered] = useState(false)

  // Default icons for lands without custom icons
  const defaultIcons = {
    'animals': '🦁',
    'colors': '🌈',
    'food': '🍎',
    'numbers': '🔢',
    'shapes': '⭐',
    'weather': '☀️',
    'family': '👨‍👩‍👧‍👦',
    'body': '🖐️',
    'clothes': '👕',
    'school': '📚'
  }

  const landIcon = land.icon_url || defaultIcons[land.slug?.split('-')[0]] || '🏝️'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-4 focus:ring-yellow-400 rounded-full
        ${isSelected ? 'scale-125 z-20' : isHovered ? 'scale-110 z-10' : 'z-0'}
      `}
      style={{
        left: `${land.map_position_x || 50}%`,
        top: `${land.map_position_y || 50}%`,
        width: size * 1.8,
        height: size * 1.8
      }}
    >
      {/* Glow effect */}
      <div
        className={`
          absolute inset-0 rounded-full
          transition-opacity duration-300
          ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)',
          transform: 'scale(1.5)'
        }}
      />

      {/* Icon Container */}
      <div
        className={`
          w-full h-full rounded-full
          bg-white shadow-lg border-4
          flex items-center justify-center
          transition-all duration-300
          ${isSelected ? 'border-yellow-400' : 'border-white'}
        `}
        style={{
          boxShadow: isHovered
            ? '0 8px 30px rgba(0,0,0,0.2), 0 0 20px rgba(255,215,0,0.3)'
            : '0 4px 15px rgba(0,0,0,0.1)'
        }}
      >
        {land.icon_url ? (
          <img
            src={land.icon_url}
            alt={land.name}
            className="w-3/4 h-3/4 object-contain"
          />
        ) : (
          <span style={{ fontSize: size * 0.7 }}>{landIcon}</span>
        )}
      </div>

      {/* Land Name Label */}
      <div
        className={`
          absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full
          bg-white rounded-lg px-3 py-1 shadow-md
          whitespace-nowrap
          transition-all duration-300
          ${isHovered || ageLevel === 1 ? 'opacity-100' : 'opacity-80'}
        `}
      >
        <span
          className="font-bold text-gray-800"
          style={{ fontSize: ageLevel === 1 ? '1rem' : '0.875rem' }}
        >
          {land.name}
        </span>
      </div>

      {/* Activity count badge */}
      {land.activity_count > 0 && (
        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
          {land.activity_count}
        </div>
      )}

      {/* Locked indicator */}
      {land.is_locked && (
        <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
          <span className="text-2xl">🔒</span>
        </div>
      )}
    </button>
  )
}
