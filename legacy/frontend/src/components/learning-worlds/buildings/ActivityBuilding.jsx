import { useState } from 'react'

/**
 * Activity Building Component
 *
 * Renders themed buildings that represent different activity types.
 * Each building has unique visual characteristics, animations, and states.
 */
export default function ActivityBuilding({
  activity,
  onClick,
  isCompleted = false,
  isLocked = false,
  ageLevel = 2,
  index = 0,
  accentColor = '#FFD700'
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const buildingType = activity.activity_type || 'default'

  // Size based on age level - younger = bigger buildings
  const scale = ageLevel === 1 ? 1.3 : ageLevel === 2 ? 1.1 : 1.0
  const baseWidth = 140 * scale
  const baseHeight = 180 * scale

  return (
    <button
      onClick={() => !isLocked && onClick?.()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false) }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      disabled={isLocked}
      className={`
        relative focus:outline-none focus:ring-4 focus:ring-yellow-400 rounded-2xl
        transition-all duration-300 ease-out
        ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
      `}
      style={{
        width: baseWidth,
        transform: `
          scale(${isPressed ? 0.95 : isHovered ? 1.08 : 1})
          translateY(${isHovered && !isPressed ? '-8px' : '0px'})
        `,
        animation: `building-float ${3 + index * 0.5}s ease-in-out infinite`,
        animationDelay: `${index * 0.3}s`
      }}
    >
      {/* Building SVG */}
      <BuildingSVG
        type={buildingType}
        width={baseWidth}
        height={baseHeight}
        isHovered={isHovered}
        isCompleted={isCompleted}
        isLocked={isLocked}
        accentColor={accentColor}
      />

      {/* Building Name Label */}
      <div
        className={`
          absolute -bottom-2 left-1/2 -translate-x-1/2
          bg-white/95 backdrop-blur-sm rounded-full px-4 py-2
          shadow-lg border-2 transition-all duration-200
          ${isHovered ? 'scale-110' : 'scale-100'}
        `}
        style={{
          borderColor: isCompleted ? '#10B981' : accentColor,
          minWidth: '80%'
        }}
      >
        <p className={`
          font-bold text-gray-800 text-center truncate
          ${ageLevel === 1 ? 'text-base' : 'text-sm'}
        `}>
          {activity.title}
        </p>
      </div>

      {/* Completed Badge */}
      {isCompleted && (
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-in z-10">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gray-800/80 rounded-full p-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      )}

      {/* Hover Glow Effect */}
      {isHovered && !isLocked && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse"
          style={{
            boxShadow: `0 0 30px ${accentColor}60, 0 0 60px ${accentColor}30`
          }}
        />
      )}
    </button>
  )
}

/**
 * Building SVG Component - Renders the actual building graphics
 */
function BuildingSVG({ type, width, height, isHovered, isCompleted, isLocked, accentColor }) {
  const buildings = {
    vocabulary_touch: LibraryBuilding,
    matching_game: PuzzleHouse,
    listen_point: MusicHall,
    tpr_action: Playground,
    coloring: ArtStudio,
    letter_tracing: WritingCottage,
    drawing: ArtistWorkshop,
    story_sequence: StorybookTheater,
    fill_blank: WordFactory,
    word_spelling: LetterCastle,
    sentence_builder: ConstructionSite,
    reading_comprehension: ReadingTreehouse,
    dictation: RecordingStudio,
    dialogue_practice: SpeechCafe,
    default: DefaultBuilding
  }

  const BuildingComponent = buildings[type] || buildings.default

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 180"
      className="drop-shadow-xl"
    >
      <defs>
        {/* Common gradients and filters */}
        <linearGradient id="roofGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8B4513" />
          <stop offset="100%" stopColor="#654321" />
        </linearGradient>
        <linearGradient id="wallGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF8DC" />
          <stop offset="100%" stopColor="#F5DEB3" />
        </linearGradient>
        <linearGradient id="windowGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="100%" stopColor="#FFE082" />
        </linearGradient>
        <filter id="softShadow">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
        </filter>
        <filter id="innerGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <BuildingComponent
        isHovered={isHovered}
        isCompleted={isCompleted}
        isLocked={isLocked}
        accentColor={accentColor}
      />
    </svg>
  )
}

/**
 * Library Building - for Vocabulary Touch activities
 */
