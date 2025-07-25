import type {
  ServerTools,
  ClientToolsType,
  ToolInvocationUIPart,
} from "@getpochi/tools";
import type { ToolInvocationPart } from "./types/UiMessage_type";
import type {
  ClaudeToolCall,
  LSToolResult,
  WriteToolResult,
  GlobToolResult,
  ReadToolResult,
  EditToolResult,
  MultiEditToolResult,
  TaskToolResult,
  WebFetchToolResult,
  BashToolResult,
  TodoWriteToolResult,
} from "./types/claude_code_tool_type";
import type { ClaudeCodeMessage } from "./types/claude_code_types";

/**
 * Creates a tool invocation part from a Claude tool call.
 * @param c The tool call object from Claude's message.
 * @param toolResult The corresponding tool result object.
 * @returns A ToolInvocationPart object.
 */
export function _createToolInvocation(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null
): ToolInvocationPart {
  // Helper function to create call state invocation
  const createCallInvocation = (toolName: string): ToolInvocationPart => ({
    type: "tool-invocation",
    toolInvocation: {
      state: "call",
      toolCallId: c.id,
      toolName,
      args: { todos: [] },
    },
  });

  // Convert Claude tool calls to Pochi format
  if (c.name === "LS") {
    return handleListFiles(c, toolResultItem, createCallInvocation);
  }

  if (c.name === "Write") {
    return handleWriteToFile(c, toolResultItem, createCallInvocation);
  }

  if (c.name === "Glob") {
    return handleGlobFiles(c, toolResultItem, createCallInvocation);
  }

  if (c.name === "TodoWrite") {
    return handleTodoWrite(c, toolResultItem, createCallInvocation);
  }

  if (c.name === "WebFetch") {
    return handleWebFetch(c, toolResultItem, createCallInvocation);
  }

  if (c.name === "MultiEdit") {
    return handleMultiEdit(c, toolResultItem, createCallInvocation);
  }

  if (c.name === "Task") {
    return handleNewTask(c, toolResultItem, createCallInvocation);
  }

  if (c.name === "Read") {
    return handleReadFile(c, toolResultItem, createCallInvocation);
  }

  if (c.name === "Edit") {
    return handleApplyDiff(c, toolResultItem, createCallInvocation);
  }

  if (c.name === "Bash") {
    return handleExecuteCommand(c, toolResultItem, createCallInvocation);
  }

  // Default handler for unknown tools
  return handleUnknownTool(c, toolResultItem, createCallInvocation);
}

// Helper functions for each tool type
function handleListFiles(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "listFiles";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const { path } = c.input as { path: string };
  const invocation: ToolInvocationUIPart<ClientToolsType["listFiles"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { path },
      result: {
        files: ((toolResultItem as LSToolResult).toolUseResult || "")
          .split("\n")
          .filter(Boolean),
        isTruncated: false,
      },
    },
  };

  return invocation;
}

function handleWriteToFile(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "writeToFile";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const { content, file_path: path } = c.input as {
    content: string;
    file_path: string;
  };
  const invocation: ToolInvocationUIPart<ClientToolsType["writeToFile"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { content, path },
      result: {
        success: true,
      },
    },
  };

  return invocation;
}

function handleGlobFiles(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "globFiles";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const { pattern: globPattern, path } = c.input as {
    pattern: string;
    path: string;
  };
  const invocation: ToolInvocationUIPart<ClientToolsType["globFiles"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { globPattern, path },
      result: {
        files: (toolResultItem as GlobToolResult).toolUseResult.filenames || [],
        isTruncated: false,
      },
    },
  };

  return invocation;
}

function handleTodoWrite(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "todoWrite";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const invocation: ToolInvocationUIPart<ClientToolsType["todoWrite"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { todos: [] },
      result: {
        success: true,
      },
    },
  };

  return invocation;
}

function handleWebFetch(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "webFetch";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const { url } = c.input as { url: string };
  const result =
    (toolResultItem as WebFetchToolResult).toolUseResult.result || "";
  const invocation: ToolInvocationUIPart<(typeof ServerTools)["webFetch"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { url },
      result: {
        result: result || "",
        isTruncated: false,
      },
    },
  };

  return invocation;
}

