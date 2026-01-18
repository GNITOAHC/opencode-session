import {
  createCliRenderer,
  BoxRenderable,
  type CliRenderer,
  type KeyEvent,
} from "@opentui/core"
import { loadAllData } from "../data/loader"
import { formatBytes } from "../utils"
import { StateManager, StateEvent } from "./state"
import { Action, findActionForView, findConfirmAction, getHintsForView } from "./keybindings"
import { Header, TabBar, StatusBar, ConfirmDialog, ListContainer } from "./components"
import { createViews, getView, getMainView, getOrphanView, type ViewMap } from "./views"

// ============================================================================
// Main App Class
// ============================================================================

export class App {
  private renderer!: CliRenderer
  private state: StateManager
  private views!: ViewMap

  // UI Components
  private mainContainer!: BoxRenderable
  private header!: Header
  private tabBar!: TabBar
  private listContainer!: ListContainer
  private statusBar!: StatusBar
  private confirmDialog!: ConfirmDialog

  constructor() {
    this.state = new StateManager()
  }

  async init(): Promise<void> {
    this.renderer = await createCliRenderer({
      exitOnCtrlC: true,
    })

    // Initialize views
    this.views = createViews(this.state)

    // Create UI structure
    this.createUI()

    // Set up event listeners
    this.setupEventListeners()

    // Set up keyboard handlers
    this.setupKeyboardHandlers()

    // Load data
    await this.loadData()
  }

  private createUI(): void {
    // Main container
    this.mainContainer = new BoxRenderable(this.renderer, {
      id: "main-container",
      width: "100%",
      height: "100%",
      flexDirection: "column",
    })

    // Create components
    this.header = new Header(this.renderer)
    this.tabBar = new TabBar(this.renderer)
    this.listContainer = new ListContainer(this.renderer)
    this.statusBar = new StatusBar(this.renderer)
    this.confirmDialog = new ConfirmDialog(this.renderer)

    // Build hierarchy
    this.mainContainer.add(this.header.getRenderable())
    this.mainContainer.add(this.tabBar.getRenderable())
    this.mainContainer.add(this.listContainer.getRenderable())
    this.mainContainer.add(this.statusBar.getRenderable())
    this.renderer.root.add(this.mainContainer)
    this.renderer.root.add(this.confirmDialog.getRenderable())

    // Set initial state
    this.header.setLoading()
    this.listContainer.focus()
  }

  private setupEventListeners(): void {
    // Reset cursor on view/data change
    this.state.on(StateEvent.VIEW_CHANGED, () => this.updateView(true))
    this.state.on(StateEvent.DATA_LOADED, () => this.updateView(true))
    // Preserve cursor on selection/expand change
    this.state.on(StateEvent.SELECTION_CHANGED, () => this.updateView(false))
    this.state.on(StateEvent.EXPAND_CHANGED, () => this.updateView(false))
    this.state.on(StateEvent.STATUS_CHANGED, (msg: string) => {
      this.statusBar.setMessage(msg)
    })
  }

  private setupKeyboardHandlers(): void {
    this.renderer.keyInput.on("keypress", (key: KeyEvent) => {
      if (this.state.isLoading) return

      if (this.confirmDialog.isVisible()) {
        this.handleConfirmKeys(key)
      } else {
        this.handleMainKeys(key)
      }
    })
  }

  private handleMainKeys(key: KeyEvent): void {
    const keyName = key.name ?? key.sequence
    const action = findActionForView(keyName, this.state.view)

    switch (action) {
      case Action.QUIT:
        this.quit()
        break
      case Action.NEXT_VIEW:
        this.state.nextView()
        break
      case Action.TOGGLE_SELECT:
        this.toggleSelection()
        break
      case Action.SELECT_ALL:
        this.selectAll()
        break
      case Action.DELETE:
        this.initiateDelete()
        break
      case Action.DELETE_ALL:
        this.initiateDeleteAll()
        break
      case Action.EXPAND:
        this.expandCurrentProject()
        break
      case Action.COLLAPSE:
        this.collapseCurrentProject()
        break
      case Action.RELOAD:
        this.loadData()
        break
      case Action.HELP:
        this.showHelp()
        break
    }
  }

  private handleConfirmKeys(key: KeyEvent): void {
    const keyName = key.name ?? key.sequence
    const action = findConfirmAction(keyName)

    if (action === Action.CONFIRM_YES) {
      this.confirmDialog.confirm()
    } else if (action === Action.CONFIRM_NO) {
      this.confirmDialog.cancel()
    }
  }

  private async loadData(): Promise<void> {
    this.state.setLoading(true)
    this.header.setLoading()

    try {
      const data = await loadAllData()
      this.state.setData(data)
    } catch (error) {
      this.state.setStatus(`Error loading data: ${error}`)
    }

    this.state.setLoading(false)
  }

