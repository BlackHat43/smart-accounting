# 📒 Daftar — AI-Powered Smart Accounting System

<p align="center">
  <img src="frontend/public/logo.png" width="170" alt="Daftar Logo">
</p>

<p align="center">
  <a href="https://smart-accounting-pi.vercel.app" target="_blank">
    <strong>Web Site</strong>
  </a>
  <br>
  <strong>Modern Accounting Platform Powered by Artificial Intelligence</strong>
</p>

<p align="center">
  <a href="https://youtu.be/qtoeY3qycSE" target="_blank">
    <strong>🎥 Watch Demo Video</strong>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.115-green" alt="FastAPI">
  <img src="https://img.shields.io/badge/Python-3.11-blue" alt="Python">
  <img src="https://img.shields.io/badge/PostgreSQL-Production%20DB-336791" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/SQLite-Local%20Dev-lightgrey" alt="SQLite">
  <img src="https://img.shields.io/badge/Claude-Sonnet%205-purple" alt="Claude">
  <img src="https://img.shields.io/badge/Status-Working%20%7C%20Actively%20Improved-brightgreen" alt="Status">
</p>

---

# Overview

**Daftar** is a modern accounting platform built around a real **double-entry bookkeeping engine**, not just a transaction logger. Every entry is broken into balanced debit/credit lines, and the AI layer (Claude) helps classify, split, and explain each one — while the accountant stays fully in control through an explicit approval workflow.

The system is live, connected to a **persistent PostgreSQL database** (Neon), and actively used end-to-end: registration, entry creation (manual / natural language / invoice photo), approval, reporting, and PDF export all work in production today.

---

# What's New (Major Update)

This release replaced the original single-line prototype with a genuinely production-shaped accounting core:

### Real Double-Entry Accounting
- Every transaction is a set of **lines** (not one debit + one credit field) — a single entry can touch several account groups at once (e.g. buying a car partly in cash, partly on credit correctly splits into asset increase + cash decrease + liability increase)
- Lines are validated server-side: **debits must equal credits**, or the entry is rejected with a clear error
- Totals, reports, and account balances are computed by walking each line's normal balance (debit-increase vs. credit-increase), not by naive summation

### Approval Is Now Meaningful
- An unapproved entry is visible for review but is **never included in any total, report, or balance** (posting only happens on approval)
- "Reviewed" and "Approved" are independent, explicit flags — a reviewer can't be marked without prior approval
- Every state change (created, edited, approved, reviewed) is written to a per-entry **audit trail**, including who did it and whether it originated from AI

### Smarter, More Accountable AI
- AI suggestions use **structured tool-calling** (not free-text JSON parsing), which removes an entire class of malformed-response failures
- The AI now **learns from the business's own recently approved entries** to stay consistent with how each company actually classifies its accounts
- Every AI suggestion carries a visible **confidence level** (high / medium / low)
- The business's industry/type is captured once and passed to every AI call for more relevant suggestions
- If something critical is ambiguous (e.g. payment method on an invoice), the AI asks instead of guessing

### Three Ways to Create an Entry
- **Manual** — full guided form with AI-assisted line suggestions
- **Natural language** — describe the transaction in one sentence, AI builds the full balanced entry
- **Invoice photo** — upload an image, Claude's vision extracts vendor/date/amount/tax and proposes the entry

### Attachments, Reports & Receivables
- Files (invoices/documents) can be attached to any entry, and are mandatory for invoice-type entries
- Accounts Receivable / Payable are tracked with due dates, with a dismissible reminder panel for upcoming/overdue customer invoices
- Income Statement and Balance Sheet are generated live from posted entries, with a downloadable, Arabic-native **PDF export** (branded, print-ready) for both statements and per-account statements

### Real Persistent Storage
- Production database is **PostgreSQL (Neon)** — no data loss between deployments or server restarts
- Local development still uses SQLite automatically with zero extra setup

---

# Features

### AI Invoice Analysis
- Upload invoice images
- Claude Vision extracts vendor, date, amount, tax, and description
- Asks for clarification (e.g. payment method) instead of assuming when unclear
- Generates a full balanced multi-line entry, not just a category guess

