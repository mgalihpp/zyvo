# Settings — Account Actions

## Goal
Make the `/dashboard/settings` page functional. Replace mock buttons with real actions: set password (Google-only users), change password, delete account.

## Decisions
- **Delete requires password always.** No email provider is wired, so email-verification deletion is unavailable. Google-only users must set a password before they can delete.
- **Set password built now.** `setPassword` is server-only in Better Auth, so it goes through a new tRPC mutation.

## Password detection
`session.user.image` does NOT indicate password status. Use `authClient.listAccounts()`:
```
hasPassword = accounts.some(a => a.providerId === "credential")
```

## Changes

### 1. `features/auth/lib/auth.ts`
Add deletion config:
```ts
user: { deleteUser: { enabled: true } },
```

### 2. `features/auth/server/auth-router.ts` (new)
```ts
setPassword: protectedProcedure
  .input(z.object({ newPassword: z.string().min(8) }))
  .mutation(({ ctx, input }) =>
    auth.api.setPassword({ body: { newPassword: input.newPassword }, headers: ctx.headers }))
```
`ctx.headers` already exists on tRPC context.

### 3. `server/trpc/routers/_app.ts`
Mount: `account: authRouter`.

### 4. `app/(dashboard)/dashboard/settings/page.tsx`
On mount, fetch `listAccounts` → derive `hasPassword`.

**Set password** (shown when `!hasPassword`): Dialog, new + confirm fields, min 8, must match → `trpc.account.setPassword` → toast success → refetch accounts.

**Change password** (shown when `hasPassword`): Dialog, current + new fields → `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })` → toast.

**Delete account**: AlertDialog requiring password input → `authClient.deleteUser({ password })` → on success `router.push("/")`. If `!hasPassword`, block with hint "set a password first".

## Error handling
Each action: loading state on button, try/catch, `toast.add` on failure with the error message. Zod min(8) + confirm-match validated client-side before the call.

## Testing
Manual: Google-only user sets password → change password appears → delete with password redirects home. Email/password user: change + delete work directly.

## Skipped
Email-verification delete flow (needs email provider). Add when provider wired.
