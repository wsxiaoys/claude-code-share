export function convertToWindowsLineEndings(text: string): string {
  return text.replace(/\r?\n/g, "\r\n");
}

export function stripCwdPrefix(path: string, cwd: string): string {
  if (!cwd || !path) return path;

  // Normalize paths by removing trailing slashes
  const normalizedCwd = cwd.replace(/\/$/, "");
  const normalizedPath = path.replace(/\/$/, "");

  // If path starts with cwd, remove the cwd prefix
  if (normalizedPath.startsWith(normalizedCwd)) {
    const stripped = normalizedPath.slice(normalizedCwd.length);
    // Remove leading slash if present
    return stripped.startsWith("/") ? stripped.slice(1) : stripped;
  }

  return path;
}

export function stripCwdFromArray(items: string[], cwd: string): string[] {
  return items.map((item) => stripCwdPrefix(item, cwd));
}

export function stripCwdFromText(text: string, cwd: string): string {
  if (!cwd || !text) return text;

  // Split text into lines, process each line, then rejoin
  return text
    .split("\n")
    .map((line) => {
      // For each line, try to find and replace cwd prefixes
      // This handles cases where paths appear in the middle of lines
      const normalizedCwd = cwd.replace(/\/$/, "");
      if (line.includes(normalizedCwd)) {
        return line.replace(new RegExp(`${normalizedCwd}/?/`, "g"), "");
      }
      return line;
    })
    .join("\n");
}
