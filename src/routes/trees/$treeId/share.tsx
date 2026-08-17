import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CopyIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldError } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getTree } from "@/server/trees";
import { createShareLink, listShareLinks, revokeShareLink } from "@/server/share";
import { inviteCollaborator, listCollaborators, removeCollaborator } from "@/server/collaborators";

type ShareLinkRow = Awaited<ReturnType<typeof listShareLinks>>[number];
type CollaboratorRow = Awaited<ReturnType<typeof listCollaborators>>[number];

export const Route = createFileRoute("/trees/$treeId/share")({
  loader: async ({ params }) => {
    const [detail, links, collaborators] = await Promise.all([
      getTree({ data: { treeId: params.treeId } }),
      listShareLinks({ data: { treeId: params.treeId } }),
      listCollaborators({ data: { treeId: params.treeId } }),
    ]);
    return { detail, links, collaborators };
  },
  component: SharePage,
});

function SharePage() {
  const { detail, links, collaborators } = Route.useLoaderData();
  const router = useRouter();
  const [accessLevel, setAccessLevel] = useState<"view" | "edit">("view");
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleCreateLink() {
    await createShareLink({ data: { treeId: detail.tree.id, accessLevel } });
    await router.invalidate();
  }

  async function handleRevoke(linkId: string) {
    await revokeShareLink({ data: { treeId: detail.tree.id, linkId } });
    await router.invalidate();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    try {
      await inviteCollaborator({ data: { treeId: detail.tree.id, email } });
      setEmail("");
      await router.invalidate();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Gagal mengundang.");
    }
  }

  async function handleRemoveCollaborator(userId: string) {
    await removeCollaborator({ data: { treeId: detail.tree.id, userId } });
    await router.invalidate();
  }

  function shareUrl(token: string) {
    return `${window.location.origin}/share/${token}`;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tautan Berbagi</CardTitle>
          <CardDescription>Buat tautan untuk berbagi bagan silsilah, dengan akses lihat atau edit.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as "view" | "edit")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Lihat saja</SelectItem>
                <SelectItem value="edit">Dapat mengedit</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreateLink}>Buat Tautan</Button>
          </div>

          <div className="flex flex-col gap-2">
            {links.length === 0 && <p className="text-muted-foreground text-sm">Belum ada tautan berbagi.</p>}
            {links.map((link: ShareLinkRow) => {
              const revoked = Boolean(link.revokedAt) || Boolean(link.expiresAt && link.expiresAt.getTime() < Date.now());
              return (
                <div key={link.id} className="flex items-center gap-2 rounded-md border p-2">
                  <Badge variant={link.accessLevel === "edit" ? "default" : "secondary"}>
                    {link.accessLevel === "edit" ? "Edit" : "Lihat"}
                  </Badge>
                  <code className="text-muted-foreground flex-1 truncate text-xs">{shareUrl(link.token)}</code>
                  {revoked && <Badge variant="secondary">Nonaktif</Badge>}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => navigator.clipboard.writeText(shareUrl(link.token))}
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                  {!revoked && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleRevoke(link.id)}>
                      <Trash2Icon className="text-destructive size-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kolaborator</CardTitle>
          <CardDescription>Undang pengguna terdaftar untuk mengedit silsilah ini bersama-sama.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleInvite}>
            <FieldGroup>
              <Field orientation="horizontal">
                <Input
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit">Undang</Button>
              </Field>
              {inviteError && <FieldError>{inviteError}</FieldError>}
            </FieldGroup>
          </form>
          <div className="flex flex-col gap-2">
            {collaborators.length === 0 && <p className="text-muted-foreground text-sm">Belum ada kolaborator.</p>}
            {collaborators.map((c: CollaboratorRow) => (
              <div key={c.userId} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">{c.displayName}</p>
                  <p className="text-muted-foreground text-xs">{c.email}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveCollaborator(c.userId)}>
                  <Trash2Icon className="text-destructive size-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
