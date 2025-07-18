import type { SDKMessage } from "@anthropic-ai/claude-code";

// Type for the JSONL file entries that wrap Claude Code messages
export type ClaudeCodeMessage = {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  type: string;
  message?: {
    role: string;
    content?: any;
    id?: string;
    [key: string]: any;
  };
  uuid: string;
  timestamp: string;
  toolUseResult?: any;
  [key: string]: any;
};

// Re-export SDKMessage for convenience
export type { SDKMessage };
