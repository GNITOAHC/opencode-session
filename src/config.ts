import { homedir } from "os"
import { join } from "path"

const HOME = homedir()

// OpenCode data directories
export const OPENCODE_STATE_DIR = join(HOME, ".local", "state", "opencode")
export const OPENCODE_SHARE_DIR = join(HOME, ".local", "share", "opencode")

// State files
export const FRECENCY_FILE = join(OPENCODE_STATE_DIR, "frecency.jsonl")
export const PROMPT_HISTORY_FILE = join(OPENCODE_STATE_DIR, "prompt-history.jsonl")
export const KV_FILE = join(OPENCODE_STATE_DIR, "kv.json")
export const MODEL_FILE = join(OPENCODE_STATE_DIR, "model.json")

// Share directories
export const STORAGE_DIR = join(OPENCODE_SHARE_DIR, "storage")
export const SESSION_DIR = join(STORAGE_DIR, "session")
export const MESSAGE_DIR = join(STORAGE_DIR, "message")
export const PART_DIR = join(STORAGE_DIR, "part")
export const PROJECT_DIR = join(STORAGE_DIR, "project")
export const SESSION_DIFF_DIR = join(STORAGE_DIR, "session_diff")
export const TODO_DIR = join(STORAGE_DIR, "todo")
export const SNAPSHOT_DIR = join(OPENCODE_SHARE_DIR, "snapshot")
export const LOG_DIR = join(OPENCODE_SHARE_DIR, "log")

// App info
export const APP_NAME = "opencode-session"
export const APP_VERSION = "0.1.0"
