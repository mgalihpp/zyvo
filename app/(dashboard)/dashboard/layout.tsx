import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

import { BrandLogo } from "@/components/brand-logo";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { AppSidebar } from "@/features/cv/components/dashboard/app-sidebar";

/**
 * Shell for `/dashboard/*`. The CV editor at `/builder/[cvId]` is a sibling
 * segment, so it stays full-screen without this sidebar chrome.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
    >
      <AppSidebar
        userName={session.user.name ?? "Pengguna"}
        userEmail={session.user.email ?? ""}
        userImage={session.user.image}
      />
      <SidebarInset>
        {/* Mobile: sidebar is a sheet, so surface a trigger. */}
        <header className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <SidebarTrigger />
          <BrandLogo />
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
