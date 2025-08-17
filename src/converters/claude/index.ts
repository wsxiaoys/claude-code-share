import type { Anthropic } from "@anthropic-ai/sdk";
import type { ClientTools } from "@getpochi/tools";
import type { TextPart, UIMessage, UIMessagePart } from "ai";
import type { Message, UIToolPart } from "@/types";
import type { ProviderConverter } from "@/types";
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

function getIsErrorFromToolResult(
  toolResultItem: ClaudeCodeMessage | null
): boolean {
  if (!toolResultItem) return false;

  if (
    "message" in toolResultItem &&
    toolResultItem.message &&
    "content" in toolResultItem.message &&
    Array.isArray(toolResultItem.message.content)
  ) {
    const item = toolResultItem.message.content[0];
    return item && typeof item === "object" && "is_error" in item
      ? Boolean(item.is_error)
      : false;
  }

  return false;
}

function convertToolCall(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null
): UIToolPart {
  if (c.name === "LS") {
    return handleListFiles(
      c as LSToolCall,
      toolResultItem,
    );
  }

  if (c.name === "Write") {
    return handleWriteToFile(
      c as WriteToolCall,
      toolResultItem,
    );
  }

  if (c.name === "Glob") {
    return handleGlobFiles(
      c as GlobToolCall,
      toolResultItem,
    );
  }

  if (c.name === "TodoWrite") {
    return handleTodoWrite(
      c as TodoWriteToolCall,
      toolResultItem,
    );
  }

  if (c.name === "MultiEdit") {
    return handleMultiEdit(
      c as MultiEditToolCall,
      toolResultItem,
    );
  }

  if (c.name === "Task") {
    return handleNewTask(
      c as TaskToolCall,
      toolResultItem,
    );
  }

  if (c.name === "Read") {
    return handleReadFile(
      c as ReadToolCall,
      toolResultItem,
    );
  }

  if (c.name === "Edit") {
    return handleApplyDiff(
      c as EditToolCall,
      toolResultItem,
    );
  }

  if (c.name === "Bash") {
    return handleExecuteCommand(
      c as BashToolCall,
      toolResultItem,
    );
  }

  return handleUnknownTool(c, toolResultItem);
}

function handleListFiles(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"listFiles"> {
  const { path } = c.input as LSToolInput;
  const toolCall = {
      type: "tool-listFiles" as const,
      toolCallId: c.id,
      input: {path},
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available"
    }
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
        files: ((toolResultItem as LSToolResult).toolUseResult || "")
          .split("\n")
          .filter(Boolean),
        isTruncated: false,
    }
  }
}

