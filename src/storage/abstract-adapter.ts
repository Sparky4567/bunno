import { Statement } from "../statement";

export interface FilterCriteria {
  text?: string;
  search_text?: string;
  in_response_to?: string | null;
  conversation?: string;
  tags?: string[];
  limit?: number;
}

export abstract class StorageAdapter {
  public abstract count(): number;
  public abstract find(text: string): Statement | null;
  public abstract filter(criteria: FilterCriteria): Statement[];
  public abstract create(statement: Statement): Statement;
  public abstract createMany(statements: Statement[]): Statement[];
  public abstract update(statement: Statement): Statement;
  public abstract remove(text: string): boolean;
  public abstract getRandom(): Statement | null;
  public abstract drop(): void;
  public abstract close(): void;
}
