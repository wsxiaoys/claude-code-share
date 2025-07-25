import type {
  ServerTools,
  ClientToolsType,
  ToolInvocationUIPart,
} from "@getpochi/tools";
import type { ToolInvocationPart } from "./types/UiMessage_type";

/**
 * Creates a tool invocation part from a Claude tool call.
 * @param c The tool call object from Claude's message.
 * @param toolResult The corresponding tool result object.
 * @returns A ToolInvocationPart object.
 */
export function _createToolInvocation(
  c: any,
  toolResultItem: any
): ToolInvocationPart {
  // Helper function to create call state invocation
  const createCallInvocation = (toolName: string): ToolInvocationPart => ({
    type: "tool-invocation",
    toolInvocation: {
      state: "call",
      toolCallId: c.id,
      toolName,
      args: c.input || {},
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
  c: any,
  toolResultItem: any,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "listFiles";
  
  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }
  
  const { path } = c.input;
  const invocation: ToolInvocationUIPart<ClientToolsType["listFiles"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { path },
      result: {
        files: ((toolResultItem as any).toolUseResult || "")
          .split("\n")
          .filter(Boolean),
        isTruncated: false,
      },
    },
  };
  
  return invocation;
}

function handleWriteToFile(
  c: any,
  toolResultItem: any,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "writeToFile";
  
  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }
  
  const { content, file_path: path } = c.input;
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
  c: any,
  toolResultItem: any,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "globFiles";
  
  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }
  
  const globPattern: string = c.input?.pattern;
  const path: string = c.input?.path;
  const invocation: ToolInvocationUIPart<ClientToolsType["globFiles"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { globPattern, path },
      result: {
        files: (toolResultItem as any).toolUseResult.filenames || "",
        isTruncated: false,
      },
    },
  };
  
  return invocation;
}

function handleTodoWrite(
  c: any,
  toolResultItem: any,
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
      args: c.input || {},
      result: {
        success: true,
      },
    },
  };
  
  return invocation;
}

function handleWebFetch(
  c: any,
  toolResultItem: any,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "webFetch";
  
  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }
  
  const { url } = c.input;
  const result = (toolResultItem as any).toolUseResult.result || "";
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
  c: any,
  toolResultItem: any,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "multiApplyDiff";
  
  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }
  
  const { file_path: path, edits } = c.input;
  const formattedEdits = edits.map((edit: any) => ({
    searchContent: edit.old_string,
    replaceContent: edit.new_string,
  }));
  
  const toolUseResult = (toolResultItem as any).toolUseResult;
  const { added, removed } = toolUseResult.structuredPatch.reduce(
    (summary: { added: number; removed: number }, patch: any) => {
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
  c: any,
  toolResultItem: any,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "newTask";
  
  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }
  
  const { description, prompt } = c.input;
  const result = (toolResultItem as any).toolUseResult;
  const content = result.content[0].text;
  
  const invocation: ToolInvocationUIPart<ClientToolsType["newTask"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { description, prompt },
      result: content,
    },
  };
  
  return invocation;
}

function handleReadFile(
  c: any,
  toolResultItem: any,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "readFile";
  
  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }
  
  const { file_path: path, offset: startLine, limit: endLine } = c.input;
  const result = (toolResultItem as any).toolUseResult;
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
  c: any,
  toolResultItem: any,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "applyDiff";
  
  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }
  
  const { file_path: path, old_string: searchContent, new_string: replaceContent } = c.input;
  const toolResult = toolResultItem.toolUseResult;
  
  let success = false;
  let added = 0;
  let removed = 0;
  
  if (toolResult != null) {
    success = true;
    ({ added, removed } = (
      toolResult.structuredPatch?.[0]?.lines || []
    ).reduce(
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
  c: any,
  toolResultItem: any,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "executeCommand";
  
  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }
  
  const item = toolResultItem.message.content[0];
  const isError = item.is_error;
  const result = isError 
    ? (toolResultItem as any).toolUseResult
    : (toolResultItem as any).toolUseResult.stdout;
  
  const invocation: ToolInvocationUIPart<ClientToolsType["executeCommand"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: c.input || {},
      result: {
        output: result || "",
        isTruncated: false,
      },
    },
  };
  
  return invocation;
}

function handleUnknownTool(
  c: any,
  toolResultItem: any,
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
       args: c.input || {},
       result: { output: (toolResultItem as any).toolUseResult || "" },
     },
   };
 }
