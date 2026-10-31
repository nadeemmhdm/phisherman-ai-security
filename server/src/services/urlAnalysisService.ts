import crypto from 'crypto';
import { ExtractedUrl } from '../types/index.js';

export interface UrlInspectionDetail {
  originalUrl: string;
  hostname: string;
  protocol: string;
  path: string;
  flags: string[];
  isIpAddress: boolean;
  isShortener: boolean;
  hasPunycode: boolean;
  hasExcessiveSubdomains: boolean;
  hasSuspiciousKeywords: boolean;
  anchorTextMismatch?: {
    anchorText: string;
    actualHref: string;
  };
  recommendation: string;
  riskRating: 'critical' | 'high' | 'medium' | 'low' | 'safe';
}

const COMMON_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd',
  'buff.ly', 'adf.ly', 'bl.ink', 'shorturl.at', 'rb.gy', 'cutt.ly',
  'rebrand.ly', 'tiny.cc', 't.ly', 'v.gd', 'bc.vc'
]);

const BRAND_TARGETS = [
  'paypal', 'microsoft', 'google', 'apple', 'amazon', 'netflix', 'chase',
  'wellsfargo', 'bankofamerica', 'dhl', 'fedex', 'usps', 'meta', 'facebook',
  'instagram', 'linkedin', 'dropbox', 'docusign', 'adobe', 'citibank', 'yahoo',
  'outlook', 'office365', 'whatsapp', 'telegram', 'binance', 'coinbase', 'ebay',
  'walmart', 'steam', 'roblox', 'twitter', 'icloud', 'onedrive'
];

const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'tk', 'ml', 'ga', 'cf', 'gq', 'buzz', 'work', 'icu',
  'cam', 'monster', 'sbs', 'cfd', 'fit', 'rest', 'click', 'link',
  'live', 'info', 'online', 'site', 'vip', 'bid', 'loan', 'racing',
  'download', 'win', 'review', 'country', 'party', 'science', 'gdn',
  'kim', 'cricket', 'stream', 'trade', 'date', 'faith', 'accountant'
]);

const PHISH_DOMAIN_KEYWORDS = [
  'login', 'signin', 'verify', 'verification', 'secure', 'security',
  'account', 'update', 'support', 'billing', 'banking', 'service',
  'portal', 'recover', 'recovery', 'wallet', 'helpdesk', 'alert',
  'confirm', 'confirmation', '2fa', 'mfa', 'password', 'auth', 'authorize',
  'authenticate', 're-auth', 'suspend', 'suspended', 'unlock', 'safe',
  'protect', 'protection', 'check', 'notification', 'client', 'payment',
  'invoice', 'statement', 'validate', 'validation'
];

export class UrlAnalysisService {
  /**
   * Extract and analyze all URLs found in email body (plain text, HTML, or raw input)
   */
  static extractAndInspect(
    text: string,
    htmlText: string | undefined,
    analysisId: string
  ): { extractedUrls: ExtractedUrl[]; detailedInspections: UrlInspectionDetail[] } {
    const foundUrls = new Map<string, { url: string; anchorText?: string }>();

    // 1. Extract from HTML anchors if present
    if (htmlText) {
      const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
      let match;
      while ((match = anchorRegex.exec(htmlText)) !== null) {
        const href = match[2].trim();
        const anchor = match[3].replace(/<[^>]+>/g, '').trim();
        if (href.startsWith('http://') || href.startsWith('https://') || href.includes('.')) {
          foundUrls.set(href, { url: href, anchorText: anchor });
        }
      }
    }

    // 2. Extract plain text URLs with protocol
    const rawUrlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;
    let textMatch;
    while ((textMatch = rawUrlRegex.exec(text)) !== null) {
      const cleanUrl = textMatch[0].replace(/[.,;:!?)]+$/, '');
      if (!foundUrls.has(cleanUrl)) {
        foundUrls.set(cleanUrl, { url: cleanUrl });
      }
    }

    // 3. If no URLs with protocol found, check if input itself is a domain, link, or IP
    if (foundUrls.size === 0 && text && text.trim()) {
      const trimmed = text.trim();
      // Match lines or words that look like domains or IPs
      const domainOrIpRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?|(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:\/[^\s]*)?/gi;
      let matchDomain;
      while ((matchDomain = domainOrIpRegex.exec(trimmed)) !== null) {
        const candidate = matchDomain[0].replace(/[.,;:!?)]+$/, '');
        if (!foundUrls.has(candidate)) {
          foundUrls.set(candidate, { url: candidate });
        }
      }

