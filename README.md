# Bunno JS 🤖⚡

A high-performance, zero-dependency JavaScript & SQLite conversational engine, engineered specifically for **Bun**.

---

## 🌟 Key Features

- ⚡ **Zero-Dependency SQLite Storage**: Built on Bun's native `bun:sqlite` with WAL mode, indexing, and fast transactions.
- 🎉 **`node-emoji` Integration**: Powered by [`node-emoji`](https://www.npmjs.com/package/node-emoji), automatically selecting and appending random Unicode emojis across thousands of available emoji definitions to every bot response.
- 🎓 **Interactive Teaching Mode**: If the bot is uncertain or doesn't know the answer, it interactively prompts you to teach it the correct response and immediately remembers it in SQLite.
- 🎯 **Modular Logic Adapters**:
  - `BestMatch`: Fuzzy pattern matching across SQLite statements using similarity metrics.
  - `MathematicalEvaluation`: Safely evaluates math expressions (e.g., `25 * 4`, `(10 + 2) * sqrt(16)`).
  - `TimeLogicAdapter`: Responds to date and time queries (`What time is it?`, `What is today's date?`).
  - `SpecificResponse`: Custom exact-match rule pairs.
- 📐 **Distance & Similarity Algorithms**:
  - `LevenshteinDistance`: Normalized character edit distance.
  - `JaccardSimilarity`: Token set intersection similarity.
  - `HybridSimilarity`: Weighted combination of string and token matching.
- 🏷️ **Custom Category Support**: Organize knowledge with custom tags and register custom corpus category datasets dynamically.
- 🔄 **Real-Time Dynamic Learning**: Learns dynamically during chat conversations (can be toggled via `/learning` or `readOnly: true`).
- 💻 **Interactive CLI**: Command-line interface with special slash commands (`/commands`, `/chat`, `/learning`, `/score`, `/settings`, `/stats`, `/showdata`, `/train`, `/clear`, `/exit`).
- 🌐 **Web Dashboard UI**: Modern web dashboard with React Fast Refresh HMR, live chat stream, confidence badges, interactive teaching cards, and dataset controls.

---

## ⚡ Quick Start

### 1. Installation

```bash
bun install
```

### 2. Basic Library Usage

```ts
import { ChatBot, ListTrainer, SQLStorageAdapter } from "./src";

// Initialize ChatBot with SQLite storage & node-emoji support
const bot = new ChatBot({
  name: "BunnoBot",
  storageAdapter: new SQLStorageAdapter({ databaseUri: "bunno.sqlite3" }),
  confidenceThreshold: 0.5, // 50% minimum match confidence
  enableEmojis: true,       // Appends random node-emoji to answers (default: true)
});

// Train conversation pairs
const trainer = new ListTrainer(bot);
trainer.train([
  "Hello",
  "Hi there!",
  "How are you?",
  "I am doing well, thank you!",
]);

// Get a response
const response = await bot.getResponse("Hello");
console.log(response.text);       // "Hi there! 🥳"
console.log(response.confidence); // 1.0 (100%)
```

---

## 🎓 Interactive Teaching Mode

### 1. CLI Mode (`bun run cli`)

When the bot encounters an unknown question or when confidence is below `/score`:

```text
You: How to build a rocket?
Bot: I don't know the answer to this query yet. (Confidence: 42.9%)
[Teach Bot] What should I reply to "How to build a rocket?"? (Press Enter to skip): Rockets are built using aerospace engineering and liquid propulsion.
Bot: Thank you! I have learned the answer for "How to build a rocket?". 🚀

You: How to build a rocket?
Bot: Rockets are built using aerospace engineering and liquid propulsion. 🌌 (Confidence: 100.0%)
```

---

## 🕹️ CLI Special Commands

When running `bun run cli`, you can use the following commands:

| Command | Description |
| :--- | :--- |
| `/commands` | Displays the list of available CLI slash commands |
| `/chat` | Switches back to standard conversational chat mode |
| `/learning` | Toggles dynamic real-time learning mode (`on`/`off`) |
| `/score [val]` | View or set minimum similarity threshold score (e.g. `/score 0.8` or `/score 80%`) |
| `/settings` | Displays all current bot configuration settings |
| `/stats` | View SQLite database statement counts and learning status |
| `/showdata` | Renders all statement rows stored in SQLite in a formatted table |
| `/train` | Seeds database with built-in conversational corpora |
| `/clear` | Resets SQLite database back to initial default state |
| `/exit` | Safely closes SQLite connections and exits CLI |

---

## 🧪 Testing

Run the test suite with Bun's native test runner:

```bash
bun test
```

---

## 📁 Architecture Directory Structure

```
bunno/
├── src/
│   ├── index.ts               # Main package exports
│   ├── chatbot.ts             # Core ChatBot class
│   ├── statement.ts           # Statement data model
│   ├── emojis.ts              # node-emoji integration & random selection
│   ├── preprocessors.ts       # Text cleaning functions
│   ├── response_selection.ts  # Response selection strategies
│   ├── storage/
│   │   ├── abstract-adapter.ts# Storage adapter interface
│   │   └── sqlite-adapter.ts  # bun:sqlite database implementation
│   ├── logic/
│   │   ├── best-match.ts      # Fuzzy match logic adapter
│   │   ├── math-eval.ts       # Safe math evaluator
│   │   ├── time-adapter.ts    # Date/time query adapter
│   │   └── specific-response.ts# Predefined rule matcher
│   ├── comparisons/           # Levenshtein, Jaccard, Hybrid metrics
│   ├── trainers/              # ListTrainer & ChatterBotCorpusTrainer
│   └── corpus/data/           # JSON datasets (computers, science, history, geography, health, etc.)
├── cli.ts                     # Terminal CLI interface
├── server.ts                  # Bun HTTP server
├── App.tsx                    # React UI component with HMR
├── frontend.tsx               # Web UI entry point
└── tests/                     # 24 unit tests across 6 files
```
