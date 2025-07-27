import type { ConversationFile } from "../types.js";
import { formatDate } from "./conversation-scanner.js";
import fs from "node:fs";

/**
 * Displays conversation list with enhanced interactive features and handles user selection
 * @param conversations Array of available conversations
 * @returns Promise that resolves to the selected conversation
 */
export async function selectConversation(
  conversations: ConversationFile[]
): Promise<ConversationFile> {
  const ITEMS_PER_PAGE = 8;
  let currentPage = 0;
  let selectedIndex = 0;
  let searchQuery = "";
  let isSearchMode = false;
  let filteredConversations = conversations;

  function filterConversations() {
    if (!searchQuery.trim()) {
      filteredConversations = conversations;
    } else {
      const query = searchQuery.toLowerCase();
      filteredConversations = conversations.filter(
        (conv) =>
          conv.projectName.toLowerCase().includes(query) ||
          conv.fileName.toLowerCase().includes(query)
      );
    }
    // Reset pagination when filtering
    currentPage = 0;
    selectedIndex = 0;
  }

  function displayPage(page: number) {
    console.clear();

    // Header
    console.log(
      "\n🚀 \x1b[1m\x1b[36mClaude Code Share\x1b[0m - Interactive Conversation Selector"
    );
    console.log("\x1b[90m" + "-".repeat(70) + "\x1b[0m");

    // Search bar
    if (isSearchMode) {
      console.log(`\n🔍 Search: \x1b[33m${searchQuery}\x1b[0m\x1b[5m|\x1b[0m`);
      console.log(`\x1b[90mPress ESC to exit search, Enter to confirm\x1b[0m`);
    } else {
      console.log(
        `\n📋 Found \x1b[1m${
          filteredConversations.length
        }\x1b[0m conversations ${
          searchQuery ? `(filtered by "${searchQuery}")` : ""
        }`
      );
      console.log(
        `\x1b[90mPress '/' to search, Enter to select, 'q' to quit\x1b[0m`
      );
    }
    console.log("");

    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = Math.min(
      startIndex + ITEMS_PER_PAGE,
      filteredConversations.length
    );
    const pageConversations = filteredConversations.slice(startIndex, endIndex);

    if (pageConversations.length === 0) {
      console.log(
        "\x1b[31m❌ No conversations found matching your search.\x1b[0m"
      );
      console.log(
        "\x1b[90mTry a different search term or press ESC to clear.\x1b[0m"
      );
      return;
    }

    pageConversations.forEach((conv, index) => {
      const globalIndex = startIndex + index;
      const isSelected = globalIndex === selectedIndex && !isSearchMode;
      const prefix = isSelected ? "\x1b[42m\x1b[30m > " : "   ";
      const suffix = isSelected ? " \x1b[0m" : "";
      const numberColor = isSelected ? "\x1b[42m\x1b[30m" : "\x1b[36m";
      const nameColor = isSelected ? "\x1b[42m\x1b[30m" : "\x1b[1m";
      const pathColor = isSelected ? "\x1b[42m\x1b[30m" : "\x1b[90m";

      console.log(
        `${prefix}${numberColor}${globalIndex + 1}.${
          isSelected ? "" : "\x1b[0m"
        } ${nameColor}${conv.projectName}/${conv.fileName}${suffix}`
      );
      console.log(
        `${
          isSelected ? "\x1b[42m\x1b[30m" : ""
        }     ${pathColor}Date: ${formatDate(conv.modifiedTime)}${suffix}`
      );

      // Show file size and preview for selected item
      if (isSelected && !isSearchMode) {
        try {
          const stats = fs.statSync(conv.path);
          const sizeKB = (stats.size / 1024).toFixed(1);
          console.log(
            `${prefix}     ${pathColor}Path: ${conv.path} (${sizeKB} KB)${suffix}`
          );
        } catch (e) {
          console.log(
            `${prefix}     ${pathColor}Path: ${conv.path} (size unknown)${suffix}`
          );
        }
      }
      console.log("");
    });

    // Pagination info
    const totalFilteredPages = Math.ceil(
      filteredConversations.length / ITEMS_PER_PAGE
    );
    if (totalFilteredPages > 1) {
      console.log(
        `\x1b[90mPage ${
          page + 1
        } of ${totalFilteredPages} | Use Left/Right or PgUp/PgDn to navigate\x1b[0m`
      );
    }

    // Help text
    if (!isSearchMode) {
      const helpItems = [];
      helpItems.push("Up/Down: Navigate");
      helpItems.push("Enter: Select");
      helpItems.push("/: Search");
      if (totalFilteredPages > 1) {
        helpItems.push("Left/Right: Pages");
      }
      helpItems.push("q: Quit");
      console.log(`\n\x1b[90m${helpItems.join(" | ")}\x1b[0m`);
    }
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

    filterConversations();
    displayPage(currentPage);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", handleInput);
    };

    const selectCurrent = () => {
      if (filteredConversations.length === 0) {
        console.log("\n❌ No conversations available.");
        process.exit(1);
      }

      const selectedConv =
        filteredConversations[selectedIndex] || filteredConversations[0];
      if (!selectedConv) {
        console.log("\n❌ No valid conversation selected.");
        process.exit(1);
      }

      cleanup();
      console.log(
        `\n✅ Selected: \x1b[1m${selectedConv.projectName}/${selectedConv.fileName}\x1b[0m`
      );
      resolve(selectedConv);
    };

    const handleInput = (key: string) => {
      const keyStr = key.toString();

      // Handle search mode
      if (isSearchMode) {
        if (keyStr === "\u001b") {
          // ESC
          isSearchMode = false;
          displayPage(currentPage);
        } else if (keyStr === "\r" || keyStr === "\n") {
          // Enter
          isSearchMode = false;
          filterConversations();
          displayPage(currentPage);
        } else if (keyStr === "\u007f") {
          // Backspace
          if (searchQuery.length > 0) {
            searchQuery = searchQuery.slice(0, -1);
            filterConversations();
            displayPage(currentPage);
          }
        } else if (keyStr === "\u0003") {
          // Ctrl+C
          cleanup();
          process.exit(0);
        } else if (keyStr.length === 1 && keyStr >= " ") {
          // Printable characters
          searchQuery += keyStr;
          filterConversations();
          displayPage(currentPage);
        }
        return;
      }

      // Handle normal navigation mode
      switch (keyStr) {
        case "\r": // Enter
        case "\n":
          selectCurrent();
          break;

        case "\u0003": // Ctrl+C
          cleanup();
          process.exit(0);
          break;

        case "q":
        case "Q":
          cleanup();
          console.log("\n👋 Goodbye!");
          process.exit(0);
          break;

        case "/":
          isSearchMode = true;
          searchQuery = "";
          displayPage(currentPage);
          break;

        case "\u001b[A": // Up arrow
          if (selectedIndex > 0) {
            selectedIndex--;
            // Check if we need to go to previous page
            if (selectedIndex < currentPage * ITEMS_PER_PAGE) {
              currentPage = Math.max(0, currentPage - 1);
            }
            displayPage(currentPage);
          }
          break;

        case "\u001b[B": // Down arrow
          if (selectedIndex < filteredConversations.length - 1) {
            selectedIndex++;
            // Check if we need to go to next page
            const totalFilteredPages = Math.ceil(
              filteredConversations.length / ITEMS_PER_PAGE
            );
            if (selectedIndex >= (currentPage + 1) * ITEMS_PER_PAGE) {
              currentPage = Math.min(totalFilteredPages - 1, currentPage + 1);
            }
            displayPage(currentPage);
          }
          break;

        case "\u001b[D": // Left arrow
        case "\u001b[5~": // Page Up
          if (currentPage > 0) {
            currentPage--;
            selectedIndex = Math.min(
              selectedIndex,
              currentPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE - 1
            );
            selectedIndex = Math.max(
              selectedIndex,
              currentPage * ITEMS_PER_PAGE
            );
            displayPage(currentPage);
          }
          break;

        case "\u001b[C": // Right arrow
        case "\u001b[6~": // Page Down
          const totalFilteredPages = Math.ceil(
            filteredConversations.length / ITEMS_PER_PAGE
          );
          if (currentPage < totalFilteredPages - 1) {
            currentPage++;
            selectedIndex = Math.max(
              selectedIndex,
              currentPage * ITEMS_PER_PAGE
            );
            selectedIndex = Math.min(
              selectedIndex,
              Math.min(
                (currentPage + 1) * ITEMS_PER_PAGE - 1,
                filteredConversations.length - 1
              )
            );
            displayPage(currentPage);
          }
          break;

        case "\u001b[H": // Home
          selectedIndex = 0;
          currentPage = 0;
          displayPage(currentPage);
          break;

        case "\u001b[F": // End
          selectedIndex = filteredConversations.length - 1;
          currentPage =
            Math.ceil(filteredConversations.length / ITEMS_PER_PAGE) - 1;
          displayPage(currentPage);
          break;

        default:
          // Handle number keys for quick selection
          if (keyStr >= "1" && keyStr <= "9") {
            const num = parseInt(keyStr) - 1;
            const startIndex = currentPage * ITEMS_PER_PAGE;
            const endIndex = Math.min(
              startIndex + ITEMS_PER_PAGE,
              filteredConversations.length
            );
            if (num < endIndex - startIndex) {
              selectedIndex = startIndex + num;
              selectCurrent();
            }
          }
          break;
      }
    };

    process.stdin.on("data", handleInput);
  });
}
