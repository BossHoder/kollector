# Kollector Web

Frontend for the Kollector asset dashboard, built with React, TypeScript, Vite, and TanStack Query.

## Local development

```bash
npm install
npm run dev
```

The app expects the Node server on `/api` and Socket.IO on `/socket.io`. In local Vite development this is handled by the proxy in `vite.config.ts`.

## Production behavior

- API requests stay same-origin via the edge Nginx proxy.
- Socket.IO defaults to the current origin unless `VITE_SOCKET_URL` is explicitly set.
- The production image is built from `web/Dockerfile` and served as static files by Nginx.

## Commands

- `npm run dev`
- `npm run build`
- `npm run test:run`
- `npm run lint`
