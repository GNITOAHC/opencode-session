import { EventEmitter } from "events"
import type { ViewType, SessionInfo, ProjectInfo, LogFile } from "../types"
import type { LoadedData } from "../data/loader"

// ============================================================================
// State Interface
// ============================================================================

export interface AppState {
  view: ViewType
  data: LoadedData
  selectedIndices: Set<number>
  currentIndex: number
  expandedProjects: Set<string>
  showConfirm: boolean
  confirmMessage: string
  confirmAction: (() => Promise<void>) | null
  statusMessage: string
  isLoading: boolean
}

// ============================================================================
// State Events
// ============================================================================

export enum StateEvent {
  VIEW_CHANGED = "view-changed",
  DATA_LOADED = "data-loaded",
  SELECTION_CHANGED = "selection-changed",
  LOADING_CHANGED = "loading-changed",
  STATUS_CHANGED = "status-changed",
  CONFIRM_CHANGED = "confirm-changed",
  EXPAND_CHANGED = "expand-changed",
}

// ============================================================================
// View Navigation
// ============================================================================

const VIEW_ORDER: ViewType[] = ["main", "orphans", "logs"]

export function getNextView(current: ViewType): ViewType {
  const index = VIEW_ORDER.indexOf(current)
  const nextIndex = (index + 1) % VIEW_ORDER.length
  return VIEW_ORDER[nextIndex]
}

export function getPrevView(current: ViewType): ViewType {
  const index = VIEW_ORDER.indexOf(current)
  const prevIndex = (index - 1 + VIEW_ORDER.length) % VIEW_ORDER.length
  return VIEW_ORDER[prevIndex]
}

// ============================================================================
// State Manager
// ============================================================================

function createInitialState(): AppState {
  return {
    view: "main",
    data: { sessions: [], projects: [], logs: [] },
    selectedIndices: new Set(),
    currentIndex: 0,
    expandedProjects: new Set(),
    showConfirm: false,
    confirmMessage: "",
    confirmAction: null,
    statusMessage: "",
    isLoading: true,
  }
}

export class StateManager extends EventEmitter {
  private state: AppState

  constructor() {
    super()
    this.state = createInitialState()
  }

  // ---- Getters ----

  get view(): ViewType {
    return this.state.view
  }

  get data(): LoadedData {
    return this.state.data
  }

  get selectedIndices(): Set<number> {
    return this.state.selectedIndices
  }

  get currentIndex(): number {
    return this.state.currentIndex
  }

  get expandedProjects(): Set<string> {
    return this.state.expandedProjects
  }

  get showConfirm(): boolean {
    return this.state.showConfirm
  }

  get confirmMessage(): string {
    return this.state.confirmMessage
  }

  get confirmAction(): (() => Promise<void>) | null {
    return this.state.confirmAction
  }

  get statusMessage(): string {
    return this.state.statusMessage
  }

  get isLoading(): boolean {
    return this.state.isLoading
  }

  // ---- Derived Getters ----

  get sessions(): SessionInfo[] {
    return this.state.data.sessions
  }

  get orphanSessions(): SessionInfo[] {
    return this.state.data.sessions.filter((s) => s.isOrphan)
  }

  get orphanProjects(): ProjectInfo[] {
    return this.state.data.projects.filter((p) => p.isOrphan)
  }

  get projects(): ProjectInfo[] {
    return this.state.data.projects
  }

  get logs(): LogFile[] {
    return this.state.data.logs
  }

  get selectedCount(): number {
    return this.state.selectedIndices.size
  }

  // ---- Setters with Events ----

  setView(view: ViewType): void {
    if (this.state.view !== view) {
      this.state.view = view
      this.state.selectedIndices = new Set()
      this.state.currentIndex = 0
      // Don't clear expanded projects when switching away - preserve state
      this.emit(StateEvent.VIEW_CHANGED, view)
      this.emit(StateEvent.SELECTION_CHANGED)
    }
  }

