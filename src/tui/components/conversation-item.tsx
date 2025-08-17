import React from "react";
import { Box, Text } from "ink";
import type { Conversation } from "../../types.js";
import { UI_CONSTANTS } from "../constants.js";
import fs from "node:fs";

export interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  globalIndex: number;
  isSearchMode: boolean;
}

const getFileSize = (path: string): string => {
  try {
    const stats = fs.statSync(path);
    return `${(stats.size / 1024).toFixed(1)} KB`;
  } catch {
    return "size unknown";
  }
};

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  globalIndex,
  isSearchMode,
}) => {
  return (
    <Box key={conversation.path} flexDirection="column" marginBottom={UI_CONSTANTS.SPACING.MARGIN_BOTTOM}>
      <Box>
        <Text
          color={isSelected ? UI_CONSTANTS.COLORS.SELECTED_TEXT : UI_CONSTANTS.COLORS.PRIMARY}
          backgroundColor={isSelected ? UI_CONSTANTS.COLORS.SUCCESS : undefined}
        >
          {isSelected ? UI_CONSTANTS.SPACING.SELECTION_INDICATOR : UI_CONSTANTS.SPACING.DEFAULT_INDICATOR}
          {globalIndex + 1}.
        </Text>
        <Text
          bold={!isSelected}
          color={isSelected ? UI_CONSTANTS.COLORS.SELECTED_TEXT : UI_CONSTANTS.COLORS.TEXT}
          backgroundColor={isSelected ? UI_CONSTANTS.COLORS.SUCCESS : undefined}
        >
          {conversation.title}
          {isSelected ? " " : ""}
        </Text>
      </Box>

      <Box>
        <Text
          color={isSelected ? UI_CONSTANTS.COLORS.SELECTED_TEXT : UI_CONSTANTS.COLORS.SECONDARY}
          backgroundColor={isSelected ? UI_CONSTANTS.COLORS.SUCCESS : undefined}
        >
          {isSelected ? UI_CONSTANTS.SPACING.INDENT : UI_CONSTANTS.SPACING.INDENT}
          {formatDate(conversation.mtime)}
          {isSelected ? " " : ""}
        </Text>
      </Box>

      {isSelected && !isSearchMode && (
        <Box>
          <Text color={UI_CONSTANTS.COLORS.SELECTED_TEXT} backgroundColor={UI_CONSTANTS.COLORS.SUCCESS}>
            {UI_CONSTANTS.SPACING.INDENT}Path: {conversation.path} ({getFileSize(conversation.path)}){" "}
          </Text>
        </Box>
      )}
    </Box>
  );
};

function formatDate(date: Date): string {
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}