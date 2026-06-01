import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This record or page doesn’t exist.</p>
      <Button asChild className="mt-4"><Link href="/dashboard">Back to dashboard</Link></Button>
    </div>
  );
}