  nextView(): void {
    this.setView(getNextView(this.state.view))
  }

  prevView(): void {
    this.setView(getPrevView(this.state.view))
  }

  setData(data: LoadedData): void {
    this.state.data = data
    this.state.selectedIndices = new Set()
    this.state.currentIndex = 0
    // Clear expanded projects when data changes (projects may have been deleted)
    this.state.expandedProjects = new Set()
    this.emit(StateEvent.DATA_LOADED, data)
    this.emit(StateEvent.SELECTION_CHANGED)
  }

  setLoading(isLoading: boolean): void {
    if (this.state.isLoading !== isLoading) {
      this.state.isLoading = isLoading
      this.emit(StateEvent.LOADING_CHANGED, isLoading)
    }
  }

  setStatus(message: string): void {
    this.state.statusMessage = message
    this.emit(StateEvent.STATUS_CHANGED, message)
  }

  setCurrentIndex(index: number): void {
    this.state.currentIndex = index
  }

  // ---- Selection Management ----

  toggleSelection(index: number): void {
    if (this.state.selectedIndices.has(index)) {
      this.state.selectedIndices.delete(index)
    } else {
      this.state.selectedIndices.add(index)
    }
    this.emit(StateEvent.SELECTION_CHANGED)
  }

  selectAll(itemCount: number): void {
    if (this.state.selectedIndices.size === itemCount) {
      this.state.selectedIndices = new Set()
    } else {
      this.state.selectedIndices = new Set(
        Array.from({ length: itemCount }, (_, i) => i)
      )
    }
    this.emit(StateEvent.SELECTION_CHANGED)
  }

  clearSelection(): void {
    this.state.selectedIndices = new Set()
    this.emit(StateEvent.SELECTION_CHANGED)
  }

  getSelectedOrCurrentIndices(currentIndex: number): number[] {
    if (this.state.selectedIndices.size > 0) {
      return Array.from(this.state.selectedIndices)
    }
    if (currentIndex >= 0) {
      return [currentIndex]
    }
    return []
  }

  // ---- Project Expansion (for main view) ----

  isProjectExpanded(projectId: string): boolean {
    return this.state.expandedProjects.has(projectId)
  }

  expandProject(projectId: string): void {
    if (!this.state.expandedProjects.has(projectId)) {
      this.state.expandedProjects.add(projectId)
      this.emit(StateEvent.EXPAND_CHANGED, projectId)
    }
  }

  collapseProject(projectId: string): void {
    if (this.state.expandedProjects.has(projectId)) {
      this.state.expandedProjects.delete(projectId)
      this.emit(StateEvent.EXPAND_CHANGED, projectId)
    }
  }

  toggleProjectExpand(projectId: string): void {
    if (this.isProjectExpanded(projectId)) {
      this.collapseProject(projectId)
    } else {
      this.expandProject(projectId)
    }
  }

  collapseAllProjects(): void {
    if (this.state.expandedProjects.size > 0) {
      this.state.expandedProjects = new Set()
      this.state.selectedIndices = new Set()
      this.emit(StateEvent.EXPAND_CHANGED, null)
      this.emit(StateEvent.SELECTION_CHANGED)
    }
  }

  // ---- Confirm Dialog ----

  showConfirmDialog(message: string, action: () => Promise<void>): void {
    this.state.showConfirm = true
    this.state.confirmMessage = message
    this.state.confirmAction = action
    this.emit(StateEvent.CONFIRM_CHANGED, true)
  }

  hideConfirmDialog(): void {
    this.state.showConfirm = false
    this.state.confirmMessage = ""
    this.state.confirmAction = null
    this.emit(StateEvent.CONFIRM_CHANGED, false)
  }

  async executeConfirmAction(): Promise<void> {
    const action = this.state.confirmAction
    this.hideConfirmDialog()
    if (action) {
      await action()
    }
  }

  // ---- Reset ----

  reset(): void {
    this.state = createInitialState()
  }
}
