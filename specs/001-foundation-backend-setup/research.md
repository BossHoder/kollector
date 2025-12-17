# Phase 0 Research: Foundation Backend Setup

**Feature**: `001-foundation-backend-setup`  
**Date**: 2025-12-17  
**Inputs**: `spec.md`, `plan.md`, KLECTR Constitution

## Decisions

### 1. Node.js Runtime Version

- **Decision**: Use Node.js 20 LTS for the `server` backend.
- **Rationale**: Node 20 is the current LTS with long-term support, good performance, and broad ecosystem compatibility. Express 5, Mongoose 9, BullMQ, and Socket.io all support Node 20. Aligning on a modern LTS simplifies security patching and Docker base image selection.
- **Alternatives Considered**:
  - **Node 18 LTS**: Stable and widely used, but lower long-term support horizon than Node 20. No strong reason to prefer it for a new project.
  - **Node 16 LTS (older)**: Already in maintenance/End-of-life window; rejected due to shorter support and potential security risk.

### 2. Password Hashing Library (`bcrypt` vs `argon2`)

- **Decision**: Use `argon2` for password hashing.
- **Rationale**: Argon2 is a modern, memory-hard algorithm designed to resist GPU/ASIC attacks better than bcrypt. It has good Node bindings and is recommended in modern security guidance. Using Argon2 from the start avoids migration complexity later.
- **Alternatives Considered**:
  - **bcrypt**: Very common and battle-tested, with great library support. However, less memory-hard and considered older compared to Argon2. Would still be acceptable but offers fewer future-proofing benefits.
  - **scrypt**: Also memory-hard, but less commonly used in Node auth stacks than Argon2; fewer high-level wrappers and examples.

### 3. Test Database Strategy (In-memory vs Dedicated Test Mongo)

- **Decision**: Use a dedicated test MongoDB database (separate DB name) rather than an in-memory Mongo emulator.
- **Rationale**: Using a real MongoDB instance (even if local or containerized) ensures behavior matches production, especially around indexes, query plans, and Mongoose features. It avoids subtle differences found in some in-memory emulators.
- **Alternatives Considered**:
  - **In-memory Mongo (e.g., mongodb-memory-server)**: Faster and easy to spin up per test run, but adds another dependency and can diverge from production behavior. Chosen against for schema fidelity and realism.
  - **Shared dev database for tests**: Risk of test data collisions and flakiness; rejected in favor of isolated test DB.

### 4. HTTP Testing Framework (Jest + supertest)

- **Decision**: Use Jest as the test runner with `supertest` for HTTP contract tests.
- **Rationale**: Jest is widely adopted in Node.js, supports mocking, coverage, and watch mode out of the box. `supertest` integrates cleanly with Express 5 and allows writing clear HTTP contract tests that exercise middleware and routing.
- **Alternatives Considered**:
  - **Mocha + Chai + supertest**: Flexible and modular, but requires more setup and configuration. Jest gives a more batteries-included experience.
  - **Vitest**: Modern and fast, but Jest remains more standard in Express/Mongoose ecosystems; no strong need to adopt newer tooling for this phase.

## Updated Technical Context Resolutions

- **Language/Version**: Node.js 20 LTS, Express 5 (JavaScript, CommonJS)
- **Primary Dependencies**: Express 5, Mongoose 9, BullMQ 5, ioredis 5, Socket.io 4, `jsonwebtoken`, `argon2` for password hashing
- **Testing**: Jest + supertest; dedicated test MongoDB database (separate connection string/DB name)

All previous NEEDS CLARIFICATION markers in Technical Context are now resolved by the above decisions.
