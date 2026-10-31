import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings as SettingsIcon,
  Server,
  Sliders,
  Globe,
  Palette,
  Database,
  Download,
  Upload,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    settings,
    updateAppSettings,
    ollamaStatus,
    refreshOllama,
  } = useChat();

  const { theme, setTheme } = useTheme();

  const [ollamaUrl, setOllamaUrl] = useState<string>(settings?.ollama_url || 'http://localhost:11434');
  const [primaryModel, setPrimaryModel] = useState<string>(settings?.selected_model || 'llama3:latest');
  const [secondaryModel, setSecondaryModel] = useState<string>(settings?.secondary_model || 'mistral:latest');
  const [temperature, setTemperature] = useState<number>(settings?.temperature ?? 0.2);
  const [language, setLanguage] = useState<'en' | 'ml'>(settings?.language || 'en');
  const [systemPrompt, setSystemPrompt] = useState<string>(settings?.custom_system_prompt || '');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  if (!isSettingsModalOpen) return null;

  const handleSave = async () => {
    await updateAppSettings({
      ollama_url: ollamaUrl,
      selected_model: primaryModel,
      secondary_model: secondaryModel,
      temperature,
      language,
      custom_system_prompt: systemPrompt,
      theme,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Restoring will replace the current local database with the backup data. Continue?')) {
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await api.restoreBackup(json);
      alert('Database successfully restored! Reloading application data...');
      window.location.reload();
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
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
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  PhisherMan Configuration & Settings
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Ollama endpoint, model switching, language options, and SQLite database backup
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
            {/* Ollama Host */}
            <div>
              <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  <span>Ollama Server Endpoint</span>
                </span>
                <span className={ollamaStatus?.connected ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                  {ollamaStatus?.connected ? 'Connected' : 'Offline'}
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono"
                />
                <button
                  onClick={refreshOllama}
                  className="px-3 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold hover:bg-secondary/80 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Test</span>
                </button>
              </div>
            </div>

            {/* Model Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Primary Model
                </label>
                <select
                  value={primaryModel}
                  onChange={e => setPrimaryModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                >
                  {ollamaStatus?.models && ollamaStatus.models.length > 0 ? (
                    ollamaStatus.models.map(m => (
                      <option key={m.name} value={m.name}>
                        {m.name} {m.details?.parameter_size ? `(${m.details.parameter_size})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="llama3:latest">llama3:latest</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Secondary Comparison Model
                </label>
                <select
                  value={secondaryModel}
                  onChange={e => setSecondaryModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                >
                  {ollamaStatus?.models && ollamaStatus.models.length > 0 ? (
                    ollamaStatus.models.map(m => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))
                  ) : (
                    <option value="mistral:latest">mistral:latest</option>
                  )}
                </select>
              </div>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Inference Temperature</span>
                </span>
                <span className="font-mono text-foreground font-bold">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Lower values (0.1 - 0.3) produce stricter, factual forensic evaluations.
              </span>
            </div>

            {/* Language & Theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Response Language
                </label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                >
                  <option value="en">English (Default)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Visual Theme
                </label>
                <select
                  value={theme}
                  onChange={e => setTheme(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                >
                  <option value="dark">Dark Mode</option>
                  <option value="light">Light Mode</option>
                  <option value="system">System Default</option>
                </select>
              </div>
            </div>

            {/* Custom System Prompt */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Custom System Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Append organizational guidance (e.g. 'Reference internal SOC escalation policy for suspicious wire requests')..."
                className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            {/* Database Persistence & Backup (Section 22) */}
            <div className="border-t border-border/40 pt-4">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <Database className="w-3.5 h-3.5" />
                <span>SQLite Database Backup & Restore</span>
              </label>

              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/settings/backup"
                  download
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup JSON</span>
                </a>

                <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-foreground cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isRestoring ? 'Restoring...' : 'Restore from Backup'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFile}
                    disabled={isRestoring}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/40 bg-secondary/30 flex items-center justify-between">
            <div>
              {savedSuccess && (
                <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Settings saved successfully</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
