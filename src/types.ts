import type { ClientTools } from "@getpochi/tools";
import type { InferUITools, UIDataTypes, UIMessage } from "ai";

type UITools = InferUITools<ClientTools>;

export type Message = UIMessage<unknown, UIDataTypes, UITools>;

export type UIToolPart<T extends string = string> = Extract<
  Message["parts"][number],
  { type: `tool-${T}` }
>;

export interface ConversationFile {
  path: string;
  projectName: string;
  fileName: string;
  modifiedTime: Date;
  firstMessage?: string;
  provider?: string; // Added to support multiple providers
}

// Provider abstraction interfaces
export interface ProviderConverter {
  name: string;
  convert(content: string): Message[];
}

export interface ProviderScanner {
  name: string;
  findConversations(): ConversationFile[];
  isInstalled(): boolean;
  getDefaultPath(): string;
  extractFirstMessage?(filePath: string): string | undefined;
}

export interface Provider {
  id: string;
  displayName: string;
  converter: ProviderConverter;
  scanner: ProviderScanner;
}
