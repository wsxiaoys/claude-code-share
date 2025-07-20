import type { Anthropic } from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources";

type InitMessage = {
  type: "system";
  subtype: "init";
  session_id: string;
  tools: string[];
  mcp_servers: string[];
  apiKeySource: "none" | "/login managed key" | string;
};

type AssistantMessage = {
  message: Anthropic.Messages.Message;
};

type UserMessage = {
  message: MessageParam;
};

type ErrorMessage = {
  type: "error";
};

type ResultMessage = {
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

type NestedMessage =
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
  toolUseResult?: any;
};

export type ClaudeCodeMessage = HistoryMessage;

export type NestedHistoryMessage = NestedMessage;
