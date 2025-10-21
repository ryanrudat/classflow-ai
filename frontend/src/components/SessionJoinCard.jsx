import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

/**
 * SessionJoinCard Component
 * Displays join code and QR code for students to join a session
 *
 * Features:
 * - Large, readable join code
 * - QR code generation for instant mobile join
 * - Copy to clipboard functionality
 * - Print-friendly layout
 * - Mobile-first responsive design
 * - Accessibility features (ARIA labels, keyboard navigation)
 *
 * Best Practices:
 * - Visual hierarchy: QR code and join code equally prominent
 * - Touch-friendly targets (44px minimum)
 * - Clear call-to-action
 * - Success feedback for user actions
 */
export default function SessionJoinCard({ session, className = '' }) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(true)
  const [showCodeModal, setShowCodeModal] = useState(false)

  // Generate join URL for QR code
  const joinUrl = `${window.location.origin}/join/${session.join_code}`
  const joinCode = session.join_code

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handlePrint = () => {
    // Create print-friendly window with just the QR code and join code
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Join ${session.title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 600px;
            }
            h1 {
              font-size: 32px;
              margin-bottom: 10px;
              color: #1f2937;
            }
            .session-title {
              font-size: 20px;
              color: #6b7280;
              margin-bottom: 40px;
            }
            .qr-container {
              margin: 40px 0;
            }
            .join-code {
              font-size: 72px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #2563eb;
              margin: 40px 0;
              font-family: monospace;
            }
            .instructions {
              font-size: 18px;
              color: #4b5563;
              margin-top: 40px;
              line-height: 1.6;
            }
            .url {
              font-size: 16px;
              color: #6b7280;
              margin-top: 20px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Join Session</h1>
            <div class="session-title">${session.title}</div>
            <div class="qr-container" id="qr-code"></div>
            <div class="join-code">${joinCode}</div>
            <div class="instructions">
              <strong>Option 1:</strong> Scan the QR code with your phone<br>
              <strong>Option 2:</strong> Go to <span class="url">${window.location.origin}</span><br>
              and enter code: <strong>${joinCode}</strong>
            </div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            new QRCode(document.getElementById("qr-code"), {
              text: "${joinUrl}",
              width: 300,
              height: 300
            });
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 overflow-hidden ${className}`}>
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              Students Join Here
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {session.title}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowQR(!showQR)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-colors"
              aria-label={showQR ? 'Hide QR code' : 'Show QR code'}
              title={showQR ? 'Hide QR code' : 'Show QR code'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-colors"
              aria-label="Print join code and QR code"
              title="Print"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content - Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* QR Code Section */}
          {showQR && (
            <div className="flex flex-col items-center justify-center bg-white rounded-xl p-6 shadow-sm">
              <div className="mb-4 text-center">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Scan to Join
                </p>
                <p className="text-xs text-gray-600">
                  Open camera app and point at QR code
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={joinUrl}
                  size={200}
                  level="M"
                  includeMargin={false}
                  className="w-full h-auto max-w-[200px]"
                  aria-label={`QR code to join ${session.title}`}
                />
              </div>
              <button
                onClick={handleCopyLink}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>
            </div>
          )}

          {/* Join Code Section */}
          <div className={`flex flex-col items-center justify-center bg-white rounded-xl p-6 shadow-sm ${!showQR ? 'lg:col-span-2' : ''}`}>
            <div className="mb-4 text-center">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Or Enter Code
              </p>
              <p className="text-xs text-gray-600 break-words max-w-full">
                Visit <span className="font-mono font-semibold break-all">{window.location.host}</span>
              </p>
            </div>

            {/* Join Code - Clickable to Enlarge */}
            <button
              onClick={() => setShowCodeModal(true)}
              className="relative group w-full cursor-pointer"
              aria-label="Click to view join code larger"
            >
              <div className="bg-blue-50 rounded-lg border-2 border-blue-200 transition-all hover:bg-blue-100 hover:border-blue-300 hover:shadow-md active:scale-95 py-3 px-2 flex items-center justify-center min-h-[80px]">
                <div
                  className="font-bold font-mono text-blue-600 text-center select-all w-full"
                  style={{
                    fontSize: `min(max(1.25rem, ${100 / (joinCode.length * 0.6)}vw), 2.5rem)`,
                    letterSpacing: '0.05em',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    lineHeight: '1.3'
                  }}
                >
                  {joinCode}
                </div>
              </div>

              {/* Expand Icon Hint */}
              <div className="absolute top-2 right-2 bg-blue-600 text-white p-1.5 rounded opacity-60 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>

              {/* Click hint text */}
              <p className="text-xs text-gray-500 mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
                Click to enlarge
              </p>
            </button>

            {/* Mobile Copy Button (Always Visible on Small Screens) */}
            <button
              onClick={handleCopyCode}
              className="mt-4 lg:hidden w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 pt-6 border-t border-blue-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <p className="font-semibold text-gray-900">Mobile</p>
                <p className="text-gray-600">Scan QR code with camera</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <p className="font-semibold text-gray-900">Computer</p>
                <p className="text-gray-600">Enter code at {window.location.host}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {copied && (
        <div
          className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-scale-in z-50"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">Copied to clipboard!</span>
          </div>
        </div>
      )}

      {/* Code Enlargement Modal */}
      {showCodeModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCodeModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="code-modal-title"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 sm:p-12 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowCodeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="text-center">
              <h2 id="code-modal-title" className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Session Join Code
              </h2>
              <p className="text-gray-600 mb-8">
                Students can enter this code at <span className="font-mono font-semibold text-blue-600">{window.location.host}</span>
              </p>

              {/* Extra Large Join Code */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 sm:p-12 mb-6 border-4 border-blue-300">
                <div className="text-6xl sm:text-7xl md:text-8xl font-bold font-mono text-blue-600 tracking-[0.3em] select-all break-all">
                  {joinCode}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How Students Join
                </h3>
                <ol className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
                    <span>Go to <span className="font-mono bg-white px-2 py-0.5 rounded border">{window.location.host}</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
                    <span>Enter the code above</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
                    <span>Type their name and join</span>
                  </li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl"
                >
                  {copied ? (
                    <>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Code
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 font-bold rounded-xl transition-colors text-lg"
                >
                  Close
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-4 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Tip: Display this on your projector or smartboard for students to see</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
