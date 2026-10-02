import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { Check, Copy, Loader2, Search, X } from "lucide-react";

import {
  createCard,
  getBrands,
  getCardMemberCandidates,
  getDuplicateDraft,
  getLabels,
} from "../api/card.api";
import type { Card, DuplicateDraft, User } from "../types";
import { toast } from "@/lib/feedback";

interface Props {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (card: Card) => void | Promise<void>;
}

type TaxonomyOption = {
  id: string;
  name: string;
  color?: string | null;
};

interface TaxonomyMultiSelectProps {
  title: string;
  options: TaxonomyOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  fallbackColor: string;
}

function TaxonomyMultiSelect({
  title,
  options,
  selectedIds,
  onChange,
  fallbackColor,
}: TaxonomyMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selected = useMemo(
    () => options.filter((option) => selectedSet.has(option.id)),
    [options, selectedSet],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return options
      .filter((option) => !needle || option.name.toLocaleLowerCase().includes(needle))
      .sort((a, b) => Number(selectedSet.has(b.id)) - Number(selectedSet.has(a.id)) || a.name.localeCompare(b.name));
  }, [options, query, selectedSet]);

  const toggle = (id: string) => {
    onChange(selectedSet.has(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id]);
    // The selection is saved in the duplicate draft immediately. Close the
    // panel after each change to keep the modal compact.
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Terpilih otomatis dari card sumber
            {options.length ? ` • ${options.length} tersedia` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-500/10"
        >
          {open ? "Tutup" : "Ubah pilihan"}
        </button>
      </div>

      <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
        {selected.length ? selected.map((option) => (
          <span key={option.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-2 pr-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.color ?? fallbackColor }} />
            <span className="max-w-36 truncate">{option.name}</span>
            <button type="button" onClick={() => toggle(option.id)} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label={`Hapus ${title.toLowerCase()} ${option.name}`}>
              <X size={12} />
            </button>
          </span>
        )) : <span className="text-sm text-slate-400">Tidak ada {title.toLowerCase()} yang dipilih</span>}
      </div>

      {open ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/60">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Cari ${title.toLowerCase()}...`}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
            {filtered.length ? filtered.map((option) => {
              const checked = selectedSet.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${checked ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200" : "hover:bg-white dark:hover:bg-slate-800"}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color ?? fallbackColor }} />
                    <span className="truncate">{option.name}</span>
                  </span>
                  {checked ? <Check size={15} /> : null}
                </button>
              );
            }) : <p className="px-3 py-3 text-sm text-slate-400">Tidak ditemukan.</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const formatApiDate = (value: string): string | undefined => {
  if (!value) return undefined;
  return value.length === 16 ? `${value.replace("T", " ")}:00` : value.replace("T", " ");
};

const mergeTaxonomyOptions = (
  catalog: TaxonomyOption[],
  selected: TaxonomyOption[],
): TaxonomyOption[] => {
  const byId = new Map(catalog.map((option) => [option.id, option]));
  selected.forEach((option) => {
    if (!byId.has(option.id)) byId.set(option.id, option);
  });
  return Array.from(byId.values());
};

export default function DuplicateCardModal({ card, isOpen, onClose, onCreated }: Props) {
  const [draft, setDraft] = useState<DuplicateDraft | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [labelOptions, setLabelOptions] = useState<TaxonomyOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<TaxonomyOption[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);
    setError(null);
    setCatalogNotice(null);
    setAssignees([]);
    setDueDate("");
    setMemberSearch("");

    getDuplicateDraft(card.id)
      .then(async (nextDraft) => {
        const [candidatesResult, labelsResult, brandsResult] = await Promise.allSettled([
          getCardMemberCandidates(card.id),
          getLabels(),
          // Brand is a shared catalog in the card UI; use the global catalog
          // as fallback when an older backend has no available_brands field.
          getBrands(),
        ]);
        if (!active) return;

        setDraft(nextDraft);
        setTitle(nextDraft.title);
        setDescription(nextDraft.description ?? "");
        setSelectedLabelIds(nextDraft.labels.map((label) => label.id));
        setSelectedBrandIds(nextDraft.brands.map((brand) => brand.id));
        setUsers(candidatesResult.status === "fulfilled" ? candidatesResult.value : []);
        const labelCatalog = labelsResult.status === "fulfilled" ? labelsResult.value : [];
        const brandCatalog = brandsResult.status === "fulfilled" ? brandsResult.value : [];
        setLabelOptions(mergeTaxonomyOptions(nextDraft.available_labels ?? labelCatalog, nextDraft.labels));
        setBrandOptions(mergeTaxonomyOptions(nextDraft.available_brands ?? brandCatalog, nextDraft.brands));
        if (labelsResult.status === "rejected" || brandsResult.status === "rejected") {
          setCatalogNotice("Sebagian katalog tidak dapat dimuat. Pilihan dari card sumber tetap digunakan.");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof AxiosError
          ? (typeof err.response?.data?.message === "string" ? err.response.data.message : "Draft duplicate gagal dimuat.")
          : "Draft duplicate gagal dimuat.";
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [card.id, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, saving]);

  const visibleUsers = useMemo(() => {
    const needle = memberSearch.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle),
    );
  }, [memberSearch, users]);

  const toggleAssignee = (userId: string) => {
    setAssignees((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]);
  };

  const handleSave = async () => {
    if (!draft || !title.trim()) {
      setError("Judul card wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const created = await createCard(draft.board_id, {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: formatApiDate(dueDate),
        assignees: assignees.length ? assignees : undefined,
        duplicate_from_card_id: draft.source_card_id,
        label_ids: selectedLabelIds,
        brand_ids: selectedBrandIds,
      });
      toast.success("Card berhasil dibuat dari template.");
      await onCreated?.(created);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof AxiosError
        ? (typeof err.response?.data?.message === "string" ? err.response.data.message : "Duplicate card gagal disimpan.")
        : "Duplicate card gagal disimpan.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={() => { if (!saving) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-card-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Copy size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Template card</span>
            </div>
            <h2 id="duplicate-card-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              Duplicate Card
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Label, brand, dan checklist akan ikut disalin. Assignee dan due date sengaja dikosongkan.
            </p>
            <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
              Pilihan label dan brand tersimpan otomatis di draft. Klik “Simpan Card” untuk membuat card baru.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Tutup duplicate card">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} /> Memuat template...
            </div>
          ) : error && !draft ? (
            <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>
          ) : draft ? (
            <div className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Judul</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Deskripsi</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>

              <div>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Due date (opsional)</span>
                <input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>

              <div className="space-y-3">
                <TaxonomyMultiSelect
                  title="Label"
                  options={labelOptions}
                  selectedIds={selectedLabelIds}
                  onChange={setSelectedLabelIds}
                  fallbackColor="#3b82f6"
                />
                <TaxonomyMultiSelect
                  title="Brand"
                  options={brandOptions}
                  selectedIds={selectedBrandIds}
                  onChange={setSelectedBrandIds}
                  fallbackColor="#64748b"
                />
              </div>
              {catalogNotice ? <p className="text-xs text-amber-600 dark:text-amber-300">{catalogNotice}</p> : null}

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Assignee/member (opsional)</span>
                  {assignees.length ? <span className="text-xs text-blue-600 dark:text-blue-400">{assignees.length} dipilih</span> : null}
                </div>
                <div className="relative mb-2">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Cari member..." className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                  {visibleUsers.length ? visibleUsers.map((user) => {
                    const selected = assignees.includes(user.id);
                    return (
                      <button key={user.id} type="button" onClick={() => toggleAssignee(user.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selected ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                        <span><span className="font-medium text-slate-800 dark:text-slate-100">{user.name}</span><span className="ml-2 text-xs text-slate-400">{user.email}</span></span>
                        {selected ? <Check size={16} /> : null}
                      </button>
                    );
                  }) : <p className="px-3 py-3 text-sm text-slate-400">Member tidak ditemukan.</p>}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                Checklist yang akan disalin: <strong>{draft.tasks.length} task</strong> dan seluruh subtask-nya. Status checklist akan dimulai dari belum selesai.
              </div>
              {error ? <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
          <button type="button" onClick={() => void handleSave()} disabled={loading || saving || !draft} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
            {saving ? "Menyimpan..." : "Simpan Card"}
          </button>
        </div>
      </div>
    </div>
  );
}
