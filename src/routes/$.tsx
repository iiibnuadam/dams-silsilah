import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFound } from "@/components/not-found";

/** Catch-all: without this, an unmatched path never reaches the app at all — it hits the
 * framework's own bare "Cannot GET /..." page below the router, before any React component
 * (including the root's notFoundComponent) ever gets a chance to render. */
export const Route = createFileRoute("/$")({
  beforeLoad: () => {
    throw notFound();
  },
  notFoundComponent: NotFound,
});
