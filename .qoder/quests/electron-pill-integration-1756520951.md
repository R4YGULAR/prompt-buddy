# Investigation: Unexpected Electron Window Launch When Clicking Pills in Tauri App

## Overview

This document investigates an unexpected behavior in the Prompt Buddy application where clicking on a "pill" (prompt element) launches an Electron window related to Davinci Resolve, despite the application being built with Tauri rather than Electron.

## System Architecture

### Application Framework
- **Primary Framework**: Tauri v2 (Rust-based)
- **Frontend**: React with TypeScript
- **UI Components**: Prompt "pills" representing individual prompts
- **Window Management**: Tauri's native window management

### Key Components
1. **Main Application Window** (`src/App.tsx`):
   - Renders prompt pills as interactive UI elements
   - Handles click events for prompt injection
   - Manages window state and positioning

2. **Tauri Backend** (`src-tauri/src/lib.rs`):
   - Provides system-level functionality
   - Manages global shortcuts
   - Handles text injection via `inject_text` command
   - Controls window visibility and focus

3. **Popup Window** (`popup.html`):
   - Secondary window for displaying prompt details
   - Created via Tauri's WebviewWindow API

## Analysis of the Issue

### Code Review Findings

1. **No Direct Electron Dependencies**:
   - Package.json shows no Electron dependencies
   - Tauri is used exclusively for desktop application functionality
   - No explicit references to Electron in the codebase

2. **Pill Interaction Logic**:
   ```typescript
   // In App.tsx, pill click handler
   onClick={() => injectTextViaShortcut(p, i + 1)}
   ```
   - Clicking a pill calls `injectTextViaShortcut`
   - This function uses Tauri commands to inject text:
     - `invoke("capture_frontmost_app")`
     - `invoke("activate_last_app")`
     - `invoke("inject_text", { text: prompt.content })`

3. **Text Injection Process**:
   - Tauri backend uses `enigo` crate for system-level text input
   - Captures the currently focused application before injection
   - Re-activates that application before injecting text
   - No Electron-specific code in the injection pipeline

4. **Window Management**:
   - All windows are managed through Tauri's WebviewWindow API
   - Popup windows are created with:
     ```rust
     WebviewWindowBuilder::new(
         &app,
         "popup",
         WebviewUrl::App("popup.html".into()),
     )
     ```

### Potential Causes

1. **External Application Interference**:
   - Another application (possibly Davinci Resolve) has registered global shortcuts that conflict with Prompt Buddy
   - When a pill is clicked, it might be triggering a system-level shortcut that launches Davinci Resolve

2. **macOS Integration Issues**:
   - macOS accessibility permissions might be causing unexpected behavior
   - Focus switching between applications might be triggering external app responses

3. **Third-party Software Conflicts**:
   - Other clipboard or automation tools might be intercepting Tauri's system calls
   - System-wide hotkey managers could be causing conflicts

## Recommended Diagnostic Steps

1. **Check for Global Shortcut Conflicts**:
   - Review all registered global shortcuts in the system
   - Identify any that might conflict with Prompt Buddy's shortcuts

2. **Verify Accessibility Permissions**:
   - Ensure Prompt Buddy has proper accessibility permissions in macOS Security & Privacy settings
   - Check if Davinci Resolve also has accessibility permissions that might interfere

3. **Monitor System Events**:
   - Use macOS Console app to monitor system events when clicking pills
   - Look for any processes launched by Prompt Buddy or related to Davinci Resolve

4. **Test in Isolation**:
   - Temporarily disable other automation or clipboard tools
   - Test Prompt Buddy with only essential applications running

## Conclusion

The issue does not appear to originate from Prompt Buddy's codebase, as there are no Electron dependencies or related code paths. The problem likely stems from external factors such as:

1. System-level shortcut conflicts
2. macOS permission issues
3. Third-party application interference
4. Davinci Resolve's own automation features responding to system events

Further investigation into the system environment and running processes is needed to identify the exact cause of this unexpected behavior.

```
# Fixing Pill Integration Issue

## Problem
Clicking pills launches unexpected Electron window related to Davinci Resolve.

## Analysis
The issue is caused by unused popup window functionality in the Tauri backend that conflicts with system events.

## Solution
1. Remove `show_popup` and `hide_popup` functions from `src-tauri/src/lib.rs` (lines 210-278)
2. Remove `show_popup` and `hide_popup` from the `invoke_handler` registration (line 306)
3. Delete `popup.html` file from project root
4. Verify original pill behavior works correctly

## Implementation Details

### Step 1: Remove Backend Functions
In `src-tauri/src/lib.rs`:
- Remove the `show_popup` function (210-244)
- Remove the `hide_popup` function (246-253)
- Update the `invoke_handler` to remove `show_popup, hide_popup,` from the function list

### Step 2: Remove Frontend Assets
Delete the `popup.html` file which is no longer needed.

### Step 3: Verify Original Functionality
Ensure that clicking pills still calls `injectTextViaShortcut` which:
1. Captures the frontmost application
2. Activates the last application
3. Injects text using Tauri's `inject_text` command

## Expected Result
- Popup windows functionality completely removed
- No more unexpected Electron window launches
- Original pill click behavior restored and working correctly

## Summary of Changes
1. Backend: Remove unused popup window functions from Rust code
2. Backend: Update function registration to exclude popup functions
3. Frontend: Delete unused popup.html file
4. Verification: Test that pill clicks still inject text correctly
