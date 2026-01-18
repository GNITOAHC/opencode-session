import type { ViewController, ControllerContext } from "./index"
import type { SessionInfo, Message } from "../../types"
import type { DetailViewerData, DetailViewerItem } from "../components/detail-viewer"
import { Action, DETAIL_VIEWER_KEYBINDINGS, getHintsFromBindings, type KeyBinding } from "../keybindings"
import { loadMessages } from "../../data/loader"
import { formatBytes, formatRelativeTime, truncatePath } from "../../utils"
import { MessageViewerController } from "./message-viewer-controller"

// ============================================================================
// Session Viewer Controller
// ============================================================================

export class SessionViewerController implements ViewController {
  private messages: Message[] = []

  constructor(private session: SessionInfo) {}

  handleAction(action: Action, ctx: ControllerContext): boolean {
    switch (action) {
      case Action.SCROLL_UP:
        ctx.detailViewer.scrollUp()
        return true
      case Action.SCROLL_DOWN:
        ctx.detailViewer.scrollDown()
        return true
      case Action.SCROLL_TOP:
        ctx.detailViewer.scrollToTop()
        return true
      case Action.SCROLL_BOTTOM:
        ctx.detailViewer.scrollToBottom()
        return true
      case Action.ENTER:
        this.viewSelectedMessage(ctx)
        return true
      case Action.BACK:
        ctx.popController()
        return true
      default:
        return false
    }
  }

  getHelpText(): string {
    return "j/k=nav, Enter=view message, g/G=top/bottom, Esc/q=back"
  }

  getKeybindings(): KeyBinding[] {
    return DETAIL_VIEWER_KEYBINDINGS
  }

  async onEnter(ctx: ControllerContext): Promise<void> {
    // Show loading state
    ctx.statusBar.setHints("Loading session details...")

    // Load messages
    this.messages = await loadMessages(this.session.id)

    // Calculate token totals
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCost = 0

    for (const msg of this.messages) {
      if (msg.tokens) {
        totalInputTokens += msg.tokens.input
        totalOutputTokens += msg.tokens.output
      }
      if (msg.cost) {
        totalCost += msg.cost
      }
    }

    // Build detail viewer data
    const title = this.session.title || this.session.slug || "Untitled Session"
    const data: DetailViewerData = {
      title: `Session: ${title}`,
      fields: [
        { label: "ID:", value: this.session.id },
        { label: "Project:", value: truncatePath(this.session.projectWorktree, 50) },
        { label: "Directory:", value: truncatePath(this.session.directory, 50) },
        { label: "Messages:", value: String(this.messages.length) },
        { label: "Size:", value: formatBytes(this.session.sizeBytes) },
        { label: "Created:", value: formatRelativeTime(this.session.time.created) },
        { label: "Updated:", value: formatRelativeTime(this.session.time.updated) },
        { label: "Input tokens:", value: totalInputTokens.toLocaleString() },
        { label: "Output tokens:", value: totalOutputTokens.toLocaleString() },
        { label: "Total cost:", value: totalCost > 0 ? `$${totalCost.toFixed(4)}` : "N/A" },
        { label: "Status:", value: this.session.isOrphan ? "ORPHAN" : "Active" },
      ],
      itemsLabel: "Messages:",
      items: this.buildMessageItems(),
    }

    ctx.detailViewer.show(data)
    ctx.statusBar.setHints(getHintsFromBindings(DETAIL_VIEWER_KEYBINDINGS))
  }

  onExit(ctx: ControllerContext): void {
    ctx.detailViewer.hide()
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private buildMessageItems(): DetailViewerItem[] {
    return this.messages.map((msg, index) => {
      const roleIcon = msg.role === "user" ? "[U]" : "[A]"
      const time = formatRelativeTime(msg.time.created)
      const model = msg.modelID || ""
      
      // Token info for assistant messages
      let tokenInfo = ""
      if (msg.role === "assistant" && msg.tokens) {
        tokenInfo = ` | ${msg.tokens.input}/${msg.tokens.output} tokens`
      }

      // Finish reason
      const finish = msg.finish ? ` | ${msg.finish}` : ""

      return {
        name: `${index + 1}. ${roleIcon} ${msg.role === "user" ? "User message" : model}`,
        description: `${time}${tokenInfo}${finish}`,
        value: msg.id,
      }
    })
  }

  private viewSelectedMessage(ctx: ControllerContext): void {
    const selectedValue = ctx.detailViewer.getSelectedValue()
    if (!selectedValue) return

    const message = this.messages.find((m) => m.id === selectedValue)
    if (message) {
      ctx.pushController(new MessageViewerController(message))
    }
  }
}
