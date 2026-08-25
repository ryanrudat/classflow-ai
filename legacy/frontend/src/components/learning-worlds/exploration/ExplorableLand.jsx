import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAudioManager } from '../../../hooks/useAudioManager'
import SceneItem from './SceneItem'
import DiscoveryPopup from './DiscoveryPopup'
import DiscoveryProgress from './DiscoveryProgress'
import CharacterGuide from './CharacterGuide'

/**
 * ExplorableLand Component
 *
 * An immersive, explorable scene where vocabulary items are placed as
 * interactive elements. Students discover vocabulary by touching items,
 * which then animate and play audio.
 *
 * Flow:
 * 1. Student enters land, sees illustrated scene with glowing items
 * 2. Student touches an item → item animates, word appears, audio plays
 * 3. After discovering enough items, activities unlock
 * 4. Activities use the discovered vocabulary
 */
export default function ExplorableLand({
  land,
  sceneItems = [],
  discoveredIds = [],
  onDiscoverItem,
  onActivitiesUnlock,
  onBack,
  ageLevel = 2,
  character = null,
  sessionId = null
}) {
  const audioManager = useAudioManager() || {}
  const { playSound, playVoice } = audioManager

  // Discovery state
  const [localDiscoveries, setLocalDiscoveries] = useState(new Set(discoveredIds))
  const [activePopup, setActivePopup] = useState(null)
  const [showUnlockCelebration, setShowUnlockCelebration] = useState(false)
  const [hintItem, setHintItem] = useState(null)
  const [isEntering, setIsEntering] = useState(true)

  // Computed values
  const discoveryCount = localDiscoveries.size
  const totalItems = sceneItems.length
  const requiredDiscoveries = land.min_discoveries_for_activities || 3
  const activitiesUnlocked = discoveryCount >= requiredDiscoveries
  const allDiscovered = discoveryCount >= totalItems

  // Filter items by age level
  const visibleItems = useMemo(() => {
    return sceneItems.filter(item =>
      item.min_age_level <= ageLevel &&
      item.max_age_level >= ageLevel &&
      !item.is_hidden
    )
  }, [sceneItems, ageLevel])

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Sync with parent discoveries
  useEffect(() => {
    setLocalDiscoveries(new Set(discoveredIds))
  }, [discoveredIds])

  // Hint system - suggest undiscovered item after delay
  useEffect(() => {
    if (!land.guide_hints_enabled || allDiscovered) return

    const undiscovered = visibleItems.filter(item => !localDiscoveries.has(item.vocabulary_id))
    if (undiscovered.length === 0) return

    const hintDelay = (land.hint_delay_seconds || 15) * 1000
    const timer = setTimeout(() => {
      // Pick a random undiscovered item
      const randomItem = undiscovered[Math.floor(Math.random() * undiscovered.length)]
      setHintItem(randomItem)

      // Clear hint after 5 seconds
      setTimeout(() => setHintItem(null), 5000)
    }, hintDelay)

    return () => clearTimeout(timer)
  }, [localDiscoveries, visibleItems, land.guide_hints_enabled, land.hint_delay_seconds, allDiscovered])

  // Check for activity unlock
  useEffect(() => {
    if (discoveryCount === requiredDiscoveries && !showUnlockCelebration) {
      setShowUnlockCelebration(true)
      playSound?.('unlock')
      onActivitiesUnlock?.()

      // Hide celebration after 3 seconds
      setTimeout(() => setShowUnlockCelebration(false), 3000)
    }
  }, [discoveryCount, requiredDiscoveries])

  // Handle item discovery
  const handleItemTouch = useCallback((item) => {
    const isNewDiscovery = !localDiscoveries.has(item.vocabulary_id)

    // Play word audio
    const audioUrl = item.touch_sound_url || item.vocabulary?.audio_url
    if (audioUrl) {
      playVoice?.(audioUrl)
    }

    // Show discovery popup
    setActivePopup({
      item,
      isNew: isNewDiscovery,
      word: item.vocabulary?.word || item.word,
      imageUrl: item.sprite_url || item.vocabulary?.image_url,
      responseText: item.touch_response_text
    })

    // Record discovery
    if (isNewDiscovery) {
      setLocalDiscoveries(prev => new Set([...prev, item.vocabulary_id]))
      playSound?.('discover')
      onDiscoverItem?.(item, {
        vocabularyId: item.vocabulary_id,
        sceneItemId: item.id,
        landId: land.id,
        sessionId
      })
    }

    // Auto-close popup after delay
    setTimeout(() => setActivePopup(null), 2500)
  }, [localDiscoveries, land.id, sessionId, playVoice, playSound, onDiscoverItem])

  // Close popup on background tap
  const handleBackgroundTap = useCallback((e) => {
    if (e.target === e.currentTarget) {
      setActivePopup(null)
    }
  }, [])

  return (
    <div
      className={`
        w-full h-full relative overflow-hidden
        transition-opacity duration-700
        ${isEntering ? 'opacity-0' : 'opacity-100'}
      `}
      onClick={handleBackgroundTap}
    >
      {/* Scene Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: land.scene_background_url
            ? `url(${land.scene_background_url})`
            : land.background_url
            ? `url(${land.background_url})`
            : `linear-gradient(180deg, #87CEEB 0%, #98D8C8 60%, #7CB342 100%)`
        }}
      />

      {/* Ambient overlay for atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 pointer-events-none" />

      {/* Scene Items Layer */}
      <div className="absolute inset-0">
        {visibleItems.map((item) => (
          <SceneItem
            key={item.id}
            item={item}
            isDiscovered={localDiscoveries.has(item.vocabulary_id)}
            isHinted={hintItem?.id === item.id}
            onTouch={() => handleItemTouch(item)}
            ageLevel={ageLevel}
          />
        ))}
      </div>

      {/* Scene Foreground (optional layer) */}
      {land.scene_foreground_url && (
        <div
          className="absolute inset-0 bg-contain bg-bottom bg-no-repeat pointer-events-none"
          style={{ backgroundImage: `url(${land.scene_foreground_url})` }}
        />
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-105"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-semibold text-gray-700">Back</span>
          </button>

          {/* Land Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
            {land.name}
          </h1>

          {/* Discovery Progress */}
          <DiscoveryProgress
            discovered={discoveryCount}
            total={totalItems}
            required={requiredDiscoveries}
            activitiesUnlocked={activitiesUnlocked}
            ageLevel={ageLevel}
          />
        </div>
      </div>

      {/* Character Guide */}
      {character && (
        <CharacterGuide
          character={character}
          discoveryCount={discoveryCount}
          requiredDiscoveries={requiredDiscoveries}
          activitiesUnlocked={activitiesUnlocked}
          allDiscovered={allDiscovered}
          hintItem={hintItem}
          ageLevel={ageLevel}
        />
      )}

      {/* Discovery Popup */}
      {activePopup && (
        <DiscoveryPopup
          word={activePopup.word}
          imageUrl={activePopup.imageUrl}
          responseText={activePopup.responseText}
          isNew={activePopup.isNew}
          onClose={() => setActivePopup(null)}
          ageLevel={ageLevel}
        />
      )}

      {/* Activities Unlock Celebration */}
      {showUnlockCelebration && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl transform animate-bounceIn max-w-md mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Activities Unlocked!
            </h2>
            <p className="text-gray-600">
              Great exploring! Now you can play games with the words you discovered!
            </p>
          </div>
        </div>
      )}

      {/* Exploration Instructions (shown initially) */}
      {discoveryCount === 0 && !isEntering && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg animate-bounce-slow">
            <p className={`font-semibold text-gray-700 ${ageLevel === 1 ? 'text-lg' : 'text-base'}`}>
              👆 Touch the glowing things to discover words!
            </p>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-8px); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-bounceIn { animation: bounceIn 0.5s ease-out; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
