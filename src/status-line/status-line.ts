import fs from "node:fs";
import path from "node:path";

function readPochiLinkFromTemp(sessionId: string): string | null {
  try {
    const tempFilePath = `/tmp/ccs/${sessionId}`;
    if (fs.existsSync(tempFilePath)) {
      const link = fs.readFileSync(tempFilePath, "utf8").trim();
      return link || null;
    }
    return null;
  } catch (error) {
    console.error(
      "Debug: Failed to read Pochi link from temp file:",
      (error as Error).message
    );
    return null;
  }
}

export async function processStatusline(data: any): Promise<void> {
  const model = data.model?.display_name || "Unknown";
  const projectDir = data.workspace?.project_dir || "";
  const historyPath = data.transcript_path || "";
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
