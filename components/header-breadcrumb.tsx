"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { navLinks } from "@/components/app-shared";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";

// Derives the header title from the current route (sidebar's static isActive is gone).
export function HeaderBreadcrumb() {
  const pathname = usePathname();
  let page: { title: string; icon?: ReactNode } = { title: "Dashboard" };

  if (pathname.startsWith("/settings")) {
    page = { title: "Settings" };
  } else {
    const match = navLinks
      .filter(
        (i) =>
          i.path?.startsWith("/") &&
          (pathname === i.path || pathname.startsWith(i.path + "/")),
      )
      .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))[0];
    if (match) page = { title: match.title, icon: match.icon };
  }

  return <AppBreadcrumbs page={page} />;
}
