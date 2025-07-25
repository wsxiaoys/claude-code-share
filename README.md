# Claude-code-history-To-Ai-SDK-Parser

Claude code history should be located at your users .claude/projects/

Claude code tools: https://docs.anthropic.com/en/docs/claude-code/settings#tools-available-to-claude

## Get started

1. bun install

### CLI

2. cd HistoryParser

3. bun run index.ts <Your Claude Code History .jsonl> or bun run index.ts example.jsonl

4. Check the result in output

5. bun run test (check if the result format match UIMessage in AI SDK)

### Web page (This give better chat view)

2. cd demo

3. bun run dev

## Project Structure

/demo is the frontend demo page to quickly view the result with ai sdk ui.

/HistoryParser has the script HistoryParser.ts which pass the file.
