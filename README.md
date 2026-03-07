<p align="center">
  <img src="https://img.shields.io/badge/■-0D0D0D?style=flat-square" height="40" />
</p>

<h1 align="center">OutreachX — AI-Powered Sales Outreach OS</h1>

<p align="center">
  A full-stack, AI-driven outreach automation platform for managing leads, generating personalized emails,<br />
  building visual workflows, and converting prospects across <strong>Email · Telegram · Voice · LinkedIn</strong>.
</p>

<p align="center">
  <strong>Visual Workflow Builder</strong> · AI Message Generation (Groq LLM) · Lead Scoring Engine · Voice AI Agent · Telegram Bot · Gmail OAuth
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" />
  <img src="https://img.shields.io/badge/Vite-5-purple?logo=vite" />
  <img src="https://img.shields.io/badge/Express-4-green?logo=express" />
  <img src="https://img.shields.io/badge/MongoDB-8-darkgreen?logo=mongodb" />
  <img src="https://img.shields.io/badge/Redis-7-red?logo=redis" />
  <img src="https://img.shields.io/badge/Groq-LLaMA--3.1-orange" />
  <img src="https://img.shields.io/badge/Sarvam_AI-Voice-339933" />
  <img src="https://img.shields.io/badge/ReactFlow-11-blue" />
  <img src="https://img.shields.io/badge/Zustand-5-yellow" />
  <img src="https://img.shields.io/badge/Python-Telegram_Bot-blue?logo=python" />
  <img src="https://img.shields.io/badge/Gmail-API-red?logo=gmail" />
</p>

---

## 📌 Overview

**OutreachX** is an internal sales outreach platform that automates the entire lead-to-conversion pipeline. Import leads from CSV/Excel, build multi-step outreach workflows visually, generate AI-personalized emails using Groq LLMs, and track engagement in real time — all from a single brutalist-design dashboard.

The platform features a **30+ node visual workflow engine**, an **AI text-to-workflow generator** (describe a workflow in English and it auto-builds the graph), a **multi-layered lead scoring engine**, a **real-time Voice AI Agent** powered by Sarvam AI for phone-like conversations, and a **Telegram sales bot** with a Groq-powered conversational brain.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Visual Workflow Builder** | 30+ drag-and-drop node types across 6 categories — Triggers, Outreach, AI, Logic, Data, Safety. Build complex multi-step sequences with branching, delays, and conditional routing. |
| **AI Workflow Generator** | Type a prompt like *"Send email, if opened tag them, else follow up in 3 days"* and the AI instantly generates a complete, connected workflow graph on the canvas. |
| **AI Email Personalization** | Groq LLM (LLaMA 3.1) generates unique, personalized outreach emails for every lead based on their name, company, position, and context. Supports custom prompts and tone selection. |
| **Lead Management** | Import leads from CSV/Excel with validation. Filter, tag, segment, and track every lead's journey. Auto-deduplication by email or LinkedIn URL. |
| **Lead Scoring Engine** | 4-tier scoring system (0–100): Profile Score (role, company, industry, contact quality) + Behavior Score (opens, clicks, replies) − Penalties (bounces, unsubscribes, inactivity). |
| **Voice AI Agent** | Real-time voice conversations with leads using **Sarvam AI** (STT + TTS) and **Groq LLM** for post-call analysis. Supports Hindi and English. Detects interest level, sentiment, and next actions. |
| **Telegram Sales Bot** | Standalone Python bot with a Groq-powered conversational brain. Handles multi-turn sales conversations, qualification, and human handoff. |
| **Gmail OAuth Integration** | Send emails via Gmail API with OAuth 2.0. Automatic reply detection and thread tracking. Falls back to SMTP if not connected. |
| **Real-Time Execution** | Server-Sent Events (SSE) stream live execution progress. Node-by-node glow animations show exactly what's running. |
| **Campaign Management** | Create, configure, and track multi-workflow campaigns with assigned leads and execution history. |
| **Analytics Dashboard** | Live metrics — lead distribution, pipeline stages, scoring breakdown (Hot/Qualified/Warm/Cold), recent activity, and workflow stats. |
| **Execution Logging** | Full execution audit trail with per-lead, per-node logging. Filter by status, search by lead/message. |
| **Safety Controls** | Rate limiting (hourly + daily caps), unsubscribe checking, throttle nodes, and retry queues. Compliant by design. |

