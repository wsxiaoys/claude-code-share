import type { Provider } from "@/types.js";
import { claude } from "./claude.js";

export const providers: Record<string, Provider> = {
  [claude.id]: claude,
};

export function getProvider(name?: string): Provider {
  if (!name) return claude;
  const p = providers[name];
  if (!p) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return p;
}
