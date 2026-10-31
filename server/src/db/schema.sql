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
