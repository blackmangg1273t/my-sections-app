export type SiteSection = {
  id: string
  title: string
  description: string
  content: string
  createdAt: string
  tags: string[]
  highlights: string[]
}

export const sections: SiteSection[] = [
  {
    id: 'secure-messaging-platform',
    title: 'Secure Messaging Platform',
    description:
      'Prompt لبناء منصة مراسلة آمنة بمستوى إنتاجي، مع تشفير طرفي حقيقي، بنية قابلة للتوسع، وتوثيق واختبارات كاملة.',
    createdAt: '2026-07-09',
    tags: ['Security', 'E2EE', 'FastAPI', 'React', 'Docker'],
    highlights: [
      'Frontend: React, TypeScript, TailwindCSS, Vite.',
      'Backend: FastAPI, PostgreSQL, Redis, WebSockets.',
      'Authentication: email verification, Argon2id, JWT, refresh tokens, MFA, device/session management.',
      'End-to-End Encryption: private keys stay on client, server stores ciphertext only, Signal Protocol concepts where appropriate.',
      'Production readiness: Docker, Nginx, monitoring, admin dashboard, tests, docs, and OWASP guidance.',
    ],
    content: `PROMPT

You are a senior security engineer, cryptographer, and full-stack architect with 20+ years of experience.

Your task is to build a production-grade secure messaging platform from scratch.

The highest priority is security, privacy, performance, scalability, and clean architecture.

The platform must be designed as if it will be used by millions of users.

General Requirements
Build a modern web application.

Technology Stack

Frontend:

React

TypeScript

TailwindCSS

Vite

Backend:

FastAPI (Python)

PostgreSQL

Redis

WebSockets

Deployment:

Docker

Docker Compose

Nginx Reverse Proxy

Authentication
Implement:

Email Verification

Strong Password Policy

Argon2id password hashing

JWT Access Tokens

Refresh Tokens

Session Management

Device Management

Login History

Multi-Factor Authentication (TOTP)

Optional Passkeys (WebAuthn)

End-to-End Encryption
Implement real End-to-End Encryption.

Requirements:

Every user owns a public/private key pair.

Private key never leaves the client.

Messages encrypted before leaving the browser.

Server stores only ciphertext.

Server cannot decrypt messages.

Use the Signal Protocol concepts where appropriate (Double Ratchet, X3DH style key agreement) or a well-reviewed equivalent rather than inventing a new cryptographic protocol.

Use modern authenticated encryption (for example AES-GCM or ChaCha20-Poly1305 through standard cryptographic libraries).

Automatic key rotation.

Forward Secrecy.

Message Integrity.

Replay Protection.

Secure Key Exchange.

Never invent custom cryptography.

Messaging
Support:

Private Chat

Group Chat

Voice Messages

Images

Videos

Files

Documents

Typing Indicator

Read Receipts

Delivery Status

Message Editing

Delete for Everyone

Message Reactions

Reply

Forward

Pinned Messages

Search

Security Features
Implement:

Rate Limiting

CSRF Protection

CORS

XSS Protection

SQL Injection Protection

Content Security Policy

Secure Headers

Input Validation

Output Encoding

Request Validation

File Type Validation

Malware File Scanning Hook

Secure Cookies

HttpOnly Cookies

SameSite Cookies

Automatic Session Expiration

Brute Force Protection

IP Reputation Hook

Audit Logs

Security Logs

Account Lockout

Bot Detection

Abuse Detection

Anomaly Detection

Suspicious Login Detection

Device Fingerprinting (privacy-conscious)

File Security
Encrypted File Storage

Virus Scan Hook

Maximum Upload Size

File Integrity Verification

Random File Names

No Directory Traversal

Privacy
Minimal Logging

No plaintext messages on the server

Encrypted backups (only if explicitly enabled)

Privacy-first architecture

GDPR-ready design

Data export

Account deletion

API
REST API

WebSocket API

OpenAPI Documentation

Versioned APIs

Performance
Redis Caching

Lazy Loading

Pagination

Message Virtualization

Compression

Database Indexing

Connection Pooling

Horizontal Scaling

Monitoring
Prometheus Metrics

Grafana Dashboard

Health Checks

Structured Logging

Error Tracking

Admin Dashboard
User Management

Reports

Analytics

Abuse Reports

Content Moderation Queue

System Health

Server Statistics

Audit Viewer

Role-Based Access Control (RBAC)

Testing
Unit Tests

Integration Tests

Security Tests

End-to-End Tests

Performance Tests

Load Tests

Documentation
Generate:

Architecture Documentation

Database Schema

Threat Model

API Documentation

Deployment Guide

Security Guide

Developer Guide

Production Checklist

Coding Rules
Follow OWASP ASVS.

Follow the OWASP Top 10 recommendations.

Use parameterized database queries.

Validate every input.

Sanitize all output.

Never expose secrets in source code.

Use environment variables.

Follow least privilege.

Keep code modular.

Write clean, documented, production-ready code.

Final Deliverables
Generate:

Full project architecture.

Folder structure.

Database schema.

Backend implementation.

Frontend implementation.

Secure authentication.

End-to-End Encryption implementation using established cryptographic libraries and protocols.

Docker configuration.

Nginx configuration.

Deployment instructions.

Automated tests.

Complete documentation.`,
  },
]
