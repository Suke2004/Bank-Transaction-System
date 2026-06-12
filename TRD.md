# Technical Requirements Document (TRD)
## Bank Ledger — Enterprise Banking Web Application
**Version:** 2.1  
**Date:** June 12, 2026  
**Status:** Ready for Review  
**Stack Update:** Next.js 15 (App Router) · Argon2id

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS 15 APP ROUTER (Port 3001)                       │
│  React 19 · Server + Client Components · App Router file-based routing      │
│                                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Auth   │ │Dashboard│ │Accounts │ │Transfer │ │Analytics│ │ Admin   │  │
│  │ OTP/PIN │ │   RSC   │ │Statement│ │Benefic. │ │ Charts  │ │  Panel  │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │  API Client Layer  (lib/api/)  — all 'use client'                │     │
│   │  • credentials:'include' (httpOnly cookies auto-sent)            │     │
│   │  • 401 → silent /api/auth/refresh → retry once                   │     │
│   │  • React Context for auth/notification state                     │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│   Next.js rewrites in next.config.js:                                      │
│     /api/* → http://localhost:3000/api/*   (proxied, no CORS)              │
│     /health → http://localhost:3000/health                                 │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ HTTP via Next.js rewrite (dev) / HTTPS (prod)
┌──────────────────────────────▼──────────────────────────────────────────────┐
│                      BACKEND (Node.js / Express v5)  Port: 3000             │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ /auth/*      │  │ /accounts/*  │  │/transaction/*│  │  /admin/*    │   │
│  │ OTP + PIN    │  │ Statement    │  │ PIN-gated    │  │ RBAC-gated   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         └─────────────────┴─────────────────┴─────────────────┘            │
│                                    │                                        │
│  ┌──────────────┐  ┌───────────────▼──────────────┐  ┌──────────────────┐  │
│  │ Email        │  │          Services             │  │   Middleware     │  │
│  │ Service      │  │ • OtpService                 │  │ • authMiddleware │  │
│  │ (Nodemailer) │  │ • PinService (argon2id)      │  │ • rbacMiddleware │  │
│  │              │  │ • NotificationService        │  │ • validate.*     │  │
│  └──────────────┘  │ • AnalyticsService           │  │ • errorHandler   │  │
│                    │ • CsvExportService           │  │ • rateLimiter    │  │
│                    └──────────────────────────────┘  └──────────────────┘  │
│                                    │                                        │
│                    ┌───────────────▼──────────────────────────────────┐     │
│                    │              MongoDB (Atlas replica set)          │     │
│                    │                                                  │     │
│  Collections:      │  users          transactions     refreshTokens   │     │
│                    │  accounts       ledger           blackList       │     │
│                    │  otps           beneficiaries    auditLogs       │     │
│                    │  transactionPins notifications   systemConfig    │     │
│                    └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Backend (Existing + Extensions)
| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 20 LTS | Existing |
| Framework | Express | v5.2.x | Existing |
| Database | MongoDB (Mongoose) | v9.x | Existing |
| Auth | JWT (jsonwebtoken) | v9 | Existing |
| **Password + PIN hashing** | **argon2 (argon2id variant)** | **^0.41** | **REPLACES bcrypt** |
| Validation | express-validator | v7 | Existing |
| Email | Nodemailer (Google OAuth2) | v8 | Existing |
| Security | Helmet, CORS, rate-limit | latest | Existing |
| Logging | Winston + Morgan | v3 / v1 | Existing |
| **OTP** | **crypto.randomInt** | built-in Node | NEW |
| **CSV export** | **fast-csv** | ^5.0 | NEW |
| **UUID** | **uuid** | ^11 | NEW |

> [!IMPORTANT]
> **bcrypt → argon2id migration:** Remove `bcrypt` package entirely. Replace with the `argon2` npm package (`npm install argon2`). Use `argon2.hash(value, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 })`. This applies to: user passwords, transaction PINs. SHA-256 (built-in `crypto`) is still used for OTP and refresh token hashing (not passwords).

### Frontend (New — Next.js 15)
| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Build Tool | **Next.js** | **15 (latest)** | App Router, Turbopack dev, React 19 |
| Language | TypeScript / React | 19 / 5.x | Server + Client components |
| Styling | Vanilla CSS Modules | — | Per-component `.module.css`, no Tailwind |
| Routing | Next.js App Router | file-based | `app/` directory, layouts, route groups |
| HTTP | Native Fetch API | — | With refresh interceptor in `lib/api/client.ts` |
| State | React Context API | — | `AuthContext`, `NotificationContext` |
| Icons | Lucide React | ^0.511 | Tree-shakeable SVG components |
| Charts | Chart.js + react-chartjs-2 | ^4 | SSR-safe with `dynamic(, {ssr:false})` |
| Typography | Inter + JetBrains Mono | — | `next/font/google` (zero-CLS) |
| OTP Input | Custom React component | — | 6-box digit input, `'use client'` |
| PIN Input | Custom React component | — | 6-dot masked input, `'use client'` |

---

## 3. New MongoDB Schemas

### 3.1 OTP Model (`src/models/otp.model.js`)

```js
{
  user:      ObjectId (ref: user, required, index),
  otpHash:   String   (required)         // SHA-256 hash of 6-digit OTP
  purpose:   String   (enum: ['LOGIN', 'REGISTER', 'FORGOT_PASSWORD',
                              'CHANGE_PASSWORD', 'CHANGE_PIN', 'ADD_BENEFICIARY',
                              'CLOSE_ACCOUNT', 'HIGH_VALUE_TRANSFER'],
                       required),
  expiresAt: Date     (required),        // now + 10 min
  attempts:  Number   (default: 0),      // max 3
  used:      Boolean  (default: false),
}
// TTL index: expiresAt (auto-delete after expiry)
// Compound index: { user: 1, purpose: 1 }
```

### 3.2 Transaction PIN Model (`src/models/transactionPin.model.js`)

```js
{
  user:          ObjectId (ref: user, required, unique, index),
  pinHash:       String   (required),    // bcrypt hash of 6-digit PIN
  failedAttempts: Number  (default: 0),
  lockedUntil:   Date     (default: null),
  lastChangedAt: Date     (default: now),
}
```

### 3.3 Beneficiary Model (`src/models/beneficiary.model.js`)

```js
{
  user:       ObjectId (ref: user, required, index),
  name:       String   (required, maxLength: 100),
  accountId:  ObjectId (ref: account, required),
  note:       String   (maxLength: 200, default: ''),
  createdAt:  Date,
}
// Compound unique: { user: 1, accountId: 1 }  — no duplicate beneficiaries
// Index: { user: 1 }
```

### 3.4 Notification Model (`src/models/notification.model.js`)

```js
{
  user:      ObjectId (ref: user, required, index),
  type:      String   (enum: ['LOGIN_ALERT', 'TRANSFER_SENT', 'TRANSFER_RECEIVED',
                              'ACCOUNT_FROZEN', 'ACCOUNT_UNFROZEN', 'SUSPICIOUS_ACTIVITY',
                              'OTP_SENT', 'PIN_LOCKED', 'ACCOUNT_LOCKED',
                              'TRANSACTION_REVERSED', 'TRANSACTION_FLAGGED'],
                       required),
  title:     String   (required),
  body:      String   (required),
  read:      Boolean  (default: false),
  metadata:  Mixed    (optional — txId, accountId, etc.),
  createdAt: Date,
}
// TTL index: 30 days
// Index: { user: 1, read: 1, createdAt: -1 }
```

### 3.5 System Config Model (`src/models/systemConfig.model.js`)

```js
{
  key:       String  (unique, required),
  value:     Mixed   (required),
  updatedBy: ObjectId (ref: user),
  updatedAt: Date,
}
// Seed data:
//   { key: 'HIGH_VALUE_THRESHOLD_PAISE', value: 1000000 }  // ₹10,000
//   { key: 'MAX_ACCOUNTS_PER_USER',      value: 5 }
//   { key: 'MAX_DAILY_TRANSFER_PAISE',   value: 10000000 } // ₹1,00,000
//   { key: 'PIN_LOCKOUT_MINUTES',        value: 15 }
//   { key: 'LOGIN_LOCKOUT_MINUTES',      value: 30 }
//   { key: 'OTP_EXPIRY_MINUTES',         value: 10 }
```

### 3.6 User Model Extensions (`src/models/user.model.js`)

**New fields to add:**
```js
role: {
  type: String,
  enum: ['customer', 'teller', 'manager', 'admin', 'superAdmin'],
  default: 'customer',
  immutable: false,
},
isActive: {
  type: Boolean,
  default: true,
},
suspendedAt:    Date   (default: null),
suspendReason:  String (default: ''),
loginAttempts:  Number (default: 0),
lockedUntil:    Date   (default: null),
notificationPreferences: {
  emailOnLogin:       Boolean (default: true),
  emailOnTransaction: Boolean (default: true),
  emailOnSuspicious:  Boolean (default: true),
}
```

### 3.7 Refresh Token Model Extensions (`src/models/refreshToken.model.js`)

**New fields to add:**
```js
deviceInfo: String   // User-Agent
ipAddress:  String
lastUsedAt: Date
```

### 3.8 Account Model Extensions (`src/models/account.model.js`)

**New fields:**
```js
nickname:     String  (maxLength: 50, default: ''),
dailyLimit:   Number  (paise, default: null — null means use system config),
isFlaggedFraud: Boolean (default: false),
```

### 3.9 Transaction Model Extensions (`src/models/transaction.model.js`)

**New fields:**
```js
description:   String  (maxLength: 200, trim: true, default: ''),
flagged:       Boolean (default: false),
flagReason:    String  (default: ''),
flaggedBy:     ObjectId (ref: user, default: null),
reversedBy:    ObjectId (ref: user, default: null),
reversedAt:    Date    (default: null),
```

---

## 4. New Backend Services

### 4.1 OTP Service (`src/services/otp.service.js`)

```js
// generateOtp(userId, purpose) → { rawOtp, expiresAt }
//   • crypto.randomInt(100000, 999999) — 6-digit OTP
//   • Hash: SHA-256
//   • Store in otps collection (delete existing same-purpose OTP first)
//   • Return raw OTP (only use is to send via email, never store raw)

// verifyOtp(userId, purpose, rawOtp) → boolean
//   • Find OTP by { user, purpose, used: false }
//   • Check expiry
//   • Increment attempts (fail if >= 3)
//   • Compare SHA-256 hash
//   • Mark used: true on success

// sendOtpEmail(userId, purpose) → void
//   • Calls generateOtp()
//   • Calls emailService.sendOtpEmail(user.email, user.name, otp, purpose)
```

### 4.2 PIN Service (`src/services/pin.service.js`)

```js
// setupPin(userId, rawPin) → void
//   • Validate 6 digits
//   • bcrypt.hash(rawPin, 10)
//   • Upsert transactionPin document

// verifyPin(userId, rawPin) → boolean
//   • Check lockedUntil — throw 423 if still locked
//   • bcrypt.compare
//   • On fail: increment failedAttempts, lock if >= 3
//   • On success: reset failedAttempts

// changePin(userId, currentPin, newPin) → void
//   • Verify current PIN first
//   • Then set new PIN
```

### 4.3 Notification Service (`src/services/notification.service.js`)

```js
// createNotification(userId, type, title, body, metadata) → void
//   • Insert to notifications collection
//   • If user.notificationPreferences.emailOnTransaction → emailService.sendNotificationEmail()
//   • Fire-and-forget (does not block response)

// Pre-built notification templates:
//   notifyTransferSent(userId, amount, toAccount)
//   notifyTransferReceived(userId, amount, fromAccount)
//   notifyAccountFrozen(userId, accountId, reason)
//   notifyLoginAlert(userId, ipAddress, device)
//   notifySuspiciousActivity(userId, txId)
```

### 4.4 CSV Export Service (`src/services/csvExport.service.js`)

```js
// exportTransactionsCsv(transactions) → Buffer
//   Headers: Date, Transaction ID, Type, Description, Debit (₹), Credit (₹), Status
//   Uses fast-csv library

// exportStatementCsv(ledgerEntries, accountId) → Buffer
//   Headers: Date, Entry Type, Description, Amount (₹), Running Balance (₹)
```

### 4.5 Analytics Service (`src/services/analytics.service.js`)

```js
// getMonthlyAnalytics(userId, year, month) → { weekly: [...], totals }
//   Aggregates ledger entries grouped by week for user's accounts
//   Returns: [ { week: 1, credits: X, debits: Y }, ... ]

// getTrend(userId, months) → { months: [...] }
//   Last N months: net balance change per month
```

---

## 5. New & Extended API Endpoints

### 5.1 Auth Routes (Extended)

```
POST /api/v1/auth/register           → register (unchanged)
POST /api/v1/auth/verify-email       → verifyOtpController (purpose: REGISTER)
POST /api/v1/auth/login              → login → sends OTP, returns { pendingOtp: true }
POST /api/v1/auth/verify-login-otp   → verifyOtp (purpose: LOGIN) → issues tokens
POST /api/v1/auth/refresh            → refresh (unchanged)
POST /api/v1/auth/logout             → logout (unchanged)
GET  /api/v1/auth/me                 → getMeController [auth required]
PATCH /api/v1/auth/change-password   → changePassword [auth + OTP]
PATCH /api/v1/auth/change-name       → changeName [auth + password]
POST /api/v1/auth/forgot-password    → sendForgotPasswordOtp
POST /api/v1/auth/reset-password     → resetPassword (OTP verified)
POST /api/v1/auth/resend-otp         → resendOtp (60s cooldown, rate-limited)

# Transaction PIN
POST  /api/v1/auth/pin/setup         → setupPin [auth required, no PIN yet]
POST  /api/v1/auth/pin/verify        → verifyPin [auth required] → { valid: true }
PUT   /api/v1/auth/pin/change        → changePin [auth + OTP required]
POST  /api/v1/auth/pin/send-otp      → send OTP for PIN change

# Sessions
GET    /api/v1/auth/sessions         → listSessions [auth]
DELETE /api/v1/auth/sessions/:id     → revokeSession [auth]
DELETE /api/v1/auth/sessions         → revokeAllSessions [auth]

# Notification preferences
PATCH  /api/v1/auth/notifications    → updateNotificationPrefs [auth]
```

**Modified login flow:**
```
POST /auth/login
  → verify email+password
  → send OTP to email
  → return 200 { message: 'OTP sent', userId: masked }
  (NO tokens issued yet)

POST /auth/verify-login-otp
  → body: { userId, otp }
  → verify OTP
  → issue access + refresh tokens (cookies)
  → notify: LOGIN_ALERT
  → return 200 { user, token }
```

### 5.2 Account Routes (Extended)

```
GET    /api/v1/accounts              → listAccounts
POST   /api/v1/accounts             → createAccount
GET    /api/v1/accounts/summary      → accountSummary
GET    /api/v1/accounts/balance/:id  → getBalance
PATCH  /api/v1/accounts/:id/nickname → updateNickname
GET    /api/v1/accounts/:id          → getAccountDetail [NEW]
GET    /api/v1/accounts/:id/statement → getStatement [NEW]
       ?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=50
GET    /api/v1/accounts/:id/statement/csv → downloadStatementCsv [NEW]
POST   /api/v1/accounts/:id/close    → closeAccount [OTP required] [NEW]
```

### 5.3 Transaction Routes (Extended)

```
POST /api/v1/transaction              → createTransaction [PIN required]
     body: { fromAccount, toAccount, amount, idempotencyKey, description, pin }
GET  /api/v1/transaction              → getTransactionHistory
     ?page&limit&status&from&to&direction&search
GET  /api/v1/transaction/export/csv   → exportTransactionsCsv [NEW]
GET  /api/v1/transaction/:id          → getTransactionById
```

**Modified transaction flow with PIN + High-Value OTP:**
```
Step 1: Client sends transaction request including:
        { fromAccount, toAccount, amount, description, idempotencyKey, pin, otpToken? }

Step 2: Backend PIN verification (pin.service.verifyPin)
        → If fail: 401, increment counter, lock if >= 3

Step 3: If amount > HIGH_VALUE_THRESHOLD:
        → Validate otpToken (verifyOtp with purpose: HIGH_VALUE_TRANSFER)
        → If missing: return 428 { requiresOtp: true }

Step 4: Execute ACID transaction (existing flow)

Step 5: Notify both sender and receiver (notification.service)

Step 6: Return 201 with transaction
```

### 5.4 Beneficiary Routes (New)

```
GET    /api/v1/beneficiaries         → listBeneficiaries [auth]
POST   /api/v1/beneficiaries         → addBeneficiary [auth + OTP: ADD_BENEFICIARY]
       body: { name, accountId, note, otp }
DELETE /api/v1/beneficiaries/:id     → deleteBeneficiary [auth + PIN]
       body: { pin }
```

### 5.5 Notification Routes (New)

```
GET    /api/v1/notifications         → getNotifications [auth]
       ?page=1&limit=20&unreadOnly=true
PATCH  /api/v1/notifications/read    → markAllRead [auth]
PATCH  /api/v1/notifications/:id/read → markOneRead [auth]
```

### 5.6 Analytics Routes (New)

```
GET /api/v1/analytics/monthly        → monthlyAnalytics [auth]
    ?year=2026&month=6
GET /api/v1/analytics/trend          → trendAnalytics [auth]
    ?months=6
```

### 5.7 Admin Routes (New — `/api/v1/admin/*`)

All admin routes require `authMiddleware` + `rbacMiddleware(minRole)`.

```
# User Management (admin+)
GET    /api/v1/admin/users           → searchUsers          [manager+]
GET    /api/v1/admin/users/:id       → getUserDetail        [teller+]
PATCH  /api/v1/admin/users/:id/suspend   → suspendUser      [admin+]
PATCH  /api/v1/admin/users/:id/unsuspend → unsuspendUser    [admin+]
PATCH  /api/v1/admin/users/:id/role  → changeUserRole       [superAdmin]

# Account Control (manager+)
GET    /api/v1/admin/accounts        → listAllAccounts      [teller+]
GET    /api/v1/admin/accounts/:id    → getAccountAdmin      [teller+]
PATCH  /api/v1/admin/accounts/:id/freeze   → freezeAccount  [manager+]
PATCH  /api/v1/admin/accounts/:id/unfreeze → unfreezeAccount [manager+]
PATCH  /api/v1/admin/accounts/:id/close    → closeAccount   [manager+]
PATCH  /api/v1/admin/accounts/:id/limit    → setAccountLimit [manager+]
POST   /api/v1/admin/accounts/fund         → fundAccount    [admin+]  (existing)

# Transaction Oversight (manager+)
GET    /api/v1/admin/transactions    → listAllTransactions  [teller+]
GET    /api/v1/admin/transactions/:id → getTransactionAdmin [teller+]
PATCH  /api/v1/admin/transactions/:id/flag    → flagTransaction [manager+]
POST   /api/v1/admin/transactions/:id/reverse → reverseTransaction [manager+]

# Audit & System (admin+)
GET    /api/v1/admin/audit-logs      → getAuditLogs         [admin+]
GET    /api/v1/admin/audit-logs/export → exportAuditCsv     [admin+]
GET    /api/v1/admin/system/health   → systemHealth         [admin+]
GET    /api/v1/admin/system/config   → getSystemConfig      [admin+]
PUT    /api/v1/admin/system/config   → updateSystemConfig   [admin+]
```

---

## 6. Security Architecture

### 6.1 OTP Lifecycle

```
1. Generate: crypto.randomInt(100000, 999999)  → 6-digit OTP
2. Hash:     SHA-256(otp)
3. Store:    otps collection { user, purpose, otpHash, expiresAt: +10min, attempts: 0 }
4. Send:     emailService.sendOtpEmail(user.email, rawOtp)
   (rawOtp is NEVER stored, only the hash)
5. Verify:   Compare SHA-256(incoming) to stored hash
             Increment attempts on failure (max 3)
             Mark used: true on success
6. Cleanup:  MongoDB TTL index auto-deletes after expiry
```

### 6.2 Transaction PIN Lifecycle

```
Setup:   argon2.hash(pin, { type: argon2.argon2id, memoryCost: 65536,
                            timeCost: 3, parallelism: 4 })
         → stored in transactionPin collection
Verify:  argon2.verify(stored, incoming)
         Server-side ONLY. Pin never returned in any response.
         On fail: increment failedAttempts
         At 3 fails: lockedUntil = now + PIN_LOCKOUT_MINUTES
         At 10 fails in 24h: user account suspended, admin notified
Reset:   requires OTP verification (purpose: CHANGE_PIN)
```

### 6.3 Login Flow (with MFA)

```
POST /auth/login
  ├─ Validate email + password
  ├─ Check isActive (reject if suspended)
  ├─ Check lockedUntil (reject if locked, return 423)
  ├─ argon2.verify(user.password, incoming)   ← argon2id
  ├─ On fail: increment loginAttempts
  │   └─ if >= 5: set lockedUntil, send lock email, notify admin
  ├─ On success: reset loginAttempts
  ├─ sendOtpEmail(userId, 'LOGIN')
  └─ Return 200 { message: 'OTP sent to registered email' }
       (NO tokens yet)

POST /auth/verify-login-otp
  ├─ Verify OTP (purpose: LOGIN)
  ├─ Issue access token + refresh token (with device info)
  ├─ Create notification: LOGIN_ALERT (with IP, device)
  ├─ If notificationPreferences.emailOnLogin: send login alert email
  └─ Return 200 { user, token } + set cookies
```

### 6.4 RBAC Middleware (`src/middleware/rbac.middleware.js`)

```js
const ROLE_HIERARCHY = {
  customer:   0,
  teller:     1,
  manager:    2,
  admin:      3,
  superAdmin: 4,
};

function rbacMiddleware(minRole) {
  return asyncHandler(async (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole];
    if (userLevel < requiredLevel) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  });
}
```

### 6.5 Rate Limiting (Extended)

```
Auth endpoints (login, register):     20 req / 15min / IP  (existing)
OTP endpoints (send-otp, resend-otp): 3  req / 10min / IP  (NEW — strict)
PIN verify:                           5  req / 15min / IP  (NEW)
Admin endpoints:                      100 req / 15min / IP (NEW)
Global:                               200 req / 15min / IP (existing)
```

---

## 7. Frontend Architecture

### 7.1 Directory Structure

```
frontend/                              # Next.js 15 App Router project
├── next.config.ts                     # Rewrites: /api/* → backend:3000
├── tsconfig.json
├── package.json
├── public/
│   └── logo.svg
└── app/
    ├── layout.tsx                     # Root layout: fonts, providers, metadata
    ├── globals.css                    # Design tokens, reset, typography
    ├── page.tsx                       # / → redirect to /dashboard or /login
    ├── (auth)/                        # Route group — no shared layout
    │   ├── login/
    │   │   ├── page.tsx               # Step 1: email + password
    │   │   └── otp/page.tsx           # Step 2: OTP MFA entry
    │   ├── register/
    │   │   ├── page.tsx               # Name / email / password form
    │   │   └── otp/page.tsx           # Email verification OTP
    │   ├── forgot-password/
    │   │   ├── page.tsx               # Email input
    │   │   ├── otp/page.tsx           # OTP entry
    │   │   └── reset/page.tsx         # New password form
    │   └── setup-pin/page.tsx         # First-login PIN setup (forced)
    ├── (dashboard)/               # Route group with shared dashboard layout
    │   ├── layout.tsx             # Navbar, auth guard, PIN guard
    │   ├── dashboard/page.tsx
    │   ├── accounts/
    │   │   ├── page.tsx               # Account list grid
    │   │   └── [id]/page.tsx          # Account detail + statement
    │   ├── transfer/page.tsx          # 4-step transfer wizard
    │   ├── transactions/
    │   │   ├── page.tsx               # History + filters
    │   │   └── [id]/page.tsx          # Transaction detail
    │   ├── beneficiaries/page.tsx     # Saved payees
    │   ├── analytics/page.tsx         # Spending charts
    │   ├── profile/page.tsx           # Profile + settings tabs
    │   ├── security/page.tsx          # Sessions, PIN, password
    │   └── notifications/page.tsx     # Notification center
    └── (admin)/                   # Route group with admin layout
        ├── layout.tsx             # Admin sidebar, role guard (teller+)
        └── admin/
            ├── page.tsx               # Admin dashboard: stats + alerts
            ├── users/
            │   ├── page.tsx           # User search table
            │   └── [id]/page.tsx      # User detail + actions
            ├── accounts/page.tsx      # All accounts + controls
            ├── transactions/page.tsx  # Transaction oversight
            ├── audit-logs/page.tsx    # Audit trail viewer
            └── system/page.tsx        # System config panel

components/                            # Shared React components
├── ui/
│   ├── Button.tsx                     # Primary, secondary, danger, ghost variants
│   ├── Badge.tsx                      # Status / role pill badges
│   ├── Modal.tsx                      # Reusable modal with portal
│   ├── ConfirmModal.tsx               # "Are you sure?" dialog
│   ├── Toast.tsx                      # Toast stack (bottom-right)
│   ├── Skeleton.tsx                   # Skeleton card/text placeholders
│   ├── Spinner.tsx                    # Centered spinner
│   ├── Pagination.tsx                 # Page controls
│   ├── OtpInput.tsx                   # 6-box OTP ('use client')
│   └── PinInput.tsx                   # 6-dot PIN ('use client')
├── layout/
│   ├── Navbar.tsx                     # Top nav + notification bell
│   └── AdminSidebar.tsx               # Collapsible admin sidebar
├── banking/
│   ├── AccountCard.tsx                # Glassmorphism account card
│   ├── TransactionRow.tsx             # Transaction list item
│   ├── BeneficiaryCard.tsx            # Saved payee card
│   ├── FraudAlertBanner.tsx           # Non-dismissable fraud alert
│   └── MonthlyChart.tsx               # Chart.js (dynamic, ssr:false)
└── admin/
    ├── AdminStatsCard.tsx
    └── AdminTable.tsx

lib/
├── api/
│   ├── client.ts                      # Fetch + 401 refresh interceptor
│   ├── auth.ts
│   ├── accounts.ts
│   ├── transactions.ts
│   ├── beneficiaries.ts
│   ├── notifications.ts
│   ├── analytics.ts
│   └── admin.ts
├── context/
│   ├── AuthContext.tsx                # user state, login/logout helpers
│   └── NotificationContext.tsx        # unread count, mark-read
└── utils/
    ├── currency.ts                    # formatRupees (mirrors backend)
    ├── date.ts                        # relative time, IST formatting
    └── uuid.ts                        # generateIdempotencyKey()
```

### 7.2 Complete Routing Table

| Route | Page | Auth | Min Role | Notes |
|-------|------|------|----------|-------|
| `#/login` | Login | No | — | Redirect to dashboard if authed |
| `#/login/otp` | Login OTP | No | — | Requires pending OTP state |
| `#/register` | Register | No | — | |
| `#/register/otp` | Register OTP | No | — | |
| `#/forgot-password` | Forgot PW | No | — | |
| `#/forgot-password/otp` | Forgot OTP | No | — | |
| `#/reset-password` | Reset PW | No | — | |
| `#/setup-pin` | PIN Setup | Yes | customer | Forced on first login if no PIN |
| `#/dashboard` | Dashboard | Yes | customer | |
| `#/accounts` | Accounts | Yes | customer | |
| `#/accounts/:id` | Acct Detail | Yes | customer | |
| `#/transfer` | Transfer | Yes | customer | Redirect to PIN setup if no PIN |
| `#/transactions` | Tx History | Yes | customer | |
| `#/transactions/:id` | Tx Detail | Yes | customer | |
| `#/beneficiaries` | Beneficiaries | Yes | customer | |
| `#/analytics` | Analytics | Yes | customer | |
| `#/profile` | Profile | Yes | customer | |
| `#/security` | Security | Yes | customer | |
| `#/notifications` | Notifications | Yes | customer | |
| `#/admin` | Admin Dashboard | Yes | teller | |
| `#/admin/users` | User Mgmt | Yes | teller | |
| `#/admin/users/:id` | User Detail | Yes | teller | |
| `#/admin/accounts` | Account Ctrl | Yes | teller | |
| `#/admin/transactions` | Tx Oversight | Yes | teller | |
| `#/admin/audit-logs` | Audit Logs | Yes | admin | |
| `#/admin/system` | System Config | Yes | admin | |

### 7.3 Transfer Flow (4 Steps)

```
Step 1: Transfer Form
  • From Account: dropdown (user's ACTIVE accounts)
  • To Account: type ID or pick from beneficiaries dropdown
  • Amount (₹): with live balance check
  • Description: optional text
  • "Review Transfer" button → Step 2

Step 2: Confirmation Screen
  • Show: From, To, Amount (formatted), Description, Available balance after
  • "Confirm" button → Step 3

Step 3: PIN Verification
  • 6-dot PIN input modal (Component: pinInput.js)
  • "Confirm with PIN" button
  • If amount > threshold: after PIN → OTP step

Step 3b: High-Value OTP (if applicable)
  • "OTP sent to your email" screen
  • 6-box OTP input
  • Submit OTP → Step 4

Step 4: Processing → Result
  • Spinner during API call
  • Success: receipt card + confetti micro-animation
  • Error: error card + retry button
```

### 7.4 OTP Input Component Spec

```
• 6 separate <input type="text" maxlength="1"> elements in a row
• Auto-focus next input on digit entry
• Backspace on empty input → focus previous
• Paste handler: distribute pasted digits across boxes
• Shake animation on wrong OTP
• 60s countdown timer for resend
• "Resend OTP" button (disabled during countdown)
• Screen reader: aria-label="OTP digit 1 of 6"
```

### 7.5 PIN Input Component Spec

```
• 6 circular dot elements (filled = entered, empty = not)
• Hidden <input type="tel"> captures keystrokes
• Backspace decrements
• Never shows actual digits — dots only
• Shake + red flash on wrong PIN
• Lockout countdown if locked: "PIN locked. Try again in 14:32"
```

---

## 8. Email Templates

| Purpose | Subject | Content |
|---------|---------|---------|
| LOGIN OTP | "Your Bank Ledger login OTP" | 6-digit OTP, expires in 10 min, device/IP info |
| REGISTER OTP | "Verify your Bank Ledger account" | Welcome + OTP |
| FORGOT PASSWORD | "Reset your Bank Ledger password" | OTP + instructions |
| CHANGE PASSWORD | "Bank Ledger password change OTP" | OTP + warning if not you |
| CHANGE PIN | "Bank Ledger PIN change OTP" | OTP + warning |
| ADD BENEFICIARY | "Confirm adding beneficiary" | Beneficiary name + account, OTP |
| HIGH VALUE TRANSFER | "Confirm transfer of ₹X,XXX" | Amount, to-account, OTP |
| LOGIN ALERT | "New login to your account" | Time, device, IP, "Not you? click here" |
| ACCOUNT LOCKED | "Your account has been locked" | 30-min lockout explanation, contact support |
| TRANSFER SENT | "You sent ₹X,XXX" | Amount, to-account, TxID, time |
| TRANSFER RECEIVED | "You received ₹X,XXX" | Amount, from-account, TxID, time |
| ACCOUNT FROZEN | "Your account has been frozen" | Account ID, reason, support contact |
| TRANSACTION REVERSED | "Transaction reversed" | Original TxID, reversed amount |

---

## 9. Security Hardening

| Layer | Measure |
|-------|---------|
| Transport | HTTPS in production (TLS 1.2+) |
| Cookies | `httpOnly; Secure; SameSite=Strict` |
| Headers | Helmet.js (14 headers: CSP, HSTS, X-Frame-Options, etc.) |
| OTP | SHA-256 hashed in DB, 10-min TTL, 3-attempt limit |
| PIN | **argon2id** (memoryCost:65536, timeCost:3, parallelism:4), never in response, 3-fail lockout |
| Passwords | **argon2id** (same params), min 8 chars + number + special char |
| XSS | React JSX auto-escapes all interpolated values. No `dangerouslySetInnerHTML`. |
| CSRF | SameSite=Strict cookies, no separate CSRF token needed |
| Rate limits | OTP: 3/10min, Auth: 20/15min, PIN: 5/15min, Global: 200/15min |
| Brute force | Login lockout (5 fails → 30min). PIN lockout (3 fails → 15min) |
| Audit | Every action (auth, transaction, admin op) → immutable auditLog |
| Sessions | Refresh tokens hashed (SHA-256), device/IP stored, revocable |

---

## 10. Updated Environment Variables

```bash
# ─── Database ───────────────────────────────
MONGO_URI=mongodb+srv://...

# ─── Auth ───────────────────────────────────
JWT_SECRET=<min-64-chars>
REFRESH_TOKEN_SECRET=<min-64-chars>

# ─── Server ─────────────────────────────────
PORT=3000
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:5173

# ─── Logging ────────────────────────────────
LOG_LEVEL=info
AUDIT_LOG_RETENTION_DAYS=90

# ─── Email (Google OAuth2) ──────────────────
EMAIL_USER=your-email@gmail.com
CLIENT_ID=<google-oauth-client-id>
CLIENT_SECRET=<google-oauth-client-secret>
REFRESH_TOKEN=<google-oauth-refresh-token>

# ─── Feature Flags ──────────────────────────
# These are seeded into systemConfig collection, overridable via admin panel
HIGH_VALUE_THRESHOLD_RUPEES=10000
MAX_ACCOUNTS_PER_USER=5
OTP_EXPIRY_MINUTES=10
PIN_LOCKOUT_MINUTES=15
LOGIN_LOCKOUT_MINUTES=30
```

---

## 11. Testing Strategy

### Backend Tests (Extended)

| Test Suite | Coverage |
|------------|---------|
| `otp.service.test.js` | generate, hash, verify, expiry, attempts |
| `pin.service.test.js` | setup, verify, lockout, reset |
| `rbac.middleware.test.js` | all role levels, edge cases |
| `auth.controller.test.js` | login MFA flow, forgot password, sessions |
| `admin.controller.test.js` | user suspend, account freeze, transaction reverse |
| `beneficiary.controller.test.js` | add, list, delete with OTP/PIN |
| `analytics.service.test.js` | aggregation correctness |
| `csvExport.service.test.js` | CSV format validation |
| Existing unit tests | currency, asyncHandler, validateEnv (maintained) |

### Frontend Manual Test Checklist

```
Auth:
  [ ] Register → OTP email → verify → dashboard
  [ ] Login → OTP email → verify → dashboard
  [ ] Wrong OTP → shake animation → attempt counter
  [ ] 3 wrong OTPs → must resend
  [ ] Forgot password → OTP → reset → login

Transfer:
  [ ] Transfer < ₹10,000 → PIN only → success
  [ ] Transfer > ₹10,000 → PIN + OTP → success
  [ ] Wrong PIN → shake → 3 fails → lockout timer
  [ ] Insufficient balance → error before PIN step
  [ ] Network retry reuses idempotency key → no double charge

Admin:
  [ ] Teller can search users, cannot freeze accounts
  [ ] Manager can freeze, cannot change roles
  [ ] Admin can suspend users, configure system
  [ ] Super admin can change roles
  [ ] Role-restricted routes redirect to dashboard with toast

Security:
  [ ] Logout → cookies cleared → back-button → login page
  [ ] Expired access token → silent refresh → page continues
  [ ] Revoke session → next request with that refresh token → 401
```

---

## 12. Deployment Topology

```
Production:
  Frontend  → Vercel / Netlify (static hosting)
  Backend   → Railway / Render / AWS ECS (container)
  Database  → MongoDB Atlas M10 (3-node replica set, ACID guaranteed)
  Email     → Gmail + Google OAuth2 (existing)

Development:
  Frontend  → http://localhost:5173 (Vite HMR)
  Backend   → http://localhost:3000 (nodemon)
  Database  → MongoDB Atlas free tier (M0 replica set)
```
