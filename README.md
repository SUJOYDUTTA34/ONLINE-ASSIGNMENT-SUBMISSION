# Scholaris Academic — Online Assignment Submission & Assessment System

Scholaris Academic is an institutional portal for managing assignments, submissions, rubrics, grading, audit logs, and academic integrity workflows.

---

## 🔒 Security Notice & Secret Safety Guide

> ⚠️ **CRITICAL: Rotate Previously Hardcoded Secrets Immediately**
> If any API keys, database URLs, or service credentials were previously hardcoded in earlier commits or configuration files, **those values remain in Git commit history**.
> - **Immediately revoke and rotate** any keys, database tokens, or third-party credentials via their respective dashboards.
> - Never commit `.env` files to source control.

---

## 🛠️ Environment Variables Configuration

Copy `.env.example` to `.env` and provide the appropriate values:

```bash
cp .env.example .env
```

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server-Side Only | API key for Gemini AI capabilities. |
| `APP_URL` | Application | The base domain URL where the application is deployed. |

---

## 🛡️ Secret Handling Rules Enforced in this Codebase

1. **No Hardcoded Credentials**: No string literals containing API keys, database connection strings, or service tokens exist in the source code.
2. **Graceful Fallback**: The system defaults to secure client-side persistent local storage with zero runtime crashes.
3. **Log Sanitization**: Error handlers and logging statements only log generic error messages and do not echo raw secret keys or tokens.
4. **Git Isolation**: `.env*` files (except `.env.example`) are ignored by `.gitignore`.

---

## 🚀 Getting Started

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```
