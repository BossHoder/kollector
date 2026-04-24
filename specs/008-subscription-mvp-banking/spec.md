# Feature Specification: Subscription MVP Banking

**Feature Branch**: `001-subscription-mvp-banking`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Introduce MVP monetization with Free and VIP tiers, manual bank transfer payment, fair quota behavior, and cross-platform consistency for Kollector"

## Clarifications

### Session 2026-04-07

- Q: Which resource does the 20/200 creation cap apply to in MVP? → A: Assets only; collections are not quota-limited in MVP.
- Q: What grace period applies when VIP expires but renewal transfer confirmation is still pending? → A: 72-hour grace period after expiry while renewal confirmation is pending.
- Q: When should monthly processing quota be charged and refunded? → A: Reserve quota on accepted processing requests and auto-refund exactly once on terminal internal/system failure.
- Q: How long should bank-transfer proof and metadata be retained? → A: Keep proof files for 30 days and transfer metadata for 180 days.
- Q: How many free theme presets are selectable in MVP? → A: Exactly two: the default preset and one light preset.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Free User Reaches Asset Limit (Priority: P1)

A free user grows their assets until they reach the free cap. They can still view everything they already own, but cannot create new assets until they upgrade.

**Why this priority**: Asset creation is a core action. Enforcing this limit correctly without blocking read access is critical to fairness and trust.

**Independent Test**: Can be fully tested by creating assets up to 20 as a free user, attempting asset 21, and verifying create is blocked while list/detail access still works.

**Acceptance Scenarios**:

1. **Given** a free user with 19 assets, **When** they create one more asset, **Then** the action succeeds and total assets become 20.
2. **Given** a free user with 20 assets, **When** they attempt to create another asset, **Then** the system blocks only the create action and returns a clear limit message with upgrade guidance.
3. **Given** a free user at the asset cap, **When** they browse existing assets and asset details, **Then** read access remains fully available.
4. **Given** a downgraded user who has more than 20 existing assets, **When** they view existing data, **Then** all existing data remains visible and unchanged.

---

### User Story 2 - Free User Reaches Monthly Processing Limit (Priority: P1)

A free user uses image processing across background removal and manual enhancement. When the combined monthly quota is exhausted, new processing attempts are blocked until reset, without penalizing duplicate blocked attempts or failed accounting paths.

**Why this priority**: Processing quotas affect high-frequency behavior and are most likely to trigger backlash if they feel unfair.

**Independent Test**: Can be tested by consuming 20 combined processing uses in one month, attempting additional analyze/enhance actions, and verifying blocking plus correct reset messaging and accounting.

**Acceptance Scenarios**:

1. **Given** a free user with 19 monthly processing uses, **When** they submit one valid processing action, **Then** usage becomes 20 and at-limit messaging is shown.
2. **Given** a free user at 20 monthly processing uses, **When** they trigger analyze queue entry, **Then** the request is blocked with quota details and next reset date.
3. **Given** a free user at 20 monthly processing uses, **When** they trigger manual enhancement, **Then** the request is blocked with the same quota semantics as analyze queue.
4. **Given** a blocked or duplicate request, **When** the same request is retried, **Then** quota is not decremented again.
5. **Given** a system failure before processing is accepted, **When** the request fails, **Then** quota usage is not consumed.
6. **Given** a processing request was accepted and quota was reserved, **When** processing ends in terminal internal/system failure, **Then** reserved quota is refunded exactly once and reflected in usage totals.

---

### User Story 3 - Upgrade to VIP via Bank Transfer (Priority: P1)

A user requests VIP upgrade by submitting bank transfer proof. After admin confirmation, VIP benefits activate immediately and apply to limits, processing quota, and EXP multiplier.

**Why this priority**: This is the monetization path for MVP and must feel straightforward, transparent, and immediately rewarding.

**Independent Test**: Can be tested by submitting an upgrade request, confirming it as admin, and verifying VIP entitlements become active without delay.

