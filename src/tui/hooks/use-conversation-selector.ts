import { useApp, useInput } from "ink";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Conversation } from "../../types.js";

// Function to get terminal height
function getTerminalHeight(): number {
  return process.stdout.rows || 24; // Default 24 lines
}

export function useConversationSelector(
  conversations: Conversation[],
  onSelect: (conversation: Conversation) => void,
  onExit: () => void,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(getTerminalHeight());
  const { exit } = useApp();

  useEffect(() => {
    const handleResize = () => {
      setTerminalHeight(getTerminalHeight());
    };

    process.stdout.on("resize", handleResize);
    return () => {
      process.stdout.off("resize", handleResize);
    };
  }, []);

  const ITEMS_PER_PAGE = useMemo(() => {
    const fixedLines = isSearchMode ? 10 : 9;
    const linesPerItem = 3;
    const availableLines = Math.max(terminalHeight - fixedLines, linesPerItem);
    const maxItems = Math.floor(availableLines / linesPerItem);
    return Math.max(1, Math.min(maxItems, 8));
  }, [isSearchMode, terminalHeight]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.path.toLowerCase().includes(query) ||
        conv.title.toLowerCase().includes(query),
    );
  }, [conversations, searchQuery]);

  useEffect(() => {
    setCurrentPage(0);
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    if (filteredConversations.length === 0) return;

    const newPage = Math.floor(selectedIndex / ITEMS_PER_PAGE);
    const maxPage =
      Math.ceil(filteredConversations.length / ITEMS_PER_PAGE) - 1;

    const validPage = Math.min(newPage, maxPage);
    setCurrentPage(validPage);

    const maxIndexInPage = Math.min(
      (validPage + 1) * ITEMS_PER_PAGE - 1,
      filteredConversations.length - 1,
    );

    if (selectedIndex > maxIndexInPage) {
      setSelectedIndex(maxIndexInPage);
    }
  }, [ITEMS_PER_PAGE, filteredConversations.length, selectedIndex]);

  const totalPages = Math.ceil(filteredConversations.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(
    startIndex + ITEMS_PER_PAGE,
    filteredConversations.length,
  );
  const pageConversations = filteredConversations.slice(startIndex, endIndex);

  const selectCurrent = useCallback(() => {
    if (filteredConversations.length === 0) {
      onExit();
      return;
    }
    const selectedConv =
      filteredConversations[selectedIndex] || filteredConversations[0];
    if (selectedConv) {
      onSelect(selectedConv);
    }
  }, [filteredConversations, selectedIndex, onSelect, onExit]);

  useInput((input, key) => {
    if (isSearchMode) {
      if (key.escape) {
        setIsSearchMode(false);
      } else if (key.return) {
        setIsSearchMode(false);
      } else if (key.backspace || key.delete) {
        setSearchQuery((prev) => prev.slice(0, -1));
      } else if (input && input.length === 1 && input >= " ") {
        setSearchQuery((prev) => prev + input);
      }
      return;
    }

    if (key.return) {
      selectCurrent();
    } else if (input === "q" || input === "Q" || (key.ctrl && input === "c")) {
      exit();
      onExit();
    } else if (input === "/") {
      setIsSearchMode(true);
      setSearchQuery("");
    } else if (key.upArrow) {
      setSelectedIndex((prev) => {
        const newIndex = Math.max(0, prev - 1);
        if (newIndex < currentPage * ITEMS_PER_PAGE) {
          setCurrentPage(Math.max(0, currentPage - 1));
        }
        return newIndex;
      });
    } else if (key.downArrow) {
      setSelectedIndex((prev) => {
        const newIndex = Math.min(filteredConversations.length - 1, prev + 1);
        if (newIndex >= (currentPage + 1) * ITEMS_PER_PAGE) {
          setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
        }
        return newIndex;
      });
    } else if (key.leftArrow || key.pageUp) {
      if (currentPage > 0) {
        const newPage = currentPage - 1;
        setCurrentPage(newPage);
        setSelectedIndex((prev) => {
          const newIndex = Math.min(
            prev,
            newPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE - 1,
          );
          return Math.max(newIndex, newPage * ITEMS_PER_PAGE);
        });
      }
    } else if (key.rightArrow || key.pageDown) {
      if (currentPage < totalPages - 1) {
        const newPage = currentPage + 1;
        setCurrentPage(newPage);
        setSelectedIndex((prev) => {
          const newIndex = Math.max(prev, newPage * ITEMS_PER_PAGE);
          return Math.min(
            newIndex,
            Math.min(
              (newPage + 1) * ITEMS_PER_PAGE - 1,
              filteredConversations.length - 1,
            ),
          );
        });
      }
    } else if (input >= "1" && input <= "9") {
      const num = parseInt(input) - 1;
      if (num < pageConversations.length) {
        setSelectedIndex(startIndex + num);
        selectCurrent();
      }
    }
  });

  return {
    selectedIndex,
    currentPage,
    searchQuery,
    isSearchMode,
    totalPages,
    pageConversations,
    filteredConversations,
    startIndex,
  };
}
