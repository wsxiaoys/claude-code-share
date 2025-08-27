// TODO: Define Gemini-specific types here
// This file should contain:
// - Gemini conversation message format types
// - Gemini tool call and result types
// - Any other Gemini-specific data structures

import type { FunctionDeclaration, PartListUnion } from "@google/genai";

export enum ToolErrorType {
  // General Errors
  INVALID_TOOL_PARAMS = "invalid_tool_params",
  UNKNOWN = "unknown",
  UNHANDLED_EXCEPTION = "unhandled_exception",
  TOOL_NOT_REGISTERED = "tool_not_registered",
  EXECUTION_FAILED = "execution_failed",

  // File System Errors
  FILE_NOT_FOUND = "file_not_found",
  FILE_WRITE_FAILURE = "file_write_failure",
  READ_CONTENT_FAILURE = "read_content_failure",
  ATTEMPT_TO_CREATE_EXISTING_FILE = "attempt_to_create_existing_file",
  FILE_TOO_LARGE = "file_too_large",
  PERMISSION_DENIED = "permission_denied",
  NO_SPACE_LEFT = "no_space_left",
  TARGET_IS_DIRECTORY = "target_is_directory",
  PATH_NOT_IN_WORKSPACE = "path_not_in_workspace",
  SEARCH_PATH_NOT_FOUND = "search_path_not_found",
  SEARCH_PATH_NOT_A_DIRECTORY = "search_path_not_a_directory",

  // Edit-specific Errors
  EDIT_PREPARATION_FAILURE = "edit_preparation_failure",
  EDIT_NO_OCCURRENCE_FOUND = "edit_no_occurrence_found",
  EDIT_EXPECTED_OCCURRENCE_MISMATCH = "edit_expected_occurrence_mismatch",
  EDIT_NO_CHANGE = "edit_no_change",

  // Glob-specific Errors
  GLOB_EXECUTION_ERROR = "glob_execution_error",

  // Grep-specific Errors
  GREP_EXECUTION_ERROR = "grep_execution_error",

  // Ls-specific Errors
  LS_EXECUTION_ERROR = "ls_execution_error",
  PATH_IS_NOT_A_DIRECTORY = "path_is_not_a_directory",

  // MCP-specific Errors
  MCP_TOOL_ERROR = "mcp_tool_error",

  // Memory-specific Errors
  MEMORY_TOOL_EXECUTION_ERROR = "memory_tool_execution_error",

  // ReadManyFiles-specific Errors
  READ_MANY_FILES_SEARCH_ERROR = "read_many_files_search_error",

  // Shell errors
  SHELL_EXECUTE_ERROR = "shell_execute_error",

  // DiscoveredTool-specific Errors
  DISCOVERED_TOOL_EXECUTION_ERROR = "discovered_tool_execution_error",

  // WebFetch-specific Errors
  WEB_FETCH_NO_URL_IN_PROMPT = "web_fetch_no_url_in_prompt",
  WEB_FETCH_FALLBACK_FAILED = "web_fetch_fallback_failed",
  WEB_FETCH_PROCESSING_ERROR = "web_fetch_processing_error",

  // WebSearch-specific Errors
  WEB_SEARCH_FAILED = "web_search_failed",
}

export interface DiffStat {
  ai_removed_lines: number;
  ai_added_lines: number;
  user_added_lines: number;
  user_removed_lines: number;
}

export interface FileDiff {
  fileDiff: string;
  fileName: string;
  originalContent: string | null;
  newContent: string;
  diffStat?: DiffStat;
}

export type ToolResultDisplay = string | FileDiff;

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

export interface ToolResult {
  /**
   * Content meant to be included in LLM history.
   * This should represent the factual outcome of the tool execution.
   */
  llmContent: PartListUnion;

  /**
   * Markdown string for user display.
   * This provides a user-friendly summary or visualization of the result.
   * NOTE: This might also be considered UI-specific and could potentially be
   * removed or modified in a further refactor if the server becomes purely API-driven.
   * For now, we keep it as the core logic in ReadFileTool currently produces it.
   */
  returnDisplay: ToolResultDisplay;

  /**
   * If this property is present, the tool call is considered a failure.
   */
  error?: {
    message: string; // raw error message
    type?: ToolErrorType; // An optional machine-readable error type (e.g., 'FILE_NOT_FOUND').
  };
}

/**
 * Parameters for the LS tool
 */
export interface LSToolParams {
  /**
   * The absolute path to the directory to list
   */
  path: string;

  /**
   * Array of glob patterns to ignore (optional)
   */
  ignore?: string[];

  /**
   * Whether to respect .gitignore and .geminiignore patterns (optional, defaults to true)
   */
  file_filtering_options?: {
    respect_git_ignore?: boolean;
    respect_gemini_ignore?: boolean;
  };
}
