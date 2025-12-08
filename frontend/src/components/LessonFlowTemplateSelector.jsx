import { useState } from 'react'
import { LESSON_TEMPLATES, getActivityById, getTemplatesBySubject } from '../config/activityTypes'

/**
 * LessonFlowTemplateSelector Component
 * Allows teachers to start from a pre-built lesson template or build from scratch
 *
 * Props:
 * - onSelectTemplate: (template) => void - Called when template is selected
 * - onBuildFromScratch: () => void - Called when user wants to build manually
 * - subject: string - Optional subject filter
 */
export default function LessonFlowTemplateSelector({ onSelectTemplate, onBuildFromScratch, subject = 'all' }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const templates = getTemplatesBySubject(subject)

  const handleSelect = (template) => {
    setSelectedTemplate(template.id)
  }

  const handleUseTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplate)
    if (template && onSelectTemplate) {
      onSelectTemplate(template)
    }
  }

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
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected template action */}
      {selectedTemplate && (
        <div className="flex justify-center">
          <button
            onClick={handleUseTemplate}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Use This Template
          </button>
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
