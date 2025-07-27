import type { UIMessage } from "ai";

export type ToolInvocationPart = Extract<
  UIMessage["parts"][number],
  { type: "tool-invocation" }
>;

export interface ConversationFile {
  path: string;
  projectName: string;
  fileName: string;
  modifiedTime: Date;
}
