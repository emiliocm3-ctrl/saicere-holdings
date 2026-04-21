"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const tabs = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="12" y="3" width="7" height="5" rx="1.5" />
        <rect x="12" y="10" width="7" height="9" rx="1.5" />
        <rect x="3" y="14" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5V17a2 2 0 002 2h12a2 2 0 002-2V9.5a2 2 0 00-2-2h-5.5L10 5.5H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    label: "Chat",
    href: "/dashboard/chat",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11a8 8 0 018-8 8 8 0 018 8 8 8 0 01-8 8H3l2.5-2.5" />
        <path d="M8 11h.01M11 11h.01M14 11h.01" />
      </svg>
    ),
  },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-[15px] font-semibold tracking-wide text-text">
          Saicere
        </span>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-7 h-7",
            },
          }}
        />
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>

      <nav className="shrink-0 border-t border-border bg-bg/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-accent" : "text-text-dim hover:text-text-muted"
                }`}
              >
                <span className={active ? "text-accent" : "text-text-dim"}>{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
