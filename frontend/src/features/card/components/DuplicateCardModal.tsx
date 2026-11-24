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
import { useLanguage } from "@/context/LanguageContext";
import RichTextEditor from "./RichTextEditor";

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
  const { t } = useLanguage();
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
    <div className="rounded-card border border-line p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-2xs font-medium text-fg-subtle">{title}</span>
          <p className="mt-0.5 text-2xs text-fg-subtle">
            {t("Terpilih otomatis dari card sumber", "Selected automatically from the source card")}
            {options.length
              ? ` · ${t("{count} tersedia", "{count} available", {
                  count: options.length,
                })}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="h-7 rounded-[7px] border border-line bg-surface px-2 text-2xs font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          {open ? t("Tutup", "Close") : t("Ubah", "Edit")}
        </button>
      </div>

      <div className="mt-2 flex min-h-7 flex-wrap gap-1.5">
        {selected.length ? selected.map((option) => (
          <span key={option.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-2 pr-1 text-2xs font-medium text-fg-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: option.color ?? fallbackColor }} />
            <span className="max-w-36 truncate">{option.name}</span>
            <button type="button" onClick={() => toggle(option.id)} className="flex h-5 w-5 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger" aria-label={t("Hapus {title} {name}", "Remove {title} {name}", { title: title.toLowerCase(), name: option.name })}>
              <X size={11} />
            </button>
          </span>
        )) : <span className="text-xs text-fg-subtle">{t("Belum ada {title} yang dipilih", "No {title} selected yet", { title: title.toLowerCase() })}</span>}
      </div>

      {open ? (
        <div className="mt-2.5 rounded-control border border-line bg-surface-muted/40 p-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Cari {title}", "Search {title}", { title: title.toLowerCase() })}
              aria-label={t("Cari {title}", "Search {title}", { title })}
              className="h-8 w-full rounded-[7px] border border-line bg-surface pl-8 pr-2.5 text-xs text-fg outline-none placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <div className="mt-1.5 max-h-36 space-y-0.5 overflow-y-auto">
            {filtered.length ? filtered.map((option) => {
              const checked = selectedSet.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  className={`flex w-full items-center justify-between rounded-[7px] px-2.5 py-1.5 text-left text-xs transition-colors ${checked ? "bg-accent-soft text-accent-strong" : "text-fg-muted hover:bg-surface-muted"}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.color ?? fallbackColor }} />
                    <span className="truncate">{option.name}</span>
                  </span>
                  {checked ? <Check size={13} /> : null}
                </button>
              );
            }) : <p className="px-2.5 py-3 text-xs text-fg-subtle">{t("Tidak ditemukan.", "No results found.")}</p>}
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
  const { t } = useLanguage();
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
          setCatalogNotice(
            t(
              "Sebagian katalog tidak dapat dimuat. Pilihan dari card sumber tetap digunakan.",
              "Some of the catalog could not be loaded. Selections from the source card are still used.",
            ),
          );
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof AxiosError
          ? (typeof err.response?.data?.message === "string" ? err.response.data.message : t("Draft duplicate gagal dimuat.", "Failed to load duplicate draft."))
          : t("Draft duplicate gagal dimuat.", "Failed to load duplicate draft.");
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
      setError(t("Judul card wajib diisi.", "Card title is required."));
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
      toast.success(t("Card berhasil dibuat dari template.", "Card created from template."));
      await onCreated?.(created);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof AxiosError
        ? (typeof err.response?.data?.message === "string" ? err.response.data.message : t("Duplicate card gagal disimpan.", "Failed to save duplicate card."))
        : t("Duplicate card gagal disimpan.", "Failed to save duplicate card.");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-overlay p-4"
      onClick={() => { if (!saving) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-card-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-modal border border-line bg-surface shadow-e3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <div className="flex items-center gap-1.5 text-accent">
              <Copy size={15} aria-hidden="true" />
              <span className="text-[11px] font-medium">{t("Template card", "Card template")}</span>
            </div>
            <h2 id="duplicate-card-title" className="mt-1 text-xl font-semibold tracking-[-0.02em] text-fg">
              {t("Duplikasi card", "Duplicate card")}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {t(
                "Label, brand, dan checklist akan ikut disalin. Assignee dan due date sengaja dikosongkan.",
                "Labels, brands, and checklists will be copied. Assignees and due date are intentionally left empty.",
              )}
            </p>
            <p className="mt-2 text-xs text-accent">
              {t(
                "Pilihan label dan brand tersimpan otomatis di draft. Klik “Simpan card” untuk membuat card baru.",
                "Label and brand selections are saved automatically in the draft. Click “Save card” to create the new card.",
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-control p-2 text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50" aria-label={t("Tutup duplikasi card", "Close duplicate card")}>
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-xs text-fg-muted" role="status">
              <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> {t("Memuat template…", "Loading template…")}
            </div>
          ) : error && !draft ? (
            <p role="alert" className="rounded-control bg-danger-soft p-3 text-xs text-danger">{error}</p>
          ) : draft ? (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-fg-muted">{t("Judul", "Title")}</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-fg-muted">{t("Deskripsi", "Description")}</span>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder={t("Tulis deskripsi card", "Write a card description")}
                  ariaLabel={t("Deskripsi card duplicate", "Duplicate card description")}
                  className="border-line bg-surface"
                />
              </label>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-fg-muted">{t("Deadline (opsional)", "Deadline (optional)")}</span>
                <input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-10 rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
              </div>

              <div className="space-y-3">
                <TaxonomyMultiSelect
                  title={t("Label")}
                  options={labelOptions}
                  selectedIds={selectedLabelIds}
                  onChange={setSelectedLabelIds}
                  fallbackColor="#3b82f6"
                />
                <TaxonomyMultiSelect
                  title={t("Brand")}
                  options={brandOptions}
                  selectedIds={selectedBrandIds}
                  onChange={setSelectedBrandIds}
                  fallbackColor="#64748b"
                />
              </div>
              {catalogNotice ? <p className="text-2xs text-warning">{catalogNotice}</p> : null}

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-fg-muted">{t("Anggota (opsional)", "Members (optional)")}</span>
                  {assignees.length ? <span className="text-2xs text-accent">{t("{count} dipilih", "{count} selected", { count: assignees.length })}</span> : null}
                </div>
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                  <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder={t("Cari anggota", "Search members")} aria-label={t("Cari anggota", "Search members")} className="h-9 w-full rounded-control border border-line bg-surface pl-8 pr-2.5 text-xs text-fg outline-none placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </div>
                <div className="custom-scrollbar max-h-40 space-y-0.5 overflow-y-auto rounded-control border border-line p-1.5">
                  {visibleUsers.length ? visibleUsers.map((user) => {
                    const selected = assignees.includes(user.id);
                    return (
                      <button key={user.id} type="button" onClick={() => toggleAssignee(user.id)} className={`flex w-full items-center justify-between rounded-[7px] px-2.5 py-1.5 text-left text-xs transition-colors ${selected ? "bg-accent-soft text-accent-strong" : "text-fg-muted hover:bg-surface-muted"}`}>
                        <span className="min-w-0"><span className="font-medium text-fg">{user.name}</span><span className="ml-2 truncate text-2xs text-fg-subtle">{user.email}</span></span>
                        {selected ? <Check size={13} /> : null}
                      </button>
                    );
                  }) : <p className="px-2.5 py-3 text-xs text-fg-subtle">{t("Anggota tidak ditemukan.", "No members found.")}</p>}
                </div>
              </div>

              <div className="rounded-control bg-surface-muted/60 px-3 py-2.5 text-xs leading-5 text-fg-muted">
                {t("Checklist yang disalin:", "Copied checklist:")} <strong className="font-medium text-fg">{t("{count} task", "{count} tasks", { count: draft.tasks.length })}</strong>{" "}
                {t(
                  "beserta subtask-nya. Semua dimulai dari status belum selesai.",
                  "along with their subtasks. All start as incomplete.",
                )}
              </div>
              {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="h-9 rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50">{t("Batal", "Cancel")}</button>
          <button type="button" onClick={() => void handleSave()} disabled={loading || saving || !draft} className="inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Copy size={14} />}
            {saving ? t("Menyimpan…", "Saving…") : t("Simpan card", "Save card")}
          </button>
        </div>
      </div>
    </div>
  );
}
