import {
  BoxRenderable,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core"
import type { ViewType } from "../../types"

// ============================================================================
// Tab Configuration
// ============================================================================

interface TabConfig {
  id: ViewType
  label: string
}

const TABS: TabConfig[] = [
  { id: "main", label: "Projects" },
  { id: "orphans", label: "Orphans" },
  { id: "logs", label: "Logs" },
]

// ============================================================================
// TabBar Component
// ============================================================================

export class TabBar {
  private box: BoxRenderable
  private text: TextRenderable
  private activeView: ViewType = "main"

  constructor(renderer: CliRenderer) {
    this.box = new BoxRenderable(renderer, {
      id: "tabbar-box",
      width: "100%",
      height: 3,
      borderStyle: "single",
      borderColor: "#444444",
      padding: 1,
    })

    this.text = new TextRenderable(renderer, {
      id: "tabbar-text",
      content: this.buildTabText("main"),
      fg: "#FFFFFF",
    })

    this.box.add(this.text)
  }

  /**
   * Get the root renderable for this component
   */
  getRenderable(): BoxRenderable {
    return this.box
  }

  /**
   * Set the active tab and update display
   */
  setActiveTab(view: ViewType): void {
    if (this.activeView !== view) {
      this.activeView = view
      this.text.content = this.buildTabText(view)
    }
  }

  /**
   * Build the tab text with the active tab bracketed
   */
  private buildTabText(activeView: ViewType): string {
    return TABS.map((tab) => {
      if (tab.id === activeView) {
        return `[${tab.label}]`
      }
      return ` ${tab.label} `
    }).join("  ")
  }
}
