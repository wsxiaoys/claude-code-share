import React from "react";
import { Box, Text } from "ink";
import { UI_CONSTANTS } from "../constants.js";

export interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
}

export const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  totalPages,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Box marginTop={UI_CONSTANTS.SPACING.MARGIN_TOP}>
      <Text color={UI_CONSTANTS.COLORS.SECONDARY}>
        Page {currentPage + 1} of {totalPages} | Use Left/Right or PgUp/PgDn to navigate
      </Text>
    </Box>
  );
};