import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { getSessionUser, logoutUser } from "@/server/auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const router = useRouter();
  const { user } = Route.useRouteContext();

  async function handleLogout() {
    await logoutUser();
    await router.navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="font-semibold">
            Silsilah Keluarga
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm">{user.email}</span>
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
