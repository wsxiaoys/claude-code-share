import path from "path";
import { HistoryParser } from "./src/HistoryParser";

const filePath = path.resolve(
  "/Users/allenz/.claude/projects/-Users-allenz-Documents-foxychat-app/28687881-6c8e-4263-a4a8-ab116223d5b3.jsonl"
);

const historyParser = new HistoryParser();
const messages = historyParser.parse(filePath);

console.log(JSON.stringify(messages, null, 2));
