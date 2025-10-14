/**
 * ReactivateDialog Component
 * Shows options to resume an existing period or start a new one when reactivating a session
 */
export default function ReactivateDialog({ session, instances, onResume, onStartNew, onCancel }) {
  // Find the most recent period (highest instance number)
  const mostRecentInstance = instances?.length > 0
    ? instances.reduce((latest, current) =>
        current.instance_number > latest.instance_number ? current : latest
      )
    : null

  const studentCount = mostRecentInstance?.student_count || 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reactivate Session</h2>
          <p className="text-sm text-gray-600 mt-1">{session?.title}</p>
        </div>

        {/* Resume Option */}
        {mostRecentInstance && (
          <div className="space-y-3">
            <button
              onClick={() => onResume(mostRecentInstance.id)}
              className="w-full text-left p-4 border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors">
                  <span className="text-xl">📚</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Resume {mostRecentInstance.label}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Continue with {studentCount} student{studentCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Students can rejoin and pick up where they left off
                  </p>
                </div>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-sm text-gray-500 font-medium">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
          </div>
        )}

        {/* Start New Option */}
        <button
          onClick={onStartNew}
          className="w-full text-left p-4 border-2 border-green-200 hover:border-green-400 rounded-lg transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center transition-colors">
              <span className="text-xl">✨</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">
                Start New Period {instances?.length ? instances.length + 1 : 2}
              </h3>
              <p className="text-sm text-gray-600">
                Fresh start with new students
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Previous periods remain archived and accessible
              </p>
            </div>
          </div>
        </button>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
