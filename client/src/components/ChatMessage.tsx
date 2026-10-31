import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  RotateCcw,
  Shield,
  User,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { Message } from '../types';
import { useChat } from '../context/ChatContext';
import { InvestigationReportCard } from './InvestigationReportCard';

interface Props {
  message: Message;
  isLatestAssistant?: boolean;
}

export const ChatMessage: React.FC<Props> = ({ message, isLatestAssistant }) => {
  const { activeAnalysis, findings, sendMessage, isStreaming } = useChat();
  const [copied, setCopied] = useState<boolean>(false);

  const isUser = message.role === 'user';
  const isReport = message.message_type === 'analysis_report';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRegenerate = () => {
    if (!isStreaming) {
      sendMessage('Please review your last analysis and explain your reasoning again.');
    }
  };

  // If this message is an analysis report and we have activeAnalysis matching, render the rich report card
  if (isReport && activeAnalysis && activeAnalysis.id === message.analysis_id) {
    return <InvestigationReportCard analysis={activeAnalysis} findings={findings} />;
  }

  return (
    <div className={`w-full py-4 flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-primary flex items-center justify-center text-white shrink-0 shadow-xs mt-1">
          <Shield className="w-4 h-4" />
        </div>
      )}

      <div
        className={`relative max-w-2xl sm:max-w-3xl rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs shadow-xs'
            : 'bg-card text-foreground border border-border/50 rounded-tl-xs shadow-2xs'
        }`}
      >
        {/* Role & timestamp bar */}
        <div className="flex items-center justify-between text-[11px] mb-1.5 opacity-70">
          <span className="font-semibold">{isUser ? 'You' : 'PhisherMan AI'}</span>
          <span>
            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>

        {/* Markdown message body */}
        <div className={isUser ? '' : 'prose-claude'}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Message Actions */}
        <div className="mt-2.5 pt-2 border-t border-current/10 flex items-center justify-between text-[11px] opacity-70 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1 transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {!isUser && isLatestAssistant && !isStreaming && (
            <button
              onClick={handleRegenerate}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1 transition-colors"
              title="Regenerate"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
