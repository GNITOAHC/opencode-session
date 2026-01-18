import type { SelectOption } from "@opentui/core"
import type { LogFile } from "../../types"
import type { StateManager } from "../state"
import { formatBytes, formatDate } from "../../utils"
import { deleteLogs } from "../../data/manager"
import { BaseView, type ViewConfig, type DeleteResult } from "./base-view"

// ============================================================================
// Log Files List View
// ============================================================================

export class LogListView extends BaseView {
  readonly config: ViewConfig = {
    id: "logs",
    title: "Log Files",
    supportsSelectAll: true,
    supportsDeleteAll: true,
  }

  constructor(state: StateManager) {
    super(state)
  }

  getItems(): LogFile[] {
    return this.state.logs
  }

  getOptions(selectedIndices: Set<number>): SelectOption[] {
    const logs = this.getItems()
    return logs.map((log, index) => {
      const selected = selectedIndices.has(index) ? "[x]" : "[ ]"
      const date = formatDate(log.date)
      const size = formatBytes(log.sizeBytes)

      return {
        name: `${selected} ${log.filename}`,
        description: `${date} | ${size}`,
        value: log.path,
      }
    })
  }

  getDeleteMessage(count: number, totalSize: number): string {
    return `Delete ${count} log file(s)? (${formatBytes(totalSize)}) [y/N]`
  }

  getDeleteAllMessage(totalSize: number): string {
    const count = this.getItemCount()
    return `Delete ALL ${count} log file(s)? (${formatBytes(totalSize)}) [y/N]`
  }

  getTotalSize(indices: number[]): number {
    const logs = this.getItems()
    return indices.reduce((sum, index) => {
      const log = logs[index]
      return log ? sum + log.sizeBytes : sum
    }, 0)
  }

  async executeDelete(indices: number[]): Promise<DeleteResult> {
    const logs = this.getItems()
    const toDelete = indices.map((i) => logs[i]).filter(Boolean)

    let deletedCount = 0
    let freedBytes = 0
    const errors: string[] = []

    const results = await deleteLogs(toDelete)

    for (const result of results) {
      if (result.success) {
        deletedCount++
        freedBytes += result.bytesFreed
      } else if (result.error) {
        errors.push(`${result.filename}: ${result.error}`)
      }
    }

    return { deletedCount, freedBytes, errors }
  }
}
