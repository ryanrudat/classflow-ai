import React from 'react'

/**
 * Animated shimmer effect for skeleton loaders
 */
export function SkeletonShimmer() {
  return (
    <div className="animate-pulse-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent absolute inset-0" />
  )
}

/**
 * Basic skeleton box
 */
export function Skeleton({ className = '', animate = true }) {
  return (
    <div className={`bg-gray-200 rounded relative overflow-hidden ${animate ? 'animate-pulse' : ''} ${className}`}>
      {animate && <SkeletonShimmer />}
    </div>
  )
}

/**
 * Skeleton loader for session cards
 */
export function SessionCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border-2 border-gray-200 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-5 rounded" />
      </div>
    </div>
  )
}

/**
 * Skeleton loader for student list
 */
export function StudentListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border-2 border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for activity cards
 */
export function ActivityCardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border-2 border-gray-200 bg-white">
          <div className="flex items-start gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex items-center gap-3 mt-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for slide deck cards
 */
export function SlideDeckSkeleton({ count = 2 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 border-2 border-gray-200 rounded-lg bg-white">
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Spinning loader (replacement for basic spinners)
 */
export function Spinner({ size = 'medium', color = 'blue' }) {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-6 w-6 border-2',
    large: 'h-8 w-8 border-2',
    xlarge: 'h-12 w-12 border-3'
  }

  const colorClasses = {
    blue: 'border-blue-600',
    indigo: 'border-indigo-600',
    purple: 'border-purple-600',
    white: 'border-white',
    gray: 'border-gray-600'
  }

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} border-t-transparent`} />
  )
}

/**
 * Loading spinner with text
 */
export function LoadingSpinner({ text = 'Loading...', size = 'medium' }) {
  return (
    <div className="flex items-center justify-center py-8">
      <Spinner size={size} />
      <span className="ml-3 text-gray-600">{text}</span>
    </div>
  )
}

/**
 * Progress bar component
 */
export function ProgressBar({ progress = 0, showPercentage = true, color = 'blue', animated = true }) {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    indigo: 'bg-indigo-600'
  }

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300 ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-gray-600 text-center mt-1">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  )
}

/**
 * AI Generation progress indicator with animated text
 */
export function AIGenerationProgress({ stage = 'processing', progress = 0 }) {
  const stages = {
    processing: { text: 'Processing your request...', emoji: '🤔' },
    generating: { text: 'Generating content with AI...', emoji: '✨' },
    finalizing: { text: 'Almost done...', emoji: '📝' },
    complete: { text: 'Complete!', emoji: '✅' }
  }

  const currentStage = stages[stage] || stages.processing

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl animate-bounce">{currentStage.emoji}</span>
        <div className="flex-1">
          <div className="font-medium text-gray-900 mb-2">{currentStage.text}</div>
          <ProgressBar progress={progress} color="blue" animated={true} />
        </div>
      </div>
      <div className="text-xs text-gray-600 text-center">
        This usually takes 10-30 seconds depending on the content type
      </div>
    </div>
  )
}

/**
 * Pulsing dots animation (for "waiting" states)
 */
export function PulsingDots({ color = 'gray' }) {
  const colorClasses = {
    gray: 'bg-gray-400',
    blue: 'bg-blue-600',
    green: 'bg-green-600'
  }

  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${colorClasses[color]} animate-pulse`} />
      <div
        className={`w-2 h-2 rounded-full ${colorClasses[color]} animate-pulse`}
        style={{ animationDelay: '0.2s' }}
      />
      <div
        className={`w-2 h-2 rounded-full ${colorClasses[color]} animate-pulse`}
        style={{ animationDelay: '0.4s' }}
      />
    </div>
  )
}

/**
 * Full page loader
 */
export function FullPageLoader({ text = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Spinner size="xlarge" color="blue" />
        <p className="mt-4 text-gray-600 font-medium">{text}</p>
        <PulsingDots color="blue" />
      </div>
    </div>
  )
}

/**
 * Inline loader (for buttons)
 */
export function ButtonLoader({ text = 'Loading...', color = 'white' }) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="small" color={color} />
      <span>{text}</span>
    </div>
  )
}

/**
 * Loading overlay (for modals/sections)
 */
export function LoadingOverlay({ text = 'Loading...', transparent = false }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${
        transparent ? 'bg-white/70' : 'bg-white'
      } backdrop-blur-sm z-10 rounded-lg`}
    >
      <div className="text-center">
        <Spinner size="large" color="blue" />
        <p className="mt-3 text-gray-600 font-medium">{text}</p>
      </div>
    </div>
  )
}
