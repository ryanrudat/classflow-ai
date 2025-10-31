import { useState } from 'react'
import axios from 'axios'
import { useToast } from './Toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * SentenceOrderingEditor Component
 * Allows teachers to create or AI-generate sentence ordering activities
 */
export default function SentenceOrderingEditor({ sessionId, onClose, onSaved }) {
  const toast = useToast()
  const token = localStorage.getItem('token')

  const [step, setStep] = useState('create') // 'create', 'preview'
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [prompt, setPrompt] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [sentenceCount, setSentenceCount] = useState(5)
  const [sentences, setSentences] = useState([])
  const [instructions, setInstructions] = useState('Arrange these sentences in the correct order')

  const handleGenerateAI = async () => {
    if (!prompt.trim()) {
      toast.error('Error', 'Please enter a topic or prompt')
      return
    }

    try {
      setGenerating(true)

      const response = await axios.post(
        `${API_URL}/api/ai/generate-sentence-ordering`,
        {
          sessionId,
          prompt: prompt.trim(),
          difficulty,
          sentenceCount
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      const activity = response.data.activity
      setSentences(activity.content.sentences)
      setInstructions(activity.content.instructions)
      setStep('preview')

      toast.success('Success', 'Sentences generated successfully!')

      // Save activity immediately after generation
      if (onSaved) {
        onSaved(activity)
      }

      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to generate sentences')
    } finally {
      setGenerating(false)
    }
  }

  const handleAddSentence = () => {
    setSentences([...sentences, {
      id: `s${sentences.length + 1}`,
      text: '',
      correctPosition: sentences.length
    }])
  }

  const handleUpdateSentence = (index, text) => {
    const updated = [...sentences]
    updated[index].text = text
    setSentences(updated)
  }

  const handleRemoveSentence = (index) => {
    const updated = sentences.filter((_, i) => i !== index)
    // Update correct positions
    updated.forEach((s, i) => {
      s.correctPosition = i
    })
    setSentences(updated)
  }

  const handleMoveSentence = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sentences.length) return

    const updated = [...sentences]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp

    // Update correct positions
    updated.forEach((s, i) => {
      s.correctPosition = i
    })

    setSentences(updated)
  }

  const handleSaveManual = async () => {
    if (sentences.length < 2) {
      toast.error('Error', 'Please add at least 2 sentences')
      return
    }

    const hasEmpty = sentences.some(s => !s.text.trim())
    if (hasEmpty) {
      toast.error('Error', 'Please fill in all sentences')
      return
    }

    try {
      setSaving(true)

      const response = await axios.post(
        `${API_URL}/api/activities`,
        {
          sessionId,
          type: 'sentence_ordering',
          content: {
            sentences,
            instructions,
            topic: prompt || 'Sentence Ordering',
            scoringType: 'partial'
          },
          difficulty_level: difficulty,
          prompt: prompt || 'Custom sentence ordering'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      toast.success('Success', 'Sentence ordering activity created!')

      if (onSaved) {
        onSaved(response.data.activity)
      }

      onClose()

    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error', 'Failed to save activity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sentence-editor-title"
    >
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="sentence-editor-title" className="text-xl font-bold text-gray-900">
                Create Sentence Ordering Activity
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {step === 'create' ? 'Generate with AI or create manually' : 'Preview and adjust'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              aria-label="Close editor"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'create' && (
            <div className="space-y-6">
              {/* AI Generation Section */}
              <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  AI-Generated Sentences
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Topic or Prompt
                    </label>
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., The water cycle, American Revolution, Making a sandwich"
                      disabled={generating}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulty
                      </label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={generating}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Sentences
                      </label>
                      <select
                        value={sentenceCount}
                        onChange={(e) => setSentenceCount(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={generating}
                      >
                        <option value="3">3 sentences</option>
                        <option value="4">4 sentences</option>
                        <option value="5">5 sentences</option>
                        <option value="6">6 sentences</option>
                        <option value="7">7 sentences</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAI}
                    disabled={generating || !prompt.trim()}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR CREATE MANUALLY</span>
                </div>
              </div>

              {/* Manual Creation Section */}
              <div className="border-2 border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Manual Creation</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructions for Students
                    </label>
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Arrange these sentences to tell the story"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Sentences (in correct order)
                      </label>
                      <button
                        onClick={handleAddSentence}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Sentence
                      </button>
                    </div>

                    {sentences.length === 0 ? (
                      <p className="text-sm text-gray-500 italic text-center py-8">
                        No sentences yet. Click "Add Sentence" to start.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sentences.map((sentence, index) => (
                          <div key={sentence.id} className="flex items-start gap-2">
                            <div className="flex flex-col gap-1 pt-2">
                              <button
                                onClick={() => handleMoveSentence(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Move up"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleMoveSentence(index, 'down')}
                                disabled={index === sentences.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Move down"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600 w-6">{index + 1}.</span>
                              <input
                                type="text"
                                value={sentence.text}
                                onChange={(e) => handleUpdateSentence(index, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder={`Sentence ${index + 1}`}
                              />
                            </div>

                            <button
                              onClick={() => handleRemoveSentence(index)}
                              className="p-2 text-red-600 hover:text-red-700 transition-colors"
                              aria-label="Remove sentence"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {step === 'create' && sentences.length > 0 && (
            <button
              onClick={handleSaveManual}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Creating...' : `Create Activity (${sentences.length} sentences)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
