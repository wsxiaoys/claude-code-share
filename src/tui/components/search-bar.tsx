import React from "react";
import { Box, Text } from "ink";
import { UI_CONSTANTS } from "../constants.js";

export interface SearchBarProps {
  isSearchMode: boolean;
  searchQuery: string;
  filteredConversationsLength: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  isSearchMode,
  searchQuery,
  filteredConversationsLength,
}) => {
  if (isSearchMode) {
    return (
      <Box flexDirection="column" marginBottom={UI_CONSTANTS.SPACING.MARGIN_BOTTOM}>
        <Text>
          🔍 Search: <Text color={UI_CONSTANTS.COLORS.ACCENT}>{searchQuery}</Text>
          <Text inverse>|</Text>
        </Text>
        <Text color={UI_CONSTANTS.COLORS.SECONDARY}>Press ESC to exit search, Enter to confirm</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={UI_CONSTANTS.SPACING.MARGIN_BOTTOM}>
      <Text>
        📋 Found <Text bold>{filteredConversationsLength}</Text> conversations{" "}
        {searchQuery && (
          <Text color={UI_CONSTANTS.COLORS.SECONDARY}>(filtered by &quot;{searchQuery}&quot;)</Text>
        )}
      </Text>
      <Text color={UI_CONSTANTS.COLORS.SECONDARY}>
        Press &apos;/&apos; to search, Enter to select, &apos;q&apos; to quit
      </Text>
    </Box>
  );
};