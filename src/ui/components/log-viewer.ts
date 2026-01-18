import {
  BoxRenderable,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core"

// ============================================================================
// Log Viewer Component
// ============================================================================

export class LogViewer {
  private box: BoxRenderable
  private titleText: TextRenderable
  private contentText: TextRenderable
  private hintsText: TextRenderable
  
  private lines: string[] = []
  private scrollOffset = 0
  private viewportHeight = 0
  private contentWidth = 0

  constructor(private renderer: CliRenderer) {
    // Full-screen overlay box
    this.box = new BoxRenderable(renderer, {
      id: "log-viewer-box",
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

    // Title bar
    this.titleText = new TextRenderable(renderer, {
      id: "log-viewer-title",
      content: "",
      fg: "#FF6600",
    })

    // Scrollable content area
    this.contentText = new TextRenderable(renderer, {
      id: "log-viewer-content",
      content: "",
      fg: "#FFFFFF",
      flexGrow: 1,
    })

    // Hints at the bottom
    this.hintsText = new TextRenderable(renderer, {
      id: "log-viewer-hints",
      content: "j/k:scroll  g/G:top/bottom  Esc/q:back",
      fg: "#888888",
    })

    this.box.add(this.titleText)
    this.box.add(this.contentText)
    this.box.add(this.hintsText)
  }

  /**
   * Get the root renderable for this component
   */
  getRenderable(): BoxRenderable {
    return this.box
  }

  /**
   * Show the log viewer with the given content
   */
  show(filename: string, content: string): void {
    this.titleText.content = `Log: ${filename}`
    
    // Calculate viewport dimensions (accounting for border, padding, title, hints)
    // Box has padding=1 (top+bottom), border=1 (top+bottom), title=1, hints=1
    const terminalHeight = this.renderer.terminalHeight
    const terminalWidth = this.renderer.terminalWidth
    this.viewportHeight = terminalHeight - 8  // border(2) + padding(2) + title(1) + hints(1) + some margin
    this.contentWidth = terminalWidth - 6      // border(2) + padding(2) + line number gutter(~6)
    
    // Split and wrap lines
    this.lines = this.wrapContent(content)
    this.scrollOffset = 0
    
    this.updateContent()
    this.box.visible = true
  }

  /**
   * Hide the log viewer
   */
  hide(): void {
    this.box.visible = false
    this.lines = []
    this.scrollOffset = 0
  }

  /**
   * Check if the viewer is currently visible
   */
  isVisible(): boolean {
    return this.box.visible
  }

  /**
   * Scroll up by one line
   */
  scrollUp(): void {
    if (this.scrollOffset > 0) {
      this.scrollOffset--
      this.updateContent()
    }
  }

  /**
   * Scroll down by one line
   */
  scrollDown(): void {
    const maxOffset = Math.max(0, this.lines.length - this.viewportHeight)
    if (this.scrollOffset < maxOffset) {
      this.scrollOffset++
      this.updateContent()
    }
  }

  /**
   * Scroll to the top
   */
  scrollToTop(): void {
    this.scrollOffset = 0
    this.updateContent()
  }

  /**
   * Scroll to the bottom
   */
  scrollToBottom(): void {
    this.scrollOffset = Math.max(0, this.lines.length - this.viewportHeight)
    this.updateContent()
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  /**
   * Wrap long lines and add line numbers
   */
  private wrapContent(content: string): string[] {
    const rawLines = content.split("\n")
    const wrappedLines: string[] = []
    
    // Calculate the gutter width based on total line count
    const gutterWidth = Math.max(4, String(rawLines.length).length + 1)
    const maxLineWidth = Math.max(20, this.contentWidth - gutterWidth - 2)  // -2 for " | " separator
    
    for (let i = 0; i < rawLines.length; i++) {
      const lineNum = i + 1
      const rawLine = rawLines[i]
      
      if (rawLine.length <= maxLineWidth) {
        // Line fits, add with line number
        const lineNumStr = String(lineNum).padStart(gutterWidth)
        wrappedLines.push(`${lineNumStr} | ${rawLine}`)
      } else {
        // Line needs wrapping
        let remaining = rawLine
        let isFirstSegment = true
        
        while (remaining.length > 0) {
          const segment = remaining.slice(0, maxLineWidth)
          remaining = remaining.slice(maxLineWidth)
          
          if (isFirstSegment) {
            const lineNumStr = String(lineNum).padStart(gutterWidth)
            wrappedLines.push(`${lineNumStr} | ${segment}`)
            isFirstSegment = false
          } else {
            // Continuation lines show empty gutter
            const emptyGutter = " ".repeat(gutterWidth)
            wrappedLines.push(`${emptyGutter} | ${segment}`)
          }
        }
      }
    }
    
    return wrappedLines
  }

  /**
   * Update the visible content based on scroll offset
   */
  private updateContent(): void {
    const visibleLines = this.lines.slice(
      this.scrollOffset,
      this.scrollOffset + this.viewportHeight
    )
    
    this.contentText.content = visibleLines.join("\n")
    
    // Update hints with scroll position
    const totalLines = this.lines.length
    const currentLine = this.scrollOffset + 1
    const endLine = Math.min(this.scrollOffset + this.viewportHeight, totalLines)
    const scrollInfo = totalLines > this.viewportHeight 
      ? `  [${currentLine}-${endLine}/${totalLines}]`
      : ""
    
    this.hintsText.content = `j/k:scroll  g/G:top/bottom  Esc/q:back${scrollInfo}`
  }
}
