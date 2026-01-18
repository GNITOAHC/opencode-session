import type { SelectOption } from "@opentui/core"
import type { ViewType } from "../../types"
import type { StateManager } from "../state"

// ============================================================================
// Delete Result Type
// ============================================================================

export interface DeleteResult {
  deletedCount: number
  freedBytes: number
  errors: string[]
}

// ============================================================================
// View Configuration
// ============================================================================

export interface ViewConfig {
  id: ViewType
  title: string
  supportsSelectAll: boolean
  supportsDeleteAll: boolean
}

// ============================================================================
// Base View Abstract Class
// ============================================================================

// ViewItem is a union of all possible item types across views
// Each view can return any type that can be used in the UI
export type ViewItem = unknown

export abstract class BaseView {
  protected state: StateManager

  constructor(state: StateManager) {
    this.state = state
  }

  /**
   * View configuration
   */
  abstract readonly config: ViewConfig

  /**
   * Get the items for this view
   */
  abstract getItems(): ViewItem[]

  /**
   * Convert items to SelectOption format for display
   */
  abstract getOptions(selectedIndices: Set<number>): SelectOption[]

  /**
   * Get the confirmation message for deletion
   */
  abstract getDeleteMessage(count: number, totalSize: number): string

  /**
   * Execute deletion of items at the given indices
   */
  abstract executeDelete(indices: number[]): Promise<DeleteResult>

  /**
   * Get the title with counts
   */
  getTitle(selectedCount: number): string {
    const items = this.getItems()
    const { title } = this.config
    let result = `${title} (${items.length} total`
    if (selectedCount > 0) {
      result += `, ${selectedCount} selected`
    }
    result += ")"
    return result
  }

  /**
   * Calculate total size of selected items
   * Each view should override this with proper type handling
   */
  abstract getTotalSize(indices: number[]): number

  /**
   * Get the number of items in this view
   */
  getItemCount(): number {
    return this.getItems().length
  }
}
