import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

// OS-specific keyboard shortcut utility
const getKeyboardShortcuts = () => {
  const platform = navigator.platform.toLowerCase();
  const isMac = platform.includes('mac');
  
  return {
    modifierSymbols: isMac ? '⌘⌥' : 'Ctrl+Alt+',
    toggleShortcut: isMac ? 'Cmd+Shift+Enter' : 'Ctrl+Shift+Enter',
    injectShortcut: (num: number) => isMac ? `⌘⌥${num}` : `Ctrl+Alt+${num}`,
    injectDescription: isMac ? 'Cmd+Alt+1-9 to inject prompts' : 'Ctrl+Alt+1-9 to inject prompts'
  };
};

function SettingsPage() {
  const closeWindow = async () => {
    const win = getCurrentWindow();
    await win.close();
  };

  const shortcuts = getKeyboardShortcuts();

  return (
    <div className="settings-overlay" data-tauri-drag-region>
      <div className="settings-content">
        <p className="settings-hint">{shortcuts.injectDescription}</p>
        <p className="settings-hint">{shortcuts.toggleShortcut} to show/hide bar</p>
        <button
          className="settings-close"
          onClick={closeWindow}
          data-tauri-drag-region="false"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default SettingsPage; 