function handleWriteToFile(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"writeToFile"> {
  const { content, file_path: path } = c.input as WriteToolInput;
  const toolCall = {
    type: "tool-writeToFile" as const,
    toolCallId: c.id,
    input: { content, path },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const toolResult = (toolResultItem as WriteToolResult).toolUseResult;
  const isError = getIsErrorFromToolResult(toolResultItem);

  let success = true;
  const result: { success: boolean; error?: string } = { success };

  if (isError) {
    if (typeof toolResult === "string") {
      result.error = toolResult;
      result.success = false;
    }
  }

  return {
    ...toolCall,
    state: "output-available",
    output: result,
  };
}

function handleGlobFiles(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"globFiles"> {
  const { pattern: globPattern, path } = c.input as GlobToolInput;
  const toolCall = {
    type: "tool-globFiles" as const,
    toolCallId: c.id,
    input: { globPattern, path },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      files: (toolResultItem as GlobToolResult).toolUseResult.filenames || [],
      isTruncated: false,
    },
  };
}

function handleTodoWrite(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"todoWrite"> {
  const { todos } = c.input as TodoWriteToolInput;
  const todosWithDefaults = (todos || []).map((todo) => ({
    ...todo,
    priority:
      todo.priority && ["low", "medium", "high"].includes(todo.priority)
        ? todo.priority
        : ("medium" as const),
  }));

  const toolCall = {
    type: "tool-todoWrite" as const,
    toolCallId: c.id,
    input: { todos: todosWithDefaults },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const toolResult = (toolResultItem as TodoWriteToolResult).toolUseResult;
  let success = true;
  if (typeof toolResult === "object" && toolResult !== null) {
    if ("success" in toolResult) {
      success = toolResult.success;
    }
  }

  return {
    ...toolCall,
    state: "output-available",
    output: { success },
  };
}

function handleMultiEdit(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"multiApplyDiff"> {
  const { file_path: path, edits } = c.input as MultiEditToolInput;
  const formattedEdits = edits.map(
    (edit: { old_string: string; new_string: string }) => ({
      searchContent: edit.old_string,
      replaceContent: edit.new_string,
    })
  );

  const toolCall = {
    type: "tool-multiApplyDiff" as const,
    toolCallId: c.id,
    input: { path, edits: formattedEdits },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const isError = getIsErrorFromToolResult(toolResultItem);
  let pochiResult;

  if (isError) {
    pochiResult = {
      success: false,
    };
  } else {
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

    pochiResult = {
      success: true,
      _meta: {
        editSummary: {
          added,
          removed,
        },
      },
    };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: pochiResult,
  };
}

function handleNewTask(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"newTask"> {
  const { description, prompt } = c.input as TaskToolInput;
  const toolCall = {
    type: "tool-newTask" as const,
    toolCallId: c.id,
    input: { description, prompt },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const result = (toolResultItem as TaskToolResult).toolUseResult;
  const content = result.content?.[0]?.text || "";

  return {
    ...toolCall,
    state: "output-available",
    output: { result: content },
  };
}

function handleReadFile(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"readFile"> {
  const {
    file_path: path,
    offset: startLine,
    limit: endLine,
  } = c.input as ReadToolInput;

  const toolCall = {
    type: "tool-readFile" as const,
    toolCallId: c.id,
    input: { path, startLine, endLine },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const result = (toolResultItem as ReadToolResult).toolUseResult;

  const resultData = {
    error: !result.file ? "Error: ENOENT: no such file or directory": undefined,
    content: result.file.content || "",
    isTruncated: false
  };

  return {
    ...toolCall,
    state: "output-available",
    output: resultData,
  };
}

function handleApplyDiff(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"applyDiff"> {
  const {
    file_path: path,
    old_string: searchContent,
    new_string: replaceContent,
  } = c.input as EditToolInput;

  const toolCall = {
    type: "tool-applyDiff" as const,
    toolCallId: c.id,
    input: { path, searchContent, replaceContent },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

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

  return {
    ...toolCall,
    state: "output-available",
    output: result,
  };
}

function handleExecuteCommand(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"executeCommand"> {
  const toolCall = {
    type: "tool-executeCommand" as const,
    toolCallId: c.id,
    input: { command: (c.input as BashToolInput)?.command || "" },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
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

  return {
    ...toolCall,
    state: "output-available",
    output: {
      output: convertToWindowsLineEndings(result || ""),
      isTruncated: false,
    },
  };
}

function handleUnknownTool(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart {
  const toolCall = {
    type: `tool-${c.name}` as const,
    toolCallId: c.id,
    input: (c.input as Record<string, unknown>) || {},
  };

  if (!toolResultItem) {
    // @ts-ignore
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  // @ts-ignore
  return {
    ...toolCall,
    state: "output-available",
    output: { output: String(toolResultItem.toolUseResult) || "" },
  };
}

class ClaudeConverter implements ProviderConverter {
  name = "claude";

  convert(content: string): Message[] {
    try {
      const lines = content.split("\n").filter(Boolean);
      const parsedData: ClaudeCodeMessage[] = lines.map((line) =>
        JSON.parse(line)
      );

      const extractedMessages: Message[] = parsedData
        .map((item, index) => this.parseMessage(item, parsedData, index))
        .filter((message): message is Message => message !== null);

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
  ): Message | null {
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
  ): Message {
    const parts: (TextPart | UIToolPart)[] = [];
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
    } as Message;
  }

  private parseUserMessage(
    historyItem: ClaudeCodeMessage,
    nestedMessage: NestedMessage
  ): Message | null {
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
      } as Message;
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
      } as Message;
    }

    return null;
  }

  private parseOtherMessageTypes(
    historyItem: ClaudeCodeMessage,
    nestedMessage: NestedMessage
  ): Message | null {
    if (historyItem.type === "result" && "result" in nestedMessage) {
      const content = `[Result] ${nestedMessage.result} (Cost: $${nestedMessage.total_cost_usd})`;
      return {
        id: historyItem.uuid,
        role: "system",
        content,
        parts: [{ type: "text", text: content }],
      } as Message;
    }

    if (historyItem.type === "error") {
      const content = "[Error occurred during conversation]";
      return {
        id: historyItem.uuid,
        role: "system",
        content,
        parts: [{ type: "text", text: content }],
      } as Message;
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
      } as Message;
    }

    return null;
  }
}

export const claude = new ClaudeConverter();
