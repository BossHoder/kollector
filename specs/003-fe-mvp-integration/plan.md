# Implementation Plan: FE MVP Integration

**Branch**: `010-fe-mvp-integration` | **Date**: 2025-12-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-fe-mvp-integration/spec.md`

## Summary

Connect the Vite web frontend with the existing Node.js backend (001/002 specs) to deliver
the MVP user flows: Login, Register, Assets Library, Upload/Analyze, Asset Detail, and Settings.
All UI must match Stitch prototypes. Implementation uses React 19, TypeScript, React Router v7,
TanStack Query v5, and socket.io-client for realtime updates. Contract-first approach with all
API types derived from existing OpenAPI specs.

## Technical Context

**Language/Version**: TypeScript 5.x on React 19 (Vite 6.x)  
**Primary Dependencies**: React Router v7, TanStack Query v5, socket.io-client v4, React Hook Form, Zod  
**Storage**: N/A (consumes BE APIs; localStorage for token persistence)  
**Testing**: Vitest + React Testing Library + MSW  
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)  
**Project Type**: Web frontend (SPA)  
**Performance Goals**: Login+list <3s, upload redirect <2s, socket updates <500ms  
**Constraints**: Must match Stitch prototypes; contract-first with BE OpenAPI specs  
**Scale/Scope**: 6 main screens (Login, Register, Home, Assets Library, Upload, Asset Detail, Settings)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The following gates derive from the KLECTR Constitution:

| Gate | Status | Notes |
|------|--------|-------|
| Modular Monolith | N/A | FE feature - no BE module changes |
| Queue-First | ✅ PASS | FE consumes queue via socket events; no sync AI calls |
| Test-First | ✅ PASS | Vitest + RTL + MSW; test API clients, auth refresh, status mapping first |
| Schema Fidelity | ✅ PASS | Types derived from BE OpenAPI contracts |
| Observability & Events | ✅ PASS | Socket.io event handlers for asset_processed |

### FE-Specific Gates

| Gate | Status | Notes |
|------|--------|-------|
| UI Fidelity | ✅ PASS | All screens from web/UX-UI-Designed/ Stitch prototypes |
| Contract-First | ✅ PASS | Types in data-model.md derived from 001/002 contracts |
| FE Test-First | ✅ PASS | MSW handlers, api client tests, auth refresh tests planned |
| MVP Scope | ✅ PASS | Only 6 core screens; gamification/NFC/social deferred |

## Project Structure

### Documentation (this feature)

```text
specs/010-fe-mvp-integration/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions (COMPLETE)
├── data-model.md        # Phase 1: TypeScript types from BE contracts (COMPLETE)
├── quickstart.md        # Phase 1: Developer setup guide (COMPLETE)
├── contracts/           # Phase 1: FE route + API mapping schemas (COMPLETE)
│   ├── fe-routes.schema.json
│   └── fe-api-mapping.schema.json
└── tasks.md             # Phase 2: Implementation tasks (PENDING - /speckit.tasks)
```

### Source Code (web/)

```text
web/
├── package.json
├── vite.config.js → vite.config.ts
├── tsconfig.json (NEW)
├── tailwind.config.ts (NEW)
├── src/
│   ├── main.tsx (rename from main.jsx)
│   ├── App.tsx (rename from App.jsx)
│   ├── index.css (Tailwind base + Stitch tokens)
│   ├── types/
│   │   ├── api.ts           # Request/Response types from data-model.md
│   │   ├── asset.ts         # Asset, AIMetadata, AssetImages
│   │   ├── user.ts          # User, AuthState
│   │   └── socket.ts        # AssetProcessedEvent
│   ├── lib/
│   │   ├── api-client.ts    # Fetch wrapper with refresh interceptor
│   │   ├── auth.ts          # Token storage, refresh logic
│   │   ├── socket.ts        # Socket.io client setup
│   │   ├── status-display.ts # STATUS_DISPLAY mapping
│   │   └── error-messages.ts # HTTP code → Vietnamese messages
│   ├── hooks/
│   │   ├── useAuth.ts       # Auth context hook
│   │   ├── useSocket.ts     # Socket context hook
│   │   ├── useAssets.ts     # TanStack Query for assets list
│   │   ├── useAsset.ts      # TanStack Query for single asset
│   │   └── useToast.ts      # Toast notification hook
│   ├── contexts/
│   │   ├── AuthContext.tsx  # Auth provider
│   │   ├── SocketContext.tsx # Socket.io provider
│   │   └── ToastContext.tsx # Toast provider
│   ├── components/
│   │   ├── ui/              # Shared UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── StatusPill.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── ConfidenceBar.tsx
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Authenticated layout with nav
│   │   │   ├── PublicLayout.tsx # Unauthenticated layout
│   │   │   ├── Header.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── assets/
│   │   │   ├── AssetCard.tsx
│   │   │   ├── AssetGrid.tsx
│   │   │   ├── AssetFilters.tsx
│   │   │   ├── ImageToggle.tsx
│   │   │   └── ProcessingOverlay.tsx
│   │   └── forms/
│   │       ├── LoginForm.tsx
│   │       ├── RegisterForm.tsx
│   │       └── UploadForm.tsx
│   ├── pages/
│   │   ├── public/
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   └── app/
│   │       ├── AssetsPage.tsx
│   │       ├── AssetDetailPage.tsx
│   │       ├── UploadPage.tsx
│   │       └── SettingsPage.tsx
│   └── router.tsx           # React Router v7 config
├── tests/
│   ├── setup.ts             # Vitest setup with RTL
│   ├── mocks/
│   │   ├── handlers.ts      # MSW handlers matching OpenAPI
│   │   └── server.ts        # MSW server setup
│   ├── unit/
│   │   ├── api-client.test.ts
│   │   ├── auth.test.ts
│   │   ├── status-display.test.ts
│   │   └── socket.test.ts
│   └── integration/
│       ├── login-flow.test.tsx
│       ├── assets-list.test.tsx
│       └── upload-flow.test.tsx
└── UX-UI-Designed/          # Stitch prototypes (reference only, no changes)
```

**Structure Decision**: Web SPA with standard React patterns. Types isolated in `types/`,
business logic in `lib/` and `hooks/`, React-specific in `components/` and `pages/`.
Tests mirror the structure with unit/ and integration/ separation.

## Complexity Tracking

No Constitution violations to justify - all gates passed.
