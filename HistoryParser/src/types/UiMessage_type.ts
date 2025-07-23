import { type ToolInvocation } from "ai";

export type ToolInvocationPart = {
  type: "tool-invocation";
  toolInvocation: ToolInvocation;
};
