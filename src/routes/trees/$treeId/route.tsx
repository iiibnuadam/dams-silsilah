import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSessionUser } from "@/server/auth";
import { getTree } from "@/server/trees";

export const Route = createFileRoute("/trees/$treeId")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ params }) => getTree({ data: { treeId: params.treeId } }),
  component: TreeLayout,
});

function TreeLayout() {
  const { treeId } = Route.useParams();
  const detail = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const { pathname } = useLocation();
  const isOwner = detail.tree.ownerId === user.id;

  const tab = pathname.endsWith("/settings")
    ? "settings"
    : pathname.endsWith("/share")
      ? "share"
      : pathname.endsWith("/members")
        ? "members"
        : pathname.endsWith("/relationships")
          ? "relationships"
          : "chart";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm mb-2">
            <ArrowLeftIcon className="size-3.5" /> Semua Silsilah
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold">{detail.tree.name}</h1>
              {detail.tree.description && <p className="text-muted-foreground text-sm">{detail.tree.description}</p>}
            </div>
          </div>
          <Tabs value={tab} className="mt-3">
            <TabsList>
              <TabsTrigger value="chart" render={<Link to="/trees/$treeId" params={{ treeId }} />}>
                Bagan
              </TabsTrigger>
              <TabsTrigger value="members" render={<Link to="/trees/$treeId/members" params={{ treeId }} />}>
                Anggota
              </TabsTrigger>
              <TabsTrigger
                value="relationships"
                render={<Link to="/trees/$treeId/relationships" params={{ treeId }} />}
              >
                Relasi
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="share" render={<Link to="/trees/$treeId/share" params={{ treeId }} />}>
                  Berbagi
                </TabsTrigger>
              )}
              {isOwner && (
                <TabsTrigger value="settings" render={<Link to="/trees/$treeId/settings" params={{ treeId }} />}>
                  Pengaturan
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
