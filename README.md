# Bank Ledger System

A backend API for a banking ledger system built with Node.js, Express, and MongoDB. It handles user authentication, bank accounts, and money transfers using a proper double-entry bookkeeping model — meaning every transaction creates both a debit and a credit ledger entry, so the books always balance.

I built this to understand how financial systems actually handle money movement at the data layer. Turns out, storing a single `balance` field on an account is asking for trouble — ledger-based balance derivation is the right way to do it.

---

## What's Inside

```
bank-ledger/
├── server.js                         # Entry point — boots the app
├── src/
│   ├── app.js                        # Express setup, middleware, routes
│   ├── config/
│   │   ├── db.js                     # MongoDB connection
│   │   └── validateEnv.js            # Fail-fast env variable check
│   ├── controllers/
│   │   ├── auth.controller.js        # Register, login, logout
│   │   ├── account.controller.js     # Create & fetch accounts
│   │   └── transaction.controller.js # Transfer funds, initial funding
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT verification + role guard
│   │   ├── validate.middleware.js    # Input validation (express-validator)
│   │   ├── errorHandler.middleware.js# Central error handler
│   │   └── requestId.middleware.js   # X-Request-ID correlation headers
│   ├── models/
│   │   ├── user.model.js             # User schema + bcrypt hooks
│   │   ├── account.model.js          # Bank account + getBalance()
│   │   ├── ledger.model.js           # Immutable ledger entries
│   │   ├── transaction.model.js      # Transaction records
│   │   └── blackList.model.js        # JWT token blacklist (TTL indexed)
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── accounts.routes.js
│   │   └── transaction.routes.js
│   ├── services/
│   │   └── email.service.js          # Nodemailer (Google OAuth2)
│   └── utils/
│       ├── asyncHandler.js           # Wraps async controllers for error propagation
│       └── logger.js                 # Winston structured logger
└── .env.example                      # Copy this to .env and fill in your values
```

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express v5
- **Database**: MongoDB via Mongoose (requires a replica set for transactions)
- **Auth**: JWT (stored in httpOnly cookies)
- **Password hashing**: bcrypt
- **Email**: Nodemailer with Google OAuth2
- **Logging**: Winston + Morgan
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: express-validator

---

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB instance with replica set enabled (needed for ACID transactions). MongoDB Atlas free tier works perfectly.
- A Gmail account set up with OAuth2 for emails (or you can skip email and it'll just log a warning)

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

Then open `.env` and fill in your values:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/banking-ledger
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
PORT=3000
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:3000
EMAIL_USER=your@gmail.com
CLIENT_ID=...
CLIENT_SECRET=...
REFRESH_TOKEN=...
```

> **Note on JWT_SECRET**: The server will refuse to start if this is shorter than 32 characters. Use the `crypto` command above to generate a proper one.

### 3. Run in development

```bash
npm run dev
```

You should see something like:

```
[22:45:31] info: Environment variables validated successfully.
[22:45:32] info: Connected to MongoDB
[22:45:32] info: Server is running on port 3000  {"env":"development","port":"3000"}
[22:45:32] info: Email server is ready to send messages
```

### 4. Check it's alive

```
GET http://localhost:3000/health
```

---

## API Reference

> All protected routes require either:
> - A cookie named `token` (set automatically on login/register), or
> - An `Authorization: Bearer <token>` header

---

### Auth

#### Register a new user
```
POST /api/auth/register
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
  "token": "<jwt>"
}
```
Sends a welcome email in the background. If the email fails, the registration still succeeds.

**Validation rules**: email must be valid, name 2–100 chars, password min 6 chars and must contain at least one number.

---

#### Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "harry@hogwarts.com",
  "password": "Expelliarmus1"
}
```
**Response `200`:**
```json
{
  "user": { "_id": "...", "email": "harry@hogwarts.com", "name": "Harry Potter" },
  "token": "<jwt>"
}
```

> The API intentionally returns the same error message for both "user not found" and "wrong password" — this is by design to prevent user enumeration attacks.

---

#### Logout
```
POST /api/auth/logout
```
🔒 No body needed. Blacklists the current token so it can't be reused. The blacklist entry auto-deletes after 3 days (matching the JWT expiry).

**Response `200`:**
```json
{ "message": "User logged out successfully" }
```

---

### Accounts

