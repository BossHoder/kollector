# Implementation Plan: Mobile UX Parity (Web → Mobile)

**Branch**: `011-mobile-ux-parity` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/011-mobile-ux-parity/spec.md`

## Summary

Deliver mobile UX parity with the existing web app by matching brand/design language,
terminology, asset status semantics, and the asset information model—while using
mobile-native layout and interaction patterns (bottom tabs, bottom sheets, thumb-zone CTAs).
Implementation is primarily in the Expo React Native app, with small backend changes required
to support Failed retry and to align asset status filtering with the Asset model.

## Technical Context

**Language/Version**: React Native (Expo) with React 19 (JavaScript/TypeScript)  
**Primary Dependencies**: Expo SDK 54, socket.io-client v4, expo-camera, expo-image-picker, @shopify/react-native-skia  
**Storage**: Client-side token storage (secure storage for refresh token; access token cached in memory / persistent as needed)  
**Testing**: Jest + React Native Testing Library (mobile); existing Jest/Vitest suites in server/web  
**Target Platform**: iOS 15+ and Android 10+ (API 29+)  
**Project Type**: Mobile app + API contract amendments (Node.js modular monolith)  
**Performance Goals**: Smooth library scrolling at 60fps; status updates reflected within 3s of server event emission; avoid UI thrash on burst events  
**Constraints**: Contract-first with existing OpenAPI/JSON schemas; upload max 10 MB per image; mobile-first UX (no 1:1 web layout copy); accessibility baseline (labels, focus order, 44pt targets)  
**Scale/Scope**: MVP screens only (Login, Register, Assets Library, Upload & Analyze, Asset Detail, Settings) + realtime updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The following gates derive from the KLECTR Constitution:

| Gate | Status | Notes |
|------|--------|-------|
| Modular Monolith | ✅ PASS | Backend changes (if any) remain inside `server/src/modules/assets/` with controllers/services/routes separation |
| Queue-First | ✅ PASS | Upload triggers queue processing via existing `/api/assets/analyze-queue`; mobile never runs AI synchronously |
| Test-First | ✅ PASS | Plan includes mobile tests for API client refresh, status mapping, and socket handlers before UI integration |
| Schema Fidelity | ✅ PASS | Asset data follows `server/src/models/Asset.js`; no new persisted fields introduced |
| Observability & Events | ✅ PASS | Reuse Socket.io `asset_processed` event; backend emits structured logs already include request IDs |

### FE-Specific Gates (Mobile)

| Gate | Status | Notes |
|------|--------|-------|
| UI Fidelity | ✅ PASS | Mobile preserves Stitch semantics, tokens, and labels; layout adapts for mobile as an allowed responsive/platform adaptation |
| Contract-First | ✅ PASS (with amendments) | Mobile uses existing OpenAPI/JSON schemas; required gaps are documented as explicit contract amendments (retry endpoint + status filter validation) |
| FE Test-First | ✅ PASS | Mobile will add tests for API client, auth refresh, status mapping, and Socket.io event handling before screen wiring |
| MVP Scope | ✅ PASS | Only the MVP screens and realtime are implemented; maintenance/NFC/social/card-gen/dashboard are deferred |

## Project Structure

### Documentation (this feature)

```text
specs/011-mobile-ux-parity/
├── spec.md              # Feature spec (already complete)
├── plan.md              # This file
├── research.md          # Phase 0: decisions + rationale
├── data-model.md        # Phase 1: entities + validation + status semantics
├── quickstart.md        # Phase 1: how to run mobile + server locally
├── contracts/           # Phase 1: proposed contract amendments for this feature
│   ├── assets.retry.openapi.json
│   └── assets.status-filter.openapi.patch.json
└── tasks.md             # Phase 2: implementation tasks (/speckit.tasks)
```

### Source Code (repository root)

```text
mobile/
├── App.js
├── package.json
└── src/
    ├── api/
    ├── components/
    ├── config/
    ├── contexts/
    ├── hooks/
    ├── navigation/
    ├── screens/
    ├── services/
    ├── styles/
    ├── types/
    └── utils/

server/
└── src/
    ├── modules/
    │   ├── auth/
    │   └── assets/        # add retry route + align status filtering validation
    └── config/socket.js

web/
└── src/
    ├── index.css          # design tokens source
    └── lib/status-display.ts  # status display mapping reference
```

**Structure Decision**: Implement mobile feature in `mobile/src/` using contexts/hooks/services layered similarly to web.
Backend changes (if required) stay within the assets module and are contract-driven.

## Complexity Tracking

No Constitution violations require justification.
