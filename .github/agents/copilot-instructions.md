# kollector Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-17

## Active Technologies
- Node.js 20.x (Express 5.x backend), JavaScript/CommonJS + BullMQ 5.x, ioredis 5.x, Socket.io 4.x, Multer (file uploads), Mongoose 9.x (002-ai-queue-pipeline)
- MongoDB (via Mongoose), Redis (via Upstash for BullMQ queues) (002-ai-queue-pipeline)
- TypeScript 5.x (React 19.x) + React 19, React Router 7, socket.io-client, TailwindCSS (010-fe-mvp-integration)
- N/A (stateless FE; all persistence via BE APIs) (010-fe-mvp-integration)
- TypeScript 5.x on React 19 (Vite 6.x) + React Router v7, TanStack Query v5, socket.io-client v4, React Hook Form, Zod (010-fe-mvp-integration)
- N/A (consumes BE APIs; localStorage for token persistence) (010-fe-mvp-integration)

- Node.js 20 LTS (CommonJS, Express 5) + Express 5, Mongoose 9, BullMQ 5, ioredis 5, Socket.io 4, `jsonwebtoken`, `argon2` for password hashing (001-foundation-backend-setup)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

# Add commands for Node.js 20 LTS (CommonJS, Express 5)

## Code Style

Node.js 20 LTS (CommonJS, Express 5): Follow standard conventions

## Recent Changes
- 010-fe-mvp-integration: Added TypeScript 5.x on React 19 (Vite 6.x) + React Router v7, TanStack Query v5, socket.io-client v4, React Hook Form, Zod
- 010-fe-mvp-integration: Added TypeScript 5.x (React 19.x) + React 19, React Router 7, socket.io-client, TailwindCSS
- 002-ai-queue-pipeline: Added Node.js 20.x (Express 5.x backend), JavaScript/CommonJS + BullMQ 5.x, ioredis 5.x, Socket.io 4.x, Multer (file uploads), Mongoose 9.x


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
