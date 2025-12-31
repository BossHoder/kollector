# Research: FE MVP Integration

**Feature**: 010-fe-mvp-integration  
**Date**: 2025-12-30  
**Purpose**: Resolve technical decisions and document best practices for FE implementation

## Research Tasks

### 1. React + Vite Project Setup with TypeScript

**Task**: Determine best practices for migrating existing Vite React project to TypeScript

**Decision**: Migrate to TypeScript incrementally
- Enable `allowJs: true` in tsconfig.json to support mixed JS/TS
- Add TypeScript and type definitions as dev dependencies
- Rename files progressively from `.jsx` to `.tsx`

**Rationale**: Project already uses Vite with React 19. TypeScript adds type safety for API contracts and reduces runtime errors. Incremental migration avoids big-bang refactor.

**Alternatives considered**:
- Stay with JavaScript: Rejected due to lack of type safety for complex API contracts
- Full immediate migration: Rejected as higher risk for MVP timeline

### 2. React Router v7 for Routing

**Task**: Determine routing solution for SPA with protected routes

**Decision**: Use React Router v7 with data router pattern
- Use `createBrowserRouter` for declarative route definitions
- Implement `<ProtectedRoute>` wrapper component using auth context
- Nested routes for `/app/*` with shared `AppLayout`

**Rationale**: React Router v7 is the standard for React SPAs, supports nested layouts, and has first-class TypeScript support. Data router pattern enables loaders for prefetching.

**Alternatives considered**:
- TanStack Router: Rejected as less mature ecosystem despite type-safe routing
- Next.js: Rejected as overkill for SPA; would require backend rewrites

### 3. HTTP Client with Token Refresh Interceptor

**Task**: Determine HTTP client approach for auth token refresh flow

**Decision**: Use native `fetch` with custom wrapper + token refresh interceptor
- Create `apiClient.ts` wrapper around fetch
- Implement response interceptor to detect 401, refresh token, and retry
- Use request queue to prevent race conditions during refresh

**Rationale**: Native fetch is sufficient; axios adds bundle weight. Custom wrapper allows precise control over token refresh logic.

**Alternatives considered**:
- Axios with interceptors: Considered but adds ~15KB bundle; fetch is sufficient
- React Query retry: Rejected as token refresh is cross-cutting, not per-query

**Implementation pattern**:
```typescript
// Token refresh queue to prevent race conditions
let isRefreshing = false;
let failedQueue: Array<{resolve: Function, reject: Function}> = [];

const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach(promise => {
    if (error) promise.reject(error);
    else promise.resolve(token);
  });
  failedQueue = [];
};
```

### 4. Socket.io Client Integration

**Task**: Determine Socket.io client setup for realtime updates

**Decision**: Use `socket.io-client` v4 with React Context
- Create `SocketContext` provider initialized after auth success
- Pass access token in auth handshake
- Implement reconnection with exponential backoff (built-in)
- Expose connection status via context

**Rationale**: socket.io-client matches BE Socket.io server. Context pattern allows any component to access socket and status.

**Alternatives considered**:
- WebSocket native: Rejected as BE uses Socket.io with rooms/namespaces
- Zustand for socket state: Rejected as Context is simpler for connection lifecycle

**Implementation pattern**:
```typescript
const socket = io(API_BASE_URL, {
  auth: { token: accessToken },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
});
```

### 5. State Management for Assets

**Task**: Determine state management for assets list with pagination and realtime updates

**Decision**: Use React Query (TanStack Query v5) for server state
- Assets list as paginated query with `useInfiniteQuery`
- Individual asset as regular query with caching
- Socket events trigger `queryClient.setQueryData` for optimistic updates

**Rationale**: React Query handles caching, refetching, pagination natively. Integrates well with socket updates via query invalidation or direct cache updates.

**Alternatives considered**:
- Redux Toolkit: Rejected as overkill for server state; adds boilerplate
- Zustand: Considered but React Query is purpose-built for server state
- useState + useEffect: Rejected as lacks caching, deduplication, refetch

### 6. Tailwind CSS Configuration

**Task**: Extract Tailwind config from Stitch prototypes

**Decision**: Configure Tailwind to match Stitch design tokens
- Extract color palette from prototype CSS
- Configure font family (Inter)
- Set up dark mode (class-based, always dark)
- Custom border radius and shadow values

