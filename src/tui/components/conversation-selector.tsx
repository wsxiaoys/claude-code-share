import type { ConversationFile } from "../../types.js";
import React from "react";
import { Box, Text } from "ink";
import { useConversationSelector } from "../hooks/use-Conversation-Selector.js";
import { SearchBar } from "./search-bar.js";
import { ConversationItem } from "./conversation-item.js";
import { PaginationInfo } from "./pagination-info.js";
import { HelpText } from "./help-text.js";
import { EmptyState } from "./empty-state.js";
import { UI_CONSTANTS } from "../constants.js";

export interface ConversationSelectorProps {
  conversations: ConversationFile[];
  onSelect: (conversation: ConversationFile) => void;
  onExit: () => void;
}



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
      <Box marginBottom={UI_CONSTANTS.SPACING.MARGIN_BOTTOM}>
        <Text bold color={UI_CONSTANTS.COLORS.PRIMARY}>
          🚀 Claude Code Share - Interactive Conversation Selector
        </Text>
      </Box>

      <Box marginBottom={UI_CONSTANTS.SPACING.MARGIN_BOTTOM}>
        <Text color={UI_CONSTANTS.COLORS.SECONDARY}>
          {"-".repeat(UI_CONSTANTS.SEPARATOR_LENGTH)}
        </Text>
      </Box>

      <SearchBar
        isSearchMode={isSearchMode}
        searchQuery={searchQuery}
        filteredConversationsLength={filteredConversations.length}
      />

      {pageConversations.length === 0 ? (
        <EmptyState />
      ) : (
        <Box flexDirection="column">
          {pageConversations.map((conv, index) => {
            const globalIndex = startIndex + index;
            const isSelected = globalIndex === selectedIndex && !isSearchMode;

            return (
              <ConversationItem
                key={conv.path}
                conversation={conv}
                isSelected={isSelected}
                globalIndex={globalIndex}
                isSearchMode={isSearchMode}
              />
            );
          })}
        </Box>
      )}

      <PaginationInfo currentPage={currentPage} totalPages={totalPages} />
      <HelpText isSearchMode={isSearchMode} totalPages={totalPages} />
    </Box>
  );
};