import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Provider, ProviderScanner, ConversationFile } from "@/types.js";
import { claude as claudeConverter } from "@/converters/claude/index.js";

class ClaudeScanner implements ProviderScanner {
  name = "claude";

  findConversations(): ConversationFile[] {
    const claudeDir = this.getDefaultPath();

    if (!this.isInstalled()) {
      return [];
    }

    const conversations: ConversationFile[] = [];

    try {
      const projectDirs = fs
        .readdirSync(claudeDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      for (const projectName of projectDirs) {
        const projectPath = path.join(claudeDir, projectName);
        const files = fs.readdirSync(projectPath);

        for (const fileName of files) {
          if (fileName.endsWith(".jsonl")) {
            const filePath = path.join(projectPath, fileName);
            const stats = fs.statSync(filePath);
            const firstMessage = this.extractFirstMessage(filePath);

            conversations.push({
              path: filePath,
              projectName,
              fileName,
              modifiedTime: stats.mtime,
              firstMessage,
              provider: this.name,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error scanning Claude projects:", error);
      return [];
    }

    // Sort by modification time (newest first)
    return conversations.sort(
      (a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime()
    );
  }

  isInstalled(): boolean {
    const claudeDir = this.getDefaultPath();
    return fs.existsSync(claudeDir);
  }

  getDefaultPath(): string {
    return path.join(os.homedir(), ".claude", "projects");
  }

  extractFirstMessage(filePath: string): string | undefined {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === "user" && parsed.message?.content) {
            const message =
              typeof parsed.message.content === "string"
                ? parsed.message.content
                : JSON.stringify(parsed.message.content);
            return message.length > 100
              ? message.substring(0, 100) + "..."
              : message;
          }
        } catch {
          continue;
        }
      }
    } catch {
      // File read error
    }
    return undefined;
  }
}

export const claudeProvider: Provider = {
  name: "claude",
  displayName: "Claude Code",
  converter: claudeConverter,
  scanner: new ClaudeScanner(),
};
