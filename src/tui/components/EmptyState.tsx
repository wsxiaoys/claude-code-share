import React from "react";
import { Box, Text } from "ink";
import { UI_CONSTANTS } from "../constants.js";

export const EmptyState: React.FC = () => {
  return (
    <Box flexDirection="column">
      <Text color={UI_CONSTANTS.COLORS.ERROR}>
        ❌ No conversations found matching your search.
      </Text>
      <Text color={UI_CONSTANTS.COLORS.SECONDARY}>
        Try a different search term or press ESC to clear.
      </Text>
    </Box>
  );
};