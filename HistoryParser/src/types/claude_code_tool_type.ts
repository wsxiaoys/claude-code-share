// Types for Claude tool calls and results

export interface ClaudeToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ClaudeToolResult {
  toolUseResult: unknown;
  message?: {
    content: Array<{
      is_error: boolean;
    }>;
  };
}

// Specific input types for different Claude tools
export interface LSToolInput {
  path: string;
}

export interface WriteToolInput {
  content: string;
  file_path: string;
}

export interface GlobToolInput {
  pattern: string;
  path: string;
}

export interface ReadToolInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
}

export interface MultiEditToolInput {
  file_path: string;
  edits: Array<{
    old_string: string;
    new_string: string;
  }>;
}

export interface TaskToolInput {
  description: string;
  prompt: string;
}

export interface WebFetchToolInput {
  url: string;
}

export interface BashToolInput {
  command?: string;
  [key: string]: unknown;
}

// Specific result types for different Claude tools
export interface LSToolResult {
  toolUseResult: string;
}

export interface WriteToolResult {
  toolUseResult: unknown;
}

export interface GlobToolResult {
  toolUseResult: {
    filenames: string[];
  };
}

export interface ReadToolResult {
  toolUseResult: {
    file: {
      content: string;
    };
  };
}

export interface EditToolResult {
  toolUseResult: {
    structuredPatch?: Array<{
      lines: string[];
    }>;
  } | null;
}

export interface MultiEditToolResult {
  toolUseResult: {
    structuredPatch: Array<{
      lines: string[];
    }>;
  };
}

export interface TaskToolResult {
  toolUseResult: {
    content: Array<{
      text: string;
    }>;
  };
}

export interface WebFetchToolResult {
  toolUseResult: {
    result: string;
  };
}

export interface BashToolResult {
  toolUseResult:
    | {
        stdout?: string;
      }
    | string;
  message: {
    content: Array<{
      is_error: boolean;
    }>;
  };
}

export interface TodoWriteToolResult {
  toolUseResult: unknown;
}

// Union types for type-safe handling
export type ClaudeToolInput =
  | LSToolInput
  | WriteToolInput
  | GlobToolInput
  | ReadToolInput
  | EditToolInput
  | MultiEditToolInput
  | TaskToolInput
  | WebFetchToolInput
  | BashToolInput
  | unknown;

export type ClaudeToolResultType =
  | LSToolResult
  | WriteToolResult
  | GlobToolResult
  | ReadToolResult
  | EditToolResult
  | MultiEditToolResult
  | TaskToolResult
  | WebFetchToolResult
  | BashToolResult
  | TodoWriteToolResult
  | ClaudeToolResult;
