# Data Model: Subscription MVP Banking

**Feature**: [spec.md](spec.md)  
**Contracts**: [contracts/](contracts/)  
**Date**: 2026-04-07

## Entities

### 1) TierPolicy (configuration)

Defines entitlement rules by tier.

Fields:
- `tier: 'free' | 'vip'`
- `assetLimit: number` (Free=20, VIP=200)
- `monthlyProcessingLimit: number` (Free=20, VIP=400)
- `freeThemePresetIds: string[]` (Free must contain exactly two IDs: default and light)
- `maintenanceExpMultiplier: number` (Free=1.0, VIP=3.0)
- `priceUsdMonthly?: number` (VIP=0.99)

Validation rules:
- Tier identifiers are immutable constants.
- Free preset list must contain exactly two distinct preset IDs.

### 2) UserSubscription

Represents current entitlement state for a user.

Fields:
- `userId: string`
- `tier: 'free' | 'vip'`
- `status: 'active' | 'grace_pending_renewal' | 'expired'`
- `paymentChannel: 'manual_bank' | 'google_play' | 'app_store'`
- `activatedAt?: string (ISO)`
- `expiresAt?: string (ISO)`
- `graceEndsAt?: string (ISO)`
- `lastApprovedRequestId?: string`
- `updatedAt: string (ISO)`

Validation rules:
- New users default to `tier=free`, `status=active`.
- `graceEndsAt` is required when `status=grace_pending_renewal`.
- Enter grace only if renewal request was submitted before `expiresAt` and remains pending.

State transitions:
- `free/active -> vip/active` (admin approval)
- `vip/active -> vip/grace_pending_renewal` (expiry reached with eligible pending renewal)
- `vip/grace_pending_renewal -> vip/active` (renewal approved)
- `vip/active or vip/grace_pending_renewal -> free/active` (grace elapsed without approval or explicit downgrade)

### 3) SubscriptionUpgradeRequest

Represents user-submitted manual transfer request for upgrade or renewal.

Fields:
- `id: string`
- `userId: string`
- `type: 'upgrade' | 'renewal'`
- `status: 'pending' | 'approved' | 'rejected' | 'expired'`
- `transferReference: string`
- `submittedAt: string (ISO)`
- `reviewedAt?: string (ISO)`
- `reviewedBy?: string`
- `rejectionReason?: string`
- `proofFile?: { storageUrl: string, uploadedAt: string (ISO), deleteAt: string (ISO) }`
- `proofMetadata: { amount?: number, currency?: string, bankLabel?: string, payerMask?: string }`
- `metadataExpireAt: string (ISO)`

Validation rules:
- Pending requests require transfer reference and submitted timestamp.
- Proof file retention is 30 days from upload.
- Metadata retention is 180 days from request creation.
- Request is immutable after terminal state except retention housekeeping fields.

State transitions:
- `pending -> approved`
- `pending -> rejected`
- `pending -> expired` (admin timeout policy)

### 4) MonthlyUsageCounter

Aggregated monthly combined processing usage state for a user.

Fields:
- `userId: string`
- `monthKey: string` (UTC `YYYY-MM`)
- `tierAtWindowStart: 'free' | 'vip'`
- `allowance: number`
- `reservedCount: number`
- `consumedCount: number`
- `releasedCount: number`
- `updatedAt: string (ISO)`

Derived values:
- `used = consumedCount`
- `inFlightReserved = reservedCount - consumedCount - releasedCount`
- `remaining = allowance - consumedCount - inFlightReserved`

Validation rules:
- Counter row is unique by (`userId`, `monthKey`).
- `remaining` cannot be negative at reservation boundary.

### 5) QuotaLedgerEntry

Idempotent request-level accounting record.

Fields:
- `idempotencyKey: string` (unique)
- `userId: string`
- `actionType: 'analyze_queue' | 'enhance_image'`
- `resourceId?: string` (asset ID if available)
- `monthKey: string`
- `state: 'blocked' | 'reserved' | 'consumed' | 'released'`
- `failureClass?: 'internal_system' | 'business_validation' | 'client_cancelled'`
- `createdAt: string (ISO)`
- `finalizedAt?: string (ISO)`

Validation rules:
- Exactly one terminal accounting outcome per key.
- `released` is allowed only after `reserved`.
- Duplicate blocked/replayed requests must map to existing ledger state and not create extra charges.

State transitions:
- `blocked` (terminal)
- `reserved -> consumed` (normal completion)
- `reserved -> released` (terminal internal/system failure)

### 6) ThemeEntitlementView (derived)

Derived projection returned to clients.

Fields:
- `tier: 'free' | 'vip'`
- `selectablePresetIds: string[]`
- `lockedPresetIds: string[]`
- `freeThemeDefinition: { defaultPresetId: string, lightPresetId: string }`

Validation rules:
- Free tier selectable set must be exactly `{default, light}`.
- VIP tier locked set must be empty.

### 7) TierAuditLog

Immutable tier-change audit event.

Fields:
- `id: string`
- `userId: string`
- `actorId: string`
- `fromTier: 'free' | 'vip'`
- `toTier: 'free' | 'vip'`
- `reason: 'upgrade_approved' | 'renewal_approved' | 'expiry' | 'downgrade_manual' | 'grace_elapsed'`
- `effectiveAt: string (ISO)`
- `expiresAt?: string (ISO)`

### 8) QuotaAuditLog

Immutable quota accounting audit event.

Fields:
- `id: string`
- `userId: string`
- `actionType: 'analyze_queue' | 'enhance_image'`
- `idempotencyKey: string`
- `usageDelta: number` (1 for reserve/consume, -1 for release, 0 for blocked)
- `outcome: 'blocked' | 'reserved' | 'consumed' | 'released'`
- `recordedAt: string (ISO)`

## Relationships

- `UserSubscription.userId` references User.
- `SubscriptionUpgradeRequest.userId` references User.
- `UserSubscription.lastApprovedRequestId` references `SubscriptionUpgradeRequest.id`.
- `MonthlyUsageCounter` references User by `userId` and is keyed by month.
- `QuotaLedgerEntry` references User and optionally Asset (`resourceId`).
- `TierAuditLog` and `QuotaAuditLog` reference User and operational actors.

## Behavioral Rules

1. Downgrade data safety:
- Transitioning VIP to Free never deletes existing assets, themes, or processing results.
- Only new restricted actions are blocked.

2. Quota fairness:
- Reservation occurs at accepted entry only.
- Internal/system terminal failure releases reserved usage exactly once.
- Blocked and duplicate blocked requests never increase usage.

3. Reset behavior:
- Counters roll to new `monthKey` at UTC month boundary.
- First eligible request after boundary must initialize new month state if scheduler is delayed.

4. EXP behavior:
- Maintenance EXP uses tier multiplier snapshot at action processing time.
- Audit should store multiplier and resulting delta for traceability.