#### Create a bank account
```
POST /api/accounts
```
🔒 Protected. Creates a new INR account for the logged-in user. A user can have multiple accounts.

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
GET /api/accounts?page=1&limit=20
```
🔒 Protected.

**Query params** (optional):
| Param | Default | Max |
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
GET /api/accounts/balance/:accountId
```
🔒 Protected. Balance is derived live from the ledger (sum of CREDITs minus DEBITs) — not from a stored field. This means it's always accurate even if something went wrong mid-transaction.

**Response `200`:**
```json
{
  "accountId": "...",
  "balance": 5000
}
```

Returns `404` if the account doesn't belong to the logged-in user.

---

### Transactions

#### Transfer money between accounts
```
POST /api/transaction
```
🔒 Protected.

**Body:**
```json
{
  "fromAccount": "<accountId>",
  "toAccount": "<accountId>",
  "amount": 1000,
  "idempotencyKey": "unique-key-per-transfer-attempt"
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
    "amount": 1000,
    "status": "COMPLETED",
    "idempotencyKey": "unique-key-per-transfer-attempt"
  }
}
```

**About `idempotencyKey`**: This is the client's responsibility to generate — use a UUID per transfer attempt. If the same key is submitted twice, the second request returns the original result instead of executing again. This prevents double-charges if a network timeout causes the client to retry.

**What happens under the hood:**
1. Validates the request
2. Checks the idempotency key (returns early if already processed)
3. Verifies both accounts are `ACTIVE`
4. Derives sender's real-time balance from the ledger
5. Checks sufficient funds
6. Opens a MongoDB session and starts a transaction
7. Creates `PENDING` transaction record
8. Creates DEBIT ledger entry for sender
9. Creates CREDIT ledger entry for receiver
10. Marks transaction `COMPLETED`
11. Commits the session
12. Sends email notification (fire-and-forget)

If anything between steps 6–11 fails, the session is aborted, and the transaction is marked `FAILED`.

**Validation rules**: both IDs must be valid ObjectIds, amount must be > 0, fromAccount and toAccount can't be the same, idempotencyKey must be 8–128 characters.

---

#### Fund an account (system user only)
```
POST /api/transaction/system/initial-funds
```
🔒 Requires a `systemUser` account. Used to inject initial funds into user accounts (like an admin top-up).

**Body:**
```json
{
  "toAccount": "<accountId>",
  "amount": 10000,
  "idempotencyKey": "initial-funding-<userId>"
}
```

**Response `201`:**
```json
{
  "message": "Initial funds transaction completed successfully",
  "transaction": { ... }
}
```

---

### Health Check

#### Server health
```
GET /health
```
No auth required. Used by load balancers and uptime monitors.

**Response `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-09T17:19:00.000Z",
  "uptime": 342.5
}
```

---

## Error Responses

All errors follow a consistent shape:

```json
{
  "status": "error",
  "message": "Human readable message"
}
```

Validation errors include field-level detail:
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    { "field": "amount", "message": "amount must be a positive number greater than 0" },
    { "field": "toAccount", "message": "Must be a valid account ID" }
  ]
}
```

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (business logic failure) |
| `401` | Unauthenticated |
| `403` | Forbidden (authenticated but not authorised) |
| `404` | Not found |
| `409` | Conflict (duplicate key) |
| `422` | Validation failed |
| `429` | Rate limited |
| `500` | Something went wrong on our end |

---

## Rate Limits

| Scope | Limit |
|---|---|
| All endpoints | 200 requests / 15 minutes / IP |
| Auth endpoints (`/api/auth/*`) | 20 requests / 15 minutes / IP |

---

## Security Notes

- Passwords are hashed with bcrypt (10 rounds) — plain text is never stored
- JWT tokens are issued for 3 days and stored in `httpOnly; Secure; SameSite=Strict` cookies
- Logged-out tokens are blacklisted in MongoDB and auto-expire via a TTL index
- All responses include security headers via Helmet
- Stack traces are never sent to clients in production (`NODE_ENV=production`)

---

## Known Limitations / TODO

A few things that aren't production-ready yet and I'm aware of:

- **Floating point money**: `amount` is stored as a JS `Number` (IEEE 754 float). For real banking, you'd want `Decimal128` or store amounts in paisa (integer). `1000.1 + 0.2 !== 1000.3` is a real problem.
- **No transaction history endpoint**: you can't currently query past transactions for an account
- **No refresh token flow**: JWT is 3 days, which is long. Should be short-lived access token + long-lived refresh token
- **No tests**: zero test coverage. Don't ship this to production without fixing this first
- **Email is fire-and-forget**: a proper setup would use a message queue (BullMQ, SQS) to guarantee delivery and retry on failure

---

## License

ISC