---

## 🏗️ Architecture

The system uses a **monorepo** structure with a React frontend, Node.js/Express backend, and a standalone Python Telegram bot.

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Vite + React 18)                 │
│                                                              │
│  Landing Page · Dashboard · Leads · Workflows · Campaigns   │
│  Analytics · Voice Agent · Voice Logs · Settings · Profile   │
│                                                              │
│  ReactFlow Canvas · Zustand Store · Recharts · Tailwind CSS  │
└───────────────────────────┬──────────────────────────────────┘
                            │  REST API + SSE (port 5173 → 5000)
┌───────────────────────────▼──────────────────────────────────┐
│                  Backend (Express + Node.js)                  │
│                                                              │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ API Routes  │  │ Execution Engine │  │ AI Service     │  │
│  │ /leads      │  │ 30+ node types   │  │ Groq LLaMA 3.1│  │
│  │ /workflows  │  │ Graph traversal  │  │ Msg generation │  │
│  │ /campaigns  │  │ SSE streaming    │  │ Workflow gen   │  │
│  │ /voice      │  │ Retry + throttle │  │ Custom prompts │  │
│  │ /telegram   │  └──────────────────┘  └────────────────┘  │
│  │ /dashboard  │                                             │
│  │ /ai         │  ┌──────────────────┐  ┌────────────────┐  │
│  │ /auth       │  │ Voice Agent      │  │ Email Service  │  │
│  │ /logs       │  │ Sarvam AI (STT)  │  │ Gmail API +    │  │
│  └─────────────┘  │ Sarvam AI (TTS)  │  │ SMTP Fallback  │  │
│                   │ Groq (Analysis)  │  │ Reply Detector │  │
│  ┌─────────────┐  └──────────────────┘  └────────────────┘  │
│  │ Lead Scoring│                                             │
│  │ Profile +   │  ┌──────────────────┐                       │
│  │ Behavior −  │  │ Job Queues       │                       │
│  │ Penalties   │  │ Bull + Redis     │                       │
│  └─────────────┘  │ Outreach worker  │                       │
│                   └──────────────────┘                       │
└───────────────────────────┬──────────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │  MongoDB    │  │   Redis     │  │  Telegram   │
    │  (Mongoose) │  │  (Upstash)  │  │  Bot (Py)   │
    │  7 Models   │  │  Job Queues │  │  Groq Brain │
    └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | Component-based UI with hooks |
| **Vite 5** | Dev server & production bundler |
| **ReactFlow 11** | Visual workflow canvas with custom nodes & edges |
| **Zustand 5** | Lightweight global state management |
| **Recharts** | Analytics charts and visualizations |
| **Tailwind CSS 3** | Utility-first styling with custom brutalist design system |
| **Iconify** | 200,000+ icons via `@iconify/react` |
| **React Hook Form** | Form validation and management |
| **Firebase** | Authentication (Google OAuth) |
| **React Router 6** | Client-side routing |
| **Axios** | HTTP client for API calls |

### Backend
| Technology | Purpose |
|---|---|
| **Express 4** | REST API framework |
| **Mongoose 8** | MongoDB ODM with 7 data models |
| **Groq SDK** | LLM inference (LLaMA 3.1 8B Instant) for AI message generation & workflow generation |
| **Google APIs** | Gmail OAuth 2.0 for email sending & reply tracking |
| **Nodemailer** | SMTP email fallback |
| **Bull** | Redis-backed job queues for outreach workers |
| **Sarvam AI** | Speech-to-Text (STT), Text-to-Speech (TTS), Chat, and Translation APIs for voice agent |
| **Multer** | File upload handling (CSV/Excel import) |
| **XLSX** | Excel/CSV parsing |
| **Helmet + CORS** | Security headers & cross-origin resource sharing |
| **Express Rate Limit** | API rate limiting middleware |
| **Morgan** | HTTP request logging |

