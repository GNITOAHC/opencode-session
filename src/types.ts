// ============================================================================
// Session Types
// ============================================================================

export interface SessionTime {
  created: number
  updated: number
}

export interface SessionSummary {
  additions: number
  deletions: number
  files: number
}

export interface Session {
  id: string
  slug: string
  version: string
  projectID: string
  directory: string
  parentID?: string
  title?: string
  time: SessionTime
  summary?: SessionSummary
}

export interface SessionInfo extends Session {
  sizeBytes: number
  messageCount: number
  isOrphan: boolean
  projectWorktree: string
}

// ============================================================================
// Message & Part Types
// ============================================================================

export interface MessageTime {
  created: number
  completed?: number
}

export interface MessageTokens {
  input: number
  output: number
  reasoning: number
  cache: { read: number; write: number }
}

export interface Message {
  id: string
  sessionID: string
  role: "user" | "assistant"
  time: MessageTime
  parentID?: string
  modelID?: string
  providerID?: string
  mode?: string
  agent?: string
  cost?: number
  tokens?: MessageTokens
  finish?: string
}

export interface Part {
  id: string
  sessionID: string
  messageID: string
  type: "text" | "tool" | "step-start" | "step-finish"
  text?: string
  callID?: string
  tool?: string
  state?: Record<string, unknown>
}

// ============================================================================
// Project Types
// ============================================================================

export interface ProjectTime {
  created: number
  updated: number
}

export interface Project {
  id: string
  worktree: string
  vcs?: string
  sandboxes?: string[]
  time: ProjectTime
}

export interface ProjectInfo extends Project {
  sessionCount: number
  totalSizeBytes: number
  isOrphan: boolean
  sessions: SessionInfo[]
}

// ============================================================================
// Frecency & Log Types
// ============================================================================

export interface FrecencyEntry {
  path: string
  frequency: number
  lastOpen: number
}

export interface LogFile {
  path: string
  filename: string
  date: Date
  sizeBytes: number
}

// ============================================================================
// UI Types
// ============================================================================

export type ViewType = "main" | "orphans" | "logs"

// View order for Tab navigation
export const VIEW_ORDER: ViewType[] = ["main", "orphans", "logs"]

export interface AppState {
  view: ViewType
  sessions: SessionInfo[]
  projects: ProjectInfo[]
  logs: LogFile[]
  selectedIndices: Set<number>
  currentIndex: number
  expandedProjects: Set<string>
  showConfirm: boolean
  confirmAction: (() => Promise<void>) | null
  confirmMessage: string
  isLoading: boolean
  statusMessage: string
}
