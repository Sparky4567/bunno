import { Database } from "bun:sqlite";
import { Statement } from "../statement";
import { StorageAdapter, FilterCriteria } from "./abstract-adapter";

export interface SQLStorageAdapterOptions {
  databaseUri?: string; // path or ':memory:'
}

export class SQLStorageAdapter extends StorageAdapter {
  private db: Database;
  public databaseUri: string;

  constructor(options: SQLStorageAdapterOptions = {}) {
    super();
    this.databaseUri = options.databaseUri || "db.sqlite3";
    this.db = new Database(this.databaseUri);
    this.initialize();
  }

  private initialize(): void {
    // Enable WAL mode for high performance
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS statements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT UNIQUE NOT NULL,
        search_text TEXT NOT NULL,
        conversation TEXT DEFAULT 'default',
        in_response_to TEXT,
        created_at TEXT NOT NULL,
        occurrence_count INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS statement_tags (
        statement_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (statement_id, tag_id),
        FOREIGN KEY (statement_id) REFERENCES statements(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_statements_text ON statements(text);
      CREATE INDEX IF NOT EXISTS idx_statements_search_text ON statements(search_text);
      CREATE INDEX IF NOT EXISTS idx_statements_in_response_to ON statements(in_response_to);
      CREATE INDEX IF NOT EXISTS idx_statements_conversation ON statements(conversation);
    `);
  }

  public count(): number {
    const query = this.db.prepare("SELECT COUNT(*) as cnt FROM statements");
    const result = query.get() as { cnt: number } | null;
    return result ? result.cnt : 0;
  }

  public find(text: string): Statement | null {
    const query = this.db.prepare("SELECT * FROM statements WHERE text = ?");
    const row = query.get(text) as any;
    if (!row) return null;
    return this.rowToStatement(row);
  }

  public filter(criteria: FilterCriteria): Statement[] {
    let sql = "SELECT DISTINCT s.* FROM statements s";
    const conditions: string[] = [];
    const params: any[] = [];

    if (criteria.tags && criteria.tags.length > 0) {
      sql += " JOIN statement_tags st ON s.id = st.statement_id JOIN tags t ON st.tag_id = t.id";
      const placeholders = criteria.tags.map(() => "?").join(",");
      conditions.push(`t.name IN (${placeholders})`);
      params.push(...criteria.tags);
    }

    if (criteria.text !== undefined) {
      conditions.push("s.text = ?");
      params.push(criteria.text);
    }

    if (criteria.search_text !== undefined) {
      conditions.push("s.search_text = ?");
      params.push(criteria.search_text);
    }

    if (criteria.in_response_to !== undefined) {
      if (criteria.in_response_to === null) {
        conditions.push("s.in_response_to IS NULL");
      } else {
        conditions.push("s.in_response_to = ?");
        params.push(criteria.in_response_to);
      }
    }

    if (criteria.conversation !== undefined) {
      conditions.push("s.conversation = ?");
      params.push(criteria.conversation);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY s.id DESC";

    if (criteria.limit && criteria.limit > 0) {
      sql += " LIMIT ?";
      params.push(criteria.limit);
    }

    const query = this.db.prepare(sql);
    const rows = query.all(...params) as any[];

    return rows.map((row) => this.rowToStatement(row));
  }

  public create(statement: Statement): Statement {
    const existing = this.find(statement.text);
    if (existing) {
      // Update existing statement occurrence count & tags if needed
      existing.occurrence_count += 1;
      if (statement.in_response_to) {
        existing.in_response_to = statement.in_response_to;
      }
      if (statement.tags.length > 0) {
        statement.tags.forEach((t) => existing.addTags(t));
      }
      return this.update(existing);
    }

    const insertStmt = this.db.prepare(`
      INSERT INTO statements (text, search_text, conversation, in_response_to, created_at, occurrence_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      statement.text,
      statement.search_text || Statement.normalize(statement.text),
      statement.conversation || "default",
      statement.in_response_to ?? null,
      statement.created_at || new Date().toISOString(),
      statement.occurrence_count || 1
    );

    statement.id = result.lastInsertRowid as number;
    this.saveTags(statement.id, statement.tags);
    return statement;
  }

  public createMany(statements: Statement[]): Statement[] {
    const transaction = this.db.transaction((items: Statement[]) => {
      return items.map((item) => this.create(item));
    });
    return transaction(statements);
  }

  public update(statement: Statement): Statement {
    if (!statement.id && statement.text) {
      const existing = this.find(statement.text);
      if (existing) statement.id = existing.id;
    }

    if (!statement.id) {
      return this.create(statement);
    }

    const updateStmt = this.db.prepare(`
      UPDATE statements
      SET search_text = ?, conversation = ?, in_response_to = ?, occurrence_count = ?
      WHERE id = ?
    `);

    updateStmt.run(
      statement.search_text || Statement.normalize(statement.text),
      statement.conversation || "default",
      statement.in_response_to ?? null,
      statement.occurrence_count || 1,
      statement.id
    );

    this.saveTags(statement.id, statement.tags);
    return statement;
  }

  public remove(text: string): boolean {
    const query = this.db.prepare("DELETE FROM statements WHERE text = ?");
    const result = query.run(text);
    return result.changes > 0;
  }

  public getRandom(): Statement | null {
    const query = this.db.prepare("SELECT * FROM statements ORDER BY RANDOM() LIMIT 1");
    const row = query.get() as any;
    if (!row) return null;
    return this.rowToStatement(row);
  }

  public drop(): void {
    this.db.exec("DELETE FROM statement_tags;");
    this.db.exec("DELETE FROM tags;");
    this.db.exec("DELETE FROM statements;");
  }

  public close(): void {
    this.db.close();
  }

  private saveTags(statementId: number | string, tags: string[]): void {
    if (!tags || tags.length === 0) return;

    const tagInsert = this.db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
    const getTag = this.db.prepare("SELECT id FROM tags WHERE name = ?");
    const linkInsert = this.db.prepare(
      "INSERT OR IGNORE INTO statement_tags (statement_id, tag_id) VALUES (?, ?)"
    );

    for (const tagName of tags) {
      tagInsert.run(tagName);
      const tagRow = getTag.get(tagName) as { id: number } | null;
      if (tagRow) {
        linkInsert.run(statementId, tagRow.id);
      }
    }
  }

  private getTagsForStatement(statementId: number | string): string[] {
    const query = this.db.prepare(`
      SELECT t.name FROM tags t
      JOIN statement_tags st ON t.id = st.tag_id
      WHERE st.statement_id = ?
    `);
    const rows = query.all(statementId) as { name: string }[];
    return rows.map((r) => r.name);
  }

  private rowToStatement(row: any): Statement {
    const tags = this.getTagsForStatement(row.id);
    return new Statement({
      id: row.id,
      text: row.text,
      search_text: row.search_text,
      conversation: row.conversation,
      in_response_to: row.in_response_to,
      created_at: row.created_at,
      occurrence_count: row.occurrence_count,
      tags,
    });
  }
}
