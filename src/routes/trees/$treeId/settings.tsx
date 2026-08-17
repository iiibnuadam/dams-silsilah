import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { getTree, updateTree, deleteTree } from "@/server/trees";

export const Route = createFileRoute("/trees/$treeId/settings")({
  loader: async ({ params }) => getTree({ data: { treeId: params.treeId } }),
  component: SettingsPage,
});

function SettingsPage() {
  const detail = Route.useLoaderData();
  const router = useRouter();
  const [name, setName] = useState(detail.tree.name);
  const [description, setDescription] = useState(detail.tree.description ?? "");
  const [privacy, setPrivacy] = useState(detail.tree.privacy);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateTree({ data: { treeId: detail.tree.id, name, description: description || undefined, privacy } });
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await deleteTree({ data: { treeId: detail.tree.id } });
    await router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Silsilah</CardTitle>
          <CardDescription>Ubah nama, deskripsi, dan privasi silsilah ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Nama</FieldLabel>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Deskripsi</FieldLabel>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Privasi</FieldLabel>
                <Select value={privacy} onValueChange={(v) => setPrivacy(v as "private" | "public")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Privat</SelectItem>
                    <SelectItem value="public">Publik (dapat dilihat siapa saja)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Zona Berbahaya</CardTitle>
          <CardDescription>Menghapus silsilah akan menghapus seluruh anggota dan relasi di dalamnya.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>Hapus Silsilah</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus "{detail.tree.name}"?</AlertDialogTitle>
                <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
