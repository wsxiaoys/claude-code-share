#!/usr/bin/env bun

import fs from "node:fs";
import type { UIMessage } from "ai";
import { Command } from "commander";
import * as converters from "@/converters";

const program = new Command();

async function getContent(filePath?: string): Promise<string> {
  if (filePath) {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      console.error(`Error reading file: ${filePath}`, error);
      process.exit(1);
    }
  }
  // Read from stdin
  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk as Buffer));
    process.stdin.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8")),
    );
  });
}

program
  .name("claude-code-share")
  .description(
    "Transform your Claude Code conversations into beautiful, shareable links.",
  )
  .version("1.0.0")
  .argument(
    "[file]",
    "The path to the history file. Reads from stdin if not provided.",
  )
  .action(async (filePath) => {
    const content = await getContent(filePath);

    const messages: UIMessage[] = converters.claude.convert(content);
    console.log(JSON.stringify(messages, null, 2));
  });

program.parse(process.argv);
