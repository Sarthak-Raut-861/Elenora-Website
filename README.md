# 📦 Asset Tracking System - Full Stack Rental & Lifecycle Management

FastAPI | JWT Auth | RBAC | Async SQLAlchemy | PostgreSQL | React + TypeScript | Vite

A production-ready full-stack application for managing rentable assets end-to-end. Users can browse assets, create bookings, pay deposits and rent, and request returns. Admins manage assets, categories, rental plans, allocation, return processing, payments, and user operations through role-protected workflows.

This project demonstrates real-world backend architecture with secure auth, async database operations, transactional business flows, and a modern frontend.

## 🔥 Features

- 🔐 JWT Authentication: Access token + refresh token flow with secure password hashing.
- 👥 Role-Based Access Control: Separate permissions for Admin and User roles.
- 🔄 Asset Lifecycle Management: Available -> Allocated -> Returned status transitions.
- 🧾 Booking Workflow: Create, list, cancel, and return-request flows for users.
- 🧩 Allocation Operations: Admin assigns specific assets to approved bookings.
- 💳 Payment Handling: Deposit and rent payments with booking-state enforcement.
- ↩️ Return Processing: Late fine and damage charge handling with deposit refund logic.
- 📊 Payment Breakdown: Detailed booking-level payment/charge summary.
- 🛡️ User Management: Admin role assignment, activation toggle, and user history views.
- 🎨 Modern Frontend: React + TypeScript UI with protected routes and admin dashboard.
- 🗄️ PostgreSQL Storage: Persistent relational data using SQLAlchemy models.

## 🎯 How It Works

### 👤 For Users

1. Register/Login - Create an account and authenticate.
2. Browse Assets - View available assets, categories, and plans.
3. Create Booking - Select plan and pickup date, optionally request a specific asset.
4. Pay Deposit - Confirm booking by paying deposit.
5. Pay Rent - Complete payment after admin allocation.
6. Request Return - Trigger return flow after usage.
7. Track Status - View booking progression and payment breakdown.

### 👨‍💼 For Admins

1. Configure Catalog - Manage categories, rental plans, and assets.
2. Review Bookings - Access all bookings and request state.
3. Allocate Asset - Assign available assets to booked requests.
4. Process Returns - Calculate fines/damage and process deposit refunds.
5. Manage Users - Update user info, assign role, activate/deactivate accounts.
6. Audit Activity - View allocations and user history.

## 🧰 Tech Stack

### ⚙️ Backend

- ⚡ FastAPI - Async REST API framework.
- 🧠 SQLAlchemy Async + AsyncPG - Async ORM and PostgreSQL driver.
- 🧭 Alembic - Database migrations.
- ✅ Pydantic - Data validation and schema contracts.
- 🔒 Passlib + bcrypt - Password hashing.
- 🔑 python-jose - JWT token handling.

### 🎨 Frontend

- ⚛️ React 19 + TypeScript - UI and type-safe client logic.
- ⚡ Vite - Fast dev server and build tool.
- 🧭 React Router - Client-side routing.
- 🧪 React Hook Form + Zod - Form handling and validation.
- 🎬 Framer Motion - UI motion and transitions.

### 🔐 Security

- 🪪 Access token in Authorization header.
- 🍪 Refresh token via HTTP-only cookie.
- 🚧 Role-gated endpoints using dependency-based RBAC.
- 🧷 Input validation and ORM-backed query safety.

## 🔑 Authentication Flow

1. User registers through /auth/register.
2. User logs in through /auth/login.
3. Server returns access token and sets refresh token cookie.
4. Frontend sends Authorization: Bearer token on protected requests.
5. On access token expiry, frontend calls /auth/refresh and retries.
6. Logout revokes refresh token and clears cookie.

Register -> Login -> Access Token + Refresh Cookie -> Protected APIs -> Refresh -> Continue

## 🔄 Booking, Allocation, Payment, Return Flow

1. User creates booking with rental plan and pickup date.
2. User pays deposit to move booking from pending to booked.
3. Admin allocates an available asset to move booking to allocated.
4. User pays rent to mark booking as picked_up.
5. User requests return when done.
6. Admin processes return, computes late fine/damage, updates asset availability, and records refund/charges.

