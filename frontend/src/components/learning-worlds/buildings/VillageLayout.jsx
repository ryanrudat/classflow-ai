import { useMemo } from 'react'
import ActivityBuilding from './ActivityBuilding'

/**
 * Village Layout Component
 *
 * Arranges activity buildings in an immersive village-like layout
 * with paths, decorations, and depth/perspective.
 */
export default function VillageLayout({
  activities,
  onSelectActivity,
  ageLevel = 2,
  theme = {},
  completedActivities = []
}) {
  // Calculate building positions for organic village layout
  const buildingPositions = useMemo(() => {
    return calculateVillagePositions(activities, ageLevel)
  }, [activities, ageLevel])

  const completedSet = new Set(completedActivities)

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Ground/Path Layer */}
      <VillageGround theme={theme} buildingCount={activities.length} />

      {/* Decorative Elements */}
      <VillageDecorations theme={theme} />

      {/* Buildings Layer */}
      <div className="absolute inset-0">
        {activities.map((activity, index) => {
          const position = buildingPositions[index]
          return (
            <div
              key={activity.id}
              className="absolute transform -translate-x-1/2"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                zIndex: position.zIndex
              }}
            >
              <ActivityBuilding
                activity={activity}
                onClick={() => onSelectActivity?.(activity.id, activity)}
                isCompleted={completedSet.has(activity.id)}
                isLocked={activity.is_locked}
                ageLevel={ageLevel}
                index={index}
                accentColor={theme.accent || '#FFD700'}
              />
            </div>
          )
        })}
      </div>

      {/* Foreground decorations */}
      <VillageForeground theme={theme} />

      {/* Animation styles */}
      <style>{`
        @keyframes path-dash {
          to { stroke-dashoffset: -20; }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes bird-fly {
          0% { transform: translateX(-100px) translateY(0); }
          25% { transform: translateX(0) translateY(-20px); }
          50% { transform: translateX(100px) translateY(0); }
          75% { transform: translateX(200px) translateY(-15px); }
          100% { transform: translateX(300px) translateY(0); }
        }
      `}</style>
    </div>
  )
}

/**
 * Calculate organic village positions for buildings
 */
function calculateVillagePositions(activities, ageLevel) {
  const count = activities.length

  // Pre-defined layouts for different building counts
  // Positions are percentages, with consideration for depth (y affects zIndex)
  const layouts = {
    1: [{ x: 50, y: 50, zIndex: 10 }],
    2: [
      { x: 35, y: 45, zIndex: 10 },
      { x: 65, y: 55, zIndex: 12 }
    ],
    3: [
      { x: 50, y: 35, zIndex: 8 },
      { x: 30, y: 55, zIndex: 12 },
      { x: 70, y: 55, zIndex: 12 }
    ],
    4: [
      { x: 30, y: 35, zIndex: 8 },
      { x: 70, y: 35, zIndex: 8 },
      { x: 25, y: 60, zIndex: 14 },
      { x: 75, y: 60, zIndex: 14 }
    ],
    5: [
      { x: 50, y: 25, zIndex: 6 },
      { x: 25, y: 45, zIndex: 10 },
      { x: 75, y: 45, zIndex: 10 },
      { x: 35, y: 65, zIndex: 14 },
      { x: 65, y: 65, zIndex: 14 }
    ],
    6: [
      { x: 35, y: 25, zIndex: 6 },
      { x: 65, y: 25, zIndex: 6 },
      { x: 20, y: 48, zIndex: 10 },
      { x: 50, y: 48, zIndex: 10 },
      { x: 80, y: 48, zIndex: 10 },
      { x: 50, y: 70, zIndex: 14 }
    ],
    7: [
      { x: 50, y: 20, zIndex: 5 },
      { x: 25, y: 38, zIndex: 8 },
      { x: 75, y: 38, zIndex: 8 },
      { x: 15, y: 58, zIndex: 12 },
      { x: 50, y: 55, zIndex: 11 },
      { x: 85, y: 58, zIndex: 12 },
      { x: 50, y: 75, zIndex: 15 }
    ],
    8: [
      { x: 30, y: 20, zIndex: 5 },
      { x: 70, y: 20, zIndex: 5 },
      { x: 15, y: 42, zIndex: 9 },
      { x: 50, y: 38, zIndex: 8 },
      { x: 85, y: 42, zIndex: 9 },
      { x: 25, y: 62, zIndex: 13 },
      { x: 55, y: 65, zIndex: 14 },
      { x: 80, y: 62, zIndex: 13 }
    ]
  }

  // Use layout if we have one, otherwise generate dynamically
  if (layouts[count]) {
    return layouts[count]
  }

  // Dynamic layout for 9+ buildings
  const positions = []
  const rows = Math.ceil(count / 3)

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 3)
    const col = i % 3
    const itemsInRow = Math.min(3, count - row * 3)

    // Calculate horizontal position with offset for centering
    const rowOffset = (3 - itemsInRow) * 15
    const x = 20 + col * 30 + rowOffset + (row % 2 === 1 ? 10 : 0)

    // Calculate vertical position with depth
    const y = 25 + row * 22

    // Z-index increases with row (closer = higher z)
    const zIndex = 5 + row * 4

    positions.push({ x, y, zIndex })
  }

  return positions
}

