import { test, expect, describe } from "bun:test";
import { MathematicalEvaluation } from "../src/logic/math-eval";
import { TimeLogicAdapter } from "../src/logic/time-adapter";
import { SpecificResponse } from "../src/logic/specific-response";
import { Statement } from "../src/statement";

describe("Logic Adapters", () => {
  test("MathematicalEvaluation solves basic equations", async () => {
    const adapter = new MathematicalEvaluation();
    const statement = new Statement("What is 25 * 4?");

    expect(adapter.canProcess(statement)).toBe(true);
    const result = await adapter.process(statement);
    expect(result.confidence).toBe(1.0);
    expect(result.response.text).toBe("25 * 4 = 100");
  });

  test("MathematicalEvaluation handles sqrt and parentheses", async () => {
    const adapter = new MathematicalEvaluation();
    const statement = new Statement("calculate (10 + 2) * sqrt(16)");

    const result = await adapter.process(statement);
    expect(result.confidence).toBe(1.0);
    expect(result.response.text).toBe("(10 + 2) * sqrt(16) = 48");
  });

  test("TimeLogicAdapter responds to time queries", async () => {
    const adapter = new TimeLogicAdapter();
    const statement = new Statement("What time is it?");

    expect(adapter.canProcess(statement)).toBe(true);
    const result = await adapter.process(statement);
    expect(result.confidence).toBe(1.0);
    expect(result.response.text).toContain("current time is");
  });

  test("SpecificResponse matches designated input", async () => {
    const adapter = new SpecificResponse({
      inputText: "Secret command",
      outputText: "Access granted",
    });

    const match = new Statement("Secret command");
    const result = await adapter.process(match);
    expect(result.confidence).toBe(1.0);
    expect(result.response.text).toBe("Access granted");

    const nonMatch = new Statement("Random input");
    const result2 = await adapter.process(nonMatch);
    expect(result2.confidence).toBe(0);
  });
});
