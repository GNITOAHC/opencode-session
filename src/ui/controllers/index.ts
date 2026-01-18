import type { ViewType } from "../../types"
import type { StateManager } from "../state"
import type { ListContainer } from "../components/list-container"
import type { ConfirmDialog } from "../components/confirm-dialog"
import type { Header } from "../components/header"
import type { StatusBar } from "../components/status-bar"
import type { ViewMap } from "../views"
import { Action, type KeyBinding } from "../keybindings"
import { MainController } from "./main-controller"
import { OrphanController } from "./orphan-controller"
import { LogController } from "./log-controller"

// ============================================================================
// Controller Interface and Types
// ============================================================================

export interface ControllerContext {
  state: StateManager
  listContainer: ListContainer
  confirmDialog: ConfirmDialog
  header: Header
  statusBar: StatusBar
  loadData: () => Promise<void>
  
  // Stack navigation
  pushController: (controller: ViewController) => void
  popController: () => void
}

export interface ViewController {
  /**
   * Handle an action for this view
   * @returns true if the action was handled, false otherwise
   */
  handleAction(action: Action, context: ControllerContext): boolean
  
  /**
   * Get help text for this view's keybindings
   */
  getHelpText(): string
  
  /**
   * Get the keybindings for this controller
   */
  getKeybindings(): KeyBinding[]
  
  /**
   * Called when this controller becomes active (pushed onto stack or becomes top)
   */
  onEnter?(context: ControllerContext): void
  
  /**
   * Called when this controller is deactivated (popped from stack)
   */
  onExit?(context: ControllerContext): void
}

// ============================================================================
// Controller Factory
// ============================================================================

export function createController(
  viewType: ViewType,
  views: ViewMap,
  state: StateManager
): ViewController {
  switch (viewType) {
    case "main":
      return new MainController(views.main, state)
    case "orphans":
      return new OrphanController(views.orphans, state)
    case "logs":
      return new LogController(views.logs, state)
  }
}

// ============================================================================
// Exports
// ============================================================================

export { MainController } from "./main-controller"
export { OrphanController } from "./orphan-controller"
export { LogController } from "./log-controller"
export { ConfirmDialogController, type ConfirmDetails, type ConfirmField } from "./confirm-controller"
