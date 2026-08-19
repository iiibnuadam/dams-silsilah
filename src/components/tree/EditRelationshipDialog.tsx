import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberCombobox } from "@/components/tree/MemberCombobox";
import { deleteRelationship, updateRelationship } from "@/server/relationships";
import type { TreeDetail } from "@/lib/tree/detail";

type Relationship = TreeDetail["relationships"][number];
type Member = TreeDetail["members"][number];

const TYPE_LABELS = {
  biological_child: "Anak Kandung",
  adopted_child: "Anak Angkat",
  child_in_law: "Menantu",
  spouse: "Pasangan",
} as const;

export function EditRelationshipDialog({
  treeId,
  shareToken,
  members,
  relationship,
  onOpenChange,
}: {
  treeId: string;
  shareToken?: string;
  members: Member[];
  relationship: Relationship | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<keyof typeof TYPE_LABELS>("biological_child");
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [status, setStatus] = useState<"married" | "divorced">("married");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!relationship) return;
    setType(relationship.type);
    setFromMemberId(relationship.fromMemberId);
    setToMemberId(relationship.toMemberId);
    setStatus(relationship.status ?? "married");
    setError(null);
  }, [relationship]);

  const isSpouse = type === "spouse";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!relationship) return;
    setError(null);
    if (!fromMemberId || !toMemberId) {
      setError("Pilih kedua individu.");
      return;
    }
    setLoading(true);
    try {
      await updateRelationship({
        data: {
          treeId,
          shareToken,
          relationshipId: relationship.id,
          fromMemberId,
          toMemberId,
          type,
          status: isSpouse ? status : undefined,
        },
      });
      onOpenChange(false);
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!relationship) return;
    setLoading(true);
    try {
      await deleteRelationship({ data: { treeId, shareToken, relationshipId: relationship.id } });
      onOpenChange(false);
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus relasi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={relationship !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Relasi</DialogTitle>
          <DialogDescription>Perbaiki tipe relasi atau individu yang terlibat jika ada kesalahan input.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Tipe Relasi</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as keyof typeof TYPE_LABELS)}>
                <SelectTrigger>
                  <SelectValue>{() => TYPE_LABELS[type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{isSpouse ? "Individu A" : "Induk"}</FieldLabel>
              <MemberCombobox members={members} value={fromMemberId} onValueChange={setFromMemberId} />
            </Field>
            <Field>
              <FieldLabel>{isSpouse ? "Individu B" : "Anak"}</FieldLabel>
              <MemberCombobox members={members} value={toMemberId} onValueChange={setToMemberId} />
            </Field>
            {isSpouse && (
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select value={status} onValueChange={(v) => setStatus(v as "married" | "divorced")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="married">Menikah</SelectItem>
                    <SelectItem value="divorced">Cerai</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-4 sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger render={<Button type="button" variant="destructive" disabled={loading} />}>
                Hapus Relasi
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus relasi ini?</AlertDialogTitle>
                  <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
