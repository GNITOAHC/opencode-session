import {
  BoxRenderable,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core"
import type { ConfirmField } from "../controllers/confirm-controller"

// ============================================================================
// Confirm Dialog Component
// ============================================================================

export class ConfirmDialog {
  private box: BoxRenderable
  private text: TextRenderable
  private action: (() => Promise<void>) | null = null

  constructor(renderer: CliRenderer) {
    this.box = new BoxRenderable(renderer, {
      id: "confirm-box",
      width: 60,
      height: 5,
      position: "absolute",
      left: 10,
      top: 10,
      borderStyle: "double",
      borderColor: "#FF6600",
      backgroundColor: "#1a1a1a",
      visible: false,
      padding: 1,
      zIndex: 100,
    })

    this.text = new TextRenderable(renderer, {
      id: "confirm-text",
      content: "",
      fg: "#FFFFFF",
    })

    this.box.add(this.text)
  }

  /**
   * Get the root renderable for this component
   */
  getRenderable(): BoxRenderable {
    return this.box
  }

  /**
   * Show the confirmation dialog with a simple message
   * @param message The confirmation message to display
   * @param action The action to execute on confirmation
   */
  show(message: string, action: () => Promise<void>): void {
    this.text.content = message
    this.action = action
    this.box.height = 5
    this.box.visible = true
  }

  /**
   * Show the confirmation dialog with detailed information
   * @param title The dialog title
   * @param fields Key-value fields to display
   */
  showDetails(title: string, fields: ConfirmField[]): void {
    // Build content with title and fields
    let content = `${title}\n\n`
    
    for (const field of fields) {
      content += `${field.label.padEnd(12)} ${field.value}\n`
    }
    
    content += `\nPress y to confirm, n/Esc to cancel`
    
    this.text.content = content
    this.action = null  // Action is handled by controller now
    this.box.height = 6 + fields.length + 2  // title + blank + fields + blank + hint
    this.box.visible = true
  }

  /**
   * Hide the confirmation dialog
   */
  hide(): void {
    this.box.visible = false
    this.text.content = ""
    this.action = null
  }

  /**
   * Check if the dialog is currently visible
   */
  isVisible(): boolean {
    return this.box.visible
  }

  /**
   * Execute the confirmed action and hide the dialog
   * @deprecated Use ConfirmDialogController instead
   */
  async confirm(): Promise<void> {
    const action = this.action
    this.hide()
    if (action) {
      await action()
    }
  }

  /**
   * Cancel and hide the dialog without executing the action
   * @deprecated Use ConfirmDialogController instead
   */
  cancel(): void {
    this.hide()
  }
}
