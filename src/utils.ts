// ============================================================================
// Size Formatting
// ============================================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)

  // Show 1 decimal place for values < 10, otherwise round
  if (value < 10 && i > 0) {
    return `${value.toFixed(1)} ${units[i]}`
  }
  return `${Math.round(value)} ${units[i]}`
}

// ============================================================================
// Time Formatting
// ============================================================================

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years > 0) return `${years}y ago`
  if (months > 0) return `${months}mo ago`
  if (weeks > 0) return `${weeks}w ago`
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return "just now"
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// ============================================================================
// Path Formatting
// ============================================================================

export function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path

  // Replace home directory with ~
  const home = process.env.HOME || ""
  let displayPath = path
  if (home && path.startsWith(home)) {
    displayPath = "~" + path.slice(home.length)
  }

  if (displayPath.length <= maxLength) return displayPath

  // Truncate from the middle
  const ellipsis = "..."
  const availableLength = maxLength - ellipsis.length
  const startLength = Math.ceil(availableLength / 2)
  const endLength = Math.floor(availableLength / 2)

  return displayPath.slice(0, startLength) + ellipsis + displayPath.slice(-endLength)
}

// ============================================================================
// String Padding
// ============================================================================

export function padRight(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length)
  return str + " ".repeat(length - str.length)
}

export function padLeft(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length)
  return " ".repeat(length - str.length) + str
}

// ============================================================================
// Summary Formatting
// ============================================================================

export function formatDeleteSummary(
  sessionsDeleted: number,
  bytesFreed: number
): string {
  const sessionWord = sessionsDeleted === 1 ? "session" : "sessions"
  return `Deleted ${sessionsDeleted} ${sessionWord}, freed ${formatBytes(bytesFreed)}`
}

export function formatProjectDeleteSummary(
  projectID: string,
  sessionsDeleted: number,
  bytesFreed: number,
  frecencyRemoved: number
): string {
  const parts = [`Deleted project ${projectID.slice(0, 8)}...`]
  parts.push(`${sessionsDeleted} sessions`)
  parts.push(`freed ${formatBytes(bytesFreed)}`)
  if (frecencyRemoved > 0) {
    parts.push(`${frecencyRemoved} frecency entries`)
  }
  return parts.join(", ")
}
