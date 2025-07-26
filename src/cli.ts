#!/usr/bin/env bun

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { UIMessage } from "ai";
import { Command } from "commander";
import * as converters from "@/converters";
import type { ConversationFile } from "./types.js";

const program = new Command();

async function getContent(filePath?: string): Promise<string> {
  if (filePath) {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      console.error(`Error reading file: ${filePath}`, error);
      process.exit(1);
    }
  }
  // Read from stdin
  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk as Buffer));
    process.stdin.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8")),
    );
  });
}

function findClaudeConversations(): ConversationFile[] {
  const claudeDir = path.join(os.homedir(), ".claude", "projects");
  
  if (!fs.existsSync(claudeDir)) {
    console.log("❌ Claude projects directory not found at ~/.claude/projects/");
    console.log("Make sure you have Claude Code installed and have created some projects.");
    process.exit(1);
  }

  const conversations: ConversationFile[] = [];
  
  try {
    const projectDirs = fs.readdirSync(claudeDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const projectName of projectDirs) {
      const projectPath = path.join(claudeDir, projectName);
      const files = fs.readdirSync(projectPath);
      
      for (const fileName of files) {
        if (fileName.endsWith(".jsonl")) {
          const filePath = path.join(projectPath, fileName);
          const stats = fs.statSync(filePath);
          
          conversations.push({
            path: filePath,
            projectName,
            fileName,
            modifiedTime: stats.mtime
          });
        }
      }
    }
  } catch (error) {
    console.error("Error scanning Claude projects:", error);
    process.exit(1);
  }

  // Sort by modification time (newest first)
  return conversations.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());
}

function formatDate(date: Date): string {
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

async function selectConversation(conversations: ConversationFile[]): Promise<ConversationFile> {
  console.log("\n📋 Recent Claude Code conversations:");
  console.log("=".repeat(60));
  
  conversations.slice(0, 10).forEach((conv, index) => {
    console.log(`${index + 1}. ${conv.projectName}/${conv.fileName}`);
    console.log(`   Last modified: ${formatDate(conv.modifiedTime)}`);
    console.log("");
  });
  
  return new Promise((resolve) => {
    process.stdout.write("Select a conversation (1-10) or press Enter for the most recent: ");
    
    // Check if stdin is a TTY (interactive terminal)
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      let input = "";
      
      process.stdin.on('data', (key) => {
        const keyStr = key.toString();
        if (keyStr === '\r' || keyStr === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          
          const selection = input.trim() || "1";
          const index = parseInt(selection) - 1;
          
          if (index >= 0 && index < Math.min(conversations.length, 10) && conversations[index]) {
            console.log(`\n✅ Selected: ${conversations[index].projectName}/${conversations[index].fileName}`);
            resolve(conversations[index]);
          } else {
            console.log(`\n❌ Invalid selection. Using most recent conversation.`);
            if (conversations[0]) {
              resolve(conversations[0]);
            } else {
              console.error("No conversations available.");
              process.exit(1);
            }
          }
        } else if (keyStr === '\u0003') { // Ctrl+C
          process.exit(0);
        } else if (keyStr >= '0' && keyStr <= '9') {
          input += keyStr;
          process.stdout.write(keyStr);
        } else if (keyStr === '\u007f') { // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        }
      });
    } else {
      // Non-interactive mode (piped input), use most recent
      console.log("\n✅ Using most recent conversation (non-interactive mode)");
      if (conversations[0]) {
        resolve(conversations[0]);
      } else {
        console.error("No conversations available.");
        process.exit(1);
      }
    }
  });
}

async function uploadToPochi(messages: UIMessage[]): Promise<string> {
  const payload = {
    data: { messages }
  };
  
  try {
    console.log("\n🚀 Uploading to Pochi...");
    
    const response = await fetch("https://app.getpochi.com/api/clips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json() as { id?: string };
    
    if (result.id) {
      return `https://app.getpochi.com/clip/${result.id}`;
    } else {
      throw new Error("No clip ID returned from API");
    }
  } catch (error) {
    console.error("❌ Failed to upload to Pochi:", error);
    process.exit(1);
  }
}

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
