import { test, expect, describe } from "bun:test";
import { Statement } from "../src/statement";

describe("Statement", () => {
  test("creates statement from string", () => {
    const s = new Statement("Hello World!");
    expect(s.text).toBe("Hello World!");
    expect(s.search_text).toBe("hello world");
    expect(s.conversation).toBe("default");
    expect(s.occurrence_count).toBe(1);
  });

  test("normalizes text correctly", () => {
    expect(Statement.normalize("  Hello,  WORLD!  ")).toBe("hello world");
  });

  test("adds tags without duplicates", () => {
    const s = new Statement("Test");
    s.addTags("greeting", "test", "greeting");
    expect(s.tags).toEqual(["greeting", "test"]);
  });

  test("serializes statement correctly", () => {
    const s = new Statement({ text: "Hi", conversation: "chat1", tags: ["tag1"] });
    const json = s.serialize();
    expect(json.text).toBe("Hi");
    expect(json.conversation).toBe("chat1");
    expect(json.tags).toEqual(["tag1"]);
  });
});
