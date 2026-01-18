import { readdir, rm, readFile, writeFile } from "fs/promises"
import { join } from "path"
import {
  SESSION_DIR,
  MESSAGE_DIR,
  PART_DIR,
  PROJECT_DIR,
  SESSION_DIFF_DIR,
  TODO_DIR,
  SNAPSHOT_DIR,
  FRECENCY_FILE,
} from "../config"
import type { SessionInfo, ProjectInfo, LogFile, Message, FrecencyEntry } from "../types"

// ============================================================================
// Utility Functions
// ============================================================================

async function safeRm(path: string, options?: { recursive?: boolean }): Promise<boolean> {
  try {
    await rm(path, { force: true, ...options })
    return true
  } catch {
    return false
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, "utf-8")
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

// ============================================================================
// Session Deletion
// ============================================================================

export interface DeleteSessionResult {
  success: boolean
  sessionID: string
  filesDeleted: number
  bytesFreed: number
  error?: string
}

export async function deleteSession(session: SessionInfo): Promise<DeleteSessionResult> {
  let filesDeleted = 0
  const bytesFreed = session.sizeBytes

  try {
    // 1. Get all message IDs for this session
    const messageDir = join(MESSAGE_DIR, session.id)
    let messageIDs: string[] = []

    try {
      const messageFiles = await readdir(messageDir)
      for (const file of messageFiles) {
        if (!file.endsWith(".json")) continue
        const message = await readJsonFile<Message>(join(messageDir, file))
        if (message) {
          messageIDs.push(message.id)
        }
      }
    } catch {
      // No messages directory
    }

    // 2. Delete all parts for each message
    for (const messageID of messageIDs) {
      const partDir = join(PART_DIR, messageID)
      if (await safeRm(partDir, { recursive: true })) {
        filesDeleted++
      }
    }

    // 3. Delete messages directory
    if (await safeRm(messageDir, { recursive: true })) {
      filesDeleted++
    }

    // 4. Delete session diff
    const diffPath = join(SESSION_DIFF_DIR, `${session.id}.json`)
    if (await safeRm(diffPath)) {
      filesDeleted++
    }

    // 5. Delete session todo
    const todoPath = join(TODO_DIR, `${session.id}.json`)
    if (await safeRm(todoPath)) {
      filesDeleted++
    }

    // 6. Delete session file itself
    const sessionPath = join(SESSION_DIR, session.projectID, `${session.id}.json`)
    if (await safeRm(sessionPath)) {
      filesDeleted++
    }

    return {
      success: true,
      sessionID: session.id,
      filesDeleted,
      bytesFreed,
    }
  } catch (error) {
    return {
      success: false,
      sessionID: session.id,
      filesDeleted,
      bytesFreed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteSessions(
  sessions: SessionInfo[]
): Promise<DeleteSessionResult[]> {
  const results: DeleteSessionResult[] = []
  for (const session of sessions) {
    results.push(await deleteSession(session))
  }
  return results
}

// ============================================================================
// Project Deletion
// ============================================================================

export interface DeleteProjectResult {
  success: boolean
  projectID: string
  sessionsDeleted: number
  filesDeleted: number
  bytesFreed: number
  frecencyEntriesRemoved: number
  error?: string
}

export async function deleteProject(project: ProjectInfo): Promise<DeleteProjectResult> {
  let sessionsDeleted = 0
  let totalFilesDeleted = 0
  let totalBytesFreed = 0
  let frecencyEntriesRemoved = 0

  try {
    // 1. Delete all sessions for this project
    for (const session of project.sessions) {
      const result = await deleteSession(session)
      if (result.success) {
        sessionsDeleted++
        totalFilesDeleted += result.filesDeleted
        totalBytesFreed += result.bytesFreed
      }
    }

    // 2. Delete project file
    const projectPath = join(PROJECT_DIR, `${project.id}.json`)
    if (await safeRm(projectPath)) {
      totalFilesDeleted++
    }

    // 3. Delete session directory for this project (should be empty now)
    const projectSessionDir = join(SESSION_DIR, project.id)
    await safeRm(projectSessionDir, { recursive: true })

    // 4. Delete snapshot directory
    const snapshotDir = join(SNAPSHOT_DIR, project.id)
    if (await safeRm(snapshotDir, { recursive: true })) {
      totalFilesDeleted++
    }

    // 5. Clean up frecency entries
    frecencyEntriesRemoved = await cleanFrecencyForDirectory(project.worktree)

    return {
      success: true,
      projectID: project.id,
      sessionsDeleted,
      filesDeleted: totalFilesDeleted,
      bytesFreed: totalBytesFreed,
      frecencyEntriesRemoved,
    }
  } catch (error) {
    return {
      success: false,
      projectID: project.id,
      sessionsDeleted,
      filesDeleted: totalFilesDeleted,
      bytesFreed: totalBytesFreed,
      frecencyEntriesRemoved,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ============================================================================
// Frecency Cleanup
// ============================================================================

export async function cleanFrecencyForDirectory(directory: string): Promise<number> {
  try {
    const content = await readFile(FRECENCY_FILE, "utf-8")
    const lines = content.trim().split("\n")
    const filteredLines: string[] = []
    let removedCount = 0

    for (const line of lines) {
      if (!line) continue
      try {
        const entry = JSON.parse(line) as FrecencyEntry
        // Keep entries that don't start with the deleted directory
        if (!entry.path.startsWith(directory)) {
          filteredLines.push(line)
        } else {
          removedCount++
        }
      } catch {
        // Keep invalid lines as-is
        filteredLines.push(line)
      }
    }

    // Write back the filtered content
    await writeFile(FRECENCY_FILE, filteredLines.join("\n") + "\n")

    return removedCount
  } catch {
    return 0
  }
}

// ============================================================================
// Log Deletion
// ============================================================================

export interface DeleteLogResult {
  success: boolean
  filename: string
  bytesFreed: number
  error?: string
}

export async function deleteLog(log: LogFile): Promise<DeleteLogResult> {
  try {
    await rm(log.path, { force: true })
    return {
      success: true,
      filename: log.filename,
      bytesFreed: log.sizeBytes,
    }
  } catch (error) {
    return {
      success: false,
      filename: log.filename,
      bytesFreed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteLogs(logs: LogFile[]): Promise<DeleteLogResult[]> {
  const results: DeleteLogResult[] = []
  for (const log of logs) {
    results.push(await deleteLog(log))
  }
  return results
}

// ============================================================================
// Check if project has remaining sessions
// ============================================================================

export async function getProjectSessionCount(projectID: string): Promise<number> {
  try {
    const projectSessionDir = join(SESSION_DIR, projectID)
    const files = await readdir(projectSessionDir)
    return files.filter((f) => f.endsWith(".json")).length
  } catch {
    return 0
  }
}

// After deleting sessions, check if we should clean up the project too
export async function cleanupEmptyProject(
  projectID: string,
  worktree: string
): Promise<boolean> {
  const remainingCount = await getProjectSessionCount(projectID)
  if (remainingCount === 0) {
    // Delete project file
    const projectPath = join(PROJECT_DIR, `${projectID}.json`)
    await safeRm(projectPath)

    // Delete session directory
    const projectSessionDir = join(SESSION_DIR, projectID)
    await safeRm(projectSessionDir, { recursive: true })

    // Delete snapshots
    const snapshotDir = join(SNAPSHOT_DIR, projectID)
    await safeRm(snapshotDir, { recursive: true })

    // Clean frecency
    await cleanFrecencyForDirectory(worktree)

    return true
  }
  return false
}
