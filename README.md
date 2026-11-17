# 👑 ELANORA — Haute Couture & Luxury Designer Rental Atelier

<p align="center">
  <img src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80" alt="Elanora Luxury Atelier" width="100%" style="border-radius: 12px; max-height: 420px; object-fit: cover;" />
</p>

<p align="center">
  <strong>An omnichannel luxury fashion portal, bridal concierge, and serialized couture inventory lifecycle engine.</strong>
</p>

<p align="center">
  <a href="https://elenora-website.vercel.app"><img src="https://img.shields.io/badge/Live_Storefront-Vercel-black?style=for-the-badge&logo=vercel" alt="Live Storefront" /></a>
  <a href="https://elenora-website.onrender.com/docs"><img src="https://img.shields.io/badge/API_Docs-Swagger-C9A34A?style=for-the-badge&logo=fastapi&logoColor=white" alt="API Docs" /></a>
  <a href="https://github.com/Sarthak-Raut-861/Elenora-Website"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Database-Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase DB" /></a>
</p>

---

## 👨‍💻 Created & Architected By

<div align="center">
  <h3><strong>Sarthak Raut</strong></h3>
  <p><em>Founder & Full-Stack Systems Architect</em></p>
  <p>
    <a href="https://github.com/Sarthak-Raut-861"><strong>GitHub (@Sarthak-Raut-861)</strong></a> • 
    <a href="mailto:sarthakraut1484@gmail.com"><strong>Contact via Email</strong></a> • 
    <a href="https://elenora-website.vercel.app"><strong>Live Platform</strong></a>
  </p>
  <blockquote>
    <em>"ELANORA was designed and built from the ground up to solve the operational complexities of high-value designer fashion rentals — blending haute couture aesthetics with enterprise-grade serialized asset lifecycle tracking, automated sanitization logistics, and high-performance cloud infrastructure."</em>
  </blockquote>
</div>

---

## 🌟 Live Deployments