### Telegram Bot (Python)
| Technology | Purpose |
|---|---|
| **python-telegram-bot** | Telegram Bot API wrapper |
| **Groq (LLaMA 3.3 70B)** | Conversational AI brain for sales qualification |
| **SQLite** | Local conversation persistence |

### Infrastructure
| Technology | Purpose |
|---|---|
| **MongoDB Atlas** | Cloud-hosted document database |
| **Upstash Redis** | Serverless Redis for job queues (REST + TCP) |
| **Docker Compose** | Local development with MongoDB + Redis containers |

---

## 📂 Project Structure

```
outreachos/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── landing/             # Landing page with scroll animations
│   │   │   │   ├── Landing.jsx
│   │   │   │   └── landing.css
│   │   │   ├── workflow/            # Visual Workflow Builder (17 components)
│   │   │   │   ├── WorkflowBuilder.jsx    # Main canvas + AI prompt bar
│   │   │   │   ├── WorkflowNode.jsx       # Custom React Flow node
│   │   │   │   ├── WorkflowEdge.jsx       # Custom animated edge
│   │   │   │   ├── workflowStore.js       # Zustand store (800+ lines)
│   │   │   │   ├── nodeTypes.js           # 30+ node type definitions
│   │   │   │   ├── NodePalette.jsx        # Drag-and-drop sidebar
│   │   │   │   ├── ConfigPanel.jsx        # Node configuration drawer
│   │   │   │   ├── ConfigForm.jsx         # Dynamic config forms per node type
│   │   │   │   ├── FloatingToolbar.jsx    # Save, run, undo/redo toolbar
│   │   │   │   ├── ExecutionLog.jsx       # Real-time execution feed
│   │   │   │   ├── LeadPickerModal.jsx    # Lead assignment modal
│   │   │   │   └── ...
│   │   │   ├── Dashboard.jsx        # Analytics dashboard with charts
│   │   │   ├── Leads.jsx            # Lead management table
│   │   │   ├── Campaigns.jsx        # Campaign management
│   │   │   ├── Analytics.jsx        # Pipeline analytics
│   │   │   ├── VoiceAgent.jsx       # Real-time voice AI interface
│   │   │   ├── VoiceLogs.jsx        # Voice conversation transcripts
│   │   │   ├── Settings.jsx         # Gmail OAuth, SMTP, API keys config
│   │   │   ├── Profile.jsx          # User profile management
│   │   │   ├── Login.jsx            # Firebase Google OAuth login
│   │   │   └── Logs.jsx             # Execution log viewer
│   │   ├── components/              # Shared UI components
│   │   ├── context/                 # Auth context provider
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── services/                # API client (Axios)
│   │   └── index.css                # 2700+ line design system
│   └── package.json
│
├── server/                          # Express Backend
│   ├── src/
│   │   ├── index.js                 # Express app entrypoint (port 5000)
│   │   ├── models/                  # Mongoose schemas
│   │   │   ├── Lead.js              # Lead data + scoring + engagement
│   │   │   ├── Workflow.js          # Workflow graph (nodes + edges)
│   │   │   ├── Campaign.js          # Campaign metadata
│   │   │   ├── Log.js               # Execution + email logs
│   │   │   ├── Conversation.js      # Voice conversation transcripts
│   │   │   ├── GmailToken.js        # OAuth token storage
│   │   │   └── User.js              # User accounts
│   │   ├── services/                # Business logic
│   │   │   ├── executionEngine.js   # Workflow graph executor (1000+ lines)
│   │   │   ├── aiService.js         # Groq LLM: messages + workflow gen
│   │   │   ├── voiceAgentService.js # Sarvam AI voice conversations
│   │   │   ├── emailService.js      # Gmail API + SMTP sending
│   │   │   ├── gmailService.js      # OAuth flow + thread tracking
│   │   │   ├── leadScoringService.js # 4-tier scoring engine
│   │   │   ├── leadValidator.js     # Lead data validation & routing
│   │   │   ├── replyDetector.js     # Email reply detection
│   │   │   ├── servamClient.js      # Sarvam AI SDK wrapper
│   │   │   └── throttleService.js   # Rate limiting logic
│   │   ├── controllers/             # Route handlers
│   │   ├── routes/                  # API route definitions
│   │   ├── middleware/              # Auth, rate limit, error handling
│   │   ├── queues/                  # Bull job queues + workers
│   │   └── scripts/                 # Seed data & utilities
│   └── package.json
│
├── telegram_bot/                    # Standalone Python Telegram Bot
│   ├── bot.py                       # Bot logic + handlers
│   ├── brain.py                     # Groq LLaMA 3.3 conversational AI
│   ├── database.py                  # SQLite persistence
│   ├── models.py                    # Data models
│   └── users.json                   # User state tracking
│
├── docker-compose.yml               # MongoDB 7 + Redis 7 containers
├── seed.json                        # Sample seed data
├── leads.csv                        # Sample lead data
└── sample_leads_valid.csv           # CSV import example
```

