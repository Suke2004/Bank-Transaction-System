# Bank Ledger System

A secure, enterprise-grade digital banking ledger application combining a robust **Express API backend** and a high-fidelity **Next.js 15 frontend**. 

The system implements a double-entry bookkeeping model for ledger operations (every transfer creates balanced debits/credits in integer paise to eliminate IEEE-754 floating-point errors) and features multi-tiered security clearance matching standard commercial banking systems.

---

## 📂 Project Architecture

```
bank-ledger/
├── development docs/                  # Product and technical specifications
│   ├── PRD.md                         # Product Requirements Document
│   └── TRD.md                         # Technical Requirements Document
├── src/                               # BACKEND SOURCE
│   ├── app.js                         # Express setup, routing middleware
│   ├── server.js                      # Service entry point & process lifecycle
│   ├── controllers/                   # Auth, Account, Transaction, Admin handlers
│   ├── middleware/                    # Auth, RBAC, inputs validations, request tracking
│   ├── models/                        # MongoDB collections schemas
│   ├── services/                      # Otp, Pin, Notifications, CSV and Mailer services
│   └── utils/                         # Formatter, logger, and correlation tools
├── frontend/                          # FRONTEND NEXT.JS CLIENT
│   ├── src/
│   │   ├── app/                       # App Router layouts and pages
│   │   │   ├── (auth)/                # Auth templates (Login, OTP verify, PIN setup)
│   │   │   ├── (dashboard)/           # Retail customer views & statements
│   │   │   └── (admin)/               # Administrative operations panel
│   │   ├── components/                # Shared layout & UI components
│   │   └── lib/                       # API clients & contexts (Auth, Notification)
│   ├── next.config.ts                 # Dev proxy routing & Turbopack configurations
│   └── tsconfig.json                  # TypeScript config with '@/*' alias paths
└── tests/                             # Integration & Unit test cases
```

---

## 🔒 Security & Auth Architecture

1. **Dual-Token Sessions**: Short-lived, HTTP-only JWT cookies coupled with 7-day refresh tokens stored securely as SHA-256 hashes in MongoDB.
2. **Four-Tier Verification Clearance**:
   - **Phase 1: Password**: Secure credential checking.
   - **Phase 2: Email OTP**: Login, registration, and critical security tasks require a 6-digit random code sent to the user's email (secured using SHA-256 validation).
   - **Phase 3: Transaction PIN**: 6-digit numeric PIN hashed using `argon2id` required for all money transfers and beneficiary modifications.
   - **Phase 4: High-Value OTP**: Transfers exceeding the configurable threshold (default: ₹10,000) trigger secondary OTP verification automatically.
3. **Lockout Policy**: 5 failed login attempts locks the user profile for 30 minutes. 3 incorrect PIN entries locks the transaction pin for 15 minutes.
4. **Audit Logs**: Immutable, append-only transaction logs tracking request IP, user-agent, and UUID correlation IDs (`X-Request-ID`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MongoDB instance (Atlas or local) configured as a **Replica Set** (required for Mongoose ACID transactions).
- SMTP Credentials (configured in backend `.env` for mail delivery).

### Backend Setup (Port 3000)
1. Install dependencies from the root directory:
   ```bash
   npm install
   ```
2. Create your `.env` file in the root from `.env.example` and fill in secrets, MongoDB connection strings, and mail configuration values.
3. Boot the backend server in development mode:
   ```bash
   npm run dev
   ```

### Frontend Setup (Port 3001)
1. Navigate to the client directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Set up the local environment file:
   ```bash
   cp .env.local.example .env.local
   ```
3. Boot the client application:
   ```bash
   npm run dev
   ```
   *Note: Next.js dev server runs on port 3001. A proxy rewrite maps all client `/api/*` and `/health` requests to backend port 3000 to resolve Same-Site cookie blockades.*

---

## 🧪 Testing and Quality Control

### Running Backend Tests
From the root directory, run Jest tests and check coverage reports:
```bash
npm test
```
All utility helpers, converters, and core transaction handlers are fully covered.

### Compiling Frontend Client
To run a TypeScript typecheck and compile the optimized production-ready bundle:
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📄 Specifications
Full design requirements and API mappings are documented in the [development docs](file:///d:/Projects/bank-ledger/development docs/) directory:
* **Product Requirements**: See [PRD.md](file:///d:/Projects/bank-ledger/development docs/PRD.md)
* **Technical Specifications**: See [TRD.md](file:///d:/Projects/bank-ledger/development docs/TRD.md)

---

## License
ISC
