import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Defaults to the current origin in the browser; no baseURL needed for same-origin.
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  listAccounts,
  changePassword,
  deleteUser,
} = authClient;
