"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function Sidebar({ items, user }: { items: NavItem[]; user: { name?: string | null; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex-1 space-y-1 overflow-y-auto p-2">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          onClick={() => setOpen(false)}
          aria-current={pathname.startsWith(i.href) ? "page" : undefined}
          className={cn(
            "block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
            pathname.startsWith(i.href) && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );

  const header = (
    <div className="border-b p-4">
      <p className="text-lg font-bold text-primary">BhojanOps</p>
      <p className="text-xs text-muted-foreground">{user.name}</p>
      <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
    </div>
  );

  const signOut = (
    <form action={logout} className="border-t p-2">
      <Button type="submit" variant="outline" className="w-full">Sign out</Button>
    </form>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r bg-card md:flex">
        {header}
        {links}
        {signOut}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <p className="text-lg font-bold text-primary">BhojanOps</p>
        <Button variant="outline" size="sm" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <span className="font-bold text-primary">Menu</span>
              <Button variant="ghost" size="sm" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {links}
            {signOut}
          </div>
        </div>
      )}
    </>
  );
}
