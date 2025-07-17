import path from "path";
import { HistoryParser } from "./src/HistoryParser";

const filePathArg = process.argv[2];

if (!filePathArg) {
  console.error("Usage: bun index.ts <path_to_jsonl_file>");
  process.exit(1);
}

const filePath = path.resolve(filePathArg);

const historyParser = new HistoryParser();
const messages = historyParser.parse(filePath);

console.log(JSON.stringify(messages, null, 2));
