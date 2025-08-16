#!/usr/bin/env bun

import fs from "node:fs";
import type { UIMessage } from "ai";
import { Command } from "commander";
import {
  selectConversation,
  uploadToPochi,
  getContent,
  handleClaudeCodeEnvironment,
} from "./utils/index.js";
import { getProvider, providers } from "@/providers/index.js";
import type { ConversationFile } from "@/types.js";
import { processStatusline } from "./statusline/statusline.js";

const program = new Command();

program
  .name("claude-code-share")
  .description(
    "Transform your Claude Code conversations into beautiful, shareable links."
  )
  .version("1.0.0");

// Main command for generating share links
program
  .argument(
    "[file]",
    "The path to the history file. Reads from stdin if not provided."
  )
  .option(
    "-p, --provider <name>",
    "Specify the provider (e.g., claude, gemini)"
  )
  .action(async (filePath, opts) => {
    // Resolve provider with friendly error handling
    let provider;
    try {
      provider = getProvider(opts?.provider);
    } catch (err) {
      const available = Object.keys(providers).join(", ");
      console.error(`❌ ${String(err)}. Available providers: ${available}`);
      process.exit(1);
    }

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
      let conversations: ConversationFile[] = [];

      if (opts?.provider) {
        // If a provider is specified, use its scanner
        conversations = provider.scanner?.findConversations() || [];
      } else {
        // No provider specified: aggregate conversations from all registered providers
        for (const p of Object.values(providers)) {
          const list = p.scanner?.findConversations() || [];
          if (list.length > 0) conversations.push(...list);
        }
      }

      if (!conversations || conversations.length === 0) {
        const label = opts?.provider
          ? getProvider(opts.provider).displayName
          : "any supported";
        console.log(`❌ No ${label} conversations found.`);
        process.exit(1);
      }

      const selectedConv = await selectConversation(conversations);
      content = fs.readFileSync(selectedConv.path, "utf-8");

      // Choose converter based on selected conversation's provider when not explicitly specified
      const convProviderName = selectedConv.provider || provider.name;
      const convProvider = getProvider(convProviderName);
      messages = convProvider.converter.convert(content);
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
          (error as Error).message
        );
        process.exit(1);
      }
    });
  });

program.parse(process.argv);