**Acceptance Scenarios**:

1. **Given** a free user who completed a bank transfer, **When** they submit an upgrade request with transfer details, **Then** the request enters pending confirmation state.
2. **Given** a pending request, **When** an admin confirms payment, **Then** user tier changes to VIP immediately and VIP limits become effective.
3. **Given** a user is upgraded mid-month, **When** the tier changes, **Then** existing monthly usage is preserved and remaining quota is recalculated against VIP limits.
4. **Given** an approved upgrade, **When** activation completes, **Then** an audit entry is created for both tier change and activation source.

---

### User Story 4 - VIP Expires or Downgrades Without Data Loss (Priority: P1)

A VIP user does not renew (or is downgraded) and returns to Free tier. Their existing collections, assets, and prior results remain intact and visible, while new restricted actions follow free limits.

**Why this priority**: Downgrade fairness is critical to avoid user backlash and maintain long-term trust.

**Independent Test**: Can be tested by expiring a VIP account with data above free limits, then verifying read access persists and only new restricted actions are blocked.

**Acceptance Scenarios**:

1. **Given** a VIP user with 120 assets, **When** VIP expires, **Then** all 120 assets remain readable and no data is deleted.
2. **Given** the same downgraded user, **When** they attempt to create new assets above free cap, **Then** create actions are blocked with free-tier messaging.
3. **Given** a downgraded user whose monthly processing usage exceeds free allowance, **When** they trigger new processing, **Then** processing is blocked until monthly reset or re-upgrade.
4. **Given** a user renews VIP before or after expiry, **When** admin confirms renewal payment, **Then** VIP reactivates for one month and benefits resume immediately.
5. **Given** VIP expires while a renewal submitted before expiry is still pending review, **When** the account enters post-expiry state, **Then** VIP benefits remain active for up to 72 hours while confirmation is pending.

---

### User Story 5 - Theme Access by Tier Across Settings and Detail (Priority: P2)

Users see and manage theme presets according to their tier. Free users can apply only free presets while VIP users can apply all presets. Theme lock/unlock behavior stays consistent in settings and asset detail views across web and mobile.

**Why this priority**: Tier-visible theme differentiation is a key part of monetization, but must avoid breaking existing personalized visuals.

**Independent Test**: Can be tested by comparing free and VIP users in settings/detail screens and validating lock state, apply actions, and downgrade behavior.

**Acceptance Scenarios**:

1. **Given** a free user opens theme settings, **When** presets are displayed, **Then** exactly two presets are selectable (the default preset and one light preset) and all remaining presets are marked VIP-locked.
2. **Given** a free user views asset detail theme controls, **When** they attempt to apply a VIP-only preset, **Then** the apply action is blocked and upgrade guidance is shown.
3. **Given** a VIP user, **When** they open theme settings or asset detail controls, **Then** all presets are selectable.
4. **Given** a VIP user who previously applied VIP-only themes, **When** they downgrade to Free, **Then** existing themed assets remain visible but applying new VIP-only themes is blocked.

---

### User Story 6 - VIP Receives 3x EXP on Maintenance Actions (Priority: P2)

Gamification rewards reflect subscription benefits: VIP users earn three times the base EXP for the same eligible maintenance action, while Free users continue receiving base EXP.

**Why this priority**: EXP multiplier is a core VIP value lever and must remain predictable and fair.

**Independent Test**: Can be tested by executing the same maintenance action under Free and VIP tiers and comparing EXP gain.

**Acceptance Scenarios**:

1. **Given** a free user performs a successful maintenance action, **When** EXP is awarded, **Then** base EXP is granted.
2. **Given** a VIP user performs the same successful maintenance action, **When** EXP is awarded, **Then** awarded EXP equals three times the free base EXP.
3. **Given** a VIP user downgrades to Free, **When** they perform the next maintenance action, **Then** EXP returns to free base multiplier.
4. **Given** EXP is granted under either tier, **When** award is persisted, **Then** an audit record captures applied multiplier and resulting EXP delta.

