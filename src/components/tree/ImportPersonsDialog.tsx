import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { downloadCsv, parseCsv } from "@/lib/csv";
import type { ImportRow } from "@/lib/tree/import";
import { bulkImportPersons } from "@/server/import";

const TEMPLATE_HEADER = [
  "No",
  "Nama Lengkap",
  "Jenis Kelamin",
  "Tanggal Lahir",
  "Tanggal Wafat",
  "Pekerjaan",
  "No HP",
  "No Induk",
  "Tipe Anak",
  "No Pasangan",
];

const TEMPLATE_EXAMPLE_ROWS = [
  ["1", "Ahmad Yusuf", "Laki-laki", "1950-01-01", "", "Petani", "081234567890", "", "", "2"],
  ["2", "Siti Aminah", "Perempuan", "1952-03-15", "", "Ibu Rumah Tangga", "", "", "", "1"],
  ["3", "Budi Santoso", "Laki-laki", "1975-06-20", "", "Wiraswasta", "081298765432", "1", "Kandung", ""],
];

const GENDER_LABELS: Record<string, "male" | "female"> = { "Laki-laki": "male", Perempuan: "female" };
const CHILD_TYPE_LABELS: Record<string, ImportRow["childType"]> = {
  Kandung: "biological_child",
  Angkat: "adopted_child",
  Menantu: "child_in_law",
};

function parseImportFile(text: string): { rows: ImportRow[]; errors: string[] } {
  const table = parseCsv(text);
  const dataRows = table[0]?.[0]?.trim().toLowerCase() === "no" ? table.slice(1) : table;

  const rows: ImportRow[] = [];
  const errors: string[] = [];
  dataRows.forEach((cols, i) => {
    if (cols.every((c) => c.trim() === "")) return;
    const lineNo = i + 2;
    const [noStr, fullName, genderLabel, birthDate, deathDate, occupation, phone, parentNoStr, childTypeLabel, spouseNoStr] = cols;

    const no = Number(noStr);
    if (!noStr?.trim() || Number.isNaN(no)) {
      errors.push(`Baris ${lineNo}: kolom No harus angka.`);
      return;
    }
    if (!fullName?.trim()) {
      errors.push(`Baris ${lineNo}: Nama Lengkap wajib diisi.`);
      return;
    }
    const gender = GENDER_LABELS[genderLabel?.trim() ?? ""];
    if (!gender) {
      errors.push(`Baris ${lineNo}: Jenis Kelamin harus "Laki-laki" atau "Perempuan".`);
      return;
    }
    const childType = childTypeLabel?.trim() ? CHILD_TYPE_LABELS[childTypeLabel.trim()] : undefined;
    if (childTypeLabel?.trim() && !childType) {
      errors.push(`Baris ${lineNo}: Tipe Anak harus "Kandung", "Angkat", atau "Menantu".`);
      return;
    }

    rows.push({
      no,
      fullName: fullName.trim(),
      gender,
      birthDate: birthDate?.trim() || undefined,
      deathDate: deathDate?.trim() || undefined,
      occupation: occupation?.trim() || undefined,
      phone: phone?.trim() || undefined,
      parentNo: parentNoStr?.trim() ? Number(parentNoStr) : undefined,
      childType,
      spouseNo: spouseNoStr?.trim() ? Number(spouseNoStr) : undefined,
    });
  });

  return { rows, errors };
}

export function ImportPersonsDialog({ treeId, shareToken }: { treeId: string; shareToken?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setFileName(null);
    setRows([]);
    setParseErrors([]);
    setSubmitError(null);
  }

  async function handleFile(file: File | null) {
    setSubmitError(null);
    if (!file) {
      reset();
      return;
    }
    setFileName(file.name);
    const { rows: parsed, errors } = parseImportFile(await file.text());
    setRows(parsed);
    setParseErrors(errors);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setLoading(true);
    setSubmitError(null);
    try {
      await bulkImportPersons({ data: { treeId, shareToken, rows } });
      setOpen(false);
      reset();
      await router.invalidate();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengimpor data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : (setOpen(false), reset()))}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UploadIcon /> Import Data
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data Silsilah</DialogTitle>
          <DialogDescription>
            Tambah banyak individu sekaligus dari file CSV, alih-alih satu per satu.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(TEMPLATE_HEADER, TEMPLATE_EXAMPLE_ROWS, "template-import-silsilah.csv")}
            >
              <DownloadIcon /> Download Template
            </Button>
            <FieldDescription>
              Isi kolom No unik per baris. Kosongkan No Induk/No Pasangan jika tidak ada. Tipe Anak: Kandung, Angkat, atau Menantu.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="importFile">File CSV</FieldLabel>
            <Input
              id="importFile"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          {fileName && parseErrors.length === 0 && rows.length > 0 && (
            <FieldDescription>{fileName}: {rows.length} baris siap diimpor.</FieldDescription>
          )}
          {parseErrors.length > 0 && (
            <FieldError>
              {parseErrors.slice(0, 5).map((e) => (
                <div key={e}>{e}</div>
              ))}
              {parseErrors.length > 5 && <div>...dan {parseErrors.length - 5} error lainnya.</div>}
            </FieldError>
          )}
          {submitError && <FieldError>{submitError}</FieldError>}
        </FieldGroup>
        <DialogFooter className="mt-4">
          <Button type="button" disabled={loading || rows.length === 0 || parseErrors.length > 0} onClick={handleImport}>
            {loading ? "Mengimpor..." : `Import ${rows.length > 0 ? `(${rows.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
