import { useState, useRef, useEffect } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { useAudioManager } from '../../hooks/useAudioManager'

/**
 * World Map View Component
 *
 * An immersive, living world map with:
 * - Illustrated backgrounds with gradients
 * - Floating clouds, birds, and sparkles
 * - Land icons as floating islands
 * - Smooth zoom transitions when selecting a land
 */
export default function WorldMapView({ world, onSelectLand, ageLevel = 2 }) {
  const transformRef = useRef(null)
  const { playTap } = useAudioManager()
  const [selectedLand, setSelectedLand] = useState(null)
  const [isZooming, setIsZooming] = useState(false)

  // Touch target sizes based on age level
  const touchTargetSize = ageLevel === 1 ? 120 : ageLevel === 2 ? 100 : 80

  // Get world lands
  const lands = world?.lands || []

  // Theme colors based on world theme
  const themes = {
    fantasy: {
      skyTop: '#1a1a3e',
      skyMiddle: '#4a3f7a',
      skyBottom: '#f0a070',
      ground: '#2d5a27',
      accent: '#ffd700'
    },
    ocean: {
      skyTop: '#0c4a6e',
      skyMiddle: '#0ea5e9',
      skyBottom: '#7dd3fc',
      ground: '#059669',
      accent: '#22d3ee'
    },
    forest: {
      skyTop: '#134e4a',
      skyMiddle: '#2dd4bf',
      skyBottom: '#a7f3d0',
      ground: '#166534',
      accent: '#86efac'
    },
    space: {
      skyTop: '#030712',
      skyMiddle: '#1e1b4b',
      skyBottom: '#312e81',
      ground: '#4c1d95',
      accent: '#c4b5fd'
    },
    default: {
      skyTop: '#1e3a5f',
      skyMiddle: '#3b82f6',
      skyBottom: '#93c5fd',
      ground: '#22c55e',
      accent: '#fbbf24'
    }
  }

  const theme = themes[world?.theme] || themes.default

  function handleLandClick(land) {
    if (isZooming) return

    playTap()
    setSelectedLand(land)
    setIsZooming(true)

    // Zoom to land position
    if (transformRef.current) {
      const scale = 2.5
      // Calculate center position for the land
      const xOffset = (land.map_position_x - 50) / 100
      const yOffset = (land.map_position_y - 50) / 100

      transformRef.current.setTransform(
        -xOffset * window.innerWidth * scale,
        -yOffset * window.innerHeight * scale,
        scale,
        1000,
        'easeInOut'
      )
    }

    // Navigate after zoom animation
    setTimeout(() => {
      onSelectLand(land.id)
      // Reset after navigation
      setTimeout(() => {
        if (transformRef.current) {
          transformRef.current.resetTransform(0)
        }
        setSelectedLand(null)
        setIsZooming(false)
      }, 100)
    }, 1100)
  }

  return (
    <div className="w-full h-screen overflow-hidden relative">
      {/* Gradient Sky Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            ${theme.skyTop} 0%,
            ${theme.skyMiddle} 40%,
            ${theme.skyBottom} 70%,
            ${theme.ground} 100%
          )`
        }}
      />

      {/* Twinkling Stars (visible in darker themes) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute bg-white rounded-full animate-twinkle"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 40}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.6
            }}
          />
        ))}
      </div>

      {/* Sun/Moon */}
      <div className="absolute top-[8%] right-[15%] pointer-events-none">
        <div
          className="w-20 h-20 md:w-28 md:h-28 rounded-full animate-float-slow"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #fff8dc, #ffd700, #ffa500)',
            boxShadow: '0 0 60px rgba(255, 215, 0, 0.5), 0 0 120px rgba(255, 165, 0, 0.3)'
          }}
        />
      </div>

      {/* Animated Clouds - Multiple Layers for Depth */}
      <CloudLayer />

      {/* Flying Birds */}
      <BirdFlock />

      {/* Floating Particles/Sparkles */}
      <Sparkles color={theme.accent} />

      {/* Rolling Hills in Foreground */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 320" className="w-full" preserveAspectRatio="none">
          <path
            fill={theme.ground}
            fillOpacity="0.3"
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          <path
            fill={theme.ground}
            fillOpacity="0.5"
            d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>

      {/* World Title with Fancy Styling */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="relative">
          <h1
            className="text-3xl md:text-5xl font-bold text-white text-center px-6 py-3"
            style={{
              textShadow: '0 2px 10px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {world?.name || 'Learning World'}
          </h1>
          {/* Decorative underline */}
          <div
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-1 rounded-full"
            style={{
              width: '60%',
              background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`
            }}
          />
        </div>
      </div>

      {/* Zoomable Map Container */}
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.8}
        maxScale={3}
        centerOnInit
        limitToBounds={false}
        disabled={isZooming}
        panning={{ disabled: isZooming }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%', position: 'relative' }}
        >
          {/* Land Icons */}
          {lands.map((land, index) => (
            <FloatingIsland
              key={land.id}
              land={land}
              size={touchTargetSize}
              onClick={() => handleLandClick(land)}
              isSelected={selectedLand?.id === land.id}
              ageLevel={ageLevel}
              delay={index * 0.5}
              accentColor={theme.accent}
            />
          ))}

          {/* No lands message */}
          {lands.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 text-center max-w-md shadow-2xl border-4 border-white/50">
                <div className="text-6xl mb-4">🌍</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">No Lands Yet</h2>
                <p className="text-gray-600">
                  This world is waiting for lands to explore!
                </p>
              </div>
            </div>
          )}
        </TransformComponent>
      </TransformWrapper>

      {/* Instructions for young learners */}
      {ageLevel === 1 && !isZooming && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div
            className="bg-white/95 backdrop-blur-sm rounded-full px-8 py-4 shadow-xl animate-bounce-gentle"
            style={{ border: `3px solid ${theme.accent}` }}
          >
            <p className="text-xl text-gray-700 font-bold flex items-center gap-3">
              <span className="text-3xl">👆</span>
              Tap a place to explore!
            </p>
          </div>
        </div>
      )}

      {/* Zoom Transition Overlay */}
      {isZooming && (
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
          <div className="text-4xl animate-pulse">✨</div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-island {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-5px); }
        }
        .animate-twinkle {
          animation: twinkle 2s infinite ease-in-out;
        }
        .animate-float-slow {
          animation: float-slow 6s infinite ease-in-out;
        }
        .animate-float-island {
          animation: float-island 4s infinite ease-in-out;
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Cloud Layer - Multiple animated clouds at different speeds
 */
function CloudLayer() {
  const clouds = [
    { width: 180, height: 60, top: '12%', left: '-15%', duration: 45, delay: 0 },
    { width: 220, height: 70, top: '8%', left: '20%', duration: 55, delay: 10 },
    { width: 160, height: 50, top: '18%', left: '50%', duration: 40, delay: 5 },
    { width: 200, height: 65, top: '25%', left: '-10%', duration: 50, delay: 15 },
    { width: 140, height: 45, top: '15%', left: '70%', duration: 35, delay: 20 },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {clouds.map((cloud, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: cloud.width,
            height: cloud.height,
            top: cloud.top,
            left: cloud.left,
            animation: `cloud-float ${cloud.duration}s linear infinite`,
            animationDelay: `${cloud.delay}s`
          }}
        >
          <svg viewBox="0 0 200 80" className="w-full h-full">
            <ellipse cx="60" cy="50" rx="50" ry="25" fill="rgba(255,255,255,0.8)" />
            <ellipse cx="100" cy="45" rx="60" ry="30" fill="rgba(255,255,255,0.9)" />
            <ellipse cx="150" cy="50" rx="45" ry="22" fill="rgba(255,255,255,0.8)" />
            <ellipse cx="80" cy="35" rx="30" ry="20" fill="rgba(255,255,255,0.95)" />
            <ellipse cx="130" cy="35" rx="35" ry="18" fill="rgba(255,255,255,0.9)" />
          </svg>
        </div>
      ))}
      <style>{`
        @keyframes cloud-float {
          0% { transform: translateX(0); }
          100% { transform: translateX(120vw); }
        }
      `}</style>
    </div>
  )
}

/**
 * Flying Birds - Small birds moving across the sky
 */
function BirdFlock() {
  const birds = [
    { top: '15%', duration: 20, delay: 0 },
    { top: '22%', duration: 25, delay: 8 },
    { top: '10%', duration: 18, delay: 4 },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {birds.map((bird, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: bird.top,
            left: '-5%',
            animation: `bird-fly ${bird.duration}s linear infinite`,
            animationDelay: `${bird.delay}s`
          }}
        >
          <div className="flex gap-3">
            {[0, 1, 2].map(j => (
              <svg key={j} width="20" height="10" viewBox="0 0 20 10" className="animate-bird-flap" style={{ animationDelay: `${j * 0.1}s` }}>
                <path d="M0 5 Q5 0 10 5 Q15 0 20 5" stroke="#333" strokeWidth="2" fill="none" />
              </svg>
            ))}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes bird-fly {
          0% { transform: translateX(0); }
          100% { transform: translateX(110vw); }
        }
        @keyframes bird-flap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.7); }
        }
        .animate-bird-flap {
          animation: bird-flap 0.3s infinite ease-in-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Floating Sparkles/Particles
 */
function Sparkles({ color }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-sparkle-float"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `${Math.random() * 30}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${4 + Math.random() * 3}s`
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes sparkle-float {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
            transform: translateY(-20vh) scale(1);
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(-80vh) scale(0.5);
            opacity: 0;
          }
        }
        .animate-sparkle-float {
          animation: sparkle-float 5s infinite ease-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Floating Island - A land represented as a floating island
 */
function FloatingIsland({ land, size, onClick, isSelected, ageLevel, delay, accentColor }) {
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
    'school': '📚',
    'nature': '🌳',
    'ocean': '🐠',
    'space': '🚀'
  }

  const landIcon = land.icon_url || defaultIcons[land.slug?.split('-')[0]] || '🏝️'

  // Island colors based on land name/type
  const islandColors = {
    'animals': { base: '#8B4513', grass: '#228B22', accent: '#FFD700' },
    'colors': { base: '#DA70D6', grass: '#FF69B4', accent: '#FFD700' },
    'default': { base: '#8B7355', grass: '#32CD32', accent: '#87CEEB' }
  }

  const colors = islandColors[land.slug?.split('-')[0]] || islandColors.default

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2
        focus:outline-none focus:ring-4 focus:ring-yellow-400 rounded-3xl
        transition-all duration-500 ease-out
        ${isSelected ? 'scale-125 z-30' : isHovered ? 'scale-110 z-20' : 'z-10'}
      `}
      style={{
        left: `${land.map_position_x || 50}%`,
        top: `${land.map_position_y || 50}%`,
        animation: `float-island 4s infinite ease-in-out`,
        animationDelay: `${delay}s`
      }}
    >
      {/* Floating Island Shape */}
      <div className="relative" style={{ width: size * 2, height: size * 2 }}>
        {/* Glow Effect */}
        {(isHovered || isSelected) && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
              transform: 'scale(1.8)'
            }}
          />
        )}

        {/* Island SVG */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-2xl"
          style={{
            filter: isHovered ? 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' : 'drop-shadow(0 5px 15px rgba(0,0,0,0.2))'
          }}
        >
          {/* Island Base (rocky bottom) */}
          <ellipse cx="100" cy="150" rx="70" ry="30" fill={colors.base} />
          <ellipse cx="100" cy="145" rx="60" ry="25" fill="#9B8B7A" />

          {/* Grass Top */}
          <ellipse cx="100" cy="130" rx="65" ry="35" fill={colors.grass} />
          <ellipse cx="100" cy="125" rx="55" ry="28" fill="#3CB371" />

          {/* Small Details - Trees/Bushes */}
          <circle cx="70" cy="110" r="12" fill="#228B22" />
          <circle cx="130" cy="115" r="10" fill="#228B22" />
          <circle cx="85" cy="105" r="8" fill="#2E8B57" />
        </svg>

        {/* Icon/Character Container */}
        <div
          className={`
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[70%]
            w-16 h-16 md:w-20 md:h-20 rounded-full
            bg-white shadow-xl border-4 border-white
            flex items-center justify-center
            transition-all duration-300
            ${isSelected ? 'ring-4 ring-yellow-400' : ''}
          `}
        >
          {land.icon_url ? (
            <img
              src={land.icon_url}
              alt={land.name}
              className="w-3/4 h-3/4 object-contain"
            />
          ) : (
            <span className="text-3xl md:text-4xl">{landIcon}</span>
          )}
        </div>

        {/* Land Name Banner */}
        <div
          className={`
            absolute -bottom-4 left-1/2 transform -translate-x-1/2
            bg-white rounded-xl px-4 py-2 shadow-lg
            whitespace-nowrap
            transition-all duration-300
            border-2
            ${isHovered || ageLevel === 1 ? 'opacity-100 scale-100' : 'opacity-90 scale-95'}
          `}
          style={{ borderColor: accentColor }}
        >
          <span
            className="font-bold text-gray-800"
            style={{ fontSize: ageLevel === 1 ? '1.1rem' : '0.95rem' }}
          >
            {land.name}
          </span>
        </div>

        {/* Activity Count Badge */}
        {land.activity_count > 0 && (
          <div
            className="absolute top-2 right-2 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            {land.activity_count}
          </div>
        )}

        {/* Locked Indicator */}
        {land.is_locked && (
          <div className="absolute inset-0 rounded-3xl bg-black/40 flex items-center justify-center">
            <div className="bg-white/90 rounded-full p-3">
              <span className="text-3xl">🔒</span>
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
