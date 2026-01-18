import type { ViewType } from "../../types"
import type { StateManager } from "../state"
import { BaseView } from "./base-view"
import { MainView } from "./main-view"
import { OrphanListView } from "./orphan-list"
import { LogListView } from "./log-list"

// ============================================================================
// Exports
// ============================================================================

export { BaseView, type ViewConfig, type DeleteResult, type ViewItem } from "./base-view"
export { MainView, type ListItem, type ProjectItem, type SessionItem } from "./main-view"
export { OrphanListView } from "./orphan-list"
export { LogListView } from "./log-list"

// ============================================================================
// View Factory
// ============================================================================

export type ViewMap = {
  main: MainView
  orphans: OrphanListView
  logs: LogListView
}

export function createViews(state: StateManager): ViewMap {
  return {
    main: new MainView(state),
    orphans: new OrphanListView(state),
    logs: new LogListView(state),
  }
}

export function getView(views: ViewMap, viewType: ViewType): BaseView {
  return views[viewType]
}

export function getMainView(views: ViewMap): MainView {
  return views.main
}

export function getOrphanView(views: ViewMap): OrphanListView {
  return views.orphans
}
