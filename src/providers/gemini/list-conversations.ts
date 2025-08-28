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
      const logsFile = path.join(projectPath, "logs.json");

      // Look for checkpoint files in the project directory
      const files = fs.readdirSync(projectPath);
      const checkpointFiles = files.filter(
        (file) => file.startsWith("checkpoint-") && file.endsWith(".json"),
      );

      if (checkpointFiles.length > 0) {
        // Process each checkpoint file as a separate conversation
        const checkpointData = checkpointFiles
          .map((file) => ({
            name: file,
            path: path.join(projectPath, file),
            stats: fs.statSync(path.join(projectPath, file)),
          }))
          .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

        for (const checkpoint of checkpointData) {
          const title =
            extractSecondMessage(checkpoint.path) ||
            extractTitleFromLogs(logsFile) ||
            checkpoint.name.replace("checkpoint-", "").replace(".json", "");

          conversations.push({
            path: checkpoint.path,
            mtime: checkpoint.stats.mtime,
            title: title,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error scanning Gemini projects:", error);
    return [];
  }

  // Sort by modification time (newest first)
  return conversations.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

function extractTitleFromLogs(logsFilePath: string): string | undefined {
  try {
    if (!fs.existsSync(logsFilePath)) {
      return undefined;
    }

    const content = fs.readFileSync(logsFilePath, "utf-8");
    const logs = JSON.parse(content);

    if (Array.isArray(logs) && logs.length > 0) {
      // Find the first user message that's not a command
      const firstUserMessage = logs.find(
        (log) =>
          log.type === "user" &&
          log.message &&
          !log.message.startsWith("/chat"),
      );

      if (firstUserMessage && firstUserMessage.message) {
        const message = firstUserMessage.message;
        return message.length > 50 ? `${message.substring(0, 50)}...` : message;
      }
    }
  } catch {
    // File read or parse error
  }
  return undefined;
}

function extractSecondMessage(filePath: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    // Handle Gemini checkpoint format with role/parts structure
    if (Array.isArray(data)) {
      let userMessageCount = 0;
      for (const message of data) {
        if (
          message.role === "user" &&
          message.parts &&
          Array.isArray(message.parts)
        ) {
          userMessageCount++;
          // Skip the first user message (default message) and get the second one
          if (userMessageCount === 2) {
            const textParts = message.parts
              .filter((part: any) => part.text && typeof part.text === "string")
              .map((part: any) => part.text)
              .join(" ");

            if (textParts) {
              return textParts.length > 50
                ? `${textParts.substring(0, 50)}...`
                : textParts;
            }
          }
        }
      }
    }

    // Fallback: look for any text content in the conversation
    if (typeof data === "object" && data !== null) {
      const jsonString = JSON.stringify(data);
      if (jsonString.length > 50) {
        return `${jsonString.substring(0, 50)}...`;
      }
      return jsonString;
    }
  } catch {
    // File read or parse error
  }
  return undefined;
}

function extractFirstMessage(filePath: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    // Handle Gemini checkpoint format with role/parts structure
    if (Array.isArray(data)) {
      for (const message of data) {
        if (
          message.role === "user" &&
          message.parts &&
          Array.isArray(message.parts)
        ) {
          const textParts = message.parts
            .filter((part: any) => part.text && typeof part.text === "string")
            .map((part: any) => part.text)
            .join(" ");

          if (textParts) {
            return textParts.length > 50
              ? `${textParts.substring(0, 50)}...`
              : textParts;
          }
        }
      }
    }

    // Fallback: look for any text content in the conversation
    if (typeof data === "object" && data !== null) {
      const jsonString = JSON.stringify(data);
      if (jsonString.length > 50) {
        return `${jsonString.substring(0, 50)}...`;
      }
      return jsonString;
    }
  } catch {
    // File read or parse error
  }
  return undefined;
}
