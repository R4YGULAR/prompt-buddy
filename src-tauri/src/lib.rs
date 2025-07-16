use tauri::{AppHandle, Listener, Manager, Emitter};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use enigo::{Enigo, Keyboard, Settings};
use tauri::{WebviewWindowBuilder, WebviewUrl, LogicalPosition};
use tauri_plugin_dialog;

#[cfg(target_os = "macos")]
use std::process::Command;

#[cfg(windows)]
use windows::{
    Win32::Foundation::HWND,
    Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, SetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
        IsWindowVisible, ShowWindow, SW_RESTORE,
    },
    Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION},
    Win32::System::ProcessStatus::GetProcessImageFileNameW,
};

// Store the name of the application that was active **before** the prompt bar
// was shown. This lets us switch focus back to that application after the user
// clicks a prompt pill so the text is inserted into the correct window.
static LAST_APP_NAME: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

// Store the HWND on Windows for precise window management (as integer for thread safety)
#[cfg(windows)]
static LAST_WINDOW_HWND: Lazy<Mutex<Option<isize>>> = Lazy::new(|| Mutex::new(None));

#[cfg(target_os = "macos")]
fn get_frontmost_app() -> Option<String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get name of application process 1 whose frontmost is true")
        .output()
        .ok()?;
    if output.status.success() {
        let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !name.is_empty() {
            return Some(name);
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn activate_app(app_name: &str) -> bool {
    Command::new("osascript")
        .arg("-e")
        .arg(format!("tell application \"{}\" to activate", app_name))
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn get_frontmost_app() -> Option<String> {
    unsafe {
        let foreground_window = GetForegroundWindow();
        if foreground_window.0.is_null() {
            return None;
        }

        // Store the HWND for later reactivation (convert to integer for thread safety)
        *LAST_WINDOW_HWND.lock().unwrap() = Some(foreground_window.0 as isize);

        // Get the process ID
        let mut process_id = 0u32;
        GetWindowThreadProcessId(foreground_window, Some(&mut process_id));
        
        // Open the process to get its name
        let process_handle = OpenProcess(PROCESS_QUERY_INFORMATION, false, process_id).ok()?;
        
        // Get the process executable name
        let mut buffer = [0u16; 1024];
        
        if GetProcessImageFileNameW(process_handle, &mut buffer) > 0 {
            let process_path = String::from_utf16_lossy(&buffer);
            // Extract just the filename from the full path
            if let Some(filename) = process_path.split('\\').last() {
                let name = filename.trim_end_matches('\0').to_string();
                if !name.is_empty() {
                    println!("🪟 Windows: Captured foreground app: {}", name);
                    return Some(name);
                }
            }
        }
        
        // Fallback: try to get window title
        let mut title_buffer = [0u16; 256];
        let title_len = GetWindowTextW(foreground_window, &mut title_buffer);
        if title_len > 0 {
            let title = String::from_utf16_lossy(&title_buffer[..title_len as usize]);
            println!("🪟 Windows: Got window title: {}", title);
            return Some(title);
        }
        
        None
    }
}

#[cfg(windows)]
fn activate_app(_app_name: &str) -> bool {
    unsafe {
        if let Some(hwnd_val) = *LAST_WINDOW_HWND.lock().unwrap() {
            let window = HWND(hwnd_val as *mut _);
            println!("🪟 Windows: Attempting to reactivate window with HWND: {:?}", window.0);
            
            // First check if the window is still valid and visible
            if IsWindowVisible(window).as_bool() {
                // Restore the window if it's minimized
                let _ = ShowWindow(window, SW_RESTORE);
                
                // Set it as the foreground window
                let result = SetForegroundWindow(window).as_bool();
                println!("🪟 Windows: SetForegroundWindow result: {}", result);
                return result;
            } else {
                println!("🪟 Windows: Stored window is no longer visible");
            }
        }
        false
    }
}

// Stub helpers for other platforms
#[cfg(not(any(target_os = "macos", windows)))]
fn get_frontmost_app() -> Option<String> { None }

#[cfg(not(any(target_os = "macos", windows)))]
fn activate_app(_app_name: &str) -> bool { false }

#[derive(Clone, serde::Serialize)]
struct PromptPayload {
  prompt: String,
  index: usize,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn check_accessibility_permissions() -> Result<bool, String> {
    println!("🔍 Checking accessibility permissions...");
    
    #[cfg(target_os = "macos")]
    {
        // On macOS, try to create an Enigo instance to check permissions
        match Enigo::new(&Settings::default()) {
            Ok(_) => {
                println!("✅ Accessibility permissions appear to be granted");
                Ok(true)
            }
            Err(e) => {
                println!("❌ Accessibility permissions issue: {}", e);
                Ok(false)
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        println!("ℹ️  Not on macOS, skipping accessibility check");
        Ok(true)
    }
}

#[tauri::command]
async fn toggle_window_visibility(app: tauri::AppHandle) -> Result<String, String> {
    println!("🔄 Manual window toggle requested");
    
    if let Some(window) = app.get_webview_window("main") {
        println!("✅ Found main window");
        match window.is_visible() {
            Ok(is_visible) => {
                println!("👁️  Current window visibility: {}", is_visible);
                if is_visible {
                    println!("🫥 Hiding prompt picker window");
                    window.hide().map_err(|e| format!("Failed to hide window: {}", e))?;
                    Ok("Window hidden".to_string())
                } else {
                    println!("👁️  Showing prompt picker window");
                    window.show().map_err(|e| format!("Failed to show window: {}", e))?;
                    let _ = window.set_focus();
                    Ok("Window shown".to_string())
                }
            }
            Err(e) => {
                println!("❌ Failed to get window visibility: {}", e);
                // If we can't get visibility, just try to show it
                println!("🔄 Attempting to show window anyway...");
                window.show().map_err(|e| format!("Failed to show window: {}", e))?;
                Ok("Window shown (fallback)".to_string())
            }
        }
    } else {
        println!("❌ Could not find main window");
        Err("Could not find main window".to_string())
    }
}

#[tauri::command]
async fn inject_text(text: String) -> Result<String, String> {
    println!("🚀 Starting text injection...");
    println!("📝 Text to inject: '{}'", text);
    println!("📏 Text length: {} characters", text.len());

    // Attempt to reactivate the previously focused application (macOS only).
    #[cfg(target_os = "macos")]
    {
        if let Some(app_name) = LAST_APP_NAME.lock().unwrap().clone() {
            println!("🔄 Reactivating previously active app: {}", app_name);
            if !activate_app(&app_name) {
                println!("⚠️  Failed to reactivate {}", app_name);
            }
        } else {
            println!("ℹ️  No previously active app recorded – skipping re-activation");
        }
    }
    
    if text.is_empty() {
        let error_msg = "❌ Cannot inject empty text";
        println!("{}", error_msg);
        return Err(error_msg.to_string());
    }
    
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| {
        let error_msg = format!("❌ Failed to initialize input system: {}", e);
        println!("{}", error_msg);
        error_msg
    })?;
    
    println!("⏱️  Waiting 300ms after activating previous window...");
    std::thread::sleep(std::time::Duration::from_millis(300));
    
    println!("⌨️  Attempting to type text...");
    
    // Try to type the text
    match enigo.text(&text) {
        Ok(_) => {
            println!("✅ Text injection completed successfully");
            Ok("Text injected successfully".to_string())
        },
        Err(e) => {
            let error_msg = format!("❌ Text injection failed: {}. This usually means no text field is currently focused or the app needs accessibility permissions.", e);
            println!("{}", error_msg);
            Err("No active text field found or missing accessibility permissions. Please:\n1. Click on a text field to focus it\n2. Check System Preferences > Security & Privacy > Privacy > Accessibility".to_string())
        }
    }
}

#[tauri::command]
async fn show_popup(app: AppHandle, x: f64, y: f64, prompt: String, index: usize) {
    println!("🎯 Showing popup for index {}", index);

    let payload = PromptPayload { prompt, index };

    if let Some(window) = app.get_webview_window("popup") {
        println!("Existing popup window found, showing and setting focus.");
        let _ = window.set_position(tauri::Position::Logical(LogicalPosition { x, y }));
        let _ = window.show();
        let _ = window.set_focus();
        if let Err(e) = window.emit("show_prompt", payload) {
            println!("Error emitting show_prompt event: {}", e);
        }
    } else {
        println!("No existing popup window, creating a new one.");
        match WebviewWindowBuilder::new(
            &app,
            "popup",
            WebviewUrl::App("popup.html".into()),
        )
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .visible(false)
        .position(x, y)
        .inner_size(300.0, 150.0)
        .build() {
            Ok(window) => {
                println!("New popup window created successfully, showing and setting focus.");
                // We must listen for the webview to be created before we can emit to it
                // Clone the window handle so we can move it into the closure without
                // moving the original `window` out of scope.
                let window_clone = window.clone();
                let _ = window.once("tauri://created", move |_| {
                    if let Err(e) = window_clone.emit("show_prompt", payload) {
                        println!("Error emitting show_prompt event to new window: {}", e);
                    }
                });
                let _ = window.show();
                let _ = window.set_focus();
            },
            Err(e) => {
                println!("Error creating popup window: {}", e);
            }
        }
    }
}

#[tauri::command]
async fn hide_popup(app: AppHandle) {
    println!("🎯 Hiding popup");
    if let Some(window) = app.get_webview_window("popup") {
        let _ = window.hide();
    }
}

#[tauri::command]
async fn capture_frontmost_app() -> Result<(), String> {
    remember_current_app();
    Ok(())
}

// Command that re-activates the application we previously captured with
// `remember_current_app()`.  The frontend can call this right after a pill
// click so focus is switched back before we start typing.
#[tauri::command]
async fn activate_last_app() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(app_name) = LAST_APP_NAME.lock().unwrap().clone() {
            println!("🔄 Tauri cmd: activating last app = {}", app_name);
            if activate_app(&app_name) {
                return Ok(());
            } else {
                return Err(format!("Failed to activate {}", app_name));
            }
        }
        println!("ℹ️  No last app recorded - nothing to activate");
        Ok(())
    }

    #[cfg(windows)]
    {
        if let Some(app_name) = LAST_APP_NAME.lock().unwrap().clone() {
            println!("🔄 Windows: Tauri cmd: activating last app = {}", app_name);
            if activate_app(&app_name) {
                return Ok(());
            } else {
                return Err(format!("Failed to activate {}", app_name));
            }
        }
        println!("ℹ️  Windows: No last app recorded - nothing to activate");
        Ok(())
    }

    #[cfg(not(any(target_os = "macos", windows)))]
    {
        println!("🔄 activate_last_app called on unsupported platform – noop");
        Ok(())
    }
}

#[tauri::command]
async fn preserve_window_state(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        println!("🔒 Preserving window state before focus switch");
        
        // Store current position and size before switching focus
        if let Ok(position) = window.outer_position() {
            println!("📍 Current position: {:?}", position);
        }
        if let Ok(size) = window.outer_size() {
            println!("📏 Current size: {:?}", size);
        }
        
        // Ensure the window is in a known good state before focus switch
        let _ = window.set_resizable(false);
        let _ = window.set_minimizable(false);
        let _ = window.set_maximizable(false);
        let _ = window.unmaximize(); // Ensure it's not maximized before we switch
        
        println!("🔒 Window prepared for focus switch");
    }
    Ok(())
}

#[tauri::command]
async fn restore_window_state(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        println!("🔓 Restoring window state after text injection");
        
        // Force window to proper state immediately - never maximized
        let _ = window.unmaximize();
        let _ = window.unminimize();
        
        // Ensure window is still properly configured
        let _ = window.set_always_on_top(true);
        let _ = window.set_skip_taskbar(true);
        let _ = window.set_resizable(false);
        let _ = window.set_minimizable(false);
        let _ = window.set_maximizable(false);
        
        // Force the exact size from config
        let _ = window.set_size(tauri::PhysicalSize::new(800, 80));
        
        // Re-apply window constraints 
        let _ = window.set_min_size(Some(tauri::PhysicalSize::new(800, 80)));
        let _ = window.set_max_size(Some(tauri::PhysicalSize::new(800, 80)));
        
        // Ensure visibility and focus
        if let Ok(is_visible) = window.is_visible() {
            if is_visible {
                let _ = window.set_focus();
            }
        }
        
        println!("✅ Window state restoration complete");
    }
    Ok(())
}

#[tauri::command]
async fn lock_window_state(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        println!("🔐 Aggressively locking window state");
        
        // Force unmaximize multiple times
        let _ = window.unmaximize();
        let _ = window.unminimize();
        
        // Lock all the settings
        let _ = window.set_resizable(false);
        let _ = window.set_minimizable(false);
        let _ = window.set_maximizable(false);
        
        // Force exact size
        let _ = window.set_size(tauri::PhysicalSize::new(800, 80));
        let _ = window.set_min_size(Some(tauri::PhysicalSize::new(800, 80)));
        let _ = window.set_max_size(Some(tauri::PhysicalSize::new(800, 80)));
        
        println!("🔐 Window state locked");
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, inject_text, check_accessibility_permissions, toggle_window_visibility, show_popup, hide_popup, capture_frontmost_app, activate_last_app, preserve_window_state, restore_window_state, lock_window_state])
        .setup(|app| {
            println!("🔧 Setting up global shortcuts with handlers...");
            
            // Register main shortcut with handler in one step
            println!("🎯 Registering main toggle shortcut...");
            let main_shortcut: Shortcut = "alt+space".parse().map_err(|e| format!("Failed to parse main shortcut: {}", e))?;
            match app.handle().global_shortcut().on_shortcut(main_shortcut, move |_app, _shortcut, _state| {
                // Only act on key *press* events so the shortcut truly toggles.
                if _state.state() == ShortcutState::Pressed {
                    println!("🎯 Global shortcut (Alt+Space) pressed!");

                    if let Some(window) = _app.get_webview_window("main") {
                        println!("✅ Found main window");
                        match window.is_visible() {
                            Ok(is_visible) => {
                                println!("👁️  Current window visibility: {}", is_visible);
                                if is_visible {
                                    println!("🫥 Hiding prompt picker bar");
                                    if let Err(e) = window.hide() {
                                        println!("❌ Failed to hide window: {}", e);
                                    }
                                } else {
                                    // Before showing the window we record the app
                                    // that is currently frontmost so we can switch
                                    // back to it later when the user selects a prompt.
                                    remember_current_app();

                                    println!("👁️  Showing prompt picker bar");
                                    if let Err(e) = window.show() {
                                        println!("❌ Failed to show window: {}", e);
                                    } else {
                                        println!("✅ Window shown successfully");
                                        let _ = window.set_focus();
                                    }
                                }
                            }
                            Err(e) => {
                                println!("❌ Failed to get window visibility: {}", e);
                                // Capture frontmost app before stealing focus
                                remember_current_app();

                                println!("🔄 Attempting to show window anyway...");
                                if let Err(e) = window.show() {
                                    println!("❌ Failed to show window: {}", e);
                                } else {
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    } else {
                        println!("❌ Could not find main window");
                    }
                }
            }) {
                Ok(_) => {
                    println!("✅ Main shortcut (Alt+Space) registered successfully!");
                }
                Err(e) => {
                    println!("❌ Failed to register main shortcut: {}", e);
                    println!("⚠️  You can still use the app manually, but Alt+Space won't work");
                }
            }
            
            // Register prompt injection shortcuts with handlers
            println!("🎯 Registering prompt injection shortcuts...");
            let mut successful_shortcuts = 0;
            for i in 1..=9 {
                let shortcut_str = format!("cmd+alt+{}", i);
                let prompt_index = i - 1; // Convert to 0-based index
                
                match shortcut_str.parse::<Shortcut>() {
                    Ok(shortcut) => {
                        match app.handle().global_shortcut().on_shortcut(shortcut, move |app, _shortcut, _state| {
                            if _state.state() == ShortcutState::Pressed {
                                println!("🚀 Prompt shortcut triggered: Cmd+Alt+{}", i);
                                // Emit event to frontend to trigger injection
                                if let Some(window) = app.get_webview_window("main") {
                                    if let Err(e) = window.emit("inject-prompt", prompt_index) {
                                        println!("❌ Failed to emit inject-prompt event: {}", e);
                                    } else {
                                        println!("✅ Emitted inject-prompt event for index: {}", prompt_index);
                                    }
                                }
                            }
                        }) {
                            Ok(_) => {
                                println!("✅ Registered: {}", shortcut_str);
                                successful_shortcuts += 1;
                            }
                            Err(e) => {
                                println!("❌ Failed to register {}: {} (probably conflicts with another app)", shortcut_str, e);
                            }
                        }
                    }
                    Err(e) => {
                        println!("❌ Failed to parse shortcut {}: {}", shortcut_str, e);
                    }
                }
            }
            
            if successful_shortcuts == 0 {
                println!("⚠️  No prompt shortcuts could be registered - they may conflict with existing shortcuts");
                println!("💡 You can still use the app's interface to select and inject prompts");
            } else {
                println!("🎯 Successfully registered {} out of 9 prompt shortcuts", successful_shortcuts);
            }
            
            println!("🎯 Prompt Picker initialized successfully!");
            println!("📋 Use Alt+Space to show/hide the prompt picker bar");
            println!("🎯 Use Cmd+Alt+1-9 to inject prompts");
            println!("⚠️  Note: On macOS, you may need to grant accessibility permissions");
            
            // Show window on first launch for better user experience
            if let Some(window) = app.get_webview_window("main") {
                // Record the currently frontmost application BEFORE we bring
                // the prompt bar to the foreground. This way we can return
                // focus to it when the user clicks a prompt.
                remember_current_app();

                // Lock window state immediately upon creation
                println!("🔐 Locking window state on startup");
                let _ = window.unmaximize();
                let _ = window.unminimize();
                let _ = window.set_resizable(false);
                let _ = window.set_minimizable(false);
                let _ = window.set_maximizable(false);
                let _ = window.set_size(tauri::PhysicalSize::new(800, 80));
                let _ = window.set_min_size(Some(tauri::PhysicalSize::new(800, 80)));
                let _ = window.set_max_size(Some(tauri::PhysicalSize::new(800, 80)));

                println!("👁️  Showing bar on first launch");
                let _ = window.show();
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Helper that records the currently frontmost application so we can restore
// focus later. Works on both macOS and Windows.
fn remember_current_app() {
    #[cfg(target_os = "macos")]
    {
        if let Some(name) = get_frontmost_app() {
            println!("💾 Remembering current frontmost app: {}", name);
            *LAST_APP_NAME.lock().unwrap() = Some(name);
        }
    }
    
    #[cfg(windows)]
    {
        if let Some(name) = get_frontmost_app() {
            println!("💾 Windows: Remembering current frontmost app: {}", name);
            *LAST_APP_NAME.lock().unwrap() = Some(name);
        }
    }
}
