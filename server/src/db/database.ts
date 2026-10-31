import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  Conversation,
  Message,
  EmailAnalysis,
  SuspiciousFinding,
  InvestigationStep,
  EmailHeader,
  ExtractedUrl,
  AttachmentMetadata,
  Settings,
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'phisherman.db');

let sqlJsDb: SqlJsDatabase | null = null;

let inTransaction = false;

// Save SQLite database to disk
export function persistDatabase() {
  if (!sqlJsDb || inTransaction) return;
  try {
    const data = sqlJsDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err: any) {
    console.error('Error persisting database:', err.message);
  }
}

// Minimal better-sqlite3-like API wrapper over sql.js
class StatementWrapper {
  private sql: string;
  constructor(sql: string) {
    this.sql = sql;
  }

  run(...params: any[]): { changes: number } {
    if (!sqlJsDb) throw new Error('Database not initialized');
    sqlJsDb.run(this.sql, params);
    if (!inTransaction) persistDatabase();
    return { changes: 1 };
  }

  get(...params: any[]): any {
    if (!sqlJsDb) throw new Error('Database not initialized');
    const stmt = sqlJsDb.prepare(this.sql);
    stmt.bind(params);
    let row: any = undefined;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }

  all(...params: any[]): any[] {
    if (!sqlJsDb) throw new Error('Database not initialized');
    const stmt = sqlJsDb.prepare(this.sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }
}

export const db = {
  prepare: (sql: string) => new StatementWrapper(sql),
  exec: (sql: string) => {
    if (!sqlJsDb) throw new Error('Database not initialized');
    sqlJsDb.exec(sql);
    if (!inTransaction) persistDatabase();
  },
  transaction: (fn: (...args: any[]) => void) => {
    return (...args: any[]) => {
      if (!sqlJsDb) throw new Error('Database not initialized');
      inTransaction = true;
      sqlJsDb.run('BEGIN TRANSACTION;');
      try {
        fn(...args);
        sqlJsDb.run('COMMIT;');
      } catch (e) {
        sqlJsDb.run('ROLLBACK;');
        throw e;
      } finally {
        inTransaction = false;
        persistDatabase();
      }
    };
  },
  export: () => {
    if (!sqlJsDb) throw new Error('Database not initialized');
    return sqlJsDb.export();
  }
};

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_analyses (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  email_body TEXT NOT NULL,
  classification TEXT NOT NULL,
  confidence_level TEXT NOT NULL,
  analysis_mode TEXT NOT NULL DEFAULT 'quick',
  selected_model TEXT NOT NULL,
  secondary_model TEXT,
  analysis_result TEXT NOT NULL,
  summary TEXT,
  risk_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  analysis_id TEXT,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat',
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (analysis_id) REFERENCES email_analyses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS suspicious_findings (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  finding_type TEXT NOT NULL,
  title TEXT NOT NULL,
  evidence TEXT NOT NULL,
  explanation TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  severity TEXT DEFAULT 'medium',
  FOREIGN KEY (analysis_id) REFERENCES email_analyses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS investigation_steps (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES email_analyses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_headers (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  header_name TEXT NOT NULL,
  header_value TEXT NOT NULL,
  FOREIGN KEY (analysis_id) REFERENCES email_analyses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS extracted_urls (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  hostname TEXT NOT NULL,
  inspection_result TEXT NOT NULL,
  FOREIGN KEY (analysis_id) REFERENCES email_analyses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  risk_flags TEXT,
  FOREIGN KEY (analysis_id) REFERENCES email_analyses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  selected_model TEXT NOT NULL DEFAULT 'llama3:latest',
  secondary_model TEXT NOT NULL DEFAULT 'mistral:latest',
  language TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'dark',
  temperature REAL NOT NULL DEFAULT 0.2,
  analysis_mode TEXT NOT NULL DEFAULT 'quick',
  ollama_url TEXT NOT NULL DEFAULT 'http://localhost:11434',
  custom_system_prompt TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_analysis ON messages(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analyses_conversation ON email_analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_findings_analysis ON suspicious_findings(analysis_id);
CREATE INDEX IF NOT EXISTS idx_steps_analysis ON investigation_steps(analysis_id);
CREATE INDEX IF NOT EXISTS idx_headers_analysis ON email_headers(analysis_id);
CREATE INDEX IF NOT EXISTS idx_urls_analysis ON extracted_urls(analysis_id);
CREATE INDEX IF NOT EXISTS idx_attachments_analysis ON attachments(analysis_id);
`;

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      sqlJsDb = new SQL.Database(fileBuffer);
    } catch {
      sqlJsDb = new SQL.Database();
    }
  } else {
    sqlJsDb = new SQL.Database();
  }

  sqlJsDb.exec(SCHEMA_SQL);

  // Initialize default settings if not exists
  const existingSettings = db.prepare('SELECT id FROM settings WHERE id = ?').get('default');
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO settings (id, selected_model, secondary_model, language, theme, temperature, analysis_mode, ollama_url, custom_system_prompt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'default',
      'llama3:latest',
      'mistral:latest',
      'en',
      'dark',
      0.2,
      'quick',
      'http://localhost:11434',
      ''
    );
  }
}

// Conversation operations
export const conversationRepo = {
  create: (id: string, title: string): Conversation => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(id, title, now, now);
    return conversationRepo.getById(id)!;
  },

  getById: (id: string): Conversation | undefined => {
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation | undefined;
  },

  getAll: (searchQuery?: string): Conversation[] => {
    if (searchQuery && searchQuery.trim()) {
      return db.prepare(`
        SELECT DISTINCT c.* FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.title LIKE ? OR m.content LIKE ?
        ORDER BY c.updated_at DESC
      `).all(`%${searchQuery}%`, `%${searchQuery}%`) as Conversation[];
    }
    return db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all() as Conversation[];
  },

  updateTitle: (id: string, title: string): void => {
    db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(title, new Date().toISOString(), id);
  },

  touch: (id: string): void => {
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
  },

  delete: (id: string): boolean => {
    const info = db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    return info.changes > 0;
  },
};

// Message operations
export const messageRepo = {
  create: (msg: Omit<Message, 'created_at'>): Message => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, analysis_id, role, content, message_type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.id,
      msg.conversation_id,
      msg.analysis_id || null,
      msg.role,
      msg.content,
      msg.message_type,
      msg.metadata || null,
      now
    );
    conversationRepo.touch(msg.conversation_id);
    return messageRepo.getById(msg.id)!;
  },

  getById: (id: string): Message | undefined => {
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message | undefined;
  },

  getByConversation: (conversationId: string): Message[] => {
    return db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId) as Message[];
  },

  getByAnalysisId: (analysisId: string): Message[] => {
    return db.prepare('SELECT * FROM messages WHERE analysis_id = ? ORDER BY created_at ASC').all(analysisId) as Message[];
  },

  delete: (id: string): boolean => {
    const info = db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    return info.changes > 0;
  },
};

// Analysis operations
export const analysisRepo = {
  create: (analysis: Omit<EmailAnalysis, 'created_at'>): EmailAnalysis => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO email_analyses (
        id, conversation_id, subject, sender_email, email_body,
        classification, confidence_level, analysis_mode, selected_model,
        secondary_model, analysis_result, summary, risk_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      analysis.id,
      analysis.conversation_id,
      analysis.subject,
      analysis.sender_email,
      analysis.email_body,
      analysis.classification,
      analysis.confidence_level,
      analysis.analysis_mode,
      analysis.selected_model,
      analysis.secondary_model || null,
      analysis.analysis_result,
      analysis.summary || null,
      analysis.risk_score || null,
      now
    );
    conversationRepo.touch(analysis.conversation_id);
    return analysisRepo.getById(analysis.id)!;
  },

  getById: (id: string): EmailAnalysis | undefined => {
    return db.prepare('SELECT * FROM email_analyses WHERE id = ?').get(id) as EmailAnalysis | undefined;
  },

  getByConversation: (conversationId: string): EmailAnalysis[] => {
    return db.prepare('SELECT * FROM email_analyses WHERE conversation_id = ? ORDER BY created_at DESC').all(conversationId) as EmailAnalysis[];
  },

  getLatestByConversation: (conversationId: string): EmailAnalysis | undefined => {
    return db.prepare('SELECT * FROM email_analyses WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1').get(conversationId) as EmailAnalysis | undefined;
  },

  updateResult: (id: string, result: string, classification?: string, confidence?: string): void => {
    if (classification && confidence) {
      db.prepare(`
        UPDATE email_analyses
        SET analysis_result = ?, classification = ?, confidence_level = ?
        WHERE id = ?
      `).run(result, classification, confidence, id);
    } else {
      db.prepare('UPDATE email_analyses SET analysis_result = ? WHERE id = ?').run(result, id);
    }
  },

  delete: (id: string): boolean => {
    const info = db.prepare('DELETE FROM email_analyses WHERE id = ?').run(id);
    return info.changes > 0;
  },
};

// Findings operations
export const findingRepo = {
  createMany: (findings: SuspiciousFinding[]): void => {
    const insertTransaction = db.transaction((items: SuspiciousFinding[]) => {
      for (const item of items) {
        db.prepare(`
          INSERT INTO suspicious_findings (
            id, analysis_id, finding_type, title, evidence,
            explanation, recommendation, verification_status, severity
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.id,
          item.analysis_id,
          item.finding_type,
          item.title,
          item.evidence,
          item.explanation,
          item.recommendation,
          item.verification_status,
          item.severity || 'medium'
        );
      }
    });

    insertTransaction(findings);
  },

  getByAnalysisId: (analysisId: string): SuspiciousFinding[] => {
    return db.prepare('SELECT * FROM suspicious_findings WHERE analysis_id = ?').all(analysisId) as SuspiciousFinding[];
  },

  getById: (id: string): SuspiciousFinding | undefined => {
    return db.prepare('SELECT * FROM suspicious_findings WHERE id = ?').get(id) as SuspiciousFinding | undefined;
  },
};

// Investigation Steps operations
export const stepRepo = {
  create: (step: InvestigationStep): void => {
    db.prepare(`
      INSERT INTO investigation_steps (id, analysis_id, step_name, status, result, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(step.id, step.analysis_id, step.step_name, step.status, step.result || null, new Date().toISOString());
  },

  updateStatus: (id: string, status: InvestigationStep['status'], result?: string): void => {
    db.prepare('UPDATE investigation_steps SET status = ?, result = ? WHERE id = ?').run(status, result || null, id);
  },

  getByAnalysisId: (analysisId: string): InvestigationStep[] => {
    return db.prepare('SELECT * FROM investigation_steps WHERE analysis_id = ? ORDER BY created_at ASC').all(analysisId) as InvestigationStep[];
  },
};

// Email Header operations
export const headerRepo = {
  createMany: (headers: EmailHeader[]): void => {
    const insertTransaction = db.transaction((items: EmailHeader[]) => {
      for (const item of items) {
        db.prepare(`
          INSERT INTO email_headers (id, analysis_id, header_name, header_value)
          VALUES (?, ?, ?, ?)
        `).run(item.id, item.analysis_id, item.header_name, item.header_value);
      }
    });

    insertTransaction(headers);
  },

  getByAnalysisId: (analysisId: string): EmailHeader[] => {
    return db.prepare('SELECT * FROM email_headers WHERE analysis_id = ?').all(analysisId) as EmailHeader[];
  },
};

// Extracted URLs operations
export const urlRepo = {
  createMany: (urls: ExtractedUrl[]): void => {
    const insertTransaction = db.transaction((items: ExtractedUrl[]) => {
      for (const item of items) {
        db.prepare(`
          INSERT INTO extracted_urls (id, analysis_id, original_url, hostname, inspection_result)
          VALUES (?, ?, ?, ?, ?)
        `).run(item.id, item.analysis_id, item.original_url, item.hostname, item.inspection_result);
      }
    });

    insertTransaction(urls);
  },

  getByAnalysisId: (analysisId: string): ExtractedUrl[] => {
    return db.prepare('SELECT * FROM extracted_urls WHERE analysis_id = ?').all(analysisId) as ExtractedUrl[];
  },
};

// Attachments operations
export const attachmentRepo = {
  createMany: (attachments: AttachmentMetadata[]): void => {
    const insertTransaction = db.transaction((items: AttachmentMetadata[]) => {
      for (const item of items) {
        db.prepare(`
          INSERT INTO attachments (id, analysis_id, filename, mime_type, file_size, sha256, risk_flags)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.id,
          item.analysis_id,
          item.filename,
          item.mime_type,
          item.file_size,
          item.sha256,
          item.risk_flags || null
        );
      }
    });

