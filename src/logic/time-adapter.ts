import { Statement } from "../statement";
import { LogicAdapter, ProcessResult } from "./abstract-adapter";

export class TimeLogicAdapter extends LogicAdapter {
  private timePatterns: RegExp[] = [
    /what\s+time\s+is\s+it/i,
    /do\s+you\s+have\s+the\s+time/i,
    /tell\s+me\s+the\s+time/i,
    /what\s+is\s+today'?s?\s+date/i,
    /what\s+is\s+the\s+date/i,
    /what\s+day\s+is\s+it/i,
  ];

  public canProcess(statement: Statement): boolean {
    const text = statement.text.toLowerCase();
    return this.timePatterns.some((pattern) => pattern.test(text));
  }

  public async process(statement: Statement, options?: any): Promise<ProcessResult> {
    const text = statement.text.toLowerCase();
    const now = new Date();

    if (!this.canProcess(statement)) {
      return {
        confidence: 0,
        response: new Statement({ text: "" }),
      };
    }

    let responseText = "";

    if (/date/i.test(text)) {
      responseText = `Today's date is ${now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}.`;
    } else if (/day/i.test(text) && !/time/i.test(text)) {
      responseText = `Today is ${now.toLocaleDateString("en-US", { weekday: "long" })}.`;
    } else {
      responseText = `The current time is ${now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}.`;
    }

    return {
      confidence: 1.0,
      response: new Statement({
        text: responseText,
        in_response_to: statement.text,
        confidence: 1.0,
      }),
    };
  }
}
