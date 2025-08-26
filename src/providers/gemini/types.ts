// TODO: Define Gemini-specific types here
// This file should contain:
// - Gemini conversation message format types
// - Gemini tool call and result types
// - Any other Gemini-specific data structures

/**
 * Placeholder for Gemini message types
 * TODO: Define the actual structure based on Gemini's conversation format
 */
export interface GeminiMessage {
  // TODO: Add Gemini message structure
  id?: string;
  role?: string;
  content?: unknown;
  timestamp?: string;
}

/**
 * Placeholder for Gemini conversation history type
 * TODO: Define based on how Gemini stores conversation data
 */
export interface GeminiConversationHistory {
  // TODO: Add Gemini conversation history structure
  messages?: GeminiMessage[];
  metadata?: unknown;
}