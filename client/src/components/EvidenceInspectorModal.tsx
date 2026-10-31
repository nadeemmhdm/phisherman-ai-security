import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldAlert,
  Copy,
  Check,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const EvidenceInspectorModal: React.FC = () => {
  const {
    inspectionFinding,
    isInspectionModalOpen,
    closeInspectionModal,
    sendFollowUp,
    activeAnalysis,
  } = useChat();

  const [copied, setCopied] = useState<boolean>(false);

  if (!isInspectionModalOpen || !inspectionFinding) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `Finding: ${inspectionFinding.title}\nEvidence: ${inspectionFinding.evidence}\nExplanation: ${inspectionFinding.explanation}\nRecommendation: ${inspectionFinding.recommendation}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAskAiAboutFinding = () => {
    closeInspectionModal();
    sendFollowUp(
      `Please explain finding "${inspectionFinding.title}" in greater detail. What specific threats does this pose and how can I verify this safely?`
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  inspectionFinding.severity === 'critical'
                    ? 'bg-rose-500/15 text-rose-500'
                    : inspectionFinding.severity === 'high'
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-primary/15 text-primary'
                }`}
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Suspicious Evidence Inspector
                </span>
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  {inspectionFinding.title}
                </h3>
              </div>
            </div>

            <button
              onClick={closeInspectionModal}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {/* Original Evidence with Highlight */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Original Email Excerpt / Evidence
              </span>
              <div className="p-3.5 rounded-xl bg-secondary/60 border border-border/60 font-mono text-xs leading-relaxed text-foreground select-text relative">
                <p className="bg-amber-500/20 text-foreground p-1 rounded inline-block">
                  "{inspectionFinding.evidence}"
                </p>
                <button
                  onClick={handleCopy}
                  className="absolute right-2 top-2 p-1.5 rounded bg-card border border-border text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1"
                  title="Copy evidence text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Why it was flagged & security implications */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Why It Was Flagged & Threat Implication
              </span>
              <div className="p-3.5 rounded-xl bg-card border border-border/50 text-foreground space-y-2">
                <p>{inspectionFinding.explanation}</p>
              </div>
            </div>

            {/* Recommended Action */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block mb-1.5">
                Recommended Action
              </span>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-foreground flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>{inspectionFinding.recommendation}</p>
              </div>
            </div>

            {/* Verification Status */}
            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-secondary/40 border border-border/30">
              <span className="text-muted-foreground">Forensic Grounding:</span>
              <span className="font-semibold text-emerald-500 flex items-center gap-1">
                <span>Directly Observed from Email Content</span>
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-border/40 bg-secondary/30 flex items-center justify-between">
            <button
              onClick={closeInspectionModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Close
            </button>

            <button
              onClick={handleAskAiAboutFinding}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask AI About This Finding</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
