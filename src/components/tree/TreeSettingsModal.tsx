import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { CopyIcon, PlusIcon, SettingsIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup, FieldError, FieldDescription } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateTree, deleteTree } from "@/server/trees";
import { createShareLink, listShareLinks, revokeShareLink, updateShareLink } from "@/server/share";
import { inviteCollaborator, listCollaborators, removeCollaborator } from "@/server/collaborators";
import { uploadPersonPhoto } from "@/server/storage";
import type { TreeDetail } from "@/lib/tree/detail";

type ShareLinkRow = Awaited<ReturnType<typeof listShareLinks>>[number];
type CollaboratorRow = Awaited<ReturnType<typeof listCollaborators>>[number];

function isActive(link: ShareLinkRow) {
  return !link.revokedAt && (!link.expiresAt || link.expiresAt.getTime() > Date.now());
}

export function TreeSettingsModal({
  tree,
  open,
  onOpenChange,
}: {
  tree: TreeDetail["tree"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(tree.name);
  const [description, setDescription] = useState(tree.description ?? "");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(tree.coverPhotoUrl);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [links, setLinks] = useState<ShareLinkRow[] | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[] | null>(null);
  const [slugDraft, setSlugDraft] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const activeLink = links?.find(isActive) ?? null;

  useEffect(() => {
    if (!open) return;
    setName(tree.name);
    setDescription(tree.description ?? "");
    setCoverPhotoUrl(tree.coverPhotoUrl);
    setError(null);
    Promise.all([listShareLinks({ data: { treeId: tree.id } }), listCollaborators({ data: { treeId: tree.id } })]).then(
      ([linkRows, collaboratorRows]) => {
        setLinks(linkRows);
        setCollaborators(collaboratorRows);
        setSlugDraft(linkRows.find(isActive)?.slug ?? "");
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tree.id]);

  async function refreshLinks() {
    const rows = await listShareLinks({ data: { treeId: tree.id } });
    setLinks(rows);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateTree({
        data: { treeId: tree.id, name, description: description || undefined, coverPhotoUrl: coverPhotoUrl || undefined },
      });
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCoverPhoto(file: File) {
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await uploadPersonPhoto({ data: formData });
      setCoverPhotoUrl(uploaded.url);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleTogglePublicAccess(enabled: boolean) {
    if (enabled) {
      await createShareLink({ data: { treeId: tree.id, accessLevel: "view" } });
    } else if (activeLink) {
      await revokeShareLink({ data: { treeId: tree.id, linkId: activeLink.id } });
    }
    await refreshLinks();
  }

  async function handleAccessLevelChange(accessLevel: "view" | "edit") {
    if (!activeLink) return;
    await updateShareLink({ data: { treeId: tree.id, linkId: activeLink.id, accessLevel } });
    await refreshLinks();
  }

  async function handleSlugBlur() {
    if (!activeLink || slugDraft === (activeLink.slug ?? "")) return;
    setSlugError(null);
    try {
      await updateShareLink({ data: { treeId: tree.id, linkId: activeLink.id, slug: slugDraft.toLowerCase() } });
      await refreshLinks();
    } catch (err) {
      setSlugError(err instanceof Error ? err.message : "Gagal menyimpan URL.");
    }
  }

  function shareUrl() {
    if (!activeLink) return "";
    const origin = window.location.origin;
    return activeLink.slug ? `${origin}/t/${activeLink.slug}` : `${origin}/share/${activeLink.token}`;
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    try {
      await inviteCollaborator({ data: { treeId: tree.id, email } });
      setEmail("");
      setCollaborators(await listCollaborators({ data: { treeId: tree.id } }));
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Gagal mengundang.");
    }
  }

  async function handleRemoveCollaborator(userId: string) {
    await removeCollaborator({ data: { treeId: tree.id, userId } });
    setCollaborators(await listCollaborators({ data: { treeId: tree.id } }));
  }

  async function handleDelete() {
    await deleteTree({ data: { treeId: tree.id } });
    await router.navigate({ to: "/dashboard" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="text-primary size-4" /> Pengaturan & Berbagi
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <label className="border-border bg-muted/40 hover:border-primary/50 relative flex size-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed">
              {coverPhotoUrl ? (
                <img src={coverPhotoUrl} alt="" className="size-full object-cover" />
              ) : (
                <SettingsIcon className="text-muted-foreground size-6 opacity-40" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingCover}
                onChange={(e) => e.target.files?.[0] && handleCoverPhoto(e.target.files[0])}
              />
              <span className="bg-primary text-primary-foreground absolute right-1 bottom-1 flex size-6 items-center justify-center rounded-full shadow">
                <PlusIcon className="size-3.5" />
              </span>
            </label>
            <p className="text-muted-foreground text-center text-[10px] font-semibold tracking-wide uppercase">
              Foto Utama Proyek
            </p>
            <p className="text-muted-foreground -mt-1 text-center text-xs italic">
              Muncul saat link dibagikan (WhatsApp, dll)
            </p>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="tree-name">Nama Pohon</FieldLabel>
              <Input id="tree-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="tree-description">Deskripsi / Catatan</FieldLabel>
              <Textarea
                id="tree-description"
                placeholder="Catatan singkat tentang keluarga ini..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </FieldGroup>

          <Separator />

          <Field orientation="horizontal">
            <div className="flex-1">
              <FieldLabel>Akses Publik</FieldLabel>
              <FieldDescription>Izinkan siapa saja dengan tautan untuk mengakses pohon.</FieldDescription>
            </div>
            <Switch checked={Boolean(activeLink)} onCheckedChange={handleTogglePublicAccess} disabled={links === null} />
          </Field>

          {activeLink && (
            <>
              <Field>
                <FieldLabel>Hak Akses Publik</FieldLabel>
                <div className="border-border grid grid-cols-2 overflow-hidden rounded-md border text-sm">
                  <button
                    type="button"
                    onClick={() => handleAccessLevelChange("view")}
                    className={
                      "px-3 py-2 font-medium transition-colors " +
                      (activeLink.accessLevel === "view" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    Hanya Lihat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccessLevelChange("edit")}
                    className={
                      "border-border border-l px-3 py-2 font-medium transition-colors " +
                      (activeLink.accessLevel === "edit" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    Bisa Mengedit
                  </button>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="slug">Custom URL (slug)</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">/t/</span>
                  <Input
                    id="slug"
                    value={slugDraft}
                    onChange={(e) => setSlugDraft(e.target.value.toLowerCase())}
                    onBlur={handleSlugBlur}
                    placeholder="keluarga"
                  />
                </div>
                <FieldDescription>Gunakan huruf, angka, dan tanda hubung saja.</FieldDescription>
                {slugError && <FieldError>{slugError}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>Tautan Bagikan</FieldLabel>
                <div className="flex items-center gap-1">
                  <Input readOnly value={shareUrl()} className="text-muted-foreground text-xs" />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(shareUrl())}
                    aria-label="Salin tautan"
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                </div>
                <FieldDescription>Siapapun yang memiliki tautan ini dapat melihat pohon ini.</FieldDescription>
              </Field>
            </>
          )}

          <Separator />

          <Field>
            <FieldLabel>Kolaborator</FieldLabel>
            <FieldDescription>Undang pengguna terdaftar untuk mengedit silsilah ini bersama-sama.</FieldDescription>
            <form onSubmit={handleInvite} className="mt-1 flex gap-2">
              <Input
                type="email"
                placeholder="email@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" variant="outline">
                Undang
              </Button>
            </form>
            {inviteError && <FieldError>{inviteError}</FieldError>}
            <div className="mt-2 flex flex-col gap-1.5">
              {collaborators?.map((c) => (
                <div key={c.userId} className="bg-muted/40 flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                  <div>
                    <p className="font-medium">{c.displayName}</p>
                    <p className="text-muted-foreground text-xs">{c.email}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveCollaborator(c.userId)}>
                    <Trash2Icon className="text-destructive size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Field>

          <Separator />

          <Field>
            <FieldLabel className="text-destructive">Zona Berbahaya</FieldLabel>
            <FieldDescription>Menghapus silsilah akan menghapus seluruh anggota dan relasi di dalamnya.</FieldDescription>
            <AlertDialog>
              <AlertDialogTrigger render={<Button type="button" variant="destructive" className="mt-1" />}>
                Hapus Silsilah
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus "{tree.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
