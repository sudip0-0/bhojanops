import { requirePermission } from "@/lib/auth-helpers";
import { KdsBoard } from "@/components/kds-board";

export default async function KdsPage() {
  await requirePermission("kds.view");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kitchen Display</h1>
      <KdsBoard />
    </div>
  );
}