## 🚀 Getting Started

### 1️⃣ Prerequisites

- 🐍 Python 3.13+
- 🐘 PostgreSQL 14+
- 🟢 Node.js 20+ and npm

### 2️⃣ Clone Repository

git clone https://github.com/Shounak-Chavan/Asset-Tracking-System.git
cd Asset-Tracking-System/Project

### 3️⃣ Backend Setup

python -m venv .venv

Windows (PowerShell):
.venv\Scripts\Activate.ps1

Windows (Git Bash):
source .venv/Scripts/activate

Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt

### 4️⃣ Configure Environment

Create a .env file in project root:

APP_NAME=Asset-Tracking-System
ACCESS_TOKEN_SECRET_KEY=your-access-secret
REFRESH_TOKEN_SECRET_KEY=your-refresh-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/asset_tracking
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=StrongAdminPassword123
ADMIN_FULL_NAME=System Admin

### 5️⃣ Initialize Database

Create database in PostgreSQL:

psql -U postgres
CREATE DATABASE asset_tracking;
\q

Run migrations:

alembic upgrade head

Seed default admin:

python -m app.db.seed

### 6️⃣ Run Backend

uvicorn app.main:app --reload --port 8000

### 7️⃣ Run Frontend

cd frontend-app
npm.cmd install
npm.cmd run dev

Optional frontend env in frontend-app/.env:

VITE_API_BASE_URL=http://127.0.0.1:8000

### 8️⃣ Access the App

- 🌐 Frontend: http://localhost:5173
- 📚 API Docs: http://127.0.0.1:8000/docs
- ❤️ Health Check: http://127.0.0.1:8000/health

## 📁 Project Structure

Asset-Tracking-System/
|-- app/
|   |-- api/                      # FastAPI routers
|   |-- core/                     # config, auth, rbac, dependencies
|   |-- db/                       # session, base, init, seed
|   |-- models/                   # SQLAlchemy models
|   |-- schemas/                  # Pydantic schemas
|   |-- services/                 # Booking/allocation/payment/return logic
|   |-- utils/                    # Helper utilities
|   `-- main.py                   # App entrypoint
|-- alembic/                      # DB migrations
|-- frontend-app/
|   |-- src/
|   |   |-- pages/                # User pages
|   |   |-- pages/admin/          # Admin pages
|   |   |-- components/           # Shared components
|   |   |-- layouts/              # Layout wrappers
|   |   |-- api.ts                # API client
|   |   `-- auth-context.tsx      # Auth state and token refresh
|   `-- package.json
|-- requirements.txt
|-- pyproject.toml
`-- README.md

## 🖥️ Frontend Pages

### 🌍 Public Pages

- 🏠 / - Home page
- 🔐 /login - Login page
- 📝 /register - Registration page

### 👤 User Pages

- 📦 /assets - Browse and filter assets
- 🧾 /bookings - Create and manage bookings
- 👤 /profile - View and edit profile

### 🛠️ Admin Pages

- 🗃️ /admin/assets - Asset management
- 🏷️ /admin/categories - Category management
- 📅 /admin/plans - Rental plan management
- 👥 /admin/users - User administration
- ⚙️ /admin/ops - Allocation, returns, and operational actions

## 📡 API Endpoints

### ❤️ Health

- ❤️ GET /health - Service health check

### 🔑 Authentication

- 📝 POST /auth/register - Register new user
- 🔐 POST /auth/login - Login and receive access token
- 🔄 POST /auth/refresh - Refresh access token
- 🚪 POST /auth/logout - Logout and revoke refresh token
- 🔑 POST /auth/change-password - Change current user password

### 👥 Users

- 👤 GET /users/me - Get own profile
- ✏️ PUT /users/me - Update own profile
- 📋 GET /users - List users (admin)
- 🔍 GET /users/{user_id} - Get user by id (admin)
- 🛠️ PUT /users/{user_id} - Update user by id (admin)
- 🪪 PATCH /users/{user_id}/role - Assign role (admin)
- 🔁 PATCH /users/{user_id}/activate - Activate/deactivate user (admin)
- 📚 GET /users/{user_id}/history - User booking/payment history (admin)

