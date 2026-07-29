import { useCallback, useEffect, useState } from "react";
import { listAccounts } from "@/features/auth/lib/auth-client";

/** null while loading, then whether the user has a credential (email/password) account. */
export function useHasPassword() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await listAccounts();
    setHasPassword(!!data?.some((a) => a.providerId === "credential"));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { hasPassword, refresh };
}
