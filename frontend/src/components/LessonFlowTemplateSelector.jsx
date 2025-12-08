import { useState } from 'react'
import { LESSON_TEMPLATES, getActivityById, getTemplatesBySubject } from '../config/activityTypes'

/**
 * LessonFlowTemplateSelector Component
 * Allows teachers to start from a pre-built lesson template or build from scratch
 * Now includes topic input to generate activities from templates
 *
 * Props:
 * - onSelectTemplate: (template, topic) => void - Called when template is selected with topic
 * - onBuildFromScratch: () => void - Called when user wants to build manually
 * - subject: string - Optional subject filter
 */
export default function LessonFlowTemplateSelector({
  onSelectTemplate,
  onBuildFromScratch,
  subject = 'all'
}) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [topic, setTopic] = useState('')
  const [showTopicInput, setShowTopicInput] = useState(false)

  const templates = getTemplatesBySubject(subject)

  const handleSelect = (template) => {
    setSelectedTemplate(template.id)
    setShowTopicInput(false)
    setTopic('')
  }

  const handleContinue = () => {
    setShowTopicInput(true)
  }

  const handleGenerate = () => {
    const template = templates.find(t => t.id === selectedTemplate)
    if (template && topic.trim() && onSelectTemplate) {
      onSelectTemplate(template, topic.trim())
    }
  }

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900">Start Your Lesson Flow</h3>
        <p className="text-sm text-gray-600 mt-1">
          Choose a template to get started quickly, or build from scratch
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => handleSelect(template)}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              selectedTemplate === template.id
                ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
            }`}
          >
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

                {/* Activity count */}
                <div className="mt-2">
                  <span className="text-xs text-purple-600 font-medium">
                    {template.activitySequence.length} activities will be generated
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Topic Input Section - shown after selecting template */}
      {selectedTemplate && !showTopicInput && (
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

      {/* Topic Input Form */}
      {showTopicInput && selectedTemplateData && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{selectedTemplateData.icon}</span>
            <div>
              <h4 className="font-bold text-gray-900">{selectedTemplateData.name}</h4>
              <p className="text-sm text-gray-600">{selectedTemplateData.description}</p>
            </div>
          </div>

          <div className="space-y-4">
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

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTopicInput(false)
                  setTopic('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Lesson Flow
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