### AI Accounting Assistant ("Sanad")
- Answers questions about the business's real financial data (not general knowledge)
- Suggests and explains debit/credit classification with a confidence score

### Transactions Management
- Manual / natural-language / invoice-based entry creation
- Multi-line double-entry editor with live balance validation
- Edit, delete, approve, review, and filter (by account, status, or receivable/payable)
- Full per-entry audit trail
- File attachments

### Financial Reports
- Income Statement & Balance Sheet, computed from posted entries only
- Per-account statements
- Branded, Arabic-native PDF export for all reports

### Accounts
- Interactive chart of accounts with real balances (assets, liabilities, equity, revenue, COGS, expenses)
- Category breakdown charts driven by real transaction data
- Detailed drill-down transaction history per account

### Dashboard
- Live financial summary and net profit/loss (color-coded)
- Revenue/expense distribution charts
- Receivables & payables at a glance
- Due-date reminders
- Recent transactions

### User Features
- Login / registration, JWT authentication, password hashing
- Editable profile, including business type/industry
- Arabic / English interface
- Guided onboarding tour
- Toast notifications

---

# Technologies

## Frontend
- React
- Axios
- Recharts

## Backend
- FastAPI
- SQLAlchemy
- **PostgreSQL** (production) / SQLite (local development, automatic)
- Pydantic
- JWT Authentication (python-jose, passlib)
- ReportLab + arabic-reshaper + python-bidi (Arabic PDF generation)

## AI
- Anthropic Claude API (Sonnet 5) — structured tool-calling for suggestions, Vision for invoice analysis

---

# Project Structure

```
smart-accounting/
│
├── backend/
│   ├── routers/
│   │   ├── auth.py
│   │   └── transactions.py
│   ├── fonts/
│   │   └── NotoNaskhArabic-Regular.ttf
│   ├── database.py
│   ├── models.py
│   ├── security.py
│   ├── pdf_utils.py
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js
│   │   ├── assets/
│   │   │   └── icons/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── InvoiceUpload.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── DevLogin.jsx
│   │   │   ├── AIAssistant.jsx
│   │   │   ├── ProfileModal.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── OnboardingTour.jsx
│   │   ├── App.js
│   │   └── index.js
│
└── README.md
```

---

# Getting Started

## Clone Repository
```bash
git clone https://github.com/BlackHat43/smart-accounting.git
```

## Backend
```bash
cd backend
python -m venv venv
```

Activate — Windows:
```bash
venv\Scripts\activate
```

Activate — Linux / macOS:
```bash
source venv/bin/activate
```

Install & run:
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

## Frontend
```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

---

# Environment Variables

Create a `.env` file inside **backend/**:

```env
ANTHROPIC_API_KEY=your_api_key

# Optional — leave unset to use local SQLite automatically.
# Required in production (e.g. a Neon/Postgres connection string).
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

---

# Developer Demo Account

For quick testing, the project includes a built-in developer login.

**Email**
```text
dev
```

**Password**
```text
dev
```

If the account does not already exist, it will be created automatically during the first login.

---

# Current Status

The core accounting engine — double-entry validation, AI-assisted entry creation, approval workflow, reporting, and PDF export — is **live and working end-to-end** against a persistent production database.

The project remains under active development: the workflow above is solid, but usability, analytics depth, and a few edge cases are still being refined.

---

# Roadmap

- Predictive analytics (e.g. proactive cash-flow warnings based on transaction patterns)
- Excel export
- Multi-company support
- Direct bank feed integration
- Role-based permissions
- Mobile-optimized layout
- Backup & restore tooling

---

# Security

- JWT authentication
- Password hashing (bcrypt)
- Input validation (Pydantic)
- SQLAlchemy ORM (parameterized queries)
- Per-entry audit trail
- API inputs sent to Claude are never used for model training and are auto-deleted after 7 days (Anthropic API data policy)

---

# Built With

- React
- FastAPI
- SQLAlchemy
- PostgreSQL (Neon) / SQLite
- Anthropic Claude AI
- ReportLab

---

# Contributing

Contributions, ideas, and improvements are always welcome.
Feel free to open an Issue or submit a Pull Request.
