# 🚂 Express Tadka — Train Food Delivery Platform

> Order delicious food on your Indian train journey. Fresh meals delivered to your seat at 500+ railway stations.

## 🏗️ Architecture

```
express-tadka/
├── apps/
│   ├── api/          # Express + TypeScript backend (port 5000)
│   └── web/          # Next.js 14 App Router frontend (port 3000)
└── packages/
    └── types/        # Shared TypeScript interfaces
```

**Tech Stack:** Next.js 14 · Express · MongoDB · TypeScript · Tailwind CSS · Socket.IO · Razorpay · JWT

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- MongoDB (local or Atlas)

### 1. Install

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp apps/api/.env.example apps/api/.env
# Edit MONGODB_URI, JWT_SECRET, REFRESH_TOKEN_SECRET
```

### 3. Seed Database

```bash
cd apps/api && pnpm seed
```

### 4. Start Dev

```bash
# From root
pnpm dev
# API: http://localhost:5000
# Web: http://localhost:3000
```

---

## 🔑 Test Credentials

| Role | Mobile | Notes |
|------|--------|-------|
| Admin | `9999999999` | Full access |
| Restaurant | `9800000000`–`9800000009` | Restaurant owners |

OTP is returned in API response in development mode.

## 🎟️ Coupons: `FIRST50` · `SAVE20` · `TRAIN100` · `WELCOME`

## 🚂 Test PNR: any 10-digit number e.g. `1234567890`

---

## 📚 API Docs

See [docs/api.md](./docs/api.md)

---

## 🏗️ Build

```bash
pnpm build
```
