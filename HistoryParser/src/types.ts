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
  type: "assistant";
  message: Anthropic.Messages.Message;
  session_id: string;
};

type UserMessage = {
  type: "user";
  message: MessageParam; // from Anthropic SDK
  session_id: string;
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

// Union type for all possible message types that can be nested
type NestedMessage =
  | Anthropic.Messages.Message
  | MessageParam
  | InitMessage
  | AssistantMessage
  | UserMessage
  | ErrorMessage
  | ResultMessage;

// Claude Code history wrapper that contains different types of messages
type HistoryMessage = {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  type: "user" | "assistant" | "system" | "error" | "result";
  message: NestedMessage; // Can be any of the message types
  requestId?: string;
  uuid: string;
  timestamp: string;
  toolUseResult?: any;
};

export type ClaudeCodeMessage = HistoryMessage;
