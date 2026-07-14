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
  {
    id: 'universal-media-downloader',
    title: 'المُحمّل الشامل: فيديو وصوت من أي موقع تقريبًا',
    description:
      'أداة سطر أوامر مجانية ومفتوحة المصدر (yt-dlp) لتنزيل الفيديو والصوت من آلاف المواقع، مع تحكم كامل في الجودة والصيغة والترجمات والبيانات الوصفية.',
    createdAt: '2026-07-14',
    tags: ['أدوات', 'تحميل فيديو', 'مفتوح المصدر', 'سطر الأوامر', 'yt-dlp'],
    highlights: [
      'يدعم آلاف المواقع (يوتيوب، تويتر/X، تيك توك، تويتش، فيسبوك وغيرها) مش بس منصة واحدة.',
      'تحميل فيديوهات كاملة أو استخراج الصوت بس (mp3, m4a, flac, wav...) لأي فيديو.',
      'اختيار الجودة والصيغة بدقة (أفضل جودة، دقة معيّنة، حجم أصغر) بدل ما تتحكم فيك المنصة.',
      'تحميل قوائم تشغيل كاملة، أو عناصر معيّنة منها، أو حسب تاريخ الرفع.',
      'تنزيل الترجمات (يدوية أو تلقائية) وتضمينها جوه ملف الفيديو مباشرة.',
      'تضمين الصورة المصغّرة (thumbnail) والبيانات الوصفية (اسم الفيديو، القناة، الوصف) داخل الملف.',
      'دعم البث المباشر (تسجيل من البداية) وتخطي أجزاء معيّنة زي الإعلانات عبر SponsorBlock.',
      'تسجيل الدخول عبر كوكيز المتصفح لتحميل محتوى يحتاج حساب (فيديوهات خاصة أو محدودة).',
      'قابلة للتشغيل كمكتبة Python جوه مشروعك، مش بس كأداة طرفية.',
    ],
    content: `يعتمد هذا القسم على أداة مفتوحة المصدر اسمها yt-dlp: https://github.com/yt-dlp/yt-dlp

ما هي؟
أداة سطر أوامر مجانية لتنزيل الفيديو والصوت من آلاف المواقع (وليس يوتيوب فقط)، وهي امتداد نشِط ومطوَّر باستمرار لمشروع youtube-dl الأصلي.

التثبيت
- عبر pip: pip install -U yt-dlp
- أو تحميل ملف تنفيذي جاهز لويندوز / ماك / لينكس من صفحة الإصدارات على GitHub مباشرة بدون الحاجة لتثبيت Python.

أهم الاستخدامات

1) تحميل فيديو بأفضل جودة متاحة (الاستخدام الافتراضي):
yt-dlp "https://example.com/video"

2) استخراج الصوت فقط بصيغة mp3:
yt-dlp -x --audio-format mp3 "URL"

3) اختيار جودة/صيغة معيّنة بدل الأفضل تلقائيًا:
yt-dlp -f "bestvideo[height<=720]+bestaudio" "URL"

4) عرض كل الصيغ المتاحة لفيديو قبل التحميل:
yt-dlp -F "URL"

5) تحميل قائمة تشغيل كاملة، أو عناصر منها فقط:
yt-dlp "PLAYLIST_URL"
yt-dlp --playlist-items 1,3,5-10 "PLAYLIST_URL"

6) تحميل الترجمات وتضمينها في ملف الفيديو:
yt-dlp --write-subs --sub-langs "ar,en" --embed-subs "URL"

7) تضمين الصورة المصغّرة والبيانات الوصفية داخل الملف:
yt-dlp --embed-thumbnail --embed-metadata "URL"

8) تحديد مكان وتسمية الملفات الناتجة عبر Output Template:
yt-dlp -o "%(uploader)s/%(title)s.%(ext)s" "URL"

9) تخطي فواصل الإعلانات/الرعاية تلقائيًا (SponsorBlock):
yt-dlp --sponsorblock-remove sponsor "URL"

10) التحميل من موقع يحتاج تسجيل دخول، عن طريق كوكيز المتصفح:
yt-dlp --cookies-from-browser chrome "URL"

11) تحميل عدة روابط من ملف نصي دفعة واحدة:
yt-dlp -a links.txt

12) تحديث الأداة نفسها لآخر إصدار:
yt-dlp -U

ملاحظات مهمة
- يُنصح بتثبيت ffmpeg بجانب الأداة لتفعيل دمج الصوت والفيديو، واستخراج الصوت، وتضمين الترجمات/الصورة المصغّرة.
- الأداة مرخّصة برخصة Unlicense (استخدام حر بالكامل)، وتتيح أيضًا استخدامها كمكتبة داخل كود Python مباشرة (import yt_dlp) للمشاريع اللي محتاجة تحميل فيديوهات برمجيًا.
- استخدم الأداة فقط لتنزيل محتوى تملك حق الوصول إليه أو تنزيله، مع احترام شروط استخدام كل موقع وحقوق الملكية الفكرية.`,
  },
]
