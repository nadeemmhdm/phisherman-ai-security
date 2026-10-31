import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Search,
  Link as LinkIcon,
  FileCode,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Lock,
  MailCheck,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const WelcomeScreen: React.FC = () => {
  const {
    startEmailCollection,
    setIsUrlModalOpen,
    setIsHeaderModalOpen,
    sendMessage,
    ollamaStatus,
  } = useChat();

  const suggestedActions = [
    {
      id: 'analyse',
      title: 'Analyse an Email',
      description: 'Start structured step-by-step investigation of a suspicious message.',
      icon: Sparkles,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-500',
      action: () => startEmailCollection('quick'),
      badge: 'Interactive Flow',
    },
    {
      id: 'phishing',
      title: 'Investigate Phishing',
      description: 'Load sample phishing scenario with spoofed domain & urgent suspension.',
      icon: ShieldAlert,
      color: 'from-rose-500/20 to-red-500/20 text-rose-500',
      action: () => {
        startEmailCollection('deep');
      },
      badge: 'Deep Forensic',
    },
    {
      id: 'url',
      title: 'Inspect a Suspicious URL',
      description: 'Deconstruct destination hostname, punycode lookalikes, and redirect risks.',
      icon: LinkIcon,
      color: 'from-sky-500/20 to-blue-500/20 text-sky-500',
      action: () => setIsUrlModalOpen(true),
      badge: 'Direct Tool',
    },
    {
      id: 'headers',
      title: 'Analyse Email Headers',
      description: 'Audit SPF, DKIM, DMARC alignment, and routing hops without downloading payloads.',
      icon: FileCode,
      color: 'from-purple-500/20 to-indigo-500/20 text-purple-500',
      action: () => setIsHeaderModalOpen(true),
      badge: 'Auth Audit',
    },
    {
      id: 'explain',
      title: 'Explain Email Security',
      description: 'Ask about modern email defense, spear-phishing tactics, and BEC prevention.',
      icon: HelpCircle,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-500',
      action: () => sendMessage('Can you explain how SPF, DKIM, and DMARC work together to prevent email spoofing?'),
      badge: 'Cyber Education',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-600 via-primary to-orange-400 flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
          AI Email Security Assistant
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Hello! I'm your local AI Email Security Assistant powered by Ollama.
          <br className="hidden sm:inline" />
          I can help you investigate suspicious emails, identify phishing attempts, analyse malicious links, and understand email security threats.
        </p>

        <p className="text-xs text-muted-foreground/80 mt-2">
          You can chat with me normally or start an email investigation.
        </p>

        {!ollamaStatus?.connected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Ollama daemon not detected on localhost:11434. Local deterministic fallback active.</span>
          </motion.div>
        )}
      </motion.div>

      {/* Suggested Action Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {suggestedActions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`group text-left p-4 rounded-2xl bg-card/80 hover:bg-card border border-border/50 hover:border-primary/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                idx === 0 ? 'sm:col-span-2 border-primary/30 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} shadow-xs`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {item.badge}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </motion.div>

      {/* Security Privacy Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground/70"
      >
        <Lock className="w-3.5 h-3.5" />
        <span>100% Local Processing &bull; SQLite Database &bull; Never transmits email content to external cloud</span>
      </motion.div>
    </div>
  );
};
