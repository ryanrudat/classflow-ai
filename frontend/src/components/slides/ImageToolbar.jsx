import { useState } from 'react'

/**
 * ImageToolbar - Contextual toolbar that appears when image is selected
 * Provides quick-fit presets and crop functionality (Google Slides/Canva style)
 */
export default function ImageToolbar({
  image,
  onFitChange,
  onCropClick,
  onRemove,
  containerWidth = 1000,
  containerHeight = 600,
  lockAspectRatio,
  onLockChange
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const quickFitPresets = [
    {
      id: 'fit-width',
      label: 'Fit Width',
      icon: '↔',
      action: () => {
        const aspectRatio = image.height / image.width
        const newWidth = containerWidth * 0.9
        const newHeight = newWidth * aspectRatio
        onFitChange({
          width: Math.round(newWidth),
          height: Math.round(newHeight),
          objectFit: 'contain'
        })
      }
    },
    {
      id: 'fit-height',
      label: 'Fit Height',
      icon: '↕',
      action: () => {
        const aspectRatio = image.width / image.height
        const newHeight = containerHeight * 0.9
        const newWidth = newHeight * aspectRatio
        onFitChange({
          width: Math.round(newWidth),
          height: Math.round(newHeight),
          objectFit: 'contain'
        })
      }
    },
    {
      id: 'fill',
      label: 'Fill Slide',
      icon: '⬜',
      action: () => {
        onFitChange({
          width: containerWidth,
          height: containerHeight,
          objectFit: 'cover'
        })
      }
    },
    {
      id: 'original',
      label: 'Original',
      icon: '1:1',
      action: () => {
        onFitChange({
          width: image.width,
          height: image.height,
          objectFit: 'none'
        })
      }
    }
  ]

  return (
    <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-2xl border-2 border-gray-300 z-50 flex items-center gap-1 px-2 py-2">
      {/* Quick Fit Presets */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
        {quickFitPresets.map(preset => (
          <button
            key={preset.id}
            onClick={preset.action}
            className="group px-3 py-2 hover:bg-blue-50 rounded transition-colors relative"
            title={preset.label}
          >
            <span className="text-lg">{preset.icon}</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {preset.label}
            </div>
          </button>
        ))}
      </div>

      {/* Crop Button */}
      <button
        onClick={onCropClick}
        className="group px-3 py-2 hover:bg-blue-50 rounded transition-colors relative"
        title="Crop Image"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Crop Image
        </div>
      </button>

      {/* Lock Aspect Ratio */}
      <button
        onClick={() => onLockChange(!lockAspectRatio)}
        className={`group px-3 py-2 rounded transition-colors relative ${
          lockAspectRatio ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50'
        }`}
        title={lockAspectRatio ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
      >
        {lockAspectRatio ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
          </svg>
        )}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {lockAspectRatio ? 'Unlock Aspect' : 'Lock Aspect'}
        </div>
      </button>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="group px-3 py-2 hover:bg-gray-50 rounded transition-colors relative border-l border-gray-300"
        title="Advanced Settings"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Settings
        </div>
      </button>

      {/* Remove Image */}
      <button
        onClick={onRemove}
        className="group px-3 py-2 hover:bg-red-50 text-red-600 rounded transition-colors relative"
        title="Remove Image"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Remove Image
        </div>
      </button>

      {/* Advanced Settings Panel */}
      {showAdvanced && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border-2 border-gray-300 p-4 min-w-[280px]">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Advanced Settings</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Object Fit
              </label>
              <select
                value={image.objectFit || 'contain'}
                onChange={(e) => onFitChange({ objectFit: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
                <option value="fill">Fill</option>
                <option value="scale-down">Scale Down</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={Math.round(image.width || 0)}
                  onChange={(e) => {
                    const newWidth = parseInt(e.target.value) || 0
                    if (lockAspectRatio && image.width && image.height) {
                      const aspectRatio = image.height / image.width
                      onFitChange({
                        width: newWidth,
                        height: Math.round(newWidth * aspectRatio)
                      })
                    } else {
                      onFitChange({ width: newWidth })
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={Math.round(image.height || 0)}
                  onChange={(e) => {
                    const newHeight = parseInt(e.target.value) || 0
                    if (lockAspectRatio && image.width && image.height) {
                      const aspectRatio = image.width / image.height
                      onFitChange({
                        height: newHeight,
                        width: Math.round(newHeight * aspectRatio)
                      })
                    } else {
                      onFitChange({ height: newHeight })
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
