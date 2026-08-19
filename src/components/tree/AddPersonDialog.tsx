import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup, FieldError, FieldSeparator } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { searchPersons } from "@/server/persons";
import { addTreeMember } from "@/server/trees";
import { uploadPersonPhoto } from "@/server/storage";

type PersonSearchResult = Awaited<ReturnType<typeof searchPersons>>[number];

export function AddPersonDialog({ treeId, shareToken }: { treeId: string; shareToken?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [selectedExisting, setSelectedExisting] = useState<PersonSearchResult | null>(null);

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
    if (mode !== "existing" || query.trim().length === 0) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await searchPersons({ data: { query } });
      if (!cancelled) setResults(found);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, mode]);

  function resetForm() {
    setMode("new");
    setQuery("");
    setResults([]);
    setSelectedExisting(null);
    setFullName("");
    setGender("male");
    setBirthDate("");
    setIsDeceased(false);
    setDeathDate("");
    setOccupation("");
    setPhone("");
    setNotes("");
    setPhotoFile(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "existing") {
        if (!selectedExisting) {
          setError("Pilih individu yang ingin dihubungkan.");
          return;
        }
        await addTreeMember({ data: { treeId, shareToken, person: { personId: selectedExisting.id } } });
      } else {
        let photoUrl: string | undefined;
        if (photoFile) {
          const formData = new FormData();
          formData.append("file", photoFile);
          const uploaded = await uploadPersonPhoto({ data: formData });
          photoUrl = uploaded.url;
        }
        await addTreeMember({
          data: {
            treeId,
            shareToken,
            person: {
              fullName,
              gender,
              photoUrl,
              birthDate: birthDate || undefined,
              deceased: isDeceased,
              deathDate: isDeceased ? deathDate || undefined : undefined,
              occupation: occupation || undefined,
              phone: phone || undefined,
              notes: notes || undefined,
            },
          },
        });
      }
      setOpen(false);
      resetForm();
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah anggota.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : (setOpen(false), resetForm()))}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon /> Tambah Individu
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Individu</DialogTitle>
          <DialogDescription>Hubungkan individu yang sudah ada, atau buat data baru.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field orientation="horizontal">
              <Button type="button" variant={mode === "new" ? "default" : "outline"} size="sm" onClick={() => setMode("new")}>
                Individu Baru
              </Button>
              <Button type="button" variant={mode === "existing" ? "default" : "outline"} size="sm" onClick={() => setMode("existing")}>
                Cari yang Sudah Ada
              </Button>
            </Field>
            <FieldSeparator />

            {mode === "existing" ? (
              <Field>
                <FieldLabel>Cari Individu</FieldLabel>
                <Combobox
                  items={results}
                  filter={null}
                  value={selectedExisting}
                  onValueChange={(value) => setSelectedExisting(value as PersonSearchResult | null)}
                  onInputValueChange={setQuery}
                  itemToStringLabel={(item) => (item as PersonSearchResult)?.fullName ?? ""}
                  isItemEqualToValue={(item, value) =>
                    (item as PersonSearchResult | null)?.id === (value as PersonSearchResult | null)?.id
                  }
                >
                  <ComboboxInput placeholder="Ketik nama..." />
                  <ComboboxContent>
                    <ComboboxEmpty>Tidak ditemukan</ComboboxEmpty>
                    <ComboboxList>
                      {results.map((person) => (
                        <ComboboxItem key={person.id} value={person}>
                          {person.fullName}
                          {person.birthDate ? ` (${person.birthDate})` : ""}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="fullName">Nama Lengkap</FieldLabel>
                  <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
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
                  <FieldLabel htmlFor="birthDate">Tanggal Lahir</FieldLabel>
                  <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </Field>
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="isDeceased" className="flex-1 font-normal">
                    Sudah meninggal dunia
                  </FieldLabel>
                  <Switch id="isDeceased" checked={isDeceased} onCheckedChange={setIsDeceased} />
                </Field>
                {isDeceased && (
                  <Field>
                    <FieldLabel htmlFor="deathDate">Tanggal Wafat</FieldLabel>
                    <Input id="deathDate" type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
                  </Field>
                )}
                <Field orientation="responsive">
                  <div className="w-full">
                    <FieldLabel htmlFor="occupation">Pekerjaan</FieldLabel>
                    <Input id="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                  </div>
                  <div className="w-full">
                    <FieldLabel htmlFor="phone">Nomor HP</FieldLabel>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="photo">Foto</FieldLabel>
                  <Input id="photo" type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="notes">Catatan</FieldLabel>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </>
            )}
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Menambahkan..." : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
