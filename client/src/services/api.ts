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
  OllamaStatus,
  AnalysisMode,
} from '../types';

const API_BASE = '/api';

export const api = {
  // Conversations
  getConversations: async (searchQuery?: string): Promise<Conversation[]> => {
    const url = searchQuery ? `${API_BASE}/conversations?q=${encodeURIComponent(searchQuery)}` : `${API_BASE}/conversations`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  createConversation: async (title?: string): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  },

  getConversation: async (id: string): Promise<{ conversation: Conversation; messages: Message[]; analyses: EmailAnalysis[] }> => {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
  },

  renameConversation: async (id: string, title: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to rename conversation');
  },

  deleteConversation: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
  },

  // Ollama
  getOllamaStatus: async (): Promise<OllamaStatus> => {
    const res = await fetch(`${API_BASE}/ollama/status`);
    if (!res.ok) throw new Error('Failed to fetch Ollama status');
    return res.json();
  },

  selectModel: async (model: string, isSecondary = false): Promise<void> => {
    const res = await fetch(`${API_BASE}/ollama/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, isSecondary }),
    });
    if (!res.ok) throw new Error('Failed to select model');
  },

  // Settings
  getSettings: async (): Promise<Settings> => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  updateSettings: async (settings: Partial<Settings>): Promise<Settings> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  restoreBackup: async (backupJson: any): Promise<void> => {
    const res = await fetch(`${API_BASE}/settings/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupJson),
    });
    if (!res.ok) throw new Error('Failed to restore backup');
  },

  // EML & Forensics
  uploadEml: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/email/parse-eml`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to parse .eml file');
    return res.json();
  },

  parseHeaders: async (rawHeaders: string, senderEmail?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/email/headers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawHeaders, senderEmail }),
    });
    if (!res.ok) throw new Error('Failed to inspect headers');
    return res.json();
  },

  inspectUrls: async (text: string, html?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/email/urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, html }),
    });
    if (!res.ok) throw new Error('Failed to inspect URLs');
    return res.json();
  },

  // Analysis
  getAnalysis: async (id: string): Promise<{
    analysis: EmailAnalysis;
    findings: SuspiciousFinding[];
    steps: InvestigationStep[];
    headers: EmailHeader[];
    urls: ExtractedUrl[];
    attachments: AttachmentMetadata[];
  }> => {
    const res = await fetch(`${API_BASE}/analyses/${id}`);
    if (!res.ok) throw new Error('Failed to fetch analysis');
    return res.json();
  },

  compareModels: async (analysisId: string, secondaryModel?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/analyses/${analysisId}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secondaryModel }),
    });
    if (!res.ok) throw new Error('Failed to run model comparison');
    return res.json();
  },

  // Streaming SSE Chat
  streamChat: async (
    conversationId: string,
    content: string,
    callbacks: {
      onUserMessage?: (msg: Message) => void;
      onChunk: (chunk: string) => void;
      onDone: (msg: Message) => void;
      onError: (err: string) => void;
    },
    options?: { model?: string; language?: 'en' | 'ml' }
  ): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content,
          model: options?.model,
          language: options?.language,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      if (!res.body) throw new Error('No SSE stream body received');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (!rawData) continue;
            try {
              const parsed = JSON.parse(rawData);
              if (parsed.type === 'user_message' && callbacks.onUserMessage) {
                callbacks.onUserMessage(parsed.message);
              } else if (parsed.type === 'chunk') {
                callbacks.onChunk(parsed.chunk);
              } else if (parsed.type === 'done') {
                callbacks.onDone(parsed.message);
              } else if (parsed.type === 'error') {
                callbacks.onError(parsed.error);
              }
            } catch {
              // skip partial json
            }
          }
        }
      }
    } catch (err: any) {
      callbacks.onError(err.message);
    }
  },

  // Streaming SSE Investigation
  streamInvestigation: async (
    params: {
      conversationId: string;
      subject: string;
      senderEmail: string;
      emailBody: string;
      rawHeaders?: string;
      analysisMode?: AnalysisMode;
      selectedModel?: string;
      language?: 'en' | 'ml';
    },
    callbacks: {
      onUserMessage?: (msg: Message) => void;
      onStepProgress: (step: InvestigationStep) => void;
      onReportChunk: (chunk: string) => void;
      onComplete: (data: { analysis: EmailAnalysis; findings: SuspiciousFinding[]; message: Message }) => void;
      onError: (err: string) => void;
    }
  ): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/analyses/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      if (!res.body) throw new Error('No SSE stream body received');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (!rawData) continue;
            try {
              const parsed = JSON.parse(rawData);
              if (parsed.type === 'user_message' && callbacks.onUserMessage) {
                callbacks.onUserMessage(parsed.message);
              } else if (parsed.type === 'step_progress') {
                callbacks.onStepProgress(parsed.step);
              } else if (parsed.type === 'report_chunk') {
                callbacks.onReportChunk(parsed.chunk);
              } else if (parsed.type === 'analysis_complete') {
                callbacks.onComplete(parsed);
              } else if (parsed.type === 'error') {
                callbacks.onError(parsed.error);
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err: any) {
      callbacks.onError(err.message);
    }
  },

  // Streaming SSE Follow-up (Section 9)
  streamFollowUp: async (
    analysisId: string,
    question: string,
    callbacks: {
      onUserMessage?: (msg: Message) => void;
      onChunk: (chunk: string) => void;
      onDone: (msg: Message) => void;
      onError: (err: string) => void;
    },
    options?: { model?: string; language?: 'en' | 'ml' }
  ): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/analyses/${analysisId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          model: options?.model,
          language: options?.language,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      if (!res.body) throw new Error('No SSE stream body received');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (!rawData) continue;
            try {
              const parsed = JSON.parse(rawData);
              if (parsed.type === 'user_message' && callbacks.onUserMessage) {
                callbacks.onUserMessage(parsed.message);
              } else if (parsed.type === 'chunk') {
                callbacks.onChunk(parsed.chunk);
              } else if (parsed.type === 'done') {
                callbacks.onDone(parsed.message);
              } else if (parsed.type === 'error') {
                callbacks.onError(parsed.error);
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err: any) {
      callbacks.onError(err.message);
    }
  },

  // Re-analyse
  streamReanalyse: async (
    analysisId: string,
    params: { analysisMode?: AnalysisMode; model?: string; language?: 'en' | 'ml' },
    callbacks: {
      onStepProgress: (step: InvestigationStep) => void;
      onReportChunk: (chunk: string) => void;
      onComplete: (data: { analysis: EmailAnalysis; findings: SuspiciousFinding[]; message: Message }) => void;
      onError: (err: string) => void;
    }
  ): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/analyses/${analysisId}/reanalyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      if (!res.body) throw new Error('No SSE stream body received');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (!rawData) continue;
            try {
              const parsed = JSON.parse(rawData);
              if (parsed.type === 'step_progress') {
                callbacks.onStepProgress(parsed.step);
              } else if (parsed.type === 'report_chunk') {
                callbacks.onReportChunk(parsed.chunk);
              } else if (parsed.type === 'analysis_complete') {
                callbacks.onComplete(parsed);
              } else if (parsed.type === 'error') {
                callbacks.onError(parsed.error);
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err: any) {
      callbacks.onError(err.message);
    }
  },
};
