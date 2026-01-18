import type { StateManager } from "../state"
import type { MainView } from "../views/main-view"
import type { ViewController, ControllerContext } from "./index"
import { ConfirmDialogController, type ConfirmDetails } from "./confirm-controller"
import { ProjectViewerController } from "./project-viewer-controller"
import { SessionViewerController } from "./session-viewer-controller"
import { Action, MAIN_KEYBINDINGS, getHintsForView, type KeyBinding } from "../keybindings"
import { formatBytes, truncatePath } from "../../utils"

// ============================================================================
// Main Controller - Projects & Sessions View
// ============================================================================

export class MainController implements ViewController {
  constructor(
    private view: MainView,
    private state: StateManager
  ) {}

  handleAction(action: Action, ctx: ControllerContext): boolean {
    switch (action) {
      case Action.EXPAND:
        this.expandCurrentProject(ctx)
        return true
      case Action.COLLAPSE:
        this.collapseCurrentProject(ctx)
        return true
      case Action.ENTER:
        this.viewCurrentItem(ctx)
        return true
      case Action.DELETE:
        this.initiateDelete(ctx)
        return true
      case Action.HELP:
        this.showHelp(ctx)
        return true
      case Action.BACK:
        // No-op at root level
        return true
      default:
        return false
    }
  }

  getHelpText(): string {
    return "j/k=nav, Enter=view, l=expand, h=collapse, d=delete, Tab=next view, q=quit"
  }

  getKeybindings(): KeyBinding[] {
    return MAIN_KEYBINDINGS
  }

  onEnter(ctx: ControllerContext): void {
    ctx.statusBar.setHints(getHintsForView("main"))
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private expandCurrentProject(ctx: ControllerContext): void {
    const index = ctx.listContainer.getSelectedIndex()
    const projectId = this.view.getProjectIdAt(index)

    if (projectId && !this.state.isProjectExpanded(projectId)) {
      this.state.expandProject(projectId)
    }
  }

  private collapseCurrentProject(ctx: ControllerContext): void {
    const index = ctx.listContainer.getSelectedIndex()
    const projectId = this.view.getProjectIdAt(index)

    if (projectId && this.state.isProjectExpanded(projectId)) {
      this.state.collapseProject(projectId)
    }
  }

  private initiateDelete(ctx: ControllerContext): void {
    const currentIndex = ctx.listContainer.getSelectedIndex()
    const item = this.view.getItemAt(currentIndex)
    if (!item) return

    const details: ConfirmDetails = item.type === "project"
      ? {
          title: "Delete Project",
          fields: [
            { label: "Path:", value: truncatePath(item.project.worktree, 40) },
            { label: "Sessions:", value: String(item.project.sessionCount) },
            { label: "Size:", value: formatBytes(item.project.totalSizeBytes) },
          ],
          onConfirm: async () => {
            await this.executeDelete(ctx, [currentIndex])
          },
        }
      : {
          title: "Delete Session",
          fields: [
            { label: "Title:", value: item.session.title || item.session.slug || "Untitled" },
            { label: "ID:", value: item.session.id.slice(0, 12) },
            { label: "Project:", value: truncatePath(item.project.worktree, 35) },
            { label: "Size:", value: formatBytes(item.session.sizeBytes) },
          ],
          onConfirm: async () => {
            await this.executeDelete(ctx, [currentIndex])
          },
        }

    ctx.pushController(new ConfirmDialogController(details))
  }

  private async executeDelete(ctx: ControllerContext, indices: number[]): Promise<void> {
    this.state.setLoading(true)
    ctx.header.setLoading("Deleting...")

    try {
      const result = await this.view.executeDelete(indices)
      this.state.setStatus(`Deleted ${result.deletedCount} items, freed ${formatBytes(result.freedBytes)}`)
      await ctx.loadData()
    } catch (error) {
      this.state.setStatus(`Error: ${error}`)
    }

    this.state.setLoading(false)
  }

  private showHelp(ctx: ControllerContext): void {
    ctx.statusBar.setMessage(`Help: ${this.getHelpText()}`)
  }

  private viewCurrentItem(ctx: ControllerContext): void {
    const currentIndex = ctx.listContainer.getSelectedIndex()
    const item = this.view.getItemAt(currentIndex)
    if (!item) return

    if (item.type === "project") {
      ctx.pushController(new ProjectViewerController(item.project))
    } else {
      ctx.pushController(new SessionViewerController(item.session))
    }
  }
}
