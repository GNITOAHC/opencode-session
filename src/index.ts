#!/usr/bin/env bun

import { App } from "./ui/app"

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Handle --help and --version flags
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
opencode-session - Manage OpenCode sessions

Usage: opencode-session [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version number

Navigation:
  j / ↓          Move down
  k / ↑          Move up
  Space          Toggle selection
  a              Select all / Deselect all
  Enter          Confirm action

Actions:
  d              Delete selected item(s)
  D              Delete ALL (in orphans/logs view)
  o              View orphan sessions
  p              View projects
  l              View log files
  r              Reload data

General:
  Esc / q        Go back / Quit
  ?              Show help
`)
    process.exit(0)
  }

  if (args.includes("--version") || args.includes("-v")) {
    const pkg = await import("../package.json")
    console.log(pkg.version)
    process.exit(0)
  }

  // Start the app
  const app = new App()
  await app.init()
  app.run()
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
