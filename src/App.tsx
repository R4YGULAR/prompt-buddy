import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Settings, X, Pencil, Crown, AlertCircle } from "lucide-react";
import "./App.css";
import { PhysicalPosition } from "@tauri-apps/api/window";
import { confirm } from '@tauri-apps/plugin-dialog';
import { emit } from "@tauri-apps/api/event";
import { licenseManager } from "./services/license";

interface Prompt {
  id: string;
  title: string;
  content: string;
  color: string;
  folderId?: string;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  isExpanded: boolean;
  prompts: Prompt[];
}

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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [injectedId, setInjectedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hasProLicense, setHasProLicense] = useState(false);
  const [promptLimitInfo, setPromptLimitInfo] = useState({
    isAtLimit: false,
    isNearLimit: false,
    remainingPrompts: 5,
    totalAllowed: 11
  });
  const [draggedPromptId, setDraggedPromptId] = useState<string | null>(null);
  const [dragOverPromptId, setDragOverPromptId] = useState<string | null>(null);
  const pillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const addPillRef = useRef<HTMLDivElement | null>(null);

  /* --------------------------------------------------
   * Load license info and prompt limits
   * -------------------------------------------------- */
  const loadLicenseInfo = useCallback(async () => {
    try {
      const hasProLicense = await licenseManager.hasProLicense();
      setHasProLicense(hasProLicense);
    } catch (error) {
      console.error('❌ Error loading license info:', error);
      setHasProLicense(false);
    }
  }, []);

  const updatePromptLimits = useCallback(async (promptCount: number) => {
    try {
      const limitInfo = await licenseManager.getPromptLimitInfo(promptCount);
      setPromptLimitInfo(limitInfo);
    } catch (error) {
      console.error('❌ Error getting prompt limit info:', error);
    }
  }, []);

  /* --------------------------------------------------
   * Load & persist prompts
   * -------------------------------------------------- */
  const loadPrompts = useCallback(async () => {
    console.log('🔄 loadPrompts called');
    try {
      const store = await Store.load("prompts.json");
      console.log('📁 Store loaded');
      let saved = await store.get<Prompt[]>("prompts");
      let savedFolders = await store.get<Folder[]>("folders") || [];
      console.log('📋 Raw saved prompts:', saved, 'folders:', savedFolders);
      if (!saved || saved.length === 0) {
        console.log('📋 No saved prompts, using defaults');
        saved = DEFAULT_PROMPTS;
        await store.set("prompts", saved);
        await store.save();
        console.log('💾 Default prompts saved to store');
      }
      console.log('✅ Setting prompts to:', saved);
      setPrompts(saved);
      setFolders(savedFolders);
      
      // Update license info and prompt limits
      await loadLicenseInfo();
      await updatePromptLimits(saved.length);
      
      console.log('🎯 Prompts state updated, length:', saved.length);
    } catch (error) {
      console.error('❌ Error in loadPrompts:', error);
    }
  }, [loadLicenseInfo, updatePromptLimits]);

  useEffect(() => {
    console.log('🚀 Initial loadPrompts call');
    loadPrompts();
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
  const injectTextViaShortcut = async (prompt: Prompt, _shortcut: number) => {
    setInjectedId(null);
    setErrorMessage("");
    try {
      // Start click-to-inject mode - this will hide the window and wait for user click
      console.log(`🚀 Starting click-to-inject for prompt: ${prompt.title}`);
      
      // Show a brief message to explain what's happening
      setErrorMessage("🖱️ Click anywhere to trigger injection...");
      
      await invoke<string>("inject_text_at_cursor", { text: prompt.content });
      setInjectedId(prompt.id);
      setErrorMessage("✅ Text injected successfully!");
      setTimeout(() => {
        setInjectedId(null);
        setErrorMessage("");
      }, 2000);
    } catch (e) {
      console.error(e);
      const errorMessage = typeof e === 'string' ? e : 'Unknown error occurred';
      setErrorMessage(`❌ ${errorMessage}`);
      setTimeout(() => setErrorMessage(""), 5000);
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
   * Folder management functions
   * -------------------------------------------------- */
  const toggleFolder = async (folderId: string) => {
    if (!hasProLicense) return;
    
    try {
      const store = await Store.load("prompts.json");
      let savedFolders = await store.get<Folder[]>("folders") || [];
      
      const folderIndex = savedFolders.findIndex(f => f.id === folderId);
      if (folderIndex !== -1) {
        savedFolders[folderIndex].isExpanded = !savedFolders[folderIndex].isExpanded;
        await store.set("folders", savedFolders);
        await store.save();
        setFolders(savedFolders);
      }
    } catch (error) {
      console.error('Error toggling folder:', error);
    }
  };


  // Get prompts that are not in any folder (for display in main bar)
  const getUnfolderedPrompts = () => {
    return prompts.filter(p => !p.folderId);
  };

  // Get all prompts in expanded folders (for display in main bar)
  const getExpandedFolderPrompts = () => {
    return folders
      .filter(f => f.isExpanded)
      .flatMap(f => f.prompts)
      .slice(0, Math.max(0, 9 - getUnfolderedPrompts().length));
  };

  // Get final list of prompts to display in the main bar
  const getDisplayPrompts = () => {
    const unfolderedPrompts = getUnfolderedPrompts();
    const expandedFolderPrompts = getExpandedFolderPrompts();
    return [...unfolderedPrompts, ...expandedFolderPrompts].slice(0, 9);
  };

  /* --------------------------------------------------
   * Drag and Drop functions
   * -------------------------------------------------- */
  const handleDragStart = (e: React.DragEvent, promptId: string) => {
    if (!hasProLicense) return;
    
    setDraggedPromptId(promptId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', promptId);
  };

  const handleDragOver = (e: React.DragEvent, targetPromptId: string) => {
    if (!hasProLicense || !draggedPromptId || draggedPromptId === targetPromptId) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPromptId(targetPromptId);
  };

  const handleDragLeave = () => {
    setDragOverPromptId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPromptId: string) => {
    if (!hasProLicense || !draggedPromptId || draggedPromptId === targetPromptId) return;
    
    e.preventDefault();
    setDragOverPromptId(null);
    
    try {
      const store = await Store.load("prompts.json");
      let savedPrompts = await store.get<Prompt[]>("prompts") || [];
      let savedFolders = await store.get<Folder[]>("folders") || [];
      
      const draggedPrompt = savedPrompts.find(p => p.id === draggedPromptId);
      const targetPrompt = savedPrompts.find(p => p.id === targetPromptId);
      
      if (!draggedPrompt || !targetPrompt) {
        console.error('Could not find dragged or target prompt');
        setDraggedPromptId(null);
        return;
      }
      
      // Check if target prompt is already in a folder
      const existingFolder = savedFolders.find(f => f.prompts.some(p => p.id === targetPromptId));
      
      if (existingFolder) {
        // Add dragged prompt to existing folder
        if (!existingFolder.prompts.some(p => p.id === draggedPromptId)) {
          draggedPrompt.folderId = existingFolder.id;
          existingFolder.prompts.push(draggedPrompt);
          
          // Remove from any other folders
          savedFolders.forEach(folder => {
            if (folder.id !== existingFolder.id) {
              folder.prompts = folder.prompts.filter(p => p.id !== draggedPromptId);
            }
          });
        }
      } else {
        // Create new folder with both prompts
        const folderName = `${targetPrompt.title} & ${draggedPrompt.title}`.substring(0, 20);
        const newFolder: Folder = {
          id: `folder_${Date.now()}`,
          name: folderName,
          color: "from-gray-500 to-gray-600",
          isExpanded: true,
          prompts: [targetPrompt, draggedPrompt]
        };
        
        // Update prompt folder references
        targetPrompt.folderId = newFolder.id;
        draggedPrompt.folderId = newFolder.id;
        
        // Remove prompts from any existing folders
        savedFolders.forEach(folder => {
          folder.prompts = folder.prompts.filter(p => p.id !== targetPromptId && p.id !== draggedPromptId);
        });
        
        savedFolders.push(newFolder);
      }
      
      await store.set("prompts", savedPrompts);
      await store.set("folders", savedFolders);
      await store.save();
      
      setPrompts(savedPrompts);
      setFolders(savedFolders);
      
      await emit("prompts-updated");
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setDraggedPromptId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedPromptId(null);
    setDragOverPromptId(null);
  };

  /* --------------------------------------------------
   * Render
   * -------------------------------------------------- */
  return (
    <div className="prompt-bar" data-tauri-drag-region>
      <div className="bar-background" data-tauri-drag-region />

      <div className="bar-content" data-tauri-drag-region>
        <div className="prompts-container" data-tauri-drag-region>
          {/* Render folders (PRO feature) */}
          {hasProLicense && folders.map((folder) => (
            <div key={folder.id} className="folder-container" data-tauri-drag-region="false">
              <div
                className={`folder-pill ${folder.isExpanded ? 'expanded' : 'collapsed'}`}
                onClick={() => toggleFolder(folder.id)}
                data-tauri-drag-region="false"
              >
                <div className="folder-badge">
                  <div className="folder-icon">
                    {folder.isExpanded ? '📂' : '📁'}
                  </div>
                </div>
                <div className="folder-info">
                  <div className="folder-name">{folder.name}</div>
                  <div className="folder-count">{folder.prompts.length}</div>
                </div>
                <div className={`folder-gradient bg-gradient-to-r ${folder.color}`} />
              </div>
            </div>
          ))}
          
          {/* Render all prompts with proper indexing */}
          {getDisplayPrompts().map((p, i) => (
            <div
              key={p.id}
              ref={(el) => (pillRefs.current[i] = el)}
              className={`prompt-pill ${p.folderId ? 'folder-prompt' : ''} ${injectedId === p.id ? "injected" : ""} ${
                expandedIndex === i ? "expanded" : ""
              } ${draggedPromptId === p.id ? 'dragging' : ''} ${dragOverPromptId === p.id ? 'drag-over' : ''}`}
              draggable={hasProLicense}
              onDragStart={(e) => handleDragStart(e, p.id)}
              onDragOver={(e) => handleDragOver(e, p.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, p.id)}
              onDragEnd={handleDragEnd}
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
              onClick={() => injectTextViaShortcut(p, i + 1)}
              title="Click to enter wait-for-click mode - any click triggers text injection at cursor"
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
                  <div className="prompt-shortcut">⌘⌥{i + 1}</div>
                </div>
              )}

              <div className={`prompt-gradient bg-gradient-to-r ${p.color}`} />
            </div>
          ))}
          {prompts.length < 9 && !promptLimitInfo.isAtLimit && (
            <div
              ref={addPillRef}
              className="prompt-pill add-pill"
              onClick={async () => {
                // Check if user can add another prompt
                const canAddResult = await licenseManager.canAddPrompt(prompts.length);
                if (!canAddResult.canAdd) {
                  alert(`🔒 Prompt Limit Reached\n\n${canAddResult.reason}`);
                  return;
                }
                
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
          {!hasProLicense && promptLimitInfo.isAtLimit && (
            <div className="prompt-pill add-pill locked-add-pill">
              <div className="prompt-badge">
                <Crown size={20} className="pro-icon" />
              </div>
              <div className="upgrade-tooltip">
                <p>🔒 Prompt Limit Reached</p>
                <p>Upgrade to PRO for unlimited prompts!</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bar-controls" data-tauri-drag-region="false">
          {!hasProLicense && (
            <div className="prompt-limit-indicator">
              {promptLimitInfo.isNearLimit || promptLimitInfo.isAtLimit ? (
                <AlertCircle size={14} className="warning-icon" />
              ) : null}
              <span className={`limit-text ${promptLimitInfo.isNearLimit ? 'near-limit' : ''} ${promptLimitInfo.isAtLimit ? 'at-limit' : ''}`}>
                {promptLimitInfo.remainingPrompts}/{promptLimitInfo.totalAllowed}
              </span>
            </div>
          )}
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