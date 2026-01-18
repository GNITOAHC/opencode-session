# opencode-session

[![npm version](https://img.shields.io/npm/v/opencode-session.svg)](https://www.npmjs.com/package/opencode-session)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CLI tool to manage [OpenCode](https://opencode.ai) sessions.

## Demo

[![asciicast](https://asciinema.org/a/gkCmlcfjw6CrwoM6.svg)](https://asciinema.org/a/gkCmlcfjw6CrwoM6)

## Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0

## Installation

```bash
bun install -g opencode-session
```

Or run directly:

```bash
bunx opencode-session
```

## Usage

```bash
opencode-session [options]
```

### Options

| Flag            | Description         |
| --------------- | ------------------- |
| `-h, --help`    | Show help message   |
| `-v, --version` | Show version number |

## Keyboard Shortcuts

### Navigation

| Key       | Action                    |
| --------- | ------------------------- |
| `j` / `↓` | Move down                 |
| `k` / `↑` | Move up                   |
| `Space`   | Toggle selection          |
| `a`       | Select all / Deselect all |
| `Enter`   | Confirm action            |

### Actions

| Key | Action                            |
| --- | --------------------------------- |
| `d` | Delete selected item(s)           |
| `D` | Delete ALL (in orphans/logs view) |
| `o` | View orphan sessions              |
| `p` | View projects                     |
| `l` | View log files                    |
| `r` | Reload data                       |

### General

| Key         | Action         |
| ----------- | -------------- |
| `Esc` / `q` | Go back / Quit |
| `?`         | Show help      |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)
