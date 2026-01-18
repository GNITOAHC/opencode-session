import {
  BoxRenderable,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core"
import { APP_NAME, APP_VERSION } from "../../config"

// ============================================================================
// Header Component
// ============================================================================

export class Header {
  private box: BoxRenderable
  private text: TextRenderable

  constructor(renderer: CliRenderer) {
    this.box = new BoxRenderable(renderer, {
      id: "header-box",
      width: "100%",
      height: 3,
      borderStyle: "single",
      borderColor: "#666666",
      padding: 1,
    })

    this.text = new TextRenderable(renderer, {
      id: "header-text",
      content: `${APP_NAME} v${APP_VERSION}`,
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
   * Set counts (total items and selected)
   */
  setCounts(totalCount: number, selectedCount: number): void {
    let text = `${APP_NAME} v${APP_VERSION}`
    if (totalCount > 0) {
      text += `  |  ${totalCount} items`
      if (selectedCount > 0) {
        text += `, ${selectedCount} selected`
      }
    }
    this.text.content = text
  }

  /**
   * Set loading state with message
   */
  setLoading(message: string = "Loading..."): void {
    this.text.content = `${APP_NAME} v${APP_VERSION} - ${message}`
  }
}
