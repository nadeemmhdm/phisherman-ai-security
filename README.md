# PhisherMan — Local AI Email Security & Phishing Detection Assistant

An intelligent, modern, locally hosted AI-powered Email Security and Phishing Forensic application with a Claude AI-inspired user interface, powered by local Ollama AI models, SQLite persistence, and multi-stage threat analysis.

---

## 🌟 Key Features

### 1. Claude AI-Inspired Interface
- **Minimal, modern design:** Warm neutral & dark slate themes, typography, subtle glassmorphism, rounded components.
- **Collapsible sidebar:** Categorized conversation history (*Today*, *Yesterday*, *Previous 7 Days*, *Older*), real-time search, conversation renaming & deletion.
- **Live Ollama status:** Dynamic model selector, active connection status badge (green pulse for online, amber/red for offline with actionable tips), model switching without restart.

### 2. Normal AI Chat Mode
- Operates as a cybersecurity advisor.
- Discuss email threats, BEC (Business Email Compromise), malware lures, SPF/DKIM/DMARC protocols, or general cyber defense.
- Streaming responses with real-time thinking indicators and markdown formatting.

### 3. Step-by-Step Email Collection Wizard
Collects email information progressively rather than demanding a huge form up front:
1. **Email Subject:** Subject prompt with quick-sample presets (PayPal Phish, CEO Wire BEC).
2. **Sender Email:** Syntax validation, whitespace protection, domain syntax checking.
3. **Email Body:** Multiline plain text or raw HTML email support.
4. **Optional Forensics:** `.eml` drag-and-drop file upload, raw headers paste, attachment metadata inspection, or skip.
5. **Confirmation Summary:** Compact card reviewing all collected evidence with inline edit buttons before investigation.
6. **Active Investigation:** Multi-stage progress tracking across 9 forensic phases.

### 4. Advanced Forensic Detection Engine
Evaluates 18 security threat vectors:
- Display-name spoofing and lookalike domain impersonation
- Return-Path vs From vs Reply-To address discrepancies
- Psychological urgency, coercion, suspension threats, and credential hooks
- Suspicious URLs: IP-based hostnames, URL shorteners, punycode/IDN attacks, high subdomain depth, visible text vs href mismatch
- Attachment risks: executable extensions, double extensions (`invoice.pdf.exe`), MIME mismatches
- Cryptographic authentication: SPF, DKIM, DMARC parsing (*Pass*, *Fail*, *Softfail*, *Neutral*, *None*, *Not checked*)
- Strict prompt fencing to neutralize prompt injection attacks inside untrusted email bodies.

### 5. Interactive Evidence Inspection
Every suspicious finding includes an interactive **[View Evidence]** button opening a detailed inspector modal:
- Finding title & severity rating (*Critical*, *High*, *Medium*, *Low*)
- Original email excerpt with highlighted suspicious text
- Why it was flagged & security implications
- AI explanation & recommended actions
- **"Ask AI About This Finding"** button that automatically injects a follow-up inquiry into the conversation.

### 6. Conversational AI Analysis (Follow-Up Support)
The investigation report is part of an ongoing conversation:
- Ask follow-up questions: *"Why did you classify it as phishing?"*, *"Explain the sender domain problem in simple language"*, *"Explain in Malayalam"*, *"Is this link definitely malicious?"*, *"What should I do next?"*
- Full investigation context (subject, sender, body, parsed headers, URLs, previous findings) is preserved and supplied to Ollama.
- English and Malayalam (`ml`) language options.

### 7. Dual-Model Cross-Validation
- Compare two installed Ollama models (e.g., `llama3` and `mistral`) independently analyzing the exact same email evidence.
- Highlights consensus agreement or divergence points.

### 8. Forensic Tools & Export
- **URL Intelligence Inspector:** Safe static inspection without HTTP navigation.
- **Header Forensics Tool:** Direct SPF/DKIM/DMARC inspection.
- **Export as Markdown (`.md`):** One-click download of the forensic dossier.
- **Printable Dossier / PDF:** Clean, professional print view formatted for saving as PDF.
- **SQLite Database Persistence:** All conversations, messages, analyses, findings, and settings persist across restarts.
- **Database Backup & Restore:** Export and import full database state via JSON.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Boxicons, React Markdown, Remark GFM.
- **Backend:** Node.js, Express.js, TypeScript, Mailparser, Multer.
- **Database:** SQLite (via resilient WebAssembly `sql.js` with WAL mode and binary persistence to `server/data/phisherman.db`).
- **AI Integration:** Ollama Local API (`http://localhost:11434`), streaming SSE responses, dynamic model discovery.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **npm** v9+
- **Ollama** installed locally ([ollama.com](https://ollama.com))

To install and pull models in Ollama:
```bash
ollama pull llama3
ollama pull mistral
ollama serve
```
*(Note: If Ollama is offline or no models are downloaded yet, PhisherMan automatically provides clear status feedback and operates with its local deterministic threat engine!)*

### 2. Installation
Clone or navigate to the repository:
```bash
cd PHISHER_MAN
npm run install:all
```

### 3. Build the Application
```bash
npm run build
```

### 4. Run Development Servers
To run both backend (`http://127.0.0.1:5000`) and frontend (`http://localhost:5173`) concurrently:
```bash
npm run dev
```

Or run them individually in separate terminals:
```bash
# Terminal 1: Backend API
npm run dev:server

# Terminal 2: Frontend Client
npm run dev:client
```

Open your browser at **`http://localhost:5173`**.

---

## 🧪 Automated Test Suite

PhisherMan includes an end-to-end verification test suite testing all 32 core capabilities:
- Database schema and settings initialization
- Conversation and message CRUD persistence
- Email header forensics (SPF, DKIM, DMARC, Return-Path mismatch)
- URL intelligence (IP hostnames, shorteners, lookalikes)
- Multi-stage investigation and report synthesis
- Display-name spoofing and urgent threat extraction
- Legitimate email non-phishing verification
- Dual-model cross-validation

Run the test suite anytime:
```bash
node test_system.mjs
```

---

## 🔒 Security Architecture
- **Localhost-Only Binding:** Backend binds strictly to `127.0.0.1` by default.
- **No Remote Telemetry:** No email data or user conversations are sent to external cloud APIs.
- **Untrusted Input Fencing:** Email content is strictly quarantined inside `<untrusted_email_content>` tags with instructions prohibiting execution of embedded commands.
- **Safe Static Inspection:** URLs and attachments are parsed and hashed statically without opening remote connections or executing binaries.

---

## 📄 License
MIT License.
