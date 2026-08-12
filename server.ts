import index from "./index.html";
import { ChatBot } from "./src/chatbot";
import { SQLStorageAdapter } from "./src/storage/sqlite-adapter";
import { ChatterBotCorpusTrainer } from "./src/trainers/corpus-trainer";
import { ListTrainer } from "./src/trainers/list-trainer";
import { Statement } from "./src/statement";

const storage = new SQLStorageAdapter({ databaseUri: "bunno_web.sqlite3" });
const bot = new ChatBot({
  name: "Bunno JS",
  storageAdapter: storage,
  confidenceThreshold: 0.5,
  readOnly: false,
});

// Auto-seed if empty
if (storage.count() === 0) {
  console.log("🌱 Auto-seeding initial dataset...");
  const trainer = new ChatterBotCorpusTrainer(bot);
  trainer.train("bunno.corpus.english");
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  routes: {
    "/": index,
    "/api/chat": {
      POST: async (req) => {
        try {
          const body = await req.json();
          const userMessage = body.message || "";
          if (!userMessage.trim()) {
            return Response.json({ error: "Message cannot be empty" }, { status: 400 });
          }

          const response = await bot.getResponse(userMessage);
          const needsTeaching = response.text === bot.defaultResponse;

          return Response.json({
            response: response.text,
            confidence: response.confidence,
            inResponseTo: response.in_response_to,
            dbCount: storage.count(),
            needsTeaching,
            queryToTeach: needsTeaching ? userMessage : undefined,
          });
        } catch (err: any) {
          return Response.json({ error: err.message || "Failed to process chat" }, { status: 500 });
        }
      },
    },
    "/api/teach": {
      POST: async (req) => {
        try {
          const body = await req.json();
          const { query, answer } = body;
          if (!query || !answer || !query.trim() || !answer.trim()) {
            return Response.json({ error: "Both query and answer are required" }, { status: 400 });
          }

          const userPrompt = new Statement({ text: query });
          const taughtAnswer = new Statement({ text: answer, in_response_to: query });
          bot.learnResponse(userPrompt, taughtAnswer);

          return Response.json({
            success: true,
            dbCount: storage.count(),
            message: `Thank you! Learned answer for "${query}".`,
          });
        } catch (err: any) {
          return Response.json({ error: err.message || "Failed to teach bot" }, { status: 500 });
        }
      },
    },
    "/api/stats": {
      GET: async () => {
        return Response.json({
          count: storage.count(),
          botName: bot.name,
          readOnly: bot.readOnly,
          confidenceThreshold: bot.confidenceThreshold,
          adapters: bot.logicAdapters.map((a) => a.constructor.name),
        });
      },
    },
    "/api/train": {
      POST: async (req) => {
        try {
          const body = await req.json();
          if (body.corpus) {
            const trainer = new ChatterBotCorpusTrainer(bot);
            trainer.train(body.corpus);
          } else if (body.conversation && Array.isArray(body.conversation)) {
            const trainer = new ListTrainer(bot);
            trainer.train(body.conversation);
          }
          return Response.json({ success: true, count: storage.count() });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
    "/api/clear": {
      POST: async () => {
        storage.drop();
        const trainer = new ChatterBotCorpusTrainer(bot);
        trainer.train("bunno.corpus.english");
        return Response.json({ success: true, count: storage.count() });
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Bunno JS Web Server running at http://localhost:${server.port}`);
