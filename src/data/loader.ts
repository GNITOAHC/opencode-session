import { readdir, stat, readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import {
  SESSION_DIR,
  MESSAGE_DIR,
  PART_DIR,
  PROJECT_DIR,
  SESSION_DIFF_DIR,
  TODO_DIR,
  LOG_DIR,
  FRECENCY_FILE,
} from "../config"
import type {
  Session,
  SessionInfo,
  Project,
  ProjectInfo,
  Message,
  Part,
  Todo,
  FrecencyEntry,
  LogFile,
  ProjectStorageInfo,
} from "../types"

// ============================================================================
// Utility Functions
// ============================================================================

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, "utf-8")
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function getDirSize(dirPath: string): Promise<number> {
  let totalSize = 0
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name)
      if (entry.isFile()) {
        const stats = await stat(entryPath)
        totalSize += stats.size
      } else if (entry.isDirectory()) {
        totalSize += await getDirSize(entryPath)
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return totalSize
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath)
    return stats.size
  } catch {
    return 0
  }
}

function directoryExists(path: string): boolean {
  try {
    return existsSync(path)
  } catch {
    return false
  }
}

// ============================================================================
// Project Loading
// ============================================================================

export async function loadProjects(): Promise<Map<string, Project>> {
  const projects = new Map<string, Project>()

  try {
    const files = await readdir(PROJECT_DIR)
    for (const file of files) {
      if (!file.endsWith(".json")) continue
      const projectPath = join(PROJECT_DIR, file)
      const project = await readJsonFile<Project>(projectPath)
      if (project) {
        projects.set(project.id, project)
      }
    }
  } catch {
    // PROJECT_DIR doesn't exist
  }

  return projects
}

// ============================================================================
// Session Loading
// ============================================================================

async function getSessionMessageCount(sessionID: string): Promise<number> {
  try {
    const messageDir = join(MESSAGE_DIR, sessionID)
    const files = await readdir(messageDir)
    return files.filter((f) => f.endsWith(".json")).length
  } catch {
    return 0
  }
}

async function getSessionSize(sessionID: string): Promise<number> {
  let totalSize = 0

  // Messages directory
  const messageDir = join(MESSAGE_DIR, sessionID)
  totalSize += await getDirSize(messageDir)

  // Get message IDs to calculate part sizes
  try {
    const messageFiles = await readdir(messageDir)
    for (const file of messageFiles) {
      if (!file.endsWith(".json")) continue
      const message = await readJsonFile<Message>(join(messageDir, file))
      if (message) {
        const partDir = join(PART_DIR, message.id)
        totalSize += await getDirSize(partDir)
      }
    }
  } catch {
    // No messages
  }

  // Session diff
  totalSize += await getFileSize(join(SESSION_DIFF_DIR, `${sessionID}.json`))

  // Todo
  totalSize += await getFileSize(join(TODO_DIR, `${sessionID}.json`))

  return totalSize
}

export async function loadSessions(
  projects: Map<string, Project>
): Promise<SessionInfo[]> {
  const sessions: SessionInfo[] = []

  try {
    // Session files are organized by projectID
    const projectDirs = await readdir(SESSION_DIR)

    for (const projectID of projectDirs) {
      const projectSessionDir = join(SESSION_DIR, projectID)
      const dirStat = await stat(projectSessionDir)
      if (!dirStat.isDirectory()) continue

      const sessionFiles = await readdir(projectSessionDir)
      const project = projects.get(projectID)
      const projectWorktree = project?.worktree ?? "/"

      for (const file of sessionFiles) {
        if (!file.endsWith(".json")) continue

        const sessionPath = join(projectSessionDir, file)
        const session = await readJsonFile<Session>(sessionPath)
        if (!session) continue

        // Get session file size
        const sessionFileSize = await getFileSize(sessionPath)

        // Calculate additional sizes and info
        const [messageCount, additionalSize] = await Promise.all([
          getSessionMessageCount(session.id),
          getSessionSize(session.id),
        ])

        const isOrphan = !directoryExists(session.directory)

        sessions.push({
          ...session,
          sizeBytes: sessionFileSize + additionalSize,
          messageCount,
          isOrphan,
          projectWorktree,
        })
      }
    }
  } catch {
    // SESSION_DIR doesn't exist
  }

  // Sort by updated time (most recent first)
  sessions.sort((a, b) => b.time.updated - a.time.updated)

  return sessions
}

