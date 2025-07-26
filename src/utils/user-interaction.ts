import type { ConversationFile } from "../types.js";
import { formatDate } from "./conversation-scanner.js";

/**
 * Displays conversation list with pagination and handles user selection
 * @param conversations Array of available conversations
 * @returns Promise that resolves to the selected conversation
 */
export async function selectConversation(
  conversations: ConversationFile[]
): Promise<ConversationFile> {
  const ITEMS_PER_PAGE = 10;
  let currentPage = 0;
  const totalPages = Math.ceil(conversations.length / ITEMS_PER_PAGE);

  function displayPage(page: number) {
    console.clear();
    console.log("\n📋 Claude Code conversations:");
    console.log("=".repeat(60));

    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = Math.min(
      startIndex + ITEMS_PER_PAGE,
      conversations.length
    );
    const pageConversations = conversations.slice(startIndex, endIndex);

    pageConversations.forEach((conv, index) => {
      console.log(`${index + 1}. ${conv.projectName}/${conv.fileName}`);
      console.log(`   Last modified: ${formatDate(conv.modifiedTime)}`);
      console.log("");
    });

    console.log(
      `Page ${page + 1} of ${totalPages} (${
        conversations.length
      } total conversations)`
    );
    console.log("");

    if (totalPages > 1) {
      const navigationHelp = [];
      if (page > 0) navigationHelp.push("'p' for previous page");
      if (page < totalPages - 1) navigationHelp.push("'n' for next page");
      if (navigationHelp.length > 0) {
        console.log(`Navigation: ${navigationHelp.join(", ")}`);
      }
    }

    process.stdout.write(
      `Select a conversation (1-${Math.min(
        ITEMS_PER_PAGE,
        endIndex - startIndex
      )}) or press Enter for the most recent: `
    );
  }

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

    displayPage(currentPage);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let input = "";

    const handleInput = (key: string) => {
      const keyStr = key.toString();

      if (keyStr === "\r" || keyStr === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", handleInput);

        const selection = input.trim() || "1";
        const index = parseInt(selection) - 1;
        const startIndex = currentPage * ITEMS_PER_PAGE;
        const endIndex = Math.min(
          startIndex + ITEMS_PER_PAGE,
          conversations.length
        );
        const pageSize = endIndex - startIndex;

        if (index >= 0 && index < pageSize) {
          const selectedConv = conversations[startIndex + index];
          if (selectedConv) {
            console.log(
              `\n✅ Selected: ${selectedConv.projectName}/${selectedConv.fileName}`
            );
            resolve(selectedConv);
            return;
          }
        }

        console.log(`\n❌ Invalid selection. Using most recent conversation.`);
        if (conversations[0]) {
          resolve(conversations[0]);
        } else {
          console.error("No conversations available.");
          process.exit(1);
        }
      } else if (keyStr === "\u0003") {
        // Ctrl+C
        process.stdin.setRawMode(false);
        process.exit(0);
      } else if (keyStr.toLowerCase() === "n" && currentPage < totalPages - 1) {
        // Next page
        currentPage++;
        input = "";
        displayPage(currentPage);
      } else if (keyStr.toLowerCase() === "p" && currentPage > 0) {
        // Previous page
        currentPage--;
        input = "";
        displayPage(currentPage);
      } else if (keyStr >= "0" && keyStr <= "9") {
        input += keyStr;
        process.stdout.write(keyStr);
      } else if (keyStr === "\u007f") {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
      }
    };

    process.stdin.on("data", handleInput);
  });
}
