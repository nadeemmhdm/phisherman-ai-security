import { initDatabase, conversationRepo, messageRepo, analysisRepo, findingRepo, stepRepo, settingsRepo } from './server/dist/db/database.js';
import { DetectionEngine } from './server/dist/services/detectionEngine.js';
import { HeaderForensicsService } from './server/dist/services/headerForensicsService.js';
import { UrlAnalysisService } from './server/dist/services/urlAnalysisService.js';
import { EmailParserService } from './server/dist/services/emailParserService.js';
import { DualModelService } from './server/dist/services/dualModelService.js';
import crypto from 'crypto';

async function runAllTests() {
  console.log('=== STARTING PHISHERMAN VERIFICATION TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Database Initialization
  console.log('--- Test 1: SQLite Database Initialization & Settings ---');
  await initDatabase();
  const settings = settingsRepo.get();
  assert(settings && settings.id === 'default', 'Settings default record loaded');
  assert(settings.selected_model.includes('llama'), 'Default selected model is configured');

  // 2. Conversation & Message Persistence
  console.log('\n--- Test 2: Conversation & Message CRUD Persistence ---');
  const convId = crypto.randomUUID();
  const conv = conversationRepo.create(convId, 'Test Phishing Investigation');
  assert(conv.id === convId && conv.title === 'Test Phishing Investigation', 'Conversation created');

  conversationRepo.updateTitle(convId, 'Updated Investigation Title');
  const fetchedConv = conversationRepo.getById(convId);
  assert(fetchedConv.title === 'Updated Investigation Title', 'Conversation title updated');

  const msgId = crypto.randomUUID();
  const userMsg = messageRepo.create({
    id: msgId,
    conversation_id: convId,
    role: 'user',
    content: 'Can you investigate this email?',
    message_type: 'chat',
  });
  assert(userMsg.id === msgId, 'User message persisted');
  const history = messageRepo.getByConversation(convId);
  assert(history.length === 1 && history[0].content === 'Can you investigate this email?', 'Message history retrieved');

  // 3. Email Header Forensics & SPF/DKIM/DMARC
  console.log('\n--- Test 3: Email Header Forensics ---');
  const rawHeaders = `Authentication-Results: mx.google.com; spf=fail (domain does not permit 198.51.100.24); dkim=fail; dmarc=fail (p=REJECT)
Received: from mail.untrusted-relay.net ([198.51.100.24]) by mx.google.com with ESMTPS
From: PayPal Security Support <security-service@paypal-verification.xyz>
Return-Path: <bounce@unrelated-hacker-domain.com>
Reply-To: phish-collector@mailinator.com
Subject: URGENT: Account Suspension Notice`;

  const parsedHeaderList = EmailParserService.parseRawHeaders(rawHeaders);
  assert(parsedHeaderList.length >= 5, `Parsed ${parsedHeaderList.length} header fields correctly`);

  const authResults = HeaderForensicsService.analyse(
    parsedHeaderList,
    'PayPal Security Support <security-service@paypal-verification.xyz>',
    'phish-collector@mailinator.com',
    '<bounce@unrelated-hacker-domain.com>'
  );

  assert(authResults.spf.status === 'Fail', 'SPF detected as Fail');
  assert(authResults.dmarc.status === 'Fail', 'DMARC detected as Fail');
  assert(authResults.identityMismatch.hasMismatch === true, 'Identity mismatch identified across Return-Path and Reply-To');
  assert(authResults.identityMismatch.details.length >= 2, 'Detailed mismatch explanations generated');

  // 4. URL Intelligence & Deception Inspection
  console.log('\n--- Test 4: URL Intelligence Engine ---');
  const sampleBody = `Please click the link below to verify your account:
http://198.51.100.24/auth/verify?token=928374
Or visit our alternative portal:
http://tinyurl.com/fake-paypal-verify
Official portal: https://login.paypal.com.account-security-update.xyz/signin`;

  const urlResults = UrlAnalysisService.extractAndInspect(sampleBody, undefined, 'test-analysis-id');
  assert(urlResults.extractedUrls.length >= 3, `Extracted ${urlResults.extractedUrls.length} URLs`);

  const ipUrl = urlResults.detailedInspections.find(u => u.isIpAddress);
  assert(ipUrl !== undefined, 'IP-based hostname flagged as deceptive');
  assert(ipUrl.riskRating === 'critical' || ipUrl.riskRating === 'high', 'IP URL assigned Critical/High risk');

  const shortenerUrl = urlResults.detailedInspections.find(u => u.isShortener);
  assert(shortenerUrl !== undefined, 'URL shortener flagged');

  const brandImpersonationUrl = urlResults.detailedInspections.find(u => u.hostname.includes('paypal.com.'));
  assert(brandImpersonationUrl !== undefined, 'Brand impersonation lookalike domain flagged');

  // 5. Full Email Investigation Flow (DetectionEngine)
  console.log('\n--- Test 5: Full Multi-Stage Investigation & Report Generation ---');
  const investigationResult = await DetectionEngine.runInvestigation({
    conversationId: convId,
    subject: 'URGENT: Your PayPal Account Has Been Suspended Within 24 Hours',
    senderEmail: 'PayPal Security Support <security-service@paypal-verification.xyz>',
    emailBody: sampleBody,
    rawHeaders: rawHeaders,
    analysisMode: 'deep',
    selectedModel: 'llama3:latest',
  });

  const analysis = investigationResult.analysis;
  const findings = investigationResult.findings;

  assert(analysis.classification === 'LIKELY PHISHING', `Overall Classification is ${analysis.classification}`);
  assert(analysis.confidence_level === 'High confidence', `Confidence Level is ${analysis.confidence_level}`);
  assert(findings.length >= 3, `Generated ${findings.length} verifiable suspicious findings`);

  const displaySpoof = findings.find(f => f.finding_type === 'display_name_spoofing');
  assert(displaySpoof !== undefined, 'Display name impersonation finding extracted');

  const authFailFinding = findings.find(f => f.finding_type === 'auth_spf_fail' || f.finding_type === 'auth_dmarc_fail');
  assert(authFailFinding !== undefined, 'Authentication failure finding extracted');

  // Verify interactive finding structure (Section 8)
  const firstFinding = findings[0];
  assert(firstFinding.title.length > 0, 'Finding has descriptive title');
  assert(firstFinding.evidence.length > 0, 'Finding references actual observed email evidence');
  assert(firstFinding.explanation.length > 0, 'Finding contains security explanation');
  assert(firstFinding.recommendation.length > 0, 'Finding contains recommended action');

  // 6. Report Persistence & Retrievability
  console.log('\n--- Test 6: Investigation Context Persistence ---');
  const savedAnalysis = analysisRepo.getById(analysis.id);
  assert(savedAnalysis !== undefined, 'Analysis record persisted to SQLite');
  const savedFindings = findingRepo.getByAnalysisId(analysis.id);
  assert(savedFindings.length === findings.length, 'Findings persisted to SQLite');

  // 7. Legitimate Email Test
  console.log('\n--- Test 7: Legitimate Email Non-Phishing Evaluation ---');
  const legitResult = await DetectionEngine.runInvestigation({
    conversationId: convId,
    subject: 'Your GitHub Weekly Digest',
    senderEmail: 'GitHub Notifications <notifications@github.com>',
    emailBody: 'Here is your weekly summary of activity on GitHub. Visit your settings at https://github.com/settings to configure notifications.',
    rawHeaders: 'Authentication-Results: mx.google.com; spf=pass; dkim=pass; dmarc=pass',
    analysisMode: 'quick',
  });

  assert(
    legitResult.analysis.classification === 'LIKELY LEGITIMATE' || legitResult.analysis.classification === 'SUSPICIOUS',
    `Legitimate email classification: ${legitResult.analysis.classification}`
  );
  assert(legitResult.findings.length === 0, 'No false positive critical findings triggered on benign GitHub notification');

  // 8. Dual-Model Cross-Validation
  console.log('\n--- Test 8: Dual-Model Comparison Workflow ---');
  const comparison = await DualModelService.compareModels(
    analysis,
    findings,
    'mistral:latest'
  );
  assert(comparison.primaryModel === 'llama3:latest', 'Primary model recorded');
  assert(comparison.secondaryModel === 'mistral:latest', 'Secondary model recorded');
  assert(comparison.comparisonSummary.length > 50, 'Consensus summary generated');

  // Summary
  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
