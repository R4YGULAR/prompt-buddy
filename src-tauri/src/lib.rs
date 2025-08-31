use tauri::{AppHandle, Listener, Manager, Emitter};
use std::process::Command;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use enigo::{Enigo, Keyboard, Settings};
use tauri::{WebviewWindowBuilder, WebviewUrl, LogicalPosition};
use tauri_plugin_dialog;
use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

#[derive(Serialize, Deserialize, Debug)]
struct AppSettings {
    toggle_shortcut: String,
    target_mode: String, // "auto" or "manual"
    target_app_name: String, // specific app name when in manual mode
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            toggle_shortcut: "alt+shift+space".to_string(),
            target_mode: "auto".to_string(),
            target_app_name: "".to_string(),
        }
    }
}

// Store the name of the application that was active **before** the prompt bar
// was shown. This lets us switch focus back to that application after the user
// clicks a prompt pill so the text is inserted into the correct window.
static LAST_APP_NAME: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

// Store the name of the application that was active before the last one
// This helps in case the last app is Prompt Buddy itself or DaVinci Resolve Electron window
static PREVIOUS_APP_NAME: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

// The name of our own application (used to detect if we're trying to inject into ourselves)
static APP_NAME: &str = "Prompt Buddy";

// Known problematic app names that might cause issues - these should be exact app names
static PROBLEMATIC_APPS: [&str; 1] = ["Electron"];

// Helper function to resolve Electron apps to their actual names
#[cfg(target_os = "macos")]
fn get_electron_app_name() -> Option<String> {
    // Get the process ID of the frontmost Electron app
    let pid_output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get unix id of first application process whose name is \"Electron\"")
        .output()
        .ok()?;
    
    if !pid_output.status.success() {
        return None;
    }
    
    let pid = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
    if pid.is_empty() {
        return None;
    }
    
    println!("🔍 Electron process PID: {}", pid);
    
    // Get the bundle path for that PID
    let bundle_output = Command::new("osascript")
        .arg("-e")
        .arg(format!("tell application \"System Events\" to get application file of application process id {}", pid))
        .output()
        .ok()?;
    
    if !bundle_output.status.success() {
        return None;
    }
    
    let bundle_path = String::from_utf8_lossy(&bundle_output.stdout).trim().to_string();
    println!("🔍 Bundle path: {}", bundle_path);
    
    // Special handling for known apps
    if bundle_path.contains("DaVinci Resolve") {
        println!("🔍 Detected DaVinci Resolve from bundle path");
        return Some("DaVinci Resolve".to_string());
    }
    
    if bundle_path.contains("Qoder") || bundle_path.contains("qoder") {
        println!("🔍 Detected Qoder from bundle path");
        return Some("Qoder".to_string());
    }
    
    // Extract the application name from the bundle path
    if !bundle_path.is_empty() {
        let parts: Vec<&str> = bundle_path.split("/").collect();
        if let Some(app_file) = parts.last() {
            let app_name = app_file.replace(".app", "");
            println!("🔍 Resolved Electron to app: {}", app_name);
            return Some(app_name);
        }
    }
    
    None
}

#[cfg(not(target_os = "macos"))]
fn get_electron_app_name() -> Option<String> {
    None
}


fn is_valid_app_name(name: &str) -> bool {
    // Check for empty or very short names
    if name.len() < 2 {
        return false;
    }
    
    // Check for our own app name (including variations)
    if name.contains(APP_NAME) || name == "prompt-buddy" || name.contains("Prompt") {
        return false;
    }
    
    // Additional validation rules can be added here
    true
}

// A utility function to check if an app name is problematic
fn is_problematic_app(app_name: &str) -> bool {
    println!("🔍 Checking if app is problematic: {}", app_name);
    
    // Check for our own app (including variations)
    if app_name.contains(APP_NAME) || app_name == "prompt-buddy" || app_name.contains("Prompt") {
        println!("⚠️ App is our own app");
        return true;
    }
    
    // Check for known problematic apps by exact match to avoid false positives
    for name in PROBLEMATIC_APPS.iter() {
        if app_name == *name {  // Exact match only
            println!("⚠️ App exactly matches known problematic app: {}", name);
            return true;
        }
    }
    
    // Filter out macOS system daemons and background processes
    let system_processes = [
        "universalaccessd", "Dock", "Finder", "SystemUIServer", "ControlCenter",
        "WindowServer", "loginwindow", "kernel_task", "launchd", "syslogd",
        "UserEventAgent", "cfprefsd", "distnoted", "NotificationCenter",
        "Spotlight", "mds", "mdworker", "CoreServicesUIAgent", "AirPlayUIAgent"
    ];
    
    for sys_proc in system_processes.iter() {
        if app_name == *sys_proc {
            println!("⚠️ App is a system process: {}", app_name);
            return true;
        }
    }
    
    // Filter out apps ending with 'd' (likely daemons) or containing 'Agent'
    if (app_name.ends_with("d") && app_name.len() > 3) || app_name.contains("Agent") {
        println!("⚠️ App appears to be a daemon or agent: {}", app_name);
        return true;
    }
    
    // Not problematic
    false
}

