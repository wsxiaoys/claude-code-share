import type { Anthropic } from "@anthropic-ai/sdk";
import type {
  ClientToolsType,
  ServerTools,
  ToolInvocationUIPart,
} from "@getpochi/tools";
import type { TextPart, UIMessage } from "ai";
import type { ToolInvocationPart } from "@/types";
import type {
  BashToolCall,
  BashToolInput,
  BashToolResult,
  ClaudeCodeMessage,
  ClaudeToolCall,
  EditToolCall,
  EditToolInput,
  EditToolResult,
  GlobToolCall,
  GlobToolInput,
  GlobToolResult,
  LSToolCall,
  LSToolInput,
  LSToolResult,
  MultiEditToolCall,
  MultiEditToolInput,
  MultiEditToolResult,
  NestedMessage,
  ReadToolCall,
  ReadToolInput,
  ReadToolResult,
  TaskToolCall,
  TaskToolInput,
  TaskToolResult,
  TodoWriteToolCall,
  TodoWriteToolInput,
  TodoWriteToolResult,
  WebFetchToolCall,
  WebFetchToolInput,
  WebFetchToolResult,
  WriteToolCall,
  WriteToolInput,
  WriteToolResult,
} from "./types";

function convertToWindowsLineEndings(text: string): string {
  return text.replace(/\r?\n/g, "\r\n");
}

