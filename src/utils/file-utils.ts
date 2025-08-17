import fs from "node:fs";

/**
 * Reads content from a file or stdin
 * @param filepath Optional file path. If not provided, reads from stdin
 * @returns Promise that resolves to the file content as string
 */
export async function readFileOrStdin(filepath?: string): Promise<string> {
  if (filepath) {
    try {
      return fs.readFileSync(filepath, "utf-8");
    } catch (error) {
      console.error(`Error reading file: ${filepath}`, error);
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
