import { Statement } from "../statement";
import { StorageAdapter } from "../storage";
import { LogicAdapter, ProcessResult } from "./abstract-adapter";
import { ComparisonFunction, LevenshteinDistance } from "../comparisons";
import { ResponseSelectionMethod, getFirstResponse } from "../response_selection";

export interface BestMatchOptions {
  storage?: StorageAdapter;
  statementComparisonFunction?: ComparisonFunction;
  responseSelectionMethod?: ResponseSelectionMethod;
  defaultResponse?: string;
}

export class BestMatch extends LogicAdapter {
  public statementComparisonFunction: ComparisonFunction;
  public responseSelectionMethod: ResponseSelectionMethod;
  public defaultResponse: string;

  constructor(options: BestMatchOptions = {}) {
    super(options);
    this.statementComparisonFunction = options.statementComparisonFunction || LevenshteinDistance;
    this.responseSelectionMethod = options.responseSelectionMethod || getFirstResponse;
    this.defaultResponse = options.defaultResponse || "I'm sorry, I do not know the answer to this one.";
  }

  public async process(inputStatement: Statement, options?: any): Promise<ProcessResult> {
    if (!this.storage) {
      return {
        confidence: 0,
        response: new Statement({ text: this.defaultResponse }),
      };
    }

    const allStatements = this.storage.filter({});
    if (allStatements.length === 0) {
      return {
        confidence: 0,
        response: new Statement({ text: this.defaultResponse }),
      };
    }

    let closestMatch: Statement | null = null;
    let maxSimilarity = -1;

    for (const statement of allStatements) {
      const similarity = this.statementComparisonFunction(inputStatement, statement);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        closestMatch = statement;
      }
    }

    if (!closestMatch || maxSimilarity <= 0) {
      return {
        confidence: 0,
        response: new Statement({ text: this.defaultResponse }),
      };
    }

    // Find responses that are linked to this matched statement
    const responseCandidates = this.storage.filter({
      in_response_to: closestMatch.text,
    });

    let selectedResponse: Statement;

    if (responseCandidates.length > 0) {
      selectedResponse = this.responseSelectionMethod(responseCandidates);
    } else {
      // If no explicit in_response_to exists for closestMatch, use closestMatch itself or random existing
      selectedResponse = closestMatch;
    }

    const responseStatement = new Statement({
      text: selectedResponse.text,
      in_response_to: inputStatement.text,
      confidence: maxSimilarity,
    });

    return {
      confidence: maxSimilarity,
      response: responseStatement,
    };
  }
}
