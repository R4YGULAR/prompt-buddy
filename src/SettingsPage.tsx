import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Store } from "@tauri-apps/plugin-store";
import { Crown, Key, Copy } from "lucide-react";
import { licenseManager, LicenseInfo } from "./services/license";
import "./App.css";

interface Settings {
  toggleShortcut: string;
}

const DEFAULT_SETTINGS: Settings = {
  toggleShortcut: "alt+shift+space"
};

// Convert internal shortcut format to macOS display format
const formatShortcutForDisplay = (shortcut: string): string => {
  return shortcut
    .replace(/alt/gi, "Option")
    .replace(/cmd/gi, "Cmd")
    .replace(/ctrl/gi, "Ctrl")
    .replace(/shift/gi, "Shift")
    .replace(/space/gi, "Space")
    .replace(/\+/g, " + ");
};

// Convert display format back to internal format
const formatShortcutForStorage = (shortcut: string): string => {
  return shortcut
    .replace(/Option/gi, "alt")
    .replace(/Cmd/gi, "cmd")
    .replace(/Ctrl/gi, "ctrl")
    .replace(/Shift/gi, "shift")
    .replace(/Space/gi, "space")
    .replace(/\s+\+\s+/g, "+")
    .replace(/\s+/g, "")
    .toLowerCase();
};

// Convert keyboard event to internal shortcut format
const keyEventToShortcut = (event: KeyboardEvent): string => {
  const parts: string[] = [];
  
  // Add modifiers in consistent order
  if (event.metaKey) parts.push("cmd");
  if (event.ctrlKey) parts.push("ctrl");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");
  
  // Add the main key
  let key = event.key.toLowerCase();
  
  // Normalize key names to match internal format
  if (key === " ") key = "space";
  else if (key === "enter") key = "enter";
  else if (key === "escape") key = "escape";
  else if (key === "tab") key = "tab";
  else if (key === "backspace") key = "backspace";
  else if (key === "delete") key = "delete";
  else if (key.startsWith("arrow")) key = key.replace("arrow", "");
  else if (key.startsWith("digit")) key = key.replace("digit", "");
  else if (key.length === 1) key = key.toLowerCase();
  
  // Only add non-modifier keys
  if (!["meta", "control", "alt", "shift"].includes(key)) {
    parts.push(key);
  }
  
  return parts.join("+");
};

