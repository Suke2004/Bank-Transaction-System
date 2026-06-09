# Bank Ledger System

A backend API for a banking ledger system built with Node.js, Express, and MongoDB. It handles user authentication, bank accounts, and money transfers using a proper double-entry bookkeeping model — meaning every transaction creates both a debit and a credit ledger entry, so the books always balance.

Every rupee amount is stored as integer paise internally (1 rupee = 100 paise). This avoids the IEEE 754 floating-point problem where `0.1 + 0.2 !== 0.3` — a real issue that compounds over time in financial systems.

Auth uses a dual-token system: short-lived 15-minute access tokens paired with 7-day refresh tokens. If your access token expires, you hit `/auth/refresh` — no re-login needed. The refresh token is stored as a SHA-256 hash in MongoDB, so even a DB breach doesn't hand over usable tokens.

---

## What's Inside

```
bank-ledger/
├── server.js                          # Entry point — boots the app, process guards
├── jest.config.js                     # Jest test configuration
├── src/
│   ├── app.js                         # Express, middleware stack, /api/v1/ routes
│   ├── config/
│   │   ├── db.js                      # MongoDB connection
│   │   └── validateEnv.js             # Fail-fast env variable validation
│   ├── controllers/
│   │   ├── auth.controller.js         # Register, login, refresh, logout
│   │   ├── account.controller.js      # Create & fetch accounts, balance
│   │   └── transaction.controller.js  # Transfer, history, detail, initial-funds
│   ├── middleware/
│   │   ├── auth.middleware.js         # JWT verification + role guard
│   │   ├── validate.middleware.js     # Input validation + rupees→paise conversion
│   │   ├── errorHandler.middleware.js # Central error handler
│   │   └── requestId.middleware.js    # X-Request-ID correlation headers
│   ├── models/
│   │   ├── user.model.js              # User schema + bcrypt hooks
│   │   ├── account.model.js           # Bank account + getBalance() aggregation
│   │   ├── ledger.model.js            # Immutable DEBIT/CREDIT entries (paise)
│   │   ├── transaction.model.js       # Transaction records (paise amounts)
│   │   ├── refreshToken.model.js      # Hashed refresh tokens with 7d TTL
│   │   ├── blackList.model.js         # JWT blacklist (TTL-indexed, 15min)
│   │   └── auditLog.model.js          # Immutable audit trail (90d TTL)
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── accounts.routes.js
│   │   └── transaction.routes.js
│   ├── services/
│   │   └── email.service.js           # Nodemailer with Google OAuth2
│   └── utils/
│       ├── asyncHandler.js            # Wraps async controllers for error propagation
│       ├── audit.js                   # Fire-and-forget audit log helper
│       ├── currency.js                # rupeesToPaise / paiseToRupees / formatRupees
│       └── logger.js                  # Winston structured logger
└── tests/
    └── unit/
        ├── asyncHandler.test.js       # 5 tests
        ├── currency.test.js           # 12 tests (including IEEE 754 edge cases)
        └── validateEnv.test.js        # 7 tests
```

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express v5
- **Database**: MongoDB via Mongoose (requires replica set for ACID transactions)
- **Auth**: Dual-token JWT — 15min access token + 7d refresh token (httpOnly cookies)
- **Password hashing**: bcrypt (10 rounds)
- **Email**: Nodemailer with Google OAuth2
- **Logging**: Winston (structured JSON in prod) + Morgan (HTTP access logs)
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: express-validator
- **Testing**: Jest + supertest

---

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB instance with replica set enabled (needed for ACID transactions). MongoDB Atlas free tier works perfectly.
- Gmail OAuth2 credentials for emails (optional — server works fine without it)

### 1. Clone and install

