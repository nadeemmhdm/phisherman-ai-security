import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { conversationRepo, messageRepo, settingsRepo, analysisRepo } from '../db/database.js';
import { OllamaService, OllamaChatMessage } from '../services/ollamaService.js';

export const chatRouter = Router();

// List all conversations
chatRouter.get('/conversations', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string | undefined;
    const conversations = conversationRepo.getAll(query);
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new conversation
chatRouter.post('/conversations', (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const id = crypto.randomUUID();
    const newConv = conversationRepo.create(id, title || 'New Security Conversation');
    res.status(201).json(newConv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get conversation with messages
chatRouter.get('/conversations/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const conversation = conversationRepo.getById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const messages = messageRepo.getByConversation(id);
    const analyses = analysisRepo.getByConversation(id);
    res.json({ conversation, messages, analyses });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rename conversation
chatRouter.patch('/conversations/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    conversationRepo.updateTitle(id, title.trim());
    res.json({ success: true, id, title: title.trim() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete conversation
chatRouter.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const deleted = conversationRepo.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Normal Chat / Stream message via SSE
chatRouter.post('/stream', async (req: Request, res: Response) => {
  try {
    const { conversationId, content, model, language } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ error: 'conversationId and content are required' });
    }

    let conv = conversationRepo.getById(conversationId);
    if (!conv) {
      conv = conversationRepo.create(conversationId, content.substring(0, 35) + '...');
    } else if (conv.title === 'New Security Conversation') {
      // Auto-update title to reflect first user query
      conversationRepo.updateTitle(conversationId, content.substring(0, 35) + '...');
    }

    // Save user message
    const userMsgId = crypto.randomUUID();
    const userMsg = messageRepo.create({
      id: userMsgId,
      conversation_id: conversationId,
      role: 'user',
      content,
      message_type: 'chat',
    });

    const settings = settingsRepo.get();
    const activeModel = model || settings.selected_model;
    const activeLang = language || settings.language || 'en';

    // Retrieve recent conversation history for context (up to last 10 messages)
    const history = messageRepo.getByConversation(conversationId);
    const recentMessages = history.slice(-10);

    const systemPrompt = `You are a certified Lead Email Security & Phishing Defense Assistant named PhisherMan.
You specialize in email threats, phishing detection, cybersecurity best practices, header analysis, malware payloads, social engineering vectors, and defensive protocols.
Maintain a helpful, concise, authoritative, and professional tone (inspired by Claude AI).
${settings.custom_system_prompt ? `Additional instructions: ${settings.custom_system_prompt}` : ''}
${activeLang === 'ml' ? 'Respond in natural Malayalam while maintaining technical security clarity.' : ''}`;

    const ollamaMessages: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map(m => ({
        role: (m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user') as 'system' | 'assistant' | 'user',
        content: m.content,
      })),
    ];

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial user message event
    res.write(`data: ${JSON.stringify({ type: 'user_message', message: userMsg })}\n\n`);

    const assistantMsgId = crypto.randomUUID();
    let accumulatedContent = '';

    try {
      await OllamaService.streamChat(
        activeModel,
        ollamaMessages,
        chunk => {
          accumulatedContent += chunk;
          res.write(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`);
        },
        { language: activeLang }
      );

      // Persist assistant message
      const assistantMsg = messageRepo.create({
        id: assistantMsgId,
        conversation_id: conversationId,
        role: 'assistant',
        content: accumulatedContent,
        message_type: 'chat',
      });

      res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`);
      res.end();
    } catch (streamErr: any) {
      // Fallback message if Ollama is unreachable
      const fallbackMsg = `I was unable to connect to the local Ollama service (${activeModel}).
Error: ${streamErr.message}

Please make sure Ollama is running locally:
\`\`\`bash
ollama serve
\`\`\`
And verify you have installed a model such as \`ollama run llama3\` or \`ollama run mistral\`.`;

      accumulatedContent = fallbackMsg;
      res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: fallbackMsg })}\n\n`);

      const assistantMsg = messageRepo.create({
        id: assistantMsgId,
        conversation_id: conversationId,
        role: 'assistant',
        content: fallbackMsg,
        message_type: 'error',
      });

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
