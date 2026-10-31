import { simpleParser, ParsedMail, HeaderValue } from 'mailparser';
import crypto from 'crypto';
import { AttachmentMetadata, EmailHeader } from '../types/index.js';

export interface ParsedEmailResult {
  subject: string;
  sender: string;
  fromName?: string;
  to?: string;
  replyTo?: string;
  returnPath?: string;
  date?: string;
  messageId?: string;
  plainText: string;
  htmlText?: string;
  headers: Array<{ name: string; value: string }>;
  attachments: AttachmentMetadata[];
  receivedHops: string[];
  authResultsHeader?: string;
}

export class EmailParserService {
  /**
   * Parse a raw .eml buffer or string
   */
  static async parseEml(bufferOrString: Buffer | string, analysisId: string): Promise<ParsedEmailResult> {
    const parsed: ParsedMail = await simpleParser(bufferOrString);

    const fromObj = parsed.from?.value?.[0];
    const sender = fromObj?.address || '';
    const fromName = fromObj?.name || '';
    const to = parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') : parsed.to.text) : '';
    const subject = parsed.subject || '(No Subject)';
    const plainText = parsed.text || '';
    const htmlText = parsed.html || '';

    // Collect headers
    const headersList: Array<{ name: string; value: string }> = [];
    let replyTo = '';
    let returnPath = '';
    let messageId = parsed.messageId || '';
    let authResultsHeader = '';
    const receivedHops: string[] = [];

    if (parsed.headers) {
      for (const [key, val] of parsed.headers) {
        const valStr = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val);
        headersList.push({ name: key, value: valStr });

        const lowerKey = key.toLowerCase();
        if (lowerKey === 'reply-to') replyTo = valStr;
        if (lowerKey === 'return-path') returnPath = valStr;
        if (lowerKey === 'message-id' && !messageId) messageId = valStr;
        if (lowerKey === 'authentication-results') authResultsHeader = valStr;
        if (lowerKey === 'received') {
          if (Array.isArray(val)) {
            val.forEach(v => receivedHops.push(String(v)));
          } else {
            receivedHops.push(valStr);
          }
        }
      }
    }

    // Process attachments
    const attachments: AttachmentMetadata[] = [];
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        const hash = crypto.createHash('sha256').update(att.content).digest('hex');
        const filename = att.filename || 'unnamed_attachment';
        const mimeType = att.contentType || 'application/octet-stream';
        const size = att.size || att.content.length;

        const riskFlags = this.evaluateAttachmentRisk(filename, mimeType);

        attachments.push({
          id: crypto.randomUUID(),
          analysis_id: analysisId,
          filename,
          mime_type: mimeType,
          file_size: size,
          sha256: hash,
          risk_flags: riskFlags.join(', '),
        });
      }
    }

    return {
      subject,
      sender,
      fromName,
      to,
      replyTo,
      returnPath,
      date: parsed.date ? parsed.date.toISOString() : undefined,
      messageId,
      plainText: plainText || this.stripHtml(htmlText),
      htmlText,
      headers: headersList,
      attachments,
      receivedHops,
      authResultsHeader,
    };
  }

  /**
   * Parse raw header text pasted by user
   */
  static parseRawHeaders(rawHeaders: string): Array<{ name: string; value: string }> {
    const lines = rawHeaders.split(/\r?\n/);
    const headers: Array<{ name: string; value: string }> = [];
    let currentHeader: { name: string; value: string } | null = null;

    for (const line of lines) {
      if (/^\s+/.test(line) && currentHeader) {
        // Folded header line
        currentHeader.value += ' ' + line.trim();
      } else {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          if (currentHeader) headers.push(currentHeader);
          const name = line.substring(0, colonIdx).trim();
          const value = line.substring(colonIdx + 1).trim();
          currentHeader = { name, value };
        }
      }
    }

    if (currentHeader) headers.push(currentHeader);
    return headers;
  }

  /**
   * Basic HTML tag stripper for safe plain text preview
   */
  static stripHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Risk flags for attachments
   */
  static evaluateAttachmentRisk(filename: string, mimeType: string): string[] {
    const flags: string[] = [];
    const lowerName = filename.toLowerCase();

    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.wsf', '.hta',
      '.jar', '.ps1', '.iso', '.img', '.dll', '.com', '.pif', '.lnk',
      '.docm', '.xlsm', '.pptm'
    ];

    for (const ext of dangerousExtensions) {
      if (lowerName.endsWith(ext)) {
        flags.push(`Dangerous executable or macro extension (${ext})`);
        break;
      }
    }

    // Check double extension e.g. document.pdf.exe, invoice.docx.vbs
    const parts = lowerName.split('.');
    if (parts.length > 2) {
      const secondLast = parts[parts.length - 2];
      const last = parts[parts.length - 1];
      const commonDocs = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'jpg', 'png', 'txt'];
      const dangerousLast = ['exe', 'scr', 'vbs', 'bat', 'js', 'cmd', 'iso'];
      if (commonDocs.includes(secondLast) && dangerousLast.includes(last)) {
        flags.push(`Deceptive double extension: .${secondLast}.${last}`);
      }
    }

    // MIME mismatch check
    if (lowerName.endsWith('.pdf') && !mimeType.includes('pdf')) {
      flags.push(`MIME mismatch: extension .pdf with MIME type ${mimeType}`);
    }

    return flags;
  }
}
