import type { Provider } from "@/types";
import { convertToMessages } from "./convert-messages";
import { listConversations } from "./list-conversations";

export const claude: Provider = {
  id: "claude",
  displayName: "Claude Code",

  get conversations() {
    return listConversations();
  },

  convertToMessages,
};
