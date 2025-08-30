import type { Content } from "@google/genai";
import type { TextPart } from "ai";

import type { Message, UIToolPart } from "@/types";
import { convertToWindowsLineEndings } from "@/utils/format";

/**
 * Safely extracts output from tool result objects
 */
function extractToolOutput(result: unknown): string {
  if (result && typeof result === "object") {
    const resultObj = result as Record<string, unknown>;
    const output = resultObj.output || resultObj.content || result;
    return String(output || "");
  }
  return String(result || "");
}

/**
 * Safely extracts file list from tool result objects
 */
function extractFileList(result: unknown): string[] {
  if (Array.isArray(result)) {
    return result.map(String);
  }

  if (result && typeof result === "object") {
    const resultObj = result as Record<string, unknown>;
    const files = resultObj.files || resultObj.output || resultObj.content;

    if (Array.isArray(files)) {
      return files.map(String);
    }

    if (typeof files === "string") {
      return files.split("\n").filter(Boolean);
    }
  }

  const stringResult = String(result || "");
  return stringResult ? stringResult.split("\n").filter(Boolean) : [];
}

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
    case "read_file":
      return handleReadFile(toolCallId, input, toolResult);

    case "write_file":
      return handleWriteFile(toolCallId, input, toolResult);

    case "replace":
      return handleEdit(toolCallId, input, toolResult);

    case "run_shell_command":
      return handleShell(toolCallId, input, toolResult);

    case "glob":
      return handleFindFiles(toolCallId, input, toolResult);

    case "list_directory":
      return handleReadFolder(toolCallId, input, toolResult);

    case "search_file_content":
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
      path:
        (input.path as string) ||
        (input.file_path as string) ||
        (input.absolute_path as string) ||
        "",
      startLine: (input.startLine as number) || undefined,
      endLine: (input.endLine as number) || undefined,
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  // Extract content from nested structure: toolResult.result.output
  const content = extractToolOutput(toolResult.result);

  // Check if there's an error in the tool result
  const resultData = {
    content: toolResult.isError ? "" : content,
    isTruncated: false,
    error: toolResult.isError ? extractToolOutput(toolResult.result) : undefined,
  };

  return {
    ...toolCall,
    state: "output-available",
    output: resultData,
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
      // currently gemini history didnt directly show it
      // _meta: {
      //   editSummary: {
      //     added: 0, // TODO: Parse from Gemini result
      //     removed: 0, // TODO: Parse from Gemini result
      //   },
      // },
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

  // Extract shell command output from Gemini's structured format
  let commandOutput = "";
  if (toolResult.result && typeof toolResult.result === "object") {
    const resultObj = toolResult.result as Record<string, unknown>;

    // Check for error field first
    if (resultObj.error) {
      commandOutput = String(resultObj.error);
    } else {
      const output = resultObj.output || resultObj.content || "";
      const outputStr = String(output);

      // Parse Gemini's shell output format: "Output: actual_output"
      const outputMatch = outputStr.match(
        /Output: ([\s\S]*?)(?:\nError:|\nExit Code:|$)/
      );
      if (outputMatch?.[1]) {
        commandOutput = outputMatch[1].trim();
      } else {
        // Fallback to extractToolOutput if format doesn't match
        commandOutput = extractToolOutput(toolResult.result);
      }
    }
  } else {
    commandOutput = extractToolOutput(toolResult.result);
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      output: convertToWindowsLineEndings(commandOutput),
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

  const files = extractFileList(toolResult.result);

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

  const files = extractFileList(toolResult.result);

  return {
    ...toolCall,
    state: "output-available",
    output: {
      files,
      isTruncated: false,
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
      regex:
        (input.pattern as string) ||
        (input.query as string) ||
        (input.text as string) ||
        "",
      path: (input.path as string) || ".",
    },
  };

  if (!toolResult) {
    return { ...toolCall, state: "input-available" };
  }

  // Parse Gemini search results format
  const matches: Array<{ file: string; line: number; context: string }> = [];

  if (toolResult.result && typeof toolResult.result === "object") {
    const resultObj = toolResult.result as Record<string, unknown>;
    const output = resultObj.output || resultObj.content || "";
    const outputStr = String(output);

    // Parse the formatted output from Gemini search
    const lines = outputStr.split("\n");
    let currentFile = "";

    for (const line of lines) {
      // Match file lines: "File: path/to/file.ext"
      const fileMatch = line.match(/^File: (.+)$/);
      if (fileMatch?.[1]) {
        currentFile = fileMatch[1];
        continue;
      }

      // Match line number and content: "L123: some content"
      const lineMatch = line.match(/^L(\d+): (.*)$/);
      if (lineMatch?.[1] && lineMatch[2] && currentFile) {
        matches.push({
          file: currentFile,
          line: parseInt(lineMatch[1], 10),
          context: lineMatch[2],
        });
      }
    }
  }

  return {
    ...toolCall,
    state: "output-available",
    output: {
      matches,
      isTruncated: false,
    },
  };
}

function handleUnrecognizedTool(
  toolCallId: string,
  toolName: string,
  input: Record<string, unknown>,
  toolResult?: { result: unknown; isError?: boolean }
): UIToolPart {
  // Map unrecognized tools with dynamic type like Claude does
  const toolCall = {
    type: `tool-${toolName}` as const,
    toolCallId,
    input: (input as Record<string, unknown>) || {},
  };

  if (!toolResult) {
    // @ts-ignore
    return {
      ...toolCall,
      state: "input-available",
    };
  }

  // @ts-ignore
  return {
    ...toolCall,
    state: "output-available",
    output: {
      output: extractToolOutput(toolResult.result),
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

  // First pass: collect all function calls and responses across all messages
  const allFunctionCalls: Array<{
    messageIndex: number;
    name: string;
    args: Record<string, unknown>;
  }> = [];
  const allFunctionResponses: Array<{
    messageIndex: number;
    name: string;
    response: unknown;
  }> = [];

  for (let i = 0; i < geminiContents.length; i++) {
    const content = geminiContents[i];
    if (!content?.parts) continue;

    for (const part of content.parts) {
      if (
        typeof part === "object" &&
        part &&
        "functionCall" in part &&
        part.functionCall
      ) {
        allFunctionCalls.push({
          messageIndex: i,
          name: part.functionCall.name || "",
          args: part.functionCall.args || {},
        });
      }

      if (
        typeof part === "object" &&
        part &&
        "functionResponse" in part &&
        part.functionResponse
      ) {
        allFunctionResponses.push({
          messageIndex: i,
          name: part.functionResponse.name || "",
          response: part.functionResponse.response,
        });
      }
    }
  }

  for (let i = 0; i < geminiContents.length; i++) {
    const content = geminiContents[i];
    if (!content) continue;

    const parts: UIToolPart[] = [];

    // Handle parts that contain function calls and responses
    if (content.parts) {
      // Collect function calls and responses for this specific message
      const messageFunctionCalls = allFunctionCalls.filter(
        (call) => call.messageIndex === i
      );
      const messageFunctionResponses = allFunctionResponses.filter(
        (resp) => resp.messageIndex === i
      );

      const processedTools = new Set<string>();

      // Process function calls in this message
      for (const functionCall of messageFunctionCalls) {
        const toolName = functionCall.name;
        if (processedTools.has(toolName)) continue;

        // Find the corresponding response for this tool (can be in any subsequent message)
        const matchingResponse = allFunctionResponses.find(
          (resp) =>
            resp.name === toolName &&
            resp.messageIndex > functionCall.messageIndex
        );

        const toolCallId = `${i}-${toolName}`;

        if (matchingResponse) {
          // Create tool part with both call and response
          // Check if the response contains an error field
          const hasError = !!(matchingResponse.response && 
            typeof matchingResponse.response === 'object' && 
            'error' in matchingResponse.response);
          
          const toolResult = {
            toolCallId,
            result: matchingResponse.response,
            isError: hasError,
          };

          const convertedToolPart = convertGeminiToolCall(
            toolCallId,
            toolName,
            functionCall.args,
            toolResult
          );
          parts.push(convertedToolPart);
        } else {
          // Create tool part with only the call (no response yet)
          const convertedToolPart = convertGeminiToolCall(
            toolCallId,
            toolName,
            functionCall.args
          );
          parts.push(convertedToolPart);
        }

        processedTools.add(toolName);
      }

      // Process orphaned responses in this message (responses without preceding calls)
      for (const functionResponse of messageFunctionResponses) {
        const toolName = functionResponse.name;
        if (processedTools.has(toolName)) continue;

        // Check if there's a preceding function call for this response
        const precedingCall = allFunctionCalls.find(
          (call) =>
            call.name === toolName &&
            call.messageIndex < functionResponse.messageIndex
        );

        if (!precedingCall) {
          // This is an orphaned response, create a tool part for it
          const toolCallId = `${i}-${toolName}`;
          // Check if the response contains an error field
          const hasError = !!(functionResponse.response && 
            typeof functionResponse.response === 'object' && 
            'error' in functionResponse.response);
          
          const toolResult = {
            toolCallId,
            result: functionResponse.response,
            isError: hasError,
          };

          const convertedToolPart = convertGeminiToolCall(
            toolCallId,
            toolName,
            {},
            toolResult
          );
          parts.push(convertedToolPart);
          processedTools.add(toolName);
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
        .map((part) =>
          typeof part === "string" ? part : (part as { text: string }).text
        )
        .join("") || "";

    // Create the message
    if (textContent || parts.length > 0) {
      // Always include parts array, add text part if there's text content
      const allParts: (TextPart | UIToolPart)[] = [...parts];
      if (textContent) {
        allParts.unshift({
          type: "text",
          text: textContent,
        } as TextPart);
      }

      const message: Message = {
        id: `gemini-${i}`,
        role: content.role === "model" ? "assistant" : content.role || "user",
        createdAt: new Date(),
        content: textContent || "",
        parts: allParts,
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
    const filteredContents = geminiContents.slice(2);

    return convertGeminiContentsToMessages(filteredContents);
  } catch (error) {
    console.error("Error processing Gemini content:", error);
    return [];
  }
}