/**
 * Village Ground - paths and terrain
 */
function VillageGround({ theme, buildingCount }) {
  const pathColor = theme.ground || '#D2B48C'
  const grassColor = theme.grass || '#90EE90'

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="grassPattern" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill={grassColor} opacity="0.3" />
          <circle cx="3" cy="3" r="0.5" fill={grassColor} opacity="0.2" />
        </pattern>
        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={pathColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor={pathColor} stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Grass texture overlay */}
      <rect width="100" height="100" fill="url(#grassPattern)" />

      {/* Main village path - winding through center */}
      <path
        d="M 50,100
           Q 45,85 50,75
           Q 55,65 45,55
           Q 35,45 50,35
           Q 65,25 50,15
           Q 40,8 50,0"
        fill="none"
        stroke="url(#pathGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Branch paths to sides */}
      {buildingCount > 2 && (
        <>
          <path
            d="M 50,55 Q 35,50 20,55"
            fill="none"
            stroke={pathColor}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M 50,55 Q 65,50 80,55"
            fill="none"
            stroke={pathColor}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
          />
        </>
      )}

      {buildingCount > 4 && (
        <>
          <path
            d="M 45,35 Q 30,33 15,40"
            fill="none"
            stroke={pathColor}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M 55,35 Q 70,33 85,40"
            fill="none"
            stroke={pathColor}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.4"
          />
        </>
      )}

      {/* Path texture dots */}
      {[...Array(20)].map((_, i) => (
        <circle
          key={i}
          cx={45 + Math.random() * 10}
          cy={10 + i * 4.5}
          r={0.8 + Math.random() * 0.5}
          fill={pathColor}
          opacity={0.3 + Math.random() * 0.2}
        />
      ))}
    </svg>
  )
}

/**
 * Village Decorations - trees, flowers, etc.
 */
