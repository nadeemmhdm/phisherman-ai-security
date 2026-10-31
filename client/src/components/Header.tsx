import React from 'react';
import {
  Menu,
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  FileText,
  Sparkles,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const Header: React.FC = () => {
  const {
    activeConversation,
    sidebarOpen,
    setSidebarOpen,
    ollamaStatus,
    startEmailCollection,
    setIsUrlModalOpen,
    setIsHeaderModalOpen,
    setIsSettingsModalOpen,
    activeAnalysis,
  } = useChat();

  return (
    <header className="h-14 border-b border-border/40 bg-card/40 backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Open Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-sm tracking-tight text-foreground truncate max-w-xs sm:max-w-md">
            {activeConversation?.title || 'PhisherMan Security Assistant'}
          </h1>
          {activeAnalysis && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                activeAnalysis.classification.includes('PHISHING')
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : activeAnalysis.classification.includes('SUSPICIOUS')
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}
            >
              {activeAnalysis.classification}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick Tools */}
        <div className="hidden sm:flex items-center gap-1.5 border-r border-border/40 pr-2 mr-1">
          <button
            onClick={() => setIsUrlModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Inspect Suspicious URL"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>URL Forensics</span>
          </button>

          <button
            onClick={() => setIsHeaderModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Analyse Email Headers"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Headers</span>
          </button>
        </div>

        {/* Start Analysis Button */}
        <button
          onClick={() => startEmailCollection('quick')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-primary text-white text-xs font-semibold shadow-sm hover:opacity-95 transition-all active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Analyse Email</span>
        </button>

        {/* Ollama Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-mono border ${
            ollamaStatus?.connected
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500'
              : 'border-rose-500/30 bg-rose-500/5 text-rose-500'
          }`}
          title={ollamaStatus?.connected ? `Model: ${ollamaStatus.selectedModel}` : 'Ollama Offline'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${ollamaStatus?.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="hidden md:inline truncate max-w-[120px]">
            {ollamaStatus?.selectedModel || 'llama3'}
          </span>
        </div>

        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
