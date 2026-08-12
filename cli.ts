import readline from "node:readline";
import { ChatBot } from "./src/chatbot";
import { ChatterBotCorpusTrainer } from "./src/trainers/corpus-trainer";
import { SQLStorageAdapter } from "./src/storage/sqlite-adapter";
import { Statement } from "./src/statement";

console.log("\n==================================================");
console.log("   🤖 Bunno JS - Bun & SQLite Conversational Engine 🤖   ");
console.log("==================================================\n");

const storage = new SQLStorageAdapter({ databaseUri: "bunno_cli.sqlite3" });
const bot = new ChatBot({
  name: "BunnoCLI",
  storageAdapter: storage,
  confidenceThreshold: 0.5,
  readOnly: false,
});

// Train initial corpus if DB is empty
if (storage.count() === 0) {
  console.log("📦 Empty database detected. Training standard Bunno corpus...");
  const trainer = new ChatterBotCorpusTrainer(bot);
  trainer.train("bunno.corpus.english");
  console.log(`✅ Training complete. Database now contains ${storage.count()} statements.\n`);
} else {
  console.log(`ℹ️ Loaded database with ${storage.count()} statements.\n`);
}

let mode: "chat" | "learning" = "chat";
let teachingQuery: string | null = null;

const printMenu = () => {
  console.log("Special Commands available:");
  console.log("  /commands   - Display this list of available commands");
  console.log("  /chat       - Switch to standard conversational chat mode");
  console.log("  /learning   - Toggle dynamic real-time learning (on/off)");
  console.log("  /score      - View or set minimum similarity score threshold (0.0 to 1.0)");
  console.log("  /settings   - Display all current bot configuration settings");
  console.log("  /stats      - View SQLite database statistics");
  console.log("  /showdata   - Show all rows stored in the SQLite database");
  console.log("  /train      - Train with built-in conversational corpus");
  console.log("  /clear      - Reset database to default initial state");
  console.log("  /exit       - Exit the CLI application\n");
};