function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isEditing, setIsEditing] = useState(false);
  const [tempShortcut, setTempShortcut] = useState("");
  const [license, setLicense] = useState<LicenseInfo>({ key: '', tier: 'free', isValid: false });
  const [licenseKey, setLicenseKey] = useState("");
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);

  useEffect(() => {
    loadSettings();
    loadLicense();
  }, []);

  // Add keydown event listener for automatic shortcut detection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if already editing
      if (isEditing) return;
      
      // Don't trigger for single modifier keys
      if (["Meta", "Control", "Alt", "Shift"].includes(event.key)) return;
      
      const pressedShortcut = keyEventToShortcut(event);
      
      // Check if the pressed shortcut matches the current setting
      if (pressedShortcut === settings.toggleShortcut) {
        event.preventDefault();
        event.stopPropagation();
        console.log("🎯 Detected current shortcut pressed:", pressedShortcut);
        startEditing();
      }
    };

    // Add event listener to the window
    window.addEventListener("keydown", handleKeyDown);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settings.toggleShortcut, isEditing]);

  const loadSettings = async () => {
    try {
      const store = await Store.load("settings.json");
      const saved = await store.get<Settings>("settings");
      if (saved) {
        setSettings(saved);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const loadLicense = async () => {
    try {
      const licenseInfo = await licenseManager.getLicenseInfo();
      setLicense(licenseInfo);
    } catch (error) {
      console.error('Failed to load license:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      const store = await Store.load("settings.json");
      await store.set("settings", newSettings);
      await store.save();
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const activateLicense = async () => {
    if (!licenseKey.trim()) {
      alert('Please enter a license key');
      return;
    }

    setIsActivatingLicense(true);
    try {
      const isValid = await licenseManager.setLicenseKey(licenseKey);
      if (isValid) {
        alert('License activated successfully! 🎉\n\nAI features are now unlocked.');
        await loadLicense();
        setLicenseKey('');
      } else {
        alert('Invalid license key. Please check your key and try again.');
      }
    } catch (error) {
      console.error('Error activating license:', error);
      alert('Failed to activate license. Please try again.');
    } finally {
      setIsActivatingLicense(false);
    }
  };

  const removeLicense = async () => {
    if (confirm('Are you sure you want to remove your license? AI features will be disabled.')) {
      try {
        await licenseManager.removeLicense();
        await loadLicense();
        alert('License removed successfully.');
      } catch (error) {
        console.error('Error removing license:', error);
        alert('Failed to remove license.');
      }
    }
  };

  const generateDemoKey = () => {
    const demoKey = licenseManager.generateDemoKey();
    setLicenseKey(demoKey);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const startEditing = () => {
    setTempShortcut(formatShortcutForDisplay(settings.toggleShortcut));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setTempShortcut("");
  };

  const saveShortcut = async () => {
    if (tempShortcut.trim()) {
      const internalFormat = formatShortcutForStorage(tempShortcut);
      await saveSettings({ ...settings, toggleShortcut: internalFormat });
      setIsEditing(false);
      setTempShortcut("");
    }
  };

  const closeWindow = async () => {
    const win = getCurrentWindow();
    await win.close();
  };

  return (
    <div className="settings-overlay" data-tauri-drag-region>
      <div className="settings-content">
        <h3 className="settings-title">Settings</h3>

        {/* License Section */}
        <div className="settings-section">
          <h4 className="section-title">
            <Crown size={16} />
            License Status
          </h4>
          
          <div className="license-status">
            <div className="license-info">
              <span className={`license-tier ${license.tier}`}>
                {license.tier === 'pro' ? '👑 PRO' : '🆓 FREE'}
              </span>
              {license.key && (
                <div className="license-key-display">
                  <span>Key: {license.key.substring(0, 8)}...{license.key.substring(license.key.length - 4)}</span>
                  <button 
                    onClick={() => copyToClipboard(license.key)}
                    className="copy-btn"
                    title="Copy full license key"
                    data-tauri-drag-region="false"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {license.tier === 'free' ? (
            <div className="license-activation">
              <p className="upgrade-message">
                🚀 Upgrade to PRO to unlock AI-powered prompt generation and enhancement!
              </p>
              <div className="license-input-group">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="PB-XXXX-XXXX-XXXX-XXXX"
                  className="license-input"
                  data-tauri-drag-region="false"
                />
                <button
                  onClick={activateLicense}
                  disabled={isActivatingLicense}
                  className="activate-btn"
                  data-tauri-drag-region="false"
                >
                  <Key size={16} />
                  {isActivatingLicense ? 'Activating...' : 'Activate'}
                </button>
              </div>
              <div className="demo-section">
                <p className="demo-text">Want to try it out?</p>
                <button
                  onClick={generateDemoKey}
                  className="demo-btn"
                  data-tauri-drag-region="false"
                >
                  Generate Demo Key
                </button>
              </div>
            </div>
          ) : (
            <div className="license-management">
              <p className="pro-message">
                ✨ Thank you for supporting Prompt Buddy!
              </p>
              <button
                onClick={removeLicense}
                className="remove-license-btn"
                data-tauri-drag-region="false"
              >
                Remove License
              </button>
            </div>
          )}
        </div>

        <h4 className="section-title">Keyboard Shortcuts</h4>
        
        <div className="settings-section">
          <div className="settings-item">
            <span className="settings-label">Toggle prompt picker:</span>
            {isEditing ? (
              <div className="shortcut-editor">
                <input
                  type="text"
                  value={tempShortcut}
                  onChange={(e) => setTempShortcut(e.target.value)}
                  placeholder="e.g. option+shift+space"
                  className="shortcut-input"
                  data-tauri-drag-region="false"
                  autoFocus
                />
                <button 
                  onClick={saveShortcut}
                  className="shortcut-save"
                  data-tauri-drag-region="false"
                >
                  ✓
                </button>
                <button 
                  onClick={cancelEditing}
                  className="shortcut-cancel"
                  data-tauri-drag-region="false"
                >
                  ✗
                </button>
              </div>
            ) : (
              <div className="shortcut-display">
                <span className="settings-value">{formatShortcutForDisplay(settings.toggleShortcut)}</span>
                <button 
                  onClick={startEditing}
                  className="shortcut-edit"
                  data-tauri-drag-region="false"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="settings-section shortcuts-hints">
          <p className="settings-hint">Use Cmd + Option + 1-9 to inject prompts</p>
          <p className="settings-hint">Use 1-9 keys when prompt picker is focused</p>
          <p className="settings-hint">Press your current shortcut to edit it quickly</p>
          <p className="settings-note">Note: Shortcut changes require app restart</p>
        </div>

        <button
          className="settings-close"
          onClick={closeWindow}
          data-tauri-drag-region="false"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default SettingsPage;