import type { SubTask, Todo } from "@getpochi/tools";
import type { Message } from "@/types";
import type { ClaudeCodeMessage } from "./types";

// Global state for tracking used chains across the entire conversion
let globalUsedChains: Set<string> | null = null;

/**
 * Initialize global chain tracking for a conversion session
 */
export function initializeChainTracking(): void {
  globalUsedChains = new Set<string>();
}

/**
 * Clean up global chain tracking after conversion
 */
export function cleanupChainTracking(): void {
  globalUsedChains = null;
}

/**
 * Get the global used chains set
 */
export function getGlobalUsedChains(): Set<string> | null {
  return globalUsedChains;
}

/**
 * Build subtask chains from sidechain messages
 */
function buildSubtaskChains(
  parsedData: ClaudeCodeMessage[],
  startIndex: number
): Map<string, ClaudeCodeMessage[]> {
  const subtaskChains = new Map<string, ClaudeCodeMessage[]>();
  const sidechainMessages = parsedData
    .slice(startIndex)
    .map((message, idx) => ({ message, index: startIndex + idx }))
    .filter(({ message }) => message?.isSidechain);

  // Build chains for each head (parentUuid === null)
  for (const { message: headMessage, index: headIndex } of sidechainMessages) {
    if (headMessage.parentUuid === null) {
      const chain = [headMessage];
      buildChainRecursively(
        chain,
        headMessage.uuid,
        sidechainMessages,
        headIndex
      );
      subtaskChains.set(headMessage.uuid, chain);
    }
  }

  return subtaskChains;
}

/**
 * Recursively build a chain by finding all descendants
 */
function buildChainRecursively(
  chain: ClaudeCodeMessage[],
  parentUuid: string,
  allSidechainMessages: { message: ClaudeCodeMessage; index: number }[],
  afterIndex: number
): void {
  // Find all direct children of this parent that appear after the current position
  const children = allSidechainMessages
    .filter(
      ({ message, index }) =>
        message.parentUuid === parentUuid && index > afterIndex
    )
    .sort((a, b) => a.index - b.index); // Ensure temporal ordering

  // Add each child and recursively build their subtrees
  for (const { message: childMessage, index: childIndex } of children) {
    chain.push(childMessage);
    // Recursively add descendants of this child
    buildChainRecursively(
      chain,
      childMessage.uuid,
      allSidechainMessages,
      childIndex
    );
  }
}

/**
 * Check if a message references a specific task tool call ID
 */
function hasTaskReference(
  msg: ClaudeCodeMessage,
  taskToolCallId: string
): boolean {
  if (
    !msg.message ||
    typeof msg.message !== "object" ||
    !("content" in msg.message)
  ) {
    return false;
  }

  const content = msg.message.content;
  if (typeof content === "string") {
    return content.includes(taskToolCallId);
  }

  if (Array.isArray(content)) {
    return content.some((c) => {
      if (c.type === "text" && "text" in c && c.text) {
        return c.text.includes(taskToolCallId);
      }
      if (
        c.type === "tool_result" &&
        "tool_use_id" in c &&
        c.tool_use_id === taskToolCallId
      ) {
        return true;
      }
      if (c.type === "tool_use" && "id" in c && c.id === taskToolCallId) {
        return true;
      }
      return false;
    });
  }

  return false;
}

/**
 * Find subtask messages for a specific task
 */
function findSubtaskMessagesForTask(
  taskToolCallId: string,
  parsedData: ClaudeCodeMessage[],
  startIndex: number,
  usedChains: Set<string>
): ClaudeCodeMessage[] {
  const subtaskChains = buildSubtaskChains(parsedData, startIndex);

  // Strategy 1: Look for a chain that directly references this task
  for (const [chainId, messages] of subtaskChains) {
    if (!usedChains.has(chainId)) {
      const hasReference = messages.some((msg) =>
        hasTaskReference(msg, taskToolCallId)
      );
      if (hasReference) {
        usedChains.add(chainId);
        return messages;
      }
    }
  }

  // Strategy 2: If no direct reference, assign the first unused chain in temporal order
  // This handles cases where subtasks don't contain direct task references
  const sortedChains = Array.from(subtaskChains.entries())
    .filter(([chainId]) => !usedChains.has(chainId))
    .sort(([, messagesA], [, messagesB]) => {
      const indexA = parsedData.findIndex(
        (msg) => msg?.uuid === messagesA[0]?.uuid
      );
      const indexB = parsedData.findIndex(
        (msg) => msg?.uuid === messagesB[0]?.uuid
      );
      return indexA - indexB;
    });

  if (sortedChains.length > 0) {
    const firstChain = sortedChains[0];
    if (firstChain) {
      const [chainId, messages] = firstChain;
      usedChains.add(chainId);
      return messages;
    }
  }
  return [];
}

/**
 * Extract todos from TodoWrite tool calls in messages
 */
function extractTodosFromMessages(messages: ClaudeCodeMessage[]): Todo[] {
  const todos: Todo[] = [];

  for (const message of messages) {
    if (
      !message.message ||
      typeof message.message !== "object" ||
      !("content" in message.message)
    ) {
      continue;
    }

    const content = message.message.content;
    if (!Array.isArray(content)) continue;

    for (const c of content) {
      if (
        c.type === "tool_use" &&
        "name" in c &&
        c.name === "TodoWrite" &&
        "input" in c &&
        c.input &&
        typeof c.input === "object" &&
        "todos" in c.input &&
        Array.isArray(c.input.todos)
      ) {
        const validTodos = c.input.todos.filter(isValidTodo);
        todos.push(...validTodos);
      }
    }
  }

  return todos;
}

/**
 * Type guard for valid todo objects
 */
function isValidTodo(todo: unknown): todo is Todo {
  if (typeof todo !== "object" || todo === null) {
    return false;
  }
  const todoObj = todo as Record<string, unknown>;
  return (
    "status" in todoObj &&
    "id" in todoObj &&
    "content" in todoObj &&
    "priority" in todoObj &&
    typeof todoObj.status === "string" &&
    typeof todoObj.id === "string" &&
    typeof todoObj.content === "string" &&
    typeof todoObj.priority === "string"
  );
}

/**
 * Extract subtask data for a specific task tool call
 */
export function extractSubtaskData(
  taskToolCallId: string,
  parsedData: ClaudeCodeMessage[],
  startIndex: number,
  usedChains: Set<string>,
  parseMessage: (
    item: ClaudeCodeMessage,
    parsedData: ClaudeCodeMessage[],
    index: number,
    options?: { includeSidechain?: boolean }
  ) => Message | null
): SubTask | null {
  const subtaskMessages = findSubtaskMessagesForTask(
    taskToolCallId,
    parsedData,
    startIndex,
    usedChains
  );

  if (subtaskMessages.length === 0) {
    return null;
  }

  // Convert subtask messages to UIMessage format
  // Note: We pass the full parsedData to ensure tool result matching works correctly
  const messages = subtaskMessages
    .map((item) => {
      const originalIndex = parsedData.findIndex(
        (msg) => msg?.uuid === item.uuid
      );
      return parseMessage(item, parsedData, originalIndex, {
        includeSidechain: true,
      });
    })
    .filter((message): message is Message => message !== null);

  const todos = extractTodosFromMessages(subtaskMessages);

  return {
    uid: subtaskMessages[0]?.uuid || taskToolCallId,
    clientTaskId: taskToolCallId,
    messages,
    todos,
  };
}
