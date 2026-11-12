# Digital Notice Board

A full-stack, cloud-native Digital Notice Board platform designed for universities and academic institutions. Built with a React + Vite frontend, Node.js + Express backend, MongoDB Atlas / local database, Docker containerization, and Kubernetes deployment manifests.

---

## 🌟 Key Features

- **Role-Based Access Control (RBAC)**: Distinct permissions for `Admin`, `Faculty`, and `Student`.
  - **Admin**: Full administrative privileges: create/edit/delete notices, manage categories, manage users, configure system settings, view reports and analytics.
  - **Faculty**: Publish, edit, and schedule departmental and university-wide announcements.
  - **Student**: View active, relevant announcements filtered by target role and category.
- **Full CRUD Operations**:
  - Announcements: Create, Read (search, category, status filters), Update, and Delete.
  - Categories: Create, Read, Update (with automatic cascade rename to associated notices), and Delete (with dependency checks).
  - Scheduled Notices: Automated scheduler that publishes upcoming notices once due date arrives.
  - Users Management: Admin creation, registration, profile updates, and role assignments.
  - System Settings: Remote configuration for university name, notification toggles, and auto-expiry duration.
- **Reporting & Analytics**:
  - Publication reports with date and department filtering.
  - Category-wise distribution reports via MongoDB aggregation pipeline.
  - Real-time expired notice tracking.
- **Security & Validation**:
  - Password hashing with `bcryptjs` (salt rounds: 10).
  - Stateless authentication with JSON Web Tokens (`jsonwebtoken`).
  - Strict server-side input validation, duplicate email prevention, and regex email checking.
  - `.env` protection with global and repository `.gitignore`.
- **DevOps & Cloud-Native Ready**:
  - Multi-stage Dockerfiles for backend and frontend.
  - Nginx reverse-proxy configuration.
  - `docker-compose.yml` for unified local stack orchestration (frontend, backend, MongoDB).
  - Production-grade Kubernetes manifests (`k8s/`) with ConfigMaps, Secrets, PVCs, Deployments, and Services.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Vanilla CSS |
| **Backend** | Node.js (v20+), Express 5, Mongoose 9 |
| **Authentication** | JWT, bcryptjs |
| **Database** | MongoDB Atlas / Local MongoDB 7.0 |
| **Containerization** | Docker, Docker Compose, Nginx Alpine |
| **Orchestration** | Kubernetes (`apps/v1`, `v1`) |
| **Testing** | Node Native Test Runner (`node --test`), Supertest |

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: v20.19.0 or higher (v22 / v24 tested)
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas URI
- **Docker & Docker Compose** (optional, for containerized run)
- **kubectl** (optional, for Kubernetes deployment)

---

### 2. Environment Variables Configuration

