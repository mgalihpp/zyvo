"use client";

import {
  ChevronsUpDownIcon,
  FileTextIcon,
  HomeIcon,
  LayoutTemplateIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { ProBanner } from "@/features/cv/components/dashboard/pro-banner";
import { trpc } from "@/lib/trpc/client";

const NAV_ITEMS = [
  { label: "Beranda", href: "/dashboard", icon: HomeIcon },
  { label: "Kelola CV", href: "/dashboard/cvs", icon: FileTextIcon },
  { label: "Template", href: "/dashboard/templates", icon: LayoutTemplateIcon },
  { label: "Pengaturan", href: "/dashboard/settings", icon: SettingsIcon },
] as const;

/** Dashboard navigation sidebar (collapsible on desktop, sheet on mobile). */
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
  const utils = trpc.useUtils();
  const [isSigningOut, startSignOut] = useTransition();

  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => {
      utils.cv.list.invalidate();
      router.push(`/builder/${cv.id}`);
    },
  });

  const handleSignOut = () => {
    startSignOut(async () => {
      await signOut();
      router.push(SIGN_IN_PATH);
      router.refresh();
    });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 p-2">
        <BrandLogo className="mx-auto group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="mb-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
                  onClick={() => createMutation.mutate(undefined)}
                  loading={createMutation.isPending}
                >
                  <PlusIcon />
                  <span className="group-data-[collapsible=icon]:hidden">
                    CV Baru
                  </span>
                </Button>
              </SidebarMenuItem>
              {NAV_ITEMS.map((item) => {
                // Exact match for /dashboard so it isn't active on sub-routes.
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
                      className="data-active:bg-primary/10 data-active:text-primary data-active:hover:bg-primary/15 data-active:hover:text-primary [&_svg]:data-active:text-primary"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mb-2 px-2 group-data-[collapsible=icon]:hidden">
        <ProBanner compact />
      </div>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/30 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                  />
                }
              >
                <Avatar>
                  {userImage ? (
                    <AvatarImage src={userImage} alt={userName} />
                  ) : null}
                  <AvatarFallback>
                    {userName.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium">
                    {userName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userEmail}
                  </span>
                </div>
                <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-56">
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