      // If still empty but text contains a dot, treat entire text as candidate
      if (foundUrls.size === 0 && (trimmed.includes('.') || trimmed.includes('/'))) {
        foundUrls.set(trimmed, { url: trimmed });
      }
    }

    const extractedUrls: ExtractedUrl[] = [];
    const detailedInspections: UrlInspectionDetail[] = [];

    for (const [, item] of foundUrls) {
      const detail = this.inspectSingleUrl(item.url, item.anchorText);
      detailedInspections.push(detail);

      extractedUrls.push({
        id: crypto.randomUUID(),
        analysis_id: analysisId,
        original_url: item.url,
        hostname: detail.hostname,
        inspection_result: JSON.stringify(detail),
      });
    }

    return { extractedUrls, detailedInspections };
  }

  /**
   * Inspect a single URL with deterministic security heuristics
   */
  static inspectSingleUrl(rawUrl: string, anchorText?: string): UrlInspectionDetail {
    const flags: string[] = [];
    let hostname = '';
    let protocol = 'http:';
    let path = '';
    let isIpAddress = false;
    let isShortener = false;
    let hasPunycode = false;
    let hasExcessiveSubdomains = false;
    let hasSuspiciousKeywords = false;
    let anchorMismatch: { anchorText: string; actualHref: string } | undefined = undefined;

    // Normalize URL with protocol if missing
    let urlToParse = rawUrl.trim();
    if (!/^https?:\/\//i.test(urlToParse)) {
      urlToParse = `https://${urlToParse}`;
    }

    try {
      const parsed = new URL(urlToParse);
      hostname = parsed.hostname.toLowerCase();
      protocol = parsed.protocol;
      path = parsed.pathname + parsed.search;

      // Check non-standard ports
      if (parsed.port && !['80', '443', ''].includes(parsed.port)) {
        flags.push(`Non-standard port (:${parsed.port}) used to bypass standard web inspection`);
      }
    } catch {
      hostname = rawUrl.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase();
      flags.push('Malformed URL syntax detected');
    }

    // Check embedded @ sign (e.g. http://google.com@evil.com)
    if (rawUrl.includes('@')) {
      flags.push("Embedded userinfo '@' symbol detected; often used to trick recipients into believing destination is legitimate");
    }

    // 1. IP-based URL
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      isIpAddress = true;
      flags.push(`Direct IP-based destination (${hostname}) obscures genuine server identity`);
    }

    // 2. URL Shortener
    if (COMMON_SHORTENERS.has(hostname)) {
      isShortener = true;
      flags.push(`Known URL shortener service (${hostname}) hides final landing page`);
    }

    // 3. Punycode / IDN
    if (hostname.includes('xn--')) {
      hasPunycode = true;
      flags.push(`Punycode/IDN internationalized domain detected (${hostname}); high probability of visual homograph attack`);
    }

    // 4. Excessive Subdomains (e.g. login.secure.bank.example.com.phishsite.net)
    const domainParts = hostname.split('.');
    if (domainParts.length >= 4 && !isIpAddress) {
      hasExcessiveSubdomains = true;
      flags.push(`Excessive subdomain nesting (${domainParts.length} levels); typical of dynamic phishing infrastructure`);
    }

    // 5. High-Abuse / Suspicious TLD check
    if (domainParts.length >= 2) {
      const tld = domainParts[domainParts.length - 1];
      if (SUSPICIOUS_TLDS.has(tld)) {
        flags.push(`High-abuse top-level domain (.${tld}) heavily associated with spam and phishing campaigns`);
      }
    }

    // 6. Brand Impersonation & Typosquatting in Domain
    let matchedBrand = '';
    for (const brand of BRAND_TARGETS) {
      // Check brand name or leetspeak in hostname
      const leetBrand = brand
        .replace(/o/g, '[o0]')
        .replace(/l/g, '[l1i]')
        .replace(/i/g, '[i1l]')
        .replace(/e/g, '[e3]')
        .replace(/a/g, '[a4@]');

      const brandRegex = new RegExp(`(^|[^a-z0-9])${brand}|${leetBrand}`, 'i');
      if (hostname.includes(brand) || brandRegex.test(hostname)) {
        // Check if root domain is actually legitimate for that brand
        const isOfficial =
          hostname === `${brand}.com` ||
          hostname.endsWith(`.${brand}.com`) ||
          hostname === `${brand}.net` ||
          hostname.endsWith(`.${brand}.net`) ||
          hostname === `${brand}.org` ||
          hostname.endsWith(`.${brand}.org`) ||
          hostname === `${brand}.io` ||
          hostname.endsWith(`.${brand}.io`);

        if (!isOfficial) {
          matchedBrand = brand;
          flags.push(`Brand impersonation detected: claims or mimics "${brand}" but destination is unauthorized host "${hostname}"`);
          break;
        }
      }
    }

    // 7. Suspicious Phishing Keywords in Domain or Path
    const combinedUrl = (hostname + ' ' + path).toLowerCase();
    const matchedPhishWords = PHISH_DOMAIN_KEYWORDS.filter(k => combinedUrl.includes(k));
    if (matchedPhishWords.length > 0) {
      hasSuspiciousKeywords = true;
      flags.push(`Sensitive credential/panic keywords present (${matchedPhishWords.slice(0, 4).join(', ')})`);
    }

    // 8. Multiple Hyphens in Domain (combosquatting)
    const hyphenCount = (hostname.match(/-/g) || []).length;
    if (hyphenCount >= 2) {
      flags.push(`Multiple hyphens in domain (${hyphenCount} hyphens); characteristic of combosquatting deception`);
    }

    // 9. Base64 / Hex encoded query parameters
    if (/[?&][^=]+=(?:[A-Za-z0-9+/]{20,}={0,2}|[0-9a-fA-F]{32,})/.test(rawUrl)) {
      flags.push('Opaque encoded token/redirect payload in URL parameters');
    }

    // 10. Visible text vs actual href mismatch
    if (anchorText) {
      const cleanAnchor = anchorText.trim().toLowerCase();
      if (/^https?:\/\//i.test(cleanAnchor) || cleanAnchor.includes('.com') || cleanAnchor.includes('.org') || cleanAnchor.includes('.net')) {
        let anchorHost = '';
        try {
          const anchorParsed = new URL(cleanAnchor.startsWith('http') ? cleanAnchor : `https://${cleanAnchor}`);
          anchorHost = anchorParsed.hostname.toLowerCase();
        } catch {
          anchorHost = cleanAnchor;
        }

        if (anchorHost && hostname && !hostname.includes(anchorHost) && !anchorHost.includes(hostname)) {
          anchorMismatch = { anchorText, actualHref: rawUrl };
          flags.push(`Deceptive Hyperlink Mismatch: Visible link text claims "${anchorText}" but actual destination routes to "${hostname}"`);
        }
      }
    }

    // Rate risk
    let riskRating: UrlInspectionDetail['riskRating'] = 'safe';
    if (
      anchorMismatch ||
      matchedBrand ||
      (isIpAddress && (hasSuspiciousKeywords || path.length > 1)) ||
      hasPunycode ||
      flags.length >= 3
    ) {
      riskRating = 'critical';
    } else if (
      isIpAddress ||
      flags.length >= 2 ||
      (hasSuspiciousKeywords && (hasExcessiveSubdomains || hyphenCount >= 1)) ||
      (isShortener && hasSuspiciousKeywords)
    ) {
      riskRating = 'high';
    } else if (flags.length >= 1 || isShortener) {
      riskRating = 'medium';
    } else {
      riskRating = 'low';
    }

    const recommendation = riskRating === 'critical'
      ? 'CRITICAL THREAT: DO NOT CLICK or open this link. It exhibits active deception or brand impersonation indicators.'
      : riskRating === 'high'
      ? 'HIGH RISK: Avoid opening this URL. Manually navigate to the verified official portal if needed.'
      : riskRating === 'medium'
      ? 'SUSPICIOUS: Proceed with caution. Inspect the destination carefully before entering any credentials.'
      : 'No blatant deception signatures detected. Always verify sender context before entering credentials.';

    return {
      originalUrl: rawUrl,
      hostname,
      protocol,
      path,
      flags,
      isIpAddress,
      isShortener,
      hasPunycode,
      hasExcessiveSubdomains,
      hasSuspiciousKeywords,
      anchorTextMismatch: anchorMismatch,
      recommendation,
      riskRating,
    };
  }
}
