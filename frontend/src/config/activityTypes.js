/**
 * Activity Type Definitions
 * Centralized configuration for all activity types with categories, goals, and metadata
 */

// Teaching goals that organize activities by purpose
export const TEACHING_GOALS = {
  check_understanding: {
    id: 'check_understanding',
    label: 'Check Understanding',
    description: 'Quick checks to see if students grasp the material',
    icon: '✓',
    estimatedTime: '3-5 min'
  },
  deep_comprehension: {
    id: 'deep_comprehension',
    label: 'Deep Comprehension',
    description: 'Activities that require students to analyze and interpret',
    icon: '🔍',
    estimatedTime: '10-15 min'
  },
  build_connections: {
    id: 'build_connections',
    label: 'Build Connections',
    description: 'Help students see relationships between concepts',
    icon: '🔗',
    estimatedTime: '8-12 min'
  },
  critical_thinking: {
    id: 'critical_thinking',
    label: 'Critical Thinking',
    description: 'Challenge students to evaluate and form opinions',
    icon: '💭',
    estimatedTime: '15+ min'
  },
  vocabulary_language: {
    id: 'vocabulary_language',
    label: 'Vocabulary & Language',
    description: 'Focus on words, terms, and language skills',
    icon: '📝',
    estimatedTime: '5-10 min'
  },
  engagement: {
    id: 'engagement',
    label: 'Engagement & Discussion',
    description: 'Get students talking and participating',
    icon: '💬',
    estimatedTime: '5-15 min'
  }
}

// Subject areas for filtering
export const SUBJECTS = {
  all: { id: 'all', label: 'All Subjects' },
  english: { id: 'english', label: 'English / Language Arts' },
  social_studies: { id: 'social_studies', label: 'Social Studies / History' },
  science: { id: 'science', label: 'Science' },
  math: { id: 'math', label: 'Math' },
  general: { id: 'general', label: 'General / Cross-Subject' }
}

