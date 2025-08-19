import type { Anthropic } from "@anthropic-ai/sdk";
import type { ClaudeCodeMessage } from "./types";
import type { Message } from "@/types";

// Todo interface matching the expected structure
interface Todo {
  status: "pending" | "in-progress" | "completed" | "cancelled";
  id: string;
  content: string;
  priority: "low" | "medium" | "high";
}

// SubTask interface that matches the expected structure
export interface SubTask {
  uid: string;
  clientTaskId: string;
  messages: Message[];
  todos: Todo[];
}

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

  // First pass: Find all sidechain messages with their indices
  const sidechainMessages: { message: ClaudeCodeMessage; index: number }[] = [];
  for (let i = startIndex; i < parsedData.length; i++) {
    const message = parsedData[i];
    if (message && message.isSidechain) {
      sidechainMessages.push({ message, index: i });
    }
  }

  // Find all chain heads (parentUuid === null)
  const chainHeads = sidechainMessages.filter(
    ({ message }) => message.parentUuid === null
  );

  // For each chain head, build its complete chain
  for (const { message: headMessage, index: headIndex } of chainHeads) {
    const chain: ClaudeCodeMessage[] = [headMessage];
    const chainId = headMessage.uuid;

    // Build the chain by finding all descendants in temporal order
    buildChainRecursively(
      chain,
      headMessage.uuid,
      sidechainMessages,
      headIndex
    );

    if (chain.length > 0) {
      subtaskChains.set(chainId, chain);
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
    if (messages.length > 0 && !usedChains.has(chainId)) {
      // Check if any message in this chain references the task tool call ID
      const hasTaskReference = messages.some((msg) => {
        if (
          msg.message &&
          typeof msg.message === "object" &&
          "content" in msg.message
        ) {
          const content = msg.message.content;
          if (typeof content === "string") {
            return content.includes(taskToolCallId);
          }
          if (Array.isArray(content)) {
            return content.some(
              (
                c:
                  | Anthropic.Messages.ContentBlock
                  | Anthropic.Messages.ContentBlockParam
              ) => {
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
                return false;
              }
            );
          }
        }
        return false;
      });

      if (hasTaskReference) {
        usedChains.add(chainId);
        return messages;
      }
    }
  }

  // Strategy 2: Fallback to temporal proximity (closest unused chain after the task)
  let bestMatch: ClaudeCodeMessage[] = [];
  let smallestDistance = Infinity;
  let bestChainId = "";

  for (const [chainId, messages] of subtaskChains) {
    if (messages.length > 0 && !usedChains.has(chainId)) {
      // Find the index of the first message in this chain
      const firstMessage = messages[0];
      if (!firstMessage) continue;

      const firstMessageIndex = parsedData.findIndex(
        (msg) => msg && msg.uuid === firstMessage.uuid
      );

      if (firstMessageIndex >= startIndex) {
        const distance = firstMessageIndex - startIndex;
        if (distance < smallestDistance) {
          smallestDistance = distance;
          bestMatch = messages;
          bestChainId = chainId;
        }
      }
    }
  }

  // Mark this chain as used
  if (bestChainId) {
    usedChains.add(bestChainId);
  }

  return bestMatch;
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
  const messages = subtaskMessages
    .map((item, index) =>
      parseMessage(item, subtaskMessages, index, { includeSidechain: true })
    )
    .filter((message): message is Message => message !== null);

  // Extract todos from TodoWrite tool calls in subtask messages
  const todos: Todo[] = [];
  subtaskMessages.forEach((message) => {
    if (
      message.message &&
      typeof message.message === "object" &&
      "content" in message.message
    ) {
      const content = message.message.content;
      if (Array.isArray(content)) {
        content.forEach(
          (
            c:
              | Anthropic.Messages.ContentBlock
              | Anthropic.Messages.ContentBlockParam
          ) => {
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
              // Type guard and filter valid todos
              const validTodos = c.input.todos.filter(
                (todo: unknown): todo is Todo => {
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
              );
              todos.push(...validTodos);
            }
          }
        );
      }
    }
  });

  return {
    uid: subtaskMessages[0]?.uuid || taskToolCallId,
    clientTaskId: taskToolCallId,
    messages,
    todos,
  };
}
