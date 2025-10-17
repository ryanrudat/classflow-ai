/**
 * ElementToolbar - Contextual toolbar for selected elements
 * Shows different controls based on element type (text, image, etc.)
 */
export default function ElementToolbar({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onLockToggle
}) {
  if (!element) return null

  const renderTextControls = () => (
    <>
      {/* Font size */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-300">
        <label className="text-xs text-gray-600">Size:</label>
        <input
          type="number"
          value={element.style?.fontSize || 18}
          onChange={(e) => onUpdate({
            style: {
              ...element.style,
              fontSize: parseInt(e.target.value)
            }
          })}
          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
          min="8"
          max="72"
        />
      </div>

      {/* Text alignment */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-300">
        {['left', 'center', 'right'].map(align => (
          <button
            key={align}
            onClick={() => onUpdate({
              style: {
                ...element.style,
                textAlign: align
              }
            })}
            className={`p-2 rounded transition-colors ${
              element.style?.textAlign === align
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100'
            }`}
            title={`Align ${align}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              {align === 'left' && <path d="M3 3h18v2H3V3zm0 8h12v2H3v-2zm0 8h18v2H3v-2z"/>}
              {align === 'center' && <path d="M3 3h18v2H3V3zm3 8h12v2H6v-2zm-3 8h18v2H3v-2z"/>}
              {align === 'right' && <path d="M3 3h18v2H3V3zm6 8h12v2H9v-2zm-6 8h18v2H3v-2z"/>}
            </svg>
          </button>
        ))}
      </div>

      {/* Text color */}
      <div className="flex items-center gap-2 px-2 border-r border-gray-300">
        <label className="text-xs text-gray-600">Color:</label>
        <input
          type="color"
          value={element.style?.color || '#000000'}
          onChange={(e) => onUpdate({
            style: {
              ...element.style,
              color: e.target.value
            }
          })}
          className="w-8 h-8 rounded cursor-pointer"
        />
      </div>
    </>
  )

  const renderImageControls = () => (
    <>
      {/* Object fit */}
      <div className="flex items-center gap-2 px-2 border-r border-gray-300">
        <label className="text-xs text-gray-600">Fit:</label>
        <select
          value={element.objectFit || 'contain'}
          onChange={(e) => onUpdate({ objectFit: e.target.value })}
          className="px-2 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
          <option value="scale-down">Scale Down</option>
        </select>
      </div>
    </>
  )

  return (
    <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-2xl border-2 border-gray-300 z-50 flex items-center gap-1 px-2 py-2">
      {/* Element type specific controls */}
      {element.type === 'text' && renderTextControls()}
      {element.type === 'image' && renderImageControls()}

      {/* Common layer controls */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-300">
        <button
          onClick={onBringForward}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Bring forward"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
          </svg>
        </button>
        <button
          onClick={onSendBackward}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Send backward"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 10H5v5h5v-2H7v-3zm-2-4h2V3h3V1H5v5zm12 7h-3v2h5v-5h-2v3zM14 1v2h3v3h2V1h-5z"/>
          </svg>
        </button>
      </div>

      {/* Lock/Unlock */}
      <button
        onClick={onLockToggle}
        className={`p-2 rounded transition-colors ${
          element.locked ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-gray-100'
        }`}
        title={element.locked ? 'Unlock' : 'Lock'}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          {element.locked ? (
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
          ) : (
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
          )}
        </svg>
      </button>

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        className="p-2 hover:bg-blue-50 rounded transition-colors"
        title="Duplicate"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  )
}
