import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionUser } from "@/server/auth";

export const Route = createFileRoute("/trees/$treeId")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  component: TreeLayout,
});

function TreeLayout() {
  return (
    <div className="h-screen">
      <Outlet />
    </div>
  );
}
