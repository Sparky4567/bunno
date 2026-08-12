import { Statement } from "../statement";
import { LogicAdapter, ProcessResult } from "./abstract-adapter";

export class MathematicalEvaluation extends LogicAdapter {
  private mathPatterns: RegExp[] = [
    /(?:what\s+is|calculate|evaluate|compute|solve)?\s*([0-9\.\s\+\-\*\/\%\^\(\)\bsqrt\b\babs\b\bsin\b\bcos\b\btan\b\bpi\b]+)/i,
  ];

  public canProcess(statement: Statement): boolean {
    return this.extractExpression(statement.text) !== null;
  }

  public async process(statement: Statement, options?: any): Promise<ProcessResult> {
    const expr = this.extractExpression(statement.text);
    if (!expr) {
      return {
        confidence: 0,
        response: new Statement({ text: "Unable to parse math expression." }),
      };
    }

    try {
      const result = this.safeEvaluate(expr);
      if (result === null || isNaN(result) || !isFinite(result)) {
        return {
          confidence: 0,
          response: new Statement({ text: "Unable to evaluate math expression." }),
        };
      }

      // Format result nicely
      const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, "");
      const responseText = `${expr.trim()} = ${formattedResult}`;

      return {
        confidence: 1.0,
        response: new Statement({
          text: responseText,
          in_response_to: statement.text,
          confidence: 1.0,
        }),
      };
    } catch {
      return {
        confidence: 0,
        response: new Statement({ text: "Error evaluating expression." }),
      };
    }
  }

  private extractExpression(text: string): string | null {
    const clean = text.toLowerCase().trim();

    // Check common math trigger words or plain equations
    const match = clean.match(/(?:what\s+is|calculate|eval|compute|how\s+much\s+is)?\s*([0-9\.\s\+\-\*\/\%\^\(\)]+(?:\s*(?:sqrt|abs|sin|cos|tan)\([0-9\.]+\))?)/i);

    if (!match || !match[1]) return null;

    let expr = match[1].trim();
    // Must contain at least one digit and one mathematical operator
    if (!/\d/.test(expr) || !/[\+\-\*\/\%\^\(\)]|sqrt|abs|sin|cos|tan/.test(expr)) {
      return null;
    }

    return expr;
  }

  private safeEvaluate(expr: string): number | null {
    // Replace constants & functions
    let sanitize = expr
      .replace(/\bpi\b/gi, Math.PI.toString())
      .replace(/\be\b/gi, Math.E.toString())
      .replace(/\bsqrt\(([^)]+)\)/gi, (_, arg) => `Math.sqrt(${arg})`)
      .replace(/\babs\(([^)]+)\)/gi, (_, arg) => `Math.abs(${arg})`)
      .replace(/\bsin\(([^)]+)\)/gi, (_, arg) => `Math.sin(${arg})`)
      .replace(/\bcos\(([^)]+)\)/gi, (_, arg) => `Math.cos(${arg})`)
      .replace(/\btan\(([^)]+)\)/gi, (_, arg) => `Math.tan(${arg})`)
      .replace(/\^/g, "**");

    // Strictly validate allowed characters: numbers, spaces, operators +, -, *, /, %, **, (, ), Math.func
    if (!/^[0-9\.\s\+\-\*\/\%\(\)Math\.sqrtabsincotan]+$/.test(sanitize)) {
      return null;
    }

    // Function constructor safer than direct eval
    const fn = new Function(`"use strict"; return (${sanitize});`);
    const val = fn();
    return typeof val === "number" ? val : null;
  }
}
