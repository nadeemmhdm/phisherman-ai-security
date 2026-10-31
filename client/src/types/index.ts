export type ClassificationType =
  | 'LIKELY PHISHING'
  | 'SUSPICIOUS'
  | 'LIKELY SPAM'
  | 'LIKELY LEGITIMATE'
  | 'INSUFFICIENT INFORMATION';

export type ConfidenceLevel =
  | 'High confidence'
  | 'Moderate confidence'
  | 'Low confidence';

export type AnalysisMode = 'quick' | 'deep' | 'dual';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageType =
  | 'chat'
  | 'wizard_step'
  | 'analysis_report'
  | 'follow_up'
  | 'evidence_explanation'
  | 'error';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  analysis_id?: string | null;
  role: MessageRole;
  content: string;
  message_type: MessageType;
  metadata?: string | null;
  created_at: string;
}

export interface SuspiciousFinding {
  id: string;
  analysis_id: string;
  finding_type: string;
  title: string;
  evidence: string;
  explanation: string;
  recommendation: string;
  verification_status: 'verified' | 'unverified' | 'inconclusive';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export interface InvestigationStep {
  id: string;
  analysis_id: string;
  step_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  result?: string | null;
  created_at: string;
}

export interface EmailHeader {
  id: string;
  analysis_id: string;
  header_name: string;
  header_value: string;
}

export interface ExtractedUrl {
  id: string;
  analysis_id: string;
  original_url: string;
  hostname: string;
  inspection_result: string;
}

export interface AttachmentMetadata {
  id: string;
  analysis_id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  risk_flags?: string;
}

export interface EmailAnalysis {
  id: string;
  conversation_id: string;
  subject: string;
  sender_email: string;
  email_body: string;
  classification: ClassificationType;
  confidence_level: ConfidenceLevel;
  analysis_mode: AnalysisMode;
  selected_model: string;
  secondary_model?: string | null;
  analysis_result: string;
  summary?: string | null;
  risk_score?: number | null;
  created_at: string;
}

export interface Settings {
  id: string;
  selected_model: string;
  secondary_model: string;
  language: 'en' | 'ml';
  theme: 'dark' | 'light' | 'system';
  temperature: number;
  analysis_mode: AnalysisMode;
  ollama_url: string;
  custom_system_prompt: string;
}

export interface OllamaModelInfo {
  name: string;
  model: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaStatus {
  connected: boolean;
  endpoint: string;
  models: OllamaModelInfo[];
  selectedModel: string;
  secondaryModel: string;
  error?: string | null;
}

export interface EmailCollectionWizardData {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  subject: string;
  sender: string;
  body: string;
  rawHeaders?: string;
  emlFileName?: string;
  emlFileSize?: number;
  attachments?: AttachmentMetadata[];
}
