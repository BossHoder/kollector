# Quickstart: FE MVP Integration

**Feature**: 010-fe-mvp-integration  
**Date**: 2025-12-30  
**Purpose**: Step-by-step guide to set up and run the FE MVP

## Prerequisites

- Node.js 18+ installed
- Backend server running (from 001/002 features)
- Redis and MongoDB accessible by backend
- Git with branch `010-fe-mvp-integration` checked out

## 1. Install Dependencies

```bash
cd web

# Install new dependencies
npm install react-router-dom@^7 @tanstack/react-query@^5 socket.io-client@^4 react-hook-form@^7 zod@^3 @hookform/resolvers@^3

# Install dev dependencies
npm install -D typescript@^5 @types/react@^19 @types/react-dom@^19 vitest@^2 @testing-library/react@^16 @testing-library/jest-dom@^6 msw@^2 tailwindcss@^4 autoprefixer@^10 postcss@^8
```

## 2. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowJs": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 3. Configure Tailwind CSS

Create `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#25f4d1',
        'background-dark': '#10221f',
        'surface-dark': '#162825',
        'surface-highlight': '#203632',
        'border-dark': '#283936',
        'text-secondary': '#9cbab5',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
```

Update `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Add dark class to html for dark mode */
html {
  @apply dark;
}
```

## 4. Configure Vite

Update `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
```

## 5. Set Up Environment Variables

Create `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## 6. Run Development Server

```bash
# Terminal 1: Backend (from server/)
cd server && npm run dev

# Terminal 2: Frontend (from web/)
cd web && npm run dev
```

Open http://localhost:5173 in browser.

## 7. Run Tests

```bash
cd web

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 8. Verify Setup

### Checklist

- [ ] Homepage loads at `/`
- [ ] Login form displays at `/login`
- [ ] Register form displays at `/register`
- [ ] Unauthenticated access to `/app/*` redirects to `/login`
- [ ] After login, redirected to `/app/assets`
- [ ] Assets grid displays (empty state or with assets)
- [ ] Socket status indicator shows in header
- [ ] Upload page accessible at `/app/assets/new`
- [ ] Settings page accessible at `/app/settings`

### API Connection Test

```javascript
// Open browser console on any page
fetch('/api/health').then(r => r.json()).then(console.log);
// Should return: { status: 'ok' } or similar
```

### Socket Connection Test

```javascript
// After login, check socket status in React DevTools
// Or add temporary console.log in SocketContext
console.log('Socket connected:', socket.connected);
```

## Troubleshooting

### CORS Errors
- Ensure Vite proxy is configured in `vite.config.js`
- Or ensure backend has CORS configured for `http://localhost:5173`

### Socket Connection Fails
- Verify backend Socket.io server is running
- Check that auth token is being passed correctly
- Check browser console for WebSocket errors

### 401 on API Calls
- Verify token is being stored after login
- Check that Authorization header is being set
- Test token refresh flow

### Tailwind Styles Not Applied
- Ensure `postcss.config.js` exists with Tailwind plugin
- Verify `@tailwind` directives in `index.css`
- Check that `tailwind.config.js` content paths are correct

## Next Steps

1. Implement pages in order of priority (P1 → P6)
2. Write tests before implementing each component
3. Validate against Stitch prototypes
4. Test realtime updates with socket events
