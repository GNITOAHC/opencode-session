import {
  BoxRenderable,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core"

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
   * Show the confirmation dialog
   * @param message The confirmation message to display
   * @param action The action to execute on confirmation
   */
  show(message: string, action: () => Promise<void>): void {
    this.text.content = message
    this.action = action
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
   */
  cancel(): void {
    this.hide()
  }
}
