import type { Provider } from "@/types";
import { convertToMessages } from "./convert-messages";
import { listConversations } from "./list-conversations";

export const gemini: Provider = {
  id: "gemini",
  displayName: "Gemini",

  get conversations() {
    return listConversations();
  },

  convertToMessages,
};