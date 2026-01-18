import type { ViewController, ControllerContext } from "./index"
import type { SessionInfo, Message, Todo } from "../../types"
import type { DetailViewerData, DetailViewerItem, DetailViewerSection } from "../components/detail-viewer"
import { Action, DETAIL_VIEWER_KEYBINDINGS, getHintsFromBindings, type KeyBinding } from "../keybindings"
import { loadMessages, loadTodos } from "../../data/loader"
import { formatBytes, formatRelativeTime, truncatePath } from "../../utils"
import { MessageViewerController } from "./message-viewer-controller"

// ============================================================================
// Session Viewer Controller
// ============================================================================

export class SessionViewerController implements ViewController {
  private messages: Message[] = []
  private todos: Todo[] = []

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

    // Load messages and todos in parallel
    const [messages, todos] = await Promise.all([
      loadMessages(this.session.id),
      loadTodos(this.session.id),
    ])
    this.messages = messages
    this.todos = todos

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
        { label: "Todos:", value: this.buildTodoSummary() },
        { label: "Status:", value: this.session.isOrphan ? "ORPHAN" : "Active" },
      ],
      sections: this.buildTodoSection(),
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

  private buildTodoSummary(): string {
    if (this.todos.length === 0) return "None"

    const completed = this.todos.filter((t) => t.status === "completed").length
    const pending = this.todos.filter((t) => t.status === "pending").length
    const inProgress = this.todos.filter((t) => t.status === "in_progress").length
    const cancelled = this.todos.filter((t) => t.status === "cancelled").length

    const parts: string[] = []
    if (completed > 0) parts.push(`${completed} completed`)
    if (inProgress > 0) parts.push(`${inProgress} in progress`)
    if (pending > 0) parts.push(`${pending} pending`)
    if (cancelled > 0) parts.push(`${cancelled} cancelled`)

    return parts.join(", ")
  }

  private buildTodoSection(): DetailViewerSection[] {
    if (this.todos.length === 0) return []

    const statusIcon: Record<Todo["status"], string> = {
      completed: "[COMPLETED]",
      in_progress: "[IN_PROGRESS]",
      pending: "[PENDING]",
      cancelled: "[CANCELLED]",
    }

    const lines = this.todos.map((todo) => {
      const priorityLabel = todo.priority !== "medium" ? ` (${todo.priority})` : ""
      return `${statusIcon[todo.status]} ${todo.content}${priorityLabel}`
    })

    return [{ label: "Todos:", lines }]
  }

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
