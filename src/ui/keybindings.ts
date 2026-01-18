import type { ViewType } from "../types"

// ============================================================================
// Keybinding Types
// ============================================================================

export interface KeyBinding {
  keys: string[]
  action: string
  description: string
}

// ============================================================================
// Action Constants
// ============================================================================

export enum Action {
  QUIT = "quit",
  NEXT_VIEW = "next-view",
  TOGGLE_SELECT = "toggle-select",
  SELECT_ALL = "select-all",
  DELETE = "delete",
  DELETE_ALL = "delete-all",
  EXPAND = "expand",
  COLLAPSE = "collapse",
  RELOAD = "reload",
  HELP = "help",
  BACK = "back",
  CONFIRM_YES = "confirm-yes",
  CONFIRM_NO = "confirm-no",
}

// ============================================================================
// View-specific Keybindings
// ============================================================================

// Common keybindings for all views
const BASE_KEYBINDINGS: KeyBinding[] = [
  { keys: ["d"], action: Action.DELETE, description: "d:delete" },
  { keys: ["r"], action: Action.RELOAD, description: "r:reload" },
  { keys: ["tab"], action: Action.NEXT_VIEW, description: "Tab:next view" },
  { keys: ["?"], action: Action.HELP, description: "?:help" },
]

// Main view: no selection, has expand/collapse
export const MAIN_KEYBINDINGS: KeyBinding[] = [
  ...BASE_KEYBINDINGS,
  { keys: ["l"], action: Action.EXPAND, description: "l:expand" },
  { keys: ["h"], action: Action.COLLAPSE, description: "h:collapse" },
  { keys: ["q"], action: Action.QUIT, description: "q:quit" },
  { keys: ["escape"], action: Action.BACK, description: "" },  // hidden from hints
]

// Orphan view: no selection, has expand/collapse
export const ORPHAN_KEYBINDINGS: KeyBinding[] = [
  ...BASE_KEYBINDINGS,
  { keys: ["l"], action: Action.EXPAND, description: "l:expand" },
  { keys: ["h"], action: Action.COLLAPSE, description: "h:collapse" },
  { keys: ["q"], action: Action.QUIT, description: "q:quit" },
  { keys: ["escape"], action: Action.BACK, description: "" },  // hidden from hints
]

// Log view: has selection (Space, a, D)
export const LOG_KEYBINDINGS: KeyBinding[] = [
  ...BASE_KEYBINDINGS,
  { keys: ["space"], action: Action.TOGGLE_SELECT, description: "Space:select" },
  { keys: ["a"], action: Action.SELECT_ALL, description: "a:all" },
  { keys: ["D"], action: Action.DELETE_ALL, description: "D:delete-all" },
  { keys: ["q"], action: Action.QUIT, description: "q:quit" },
  { keys: ["escape"], action: Action.BACK, description: "" },  // hidden from hints
]

export const VIEW_KEYBINDINGS: Record<ViewType, KeyBinding[]> = {
  main: MAIN_KEYBINDINGS,
  orphans: ORPHAN_KEYBINDINGS,
  logs: LOG_KEYBINDINGS,
}

// ============================================================================
// Confirm Dialog Keybindings
// ============================================================================

export const CONFIRM_KEYBINDINGS: KeyBinding[] = [
  { keys: ["y", "Y", "return"], action: Action.CONFIRM_YES, description: "y:confirm" },
  { keys: ["n", "N", "escape"], action: Action.CONFIRM_NO, description: "n/Esc:cancel" },
]

// ============================================================================
// Utility Functions
// ============================================================================

export function getHintsForView(view: ViewType): string {
  const bindings = VIEW_KEYBINDINGS[view]
  const hints = ["j/k:nav"]
  
  for (const binding of bindings) {
    if (binding.description && !hints.includes(binding.description)) {
      hints.push(binding.description)
    }
  }
  
  return hints.join("  ")
}

export function getHintsFromBindings(bindings: KeyBinding[]): string {
  const hints: string[] = []
  
  for (const binding of bindings) {
    if (binding.description && !hints.includes(binding.description)) {
      hints.push(binding.description)
    }
  }
  
  return hints.join("  ")
}

export function findAction(key: string, bindings: KeyBinding[]): string | null {
  for (const binding of bindings) {
    if (binding.keys.includes(key)) {
      return binding.action
    }
  }
  return null
}

export function findActionForView(key: string, view: ViewType): string | null {
  return findAction(key, VIEW_KEYBINDINGS[view])
}

export function findConfirmAction(key: string): string | null {
  return findAction(key, CONFIRM_KEYBINDINGS)
}
