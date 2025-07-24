import type {
  ServerTools,
  ClientToolsType,
  ToolInvocationUIPart,
} from "@getpochi/tools";
import type { ToolInvocationPart } from "./types/UiMessage_type";

/**
 * Creates a tool invocation part from a Claude tool call.
 * @param c The tool call object from Claude's message.
 * @param toolResult The corresponding tool result object.
 * @returns A ToolInvocationPart object.
 */
export function _createToolInvocation(
  c: any,
  toolResultItem: any
): ToolInvocationPart {
  // Helper function to create call state invocation
  const createCallInvocation = (toolName: string): ToolInvocationPart => ({
    type: "tool-invocation",
    toolInvocation: {
      state: "call",
      toolCallId: c.id,
      toolName,
      args: c.input || {},
    },
  });

  // Convert Claude tool calls to Pochi format
  switch (c.name) {
    case "LS": {
      const toolName = "listFiles";
      let invocation: ToolInvocationUIPart<ClientToolsType["listFiles"]>;
      if (toolResultItem) {
        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: c.input || {},
            result: {
              files: ((toolResultItem as any).toolUseResult || "").split("\n"),
              isTruncated: false,
            },
          },
        };

        return invocation;
      }
      return createCallInvocation(toolName);
    }
    case "TodoWrite": {
      const toolName = "todoWrite";
      let invocation: ToolInvocationUIPart<ClientToolsType["todoWrite"]>;
      if (toolResultItem) {
        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: c.input || {},
            result: {
              success: true,
            },
          },
        };
        return invocation;
      }
      return createCallInvocation(toolName);
    }
    case "WebFetch": {
      const toolName = "webFetch";
      let invocation: ToolInvocationUIPart<(typeof ServerTools)["webFetch"]>;
      if (toolResultItem) {
        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: c.input || {},
            result: {
              result: (toolResultItem as any).toolUseResult || "",
              isTruncated: false,
            },
          },
        };
        return invocation;
      }
      return createCallInvocation(toolName);
    }
    case "Bash": {
      const toolName = "executeCommand";
      let invocation: ToolInvocationUIPart<ClientToolsType["executeCommand"]>;
      if (toolResultItem) {
        let result;

        const item = toolResultItem.message.content[0];
        const content = item.content;
        const isError = item.is_error;

        if (isError) {
          result = (toolResultItem as any).toolUseResult;
        } else {
          result = (toolResultItem as any).toolUseResult.stdout;
        }

        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: c.input || {},
            result: {
              output: result || "",
              isTruncated: false,
            },
          },
        };
        return invocation;
      }
      return createCallInvocation(toolName);
    }
    // Add more tool mappings here
    default: {
      if (toolResultItem) {
        return {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName: c.name,
            args: c.input || {},
            result: { output: (toolResultItem as any).toolUseResult || "" },
          },
        };
      }
      return createCallInvocation(c.name);
    }
  }
}
