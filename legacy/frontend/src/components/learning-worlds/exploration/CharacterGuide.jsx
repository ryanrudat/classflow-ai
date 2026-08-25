import { useState, useEffect } from 'react'
import CharacterAvatar from '../characters/CharacterAvatar'
import SpeechBubble from '../characters/SpeechBubble'

/**
 * CharacterGuide Component
 *
 * The character guide that accompanies students during exploration.
 * Provides encouragement, hints, and celebrates discoveries.
 */
export default function CharacterGuide({
  character,
  discoveryCount,
  requiredDiscoveries,
  activitiesUnlocked,
  allDiscovered,
  hintItem,
  ageLevel = 2
}) {
  const [message, setMessage] = useState(null)
  const [expression, setExpression] = useState('happy')
  const [lastDiscoveryCount, setLastDiscoveryCount] = useState(0)

  // Generate contextual messages
  useEffect(() => {
    // Initial greeting
    if (discoveryCount === 0 && lastDiscoveryCount === 0) {
      setMessage(getGreeting(character))
      setExpression('happy')
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }

    // Discovery celebration
    if (discoveryCount > lastDiscoveryCount) {
      const celebrationMsg = getDiscoveryMessage(discoveryCount, requiredDiscoveries, character)
      setMessage(celebrationMsg)
      setExpression('excited')
      setLastDiscoveryCount(discoveryCount)

      const timer = setTimeout(() => {
        setMessage(null)
        setExpression('happy')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [discoveryCount, lastDiscoveryCount, requiredDiscoveries, character])

  // Activities unlocked message
  useEffect(() => {
    if (activitiesUnlocked && discoveryCount === requiredDiscoveries) {
      setTimeout(() => {
        setMessage(getUnlockMessage(character))
        setExpression('excited')
        setTimeout(() => setMessage(null), 4000)
      }, 500)
    }
  }, [activitiesUnlocked, discoveryCount, requiredDiscoveries, character])

  // Hint message
  useEffect(() => {
    if (hintItem) {
      setMessage(getHintMessage(hintItem, character))
      setExpression('thinking')
      return () => setExpression('happy')
    }
  }, [hintItem, character])

  // All discovered celebration
  useEffect(() => {
    if (allDiscovered && discoveryCount > 0) {
      setMessage(getAllDiscoveredMessage(character))
      setExpression('excited')
    }
  }, [allDiscovered, discoveryCount, character])

  if (!character) return null

  return (
    <div className="absolute left-4 bottom-4 z-30 flex items-end gap-3">
      <CharacterAvatar
        name={character.name}
        avatarUrl={character.avatar_url}
        expression={expression}
        size={ageLevel === 1 ? 'large' : 'medium'}
      />

      {message && (
        <div className="max-w-xs animate-fadeIn">
          <SpeechBubble
            message={message}
            characterName={character.short_name || character.name}
            onClose={() => setMessage(null)}
            ageLevel={ageLevel}
            autoHide={false}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  )
}

// Message generators
function getGreeting(character) {
  const name = character?.short_name || character?.name || 'friend'
  const greetings = [
    `Hi there! I'm ${name}! Touch the glowing things to discover new words!`,
    `Welcome! Let's explore together! Touch something that's glowing!`,
    `Hello! Can you find all the hidden words? Touch to discover them!`
  ]
  return greetings[Math.floor(Math.random() * greetings.length)]
}

function getDiscoveryMessage(count, required, character) {
  const remaining = required - count

  if (remaining === 0) {
    return null // Handled by unlock message
  }

  const messages = [
    `Great job! ${remaining} more to go!`,
    `You found it! Keep exploring!`,
    `Awesome! ${remaining > 1 ? `${remaining} more` : 'Just 1 more'} to unlock the games!`,
    `Wonderful! You're doing great!`,
    `Yes! That's right!`
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}

function getUnlockMessage(character) {
  const messages = [
    `Hooray! You unlocked the games! Ready to play?`,
    `Amazing! Now we can play with all the words you found!`,
    `Great exploring! The games are ready for you!`
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}

function getHintMessage(hintItem, character) {
  const word = hintItem.vocabulary?.word || 'something'
  const messages = [
    `Hmm, have you tried touching that glowing thing over there?`,
    `I see something glowing! Can you find it?`,
    `Look! There's something you haven't discovered yet!`
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}

function getAllDiscoveredMessage(character) {
  const messages = [
    `WOW! You found everything! You're a super explorer!`,
    `Amazing! You discovered all the words!`,
    `Incredible! You found them all! Great job!`
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}