// ============================================================================
// Project Info (with sessions)
// ============================================================================

export async function loadProjectInfos(
  sessions: SessionInfo[],
  projects: Map<string, Project>
): Promise<ProjectInfo[]> {
  const projectInfos: ProjectInfo[] = []

  // Group sessions by project
  const sessionsByProject = new Map<string, SessionInfo[]>()
  for (const session of sessions) {
    const projectSessions = sessionsByProject.get(session.projectID) ?? []
    projectSessions.push(session)
    sessionsByProject.set(session.projectID, projectSessions)
  }

  // Build project infos
  for (const [projectID, projectSessions] of sessionsByProject) {
    const project = projects.get(projectID)
    if (!project) {
      // Create a placeholder project for orphaned sessions
      const totalSize = projectSessions.reduce((sum, s) => sum + s.sizeBytes, 0)
      projectInfos.push({
        id: projectID,
        worktree: projectSessions[0]?.directory ?? "/unknown",
        time: {
          created: Math.min(...projectSessions.map((s) => s.time.created)),
          updated: Math.max(...projectSessions.map((s) => s.time.updated)),
        },
        sessionCount: projectSessions.length,
        totalSizeBytes: totalSize,
        isOrphan: true,
        sessions: projectSessions,
      })
      continue
    }

    const totalSize = projectSessions.reduce((sum, s) => sum + s.sizeBytes, 0)
    const isOrphan = !directoryExists(project.worktree)

    projectInfos.push({
      ...project,
      sessionCount: projectSessions.length,
      totalSizeBytes: totalSize,
      isOrphan,
      sessions: projectSessions,
    })
  }

  // Add projects with no sessions
  for (const [projectID, project] of projects) {
    // Skip if already added (has sessions)
    if (sessionsByProject.has(projectID)) continue

    const isOrphan = !directoryExists(project.worktree)

    projectInfos.push({
      ...project,
      sessionCount: 0,
      totalSizeBytes: 0,
      isOrphan,
      sessions: [],
    })
  }

  // Sort by updated time (most recent first)
  projectInfos.sort((a, b) => b.time.updated - a.time.updated)

  return projectInfos
}

// ============================================================================
// Frecency Loading
// ============================================================================

export async function loadFrecency(): Promise<FrecencyEntry[]> {
  const entries: FrecencyEntry[] = []

  try {
    const content = await readFile(FRECENCY_FILE, "utf-8")
    const lines = content.trim().split("\n")
    for (const line of lines) {
      if (!line) continue
      try {
        const entry = JSON.parse(line) as FrecencyEntry
        entries.push(entry)
      } catch {
        // Skip invalid lines
      }
    }
  } catch {
    // File doesn't exist
  }

  return entries
}

// ============================================================================
// Log Loading
// ============================================================================

export async function loadLogs(): Promise<LogFile[]> {
  const logs: LogFile[] = []

  try {
    const files = await readdir(LOG_DIR)
    for (const file of files) {
      if (!file.endsWith(".log")) continue
      const filePath = join(LOG_DIR, file)
      const stats = await stat(filePath)

      // Parse date from filename (e.g., "2026-01-17T071231.log")
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})\.log$/)
      let date = new Date()
      if (dateMatch) {
        const [, datePart, hour, minute, second] = dateMatch
        date = new Date(`${datePart}T${hour}:${minute}:${second}`)
      }

      logs.push({
        path: filePath,
        filename: file,
        date,
        sizeBytes: stats.size,
      })
    }
  } catch {
    // LOG_DIR doesn't exist
  }

  // Sort by date (most recent first)
  logs.sort((a, b) => b.date.getTime() - a.date.getTime())

  return logs
}

// ============================================================================
// Message & Part Loading
// ============================================================================

