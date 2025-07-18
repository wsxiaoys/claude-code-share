// Updated to match actual Claude Code history format
type UserMessage = {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  type: "user";
  message: {
    role: "user";
    content: string | Array<any>;
  };
  uuid: string;
  timestamp: string;
};

type AssistantHistoryMessage = {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  type: "assistant";
  message: {
    role: "assistant";
    content: string | Array<any>;
  };
  uuid: string;
  timestamp: string;
};

export type ClaudeCodeMessage = UserMessage | AssistantHistoryMessage;