**Rationale**: Stitch prototypes use Tailwind classes. Matching config ensures visual fidelity.

**Colors extracted from prototypes**:
```javascript
{
  "primary": "#25f4d1",
  "background-dark": "#10221f",
  "surface-dark": "#162825",
  "surface-highlight": "#203632",
  "border-dark": "#283936",
  "text-secondary": "#9cbab5"
}
```

### 7. Form Handling and Validation

**Task**: Determine form handling approach for login/register/upload

**Decision**: Use React Hook Form + Zod for validation
- React Hook Form for form state and submission
- Zod schemas matching OpenAPI request contracts
- Field-level error display per prototype design

**Rationale**: React Hook Form is lightweight and performant. Zod enables schema-first validation matching OpenAPI contracts.

**Alternatives considered**:
- Formik: Rejected due to larger bundle size and less modern API
- Native controlled inputs: Rejected as verbose for multi-field forms

### 8. Testing Strategy

**Task**: Determine testing approach per Constitution requirements

**Decision**: Vitest + React Testing Library + MSW
- Vitest as test runner (Vite-native, faster than Jest)
- React Testing Library for component tests
- MSW for API mocking (matches OpenAPI contracts)
- Test-first for: API client, auth refresh, status mapping, socket handlers

**Rationale**: Constitution mandates test-first for FE logic. Vitest integrates natively with Vite. MSW enables realistic API mocking.

**Test structure**:
```
tests/
├── unit/           # Isolated function/hook tests
├── integration/    # Multi-component flow tests
└── mocks/          # MSW handlers matching OpenAPI
```

### 9. Status Mapping (BE → UI)

**Task**: Map backend status values to UI display

**Decision**: Create explicit mapping utility

| BE Status | UI Label | UI Color | Icon |
|-----------|----------|----------|------|
| `draft` | Draft | gray | `edit` |
| `processing` | Processing | primary/animated | `auto_awesome` |
| `active` | Ready | emerald | `check_circle` |
| `archived` | Archived | gray | `archive` |
| `failed` | Failed | red | `error` |

**Note**: `failed` is emitted via socket event but may not persist as status in Asset model. FE should handle both `asset.status` and socket event status.

**Rationale**: Single source of truth for status display prevents inconsistencies across components.

### 10. Error Message Localization

**Task**: Map HTTP error codes to Vietnamese user messages

**Decision**: Create error message mapping utility

| Code | Error Type | Vietnamese Message |
|------|------------|-------------------|
| 400 | Validation | "Dữ liệu không hợp lệ" + field messages |
| 401 | Auth (after refresh) | "Phiên đăng nhập đã hết hạn" |
| 403 | Forbidden | "Bạn không có quyền thực hiện thao tác này" |
| 404 | Not found | "Không tìm thấy tài nguyên" |
| 409 | Conflict | "Email đã được sử dụng" (register) |
| 413 | File too large | "Kích thước tệp quá lớn. Vui lòng chọn ảnh dưới 10MB." |
| 500 | Server error | "Đã xảy ra lỗi. Vui lòng thử lại sau." |
| 503 | Service unavailable | "Hệ thống đang bận, vui lòng thử lại sau." |

**Rationale**: Consistent user-friendly messages per UX spec. Localization ready for Vietnamese market.

## Dependencies to Add

```json
{
  "dependencies": {
    "react-router-dom": "^7.x",
    "@tanstack/react-query": "^5.x",
    "socket.io-client": "^4.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@hookform/resolvers": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/react": "^19.x",
    "@types/react-dom": "^19.x",
    "vitest": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "msw": "^2.x",
    "tailwindcss": "^4.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

## Open Questions Resolved

1. **Q: Should FE use cookies or localStorage for tokens?**  
   A: Access token in memory (React state), refresh token via httpOnly cookie (set by BE per `X-Client-Platform: web`).

2. **Q: How to handle socket auth on token refresh?**  
   A: Disconnect and reconnect socket with new token after refresh.

3. **Q: What happens if socket fails to connect?**  
   A: Show "Reconnecting…" banner, continue with polling fallback on detail page if asset is processing.

4. **Q: Is there a "failed" status in Asset model?**  
   A: Based on asset-processed-event.schema.json, failed status is emitted via socket. Verify with BE if this persists to Asset.status or requires separate handling.
