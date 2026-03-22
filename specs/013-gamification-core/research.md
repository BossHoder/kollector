# Research: Gamification Core

This document captures technical decisions and patterns for implementing the gamification-core feature.

## 1. "Rubbing Gesture" Calculation & High-Framerate Rendering

- **Decision**: Use `@shopify/react-native-skia` for rendering the scratch-off mask, driven by `react-native-gesture-handler` and `react-native-reanimated` to track touch inputs entirely on the UI thread. To calculate the `cleanedPercentage`, use a mathematical heuristic running in a Reanimated worklet (e.g., tracking the total length of drawn paths across grid hitboxes) rather than reading pixel data.
- **Rationale**: Continuous gesture tracking across the React Native bridge drops framerates. Skia is optimized for 2D graphics and masks. Doing a mathematical heuristic offloads math to the UI thread/worklet and avoids visual stuttering.
- **Alternatives considered**: `react-native-svg` (poor performance for rapid path updates), exactly reading pixels via `makeImageSnapshot` (too expensive, drops frames), WebView (latency and memory).

## 2. Mass MongoDB Asset Decay (10,000+ Assets under 5m)

- **Decision**: Use MongoDB's `bulkWrite({ ordered: false })` in Node.js, processing updates in chunks of 1,000 to 2,500 documents. In the cron job, load active assets in paginated cursors, calculate their decays, and batch write them.
- **Rationale**: Setting `ordered: false` allows parallelization to maximize throughput. Chunking limits memory consumption and prevents long-living database locks or cache eviction stalls.
- **Alternatives considered**: `updateMany()` (infeasible since each asset decays differently based on its category modifier sneaker 1.5x, etc.), single `updateOne()` calls (10k network round-trips). 

## 3. Queueing Fire-and-Forget API Calls for Mobile

- **Decision**: Use React/TanStack Query mutation layer coupled with an MMKV-backed offline queue.
- **Rationale**: TanStack Query provides native `onMutate` and `onError` handlers specifically designed for instant optimistic updates and automatic state rollbacks if the network fails. MMKV is synchronous and drastically faster than `AsyncStorage`, storing inflight requests so they can be sent parallel without blocking UI or losing data if closed.
- **Alternatives considered**: `redux-offline` (legacy/heavy boilerplate), simple `fetch` (state desync and loss on app close/crash).
