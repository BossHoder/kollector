# Quickstart: Foundation Backend Setup

This quickstart explains how to run and test the KLECTR backend foundation for the `001-foundation-backend-setup` feature.

## Prerequisites

- Node.js 20 LTS installed
- MongoDB instance available (local or remote)
- `server/.env` configured with at least:
  - `MONGODB_URI`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`

## Install Dependencies

```powershell
cd "c:\Users\thetr\Documents\CodingWorkspace\kollector\server"
npm install
```

## Run the Server (Development)

```powershell
cd "c:\Users\thetr\Documents\CodingWorkspace\kollector\server"
node src/app.js
```

(If nodemon is configured later, you can use it instead.)

## Core Endpoints

- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login and receive JWT access/refresh tokens
- `POST /api/auth/refresh` — Refresh access token
- `GET /api/assets` — List current user's assets (cursor-based)
- `POST /api/assets` — Create a new asset
- `GET /api/assets/:id` — Get asset details
- `PATCH /api/assets/:id` — Update an asset
- `DELETE /api/assets/:id` — Delete an asset

See `contracts/auth.openapi.json` and `contracts/assets.openapi.json` for exact request/response shapes.
