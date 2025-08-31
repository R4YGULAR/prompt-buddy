import { useState, useEffect } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Wand2, Sparkles, Loader2, Crown, Lock } from "lucide-react";
import { createOpenRouterClient } from "./services/openrouter";
import { licenseManager } from "./services/license";
import "./App.css";

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

function PromptEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const editParam = urlParams.get("edit");
  const isAddMode = urlParams.has("add");
  const index = isAddMode ? -1 : parseInt(editParam || "-1", 10);

  console.log('PromptEditor initialized:', { editParam, isAddMode, index });

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [enhancementRequest, setEnhancementRequest] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [hasProLicense, setHasProLicense] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    console.log('PromptEditor useEffect, index:', index);
    const load = async () => {
      try {
        console.log('Starting load');
        const store = await Store.load('prompts.json');
        console.log('Store loaded');
        let saved = await store.get<Prompt[]>('prompts') || [];
        console.log('Got saved prompts:', saved);
        
        // Check license status
        const proLicense = await licenseManager.hasProLicense();
        setHasProLicense(proLicense);
        
        // Load folders
        let savedFolders = await store.get<Folder[]>("folders") || [];
        setFolders(savedFolders);
        
        if (saved.length === 0) saved = DEFAULT_PROMPTS;
        if (index >= 0 && index < saved.length) {
          const p = saved[index];
          setPrompt(p);
          setTitle(p.title);
          setContent(p.content);
          setSelectedFolderId(p.folderId || null);
        } else if (index === -1) {
          const defaultColor = 'from-blue-500 to-cyan-500';
          const tempPrompt = {id: '', title: '', content: '', color: defaultColor};
          setPrompt(tempPrompt);
          setTitle('');
          setContent('');
          setSelectedFolderId(null);
        }
        setLoaded(true);
        console.log('Set loaded to true');
      } catch (error) {
        console.error('Error in load:', error);
        setLoaded(true);
        if (index === -1) {
          const defaultColor = 'from-blue-500 to-cyan-500';
          const tempPrompt = {id: '', title: '', content: '', color: defaultColor};
          setPrompt(tempPrompt);
          setTitle('');
          setContent('');
        } else {
          setPrompt(null);
        }
      }
    };
    load();
  }, [index]);

  const save = async () => {
    console.log('💾 Save called, prompt:', prompt, 'index:', index);
    console.log('📝 Title:', title, 'Content:', content);
    
    if (!prompt) {
      console.error('❌ No prompt object, cannot save');
      return;
    }
    
    if (!title.trim() || !content.trim()) {
      console.error('❌ Title or content is empty');
      alert('Please enter both title and content');
      return;
    }
    
    try {
      console.log('📁 Loading store...');
      const store = await Store.load("prompts.json");
      
      console.log('📋 Getting current prompts...');
      let saved = await store.get<Prompt[]>("prompts") || [];
      console.log('📋 Current saved prompts:', saved);
      
      if (saved.length === 0) {
        saved = DEFAULT_PROMPTS;
        console.log('📋 Using default prompts as base');
      }
      
      if (index >= 0 && index < saved.length) {
        console.log('✏️ Editing existing prompt at index:', index);
        saved[index] = { ...prompt, title: title.trim(), content: content.trim(), folderId: selectedFolderId || undefined };
      } else if (index === -1) {
        console.log('➕ Adding new prompt');
        
        // Check if user can add another prompt
        const canAddResult = await licenseManager.canAddPrompt(saved.length);
        if (!canAddResult.canAdd) {
          alert(`🔒 Prompt Limit Reached\n\n${canAddResult.reason}`);
          return;
        }
        
        const newId = Date.now().toString();
        const newPrompt = { 
          id: newId, 
          title: title.trim(), 
          content: content.trim(), 
          color: prompt.color,
          folderId: selectedFolderId || undefined
        };
        console.log('🆕 New prompt object:', newPrompt);
        saved.push(newPrompt);
      }
      
      // Update folder contents if needed
      if (hasProLicense && selectedFolderId) {
        let savedFolders = await store.get<Folder[]>("folders") || [];
        const targetFolder = savedFolders.find(f => f.id === selectedFolderId);
        if (targetFolder) {
          const promptId = index >= 0 ? prompt?.id : Date.now().toString();
          // Remove prompt from all folders first
          savedFolders.forEach(folder => {
            folder.prompts = folder.prompts.filter(p => p.id !== promptId);
          });
          // Add to target folder
          const promptToAdd = saved.find(p => p.id === promptId);
          if (promptToAdd) {
            targetFolder.prompts.push(promptToAdd);
          }
          await store.set("folders", savedFolders);
        }
      }
      
      console.log('💾 Final prompts array to save:', saved);
      console.log('📏 Array length:', saved.length);
      
      // Save to store with explicit operations
      await store.set("prompts", saved);
      console.log('📝 Store.set completed');
      
      await store.save();
      console.log('💾 Store.save completed');
      
      // Try multiple event emission approaches
      try {
        console.log('📡 Attempting event emission...');
        
        // Approach 1: Simple emit
        await emit("prompts-updated");
        console.log('✅ Basic prompts-updated event emitted');
        
        // Approach 2: Emit with payload
        await emit("prompts-updated", { 
          timestamp: Date.now(),
          action: index === -1 ? 'add' : 'edit',
          promptCount: saved.length 
        });
        console.log('✅ Enhanced prompts-updated event emitted');
        
        // Approach 3: Force reload by touching the store again
        await store.set("_trigger", Date.now());
        await store.save();
        console.log('✅ Store trigger updated');
        
      } catch (eventError) {
        console.error('❌ Event emission failed:', eventError);
      }
      
      // Wait longer to ensure event processing
      console.log('⏳ Waiting for event processing...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('🪟 Closing window...');
      const win = getCurrentWindow();
      await win.close();
      
    } catch (error) {
      console.error('❌ Error saving prompt:', error);
      alert('Failed to save prompt: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const cancel = async () => {
    const win = getCurrentWindow();
    await win.close();
  };

  const showUpgradeAlert = () => {
    alert('🔒 PRO Feature Required\n\nAI-powered prompt generation and enhancement are available in Prompt Buddy PRO.\n\nUpgrade to unlock:\n• AI prompt generation\n• Smart prompt enhancement\n• Advanced customization\n\nVisit the Settings to activate your license!');
  };

  const enhancePrompt = async () => {
    if (!hasProLicense) {
      showUpgradeAlert();
      return;
    }

    if (!enhancementRequest.trim()) {
      alert('Please describe how you want to enhance the prompt');
      return;
    }

    setIsEnhancing(true);
    try {
      const client = createOpenRouterClient();
      const enhanced = await client.enhancePrompt(content, enhancementRequest);
      setContent(enhanced);
      setEnhancementRequest('');
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      alert(`Failed to enhance prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateFromDescription = async () => {
    if (!hasProLicense) {
      showUpgradeAlert();
      return;
    }

    if (!generationPrompt.trim()) {
      alert('Please describe the prompt you want to generate');
      return;
    }

    setIsGenerating(true);
    try {
      const client = createOpenRouterClient();
      const generated = await client.generatePrompt(generationPrompt);
      setContent(generated);
      if (!title.trim()) {
        // Auto-generate a title from the first few words
        const words = generationPrompt.split(' ').slice(0, 4).join(' ');
        setTitle(words.charAt(0).toUpperCase() + words.slice(1));
      }
      setGenerationPrompt('');
    } catch (error) {
      console.error('Error generating prompt:', error);
      alert(`Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const createFolder = async () => {
    if (!hasProLicense || !newFolderName.trim()) return;
    
    try {
      const store = await Store.load('prompts.json');
      let savedFolders = await store.get<Folder[]>("folders") || [];
      
      const newFolder: Folder = {
        id: `folder_${Date.now()}`,
        name: newFolderName.trim(),
        color: "from-gray-500 to-gray-600",
        isExpanded: true,
        prompts: []
      };
      
      savedFolders.push(newFolder);
      await store.set("folders", savedFolders);
      await store.save();
      setFolders(savedFolders);
      setNewFolderName('');
      setShowCreateFolder(false);
      setSelectedFolderId(newFolder.id);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  if (!loaded) {
    return <div className="prompt-editor">Loading...</div>;
  }

  if (prompt === null) {
    return <div className="prompt-editor">Invalid prompt index</div>;
  }

  return (
    <div className="prompt-editor">
      <h2>{index >= 0 ? `Edit Prompt ${index + 1}` : "Add New Prompt"}</h2>

      <label>
        Title:
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="editor-input"
        />
      </label>

      {/* Folder Selection (PRO feature) */}
      {hasProLicense && (
        <div className="folder-selection-section">
          <label>
            Folder (Optional):
            <div className="folder-input-group">
              <select
                value={selectedFolderId || ''}
                onChange={(e) => setSelectedFolderId(e.target.value || null)}
                className="folder-select"
              >
                <option value="">No folder</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    📁 {folder.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCreateFolder(!showCreateFolder)}
                className="create-folder-btn"
              >
                +
              </button>
            </div>
          </label>
          
          {showCreateFolder && (
            <div className="create-folder-input">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                className="folder-name-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createFolder();
                  }
                }}
              />
              <button
                type="button"
                onClick={createFolder}
                disabled={!newFolderName.trim()}
                className="confirm-folder-btn"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                className="cancel-folder-btn"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Generation Section */}
      {!content && (
        <div className={`ai-generation-section ${!hasProLicense ? 'locked-section' : ''}`}>
          <h3>
            <Sparkles size={16} /> 
            Generate with AI 
            {!hasProLicense && <Crown size={14} className="pro-icon" />}
          </h3>
          {!hasProLicense ? (
            <div className="locked-content">
              <div className="lock-message">
                <Lock size={24} className="lock-icon" />
                <p>AI generation is a PRO feature</p>
                <button onClick={showUpgradeAlert} className="upgrade-btn">
                  <Crown size={16} />
                  Upgrade to PRO
                </button>
              </div>
            </div>
          ) : (
            <div className="generation-input">
              <textarea
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                placeholder="Describe the prompt you want to generate (e.g., 'Create a prompt for code review that focuses on security and performance')"
                className="generation-textarea"
                rows={3}
              />
              <button 
                onClick={generateFromDescription}
                disabled={isGenerating || !generationPrompt.trim()}
                className="generate-btn"
              >
                {isGenerating ? <Loader2 size={16} className="spinner" /> : <Sparkles size={16} />}
                {isGenerating ? 'Generating...' : 'Generate Prompt'}
              </button>
            </div>
          )}
        </div>
      )}

      <label>
        Content:
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="editor-textarea"
          rows={8}
        />
      </label>

      {/* AI Enhancement Section */}
      {content && (
        <div className={`ai-enhancement-section ${!hasProLicense ? 'locked-section' : ''}`}>
          <h3>
            <Wand2 size={16} /> 
            Enhance with AI 
            {!hasProLicense && <Crown size={14} className="pro-icon" />}
          </h3>
          {!hasProLicense ? (
            <div className="locked-content">
              <div className="lock-message">
                <Lock size={24} className="lock-icon" />
                <p>AI enhancement is a PRO feature</p>
                <button onClick={showUpgradeAlert} className="upgrade-btn">
                  <Crown size={16} />
                  Upgrade to PRO
                </button>
              </div>
            </div>
          ) : (
            <div className="enhancement-input">
              <input
                type="text"
                value={enhancementRequest}
                onChange={(e) => setEnhancementRequest(e.target.value)}
                placeholder="How should this prompt be improved? (e.g., 'make it more specific', 'add error handling focus', 'make it shorter')"
                className="enhancement-text-input"
              />
              <button 
                onClick={enhancePrompt}
                disabled={isEnhancing || !enhancementRequest.trim()}
                className="enhance-btn"
              >
                {isEnhancing ? <Loader2 size={16} className="spinner" /> : <Wand2 size={16} />}
                {isEnhancing ? 'Enhancing...' : 'Enhance'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="editor-buttons">
        <button onClick={save} className="save-btn">Save</button>
        <button onClick={cancel} className="cancel-btn">Cancel</button>
      </div>
    </div>
  );
}

export default PromptEditor; 