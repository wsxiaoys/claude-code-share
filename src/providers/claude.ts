import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { claude as claudeConverter } from "@/converters/claude/index.js";
import type { ConversationFile, Provider, ProviderScanner } from "@/types.js";

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
      (a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime(),
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
            let message: string;

            if (typeof parsed.message.content === "string") {
              message = parsed.message.content;
            } else if (Array.isArray(parsed.message.content)) {
              // Handle array format: [{ "type": "text", "text": "hello" }]
              const textContent = parsed.message.content
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
              message = textContent || JSON.stringify(parsed.message.content);
            } else {
              message = JSON.stringify(parsed.message.content);
            }

            return message.length > 100
              ? `${message.substring(0, 100)}...`
              : message;
          }
        } catch {}
      }
    } catch {
      // File read error
    }
    return undefined;
  }
}

export const claude: Provider = {
  id: "claude",
  displayName: "Claude Code",
  converter: claudeConverter,
  scanner: new ClaudeScanner(),
};
