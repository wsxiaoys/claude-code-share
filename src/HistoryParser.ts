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
      const lines = fileContent.split("\n").filter(Boolean);
      const parsedData: HistoryItem[] = lines.map((line) => JSON.parse(line));

      const extractedMessages: UIMessage[] = parsedData
        .map((item) => {
          if (!item.message) {
            return null;
          }
          let content;
          if (typeof item.message.content === "string") {
            content = item.message.content;
          } else if (Array.isArray(item.message.content)) {
            content = item.message.content
              .map((c) => c.text || (c.file ? c.file.content : ""))
              .join("\n");
          } else {
            content = "";
          }

          if (
            item.type === "user" ||
            (item.type === "assistant" && item.message.role !== "tool")
          ) {
            return {
              id: item.uuid,
              role: item.message.role,
              content: content,
            };
          } else if (
            item.message.role === "user" &&
            typeof item.message.content === "object" &&
            Array.isArray(item.message.content) &&
            item.message.content[0] &&
            item.message.content[0].type === "tool_result" &&
            "content" in item.message.content[0]
          ) {
            return {
              id: item.uuid,
              role: "tool",
              content: (
                item.message.content[0] as {
                  type: string;
                  content: string;
                }
              ).content,
            };
          }
          return null;
        })
        .filter((message): message is UIMessage => message !== null);

      return extractedMessages;
    } catch (error) {
      console.error("Error processing file:", error);
      return [];
    }
  }
}
