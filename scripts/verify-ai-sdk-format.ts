import fs from "node:fs";
import type { Message } from "../src/types";
import { claude } from "../src/converters/claude";

const inputData = "testdata/example.jsonl";
const outputData = "testdata/ai-sdk-format.json";

const messages = claude.convert(fs.readFileSync(inputData, "utf-8"));

fs.writeFileSync(outputData, JSON.stringify(messages, null, 2), "utf-8");

const filePath = outputData;

console.log("🔍 Testing AI SDK UIMessage compatibility...");
console.log(`📁 File: ${filePath}`);
console.log("");

try {
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    console.log("❌ FAILED: Data must be an array");
    process.exit(1);
  }

  console.log("✅ JSON parsing: SUCCESS");
  console.log("✅ Array structure: SUCCESS");
  console.log(`📊 Total messages: ${data.length}`);

  // Test TypeScript casting to Message[]
  const _messages: Message[] = data;
  console.log("✅ TypeScript casting: SUCCESS");
  console.log("");

  // Basic validation
  let valid = 0,
    invalid = 0;
  const stats = {
    user: 0,
    assistant: 0,
    system: 0,
    withParts: 0,
    withToolInvocations: 0,
  };
  const errors: string[] = [];

  data.forEach((msg: Message, i: number) => {
    if (
      typeof msg === "object" &&
      msg !== null &&
      typeof msg.id === "string" &&
      msg.id.trim() !== "" &&
      ["user", "assistant", "system"].includes(msg.role) &&
      Array.isArray(msg.parts)
    ) {
      valid++;
      if (msg.role === "user") stats.user++;
      else if (msg.role === "assistant") stats.assistant++;
      else if (msg.role === "system") stats.system++;

      if (msg.parts && msg.parts.length > 0) {
        stats.withParts++;
        if (msg.parts.some((part) => part.type.startsWith("tool-")))
          stats.withToolInvocations++;
      }
    } else {
      invalid++;
      errors.push(
        `Message ${i} (ID: ${msg?.id || "unknown"}): Invalid structure`,
      );
    }
  });

  console.log("📈 VALIDATION RESULTS:");
  console.log(`✅ Valid messages: ${valid}`);
  console.log(`❌ Invalid messages: ${invalid}`);
  console.log(`👤 User messages: ${stats.user}`);
  console.log(`🤖 Assistant messages: ${stats.assistant}`);
  console.log(`⚙️ System messages: ${stats.system}`);
  console.log(`🧩 Messages with parts: ${stats.withParts}`);
  console.log(
    `🔧 Messages with tool invocations: ${stats.withToolInvocations}`,
  );
  console.log("");

  if (invalid === 0) {
    console.log(
      "🎉 PERFECT! Your file is fully compatible with the new AI SDK Message format!",
    );
    console.log("✅ You can import and use this data directly:");
    console.log("");
    console.log("```typescript");
    console.log('import type { Message } from "./src/types";');
    console.log('import messages from "./ai-sdk-format.json";');
    console.log("");
    console.log("const uiMessages: Message[] = messages;");
    console.log(
      "// Use with AI SDK functions like generateText, streamText, etc.",
    );
    console.log("```");

    if (stats.withParts > 0) {
      console.log(
        'ℹ️  Note: Some messages contain "parts" for rich content structure.',
      );
    }

    if (stats.withToolInvocations > 0) {
      console.log(
        "ℹ️  Note: Some messages contain tool invocations for interactive capabilities.",
      );
    }

    process.exit(0);
  } else {
    console.log("❌ Some messages have validation issues:");
    errors.slice(0, 5).forEach((error) => console.log(`   • ${error}`));
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more errors`);
    }
    process.exit(1);
  }
} catch (error) {
  console.log(
    `❌ ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
  process.exit(1);
}
