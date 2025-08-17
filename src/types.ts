import type { ClientTools } from "@getpochi/tools";
import type { InferUITools, UIDataTypes, UIMessage } from "ai";

type UITools = InferUITools<ClientTools>;

export type Message = UIMessage<unknown, UIDataTypes, UITools>;

export type UIToolPart<T extends string = string> = Extract<
  Message["parts"][number],
  { type: `tool-${T}` }
>;

export interface Conversation {
  path: string;
  mtime: Date;
  title: string;
}

export interface Provider {
  id: string;
  displayName: string;

  conversations: Conversation[];

  convertToMessages(path: string): Message[];
}
