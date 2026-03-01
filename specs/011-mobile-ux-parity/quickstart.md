# Quickstart: Mobile UX Parity (Web → Mobile)

**Feature**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Date**: 2026-02-10

## Prerequisites

- Node.js (recommended: current LTS - v20+)
- Expo CLI (via `npx expo` is fine)
- iOS Simulator (macOS) and/or Android Emulator
- Redis + MongoDB (for the backend)

**Target platforms**
- iOS 15+
- Android 10+ (API 29+)

## Run Backend

From repo root:

1) Install server dependencies:
```bash
cd server
npm install
```

2) Configure environment:
- Copy `.env.example` to `.env` if present (or set env vars required by server)
- Ensure MongoDB, Redis, and Cloudinary are configured

3) Start server:
```bash
npm run dev
```

## Run Mobile App

From repo root:

1) Install mobile dependencies:
```bash
cd mobile
npm install
```

2) Start Expo:
```bash
npx expo start
```

3) Open:
- Press `i` for iOS simulator, or `a` for Android emulator
- Scan QR code with Expo Go app on physical device

## Run Tests

```bash
cd mobile
npm test                    # Run all tests
npm test -- --watch        # Run in watch mode
npm test -- --coverage     # Run with coverage
```

## API + Realtime Notes

- Mobile auth MUST send header: `X-Client-Platform: mobile`
- Socket.io auth uses `socket.handshake.auth.token = accessToken`
- Upload max image size: 10 MB
- Accepted image types: JPEG, PNG, WebP, HEIC, HEIF

## Environment Variables (Mobile)

Create `mobile/.env` with:
```
EXPO_PUBLIC_API_URL=http://localhost:4000/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Verification Checklist (MVP)

### Authentication (US1)
- [ ] Login with valid credentials → navigates to Assets Library
- [ ] Login with invalid credentials → shows error toast (persists until dismissed)
- [ ] Register new account → creates user and logs in
- [ ] Logout clears tokens and returns to Login screen

### Assets Library (US1)
- [ ] Assets Library shows skeleton loading state initially
- [ ] Assets load with correct status pills (Ready/Processing/Failed/Archived)
- [ ] Filter chips (All/Ready/Processing/Draft/Failed/Archived) filter list correctly
- [ ] Infinite scroll loads more assets at end of list
- [ ] Pull-to-refresh reloads assets
- [ ] Tap asset → navigates to Asset Detail

### Upload (US2)
- [ ] Upload tab allows camera/gallery selection
- [ ] Category selection enabled
- [ ] Submit enabled only when image + category chosen
- [ ] Invalid file (>10MB, wrong type) shows validation error
- [ ] Submit uploads and navigates to Asset Detail in Processing state
- [ ] Confirm-on-leave when upload in progress

### Asset Detail (US3)
- [ ] Detail renders correctly for each status:
  - Ready: Shows AI analysis, condition, archive action
  - Processing: Shows ProcessingOverlay with animation
  - Failed: Shows error message + Retry button
  - Partial: Shows warning + Retry button
  - Archived: Shows archived state
- [ ] Processed/Original toggle swaps image source
- [ ] Archive action confirms then updates status
- [ ] Retry action restarts processing

### Realtime (US4)
- [ ] `asset_processed` event updates library list without refresh
- [ ] `asset_processed` event updates detail screen without refresh
- [ ] Disconnect shows reconnecting banner
- [ ] Max reconnect attempts shows manual reconnect button
- [ ] Reconnect succeeds after manual button press

### Settings (US5)
- [ ] Settings shows user email
- [ ] Settings shows socket connection state
- [ ] Logout button works correctly

### Cross-Cutting
- [ ] Offline banner appears when network disconnected
- [ ] Toast spam prevented on rapid offline/online transitions
- [ ] 44pt touch targets on all interactive elements
- [ ] Accessibility labels on buttons and interactive elements
