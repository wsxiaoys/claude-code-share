# claude-code-share

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000?style=flat&logo=bun&logoColor=white)](https://bun.sh)

Transform your Claude Code conversations into beautiful, shareable links.

## Quick Start

Run with npx (no install required):

- Interactive mode (scans your local conversations and lets you pick one)

  - `npx claude-code-share`
  - or the short alias: `npx ccs`

- Show help
  - `npx claude-code-share --help`

## Providers

This tool supports multiple providers via the `--provider` option. Currently available:

- `claude` (default)
- `gemini` (experimental placeholder)

If you do not specify `--provider`, by default is claude code

## Where conversations are scanned from

- Claude: `~/.claude/projects` (each project folder contains one or more `.jsonl` history files)

If no conversations are found for your chosen provider, you’ll see a friendly message and the program will exit.

## Usage Examples

- Interactive selector across all providers

  - `npx claude-code-share`

- Interactive selector for a specific provider

  - `npx claude-code-share -p claude`
  - `npx claude-code-share -p gemini`

- Convert a specific history file

  - `npx claude-code-share path/to/history.jsonl` (uses the default provider: `claude`)
  - `npx claude-code-share -p claude path/to/history.jsonl`

- Pipe from stdin
  - `cat path/to/history.jsonl | npx claude-code-share -p claude`

After conversion, the CLI uploads the conversation to Pochi and prints a shareable link.

## Contributing: Add a new provider

The project is structured so providers are self-contained. To add a new provider, follow these steps:

- Files and folders to look at

  - `src/types.ts`
    - Implement the Provider interfaces
      - `Provider`: name, displayName, converter, scanner
      - `ProviderConverter`: convert(content)
      - `ProviderScanner`: findConversations(), isInstalled(), getDefaultPath(), extractFirstMessage?(optional)
  - `src/providers/`
    - Create a new file `src/providers/<provider-name>.ts`
    - Export a `<providerName>Provider: Provider` object
    - Example references:
      - `src/providers/claude.ts` (full scanner + converter wiring)
      - `src/providers/index.ts` (registry and getProvider)
  - `src/converters/`
    - Implement your provider’s converter under `src/converters/<provider-name>/`
    - Export it via `src/converters/index.ts` if needed, or import directly in your provider module

- Steps

  1. Implement the scanner in `src/providers/<provider-name>.ts`
     - Provide `findConversations()` to return `ConversationFile[]`
     - Put any provider-specific discovery (paths, parsing, first message extraction) here
  2. Implement the converter for the provider’s history format
     - The converter returns `UIMessage[]` to be uploaded
  3. Register your provider
     - Add it to `src/providers/index.ts` in the `providers` map
  4. Run and test
     - `bun run build`
     - `node dist/cli.js -p <provider-name>`

- Notes
  - The `extractFirstMessage` method on `ProviderScanner` is optional. Implement if you want a preview string for the TUI list.
  - Set the `provider` field on each `ConversationFile` so the CLI can route to the correct converter when the user selects a conversation.
  - Avoid placing provider-specific code in `src/utils`. Keep scanning logic inside the provider file.
    `npx claude-code-share`

you can use command in claude code type ! npx claude-code-share it will return you the share link for current conversation

# Claude code Status line setup

    First option:
    1. in claude code type this

    /statusline setup "npx claude-code-share statusline"

    2. restart claude code

    3. done


    Second option:
    1. To setup the status line, you need to add the following to your `~/.claude/settings.json` file:

    ```json
    {
      "statusLine": {
        "type": "command",
        "command": "npx claude-code-share statusline"
      }
    }
    ```