fn load_settings(app: &AppHandle) -> AppSettings {
    match app.store("settings.json") {
        Ok(store) => {
            if let Some(settings) = store.get("settings") {
                match serde_json::from_value::<AppSettings>(settings) {
                    Ok(settings) => {
                        println!("✅ Loaded settings: {:?}", settings);
                        return settings;
                    },
                    Err(e) => {
                        println!("⚠️  Failed to parse settings: {}", e);
                    }
                }
            }
        },
        Err(e) => {
            println!("⚠️  Failed to load settings store: {}", e);
        }
    }
    
    let default_settings = AppSettings::default();
    println!("🔧 Using default settings: {:?}", default_settings);
    default_settings
}

#[cfg(target_os = "macos")]
fn get_frontmost_app() -> Option<String> {
    // First get the process name to see if we need special handling
    let name_output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get name of application process 1 whose frontmost is true")
        .output()
        .ok()?;
    
    if !name_output.status.success() {
        return None;
    }
    
    let process_name = String::from_utf8_lossy(&name_output.stdout).trim().to_string();
    println!("🔍 Frontmost process name: {}", process_name);
    
    // If it's Electron, we need to resolve to the actual parent application
    if process_name == "Electron" {
        println!("🔍 Detected Electron process, attempting to resolve parent app...");
        
        // Get the process ID of the frontmost app
        let pid_output = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get unix id of application process 1 whose frontmost is true")
            .output()
            .ok()?;
        
        if pid_output.status.success() {
            let pid = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
            if !pid.is_empty() {
                println!("🔍 Electron process PID: {}", pid);
                
                // Get the bundle path for that PID
                let bundle_output = Command::new("osascript")
                    .arg("-e")
                    .arg(format!("tell application \"System Events\" to get application file of application process id {}", pid))
                    .output()
                    .ok()?;
                
                if bundle_output.status.success() {
                    let bundle_path = String::from_utf8_lossy(&bundle_output.stdout).trim().to_string();
                    println!("🔍 Bundle path: {}", bundle_path);
                    
                    // Special handling for known Electron apps
                    if bundle_path.contains("DaVinci Resolve") {
                        println!("🔍 Detected DaVinci Resolve from bundle path");
                        return Some("DaVinci Resolve".to_string());
                    }
                    
                    // Special handling for Qoder IDE
                    if bundle_path.contains("Qoder") || bundle_path.contains("qoder") {
                        println!("🔍 Detected Qoder IDE from bundle path");
                        return Some("Qoder".to_string());
                    }
                    
                    // Extract the application name from the bundle path
                    if !bundle_path.is_empty() {
                        let parts: Vec<&str> = bundle_path.split("/").collect();
                        if let Some(app_file) = parts.last() {
                            let app_name = app_file.replace(".app", "");
                            println!("🔍 Resolved Electron to app: {}", app_name);
                            return Some(app_name);
                        }
                    }
                }
            }
        }
        
        // If we can't resolve the Electron app, return None to avoid activating random Electron processes
        println!("⚠️ Could not resolve Electron process to parent app, returning None");
        return None;
    }
    
    // For non-Electron apps, validate the name and return it
    if !process_name.is_empty() && is_valid_app_name(&process_name) {
        println!("🔍 Using process name: {}", process_name);
        return Some(process_name);
    }
    
    println!("⚠️ Process name is empty or invalid");
    None
}