function handleMultiEdit(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "multiApplyDiff";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const { file_path: path, edits } = c.input as {
    file_path: string;
    edits: Array<{ old_string: string; new_string: string }>;
  };
  const formattedEdits = edits.map((edit) => ({
    searchContent: edit.old_string,
    replaceContent: edit.new_string,
  }));

  const toolUseResult = (toolResultItem as MultiEditToolResult).toolUseResult;
  const { added, removed } = toolUseResult.structuredPatch.reduce(
    (summary: { added: number; removed: number }, patch) => {
      patch.lines.forEach((line: string) => {
        if (line.startsWith("+")) summary.added++;
        if (line.startsWith("-")) summary.removed++;
      });
      return summary;
    },
    { added: 0, removed: 0 }
  );

  const pochiResult = {
    success: true,
    _meta: {
      editSummary: {
        added,
        removed,
      },
    },
  };

  const invocation: ToolInvocationUIPart<ClientToolsType["multiApplyDiff"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { path, edits: formattedEdits },
      result: pochiResult,
    },
  };

  return invocation;
}

function handleNewTask(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "newTask";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const { description, prompt } = c.input as {
    description: string;
    prompt: string;
  };
  const result = (toolResultItem as TaskToolResult).toolUseResult;
  const content = result.content?.[0]?.text || "";

  const invocation: ToolInvocationUIPart<ClientToolsType["newTask"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { description, prompt },
      result: { result: content },
    },
  };

  return invocation;
}

function handleReadFile(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "readFile";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const {
    file_path: path,
    offset: startLine,
    limit: endLine,
  } = c.input as { file_path: string; offset?: number; limit?: number };
  const result = (toolResultItem as ReadToolResult).toolUseResult;
  const content = result.file.content;

  const invocation: ToolInvocationUIPart<ClientToolsType["readFile"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { path, startLine, endLine },
      result: {
        content: content || "",
        isTruncated: false,
      },
    },
  };

  return invocation;
}

function handleApplyDiff(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "applyDiff";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const {
    file_path: path,
    old_string: searchContent,
    new_string: replaceContent,
  } = c.input as { file_path: string; old_string: string; new_string: string };
  const toolResult = (toolResultItem as EditToolResult).toolUseResult;

  let success = false;
  let added = 0;
  let removed = 0;

  if (toolResult != null) {
    success = true;
    ({ added, removed } = (toolResult.structuredPatch?.[0]?.lines || []).reduce(
      (summary: { added: number; removed: number }, line: string) => {
        if (line.startsWith("+")) {
          summary.added++;
        }
        if (line.startsWith("-")) {
          summary.removed++;
        }
        return summary;
      },
      { added: 0, removed: 0 }
    ));
  }

  const result = {
    success,
    _meta: {
      editSummary: {
        added,
        removed,
      },
    },
  };

  const invocation: ToolInvocationUIPart<ClientToolsType["applyDiff"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { path, searchContent, replaceContent },
      result: result,
    },
  };

  return invocation;
}

function handleExecuteCommand(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "executeCommand";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const item = (toolResultItem as BashToolResult).message.content[0];
  const isError = item?.is_error || false;
  const bashResult = (toolResultItem as BashToolResult).toolUseResult;
  const result = isError
    ? typeof bashResult === "string"
      ? bashResult
      : ""
    : typeof bashResult === "object" &&
      bashResult !== null &&
      "stdout" in bashResult
    ? bashResult.stdout || ""
    : typeof bashResult === "string"
    ? bashResult
    : "";

  const invocation: ToolInvocationUIPart<ClientToolsType["executeCommand"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { command: (c.input as { command?: string })?.command || "" },
      result: {
        output: result || "",
        isTruncated: false,
      },
    },
  };

  return invocation;
}

function handleUnknownTool(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  if (!toolResultItem) {
    return createCallInvocation(c.name);
  }

  return {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName: c.name,
      args: (c.input as Record<string, unknown>) || {},
      result: { output: String(toolResultItem.toolUseResult) || "" },
    },
  };
}
