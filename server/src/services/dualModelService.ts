import { OllamaService, OllamaChatMessage } from './ollamaService.js';
import { EmailAnalysis, SuspiciousFinding } from '../types/index.js';

export interface DualModelComparisonResult {
  primaryModel: string;
  secondaryModel: string;
  primaryClassification: string;
  secondaryClassification: string;
  agreementStatus: 'full_agreement' | 'partial_agreement' | 'divergent';
  comparisonSummary: string;
  matchingPoints: string[];
  divergentPoints: string[];
}

export class DualModelService {
  /**
   * Run independent secondary model review and compare with primary analysis
   */
  static async compareModels(
    analysis: EmailAnalysis,
    findings: SuspiciousFinding[],
    secondaryModelName: string
  ): Promise<DualModelComparisonResult> {
    const primaryModel = analysis.selected_model;
    const secondaryModel = secondaryModelName;

    // Prompt secondary model independently with the exact same evidence
    const systemPrompt = `You are an independent Senior Cyber Threat Reviewer.
Your task is to independently review this email and forensic evidence.
Provide an independent, unbiased review. Do not simply agree with other analysts.

Requirements:
1. Provide your overall classification: LIKELY PHISHING, SUSPICIOUS, LIKELY SPAM, LIKELY LEGITIMATE, or INSUFFICIENT INFORMATION.
2. Explain your reasoning based strictly on the evidence.
3. List your key points.`;

    const userPrompt = `Email Evidence:
Subject: ${analysis.subject}
Sender: ${analysis.sender_email}
Body:
${analysis.email_body.substring(0, 3000)}

Forensic Findings Identified by Scan:
${findings.map((f, i) => `${i + 1}. [${f.title}]: ${f.evidence} (${f.explanation})`).join('\n')}

What is your independent classification and reasoning?`;

    const messages: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let secondaryResponse = '';
    try {
      secondaryResponse = await OllamaService.completeChat(secondaryModel, messages);
    } catch (err: any) {
      secondaryResponse = `Secondary model (${secondaryModel}) review could not be completed: ${err.message}`;
    }

    // Extract secondary classification
    let secondaryClassification = 'SUSPICIOUS';
    if (/LIKELY PHISHING/i.test(secondaryResponse)) {
      secondaryClassification = 'LIKELY PHISHING';
    } else if (/LIKELY SPAM/i.test(secondaryResponse)) {
      secondaryClassification = 'LIKELY SPAM';
    } else if (/LIKELY LEGITIMATE/i.test(secondaryResponse)) {
      secondaryClassification = 'LIKELY LEGITIMATE';
    } else if (/INSUFFICIENT INFORMATION/i.test(secondaryResponse)) {
      secondaryClassification = 'INSUFFICIENT INFORMATION';
    }

    const primaryClassification = analysis.classification;
    const isFullAgreement = primaryClassification === secondaryClassification;

    const matchingPoints: string[] = [];
    const divergentPoints: string[] = [];

    if (isFullAgreement) {
      matchingPoints.push(`Both models independently converged on ${primaryClassification}.`);
    } else {
      divergentPoints.push(
        `Primary model (${primaryModel}) concluded "${primaryClassification}", whereas secondary model (${secondaryModel}) concluded "${secondaryClassification}".`
      );
    }

    // Synthesize comparison summary
    const comparisonSummary = `### Dual-Model Forensic Cross-Validation

- **Primary Model (${primaryModel}):** ${primaryClassification} (${analysis.confidence_level})
- **Secondary Model (${secondaryModel}):** ${secondaryClassification}

#### Consensus Analysis:
${
  isFullAgreement
    ? `Both models independently reached the classification of **${primaryClassification}**. While multi-model consensus strengthens confidence, remember that consensus does not prove mathematical infallibility. Continued adherence to safe handling protocols is required.`
    : `The models arrived at divergent threat assessments. Primary model evaluated the risk as **${primaryClassification}**, whereas the secondary model evaluated it as **${secondaryClassification}**. Divergence typically occurs when evidence is borderline, context is ambiguous, or when deceptive indicators can be interpreted as aggressive marketing versus malicious intent.`
}

#### Secondary Reviewer Notes:
${secondaryResponse.substring(0, 1500)}
`;

    return {
      primaryModel,
      secondaryModel,
      primaryClassification,
      secondaryClassification,
      agreementStatus: isFullAgreement ? 'full_agreement' : 'divergent',
      comparisonSummary,
      matchingPoints,
      divergentPoints,
    };
  }
}
