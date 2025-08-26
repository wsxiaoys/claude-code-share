import type { Message } from "@/types";

/**
 * Converts Gemini conversation data to AI SDK UIMessage format
 * TODO: Implement actual Gemini message conversion logic
 * @param path - Path to the Gemini conversation file
 * @returns Array of converted messages
 */
export function convertToMessages(path: string): Message[] {
  // Placeholder implementation
  // TODO: Add logic to:
  // 1. Read and parse Gemini conversation file format
  // 2. Convert Gemini messages to AI SDK UIMessage format
  // 3. Handle Gemini-specific tool calls and responses
  console.warn("⚠️ Gemini provider not yet implemented - convertToMessages");
  console.log(`Attempted to convert: ${path}`);
  return [];
}