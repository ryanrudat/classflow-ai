/**
 * Learning World Activity Types Configuration
 *
 * Defines all supported activity types with their metadata.
 */

export const ACTIVITY_TYPES = {
  // Core Activities (All Ages)
  vocabulary_touch: {
    name: 'Vocabulary Touch',
    description: 'Touch images to learn words',
    icon: '👆',
    minAgeLevel: 1,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: true,
    category: 'vocabulary'
  },

  matching_game: {
    name: 'Matching Game',
    description: 'Match words to pictures',
    icon: '🔗',
    minAgeLevel: 1,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: false,
    category: 'vocabulary'
  },

  listen_point: {
    name: 'Listen and Point',
    description: 'Point to what you hear',
    icon: '👂',
    minAgeLevel: 1,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: true,
    category: 'listening'
  },

  tpr_action: {
    name: 'TPR Action',
    description: 'Follow movement instructions',
    icon: '🏃',
    minAgeLevel: 1,
    maxAgeLevel: 3,
    interactive: false, // Teacher demos
    requiresAudio: false,
    category: 'movement'
  },

  coloring: {
    name: 'Coloring',
    description: 'Touch to color sections',
    icon: '🎨',
    minAgeLevel: 1,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: false,
    category: 'creative'
  },

  letter_tracing: {
    name: 'Letter Tracing',
    description: 'Trace letters with your finger',
    icon: '✍️',
    minAgeLevel: 1,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: false,
    category: 'writing'
  },

  drawing: {
    name: 'Drawing',
    description: 'Draw and color freely',
    icon: '🖌️',
    minAgeLevel: 1,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: false,
    category: 'creative'
  },

  story_sequence: {
    name: 'Story Sequence',
    description: 'Order story pictures',
    icon: '📖',
    minAgeLevel: 1,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: false,
    category: 'comprehension'
  },

  // Level 2+ Activities (Ages 7-8+)
  fill_in_blank: {
    name: 'Fill in the Blank',
    description: 'Complete the sentence',
    icon: '✏️',
    minAgeLevel: 2,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: false,
    category: 'grammar'
  },

  word_spelling: {
    name: 'Word Spelling',
    description: 'Spell words by touching letters',
    icon: '🔤',
    minAgeLevel: 2,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: true,
    category: 'spelling'
  },

  sentence_builder: {
    name: 'Sentence Builder',
    description: 'Arrange words into sentences',
    icon: '📝',
    minAgeLevel: 2,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: false,
    category: 'grammar'
  },

  // Level 3 Activities (Ages 9-10)
  reading_comprehension: {
    name: 'Reading Comprehension',
    description: 'Read passage, answer questions',
    icon: '📚',
    minAgeLevel: 3,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: false,
    category: 'reading'
  },

  dictation: {
    name: 'Dictation',
    description: 'Listen and type what you hear',
    icon: '🎧',
    minAgeLevel: 3,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: true,
    category: 'listening'
  },

  story_writing: {
    name: 'Story Writing',
    description: 'Write continuation of story',
    icon: '✍️',
    minAgeLevel: 3,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: false,
    category: 'writing'
  },

  dialogue_practice: {
    name: 'Dialogue Practice',
    description: 'Read/listen to dialogues, respond',
    icon: '💬',
    minAgeLevel: 3,
    maxAgeLevel: 3,
    interactive: true,
    requiresAudio: true,
    category: 'speaking'
  }
}

/**
 * Get activities available for a specific age level
 */
export function getActivitiesForLevel(ageLevel) {
  return Object.entries(ACTIVITY_TYPES)
    .filter(([_, config]) => config.minAgeLevel <= ageLevel && config.maxAgeLevel >= ageLevel)
    .reduce((acc, [type, config]) => {
      acc[type] = config
      return acc
    }, {})
}

/**
 * Get activity config by type
 */
export function getActivityConfig(activityType) {
  return ACTIVITY_TYPES[activityType] || null
}

/**
 * Get icon for activity type
 */
export function getActivityIcon(activityType) {
  return ACTIVITY_TYPES[activityType]?.icon || '🎯'
}

/**
 * Activity categories for grouping
 */
export const ACTIVITY_CATEGORIES = {
  vocabulary: { name: 'Vocabulary', icon: '📚' },
  listening: { name: 'Listening', icon: '👂' },
  movement: { name: 'Movement (TPR)', icon: '🏃' },
  creative: { name: 'Creative', icon: '🎨' },
  comprehension: { name: 'Comprehension', icon: '🧠' },
  grammar: { name: 'Grammar', icon: '📝' },
  spelling: { name: 'Spelling', icon: '🔤' },
  reading: { name: 'Reading', icon: '📖' },
  writing: { name: 'Writing', icon: '✍️' },
  speaking: { name: 'Speaking', icon: '💬' }
}

/**
 * Age level configuration
 */
export const AGE_LEVELS = {
  1: {
    label: 'Level 1',
    ages: '4-6 years',
    description: 'Single words, large touch targets, audio + visual only',
    touchTargetSize: 80,
    sessionLength: '8-15 min',
    activityLength: '2-3 min'
  },
  2: {
    label: 'Level 2',
    ages: '7-8 years',
    description: 'Phrases and short sentences, moderate challenge',
    touchTargetSize: 60,
    sessionLength: '15-20 min',
    activityLength: '3-5 min'
  },
  3: {
    label: 'Level 3',
    ages: '9-10 years',
    description: 'Sentences and paragraphs, multi-step challenges',
    touchTargetSize: 48,
    sessionLength: '20-30 min',
    activityLength: '5-8 min'
  }
}

export default ACTIVITY_TYPES