function LibraryBuilding({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Main building body */}
      <rect x="20" y="70" width="100" height="90" fill="url(#wallGradient)" rx="4" />

      {/* Roof */}
      <polygon points="10,70 70,25 130,70" fill="url(#roofGradient)" />
      <rect x="60" y="15" width="20" height="15" fill="#8B4513" rx="2" /> {/* Chimney */}

      {/* Chimney smoke - animated */}
      {isHovered && (
        <g className="animate-float-up">
          <ellipse cx="70" cy="8" rx="6" ry="4" fill="rgba(200,200,200,0.6)" />
          <ellipse cx="73" cy="2" rx="4" ry="3" fill="rgba(200,200,200,0.4)" />
        </g>
      )}

      {/* Columns */}
      <rect x="30" y="110" width="12" height="50" fill="#E8E8E8" />
      <rect x="98" y="110" width="12" height="50" fill="#E8E8E8" />

      {/* Door */}
      <rect x="55" y="115" width="30" height="45" fill="#654321" rx="15" ry="15" />
      <circle cx="80" cy="140" r="3" fill="#FFD700" /> {/* Door knob */}

      {/* Windows with books visible */}
      <rect x="30" y="80" width="25" height="25" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} rx="2" />
      <rect x="85" y="80" width="25" height="25" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} rx="2" />

      {/* Book decorations in windows */}
      <rect x="33" y="95" width="4" height="8" fill="#E74C3C" />
      <rect x="38" y="93" width="4" height="10" fill="#3498DB" />
      <rect x="43" y="94" width="4" height="9" fill="#2ECC71" />
      <rect x="88" y="95" width="4" height="8" fill="#9B59B6" />
      <rect x="93" y="93" width="4" height="10" fill="#F39C12" />
      <rect x="98" y="94" width="4" height="9" fill="#1ABC9C" />

      {/* Sign */}
      <rect x="45" y="55" width="50" height="12" fill="#FFF8DC" rx="2" />
      <text x="70" y="64" fontSize="7" fill="#654321" textAnchor="middle" fontWeight="bold">LIBRARY</text>

      {/* Owl on roof */}
      <g transform="translate(110, 50)">
        <ellipse cx="0" cy="0" rx="8" ry="10" fill="#8B7355" />
        <circle cx="-3" cy="-2" r="4" fill="#FFF" />
        <circle cx="3" cy="-2" r="4" fill="#FFF" />
        <circle cx="-3" cy="-2" r="2" fill="#000" />
        <circle cx="3" cy="-2" r="2" fill="#000" />
        <polygon points="0,2 -2,5 2,5" fill="#F4A460" />
      </g>

      {/* Completion glow */}
      {isCompleted && (
        <rect x="18" y="68" width="104" height="94" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Puzzle House - for Matching Game activities
 */
function PuzzleHouse({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* House body - made of puzzle pieces */}
      <rect x="25" y="75" width="90" height="85" fill="#FFE4B5" rx="4" />

      {/* Puzzle piece roof sections */}
      <path d="M15,75 L70,30 L125,75 Z" fill="#9370DB" />
      <path d="M55,75 L70,55 L85,75 Z" fill="#BA55D3" />

      {/* Puzzle piece decorations on walls */}
      <g fill="#DDA0DD" opacity="0.5">
        <circle cx="40" cy="95" r="8" />
        <circle cx="100" cy="95" r="8" />
        <rect x="35" y="130" width="15" height="15" rx="3" />
        <rect x="90" y="130" width="15" height="15" rx="3" />
      </g>

      {/* Door shaped like puzzle piece */}
      <rect x="55" y="110" width="30" height="50" fill="#8B008B" rx="4" />
      <circle cx="60" cy="115" r="8" fill="#8B008B" />
      <circle cx="80" cy="115" r="8" fill="#8B008B" />
      <circle cx="70" cy="135" r="3" fill="#FFD700" />

      {/* Mismatched windows */}
      <rect x="30" y="85" width="20" height="18" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} rx="4" />
      <circle cx="100" cy="94" r="10" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} />

      {/* Puzzle piece signs hanging */}
      <rect x="45" y="60" width="12" height="12" fill="#FF6B6B" rx="2" transform="rotate(15, 51, 66)" />
      <rect x="83" y="60" width="12" height="12" fill="#4ECDC4" rx="2" transform="rotate(-15, 89, 66)" />

      {/* Floating puzzle pieces when hovered */}
      {isHovered && (
        <g className="animate-float">
          <rect x="15" y="45" width="10" height="10" fill="#FFD93D" rx="2" opacity="0.8" />
          <rect x="115" y="50" width="8" height="8" fill="#6BCB77" rx="2" opacity="0.8" />
        </g>
      )}

      {isCompleted && (
        <rect x="23" y="73" width="94" height="89" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Music Hall - for Listen & Point activities
 */
function MusicHall({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Main hall body */}
      <rect x="20" y="80" width="100" height="80" fill="#E6E6FA" rx="4" />

      {/* Dome roof */}
      <ellipse cx="70" cy="80" rx="55" ry="35" fill="#4169E1" />
      <ellipse cx="70" cy="80" rx="45" ry="28" fill="#6495ED" />

      {/* Musical note spire */}
      <ellipse cx="70" cy="40" rx="8" ry="12" fill="#000" />
      <rect x="76" y="25" width="3" height="25" fill="#000" />
      <path d="M79,25 Q90,28 79,35" fill="#000" />

      {/* Arched entrance */}
      <path d="M50,160 L50,115 Q70,95 90,115 L90,160 Z" fill="#2C3E50" />

      {/* Windows - speaker shaped */}
      <circle cx="35" cy="110" r="12" fill={isHovered ? "url(#windowGlow)" : "#1a1a2e"} />
      <circle cx="35" cy="110" r="8" fill="#16213e" />
      <circle cx="35" cy="110" r="4" fill="#0f3460" />

      <circle cx="105" cy="110" r="12" fill={isHovered ? "url(#windowGlow)" : "#1a1a2e"} />
      <circle cx="105" cy="110" r="8" fill="#16213e" />
      <circle cx="105" cy="110" r="4" fill="#0f3460" />

      {/* Musical notes floating */}
      {isHovered && (
        <g className="animate-float-notes">
          <text x="15" y="60" fontSize="16" fill="#FFD700">&#9834;</text>
          <text x="115" y="55" fontSize="14" fill="#FFD700">&#9835;</text>
          <text x="25" y="40" fontSize="12" fill="#FFD700">&#9833;</text>
        </g>
      )}

      {/* Sound waves */}
      {isHovered && (
        <g opacity="0.6">
          <path d="M125,100 Q135,110 125,120" fill="none" stroke="#FFD700" strokeWidth="2" />
          <path d="M130,95 Q145,110 130,125" fill="none" stroke="#FFD700" strokeWidth="2" />
        </g>
      )}

      {isCompleted && (
        <rect x="18" y="45" width="104" height="117" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Playground - for TPR Action activities
 */
function Playground({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Ground/base */}
      <ellipse cx="70" cy="155" rx="60" ry="15" fill="#90EE90" />

      {/* Swing set frame */}
      <polygon points="20,70 35,155 5,155" fill="#CD853F" />
      <polygon points="120,70 135,155 105,155" fill="#CD853F" />
      <rect x="15" y="65" width="110" height="8" fill="#CD853F" rx="4" />

      {/* Swings */}
      <g transform={isHovered ? "rotate(-10, 50, 70)" : ""} style={{ transition: 'transform 0.3s' }}>
        <line x1="50" y1="73" x2="45" y2="130" stroke="#8B4513" strokeWidth="2" />
        <line x1="50" y1="73" x2="55" y2="130" stroke="#8B4513" strokeWidth="2" />
        <rect x="40" y="128" width="20" height="5" fill="#DC143C" rx="2" />
      </g>

      <g transform={isHovered ? "rotate(10, 90, 70)" : ""} style={{ transition: 'transform 0.3s' }}>
        <line x1="90" y1="73" x2="85" y2="130" stroke="#8B4513" strokeWidth="2" />
        <line x1="90" y1="73" x2="95" y2="130" stroke="#8B4513" strokeWidth="2" />
        <rect x="80" y="128" width="20" height="5" fill="#4169E1" rx="2" />
      </g>

      {/* Slide */}
      <rect x="60" y="90" width="8" height="50" fill="#CD853F" />
      <path d="M68,90 L68,75 L100,75 L100,90 Z" fill="#FF6347" />
      <path d="M68,90 Q85,120 110,140" fill="none" stroke="#FFD700" strokeWidth="8" strokeLinecap="round" />

      {/* Bouncing ball */}
      {isHovered && (
        <circle cx="25" cy="140" r="8" fill="#FF4500" className="animate-bounce">
          <animate attributeName="cy" values="140;120;140" dur="0.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Flags */}
      <line x1="70" y1="40" x2="70" y2="65" stroke="#8B4513" strokeWidth="3" />
      <polygon points="70,40 90,48 70,56" fill="#FF6B6B" className={isHovered ? "animate-wave" : ""} />

      {isCompleted && (
        <ellipse cx="70" cy="110" rx="65" ry="55" fill="none" stroke="#10B981" strokeWidth="3" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Art Studio - for Coloring activities
 */
function ArtStudio({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Building body */}
      <rect x="25" y="70" width="90" height="90" fill="#FFF5EE" rx="4" />

      {/* Colorful roof */}
      <polygon points="15,70 70,30 125,70" fill="#FF6B6B" />
      <polygon points="30,70 70,40 110,70" fill="#4ECDC4" />

      {/* Paint splatter decorations */}
      <circle cx="30" cy="85" r="8" fill="#FF6B6B" opacity="0.7" />
      <circle cx="110" cy="90" r="6" fill="#4ECDC4" opacity="0.7" />
      <circle cx="40" cy="130" r="5" fill="#FFD93D" opacity="0.7" />
      <circle cx="95" cy="135" r="7" fill="#9B59B6" opacity="0.7" />

      {/* Large arched window showing easel */}
      <path d="M45,85 L45,130 Q70,145 95,130 L95,85 Q70,70 45,85 Z" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} />

      {/* Easel inside window */}
      <line x1="65" y1="95" x2="55" y2="125" stroke="#8B4513" strokeWidth="2" />
      <line x1="75" y1="95" x2="85" y2="125" stroke="#8B4513" strokeWidth="2" />
      <rect x="58" y="98" width="24" height="18" fill="#FFF" stroke="#8B4513" />
      <rect x="62" y="102" width="5" height="8" fill="#E74C3C" />
      <rect x="68" y="104" width="4" height="6" fill="#3498DB" />
      <rect x="73" y="103" width="5" height="7" fill="#2ECC71" />

      {/* Door */}
      <rect x="55" y="135" width="30" height="25" fill="#8B4513" rx="2" />
      <circle cx="80" cy="148" r="2" fill="#FFD700" />

      {/* Palette sign */}
      <ellipse cx="70" cy="55" rx="15" ry="10" fill="#F4A460" />
      <circle cx="63" cy="53" r="3" fill="#FF6B6B" />
      <circle cx="70" cy="50" r="3" fill="#4ECDC4" />
      <circle cx="77" cy="53" r="3" fill="#FFD93D" />
      <circle cx="67" cy="58" r="3" fill="#9B59B6" />
      <circle cx="74" cy="58" r="3" fill="#3498DB" />

      {/* Colorful smoke from chimney */}
      {isHovered && (
        <g className="animate-float-up">
          <circle cx="100" cy="50" r="5" fill="#FF6B6B" opacity="0.5" />
          <circle cx="105" cy="40" r="4" fill="#4ECDC4" opacity="0.4" />
          <circle cx="98" cy="32" r="3" fill="#FFD93D" opacity="0.3" />
        </g>
      )}

      {isCompleted && (
        <rect x="23" y="28" width="94" height="134" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Writing Cottage - for Letter Tracing activities
 */
function WritingCottage({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Cozy cottage body */}
      <rect x="30" y="80" width="80" height="80" fill="#FFEFD5" rx="4" />

      {/* Thatched roof */}
      <path d="M20,80 L70,35 L120,80 Z" fill="#DEB887" />
      <path d="M25,80 L70,40 L115,80" fill="none" stroke="#D2691E" strokeWidth="2" />
      <path d="M30,80 L70,45 L110,80" fill="none" stroke="#D2691E" strokeWidth="2" />

      {/* Chimney with quill */}
      <rect x="85" y="40" width="15" height="25" fill="#8B4513" />
      <path d="M92,40 Q92,25 105,15" fill="none" stroke="#2C3E50" strokeWidth="3" />
      <path d="M105,15 L108,20 L102,18 Z" fill="#2C3E50" />

      {/* Round hobbit-style door */}
      <circle cx="70" cy="130" r="22" fill="#654321" />
      <circle cx="70" cy="130" r="18" fill="#8B4513" />
      <line x1="70" y1="112" x2="70" y2="148" stroke="#654321" strokeWidth="2" />
      <line x1="52" y1="130" x2="88" y2="130" stroke="#654321" strokeWidth="2" />
      <circle cx="82" cy="130" r="3" fill="#FFD700" />

      {/* Windows with letters */}
      <rect x="35" y="90" width="20" height="20" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} rx="2" />
      <rect x="85" y="90" width="20" height="20" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} rx="2" />

      {/* Letters in windows */}
      <text x="45" y="105" fontSize="14" fill="#654321" textAnchor="middle" fontWeight="bold">A</text>
      <text x="95" y="105" fontSize="14" fill="#654321" textAnchor="middle" fontWeight="bold">B</text>

      {/* Window boxes with flowers */}
      <rect x="33" y="110" width="24" height="5" fill="#8B4513" />
      <circle cx="38" cy="108" r="3" fill="#FF69B4" />
      <circle cx="45" cy="107" r="3" fill="#FFD700" />
      <circle cx="52" cy="108" r="3" fill="#FF69B4" />

      <rect x="83" y="110" width="24" height="5" fill="#8B4513" />
      <circle cx="88" cy="108" r="3" fill="#87CEEB" />
      <circle cx="95" cy="107" r="3" fill="#FFD700" />
      <circle cx="102" cy="108" r="3" fill="#87CEEB" />

      {/* Floating letters when hovered */}
      {isHovered && (
        <g className="animate-float">
          <text x="20" y="60" fontSize="12" fill="#654321" opacity="0.7">C</text>
          <text x="115" y="55" fontSize="10" fill="#654321" opacity="0.6">D</text>
          <text x="25" y="45" fontSize="8" fill="#654321" opacity="0.5">E</text>
        </g>
      )}

      {isCompleted && (
        <rect x="28" y="33" width="84" height="129" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Artist's Workshop - for Drawing activities
 */
function ArtistWorkshop({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Workshop body - rustic barn style */}
      <rect x="25" y="75" width="90" height="85" fill="#DEB887" rx="2" />

      {/* Barn roof */}
      <path d="M20,75 L70,30 L120,75 Z" fill="#8B0000" />
      <path d="M25,75 L70,35 L115,75" fill="none" stroke="#660000" strokeWidth="2" />

      {/* Large barn door */}
      <rect x="40" y="100" width="60" height="60" fill="#8B4513" />
      <rect x="42" y="102" width="27" height="56" fill="#A0522D" />
      <rect x="71" y="102" width="27" height="56" fill="#A0522D" />
      <line x1="70" y1="100" x2="70" y2="160" stroke="#654321" strokeWidth="3" />

      {/* X pattern on doors */}
      <line x1="44" y1="104" x2="67" y2="156" stroke="#8B4513" strokeWidth="2" />
      <line x1="67" y1="104" x2="44" y2="156" stroke="#8B4513" strokeWidth="2" />
      <line x1="73" y1="104" x2="96" y2="156" stroke="#8B4513" strokeWidth="2" />
      <line x1="96" y1="104" x2="73" y2="156" stroke="#8B4513" strokeWidth="2" />

      {/* Loft window */}
      <circle cx="70" cy="55" r="12" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} />
      <line x1="70" y1="43" x2="70" y2="67" stroke="#654321" strokeWidth="2" />
      <line x1="58" y1="55" x2="82" y2="55" stroke="#654321" strokeWidth="2" />

      {/* Brushes in holder by door */}
      <rect x="105" y="130" width="10" height="20" fill="#4A4A4A" />
      <line x1="107" y1="130" x2="107" y2="115" stroke="#8B4513" strokeWidth="2" />
      <circle cx="107" cy="113" r="3" fill="#FF6B6B" />
      <line x1="110" y1="130" x2="110" y2="118" stroke="#8B4513" strokeWidth="2" />
      <circle cx="110" cy="116" r="2" fill="#4ECDC4" />
      <line x1="113" y1="130" x2="113" y2="120" stroke="#8B4513" strokeWidth="2" />
      <circle cx="113" cy="118" r="2" fill="#FFD93D" />

      {/* Weather vane with brush */}
      <line x1="70" y1="20" x2="70" y2="30" stroke="#4A4A4A" strokeWidth="2" />
      <line x1="60" y1="25" x2="80" y2="25" stroke="#4A4A4A" strokeWidth="2" />
      <circle cx="82" cy="25" r="4" fill="#FF6B6B" />

      {/* Paint drips */}
      {isHovered && (
        <g>
          <path d="M30,75 L30,85 Q32,90 30,95" fill="none" stroke="#FF6B6B" strokeWidth="3" opacity="0.7" />
          <path d="M110,75 L110,82 Q112,86 110,90" fill="none" stroke="#4ECDC4" strokeWidth="3" opacity="0.7" />
        </g>
      )}

      {isCompleted && (
        <rect x="23" y="28" width="94" height="134" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Storybook Theater - for Story Sequence activities
 */
function StorybookTheater({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Theater base */}
      <rect x="20" y="80" width="100" height="80" fill="#FFE4E1" rx="4" />

      {/* Ornate roof/pediment */}
      <path d="M15,80 L70,45 L125,80 Z" fill="#C71585" />
      <ellipse cx="70" cy="60" rx="20" ry="12" fill="#FFD700" />
      <text x="70" y="64" fontSize="10" fill="#C71585" textAnchor="middle" fontWeight="bold">THEATER</text>

      {/* Stage opening with curtains */}
      <rect x="30" y="90" width="80" height="55" fill="#1a1a2e" rx="3" />

      {/* Curtains */}
      <path d="M30,90 Q45,100 30,145" fill="#DC143C" />
      <path d="M110,90 Q95,100 110,145" fill="#DC143C" />
      <path d="M35,90 L35,92 Q50,105 35,145" fill="#B22222" />
      <path d="M105,90 L105,92 Q90,105 105,145" fill="#B22222" />

      {/* Stage floor */}
      <rect x="35" y="135" width="70" height="10" fill="#8B4513" />

      {/* Book characters on stage */}
      {isHovered ? (
        <g>
          {/* Character 1 */}
          <circle cx="55" cy="120" r="8" fill="#FFD700" />
          <circle cx="53" cy="118" r="2" fill="#000" />
          <circle cx="57" cy="118" r="2" fill="#000" />
          <path d="M52,123 Q55,126 58,123" fill="none" stroke="#000" strokeWidth="1" />
          <rect x="50" y="128" width="10" height="8" fill="#4169E1" rx="2" />

          {/* Character 2 */}
          <circle cx="85" cy="118" r="10" fill="#90EE90" />
          <circle cx="82" cy="115" r="2" fill="#000" />
          <circle cx="88" cy="115" r="2" fill="#000" />
          <ellipse cx="85" cy="122" rx="3" ry="2" fill="#FF6B6B" />
          <rect x="78" y="128" width="14" height="8" fill="#9370DB" rx="2" />
        </g>
      ) : (
        <text x="70" y="120" fontSize="20" textAnchor="middle">📖</text>
      )}

      {/* Ticket booth */}
      <rect x="115" y="120" width="20" height="40" fill="#FFD700" rx="2" />
      <rect x="117" y="125" width="16" height="12" fill="#FFF" rx="1" />
      <text x="125" y="155" fontSize="6" fill="#8B4513" textAnchor="middle">TICKETS</text>

      {/* Decorative masks */}
      <text x="25" y="75" fontSize="14">🎭</text>
      <text x="105" y="75" fontSize="14">🎭</text>

      {isCompleted && (
        <rect x="18" y="43" width="104" height="119" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Word Factory - for Fill in the Blank activities
 */
function WordFactory({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Factory building */}
      <rect x="25" y="70" width="90" height="90" fill="#B0C4DE" rx="2" />

      {/* Factory roof */}
      <rect x="20" y="60" width="100" height="15" fill="#708090" />

      {/* Smokestacks */}
      <rect x="30" y="35" width="15" height="30" fill="#696969" />
      <rect x="55" y="40" width="12" height="25" fill="#696969" />
      <rect x="95" y="35" width="15" height="30" fill="#696969" />

      {/* Smoke */}
      {isHovered && (
        <g className="animate-float-up">
          <ellipse cx="37" cy="25" rx="8" ry="5" fill="#D3D3D3" opacity="0.6" />
          <ellipse cx="61" cy="30" rx="6" ry="4" fill="#D3D3D3" opacity="0.5" />
          <ellipse cx="102" cy="25" rx="8" ry="5" fill="#D3D3D3" opacity="0.6" />
          <ellipse cx="40" cy="15" rx="5" ry="3" fill="#D3D3D3" opacity="0.4" />
          <ellipse cx="100" cy="15" rx="5" ry="3" fill="#D3D3D3" opacity="0.4" />
        </g>
      )}

      {/* Windows in grid pattern */}
      {[0, 1, 2].map(row => (
        [0, 1, 2].map(col => (
          <rect
            key={`${row}-${col}`}
            x={35 + col * 25}
            y={75 + row * 22}
            width="18"
            height="15"
            fill={isHovered ? "url(#windowGlow)" : "#87CEEB"}
            rx="1"
          />
        ))
      ))}

      {/* Conveyor belt door */}
      <rect x="45" y="145" width="50" height="15" fill="#4A4A4A" />

      {/* Words on conveyor */}
      {isHovered && (
        <g>
          <rect x="50" y="147" width="15" height="10" fill="#FFF" rx="1" />
          <text x="57" y="155" fontSize="6" fill="#333" textAnchor="middle">THE</text>
          <rect x="70" y="147" width="15" height="10" fill="#FFF" rx="1" />
          <text x="77" y="155" fontSize="5" fill="#333" textAnchor="middle">___</text>
        </g>
      )}

      {/* Gears */}
      <g transform="translate(115, 100)">
        <circle cx="0" cy="0" r="12" fill="#4A4A4A" className={isHovered ? "animate-spin-slow" : ""} />
        <circle cx="0" cy="0" r="4" fill="#696969" />
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <rect
            key={i}
            x="-3"
            y="-14"
            width="6"
            height="6"
            fill="#4A4A4A"
            transform={`rotate(${angle})`}
          />
        ))}
      </g>

      {/* "WORDS" sign */}
      <rect x="45" y="50" width="50" height="12" fill="#FFD700" rx="2" />
      <text x="70" y="59" fontSize="8" fill="#333" textAnchor="middle" fontWeight="bold">WORDS</text>

      {isCompleted && (
        <rect x="18" y="33" width="104" height="129" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Letter Castle - for Word Spelling activities
 */
function LetterCastle({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Main castle body */}
      <rect x="35" y="80" width="70" height="80" fill="#E8E8E8" />

      {/* Left tower */}
      <rect x="15" y="50" width="30" height="110" fill="#D3D3D3" />
      <rect x="12" y="40" width="36" height="15" fill="#A9A9A9" />
      {/* Battlements */}
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={14 + i * 9} y={32} width="6" height="10" fill="#A9A9A9" />
      ))}

      {/* Right tower */}
      <rect x="95" y="50" width="30" height="110" fill="#D3D3D3" />
      <rect x="92" y="40" width="36" height="15" fill="#A9A9A9" />
      {/* Battlements */}
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={94 + i * 9} y={32} width="6" height="10" fill="#A9A9A9" />
      ))}

      {/* Center tower */}
      <rect x="55" y="30" width="30" height="55" fill="#C0C0C0" />
      <polygon points="55,30 70,10 85,30" fill="#708090" />

      {/* Flag with letter */}
      <line x1="70" y1="10" x2="70" y2="-5" stroke="#8B4513" strokeWidth="2" />
      <rect x="70" y="-5" width="20" height="12" fill="#DC143C" />
      <text x="80" y="4" fontSize="8" fill="#FFF" textAnchor="middle" fontWeight="bold">A</text>

      {/* Castle gate */}
      <path d="M50,160 L50,115 Q70,100 90,115 L90,160 Z" fill="#4A4A4A" />
      <rect x="55" y="140" width="30" height="5" fill="#696969" />

      {/* Tower windows with letters */}
      <circle cx="30" cy="80" r="8" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} />
      <text x="30" y="84" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">B</text>

      <circle cx="30" cy="110" r="8" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} />
      <text x="30" y="114" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">C</text>

      <circle cx="110" cy="80" r="8" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} />
      <text x="110" y="84" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">D</text>

      <circle cx="110" cy="110" r="8" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} />
      <text x="110" y="114" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">E</text>

      {/* Floating alphabet blocks when hovered */}
      {isHovered && (
        <g className="animate-float">
          <rect x="5" y="20" width="12" height="12" fill="#FF6B6B" rx="2" />
          <text x="11" y="29" fontSize="8" fill="#FFF" textAnchor="middle">F</text>
          <rect x="123" y="25" width="12" height="12" fill="#4ECDC4" rx="2" />
          <text x="129" y="34" fontSize="8" fill="#FFF" textAnchor="middle">G</text>
        </g>
      )}

      {isCompleted && (
        <rect x="10" y="8" width="120" height="154" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Construction Site - for Sentence Builder activities
 */
function ConstructionSite({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Ground */}
      <rect x="10" y="150" width="120" height="10" fill="#D2691E" />

      {/* Building under construction */}
      <rect x="40" y="90" width="60" height="60" fill="#F5F5DC" rx="2" />
      <rect x="40" y="90" width="60" height="10" fill="#D3D3D3" />

      {/* Scaffolding */}
      <line x1="35" y1="60" x2="35" y2="150" stroke="#FFD700" strokeWidth="3" />
      <line x1="105" y1="60" x2="105" y2="150" stroke="#FFD700" strokeWidth="3" />
      <line x1="35" y1="80" x2="105" y2="80" stroke="#FFD700" strokeWidth="3" />
      <line x1="35" y1="110" x2="105" y2="110" stroke="#FFD700" strokeWidth="3" />
      <line x1="35" y1="140" x2="105" y2="140" stroke="#FFD700" strokeWidth="3" />

      {/* Crane */}
      <rect x="110" y="30" width="8" height="120" fill="#FFD700" />
      <rect x="60" y="25" width="60" height="8" fill="#FFD700" />
      <line x1="75" y1="33" x2="75" y2="70" stroke="#696969" strokeWidth="1" />

      {/* Crane hook with word block */}
      <path d="M75,70 Q75,75 70,75 Q65,75 65,80" fill="none" stroke="#696969" strokeWidth="2" />
      <rect x="55" y="80" width="30" height="15" fill="#FFF" stroke="#333" strokeWidth="1" rx="2" className={isHovered ? "animate-swing" : ""} />
      <text x="70" y="91" fontSize="7" fill="#333" textAnchor="middle">WORD</text>

      {/* Windows (some complete, some not) */}
      <rect x="48" y="100" width="15" height="12" fill="#87CEEB" rx="1" />
      <rect x="48" y="120" width="15" height="12" fill="#87CEEB" rx="1" />
      <rect x="78" y="100" width="15" height="12" fill="none" stroke="#333" strokeWidth="1" strokeDasharray="2" rx="1" />
      <rect x="78" y="120" width="15" height="12" fill="none" stroke="#333" strokeWidth="1" strokeDasharray="2" rx="1" />

      {/* Word blocks stacked */}
      <rect x="15" y="135" width="18" height="12" fill="#FF6B6B" rx="2" />
      <text x="24" y="144" fontSize="6" fill="#FFF" textAnchor="middle">THE</text>
      <rect x="15" y="120" width="18" height="12" fill="#4ECDC4" rx="2" />
      <text x="24" y="129" fontSize="6" fill="#FFF" textAnchor="middle">CAT</text>
      <rect x="15" y="105" width="18" height="12" fill="#FFD93D" rx="2" />
      <text x="24" y="114" fontSize="6" fill="#333" textAnchor="middle">SAT</text>

      {/* Hard hat */}
      <ellipse cx="125" cy="145" rx="10" ry="5" fill="#FFD700" />
      <rect x="118" y="140" width="14" height="6" fill="#FFD700" rx="2" />

      {/* Rotating beacon on crane */}
      {isHovered && (
        <circle cx="118" cy="30" r="4" fill="#FF4500" className="animate-pulse" />
      )}

      {isCompleted && (
        <rect x="8" y="23" width="124" height="139" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Reading Treehouse - for Reading Comprehension activities
 */
function ReadingTreehouse({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Tree trunk */}
      <rect x="55" y="100" width="30" height="60" fill="#8B4513" rx="4" />
      <ellipse cx="70" cy="160" rx="25" ry="8" fill="#654321" />

      {/* Tree branches */}
      <path d="M55,120 Q30,110 20,130" fill="none" stroke="#8B4513" strokeWidth="8" strokeLinecap="round" />
      <path d="M85,120 Q110,110 120,130" fill="none" stroke="#8B4513" strokeWidth="8" strokeLinecap="round" />

      {/* Treehouse platform */}
      <rect x="25" y="85" width="90" height="10" fill="#A0522D" rx="2" />

      {/* Treehouse cabin */}
      <rect x="35" y="45" width="70" height="45" fill="#DEB887" rx="3" />

      {/* Roof */}
      <polygon points="30,45 70,15 110,45" fill="#228B22" />
      <polygon points="35,45 70,20 105,45" fill="#32CD32" />

      {/* Cozy round window */}
      <circle cx="70" cy="65" r="12" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} />
      <line x1="70" y1="53" x2="70" y2="77" stroke="#8B4513" strokeWidth="2" />
      <line x1="58" y1="65" x2="82" y2="65" stroke="#8B4513" strokeWidth="2" />

      {/* Book visible in window when hovered */}
      {isHovered && (
        <g>
          <rect x="64" y="58" width="12" height="10" fill="#E74C3C" rx="1" />
          <line x1="70" y1="58" x2="70" y2="68" stroke="#FFF" strokeWidth="0.5" />
        </g>
      )}

      {/* Door */}
      <rect x="80" y="60" width="18" height="30" fill="#654321" rx="2" />
      <circle cx="95" cy="75" r="2" fill="#FFD700" />

      {/* Ladder */}
      <line x1="50" y1="95" x2="50" y2="155" stroke="#8B4513" strokeWidth="3" />
      <line x1="60" y1="95" x2="60" y2="155" stroke="#8B4513" strokeWidth="3" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <line key={i} x1="50" y1={100 + i * 10} x2="60" y2={100 + i * 10} stroke="#8B4513" strokeWidth="2" />
      ))}

      {/* Hanging lantern */}
      <line x1="30" y1="45" x2="20" y2="55" stroke="#696969" strokeWidth="1" />
      <rect x="15" y="55" width="10" height="12" fill="#FFD700" rx="2" opacity={isHovered ? 1 : 0.6} />
      {isHovered && <circle cx="20" cy="61" r="8" fill="#FFD700" opacity="0.3" />}

      {/* Leaves */}
      <ellipse cx="25" cy="35" rx="20" ry="25" fill="#228B22" opacity="0.8" />
      <ellipse cx="115" cy="35" rx="20" ry="25" fill="#228B22" opacity="0.8" />
      <ellipse cx="70" cy="10" rx="25" ry="15" fill="#32CD32" opacity="0.7" />

      {/* Birds */}
      {isHovered && (
        <g>
          <path d="M15,25 Q20,20 25,25" fill="none" stroke="#333" strokeWidth="2" />
          <path d="M115,30 Q120,25 125,30" fill="none" stroke="#333" strokeWidth="2" />
        </g>
      )}

      {isCompleted && (
        <ellipse cx="70" cy="90" rx="55" ry="70" fill="none" stroke="#10B981" strokeWidth="3" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Recording Studio - for Dictation activities
 */
function RecordingStudio({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Building body */}
      <rect x="25" y="70" width="90" height="90" fill="#2C3E50" rx="4" />

      {/* Modern flat roof */}
      <rect x="20" y="60" width="100" height="15" fill="#1a252f" rx="2" />

      {/* "ON AIR" sign */}
      <rect x="50" y="45" width="40" height="18" fill={isHovered ? "#FF0000" : "#8B0000"} rx="3" />
      <text x="70" y="58" fontSize="8" fill="#FFF" textAnchor="middle" fontWeight="bold">ON AIR</text>
      {isHovered && <circle cx="70" cy="51" r="15" fill="#FF0000" opacity="0.2" />}

      {/* Large window showing studio */}
      <rect x="35" y="80" width="70" height="40" fill="#1a1a2e" rx="2" />

      {/* Microphone inside */}
      <line x1="70" y1="85" x2="70" y2="105" stroke="#C0C0C0" strokeWidth="3" />
      <ellipse cx="70" cy="82" rx="8" ry="6" fill="#4A4A4A" />
      <ellipse cx="70" cy="82" rx="6" ry="4" fill="#696969" />

      {/* Sound wave visualization */}
      {isHovered && (
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <rect
              key={i}
              x={42 + i * 8}
              y={105 - (i % 2 === 0 ? 8 : 12)}
              width="4"
              height={i % 2 === 0 ? 8 : 12}
              fill="#00FF00"
              opacity="0.8"
              className="animate-equalizer"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </g>
      )}

      {/* Door */}
      <rect x="55" y="125" width="30" height="35" fill="#1a252f" rx="2" />
      <circle cx="80" cy="143" r="3" fill="#C0C0C0" />

      {/* Acoustic panels decoration */}
      <rect x="30" y="125" width="20" height="30" fill="#34495E" rx="1" />
      <line x1="35" y1="125" x2="35" y2="155" stroke="#2C3E50" strokeWidth="1" />
      <line x1="40" y1="125" x2="40" y2="155" stroke="#2C3E50" strokeWidth="1" />
      <line x1="45" y1="125" x2="45" y2="155" stroke="#2C3E50" strokeWidth="1" />

      <rect x="90" y="125" width="20" height="30" fill="#34495E" rx="1" />
      <line x1="95" y1="125" x2="95" y2="155" stroke="#2C3E50" strokeWidth="1" />
      <line x1="100" y1="125" x2="100" y2="155" stroke="#2C3E50" strokeWidth="1" />
      <line x1="105" y1="125" x2="105" y2="155" stroke="#2C3E50" strokeWidth="1" />

      {/* Antenna */}
      <line x1="110" y1="30" x2="110" y2="60" stroke="#C0C0C0" strokeWidth="2" />
      <circle cx="110" cy="28" r="3" fill="#FF0000" className={isHovered ? "animate-pulse" : ""} />

      {/* Sound waves from antenna */}
      {isHovered && (
        <g opacity="0.5">
          <path d="M115,25 Q125,28 115,31" fill="none" stroke="#FFD700" strokeWidth="1" />
          <path d="M118,22 Q132,28 118,34" fill="none" stroke="#FFD700" strokeWidth="1" />
        </g>
      )}

      {isCompleted && (
        <rect x="18" y="43" width="104" height="119" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Speech Bubble Cafe - for Dialogue Practice activities
 */
function SpeechCafe({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Cafe building */}
      <rect x="25" y="75" width="90" height="85" fill="#FAEBD7" rx="4" />

      {/* Awning */}
      <path d="M20,75 L20,65 L120,65 L120,75" fill="#FF6B6B" />
      <path d="M20,75 Q35,85 50,75 Q65,85 80,75 Q95,85 110,75 L120,75 L120,65 L20,65 Z" fill="#FF6B6B" />
      <path d="M25,75 Q38,82 50,75 Q62,82 75,75 Q88,82 100,75" fill="none" stroke="#D64545" strokeWidth="2" />

      {/* Giant speech bubble sign */}
      <ellipse cx="70" cy="40" rx="30" ry="20" fill="#FFF" stroke="#333" strokeWidth="2" />
      <polygon points="65,58 70,70 80,58" fill="#FFF" stroke="#333" strokeWidth="2" />
      <text x="70" y="45" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">CAFE</text>

      {/* Large window */}
      <rect x="35" y="85" width="70" height="35" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} rx="2" />

      {/* People talking inside */}
      <circle cx="55" cy="105" r="8" fill="#FFD700" /> {/* Head 1 */}
      <rect x="48" y="113" width="14" height="8" fill="#4169E1" rx="2" />

      <circle cx="85" cy="103" r="8" fill="#90EE90" /> {/* Head 2 */}
      <rect x="78" y="111" width="14" height="8" fill="#DC143C" rx="2" />

      {/* Speech bubbles floating */}
      {isHovered && (
        <g className="animate-float">
          <ellipse cx="45" cy="88" rx="10" ry="6" fill="#FFF" opacity="0.9" />
          <text x="45" y="91" fontSize="6" fill="#333" textAnchor="middle">Hi!</text>

          <ellipse cx="95" cy="85" rx="12" ry="7" fill="#FFF" opacity="0.9" />
          <text x="95" y="88" fontSize="6" fill="#333" textAnchor="middle">Hello!</text>
        </g>
      )}

      {/* Door */}
      <rect x="55" y="125" width="30" height="35" fill="#8B4513" rx="2" />
      <rect x="60" y="130" width="20" height="15" fill="#87CEEB" rx="1" />
      <circle cx="80" cy="145" r="2" fill="#FFD700" />

      {/* Outdoor table */}
      <ellipse cx="25" cy="150" rx="12" ry="6" fill="#8B4513" />
      <rect x="22" y="150" width="6" height="10" fill="#8B4513" />
      <circle cx="20" cy="145" r="4" fill="#FFF" /> {/* Cup */}

      {/* Menu board */}
      <rect x="100" y="125" width="15" height="20" fill="#2C3E50" rx="1" />
      <line x1="103" y1="130" x2="112" y2="130" stroke="#FFF" strokeWidth="1" />
      <line x1="103" y1="135" x2="112" y2="135" stroke="#FFF" strokeWidth="1" />
      <line x1="103" y1="140" x2="112" y2="140" stroke="#FFF" strokeWidth="1" />

      {isCompleted && (
        <rect x="18" y="25" width="104" height="137" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

/**
 * Default Building - fallback for unknown activity types
 */
function DefaultBuilding({ isHovered, isCompleted, accentColor }) {
  return (
    <g filter="url(#softShadow)">
      {/* Simple house */}
      <rect x="30" y="80" width="80" height="80" fill="url(#wallGradient)" rx="4" />

      {/* Roof */}
      <polygon points="20,80 70,35 120,80" fill="url(#roofGradient)" />

      {/* Door */}
      <rect x="55" y="115" width="30" height="45" fill="#654321" rx="2" />
      <circle cx="80" cy="140" r="3" fill="#FFD700" />

      {/* Windows */}
      <rect x="35" y="90" width="20" height="20" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} rx="2" />
      <rect x="85" y="90" width="20" height="20" fill={isHovered ? "url(#windowGlow)" : "#87CEEB"} rx="2" />

      {/* Question mark - indicating unconfigured */}
      <circle cx="70" cy="55" r="12" fill="#FFD700" />
      <text x="70" y="60" fontSize="16" fill="#333" textAnchor="middle" fontWeight="bold">?</text>

      {isCompleted && (
        <rect x="28" y="33" width="84" height="129" fill="none" stroke="#10B981" strokeWidth="3" rx="6" opacity="0.8" />
      )}
    </g>
  )
}

// Add CSS animations via style tag (will be injected when component mounts)
const styleSheet = `
  @keyframes building-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
    50% { transform: translateY(-10px) rotate(5deg); opacity: 1; }
  }

  @keyframes float-up {
    0% { transform: translateY(0); opacity: 0.6; }
    100% { transform: translateY(-20px); opacity: 0; }
  }

  @keyframes float-notes {
    0%, 100% { transform: translateY(0) rotate(-5deg); }
    50% { transform: translateY(-8px) rotate(5deg); }
  }

  @keyframes swing {
    0%, 100% { transform: rotate(-5deg); }
    50% { transform: rotate(5deg); }
  }

  @keyframes wave {
    0%, 100% { transform: skewX(0deg); }
    25% { transform: skewX(5deg); }
    75% { transform: skewX(-5deg); }
  }

  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes equalizer {
    0%, 100% { transform: scaleY(0.5); }
    50% { transform: scaleY(1.2); }
  }

  @keyframes bounce-in {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }

  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-float-up { animation: float-up 2s ease-out infinite; }
  .animate-float-notes { animation: float-notes 2s ease-in-out infinite; }
  .animate-swing { animation: swing 2s ease-in-out infinite; }
  .animate-wave { animation: wave 1s ease-in-out infinite; }
  .animate-spin-slow { animation: spin-slow 4s linear infinite; }
  .animate-equalizer { animation: equalizer 0.5s ease-in-out infinite; }
  .animate-bounce-in { animation: bounce-in 0.5s ease-out forwards; }
`

// Inject styles on first render
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('activity-building-styles')
  if (!existingStyle) {
    const style = document.createElement('style')
    style.id = 'activity-building-styles'
    style.textContent = styleSheet
    document.head.appendChild(style)
  }
}
