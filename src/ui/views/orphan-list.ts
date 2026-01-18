import type { SelectOption } from "@opentui/core"
import type { ProjectInfo, SessionInfo } from "../../types"
import type { StateManager } from "../state"
import { formatBytes, formatRelativeTime, truncatePath } from "../../utils"
import { deleteSessions, deleteProject, cleanupEmptyProject } from "../../data/manager"
import { BaseView, type ViewConfig, type DeleteResult } from "./base-view"

// ============================================================================
// List Item Types (same structure as MainView)
// ============================================================================

export interface OrphanProjectItem {
  type: "project"
  project: ProjectInfo
  projectIndex: number
}

export interface OrphanSessionItem {
  type: "session"
  session: SessionInfo
  project: ProjectInfo
  projectIndex: number
  sessionIndex: number
}

export type OrphanListItem = OrphanProjectItem | OrphanSessionItem

// ============================================================================
// Orphan List View - Tree view of orphan projects with sessions
// ============================================================================

export class OrphanListView extends BaseView {
  readonly config: ViewConfig = {
    id: "orphans",
    title: "Orphans",
    supportsSelectAll: false,
    supportsDeleteAll: false,
  }

  constructor(state: StateManager) {
    super(state)
  }

  /**
   * Build flat list of items including orphan projects and their expanded sessions
   */
  private buildItemList(): OrphanListItem[] {
    const items: OrphanListItem[] = []
    const orphanProjects = this.state.orphanProjects

    for (let projectIndex = 0; projectIndex < orphanProjects.length; projectIndex++) {
      const project = orphanProjects[projectIndex]
      
      // Add project item
      items.push({
        type: "project",
        project,
        projectIndex,
      })

      // If expanded, add session items
      if (this.state.isProjectExpanded(project.id)) {
        for (let sessionIndex = 0; sessionIndex < project.sessions.length; sessionIndex++) {
          const session = project.sessions[sessionIndex]
          items.push({
            type: "session",
            session,
            project,
            projectIndex,
            sessionIndex,
          })
        }
      }
    }

    return items
  }

  getItems(): OrphanListItem[] {
    return this.buildItemList()
  }

  getOptions(_selectedIndices: Set<number>): SelectOption[] {
    const items = this.getItems()
    
    return items.map((item) => {
      if (item.type === "project") {
        const { project } = item
        const expanded = this.state.isProjectExpanded(project.id)
        const expandIcon = expanded ? "v" : ">"
        const dir = truncatePath(project.worktree, 40)
        const sessions = `${project.sessionCount} sessions`
        const size = formatBytes(project.totalSizeBytes)

        return {
          name: `${expandIcon} ${dir} [ORPHAN]`,
          description: `${sessions} | ${size}`,
          value: `project:${project.id}`,
        }
      } else {
        // Session item - indented
        const { session } = item
        const title = session.title || session.slug || session.id.slice(0, 12)
        const updated = formatRelativeTime(session.time.updated)
        const size = formatBytes(session.sizeBytes)

        return {
          name: `    ${title}`,
          description: `    ${updated} | ${size}`,
          value: `session:${session.id}`,
        }
      }
    })
  }

  getDeleteMessage(count: number, totalSize: number): string {
    return `Delete ${count} orphan item(s)? (${formatBytes(totalSize)}) [y/N]`
  }

  /**
   * Get delete confirmation message for a single item
   */
  getDeleteMessageForItem(index: number): string {
    const item = this.getItemAt(index)
    if (!item) return "Delete item? [y/N]"

    if (item.type === "project") {
      const { project } = item
      const dir = truncatePath(project.worktree, 35)
      const sessions = `${project.sessionCount} sessions`
      const size = formatBytes(project.totalSizeBytes)
      return `Delete orphan project "${dir}"? (${sessions}, ${size}) [y/N]`
    } else {
      const { session } = item
      const title = session.title || session.slug || session.id.slice(0, 12)
      const size = formatBytes(session.sizeBytes)
      return `Delete session "${title}"? (${size}) [y/N]`
    }
  }

  /**
   * Get the item at a specific index
   */
  getItemAt(index: number): OrphanListItem | undefined {
    const items = this.getItems()
    return items[index]
  }

  /**
   * Get the project ID for the item at a specific index
   * Returns the project ID whether the item is a project or session
   */
  getProjectIdAt(index: number): string | undefined {
    const item = this.getItemAt(index)
    if (!item) return undefined
    return item.project.id
  }

  /**
   * Check if the item at index is a project (not a session)
   */
  isProjectAt(index: number): boolean {
    const item = this.getItemAt(index)
    return item?.type === "project"
  }

  getTotalSize(indices: number[]): number {
    const items = this.getItems()
    return indices.reduce((sum, index) => {
      const item = items[index]
      if (!item) return sum
      if (item.type === "project") {
        return sum + item.project.totalSizeBytes
      } else {
        return sum + item.session.sizeBytes
      }
    }, 0)
  }

  async executeDelete(indices: number[]): Promise<DeleteResult> {
    const items = this.getItems()
    const selectedItems = indices.map((i) => items[i]).filter(Boolean)

    let deletedCount = 0
    let freedBytes = 0
    const errors: string[] = []

    // Separate projects and sessions
    const projectsToDelete: ProjectInfo[] = []
    const sessionsToDelete: SessionInfo[] = []
    const deletedProjectIds = new Set<string>()

    for (const item of selectedItems) {
      if (item.type === "project") {
        projectsToDelete.push(item.project)
        deletedProjectIds.add(item.project.id)
      } else {
        // Only delete session if its parent project isn't being deleted
        if (!deletedProjectIds.has(item.project.id)) {
          sessionsToDelete.push(item.session)
        }
      }
    }

    // Delete entire projects first
    for (const project of projectsToDelete) {
      const result = await deleteProject(project)
      if (result.success) {
        deletedCount++
        freedBytes += result.bytesFreed
      } else if (result.error) {
        errors.push(`${project.worktree}: ${result.error}`)
      }
    }

    // Delete individual sessions
    if (sessionsToDelete.length > 0) {
      const results = await deleteSessions(sessionsToDelete)
      
      for (const result of results) {
        if (result.success) {
          deletedCount++
          freedBytes += result.bytesFreed
        } else if (result.error) {
          errors.push(`${result.sessionID}: ${result.error}`)
        }
      }

      // Check for empty projects to clean up
      const projectIDs = new Set(sessionsToDelete.map((s) => s.projectID))
      for (const session of sessionsToDelete) {
        if (projectIDs.has(session.projectID)) {
          await cleanupEmptyProject(session.projectID, session.projectWorktree)
          projectIDs.delete(session.projectID)
        }
      }
    }

    return { deletedCount, freedBytes, errors }
  }
}
