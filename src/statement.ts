export interface StatementOptions {
  id?: number | string;
  text: string;
  search_text?: string;
  conversation?: string;
  in_response_to?: string | null;
  created_at?: string;
  tags?: string[];
  confidence?: number;
  occurrence_count?: number;
}

export class Statement {
  public id?: number | string;
  public text: string;
  public search_text: string;
  public conversation: string;
  public in_response_to: string | null;
  public created_at: string;
  public tags: string[];
  public confidence: number;
  public occurrence_count: number;

  constructor(options: StatementOptions | string) {
    if (typeof options === "string") {
      this.text = options;
      this.search_text = Statement.normalize(options);
      this.conversation = "default";
      this.in_response_to = null;
      this.created_at = new Date().toISOString();
      this.tags = [];
      this.confidence = 0.0;
      this.occurrence_count = 1;
    } else {
      this.id = options.id;
      this.text = options.text;
      this.search_text = options.search_text || Statement.normalize(options.text);
      this.conversation = options.conversation || "default";
      this.in_response_to = options.in_response_to ?? null;
      this.created_at = options.created_at || new Date().toISOString();
      this.tags = options.tags ? [...options.tags] : [];
      this.confidence = options.confidence ?? 0.0;
      this.occurrence_count = options.occurrence_count ?? 1;
    }
  }

  public static normalize(text: string): string {
    if (!text) return "";
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, " ");
  }

  public addExtraData(key: string, value: any): void {
    (this as any)[key] = value;
  }

  public addTags(...tags: string[]): void {
    for (const tag of tags) {
      if (!this.tags.includes(tag)) {
        this.tags.push(tag);
      }
    }
  }

  public serialize() {
    return {
      id: this.id,
      text: this.text,
      search_text: this.search_text,
      conversation: this.conversation,
      in_response_to: this.in_response_to,
      created_at: this.created_at,
      tags: this.tags,
      confidence: this.confidence,
      occurrence_count: this.occurrence_count,
    };
  }
}