```bash
git clone https://github.com/Suke2004/Bank-Transaction-System.git
cd bank-ledger
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Then fill in your values. Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> **Note**: The server refuses to start if `JWT_SECRET` or `REFRESH_TOKEN_SECRET` are shorter than 32 characters. You need two separate secrets — one for each token type.

### 3. Run in development

```bash
npm run dev
```

### 4. Run tests

```bash
npm test                # run once with coverage
npm run test:watch      # watch mode during development
```

### 5. Check it's alive

```
GET http://localhost:3000/health
```

---

## API Reference

> **Base URL**: `http://localhost:3000/api/v1`
>
> **Auth**: Protected routes require either:
> - A cookie named `token` (set automatically on login/register), or
> - `Authorization: Bearer <token>` header
>
> **Amount fields**: Send amounts in **rupees** (e.g. `100.50`). The API stores them as paise internally and returns rupees in all responses. Max 2 decimal places accepted.

---

### Auth

#### Register
```
POST /api/v1/auth/register
```
**Body:**
```json
{
  "name": "Harry Potter",
  "email": "harry@hogwarts.com",
  "password": "Expelliarmus1"
}
```
**Response `201`:**
```json
{
  "user": { "_id": "...", "email": "harry@hogwarts.com", "name": "Harry Potter" },
  "token": "<15min-access-jwt>"
}
```
Also sets two httpOnly cookies: `token` (15min) and `refreshToken` (7 days).

**Validation**: email must be valid, name 2–100 chars, password min 6 chars with at least one number.

---

#### Login
```
POST /api/v1/auth/login
```
**Body:**
```json
{ "email": "harry@hogwarts.com", "password": "Expelliarmus1" }
```
**Response `200`:**
```json
{
  "user": { "_id": "...", "email": "harry@hogwarts.com", "name": "Harry Potter" },
  "token": "<15min-access-jwt>"
}
```
Sets both `token` and `refreshToken` cookies.

> Same error message for wrong email vs wrong password — intentional, prevents user enumeration.

---

#### Refresh Access Token
```
POST /api/v1/auth/refresh
```
No body needed. Reads the `refreshToken` cookie automatically.

**Response `200`:**
```json
{ "token": "<new-15min-access-jwt>" }
```
Also sets a fresh `token` cookie. Call this when you get a 401 — no re-login needed.

---

#### Logout
```
POST /api/v1/auth/logout
```
🔒 No body needed.

Blacklists the current access token + deletes the refresh token from DB + clears both cookies.

**Response `200`:**
```json
{ "message": "User logged out successfully" }
```

---

### Accounts

#### Create a bank account
```
POST /api/v1/accounts
```
🔒 Protected. Creates a new INR account. A user can have multiple accounts.

**Response `201`:**
```json
{
  "account": {
    "_id": "...",
    "user": "<userId>",
    "status": "ACTIVE",
    "currency": "INR",
    "createdAt": "..."
  }
}
```

---

#### List your accounts
```
GET /api/v1/accounts?page=1&limit=20
```
🔒 Protected.

| Query param | Default | Max |
|---|---|---|
| `page` | 1 | — |
| `limit` | 20 | 50 |

**Response `200`:**
```json
{
  "accounts": [...],
  "pagination": { "page": 1, "limit": 20, "total": 3, "pages": 1 }
}
```

---

#### Get account balance
```
GET /api/v1/accounts/balance/:accountId
```
🔒 Protected. Balance is derived live from the ledger (sum of CREDITs minus DEBITs in paise, returned in rupees). Always accurate.

**Response `200`:**
```json
{
  "accountId": "...",
  "balance": 100.50,
  "currency": "INR"
}
```

---

### Transactions

#### Transfer money
```
POST /api/v1/transaction
```
🔒 Protected.

**Body:**
```json
{
  "fromAccount": "<accountId>",
  "toAccount": "<accountId>",
  "amount": 100.50,
  "idempotencyKey": "uuid-or-unique-string-per-attempt"
}
```
**Response `201`:**
```json
{
  "message": "Transaction completed successfully",
  "transaction": {
    "_id": "...",
    "fromAccount": "...",
    "toAccount": "...",
    "amount": 100.50,
    "status": "COMPLETED",
    "idempotencyKey": "..."
  }
}
```

**About `idempotencyKey`**: Generate a UUID per transfer attempt. If the same key is submitted twice (e.g. network retry), the second request returns the original result — no double-charge.

