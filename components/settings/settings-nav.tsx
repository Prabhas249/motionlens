"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserIcon, CreditCardIcon, BellIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings", label: "Account", icon: UserIcon },
  { href: "/settings/billing", label: "Plan & Billing", icon: CreditCardIcon },
  { href: "/settings/notifications", label: "Notifications", icon: BellIcon },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((t) => {
        const active = pathname === t.href;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
