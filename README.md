# Claude Code Share

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000?style=flat&logo=bun&logoColor=white)](https://bun.sh)

**Transform your Claude Code conversations into beautiful, shareable links.**

`claude-code-share` is a command-line tool that makes it easy to share your conversations from Claude Code with others. It provides a simple, interactive interface to select a conversation and generates a short, shareable link that you can send to anyone.

## ✨ Features

- **Interactive Conversation Selector**: A beautiful, terminal-based UI to browse and select your recent Claude Code conversations.
- **Shareable Links**: Generates short, clean URLs for your conversations using [Pochi](https://getpochi.com) renderers, which will be open-sourced soon.
- **Status Line Integration**: Display a share link directly in your Claude Code status line.

### Usage

There are several ways to use `claude-code-share`:

#### Interactive Mode

This is the easiest way to get started. Simply run the following command in your terminal:

```bash
npx claude-code-share
```

This will open an interactive menu where you can select the conversation you want to share.

> **Note**: You can also use the short alias `npx ccs`.

#### Sharing from a File

If you have a conversation saved to a file, you can share it directly:

```bash
npx claude-code-share /path/to/your/conversation.jsonl
```

#### Using Stdin

You can also pipe the contents of a conversation file into the tool:

```bash
cat /path/to/your/conversation.jsonl | npx claude-code-share
```

This is particularly useful for scripting and automation.

#### Status Line Integration

You can display a share link directly in your Claude Code status line for quick access. To set this up, run the following command within Claude Code:

```
/statusline setup "npx claude-code-share statusline"
```

After running the command, restart Claude Code, and you will see a share link in the status line, whenever you run `! npx claude-code-share` in the chat, the status line will be updated with the new share link.

## 🤝 How to Contribute

We welcome contributions from the community! Whether you're fixing a bug, adding a new feature, or improving the documentation, your help is greatly appreciated.

### Getting Started

To get started with development, you'll need to have [Bun](https://bun.sh/) installed.

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/wsxiaoys/claude-code-share.git
    cd claude-code-share
    ```

2.  **Install dependencies**:

    ```bash
    bun install
    ```

3.  **Run the command**:

    You can run the tool directly from the source code using Bun:

    ```bash
    bun src/cli.ts
    ```

### Adding a New Provider

The project is structured to make it easy to add new providers (e.g gemini, opencode). To add a new provider, create a directory for the provider in `src/providers/` and implement the required interfaces (see `src/providers/claude` as references).
