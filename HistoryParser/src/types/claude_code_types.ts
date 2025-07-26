import type { Anthropic } from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources";

export type InitMessage = {
  type: "system";
  subtype: "init";
  session_id: string;
  tools: string[];
  mcp_servers: string[];
  apiKeySource: "none" | "/login managed key" | string;
};

export type AssistantMessage = {
  message: Anthropic.Messages.Message;
};

export type UserMessage = {
  message: MessageParam;
};

export type ErrorMessage = {
  type: "error";
};

export type ResultMessage = {
  type: "result";
  subtype: "success";
  total_cost_usd: number;
  is_error: boolean;
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  result: string;
  session_id: string;
};

export type NestedMessage =
  | Anthropic.Messages.Message
  | MessageParam
  | InitMessage
  | AssistantMessage
  | UserMessage
  | ErrorMessage
  | ResultMessage;

// Claude Code history type
type HistoryMessage = {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch?: string; // Added as it's present in some messages
  type: "user" | "assistant" | "system" | "error" | "result";
  message: NestedMessage;
  requestId?: string;
  uuid: string;
  timestamp: string;
  toolUseResult?: unknown;
};

export type ClaudeCodeMessage = HistoryMessage;
