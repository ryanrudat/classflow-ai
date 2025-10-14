import { useState } from 'react'

/**
 * UnlockActivityModal Component
 * Allows teachers to unlock completed activities for student retakes
 * Requires a reason for the unlock
 */
export default function UnlockActivityModal({ studentName, activityName, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm(reason)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Unlock Activity</h3>
        <p className="text-gray-600 mb-4">
          You are about to unlock "<strong>{activityName}</strong>" for <strong>{studentName}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for unlock (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="e.g., Student request for improvement, Technical issue during first attempt, etc."
              rows={3}
              required
              disabled={loading}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> The student will be able to retake this activity. Their previous score will be archived.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              disabled={loading || !reason.trim()}
            >
              {loading ? 'Unlocking...' : 'Unlock Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
