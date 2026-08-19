import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ShieldOffIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRegistrationOpen, listUsers, setUserDisabled, updateRegistrationOpen } from "@/server/admin";

export const Route = createFileRoute("/dashboard/admin")({
  beforeLoad: ({ context }) => {
    if (context.user.role !== "superadmin") throw redirect({ to: "/dashboard" });
  },
  loader: async () => {
    const [registration, users] = await Promise.all([getRegistrationOpen(), listUsers()]);
    return { registration, users };
  },
  component: AdminPage,
});

function AdminPage() {
  const { registration, users } = Route.useLoaderData();
  const { user: currentUser } = Route.useRouteContext();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleToggleRegistration(open: boolean) {
    setPending(true);
    try {
      await updateRegistrationOpen({ data: { open } });
      await router.invalidate();
    } finally {
      setPending(false);
    }
  }

  async function handleToggleUser(userId: string, disabled: boolean) {
    await setUserDisabled({ data: { userId, disabled } });
    await router.invalidate();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-medium">Admin</h1>
        <p className="text-muted-foreground text-sm">Kelola pendaftaran akun dan pengguna aplikasi.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pendaftaran Umum</CardTitle>
          <CardDescription>
            Jika dimatikan, halaman /register tertutup untuk umum dan hanya akun yang sudah ada yang bisa masuk.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch checked={registration.open} onCheckedChange={handleToggleRegistration} disabled={pending} />
          <span className="text-sm">{registration.open ? "Terbuka untuk umum" : "Tertutup"}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengguna</CardTitle>
          <CardDescription>Semua akun terdaftar di aplikasi ini.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.displayName}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "superadmin" ? "default" : "secondary"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.disabled ? <Badge variant="destructive">Nonaktif</Badge> : <Badge variant="secondary">Aktif</Badge>}
                  </TableCell>
                  <TableCell>
                    {u.id !== currentUser.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleUser(u.id, !u.disabled)}
                      >
                        <ShieldOffIcon /> {u.disabled ? "Aktifkan" : "Nonaktifkan"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