function VillageDecorations({ theme }) {
  const treeColor = '#228B22'
  const flowerColors = ['#FF69B4', '#FFD700', '#FF6B6B', '#87CEEB', '#DDA0DD']

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Background trees */}
      {[
        { x: 5, y: 15, scale: 0.8 },
        { x: 95, y: 20, scale: 0.9 },
        { x: 8, y: 35, scale: 0.7 },
        { x: 92, y: 40, scale: 0.75 }
      ].map((tree, i) => (
        <div
          key={`tree-${i}`}
          className="absolute"
          style={{
            left: `${tree.x}%`,
            top: `${tree.y}%`,
            transform: `scale(${tree.scale})`,
            transformOrigin: 'bottom center'
          }}
        >
          <svg width="60" height="80" viewBox="0 0 60 80">
            {/* Tree trunk */}
            <rect x="25" y="50" width="10" height="30" fill="#8B4513" rx="2" />
            {/* Tree foliage */}
            <ellipse cx="30" cy="35" rx="25" ry="30" fill={treeColor} opacity="0.9" />
            <ellipse cx="25" cy="40" rx="18" ry="22" fill="#32CD32" opacity="0.8" />
            <ellipse cx="35" cy="38" rx="15" ry="20" fill="#228B22" opacity="0.7" />
          </svg>
        </div>
      ))}

      {/* Flower patches */}
      {[
        { x: 12, y: 70, count: 5 },
        { x: 88, y: 65, count: 4 },
        { x: 5, y: 85, count: 6 },
        { x: 95, y: 80, count: 5 }
      ].map((patch, patchIndex) => (
        <div
          key={`patch-${patchIndex}`}
          className="absolute"
          style={{ left: `${patch.x}%`, top: `${patch.y}%` }}
        >
          {[...Array(patch.count)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${(i % 3) * 15 - 15}px`,
                top: `${Math.floor(i / 3) * 12}px`,
                animation: 'sway 3s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`
              }}
            >
              <svg width="12" height="16" viewBox="0 0 12 16">
                <line x1="6" y1="8" x2="6" y2="16" stroke="#228B22" strokeWidth="1" />
                <circle
                  cx="6"
                  cy="6"
                  r="5"
                  fill={flowerColors[(patchIndex + i) % flowerColors.length]}
                />
                <circle cx="6" cy="6" r="2" fill="#FFD700" />
              </svg>
            </div>
          ))}
        </div>
      ))}

      {/* Distant birds */}
      <div
        className="absolute"
        style={{
          top: '8%',
          left: '-10%',
          animation: 'bird-fly 20s linear infinite'
        }}
      >
        <svg width="30" height="15" viewBox="0 0 30 15">
          <path d="M0,7 Q7,0 15,7 Q23,0 30,7" fill="none" stroke="#333" strokeWidth="2" />
        </svg>
      </div>
      <div
        className="absolute"
        style={{
          top: '12%',
          left: '-15%',
          animation: 'bird-fly 25s linear infinite',
          animationDelay: '5s'
        }}
      >
        <svg width="20" height="10" viewBox="0 0 20 10">
          <path d="M0,5 Q5,0 10,5 Q15,0 20,5" fill="none" stroke="#333" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Bushes */}
      {[
        { x: 3, y: 55, scale: 0.8 },
        { x: 97, y: 50, scale: 0.9 },
        { x: 2, y: 75, scale: 0.7 }
      ].map((bush, i) => (
        <div
          key={`bush-${i}`}
          className="absolute"
          style={{
            left: `${bush.x}%`,
            top: `${bush.y}%`,
            transform: `scale(${bush.scale})`
          }}
        >
          <svg width="40" height="25" viewBox="0 0 40 25">
            <ellipse cx="10" cy="18" rx="10" ry="8" fill="#228B22" />
            <ellipse cx="20" cy="15" rx="12" ry="10" fill="#32CD32" />
            <ellipse cx="32" cy="18" rx="9" ry="7" fill="#228B22" />
          </svg>
        </div>
      ))}

      {/* Rocks */}
      {[
        { x: 10, y: 60 },
        { x: 90, y: 75 },
        { x: 85, y: 90 }
      ].map((rock, i) => (
        <div
          key={`rock-${i}`}
          className="absolute"
          style={{ left: `${rock.x}%`, top: `${rock.y}%` }}
        >
          <svg width="20" height="15" viewBox="0 0 20 15">
            <ellipse cx="10" cy="10" rx="9" ry="5" fill="#808080" />
            <ellipse cx="8" cy="9" rx="6" ry="4" fill="#A9A9A9" />
          </svg>
        </div>
      ))}
    </div>
  )
}

/**
 * Village Foreground - elements that appear in front
 */
function VillageForeground({ theme }) {
  const grassColor = theme.grass || '#228B22'

  return (
    <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none">
      {/* Grass blades at bottom */}
      <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
        {[...Array(50)].map((_, i) => {
          const x = i * 2 + Math.random()
          const height = 8 + Math.random() * 10
          const lean = (Math.random() - 0.5) * 8
          return (
            <path
              key={i}
              d={`M ${x},20 Q ${x + lean},${20 - height / 2} ${x + lean * 0.5},${20 - height}`}
              fill="none"
              stroke={grassColor}
              strokeWidth="0.3"
              opacity={0.4 + Math.random() * 0.3}
              style={{
                animation: 'sway 2s ease-in-out infinite',
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          )
        })}
      </svg>

      {/* Foreground flowers */}
      {[10, 25, 75, 90].map((x, i) => (
        <div
          key={i}
          className="absolute bottom-2"
          style={{
            left: `${x}%`,
            animation: 'sway 2.5s ease-in-out infinite',
            animationDelay: `${i * 0.3}s`
          }}
        >
          <svg width="16" height="20" viewBox="0 0 16 20">
            <path d="M8,10 Q7,15 8,20" fill="none" stroke="#228B22" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="6" fill={['#FF69B4', '#FFD700', '#FF6B6B', '#DDA0DD'][i]} />
            <circle cx="8" cy="8" r="2.5" fill="#FFD700" />
          </svg>
        </div>
      ))}
    </div>
  )
}
