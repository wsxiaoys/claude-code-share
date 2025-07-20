import fs from "fs";
import path from "path";

const inputFile = path.join(__dirname, "..", "example.jsonl");
const outputDir = path.join(__dirname, "..", "output");
const outputFile = path.join(outputDir, "pretty-example.jsonl");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.readFile(inputFile, "utf8", (err, data) => {
  if (err) {
    console.error("Error reading the file:", err);
    return;
  }

  const lines = data.trim().split("\n");
  const prettyJson = lines
    .map((line) => {
      try {
        const jsonObject = JSON.parse(line);
        return JSON.stringify(jsonObject, null, 2);
      } catch (parseError) {
        console.error("Error parsing JSON on a line:", parseError);
        return null;
      }
    })
    .filter(Boolean)
    .join("\n");

  fs.writeFile(outputFile, prettyJson, "utf8", (writeErr) => {
    if (writeErr) {
      console.error("Error writing the pretty-printed file:", writeErr);
      return;
    }
    console.log(`Successfully pretty-printed the JSONL file to ${outputFile}`);
  });
});
