import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  User,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Edit3,
  ShieldAlert,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { api } from '../services/api';

export const EmailCollectionWizard: React.FC = () => {
  const {
    wizardData,
    updateWizardData,
    advanceWizardStep,
    cancelEmailCollection,
    submitWizardInvestigation,
    isAnalyzing,
    steps,
  } = useChat();

  const [inputVal, setInputVal] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isUploadingEml, setIsUploadingEml] = useState<boolean>(false);
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'deep'>('quick');

  // Step 2 validation
  const validateSenderEmail = (email: string): string | null => {
    const trimmed = email.trim();
    if (!trimmed) return 'Sender email address cannot be empty.';
    if (/\s/.test(trimmed)) return 'Sender address cannot contain spaces.';

    // Check basic email syntax: localpart@domain.tld
    const emailRegex = /^(?:[a-zA-Z0-9_\-\.\+]+)@([a-zA-Z0-9\-]+\.[a-zA-Z0-9\-\.]+)$/;
    const match = trimmed.match(emailRegex);
    if (!match) {
      // Check if it's formatted as "Name <email@domain.com>"
      const bracketMatch = trimmed.match(/^.+<([a-zA-Z0-9_\-\.\+]+@[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-\.]+)>$/);
      if (!bracketMatch) {
        return 'Invalid email address format. Example: security-alert@paypal-update.com or Name <user@domain.com>';
      }
    }

    return null;
  };

  const handleNext = () => {
    setErrorMsg('');

    if (wizardData.step === 1) {
      if (!inputVal.trim()) {
        setErrorMsg('Please enter an email subject (or type "No Subject").');
        return;
      }
      updateWizardData({ subject: inputVal.trim() });
      setInputVal(wizardData.sender || '');
      advanceWizardStep();
    } else if (wizardData.step === 2) {
      const valError = validateSenderEmail(inputVal);
      if (valError) {
        setErrorMsg(valError);
        return;
      }
      updateWizardData({ sender: inputVal.trim() });
      setInputVal(wizardData.body || '');
      advanceWizardStep();
    } else if (wizardData.step === 3) {
      if (!inputVal.trim() || inputVal.trim().length < 5) {
        setErrorMsg('Please paste the complete email message or text body.');
        return;
      }
      updateWizardData({ body: inputVal.trim() });
      setInputVal(wizardData.headers || '');
      advanceWizardStep();
    } else if (wizardData.step === 4) {
      // Optional step
      if (inputVal.trim()) {
        updateWizardData({ headers: inputVal.trim() });
      }
      advanceWizardStep();
    }
  };

  const handleSkipOptional = () => {
    setErrorMsg('');
    advanceWizardStep();
  };

  const handleEmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEml(true);
    setErrorMsg('');

    try {
      const res = await api.uploadEml(file);
      if (res.success && res.data) {
        updateWizardData({
          subject: res.data.subject || wizardData.subject,
          sender: res.data.sender || wizardData.sender,
          body: res.data.plainText || wizardData.body,
          headers: res.data.headers.map((h: any) => `${h.name}: ${h.value}`).join('\n'),
          emlFileName: file.name,
          emlFileSize: file.size,
        });
      }
    } catch (err: any) {
      setErrorMsg(`Failed to parse .eml: ${err.message}`);
    } finally {
      setIsUploadingEml(false);
    }
  };

  // Sample quick-loader
  const loadSample = (type: 'phish' | 'legit' | 'bec') => {
    if (type === 'phish') {
      updateWizardData({
        step: 5,
        subject: 'URGENT: Your PayPal Account Has Been Suspended Within 24 Hours',
        sender: 'PayPal Security Support <security-service@paypal-verification-portal.xyz>',
        body: `Dear Valued Customer,

We detected unauthorized sign-in attempts on your PayPal wallet from an unrecognized device in Moscow, Russia.

Your account will be permanently suspended within 24 hours unless you verify your identity immediately.

Click the secure link below to verify your password and banking details:
http://198.51.100.24/auth/verify?token=928374829374

Failure to verify will result in immediate termination and asset freeze.

Sincerely,
PayPal Fraud Mitigation Department`,
        headers: `Authentication-Results: mx.google.com; spf=fail (google.com: domain of security-service@paypal-verification-portal.xyz does not designate 198.51.100.24 as permitted sender); dkim=fail; dmarc=fail (p=REJECT)
Received: from mail.untrusted-relay.net ([198.51.100.24]) by mx.google.com with ESMTPS
From: PayPal Security Support <security-service@paypal-verification-portal.xyz>
Reply-To: phish-collector@mailinator.com
Subject: URGENT: Your PayPal Account Has Been Suspended Within 24 Hours`,
      });
    } else if (type === 'bec') {
      updateWizardData({
        step: 5,
        subject: 'Quick wire transfer request for pending vendor settlement',
        sender: 'Johnathan Miller (CEO) <ceo-exec-office@gmail.com>',
        body: `Hi,

Are you at your desk right now? I need you to process an urgent wire transfer for an acquisition vendor settlement today. 

Please don't call me as I am in an NDA board meeting until 5 PM. Transfer $42,500 to the attached invoice banking coordinates immediately.

Regards,
Johnathan Miller, Chief Executive Officer`,
        headers: `From: "Johnathan Miller (CEO)" <ceo-exec-office@gmail.com>
Reply-To: wire-settlement@finance-ops.vip
Subject: Quick wire transfer request for pending vendor settlement`,
      });
    } else {
      updateWizardData({
        step: 5,
        subject: 'Your GitHub Weekly Digest: Updates from followed repositories',
        sender: 'GitHub Notifications <notifications@github.com>',
        body: `Here is your weekly summary of activity across repositories you star or watch.
Check your notifications dashboard at https://github.com/notifications to manage your preferences.
You can unsubscribe from these notifications anytime in your account settings.`,
        headers: `Authentication-Results: mx.google.com; dkim=pass header.i=@github.com; spf=pass (google.com: domain of notifications@github.com designates 192.30.252.204 as permitted sender); dmarc=pass
From: GitHub Notifications <notifications@github.com>
Subject: Your GitHub Weekly Digest`,
      });
    }
  };

  const handleStartAnalysis = async () => {
    await submitWizardInvestigation(analysisMode);
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-6 p-4 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-lg relative backdrop-blur-xl">
      {/* Top Banner with Progress & Cancel */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {wizardData.step <= 5 ? `0${wizardData.step}` : '06'}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">
              Step-by-Step Email Collection
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {wizardData.step === 1 && 'Step 1 of 6: Email Subject'}
              {wizardData.step === 2 && 'Step 2 of 6: Sender Email Address'}
              {wizardData.step === 3 && 'Step 3 of 6: Message Body Content'}
              {wizardData.step === 4 && 'Step 4 of 6: Optional Forensic Evidence'}
              {wizardData.step === 5 && 'Step 5 of 6: Confirm Submitted Details'}
              {wizardData.step === 6 && 'Step 6 of 6: Active AI Investigation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wizardData.step < 5 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-muted-foreground">Quick sample:</span>
              <button
                onClick={() => loadSample('phish')}
                className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[10px] font-semibold"
              >
                PayPal Phish
              </button>
              <button
                onClick={() => loadSample('bec')}
                className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[10px] font-semibold"
              >
                CEO BEC Fraud
              </button>
            </div>
          )}

          <button
            onClick={cancelEmailCollection}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            title="Cancel Collection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-6 gap-1.5 mb-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              wizardData.step >= i
                ? 'bg-primary'
                : 'bg-secondary'
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {wizardData.step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/30 text-xs sm:text-sm text-foreground flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Let's investigate your email.</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  First, please enter the email subject as it appeared in the inbox.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Email Subject
              </label>
              <input
                type="text"
                value={inputVal || wizardData.subject}
                onChange={e => {
                  setInputVal(e.target.value);
                  setErrorMsg('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleNext()}
                placeholder="e.g. URGENT: Your account has been suspended within 24 hours"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
              {errorMsg && (
                <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {wizardData.step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/30 text-xs sm:text-sm text-foreground flex items-start gap-3">
              <User className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Subject received: "{wizardData.subject}".</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Now enter the sender's full email address (and display name if available).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Sender Email Address
              </label>
              <input
                type="text"
                value={inputVal || wizardData.sender}
                onChange={e => {
                  setInputVal(e.target.value);
                  setErrorMsg('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleNext()}
                placeholder="e.g. security-service@paypal-verification.com or Support Team <alert@domain.com>"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
              {errorMsg && (
                <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  updateWizardData({ step: 1 });
                  setInputVal(wizardData.subject);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {wizardData.step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/30 text-xs sm:text-sm text-foreground flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Sender information received.</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Now paste the complete email message body (plain text or raw HTML).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Complete Email Body
              </label>
              <textarea
                rows={6}
                value={inputVal || wizardData.body}
                onChange={e => {
                  setInputVal(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Paste the message content here, including any links, greetings, and disclaimers..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono text-xs leading-relaxed"
                autoFocus
              />
              {errorMsg && (
                <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  updateWizardData({ step: 2 });
                  setInputVal(wizardData.sender);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {wizardData.step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/30 text-xs sm:text-sm text-foreground flex items-start gap-3">
              <UploadCloud className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Optional Forensic Details</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Do you have the raw email headers or an original <code className="bg-secondary px-1 rounded">.eml</code> file? You can paste headers below, upload a file, or skip this step.
                </p>
              </div>
            </div>

            {/* EML File Upload Dropzone */}
            <div className="border-2 border-dashed border-border/70 hover:border-primary/50 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-secondary/20 relative">
              <input
                type="file"
                accept=".eml,.msg,.txt"
                onChange={handleEmlUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                {wizardData.emlFileName ? `Loaded: ${wizardData.emlFileName}` : 'Drag & drop .eml file here or click to browse'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Automatically extracts headers, SPF/DKIM/DMARC, and attachment metadata
              </p>
              {isUploadingEml && (
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing forensic headers...</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Raw Headers (Optional)
              </label>
              <textarea
                rows={3}
                value={inputVal || wizardData.headers}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Paste raw email headers (Received, Authentication-Results, SPF, Return-Path)..."
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
              />
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  updateWizardData({ step: 3 });
                  setInputVal(wizardData.body);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkipOptional}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  Skip this step
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95"
                >
                  <span>Review Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {wizardData.step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm text-foreground flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">All Information Collected</p>
                  <p className="text-muted-foreground text-xs">
                    Please confirm the details below before starting the forensic investigation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Mode:</span>
                <select
                  value={analysisMode}
                  onChange={e => setAnalysisMode(e.target.value as any)}
                  className="text-xs py-1 px-2 rounded-lg bg-card border border-border text-foreground font-medium"
                >
                  <option value="quick">Quick Scan</option>
                  <option value="deep">Deep Investigation</option>
                </select>
              </div>
            </div>

            {/* Confirmation Summary Card */}
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 space-y-3 text-xs">
              <div className="flex items-start justify-between border-b border-border/40 pb-2.5">
                <div className="flex-1 pr-2">
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase">Subject</span>
                  <p className="font-medium text-foreground text-sm mt-0.5">{wizardData.subject}</p>
                </div>
                <button
                  onClick={() => {
                    updateWizardData({ step: 1 });
                    setInputVal(wizardData.subject);
                  }}
                  className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="flex items-start justify-between border-b border-border/40 pb-2.5">
                <div className="flex-1 pr-2">
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase">Sender</span>
                  <code className="text-foreground font-mono mt-0.5 block">{wizardData.sender}</code>
                </div>
                <button
                  onClick={() => {
                    updateWizardData({ step: 2 });
                    setInputVal(wizardData.sender);
                  }}
                  className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="flex items-start justify-between border-b border-border/40 pb-2.5">
                <div className="flex-1 pr-2">
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase">Message Content</span>
                  <p className="text-muted-foreground line-clamp-2 mt-0.5 font-mono text-[11px]">
                    {wizardData.body}
                  </p>
                  <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                    {wizardData.body.length} characters
                  </span>
                </div>
                <button
                  onClick={() => {
                    updateWizardData({ step: 3 });
                    setInputVal(wizardData.body);
                  }}
                  className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase">Forensic Evidence</span>
                  <p className="text-foreground mt-0.5">
                    {wizardData.emlFileName
                      ? `Imported .eml (${wizardData.emlFileName})`
                      : wizardData.headers
                      ? 'Headers manually provided'
                      : 'Standard body & URL parsing only'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    updateWizardData({ step: 4 });
                    setInputVal(wizardData.headers);
                  }}
                  className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3">
              <button
                onClick={cancelEmailCollection}
                className="px-3.5 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>

              <button
                onClick={handleStartAnalysis}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-primary to-orange-500 text-white font-bold text-sm shadow-md shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Email Investigation</span>
              </button>
            </div>
          </motion.div>
        )}

        {wizardData.step === 6 && (
          <motion.div
            key="step6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-4"
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Investigating Email Security Threat
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Executing multi-stage forensic analysis with local AI engine...
              </p>
            </div>

            {/* Stages progress list */}
            <div className="space-y-2 max-w-md mx-auto">
              {steps.map((st, i) => (
                <div
                  key={st.id || i}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/40 border border-border/30"
                >
                  <span className="font-medium text-foreground">{st.step_name}</span>
                  {st.status === 'completed' ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </span>
                  ) : st.status === 'in_progress' ? (
                    <span className="text-amber-500 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scanning</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
