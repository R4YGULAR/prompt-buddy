# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prompt Buddy is a cross-platform desktop app built with Tauri v2, React, and TypeScript. It provides a floating prompt picker for Cursor AI, allowing users to quickly access and inject pre-defined prompts via keyboard shortcuts or UI interactions.

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build production release
npm run tauri build

# Lint and type check (inferred from package.json)
npm run build  # Runs: tsc && vite build
```

## Architecture

### Frontend (React/TypeScript)
- **App.tsx**: Main prompt bar UI with prompt pills, keyboard shortcuts, and window management
- **PromptEditor.tsx**: Modal component for adding/editing prompts
- **SettingsPage.tsx**: Simple settings overlay showing keyboard shortcuts
- **Storage**: Uses Tauri's plugin-store to persist prompts in `prompts.json`

### Backend (Rust/Tauri)
- **lib.rs**: Core Tauri application with system integration
- **Text injection**: Uses `enigo` crate for cross-platform text input simulation
- **Global shortcuts**: Alt+Space (toggle), Cmd+Alt+1-9 (inject prompts)
- **Window management**: Always-on-top floating window with state preservation
- **Platform support**: macOS (primary), Windows (recent addition), Linux (planned)

### Key Features
- **Global shortcuts**: Alt+Space toggles visibility, Cmd/Ctrl+Alt+1-9 inject prompts
- **Cross-platform text injection**: Handles focus switching and accessibility permissions
- **Persistent storage**: Prompts auto-save to Tauri store
- **Window state management**: Preserves position/size during focus switching
- **Multi-window**: Separate windows for editing and settings

### Data Flow
1. Prompts stored in Tauri store (`prompts.json`)
2. Events bridge Rust backend and React frontend (`prompts-updated`, `inject-prompt`)
3. Text injection captures current app, switches focus, types text, restores focus
4. Window state actively managed to prevent system interference

### Platform-Specific Notes
- **macOS**: Requires accessibility permissions for text injection
- **Windows**: Recently added with native window management
- **Development**: Uses Vite dev server on port 1420 with HMR on 1421

### Important Patterns
- Use Tauri commands for system integration (`inject_text`, `toggle_window_visibility`)
- Event-driven communication between windows
- Defensive window state management to prevent macOS window system issues
- Consistent prompt ordering with numeric IDs for defaults, timestamps for custom prompts