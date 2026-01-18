import type { ViewController, ControllerContext } from "./index"
import type { Message, Part } from "../../types"
import { Action, LOG_VIEWER_KEYBINDINGS, getHintsFromBindings, type KeyBinding } from "../keybindings"
import { loadParts } from "../../data/loader"
import { formatRelativeTime } from "../../utils"

// ============================================================================
// Message Viewer Controller
// ============================================================================

export class MessageViewerController implements ViewController {
  private parts: Part[] = []

  constructor(private message: Message) {}

  handleAction(action: Action, ctx: ControllerContext): boolean {
    switch (action) {
      case Action.SCROLL_UP:
        ctx.logViewer.scrollUp()
        return true
      case Action.SCROLL_DOWN:
        ctx.logViewer.scrollDown()
        return true
      case Action.SCROLL_TOP:
        ctx.logViewer.scrollToTop()
        return true
      case Action.SCROLL_BOTTOM:
        ctx.logViewer.scrollToBottom()
        return true
      case Action.BACK:
        ctx.popController()
        return true
      default:
        return false
    }
  }

  getHelpText(): string {
    return "j/k=scroll, g/G=top/bottom, Esc/q=back"
  }

  getKeybindings(): KeyBinding[] {
    return LOG_VIEWER_KEYBINDINGS
  }

  async onEnter(ctx: ControllerContext): Promise<void> {
    // Show loading state
    ctx.statusBar.setHints("Loading message content...")

    // Load parts
    this.parts = await loadParts(this.message.id)

    // Build content
    const content = this.buildContent()
    const title = `Message: ${this.message.role} (${this.message.id.slice(0, 16)}...)`

    ctx.logViewer.show(title, content)
    ctx.statusBar.setHints(getHintsFromBindings(LOG_VIEWER_KEYBINDINGS))
  }

  onExit(ctx: ControllerContext): void {
    ctx.logViewer.hide()
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private buildContent(): string {
    const lines: string[] = []

    // Message metadata header
    lines.push("=" .repeat(70))
    lines.push(`Role:      ${this.message.role}`)
    lines.push(`ID:        ${this.message.id}`)
    lines.push(`Created:   ${formatRelativeTime(this.message.time.created)}`)
    if (this.message.time.completed) {
      lines.push(`Completed: ${formatRelativeTime(this.message.time.completed)}`)
    }
    if (this.message.modelID) {
      lines.push(`Model:     ${this.message.modelID}`)
    }
    if (this.message.providerID) {
      lines.push(`Provider:  ${this.message.providerID}`)
    }
    if (this.message.tokens) {
      lines.push(`Tokens:    ${this.message.tokens.input} in / ${this.message.tokens.output} out`)
      if (this.message.tokens.reasoning > 0) {
        lines.push(`Reasoning: ${this.message.tokens.reasoning}`)
      }
    }
    if (this.message.cost) {
      lines.push(`Cost:      $${this.message.cost.toFixed(4)}`)
    }
    if (this.message.finish) {
      lines.push(`Finish:    ${this.message.finish}`)
    }
    lines.push("=" .repeat(70))
    lines.push("")

    // Parts
    if (this.parts.length === 0) {
      lines.push("(No parts found)")
    } else {
      for (const part of this.parts) {
        lines.push(...this.formatPart(part))
        lines.push("")
      }
    }

    return lines.join("\n")
  }

  private formatPart(part: Part): string[] {
    const lines: string[] = []

    switch (part.type) {
      case "text":
        lines.push("-".repeat(40))
        lines.push("[TEXT]")
        lines.push("-".repeat(40))
        if (part.text) {
          lines.push(part.text)
        }
        break

      case "tool":
        lines.push("-".repeat(40))
        lines.push(`[TOOL: ${part.tool || "unknown"}]`)
        lines.push("-".repeat(40))
        if (part.state) {
          // Show status
          if (part.state.status) {
            lines.push(`Status: ${part.state.status}`)
          }
          // Show title/description
          if (part.state.title) {
            lines.push(`Title: ${part.state.title}`)
          }
          // Show input
          if (part.state.input) {
            lines.push("")
            lines.push("Input:")
            lines.push(JSON.stringify(part.state.input, null, 2))
          }
          // Show output (truncated if very long)
          if (part.state.output) {
            lines.push("")
            lines.push("Output:")
            const output = String(part.state.output)
            if (output.length > 2000) {
              lines.push(output.slice(0, 2000))
              lines.push(`... (truncated, ${output.length} chars total)`)
            } else {
              lines.push(output)
            }
          }
        }
        break

      case "step-start":
        lines.push("[STEP START]")
        break

      case "step-finish":
        lines.push("[STEP FINISH]")
        break

      default:
        lines.push(`[${part.type}]`)
        break
    }

    return lines
  }
}
