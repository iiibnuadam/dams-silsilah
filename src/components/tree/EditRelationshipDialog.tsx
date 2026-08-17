import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateRelationship } from "@/server/relationships";
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

  function memberName(memberId: string) {
    return members.find((m) => m.id === memberId)?.person.fullName ?? "Pilih individu";
  }

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
              <Select value={fromMemberId} onValueChange={(v) => setFromMemberId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string | null) => memberName(v ?? "")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.person.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{isSpouse ? "Individu B" : "Anak"}</FieldLabel>
              <Select value={toMemberId} onValueChange={(v) => setToMemberId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string | null) => memberName(v ?? "")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.person.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
