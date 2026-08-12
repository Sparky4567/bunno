import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { ChatBot } from "../src/chatbot";
import { ListTrainer } from "../src/trainers/list-trainer";
import { ChatterBotCorpusTrainer } from "../src/trainers/corpus-trainer";
import { SQLStorageAdapter } from "../src/storage/sqlite-adapter";

describe("ChatBot End-to-End", () => {
  let bot: ChatBot;

  beforeEach(() => {
    bot = new ChatBot({
      name: "TestBot",
      storageAdapter: new SQLStorageAdapter({ databaseUri: ":memory:" }),
      confidenceThreshold: 0.5,
      enableEmojis: false, // Disable emojis for exact string comparison in unit tests
    });
  });

  afterEach(() => {
    bot.close();
  });

  test("ListTrainer trains bot and responds to conversation flow", async () => {
    const trainer = new ListTrainer(bot);
    trainer.train(["Good morning!", "Morning! How can I help you?", "I need a coffee."]);

    const response = await bot.getResponse("Good morning!");
    expect(response.confidence).toBeGreaterThan(0.5);
    expect(response.text).toBe("Morning! How can I help you?");
  });

  test("ChatterBotCorpusTrainer trains standard corpora", async () => {
    const trainer = new ChatterBotCorpusTrainer(bot);
    trainer.train("greetings");

    const response = await bot.getResponse("How are you?");
    expect(response.confidence).toBeGreaterThan(0.5);
    expect(response.text).toContain("doing well");
  });

  test("Evaluates math queries with high confidence", async () => {
    const response = await bot.getResponse("What is 50 + 50?");
    expect(response.confidence).toBe(1.0);
    expect(response.text).toBe("50 + 50 = 100");
  });

  test("Learns dynamic user responses when readOnly is false", async () => {
    await bot.getResponse("Sky color?");
    // Bot learns user query "Sky color?"
    expect(bot.storage.find("Sky color?")).not.toBeNull();
  });

  test("Filters low-confidence matches when similarity threshold is high", async () => {
    const trainer = new ListTrainer(bot);
    trainer.train(["Hello", "Hi there!"]);

    // Set strict threshold
    bot.confidenceThreshold = 0.95;

    // Partial fuzzy match with similarity below 0.95
    const response = await bot.getResponse("Hello my good friend");
    expect(response.text).toBe(bot.defaultResponse);
  });

  test("Appends random node-emoji when enableEmojis is true", async () => {
    bot.enableEmojis = true;
    const response = await bot.getResponse("What is 5 + 5?");
    expect(response.text).toContain("5 + 5 = 10");
    // Verify emoji appended (length longer than base answer)
    expect(response.text.length).toBeGreaterThan("5 + 5 = 10".length);
  });
});
