import { readFile } from "node:fs/promises"
import type { StateManager } from "../state"
import type { LogListView } from "../views/log-list"
import type { ViewController, ControllerContext } from "./index"
import { ConfirmDialogController, type ConfirmDetails } from "./confirm-controller"
import { LogViewerController } from "./log-viewer-controller"
import { Action, LOG_KEYBINDINGS, getHintsForView, type KeyBinding } from "../keybindings"
import { formatBytes } from "../../utils"

// ============================================================================
// Log Controller - Log Files View
// ============================================================================

export class LogController implements ViewController {
  constructor(
    private view: LogListView,
    private state: StateManager
  ) {}

  handleAction(action: Action, ctx: ControllerContext): boolean {
    switch (action) {
      case Action.TOGGLE_SELECT:
        this.toggleSelection(ctx)
        return true
      case Action.SELECT_ALL:
        this.selectAll()
        return true
      case Action.DELETE:
        this.initiateDelete(ctx)
        return true
      case Action.DELETE_ALL:
        this.initiateDeleteAll(ctx)
        return true
      case Action.ENTER:
        this.viewLog(ctx)
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
    return "j/k=nav, Space=select, a=all, d=delete, D=delete-all, Tab=next view, q=quit"
  }

  getKeybindings(): KeyBinding[] {
    return LOG_KEYBINDINGS
  }

  onEnter(ctx: ControllerContext): void {
    ctx.statusBar.setHints(getHintsForView("logs"))
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private toggleSelection(ctx: ControllerContext): void {
    const index = ctx.listContainer.getSelectedIndex()
    this.state.toggleSelection(index)
  }

  private selectAll(): void {
    this.state.selectAll(this.view.getItemCount())
  }

  private initiateDelete(ctx: ControllerContext): void {
    const currentIndex = ctx.listContainer.getSelectedIndex()
    const indices = this.state.getSelectedOrCurrentIndices(currentIndex)

    if (indices.length === 0) {
      this.state.setStatus("Nothing selected")
      return
    }

    const logs = this.view.getItems()
    const totalSize = this.view.getTotalSize(indices)

    // Build details based on selection count
    const details: ConfirmDetails = indices.length === 1
      ? {
          title: "Delete Log File",
          fields: [
            { label: "Filename:", value: logs[indices[0]].filename },
            { label: "Size:", value: formatBytes(logs[indices[0]].sizeBytes) },
          ],
          onConfirm: async () => {
            await this.executeDelete(ctx, indices)
          },
        }
      : {
          title: `Delete ${indices.length} Log Files`,
          fields: [
            { label: "Count:", value: String(indices.length) },
            { label: "Total Size:", value: formatBytes(totalSize) },
          ],
          onConfirm: async () => {
            await this.executeDelete(ctx, indices)
          },
        }

    ctx.pushController(new ConfirmDialogController(details))
  }

  private initiateDeleteAll(ctx: ControllerContext): void {
    const itemCount = this.view.getItemCount()

    if (itemCount === 0) {
      this.state.setStatus("Nothing to delete")
      return
    }

    const allIndices = Array.from({ length: itemCount }, (_, i) => i)
    const totalSize = this.view.getTotalSize(allIndices)

    const details: ConfirmDetails = {
      title: `Delete ALL ${itemCount} Log Files`,
      fields: [
        { label: "Count:", value: String(itemCount) },
        { label: "Total Size:", value: formatBytes(totalSize) },
      ],
      onConfirm: async () => {
        await this.executeDelete(ctx, allIndices)
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

  private async viewLog(ctx: ControllerContext): Promise<void> {
    const currentIndex = ctx.listContainer.getSelectedIndex()
    const logs = this.view.getItems()
    
    if (currentIndex < 0 || currentIndex >= logs.length) {
      this.state.setStatus("No log file selected")
      return
    }

    const log = logs[currentIndex]
    
    try {
      const content = await readFile(log.path, "utf-8")
      ctx.pushController(new LogViewerController(log.filename, content))
    } catch (error) {
      this.state.setStatus(`Error reading log: ${error}`)
    }
  }
}
