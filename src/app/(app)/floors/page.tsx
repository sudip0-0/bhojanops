import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createFloor, createTable, renameTable, toggleTable } from "./actions";

export default async function FloorsPage() {
  const user = await requirePermission("tables.manage");
  const where = user.branchId ? { id: user.branchId } : {};
  const branches = await prisma.branch.findMany({
    where,
    include: { floors: { include: { tables: { orderBy: { name: "asc" } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Floors & Tables</h1>
      {branches.map((branch) => (
        <Card key={branch.id}>
          <CardHeader><CardTitle>{branch.name}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form action={createFloor} className="flex gap-2">
              <input type="hidden" name="branchId" value={branch.id} />
              <Input name="name" placeholder="New floor name" className="max-w-xs" required />
              <Button type="submit" size="sm">Add floor</Button>
            </form>

            {branch.floors.map((floor) => (
              <div key={floor.id} className="rounded border p-3">
                <p className="mb-2 font-medium">{floor.name}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {floor.tables.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <form action={renameTable} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={t.id} />
                        <Input name="name" defaultValue={t.name} className="h-7 w-20" />
                        <Badge className="capitalize">{t.state.toLowerCase().replace("_", " ")}</Badge>
                      </form>
                      <form action={toggleTable}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button type="submit" size="sm" variant={t.state === "DISABLED" ? "secondary" : "outline"}>
                          {t.state === "DISABLED" ? "Enable" : "Disable"}
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
                <form action={createTable} className="mt-2 flex gap-2">
                  <input type="hidden" name="branchId" value={branch.id} />
                  <input type="hidden" name="floorId" value={floor.id} />
                  <Input name="name" placeholder="Table name" className="h-8 max-w-[120px]" required />
                  <Input name="seats" type="number" defaultValue={4} className="h-8 w-16" />
                  <Button type="submit" size="sm">Add table</Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
