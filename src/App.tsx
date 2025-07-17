import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Settings, X, Pencil } from "lucide-react";
import "./App.css";
import { PhysicalPosition } from "@tauri-apps/api/window";
import { confirm } from '@tauri-apps/plugin-dialog';
import { emit } from "@tauri-apps/api/event";

interface Prompt {
  id: string;
  title: string;
  content: string;
  color: string;
}

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

const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: "1",
    title: "Debug Root Cause",
    content:
      "Come up with 5-7 most likely root causes of this bug, and attempt the 1-2 most likely fixes with proper logging. Don't hold back, give it your all.",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "2",
    title: "Explain Code",
    content:
      "Explain this code in detail, including its purpose, how it works, potential edge cases, and any improvements that could be made.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "3",
    title: "Refactor",
    content:
      "Refactor this code to be more readable, maintainable, and performant. Follow best practices and explain your changes.",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "4",
    title: "Write Tests",
    content:
      "Write comprehensive unit tests for this code, covering edge cases and error scenarios. Use appropriate testing patterns.",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "5",
    title: "Optimize Performance",
    content:
      "Analyze this code for performance bottlenecks and suggest specific optimizations with examples.",
    color: "from-indigo-500 to-purple-500",
  },
  {
    id: "6",
    title: "Add Error Handling",
    content:
      "Add comprehensive error handling to this code with proper logging and user-friendly error messages.",
    color: "from-teal-500 to-green-500",
  },
];

