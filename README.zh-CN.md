# Prompt Buddy

**Languages | 语言**: [English](README.md) | [简体中文](README.zh-CN.md)

一个轻量级、始终置顶的桌面应用，可让你快速访问和管理在 **AI 编码助手**中常用的提示词（Prompt），支持 Cursor、VS Code with Copilot、Claude Code、Tabnine 等各种编码工具。采用 Tauri v2 构建，拥有原生性能表现与优雅的亚克力玻璃 UI 效果。

> **下载版本重要提示 ⚠️**
> 
> 如果您下载了预构建版本，在 macOS 上看到"Prompt Buddy 已损坏，无法打开"的提示，这并非应用真的损坏，而是 macOS 的安全机制。您可以通过以下方式允许运行：
> 
> **方法一：右键打开**
> 1. 右键点击应用，选择"打开"
> 2. 在弹出的对话框中点击"打开"
> 
> **方法二：系统设置**
> 1. 前往 **系统设置** → **隐私与安全性**
> 2. 找到关于"Prompt Buddy"的消息，点击 **"仍要打开"**
> 
> **方法三：终端命令**
> ```bash
> # 将路径替换为实际的应用位置，通常在以下位置之一：
> # /Applications/Prompt Buddy.app
> # ~/Downloads/Prompt Buddy.app
> # ~/Desktop/Prompt Buddy.app
> 
> xattr -cr "/Applications/Prompt Buddy.app"
> ```

## 功能特性

- 🎨 **优雅的亚克力玻璃 UI** - 现代化玻璃拟物设计，与 macOS 和 Windows 的美学深度契合
- 📌 **窗口始终置顶** - 编码时随时取用，绝不错过
- 📋 **一键复制** - 点击任意提示词即可立即复制到剪贴板
- ✏️ **提示词可自定义** - 自由编辑、添加或删除提示词，贴合个人工作流
- 💾 **持久化存储** - 自定义提示词自动保存，无需手动操作
- 🌓 **深色模式** - 自动适配系统浅/深色主题
- 🖱️ **可拖拽窗口** - 随心所欲放置在屏幕任意位置
- 🚀 **极致轻量** - 基于 Tauri，运行时占用资源极低

## 安装说明

### 前置条件

- Node.js（16 及以上）
- Rust（最新版稳定版）
- 平台依赖：
  - **macOS**：Xcode Command Line Tools
  - **Windows**：Microsoft C++ Build Tools

### 源码构建

1. 克隆仓库：

```bash
git clone https://github.com/R4YGULAR/prompt-buddy
cd prompt-buddy
```

2. 安装依赖：

```bash
npm install
```

3. 开发模式运行：

```bash
npm run tauri dev
```

4. 生产环境打包：

```bash
npm run tauri build
```

## 使用指南

1. **启动应用** - 浮动窗口将置顶显示
2. **点击任意提示词** - 内容会立即复制到系统剪贴板
3. **编辑提示词** - 点击编辑按钮（✏️）即可修改
4. **新增提示词** - 点击“Add Prompt”按钮创建自定义条目
5. **删除提示词** - 点击删除按钮（✕）移除无用条目
6. **恢复默认** - 在设置菜单中选择重置

## 默认提示词

应用内置以下常用调试提示词：

- **Debug Root Cause**："请罗列 5-7 个最可能导致该 bug 的根因..."
- **Explain Code**："详细解释这段代码的目的、工作原理..."
- **Refactor**："重构这段代码，使其更具可读性、可维护性..."
- **Write Tests**："为此代码编写全面的单元测试..."

## 自定义

所有提示词均可自由修改，且会在应用重启后自动保持。

## 平台支持

- ✅ macOS（10.15+）
- ✅ Windows（10/11）
- 🚧 Linux（即将到来）

## 开发栈

本应用主要技术栈：

- [Tauri v2](https://v2.tauri.app/) - 原生应用框架
- React + TypeScript - 前端 UI
- Lucide React - 图标库

## 许可证

本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)**。您可以自由使用、修改及分发，但须遵守 AGPL 条款。 