### 🗂️ Categories

- ➕ POST /categories - Create category (admin)
- 📋 GET /categories - List categories
- 🔍 GET /categories/{category_id} - Get category
- ✏️ PATCH /categories/{category_id} - Update category (admin)
- 🗑️ DELETE /categories/{category_id} - Delete category (admin)

### 📅 Rental Plans

- ➕ POST /rental-plans - Create plan (admin)
- 📋 GET /rental-plans - List active plans
- 🔍 GET /rental-plans/{plan_id} - Get plan by id
- ✏️ PATCH /rental-plans/{plan_id} - Update plan (admin)
- 🧹 DELETE /rental-plans/{plan_id} - Soft delete plan (admin)

### 📦 Assets

- ➕ POST /assets - Create assets (admin, bulk supported)
- 📋 GET /assets - List/filter assets
- 🔍 GET /assets/{asset_id} - Get asset by id
- ✏️ PATCH /assets/{asset_id} - Update asset (admin)
- 🧹 DELETE /assets/{asset_id} - Soft delete asset (admin)

### 🧾 Bookings

- ➕ POST /bookings - Create booking
- 📋 GET /bookings - List current user bookings
- 🧾 GET /bookings/admin/all - List all bookings (admin)
- ❌ DELETE /bookings/{booking_id} - Cancel pending booking
- ↩️ PATCH /bookings/{booking_id}/request-return - Request return

### 🧑‍🔧 Admin Allocation and Return Ops

- 📋 GET /admin/allocations - List allocations (admin)
- 🧩 POST /admin/allocate/{booking_id} - Allocate asset to booking (admin)
- 🚫 PATCH /admin/bookings/{booking_id}/reject - Reject booking (admin)
- ↩️ POST /admin/returns/{booking_id} - Process return (admin)

### 💳 Payments

- 💰 POST /payments/deposit/{booking_id} - Pay booking deposit
- 💵 POST /payments/rent/{booking_id} - Pay booking rent
- 📊 GET /payments/breakdown/{booking_id} - Booking payment breakdown

## 🧠 Key Learnings

- ⚡ Async FastAPI service layering and dependency injection
- 🛡️ Role-based authorization with reusable route guards
- 🔄 State-machine style booking lifecycle enforcement
- 💹 Payment and return accounting with clear audit records
- 🍪 Refresh-token cookie strategy for better UX and security
- 🧩 Full-stack integration with typed React client contracts

## 🔮 Future Improvements

- 💳 Add real payment gateway integration (Razorpay/Stripe)
- 🔔 Add background jobs and notifications for due/overdue reminders
- 📄 Add pagination and advanced filters to admin lists
- 🧪 Add comprehensive unit and integration tests
- 🐳 Add Docker and docker-compose for one-command startup
- 📈 Add observability stack (metrics, tracing, structured logs)
- 🤖 Add CI/CD workflows and automated security scanning

## 🛠️ Troubleshooting

### 🪟 Frontend npm policy issues on Windows

If PowerShell blocks npm scripts, use:

npm.cmd install
npm.cmd run dev

### 🗄️ Database connection errors

- ✅ Verify PostgreSQL is running.
- 🔎 Confirm DATABASE_URL uses postgresql+asyncpg scheme.
- 🧱 Ensure database exists before migration.

### 🚫 401 Unauthorized after login

- 📡 Confirm Authorization header is being sent.
- 🔐 Ensure access token secret in .env matches server runtime.
- 🍪 Check refresh cookie settings when using different hosts/ports.

### 🧩 Migration issues

- ▶️ Run alembic upgrade head.
- 🧩 If schema drift exists, create/adjust migration in alembic/versions.

## ⚠️ Disclaimer

This project is intended for educational and portfolio use. For production deployment, add stronger security hardening, stricter secret management, full test coverage, and operational monitoring.

## 👨‍💻 Author

Made with ❤️ by Shounak.

⭐ If this project helped you, consider starring the repository.

