import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { ChatBot } from "../src/chatbot";
import { ListTrainer } from "../src/trainers/list-trainer";
import { ChatterBotCorpusTrainer, CorpusData } from "../src/trainers/corpus-trainer";
import { SQLStorageAdapter } from "../src/storage/sqlite-adapter";

describe("Custom Categories Training", () => {
  let bot: ChatBot;

  beforeEach(() => {
    bot = new ChatBot({
      name: "CategoryBot",
      storageAdapter: new SQLStorageAdapter({ databaseUri: ":memory:" }),
    });
  });

  afterEach(() => {
    bot.close();
  });

  test("ListTrainer trains custom tags/categories", () => {
    const trainer = new ListTrainer(bot);
    trainer.train(["What is rugby?", "Rugby is a team sport."], ["sports", "rugby"]);

    const statement = bot.storage.find("Rugby is a team sport.");
    expect(statement).not.toBeNull();
    expect(statement?.tags).toContain("sports");
    expect(statement?.tags).toContain("rugby");
  });

  test("ChatterBotCorpusTrainer registers and trains custom category object", () => {
    const trainer = new ChatterBotCorpusTrainer(bot);

    const sportsCategory: CorpusData = {
      categories: ["sports", "football"],
      conversations: [
        ["Who won the Super Bowl?", "The championship team won!"],
      ],
    };

    trainer.registerCorpus("sports", sportsCategory);
    trainer.train("sports");

    const answer = bot.storage.find("The championship team won!");
    expect(answer).not.toBeNull();
    expect(answer?.tags).toEqual(["sports", "football"]);
  });
});
