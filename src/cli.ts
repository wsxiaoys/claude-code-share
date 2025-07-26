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
    if (filePath) {
      // Original behavior: process specific file
      const content = await getContent(filePath);
      const messages: UIMessage[] = converters.claude.convert(content);
      console.log(JSON.stringify(messages, null, 2));
    } else {
      // New behavior: interactive mode
      const conversations = findClaudeConversations();
      
      if (conversations.length === 0) {
        console.log("❌ No Claude Code conversations found.");
        process.exit(1);
      }
      
      const selectedConv = await selectConversation(conversations);
      const content = fs.readFileSync(selectedConv.path, "utf-8");
      const messages: UIMessage[] = converters.claude.convert(content);
      
      const shareLink = await uploadToPochi(messages);
      
      console.log("\n🎉 Success!");
      console.log(`📎 Share link: ${shareLink}`);
    }
  });

program.parse(process.argv);
