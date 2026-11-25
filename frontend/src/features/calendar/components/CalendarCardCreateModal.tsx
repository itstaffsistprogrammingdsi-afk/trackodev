import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { CalendarDays, Loader2, Plus } from "lucide-react";

import { createCard } from "@/features/card/api/card.api";
import type { Card, CardPriority } from "@/features/card/types";
import { Modal } from "@/components/ui/modal";
import { useLanguage } from "@/context/LanguageContext";
import { calendarApi } from "../api/calendar.api";
import type { CalendarBoardOption } from "../types";

interface Props {
  date: string;
  onClose: () => void;
  onCreated: (card: Card) => void;
}

const priorities: Array<{ value: CardPriority; label: string; labelEn: string }> = [
  { value: "low", label: "Rendah", labelEn: "Low" },
  { value: "medium", label: "Normal", labelEn: "Medium" },
  { value: "high", label: "Tinggi", labelEn: "High" },
  { value: "urgent", label: "Urgent", labelEn: "Urgent" },
];

export default function CalendarCardCreateModal({
  date,
  onClose,
  onCreated,
}: Props) {
  const { t } = useLanguage();
  const [boards, setBoards] = useState<CalendarBoardOption[]>([]);
  const [boardId, setBoardId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CardPriority>("medium");
  const [dueDate, setDueDate] = useState(`${date}T17:00`);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setDueDate(`${date}T17:00`);
    setLoadingOptions(true);
    setError("");

    calendarApi
      .getCreateOptions()
      .then((options) => {
        if (!active) return;
        setBoards(options);
        setBoardId((current) => current || options[0]?.id || "");
      })
      .catch(() => {
        if (active) setError(t("Gagal memuat pilihan campaign dan board.", "Failed to load campaign and board options."));
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, [date, t]);

  const selectedBoard = boards.find((board) => board.id === boardId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !boardId || !dueDate) return;

    setSaving(true);
    setError("");

    try {
      const card = await createCard(boardId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: `${dueDate.replace("T", " ")}:00`,
      });
      onCreated(card);
    } catch (caught) {
      setError(
        axios.isAxiosError(caught)
          ? caught.response?.data?.message || t("Card gagal dibuat.", "Failed to create card.")
          : t("Card gagal dibuat.", "Failed to create card."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      ariaLabelledBy="calendar-create-title"
      className="max-w-xl"
    >
      <form onSubmit={submit}>
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
            <CalendarDays size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 pr-8">
            <h2
              id="calendar-create-title"
              className="text-sm font-semibold tracking-heading text-fg"
            >
              {t("Buat card dari kalender", "Create card from calendar")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-fg-muted">
              {t("Deadline otomatis mengikuti tanggal yang dipilih.", "The deadline follows the selected date automatically.")}
            </p>
          </div>
        </header>

        <div className="max-h-[70dvh] space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <p
              role="alert"
              className="rounded-control bg-danger-soft px-3 py-2 text-xs text-danger"
            >
              {error}
            </p>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">
              {t("Judul card", "Card title")}
            </span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
              required
              placeholder={t("Contoh: Finalisasi materi campaign", "Example: Finalize campaign materials")}
              className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">
              {t("Tujuan campaign dan board", "Campaign and board")}
            </span>
            <select
              value={boardId}
              onChange={(event) => setBoardId(event.target.value)}
              disabled={loadingOptions}
              required
              className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:bg-surface-muted disabled:text-fg-subtle"
            >
              {loadingOptions && <option value="">{t("Memuat board…", "Loading boards…")}</option>}
              {!loadingOptions && boards.length === 0 && (
                <option value="">{t("Tidak ada board yang dapat digunakan", "No available boards")}</option>
              )}
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.division.name} / {board.workspace.name} /{" "}
                  {board.campaign.name} / {board.name}
                </option>
              ))}
            </select>
            {selectedBoard ? (
              <p className="mt-1.5 text-2xs text-fg-subtle">
                {t("Card akan masuk ke {campaign} — {board}.", "The card will be added to {campaign} — {board}.", {
                  campaign: selectedBoard.campaign.name,
                  board: selectedBoard.name,
                })}
              </p>
            ) : null}
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-fg-muted">
                {t("Deadline", "Deadline")}
              </span>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
                className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-fg-muted">
                {t("Prioritas", "Priority")}
              </span>
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as CardPriority)
                }
                className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
              >
                {priorities.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.label, item.labelEn)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">
              {t("Deskripsi", "Description")}{" "}
              <span className="font-normal text-fg-subtle">{t("(opsional)", "(optional)")}</span>
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder={t("Tambahkan brief singkat untuk card ini", "Add a short brief for this card")}
              className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2.5 text-sm leading-5 text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            {t("Batal", "Cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || loadingOptions || !boardId || !title.trim()}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            {t("Buat card", "Create card")}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
