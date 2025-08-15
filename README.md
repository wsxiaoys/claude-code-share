# claude-code-share

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000?style=flat&logo=bun&logoColor=white)](https://bun.sh)

Transform your Claude Code conversations into beautiful, shareable links.

# Usage

`npx claude-code-share`

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
