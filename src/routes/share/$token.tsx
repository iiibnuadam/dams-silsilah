import { createFileRoute } from "@tanstack/react-router";
import { TreeChart } from "@/components/tree/TreeChart";
import { getTreeByShareToken } from "@/server/share";

export const Route = createFileRoute("/share/$token")({
  loader: async ({ params }) => getTreeByShareToken({ data: { token: params.token } }),
  component: SharedTreePage,
});

function SharedTreePage() {
  const detail = Route.useLoaderData();

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="font-display text-2xl font-medium">{detail.tree.name}</h1>
        {detail.tree.description && <p className="text-muted-foreground text-sm">{detail.tree.description}</p>}
      </div>
      <TreeChart detail={detail} shareToken={detail.shareToken} />
    </div>
  );
}
