import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Link as LinkIcon,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { api } from '../services/api';

export const UrlInspectorModal: React.FC = () => {
  const { isUrlModalOpen, setIsUrlModalOpen } = useChat();

  const [inputUrl, setInputUrl] = useState<string>('');
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!isUrlModalOpen) return null;

  const runInspection = async (targetUrl?: string) => {
    const urlToTest = (targetUrl || inputUrl).trim();
    if (!urlToTest) return;

    if (targetUrl) setInputUrl(targetUrl);
    setLoading(true);
    try {
      const res = await api.inspectUrls(urlToTest);
      setInspections(res.inspections || []);
    } catch (err: any) {
      alert(`Inspection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1500);
  };

  const sampleUrls = [
    { label: 'Brand Lookalike Phish', url: 'http://paypal-verification-portal.xyz/auth/verify?token=928374' },
    { label: 'Direct IP Host', url: 'http://198.51.100.24/banking/login.php' },
    { label: 'High-Abuse TLD (.top)', url: 'https://security-account-alert.top/verify' },
    { label: 'URL Shortener', url: 'http://bit.ly/secure-account-verification' },
    { label: 'Clean Official Domain', url: 'https://github.com/notifications' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-3xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
                <LinkIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  URL Intelligence & Destination Inspector
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Deterministic detection of brand impersonation, IP hosts, punycode, and deceptive TLDs
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsUrlModalOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
            {/* Input Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runInspection()}
                placeholder="Enter any URL or domain (e.g. paypal-verification.xyz/login or 198.51.100.24)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
              />
              <button
                onClick={() => runInspection()}
                disabled={loading || !inputUrl.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95 disabled:opacity-40 shrink-0"
              >
                {loading ? 'Inspecting...' : 'Inspect Link'}
              </button>
            </div>

            {/* Quick sample chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Test Samples:</span>
              </span>
              {sampleUrls.map((s, i) => (
                <button
                  key={i}
                  onClick={() => runInspection(s.url)}
                  className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border/50 text-[11px] text-foreground transition-all active:scale-[0.98]"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Warning on non-navigation */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                Safety Isolation: Destination hostnames and parameters are evaluated statically without opening connections or running browser scripts.
              </span>
            </div>

            {/* Results List */}
            {inspections.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  Forensic URL Findings ({inspections.length})
                </h4>

                {inspections.map((item, idx) => {
                  const isCrit = item.riskRating === 'critical';
                  const isHigh = item.riskRating === 'high';
                  const isMed = item.riskRating === 'medium';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border space-y-3 text-xs ${
                        isCrit
                          ? 'border-rose-500/50 bg-rose-500/5'
                          : isHigh
                          ? 'border-amber-500/50 bg-amber-500/5'
                          : isMed
                          ? 'border-orange-500/40 bg-orange-500/5'
                          : 'border-emerald-500/40 bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                isCrit
                                  ? 'bg-rose-500 text-white'
                                  : isHigh
                                  ? 'bg-amber-500 text-white'
                                  : isMed
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-emerald-500 text-white'
                              }`}
                            >
                              {item.riskRating} Risk
                            </span>
                            <span className="font-bold text-sm text-foreground">{item.hostname}</span>
                          </div>
                          <code className="text-muted-foreground font-mono text-[11px] break-all block mt-0.5">
                            {item.originalUrl}
                          </code>
                        </div>

                        <button
                          onClick={() => handleCopy(item.originalUrl)}
                          className="p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground shrink-0"
                          title="Copy sanitized URL"
                        >
                          {copiedUrl === item.originalUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Flags */}
                      {item.flags && item.flags.length > 0 ? (
                        <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Flagged Suspicious Characteristics ({item.flags.length}):
                          </span>
                          {item.flags.map((flag: string, fIdx: number) => (
                            <div key={fIdx} className="flex items-start gap-2 text-rose-500 text-xs font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{flag}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs flex items-center gap-2 font-medium">
                          <ShieldCheck className="w-4 h-4" />
                          <span>No obvious deceptive traits or high-risk signatures identified on this destination.</span>
                        </div>
                      )}

                      {/* Recommendation */}
                      <div
                        className={`flex items-start gap-2 text-xs font-semibold ${
                          isCrit ? 'text-rose-600 dark:text-rose-400' : isHigh ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{item.recommendation}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/40 bg-secondary/30 flex justify-end">
            <button
              onClick={() => setIsUrlModalOpen(false)}
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
