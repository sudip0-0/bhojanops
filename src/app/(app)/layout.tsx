import { Suspense } from "react";
import { requirePermission } from "@/lib/auth-helpers";
import { filterNav } from "@/lib/nav";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { ToastReader } from "@/components/ui/toast-reader";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission();
  const items = filterNav(user.permissions);
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <Sidebar items={items} user={{ name: user.name, role: user.role }} />
      <main id="main-content" className="flex-1 overflow-y-auto bg-background p-4 md:p-6">{children}</main>
      <Toaster />
      <Suspense>
        <ToastReader />
      </Suspense>
    </div>
  );
}
