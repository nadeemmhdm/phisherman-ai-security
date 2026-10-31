import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { api } from '../services/api';

export const HeaderInspectorModal: React.FC = () => {
  const { isHeaderModalOpen, setIsHeaderModalOpen } = useChat();

  const [rawHeaders, setRawHeaders] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [forensics, setForensics] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isHeaderModalOpen) return null;

  const handleAudit = async () => {
    if (!rawHeaders.trim()) return;
    setLoading(true);
    try {
      const res = await api.parseHeaders(rawHeaders.trim(), senderEmail.trim());
      setForensics(res.forensics);
    } catch (err: any) {
      alert(`Header audit failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const res = await api.uploadEml(file);
      if (res.data) {
        setSenderEmail(res.data.sender || '');
        const formatted = res.data.headers.map((h: any) => `${h.name}: ${h.value}`).join('\n');
        setRawHeaders(formatted);
        const auditRes = await api.parseHeaders(formatted, res.data.sender);
        setForensics(auditRes.forensics);
      }
    } catch (err: any) {
      alert(`EML upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'Pass') {
      return <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold text-[10px]">PASS</span>;
    }
    if (status === 'Fail') {
      return <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 font-bold text-[10px]">FAIL</span>;
    }
    if (status === 'Softfail') {
      return <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold text-[10px]">SOFTFAIL</span>;
    }
    if (status === 'Neutral') {
      return <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-500 font-bold text-[10px]">NEUTRAL</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground font-bold text-[10px]">{status || 'NOT CHECKED'}</span>;
  };

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
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  Email Header Forensics & Authentication Audit
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Deterministic audit of SPF, DKIM, DMARC, Return-Path, and routing hops
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsHeaderModalOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {/* EML upload helper */}
            <div className="border border-dashed border-border rounded-xl p-3 bg-secondary/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <UploadCloud className="w-4 h-4 text-primary" />
                <span className="text-foreground font-medium">Or import an .eml file to auto-extract headers:</span>
              </div>
              <label className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer">
                <span>Browse .eml</span>
                <input type="file" accept=".eml,.msg" onChange={handleEmlUpload} className="hidden" />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Sender Email Address (Optional for cross-matching)
              </label>
              <input
                type="text"
                value={senderEmail}
                onChange={e => setSenderEmail(e.target.value)}
                placeholder="e.g. security@paypal.com"
                className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Raw Email Headers
              </label>
              <textarea
                rows={5}
                value={rawHeaders}
                onChange={e => setRawHeaders(e.target.value)}
                placeholder="Paste raw email headers (Authentication-Results, Received-SPF, Return-Path, Received hops)..."
                className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAudit}
                disabled={loading || !rawHeaders.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95 disabled:opacity-40"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Audit Headers</span>
              </button>
            </div>

            {/* Results Grid */}
            {forensics && (
              <div className="pt-2 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  Cryptographic Authentication Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* SPF */}
                  <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">SPF Policy</span>
                      {renderStatusBadge(forensics.spf.status)}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{forensics.spf.details}</p>
                  </div>

                  {/* DKIM */}
                  <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">DKIM Signature</span>
                      {renderStatusBadge(forensics.dkim.status)}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{forensics.dkim.details}</p>
                  </div>

                  {/* DMARC */}
                  <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">DMARC Alignment</span>
                      {renderStatusBadge(forensics.dmarc.status)}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{forensics.dmarc.details}</p>
                  </div>
                </div>

                {/* Identity Mismatches */}
                {forensics.identityMismatch?.hasMismatch && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Sender Identity Discrepancies Detected</span>
                    </div>
                    {forensics.identityMismatch.details.map((d: string, i: number) => (
                      <p key={i}>&bull; {d}</p>
                    ))}
                  </div>
                )}

                {/* Routing hops */}
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40 text-xs">
                  <span className="font-bold block mb-1">Routing Forensics:</span>
                  <p className="text-muted-foreground">
                    Observed hops: {forensics.routingSummary.hopCount} relay MTA nodes.
                    {forensics.routingSummary.originIp && ` Identified origin host IP: ${forensics.routingSummary.originIp}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/40 bg-secondary/30 flex justify-end">
            <button
              onClick={() => setIsHeaderModalOpen(false)}
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
