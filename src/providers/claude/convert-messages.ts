import type { Anthropic } from "@anthropic-ai/sdk";
import type { TextPart } from "ai";
import type { Message, UIToolPart } from "@/types";
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
  WriteToolCall,
  WriteToolInput,
  WriteToolResult,
} from "./types";

function convertToWindowsLineEndings(text: string): string {
  return text.replace(/\r?\n/g, "\r\n");
}

function stripCwdPrefix(path: string, cwd: string): string {
  if (!cwd || !path) return path;

  // Normalize paths by removing trailing slashes
  const normalizedCwd = cwd.replace(/\/$/, "");
  const normalizedPath = path.replace(/\/$/, "");

  // If path starts with cwd, remove the cwd prefix
  if (normalizedPath.startsWith(normalizedCwd)) {
    const stripped = normalizedPath.slice(normalizedCwd.length);
    // Remove leading slash if present
    return stripped.startsWith("/") ? stripped.slice(1) : stripped;
  }

  return path;
}

function stripCwdFromArray(items: string[], cwd: string): string[] {
  return items.map((item) => stripCwdPrefix(item, cwd));
}

function stripCwdFromText(text: string, cwd: string): string {
  if (!cwd || !text) return text;

  // Split text into lines, process each line, then rejoin
  return text
    .split("\n")
    .map((line) => {
      // For each line, try to find and replace cwd prefixes
      // This handles cases where paths appear in the middle of lines
      const normalizedCwd = cwd.replace(/\/$/, "");
      if (line.includes(normalizedCwd)) {
        return line.replace(new RegExp(`${normalizedCwd}/?/`, "g"), "");
      }
      return line;
    })
    .join("\n");
}

