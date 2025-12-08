import { useState } from 'react'
import { LESSON_TEMPLATES, getActivityById, getTemplatesBySubject } from '../config/activityTypes'

/**
 * LessonFlowTemplateSelector Component
 * Allows teachers to start from a pre-built lesson template or build from scratch
 * Handles video-based templates differently - prompts for video selection
 *
 * Props:
 * - onSelectTemplate: (template, { topic?, videoId? }) => void - Called when template is selected
 * - onBuildFromScratch: () => void - Called when user wants to build manually
 * - subject: string - Optional subject filter
 * - availableVideos: array - Videos available in the session for video-based templates
 */
export default function LessonFlowTemplateSelector({
  onSelectTemplate,
  onBuildFromScratch,
  subject = 'all',
  availableVideos = [],
  preselectedVideo = null
}) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [topic, setTopic] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState(preselectedVideo?.id || null)
  const [showInputStep, setShowInputStep] = useState(false)

  const templates = getTemplatesBySubject(subject)

  // Parse preselected video content for display
  const preselectedVideoContent = preselectedVideo
    ? (typeof preselectedVideo.content === 'string' ? JSON.parse(preselectedVideo.content) : preselectedVideo.content)
    : null

  // Check if template is video-based
  const isVideoTemplate = (template) => {
    return template.activitySequence.includes('interactive_video')
  }

  const handleSelect = (template) => {
    setSelectedTemplate(template.id)
    setShowInputStep(false)
    setTopic('')
    setSelectedVideoId(null)
  }

  const handleContinue = () => {
    setShowInputStep(true)
  }

  const handleGenerate = () => {
    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return

    if (isVideoTemplate(template)) {
      // Video-based template - pass selected video
      if (selectedVideoId && onSelectTemplate) {
        onSelectTemplate(template, { videoId: selectedVideoId })
      }
    } else {
      // Topic-based template
      if (topic.trim() && onSelectTemplate) {
        onSelectTemplate(template, { topic: topic.trim() })
      }
    }
  }

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)
  const templateIsVideo = selectedTemplateData && isVideoTemplate(selectedTemplateData)

  // Get video activities from availableVideos
  const videoActivities = availableVideos.filter(a => a.type === 'interactive_video')

  return (
    <div className="space-y-6">
      {/* Preselected Video Banner */}
      {preselectedVideo && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Creating lesson flow from:</p>
              <p className="font-semibold text-gray-900">
                {preselectedVideoContent?.originalFilename || preselectedVideo.prompt || 'Selected Video'}
              </p>
              {preselectedVideoContent?.transcript && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Transcript ready
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-blue-700 mt-3">
            Choose a video-based template below to generate activities from this video's transcript.
          </p>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900">
          {preselectedVideo ? 'Choose a Template' : 'Start Your Lesson Flow'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {preselectedVideo
            ? 'Select a template to generate activities from your video'
            : 'Choose a template to get started quickly, or build from scratch'
          }
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sort video templates first when a video is preselected */}
        {[...templates].sort((a, b) => {
          if (preselectedVideo) {
            const aIsVideo = isVideoTemplate(a)
            const bIsVideo = isVideoTemplate(b)
            if (aIsVideo && !bIsVideo) return -1
            if (!aIsVideo && bIsVideo) return 1
          }
          return 0
        }).map(template => {
          const isVideo = isVideoTemplate(template)
          const isRecommended = preselectedVideo && isVideo
          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className={`p-4 border-2 rounded-lg text-left transition-all relative ${
                selectedTemplate === template.id
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                  : isRecommended
                    ? 'border-blue-300 bg-blue-50 hover:border-blue-400'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
              }`}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  Recommended
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{template.name}</span>
                    <span className="text-xs text-gray-500">{template.estimatedTime}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{template.subject}</p>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>

                  {/* Activity sequence preview */}
                  <div className="flex items-center gap-1 mt-3 flex-wrap">
                    {template.activitySequence.map((activityId, idx) => {
                      const activity = getActivityById(activityId)
                      if (!activity) return null
                      return (
                        <div key={idx} className="flex items-center">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-gray-100"
                            title={activity.label}
                          >
                            {activity.icon}
                          </span>
                          {idx < template.activitySequence.length - 1 && (
                            <svg className="w-3 h-3 text-gray-400 mx-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Template type indicator */}
                  <div className="mt-2">
                    {isVideo ? (
                      <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Uses video transcript to generate activities
                      </span>
                    ) : (
                      <span className="text-xs text-purple-600 font-medium">
                        {template.activitySequence.length} activities will be generated
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Continue Button - shown after selecting template */}
      {selectedTemplate && !showInputStep && (
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Continue with {selectedTemplateData?.name}
          </button>
        </div>
      )}

      {/* Input Step - Video Selection or Topic Input */}
      {showInputStep && selectedTemplateData && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{selectedTemplateData.icon}</span>
            <div>
              <h4 className="font-bold text-gray-900">{selectedTemplateData.name}</h4>
              <p className="text-sm text-gray-600">{selectedTemplateData.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            {templateIsVideo ? (
              /* Video Selection */
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select a video to use *
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    The video will be transcribed and used to generate quiz questions, discussion prompts, and more
                  </p>

                  {videoActivities.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-700 text-sm">
                        No videos uploaded yet. Please upload a video first, then come back to create a video-based lesson flow.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {videoActivities.map(video => {
                        const content = typeof video.content === 'string' ? JSON.parse(video.content) : video.content
                        const hasTranscript = !!content?.transcript
                        const isSelected = selectedVideoId === video.id

                        return (
                          <button
                            key={video.id}
                            onClick={() => setSelectedVideoId(video.id)}
                            className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                              isSelected
                                ? 'border-purple-500 bg-purple-100'
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {content?.originalFilename || video.prompt || 'Untitled Video'}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {content?.duration && (
                                    <span className="text-xs text-gray-500">
                                      {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
                                    </span>
                                  )}
                                  {hasTranscript ? (
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                      Transcribed
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                      Will transcribe
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Activity types that will be generated */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Activities that will be generated from transcript:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplateData.activitySequence
                      .filter(id => id !== 'interactive_video')
                      .map((activityId, idx) => {
                        const activity = getActivityById(activityId)
                        if (!activity) return null
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                          >
                            <span>{activity.icon}</span>
                            <span>{activity.label}</span>
                          </span>
                        )
                      })}
                  </div>
                </div>
              </>
            ) : (
              /* Topic Input for non-video templates */
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    What topic should this lesson cover? *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., The American Revolution, Photosynthesis, Romeo and Juliet Act 1..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    AI will generate {selectedTemplateData.activitySequence.length} activities based on this topic
                  </p>
                </div>

                {/* Activity types that will be generated */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Activities that will be generated:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplateData.activitySequence.map((activityId, idx) => {
                      const activity = getActivityById(activityId)
                      if (!activity) return null
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                        >
                          <span>{activity.icon}</span>
                          <span>{activity.label}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowInputStep(false)
                  setTopic('')
                  setSelectedVideoId(null)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={templateIsVideo ? !selectedVideoId : !topic.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {templateIsVideo ? 'Generate from Video' : 'Generate Lesson Flow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Build from scratch option */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onBuildFromScratch}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Build from Scratch
          <span className="text-sm text-gray-500">(select your own activities)</span>
        </button>
      </div>
    </div>
  )
}

/**
 * Mini Template Preview (for use in other components)
 */
export function TemplatePreviewCard({ template, onClick, selected }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 border-2 rounded-lg text-left transition-all w-full ${
        selected
          ? 'border-purple-500 bg-purple-50'
          : 'border-gray-200 hover:border-purple-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{template.name}</p>
          <p className="text-xs text-gray-500">{template.estimatedTime}</p>
        </div>
      </div>
    </button>
  )
}