    insertTransaction(attachments);
  },

  getByAnalysisId: (analysisId: string): AttachmentMetadata[] => {
    return db.prepare('SELECT * FROM attachments WHERE analysis_id = ?').all(analysisId) as AttachmentMetadata[];
  },
};

// Settings operations
export const settingsRepo = {
  get: (): Settings => {
    const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('default') as Settings | undefined;
    if (!row) {
      return {
        id: 'default',
        selected_model: 'llama3:latest',
        secondary_model: 'mistral:latest',
        language: 'en',
        theme: 'dark',
        temperature: 0.2,
        analysis_mode: 'quick',
        ollama_url: 'http://localhost:11434',
        custom_system_prompt: '',
      };
    }
    return row;
  },

  update: (updates: Partial<Settings>): Settings => {
    const current = settingsRepo.get();
    const merged = { ...current, ...updates };
    db.prepare(`
      UPDATE settings
      SET selected_model = ?, secondary_model = ?, language = ?, theme = ?,
          temperature = ?, analysis_mode = ?, ollama_url = ?, custom_system_prompt = ?
      WHERE id = 'default'
    `).run(
      merged.selected_model,
      merged.secondary_model,
      merged.language,
      merged.theme,
      merged.temperature,
      merged.analysis_mode,
      merged.ollama_url,
      merged.custom_system_prompt
    );
    return settingsRepo.get();
  },
};
