import { OllamaModelInfo, OllamaStatus, Settings } from '../types/index.js';
import { settingsRepo } from '../db/database.js';

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OllamaService {
  /**
   * Get active Ollama URL from settings or environment
   */
  static getEndpoint(): string {
    const settings = settingsRepo.get();
    return settings.ollama_url || process.env.OLLAMA_HOST || 'http://localhost:11434';
  }

  /**
   * Discover installed models and check connectivity
   */
  static async checkStatus(): Promise<OllamaStatus> {
    const endpoint = this.getEndpoint();
    const settings = settingsRepo.get();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${endpoint}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          connected: false,
          endpoint,
          models: [],
          selectedModel: settings.selected_model,
          secondaryModel: settings.secondary_model,
          error: `Ollama returned HTTP status ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json() as { models?: OllamaModelInfo[] };
      const models = data.models || [];

      // Determine active selected model: if configured model isn't in list but models exist, pick the first
      let activeModel = settings.selected_model;
      if (models.length > 0 && !models.some(m => m.name === activeModel || m.model === activeModel)) {
        activeModel = models[0].name;
      }

      return {
        connected: true,
        endpoint,
        models,
        selectedModel: activeModel,
        secondaryModel: settings.secondary_model,
        error: null,
      };
    } catch (err: any) {
      return {
        connected: false,
        endpoint,
        models: [],
        selectedModel: settings.selected_model,
        secondaryModel: settings.secondary_model,
        error: `Could not connect to Ollama at ${endpoint}. Please ensure Ollama is installed and running (ollama serve). Error: ${err.message}`,
      };
    }
  }

  /**
   * Stream response from Ollama API
   */
  static async streamChat(
    model: string,
    messages: OllamaChatMessage[],
    onChunk: (chunk: string) => void,
    options?: { temperature?: number; language?: 'en' | 'ml' }
  ): Promise<string> {
    const endpoint = this.getEndpoint();
    const settings = settingsRepo.get();
    const temp = options?.temperature ?? settings.temperature ?? 0.2;

    const body = {
      model,
      messages,
      stream: true,
      options: {
        temperature: temp,
        num_ctx: 8192,
      },
    };

    const res = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ollama chat failed with HTTP ${res.status}: ${errText || res.statusText}`);
    }

    if (!res.body) {
      throw new Error('No response body received from Ollama stream.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.message?.content) {
            fullResponse += parsed.message.content;
            onChunk(parsed.message.content);
          }
        } catch {
          // ignore partial json
        }
      }
    }

    // Process leftover buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.message?.content) {
          fullResponse += parsed.message.content;
          onChunk(parsed.message.content);
        }
      } catch {
        // ignore
      }
    }

    return fullResponse;
  }

  /**
   * Non-streaming call to Ollama (for dual model comparison or structured extractions)
   */
  static async completeChat(
    model: string,
    messages: OllamaChatMessage[],
    options?: { temperature?: number }
  ): Promise<string> {
    const endpoint = this.getEndpoint();
    const settings = settingsRepo.get();
    const temp = options?.temperature ?? settings.temperature ?? 0.2;

    const res = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: temp,
          num_ctx: 8192,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ollama chat failed with status ${res.status}: ${errText}`);
    }

    const data = await res.json() as { message?: { content?: string } };
    return data.message?.content || '';
  }
}
