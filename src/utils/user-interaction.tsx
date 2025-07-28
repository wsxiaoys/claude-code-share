import type { ConversationFile } from "../types.js";
import { formatDate } from "./conversation-scanner.js";
import fs from "node:fs";
import React, { useState, useEffect, useCallback } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { useMemo } from "react";

// 获取终端高度的函数
function getTerminalHeight(): number {
  return process.stdout.rows || 24; // 默认24行
}

interface ConversationSelectorProps {
  conversations: ConversationFile[];
  onSelect: (conversation: ConversationFile) => void;
  onExit: () => void;
}

const ConversationSelector: React.FC<ConversationSelectorProps> = ({
  conversations,
  onSelect,
  onExit,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(getTerminalHeight());
  const { exit } = useApp();

  // 监听终端大小变化
  useEffect(() => {
    const handleResize = () => {
      setTerminalHeight(getTerminalHeight());
    };

    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  // 动态计算每页显示的项目数量
  const ITEMS_PER_PAGE = useMemo(() => {
    // 计算固定UI元素占用的行数：
    // - 标题: 1行
    // - 分隔线: 1行 
    // - 搜索/信息区域: 2-3行
    // - 分页信息: 1行
    // - 帮助文本: 1行
    // - 边距和空行: 3-4行
    const fixedLines = isSearchMode ? 10 : 9;
    
    // 每个对话项占用的行数：
    // - 普通项: 2行 (名称 + 日期)
    // - 选中项: 3行 (名称 + 日期 + 路径)
    // - 项目间距: 1行
    const linesPerItem = 3; // 按最大情况计算
    
    // 计算可用于显示对话项的行数
    const availableLines = Math.max(terminalHeight - fixedLines, linesPerItem);
    
    // 计算最大可显示的项目数量，最少1个，最多不超过原来的8个
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
        conv.projectName.toLowerCase().includes(query) ||
        conv.fileName.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Reset pagination when filtering
  useEffect(() => {
    setCurrentPage(0);
    setSelectedIndex(0);
  }, [searchQuery]);

  // 当ITEMS_PER_PAGE变化时，调整当前页面和选中索引
  useEffect(() => {
    if (filteredConversations.length === 0) return;
    
    // 计算当前选中项应该在哪一页
    const newPage = Math.floor(selectedIndex / ITEMS_PER_PAGE);
    const maxPage = Math.ceil(filteredConversations.length / ITEMS_PER_PAGE) - 1;
    
    // 确保页面索引在有效范围内
    const validPage = Math.min(newPage, maxPage);
    setCurrentPage(validPage);
    
    // 如果当前选中的索引超出了新的范围，调整到当前页的最后一项
    const maxIndexInPage = Math.min(
      (validPage + 1) * ITEMS_PER_PAGE - 1,
      filteredConversations.length - 1
    );
    
    if (selectedIndex > maxIndexInPage) {
      setSelectedIndex(maxIndexInPage);
    }
  }, [ITEMS_PER_PAGE, filteredConversations.length, selectedIndex]);

  const totalPages = Math.ceil(filteredConversations.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(
    startIndex + ITEMS_PER_PAGE,
    filteredConversations.length
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

    // Normal navigation mode
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
            newPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE - 1
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
              filteredConversations.length - 1
            )
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

  const getFileSize = (path: string): string => {
    try {
      const stats = fs.statSync(path);
      return `${(stats.size / 1024).toFixed(1)} KB`;
    } catch {
      return "size unknown";
    }
  };

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🚀 Claude Code Share - Interactive Conversation Selector
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{"-".repeat(70)}</Text>
      </Box>

      {/* Search bar or info */}
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
            📋 Found <Text bold>{filteredConversations.length}</Text>{" "}
            conversations{" "}
            {searchQuery && (
              <Text color="gray">(filtered by &quot;{searchQuery}&quot;)</Text>
            )}
          </Text>
          <Text color="gray">
            Press &apos;/&apos; to search, Enter to select, &apos;q&apos; to
            quit
          </Text>
        </Box>
      )}

      {/* Conversation list */}
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
                    {conv.projectName}/{conv.fileName}
                    {isSelected ? " " : ""}
                  </Text>
                </Box>

                <Box>
                  <Text
                    color={isSelected ? "black" : "gray"}
                    backgroundColor={isSelected ? "green" : undefined}
                  >
                    {isSelected ? "     " : "     "}Date:{" "}
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

      {/* Pagination info */}
      {totalPages > 1 && (
        <Box marginTop={1}>
          <Text color="gray">
            Page {currentPage + 1} of {totalPages} | Use Left/Right or PgUp/PgDn
            to navigate
          </Text>
        </Box>
      )}

      {/* Help text */}
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

/**
 * Displays conversation list with enhanced interactive features and handles user selection
 * @param conversations Array of available conversations
 * @returns Promise that resolves to the selected conversation
 */
export async function selectConversation(
  conversations: ConversationFile[]
): Promise<ConversationFile> {
  return new Promise((resolve, reject) => {
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

    let selectedConversation: ConversationFile | null = null;
    let hasExited = false;

    const handleSelect = (conversation: ConversationFile) => {
      selectedConversation = conversation;
      hasExited = true;
    };

    const handleExit = () => {
      hasExited = true;
    };

    const { unmount } = render(
      <ConversationSelector
        conversations={conversations}
        onSelect={handleSelect}
        onExit={handleExit}
      />
    );

    // Monitor for completion
    const checkCompletion = () => {
      if (hasExited) {
        unmount();
        if (selectedConversation) {
          console.log(
            `\nSelected: ${selectedConversation.projectName}/${selectedConversation.fileName}`
          );
          resolve(selectedConversation);
        } else {
          console.log("\n👋 Goodbye!");
          process.exit(0);
        }
      } else {
        setTimeout(checkCompletion, 100);
      }
    };

    checkCompletion();
  });
}