#[cfg(target_os = "macos")]
fn activate_app(app_name: &str) -> bool {
    // Check if this is a problematic app before activating
    if is_problematic_app(app_name) {
        println!("⚠️ Refusing to activate potentially problematic app: {}", app_name);
        return false;
    }
    
    // This is the safer approach - activate by name only, not by path
    let cmd = format!("tell application \"{}\" to activate", app_name);
    println!("🚀 Activating app with command: {}", cmd);
    
    Command::new("osascript")
        .arg("-e")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

// Stub helpers for non-macOS platforms so compilation still succeeds.
#[cfg(not(target_os = "macos"))]
fn get_frontmost_app() -> Option<String> { None }

#[cfg(not(target_os = "macos"))]
fn activate_app(_app_name: &str) -> bool { false }

#[derive(Clone, serde::Serialize)]
struct PromptPayload {
  prompt: String,
  index: usize,
}

#[tauri::command]
async fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    Ok(load_settings(&app))
}

#[tauri::command]
async fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    println!("💾 Saving settings: {:?}", settings);
    
    match app.store("settings.json") {
        Ok(store) => {
            match serde_json::to_value(&settings) {
                Ok(settings_value) => {
                    store.set("settings", settings_value);
                    
                    if let Err(e) = store.save() {
                        let error_msg = format!("Failed to save settings: {}", e);
                        println!("❌ {}", error_msg);
                        return Err(error_msg);
                    }
                    
                    println!("✅ Settings saved successfully");
                    Ok(())
                },
                Err(e) => {
                    let error_msg = format!("Failed to serialize settings: {}", e);
                    println!("❌ {}", error_msg);
                    Err(error_msg)
                }
            }
        },
        Err(e) => {
            let error_msg = format!("Failed to load settings store: {}", e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}


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
async fn inject_text_at_cursor(_app: tauri::AppHandle, text: String) -> Result<String, String> {
    println!("🚀 Starting click-to-inject mode...");
    println!("📝 Text to inject: '{}'", text);
    println!("📏 Text length: {} characters", text.len());

    if text.is_empty() {
        let error_msg = "❌ Cannot inject empty text";
        println!("{}", error_msg);
        return Err(error_msg.to_string());
    }

    // Don't hide the window - let it stay visible for better UX
    println!("📝 Keeping window visible during injection process...");

    #[cfg(target_os = "macos")]
    {
        println!("🖱️  Waiting for user to click where they want text injected...");
        
        // Show notification and wait for actual mouse click
        let script = r#"
            tell application "System Events"
                display notification "Click anywhere to inject text" with title "Prompt Buddy"
                
                -- Very simple approach: wait for any global event
                set eventDetected to false
                set counter to 0
                
                repeat until eventDetected or counter > 300  -- 30 second timeout (0.1s intervals)
                    delay 0.1
                    set counter to counter + 1
                    
                    -- Try to detect any system activity that suggests user interaction
                    try
                        -- Check if anything changed in the system that suggests a click
                        set currentApp to (name of first application process whose frontmost is true)
                        if currentApp is not "" then
                            -- Wait a moment and check again to see if focus changed
                            delay 0.2
                            set newApp to (name of first application process whose frontmost is true)
                            if newApp is not equal to currentApp or counter > 20 then  -- Either focus changed or 2+ seconds passed
                                set eventDetected to true
                            end if
                        end if
                    on error
                        -- If there's any error, just proceed after a short wait
                        if counter > 20 then
                            set eventDetected to true
                        end if
                    end try
                end repeat
                
                if eventDetected then
                    return "clicked"
                else
                    return "timeout"
                end if
            end tell
        "#;

        println!("📏 Executing click detection script...");
        
        // Execute the click detection script
        let click_result = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output();

        match click_result {
            Ok(output) => {
                let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
                println!("📏 Click detection result: '{}'", result);
                
                if result == "timeout" {
                    println!("⏰ Click timeout - no click detected within 30 seconds");
                    return Err("⏰ Click timeout - no click detected within 30 seconds".to_string());
                }
                
                println!("✅ Click detected! Injecting text at current cursor position...");
                
                // Small delay to ensure the click is fully processed
                std::thread::sleep(std::time::Duration::from_millis(100));
                
                // Now inject the text at wherever the cursor currently is (not at click location)
                match Enigo::new(&Settings::default()) {
                    Ok(mut enigo) => {
                        match enigo.text(&text) {
                            Ok(_) => {
                                println!("✅ Text injected successfully at cursor position");
                                Ok(format!("Text injected: {}", text))
                            }
                            Err(e) => {
                                let error_msg = format!("❌ Failed to inject text: {}", e);
                                println!("{}", error_msg);
                                Err(error_msg)
                            }
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("❌ Failed to create input simulator: {}", e);
                        println!("{}", error_msg);
                        Err(error_msg)
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("❌ Failed to execute click detection: {}", e);
                println!("{}", error_msg);
                Err(error_msg)
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        // For non-macOS platforms, we'll implement a simpler approach
        println!("🔄 Click-to-inject not yet implemented for this platform");
        
        // Fallback: inject text immediately at current cursor position
        match Enigo::new(&Settings::default()) {
            Ok(mut enigo) => {
                match enigo.text(&text) {
                    Ok(_) => {
                        println!("✅ Text injected at current cursor position");
                        Ok(format!("Text injected: {}", text))
                    }
                    Err(e) => {
                        let error_msg = format!("❌ Failed to inject text: {}", e);
                        println!("{}", error_msg);
                        Err(error_msg)
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("❌ Failed to create input simulator: {}", e);
                println!("{}", error_msg);
                Err(error_msg)
            }
        }
    }
}


// Function to detect target app automatically
#[cfg(target_os = "macos")]
fn detect_target_app() -> Option<String> {
    // First, let's get comprehensive app information to debug why Qoder isn't appearing
    println!("🔍 === DEBUGGING APP DETECTION ===");
    
    // Try multiple approaches to find all running apps
    let all_processes_output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get name of every application process")
        .output();
        
    if let Ok(output) = all_processes_output {
        if output.status.success() {
            let all_processes = String::from_utf8_lossy(&output.stdout);
            println!("🔍 ALL running processes: {}", all_processes.trim());
        }
    }
    
    // Try using `ps` command to get all processes (more comprehensive)
    let ps_output = Command::new("ps")
        .arg("-axo")
        .arg("comm")
        .output();
        
    if let Ok(output) = ps_output {
        if output.status.success() {
            let ps_processes = String::from_utf8_lossy(&output.stdout);
            let ps_lines: Vec<&str> = ps_processes.lines().collect();
            let qoder_processes: Vec<&str> = ps_lines.iter()
                .filter(|line| line.to_lowercase().contains("qoder"))
                .cloned()
                .collect();
                
            if !qoder_processes.is_empty() {
                println!("🔍 FOUND Qoder processes via ps: {:?}", qoder_processes);
            } else {
                println!("🔍 NO Qoder processes found via ps");
            }
        }
    }
    
    // Try using `pgrep` to find Qoder specifically
    let pgrep_output = Command::new("pgrep")
        .arg("-f")
        .arg("-i")
        .arg("qoder")
        .output();
        
    if let Ok(output) = pgrep_output {
        if output.status.success() {
            let pids = String::from_utf8_lossy(&output.stdout);
            if !pids.trim().is_empty() {
                println!("🔍 FOUND Qoder PIDs via pgrep: {}", pids.trim());
                
                // Try to get more info about these processes
                for pid in pids.trim().lines() {
                    let ps_info_output = Command::new("ps")
                        .arg("-p")
                        .arg(pid)
                        .arg("-o")
                        .arg("comm,args")
                        .output();
                        
                    if let Ok(info_output) = ps_info_output {
                        if info_output.status.success() {
                            let info = String::from_utf8_lossy(&info_output.stdout);
                            println!("🔍 Qoder process {} info: {}", pid, info.trim());
                        }
                    }
                }
            } else {
                println!("🔍 NO Qoder PIDs found via pgrep");
            }
        }
    }
    
    // Try alternative AppleScript queries for hidden/background apps
    let all_apps_output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get name of every application process whose background only is false")
        .output();
        
    if let Ok(output) = all_apps_output {
        if output.status.success() {
            let all_apps = String::from_utf8_lossy(&output.stdout);
            println!("🔍 ALL non-background apps: {}", all_apps.trim());
        }
    }
    
    // Get visible processes
    let visible_output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get name of every application process whose visible is true")
        .output();
        
    if let Ok(output) = visible_output {
        if output.status.success() {
            let visible_processes = String::from_utf8_lossy(&output.stdout);
            println!("🔍 VISIBLE processes: {}", visible_processes.trim());
        }
    }
    
    // Get frontmost processes in order
    let frontmost_list_output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get name of every application process whose frontmost is true")
        .output();
        
    if let Ok(output) = frontmost_list_output {
        if output.status.success() {
            let frontmost_list = String::from_utf8_lossy(&output.stdout);
            println!("🔍 FRONTMOST processes (in order): {}", frontmost_list.trim());
        }
    }
    
    println!("🔍 === END DEBUGGING ===");
    
    // Now try our normal detection logic
    let frontmost_output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get name of first application process whose frontmost is true")
        .output();
        
    let mut target_app: Option<String> = None;
    
    // Check the frontmost app first
    if let Ok(output) = frontmost_output {
        if output.status.success() {
            let frontmost = String::from_utf8_lossy(&output.stdout).trim().to_string();
            println!("🎯 Frontmost app: {}", frontmost);
            
            // If frontmost is not our app and is suitable, use it
            if frontmost != "Prompt Buddy" && frontmost != "prompt-buddy" && !is_problematic_app(&frontmost) && is_valid_app_name(&frontmost) {
                target_app = Some(frontmost);
                println!("✅ Using frontmost app as target");
            }
        }
    }
    
    // If frontmost app is not suitable, try to get all frontmost apps and pick the second one
    if target_app.is_none() {
        println!("🔍 Frontmost not suitable, trying to get second frontmost...");
        
        // Get all frontmost processes (should be ordered by most recent)
        let all_frontmost_output = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get name of every application process whose frontmost is true")
            .output();
            
        if let Ok(output) = all_frontmost_output {
            if output.status.success() {
                let processes_str = String::from_utf8_lossy(&output.stdout);
                let processes: Vec<&str> = processes_str.split(", ").map(|s| s.trim()).collect();
                
                println!("🎯 All frontmost apps in order: {:?}", processes);
                
                // Skip the first one (our app) and find the first suitable one
                for (i, process) in processes.iter().enumerate() {
                    println!("🔍 Checking process #{}: {}", i, process);
                    
                    if i > 0 && // Skip the first one
                       *process != "Prompt Buddy" && 
                       *process != "prompt-buddy" && 
                       !is_problematic_app(process) && 
                       is_valid_app_name(process) {
                        println!("✅ Found suitable target app from frontmost list: {}", process);
                        target_app = Some(process.to_string());
                        break;
                    } else {
                        println!("🚫 Skipping unsuitable app: {}", process);
                    }
                }
            }
        }
    }
    
    // If we still don't have a target, check all visible apps
    if target_app.is_none() {
        println!("🔍 No suitable frontmost apps found, checking all visible apps...");
        
        // Get apps that are visible
        let space_apps_output = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get name of every application process whose visible is true")
            .output();
        
        if let Ok(output) = space_apps_output {
            if output.status.success() {
                let processes_str = String::from_utf8_lossy(&output.stdout);
                let processes: Vec<&str> = processes_str.split(", ").map(|s| s.trim()).collect();
                
                println!("🎯 All visible apps: {:?}", processes);
                
                // Look specifically for Qoder first
                for process in &processes {
                    if process.contains("Qoder") || process.contains("qoder") {
                        println!("🎯 Found Qoder in visible apps: {}", process);
                        target_app = Some(process.to_string());
                        break;
                    }
                }
                
                // If no Qoder found, reverse the order to prioritize newer apps (like Electron-based ones)
                if target_app.is_none() {
                    let mut reversed_processes = processes.clone();
                    reversed_processes.reverse();
                    println!("🔄 Reversed process order (newer apps first): {:?}", reversed_processes);
                    
                    for process in reversed_processes {
                        if process != "Prompt Buddy" && process != "prompt-buddy" && !is_problematic_app(process) && is_valid_app_name(process) {
                            println!("🎯 Found suitable target app from reversed visible apps: {}", process);
                            target_app = Some(process.to_string());
                            break;
                        } else {
                            println!("🚫 Skipping unsuitable app: {}", process);
                        }
                    }
                }
            }
        }
    }
    
    // Handle Electron resolution
    if let Some(app_name) = &target_app {
        if app_name == "Electron" {
            println!("🎯 Detected Electron - attempting to resolve to actual app...");
            
            // Try to get the actual app name from the Electron process
            let electron_app = get_electron_app_name();
            if let Some(resolved_name) = electron_app {
                println!("🎯 Resolved Electron to: {}", resolved_name);
                return Some(resolved_name);
            } else {
                println!("⚠️ Could not resolve Electron app, trying direct Qoder activation...");
                
                // Try direct Qoder activation as fallback
                let qoder_variants = ["Qoder", "Qoder IDE", "qoder", "Qoder.app"];
                for variant in qoder_variants.iter() {
                    let test_cmd = format!("tell application \"{}\" to get name", variant);
                    let test_result = Command::new("osascript")
                        .arg("-e")
                        .arg(test_cmd)
                        .output();
                        
                    if let Ok(output) = test_result {
                        if output.status.success() {
                            println!("✅ Found working Qoder variant: {}", variant);
                            return Some(variant.to_string());
                        }
                    }
                }
            }
        }
    }
    
    target_app
}

#[cfg(not(target_os = "macos"))]
fn detect_target_app() -> Option<String> {
    None
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
// click so macOS focus is switched back before we start typing.
#[tauri::command]
async fn activate_last_app() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // Sleep briefly to let any previously launched apps settle
        std::thread::sleep(std::time::Duration::from_millis(100));
        
        if let Some(app_name) = LAST_APP_NAME.lock().unwrap().clone() {
            println!("🔄 Tauri cmd: activating last app = {}", app_name);
            
            // Check if the last app is problematic
            if is_problematic_app(&app_name) {
                println!("⚠️ Detected problematic app as last app: {}", app_name);
                
                // Try to use the app before the current one
                if let Some(previous_app) = PREVIOUS_APP_NAME.lock().unwrap().clone() {
                    println!("🔄 Falling back to previous app: {}", previous_app);
                    
                    // Check if previous app is also problematic
                    if !is_problematic_app(&previous_app) && activate_app(&previous_app) {
                        return Ok(());
                    } else {
                        println!("⚠️ Failed to activate previous app or it's problematic: {}", previous_app);
                        // Don't fall through to try the problematic app
                        return Ok(());
                    }
                } else {
                    println!("⚠️ No previous app available, and current app is problematic. Will not activate.");
                    return Ok(());
                }
            }
            
            // Try to activate the last app
            if activate_app(&app_name) {
                return Ok(());
            } else {
                return Err(format!("Failed to activate {}", app_name));
            }
        }
        println!("ℹ️  No last app recorded - nothing to activate");
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        println!("🔄 activate_last_app called on non-macOS platform – noop");
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, inject_text_at_cursor, check_accessibility_permissions, toggle_window_visibility, show_popup, hide_popup, capture_frontmost_app, activate_last_app, get_settings, save_settings])
        .setup(|app| {
            println!("🔧 Setting up global shortcuts with handlers...");
            
            // Load settings to get the configured shortcut
            let settings = load_settings(&app.handle());
            
            // Register main shortcut with handler in one step
            println!("🎯 Registering main toggle shortcut: {}...", settings.toggle_shortcut);
            let shortcut_string = settings.toggle_shortcut.clone();
            let main_shortcut: Shortcut = settings.toggle_shortcut.parse().map_err(|e| format!("Failed to parse main shortcut '{}': {}", settings.toggle_shortcut, e))?;
            match app.handle().global_shortcut().on_shortcut(main_shortcut, move |_app, _shortcut, _state| {
                // Only act on key *press* events so the shortcut truly toggles.
                if _state.state() == ShortcutState::Pressed {
                    println!("🎯 Global shortcut ({}) pressed!", shortcut_string);

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
                    println!("✅ Main shortcut ({}) registered successfully!", settings.toggle_shortcut);
                }
                Err(e) => {
                    println!("❌ Failed to register main shortcut: {}", e);
                    println!("⚠️  You can still use the app manually, but {} won't work", settings.toggle_shortcut);
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

                println!("👁️  Showing bar on first launch");
                let _ = window.show();
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Helper that records the currently frontmost application so we can restore
// focus later. Only meaningful on macOS.
fn remember_current_app() {
    #[cfg(target_os = "macos")]
    {
        if let Some(name) = get_frontmost_app() {
            println!("💾 Remembering current frontmost app: {}", name);
            
            // Get a lock on both mutexes
            let mut last_app_lock = LAST_APP_NAME.lock().unwrap();
            let mut prev_app_lock = PREVIOUS_APP_NAME.lock().unwrap();
            
            // If there is a current last app, store it as the previous app
            if let Some(ref last_app) = *last_app_lock {
                println!("💾 Updating previous app to: {}", last_app);
                *prev_app_lock = Some(last_app.clone());
            }
            
            // Set the new last app
            *last_app_lock = Some(name);
        }
    }
}
