#!/usr/bin/env bun

import fs from "node:fs";
import { Command } from "@commander-js/extra-typings";
import type { UIMessage } from "ai";
import { getProvider } from "@/providers/index.js";
import { processStatusline } from "./status-line/status-line.js";
import {
  getContent,
  handleClaudeCodeEnvironment,
  selectConversation,
  uploadToPochi,
} from "./utils/index.js";

const program = new Command();

program
  .name("claude-code-share")
  .description(
    "Transform your Claude Code conversations into beautiful, shareable links.",
  )
  .version("1.0.0");

// Main command for generating share links
program
  .argument(
    "[file]",
    "The path to the history file. Reads from stdin if not provided.",
  )
  .option(
    "-p, --provider <name>",
    "claude",
    "Specify the provider (e.g., claude, gemini)",
  )
  .action(async (filePath, opts) => {
    // Resolve provider with friendly error handling
    const provider = getProvider(opts.provider);

    if (!filePath && (await handleClaudeCodeEnvironment())) {
      return;
    }

    let content: string;
    let messages: UIMessage[];

    if (filePath) {
      // Process specific file or stdin
      content = await getContent(filePath);
      messages = provider.converter.convert(content);
    } else if (!process.stdin.isTTY) {
      // Handle piped input (e.g., npx claude-code-share < file.jsonl)
      content = await getContent(); // Read from stdin
      messages = provider.converter.convert(content);
    } else {
      // Interactive mode
      const conversations = provider.scanner.findConversations();

      if (conversations.length === 0) {
        console.log(`❌ No ${provider.displayName} conversations found.`);
        process.exit(1);
      }

      const selectedConv = await selectConversation(conversations);
      content = fs.readFileSync(selectedConv.path, "utf-8");

      // Choose converter based on selected conversation's provider when not explicitly specified
      messages = provider.converter.convert(content);
    }

    // Always provide share link
    const shareLink = await uploadToPochi(messages);

    console.log("\n🎉 Success!");
    console.log(`📎 Share link: ${shareLink}`);
  });

// Status line subcommand
program
  .command("statusline")
  .description("Generate status line with Pochi share link")
  .action(async () => {
    let input = "";
    process.stdin.setEncoding("utf8");

    process.stdin.on("readable", () => {
      const chunk = process.stdin.read();
      if (chunk !== null) {
        input += chunk;
      }
    });

    process.stdin.on("end", async () => {
      try {
        const data = JSON.parse(input);
        await processStatusline(data);
      } catch (error) {
        console.error(
          "Debug: Failed to parse input JSON:",
          (error as Error).message,
        );
        process.exit(1);
      }
    });
  });

program.parse(process.argv);
