# AI Usage Indicator Design

## Goal

Make the remaining monthly AI quota visible at every point where a user can run
an AI feature, without adding a dedicated usage page or changing quota
enforcement.

## Existing Foundation

- `trpc.ai.quotaStatus` returns `{ used, limit }` for the authenticated user.
- Free and Basic plans have monthly limits; Pro returns `limit: null`.
- Every AI mutation already invalidates the quota-status query after it settles.
- `features/billing/server/entitlements.ts` remains the single owner of quota
  calculation and enforcement. No backend change is needed.

## Component

Add `AiUsageIndicator` in `features/ai/components/ai-usage-indicator.tsx`.

- It is a client component that queries `trpc.ai.quotaStatus`.
- A small ghost icon button is the trigger, using `HoverCard` so the content is
  available by hover, keyboard focus, and touch/click interaction.
- It accepts optional `className` and hover-card alignment props to fit each
  host layout.
- A failed or loading query leaves only the non-disruptive icon visible.

### Popover Content

For limited plans, show:

- `Kuota AI` heading.
- Progress bar for `used / limit`.
- `X dari Y dipakai`.
- `Sisa Z panggilan bulan ini`.
- `Reset tiap awal bulan`.

When the limit is exhausted, use destructive styling for the progress state and
show an upgrade link to `/dashboard/billing`.

For Pro, show `Kuota AI tanpa batas bulan ini` and no progress calculation.

## Placement

Render the indicator alongside existing AI controls in these locations:

1. CV builder AI panel (`ai-panel.tsx`).
2. Inline CV-editor AI action toolbar (`ai-toolbar.tsx`).
3. Create-CV AI generator dialog (`ai-generator-modal.tsx`).
4. Onboarding AI-generator step (`step-ai-generator.tsx`).
5. Job tracker AI assistant modal (`ai-assistant-modal.tsx`).

The existing textual quota line in the builder AI panel is replaced by the
indicator so there is one consistent presentation.

## Data Flow And Errors

The component consumes the existing `trpc.ai.quotaStatus` query. Each existing
AI mutation invalidates that query, so an open or subsequently opened indicator
receives current usage after an AI call. The UI does not independently calculate
or mutate quota values. Query failures fail silently to avoid blocking AI forms.

## Verification

- Verify free/basic states show correct used, remaining, and progress values.
- Verify the Pro state says usage is unlimited.
- Verify an exhausted quota uses the warning treatment and has a billing link.
- Verify `bun lint` and `bun build` complete successfully.