// All activity types with full metadata
export const ACTIVITY_TYPES = {
  // ═══════════════════════════════════════════════════════════════
  // EXISTING ACTIVITY TYPES (Enhanced with metadata)
  // ═══════════════════════════════════════════════════════════════

  quiz: {
    id: 'quiz',
    label: 'Quiz',
    description: 'Multiple choice questions to test knowledge',
    icon: '📝',
    color: 'purple',
    bgClass: 'bg-purple-100 border-purple-300',
    goals: ['check_understanding'],
    subjects: ['general'],
    estimatedTime: '5-10 min',
    aiGeneratable: true
  },

  questions: {
    id: 'questions',
    label: 'Discussion Questions',
    description: 'Open-ended questions for deeper thinking',
    icon: '❓',
    color: 'yellow',
    bgClass: 'bg-yellow-100 border-yellow-300',
    goals: ['deep_comprehension', 'critical_thinking'],
    subjects: ['general'],
    estimatedTime: '10-15 min',
    aiGeneratable: true
  },

  reading: {
    id: 'reading',
    label: 'Reading Comprehension',
    description: 'Text passages with comprehension questions',
    icon: '📖',
    color: 'blue',
    bgClass: 'bg-blue-100 border-blue-300',
    goals: ['deep_comprehension'],
    subjects: ['english', 'general'],
    estimatedTime: '10-15 min',
    aiGeneratable: true
  },

  discussion: {
    id: 'discussion',
    label: 'Discussion Prompts',
    description: 'Debate topics and discussion starters',
    icon: '💬',
    color: 'pink',
    bgClass: 'bg-pink-100 border-pink-300',
    goals: ['engagement', 'critical_thinking'],
    subjects: ['general'],
    estimatedTime: '10-20 min',
    aiGeneratable: true
  },

  interactive_video: {
    id: 'interactive_video',
    label: 'Interactive Video',
    description: 'Video with embedded questions at timestamps',
    icon: '🎥',
    color: 'indigo',
    bgClass: 'bg-indigo-100 border-indigo-300',
    goals: ['check_understanding', 'deep_comprehension'],
    subjects: ['general'],
    estimatedTime: '5-15 min',
    aiGeneratable: true,
    requiresUpload: true
  },

  sentence_ordering: {
    id: 'sentence_ordering',
    label: 'Sequence Ordering',
    description: 'Put sentences or events in correct order',
    icon: '📋',
    color: 'teal',
    bgClass: 'bg-teal-100 border-teal-300',
    goals: ['build_connections', 'check_understanding'],
    subjects: ['english', 'social_studies', 'general'],
    estimatedTime: '5-8 min',
    aiGeneratable: true
  },

  matching: {
    id: 'matching',
    label: 'Matching',
    description: 'Match terms to definitions or concepts',
    icon: '🎯',
    color: 'green',
    bgClass: 'bg-green-100 border-green-300',
    goals: ['check_understanding', 'vocabulary_language'],
    subjects: ['general'],
    estimatedTime: '5-8 min',
    aiGeneratable: true
  },

  poll: {
    id: 'poll',
    label: 'Live Poll',
    description: 'Quick opinion polls with real-time results',
    icon: '📊',
    color: 'orange',
    bgClass: 'bg-orange-100 border-orange-300',
    goals: ['engagement', 'check_understanding'],
    subjects: ['general'],
    estimatedTime: '2-5 min',
    aiGeneratable: false
  },

  // ═══════════════════════════════════════════════════════════════
  // NEW ENGLISH / LANGUAGE ARTS ACTIVITIES
  // ═══════════════════════════════════════════════════════════════

  vocabulary_context: {
    id: 'vocabulary_context',
    label: 'Vocabulary in Context',
    description: 'Choose word meanings based on how they\'re used',
    icon: '📚',
    color: 'emerald',
    bgClass: 'bg-emerald-100 border-emerald-300',
    goals: ['vocabulary_language', 'deep_comprehension'],
    subjects: ['english'],
    estimatedTime: '5-10 min',
    aiGeneratable: true,
    isNew: true
  },

  cause_effect: {
    id: 'cause_effect',
    label: 'Cause & Effect',
    description: 'Connect causes to their effects from the content',
    icon: '🔄',
    color: 'cyan',
    bgClass: 'bg-cyan-100 border-cyan-300',
    goals: ['build_connections', 'deep_comprehension'],
    subjects: ['english', 'social_studies', 'science'],
    estimatedTime: '8-12 min',
    aiGeneratable: true,
    isNew: true
  },

  character_perspective: {
    id: 'character_perspective',
    label: 'Character Perspective',
    description: 'Identify whose viewpoint or motivation is shown',
    icon: '👤',
    color: 'violet',
    bgClass: 'bg-violet-100 border-violet-300',
    goals: ['deep_comprehension', 'critical_thinking'],
    subjects: ['english'],
    estimatedTime: '8-12 min',
    aiGeneratable: true,
    isNew: true
  },

  text_evidence: {
    id: 'text_evidence',
    label: 'Text Evidence',
    description: 'Find evidence that supports a given claim',
    icon: '🔎',
    color: 'amber',
    bgClass: 'bg-amber-100 border-amber-300',
    goals: ['deep_comprehension', 'critical_thinking'],
    subjects: ['english'],
    estimatedTime: '10-15 min',
    aiGeneratable: true,
    isNew: true
  },

  // ═══════════════════════════════════════════════════════════════
  // NEW SOCIAL STUDIES / HISTORY ACTIVITIES
  // ═══════════════════════════════════════════════════════════════

  timeline: {
    id: 'timeline',
    label: 'Timeline Builder',
    description: 'Place events on a timeline in order',
    icon: '📅',
    color: 'rose',
    bgClass: 'bg-rose-100 border-rose-300',
    goals: ['build_connections', 'check_understanding'],
    subjects: ['social_studies'],
    estimatedTime: '8-12 min',
    aiGeneratable: true,
    isNew: true
  },

  map_interaction: {
    id: 'map_interaction',
    label: 'Map Interaction',
    description: 'Label or identify locations on a map',
    icon: '🗺️',
    color: 'lime',
    bgClass: 'bg-lime-100 border-lime-300',
    goals: ['check_understanding', 'build_connections'],
    subjects: ['social_studies'],
    estimatedTime: '5-10 min',
    aiGeneratable: false,
    isNew: true
  },

  perspective_sort: {
    id: 'perspective_sort',
    label: 'Perspective Sort',
    description: 'Categorize statements by whose viewpoint they represent',
    icon: '🔀',
    color: 'fuchsia',
    bgClass: 'bg-fuchsia-100 border-fuchsia-300',
    goals: ['critical_thinking', 'deep_comprehension'],
    subjects: ['social_studies', 'english'],
    estimatedTime: '10-15 min',
    aiGeneratable: true,
    isNew: true
  },

  primary_source: {
    id: 'primary_source',
    label: 'Source Analysis',
    description: 'Analyze who created a source and why',
    icon: '📜',
    color: 'stone',
    bgClass: 'bg-stone-100 border-stone-300',
    goals: ['critical_thinking', 'deep_comprehension'],
    subjects: ['social_studies'],
    estimatedTime: '12-18 min',
    aiGeneratable: true,
    isNew: true
  },

  // ═══════════════════════════════════════════════════════════════
  // CROSS-SUBJECT ACTIVITIES
  // ═══════════════════════════════════════════════════════════════

  venn_diagram: {
    id: 'venn_diagram',
    label: 'Compare & Contrast',
    description: 'Sort items into a Venn diagram',
    icon: '⭕',
    color: 'sky',
    bgClass: 'bg-sky-100 border-sky-300',
    goals: ['build_connections', 'critical_thinking'],
    subjects: ['english', 'social_studies', 'science', 'general'],
    estimatedTime: '10-15 min',
    aiGeneratable: true,
    isNew: true
  },

  fact_opinion: {
    id: 'fact_opinion',
    label: 'Fact vs. Opinion',
    description: 'Categorize statements as facts or opinions',
    icon: '⚖️',
    color: 'neutral',
    bgClass: 'bg-neutral-100 border-neutral-300',
    goals: ['critical_thinking', 'check_understanding'],
    subjects: ['english', 'social_studies', 'general'],
    estimatedTime: '5-8 min',
    aiGeneratable: true,
    isNew: true
  },

  analogy: {
    id: 'analogy',
    label: 'Analogy Completion',
    description: 'Complete analogies based on relationships',
    icon: '🧩',
    color: 'red',
    bgClass: 'bg-red-100 border-red-300',
    goals: ['vocabulary_language', 'build_connections'],
    subjects: ['english', 'general'],
    estimatedTime: '5-8 min',
    aiGeneratable: true,
    isNew: true
  },

  quote_attribution: {
    id: 'quote_attribution',
    label: 'Quote Attribution',
    description: 'Identify who said a quote and why it matters',
    icon: '💭',
    color: 'slate',
    bgClass: 'bg-slate-100 border-slate-300',
    goals: ['check_understanding', 'deep_comprehension'],
    subjects: ['english', 'social_studies'],
    estimatedTime: '5-10 min',
    aiGeneratable: true,
    isNew: true
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get activities filtered by teaching goal
 */
export function getActivitiesByGoal(goalId) {
  return Object.values(ACTIVITY_TYPES).filter(
    activity => activity.goals.includes(goalId)
  )
}

/**
 * Get activities filtered by subject
 */
export function getActivitiesBySubject(subjectId) {
  if (subjectId === 'all') {
    return Object.values(ACTIVITY_TYPES)
  }
  return Object.values(ACTIVITY_TYPES).filter(
    activity => activity.subjects.includes(subjectId) || activity.subjects.includes('general')
  )
}

/**
 * Get activities that can be AI-generated
 */
export function getAIGeneratableActivities() {
  return Object.values(ACTIVITY_TYPES).filter(
    activity => activity.aiGeneratable
  )
}

/**
 * Get activity by ID
 */
export function getActivityById(id) {
  return ACTIVITY_TYPES[id] || null
}

/**
 * Get all activity types as an array
 */
export function getAllActivities() {
  return Object.values(ACTIVITY_TYPES)
}

/**
 * Get new activity types (for highlighting)
 */
export function getNewActivities() {
  return Object.values(ACTIVITY_TYPES).filter(
    activity => activity.isNew
  )
}

/**
 * Group activities by goal for UI display
 */
export function getActivitiesGroupedByGoal() {
  const grouped = {}

  Object.entries(TEACHING_GOALS).forEach(([goalId, goal]) => {
    grouped[goalId] = {
      ...goal,
      activities: getActivitiesByGoal(goalId)
    }
  })

  return grouped
}

// ═══════════════════════════════════════════════════════════════
// LESSON FLOW TEMPLATES
// ═══════════════════════════════════════════════════════════════

export const LESSON_TEMPLATES = [
  {
    id: 'document_analysis_ss',
    name: 'Document Analysis',
    subject: 'Social Studies',
    description: 'Analyze a historical document or primary source',
    icon: '📜',
    activitySequence: ['reading', 'vocabulary_context', 'primary_source', 'discussion'],
    estimatedTime: '35-45 min'
  },
  {
    id: 'video_lesson',
    name: 'Video-Based Lesson',
    subject: 'Any Subject',
    description: 'Watch a video with comprehension checks',
    icon: '🎥',
    activitySequence: ['interactive_video', 'quiz', 'discussion'],
    estimatedTime: '20-30 min'
  },
  {
    id: 'reading_deep_dive',
    name: 'Reading Deep Dive',
    subject: 'English',
    description: 'Close reading with analysis activities',
    icon: '📖',
    activitySequence: ['reading', 'vocabulary_context', 'character_perspective', 'text_evidence'],
    estimatedTime: '40-50 min'
  },
  {
    id: 'compare_contrast',
    name: 'Compare & Contrast',
    subject: 'Any Subject',
    description: 'Explore similarities and differences',
    icon: '⭕',
    activitySequence: ['reading', 'venn_diagram', 'cause_effect', 'discussion'],
    estimatedTime: '30-40 min'
  },
  {
    id: 'historical_timeline',
    name: 'Historical Events',
    subject: 'Social Studies',
    description: 'Sequence and analyze historical events',
    icon: '📅',
    activitySequence: ['reading', 'timeline', 'cause_effect', 'perspective_sort'],
    estimatedTime: '35-45 min'
  },
  {
    id: 'quick_check',
    name: 'Quick Knowledge Check',
    subject: 'Any Subject',
    description: 'Fast formative assessment',
    icon: '✓',
    activitySequence: ['poll', 'quiz', 'matching'],
    estimatedTime: '10-15 min'
  },
  {
    id: 'vocabulary_focus',
    name: 'Vocabulary Builder',
    subject: 'English',
    description: 'Focus on key terms and language',
    icon: '📚',
    activitySequence: ['vocabulary_context', 'matching', 'analogy', 'sentence_ordering'],
    estimatedTime: '25-35 min'
  },
  {
    id: 'critical_analysis',
    name: 'Critical Analysis',
    subject: 'English / Social Studies',
    description: 'Evaluate sources and form opinions',
    icon: '💭',
    activitySequence: ['reading', 'fact_opinion', 'perspective_sort', 'discussion'],
    estimatedTime: '35-45 min'
  }
]

/**
 * Get templates filtered by subject
 */
export function getTemplatesBySubject(subject) {
  if (!subject || subject === 'all') {
    return LESSON_TEMPLATES
  }
  return LESSON_TEMPLATES.filter(
    template => template.subject.toLowerCase().includes(subject.toLowerCase()) ||
                template.subject === 'Any Subject'
  )
}
