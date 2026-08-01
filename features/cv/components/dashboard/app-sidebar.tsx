"use client";

import {
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
  SettingsIcon,
  UserCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOut } from "@/features/auth/lib/auth-client";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "CV", href: "/dashboard" },
  { label: "Template", href: "/dashboard/templates" },
  { label: "Pelacak Lamaran", href: "/dashboard/job-tracker" },
] as const;

export function AppSidebar({
  userName,
  userEmail,
  userImage,
}: {
  userName: string;
  userEmail: string;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();

  const handleSignOut = () => {
    startSignOut(async () => {
      await signOut();
      router.push(SIGN_IN_PATH);
      router.refresh();
    });
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="px-4 py-4 [&>[data-sidebar=sidebar]]:h-fit [&>[data-sidebar=sidebar]]:self-start"
    >
      <SidebarHeader className="px-6 pb-6 pt-4">
        <BrandLogo
          width={128}
          height={42}
          className="h-10 w-auto max-w-40 group-data-[collapsible=icon]:hidden"
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-4">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                      className={cn(
                        "h-10 rounded-xl text-base transition-all",
                        isActive
                          ? "data-active:!bg-primary/10 data-active:!text-primary font-bold hover:!bg-primary/10 hover:!text-primary"
                          : "font-normal text-sidebar-foreground/60 hover:!bg-primary/10 hover:!text-primary",
                      )}
                    >
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-8 px-6 pb-4">
        {/* User row */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-xl px-0 py-2 text-left outline-none transition-colors hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring/30 group-data-[collapsible=icon]:justify-center"
                  />
                }
              >
                <Avatar className="size-8 rounded-lg">
                  {userImage ? (
                    <AvatarImage src={userImage} alt={userName} />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-sidebar-border text-sidebar-foreground/60">
                    <UserCircleIcon className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium text-sidebar-foreground">
                    {userName}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {userEmail}
                  </span>
                </div>
                <ChevronsUpDownIcon className="size-4 shrink-0 text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="bottom" className="w-56">
                <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
                  <SettingsIcon />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/dashboard/billing" />}>
                  <CreditCardIcon />
                  Paket &amp; Harga
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                >
                  <LogOutIcon />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