#### Backend Configuration:
Create `backend/.env` (copy from `backend/.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/digital_notice_board
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/digital_notice_board?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars_long
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

> **Security Note:** Never commit `.env` files to git. Both root and backend `.gitignore` rules prevent accidental commits.

#### Frontend Configuration (Optional):
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```
*(Leave empty or omitted if using Vite dev proxy or Nginx reverse proxy).*

---

### 3. Local Development Execution

#### Terminal 1: Start Backend
```powershell
cd backend
npm install
npm run dev
# or: npm start
```
*Backend runs on `http://localhost:5000`.*

#### Terminal 2: Start Frontend
```powershell
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

Open `http://localhost:5173` in your browser:
1. On first run, complete the **One-Time Administrator Setup** to create the initial admin user.
2. Sign in or switch to **Register Account** to register student or faculty accounts.

---

## 🧪 Running Automated Tests

Run the backend test suite:
```powershell
npm test --prefix backend
```

Tests cover:
- Bcrypt password hashing & matching
- JWT signing & token decoding
- `authenticate` and `requireRole` middleware checks
- Mongoose schema validators (email regex, password length, expiry dates)
- API endpoints (health check, register validation, login errors, role-based route guards)

---

## 🐳 Docker Compose Deployment

Run the complete stack (MongoDB, Backend, and Frontend) in isolated containers:

```powershell
# Build and start all services in detached mode
docker compose up --build -d

# Check status of containers
docker compose ps

# View live application logs
docker compose logs -f

# Stop and remove containers
docker compose down
```

Services exposed:
- **Frontend**: `http://localhost:80` (or `http://localhost:5173`)
- **Backend**: `http://localhost:5000`
- **MongoDB**: `mongodb://localhost:27017`

---

## ☸️ Kubernetes Deployment

Deploy to any Kubernetes cluster (Minikube, Kind, GKE, EKS, AKS):

```powershell
# Apply all Kubernetes manifests
kubectl apply -f k8s/

# Or using Kustomize:
kubectl apply -k k8s/

# Verify deployments and pods
kubectl get pods
kubectl get services
```

Manifests included in `k8s/`:
- `configmap.yaml`: Application environment configuration
- `secret.yaml`: Secure database connection string and JWT secret
- `mongodb-pvc.yaml`: Persistent volume claim for database storage
- `mongodb-deployment.yaml` & `mongodb-service.yaml`: Database stateful deployment
- `backend-deployment.yaml` & `backend-service.yaml`: Scaled backend (2 replicas) with health probes
- `frontend-deployment.yaml` & `frontend-service.yaml`: Scaled Nginx frontend with LoadBalancer service

---

## 📖 API Documentation Reference

All protected endpoints require the header:  
`Authorization: Bearer <your_jwt_token>`

### Public Routes
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health probe (used by Docker/K8s) |
| `GET` | `/api/auth/setup-status` | Check if initial admin exists (`{ setupRequired: bool }`) |
| `POST` | `/api/auth/setup` | Create first administrator (`name, email, password`) |
| `POST` | `/api/auth/register` | Self-register as Student or Faculty |
| `POST` | `/api/auth/login` | Sign in with email and password |

### Protected Routes (All Authenticated Users)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `GET` | `/api/announcements` | List notices (filtered by role, search, category, status) |
| `GET` | `/api/announcements/:id` | Get single announcement |
| `GET` | `/api/categories` | List all categories |
| `GET` | `/api/categories/:id` | Get single category |
| `GET` | `/api/scheduled` | List upcoming scheduled notices |
| `GET` | `/api/scheduled/:id` | Get single scheduled notice |
| `GET` | `/api/dashboard/stats` | Dashboard metrics & counts |
| `GET` | `/api/reports/publications`| Publication report with filters |
| `GET` | `/api/reports/categories` | Category-wise count report |
| `GET` | `/api/reports/expired` | Expired announcement list |
| `GET` | `/api/settings` | Get university & notification settings |

### Faculty & Admin Routes
| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/announcements` | Admin, Faculty | Publish announcement |
| `PUT` | `/api/announcements/:id` | Admin, Faculty | Update announcement |
| `POST` | `/api/scheduled` | Admin, Faculty | Create scheduled notice |
| `PUT` | `/api/scheduled/:id` | Admin, Faculty | Update scheduled notice |
| `DELETE`| `/api/scheduled/:id` | Admin, Faculty | Cancel scheduled notice |

### Admin-Only Routes
| Method | Endpoint | Description |
|---|---|---|
| `DELETE`| `/api/announcements/:id` | Permanently delete announcement |
| `POST` | `/api/categories` | Create new category |
| `PUT` | `/api/categories/:id` | Update category name & description (cascades to notices) |
| `DELETE`| `/api/categories/:id` | Delete category (blocked if notices use it) |
| `GET` | `/api/users` | List all registered users |
| `GET` | `/api/users/:id` | View user by ID |
| `POST` | `/api/users` | Create user with specific role |
| `PUT` | `/api/users/:id` | Update user name, role, email, password |
| `DELETE`| `/api/users/:id` | Delete user account |
| `PUT` | `/api/settings` | Update system preferences |

---

## 🔒 Security Best Practices Implemented

- Passwords stored as 10-round bcrypt hashes and excluded from Mongoose queries by default (`select: false`).
- Duplicate email verification before user creation and on user profile updates.
- Expiry date validation enforces `expiryDate >= publishDate`.
- Root and backend `.gitignore` rules prevent secret leakage.
- Role authorization middleware halts unauthorized actions with HTTP 403.
