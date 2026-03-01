/**
 * Jest Setup File
 *
 * Expo SDK 54 installs lazy polyfill getters (structuredClone, URL, etc.)
 * via runtime.native.ts. When those lazy getters fire during test execution,
 * the require() they call is blocked by Jest's module sandbox.
 *
 * Fix: After Expo setup runs, re-assign these globals to their native
 * Node.js implementations so the lazy getters never fire.
 */

// Save native implementations before Expo can override them
const _structuredClone = structuredClone;
const _URL = URL;
const _URLSearchParams = URLSearchParams;
const _TextDecoder = TextDecoder;

// Re-define as plain values (overwriting Expo's lazy getters)
Object.defineProperty(globalThis, 'structuredClone', {
  value: _structuredClone,
  configurable: true,
  writable: true,
  enumerable: true,
});

Object.defineProperty(globalThis, 'URL', {
  value: _URL,
  configurable: true,
  writable: true,
  enumerable: true,
});

Object.defineProperty(globalThis, 'URLSearchParams', {
  value: _URLSearchParams,
  configurable: true,
  writable: true,
  enumerable: true,
});

Object.defineProperty(globalThis, 'TextDecoder', {
  value: _TextDecoder,
  configurable: true,
  writable: true,
  enumerable: true,
});

// Pre-define __ExpoImportMetaRegistry to prevent its lazy getter
if (!globalThis.__ExpoImportMetaRegistry || typeof globalThis.__ExpoImportMetaRegistry !== 'object') {
  Object.defineProperty(globalThis, '__ExpoImportMetaRegistry', {
    value: { url: 'http://localhost:8081/index.bundle' },
    configurable: true,
    writable: true,
    enumerable: false,
  });
}
