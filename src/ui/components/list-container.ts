import {
  BoxRenderable,
  SelectRenderable,
  TextRenderable,
  type CliRenderer,
  type SelectOption,
} from "@opentui/core"

// ============================================================================
// List Container Component
// ============================================================================

export class ListContainer {
  private box: BoxRenderable
  private select: SelectRenderable
  private emptyText: TextRenderable

  constructor(renderer: CliRenderer) {
    this.box = new BoxRenderable(renderer, {
      id: "list-box",
      width: "100%",
      flexGrow: 1,
      borderStyle: "single",
      borderColor: "#444444",
      overflow: "hidden",
    })

    this.select = new SelectRenderable(renderer, {
      id: "select-list",
      width: "100%",
      height: "100%",
      options: [],
      showDescription: true,
      wrapSelection: true,
    })

    this.emptyText = new TextRenderable(renderer, {
      id: "empty-text",
      content: "  No items",
      fg: "#666666",
    })
    this.emptyText.visible = false

    this.box.add(this.select)
    this.box.add(this.emptyText)
  }

  /**
   * Get the root renderable for this component
   */
  getRenderable(): BoxRenderable {
    return this.box
  }

  /**
   * Set the options to display in the list
   */
  setOptions(options: SelectOption[]): void {
    if (options.length === 0) {
      this.select.visible = false
      this.emptyText.visible = true
    } else {
      this.select.visible = true
      this.emptyText.visible = false
      this.select.options = options
      this.select.focus()  // Re-focus after making visible
    }
  }

  /**
   * Get the currently selected index
   */
  getSelectedIndex(): number {
    return this.select.getSelectedIndex()
  }

  /**
   * Set the selected index
   */
  setSelectedIndex(index: number): void {
    this.select.selectedIndex = index
  }

  /**
   * Focus the list for keyboard input
   */
  focus(): void {
    this.select.focus()
  }

  /**
   * Get the number of options
   */
  getOptionCount(): number {
    return this.select.options.length
  }
}
