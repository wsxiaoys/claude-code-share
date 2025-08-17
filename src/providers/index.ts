import type { Provider } from "@/types.js";
import { claude } from "./claude";

const providers: Record<string, Provider> = {
  [claude.id]: claude,
};

export function getProvider(name?: string): Provider {
  if (!name) return claude;
  const p = providers[name];
  if (!p) {
    const names = Object.keys(providers).join(", ");
    console.error(`❌ Unknown provider: ${name}, available options: ${names}`);
    process.exit(1);
  }
  return p;
}
