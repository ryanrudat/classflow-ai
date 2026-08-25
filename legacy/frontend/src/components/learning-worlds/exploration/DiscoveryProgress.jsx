/**
 * DiscoveryProgress Component
 *
 * Shows the student's progress in discovering vocabulary items.
 * Displays count and visual progress toward unlocking activities.
 */
export default function DiscoveryProgress({
  discovered,
  total,
  required,
  activitiesUnlocked,
  ageLevel = 2
}) {
  const progressPercent = total > 0 ? Math.min((discovered / total) * 100, 100) : 0
  const unlockPercent = required > 0 ? Math.min((discovered / required) * 100, 100) : 100

  // Sizing based on age
  const containerClass = ageLevel === 1
    ? 'px-5 py-3 text-lg'
    : ageLevel === 2
    ? 'px-4 py-2 text-base'
    : 'px-3 py-2 text-sm'

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg ${containerClass}`}>
      {/* Main progress display */}
      <div className="flex items-center gap-3">
        {/* Discovery icon */}
        <div className="text-2xl">
          {activitiesUnlocked ? '🎯' : '🔍'}
        </div>

        {/* Count and label */}
        <div>
          <div className="font-bold text-gray-800">
            {discovered} / {total}
          </div>
          <div className="text-xs text-gray-500">
            {activitiesUnlocked ? 'Discovered' : `${required - discovered} more to unlock games`}
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              activitiesUnlocked ? 'bg-emerald-500' : 'bg-yellow-400'
            }`}
            style={{ width: `${activitiesUnlocked ? progressPercent : unlockPercent}%` }}
          />
        </div>

        {/* Unlock indicator */}
        {activitiesUnlocked && (
          <div className="text-emerald-500 animate-pulse">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Discovery dots (visual representation) */}
      {total <= 8 && (
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`
                w-2 h-2 rounded-full transition-all duration-300
                ${i < discovered
                  ? 'bg-yellow-400 scale-110'
                  : i < required
                  ? 'bg-gray-300'
                  : 'bg-gray-200'
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  )
}
