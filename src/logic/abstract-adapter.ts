import { Statement } from "../statement";
import { StorageAdapter } from "../storage";

export interface ProcessResult {
  confidence: number;
  response: Statement;
}

export abstract class LogicAdapter {
  protected storage?: StorageAdapter;

  constructor(options?: { storage?: StorageAdapter }) {
    this.storage = options?.storage;
  }

  public setStorage(storage: StorageAdapter): void {
    this.storage = storage;
  }

  public canProcess(statement: Statement): boolean {
    return true;
  }

  public abstract process(statement: Statement, options?: any): Promise<ProcessResult>;
}