function App() {
  const [prompts, setPrompts] = useState<Prompt[]>(DEFAULT_PROMPTS);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [injectedId, setInjectedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const pillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const addPillRef = useRef<HTMLDivElement | null>(null);

  /* --------------------------------------------------
   * Load & persist prompts
   * -------------------------------------------------- */
  const loadPrompts = useCallback(async () => {
    console.log('🔄 loadPrompts called');
    try {
      const store = await Store.load("prompts.json");
      console.log('📁 Store loaded');
      let saved = await store.get<Prompt[]>("prompts");
      console.log('📋 Raw saved prompts:', saved);
      if (!saved || saved.length === 0) {
        console.log('📋 No saved prompts, using defaults');
        saved = DEFAULT_PROMPTS;
        await store.set("prompts", saved);
        await store.save();
        console.log('💾 Default prompts saved to store');
      }
      
      // Ensure consistent ordering every time prompts are loaded
      saved.sort((a, b) => {
        // For default prompts with numeric IDs, maintain original order
        const aIsNumeric = /^\d+$/.test(a.id);
        const bIsNumeric = /^\d+$/.test(b.id);
        
        if (aIsNumeric && bIsNumeric) {
          return parseInt(a.id) - parseInt(b.id);
        } else if (aIsNumeric && !bIsNumeric) {
          return -1; // Default prompts first
        } else if (!aIsNumeric && bIsNumeric) {
          return 1; // Custom prompts after defaults
        } else {
          // Both are custom, sort by ID (which includes timestamp)
          return a.id.localeCompare(b.id);
        }
      });
      
      console.log('✅ Setting prompts to:', saved);
      setPrompts(saved);
      console.log('🎯 Prompts state updated, length:', saved.length);
    } catch (error) {
      console.error('❌ Error in loadPrompts:', error);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 Initial loadPrompts call');
    loadPrompts();
    
    // Lock window state on app startup
    const lockInitialState = async () => {
      try {
        await invoke("lock_window_state");
        console.log('🔐 Initial window state locked');
      } catch (err) {
        console.warn("Failed to lock initial window state", err);
      }
    };
    lockInitialState();
  }, [loadPrompts]);

  useEffect(() => {
    pillRefs.current = pillRefs.current.slice(0, prompts.length);
  }, [prompts]);

  /* --------------------------------------------------
   * Global shortcut listener from the backend
   * -------------------------------------------------- */
  useEffect(() => {
    const unlistenPromise = listen<number>(
      "inject-prompt",
      ({ payload: index }) => {
        if (index >= 0 && index < prompts.length) {
          injectTextViaShortcut(prompts[index], index + 1);
        }
      }
    );
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [prompts]);

  useEffect(() => {
    console.log('👂 Setting up prompts-updated listeners');
    
    // Primary event listener
    const unlistenPromise1 = listen("prompts-updated", (event) => {
      console.log('🔔 prompts-updated event received!', event);
      loadPrompts();
    });
    
    // Secondary listener with different approach
    const unlistenPromise2 = listen("prompts-updated", () => {
      console.log('🔔 Secondary prompts-updated listener triggered');
      setTimeout(() => loadPrompts(), 50);
    });
    
    // Polling mechanism as backup - check for store changes every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const store = await Store.load("prompts.json");
        const saved = await store.get<Prompt[]>("prompts") || [];
        const trigger = await store.get("_trigger");
        
        // If trigger timestamp exists and is recent (last 5 seconds), reload
        if (trigger && typeof trigger === 'number' && Date.now() - trigger < 5000) {
          console.log('🔄 Store trigger detected, reloading prompts');
          await store.set("_trigger", null); // Clear trigger
          await store.save();
          loadPrompts();
        }
        
        // Also check if prompt count changed
        if (saved.length !== prompts.length) {
          console.log(`📊 Prompt count changed: ${prompts.length} → ${saved.length}`);
          loadPrompts();
        }
      } catch (error) {
        console.log('📊 Polling check failed:', error);
      }
    }, 2000);
    
    return () => {
      unlistenPromise1.then((unlisten) => unlisten());
      unlistenPromise2.then((unlisten) => unlisten());
      clearInterval(pollInterval);
    };
  }, [loadPrompts, prompts.length]);

  /* --------------------------------------------------
   * Keyboard listener – press 1-9 to inject prompts
   * -------------------------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only act on plain number keys (no modifiers) while the bar has focus
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;

      const key = e.key;
      if (key >= "1" && key <= "9") {
        const index = parseInt(key, 10) - 1;
        if (index < prompts.length) {
          e.preventDefault();
          injectTextViaShortcut(prompts[index], index + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prompts]);

  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused) {
        setExpandedIndex(null);
      } else {
        // When window regains focus, ensure it's in proper state
        const restoreWindowState = async () => {
          try {
            await invoke("restore_window_state");
            await invoke("lock_window_state");
          } catch (err) {
            console.warn("Failed to restore window state on focus", err);
          }
        };
        restoreWindowState();
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  /* --------------------------------------------------
   * Hover handlers
   * -------------------------------------------------- */
  const handleMouseEnter = useCallback((index: number) => {
    setExpandedIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setExpandedIndex(null);
  }, []);

  /* --------------------------------------------------
   * Inject text helper
   * -------------------------------------------------- */
  const injectTextViaShortcut = async (prompt: Prompt, shortcut: number) => {
    setInjectedId(null);
    setErrorMessage("");
    try {
      // Preserve window state before any focus switching
      try {
        await invoke("preserve_window_state");
      } catch (err) {
        console.warn("preserve_window_state failed", err);
      }

      // Note: We no longer capture the frontmost app here since it's captured
      // once on startup. This prevents the bug where clicking pills would
      // reactivate whatever window was active when you pressed Alt+Space
      // instead of the truly "last active" window before Prompt Buddy appeared.

      // Now bring the previously active application back to the front so the
      // injected text goes to the correct place.
      try {
        await invoke("activate_last_app");
      } catch (err) {
        console.warn("activate_last_app failed", err);
      }

      // Give the system a moment to actually switch focus.
      await new Promise((r) => setTimeout(r, 300));

      await invoke<string>("inject_text", { text: prompt.content });
      
      // Restore window state after text injection
      try {
        await invoke("restore_window_state");
        // Also aggressively lock the state to prevent future issues
        await invoke("lock_window_state");
      } catch (err) {
        console.warn("restore_window_state failed", err);
      }

      setInjectedId(prompt.id);
      setTimeout(() => setInjectedId(null), 2000);
    } catch (e) {
      console.error(e);
      setErrorMessage(`Failed to inject prompt ${shortcut}`);
      setTimeout(() => setErrorMessage(""), 3000);
      
      // Still try to restore window state even if injection failed
      try {
        await invoke("restore_window_state");
        await invoke("lock_window_state");
      } catch (err) {
        console.warn("restore_window_state failed during error handling", err);
      }
    }
  };

  /* --------------------------------------------------
   * Close window helper
   * -------------------------------------------------- */
  const closeWindow = async () => {
    const win = getCurrentWindow();
    await win.close();
  };

  /* --------------------------------------------------
   * Open Settings window
   * -------------------------------------------------- */
  const openSettingsWindow = async () => {
    // If a settings window already exists, just focus it
    const settingsWin = await WebviewWindow.getByLabel("settings");
    if (settingsWin) {
      await settingsWin.setFocus();
      return;
    }

    // Otherwise create a new one
    new WebviewWindow("settings", {
      url: "index.html?settings",
      width: 450,
      height: 260,
      resizable: false,
      title: "Prompt Picker Settings",
      decorations: true,
    });
  };

  /* --------------------------------------------------
   * Open Edit Window
   * -------------------------------------------------- */
  const openEditWindow = async (index: number, pill?: HTMLElement) => {
    console.log(`openEditWindow called for index ${index}`);
    try {
      const label = index === -1 ? 'edit-add' : `edit-${index}`;
      const existing = await WebviewWindow.getByLabel(label);
      if (existing) {
        console.log(`Focusing existing edit window ${label}`);
        await existing.setFocus();
        return;
      }

      const EDIT_WIDTH = 400;
      const EDIT_HEIGHT = 420;

      let newLeft: number | undefined;
      let newTop: number | undefined;

      if (pill) {
        const win = getCurrentWindow();
        const pos = await win.outerPosition();
        const scale = await win.scaleFactor();
        const rect = pill.getBoundingClientRect();
        const physicalLeft = pos.x + Math.round(rect.left * scale);
        const physicalTop = pos.y + Math.round(rect.top * scale);
        const physicalWidth = Math.round(rect.width * scale);
        newLeft = physicalLeft + physicalWidth / 2 - Math.round((EDIT_WIDTH * scale) / 2);
        newTop = physicalTop - Math.round(EDIT_HEIGHT * scale) - 10;
        // Clamp to stay on-screen (at least 0,0) in case the calculation
        // would position the window off the visible area.
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        console.log(`Calculated window position left=${newLeft}, top=${newTop}`);
      } else {
        console.warn(`No element provided for positioning edit window index ${index}`);
      }

      const urlParam = index === -1 ? 'add' : `edit=${index}`;
      const windowTitle = index === -1 ? 'Add New Prompt' : `Edit Prompt ${index + 1}`;

      const newWin = new WebviewWindow(label, {
        url: `index.html?${urlParam}`,
        title: windowTitle,
        width: EDIT_WIDTH,
        height: EDIT_HEIGHT,
        resizable: true,
        decorations: true,
        // Capabilities omitted: inherits default permissions like the settings window
      });

      if (newLeft !== undefined && newTop !== undefined) {
        await newWin.once("tauri://created", async () => {
          await newWin.setPosition(new PhysicalPosition(Math.round(newLeft!), Math.round(newTop!)));
          console.log(`Edit window positioned.`);
        });
      }
    } catch (err) {
      console.error(`Error opening edit window for ${index}:`, err);
    }
  };

  const deletePrompt = async (index: number) => {
    const promptToDelete = prompts[index];
    if (!promptToDelete) return;

    const confirmed = await confirm(
      `Are you sure you want to delete the prompt "${promptToDelete.title}"?`,
      { title: "Confirm Deletion", kind: "warning" }
    );

    if (!confirmed) return;

    try {
      const store = await Store.load("prompts.json");
      let saved = await store.get<Prompt[]>("prompts") || [];
      
      // Find the index by id to be safe
      const storeIndex = saved.findIndex(p => p.id === promptToDelete.id);
      if (storeIndex !== -1) {
        saved.splice(storeIndex, 1);
        await store.set("prompts", saved);
        await store.save();
        await emit("prompts-updated");
        // Assuming 'emit' is a global function or imported elsewhere,
        // otherwise, you might need to use a different event emitter.
        // For now, we'll just reload and update the state.
        loadPrompts();
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      // Optionally show error message
    }
  };

  /* --------------------------------------------------
   * Render
   * -------------------------------------------------- */
  return (
    <div className="prompt-bar" data-tauri-drag-region>
      <div className="bar-background" data-tauri-drag-region />

      <div className="bar-content" data-tauri-drag-region>
        <div className="prompts-container" data-tauri-drag-region>
          {prompts.slice(0, 9).map((p, i) => (
            <div
              key={p.id}
              ref={(el) => (pillRefs.current[i] = el)}
              className={`prompt-pill ${injectedId === p.id ? "injected" : ""} ${
                expandedIndex === i ? "expanded" : ""
              }`}
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
              onClick={() => injectTextViaShortcut(p, i + 1)}
              onMouseDown={(e: React.MouseEvent) => {
                if (e.button === 2) {
                  console.log(`Right-click (mouse down) detected on prompt ${i + 1}`);
                  e.preventDefault();
                  e.stopPropagation();
                  const pill = pillRefs.current[i];
                  openEditWindow(i, pill ?? undefined);
                }
              }}
              data-tauri-drag-region="false"
            >
              {/* Number + Edit stacked */}
              <div className="prompt-badge" data-tauri-drag-region="false">
                <div className="prompt-number">{i + 1}</div>
                <button
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log(`Edit button clicked for prompt ${i + 1}`);
                    const pill = pillRefs.current[i];
                    openEditWindow(i, pill ?? undefined);
                  }}
                  data-tauri-drag-region="false"
                >
                  <Pencil size={12} />
                </button>
              </div>

              {/* Delete button in top right corner */}
              <button
                className="delete-btn delete-btn-corner"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePrompt(i);
                }}
                data-tauri-drag-region="false"
              >
                <X size={12} />
              </button>

              {expandedIndex === i ? (
                <div className="prompt-full-container">
                  <div className="prompt-full">
                    {p.content.length > 1000
                      ? `${p.content.slice(0, 1000)}…`
                      : p.content}
                  </div>
                </div>
              ) : (
                <div className="prompt-info">
                  <div className="prompt-title">{p.title}</div>
                  <div className="prompt-shortcut">{getKeyboardShortcuts().injectShortcut(i + 1)}</div>
                </div>
              )}

              <div
                className={`prompt-gradient bg-gradient-to-r ${p.color}`}
              />
            </div>
          ))}
          {prompts.length < 9 && (
            <div
              ref={addPillRef}
              className="prompt-pill add-pill"
              onClick={() => {
                if (addPillRef.current) {
                  openEditWindow(-1, addPillRef.current);
                } else {
                  openEditWindow(-1, undefined);
                }
              }}
            >
              <div className="prompt-badge">
                <div className="prompt-number">+</div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bar-controls" data-tauri-drag-region="false">
          <button
            className="control-btn"
            onClick={openSettingsWindow}
            data-tauri-drag-region="false"
          >
            <Settings size={16} />
          </button>
          <button
            className="control-btn close-btn"
            onClick={closeWindow}
            data-tauri-drag-region="false"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Error toast */}
      {errorMessage && <div className="error-toast">{errorMessage}</div>}

      {/* Settings overlay moved to dedicated window */}
    </div>
  );
}

export default App;