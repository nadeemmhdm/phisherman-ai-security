import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  analysisRepo,
  findingRepo,
  stepRepo,
  headerRepo,
  urlRepo,
  attachmentRepo,
  messageRepo,
  settingsRepo,
  conversationRepo,
} from '../db/database.js';
import { DetectionEngine } from '../services/detectionEngine.js';
import { DualModelService } from '../services/dualModelService.js';
import { OllamaService, OllamaChatMessage } from '../services/ollamaService.js';

export const analysisRouter = Router();

// Start a new email investigation (SSE Stream)
analysisRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const {
      conversationId,
      subject,
      senderEmail,
      emailBody,
      rawHeaders,
      analysisMode,
      selectedModel,
      language,
    } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    if (!subject || !senderEmail || !emailBody) {
      return res.status(400).json({ error: 'Subject, sender email, and email body are required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Create a user message recording the email submission
    const userMsgContent = `**Email Submitted for Investigation**
- **Subject:** ${subject}
- **Sender:** ${senderEmail}
- **Body excerpt:** "${emailBody.substring(0, 100)}${emailBody.length > 100 ? '...' : ''}"`;

    const userMsg = messageRepo.create({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: 'user',
      content: userMsgContent,
      message_type: 'wizard_step',
      metadata: JSON.stringify({ subject, senderEmail }),
    });

    res.write(`data: ${JSON.stringify({ type: 'user_message', message: userMsg })}\n\n`);

    // Run investigation via DetectionEngine
    const { analysis, findings, reportMarkdown } = await DetectionEngine.runInvestigation({
      conversationId,
      subject,
      senderEmail,
      emailBody,
      rawHeaders,
      analysisMode,
      selectedModel,
      language,
      onStepProgress: step => {
        res.write(`data: ${JSON.stringify({ type: 'step_progress', step })}\n\n`);
      },
      onChunk: chunk => {
        res.write(`data: ${JSON.stringify({ type: 'report_chunk', chunk })}\n\n`);
      },
    });

    // Record the analysis report as an assistant message in the conversation
    const reportMsg = messageRepo.create({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      analysis_id: analysis.id,
      role: 'assistant',
      content: reportMarkdown,
      message_type: 'analysis_report',
      metadata: JSON.stringify({
        classification: analysis.classification,
        confidence_level: analysis.confidence_level,
        findingsCount: findings.length,
      }),
    });

    // Send complete analysis and findings payload
    res.write(`data: ${JSON.stringify({
      type: 'analysis_complete',
      analysis,
      findings,
      message: reportMsg,
    })}\n\n`);

    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

// Get full analysis details by ID
analysisRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const analysis = analysisRepo.getById(id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis record not found' });
    }

    const findings = findingRepo.getByAnalysisId(id);
    const steps = stepRepo.getByAnalysisId(id);
    const headers = headerRepo.getByAnalysisId(id);
    const urls = urlRepo.getByAnalysisId(id);
    const attachments = attachmentRepo.getByAnalysisId(id);

    res.json({
      analysis,
      findings,
      steps,
      headers,
      urls,
      attachments,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Follow-up question on an exact analysis (CRITICAL Section 9)
analysisRouter.post('/:id/follow-up', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { question, language, model } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const analysis = analysisRepo.getById(id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const findings = findingRepo.getByAnalysisId(id);
    const headers = headerRepo.getByAnalysisId(id);
    const urls = urlRepo.getByAnalysisId(id);
    const conversation = conversationRepo.getById(analysis.conversation_id);

    const settings = settingsRepo.get();
    const activeModel = model || analysis.selected_model || settings.selected_model;
    const activeLang = language || settings.language || 'en';

    // Save user question
    const userMsg = messageRepo.create({
      id: crypto.randomUUID(),
      conversation_id: analysis.conversation_id,
      analysis_id: analysis.id,
      role: 'user',
      content: question,
      message_type: 'follow_up',
    });

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'user_message', message: userMsg })}\n\n`);

    // Retrieve recent conversation messages for this analysis
    const prevMessages = messageRepo.getByAnalysisId(id);
    const recentContext = prevMessages.slice(-6);

    const systemPrompt = `You are a Lead Email Security & Phishing Defense Specialist reviewing an ongoing investigation.
You are conversing with the user about this SPECIFIC email investigation.

CRITICAL INVESTIGATION CONTEXT:
- Email Subject: "${analysis.subject}"
- Sender Address: "${analysis.sender_email}"
- Overall Classification: ${analysis.classification}
- Confidence: ${analysis.confidence_level}
- Forensic Findings:
${findings.map((f, i) => `  ${i + 1}. [${f.title}] Evidence: "${f.evidence}". Explanation: ${f.explanation}`).join('\n')}
- Extracted URLs (${urls.length}):
${urls.map(u => `  - ${u.original_url} (${u.hostname})`).join('\n')}

GUIDELINES:
1. Ground your answers strictly in the factual context of this investigation.
2. If asked "Why did you classify it as phishing?", explain the specific domain, URL, or social engineering evidence.
3. If asked "Is this link safe?", explain the observed risk indicators while noting that full destination sandbox detonation has not been conducted.
4. If asked to explain in simple language or Malayalam, adapt your language accordingly.
5. If the user asks for defensive recommendations or next steps, provide clear, step-by-step guidance.
6. Maintain the friendly, thoughtful, professional persona inspired by Claude AI.`;

    const ollamaMessages: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentContext.map(m => ({
        role: (m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user') as 'system' | 'assistant' | 'user',
        content: m.content,
      })),
      { role: 'user', content: question },
    ];

    let accumulatedAnswer = '';
    const assistantMsgId = crypto.randomUUID();

    try {
      await OllamaService.streamChat(
        activeModel,
        ollamaMessages,
        chunk => {
          accumulatedAnswer += chunk;
          res.write(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`);
        },
        { language: activeLang }
      );

      const assistantMsg = messageRepo.create({
        id: assistantMsgId,
        conversation_id: analysis.conversation_id,
        analysis_id: analysis.id,
        role: 'assistant',
        content: accumulatedAnswer,
        message_type: 'follow_up',
      });

      res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`);
      res.end();
    } catch (ollamaErr: any) {
      const fallback = `I could not communicate with the local model (${activeModel}): ${ollamaErr.message}.
Based on the investigation records:
- Classification: **${analysis.classification}**
- Key evidence flagged: ${findings.map(f => f.title).join(', ') || 'No critical flags'}
Recommendation: Please ensure Ollama is running to continue in-depth AI conversation.`;

      const assistantMsg = messageRepo.create({
        id: assistantMsgId,
        conversation_id: analysis.conversation_id,
        analysis_id: analysis.id,
        role: 'assistant',
        content: fallback,
        message_type: 'error',
      });

      res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: fallback })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`);
      res.end();
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

