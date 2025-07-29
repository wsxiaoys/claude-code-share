import type { ConversationFile } from "../../types.js";
import { formatDate } from "../../utils/conversation-scanner.js";
import fs from "node:fs";
import React from "react";
import { Box, Text } from "ink";
import { useConversationSelector } from "../hooks/useConversationSelector.js";

export interface ConversationSelectorProps {
  conversations: ConversationFile[];
  onSelect: (conversation: ConversationFile) => void;
  onExit: () => void;
}

const getFileSize = (path: string): string => {
    try {
      const stats = fs.statSync(path);
      return `${(stats.size / 1024).toFixed(1)} KB`;
    } catch {
      return "size unknown";
    }
  };

export const ConversationSelector: React.FC<ConversationSelectorProps> = ({ conversations, onSelect, onExit }) => {
    const {
        selectedIndex,
        currentPage,
        searchQuery,
        isSearchMode,
        totalPages,
        pageConversations,
        filteredConversations,
        startIndex
      } = useConversationSelector(conversations, onSelect, onExit);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🚀 Claude Code Share - Interactive Conversation Selector
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{"-".repeat(70)}</Text>
      </Box>

      {isSearchMode ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text>
            🔍 Search: <Text color="yellow">{searchQuery}</Text>
            <Text inverse>|</Text>
          </Text>
          <Text color="gray">Press ESC to exit search, Enter to confirm</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <Text>
            📋 Found <Text bold>{filteredConversations.length}</Text> conversations{" "}
            {searchQuery && (
              <Text color="gray">(filtered by &quot;{searchQuery}&quot;)</Text>
            )}
          </Text>
          <Text color="gray">
            Press &apos;/&apos; to search, Enter to select, &apos;q&apos; to quit
          </Text>
        </Box>
      )}

      {pageConversations.length === 0 ? (
        <Box flexDirection="column">
          <Text color="red">
            ❌ No conversations found matching your search.
          </Text>
          <Text color="gray">
            Try a different search term or press ESC to clear.
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {pageConversations.map((conv, index) => {
            const globalIndex = startIndex + index;
            const isSelected = globalIndex === selectedIndex && !isSearchMode;

            return (
              <Box key={conv.path} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text
                    color={isSelected ? "black" : "cyan"}
                    backgroundColor={isSelected ? "green" : undefined}
                  >
                    {isSelected ? " > " : "   "}
                    {globalIndex + 1}.
                  </Text>
                  <Text
                    bold={!isSelected}
                    color={isSelected ? "black" : "white"}
                    backgroundColor={isSelected ? "green" : undefined}
                  >
                    {conv.firstMessage || `${conv.projectName}/${conv.fileName}`}
                    {isSelected ? " " : ""}
                  </Text>
                </Box>

                <Box>
                  <Text
                    color={isSelected ? "black" : "gray"}
                    backgroundColor={isSelected ? "green" : undefined}
                  >
                    {isSelected ? "     " : "     "}
                    {conv.firstMessage ? `Project: ${conv.projectName} | ` : ""}Date:{" "}
                    {formatDate(conv.modifiedTime)}
                    {isSelected ? " " : ""}
                  </Text>
                </Box>

                {isSelected && !isSearchMode && (
                  <Box>
                    <Text color="black" backgroundColor="green">
                      {"     "}Path: {conv.path} ({getFileSize(conv.path)}){" "}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {totalPages > 1 && (
        <Box marginTop={1}>
          <Text color="gray">
            Page {currentPage + 1} of {totalPages} | Use Left/Right or PgUp/PgDn to navigate
          </Text>
        </Box>
      )}

      {!isSearchMode && (
        <Box marginTop={1}>
          <Text color="gray">
            Up/Down: Navigate | Enter: Select | /: Search
            {totalPages > 1 && " | Left/Right: Pages"} | q: Quit
          </Text>
        </Box>
      )}
    </Box>
  );
};