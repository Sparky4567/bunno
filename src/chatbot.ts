import { Statement } from "./statement";
import { StorageAdapter, SQLStorageAdapter } from "./storage";
import { LogicAdapter, BestMatch, MathematicalEvaluation, TimeLogicAdapter, ProcessResult } from "./logic";
import { PreprocessorFunction, defaultPreprocessors } from "./preprocessors";
import { appendRandomEmoji } from "./emojis";

export interface ChatBotOptions {
  name?: string;
  storageAdapter?: StorageAdapter;
  databaseUri?: string;
  logicAdapters?: LogicAdapter[];
  preprocessors?: PreprocessorFunction[];
  readOnly?: boolean;
  confidenceThreshold?: number;
  defaultResponse?: string;
  enableEmojis?: boolean;
}

export class ChatBot {
  public name: string;
  public storage: StorageAdapter;
  public logicAdapters: LogicAdapter[];
  public preprocessors: PreprocessorFunction[];
  public readOnly: boolean;
  public confidenceThreshold: number;
  public defaultResponse: string;
  public enableEmojis: boolean;

  constructor(options: ChatBotOptions = {}) {
    this.name = options.name || "Bunno";
    this.databaseUri = options.databaseUri || "bunno.sqlite3";
    this.storage = options.storageAdapter || new SQLStorageAdapter({ databaseUri: this.databaseUri });
    this.readOnly = options.readOnly ?? false;
    this.confidenceThreshold = options.confidenceThreshold ?? 0.5;
    this.defaultResponse = options.defaultResponse || "I'm sorry, I do not know the answer to this one.";
    this.enableEmojis = options.enableEmojis ?? true;
    this.preprocessors = options.preprocessors || [...defaultPreprocessors];

    // Initialize logic adapters
    const defaultAdapters: LogicAdapter[] = [
      new MathematicalEvaluation(),
      new TimeLogicAdapter(),
      new BestMatch({ defaultResponse: this.defaultResponse }),
    ];

    this.logicAdapters = options.logicAdapters || defaultAdapters;

    // Attach storage adapter to logic adapters
    for (const adapter of this.logicAdapters) {
      adapter.setStorage(this.storage);
    }
  }

  public databaseUri: string;

  public async getResponse(input: string | Statement): Promise<Statement> {
    let inputStatement = typeof input === "string" ? new Statement({ text: input }) : input;

    // Apply preprocessors
    for (const preprocessor of this.preprocessors) {
      inputStatement = preprocessor(inputStatement);
    }

    let maxConfidence = -1;
    let selectedResult: ProcessResult | null = null;
    let selectingAdapterName = "";

    // Evaluate input across all logic adapters
    for (const adapter of this.logicAdapters) {
      if (adapter.canProcess(inputStatement)) {
        try {
          const result = await adapter.process(inputStatement);
          if (result.confidence > maxConfidence) {
            maxConfidence = result.confidence;
            selectedResult = result;
            selectingAdapterName = adapter.constructor.name;
          }
        } catch (err) {
          console.error(`Error processing adapter ${adapter.constructor.name}:`, err);
        }
      }
    }

    let finalResponse: Statement;

    if (!selectedResult || maxConfidence < this.confidenceThreshold) {
      finalResponse = new Statement({
        text: this.defaultResponse,
        in_response_to: inputStatement.text,
        confidence: maxConfidence > 0 ? maxConfidence : 0,
      });
    } else {
      finalResponse = new Statement({
        id: selectedResult.response.id,
        text: selectedResult.response.text,
        in_response_to: inputStatement.text,
        confidence: maxConfidence,
        occurrence_count: selectedResult.response.occurrence_count,
        tags: selectedResult.response.tags,
      });
    }

    // Dynamic Learning: save user statement and clean response if readOnly is false
    if (!this.readOnly && inputStatement.text.trim()) {
      this.learnResponse(inputStatement, finalResponse);
    }

    // Append random emoji if emojis are enabled
    if (this.enableEmojis) {
      finalResponse.text = appendRandomEmoji(finalResponse.text);
    }

    return finalResponse;
  }

  public learnResponse(inputStatement: Statement, responseStatement: Statement): void {
    // Store user input statement
    this.storage.create(inputStatement);

    // Ensure response statement links to user input as in_response_to
    if (responseStatement.text !== this.defaultResponse) {
      responseStatement.in_response_to = inputStatement.text;
      this.storage.create(responseStatement);
    }
  }

  public close(): void {
    if (this.storage) {
      this.storage.close();
    }
  }
}
