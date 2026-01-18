import type { ViewController, ControllerContext } from "./index"
import type { ProjectInfo, SessionInfo } from "../../types"
import type { DetailViewerData, DetailViewerItem } from "../components/detail-viewer"
import { Action, DETAIL_VIEWER_KEYBINDINGS, getHintsFromBindings, type KeyBinding } from "../keybindings"
import { getProjectStorageInfo } from "../../data/loader"
import { formatBytes, formatRelativeTime, truncatePath } from "../../utils"
import { SessionViewerController } from "./session-viewer-controller"

// ============================================================================
// Project Viewer Controller
// ============================================================================

export class ProjectViewerController implements ViewController {
  private sessions: SessionInfo[] = []

  constructor(private project: ProjectInfo) {
    this.sessions = project.sessions
  }

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
        this.viewSelectedSession(ctx)
        return true
      case Action.BACK:
        ctx.popController()
        return true
      default:
        return false
    }
  }

  getHelpText(): string {
    return "j/k=nav, Enter=view session, g/G=top/bottom, Esc/q=back"
  }

  getKeybindings(): KeyBinding[] {
    return DETAIL_VIEWER_KEYBINDINGS
  }

  async onEnter(ctx: ControllerContext): Promise<void> {
    // Show loading state
    ctx.statusBar.setHints("Loading project details...")

    // Load storage info
    const storageInfo = await getProjectStorageInfo(this.project.id)

    // Build detail viewer data
    const data: DetailViewerData = {
      title: `Project: ${truncatePath(this.project.worktree, 60)}`,
      fields: [
        { label: "Path:", value: this.project.worktree },
        { label: "Sessions:", value: String(this.project.sessionCount) },
        { label: "Size:", value: formatBytes(this.project.totalSizeBytes) },
        { label: "Created:", value: formatRelativeTime(this.project.time.created) },
        { label: "Updated:", value: formatRelativeTime(this.project.time.updated) },
        { label: "Messages:", value: String(storageInfo.totalMessages) },
        { label: "Parts:", value: String(storageInfo.totalParts) },
        { label: "Status:", value: this.project.isOrphan ? "ORPHAN (directory missing)" : "Active" },
      ],
      itemsLabel: "Sessions:",
      items: this.buildSessionItems(),
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

  private buildSessionItems(): DetailViewerItem[] {
    return this.sessions.map((session) => {
      const title = session.title || session.slug || session.id.slice(0, 12)
      const updated = formatRelativeTime(session.time.updated)
      const messages = `${session.messageCount} messages`
      const size = formatBytes(session.sizeBytes)

      return {
        name: title,
        description: `${updated} | ${messages} | ${size}`,
        value: session.id,
      }
    })
  }

  private viewSelectedSession(ctx: ControllerContext): void {
    const selectedValue = ctx.detailViewer.getSelectedValue()
    if (!selectedValue) return

    const session = this.sessions.find((s) => s.id === selectedValue)
    if (session) {
      ctx.pushController(new SessionViewerController(session))
    }
  }
}
