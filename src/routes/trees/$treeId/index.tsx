import { createFileRoute } from "@tanstack/react-router";
import { getTree } from "@/server/trees";
import { TreeChart } from "@/components/tree/TreeChart";

export const Route = createFileRoute("/trees/$treeId/")({
  loader: async ({ params }) => getTree({ data: { treeId: params.treeId } }),
  component: TreeChartPage,
});

function TreeChartPage() {
  const detail = Route.useLoaderData();
  const { user } = Route.useRouteContext();

  return <TreeChart detail={detail} isOwner={detail.tree.ownerId === user.id} fullHeight />;
}
