import type { UIMessage } from "ai";

/**
 * Uploads messages to Pochi API and returns a shareable link
 * @param messages Array of UI messages to upload
 * @returns Promise that resolves to the shareable link URL
 */
export async function uploadToPochi(messages: UIMessage[]): Promise<string> {
  const payload = {
    data: { messages }
  };
  
  try {
    console.log("\n🚀 Uploading to Pochi...");
    
    const response = await fetch("https://app.getpochi.com/api/clips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json() as { id?: string };
    
    if (result.id) {
      return `https://app.getpochi.com/clip/${result.id}`;
    } else {
      throw new Error("No clip ID returned from API");
    }
  } catch (error) {
    console.error("❌ Failed to upload to Pochi:", error);
    process.exit(1);
  }
}