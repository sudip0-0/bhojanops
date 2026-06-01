import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// First-run guard: if the system is already configured, send users to sign in.
export default async function SetupPage() {
  const configured = (await prisma.restaurant.count()) > 0 && (await prisma.user.count()) > 0;
  if (configured) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle className="text-primary">Welcome to BhojanOps</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>This instance isn’t configured yet. Initialise the database with the seed data to create the restaurant, branch, roles, and the first owner account:</p>
          <pre className="rounded bg-muted p-2 text-xs">npm run db:push{"\n"}npm run db:seed</pre>
          <p className="text-muted-foreground">After seeding, sign in with the owner account.</p>
          <Button asChild><Link href="/login">Go to sign in</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
