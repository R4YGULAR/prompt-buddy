import { useState, useEffect } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

interface Prompt {
  id: string;
  title: string;
  content: string;
  color: string;
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

  useEffect(() => {
    console.log('PromptEditor useEffect, index:', index);
    const load = async () => {
      try {
        console.log('Starting load');
        const store = await Store.load('prompts.json');
        console.log('Store loaded');
        let saved = await store.get<Prompt[]>('prompts') || [];
        console.log('Got saved prompts:', saved);
        if (saved.length === 0) saved = DEFAULT_PROMPTS;
        if (index >= 0 && index < saved.length) {
          const p = saved[index];
          setPrompt(p);
          setTitle(p.title);
          setContent(p.content);
        } else if (index === -1) {
          const defaultColor = 'from-blue-500 to-cyan-500';
          const tempPrompt = {id: '', title: '', content: '', color: defaultColor};
          setPrompt(tempPrompt);
          setTitle('');
          setContent('');
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
        saved[index] = { ...prompt, title: title.trim(), content: content.trim() };
      } else if (index === -1) {
        console.log('➕ Adding new prompt');
        const newId = (saved.length + 1).toString();
        const newPrompt = { 
          id: newId, 
          title: title.trim(), 
          content: content.trim(), 
          color: prompt.color 
        };
        console.log('🆕 New prompt object:', newPrompt);
        saved.push(newPrompt);
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
      <label>
        Content:
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="editor-textarea"
          rows={5}
        />
      </label>
      <div className="editor-buttons">
        <button onClick={save} className="save-btn">Save</button>
        <button onClick={cancel} className="cancel-btn">Cancel</button>
      </div>
    </div>
  );
}

export default PromptEditor; 