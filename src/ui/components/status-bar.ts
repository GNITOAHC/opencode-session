import {
  BoxRenderable,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core"

// ============================================================================
// Status Bar Component
// ============================================================================

export class StatusBar {
  private box: BoxRenderable
  private text: TextRenderable
  private statusTimeout: ReturnType<typeof setTimeout> | null = null
  private currentHints: string = ""
  private currentMessage: string = ""

  constructor(renderer: CliRenderer) {
    this.box = new BoxRenderable(renderer, {
      id: "status-box",
      width: "100%",
      height: 3,
      borderStyle: "single",
      borderColor: "#666666",
      padding: 1,
    })

    this.text = new TextRenderable(renderer, {
      id: "status-text",
      content: "",
      fg: "#888888",
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
   * Set the keybinding hints for the current view
   */
  setHints(hints: string): void {
    this.currentHints = hints
    this.updateDisplay()
  }

  /**
   * Set a temporary status message
   * @param message The message to display
   * @param duration Duration in ms before clearing (default: 3000)
   */
  setMessage(message: string, duration: number = 3000): void {
    // Clear any existing timeout
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout)
      this.statusTimeout = null
    }

    this.currentMessage = message
    this.updateDisplay()

    // Auto-clear message after duration
    if (duration > 0) {
      this.statusTimeout = setTimeout(() => {
        this.currentMessage = ""
        this.updateDisplay()
        this.statusTimeout = null
      }, duration)
    }
  }

  /**
   * Clear the status message
   */
  clearMessage(): void {
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout)
      this.statusTimeout = null
    }
    this.currentMessage = ""
    this.updateDisplay()
  }

  /**
   * Update the display text
   */
  private updateDisplay(): void {
    if (this.currentMessage) {
      this.text.content = `${this.currentMessage} | ${this.currentHints}`
    } else {
      this.text.content = this.currentHints
    }
  }
}
