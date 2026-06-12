# Bank Ledger
> Enterprise-grade banking ledger and multi-factor authentication platform.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-brightgreen.svg)
![Node](https://img.shields.io/badge/node-%3E%3D%2020.0.0-orange.svg)
![Next.js](https://img.shields.io/badge/next.js-15%20App%20Router-black.svg)

Bank Ledger is a high-security, double-entry bookkeeping financial application designed with an emphasis on transaction integrity, multi-factor authentication (MFA), and role-based access control (RBAC). It features a full Node.js API backend coupled with a modern, glassmorphic Next.js frontend interface.

## 🚀 Key Features

### Security & Authentication
- **4-Layer MFA**: Password → Email OTP → Transaction PIN → High-Value OTP
- **Argon2id Hashing**: State-of-the-art password and PIN hashing specifically tuned for high memory and time costs.
- **Strict Rate Limiting**: Exponential lockout mechanisms for login and PIN failures.
- **Role-Based Access Control**: Granular permissions (Customer, Teller, Manager, Admin, SuperAdmin).

### Ledger & Accounting
- **Double-Entry Bookkeeping**: Every transfer intrinsically links a debit and credit ledger entry to prevent fund creation/destruction.
- **Immutable Records**: Ledger transactions are completely un-editable and non-deletable at the database schema level.
- **Idempotency**: Prevents duplicate transactions via unique idempotency keys.

### System & Administration
- **Admin Dashboard**: Real-time system health metrics, hardware utilization, and audit logs.
- **User Management**: Deep inspection, account suspension, and role modification.
- **Account Control**: Account freezing, limit management, and system-level deposits.

---

## 🛠️ Technology Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15, React 19, Vanilla CSS | App Router, Server Actions, modern glassmorphism UI |
| **Backend** | Node.js 20, Express v5 | RESTful architecture, modular controller/service design |
| **Database** | MongoDB (Mongoose v9) | Transactional ACID compliance, Replica Sets |
| **Security** | Argon2id, SHA-256, Helmet, CORS | Industry-standard cryptography and HTTP protections |

---

## 📂 Documentation Structure

We maintain comprehensive documentation for all system domains. Refer to the `development docs/` directory for exhaustive technical details.

* **[Product Requirements Document (PRD)](./development%20docs/PRD.md)** - Business logic, personas, success metrics, and high-level workflows.
* **[Technical Requirements Document (TRD)](./development%20docs/TRD.md)** - Database schemas, strict technical implementations, security layers, and architectural diagrams.
* **[API Documentation](./development%20docs/API_DOCUMENTATION.md)** - Full REST API endpoints, payload structures, and expected responses.

---

## 🚦 Getting Started

### Prerequisites
- Node.js `v20+`
- MongoDB Instance (must support replica sets for ACID transactions)
- SMTP Server (or fallback to terminal logs for development)

### Environment Configuration
1. Clone the repository
2. Rename `.env.example` to `.env` in the root folder.
3. Configure `MONGO_URI`, `JWT_SECRET`, and `SMTP_*` variables.
4. Rename `frontend/.env.example` to `frontend/.env.local` to configure `API_BASE_URL`.

### Installation & Launch

**1. Start the Backend API (Port 3000)**
```bash
npm install
npm run dev
```

**2. Start the Frontend Application (Port 3001)**
```bash
cd frontend
npm install
npm run dev
```

**3. (Optional) Seed Test Data**
Run the seeding script to populate initial users, bank accounts, and system deposits.
```bash
node seed_test_data.js
```

---

*Bank Ledger is maintained as an enterprise prototype. For production deployment, ensure MongoDB replica sets are active, WAF rules are defined, and SMTP relies on secure TLS connections.*