### Edge Cases

- A processing request is submitted exactly at monthly reset boundary; only one month window is charged.
- A user upgrades from Free to VIP while already at free processing cap; processing becomes allowed immediately up to VIP quota.
- A user downgrades from VIP to Free while above free limits; no data is removed and only new restricted actions are blocked.
- Duplicate client retries or network replays hit the same blocked request; usage remains unchanged.
- Processing fails before acceptance into queue/processing workflow; quota is not consumed.
- Processing fails after acceptance because of terminal internal/system error; reserved quota is released exactly once.
- Admin rejects a bank transfer request; user remains on current tier and no partial VIP benefits are applied.
- Bank-transfer proof file retention window elapses before a dispute is raised; proof file may be unavailable while metadata remains available for 180 days.
- VIP expires while a processing request is in progress; accounting remains consistent and action outcome is deterministic.
- VIP expires while renewal confirmation is pending; VIP remains active only within the 72-hour grace window, then downgrades automatically if still unapproved.
- Theme catalog changes while user is downgraded; previously applied themes stay readable and locked themes cannot be newly applied.

## Requirements *(mandatory)*

### Functional Requirements

#### Tier Model and Entitlements

- **FR-001**: System MUST support two tiers for MVP: Free and VIP.
- **FR-002**: Free tier MUST limit asset creation to 20 total owned assets.
- **FR-003**: VIP tier MUST increase asset creation limit to 200 total owned assets.
- **FR-003a**: Collections are not directly quota-limited in MVP.
- **FR-004**: Free tier MUST allow 20 monthly image-processing uses combined across background removal and manual enhancement.
- **FR-005**: VIP tier MUST allow 400 monthly image-processing uses combined across background removal and manual enhancement.
- **FR-006**: Free tier MUST allow exactly two selectable theme presets (the default preset and one light preset) and lock all remaining preset themes.
- **FR-007**: VIP tier MUST allow full preset theme access.
- **FR-008**: VIP tier MUST award 3x EXP for eligible cleaning and maintenance actions relative to the free baseline.
- **FR-008a**: VIP tier price for MVP MUST be USD 0.99 per month.

#### Subscription Lifecycle and Banking Workflow

- **FR-009**: System MUST maintain a subscription record per user with current tier, activation time, expiry time, and payment channel.
- **FR-010**: Existing and newly registered users MUST default to Free tier unless an active VIP entitlement exists.
- **FR-011**: Users MUST be able to submit a VIP upgrade request with bank transfer reference/proof for manual review.
- **FR-012**: Admins MUST be able to approve or reject pending bank transfer upgrade requests.
- **FR-013**: On admin approval, system MUST activate VIP immediately and set entitlement duration to one month.
- **FR-014**: VIP renewals via manual transfer MUST extend VIP by one month from current expiry if still active, otherwise from approval time.
- **FR-014a**: If VIP expires while a renewal request submitted before expiry is still pending admin confirmation, system MUST keep VIP entitlements active for a 72-hour grace window.
- **FR-014b**: If renewal is approved during the grace window, subscription continuity MUST be preserved without a downgrade transition.
- **FR-015**: On VIP expiry with no pending-renewal grace eligibility, or when a pending-renewal grace window elapses without approval, system MUST switch user to Free tier without deleting existing user data.
- **FR-016**: On downgrade, system MUST enforce free limits only for new create/process/theme-apply actions and MUST preserve read access to all existing data.
- **FR-017**: Subscription source model MUST support manual bank transfer in MVP and remain extensible to future app store billing channels without contract breakage.

#### Monthly Usage Counter and Reset Rules

