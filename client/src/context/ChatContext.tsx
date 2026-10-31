import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Conversation,
  Message,
  EmailAnalysis,
  SuspiciousFinding,
  InvestigationStep,
  OllamaStatus,
  Settings,
  AnalysisMode,
} from '../types';
import { api } from '../services/api';

export interface WizardData {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  subject: string;
  sender: string;
  body: string;
  headers: string;
  emlFileName?: string;
  emlFileSize?: number;
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  activeAnalysis: EmailAnalysis | null;
  findings: SuspiciousFinding[];
  steps: InvestigationStep[];
  ollamaStatus: OllamaStatus | null;
  settings: Settings | null;
  isStreaming: boolean;
  isAnalyzing: boolean;
  currentStreamChunk: string;
  searchQuery: string;
  sidebarOpen: boolean;

  // Wizard state
  wizardActive: boolean;
  wizardData: WizardData;

  // Modals state
  inspectionFinding: SuspiciousFinding | null;
  isInspectionModalOpen: boolean;
  isUrlModalOpen: boolean;
  isHeaderModalOpen: boolean;
  isDualModelModalOpen: boolean;
  isSettingsModalOpen: boolean;
  dualModelResult: any | null;

  // Actions
  setSearchQuery: (query: string) => void;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  startNewChat: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;

  // Wizard actions
  startEmailCollection: (initialMode?: AnalysisMode) => void;
  updateWizardData: (updates: Partial<WizardData>) => void;
  advanceWizardStep: () => void;
  cancelEmailCollection: () => void;
  submitWizardInvestigation: (mode?: AnalysisMode) => Promise<void>;

  // Analysis follow-up and actions
  sendFollowUp: (question: string) => Promise<void>;
  reanalyseCurrentEmail: (mode?: AnalysisMode) => Promise<void>;
  runDualModelComparison: () => Promise<void>;
  analyseAnotherEmail: () => void;

  // Modals actions
  openInspectionModal: (finding: SuspiciousFinding) => void;
  closeInspectionModal: () => void;
  setIsUrlModalOpen: (open: boolean) => void;
  setIsHeaderModalOpen: (open: boolean) => void;
  setIsDualModelModalOpen: (open: boolean) => void;
  setIsSettingsModalOpen: (open: boolean) => void;

  // Settings & Ollama
  refreshOllama: () => Promise<void>;
  switchModel: (model: string, isSecondary?: boolean) => Promise<void>;
  updateAppSettings: (newSettings: Partial<Settings>) => Promise<void>;
}

