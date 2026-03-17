# Kollector Mobile Deployment

This Expo app can be built for Android and iOS with EAS and pointed at the same production backend that powers the website.

## What is already configured

- `app.config.js` creates development, preview, and production app variants.
- `eas.json` defines `development`, `preview`, and `production` build profiles.
- Production builds fail fast if `EXPO_PUBLIC_API_URL` or `EXPO_PUBLIC_SOCKET_URL` still point to localhost or a private LAN IP.
- Android preview and development builds produce installable `.apk` files for internal testing.

## Required production values

Create the following variables in your Expo project environments on expo.dev:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SOCKET_URL`
- `EXPO_OWNER`
- `EXPO_PROJECT_ID`
- `EXPO_ANDROID_PACKAGE`
- `EXPO_IOS_BUNDLE_IDENTIFIER`

Use these example values as a guide:

- Preview: `.env.preview.example`
- Production: `.env.production.example`

For this project, the production URLs should normally look like:

- `EXPO_PUBLIC_API_URL=https://your-domain/api`
- `EXPO_PUBLIC_SOCKET_URL=https://your-domain`

## One-time Expo setup

Run these commands from the `mobile` directory:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

During the first interactive setup, make sure you keep the generated Expo project ID and then store it in your Expo environment variables as `EXPO_PROJECT_ID`.

## Local validation

From the `mobile` directory:

```bash
npm run config:public
npm test -- --runInBand
```

## Trigger builds manually

From the `mobile` directory:

```bash
npm run build:android:preview
npm run build:android:production
npm run build:ios:production
```

If you want both store builds in one command:

```bash
npm run build:all:production
```

## GitHub Actions

The repository includes a manual workflow at `.github/workflows/mobile-build.yml`.

Add this GitHub secret before using it:

- `EXPO_TOKEN`

The workflow assumes your Expo project environments already contain the production or preview variables listed above.

## Store release

This repository stops at creating EAS builds. Submission is still an explicit step because Apple and Google store credentials are account-specific:

```bash
npx eas-cli@latest submit --platform android --profile production
npx eas-cli@latest submit --platform ios --profile production
```

Use preview builds for internal testers first, then promote to production builds when the app is ready for TestFlight or Google Play.
