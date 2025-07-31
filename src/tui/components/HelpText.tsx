import React from "react";
import { Box, Text } from "ink";
import { UI_CONSTANTS } from "../constants.js";

export interface HelpTextProps {
  isSearchMode: boolean;
  totalPages: number;
}

export const HelpText: React.FC<HelpTextProps> = ({
  isSearchMode,
  totalPages,
}) => {
  if (isSearchMode) {
    return null;
  }

  return (
    <Box marginTop={UI_CONSTANTS.SPACING.MARGIN_TOP}>
      <Text color={UI_CONSTANTS.COLORS.SECONDARY}>
        Up/Down: Navigate | Enter: Select | /: Search
        {totalPages > 1 && " | Left/Right: Pages"} | q: Quit
      </Text>
    </Box>
  );
};