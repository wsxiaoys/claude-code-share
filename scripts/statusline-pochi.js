#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read JSON input from stdin
let input = "";
process.stdin.setEncoding("utf8");

process.stdin.on("readable", () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    input += chunk;
  }
});

process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    processStatusline(data);
  } catch (error) {
    console.error("Debug: Failed to parse input JSON:", error.message);
    process.exit(1);
  }
});

function hasConversationContent(historyPath) {
  try {
    // Check if file exists and has content
    if (!fs.existsSync(historyPath)) {
      return false;
    }

    const stats = fs.statSync(historyPath);
    if (stats.size === 0) {
      return false;
    }

    // Read file and check for user or assistant messages
    const content = fs.readFileSync(historyPath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const message = JSON.parse(line);
        if (message.type === "user" || message.type === "assistant") {
          return true;
        }
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }

    return false;
  } catch (error) {
    console.error("Debug: Error checking conversation content:", error.message);
    return false;
  }
}

function generatePochiLink(historyPath) {
  try {
    // Get script directory and project root
    const scriptDir = __dirname;
    const projectRoot = path.dirname(scriptDir);

    let result;

    // Check for TypeScript CLI file
    const tsCliPath = path.join(projectRoot, "src", "cli.ts");
    const jsCliPath = path.join(projectRoot, "dist", "cli.js");

    if (fs.existsSync(tsCliPath)) {
      // Try to run with bun first, then ts-node, then tsx
      try {
        // Check if bun is available
        execSync("which bun", { stdio: "ignore" });
        result = execSync(`bun run "${tsCliPath}" "${historyPath}"`, {
          cwd: projectRoot,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch {
        try {
          // Try with ts-node
          execSync("which ts-node", { stdio: "ignore" });
          result = execSync(`ts-node "${tsCliPath}" "${historyPath}"`, {
            cwd: projectRoot,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          });
        } catch {
          try {
            // Try with tsx
            execSync("which tsx", { stdio: "ignore" });
            result = execSync(`tsx "${tsCliPath}" "${historyPath}"`, {
              cwd: projectRoot,
              encoding: "utf8",
              stdio: ["pipe", "pipe", "pipe"],
            });
          } catch (error) {
            console.error("Debug: No TypeScript runner found");
            return null;
          }
        }
      }
    } else if (fs.existsSync(jsCliPath)) {
      // Use compiled JavaScript version
      result = execSync(`node "${jsCliPath}" "${historyPath}"`, {
        cwd: projectRoot,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      console.error("Debug: CLI file not found");
      return null;
    }

    // Extract the share link from output
    const linkMatch = result.match(
      /https:\/\/app\.getpochi\.com\/clips\/[a-zA-Z0-9]+/
    );
    if (linkMatch) {
      return linkMatch[0];
    }

    console.error("Debug: No Pochi link found in CLI output");
    return null;
  } catch (error) {
    console.error("Debug: CLI failed:", error.message);
    if (error.stdout) {
      console.error("Debug: CLI output:", error.stdout);
    }
    return null;
  }
}

function processStatusline(data) {
  const model = data.model?.display_name || "Unknown";
  const projectDir = data.workspace?.project_dir || "";
  const historyPath = data.transcript_path || "";

  let pochiLink = null;

  if (historyPath) {
    // Only generate link if conversation has actual content
    if (hasConversationContent(historyPath)) {
      pochiLink = generatePochiLink(historyPath);

      if (!pochiLink) {
        console.error("Debug: Failed to generate Pochi link for", historyPath);
      }
    } else {
      console.error(
        "Debug: Conversation is empty or has no user/assistant messages"
      );
    }
  }

  // Build status line output
  if (pochiLink) {
    // Show URL
    console.log(`[${model}] 🔗 Share Link: ${pochiLink}`);
  } else if (historyPath && projectDir) {
    // Show paths if no Pochi link available
    const projectName = path.basename(projectDir);
    console.log(`[${model}] 📜 ${historyPath} | 📁 ${projectName}`);
  }
}
