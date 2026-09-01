"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { clsx } from "clsx";

import type { NavItem } from "@/lib/types";

type RoleSidebarProps = {
  items: NavItem[];
};

export function RoleSidebar({ items }: RoleSidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {items.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "rounded-2xl px-4 py-3 text-sm font-medium transition",
              active
                ? "bg-slate-200 text-white shadow-lg"
                : "bg-white/75 text-slate-700 hover:bg-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