| Component | Platform | URL |
| :--- | :--- | :--- |
| **Storefront & Admin Console** | **Vercel** | [https://elenora-website.vercel.app](https://elenora-website.vercel.app) |
| **REST API Server (ASGI)** | **Render** | [https://elenora-website.onrender.com](https://elenora-website.onrender.com) |
| **Interactive API Documentation** | **Render Swagger** | [https://elenora-website.onrender.com/docs](https://elenora-website.onrender.com/docs) |
| **Cloud Database** | **Supabase (PostgreSQL 16)** | *South Asia (Mumbai) Cluster* |
| **Media & CDN Storage** | **Supabase Storage** | *Public Bucket: `product-media`* |

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    Client["👑 Client / Shopper Browser"]
    Admin["🔐 Admin / Atelier Console"]

    subgraph Frontend_Layer ["1. Frontend Storefront (Vercel)"]
        FE["React 19 + TypeScript + Vite\nTailwind & Custom Dark-Gold Design System\nFramer Motion Runway Reels"]
    end

    subgraph Backend_Layer ["2. API & Business Logic (Render)"]
        BE["FastAPI (Python 3.11 ASGI)\nAsync SQLAlchemy 2.0 + Asyncpg\nSlowAPI Rate Limiter & Pillow EXIF Engine"]
    end

    subgraph Database_Layer ["3. Database (Supabase PostgreSQL)"]
        DB[("PostgreSQL 16 Enterprise Cluster\nSession Pooler & SSL Asyncpg\nTables: Assets, Categories, Bookings, Users, Offers")]
    end

    subgraph Storage_Layer ["4. Media & Cloud Storage (Supabase CDN)"]
        CDN["Supabase Object Storage\nBucket: product-media\nGlobal Edge CDN (Images & 4K Runway Videos)"]
    end

    Client -->|Browse, Wishlist, Reserve, Watch Reels| FE
    Admin -->|Catalog CRUD, Barcode Serialization, Returns| FE
    FE -->|REST API Requests & JWT Auth| BE
    BE -->|Async Database Queries| DB
    BE -->|Upload Product Images & Runway Videos| CDN
    FE -->|Stream High-Res Photos & 4K Videos| CDN
```

---

## 💎 Core Feature Highlights

### 1. Dual Commerce Architecture (Rent Vault & Buy-to-Own)
- **Rental Vault**: White-glove couture rentals for 3, 5, or 7 days with custom hand-pressing and 100% refundable security deposits.
- **Buy to Own**: Permanent acquisition of handcrafted heirloom lehengas, bespoke sherwanis, and casual chic designer collections.
- **Dynamic Grouping**: Automatically clusters serialized physical units into unique design cards with real-time stock counters (`• 3 in stock`).

### 2. High-Definition Runway Video Reels
- Direct upload support for product runway videos (MP4, WebM, MOV up to 100MB).
- Custom storefront video reel player with instant toggle between high-res multi-angle still photography and runway motion video.
- Golden video badge overlay on catalog cards.

### 3. Universal Media Engine & Supabase Cloud Storage
- Native support for **HEIC/HEIF (iOS)**, **AVIF**, **WEBP**, **PNG**, **JPG**, **GIF**, **BMP**, **SVG**, and **TIFF** up to 35MB.
- Automatic EXIF orientation transposition and image normalization via Pillow.
- Uploads directly to **Supabase Cloud Storage** with permanent public CDN delivery — immune to server restarts.

### 4. Serialized Barcode & Inventory Lifecycle Tracking
- Each physical garment is assigned a unique tracking barcode (`SKU-001`, `SKU-002`) to track real-time status: `Available`, `Reserved`, `Picked Up`, `In Dry Cleaning`, or `Retired`.
- Real-time stock visibility for both atelier staff and online shoppers.

### 5. Certified Dry-Cleaning Logistics Portal
- Dedicated partner portal (`/dry-cleaning/login`) for fabric care specialists.
- Automated sanitization dispatches with priority tagging, batch manifests, and certification upon completion before returning to vault inventory.

### 6. Security, KYC & Identity Verification
- Robust JWT session management with refresh token cookies and bcrypt password hashing.
- Role-Based Access Control (`Admin`, `Staff`, `Customer`, `Dry Cleaner`).
- KYC document validation (Aadhaar / PAN) for high-value couture rental security.

---

## 🛠️ Complete Tech Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide React, TanStack Query |
| **Backend** | Python 3.11, FastAPI (ASGI), Pydantic v2, SlowAPI, Pillow (PIL), HTTPX |
| **Database** | PostgreSQL 16 on Supabase with `asyncpg` and SQLAlchemy 2.0 AsyncIO |
| **Cloud Storage** | Supabase Object Storage (`product-media` bucket) with Edge CDN delivery |
| **Hosting & CI/CD** | Vercel (Frontend), Render (Backend Web Service), GitHub Actions |
| **Testing** | Pytest, Pytest-AsyncIO, Respx, SQLite In-Memory Isolation |

---

## 🚀 Quickstart & Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Sarthak-Raut-861/Elenora-Website.git
cd Elenora-Website
```

### 2. Backend Setup (FastAPI)

```bash
# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env
```

Edit `.env` to include your Supabase Database URL and Storage keys:
```env
APP_NAME=Elenora-Website
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xhbgchyuyigpmkobhtth.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key
SUPABASE_STORAGE_BUCKET=product-media
ADMIN_EMAIL=admin@elanora-luxury.com
ADMIN_PASSWORD=AdminPassword123!
```

### 3. Run Backend Server & Automated Tests

```bash
# Run unit & integration test suite
pytest

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
- Swagger API Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health`

### 4. Frontend Setup (React + Vite)

```bash
cd frontend-app
npm install
npm run dev
```
- Local Storefront: `http://localhost:5173`

---

## 🔑 Administrative Demo Credentials

| Role | Email | Password | Access Dashboard |
| :--- | :--- | :--- | :--- |
| **Atelier Administrator** | `admin@elanora-luxury.com` | `AdminPassword123!` | `/admin` |
| **Dry Cleaning Partner** | `cleaner@elanora-luxury.com` | `CleanerPass123!` | `/dry-cleaning/portal` |
| **Luxury Client Account** | `client@example.com` | `ClientPassword123!` | `/assets`, `/profile` |

---

## 📜 Key API Endpoints

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register customer account with phone & email | Public |
| `POST` | `/auth/login` | Authenticate and obtain JWT access token | Public |
| `GET` | `/categories/` | Fetch 16 curated haute couture collections | Public |
| `GET` | `/assets/` | Browse catalog with category, price & type filters | Public |
| `POST` | `/assets/upload-image` | Upload image directly to Supabase CDN | Admin / Staff |
| `POST` | `/assets/upload-video` | Upload runway video directly to Supabase CDN | Admin / Staff |
| `POST` | `/bookings/` | Create couture rental reservation | Authenticated |
| `POST` | `/payments/deposit/{id}` | Process refundable security deposit | Authenticated |
| `POST` | `/admin/allocate/{id}` | Assign serialized barcode to reservation | Admin |
| `POST` | `/admin/returns/{id}` | Audit return, compute late fines & refund deposit | Admin |
| `GET` | `/tracking/bookings/{id}` | Real-time booking event timeline tracking | Authenticated |
| `GET` | `/dry-cleaning/portal/my-jobs` | Partner dry cleaning queue & batch manifest | Dry Cleaner |

---

## 📄 License & Attribution

Designed, developed, and maintained with ❤️ by **[Sarthak Raut](https://github.com/Sarthak-Raut-861)**.

All rights reserved. Proprietary software crafted for the **ELANORA Luxury Boutique** ecosystem.
