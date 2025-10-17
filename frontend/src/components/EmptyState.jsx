import React from 'react'

/**
 * Reusable EmptyState component for consistent empty state UX
 * @param {string} icon - Emoji or icon to display
 * @param {string} title - Main heading text
 * @param {string} description - Supporting description text
 * @param {object} action - Optional action button { label, onClick, variant }
 * @param {string} size - Size variant: 'small' | 'medium' | 'large'
 */
export default function EmptyState({
  icon = '📋',
  title = 'No items yet',
  description = 'Items will appear here when available',
  action = null,
  size = 'medium',
  children
}) {
  const sizeClasses = {
    small: {
      container: 'py-8',
      icon: 'text-4xl mb-2',
      title: 'text-base font-semibold',
      description: 'text-xs'
    },
    medium: {
      container: 'py-12',
      icon: 'text-6xl mb-4',
      title: 'text-xl font-semibold',
      description: 'text-sm'
    },
    large: {
      container: 'py-16',
      icon: 'text-8xl mb-6',
      title: 'text-2xl font-bold',
      description: 'text-base'
    }
  }

  const classes = sizeClasses[size] || sizeClasses.medium

  return (
    <div className={`text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 ${classes.container}`}>
      <div className={classes.icon}>{icon}</div>
      <h3 className={`${classes.title} text-gray-900 mb-2`}>
        {title}
      </h3>
      <p className={`${classes.description} text-gray-600 max-w-md mx-auto`}>
        {description}
      </p>

      {action && (
        <div className="mt-6">
          <button
            onClick={action.onClick}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              action.variant === 'primary'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : action.variant === 'secondary'
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {action.label}
          </button>
        </div>
      )}

      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Specialized empty state for "No Sessions"
 */
export function NoSessionsEmpty({ onCreate }) {
  return (
    <EmptyState
      icon="🎓"
      title="No sessions yet"
      description="Create your first session to start teaching with AI-powered content. Your students will join using a unique code."
      action={{
        label: '+ Create Your First Session',
        onClick: onCreate,
        variant: 'primary'
      }}
    />
  )
}

/**
 * Specialized empty state for "No Students"
 */
export function NoStudentsEmpty({ joinCode, isCurrent = true }) {
  return (
    <EmptyState
      icon="👥"
      title={isCurrent ? "No students have joined yet" : "No students joined this period"}
      description={
        isCurrent
          ? `Share the join code ${joinCode || 'above'} with your students. They can join from any device without creating an account.`
          : "This class period had no student participation."
      }
      size="medium"
    />
  )
}

/**
 * Specialized empty state for "No Activities"
 */
export function NoActivitiesEmpty({ onGenerate }) {
  return (
    <EmptyState
      icon="✨"
      title="No activities created yet"
      description="Use AI to generate reading passages, quizzes, comprehension questions, and discussion prompts tailored to your subject and students' level."
      action={onGenerate ? {
        label: '✨ Generate First Activity',
        onClick: onGenerate,
        variant: 'primary'
      } : null}
      size="medium"
    />
  )
}

/**
 * Specialized empty state for "No Slides"
 */
export function NoSlidesEmpty({ onGenerate }) {
  return (
    <EmptyState
      icon="📽️"
      title="No slide decks yet"
      description="Generate AI-powered presentation slides for your lessons. Edit them with our Google Slides-style canvas editor and present to your class."
      action={{
        label: '✨ Create Your First Deck',
        onClick: onGenerate,
        variant: 'primary'
      }}
      size="large"
    />
  )
}

/**
 * Specialized empty state for "No Session Selected"
 */
export function NoSessionSelectedEmpty({ onCreate }) {
  return (
    <EmptyState
      icon="🎯"
      title="No session selected"
      description="Select a session from the sidebar to view details, or create a new one to get started."
      action={onCreate ? {
        label: '+ Create New Session',
        onClick: onCreate,
        variant: 'secondary'
      } : null}
      size="large"
    />
  )
}

/**
 * Specialized empty state for "No Analytics Data"
 */
export function NoAnalyticsEmpty() {
  return (
    <EmptyState
      icon="📊"
      title="No analytics data yet"
      description="Analytics will appear here once students start responding to activities. You'll see performance trends, engagement metrics, and areas where students need help."
      size="large"
    />
  )
}

/**
 * Specialized empty state for Student Dashboard
 */
export function NoRecentSessionsEmpty() {
  return (
    <EmptyState
      icon="📚"
      title="No sessions yet"
      description="Enter a session code above to join your first class! Your teacher will provide you with a unique code to access today's lesson."
      size="medium"
    />
  )
}

/**
 * Specialized empty state for "No Activity Pushed"
 */
export function NoActivityPushedEmpty() {
  return (
    <EmptyState
      icon="⏳"
      title="Waiting for teacher..."
      description="Your teacher is preparing the next activity. Please wait while they set up your lesson content."
      size="medium"
    >
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
        <div className="animate-pulse">●</div>
        <div className="animate-pulse animation-delay-200">●</div>
        <div className="animate-pulse animation-delay-400">●</div>
      </div>
    </EmptyState>
  )
}