printMenu();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = () => {
  let promptLabel = "\x1b[36mYou:\x1b[0m ";
  if (teachingQuery) {
    promptLabel = `\x1b[33m[Teach Bot] What should I reply to "${teachingQuery}"? (Press Enter to skip):\x1b[0m `;
  } else if (mode === "learning") {
    promptLabel = "\x1b[33m[Learning Mode] You:\x1b[0m ";
  }

  rl.question(promptLabel, async (input) => {
    const trimmed = input.trim();

    // If currently in teaching mode for a query
    if (teachingQuery) {
      const currentQuery = teachingQuery;
      teachingQuery = null;

      if (trimmed) {
        // Save prompt and user-taught answer
        const userPrompt = new Statement({ text: currentQuery });
        const taughtAnswer = new Statement({ text: trimmed, in_response_to: currentQuery });
        bot.learnResponse(userPrompt, taughtAnswer);
        console.log(`\x1b[32mBot:\x1b[0m Thank you! I have learned the answer for "${currentQuery}".\n`);
      } else {
        console.log("⏩ Skipped teaching.\n");
      }
      askQuestion();
      return;
    }

    if (!trimmed) {
      askQuestion();
      return;
    }

    const lower = trimmed.toLowerCase();

    // 1. /commands or /help command
    if (lower === "/commands" || lower === "/help" || lower === "commands" || lower === "help") {
      printMenu();
      askQuestion();
      return;
    }

    // 2. /exit command
    if (lower === "/exit" || lower === "exit") {
      console.log("👋 Goodbye!");
      bot.close();
      process.exit(0);
    }

    // 3. /chat command
    if (lower === "/chat") {
      mode = "chat";
      console.log("\x1b[32m💬 Switched to normal Chat mode.\x1b[0m\n");
      askQuestion();
      return;
    }

    // 4. /learning command
    if (lower.startsWith("/learning")) {
      const parts = trimmed.split(/\s+/);
      if (parts.length > 1) {
        const sub = parts[1].toLowerCase();
        if (sub === "on" || sub === "enable" || sub === "true") {
          bot.readOnly = false;
        } else if (sub === "off" || sub === "disable" || sub === "false") {
          bot.readOnly = true;
        }
      } else {
        // Toggle if no argument passed
        bot.readOnly = !bot.readOnly;
      }

      mode = bot.readOnly ? "chat" : "learning";
      const statusText = bot.readOnly ? "\x1b[31mDISABLED (readOnly: true)\x1b[0m" : "\x1b[32mENABLED (learning from chat)\x1b[0m";
      console.log(`\n🧠 [Learning Mode] ${statusText}\n`);
      askQuestion();
      return;
    }

    // 5. /score command
    if (lower.startsWith("/score")) {
      const parts = trimmed.split(/\s+/);
      if (parts.length > 1) {
        let val = parseFloat(parts[1].replace("%", ""));
        if (!isNaN(val)) {
          if (val > 1.0 && val <= 100.0) {
            val = val / 100.0;
          }
          if (val >= 0.0 && val <= 1.0) {
            bot.confidenceThreshold = val;
            console.log(`\n🎯 Minimum similarity score threshold set to: \x1b[33m${val.toFixed(2)} (${(val * 100).toFixed(0)}%)\x1b[0m\n`);
          } else {
            console.log("\n⚠️ Please specify a valid score between 0.0 and 1.0 (or 0% to 100%).\n");
          }
        } else {
          console.log("\n⚠️ Invalid score argument. Example usage: /score 0.75 or /score 75%\n");
        }
      } else {
        const pct = (bot.confidenceThreshold * 100).toFixed(0);
        console.log(`\n🎯 Current similarity threshold score: \x1b[33m${bot.confidenceThreshold.toFixed(2)} (${pct}%)\x1b[0m\n`);
      }
      askQuestion();
      return;
    }

    // 6. /settings command
    if (lower === "/settings") {
      const learningStatus = bot.readOnly ? "Disabled (readOnly: true)" : "Enabled (readOnly: false)";
      const adapters = bot.logicAdapters.map((a) => a.constructor.name).join(", ");
      const preprocessors = bot.preprocessors.map((p) => p.name || "anonymous").join(", ");

      console.log("\n⚙️  \x1b[1m[Current Bot Settings]\x1b[0m");
      console.log(`  • \x1b[36mBot Name:\x1b[0m ${bot.name}`);
      console.log(`  • \x1b[36mDatabase URI:\x1b[0m ${storage.databaseUri}`);
      console.log(`  • \x1b[36mDynamic Learning:\x1b[0m ${learningStatus}`);
      console.log(`  • \x1b[36mSimilarity Threshold:\x1b[0m ${bot.confidenceThreshold.toFixed(2)} (${(bot.confidenceThreshold * 100).toFixed(0)}%)`);
      console.log(`  • \x1b[36mDefault Response:\x1b[0m "${bot.defaultResponse}"`);
      console.log(`  • \x1b[36mActive Logic Adapters:\x1b[0m ${adapters}`);
      console.log(`  • \x1b[36mActive Preprocessors:\x1b[0m ${preprocessors}\n`);
      askQuestion();
      return;
    }

    // 7. /stats command
    if (lower === "/stats") {
      const learningStatus = bot.readOnly ? "Disabled (readOnly)" : "Enabled";
      const scoreThreshold = `${bot.confidenceThreshold.toFixed(2)} (${(bot.confidenceThreshold * 100).toFixed(0)}%)`;
      console.log(`\n📊 [DB Stats] Statements: ${storage.count()} | Learning: ${learningStatus} | Min Similarity Score: ${scoreThreshold}\n`);
      askQuestion();
      return;
    }

    // 8. /showdata command
    if (lower === "/showdata") {
      const allStatements = storage.filter({});
      console.log(`\n📂 [Database Rows] Total: ${allStatements.length}`);
      if (allStatements.length === 0) {
        console.log("   (Database is empty)\n");
      } else {
        console.table(
          allStatements.map((s) => ({
            ID: s.id,
            Text: s.text,
            "In Response To": s.in_response_to || "-",
            Occurrences: s.occurrence_count,
          }))
        );
        console.log("");
      }
      askQuestion();
      return;
    }

    // 9. /train command
    if (lower === "/train") {
      console.log("⏳ Training corpus...");
      const trainer = new ChatterBotCorpusTrainer(bot);
      trainer.train("bunno.corpus.english");
      console.log(`✅ Training done. Total statements: ${storage.count()}\n`);
      askQuestion();
      return;
    }

    // 10. /clear command
    if (lower === "/clear") {
      console.log("🧹 Clearing SQLite database...");
      storage.drop();
      console.log("🌱 Resetting to default state with standard corpus...");
      const trainer = new ChatterBotCorpusTrainer(bot);
      trainer.train("bunno.corpus.english");
      console.log(`✨ Database reset complete. Total statements: ${storage.count()}\n`);
      askQuestion();
      return;
    }

    // Chat processing
    try {
      const response = await bot.getResponse(trimmed);
      const confidencePct = (response.confidence * 100).toFixed(1);

      if (response.text === bot.defaultResponse) {
        console.log(`\x1b[32mBot:\x1b[0m I don't know the answer to this query yet. \x1b[90m(Confidence: ${confidencePct}%)\x1b[0m`);
        // Trigger interactive teaching prompt if learning is enabled
        if (!bot.readOnly) {
          teachingQuery = trimmed;
        } else {
          console.log("");
        }
      } else {
        console.log(`\x1b[32mBot:\x1b[0m ${response.text} \x1b[90m(Confidence: ${confidencePct}%)\x1b[0m\n`);
      }
    } catch (err) {
      console.error("Error processing response:", err);
    }

    askQuestion();
  });
};

askQuestion();
