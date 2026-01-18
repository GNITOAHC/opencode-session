import {
  createCliRenderer,
  BoxRenderable,
  type CliRenderer,
  type KeyEvent,
} from "@opentui/core"
import { loadAllData } from "../data/loader"
import { StateManager, StateEvent } from "./state"
import { Action, findAction, getHintsForView } from "./keybindings"
import { Header, TabBar, StatusBar, ConfirmDialog, ListContainer, LogViewer, DetailViewer } from "./components"
import { createViews, getView, type ViewMap } from "./views"
import { createController, type ViewController, type ControllerContext } from "./controllers"

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
  private logViewer!: LogViewer
  private detailViewer!: DetailViewer

  // Controller Stack
  private controllerStack: ViewController[] = []

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

    // Push initial controller onto stack
    this.pushInitialController()
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
    this.logViewer = new LogViewer(this.renderer)
    this.detailViewer = new DetailViewer(this.renderer)

    // Build hierarchy
    this.mainContainer.add(this.header.getRenderable())
    this.mainContainer.add(this.tabBar.getRenderable())
    this.mainContainer.add(this.listContainer.getRenderable())
    this.mainContainer.add(this.statusBar.getRenderable())
    this.renderer.root.add(this.mainContainer)
    this.renderer.root.add(this.confirmDialog.getRenderable())
    this.renderer.root.add(this.logViewer.getRenderable())
    this.renderer.root.add(this.detailViewer.getRenderable())

    // Set initial state
    this.header.setLoading()
    this.listContainer.focus()
  }

  private setupEventListeners(): void {
    // Reset cursor on view/data change
    this.state.on(StateEvent.VIEW_CHANGED, () => {
      // Replace base controller when view changes
      this.controllerStack[0] = createController(this.state.view, this.views, this.state)
      this.updateView(true)
    })
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
      this.handleKeys(key)
    })
  }

  private handleKeys(key: KeyEvent): void {
    // Use sequence for printable chars (preserves case like 'G'), otherwise use name for special keys
    // Check if sequence is a printable character (not control chars like \r, \t, \x1b)
    // Note: > 32 excludes space (charCode 32) so it uses key.name "space" instead
    const isPrintable = key.sequence?.length === 1 && key.sequence.charCodeAt(0) > 32
    const keyName = isPrintable ? key.sequence : (key.name ?? key.sequence)
    const topController = this.getTopController()

    // Find action using top controller's keybindings
    const action = findAction(keyName, topController.getKeybindings())
    if (!action) return

    // Global actions only at root level (stack depth == 1)
    if (this.controllerStack.length === 1) {
      switch (action) {
        case Action.QUIT:
          this.quit()
          return
        case Action.NEXT_VIEW:
          this.switchView()
          return
        case Action.RELOAD:
          this.loadData()
          return
      }
    }

    // Delegate to top controller
    topController.handleAction(action as Action, this.createContext())
  }

  // --------------------------------------------------------------------------
  // Controller Stack Management
  // --------------------------------------------------------------------------

  private pushInitialController(): void {
    const controller = createController(this.state.view, this.views, this.state)
    this.controllerStack.push(controller)
  }

  private getTopController(): ViewController {
    return this.controllerStack[this.controllerStack.length - 1]
  }

  private pushController(controller: ViewController): void {
    this.controllerStack.push(controller)
    controller.onEnter?.(this.createContext())
  }

  private popController(): void {
    if (this.controllerStack.length > 1) {
      const popped = this.controllerStack.pop()!
      popped.onExit?.(this.createContext())
      
      // Re-enter the new top controller to restore its view
      const newTop = this.getTopController()
      newTop.onEnter?.(this.createContext())
    }
  }

  private switchView(): void {
    // Pop all subviews first (cancel any open dialogs)
    while (this.controllerStack.length > 1) {
      const popped = this.controllerStack.pop()!
      popped.onExit?.(this.createContext())
    }

    // Switch to next view (this triggers VIEW_CHANGED event which updates stack[0])
    this.state.nextView()
  }

  private createContext(): ControllerContext {
    return {
      state: this.state,
      listContainer: this.listContainer,
      confirmDialog: this.confirmDialog,
      logViewer: this.logViewer,
      detailViewer: this.detailViewer,
      header: this.header,
      statusBar: this.statusBar,
      loadData: () => this.loadData(),
      pushController: (c) => this.pushController(c),
      popController: () => this.popController(),
    }
  }

  // --------------------------------------------------------------------------
  // Data & View Management
  // --------------------------------------------------------------------------

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

  private quit(): void {
    this.renderer.destroy()
    process.exit(0)
  }

  run(): void {
    // The renderer handles the event loop
  }
}
