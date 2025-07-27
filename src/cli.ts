#!/usr/bin/env bun

import fs from "node:fs";
import type { UIMessage } from "ai";
import { Command } from "commander";
import * as converters from "@/converters";
import { 
  findClaudeConversations, 
  selectConversation, 
  uploadToPochi, 
  getContent 
} from "./utils/index.js";

const program = new Command();

program
  .name("claude-code-share")
  .description(
    "Transform your Claude Code conversations into beautiful, shareable links.",
  )
  .version("1.0.0")
  .argument(
    "[file]",
    "The path to the history file. Reads from stdin if not provided.",
  )
  .action(async (filePath) => {
    let content: string;
    let messages: UIMessage[];
    
    if (filePath) {
      // Process specific file or stdin
      content = await getContent(filePath);
      messages = converters.claude.convert(content);
    } else if (!process.stdin.isTTY) {
      // Handle piped input (e.g., npx claude-code-share < file.jsonl)
      content = await getContent(); // Read from stdin
      messages = converters.claude.convert(content);
    } else {
      // Interactive mode: scan for Claude conversations
      const conversations = findClaudeConversations();
      
      if (conversations.length === 0) {
        console.log("❌ No Claude Code conversations found.");
        process.exit(1);
      }
      
      const selectedConv = await selectConversation(conversations);
      content = fs.readFileSync(selectedConv.path, "utf-8");
      messages = converters.claude.convert(content);
    }
    
    // Always provide share link
    const shareLink = await uploadToPochi(messages);
    
    console.log("\n🎉 Success!");
    console.log(`📎 Share link: ${shareLink}`);
  });

program.parse(process.argv);
