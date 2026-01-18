import type { ViewController, ControllerContext } from "./index"
import { Action, LOG_VIEWER_KEYBINDINGS, getHintsFromBindings, type KeyBinding } from "../keybindings"

// ============================================================================
// Log Viewer Controller
// ============================================================================

export class LogViewerController implements ViewController {
  constructor(
    private filename: string,
    private content: string
  ) {}

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
    return "j/k=scroll, g=top, G=bottom, Esc/q=back"
  }

  getKeybindings(): KeyBinding[] {
    return LOG_VIEWER_KEYBINDINGS
  }

  onEnter(ctx: ControllerContext): void {
    ctx.logViewer.show(this.filename, this.content)
    ctx.statusBar.setHints(getHintsFromBindings(LOG_VIEWER_KEYBINDINGS))
  }

  onExit(ctx: ControllerContext): void {
    ctx.logViewer.hide()
  }
}
