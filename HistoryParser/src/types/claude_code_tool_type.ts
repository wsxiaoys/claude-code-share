// Types for Claude tool calls and results

export interface ClaudeToolCall {
  id: string;
  name: string;
  input: unknown;
}

// Specific tool call types for better type safety
export interface LSToolCall extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "LS";
  input: LSToolInput;
}

export interface WriteToolCall extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "Write";
  input: WriteToolInput;
}

export interface GlobToolCall extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "Glob";
  input: GlobToolInput;
}

export interface ReadToolCall extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "Read";
  input: ReadToolInput;
}

export interface EditToolCall extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "Edit";
  input: EditToolInput;
}

export interface MultiEditToolCall
  extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "MultiEdit";
  input: MultiEditToolInput;
}

export interface TaskToolCall extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "Task";
  input: TaskToolInput;
}

export interface WebFetchToolCall
  extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "WebFetch";
  input: WebFetchToolInput;
}

export interface BashToolCall extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "Bash";
  input: BashToolInput;
}

export interface TodoWriteToolCall
  extends Omit<ClaudeToolCall, "input" | "name"> {
  name: "TodoWrite";
  input: TodoWriteToolInput;
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

export interface TodoWriteToolInput {
  todos: Array<{
    status: "pending" | "in-progress" | "completed" | "cancelled";
    content: string;
    id: string;
    priority: "low" | "medium" | "high";
  }>;
}

// Specific result types for different Claude tools
export interface LSToolResult {
  toolUseResult: string;
}

export interface WriteToolResult {
  toolUseResult:
    | {
        success: boolean;
        file_path?: string;
        bytes_written?: number;
      }
    | string;
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
  toolUseResult:
    | {
        success: boolean;
      }
    | string;
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
  | TodoWriteToolInput
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

// Union type for all specific tool calls
export type SpecificClaudeToolCall =
  | LSToolCall
  | WriteToolCall
  | GlobToolCall
  | ReadToolCall
  | EditToolCall
  | MultiEditToolCall
  | TaskToolCall
  | WebFetchToolCall
  | BashToolCall
  | TodoWriteToolCall;
