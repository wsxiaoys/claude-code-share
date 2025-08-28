// TODO: Define Gemini-specific types here
// This file should contain:
// - Gemini conversation message format types
// - Gemini tool call and result types
// - Any other Gemini-specific data structures

// ### Direct Matches:
//  Gemini - pochi
// - ReadFile ↔ `readFile`
// - WriteFile ↔ `writeToFile`
// - Edit ↔ `applyDiff` / `multiApplyDiff`
// - Shell ↔ `executeCommand`
// - FindFiles ↔ `globFiles`
// - ReadFolder ↔ `listFiles`
// - SearchText ↔ `searchFiles`
// - ReadManyFiles ↔ `batchCall` (can be used to read multiple files)

import type {
  FunctionDeclaration,
  PartListUnion,
  PartUnion,
} from "@google/genai";

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

type ToolParams = Record<string, unknown>;

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

export interface GrepToolParams {
  /**
   * The regular expression pattern to search for in file contents
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to current directory relative to root)
   */
  path?: string;

  /**
   * File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
   */
  include?: string;
}

/**
 * Parameters for the GlobTool
 */
export interface GlobToolParams {
  /**
   * The glob pattern to match files against
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to current directory)
   */
  path?: string;

  /**
   * Whether the search should be case-sensitive (optional, defaults to false)
   */
  case_sensitive?: boolean;

  /**
   * Whether to respect .gitignore patterns (optional, defaults to true)
   */
  respect_git_ignore?: boolean;
}

/**
 * Parameters for the Edit tool
 */
export interface EditToolParams {
  /**
   * The absolute path to the file to modify
   */
  file_path: string;

  /**
   * The text to replace
   */
  old_string: string;

  /**
   * The text to replace it with
   */
  new_string: string;

  /**
   * Number of replacements expected. Defaults to 1 if not specified.
   * Use when you want to replace multiple occurrences.
   */
  expected_replacements?: number;

  /**
   * Whether the edit was modified manually by the user.
   */
  modified_by_user?: boolean;

  /**
   * Initially proposed string.
   */
  ai_proposed_string?: string;
}

export type EditorType =
  | "vscode"
  | "vscodium"
  | "windsurf"
  | "cursor"
  | "vim"
  | "neovim"
  | "zed"
  | "emacs";

export interface ModifyContext<ToolParams> {
  getFilePath: (params: ToolParams) => string;

  getCurrentContent: (params: ToolParams) => Promise<string>;

  getProposedContent: (params: ToolParams) => Promise<string>;

  createUpdatedParams: (
    oldContent: string,
    modifiedProposedContent: string,
    originalParams: ToolParams,
  ) => ToolParams;
}

export interface ModifyResult<ToolParams> {
  updatedParams: ToolParams;
  updatedDiff: string;
}

/**
 * Defines the contract for a service that allows a user to modify
 * proposed tool parameters using an external editor.
 */
export interface IModificationService {
  /**
   * Triggers an external editor for the user to modify the proposed content,
   * and returns the updated tool parameters and the diff after the change.
   */
  modifyWithEditor<ToolParams extends object>(
    originalParams: ToolParams,
    modifyContext: ModifyContext<ToolParams>,
    editorType: EditorType,
    abortSignal: AbortSignal,
    onEditorClose: () => void,
  ): Promise<ModifyResult<ToolParams>>;
}

/**
 * Parameters for the ReadFile tool
 */
export interface ReadFileToolParams {
  /**
   * The absolute path to the file to read
   */
  absolute_path: string;

  /**
   * The line number to start reading from (optional)
   */
  offset?: number;

  /**
   * The number of lines to read (optional)
   */
  limit?: number;
}

/**
 * Parameters for the ReadManyFilesTool.
 */
export interface ReadManyFilesParams {
  /**
   * An array of file paths or directory paths to search within.
   * Paths are relative to the tool's configured target directory.
   * Glob patterns can be used directly in these paths.
   */
  paths: string[];

  /**
   * Optional. Glob patterns for files to include.
   * These are effectively combined with the `paths`.
   * Example: ["*.ts", "src/** /*.md"]
   */
  include?: string[];

  /**
   * Optional. Glob patterns for files/directories to exclude.
   * Applied as ignore patterns.
   * Example: ["*.log", "dist/**"]
   */
  exclude?: string[];

  /**
   * Optional. Search directories recursively.
   * This is generally controlled by glob patterns (e.g., `**`).
   * The glob implementation is recursive by default for `**`.
   * For simplicity, we'll rely on `**` for recursion.
   */
  recursive?: boolean;

  /**
   * Optional. Apply default exclusion patterns. Defaults to true.
   */
  useDefaultExcludes?: boolean;

  /**
   * Whether to respect .gitignore and .geminiignore patterns (optional, defaults to true)
   */
  file_filtering_options?: {
    respect_git_ignore?: boolean;
    respect_gemini_ignore?: boolean;
  };
}

export interface ProcessedFileReadResult {
  llmContent: PartUnion; // string for text, Part for image/pdf/unreadable binary
  returnDisplay: string;
  error?: string; // Optional error message for the LLM if file processing failed
  errorType?: ToolErrorType; // Structured error type
  isTruncated?: boolean; // For text files, indicates if content was truncated
  originalLineCount?: number; // For text files
  linesShown?: [number, number]; // For text files [startLine, endLine] (1-based for display)
}

/**
 * Result type for file processing operations
 */
type FileProcessingResult =
  | {
      success: true;
      filePath: string;
      relativePathForDisplay: string;
      fileReadResult: ProcessedFileReadResult;
      reason?: undefined;
    }
  | {
      success: false;
      filePath: string;
      relativePathForDisplay: string;
      fileReadResult?: undefined;
      reason: string;
    };

/**
 * Parameters for the GrepTool
 */
export interface RipGrepToolParams {
  /**
   * The regular expression pattern to search for in file contents
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to current directory relative to root)
   */
  path?: string;

  /**
   * File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
   */
  include?: string;
}

export interface ShellToolParams {
  command: string;
  description?: string;
  directory?: string;
}

export interface WebFetchToolParams {
  /**
   * The prompt containing URL(s) (up to 20) and instructions for processing their content.
   */
  prompt: string;
}

/**
 * Parameters for the WebSearchTool.
 */
export interface WebSearchToolParams {
  /**
   * The search query.
   */

  query: string;
}

/**
 * Parameters for the WriteFile tool
 */
export interface WriteFileToolParams {
  /**
   * The absolute path to the file to write to
   */
  file_path: string;

  /**
   * The content to write to the file
   */
  content: string;

  /**
   * Whether the proposed content was modified by the user.
   */
  modified_by_user?: boolean;

  /**
   * Initially proposed content.
   */
  ai_proposed_content?: string;
}
