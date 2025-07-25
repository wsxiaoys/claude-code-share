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
        const input = c.input;
        const path = input.path;
        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: { path },
            result: {
              files: ((toolResultItem as any).toolUseResult || "")
                .split("\n")
                .filter(Boolean),
              isTruncated: false,
            },
          },
        };

        return invocation;
      }
      return createCallInvocation(toolName);
    }
    case "Write": {
      const toolName = "writeToFile";
      let invocation: ToolInvocationUIPart<ClientToolsType["writeToFile"]>;
      if (toolResultItem) {
        const input = c.input;
        const content = input.content;
        const path = input.file_path;

        // result
        const success = true;

        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: { content, path },
            result: {
              success,
            },
          },
        };
        return invocation;
      }
      return createCallInvocation(toolName);
    }
    case "Glob": {
      const toolName = "globFiles";
      let invocation: ToolInvocationUIPart<ClientToolsType["globFiles"]>;
      const globPattern: string = c.input?.pattern;
      const path: string = c.input?.path;
      if (toolResultItem) {
        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: { globPattern: globPattern, path: path },
            result: {
              files: (toolResultItem as any).toolUseResult.filenames || "",
              isTruncated: false,
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
    // claude code format is too different do it later
    // case "Grep": {
    //   const toolName = "searchFiles";
    //   let invocation: ToolInvocationUIPart<ClientToolsType["searchFiles"]>;
    //   if (toolResultItem) {
    //     const result = (toolResultItem as any).toolUseResult;
    //     const input = c.input;
    //     const path = input.path;
    //     const regex = input.pattern;
    //     const filePattern = input.include;

    //     //result
    //     const file;
    //     const line;
    //     const context;

    //     invocation = {
    //       type: "tool-invocation",
    //       toolInvocation: {
    //         state: "result",
    //         toolCallId: c.id,
    //         toolName,
    //         args: { path, regex, filePattern },
    //         result: {
    //           result: (toolResultItem as any).toolUseResult || "",
    //           isTruncated: false,
    //         },
    //       },
    //     };
    //     return invocation;
    //   }
    //   return createCallInvocation(toolName);
    // }
    case "MultiEdit": {
      const toolName = "multiApplyDiff";
      let invocation: ToolInvocationUIPart<ClientToolsType["multiApplyDiff"]>;
      if (toolResultItem) {
        const input = c.input;
        const path = input.file_path;
        const formattedEdits = input.edits.map((edit: any) => ({
          searchContent: edit.old_string,
          replaceContent: edit.new_string,
        }));

        //result
        const toolUseResult = (toolResultItem as any).toolUseResult;

        const { added, removed } = toolUseResult.structuredPatch.reduce(
          (summary: { added: number; removed: number }, patch: any) => {
            patch.lines.forEach((line: string) => {
              if (line.startsWith("+")) summary.added++;
              if (line.startsWith("-")) summary.removed++;
            });
            return summary;
          },
          { added: 0, removed: 0 }
        );

        const pochiResult = {
          success: true,
          _meta: {
            editSummary: {
              added,
              removed,
            },
          },
        };

        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: { path, edits: formattedEdits },
            result: pochiResult,
          },
        };
        return invocation;
      }
      return createCallInvocation(toolName);
    }
    case "Task": {
      const toolName = "newTask";
      let invocation: ToolInvocationUIPart<ClientToolsType["newTask"]>;
      if (toolResultItem) {
        const input = c.input;
        const description = input.description;
        const prompt = input.prompt;

        //result
        const result = (toolResultItem as any).toolUseResult;
        const content = result.content[0].text;

        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: { description, prompt },
            result: content,
          },
        };
        return invocation;
      }
      return createCallInvocation(toolName);
    }
    case "Read": {
      const toolName = "readFile";
      let invocation: ToolInvocationUIPart<ClientToolsType["readFile"]>;
      if (toolResultItem) {
        const input = c.input;
        const path = input.file_path;
        const startLine = input.offset;
        const endLine = input.limit;

        //result
        const result = (toolResultItem as any).toolUseResult;
        const content = result.file.content;

        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: { path, startLine, endLine },
            result: {
              content: content || "",
              isTruncated: false,
            },
          },
        };
        return invocation;
      }
      return createCallInvocation(toolName);
    }
    case "Edit": {
      const toolName = "applyDiff";
      let invocation: ToolInvocationUIPart<ClientToolsType["applyDiff"]>;
      if (toolResultItem) {
        const input = c.input;
        const path = input.file_path;
        const searchContent = input.old_string;
        const replaceContent = input.new_string;

        // result
        const toolResult = toolResultItem.toolUseResult;
        let success = false;
        let added: number = 0;
        let removed: number = 0;
        if (toolResult != null) {
          success = true;
          ({ added, removed } = (
            toolResult.structuredPatch?.[0]?.lines || []
          ).reduce(
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
        } else {
          success = false;
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

        invocation = {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolCallId: c.id,
            toolName,
            args: { path, searchContent, replaceContent },
            result: result,
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
