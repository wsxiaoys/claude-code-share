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
  firstMessage?: string;
  provider?: string; // Added to support multiple providers
}

// Provider abstraction interfaces
export interface ProviderConverter {
  name: string;
  convert(content: string): UIMessage[];
}

export interface ProviderScanner {
  name: string;
  findConversations(): ConversationFile[];
  isInstalled(): boolean;
  getDefaultPath(): string;
  extractFirstMessage?(filePath: string): string | undefined;
}

export interface Provider {
  name: string;
  displayName: string;
  converter: ProviderConverter;
  scanner?: ProviderScanner;
}
