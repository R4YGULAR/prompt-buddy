# Prompt Picker
**Languages | 语言**: [English](README.md) | [简体中文](README.zh-CN.md)

A lightweight, always-on-top desktop app for quickly accessing and managing your most-used prompts for **Cursor**. Built with [Tauri v2](https://v2.tauri.app/), React and TypeScript for a fast, truly native feel and near-zero resource overhead.

> **Heads-up ⚠️**
> Windows builds are *not* available *yet*. At the moment Prompt Picker officially supports **macOS (13 Ventura or later)** only. Linux and Windows support are planned but not yet available.

---

## ✨ Features

- **Liquid-glass UI** – Gorgeous transparent design that blends into macOS.
- **Always on Top** – Keep your favourite prompts one click away while you code.
- **One-Click Copy** – Tap any prompt to instantly copy it to your clipboard.
- **Fully Customisable** – Add, edit or delete prompts; they persist automatically.
- **Dark-Mode Aware** – Adapts to your system appearance.
- **Tiny Footprint** – Powered by Tauri – starts fast and uses little RAM.

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
git clone https://github.com/<your-org>/prompt-buddy.git
cd prompt-buddy

# install JavaScript dependencies
npm install
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
4. **Reset defaults** – Open **Settings → Reset to defaults**.

---

## 🖥️ Platform Support

- ✅ macOS 13 +
- 🟡 Windows (coming soon)
- 🚧 Linux (coming soon)

---

## 🛠 Development

Prompt Picker is built with:

- [Tauri v2](https://v2.tauri.app/) – cross-platform desktop framework
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Lucide React](https://lucide.dev/) – pixel-perfect icons

---

## 🤝 Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📝 License

Prompt Picker is released under the [GNU Affero General Public License v3.0](LICENSE).