**Validation**: both IDs must be valid ObjectIds, `amount` > 0, max 2 decimal places, `fromAccount ≠ toAccount`.

---

#### Transaction history
```
GET /api/v1/transaction?page=1&limit=20&status=COMPLETED
```
🔒 Protected. Returns all transactions where any of your accounts was sender or receiver.

| Query param | Default | Options |
|---|---|---|
| `page` | 1 | — |
| `limit` | 20 (max 50) | — |
| `status` | all | `PENDING`, `COMPLETED`, `FAILED`, `REVERSED` |

**Response `200`:**
```json
{
  "transactions": [
    {
      "_id": "...",
      "fromAccount": { "_id": "...", "currency": "INR", "status": "ACTIVE" },
      "toAccount": { "_id": "...", "currency": "INR", "status": "ACTIVE" },
      "amount": 100.50,
      "status": "COMPLETED",
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "pages": 1 }
}
```

---

#### Single transaction
```
GET /api/v1/transaction/:id
```
🔒 Protected. Returns `404` if the transaction doesn't involve your account.

**Response `200`:**
```json
{
  "transaction": { ... }
}
```

---

#### Fund an account (system user only)
```
POST /api/v1/transaction/system/initial-funds
```
🔒 Requires `systemUser` flag. Admin top-up endpoint.

**Body:**
```json
{
  "toAccount": "<accountId>",
  "amount": 10000,
  "idempotencyKey": "initial-funding-<userId>"
}
```

---

### Health Check

```
GET /health
```
No auth. Returns server uptime. Used by load balancers and Kubernetes liveness probes.

**Response `200`:**
```json
{ "status": "ok", "timestamp": "2026-06-09T17:19:00.000Z", "uptime": 342.5 }
```

---

## Error Responses

All errors follow this shape:
```json
{ "status": "error", "message": "Human readable message" }
```

Validation errors include field-level detail:
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    { "field": "amount", "message": "amount must be a positive number greater than 0" }
  ]
}
```

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (business logic) |
| `401` | Not authenticated |
| `403` | Authenticated but not authorised |
| `404` | Not found |
| `409` | Conflict (duplicate key) |
| `422` | Validation failed |
| `429` | Rate limited |
| `500` | Server error |

---

## Rate Limits

| Scope | Limit |
|---|---|
| All endpoints | 200 requests / 15 min / IP |
| `/api/v1/auth/*` | 20 requests / 15 min / IP |

---

## Security

- Passwords: bcrypt, 10 rounds, never stored in plain text
- Access tokens: 15-minute JWT in `httpOnly; Secure; SameSite=Strict` cookie
- Refresh tokens: 7-day random token stored **hashed** (SHA-256) in MongoDB
- Logged-out tokens: blacklisted + auto-expire via TTL index
- Security headers: Helmet (14 headers including CSP, X-Frame-Options)
- Stack traces: never sent to clients in production

---

## Audit Trail

Every sensitive action is written to an immutable `auditLog` collection:

| Action | Trigger |
|---|---|
| `USER_REGISTER` | New user created |
| `USER_LOGIN` | Successful login |
| `USER_LOGOUT` | Logout called |
| `TOKEN_REFRESH` | Access token refreshed |
| `ACCOUNT_CREATED` | New bank account opened |
| `TRANSACTION_INITIATED` | Transfer started |
| `TRANSACTION_COMPLETED` | Transfer committed |
| `TRANSACTION_FAILED` | Transfer rolled back |
| `INITIAL_FUNDS_ADDED` | System user top-up |

Audit entries store: userId, action, metadata, IP address, user agent, and X-Request-ID for end-to-end tracing. Auto-deleted after 90 days (configurable via `AUDIT_LOG_RETENTION_DAYS`).

---

## Running Tests

```bash
npm test              # jest --coverage (23 tests)
npm run test:watch    # watch mode
```

**Test coverage of utilities (100%)**:
- `asyncHandler.js` — error forwarding, pass-through, error identity
- `currency.js` — paise conversion, IEEE 754 edge cases, formatting
- `validateEnv.js` — missing vars, weak secrets, mocked process.exit

---

## License

ISC
