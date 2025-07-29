import type { ConversationFile } from "../types.js";
import { render } from "ink";
import { ConversationSelector } from "./components/ConversationSelector.js";

/**
 * Displays conversation list with enhanced interactive features and handles user selection
 * @param conversations Array of available conversations
 * @returns Promise that resolves to the selected conversation
 */
export async function selectConversation(
  conversations: ConversationFile[]
): Promise<ConversationFile> {
  return new Promise((resolve) => {
    // Check if stdin is a TTY (interactive terminal)
    if (!process.stdin.isTTY) {
      // Non-interactive mode (piped input), use most recent
      console.log("\n✅ Using most recent conversation (non-interactive mode)");
      if (conversations[0]) {
        resolve(conversations[0]);
      } else {
        console.error("No conversations available.");
        process.exit(1);
      }
      return;
    }

    let selectedConversation: ConversationFile | null = null;
    let hasExited = false;

    const handleSelect = (conversation: ConversationFile) => {
      selectedConversation = conversation;
      hasExited = true;
    };

    const handleExit = () => {
      hasExited = true;
    };

    const { unmount } = render(
      <ConversationSelector
        conversations={conversations}
        onSelect={handleSelect}
        onExit={handleExit}
      />
    );

    // Monitor for completion
    const checkCompletion = () => {
      if (hasExited) {
        unmount();
        if (selectedConversation) {
          console.log(
            `\nSelected: ${selectedConversation.projectName}/${selectedConversation.fileName}`
          );
          resolve(selectedConversation);
        } else {
          console.log("\n👋 Goodbye!");
          process.exit(0);
        }
      } else {
        setTimeout(checkCompletion, 100);
      }
    };

    checkCompletion();
  });
}
