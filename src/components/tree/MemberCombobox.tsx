import { useMemo, useState } from "react";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import type { TreeDetail } from "@/lib/tree/detail";

type Member = TreeDetail["members"][number];

/** Searchable member picker — same Combobox pattern as AddPersonDialog's "Cari yang Sudah Ada": filter={null} with the filtering done here (client-side over already-loaded members) instead of letting Base UI's own filtering run against a mismatched full item list, which causes update loops. */
export function MemberCombobox({
  members,
  value,
  onValueChange,
  placeholder = "Cari nama...",
}: {
  members: Member[];
  value: string;
  onValueChange: (memberId: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = members.find((m) => m.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.person.fullName.toLowerCase().includes(q));
  }, [members, query]);

  return (
    <Combobox
      items={filtered}
      filter={null}
      value={selected}
      onValueChange={(v) => onValueChange((v as Member | null)?.id ?? "")}
      onInputValueChange={setQuery}
      itemToStringLabel={(item) => (item as Member)?.person.fullName ?? ""}
      isItemEqualToValue={(item, value) => (item as Member | null)?.id === (value as Member | null)?.id}
    >
      <ComboboxInput placeholder={placeholder} className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>Tidak ditemukan</ComboboxEmpty>
        <ComboboxList>
          {filtered.map((m) => (
            <ComboboxItem key={m.id} value={m}>
              {m.person.fullName}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