  private updateView(resetCursor: boolean = true): void {
    const view = getView(this.views, this.state.view)
    const options = view.getOptions(this.state.selectedIndices)

    this.listContainer.setOptions(options)
    if (resetCursor) {
      this.listContainer.setSelectedIndex(0)
    }
    this.tabBar.setActiveTab(this.state.view)
    this.header.setCounts(view.getItemCount(), this.state.selectedCount)
    this.statusBar.setHints(getHintsForView(this.state.view))
  }

  private toggleSelection(): void {
    const index = this.listContainer.getSelectedIndex()
    this.state.toggleSelection(index)
  }

  private selectAll(): void {
    const view = getView(this.views, this.state.view)
    if (view.config.supportsSelectAll) {
      this.state.selectAll(view.getItemCount())
    }
  }

  private expandCurrentProject(): void {
    // Works in main and orphans views
    if (this.state.view !== "main" && this.state.view !== "orphans") return

    const index = this.listContainer.getSelectedIndex()
    let projectId: string | undefined

    if (this.state.view === "main") {
      const mainView = getMainView(this.views)
      projectId = mainView.getProjectIdAt(index)
    } else {
      const orphanView = getOrphanView(this.views)
      projectId = orphanView.getProjectIdAt(index)
    }

    if (projectId && !this.state.isProjectExpanded(projectId)) {
      this.state.expandProject(projectId)
    }
  }

  private collapseCurrentProject(): void {
    // Works in main and orphans views
    if (this.state.view !== "main" && this.state.view !== "orphans") return

    const index = this.listContainer.getSelectedIndex()
    let projectId: string | undefined

    if (this.state.view === "main") {
      const mainView = getMainView(this.views)
      projectId = mainView.getProjectIdAt(index)
    } else {
      const orphanView = getOrphanView(this.views)
      projectId = orphanView.getProjectIdAt(index)
    }

    if (projectId && this.state.isProjectExpanded(projectId)) {
      this.state.collapseProject(projectId)
    }
  }

  private initiateDelete(): void {
    const currentIndex = this.listContainer.getSelectedIndex()
    
    // For main and orphans views: single-item delete only
    if (this.state.view === "main" || this.state.view === "orphans") {
      const view = this.state.view === "main" 
        ? getMainView(this.views) 
        : getOrphanView(this.views)
      
      const message = view.getDeleteMessageForItem(currentIndex)
      
      this.confirmDialog.show(message, async () => {
        await this.executeDelete([currentIndex])
      })
      return
    }
    
    // For logs view: use selected indices or current
    const indices = this.state.getSelectedOrCurrentIndices(currentIndex)
    if (indices.length === 0) {
      this.state.setStatus("Nothing selected")
      return
    }

    const view = getView(this.views, this.state.view)
    const totalSize = view.getTotalSize(indices)
    const message = view.getDeleteMessage(indices.length, totalSize)

    this.confirmDialog.show(message, async () => {
      await this.executeDelete(indices)
    })
  }

  private initiateDeleteAll(): void {
    const view = getView(this.views, this.state.view)
    if (!view.config.supportsDeleteAll) return

    const itemCount = view.getItemCount()
    if (itemCount === 0) {
      this.state.setStatus("Nothing to delete")
      return
    }

    const allIndices = Array.from({ length: itemCount }, (_, i) => i)
    const totalSize = view.getTotalSize(allIndices)
    const message = view.getDeleteMessage(itemCount, totalSize)

    this.confirmDialog.show(message, async () => {
      await this.executeDelete(allIndices)
    })
  }

  private async executeDelete(indices: number[]): Promise<void> {
    this.state.setLoading(true)
    this.header.setLoading("Deleting...")

    try {
      const view = getView(this.views, this.state.view)
      const result = await view.executeDelete(indices)
      this.state.setStatus(`Deleted ${result.deletedCount} items, freed ${formatBytes(result.freedBytes)}`)
      await this.loadData()
    } catch (error) {
      this.state.setStatus(`Error: ${error}`)
    }

    this.state.setLoading(false)
  }

  private showHelp(): void {
    const hints: Record<string, string> = {
      main: "j/k=nav, l=expand, h=collapse, d=delete, Tab=next view, q=quit",
      orphans: "j/k=nav, l=expand, h=collapse, d=delete, Tab=next view, q=quit",
      logs: "j/k=nav, Space=select, a=all, d=delete, D=delete-all, Tab=next view, q=quit",
    }
    this.statusBar.setMessage(`Help: ${hints[this.state.view]}`)
  }

  private quit(): void {
    this.renderer.destroy()
    process.exit(0)
  }

  run(): void {
    // The renderer handles the event loop
  }
}
