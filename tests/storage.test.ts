import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { SQLStorageAdapter } from "../src/storage/sqlite-adapter";
import { Statement } from "../src/statement";

describe("SQLStorageAdapter", () => {
  let storage: SQLStorageAdapter;

  beforeEach(() => {
    storage = new SQLStorageAdapter({ databaseUri: ":memory:" });
  });

  afterEach(() => {
    storage.close();
  });

  test("creates and retrieves statement", () => {
    const statement = new Statement({ text: "Hello", in_response_to: "Hi" });
    const created = storage.create(statement);
    expect(created.id).toBeDefined();

    const found = storage.find("Hello");
    expect(found).not.toBeNull();
    expect(found?.text).toBe("Hello");
    expect(found?.in_response_to).toBe("Hi");
  });

  test("increments occurrence_count on duplicate create", () => {
    const s1 = new Statement("Repeat test");
    storage.create(s1);
    const s2 = storage.create(new Statement("Repeat test"));

    expect(s2.occurrence_count).toBe(2);
    expect(storage.count()).toBe(1);
  });

  test("filters statements by in_response_to", () => {
    storage.create(new Statement({ text: "Hi", in_response_to: null }));
    storage.create(new Statement({ text: "Hello there!", in_response_to: "Hi" }));
    storage.create(new Statement({ text: "Hey friend!", in_response_to: "Hi" }));

    const responses = storage.filter({ in_response_to: "Hi" });
    expect(responses.length).toBe(2);
    expect(responses.map((r) => r.text)).toContain("Hello there!");
  });

  test("handles tags properly", () => {
    const s = new Statement({ text: "Tagged statement", tags: ["test", "demo"] });
    storage.create(s);

    const found = storage.find("Tagged statement");
    expect(found?.tags.sort()).toEqual(["demo", "test"]);

    const taggedFilter = storage.filter({ tags: ["demo"] });
    expect(taggedFilter.length).toBe(1);
  });
});
