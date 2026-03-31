# Data Model: Manual Image Enhancement and Theme Presets

**Feature**: [spec.md](spec.md)  
**Contracts**: [contracts/](contracts/)  
**Date**: 2026-03-24

## Entities

### 1) AssetImageSet

Represents persisted asset image derivatives.

Fields:
- `images.original.url: string` (immutable source image)
- `images.processed.url?: string` (AI pipeline derivative)
- `images.thumbnail.url?: string` (list/card derivative)
- `images.card.url?: string` (existing card derivative)
- `images.enhanced.url?: string` (manual enhancement detail derivative)
- `images.enhanced.width?: number`
- `images.enhanced.height?: number`
- `images.enhanced.generatedAt?: string (ISO)`

Validation rules:
- `images.original` MUST always remain unchanged by enhancement flow.
- `images.thumbnail` semantics remain list/card focused.
- `images.enhanced` is optional and additive.

### 2) AssetEnhancementState

Represents manual enhancement lifecycle persisted with asset.

Fields:
- `enhancement.status: 'idle' | 'queued' | 'processing' | 'succeeded' | 'failed'`
- `enhancement.lastJobId?: string`
- `enhancement.requestedBy?: string` (user id)
- `enhancement.requestedAt?: string (ISO)`
- `enhancement.completedAt?: string (ISO)`
- `enhancement.errorCode?: string`
- `enhancement.errorMessage?: string`
- `enhancement.attemptCount?: number` (max 3)

Validation rules:
- Duplicate trigger rejected when status in `queued|processing`.
- Failed state occurs only after retries exhausted or non-retryable error.

State transitions:
- `idle -> queued -> processing -> succeeded`
- `idle -> queued -> processing -> failed`
- `failed -> queued` (manual retrigger)
- `succeeded -> queued` (manual retrigger for refreshed enhancement)

### 3) ThemePreset

Represents allowed preset theme catalog item (v1 curated list only).

Fields:
- `id: string`
- `name: string`
- `tokenSet: object`
- `active: boolean`

Validation rules:
- Write operations must reference an existing active preset id.
- Unknown preset ids are rejected with validation error.

### 4) AssetPresentation

Represents per-asset presentation overrides.

Fields:
- `presentation.themeOverrideId?: string | null`

Validation rules:
- Optional field.
- If non-null, must reference valid `ThemePreset.id`.
- If null, clear override and fall back to user default or v1 fallback preset `vault-graphite`.

### 5) UserAssetThemePreference

Represents global user-level default theme settings.

Fields:
- `settings.preferences.assetTheme.defaultThemeId?: string | null`

Validation rules:
- Optional field.
- If non-null, must reference valid `ThemePreset.id`.
- If null, clear default and fall back to v1 fallback preset `vault-graphite`.

## Relationships

- `Asset` has one `AssetImageSet`.
- `Asset` has one optional `AssetEnhancementState`.
- `Asset` has one optional `AssetPresentation`.
- `User` has one optional `UserAssetThemePreference`.
- `AssetPresentation.themeOverrideId` references `ThemePreset.id`.
- `UserAssetThemePreference.defaultThemeId` references `ThemePreset.id`.

## Rendering Resolution Rules

1. Asset detail image selection priority:
- `images.enhanced` -> `images.processed` -> `images.original`

2. Asset list/card image selection priority:
- `images.thumbnail` remains primary and unchanged by enhancement existence.

3. Theme precedence:
- `presentation.themeOverrideId` (asset-level) takes precedence over `settings.preferences.assetTheme.defaultThemeId` (user-level).
- `presentation.themeOverrideId = null` means no override for that asset.
- `settings.preferences.assetTheme.defaultThemeId = null` means no user default theme.
- If both are missing or null, resolve to preset `vault-graphite`.

## Queue/Job Model

### AssetEnhancementJob

Fields:
- `jobId: string`
- `queue: 'asset-enhancement'`
- `assetId: string`
- `userId: string`
- `originalImageUrl: string`
- `attempt: number` (1..3)
- `requestedAt: string (ISO)`

Rules:
- Max attempts = 3 with backoff policy.
- Original image URL is read-only source for processing.
- Completion writes `images.enhanced` and `enhancement` status metadata.
