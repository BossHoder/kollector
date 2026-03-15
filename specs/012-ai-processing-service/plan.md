# Implementation Plan: AI Processing Service

**Branch**: `012-ai-processing-service` | **Date**: 2026-03-15 | **Spec**: ../012-ai-processing-service/spec.md
**Input**: Feature specification from `/specs/012-ai-processing-service/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement a runnable local Python AI service (satellite service) that the existing Node BullMQ worker can call via `AI_SERVICE_URL` so queued assets complete end-to-end: background removal + best-effort metadata, with clear failures only for truly unprocessable cases.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.11 or 3.12 for the AI worker runtime (the previously created `ai-worker/venv` on Python 3.14.2 is not compatible with the pinned ML stack and should not be reused)  
**Primary Dependencies**: FastAPI (HTTP service), background removal model compatible with `briaai/RMBG-1.4`, vision model compatible with `vikhyatk/moondream2`, Cloudinary uploader  
**Storage**: MongoDB via existing Node server (assets); processed images persisted via Cloudinary (AI service returns URL)  
**Testing**: Jest (Node already in repo); pytest for the Python AI service; contract + integration tests across Node ↔ AI  
**Target Platform**: Local development (Windows/macOS/Linux); CPU-only baseline acceptable for MVP  
**Project Type**: backend + satellite service (Node modular monolith + Python AI service)  
**Performance Goals**: Typical local `/analyze` completes within 90 seconds (match Node client timeout); warm runs should be noticeably faster than cold start  
**Constraints**: No redesign of queue pipeline or web/mobile UX; preserve the existing Node → AI service contract (`POST /analyze`); failures must be explicit and actionable  
**Scale/Scope**: Local development and test coverage; support a small curated test set and typical user uploads

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Modular Monolith Discipline**: Node worker integration remains in existing modules; no new services beyond the satellite AI service.
- **Async Queue Boundaries**: No AI inference is invoked synchronously inside HTTP handlers; processing continues to run via BullMQ worker.
- **Test-First (NON-NEGOTIABLE)**: Add/extend unit + contract + integration tests before implementation changes.
- **Data Schema Fidelity**: AI metadata written only to existing `Asset.aiMetadata` fields; no new Mongo fields invented.
- **Observability & Simplicity**: Structured logging includes job/asset identifiers; avoid unnecessary complexity.

GATE STATUS: PASS (plan preserves these constraints; enforcement occurs in tasks/implementation).

## Project Structure

### Documentation (this feature)

```text
specs/012-ai-processing-service/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
ai-worker/
├── main.py                 # AI service entrypoint (currently empty; will be implemented)
├── requirements.txt        # Python deps (currently empty; will be populated)
└── .env.example            # Example env (Cloudinary + model cache)

server/
├── src/
│   ├── workers/ai.worker.js # BullMQ worker that calls AI service
│   └── modules/assets/
│       └── ai.client.js     # HTTP client: POST {AI_SERVICE_URL}/analyze (90s timeout)
└── tests/
  ├── unit/
  ├── contract/
  └── integration/
```

**Structure Decision**: Implement the missing AI processing service in the existing `ai-worker/` directory as a FastAPI app, keeping Node changes limited to configuration, tests, and compatibility fixes needed to complete the existing end-to-end pipeline.

## Phase 0 Output (Research)

- Research decisions are captured in `research.md`:
  - Service API contract (`POST /analyze`)
  - Success/partial semantics
  - Local model/tooling defaults
  - 90s timeout budget alignment
  - Health check requirement
  - Error classification and retry semantics

## Phase 1 Output (Design & Contracts)

- Data model notes captured in `data-model.md` (no new persistent schemas; focuses on contract shapes).
- Service contract captured in `contracts/ai-service.openapi.json`.
- Local run instructions captured in `quickstart.md`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
