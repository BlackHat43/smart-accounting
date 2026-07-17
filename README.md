# 📒 Daftar — AI-Powered Smart Accounting System

<p align="center">
  <img src="frontend/public/logo.png" width="170" alt="Daftar Logo">
</p>

<p align="center">
  <a href="https://youtu.be/qtoeY3qycSE" target="_blank">
    <strong>🎥 Watch Demo Video</strong>
  </a>
  <br>
  <strong>Modern Accounting Platform Powered by Artificial Intelligence</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.115-green" alt="FastAPI">
  <img src="https://img.shields.io/badge/Python-3.11-blue" alt="Python">
  <img src="https://img.shields.io/badge/SQLite-Database-lightgrey" alt="SQLite">
  <img src="https://img.shields.io/badge/Claude-AI-purple" alt="Claude">
  <img src="https://img.shields.io/badge/Status-In%20Development-orange" alt="Status">
</p>


---

# Overview

**Daftar** is a modern accounting platform designed to simplify day-to-day financial management using Artificial Intelligence.

Instead of manually creating accounting entries, users can upload invoices, manage transactions, generate reports, and receive AI-powered accounting suggestions instantly.

The system combines a modern user experience with intelligent automation to reduce manual work while keeping accountants fully in control of financial decisions.

---

# Features

### AI Invoice Analysis

- Upload invoice images
- OCR-powered invoice extraction using Claude AI
- Automatically extracts:
  - Vendor
  - Invoice Date
  - Amount
  - Tax Amount
  - Description
- Generates suggested accounting entries

---

### AI Accounting Assistant

- Intelligent accounting assistant
- Suggests debit and credit accounts
- Explains accounting entries
- Confidence score
- Accounting recommendations

---

### Transactions Management

- Create transactions manually
- AI-generated transactions
- Edit transactions
- Delete transactions
- Approve transactions
- Search transactions
- Filter by category

---

### Financial Reports

- Income Statement
- Balance Sheet
- Net Profit
- Revenue Summary
- Expenses Summary

---

### Accounts

- Interactive chart of accounts
- View account balances
- Account movements
- Detailed transaction history

---

### Dashboard

- Financial summary
- Revenue overview
- Expenses overview
- Net Profit
- Recent transactions
- Charts & statistics

---

### User Features

- Login
- Registration
- Profile management
- JWT Authentication
- Arabic / English interface
- Responsive UI

---

### Guided Tour

Interactive onboarding tour that introduces new users to the application's main features.

---

### Notifications

Modern toast notifications for:

- Success
- Errors
- Warnings
- Information

---

# Technologies

## Frontend

- React
- Axios
- Chart.js
- HTML5
- CSS3

## Backend

- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- JWT Authentication

## AI

- Anthropic Claude API

---

# Project Structure

```
smart-accounting/

│
├── backend/
│   ├── routers/
│   ├── database.py
│   ├── models.py
│   ├── auth.py
│   ├── transactions.py
│   └── main.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   │
│   ├── api/
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── InvoiceUpload.jsx
│   │   ├── Login.jsx
│   │   ├── DevLogin.jsx
│   │   ├── AIAssistant.jsx
│   │   ├── ProfileModal.jsx
│   │   ├── Toast.jsx
│   │   └── OnboardingTour.jsx
│   │
│   ├── App.js
│   └── index.js
│
└── README.md
```

---

# Getting Started

## Clone Repository

```bash
git clone https://github.com/BlackHat43/smart-accounting.git
```

---

## Backend

```bash
cd backend
```

Create Virtual Environment

```bash
python -m venv venv
```

Activate

Windows

```bash
venv\Scripts\activate
```

Linux / macOS

```bash
source venv/bin/activate
```

Install packages

```bash
pip install -r requirements.txt
```

Run FastAPI

```bash
uvicorn main:app --reload
```

Backend

```
http://localhost:8000
```

---

## Frontend

```bash
cd frontend
```

Install packages

```bash
npm install
```

Run

```bash
npm start
```

Frontend

```
http://localhost:3000
```

---

# Environment Variables

Create a `.env` file inside **backend/**

```env
ANTHROPIC_API_KEY=your_api_key
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

This allows reviewers and developers to explore the application immediately without manually creating a new account.

---

# Current Status

The project is currently under active development.

The current release includes the core accounting workflow together with AI-assisted features.

Additional capabilities and improvements are continuously being added.

---

# Roadmap

Planned improvements include:

- PDF invoice export
- Excel export
- Invoice attachments per transaction
- Advanced analytics
- Multi-company support
- Cloud database support
- Audit logs
- Role-based permissions
- Backup & Restore
- Mobile optimization

---

# Screenshots

Place screenshots inside

```
screenshots/
```

Example

```
screenshots/
├── dashboard.png
├── transactions.png
├── reports.png
├── ai-assistant.png
├── invoice-upload.png
└── accounts.png
```

---

# Security

- JWT Authentication
- Password hashing
- Input validation
- SQLAlchemy ORM
- Protected API endpoints

---

# Built With

- React
- FastAPI
- SQLAlchemy
- SQLite
- Anthropic Claude AI

---

# Contributing

Contributions, ideas, and improvements are always welcome.

Feel free to open an Issue or submit a Pull Request.