function getIsErrorFromToolResult(
  toolResultItem: ClaudeCodeMessage | null,
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
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart {
  if (c.name === "LS") {
    return handleListFiles(c as LSToolCall, toolResultItem);
  }

  if (c.name === "Write") {
    return handleWriteToFile(c as WriteToolCall, toolResultItem);
  }

  if (c.name === "Glob") {
    return handleGlobFiles(c as GlobToolCall, toolResultItem);
  }

  if (c.name === "TodoWrite") {
    return handleTodoWrite(c as TodoWriteToolCall, toolResultItem);
  }

  if (c.name === "MultiEdit") {
    return handleMultiEdit(c as MultiEditToolCall, toolResultItem);
  }

  if (c.name === "Task") {
    return handleNewTask(c as TaskToolCall, toolResultItem);
  }

  if (c.name === "Read") {
    return handleReadFile(c as ReadToolCall, toolResultItem);
  }

  if (c.name === "Edit") {
    return handleApplyDiff(c as EditToolCall, toolResultItem);
  }

  if (c.name === "Bash") {
    return handleExecuteCommand(c as BashToolCall, toolResultItem);
  }

  return handleUnknownTool(c, toolResultItem);
}

function handleListFiles(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"listFiles"> {
  const { path } = c.input as LSToolInput;
  const cwd = toolResultItem?.cwd || "";
  const toolCall = {
    type: "tool-listFiles" as const,
    toolCallId: c.id,
    input: { path: stripCwdPrefix(path, cwd) },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const filesRaw = ((toolResultItem as LSToolResult).toolUseResult || "")
    .split("\n")
    .filter(Boolean);

  return {
    ...toolCall,
    state: "output-available",
    output: {
      files: stripCwdFromArray(filesRaw, cwd),
      isTruncated: false,
    },
  };
}

function handleWriteToFile(
  c: ClaudeToolCall,
  toolResultItem: ClaudeCodeMessage | null,
): UIToolPart<"writeToFile"> {
  const { content, file_path: path } = c.input as WriteToolInput;
  const cwd = toolResultItem?.cwd || "";
  const toolCall = {
    type: "tool-writeToFile" as const,
    toolCallId: c.id,
    input: { content, path: stripCwdPrefix(path, cwd) },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const toolResult = (toolResultItem as WriteToolResult).toolUseResult;
  const isError = getIsErrorFromToolResult(toolResultItem);

  const success = true;
  const result: { success: boolean; error?: string } = { success };

  if (isError) {
    if (typeof toolResult === "string") {
      result.error = stripCwdFromText(toolResult, cwd);
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
  const cwd = toolResultItem?.cwd || "";
  const toolCall = {
    type: "tool-globFiles" as const,
    toolCallId: c.id,
    input: { globPattern, path: stripCwdPrefix(path, cwd) },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const filenames =
    (toolResultItem as GlobToolResult).toolUseResult.filenames || [];

  return {
    ...toolCall,
    state: "output-available",
    output: {
      files: stripCwdFromArray(filenames, cwd),
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
    }),
  );

  const cwd = toolResultItem?.cwd || "";
  const toolCall = {
    type: "tool-multiApplyDiff" as const,
    toolCallId: c.id,
    input: { path: stripCwdPrefix(path, cwd), edits: formattedEdits },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const isError = getIsErrorFromToolResult(toolResultItem);
  let output: UIToolPart<"multiApplyDiff">["output"];

  if (isError) {
    output = {
      success: false,
    };
  } else {
    const toolUseResult = (toolResultItem as MultiEditToolResult).toolUseResult;
    const { added, removed } = toolUseResult.structuredPatch.reduce(
      (
        summary: { added: number; removed: number },
        patch: { lines: string[] },
      ) => {
        patch.lines.forEach((line: string) => {
          if (line.startsWith("+")) summary.added++;
          if (line.startsWith("-")) summary.removed++;
        });
        return summary;
      },
      { added: 0, removed: 0 },
    );

    output = {
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
    output,
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

  const cwd = toolResultItem?.cwd || "";
  const toolCall = {
    type: "tool-readFile" as const,
    toolCallId: c.id,
    input: { path: stripCwdPrefix(path, cwd), startLine, endLine },
  };

  if (!toolResultItem) {
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  const result = (toolResultItem as ReadToolResult).toolUseResult;

  const resultData = {
    error: !result.file
      ? "Error: ENOENT: no such file or directory"
      : undefined,
    content: result.file?.content || "",
    isTruncated: false,
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

  const cwd = toolResultItem?.cwd || "";
  const toolCall = {
    type: "tool-applyDiff" as const,
    toolCallId: c.id,
    input: { path: stripCwdPrefix(path, cwd), searchContent, replaceContent },
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
      { added: 0, removed: 0 },
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
      result = (bashResult as { stdout?: string }).stdout || "";
    } else if (typeof bashResult === "string") {
      result = bashResult;
    }
  }

  const cwd = toolResultItem?.cwd || "";
  const cleaned = stripCwdFromText(result || "", cwd);

  return {
    ...toolCall,
    state: "output-available",
    output: {
      output: convertToWindowsLineEndings(cleaned),
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

  const cwd = toolResultItem?.cwd || "";
  // @ts-ignore
  return {
    ...toolCall,
    state: "output-available",
    output: {
      output: stripCwdFromText(String(toolResultItem.toolUseResult) || "", cwd),
    },
  };
}

export function convertToMessages(content: string): Message[] {
  try {
    const lines = content.split("\n").filter(Boolean);
    const parsedData: ClaudeCodeMessage[] = lines.map((line) =>
      JSON.parse(line),
    );

    const extractedMessages: Message[] = parsedData
      .map((item, index) => parseMessage(item, parsedData, index))
      .filter((message): message is Message => message !== null);

    return extractedMessages;
  } catch (error) {
    console.error("Error processing content:", error);
    return [];
  }
}

function parseMessage(
  item: ClaudeCodeMessage,
  parsedData: ClaudeCodeMessage[],
  index: number,
): Message | null {
  if (!item.message || typeof item.message !== "object") {
    return null;
  }

  if ("uuid" in item) {
    const nestedMessage = item.message as NestedMessage;

    if ("role" in nestedMessage && "content" in nestedMessage) {
      if (item.type === "assistant" && nestedMessage.role === "assistant") {
        return parseAssistantMessage(item, nestedMessage, parsedData, index);
      }

      if (item.type === "user" && nestedMessage.role === "user") {
        return parseUserMessage(item, nestedMessage);
      }
    }

    return parseOtherMessageTypes(item, nestedMessage);
  }
  return null;
}

function parseAssistantMessage(
  historyItem: ClaudeCodeMessage,
  nestedMessage: NestedMessage,
  parsedData: ClaudeCodeMessage[],
  index: number,
): Message {
  const parts: (TextPart | UIToolPart)[] = [];
  let textContent = "";

  if ("content" in nestedMessage && Array.isArray(nestedMessage.content)) {
    nestedMessage.content.forEach(
      (
        c:
          | Anthropic.Messages.ContentBlock
          | Anthropic.Messages.ContentBlockParam,
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
                    | Anthropic.Messages.ContentBlockParam,
                ) =>
                  contentPart.type === "tool_result" &&
                  contentPart.tool_use_id === c.id,
              );
              if (toolResultContent) {
                toolResultItem = futureItem;
                break;
              }
            }
          }

          const toolInvocation = convertToolCall(
            c as ClaudeToolCall,
            toolResultItem,
          );
          parts.push(toolInvocation);
        }
      },
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

function parseUserMessage(
  historyItem: ClaudeCodeMessage,
  nestedMessage: NestedMessage,
): Message | null {
  if ("content" in nestedMessage && typeof nestedMessage.content === "string") {
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
          | Anthropic.Messages.ContentBlockParam,
      ) => {
        if (c.type === "text" && c.text) {
          textContent += c.text;
        } else if (c.type === "image" && c.source) {
          textContent += `[Image: ${c.source.type}]`;
        } else if (c.type === "tool_result" && c.content) {
          textContent += c.content;
        }
      },
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

function parseOtherMessageTypes(
  historyItem: ClaudeCodeMessage,
  nestedMessage: NestedMessage,
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
      ", ",
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
