import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createUser, toggleUser } from "./actions";

export default async function UsersPage() {
  await requirePermission("users.manage");
  const [users, roles, branches] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, include: { role: true, branch: true } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <Card>
        <CardHeader><CardTitle>Staff</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <div>
                <span className="font-medium">{u.name}</span> <span className="text-muted-foreground">{u.email}</span>
                <Badge className="ml-2 capitalize">{u.role.key}</Badge>
                {u.branch && <span className="ml-2 text-xs text-muted-foreground">{u.branch.name}</span>}
                {!u.active && <Badge className="ml-2 bg-red-100 text-red-700">inactive</Badge>}
              </div>
              <form action={toggleUser}>
                <input type="hidden" name="id" value={u.id} />
                {u.active
                  ? <ConfirmButton confirmMessage={`Deactivate ${u.name}? They will be unable to sign in.`} size="sm" variant="outline">Deactivate</ConfirmButton>
                  : <Button type="submit" size="sm" variant="outline">Activate</Button>}
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Add User</CardTitle></CardHeader>
        <CardContent>
          <form action={createUser} className="flex flex-wrap items-end gap-2">
            <Input name="name" placeholder="Name" className="h-8 w-36" required />
            <Input name="email" type="email" placeholder="Email" className="h-8 w-48" required />
            <Input name="password" type="password" placeholder="Password" className="h-8 w-36" required />
            <Select name="roleId" required>
              <SelectTrigger aria-label="Role" className="h-8 w-36"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select name="branchId" defaultValue="none">
              <SelectTrigger aria-label="Branch" className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No branch (all)</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm">Create user</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