export async function loadMessages(sessionID: string): Promise<Message[]> {
  const messages: Message[] = []

  try {
    const messageDir = join(MESSAGE_DIR, sessionID)
    const files = await readdir(messageDir)

    for (const file of files) {
      if (!file.endsWith(".json")) continue
      const message = await readJsonFile<Message>(join(messageDir, file))
      if (message) {
        messages.push(message)
      }
    }
  } catch {
    // No messages for this session
  }

  // Sort by created time
  messages.sort((a, b) => a.time.created - b.time.created)

  return messages
}

export async function loadParts(messageID: string): Promise<Part[]> {
  const parts: Part[] = []

  try {
    const partDir = join(PART_DIR, messageID)
    const files = await readdir(partDir)

    for (const file of files) {
      if (!file.endsWith(".json")) continue
      const part = await readJsonFile<Part>(join(partDir, file))
      if (part) {
        parts.push(part)
      }
    }
  } catch {
    // No parts for this message
  }

  // Sort by time if available, otherwise by ID
  parts.sort((a, b) => {
    const aTime = a.time?.start ?? 0
    const bTime = b.time?.start ?? 0
    if (aTime !== bTime) return aTime - bTime
    return a.id.localeCompare(b.id)
  })

  return parts
}

export async function loadTodos(sessionID: string): Promise<Todo[]> {
  try {
    const todoPath = join(TODO_DIR, `${sessionID}.json`)
    const content = await readFile(todoPath, "utf-8")
    return JSON.parse(content) as Todo[]
  } catch {
    return [] // No todos for this session
  }
}

export async function getProjectStorageInfo(projectID: string): Promise<ProjectStorageInfo> {
  let sessionFiles = 0
  let messageFiles = 0
  let partFiles = 0
  let diffSize = 0
  let todoSize = 0
  let totalMessages = 0
  let totalParts = 0

  try {
    // Count session files
    const sessionDir = join(SESSION_DIR, projectID)
    const sessionEntries = await readdir(sessionDir)
    sessionFiles = sessionEntries.filter((f) => f.endsWith(".json")).length

    // For each session, count messages and parts
    for (const sessionFile of sessionEntries) {
      if (!sessionFile.endsWith(".json")) continue
      const sessionPath = join(sessionDir, sessionFile)
      const session = await readJsonFile<Session>(sessionPath)
      if (!session) continue

      // Count messages
      try {
        const messageDir = join(MESSAGE_DIR, session.id)
        const messageEntries = await readdir(messageDir)
        const msgFiles = messageEntries.filter((f) => f.endsWith(".json"))
        messageFiles += msgFiles.length
        totalMessages += msgFiles.length

        // Count parts for each message
        for (const msgFile of msgFiles) {
          const msg = await readJsonFile<Message>(join(messageDir, msgFile))
          if (!msg) continue
          try {
            const partDir = join(PART_DIR, msg.id)
            const partEntries = await readdir(partDir)
            const prtFiles = partEntries.filter((f) => f.endsWith(".json")).length
            partFiles += prtFiles
            totalParts += prtFiles
          } catch {
            // No parts
          }
        }
      } catch {
        // No messages
      }

      // Get diff size
      diffSize += await getFileSize(join(SESSION_DIFF_DIR, `${session.id}.json`))

      // Get todo size
      todoSize += await getFileSize(join(TODO_DIR, `${session.id}.json`))
    }
  } catch {
    // Project directory doesn't exist
  }

  return {
    sessionFiles,
    messageFiles,
    partFiles,
    diffSize,
    todoSize,
    totalMessages,
    totalParts,
  }
}

// ============================================================================
// Full Data Load
// ============================================================================

export interface LoadedData {
  sessions: SessionInfo[]
  projects: ProjectInfo[]
  logs: LogFile[]
}

export async function loadAllData(): Promise<LoadedData> {
  const projects = await loadProjects()
  const sessions = await loadSessions(projects)
  const projectInfos = await loadProjectInfos(sessions, projects)
  const logs = await loadLogs()

  return {
    sessions,
    projects: projectInfos,
    logs,
  }
}
