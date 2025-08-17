import fs from "node:fs";

/**
 * Reads content from a file or stdin
 * @param filePath Optional file path. If not provided, reads from stdin
 * @returns Promise that resolves to the file content as string
 */
export async function getContent(filePath?: string): Promise<string> {
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
