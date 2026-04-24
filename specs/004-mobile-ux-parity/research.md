# Research: Mobile UX Parity (Web -> Mobile)

**Feature**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)
**Date**: 2026-03-10

## Decisions

### 1) Canonical category strategy + alias mapping

- Decision: Use one canonical category vocabulary across server/web/mobile: `sneaker | lego | camera | other`. Add client-side alias normalization for legacy or UI-facing values (for example `shoes -> sneaker`, `photography -> camera`, unknown -> fallback All for filters).
- Rationale: Server model and route validation currently enforce 4 categories, and current 400 errors are caused by web/mobile sending broader values such as `art`/`stamps`.
- Alternatives considered:
  - Expand server enum immediately to broader taxonomy: larger migration and analytics impact.
  - Keep divergent vocabularies by platform: continues mismatch and recurring 400 regressions.

### 2) Invalid filter handling behavior

- Decision: Normalize category before request; if non-normalizable, fall back to `All` (omit category query) and reset active category UI state.
- Rationale: Prevents repeated bad requests and unstable UX loops while maintaining user continuity.
- Alternatives considered:
  - Leave invalid category and surface server error: repeated 400 and noisy logs.
  - Server silently ignores unknown category: hides client bug and weakens contract discipline.

### 3) Realtime resilience model

- Decision: Keep Socket.io as primary; when disconnected, activate fallback polling every 10-15 seconds for list/detail, and stop polling when socket reconnects.
- Rationale: Meets parity expectation for automatic updates while handling transient WS failures seen in logs.
- Alternatives considered:
  - WebSocket-only: stale data whenever connection drops.
  - Polling-only: higher load and weaker realtime UX.

### 4) Camera failure handling on mobile

- Decision: On `launchCameraAsync` failures (including Android emulator intent-resolution failure), do not lose user progress; allow gallery fallback and preserve selected/upload context through local placeholder flow when selection existed.
- Rationale: Current error (`Failed to resolve activity to handle the intent of type 'null'`) is common on emulator/device combinations and should not drop user intent.
- Alternatives considered:
  - Hard fail camera path only: user loses action and retries manually from scratch.
  - Disable camera entirely: violates feature scope (camera required).

### 5) Upload failure persistence behavior

- Decision: If camera or upload submission fails after image selection, create local placeholder asset state (`pending_upload` or `failed_upload`) visible in library/detail with `Retry Upload` action.
- Rationale: Aligns with user expectation that selected image action is tracked, even before server processing starts.
- Alternatives considered:
  - Keep failure only as toast: action disappears, causes confusion.
  - Keep state only on upload screen: state lost on navigation.

### 6) Detail file metadata timing

- Decision: Populate and render file metadata (filename, size, MIME/format, upload timestamp) immediately from upload response/local payload, including while `processing`.
- Rationale: Current detail screen has empty file info despite known data at upload time.
- Alternatives considered:
  - Wait for AI completion to fill metadata: unnecessary delay and blank detail card.
  - Hide metadata section during processing: loses parity with web expectations.

### 7) Image toggle empty `src` handling (web)

- Decision: Never render `<img src="">`; pass `null`/conditional render with placeholder when URL missing.
- Rationale: React warning indicates browser may re-request page and creates noisy logs.
- Alternatives considered:
  - Keep empty string: warning persists and can trigger unintended network behavior.
  - Hide image area entirely: poorer UX than placeholder.

### 8) Status semantics alignment

- Decision: Keep backend status source of truth (`draft|processing|partial|active|archived|failed`) and map UI label `active -> Ready` consistently via shared status-display utility.
- Rationale: Preserves contract while matching product terminology.
- Alternatives considered:
  - Rename backend status to `ready`: breaking API change.
  - Surface `active` directly in UI: parity terminology mismatch.

## Best-practice notes from research

- Socket fallback should include deduplication and version/timestamp guard to avoid poll-overwriting newer socket updates.
- Polling timers must be cleaned up on unmount/navigation changes to avoid memory leaks.
- Camera availability checks should include emulator/device caveats; permission granted does not guarantee capture intent availability.

## Discovered Gaps (to be handled in Phase 2 tasks)

- Web type layer currently includes extra categories beyond server enum and leaks into filter calls.
- Mobile upload flow lacks local placeholder persistence and retry queue semantics.
- Asset detail metadata model is inconsistent across web/mobile/server response adapters.
- Socket disconnect state exists, but polling fallback orchestration is not centralized.