function convertToolCall(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null
): ToolInvocationPart {
  const createCallInvocation = (toolName: string): ToolInvocationPart => ({
    type: "tool-invocation",
    toolInvocation: {
      state: "call",
      toolCallId: c.id,
      toolName,
      args: {},
    },
  });

  if (c.name === "LS") {
    return handleListFiles(
      c as LSToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  if (c.name === "Write") {
    return handleWriteToFile(
      c as WriteToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  if (c.name === "Glob") {
    return handleGlobFiles(
      c as GlobToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  if (c.name === "TodoWrite") {
    return handleTodoWrite(
      c as TodoWriteToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  if (c.name === "WebFetch") {
    return handleWebFetch(
      c as WebFetchToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  if (c.name === "MultiEdit") {
    return handleMultiEdit(
      c as MultiEditToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  if (c.name === "Task") {
    return handleNewTask(
      c as TaskToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  if (c.name === "Read") {
    return handleReadFile(
      c as ReadToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  if (c.name === "Edit") {
    return handleApplyDiff(
      c as EditToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  if (c.name === "Bash") {
    return handleExecuteCommand(
      c as BashToolCall,
      toolResultItem,
      createCallInvocation
    );
  }

  return handleUnknownTool(c, toolResultItem, createCallInvocation);
}

function handleListFiles(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
  createCallInvocation: (toolName: string) => ToolInvocationPart
): ToolInvocationPart {
  const toolName = "listFiles";

  if (!toolResultItem) {
    return createCallInvocation(toolName);
  }

  const { path } = c.input as LSToolInput;
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

  const { content, file_path: path } = c.input as WriteToolInput;
  const toolResult = (toolResultItem as WriteToolResult).toolUseResult;

  let success = true;
  if (
    typeof toolResult === "object" &&
    toolResult !== null &&
    "success" in toolResult
  ) {
    success = toolResult.success;
  }

  const invocation: ToolInvocationUIPart<ClientToolsType["writeToFile"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { content, path },
      result: {
        success,
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

  const { pattern: globPattern, path } = c.input as GlobToolInput;
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

  const { todos } = c.input as TodoWriteToolInput;
  const toolResult = (toolResultItem as TodoWriteToolResult).toolUseResult;

  let success = true;
  if (typeof toolResult === "object" && toolResult !== null) {
    if ("success" in toolResult) {
      success = toolResult.success;
    }
  }

  const invocation: ToolInvocationUIPart<ClientToolsType["todoWrite"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { todos: todos || [] },
      result: {
        success,
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

  const { url } = c.input as WebFetchToolInput;
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

  const { file_path: path, edits } = c.input as MultiEditToolInput;
  const formattedEdits = edits.map(
    (edit: { old_string: string; new_string: string }) => ({
      searchContent: edit.old_string,
      replaceContent: edit.new_string,
    })
  );

  const toolUseResult = (toolResultItem as MultiEditToolResult).toolUseResult;
  const { added, removed } = toolUseResult.structuredPatch.reduce(
    (
      summary: { added: number; removed: number },
      patch: { lines: string[] }
    ) => {
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

  const { description, prompt } = c.input as TaskToolInput;
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
  } = c.input as ReadToolInput;
  const result = (toolResultItem as ReadToolResult).toolUseResult;

  const args = { path, startLine, endLine };
  const resultData = !result.file
    ? { error: "Error: ENOENT: no such file or directory" }
    : { content: result.file.content || "", isTruncated: false };

  return {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args,
      result: resultData,
    },
  } as ToolInvocationUIPart<ClientToolsType["readFile"]>;
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
  } = c.input as EditToolInput;
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

  let result = "";
  if (isError) {
    if (typeof bashResult === "string") {
      result = bashResult;
    }
  } else {
    if (
      typeof bashResult === "object" &&
      bashResult !== null &&
      "stdout" in bashResult
    ) {
      result = bashResult.stdout || "";
    } else if (typeof bashResult === "string") {
      result = bashResult;
    }
  }

  const invocation: ToolInvocationUIPart<ClientToolsType["executeCommand"]> = {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolCallId: c.id,
      toolName,
      args: { command: (c.input as BashToolInput)?.command || "" },
      result: {
        output: convertToWindowsLineEndings(result || ""),
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

class ClaudeConverter {
  convert(content: string): UIMessage[] {
    try {
      const lines = content.split("\n").filter(Boolean);
      const parsedData: ClaudeCodeMessage[] = lines.map((line) =>
        JSON.parse(line)
      );

      const extractedMessages: UIMessage[] = parsedData
        .map((item, index) => this.parseMessage(item, parsedData, index))
        .filter((message): message is UIMessage => message !== null);

      return extractedMessages;
    } catch (error) {
      console.error("Error processing content:", error);
      return [];
    }
  }

  private parseMessage(
    item: ClaudeCodeMessage,
    parsedData: ClaudeCodeMessage[],
    index: number
  ): UIMessage | null {
    if (!item.message || typeof item.message !== "object") {
      return null;
    }

    if ("uuid" in item) {
      const nestedMessage = item.message as NestedMessage;

      if ("role" in nestedMessage && "content" in nestedMessage) {
        if (item.type === "assistant" && nestedMessage.role === "assistant") {
          return this.parseAssistantMessage(
            item,
            nestedMessage,
            parsedData,
            index
          );
        }

        if (item.type === "user" && nestedMessage.role === "user") {
          return this.parseUserMessage(item, nestedMessage);
        }
      }

      return this.parseOtherMessageTypes(item, nestedMessage);
    }
    return null;
  }

  private parseAssistantMessage(
    historyItem: ClaudeCodeMessage,
    nestedMessage: NestedMessage,
    parsedData: ClaudeCodeMessage[],
    index: number
  ): UIMessage {
    const parts: (TextPart | ToolInvocationPart)[] = [];
    let textContent = "";

    if ("content" in nestedMessage && Array.isArray(nestedMessage.content)) {
      nestedMessage.content.forEach(
        (
          c:
            | Anthropic.Messages.ContentBlock
            | Anthropic.Messages.ContentBlockParam
        ) => {
          if (c.type === "text" && c.text) {
            textContent += c.text;
          } else if (c.type === "tool_use" && c.id && c.name) {
            let toolResultItem: ClaudeCodeMessage | null = null;
            for (let i = index + 1; i < parsedData.length; i++) {
              const futureItem = parsedData[i];
              if (
                futureItem &&
                futureItem.type === "user" &&
                futureItem.message &&
                typeof futureItem.message === "object" &&
                "role" in futureItem.message &&
                futureItem.message.role === "user" &&
                Array.isArray(futureItem.message.content)
              ) {
                const toolResultContent = futureItem.message.content.find(
                  (
                    contentPart:
                      | Anthropic.Messages.ContentBlock
                      | Anthropic.Messages.ContentBlockParam
                  ) =>
                    contentPart.type === "tool_result" &&
                    contentPart.tool_use_id === c.id
                );
                if (toolResultContent) {
                  toolResultItem = futureItem;
                  break;
                }
              }
            }

            const toolInvocation = convertToolCall(
              c as ClaudeToolCall,
              toolResultItem
            );
            parts.push(toolInvocation);
          }
        }
      );
    }

    if (textContent) {
      parts.unshift({
        type: "text",
        text: textContent,
      });
    }

    return {
      id: historyItem.uuid,
      role: "assistant",
      content: textContent || "",
      createdAt: new Date(historyItem.timestamp),
      ...(parts.length > 0 && { parts }),
    } as UIMessage;
  }

  private parseUserMessage(
    historyItem: ClaudeCodeMessage,
    nestedMessage: NestedMessage
  ): UIMessage | null {
    if (
      "content" in nestedMessage &&
      typeof nestedMessage.content === "string"
    ) {
      return {
        id: historyItem.uuid,
        role: "user",
        content: nestedMessage.content,
        createdAt: new Date(historyItem.timestamp),
        parts: [{ type: "text", text: nestedMessage.content }],
      } as UIMessage;
    }

    if ("content" in nestedMessage && Array.isArray(nestedMessage.content)) {
      if (
        nestedMessage.content.length === 1 &&
        nestedMessage.content[0]?.type === "tool_result"
      ) {
        return null;
      }

      const parts: TextPart[] = [];
      let textContent = "";

      nestedMessage.content.forEach(
        (
          c:
            | Anthropic.Messages.ContentBlock
            | Anthropic.Messages.ContentBlockParam
        ) => {
          if (c.type === "text" && c.text) {
            textContent += c.text;
          } else if (c.type === "image" && c.source) {
            textContent += `[Image: ${c.source.type}]`;
          } else if (c.type === "tool_result" && c.content) {
            textContent += c.content;
          }
        }
      );

      if (textContent) {
        parts.push({
          type: "text",
          text: textContent,
        });
      }

      return {
        id: historyItem.uuid,
        role: "user",
        content: textContent,
        createdAt: new Date(historyItem.timestamp),
        ...(parts.length > 0 && { parts }),
      } as UIMessage;
    }

    return null;
  }

  private parseOtherMessageTypes(
    historyItem: ClaudeCodeMessage,
    nestedMessage: NestedMessage
  ): UIMessage | null {
    if (historyItem.type === "result" && "result" in nestedMessage) {
      const content = `[Result] ${nestedMessage.result} (Cost: $${nestedMessage.total_cost_usd})`;
      return {
        id: historyItem.uuid,
        role: "system",
        content,
        parts: [{ type: "text", text: content }],
      } as UIMessage;
    }

    if (historyItem.type === "error") {
      const content = "[Error occurred during conversation]";
      return {
        id: historyItem.uuid,
        role: "system",
        content,
        parts: [{ type: "text", text: content }],
      } as UIMessage;
    }

    if (
      historyItem.type === "system" &&
      "subtype" in nestedMessage &&
      nestedMessage.subtype === "init"
    ) {
      const content = `[Session initialized with tools: ${nestedMessage.tools?.join(
        ", "
      )}]`;
      return {
        id: historyItem.uuid,
        role: "system",
        content,
        parts: [{ type: "text", text: content }],
      } as UIMessage;
    }

    return null;
  }
}

export const claude = new ClaudeConverter();
