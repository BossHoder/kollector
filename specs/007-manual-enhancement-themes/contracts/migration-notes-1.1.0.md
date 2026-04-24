# Migration Notes: 1.1.0

## Summary

Release `1.1.0` adds manual asset image enhancement and asset theme preference fields without breaking existing API or socket consumers.

## Additive API Changes

- Added `POST /api/assets/{id}/enhance-image` for asynchronous manual enhancement requests.
- Added optional `images.enhanced` and `enhancement` fields to asset reads.
- Added optional `presentation.themeOverrideId` support on `PATCH /api/assets/{id}`.
- Added `GET /api/auth/me` and `PATCH /api/auth/me` support for `settings.preferences.assetTheme.defaultThemeId`.

## Additive Event Changes

- Existing `asset_processed` behavior is unchanged.
- New socket event `asset_image_enhanced` is emitted when manual enhancement succeeds or fails.

## Compatibility Expectations

- Existing clients that ignore unknown fields continue to work unchanged.
- Existing list/card image behavior remains anchored to thumbnail semantics.
- Detail views may opt into `images.enhanced` when available.
- Theme preference fields are optional and may be absent or `null`.

## Clear Semantics

- `presentation.themeOverrideId: null` clears an asset-specific override.
- `settings.preferences.assetTheme.defaultThemeId: null` clears the user default.
- When both values are absent or `null`, clients should fall back to `vault-graphite`.

## Operational Notes

- Manual enhancement runs on the dedicated `asset-enhancement` queue.
- The existing `ai-processing` queue remains in place for the original AI analysis flow.
