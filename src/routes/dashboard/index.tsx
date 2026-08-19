import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PlusIcon, TreesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { listTrees, createTree } from "@/server/trees";

export const Route = createFileRoute("/dashboard/")({
  loader: () => listTrees(),
  component: DashboardIndex,
});

function DashboardIndex() {
  const trees = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tree = await createTree({ data: { name, description: description || undefined } });
      setOpen(false);
      setName("");
      setDescription("");
      await router.navigate({ to: "/trees/$treeId", params: { treeId: tree!.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat silsilah.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-medium">Silsilah Saya</h1>
          <p className="text-muted-foreground text-sm">Kelola semua silsilah keluarga yang Anda miliki atau akses.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <PlusIcon /> Silsilah Baru
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Silsilah Baru</DialogTitle>
              <DialogDescription>Beri nama silsilah, misalnya "Bani Fulan".</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="tree-name">Nama Silsilah</FieldLabel>
                  <Input id="tree-name" required value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="tree-description">Deskripsi (opsional)</FieldLabel>
                  <Textarea id="tree-description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>
                {error && <FieldError>{error}</FieldError>}
              </FieldGroup>
              <DialogFooter className="mt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Membuat..." : "Buat Silsilah"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {trees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <TreesIcon className="text-accent size-10" />
            <p className="font-display text-lg">Belum ada silsilah</p>
            <p className="text-muted-foreground max-w-xs text-sm">
              Buat silsilah pertama Anda dan mulai dari Pendiri — sisanya tersusun otomatis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trees.map((tree) => (
            <Link key={tree.id} to="/trees/$treeId" params={{ treeId: tree.id }}>
              <Card className="border-border/70 hover:border-primary/50 hover:shadow-primary/5 h-full border-l-4 border-l-accent transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="font-display text-lg font-medium">{tree.name}</CardTitle>
                  {tree.description && <CardDescription>{tree.description}</CardDescription>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
