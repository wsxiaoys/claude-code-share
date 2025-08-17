import type {
  Provider,
  ProviderScanner,
  ProviderConverter,
  ConversationFile,
} from "@/types.js";
import type { UIMessage } from "ai";

class GeminiConverter implements ProviderConverter {
  name = "gemini";

  convert(content: string): UIMessage[] {
    // TODO: Implement Gemini CLI conversation format conversion
    // This is a placeholder to demonstrate extensibility
    console.warn("⚠️  Gemini CLI converter not yet implemented");
    return [];
  }
}

class GeminiScanner implements ProviderScanner {
  name = "gemini";

  findConversations(): ConversationFile[] {
    // TODO: Implement Gemini CLI conversation scanning
    // This is a placeholder to demonstrate extensibility
    return [];
  }

  isInstalled(): boolean {
    // TODO: Check if Gemini CLI is installed
    return false;
  }

  getDefaultPath(): string {
    // TODO: Return the default path for Gemini CLI conversations
    return "";
  }
}

export const geminiProvider: Provider = {
  name: "gemini",
  displayName: "Gemini CLI",
  converter: new GeminiConverter(),
  scanner: new GeminiScanner(),
};
