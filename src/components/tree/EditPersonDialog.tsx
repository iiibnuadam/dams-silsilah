import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updatePerson } from "@/server/persons";
import { uploadPersonPhoto } from "@/server/storage";
import type { TreeDetail } from "@/lib/tree/detail";

type Member = TreeDetail["members"][number];

export function EditPersonDialog({
  treeId,
  shareToken,
  member,
  onOpenChange,
}: {
  treeId: string;
  shareToken?: string;
  member: Member | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [birthDate, setBirthDate] = useState("");
  const [isDeceased, setIsDeceased] = useState(false);
  const [deathDate, setDeathDate] = useState("");
  const [occupation, setOccupation] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!member) return;
    setFullName(member.person.fullName);
    setGender(member.person.gender);
    setBirthDate(member.person.birthDate ?? "");
    setIsDeceased(Boolean(member.person.deathDate));
    setDeathDate(member.person.deathDate ?? "");
    setOccupation(member.person.occupation ?? "");
    setPhone(member.person.phone ?? "");
    setNotes(member.person.notes ?? "");
    setPhotoFile(null);
    setError(null);
  }, [member]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setError(null);
    setLoading(true);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        const uploaded = await uploadPersonPhoto({ data: formData });
        photoUrl = uploaded.url;
      }
      await updatePerson({
        data: {
          personId: member.personId,
          treeId,
          shareToken,
          fullName,
          gender,
          photoUrl,
          birthDate: birthDate || undefined,
          deathDate: isDeceased ? deathDate || undefined : null,
          occupation: occupation || undefined,
          phone: phone || undefined,
          notes: notes || undefined,
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
    <Sheet open={member !== null} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" showOverlay={false} className="flex flex-col gap-0 shadow-xl sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Individu</SheetTitle>
          <SheetDescription>Perubahan biodata berlaku untuk individu ini di semua silsilah.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-fullName">Nama Lengkap</FieldLabel>
                <Input id="edit-fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Jenis Kelamin</FieldLabel>
                <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Laki-laki</SelectItem>
                    <SelectItem value="female">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-birthDate">Tanggal Lahir</FieldLabel>
                <Input id="edit-birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="edit-isDeceased" className="flex-1 font-normal">
                  Sudah meninggal dunia
                </FieldLabel>
                <Switch id="edit-isDeceased" checked={isDeceased} onCheckedChange={setIsDeceased} />
              </Field>
              {isDeceased && (
                <Field>
                  <FieldLabel htmlFor="edit-deathDate">Tanggal Wafat</FieldLabel>
                  <Input id="edit-deathDate" type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
                </Field>
              )}
              <Field orientation="responsive">
                <div className="w-full">
                  <FieldLabel htmlFor="edit-occupation">Pekerjaan</FieldLabel>
                  <Input id="edit-occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                </div>
                <div className="w-full">
                  <FieldLabel htmlFor="edit-phone">Nomor HP</FieldLabel>
                  <Input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-photo">Ganti Foto</FieldLabel>
                <Input id="edit-photo" type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-notes">Catatan</FieldLabel>
                <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
          </div>
          <SheetFooter className="border-t">
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
