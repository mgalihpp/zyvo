"use client";

import { format } from "date-fns";
import { LogOut, Monitor, Smartphone, Tv2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listSessions,
  revokeSession,
  useSession,
} from "@/features/auth/lib/auth-client";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { parseUserAgent } from "@/features/auth/lib/user-agent";

type Row = NonNullable<
  Awaited<ReturnType<typeof listSessions>>["data"]
>[number];

function OsIcon({ os }: { os: string }) {
  const lower = os.toLowerCase();
  if (
    lower.includes("android") ||
    lower.includes("ios") ||
    lower.includes("iphone") ||
    lower.includes("ipad")
  )
    return <Smartphone className="size-5 shrink-0 text-muted-foreground" />;
  if (lower.includes("tv") || lower.includes("smart"))
    return <Tv2 className="size-5 shrink-0 text-muted-foreground" />;
  return <Monitor className="size-5 shrink-0 text-muted-foreground" />;
}

export default function ActiveDevices() {
  const { data: current } = useSession();
  const [sessions, setSessions] = useState<Row[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    void listSessions().then(({ data }) => setSessions(data ?? []));
  }, []);

  const revoke = async (token: string) => {
    const isCurrentSession = token === current?.session.token;
    setRevoking(token);
    await revokeSession({ token });
    setSessions((s) => s?.filter((x) => x.token !== token) ?? null);
    setRevoking(null);
    if (isCurrentSession) {
      window.location.href = SIGN_IN_PATH;
    }
  };

  if (sessions === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {sessions.map((s) => {
        const { os, browser } = parseUserAgent(s.userAgent);
        const isCurrent = s.token === current?.session.token;
        return (
          <li
            key={s.token}
            className="flex items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4"
          >
            <div className="flex items-start gap-3">
              <OsIcon os={os} />
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  {os}
                  {isCurrent && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Perangkat ini
                    </span>
                  )}
                </p>
                {browser && <p className="text-muted-foreground">{browser}</p>}
                {s.ipAddress &&
                  !/^[0:]+$/.test(s.ipAddress) &&
                  s.ipAddress !== "::1" && (
                    <p className="text-muted-foreground">{s.ipAddress}</p>
                  )}
                <p className="text-muted-foreground">
                  {format(new Date(s.createdAt), "d/M/yyyy @ h:mm:ss a")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:text-destructive"
              aria-label="Keluar dari perangkat ini"
              loading={revoking === s.token}
              onClick={() => revoke(s.token)}
            >
              <LogOut className="size-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
