import { type UIMessage, type TextPart, type ToolInvocation } from "ai";
import { type ClaudeCodeMessage } from "./types";
import fs from "fs";

/**
 * This class is used to parse the Claude Code history file and convert it to a format that can be used by the AI SDK.
 * It also handles tool calls and results.
 */
export class HistoryParser {
  public parse(filePath: string): UIMessage[] {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return this.parseFromString(fileContent);
    } catch (error) {
      console.error("Error processing file:", error);
      return [];
    }
  }

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

  private _parseMessage(
    item: ClaudeCodeMessage,
    parsedData: ClaudeCodeMessage[],
    index: number
  ): UIMessage | null {
    if (!item.message || typeof item.message !== "object") {
      return null;
    }

    if ("uuid" in item) {
      const nestedMessage = item.message as any;

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

  private _parseAssistantMessage(
    historyItem: ClaudeCodeMessage,
    nestedMessage: any,
    parsedData: ClaudeCodeMessage[],
    index: number
  ): UIMessage {
    type ToolInvocationPart = {
      type: "tool-invocation";
      toolInvocation: ToolInvocation;
    };
    const parts: (TextPart | ToolInvocationPart)[] = [];
    let textContent = "";

    if (Array.isArray(nestedMessage.content)) {
      nestedMessage.content.forEach((c: any) => {
        if (c.type === "text" && c.text) {
          textContent += c.text;
        } else if (c.type === "tool_use" && c.id && c.name) {
          let toolResult = null;
          const nextItem = parsedData[index + 1];
          if (
            nextItem &&
            nextItem.type === "user" &&
            nextItem.message &&
            typeof nextItem.message === "object" &&
            "role" in nextItem.message &&
            nextItem.message.role === "user" &&
            Array.isArray(nextItem.message.content)
          ) {
            const toolResultContent = nextItem.message.content.find(
              (contentPart: any) =>
                contentPart.type === "tool_result" &&
                contentPart.tool_use_id === c.id
            );
            if (toolResultContent) {
              toolResult = toolResultContent;
            }
          }

          const toolInvocation: ToolInvocationPart = {
            type: "tool-invocation",
            toolInvocation: {
              state: toolResult ? "result" : "call",
              toolCallId: c.id,
              toolName: c.name,
              args: c.input || {},
              ...(toolResult && {
                result: (toolResult as any).content || "",
              }),
            } as ToolInvocation,
          };
          parts.push(toolInvocation);
        }
      });
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

  private _parseUserMessage(
    historyItem: ClaudeCodeMessage,
    nestedMessage: any
  ): UIMessage | null {
    if (typeof nestedMessage.content === "string") {
      return {
        id: historyItem.uuid,
        role: "user",
        content: nestedMessage.content,
        createdAt: new Date(historyItem.timestamp),
        parts: [{ type: "text", text: nestedMessage.content }],
      } as UIMessage;
    }

    if (Array.isArray(nestedMessage.content)) {
      if (
        nestedMessage.content.length === 1 &&
        nestedMessage.content[0].type === "tool_result"
      ) {
        return null;
      }

      const parts: TextPart[] = [];
      let textContent = "";

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

  private _parseOtherMessageTypes(
    historyItem: ClaudeCodeMessage,
    nestedMessage: any
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

    if (historyItem.type === "system" && nestedMessage.subtype === "init") {
      const content = `[Session initialized with tools: ${
        nestedMessage.tools?.join(", ") || "none"
      }]`;
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
