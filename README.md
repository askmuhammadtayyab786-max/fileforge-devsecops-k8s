# FileForge — Full-Stack File Processing System

Production-grade file processing system built with **React + Vite**, **Node.js/Express**, **MongoDB**, and **Nginx**.

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Browser   │────▶│  Nginx :80       │────▶│  React/Vite    │
│             │     │  Reverse Proxy   │     │  Frontend :3000│
└─────────────┘     └────────┬─────────┘     └────────────────┘
                             │ /api/*
                    ┌────────▼─────────┐     ┌────────────────┐
                    │  Node.js/Express │────▶│  MongoDB :27017│
                    │  Backend :5000   │     └────────────────┘
                    └──────────────────┘
```

## Security Hardening (threat-model fixes)

This repo was reviewed against a STRIDE threat model (`FileForge - Kubernetes Deployment.json`,
importable into OWASP Threat Dragon) and the following gaps were fixed in code:

| # | Threat | Fix |
|---|---|---|
| 1 | No user authentication (Spoofing) | JWT-based login/register (`/api/auth`) |
| 2 | No auth on any API endpoint (Elevation of Privilege) | `authenticate` middleware on all `/api/files/*` routes |
| 3 | Files served publicly, no ownership check (Info Disclosure) | `owner` field on File model; downloads/reads/deletes scoped to the requesting user |
| 4 | Weak file-type filtering, blacklist only (Tampering) | Allowlist of MIME types + blocked-extension list (`.exe .html .svg .php` etc.) |
| 5 | No audit logging (Repudiation) | `AuditLog` model records upload/download/delete with user, IP, timestamp |
| 6 | Storage exhaustion via uploads (DoS) | Per-user quota (`MAX_USER_QUOTA_BYTES`) enforced on upload |
| 7 | Uploaded files not scanned for malware (Tampering) | Pluggable `scanFile()` hook (ClamAV-ready, fails closed when configured) |
| 8 | MongoDB has no authentication (Tampering) | Root + app-scoped Mongo users via `mongo-init.js` / K8s Secret |
| 9 | Data unencrypted at rest (Info Disclosure) | Encrypted `StorageClass` for Mongo + uploads PVCs (`k8s/02-storageclass.yaml`) |
| 10 | Cleartext HTTP traffic (Tampering) | Nginx HTTPS redirect + TLS server block; K8s Ingress with cert-manager |
| 11 | Rate limiting may be bypassed (DoS) | Re-implemented at K8s Ingress annotations, not just Nginx |
| 12 | Unauthenticated DB connection (Tampering) | Mongo URI now requires credentials; NetworkPolicy restricts port 27017 to backend pods only |
| 13 | Hardcoded IPs in configs (Info Disclosure) | Removed from `nginx.conf`, `docker-compose.yaml`, `.env.example` — must be set explicitly |

See `k8s/` for Kubernetes manifests and inline comments mapping each resource back to the threat it addresses.

## Base Images (vulnerability-hardened)

| Service | Image | Why |
|---|---|---|
| Backend | `cgr.dev/chainguard/node` (multi-stage) | Chainguard — distroless, no shell/package manager, low-to-zero known CVEs, non-root |
| Frontend build | `cgr.dev/chainguard/node:latest-dev` | Same, `-dev` variant for the npm build step only |
| Frontend runtime | `cgr.dev/chainguard/nginx` | Serves the static bundle; non-root, low-to-zero CVE |
| Reverse proxy | `cgr.dev/chainguard/nginx` | Same rationale; listens on unprivileged 8080/8443 (see `nginx/nginx.conf`) |
| MongoDB | official `mongo:7`, **pinned to a digest** | Chainguard's mongodb image has no docker-entrypoint script or `mongosh`, so it can't run `mongo-init.js`'s user-bootstrapping — kept official but pinned + scanned instead (see below) |

Run `scripts/scan-images.sh` (requires [Trivy](https://trivy.dev)) to confirm HIGH/CRITICAL CVE
counts locally or in CI before every deploy. Before first use, pin the real Mongo digest:

```bash
docker pull mongo:7
docker inspect --format='{{index .RepoDigests 0}}' mongo:7
# paste the sha256:... result into docker-compose.yaml and k8s/03-mongo-statefulset.yaml
```

## Quick Start (Docker Compose — local/dev)

```bash
# 1. Copy and fill in secrets (never commit the real .env)
cp .env.example .env
# generate values with: openssl rand -base64 32   (48 for JWT_SECRET)

# 2. Start all services
docker-compose up -d --build

# 3. Open the app
open https://localhost   # self-signed cert until you mount real certs in nginx/certs/
```

## Kubernetes (production)

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/02-storageclass.yaml
cp k8s/01-secrets.example.yaml k8s/01-secrets.yaml   # fill in base64 secrets, then:
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/03-mongo-statefulset.yaml
kubectl apply -f k8s/04-backend-deployment.yaml
kubectl apply -f k8s/05-frontend-deployment.yaml
kubectl apply -f k8s/06-ingress.yaml
kubectl apply -f k8s/07-networkpolicy.yaml
```

Prerequisites: EKS cluster with the AWS EBS CSI driver, nginx-ingress-controller, and cert-manager installed, plus a container registry (ECR) holding images built from `backend/Dockerfile` and `frontend/Dockerfile`.

## Project Structure

```
fileforge/
├── docker-compose.yaml
├── .env.example              ← docker-compose secrets template
├── mongo-init.js             ← creates app-scoped Mongo user (not root)
├── k8s/                      ← Kubernetes manifests (see table above)
│   ├── 00-namespace.yaml
│   ├── 01-secrets.example.yaml
│   ├── 02-storageclass.yaml  ← encrypted EBS StorageClass
│   ├── 03-mongo-statefulset.yaml
│   ├── 04-backend-deployment.yaml
│   ├── 05-frontend-deployment.yaml
│   ├── 06-ingress.yaml       ← TLS via cert-manager
│   └── 07-networkpolicy.yaml
├── nginx/
│   └── nginx.conf            ← HTTPS redirect + TLS server block
├── frontend/                  ← Vite + React
│   ├── vite.config.js
│   ├── index.html
│   ├── Dockerfile
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       ├── utils/api.js
│       └── components/
│           ├── UploadZone.jsx
│           ├── FileGrid.jsx
│           ├── FilterBar.jsx
│           └── StatsPanel.jsx
└── backend/                   ← Express API
    ├── server.js
    ├── Dockerfile
    ├── .env.example
    ├── config/database.js
    ├── models/
    │   ├── File.js            ← now has `owner`
    │   ├── User.js            ← new: auth
    │   └── AuditLog.js        ← new: audit trail
    ├── middleware/
    │   ├── auth.js            ← new: JWT verification
    │   ├── upload.js          ← now allowlist-based
    │   └── scan.js            ← new: pluggable malware scan
    ├── controllers/
    │   ├── authController.js  ← new
    │   └── fileController.js  ← now enforces ownership + quota
    └── routes/
        ├── auth.js            ← new
        └── files.js           ← now requires authentication
```

## Local Development (without Docker)

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev          # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173  (Vite dev server with proxy)
```

## API Reference

| Method   | Endpoint                      | Auth required | Description                     |
|----------|-------------------------------|---------------|----------------------------------|
| `POST`   | `/api/auth/register`          | No            | Create an account                |
| `POST`   | `/api/auth/login`             | No            | Get a JWT                        |
| `GET`    | `/api/auth/me`                | Yes           | Current user info                |
| `POST`   | `/api/files/upload`           | Yes           | Upload files (multipart)         |
| `GET`    | `/api/files`                  | Yes           | List **your own** files          |
| `GET`    | `/api/files/:fileId`          | Yes           | Get file metadata (owner only)   |
| `GET`    | `/api/files/:fileId/download` | Yes           | Download file (owner only)       |
| `DELETE` | `/api/files/:fileId`          | Yes           | Delete file (owner only)         |
| `GET`    | `/api/files/stats/summary`    | Yes           | Your storage analytics           |
| `GET`    | `/api/health`                 | No            | Health check                     |

Send `Authorization: Bearer <token>` (from login/register) on every protected route.

## Features

- Drag-and-drop multi-file upload with progress bars
- Auto category detection (image, video, audio, document, archive)
- Search, filter by category & status
- Analytics dashboard with storage breakdown
- 7-day auto-expiry via MongoDB TTL
- Rate limiting at Nginx (10/min upload, 30/min API)
- Security headers via Helmet + Nginx
- Gzip compression
- Docker health checks on all containers
