import type {
  Content,
  FunctionCall,
  FunctionResponse,
  Part,
} from "@google/genai";
import type { TextPart } from "ai";
import type { Message, UIToolPart } from "@/types";

// Gemini uses FunctionCall and FunctionResponse from @google/genai
// No need for custom GeminiToolCall interface

/**
 * Converts Gemini tool calls to Pochi-style UIToolPart
 */
function convertGeminiToolCall(
  toolCallId: string,
  toolName: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart {
  // Map Gemini tools to Pochi equivalents
  switch (toolName) {
    case "ReadFile":
      return handleReadFile(toolCallId, input, toolResult);

    case "WriteFile":
      return handleWriteFile(toolCallId, input, toolResult);

    case "Edit":
      return handleEdit(toolCallId, input, toolResult);

    case "Shell":
      return handleShell(toolCallId, input, toolResult);

    case "FindFiles":
      return handleFindFiles(toolCallId, input, toolResult);

    case "ReadFolder":
      return handleReadFolder(toolCallId, input, toolResult);

    case "ReadManyFiles":
      return handleReadManyFiles(toolCallId, input, toolResult);

    case "SearchText":
      return handleSearchText(toolCallId, input, toolResult);

    default:
      return handleUnrecognizedTool(toolCallId, toolName, input, toolResult);
  }
}

// Tool handlers mapping Gemini tools to Pochi equivalents

function handleReadFile(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart<"readFile"> {
  const toolCall = {
    type: "tool-readFile" as const,
    toolCallId,
    input: {
      path: (input.path as string) || (input.file_path as string) || "",
      startLine: (input.startLine as number) || undefined,
      endLine: (input.endLine as number) || undefined,
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      content: toolResult.isError ? "" : String(toolResult.result || ""),
      isTruncated: false,
    },
  };
}

function handleWriteFile(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart<"writeToFile"> {
  const toolCall = {
    type: "tool-writeToFile" as const,
    toolCallId,
    input: {
      path: (input.path as string) || (input.file_path as string) || "",
      content: (input.content as string) || "",
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      success: !toolResult.isError,
    },
  };
}

function handleEdit(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart<"applyDiff"> {
  const toolCall = {
    type: "tool-applyDiff" as const,
    toolCallId,
    input: {
      path: (input.path as string) || (input.file_path as string) || "",
      searchContent:
        (input.searchContent as string) || (input.old_string as string) || "",
      replaceContent:
        (input.replaceContent as string) || (input.new_string as string) || "",
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      success: !toolResult.isError,
      _meta: {
        editSummary: {
          added: 0, // TODO: Parse from Gemini result
          removed: 0, // TODO: Parse from Gemini result
        },
      },
    },
  };
}

function handleShell(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart<"executeCommand"> {
  const toolCall = {
    type: "tool-executeCommand" as const,
    toolCallId,
    input: {
      command: (input.command as string) || "",
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      output: String(toolResult.result || ""),
      isTruncated: false,
    },
  };
}

function handleFindFiles(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart<"globFiles"> {
  const toolCall = {
    type: "tool-globFiles" as const,
    toolCallId,
    input: {
      globPattern:
        (input.pattern as string) || (input.globPattern as string) || "*",
      path: (input.path as string) || ".",
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  const files = Array.isArray(toolResult.result)
    ? toolResult.result.map(String)
    : String(toolResult.result || "")
        .split("\n")
        .filter(Boolean);

  return {
    ...toolCall,
    state: "output-available",
    output: {
      files,
      isTruncated: false,
    },
  };
}

function handleReadFolder(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart<"listFiles"> {
  const toolCall = {
    type: "tool-listFiles" as const,
    toolCallId,
    input: {
      path: (input.path as string) || ".",
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  const files = Array.isArray(toolResult.result)
    ? toolResult.result.map(String)
    : String(toolResult.result || "")
        .split("\n")
        .filter(Boolean);

  return {
    ...toolCall,
    state: "output-available",
    output: {
      files,
      isTruncated: false,
    },
  };
}

function handleReadManyFiles(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart<"batchCall"> {
  // TODO: Implement batch call mapping for reading multiple files
  // This would require understanding Gemini's ReadManyFiles format
  const toolCall = {
    type: "tool-batchCall" as const,
    toolCallId,
    input: {
      description: "Read multiple files",
      invocations: [], // TODO: Map from Gemini's ReadManyFiles input format
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      success: !toolResult.isError,
    },
  };
}

function handleSearchText(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart<"searchFiles"> {
  const toolCall = {
    type: "tool-searchFiles" as const,
    toolCallId,
    input: {
      regex: (input.query as string) || (input.text as string) || "",
      path: (input.path as string) || ".",
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  // TODO: Parse Gemini search results format
  const results = Array.isArray(toolResult.result) ? toolResult.result : [];

  return {
    ...toolCall,
    state: "output-available",
    output: {
      matches: results.map((result: unknown) => ({
        file: "", // TODO: Extract file path from Gemini result
        line: 0, // TODO: Extract line number from Gemini result
        context: String(result), // TODO: Extract content from Gemini result
      })),
      isTruncated: false,
    },
  };
}

// Gemini-specific tools without direct Pochi equivalents

function handleGoogleSearch(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart {
  // No direct Pochi equivalent - map to executeCommand as placeholder
  const toolCall = {
    type: "tool-executeCommand" as const,
    toolCallId,
    input: {
      command: `echo "Google search: ${(input.query as string) || ""}"`,
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      output: String(toolResult.result || ""),
      isTruncated: false,
    },
  };
}

function handleWebFetch(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart {
  // No direct Pochi equivalent - map to executeCommand as placeholder
  const toolCall = {
    type: "tool-executeCommand" as const,
    toolCallId,
    input: {
      command: `echo "Web fetch: ${(input.url as string) || ""}"`,
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      output: String(toolResult.result || ""),
      isTruncated: false,
    },
  };
}

function handleSaveMemory(
  toolCallId: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart {
  // No direct Pochi equivalent - map to writeToFile as placeholder
  const memoryKey =
    (input.key as string) || toolCallId.replace(/[^a-zA-Z0-9]/g, "_");
  const toolCall = {
    type: "tool-writeToFile" as const,
    toolCallId,
    input: {
      path: `memory_${memoryKey}.txt`,
      content: (input.value as string) || "",
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      success: !toolResult.isError,
    },
  };
}

function handleUnrecognizedTool(
  toolCallId: string,
  toolName: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart {
  // Map unrecognized tools to executeCommand as placeholder
  const toolCall = {
    type: "tool-executeCommand" as const,
    toolCallId,
    input: {
      command: `echo "Unrecognized tool '${toolName}' called with input: ${JSON.stringify(
        input
      )}"`,
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      output: String(toolResult.result || ""),
      isTruncated: false,
    },
  };
}

/**
 * Converts Gemini Content array to AI SDK UIMessage format
 * @param geminiContents - Array of Gemini Content objects
 * @returns Array of converted messages
 */
function convertGeminiContentsToMessages(geminiContents: Content[]): Message[] {
  const convertedMessages: Message[] = [];

  for (let i = 0; i < geminiContents.length; i++) {
    const content = geminiContents[i];
    if (!content) continue;

    const parts: UIToolPart[] = [];

    // Handle parts that contain function calls and responses
    if (content.parts) {
      for (const part of content.parts) {
        if (
          typeof part === "object" &&
          part &&
          "functionCall" in part &&
          part.functionCall
        ) {
          // Handle function call
          const toolCall = convertGeminiToolCall(
            `${i}-${part.functionCall.name}`,
            part.functionCall.name || "",
            part.functionCall.args || {}
          );
          parts.push(toolCall);
        }

        if (
          typeof part === "object" &&
          part &&
          "functionResponse" in part &&
          part.functionResponse
        ) {
          // Handle function response
          const toolResult = {
            toolCallId: `${i}-${part.functionResponse.name}`,
            result: part.functionResponse.response,
            isError: false,
          };

          const convertedToolResult = convertGeminiToolCall(
            toolResult.toolCallId,
            part.functionResponse.name || "",
            {},
            toolResult
          );
          parts.push(convertedToolResult);
        }
      }
    }

    // Extract text content
    const textContent =
      content.parts
        ?.filter(
          (part) =>
            typeof part === "string" ||
            (typeof part === "object" && part && "text" in part)
        )
        .map((part) => (typeof part === "string" ? part : (part as any).text))
        .join("") || "";

    // Create the message
    if (textContent || parts.length > 0) {
      const message: Message = {
        id: `gemini-${i}`,
        role: content.role === "model" ? "assistant" : content.role || "user",
        createdAt: new Date(),
        ...(textContent && { content: textContent }),
        ...(parts.length > 0 && { parts }),
      } as Message;

      convertedMessages.push(message);
    }
  }

  return convertedMessages;
}

/**
 * Converts Gemini conversation content to AI SDK UIMessage format
 * @param content - Gemini conversation content as JSON string
 * @returns Array of converted messages
 */
export function convertToMessages(content: string): Message[] {
  try {
    // Parse the content as JSON array of Gemini Content objects
    const geminiContents: Content[] = JSON.parse(content);
    
    // Skip the first message (default Gemini CLI setup message)
    const filteredContents = geminiContents.slice(1);
    
    return convertGeminiContentsToMessages(filteredContents);
  } catch (error) {
    console.error("Error processing Gemini content:", error);
    return [];
  }
}
