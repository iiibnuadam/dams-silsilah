import { createFileRoute } from "@tanstack/react-router";
import { TreeChart } from "@/components/tree/TreeChart";
import { getTreeBySlug } from "@/server/share";

export const Route = createFileRoute("/t/$slug")({
  loader: async ({ params }) => getTreeBySlug({ data: { slug: params.slug } }),
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.tree.name} — Silsilah Keluarga` },
            { property: "og:title", content: loaderData.tree.name },
            { property: "og:description", content: loaderData.tree.description ?? "Bagan silsilah keluarga" },
            ...(loaderData.tree.coverPhotoUrl ? [{ property: "og:image", content: loaderData.tree.coverPhotoUrl }] : []),
          ],
        }
      : {},
  component: SharedTreeBySlugPage,
});

function SharedTreeBySlugPage() {
  const detail = Route.useLoaderData();

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="font-display text-2xl font-medium">{detail.tree.name}</h1>
        {detail.tree.description && <p className="text-muted-foreground text-sm">{detail.tree.description}</p>}
      </div>
      <TreeChart key={detail.tree.id} detail={detail} shareToken={detail.shareToken} />
    </div>
  );
}