const initialWizardData: WizardData = {
  step: 1,
  subject: '',
  sender: '',
  body: '',
  headers: '',
  emlFileName: undefined,
  emlFileSize: undefined,
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<EmailAnalysis | null>(null);
  const [findings, setFindings] = useState<SuspiciousFinding[]>([]);
  const [steps, setSteps] = useState<InvestigationStep[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentStreamChunk, setCurrentStreamChunk] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Wizard
  const [wizardActive, setWizardActive] = useState<boolean>(false);
  const [wizardData, setWizardData] = useState<WizardData>(initialWizardData);

  // Modals
  const [inspectionFinding, setInspectionFinding] = useState<SuspiciousFinding | null>(null);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState<boolean>(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState<boolean>(false);
  const [isDualModelModalOpen, setIsDualModelModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [dualModelResult, setDualModelResult] = useState<any | null>(null);

  // Load initial settings and Ollama status
  const loadInitialData = useCallback(async () => {
    try {
      const [fetchedSettings, fetchedStatus, fetchedConvs] = await Promise.all([
        api.getSettings().catch(() => null),
        api.getOllamaStatus().catch(() => null),
        api.getConversations().catch(() => []),
      ]);

      if (fetchedSettings) setSettings(fetchedSettings);
      if (fetchedStatus) setOllamaStatus(fetchedStatus);
      if (fetchedConvs) {
        setConversations(fetchedConvs);
        if (fetchedConvs.length > 0 && !activeConversation) {
          await selectConversation(fetchedConvs[0].id);
        }
      }
    } catch (e) {
      console.error('Initialization error:', e);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refresh conversation list when searchQuery changes
  useEffect(() => {
    api.getConversations(searchQuery).then(setConversations).catch(console.error);
  }, [searchQuery]);

  const selectConversation = async (id: string) => {
    try {
      const data = await api.getConversation(id);
      setActiveConversation(data.conversation);
      setMessages(data.messages);
      if (data.analyses && data.analyses.length > 0) {
        const latest = data.analyses[0];
        setActiveAnalysis(latest);
        // Fetch detailed findings for this analysis
        const full = await api.getAnalysis(latest.id).catch(() => null);
        if (full) {
          setFindings(full.findings);
          setSteps(full.steps);
        }
      } else {
        setActiveAnalysis(null);
        setFindings([]);
        setSteps([]);
      }
      setWizardActive(false);
      setWizardData(initialWizardData);
    } catch (err: any) {
      console.error('Failed to select conversation:', err);
    }
  };

  const startNewChat = async () => {
    try {
      const newConv = await api.createConversation('New Security Conversation');
      setConversations(prev => [newConv, ...prev]);
      setActiveConversation(newConv);
      setMessages([]);
      setActiveAnalysis(null);
      setFindings([]);
      setSteps([]);
      setWizardActive(false);
      setWizardData(initialWizardData);
    } catch (err: any) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const renameConversation = async (id: string, title: string) => {
    await api.renameConversation(id, title);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    if (activeConversation && activeConversation.id === id) {
      setActiveConversation(prev => prev ? { ...prev, title } : null);
    }
  };

  const deleteConversation = async (id: string) => {
    await api.deleteConversation(id);
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    if (activeConversation && activeConversation.id === id) {
      if (updated.length > 0) {
        await selectConversation(updated[0].id);
      } else {
        setActiveConversation(null);
        setMessages([]);
        setActiveAnalysis(null);
        setFindings([]);
      }
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    let convId = activeConversation?.id;
    if (!convId) {
      const newConv = await api.createConversation(content.substring(0, 35) + '...');
      setConversations(prev => [newConv, ...prev]);
      setActiveConversation(newConv);
      convId = newConv.id;
    }

    setIsStreaming(true);
    setCurrentStreamChunk('');

    // If an email investigation is already present and active, route through follow-up
    if (activeAnalysis) {
      await sendFollowUp(content);
      return;
    }

    await api.streamChat(
      convId,
      content,
      {
        onUserMessage: msg => {
          setMessages(prev => [...prev, msg]);
        },
        onChunk: chunk => {
          setCurrentStreamChunk(prev => prev + chunk);
        },
        onDone: msg => {
          setMessages(prev => [...prev, msg]);
          setCurrentStreamChunk('');
          setIsStreaming(false);
          // Refresh conversations to get title updates
          api.getConversations().then(setConversations);
        },
        onError: err => {
          console.error('Chat error:', err);
          setIsStreaming(false);
          setCurrentStreamChunk('');
        },
      },
      {
        model: settings?.selected_model,
        language: settings?.language,
      }
    );
  };

  // Wizard flow
  const startEmailCollection = (initialMode?: AnalysisMode) => {
    setWizardActive(true);
    setWizardData({ ...initialWizardData, step: 1 });
  };

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const advanceWizardStep = () => {
    setWizardData(prev => ({
      ...prev,
      step: (Math.min(6, prev.step + 1)) as WizardData['step'],
    }));
  };

  const cancelEmailCollection = () => {
    setWizardActive(false);
    setWizardData(initialWizardData);
  };

  const submitWizardInvestigation = async (mode: AnalysisMode = 'quick') => {
    let convId = activeConversation?.id;
    if (!convId) {
      const newConv = await api.createConversation(`Investigation: ${wizardData.subject || 'Suspicious Email'}`);
      setConversations(prev => [newConv, ...prev]);
      setActiveConversation(newConv);
      convId = newConv.id;
    }

    setIsAnalyzing(true);
    setIsStreaming(true);
    setCurrentStreamChunk('');
    setSteps([]);

    await api.streamInvestigation(
      {
        conversationId: convId,
        subject: wizardData.subject,
        senderEmail: wizardData.sender,
        emailBody: wizardData.body,
        rawHeaders: wizardData.headers,
        analysisMode: mode,
        selectedModel: settings?.selected_model,
        language: settings?.language,
      },
      {
        onUserMessage: msg => {
          setMessages(prev => [...prev, msg]);
        },
        onStepProgress: step => {
          setSteps(prev => {
            const idx = prev.findIndex(s => s.step_name === step.step_name);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = step;
              return copy;
            }
            return [...prev, step];
          });
        },
        onReportChunk: chunk => {
          setCurrentStreamChunk(prev => prev + chunk);
        },
        onComplete: data => {
          setActiveAnalysis(data.analysis);
          setFindings(data.findings);
          setMessages(prev => [...prev, data.message]);
          setIsAnalyzing(false);
          setIsStreaming(false);
          setCurrentStreamChunk('');
          setWizardActive(false);
          setWizardData(initialWizardData);
          // Refresh conversations
          api.getConversations().then(setConversations);
        },
        onError: err => {
          console.error('Investigation error:', err);
          setIsAnalyzing(false);
          setIsStreaming(false);
          setCurrentStreamChunk('');
        },
      }
    );
  };

  // Follow-up on active email report (Section 9)
  const sendFollowUp = async (question: string) => {
    if (!activeAnalysis || isStreaming) return;

    setIsStreaming(true);
    setCurrentStreamChunk('');

    await api.streamFollowUp(
      activeAnalysis.id,
      question,
      {
        onUserMessage: msg => {
          setMessages(prev => [...prev, msg]);
        },
        onChunk: chunk => {
          setCurrentStreamChunk(prev => prev + chunk);
        },
        onDone: msg => {
          setMessages(prev => [...prev, msg]);
          setCurrentStreamChunk('');
          setIsStreaming(false);
        },
        onError: err => {
          console.error('Follow-up error:', err);
          setIsStreaming(false);
          setCurrentStreamChunk('');
        },
      },
      {
        model: settings?.selected_model,
        language: settings?.language,
      }
    );
  };

  const reanalyseCurrentEmail = async (mode: AnalysisMode = 'deep') => {
    if (!activeAnalysis || isAnalyzing) return;

    setIsAnalyzing(true);
    setIsStreaming(true);
    setCurrentStreamChunk('');
    setSteps([]);

    await api.streamReanalyse(
      activeAnalysis.id,
      {
        analysisMode: mode,
        model: settings?.selected_model,
        language: settings?.language,
      },
      {
        onStepProgress: step => {
          setSteps(prev => {
            const idx = prev.findIndex(s => s.step_name === step.step_name);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = step;
              return copy;
            }
            return [...prev, step];
          });
        },
        onReportChunk: chunk => {
          setCurrentStreamChunk(prev => prev + chunk);
        },
        onComplete: data => {
          setActiveAnalysis(data.analysis);
          setFindings(data.findings);
          setMessages(prev => [...prev, data.message]);
          setIsAnalyzing(false);
          setIsStreaming(false);
          setCurrentStreamChunk('');
        },
        onError: err => {
          console.error('Re-analyse error:', err);
          setIsAnalyzing(false);
          setIsStreaming(false);
          setCurrentStreamChunk('');
        },
      }
    );
  };

  const runDualModelComparison = async () => {
    if (!activeAnalysis) return;
    try {
      const res = await api.compareModels(activeAnalysis.id, settings?.secondary_model);
      setDualModelResult(res.comparison);
      setIsDualModelModalOpen(true);
      setMessages(prev => [...prev, res.message]);
    } catch (err: any) {
      console.error('Comparison error:', err);
      alert(`Dual model comparison failed: ${err.message}`);
    }
  };

  const analyseAnotherEmail = () => {
    setWizardActive(true);
    setWizardData({ ...initialWizardData, step: 1 });
    setActiveAnalysis(null);
    setFindings([]);
    setSteps([]);
  };

  const openInspectionModal = (finding: SuspiciousFinding) => {
    setInspectionFinding(finding);
    setIsInspectionModalOpen(true);
  };

  const closeInspectionModal = () => {
    setInspectionFinding(null);
    setIsInspectionModalOpen(false);
  };

  const refreshOllama = async () => {
    const status = await api.getOllamaStatus();
    setOllamaStatus(status);
  };

  const switchModel = async (model: string, isSecondary = false) => {
    await api.selectModel(model, isSecondary);
    if (isSecondary) {
      setSettings(prev => prev ? { ...prev, secondary_model: model } : null);
    } else {
      setSettings(prev => prev ? { ...prev, selected_model: model } : null);
    }
    await refreshOllama();
  };

  const updateAppSettings = async (newSettings: Partial<Settings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        activeAnalysis,
        findings,
        steps,
        ollamaStatus,
        settings,
        isStreaming,
        isAnalyzing,
        currentStreamChunk,
        searchQuery,
        sidebarOpen,
        wizardActive,
        wizardData,
        inspectionFinding,
        isInspectionModalOpen,
        isUrlModalOpen,
        isHeaderModalOpen,
        isDualModelModalOpen,
        isSettingsModalOpen,
        dualModelResult,
        setSearchQuery,
        setSidebarOpen,
        startNewChat,
        selectConversation,
        renameConversation,
        deleteConversation,
        sendMessage,
        startEmailCollection,
        updateWizardData,
        advanceWizardStep,
        cancelEmailCollection,
        submitWizardInvestigation,
        sendFollowUp,
        reanalyseCurrentEmail,
        runDualModelComparison,
        analyseAnotherEmail,
        openInspectionModal,
        closeInspectionModal,
        setIsUrlModalOpen,
        setIsHeaderModalOpen,
        setIsDualModelModalOpen,
        setIsSettingsModalOpen,
        refreshOllama,
        switchModel,
        updateAppSettings,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};
