import os from "node:os"
import fs from "node:fs";
import path from "node:path";
import { claude } from "@/providers/claude";
import { uploadToPochi } from "./pochi-api";

export function isRunningInClaudeCode(): boolean {
  return process.env.CLAUDECODE === "1";
}

/**
 * Handles Claude Code environment detection and automatic share link generation
 * @returns Promise<boolean> - Returns true if handled, false if should continue with normal flow
 */
export async function shareActiveConversation(): Promise<void> {
  const { conversations } = claude;

  if (conversations.length === 0) {
    console.log("❌ No Claude Code conversations found.");
    process.exit(1);
  }

  // Get the latest conversation (first in sorted array)
  const conv = conversations[0];
  if (!conv) {
    console.log("❌ No valid conversation found.");
    process.exit(1);
  }

  const content = fs.readFileSync(conv.path, "utf-8");
  const messages = claude.convertToMessages(content);

  // Generate share link
  const shareLink = await uploadToPochi(messages, claude.id);

  // Extract sessionId from the conversation file
  const sessionId = extractSessionId(content);

  // Save share link to /tmp with sessionId as filename
  const tmpFilePath = path.join(os.tmpdir(), "ccs", sessionId);
  fs.mkdirSync(path.dirname(tmpFilePath), { recursive: true });
  fs.writeFileSync(tmpFilePath, shareLink);

  console.log("\n🎉 Success!");
  console.log(`📎 Share link: ${shareLink}`);
  console.log(`💾 Link saved to: ${tmpFilePath}`);
}

/**
 * Extracts sessionId from conversation content
 * @param content - The conversation file content
 * @returns The sessionId or "unknown" if not found
 */
function extractSessionId(content: string): string {
  try {
    const lines = content.split("\n").filter((line) => line.trim());
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.sessionId) {
          return parsed.sessionId;
        }
      } catch {}
    }
  } catch (error) {
    console.error("Error extracting sessionId:", error);
  }
  return "unknown-sessionId";
}

function readPochiLinkFromTemp(sessionId: string): string | null {
  try {
    const tempFilePath = path.join(os.tmpdir(), "ccs", sessionId);
    if (fs.existsSync(tempFilePath)) {
      const link = fs.readFileSync(tempFilePath, "utf8").trim();
      return link || null;
    }
    return null;
  } catch (error) {
    console.error(
      "Debug: Failed to read Pochi link from temp file:",
      (error as Error).message,
    );
    return null;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: external data
export async function renderStatusLine(data: any): Promise<void> {
  const model = data.model?.display_name || "Unknown";
  const projectDir = data.workspace?.project_dir || "";
  const _historyPath = data.transcript_path || "";
  const sessionId = data.session_id || "";

  let pochiLink = null;

  // First, try to read cached link from temp file if session_id is available
  if (sessionId) {
    pochiLink = readPochiLinkFromTemp(sessionId);
    if (pochiLink) {
      console.log(`[${model}] 🔗 Share Link: ${pochiLink}`);
      return;
    }
  }

  // If no cached link found, just show file/project info
  if (pochiLink) {
    console.log(`[${model}] 🔗 Share Link: ${pochiLink}`);
  } else if (sessionId && projectDir) {
    const projectName = path.basename(projectDir);
    console.log(`[${model}] 📜 ${sessionId} | 📁 ${projectName}`);
  }
}