- **FR-018**: System MUST maintain monthly processing usage counters per user and per month window.
- **FR-019**: Processing counter MUST aggregate both analyze queue submissions and manual enhancement triggers into one combined usage number.
- **FR-020**: Monthly processing counters MUST reset at 00:00 UTC on the first day of each calendar month.
- **FR-021**: System MUST expose current usage, allowance, remaining quota, and next reset date for user-facing quota displays.
- **FR-022**: Tier changes mid-month MUST preserve already used count and recalculate remaining allowance against the new tier limit.
- **FR-023**: Unused processing quota MUST NOT roll over into the next month.
- **FR-024**: If reset processing is delayed, first eligible request after the reset boundary MUST apply the new month window before charging usage.

#### Quota Enforcement and Fairness

- **FR-025**: System MUST enforce tier asset limit at asset creation paths.
- **FR-026**: System MUST enforce monthly processing quota at analyze queue entry path.
- **FR-027**: System MUST enforce monthly processing quota at manual enhancement trigger path.
- **FR-027a**: On accepted analyze queue or enhancement requests, system MUST reserve one monthly processing usage unit atomically.
- **FR-027b**: If an accepted processing request reaches terminal internal/system failure, system MUST release the reserved unit exactly once.
- **FR-028**: When asset or processing quota is exhausted, system MUST block only new restricted actions and MUST NOT block read access to existing collections/assets/results.
- **FR-029**: System MUST show soft warning states before exhaustion at 80% and 90% of monthly processing allowance, and at 90% of asset cap.
- **FR-030**: At-limit responses and UI states MUST include clear usage values, limit values, and monthly reset date.
- **FR-031**: Duplicate blocked requests or replayed blocked requests MUST NOT consume additional quota.
- **FR-032**: Requests that fail before processing acceptance MUST NOT consume quota.
- **FR-033**: Quota accounting MUST be idempotent per request identity to prevent double-charging from retries or transient failures.
- **FR-034**: Quota behavior, warning thresholds, and messaging semantics MUST be consistent between web and mobile clients.
- **FR-035**: User-facing messaging MUST clearly explain what is free, what is VIP, and why usage limits exist.

#### Error Contracts and Compatibility

- **FR-036**: Quota-exceeded API responses MUST use the platform-standard error envelope and include machine-readable code plus details for tier, limit type, used amount, limit amount, and reset date.
- **FR-037**: Tier-locked theme apply attempts MUST return a distinct upgrade-required error code with locked-resource context.
- **FR-038**: Existing realtime/event flows MUST remain backward compatible; new subscription/quota fields and events MUST be additive.
- **FR-039**: Existing enhancement and theme behavior from prior features MUST continue to function without breaking contract expectations.
- **FR-040**: Tier change events (upgrade, downgrade, expiry, renewal) MUST be emitted or exposed consistently so clients can refresh entitlement state predictably.

#### UX States

- **FR-041**: System MUST define and surface quota/tier UX states: near-limit, at-limit, upgraded, downgraded, renewal-pending, and expired.
- **FR-042**: Upgraded state MUST show VIP benefits immediately after admin confirmation.
- **FR-043**: Downgraded and expired states MUST provide non-blocking explanations and clearly list what actions remain available.
- **FR-044**: Theme lock/unlock presentation in settings and asset detail MUST be consistent across web and mobile.

#### Auditability and Governance

- **FR-045**: Every tier change MUST create an immutable audit log with actor, previous tier, new tier, reason, effective time, and expiry time.
- **FR-046**: Every quota consumption update MUST create an audit log with action category, request identity, usage delta, and accounting outcome (charged, released, blocked).
- **FR-047**: Every bank transfer approval or rejection decision MUST be auditable with reviewer identity and decision time.
- **FR-048**: Audit records MUST support traceability for user support and billing dispute resolution.
- **FR-048a**: Bank-transfer proof files uploaded for VIP requests MUST be retained for 30 days from upload time and then deleted automatically.
- **FR-048b**: Bank-transfer metadata (including transfer reference, request status history, decision actor, and decision timestamps) MUST be retained for 180 days from request creation.
- **FR-048c**: After proof file deletion, metadata records MUST remain queryable until their 180-day retention period expires.

#### Migration, Rollout, and Test Coverage

