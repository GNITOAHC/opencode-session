import {
  BoxRenderable,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core"

// ============================================================================
// Detail Viewer Types
// ============================================================================

export interface DetailViewerItem {
  name: string
  description?: string
  value: string  // For identifying item on Enter
}

export interface DetailViewerData {
  title: string
  fields: { label: string; value: string }[]
  items: DetailViewerItem[]
  itemsLabel?: string  // e.g., "Sessions:", "Messages:"
}

// ============================================================================
// Detail Viewer Component
// ============================================================================

export class DetailViewer {
  private box: BoxRenderable
  private titleText: TextRenderable
  private fieldsText: TextRenderable
  private itemsLabelText: TextRenderable
  private itemsText: TextRenderable
  private hintsText: TextRenderable

  private items: DetailViewerItem[] = []
  private selectedIndex = 0
  private scrollOffset = 0
  private itemsViewportHeight = 0
  private contentWidth = 0

  constructor(private renderer: CliRenderer) {
    // Full-screen overlay box
    this.box = new BoxRenderable(renderer, {
      id: "detail-viewer-box",
      width: "100%",
      height: "100%",
      position: "absolute",
      left: 0,
      top: 0,
      borderStyle: "double",
      borderColor: "#FF6600",
      backgroundColor: "#1a1a1a",
      visible: false,
      padding: 1,
      zIndex: 200,
      flexDirection: "column",
    })

    // Title
    this.titleText = new TextRenderable(renderer, {
      id: "detail-viewer-title",
      content: "",
      fg: "#FF6600",
    })

    // Metadata fields
    this.fieldsText = new TextRenderable(renderer, {
      id: "detail-viewer-fields",
      content: "",
      fg: "#CCCCCC",
    })

    // Items section label
    this.itemsLabelText = new TextRenderable(renderer, {
      id: "detail-viewer-items-label",
      content: "",
      fg: "#FF6600",
    })

    // Scrollable items area
    this.itemsText = new TextRenderable(renderer, {
      id: "detail-viewer-items",
      content: "",
      fg: "#FFFFFF",
      flexGrow: 1,
    })

    // Hints at the bottom
    this.hintsText = new TextRenderable(renderer, {
      id: "detail-viewer-hints",
      content: "",
      fg: "#888888",
    })

    this.box.add(this.titleText)
    this.box.add(this.fieldsText)
    this.box.add(this.itemsLabelText)
    this.box.add(this.itemsText)
    this.box.add(this.hintsText)
  }

  /**
   * Get the root renderable for this component
   */
  getRenderable(): BoxRenderable {
    return this.box
  }

  /**
   * Show the detail viewer with data
   */
  show(data: DetailViewerData): void {
    this.titleText.content = data.title

    // Build fields content
    const fieldsContent = data.fields
      .map((f) => `${f.label.padEnd(14)} ${f.value}`)
      .join("\n")
    this.fieldsText.content = fieldsContent

    // Items label
    this.itemsLabelText.content = data.itemsLabel ? `\n${data.itemsLabel}` : ""

    // Store items and reset selection
    this.items = data.items
    this.selectedIndex = 0
    this.scrollOffset = 0

    // Calculate dimensions
    const terminalHeight = this.renderer.terminalHeight
    const terminalWidth = this.renderer.terminalWidth
    // Account for: border(2) + padding(2) + title(1) + fields + itemsLabel(1) + hints(1) + margins
    const fieldsHeight = data.fields.length + 1
    const labelHeight = data.itemsLabel ? 2 : 0
    this.itemsViewportHeight = Math.max(3, terminalHeight - 10 - fieldsHeight - labelHeight)
    this.contentWidth = terminalWidth - 6  // border(2) + padding(2) + margin

    this.updateContent()
    this.box.visible = true
  }

  /**
   * Hide the detail viewer
   */
  hide(): void {
    this.box.visible = false
    this.items = []
    this.selectedIndex = 0
    this.scrollOffset = 0
  }

  /**
   * Check if the viewer is currently visible
   */
  isVisible(): boolean {
    return this.box.visible
  }

  /**
   * Get the currently selected index
   */
  getSelectedIndex(): number {
    return this.selectedIndex
  }

  /**
   * Get the value of the selected item
   */
  getSelectedValue(): string | undefined {
    return this.items[this.selectedIndex]?.value
  }

  /**
   * Move selection up
   */
  scrollUp(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--
      // Adjust scroll if selection goes above viewport
      if (this.selectedIndex < this.scrollOffset) {
        this.scrollOffset = this.selectedIndex
      }
      this.updateContent()
    }
  }

  /**
   * Move selection down
   */
  scrollDown(): void {
    if (this.selectedIndex < this.items.length - 1) {
      this.selectedIndex++
      // Adjust scroll if selection goes below viewport
      // Each item takes 2 lines (name + description)
      const visibleItems = Math.floor(this.itemsViewportHeight / 2)
      if (this.selectedIndex >= this.scrollOffset + visibleItems) {
        this.scrollOffset = this.selectedIndex - visibleItems + 1
      }
      this.updateContent()
    }
  }

  /**
   * Jump to first item
   */
  scrollToTop(): void {
    this.selectedIndex = 0
    this.scrollOffset = 0
    this.updateContent()
  }

  /**
   * Jump to last item
   */
  scrollToBottom(): void {
    this.selectedIndex = Math.max(0, this.items.length - 1)
    const visibleItems = Math.floor(this.itemsViewportHeight / 2)
    this.scrollOffset = Math.max(0, this.items.length - visibleItems)
    this.updateContent()
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  /**
   * Update the visible content
   */
  private updateContent(): void {
    if (this.items.length === 0) {
      this.itemsText.content = "  (no items)"
      this.hintsText.content = "Esc/q:back"
      return
    }

    // Calculate visible items (each item is 2 lines)
    const visibleItems = Math.floor(this.itemsViewportHeight / 2)
    const endIndex = Math.min(this.scrollOffset + visibleItems, this.items.length)

    const lines: string[] = []
    for (let i = this.scrollOffset; i < endIndex; i++) {
      const item = this.items[i]
      const isSelected = i === this.selectedIndex
      const prefix = isSelected ? "> " : "  "
      
      // Truncate name if too long
      const maxNameLen = this.contentWidth - 4
      const name = item.name.length > maxNameLen 
        ? item.name.slice(0, maxNameLen - 3) + "..."
        : item.name
      
      lines.push(`${prefix}${name}`)
      
      // Description line (indented)
      if (item.description) {
        const maxDescLen = this.contentWidth - 6
        const desc = item.description.length > maxDescLen
          ? item.description.slice(0, maxDescLen - 3) + "..."
          : item.description
        lines.push(`    ${desc}`)
      } else {
        lines.push("")
      }
    }

    this.itemsText.content = lines.join("\n")

    // Update hints with position
    const totalItems = this.items.length
    const current = this.selectedIndex + 1
    const scrollInfo = totalItems > visibleItems ? `  [${current}/${totalItems}]` : ""
    this.hintsText.content = `j/k:nav  Enter:view  g/G:top/bottom  Esc/q:back${scrollInfo}`
  }
}
