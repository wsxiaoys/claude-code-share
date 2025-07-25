import { type UIMessage, type TextPart } from "ai";
import {
  type ClaudeCodeMessage,
  type NestedMessage,
} from "./types/claude_code_types";
import fs from "fs";
import type { ToolInvocationPart } from "./types/UiMessage_type";
import { _createToolInvocation } from "./tool_type_convert";

/**
 * This class is used to parse the Claude Code history file and convert it to a format that can be used by the AI SDK.
 * It also handles tool calls and results.
 */
export class HistoryParser {
  /**
   * Parses a file at the given path and returns an array of UIMessage objects.
   * @param filePath The path to the file to parse.
   * @returns An array of parsed UIMessage objects.
   */
  public parse(filePath: string): UIMessage[] {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return this.parseFromString(fileContent);
    } catch (error) {
      console.error("Error processing file:", error);
      return [];
    }
  }

  /**
   * Parses the given string content and returns an array of UIMessage objects.
   * @param content The string content to parse.
   * @returns An array of parsed UIMessage objects.
   */
  public parseFromString(content: string): UIMessage[] {
    try {
      const lines = content.split("\n").filter(Boolean);
      const parsedData: ClaudeCodeMessage[] = lines.map((line) =>
        JSON.parse(line)
      );

      const extractedMessages: UIMessage[] = parsedData
        .map((item, index) => this._parseMessage(item, parsedData, index))
        .filter((message): message is UIMessage => message !== null);

      return extractedMessages;
    } catch (error) {
      console.error("Error processing content:", error);
      return [];
    }
  }

  /**
   * Private method to parse a single message item.
   * @param item The ClaudeCodeMessage item to parse.
   * @param parsedData The array of all parsed data.
   * @param index The index of the item in the array.
   * @returns A UIMessage object or null.
   */
  private _parseMessage(
    item: ClaudeCodeMessage,
    parsedData: ClaudeCodeMessage[],
    index: number
  ): UIMessage | null {
    // Skip if message is invalid
    if (!item.message || typeof item.message !== "object") {
      return null;
    }

    if ("uuid" in item) {
      const nestedMessage = item.message as NestedMessage;

      if ("role" in nestedMessage && "content" in nestedMessage) {
        if (item.type === "assistant" && nestedMessage.role === "assistant") {
          return this._parseAssistantMessage(
            item,
            nestedMessage,
            parsedData,
            index
          );
        }

        if (item.type === "user" && nestedMessage.role === "user") {
          return this._parseUserMessage(item, nestedMessage);
        }
      }

      return this._parseOtherMessageTypes(item, nestedMessage);
    }
    return null;
  }

  /**
   * Parses an assistant message.
   * @param historyItem The history item.
   * @param nestedMessage The nested message object.
   * @param parsedData The array of all parsed data.
   * @param index The index of the item.
   * @returns A UIMessage object.
   */
  private _parseAssistantMessage(
    historyItem: ClaudeCodeMessage,
    nestedMessage: NestedMessage,
    parsedData: ClaudeCodeMessage[],
    index: number
  ): UIMessage {
    const parts: (TextPart | ToolInvocationPart)[] = [];
    let textContent = "";

    // Process array content for assistant
    if ("content" in nestedMessage && Array.isArray(nestedMessage.content)) {
      nestedMessage.content.forEach((c: any) => {
        if (c.type === "text" && c.text) {
          textContent += c.text;
        } else if (c.type === "tool_use" && c.id && c.name) {
          let toolResultItem: ClaudeCodeMessage | null = null;
          // Look ahead through all subsequent messages to find tool result
          // Claude may make multiple tool calls before returning results
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
              // Find matching tool result in this user message
              const toolResultContent = futureItem.message.content.find(
                (contentPart: any) =>
                  contentPart.type === "tool_result" &&
                  contentPart.tool_use_id === c.id
              );
              if (toolResultContent) {
                toolResultItem = futureItem; // Store the whole item
                break; // Found the result, stop searching
              }
            }
          }

          const toolInvocation = _createToolInvocation(c, toolResultItem);
          parts.push(toolInvocation);
        }
      });
    }

    // Add text part if content exists
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

  /**
   * Parses a user message.
   * @param historyItem The history item.
   * @param nestedMessage The nested message object.
   * @returns A UIMessage object or null.
   */
  private _parseUserMessage(
    historyItem: ClaudeCodeMessage,
    nestedMessage: NestedMessage
  ): UIMessage | null {
    // Handle string content directly
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

    // Handle array content
    if ("content" in nestedMessage && Array.isArray(nestedMessage.content)) {
      // Skip if only tool result
      if (
        nestedMessage.content.length === 1 &&
        nestedMessage.content[0]?.type === "tool_result"
      ) {
        return null;
      }

      const parts: TextPart[] = [];
      let textContent = "";

      // Concatenate content from different types
      nestedMessage.content.forEach((c: any) => {
        if (c.type === "text" && c.text) {
          textContent += c.text;
        } else if (c.type === "image" && c.source) {
          textContent += `[Image: ${c.source.type}]`;
        } else if (c.type === "tool_result" && c.content) {
          textContent += c.content;
        }
      });

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

  /**
   * Parses other types of messages like system, error, or result.
   * @param historyItem The history item.
   * @param nestedMessage The nested message object.
   * @returns A UIMessage object or null.
   */
  private _parseOtherMessageTypes(
    historyItem: ClaudeCodeMessage,
    nestedMessage: NestedMessage
  ): UIMessage | null {
    // Handle result type
    if (historyItem.type === "result" && "result" in nestedMessage) {
      const content = `[Result] ${nestedMessage.result} (Cost: $${nestedMessage.total_cost_usd})`;
      return {
        id: historyItem.uuid,
        role: "system",
        content,
        parts: [{ type: "text", text: content }],
      } as UIMessage;
    }

    // Handle error type
    if (historyItem.type === "error") {
      const content = "[Error occurred during conversation]";
      return {
        id: historyItem.uuid,
        role: "system",
        content,
        parts: [{ type: "text", text: content }],
      } as UIMessage;
    }

    // Handle system init
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
