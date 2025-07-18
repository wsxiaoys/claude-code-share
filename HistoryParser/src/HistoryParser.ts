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

      // Build a map of tool results by tool call ID
      const toolResultsMap = new Map<string, any>();
      parsedData.forEach((item) => {
        // Handle HistoryMessage wrapper format
        if (
          "uuid" in item &&
          item.message &&
          typeof item.message === "object"
        ) {
          const nestedMessage = item.message as any;

          // Check if it's an Anthropic message with content array
          if (nestedMessage.role && Array.isArray(nestedMessage.content)) {
            nestedMessage.content.forEach((c: any) => {
              if (c.type === "tool_result" && c.tool_use_id) {
                toolResultsMap.set(c.tool_use_id, c);
              }
            });
          }
        }
      });

      const extractedMessages: UIMessage[] = parsedData
        .map((item) => {
          // Handle HistoryMessage wrapper format
          if (
            "uuid" in item &&
            item.message &&
            typeof item.message === "object"
          ) {
            const nestedMessage = item.message as any;
            const historyItem = item as any;

            // Check if it's an Anthropic Messages.Message (has role, content, etc.)
            if (
              nestedMessage.role &&
              (nestedMessage.content || nestedMessage.content === "")
            ) {
              // Handle assistant messages
              if (
                historyItem.type === "assistant" &&
                nestedMessage.role === "assistant"
              ) {
                type ToolInvocationPart = {
                  type: "tool-invocation";
                  toolInvocation: ToolInvocation;
                };
                const parts: (TextPart | ToolInvocationPart)[] = [];
                let textContent = "";

                if (typeof nestedMessage.content === "string") {
                  textContent = nestedMessage.content;
                } else if (Array.isArray(nestedMessage.content)) {
                  nestedMessage.content.forEach((c: any) => {
                    if (c.type === "text" && c.text) {
                      textContent += c.text;
                    } else if (c.type === "tool_use" && c.id && c.name) {
                      // Check if we have a result for this tool call
                      const toolResult = toolResultsMap.get(c.id);

                      const toolInvocation: ToolInvocationPart = {
                        type: "tool-invocation",
                        toolInvocation: {
                          state: toolResult ? "result" : "call",
                          toolCallId: c.id,
                          toolName: c.name,
                          args: c.input || {},
                          ...(toolResult && {
                            result: toolResult.content || "",
                          }),
                        } as ToolInvocation,
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
                  id: historyItem.uuid,
                  role: "assistant",
                  content: textContent || "",
                  ...(parts.length > 0 && { parts }),
                } as UIMessage;
              }

              // Handle user messages
              if (
                historyItem.type === "user" &&
                nestedMessage.role === "user"
              ) {
                if (typeof nestedMessage.content === "string") {
                  return {
                    id: historyItem.uuid,
                    role: "user",
                    content: nestedMessage.content,
                  };
                }

                if (Array.isArray(nestedMessage.content)) {
                  const parts: TextPart[] = [];
                  let textContent = "";

                  nestedMessage.content.forEach((c: any) => {
                    if (c.type === "text" && c.text) {
                      textContent += c.text;
                    } else if (c.type === "image" && c.source) {
                      // Handle image content
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
                    ...(parts.length > 0 && { parts }),
                  };
                }
              }
            }

            // Handle other message types (ResultMessage, ErrorMessage, etc.)
            else if (historyItem.type === "result" && nestedMessage.result) {
              // Convert ResultMessage to a system message or skip it
              return {
                id: historyItem.uuid,
                role: "system",
                content: `[Result] ${nestedMessage.result} (Cost: $${nestedMessage.total_cost_usd})`,
              } as UIMessage;
            } else if (historyItem.type === "error") {
              return {
                id: historyItem.uuid,
                role: "system",
                content: "[Error occurred during conversation]",
              } as UIMessage;
            } else if (
              historyItem.type === "system" &&
              nestedMessage.subtype === "init"
            ) {
              return {
                id: historyItem.uuid,
                role: "system",
                content: `[Session initialized with tools: ${
                  nestedMessage.tools?.join(", ") || "none"
                }]`,
              } as UIMessage;
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