- **FR-049**: Migration MUST initialize all current users into Free tier records without deleting or altering existing assets, enhancement data, theme selections, or gamification history.
- **FR-050**: Rollout MUST support a soft-launch stage where counters and warnings are visible before hard blocking is enabled.
- **FR-051**: Before hard enforcement starts, system MUST provide clear in-product communication about limits, reset schedule, and upgrade process.
- **FR-052**: Automated and manual test coverage MUST include quota reached, upgrade, downgrade, monthly reset, duplicate request handling, and failure accounting scenarios.
- **FR-053**: Automated and manual test coverage MUST confirm backward compatibility for existing realtime/event flows and existing enhancement/theme behavior.

### Key Entities *(include if feature involves data)*

- **Tier Policy**: Defines entitlements by tier (asset cap, monthly processing allowance, theme access level, EXP multiplier).
- **User Subscription**: Current entitlement state per user (tier, active period, source channel, renewal status).
- **Upgrade Request**: User-submitted VIP request using bank transfer proof, with lifecycle states (pending, approved, rejected, expired) and retention windows (proof file 30 days, metadata 180 days).
- **Monthly Usage Counter**: Per-user combined monthly processing usage record containing used amount, limit, remaining amount, and reset date.
- **Quota Consumption Record**: Idempotent per-request accounting record that captures whether usage was charged, released, or blocked.
- **Theme Entitlement View**: Derived view of selectable vs locked presets for current tier, used by settings and asset detail surfaces.
- **Tier Audit Log**: Immutable history of tier lifecycle changes and admin payment decisions.
- **Quota Audit Log**: Immutable history of processing quota updates and reasoning.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempts above asset or monthly processing limits are blocked for new restricted actions, while 100% of read operations to existing user data remain available.
- **SC-002**: 0 verified cases during pilot where duplicate blocked requests or pre-acceptance failures incorrectly consume quota.
- **SC-003**: 100% of admin-approved upgrades reflect VIP entitlements for the user within 1 minute of approval.
- **SC-004**: 100% of downgrade or expiry events preserve existing user collections/assets/results without deletion.
- **SC-005**: At least 95% of tested users can identify current usage and next reset date within 10 seconds on both web and mobile.
- **SC-006**: Tier-based theme gating is accurate in 100% of regression tests: Free can apply only free presets, VIP can apply all, and previously applied VIP themes remain viewable after downgrade.
- **SC-007**: VIP maintenance actions award exactly 3x free baseline EXP in 100% of validated maintenance scenarios.
- **SC-008**: For the same account state, web and mobile display matching tier state labels, usage values, and reset dates in 100% of cross-platform regression cases.
- **SC-009**: Existing enhancement, theme, and realtime integration tests continue to pass with no breaking contract changes introduced by subscription/quota additions.
- **SC-010**: 100% of sampled upgrade requests enforce retention windows correctly: proof files removed after 30 days, metadata available through day 180.

## Assumptions

- Free tier preset access for MVP is fixed at two selectable themes: the default preset and one light preset.
- One VIP month is treated as one continuous month-long entitlement period beginning at approval time.
- Monthly processing quota windows reset on calendar month boundaries in UTC.
- Admin payment verification is performed by operations staff; the product stores the decision and resulting entitlement.
- Existing enhancement, theme, realtime, and gamification flows from prior specs remain the baseline behavior unless explicitly changed by this feature.

## Dependencies

- Existing asset creation and collection flows from prior foundation and frontend/mobile integration specs.
- Existing analyze queue and enhancement trigger entry points where processing quota enforcement must be added.
- Existing theme preset and gamification maintenance systems for tier-gated theme access and EXP multiplier behavior.

## Out of Scope

- Automatic billing through Google Play or App Store in MVP.
- Complex multi-tier or regional pricing models beyond Free and VIP.
- Pay-per-request or micro-billing models.
- Redesign of unrelated gameplay loops outside tier-based EXP multiplier and quota/tier UX messaging.
