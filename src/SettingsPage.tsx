import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

function SettingsPage() {
  const closeWindow = async () => {
    const win = getCurrentWindow();
    await win.close();
  };

  return (
    <div className="settings-overlay" data-tauri-drag-region>
      <div className="settings-content">
        <p className="settings-hint">Use Cmd+Alt+1-9 to inject prompts</p>
        <p className="settings-hint">Cmd+Shift+Enter to show/hide bar</p>
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