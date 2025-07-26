import type { UIMessage } from "ai";

export type ToolInvocationPart = Extract<
  UIMessage["parts"][number],
  { type: "tool-invocation" }
>;