// Reanalyse with deep mode or another model
analysisRouter.post('/:id/reanalyse', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { analysisMode, model, language } = req.body;

    const existing = analysisRepo.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Original analysis not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const { analysis, findings, reportMarkdown } = await DetectionEngine.runInvestigation({
      conversationId: existing.conversation_id,
      subject: existing.subject,
      senderEmail: existing.sender_email,
      emailBody: existing.email_body,
      analysisMode: analysisMode || 'deep',
      selectedModel: model || existing.selected_model,
      language,
      onStepProgress: step => {
        res.write(`data: ${JSON.stringify({ type: 'step_progress', step })}\n\n`);
      },
      onChunk: chunk => {
        res.write(`data: ${JSON.stringify({ type: 'report_chunk', chunk })}\n\n`);
      },
    });

    const reportMsg = messageRepo.create({
      id: crypto.randomUUID(),
      conversation_id: existing.conversation_id,
      analysis_id: analysis.id,
      role: 'assistant',
      content: `### Re-Analysis Result (${analysis.analysis_mode.toUpperCase()} MODE)\n\n${reportMarkdown}`,
      message_type: 'analysis_report',
    });

    res.write(`data: ${JSON.stringify({
      type: 'analysis_complete',
      analysis,
      findings,
      message: reportMsg,
    })}\n\n`);

    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

// Dual-model cross-validation comparison (Section 16)
analysisRouter.post('/:id/compare', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { secondaryModel } = req.body;

    const analysis = analysisRepo.getById(id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const findings = findingRepo.getByAnalysisId(id);
    const settings = settingsRepo.get();
    const targetSecondary = secondaryModel || settings.secondary_model;

    const comparison = await DualModelService.compareModels(analysis, findings, targetSecondary);

    // Save as message in conversation
    const compMsg = messageRepo.create({
      id: crypto.randomUUID(),
      conversation_id: analysis.conversation_id,
      analysis_id: analysis.id,
      role: 'assistant',
      content: comparison.comparisonSummary,
      message_type: 'chat',
      metadata: JSON.stringify(comparison),
    });

    res.json({ comparison, message: compMsg });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
