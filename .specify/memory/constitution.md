<!--
Sync Impact Report
- Version change: 0.0.0 (template) → 1.0.0
- Modified principles: placeholders → concrete principles (see titles below)
- Added sections: Concrete "Additional Constraints" and "Development Workflow" content
- Removed sections: None
- Templates requiring updates:
	✅ .specify/templates/plan-template.md (Constitution Check aligned)
	✅ .specify/templates/tasks-template.md (Tests marked mandatory)
	⚠ .specify/templates/spec-template.md (No change needed; remains aligned)
	⚠ .specify/templates/commands/* (directory missing; pending creation)
- Follow-up TODOs:
	- TODO(RATIFICATION_DATE): Original adoption date unknown; set when first ratified
-->

# KLECTR Constitution

## Core Principles

### I. Modular Monolith Discipline
The backend is a Node.js Modular Monolith. Modules MUST keep
controllers, services, and models separated. Inter-module contracts
MUST be explicit and versioned. Microservices are NOT allowed unless
approved via governance with a migration plan. Heavy work MUST be
offloaded to async boundaries (queues) and MUST NOT block request
handlers.

### II. Async Queue Boundaries
All heavy or long-running tasks (image processing, AI inference,
external downloads) MUST go through Redis (BullMQ) jobs. The Python AI
worker (FastAPI) is a satellite service with JSON job contracts.
Producers and consumers MUST validate payloads against schemas. Image
processing and AI MUST NOT be invoked synchronously inside HTTP
handlers. Realtime updates MUST be emitted via Socket.io events.

### III. Test-First (NON-NEGOTIABLE)
TDD is mandatory. Write tests before implementation; ensure they fail,
then implement, then refactor (Red-Green-Refactor). Required coverage:
- Unit tests for models and services
- Contract tests for HTTP APIs and queue job payloads
- Integration tests across Node.js ↔ Redis ↔ Python AI

### IV. Data Schema Fidelity
"No Hallucinations": The system MUST only persist and expose fields
defined in the MongoDB schemas. All inputs/outputs MUST be validated
against schema. Mongoose models define the source of truth; AI metadata
fields MUST remain constrained to defined attributes.

### V. Observability, Versioning & Simplicity
Structured logging MUST include request IDs and job IDs. Emit clear
Socket.io events for client consumption. Public contracts (HTTP
endpoints, queue payloads, Socket events) MUST follow semantic
versioning MAJOR.MINOR.PATCH. Breaking changes REQUIRE an announced
migration plan. Prefer simple designs (YAGNI) and justify complexity in
PRs.

## Additional Constraints

Technology stack and operational constraints:
- Architecture: Modular Monolith (Node.js) + Satellite AI (Python)
- Backend: Node.js (Express/NestJS), MongoDB (Mongoose), Redis (BullMQ),
	Socket.io
- AI Worker: Python (FastAPI), RMBG-1.4 (background removal), Moondream2
	(vision LLM)
- Mobile: React Native (Expo), @shopify/react-native-skia, Expo Haptics
- Infrastructure: Docker, Hugging Face Spaces (AI), Upstash (Redis),
	Cloudinary (images)

Operational rules:
- Async First: Image processing/AI MUST use the queue
- Security: Protected routes MUST use `auth.middleware.js`
- Data: Conform to the schemas defined for User, Asset,
	MaintenanceLog; no extra fields persisted

## Development Workflow

Reviews MUST verify Constitution compliance. Feature work proceeds via
SpecKit artifacts: spec.md → plan.md → tasks.md. Gates:
- Tests defined first (unit, contract, integration) and fail initially
- Queue job contracts defined (JSON schemas) for heavy tasks
- Schema validation wired for API inputs/outputs
- Logging and event emissions included in the design

Branch naming follows `[###-feature-name]`. Deployments REQUIRE passing
Constitution gates and test suites. Realtime behavior MUST be validated
with Socket.io events.

## Governance

This Constitution supersedes other practices. Amendments REQUIRE
documentation, approval, and a migration plan for any breaking changes
to public contracts. Compliance reviews occur during PRs and at release
cut. Versioning policy applies to APIs, queue payloads, and events.
Backwards incompatible changes bump MAJOR; additions/expansions bump
MINOR; clarifications bump PATCH.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): Original
adoption date unknown; set at first formal ratification | **Last
Amended**: 2025-12-17
