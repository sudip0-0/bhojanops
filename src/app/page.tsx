import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const configured = (await prisma.restaurant.count()) > 0 && (await prisma.user.count()) > 0;
  if (!configured) redirect("/setup");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-4xl font-bold text-primary">BhojanOps</h1>
        <p className="mt-2 text-muted-foreground">Nepal-fit restaurant operations system</p>
      </div>
      <Button asChild size="lg">
        <Link href="/login">Sign in</Link>
      </Button>
    </main>
  );
}
