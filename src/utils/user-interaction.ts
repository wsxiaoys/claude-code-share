import type { ConversationFile } from "../types.js";
import { formatDate } from "./conversation-scanner.js";

/**
 * Displays conversation list and handles user selection
 * @param conversations Array of available conversations
 * @returns Promise that resolves to the selected conversation
 */
export async function selectConversation(conversations: ConversationFile[]): Promise<ConversationFile> {
  console.log("\n📋 Recent Claude Code conversations:");
  console.log("=".repeat(60));
  
  conversations.slice(0, 10).forEach((conv, index) => {
    console.log(`${index + 1}. ${conv.projectName}/${conv.fileName}`);
    console.log(`   Last modified: ${formatDate(conv.modifiedTime)}`);
    console.log("");
  });
  
  return new Promise((resolve) => {
    process.stdout.write("Select a conversation (1-10) or press Enter for the most recent: ");
    
    // Check if stdin is a TTY (interactive terminal)
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      let input = "";
      
      process.stdin.on('data', (key) => {
        const keyStr = key.toString();
        if (keyStr === '\r' || keyStr === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          
          const selection = input.trim() || "1";
          const index = parseInt(selection) - 1;
          
          if (index >= 0 && index < Math.min(conversations.length, 10) && conversations[index]) {
            console.log(`\n✅ Selected: ${conversations[index].projectName}/${conversations[index].fileName}`);
            resolve(conversations[index]);
          } else {
            console.log(`\n❌ Invalid selection. Using most recent conversation.`);
            if (conversations[0]) {
              resolve(conversations[0]);
            } else {
              console.error("No conversations available.");
              process.exit(1);
            }
          }
        } else if (keyStr === '\u0003') { // Ctrl+C
          process.exit(0);
        } else if (keyStr >= '0' && keyStr <= '9') {
          input += keyStr;
          process.stdout.write(keyStr);
        } else if (keyStr === '\u007f') { // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        }
      });
    } else {
      // Non-interactive mode (piped input), use most recent
      console.log("\n✅ Using most recent conversation (non-interactive mode)");
      if (conversations[0]) {
        resolve(conversations[0]);
      } else {
        console.error("No conversations available.");
        process.exit(1);
      }
    }
  });
}