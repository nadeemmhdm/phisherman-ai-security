import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Paperclip,
  Square,
  Globe,
  UploadCloud,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const ChatInput: React.FC = () => {
  const {
    sendMessage,
    isStreaming,
    startEmailCollection,
    activeAnalysis,
    sendFollowUp,
    settings,
    updateAppSettings,
  } = useChat();

  const [input, setInput] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (activeAnalysis) {
      await sendFollowUp(text);
    } else {
      await sendMessage(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleLanguage = () => {
    const next = settings?.language === 'en' ? 'ml' : 'en';
    updateAppSettings({ language: next });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2 shrink-0">
      <div className="relative rounded-2xl bg-card border border-border/80 shadow-lg focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all backdrop-blur-xl">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeAnalysis
              ? "Ask a follow-up question about this email investigation (e.g., 'Why is it phishing?', 'Explain in simple terms')..."
              : "Ask a cybersecurity question or click 'Analyse Email' to investigate suspicious messages..."
          }
          className="w-full px-4 pt-3.5 pb-11 rounded-2xl bg-transparent resize-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
        />

        {/* Bottom Toolbar inside the input card */}
        <div className="absolute left-3 bottom-2.5 right-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => startEmailCollection('quick')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-[11px] transition-colors"
              title="Start Structured Email Analysis"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyse Email</span>
            </button>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary text-[11px] transition-colors"
              title="Toggle English / Malayalam output"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{settings?.language === 'ml' ? 'Malayalam (മലയാളം)' : 'English'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline mr-1">
              Press Enter to send, Shift+Enter for new line
            </span>

            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isStreaming}
              className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-95 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
              title="Send Message"
            >
              {isStreaming ? (
                <Square className="w-3.5 h-3.5 fill-current animate-pulse" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-[10px] text-muted-foreground/60">
        PhisherMan is grounded locally in Ollama AI. Always verify sender identity independently before taking action.
      </div>
    </div>
  );
};
