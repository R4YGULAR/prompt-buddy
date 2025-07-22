# Prompt Buddy
**Languages | 语言**: [English](README.md) | [简体中文](README.zh-CN.md)

A lightweight, always-on-top desktop app for quickly accessing and managing your most-used prompts for **AI coding assistants** like Cursor, VS Code with Copilot, Claude Code, Tabnine, and more. Built with [Tauri v2](https://v2.tauri.app/), React and TypeScript for a fast, truly native feel and near-zero resource overhead.

> **Heads-up ⚠️**
> Windows builds are *not* available *yet*. At the moment Prompt Picker officially supports **macOS (13 Ventura or later)** only. Linux and Windows support are planned but not yet available.

---

## ✨ Features

### 🆓 Free Features
- **Liquid-glass UI** – Gorgeous transparent design that blends into macOS.
- **Always on Top** – Keep your favourite prompts one click away while you code.
- **One-Click Copy** – Tap any prompt to instantly copy it to your clipboard.
- **Basic Customization** – Add up to 5 custom prompts (11 total including defaults).
- **Dark-Mode Aware** – Adapts to your system appearance.
- **Tiny Footprint** – Powered by Tauri – starts fast and uses little RAM.

### 👑 PRO Features
- **Unlimited Prompts** – Create as many custom prompts as you need.
- **AI Prompt Generation** – Create new prompts from natural language descriptions.
- **AI Prompt Enhancement** – Intelligently improve existing prompts with specific requests.
- **Powered by Kimi 32B** – Advanced AI model for high-quality prompt optimization.

---

## 📦 Installation (macOS)

> **Important for Downloaded Builds ⚠️**
> 
> If you downloaded a pre-built app and see "Prompt Buddy is damaged and can't be opened", this is a macOS security feature. The app isn't actually damaged - it just needs to be allowed to run:
> 
> **Option 1: Right-click method**
> 1. Right-click the app and select "Open" 
> 2. Click "Open" in the dialog that appears
> 
> **Option 2: System Settings**
> 1. Go to **System Settings** → **Privacy & Security**
> 2. Look for a message about "Prompt Buddy" and click **"Open Anyway"**
> 
> **Option 3: Terminal method**
> ```bash
> # Replace with your actual app location, typically one of:
> # /Applications/Prompt Buddy.app
> # ~/Downloads/Prompt Buddy.app  
> # ~/Desktop/Prompt Buddy.app
> 
> xattr -cr "/Applications/Prompt Buddy.app"
> ```

### 1 · Prerequisites

- **Node ≥ 18**
- **Rust (stable)** – `rustup install stable`
- **Xcode Command-Line Tools** – `xcode-select --install`

### 2 · Clone & Install

```bash
# clone the repo
git clone https://github.com/R4YGULAR/prompt-buddy.git
cd prompt-buddy

# install JavaScript dependencies
npm install

# (Optional) Set up AI features for PRO users - copy the example env file
cp .env.example .env
# Then edit .env and add your OpenRouter API key
```

### 3 · Run in Development

```bash
npm run tauri dev
```

The window will appear and hot-reload on changes.

### 4 · Build a Release DMG

```bash
npm run tauri build
```

The signed DMG can be found under `src-tauri/target/release/bundle/dmg`.

---

## ▶️ Usage

1. **Launch the app** – The small floating window stays in front of everything.
2. **Click a prompt** – It is copied to your clipboard instantly.
3. **Manage prompts** – Use the ✏️ / ➕ / ✕ icons to edit, create or delete.
4. **AI Enhancement** – In the prompt editor, use "Generate with AI" or "Enhance with AI" features.
5. **Reset defaults** – Open **Settings → Reset to defaults**.

### 👑 PRO License & AI Features

To unlock AI-powered features:

1. **Get a PRO License**: Contact us for licensing information
2. **Activate License**: Enter your license key in Settings → License Status
3. **Set up OpenRouter** (for developers):
   - Get an API key from [OpenRouter](https://openrouter.ai/keys)  
   - Add it to your `.env` file: `VITE_OPENROUTER_API_KEY=sk-or-v1-your-api-key-here`
   - Restart the app

**Demo Keys**: Use "Generate Demo Key" in settings to try PRO features for free!

---

## 🖥️ Platform Support

- ✅ macOS 13 +
- 🟡 Windows (coming soon)
- 🚧 Linux (coming soon)

---

## 🛠 Development

### Desktop App
Prompt Buddy desktop is built with:

- [Tauri v2](https://v2.tauri.app/) – cross-platform desktop framework
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Lucide React](https://lucide.dev/) – pixel-perfect icons

### Web App
The SaaS platform is built with:

- [Next.js 15](https://nextjs.org/) – React framework with App Router
- [Supabase](https://supabase.com/) – Database, Auth, and Backend
- [Tailwind CSS](https://tailwindcss.com/) – Styling
- [Stripe](https://stripe.com/) – Payment processing

#### Getting Started with Web App
```bash
cd webapp
npm install
cp .env.example .env.local
# Add your Supabase credentials to .env.local
npm run dev
```

See `webapp/SETUP.md` for detailed setup instructions.

---

## 🤝 Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📝 License

Prompt Picker is released under the [GNU Affero General Public License v3.0](LICENSE).
