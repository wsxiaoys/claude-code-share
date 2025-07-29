import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ConversationFile } from "../types.js";

/**
 * Extracts the first user message from a conversation file
 * @param filePath Path to the JSONL file
 * @returns First user message content or undefined if not found
 */
function extractFirstMessage(filePath: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'user' && parsed.message?.content) {
          // Truncate long messages for display
          const message = typeof parsed.message.content === 'string' 
            ? parsed.message.content 
            : JSON.stringify(parsed.message.content);
          return message.length > 100 ? message.substring(0, 100) + '...' : message;
        }
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }
  } catch {
    // File read error, return undefined
  }
  return undefined;
}

/**
 * Scans the Claude projects directory for conversation files
 * @returns Array of conversation files sorted by modification time (newest first)
 */
export function findClaudeConversations(): ConversationFile[] {
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
          const firstMessage = extractFirstMessage(filePath);
          
          conversations.push({
            path: filePath,
            projectName,
            fileName,
            modifiedTime: stats.mtime,
            firstMessage
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

/**
 * Formats a date for display
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}