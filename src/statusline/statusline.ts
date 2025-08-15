import fs from "node:fs";
import path from "node:path";
import { claude } from "../converters/claude/index.js";
import { uploadToPochi } from "../utils/pochi-api.js";

function hasConversationContent(historyPath: string): boolean {
  try {
    if (!fs.existsSync(historyPath)) {
      return false;
    }

    const stats = fs.statSync(historyPath);
    if (stats.size === 0) {
      return false;
    }

    const content = fs.readFileSync(historyPath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const message = JSON.parse(line);
        if (message.type === "user" || message.type === "assistant") {
          return true;
        }
      } catch {
        continue;
      }
    }

    return false;
  } catch (error) {
    console.error("Debug: Error checking conversation content:", (error as Error).message);
    return false;
  }
}

async function generatePochiLink(historyPath: string): Promise<string | null> {
  try {
    // Read the JSONL file
    const content = fs.readFileSync(historyPath, "utf8");
    
    // Convert to UIMessage format using the claude converter
    const messages = claude.convert(content);
    
    if (messages.length === 0) {
      console.error("Debug: No messages found in conversation");
      return null;
    }
    
    // Upload to Pochi using the existing API
    const link = await uploadToPochi(messages);
    return link;
  } catch (error) {
    console.error("Debug: Failed to generate Pochi link:", (error as Error).message);
    return null;
  }
}

export async function processStatusline(data: any): Promise<void> {
  const model = data.model?.display_name || "Unknown";
  const projectDir = data.workspace?.project_dir || "";
  const historyPath = data.transcript_path || "";

  let pochiLink = null;

  if (historyPath) {
    if (hasConversationContent(historyPath)) {
      pochiLink = await generatePochiLink(historyPath);

      if (!pochiLink) {
        console.error("Debug: Failed to generate Pochi link for", historyPath);
      }
    } else {
      console.error("Debug: Conversation is empty or has no user/assistant messages");
    }
  }

  if (pochiLink) {
    console.log(`[${model}] 🔗 Share Link: ${pochiLink}`);
  } else if (historyPath && projectDir) {
    const projectName = path.basename(projectDir);
    console.log(`[${model}] 📜 ${historyPath} | 📁 ${projectName}`);
  }
}