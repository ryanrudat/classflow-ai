/**
 * Shared Socket.IO instance for use across the application
 * This allows controllers to emit WebSocket events
 */

let io = null

export function setIO(ioInstance) {
  io = ioInstance
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO instance not initialized. Call setIO() first.')
  }
  return io
}
