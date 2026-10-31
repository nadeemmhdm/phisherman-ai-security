import { Router, Request, Response } from 'express';
import { settingsRepo, db } from '../db/database.js';

export const settingsRouter = Router();

// Get settings
settingsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const settings = settingsRepo.get();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
settingsRouter.put('/', (req: Request, res: Response) => {
  try {
    const updated = settingsRepo.update(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Database backup as JSON
settingsRouter.get('/backup', (_req: Request, res: Response) => {
  try {
    const conversations = db.prepare('SELECT * FROM conversations').all();
    const messages = db.prepare('SELECT * FROM messages').all();
    const analyses = db.prepare('SELECT * FROM email_analyses').all();
    const findings = db.prepare('SELECT * FROM suspicious_findings').all();
    const steps = db.prepare('SELECT * FROM investigation_steps').all();
    const headers = db.prepare('SELECT * FROM email_headers').all();
    const urls = db.prepare('SELECT * FROM extracted_urls').all();
    const attachments = db.prepare('SELECT * FROM attachments').all();
    const settings = settingsRepo.get();

    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      conversations,
      messages,
      analyses,
      findings,
      steps,
      headers,
      urls,
      attachments,
      settings,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="phisherman-backup-${Date.now()}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Database restore from JSON
settingsRouter.post('/restore', (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data || !data.version) {
      return res.status(400).json({ error: 'Invalid backup file structure' });
    }

    const restoreTx = db.transaction(() => {
      // Clear current data
      db.prepare('DELETE FROM attachments').run();
      db.prepare('DELETE FROM extracted_urls').run();
      db.prepare('DELETE FROM email_headers').run();
      db.prepare('DELETE FROM investigation_steps').run();
      db.prepare('DELETE FROM suspicious_findings').run();
      db.prepare('DELETE FROM messages').run();
      db.prepare('DELETE FROM email_analyses').run();
      db.prepare('DELETE FROM conversations').run();

      // Restore conversations
      if (Array.isArray(data.conversations)) {
        const stmt = db.prepare('INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)');
        for (const c of data.conversations) {
          stmt.run(c.id, c.title, c.created_at, c.updated_at);
        }
      }

      // Restore analyses
      if (Array.isArray(data.analyses)) {
        const stmt = db.prepare(`
          INSERT INTO email_analyses (id, conversation_id, subject, sender_email, email_body, classification, confidence_level, analysis_mode, selected_model, secondary_model, analysis_result, summary, risk_score, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const a of data.analyses) {
          stmt.run(a.id, a.conversation_id, a.subject, a.sender_email, a.email_body, a.classification, a.confidence_level, a.analysis_mode, a.selected_model, a.secondary_model, a.analysis_result, a.summary, a.risk_score, a.created_at);
        }
      }

      // Restore messages
      if (Array.isArray(data.messages)) {
        const stmt = db.prepare('INSERT INTO messages (id, conversation_id, analysis_id, role, content, message_type, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const m of data.messages) {
          stmt.run(m.id, m.conversation_id, m.analysis_id, m.role, m.content, m.message_type, m.metadata, m.created_at);
        }
      }

      // Restore findings
      if (Array.isArray(data.findings)) {
        const stmt = db.prepare('INSERT INTO suspicious_findings (id, analysis_id, finding_type, title, evidence, explanation, recommendation, verification_status, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const f of data.findings) {
          stmt.run(f.id, f.analysis_id, f.finding_type, f.title, f.evidence, f.explanation, f.recommendation, f.verification_status, f.severity);
        }
      }

      // Restore settings
      if (data.settings) {
        settingsRepo.update(data.settings);
      }
    });

    restoreTx();
    res.json({ success: true, message: 'Database successfully restored from backup' });
  } catch (err: any) {
    res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
});