---

## 🎯 Workflow Engine — 30+ Node Types

The workflow builder supports **6 categories** of nodes, each with full configuration panels:

| Category | Nodes | Description |
|---|---|---|
| **Triggers** | `New Lead` · `Form Submit` · `Scheduled` · `Webhook` · `Manual Run` | Entry points that start workflow execution |
| **Outreach** | `Send Email` · `Telegram` · `LinkedIn DM` · `SMS` · `WhatsApp` · `Phone Call` · `Slack Alert` | Multi-channel outreach actions |
| **AI & Smart** | `AI Write` · `AI Lead Score` · `AI Classify` · `AI Enrich` | LLM-powered intelligence nodes |
| **Logic & Flow** | `Delay` · `If/Else` · `A/B Split` · `Loop` · `Merge` · `Wait For Event` | Branching, timing, and flow control |
| **Data & CRM** | `Update CRM` · `Add Tag` · `Remove Tag` · `Set Field` · `HTTP Request` | Data manipulation and integrations |
| **Safety** | `Throttle` · `Unsub Check` · `End` | Rate limiting and compliance |

---

## 📊 Lead Scoring System

OutreachX uses a **strict 0–100 scoring system** with three components:

```
Final Score = Profile Score (max 50) + Behavior Score (max 40) − Penalties (max −30)
```

| Component | Max Points | Criteria |
|---|---|---|
| **Role Score** | 20 | C-Level (20), VP (15), Director (12), Manager (8), Specialist (5) |
| **Company Size** | 10 | Enterprise (10), Mid-size (6), Startup (4) |
| **Industry Match** | 10 | Target industries (10), Related (5) |
| **Contact Quality** | 10 | Email + LinkedIn (10), Email only (6), LinkedIn only (4) |
| **Behavior** | 40 | Opens (2/each, cap 10), Clicks (5/each, cap 15), Reply (15), Demo request (20) |
| **Penalties** | −30 | Bounce (−20), Unsubscribe (−30), No response (−10), Negative reply (−30) |

**Score Tiers**: 🔥 Hot (81–100) · ⚡ Qualified (61–80) · 🟡 Warm (31–60) · ❄️ Cold (0–30)

---

## 🔊 Voice AI Agent

The Voice AI Agent enables **real-time voice conversations** with leads directly from the platform:

1. **Speech-to-Text**: Lead's audio is transcribed using **Sarvam AI STT** (supports Hindi + English)
2. **AI Response**: **Sarvam AI Chat API** generates contextual sales responses based on lead data
3. **Text-to-Speech**: Response is converted to natural audio using **Sarvam AI TTS**
4. **Post-Call Analysis**: **Groq LLaMA 3.3 70B** analyzes the full transcript for interest level, sentiment, key topics, and recommended next actions
5. **Score Update**: Lead engagement score is automatically updated based on conversation outcomes

---

## 🤖 Telegram Sales Bot

A standalone Python bot that handles multi-turn sales conversations:

- **Brain**: Groq LLaMA 3.3 70B Versatile for natural, human-like responses
- **Personality**: Trained as a friendly sales assistant — no hollow phrases, no chatbot feel
- **Conversation Flow**: Opens with a qualifying question → Understands pain points → Matches solutions → Handles objections → Hand-off when ready
- **Persistence**: SQLite database tracks conversation history per user
- **Safety**: Response length limits, artifact cleaning, graceful error handling

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.9 (for Telegram bot only)
- **MongoDB** (local or Atlas)
- **Redis** (local or Upstash)
- **Docker** (optional, for local MongoDB + Redis)

### 1. Clone & Install

```bash
git clone <repo-url>
cd outreachos

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..

# (Optional) Install Telegram bot dependencies
cd telegram_bot && pip install python-telegram-bot groq && cd ..
```

### 2. Start Infrastructure

```bash
# Option A: Docker (recommended for local dev)
docker-compose up -d

# Option B: Use cloud services
# Set MONGODB_URI and REDIS_URL in server/.env
```

### 3. Configure Environment

Copy `.env.example` to `.env` in both `client/` and `server/` directories and fill in your credentials.

#### Server `.env`
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/outreachos

# Redis
REDIS_URL=redis://localhost:6379

# AI (Required)
GROQ_API_KEY=your_groq_api_key

# Email — Option A: SMTP (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

# Email — Option B: Gmail OAuth 2.0
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Voice Agent (Optional)
SARVAM_API_KEY=your_sarvam_key

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your_bot_token
```

#### Client `.env`
```env
VITE_API_URL=http://localhost:5000

# Firebase Auth
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 4. Run the Application

```bash
# Terminal 1: Frontend
cd client && npm run dev

# Terminal 2: Backend
cd server && npm run dev

# Terminal 3: Telegram Bot (optional)
cd telegram_bot && python bot.py
```

Access:
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## 📜 API Routes

| Route | Method | Description |
|---|---|---|
| `/api/leads` | GET / POST | List & create leads |
| `/api/leads/import` | POST | Import from CSV/Excel |
| `/api/leads/recalculate-scores` | POST | Re-score all leads |
| `/api/workflows` | GET / POST | List & save workflows |
| `/api/workflows/:id/run` | POST | Execute workflow (SSE) |
| `/api/campaigns` | GET / POST / PUT | Campaign CRUD |
| `/api/ai/generate` | POST | Generate AI message for a lead |
| `/api/ai/generate-workflow` | POST | AI text-to-workflow generation |
| `/api/voice/start` | POST | Start voice session |
| `/api/voice/message` | POST | Process voice message |
| `/api/voice/end` | POST | End session + analyze |
| `/api/dashboard/stats` | GET | Dashboard analytics data |
| `/api/auth/google` | GET | Start Gmail OAuth flow |
| `/api/logs` | GET | Execution log history |

---

## 🧠 AI Pipeline

OutreachX uses **Groq LLM (LLaMA 3.1 8B Instant)** for three AI capabilities:

### 1. Email Personalization
```
Lead Data (name, company, position) → System Prompt → Groq → Personalized Email
```
Supports three outreach stages: Initial Outreach, Follow-up, Final Reminder. Custom prompts and tone selection (professional, casual, friendly).

### 2. Text-to-Workflow Generation
```
User Prompt → System Prompt (30 node types + rules + example) → Groq → JSON → React Flow Graph
```
The AI enforces: trigger start → AI Write before Send Email → throttle before outreach → End node on every branch.

### 3. Voice Conversation Analysis
```
Full Transcript → Groq LLaMA 3.3 70B → { interestLevel, sentiment, summary, topics, nextAction }
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `REDIS_URL` | ✅ | Redis connection URL (TCP) |
| `GROQ_API_KEY` | ✅ | Groq API key for LLM inference |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | ✅* | Gmail SMTP credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Gmail OAuth 2.0 (replaces SMTP) |
| `SARVAM_API_KEY` | Optional | Sarvam AI for voice agent |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token |
| `GEMINI_API_KEY` | Optional | Google Gemini (backup AI) |

*\*Required if not using Gmail OAuth*

---

## 📄 License

This project is built for the **COHERENCE'26 Hackathon** — Track: Sales & Outreach Systems.

<p align="center">
  Built with ❤️ by <strong>Team OutreachX</strong>
</p>
