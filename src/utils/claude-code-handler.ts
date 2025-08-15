import fs from "node:fs";
import type { UIMessage } from "ai";
import * as converters from "@/converters";
import { findClaudeConversations, uploadToPochi } from "./index.js";

/**
 * Handles Claude Code environment detection and automatic share link generation
 * @returns Promise<boolean> - Returns true if handled, false if should continue with normal flow
 */
export async function handleClaudeCodeEnvironment(): Promise<boolean> {
  // Check if running in Claude Code environment
  if (process.env.CLAUDECODE !== '1') {
    return false;
  }

  const conversations = findClaudeConversations();
  
  if (conversations.length === 0) {
    console.log("❌ No Claude Code conversations found.");
    process.exit(1);
  }
  
  // Get the latest conversation (first in sorted array)
  const latestConv = conversations[0];
  if (!latestConv) {
    console.log("❌ No valid conversation found.");
    process.exit(1);
  }
  
  const content = fs.readFileSync(latestConv.path, "utf-8");
  const messages = converters.claude.convert(content);
  
  // Generate share link
  const shareLink = await uploadToPochi(messages);
  
  // Extract sessionId from the conversation file
  const sessionId = extractSessionId(content);
  
  // Save share link to /tmp with sessionId as filename
  const tmpFilePath = `/tmp/${sessionId}`;
  fs.writeFileSync(tmpFilePath, shareLink);
  
  console.log("\n🎉 Success!");
  console.log(`📎 Share link: ${shareLink}`);
  console.log(`💾 Link saved to: ${tmpFilePath}`);
  
  return true;
}

/**
 * Extracts sessionId from conversation content
 * @param content - The conversation file content
 * @returns The sessionId or "unknown" if not found
 */
function extractSessionId(content: string): string {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.sessionId) {
          return parsed.sessionId;
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error("Error extracting sessionId:", error);
  }
  return "unknown";
}