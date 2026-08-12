import { Statement } from "../statement";
import { LogicAdapter, ProcessResult } from "./abstract-adapter";

export interface SpecificResponseOptions {
  inputText: string;
  outputText: string;
}

export class SpecificResponse extends LogicAdapter {
  public inputText: string;
  public outputText: string;

  constructor(options: SpecificResponseOptions) {
    super();
    this.inputText = options.inputText;
    this.outputText = options.outputText;
  }

  public canProcess(statement: Statement): boolean {
    return Statement.normalize(statement.text) === Statement.normalize(this.inputText);
  }

  public async process(statement: Statement, options?: any): Promise<ProcessResult> {
    if (this.canProcess(statement)) {
      return {
        confidence: 1.0,
        response: new Statement({
          text: this.outputText,
          in_response_to: statement.text,
          confidence: 1.0,
        }),
      };
    }

    return {
      confidence: 0,
      response: new Statement({ text: "" }),
    };
  }
}
