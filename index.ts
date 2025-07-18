import path from "path";
import { HistoryParser } from "./src/HistoryParser";
import fs from "fs";

const filePathArg = process.argv[2];

if (!filePathArg) {
  console.error("Usage: bun index.ts <path_to_jsonl_file>");
  process.exit(1);
}

const filePath = path.resolve(filePathArg);

const historyParser = new HistoryParser();
const messages = historyParser.parse(filePath);

fs.writeFileSync(
  path.join("output", "ai-sdk-format.txt"),
  JSON.stringify(messages, null, 2),
  "utf-8"
);
