import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup, FieldError, FieldDescription } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRelationship } from "@/server/relationships";
import type { TreeDetail } from "@/lib/tree/detail";

const TYPE_LABELS = {
  biological_child: "Anak Kandung",
  adopted_child: "Anak Angkat",
  child_in_law: "Menantu",
  spouse: "Pasangan",
} as const;

export function RelationshipDialog({
  treeId,
  shareToken,
  members,
}: {
  treeId: string;
  shareToken?: string;
  members: TreeDetail["members"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<keyof typeof TYPE_LABELS>("biological_child");
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [status, setStatus] = useState<"married" | "divorced">("married");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSpouse = type === "spouse";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fromMemberId || !toMemberId) {
      setError("Pilih kedua individu.");
      return;
    }
    setLoading(true);
    try {
      await createRelationship({
        data: {
          treeId,
          shareToken,
          fromMemberId,
          toMemberId,
          type,
          status: isSpouse ? status : undefined,
        },
      });
      setOpen(false);
      setFromMemberId("");
      setToMemberId("");
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat relasi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <LinkIcon /> Tambah Relasi
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Relasi</DialogTitle>
          <DialogDescription>Tentukan hubungan antara dua individu di silsilah ini.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Tipe Relasi</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as keyof typeof TYPE_LABELS)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {isSpouse ? "Individu A menikah/bercerai dengan Individu B." : "Individu A adalah induk dari Individu B."}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>{isSpouse ? "Individu A" : "Induk"}</FieldLabel>
              <Select value={fromMemberId} onValueChange={(v) => setFromMemberId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string | null) => members.find((m) => m.id === v)?.person.fullName ?? "Pilih individu"}</SelectValue>
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
                  <SelectValue>{(v: string | null) => members.find((m) => m.id === v)?.person.fullName ?? "Pilih individu"}</SelectValue>
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
              {loading ? "Menyimpan..." : "Simpan Relasi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
