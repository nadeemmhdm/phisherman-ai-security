export type AuthStatus = 'Pass' | 'Fail' | 'Softfail' | 'Neutral' | 'None' | 'Not checked';

export interface AuthInspectionResult {
  spf: {
    status: AuthStatus;
    details: string;
    raw?: string;
  };
  dkim: {
    status: AuthStatus;
    details: string;
    raw?: string;
  };
  dmarc: {
    status: AuthStatus;
    details: string;
    raw?: string;
  };
  identityMismatch: {
    hasMismatch: boolean;
    details: string[];
  };
  routingSummary: {
    hopCount: number;
    suspiciousHops: string[];
    originIp?: string;
  };
}

export class HeaderForensicsService {
  /**
   * Analyse email headers with forensic precision
   */
  static analyse(
    headers: Array<{ name: string; value: string }>,
    senderEmail: string,
    replyTo?: string,
    returnPath?: string
  ): AuthInspectionResult {
    let spfStatus: AuthStatus = 'Not checked';
    let spfDetails = 'No SPF header or Authentication-Results header found.';
    let spfRaw = '';

    let dkimStatus: AuthStatus = 'Not checked';
    let dkimDetails = 'No DKIM result found in headers.';
    let dkimRaw = '';

    let dmarcStatus: AuthStatus = 'Not checked';
    let dmarcDetails = 'No DMARC result found in headers.';
    let dmarcRaw = '';

    const identityMismatches: string[] = [];
    const suspiciousHops: string[] = [];
    let originIp = '';
    let hopCount = 0;

    for (const h of headers) {
      const name = h.name.toLowerCase();
      const val = h.value;

      // Authentication-Results or ARC-Authentication-Results
      if (name === 'authentication-results' || name === 'arc-authentication-results') {
        // SPF in Auth-Results
        const spfMatch = val.match(/spf=([a-z]+)/i);
        if (spfMatch) {
          spfStatus = this.normalizeAuthStatus(spfMatch[1]);
          spfDetails = `SPF parsed from ${h.name}: ${spfMatch[0]}`;
          spfRaw = val;
        }

        // DKIM in Auth-Results
        const dkimMatch = val.match(/dkim=([a-z]+)/i);
        if (dkimMatch) {
          dkimStatus = this.normalizeAuthStatus(dkimMatch[1]);
          dkimDetails = `DKIM parsed from ${h.name}: ${dkimMatch[0]}`;
          dkimRaw = val;
        }

        // DMARC in Auth-Results
        const dmarcMatch = val.match(/dmarc=([a-z]+)/i);
        if (dmarcMatch) {
          dmarcStatus = this.normalizeAuthStatus(dmarcMatch[1]);
          dmarcDetails = `DMARC parsed from ${h.name}: ${dmarcMatch[0]}`;
          dmarcRaw = val;
        }
      }

      // Received-SPF header
      if (name === 'received-spf') {
        const spfDirectMatch = val.match(/^([a-z]+)/i);
        if (spfDirectMatch && spfStatus === 'Not checked') {
          spfStatus = this.normalizeAuthStatus(spfDirectMatch[1]);
          spfDetails = `Direct Received-SPF header: ${val.substring(0, 150)}`;
          spfRaw = val;
        }
      }

      // DKIM-Signature header existence
      if (name === 'dkim-signature' && dkimStatus === 'Not checked') {
        dkimStatus = 'Neutral';
        dkimDetails = 'DKIM-Signature header present, but no verification result recorded by MTA.';
        dkimRaw = val.substring(0, 100);
      }

      // Received hops
      if (name === 'received') {
        hopCount++;
        // Check for public IP / origin
        const ipMatch = val.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
        if (ipMatch && !originIp) {
          originIp = ipMatch[1];
        }

        // Check for suspicious anomalies (dynamic dial-up, residential broadband hostnames)
        if (/dsl|dynamic|broadband|cable|pool|dhcp/i.test(val)) {
          suspiciousHops.push(`Hop contains residential/dynamic host indicator: ${val.substring(0, 100)}...`);
        }
      }
    }

    // Sender identity vs Return-Path / Reply-To comparison
    const senderDomain = this.extractDomain(senderEmail);

    if (returnPath) {
      const returnPathClean = returnPath.replace(/[<>]/g, '').trim();
      const returnPathDomain = this.extractDomain(returnPathClean);
      if (senderDomain && returnPathDomain && senderDomain !== returnPathDomain) {
        identityMismatches.push(
          `Sender domain (${senderDomain}) differs from Return-Path domain (${returnPathDomain}). This is frequently seen in spoofed emails.`
        );
      }
    }

    if (replyTo) {
      const replyToClean = replyTo.replace(/[<>]/g, '').trim();
      const replyToDomain = this.extractDomain(replyToClean);
      if (senderDomain && replyToDomain && senderDomain !== replyToDomain) {
        identityMismatches.push(
          `Sender domain (${senderDomain}) differs from Reply-To address domain (${replyToDomain}). Replies will be routed to a different destination.`
        );
      }
    }

    return {
      spf: { status: spfStatus, details: spfDetails, raw: spfRaw },
      dkim: { status: dkimStatus, details: dkimDetails, raw: dkimRaw },
      dmarc: { status: dmarcStatus, details: dmarcDetails, raw: dmarcRaw },
      identityMismatch: {
        hasMismatch: identityMismatches.length > 0,
        details: identityMismatches,
      },
      routingSummary: {
        hopCount,
        suspiciousHops,
        originIp,
      },
    };
  }

  private static normalizeAuthStatus(statusStr: string): AuthStatus {
    const s = statusStr.toLowerCase();
    if (s.includes('pass')) return 'Pass';
    if (s.includes('fail')) return 'Fail';
    if (s.includes('softfail')) return 'Softfail';
    if (s.includes('neutral')) return 'Neutral';
    if (s.includes('none')) return 'None';
    return 'Not checked';
  }

  private static extractDomain(email: string): string {
    const at = email.lastIndexOf('@');
    if (at === -1) return '';
    return email.substring(at + 1).toLowerCase().trim();
  }
}
