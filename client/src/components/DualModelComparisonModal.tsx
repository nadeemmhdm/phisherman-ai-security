import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const DualModelComparisonModal: React.FC = () => {
  const { isDualModelModalOpen, setIsDualModelModalOpen, dualModelResult } = useChat();

  if (!isDualModelModalOpen || !dualModelResult) return null;

  const isAgreement = dualModelResult.agreementStatus === 'full_agreement';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  Dual-Model Cross-Validation
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Independent threat evaluation across two separate Ollama models
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsDualModelModalOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {/* Side-by-side models banner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Primary Model
                </span>
                <p className="font-bold text-foreground text-sm">{dualModelResult.primaryModel}</p>
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary mt-1">
                  {dualModelResult.primaryClassification}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Secondary Reviewer
                </span>
                <p className="font-bold text-foreground text-sm">{dualModelResult.secondaryModel}</p>
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-500 mt-1">
                  {dualModelResult.secondaryClassification}
                </span>
              </div>
            </div>

            {/* Agreement Indicator */}
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                isAgreement
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}
            >
              {isAgreement ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium">
                {isAgreement
                  ? 'High Model Consensus: Both independent models classified the threat identically.'
                  : 'Model Divergence: The models reached divergent assessments on this evidence.'}
              </span>
            </div>

            {/* Note on correctness */}
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/30 text-[11px] text-muted-foreground flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Important security notice: Model agreement indicates high consistency in recognizing threat indicators, but does not mathematically guarantee infallibility.
              </span>
            </div>

            {/* Markdown Comparison Summary */}
            <div className="prose-claude text-xs border-t border-border/40 pt-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {dualModelResult.comparisonSummary}
              </ReactMarkdown>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/40 bg-secondary/30 flex justify-end">
            <button
              onClick={() => setIsDualModelModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
