# CivicTrack — Smart Public Issue Reporting System

**CivicTrack** is a full-stack civic-tech web application that empowers citizens to report local infrastructure issues (such as potholes, overflowing waste bins, broken streetlights, water leakages, and damaged public amenities) and monitor their resolution in real time. It equips municipal administrators and department field staff with operational dashboards, geolocation mapping, automated workflow tracking, role-based authorization, and analytical metrics.

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Environment Variables](#environment-variables)
7. [Database Seeding & Demo Accounts](#database-seeding--demo-accounts)
8. [Development & Production Commands](#development--production-commands)
9. [Automated Testing](#automated-testing)
10. [REST API Documentation](#rest-api-documentation)
11. [Workflow & Role-Based Permissions](#workflow--role-based-permissions)
12. [Metrics & Calculation Definitions](#metrics--calculation-definitions)
13. [Image Storage & Map Configuration](#image-storage--map-configuration)
14. [Troubleshooting](#troubleshooting)
15. [Deployment Guide](#deployment-guide)

---

## 1. Features

### Citizen Portal
- **Streamlined Reporting:** Submit complaints with title, description, category, and address.
- **GPS & Interactive Pinning:** Automatically capture browser GPS coordinates or place/drag a marker on an interactive Leaflet map. GPS is entirely optional with graceful fallback to manual location descriptions.
- **Photo Uploads:** Upload up to 3 photographs (JPEG, PNG, WebP) with client-side previews and server-side magic-byte validation.
- **Personal Dashboard:** View total, pending, in-progress, and resolved complaints.
- **Chronological Timeline:** Follow step-by-step progress from Submission to Resolution with timestamped actor actions and reasons.
- **In-App Notifications:** Real-time feedback for assignment, review updates, requests for more information, and resolution.
- **Anonymous Public Tracking:** Anyone with a reference number (e.g., `CT-2026-000001`) can track complaint status without exposing citizen personal details.
- **Complaint Management:** Citizens can withdraw complaints before review begins, or reopen a previously resolved/rejected issue with a mandatory reason.

### Administrator Workspace
- **KPI Overview:** Live metrics for total complaints, new, under review, in progress, resolved, rejected, resolution rate, and average resolution time.
- **Interactive Analytics:** Interactive charts (using Recharts) for volume over time, distribution by category, status breakdown, department resolution performance, and geographic clusters.
- **Complaint Management Table:** Server-side search, filtering by status, category, priority, department, and submission date ranges, sorting, and pagination.
- **Operational Actions:** Assign complaints to departments and designated staff, adjust priority, update status, flag duplicates, and add internal notes vs. citizen-visible updates.
- **CSV Data Export:** Authorized export of complaint datasets with formula injection protection (`=`, `+`, `-`, `@`).
- **Interactive Map View:** Geographic cluster visualization of complaints with color-coded status markers, detail popups, and quick links.
- **Department & Staff Administration:** Create and update departments, activate/deactivate departments, assign staff, and safely delete unused or reassigned departments.
- **User Management:** Manage citizen, staff, and admin accounts, activate/deactivate logins, and manage roles with protections against deactivating the last administrator.

### Department Staff Workspace
- **Scoped Operations:** Staff view only complaints assigned to their designated department or directly to their account.
- **Status Workflow Updates:** Permitted to transition complaints to `in_progress` or `resolved`.
- **Resolution Proof:** Attach completion notes and upload an "after photo" upon marking an issue as resolved.

---

## 2. Technology Stack

- **Frontend:**
  - React 18 with Vite
  - Tailwind CSS with custom civic palette
  - React Router DOM v6
  - Axios for HTTP requests
  - Leaflet & React-Leaflet with OpenStreetMap tiles
  - Recharts for analytics & dashboards
  - Lucide React for consistent iconography
  - React Hook Form for client validation

- **Backend:**
  - Node.js & Express.js (ES Modules)
  - MongoDB & Mongoose ODM
  - JSON Web Tokens (JWT) stored in HTTP-only, SameSite cookies
  - bcrypt for password hashing (12 rounds)
  - Multer for file uploads with custom magic-byte type verification
  - Zod for server-side schema validation and sanitization
  - Helmet & CORS for security headers
  - express-rate-limit for endpoint throttling

- **Testing:**
  - Vitest & Supertest for backend API and integration testing
  - Vitest, React Testing Library, and jsdom for frontend unit and workflow testing
  - MongoDB Memory Server for isolated, zero-dependency test execution

---

## 3. Architecture Overview

```
civictrack/
├── client/                     # Vite + React Frontend
│   ├── public/                 # Static assets & favicon
│   ├── src/
│   │   ├── components/         # Reusable UI, Maps, Timeline, Route Guards
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── features/           # ComplaintsList, ComplaintDetail, Action Modals
│   │   ├── hooks/              # useFetch, useDebounce
│   │   ├── layouts/            # PublicLayout, DashboardLayout
│   │   ├── pages/
│   │   │   ├── admin/          # AdminOverview, MapView, Departments, Users
│   │   │   ├── citizen/        # CitizenDashboard, ReportIssue, Profile, Notifications
│   │   │   ├── public/         # Landing, AuthPages, Public Tracking, Legal
│   │   │   └── staff/          # StaffDashboard
│   │   ├── services/           # Axios client with interceptors
│   │   ├── test/               # React Testing Library test suite
│   │   └── utils/              # Formatters, constants, helpers
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                     # Express.js Backend
│   ├── scripts/
│   │   ├── seed.js             # Realistic demo data seeder
│   │   └── dev-memory.js       # In-memory MongoDB dev runner
│   ├── src/
│   │   ├── app.js              # Express app configuration & middleware
│   │   ├── config/             # Environment & defaults configuration
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Auth, validation, upload, error handling
│   │   ├── models/             # Mongoose schemas (User, Complaint, Dept, Notif, Counter)
│   │   ├── routes/             # REST route declarations
│   │   ├── services/           # Workflow, stats, storage, notifications
│   │   ├── utils/              # Constants, HTTP helpers
│   │   ├── validators/         # Zod schemas for request payloads
│   │   └── server.js           # Server bootstrap
│   └── tests/                  # Backend test suite (Vitest + Supertest)
├── .env.example                # Configuration template
├── .gitignore
├── package.json                # Root automation scripts
└── README.md
```

---

## 4. Prerequisites

- **Node.js:** `v18.0.0` or higher (`v20+` or `v24+` recommended)
- **npm:** `v9.0.0` or higher
- **MongoDB:** Local MongoDB instance (`mongodb://127.0.0.1:27017`) or a free MongoDB Atlas cluster.
  *(Alternatively, you can run the backend without installing MongoDB using `npm run dev:server:memory`)*

---

## 5. Installation & Setup

1. **Clone or navigate to the repository:**
   ```bash
   cd civictrack
   ```

2. **Install dependencies:**
   Install backend and frontend packages:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install

   # Return to project root
   cd ..
   ```

3. **Configure Environment:**
   Copy the `.env.example` file to create `.env`:
   ```bash
   cp .env.example .env
   ```

---

## 6. Environment Variables

Configure the following variables in `.env`:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `CLIENT_URL` | Frontend origin for CORS and password reset URLs | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/civictrack` |
| `JWT_SECRET` | Secret key for signing session tokens (min 32 chars in prod) | *(dev fallback provided)* |
| `JWT_EXPIRES_IN` | Token validity duration | `7d` |
| `STORAGE_DRIVER` | File storage provider (`local`) | `local` |
| `UPLOAD_DIR` | Directory where uploaded images are saved | `uploads` |
| `MAX_UPLOAD_MB` | Maximum allowed image file size in Megabytes | `5` |
| `EMAIL_ENABLED` | Toggle email delivery (`true` / `false`) | `false` |
| `SMTP_HOST` | SMTP server host (optional) | `smtp.example.com` |
| `SMTP_PORT` | SMTP server port (optional) | `587` |
| `SMTP_USER` | SMTP username (optional) | — |
| `SMTP_PASS` | SMTP password (optional) | — |
| `SEED_PASSWORD` | Password assigned to seeded demo accounts | `Demo@12345` |
| `ALLOW_SEED` | Safety gate to prevent seeding production databases | `false` |

---

## 7. Database Seeding & Demo Accounts

CivicTrack includes a seed script that creates realistic municipal demo records, including departments, staff accounts, citizen accounts, and 48 complaints with varied statuses, coordinates, timelines, and updates.

To seed a local or Atlas MongoDB:
```bash
npm run seed
```

### Development Demo Accounts
All seeded accounts share the default development password: **`Demo@12345`**

| Role | Email | Purpose |
|---|---|---|
| **Administrator** | `admin@civictrack.demo` | Full access to manage complaints, analytics, users, departments |
| **Department Staff** | `roads.staff@civictrack.demo` | Roads & Highways staff member |
| **Department Staff** | `sanitation.staff@civictrack.demo` | Sanitation & Waste staff member |
| **Department Staff** | `water.staff@civictrack.demo` | Water & Drainage staff member |
| **Citizen** | `asha@civictrack.demo` | Citizen with active and resolved complaints |
| **Citizen** | `ravi@civictrack.demo` | Citizen with pending reports |
| **Citizen** | `meena@civictrack.demo` | Citizen account |

*(All seed accounts and complaints are explicitly flagged with `isDemo: true` in the database).*

---

## 8. Development & Production Commands

All commands can be run from the root directory using the root `package.json`:

### Development Mode (with standard MongoDB)
1. **Start the backend server:**
   ```bash
   npm run dev:server
   ```
   *Runs with `--watch` on port 5000.*

2. **Start the frontend development server:**
   ```bash
   npm run dev:client
   ```
   *Runs Vite dev server at http://localhost:5173 with proxy configured for `/api` and `/uploads`.*

### Zero-Config In-Memory Mode (No MongoDB installation required)
If you do not have MongoDB running locally, you can start the backend using an ephemeral in-memory database pre-seeded with demo records:
```bash
npm run dev:server:memory
```

### Production Build & Run
1. **Build the client:**
   ```bash
   npm run build
   ```
   *Compiles production assets to `client/dist`.*

2. **Start the production server:**
   ```bash
   npm start
   ```
   *Runs `server/src/server.js`. In production, the Express server automatically serves the built frontend SPA from `client/dist` if present.*

---

## 9. Automated Testing

The project includes unit, integration, and security test suites for both backend and frontend.

### Running Backend Tests
```bash
npm run test:server
```
Runs 52 automated tests in `server/tests/` using Vitest, Supertest, and `mongodb-memory-server`:
- Citizen registration, input validation, bcrypt password hashing, and HttpOnly cookies.
- Authentication barriers, session invalidation upon deactivation, and password resets.
- Complaint creation with sequential IDs, GeoJSON coordinate ordering `[longitude, latitude]`, and optional GPS handling.
- Anti-tampering tests (ignoring client-supplied `citizenId`, `status`, or `priority`).
- File upload verification: MIME validation, magic-byte header inspection, file size capping, and traversal prevention.
- Role-based authorization & data isolation (citizens never see other users' reports or internal administrative notes).
- Workflow transition state machine (rejecting illegal status hops).
- Safe department deletion and administrator removal protections.
- KPI calculations and CSV export formula injection sanitization.

### Running Frontend Tests
```bash
npm run test:client
```
Runs 13 test suites in `client/src/test/` using Vitest and React Testing Library:
- Badge and progress rendering for all workflow states.
- Accessible pagination, modals, and focus handling.
- Timeline ordering and reason presentation.
- Client-side form validations and error mapping.
- Role-based route guard redirects.

### Running All Tests
```bash
npm test
```

---

## 10. REST API Documentation

### Authentication
- `POST /api/auth/register` — Register a citizen account.
- `POST /api/auth/login` — Sign in and receive HTTP-only session cookie.
- `POST /api/auth/logout` — Clear session cookie.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `PATCH /api/auth/me` — Update name or phone number.
- `POST /api/auth/change-password` — Change password with current password verification.
- `POST /api/auth/forgot-password` — Initiate password reset token.
- `POST /api/auth/reset-password` — Complete password reset with single-use token.

### Public Endpoints (No Auth Required)
- `GET /api/public/stats` — Real-time aggregate counts and resolution rates.
- `GET /api/public/resolved` — Latest resolved complaints with after-photos (no personal info).
- `GET /api/complaints/reference/:referenceNumber` — Public tracking details by reference code.

### Complaints
- `POST /api/complaints` — Submit a complaint (Citizen only, accepts multipart images).
- `GET /api/complaints` — List complaints (Scoped: citizen sees own, staff sees department, admin sees all).
- `GET /api/complaints/export` — Export filtered complaints to CSV (Admin only).
- `GET /api/complaints/map` — Retrieve geolocated complaints for map view (Staff & Admin).
- `GET /api/complaints/:id` — Retrieve full complaint details and history.
- `GET /api/complaints/:id/duplicates` — Find nearby duplicates within 100 meters (Admin only).
- `PATCH /api/complaints/:id` — Update description (Citizen before review) or priority/category (Admin).
- `DELETE /api/complaints/:id` — Withdraw complaint (Citizen only, when status is `submitted`).
- `PATCH /api/complaints/:id/status` — Update status (Staff & Admin, supports resolution photo).
- `PATCH /api/complaints/:id/assign` — Assign department and staff (Admin only).
- `POST /api/complaints/:id/notes` — Add internal notes or citizen-visible updates (Staff & Admin).
- `POST /api/complaints/:id/reopen` — Reopen a resolved/rejected complaint with reason (Citizen & Admin).

### Dashboards & Analytics
- `GET /api/dashboard/citizen` — Personal counts, recent submissions, and notifications.
- `GET /api/dashboard/admin` — System-wide KPIs with date-range filters.
- `GET /api/dashboard/department` — Department performance metrics for staff.
- `GET /api/analytics/complaints` — Aggregated timeseries, category, status, and geographic volume.
- `GET /api/analytics/departments` — Department-by-department resolution rates and workload.

### Departments & Users
- `GET /api/departments` — List active departments (Admins receive counts and inactive departments).
- `POST /api/departments` — Create department (Admin only).
- `PATCH /api/departments/:id` — Update or deactivate department (Admin only).
- `DELETE /api/departments/:id` — Delete department with safe reassignment guard (Admin only).
- `GET /api/departments/:id/staff` — List staff assigned to department (Admin only).
- `GET /api/users` — List and search user accounts (Admin only).
- `POST /api/users/staff` — Create staff account under a department (Admin only).
- `PATCH /api/users/:id` — Update user details or active status (Admin only).
- `PATCH /api/users/:id/role` — Modify account role (Admin only, protects last admin).

### Notifications
- `GET /api/notifications` — List user's notifications.
- `PATCH /api/notifications/:id/read` — Mark single notification as read.
- `PATCH /api/notifications/read-all` — Mark all notifications as read.

---

## 11. Workflow & Role-Based Permissions

### Allowed Status Transitions

| Current Status | Allowed Next Statuses | Actor Permitted |
|---|---|---|
| `submitted` | `under_review`, `assigned`, `rejected` | Admin (or Citizen can withdraw) |
| `under_review` | `assigned`, `rejected` | Admin |
| `assigned` | `in_progress`, `under_review`, `rejected` | Staff (`in_progress`), Admin |
| `in_progress` | `resolved`, `assigned` | Staff (`resolved`), Admin |
| `resolved` | `reopened` | Citizen, Admin (requires reason) |
| `rejected` | `reopened` | Citizen, Admin (requires reason) |
| `reopened` | `under_review`, `assigned`, `rejected` | Admin |

*(Department staff are strictly confined to `in_progress` and `resolved` on issues assigned to their department).*

---

## 12. Metrics & Calculation Definitions

1. **Resolution Rate:**
   $$\text{Resolution Rate} = \frac{\text{Resolved Complaints}}{\text{Total Complaints} - \text{Rejected Complaints}} \times 100$$
   *Explanation:* Rejected complaints are excluded from the denominator because they were determined to be non-actionable (e.g., duplicates, outside jurisdiction). If the denominator is 0, the rate returns 0.

2. **Average Resolution Time:**
   $$\text{Avg Resolution Time} = \frac{1}{N} \sum_{i=1}^N (\text{resolvedAt}_i - \text{createdAt}_i)$$
   *Explanation:* Calculated across all complaints currently in `resolved` status that possess a recorded `resolvedAt` timestamp. Expressed in hours (or days if $\ge 48$ hours).

---

## 13. Image Storage & Cloudinary Integration

CivicTrack uses **Cloudinary** for scalable, persistent cloud image hosting while storing clean references `{ url, publicId }` in MongoDB Atlas documents.

### Storage Drivers
- **Cloudinary Driver (`STORAGE_DRIVER=cloudinary`):**
  - Streams uploaded buffers directly to Cloudinary using `cloudinary.uploader.upload_stream`.
  - Saves images organized under a customizable folder (e.g., `civictrack/complaints/`).
  - Stores secure HTTPS URLs and public IDs in MongoDB.
  - Automatically cleans up uploaded Cloudinary assets if subsequent MongoDB document saves fail (rollback protection).
  - Deletes Cloudinary assets when complaints are withdrawn.
- **Local Fallback Driver (`STORAGE_DRIVER=local`):**
  - Used for offline test suites and local development without cloud credentials.
  - Saves images to `uploads/` with randomized 32-character hexadecimal filenames.

### Image Upload Security
- Images are accepted via `multipart/form-data` using Multer in memory.
- File buffers are checked against **magic byte signatures** (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `RIFF...WEBP` for WebP). Spoofed file extensions (such as an `.exe` renamed to `.jpg`) are rejected.
- Maximum file size is strictly enforced (configurable via `MAX_UPLOAD_MB`, default `5 MB`).
- Cloudinary API secret is kept exclusively on the server and never exposed to the frontend or browser.

### Migrating Existing Local Images to Cloudinary
If you have complaints referencing local files in `uploads/`, migrate them to Cloudinary with zero downtime:

1. **Dry-run verification (test without writing to Cloudinary or DB):**
   ```bash
   npm run migrate:cloudinary:dry
   ```
2. **Execute live migration:**
   ```bash
   npm run migrate:cloudinary
   ```
   *The migration script inspects each complaint, uploads missing local assets to Cloudinary, preserves references if local files are missing, and updates documents in MongoDB Atlas.*

### OpenStreetMap & Leaflet Map
- Map tiles use standard OpenStreetMap cartography (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).
- Tiles are attributed in compliance with OpenStreetMap contributor guidelines.
- Default map center can be adjusted via client environment variables:
  - `VITE_MAP_DEFAULT_LAT` (default: `13.0827`)
  - `VITE_MAP_DEFAULT_LNG` (default: `80.2707`)
  - `VITE_MAP_TILE_URL`

---

## 14. Troubleshooting

- **MongoDB connection error (`ECONNREFUSED`):**
  Ensure MongoDB is running locally (`mongod` or Docker container). Alternatively, test the application without a local database using `npm run dev:server:memory`.
- **Session cookie not stored in development:**
  Ensure the frontend runs on `http://localhost:5173` and requests are proxied or have `withCredentials: true`. In production, set `NODE_ENV=production` and ensure HTTPS is configured for secure cookies.
- **Port 5000 or 5173 is busy:**
  Modify `PORT` in `.env` for the server, or run `npm run dev -- --port 5174` for Vite.

---

## 15. Deployment Guide

### Single-Service Deployment (Container or Node Host)
1. Build the React frontend:
   ```bash
   cd client && npm install && npm run build
   ```
2. Move to server directory:
   ```bash
   cd ../server && npm install --omit=dev
   ```
3. Set environment variables on your production host (`NODE_ENV=production`, `PORT=8080`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`).
4. Start the server:
   ```bash
   node src/server.js
   ```
   *When `NODE_ENV=production`, Express automatically serves both the API and the pre-built React application from `client/dist` with client-side history fallback.*

### Split Deployment (Vercel/Netlify for Frontend + Render/Railway for Backend)
1. Deploy `server/` to your Node.js container host. Set `CLIENT_URL` to your production frontend domain and configure `JWT_SECRET` and `MONGODB_URI`.
2. Deploy `client/` to Vercel/Netlify. Set `VITE_API_URL` to point to your backend API URL, and configure reverse proxy or CORS headers appropriately.
