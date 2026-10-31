import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Scale,
  Download,
  Printer,
  PlusCircle,
  Eye,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { EmailAnalysis, SuspiciousFinding } from '../types';
import { useChat } from '../context/ChatContext';

interface Props {
  analysis: EmailAnalysis;
  findings: SuspiciousFinding[];
}

export const InvestigationReportCard: React.FC<Props> = ({ analysis, findings }) => {
  const {
    openInspectionModal,
    sendFollowUp,
    reanalyseCurrentEmail,
    runDualModelComparison,
    analyseAnotherEmail,
    isStreaming,
    isAnalyzing,
  } = useChat();

  const [expandedReport, setExpandedReport] = useState<boolean>(true);

  // Classification styling
  const isPhishing = analysis.classification.includes('PHISHING');
  const isSuspicious = analysis.classification.includes('SUSPICIOUS');
  const isSpam = analysis.classification.includes('SPAM');
  const isLegit = analysis.classification.includes('LEGITIMATE');

  const badgeClass = isPhishing
    ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
    : isSuspicious
    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
    : isSpam
    ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
    : isLegit
    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
    : 'bg-sky-500/10 text-sky-500 border-sky-500/30';

  const confidenceBadge =
    analysis.confidence_level === 'High confidence'
      ? 'text-emerald-500'
      : analysis.confidence_level === 'Moderate confidence'
      ? 'text-amber-500'
      : 'text-muted-foreground';

  const quickQuestions = [
    'Why did you classify it as phishing?',
    'Explain the sender domain problem in simple language.',
    'Explain in Malayalam.',
    'Is the link definitely malicious?',
    'What should I do next if I received this?',
  ];

  return (
    <div className="w-full my-4 rounded-2xl bg-card border border-border/80 shadow-md overflow-hidden transition-all">
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 border-b border-border/50 bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isPhishing
                ? 'bg-rose-500/15 text-rose-500'
                : isSuspicious
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-emerald-500/15 text-emerald-500'
            }`}
          >
            {isPhishing ? (
              <ShieldAlert className="w-6 h-6" />
            ) : isSuspicious ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${badgeClass}`}>
                {analysis.classification}
              </span>
              <span className={`text-xs font-semibold ${confidenceBadge}`}>
                &bull; {analysis.confidence_level}
              </span>
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground mt-0.5 truncate max-w-md">
              {analysis.subject}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setExpandedReport(prev => !prev)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary text-xs flex items-center gap-1"
            title="Toggle Detailed Dossier"
          >
            <span>{expandedReport ? 'Collapse' : 'Expand'}</span>
            {expandedReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expandedReport && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-secondary/30 text-xs border border-border/40">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Sender</span>
              <code className="text-foreground font-mono text-[11px] truncate block mt-0.5">
                {analysis.sender_email}
              </code>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">AI Model</span>
              <span className="text-foreground font-medium block mt-0.5">
                {analysis.selected_model} ({analysis.analysis_mode})
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Evidence Items</span>
              <span className="text-foreground font-medium block mt-0.5">
                {findings.length} verifiable suspicious indicators
              </span>
            </div>
          </div>

          {/* Interactive Evidence Findings (Section 8) */}
          {findings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-primary" />
                  <span>Interactive Suspicious Evidence ({findings.length})</span>
                </h4>
                <span className="text-[11px] text-muted-foreground">Click "View Evidence" for full context</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {findings.map((f, idx) => (
                  <div
                    key={f.id || idx}
                    className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            f.severity === 'critical'
                              ? 'bg-rose-500/10 text-rose-500'
                              : f.severity === 'high'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {f.severity || 'Medium'}
                        </span>
                        <h5 className="font-semibold text-xs sm:text-sm text-foreground">
                          {idx + 1}. {f.title}
                        </h5>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        "{f.evidence}"
                      </p>
                    </div>

                    <button
                      onClick={() => openInspectionModal(f)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors shrink-0 self-start sm:self-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Evidence</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Markdown Report Content */}
          <div className="prose-claude text-xs sm:text-sm border-t border-border/40 pt-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {analysis.analysis_result}
            </ReactMarkdown>
          </div>

          {/* Conversational Follow-Up Prompts (Section 9) */}
          <div className="border-t border-border/40 pt-4">
            <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-muted-foreground">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Suggested Follow-Up Questions (Chat with Assistant):</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  disabled={isStreaming}
                  onClick={() => sendFollowUp(q)}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border/50 text-xs text-foreground transition-all active:scale-[0.98] disabled:opacity-50 text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="border-t border-border/40 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={isAnalyzing}
                onClick={() => reanalyseCurrentEmail('deep')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                title="Run Deep Investigation (9 stages)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>Deep Re-Analysis</span>
              </button>

              <button
                onClick={runDualModelComparison}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                title="Cross-validate with Secondary Model"
              >
                <Scale className="w-3.5 h-3.5 text-amber-500" />
                <span>Dual-Model Comparison</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/export/markdown/${analysis.id}`}
                download
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Download Markdown Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Markdown</span>
              </a>

              <a
                href={`/api/export/print/${analysis.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Dossier</span>
              </a>

              <button
                onClick={analyseAnotherEmail}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold shadow-xs hover:opacity-95 transition-all ml-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Analyse Another Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
