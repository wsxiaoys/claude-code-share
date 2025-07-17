import { type UIMessage } from "ai";
import fs from "fs";

interface HistoryItem {
  type: "user" | "assistant";
  message: {
    role: "user" | "assistant" | "tool";
    content:
      | string
      | {
          type: string;
          text?: string;
          file?: { content: string };
          id?: string;
          name?: string;
          input?: any;
          tool_use_id?: string;
          tool_call_id?: string;
          content?: string;
        }[];
    tool_calls?: any;
    tool_use_id?: string;
  };
  toolUseResult?: {
    file?: {
      content: string;
    };
  };
  uuid: string;
}

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
      const parsedData: HistoryItem[] = lines.map((line) => JSON.parse(line));

      // Build a map of tool results by tool call ID
      const toolResultsMap = new Map<string, any>();
      parsedData.forEach((item) => {
        if (item.message && Array.isArray(item.message.content)) {
          item.message.content.forEach((c) => {
            if (c.type === "tool_result" && c.tool_use_id) {
              toolResultsMap.set(c.tool_use_id, c);
            }
          });
        }
      });

      const extractedMessages: UIMessage[] = parsedData
        .map((item) => {
          if (!item.message) {
            return null;
          }

          // Handle assistant messages
          if (item.type === "assistant" && item.message.role === "assistant") {
            const parts: any[] = [];
            let textContent = "";

            if (typeof item.message.content === "string") {
              textContent = item.message.content;
            } else if (Array.isArray(item.message.content)) {
              item.message.content.forEach((c) => {
                if (c.type === "text" && c.text) {
                  textContent += c.text;
                } else if (c.type === "tool_use" && c.id && c.name) {
                  // Check if we have a result for this tool call
                  const toolResult = toolResultsMap.get(c.id);

                  const toolInvocation = {
                    type: "tool-invocation",
                    toolInvocation: {
                      state: toolResult ? "result" : "call",
                      toolCallId: c.id,
                      toolName: c.name,
                      args: c.input || {},
                      ...(toolResult && { result: toolResult.content || "" }),
                    },
                  };
                  parts.push(toolInvocation);
                }
              });
            }

            // Add text part if there's text content
            if (textContent) {
              parts.unshift({
                type: "text",
                text: textContent,
              });
            }

            return {
              id: item.uuid,
              role: "assistant",
              content: textContent || "",
              ...(parts.length > 0 && { parts }),
            } as UIMessage;
          }

          // Handle user messages
          if (item.type === "user" && item.message.role === "user") {
            if (typeof item.message.content === "string") {
              return {
                id: item.uuid,
                role: "user",
                content: item.message.content,
              };
            }

            if (Array.isArray(item.message.content)) {
              const parts: { type: "text"; text: string }[] = [];
              let textContent = "";

              item.message.content.forEach((c) => {
                if (c.type === "text" && c.text) {
                  textContent += c.text;
                } else if (c.file && c.file.content) {
                  textContent += c.file.content;
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
                id: item.uuid,
                role: "user",
                content: textContent,
                ...(parts.length > 0 && { parts }),
              };
            }
          }

          return null;
        })
        .filter((message): message is UIMessage => message !== null);

      return extractedMessages;
    } catch (error) {
      console.error("Error processing content:", error);
      return [];
    }
  }
}
