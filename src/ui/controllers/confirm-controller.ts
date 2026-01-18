import type { ViewController, ControllerContext } from "./index"
import { Action, CONFIRM_KEYBINDINGS, type KeyBinding } from "../keybindings"

// ============================================================================
// Confirm Dialog Types
// ============================================================================

export interface ConfirmField {
  label: string
  value: string
}

export interface ConfirmDetails {
  title: string           // e.g., "Delete Project", "Delete Session"
  fields: ConfirmField[]  // e.g., [{ label: "Path:", value: "~/foo" }]
  onConfirm: () => Promise<void>
}

// ============================================================================
// Confirm Dialog Controller
// ============================================================================

export class ConfirmDialogController implements ViewController {
  constructor(private details: ConfirmDetails) {}

  onEnter(ctx: ControllerContext): void {
    ctx.confirmDialog.showDetails(this.details.title, this.details.fields)
    ctx.statusBar.setHints("y:confirm  n/Esc:cancel")
  }

  onExit(ctx: ControllerContext): void {
    ctx.confirmDialog.hide()
  }

  handleAction(action: Action, ctx: ControllerContext): boolean {
    switch (action) {
      case Action.CONFIRM_YES:
        ctx.popController()
        this.details.onConfirm()
        return true
      case Action.CONFIRM_NO:
      case Action.BACK:
        ctx.popController()
        return true
      default:
        return false
    }
  }

  getHelpText(): string {
    return "y:confirm  n/Esc:cancel"
  }

  getKeybindings(): KeyBinding[] {
    return CONFIRM_KEYBINDINGS
  }
}
