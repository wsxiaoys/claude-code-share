import { type UIMessage, type TextPart, type ToolInvocation } from "ai";

export type ToolInvocationPart = {
  type: "tool-invocation";
  toolInvocation: ToolInvocation;
};
