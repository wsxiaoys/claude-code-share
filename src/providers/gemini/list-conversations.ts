import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Conversation } from "@/types.js";

const geminiDir = path.join(os.homedir(), ".gemini", "tmp");
const installed = fs.existsSync(geminiDir);

export function listConversations(): Conversation[] {
  if (!installed) {
    return [];
  }

  const conversations: Conversation[] = [];

  try {
    const projectDirs = fs
      .readdirSync(geminiDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const projectUuid of projectDirs) {
      const projectPath = path.join(geminiDir, projectUuid);
      const conversationFile = path.join(projectPath, "conversation.json");

      if (fs.existsSync(conversationFile)) {
        const stats = fs.statSync(conversationFile);
        const firstMessage = extractFirstMessage(conversationFile);

        conversations.push({
          path: conversationFile,
          mtime: stats.mtime,
          title: firstMessage || "(empty)",
        });
      }
    }
  } catch (error) {
    console.error("Error scanning Gemini projects:", error);
    return [];
  }

  // Sort by modification time (newest first)
  return conversations.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

function extractFirstMessage(filePath: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    // Look for the first user message in the conversation
    if (data.messages && Array.isArray(data.messages)) {
      for (const message of data.messages) {
        if (message.role === "user" && message.content) {
          let messageText: string;

          if (typeof message.content === "string") {
            messageText = message.content;
          } else if (Array.isArray(message.content)) {
            // Handle array format for multimodal content
            const textContent = message.content
              .filter(
                (item: unknown) =>
                  typeof item === "object" &&
                  item !== null &&
                  "type" in item &&
                  "text" in item &&
                  item.type === "text" &&
                  typeof item.text === "string",
              )
              .map((item: { type: string; text: string }) => item.text)
              .join(" ");
            messageText = textContent || JSON.stringify(message.content);
          } else {
            messageText = JSON.stringify(message.content);
          }

          return messageText.length > 100
            ? `${messageText.substring(0, 100)}...`
            : messageText;
        }
      }
    }

    // Fallback: look for any text content in the conversation
    if (typeof data === "object" && data !== null) {
      const jsonString = JSON.stringify(data);
      if (jsonString.length > 100) {
        return `${jsonString.substring(0, 100)}...`;
      }
      return jsonString;
    }
  } catch {
    // File read or parse error
  }
  return undefined;
}
