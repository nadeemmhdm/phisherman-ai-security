import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { EmailCollectionWizard } from './components/EmailCollectionWizard';
import { EvidenceInspectorModal } from './components/EvidenceInspectorModal';
import { UrlInspectorModal } from './components/UrlInspectorModal';
import { HeaderInspectorModal } from './components/HeaderInspectorModal';
import { DualModelComparisonModal } from './components/DualModelComparisonModal';
import { SettingsModal } from './components/SettingsModal';
import { useChat } from './context/ChatContext';
import { Loader2, Sparkles, Shield, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

const LOADING_STAGES = [
  'Connecting to local Ollama AI model...',
  'Extracting sender identity and checking domain forensics...',
  'Auditing SPF, DKIM, and DMARC authentication headers...',
  'Inspecting embedded URLs for brand impersonation & IP redirects...',
  'Correlating social engineering vectors & urgency indicators...',
  'Synthesizing authoritative forensic investigation dossier...',
];

export const App: React.FC = () => {
  const {
    messages,
    wizardActive,
    isStreaming,
    isAnalyzing,
    currentStreamChunk,
    sidebarOpen,
    setSidebarOpen,
    ollamaStatus,
  } = useChat();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabledRef = useRef<boolean>(true);
  const [loadingStageIndex, setLoadingStageIndex] = useState<number>(0);
  const [showStreamingContent, setShowStreamingContent] = useState<boolean>(true);

  // Cycle animated loading messages while streaming
  useEffect(() => {
    let interval: any;
    if (isStreaming || isAnalyzing) {
      setLoadingStageIndex(0);
      interval = setInterval(() => {
        setLoadingStageIndex(prev => (prev + 1) % LOADING_STAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isStreaming, isAnalyzing]);

  // Handle user scrolling to avoid scroll-jumping conflicts
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Enable auto-scroll only if user is within 120px of bottom
    isAutoScrollEnabledRef.current = distanceToBottom < 120;
  }, []);

  // Safe autoscroll without fighting the user or glitching to top
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el || !isAutoScrollEnabledRef.current) return;

    // Use direct instant scrollTop assignment to eliminate browser smooth-scroll jump bugs
    el.scrollTop = el.scrollHeight;
  }, [messages, currentStreamChunk, isStreaming, wizardActive]);

  // Force scroll on new user message submission
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el && messages.length > 0 && messages[messages.length - 1].role === 'user') {
      isAutoScrollEnabledRef.current = true;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Mobile Backdrop for sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar (Desktop fixed / Mobile drawer) */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-30 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative">
        <Header />

        {/* Chat / Content scroll area */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col"
        >
          {/* If collection wizard is active */}
          {wizardActive ? (
            <EmailCollectionWizard />
          ) : messages.length === 0 ? (
            /* Welcome screen when empty */
            <WelcomeScreen />
          ) : (
            /* Stream of conversation messages */
            <div className="flex-1 max-w-4xl w-full mx-auto space-y-2">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id || idx}
                  message={msg}
                  isLatestAssistant={
                    msg.role === 'assistant' &&
                    idx === messages.map(m => m.role).lastIndexOf('assistant')
                  }
                />
              ))}

              {/* Animated Loading & Streaming Assistant Bubble */}
              {(isStreaming || isAnalyzing) && (
                <div className="w-full py-3 flex gap-3 sm:gap-4 justify-start animate-in fade-in duration-200">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-primary flex items-center justify-center text-white shrink-0 shadow-xs mt-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>

                  <div className="max-w-2xl sm:max-w-3xl flex-1 rounded-2xl rounded-tl-xs px-4 py-3.5 bg-card border border-border/60 text-xs sm:text-sm leading-relaxed shadow-sm space-y-2">
                    {/* Dynamic Animated Status Header */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        <span className="font-semibold text-foreground">
                          {LOADING_STAGES[loadingStageIndex]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary">
                          {ollamaStatus?.selectedModel || 'llama3'}
                        </span>
                        {currentStreamChunk && (
                          <button
                            onClick={() => setShowStreamingContent(prev => !prev)}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                            title={showStreamingContent ? 'Hide stream' : 'View stream'}
                          >
                            {showStreamingContent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Streamed Tokens or Thinking Animation */}
                    {currentStreamChunk && showStreamingContent ? (
                      <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-foreground prose-claude pt-1">
                        {currentStreamChunk}
                      </div>
                    ) : !currentStreamChunk ? (
                      <div className="py-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Evaluating email evidence and generating reasoning...</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="h-4" />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <ChatInput />
      </div>

      {/* Global Modals */}
      <EvidenceInspectorModal />
      <UrlInspectorModal />
      <HeaderInspectorModal />
      <DualModelComparisonModal />
      <SettingsModal />
    </div>
  );
};
export default App;
