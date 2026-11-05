# 👑 Elenora - Luxury Couture Rental & Asset Lifecycle Management Platform

FastAPI | JWT Auth | RBAC | Async SQLAlchemy | PostgreSQL / SQLite | React 19 + TypeScript | Vite

A production-ready full-stack platform for managing luxury couture, bridal wear, and designer asset rentals end-to-end. Clients can browse luxury collections, book pieces with KYC validation, track rental status through a live event timeline, and request returns. Administrators manage asset inventory, image uploads, categories, rental plan tiers, allocations, fine/damage return auditing, and certified dry-cleaning partner dispatches. Certified dry-cleaning partners have a dedicated portal to accept, process, and certify sanitized garments.

---

## 🔑 Demo & Test Credentials

After running `python -m app.db.seed`, you can immediately test the platform using:

| Role | Email | Password | Access Area |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@elanora-luxury.com` | `AdminPassword123!` | Executive Console (`/admin`) |
| **Certified Dry Cleaner** | `cleaner@elanora-luxury.com` | `CleanerPass123!` | Partner Portal (`/dry-cleaning/portal`) |
| **Demo Client** | `client@example.com` | `ClientPassword123!` | Public Atelier (`/`, `/assets`, `/bookings`) |

---

## 🔥 Features

- 🔐 **JWT Authentication & RBAC**: Access token + refresh token cookie flow with bcrypt hashing, supporting `admin`, `user`, and `dry_cleaner` roles.
- 👗 **Curated Asset Catalog**: Luxury dress and jewelry vault with categories, high-res previews, and availability status.
- 📸 **Admin Asset Image Upload**: Directly upload garment photos (`/assets/upload-image`) or paste external URLs.
- 🧾 **Booking & KYC Flow**: Client reservation with pickup dates, rental tier selection, and Aadhaar/PAN validation.
- 💳 **Deposit & Rental Payments**: Stepwise payment enforcement: Deposit (moves to `booked`) -> Admin Allocation -> Rental Fee (moves to `rent_paid` or `picked_up`).
- 🚚 **Live Timeline Tracking**: Event-driven tracking timeline (`/bookings/{id}/track`) showing every stage from reservation to sanitization.
- ↩️ **Return Processing & Fine Auditing**: Automatic computation of late return days, daily fine rates, damage deductions, and net deposit refunds.
- 🧼 **Sanitization & Dry-Cleaning Logistics**: Dispatches returned pieces to certified dry-cleaning vendors with priority levels and turnaround tracking.
- 🏢 **Dry Cleaner Partner Portal**: Separate interface (`/dry-cleaning/login`) for fabric care specialists to accept dispatches and mark items sanitized.
- 💌 **Concierge Inquiries API**: Connects the contact form directly to `/contact/` for bespoke styling and bridal consultations.
- 📊 **Audit & Financial Breakdown**: Itemized booking payment summaries (`/payments/breakdown/{id}`) and admin client transaction histories.

---

## 🚀 Quickstart Guide

### 1️⃣ Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL (or local SQLite auto-provisioning)

### 2️⃣ Environment Setup

Copy `.env.example` to `.env`:

```env
APP_NAME=Elenora-Website
ACCESS_TOKEN_SECRET_KEY=elenora_access_token_secret_key_super_secure_99182371
REFRESH_TOKEN_SECRET_KEY=elenora_refresh_token_secret_key_super_secure_88273641
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=sqlite+aiosqlite:///./asset_tracking.db
# For PostgreSQL:
# DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/asset_tracking
ADMIN_EMAIL=admin@elanora-luxury.com
ADMIN_PASSWORD=AdminPassword123!
ADMIN_FULL_NAME=Elenora Concierge
```

### 3️⃣ Seed Initial Database

Run the database seed script to initialize tables and populate demo assets, categories, plans, and accounts:

```bash
python -m app.db.seed
```

### 4️⃣ Run the Automated Test Suite

```bash
python -m pytest tests/ -v
```

### 5️⃣ Run the Backend API

```bash
uvicorn app.main:app --reload --port 8000
```

- 📚 API Swagger Documentation: http://127.0.0.1:8000/docs
- ❤️ Health Check: http://127.0.0.1:8000/health

### 6️⃣ Run the Frontend

```bash
cd frontend-app
npm install
npm run dev
```

- 🌐 Web Application: http://localhost:5173

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user account | Public |
| `POST` | `/auth/login` | Login, get access token + refresh cookie | Public |
| `POST` | `/auth/refresh` | Refresh access token | Public |
| `POST` | `/auth/logout` | Revoke session and clear cookies | Authenticated |
| `POST` | `/auth/change-password` | Update user password | Authenticated |
| `GET` | `/users/me` | Current user profile | Authenticated |
| `PUT` | `/users/me` | Update name and phone | Authenticated |
| `GET` | `/categories/` | List asset categories | Public |
| `GET` | `/rental-plans/` | List available rental duration tiers | Public |
| `GET` | `/assets/` | Filter assets by name, category, or status | Public |
| `POST` | `/assets/upload-image` | Upload garment photograph | Admin |
| `POST` | `/bookings/` | Create a new rental reservation | Client |
| `POST` | `/payments/deposit/{id}` | Pay security deposit | Client / Admin |
| `POST` | `/admin/allocate/{id}` | Assign available garment to booking | Admin |
| `POST` | `/payments/rent/{id}` | Complete rental payment | Client / Admin |
| `POST` | `/admin/returns/{id}` | Process return & calculate refunds | Admin |
| `GET` | `/tracking/bookings/{id}` | Retrieve booking event timeline | Client / Admin |
| `GET` | `/dry-cleaning/portal/my-jobs` | View dispatched cleaning jobs | Dry Cleaner / Admin |
| `POST` | `/contact/` | Submit concierge client inquiry | Public |
