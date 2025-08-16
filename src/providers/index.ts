import type { Provider } from "@/types.js";
import { claudeProvider } from "./claude.js";
import { geminiProvider } from "./gemini.js";

export const providers: Record<string, Provider> = {
  [claudeProvider.name]: claudeProvider,
  [geminiProvider.name]: geminiProvider,
};

export function getProvider(name?: string): Provider {
  if (!name) return claudeProvider;
  const p = providers[name];
  if (!p) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return p;
}
