import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, Loader2, Plus, X } from 'lucide-react';
import { createCard } from '@/features/card/api/card.api';
import type { Card, CardPriority } from '@/features/card/types';
import { calendarApi } from '../api/calendar.api';
import type { CalendarBoardOption } from '../types';

interface Props {
  date: string;
  onClose: () => void;
  onCreated: (card: Card) => void;
}

const priorities: Array<{ value: CardPriority; label: string }> = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'Tinggi' },
  { value: 'urgent', label: 'Urgent' },
];

export default function CalendarCardCreateModal({
  date,
  onClose,
  onCreated,
}: Props) {
  const [boards, setBoards] = useState<CalendarBoardOption[]>([]);
  const [boardId, setBoardId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CardPriority>('medium');
  const [dueDate, setDueDate] = useState(`${date}T17:00`);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setDueDate(`${date}T17:00`);
    setLoadingOptions(true);
    setError('');

    calendarApi
      .getCreateOptions()
      .then((options) => {
        if (!active) return;
        setBoards(options);
        setBoardId((current) => current || options[0]?.id || '');
      })
      .catch(() => {
        if (active) setError('Gagal memuat pilihan campaign dan board.');
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, [date]);

  const selectedBoard = boards.find((board) => board.id === boardId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !boardId || !dueDate) return;

    setSaving(true);
    setError('');

    try {
      const card = await createCard(boardId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: `${dueDate.replace('T', ' ')}:00`,
      });
      onCreated(card);
    } catch (caught) {
      setError(
        axios.isAxiosError(caught)
          ? caught.response?.data?.message || 'Card gagal dibuat.'
          : 'Card gagal dibuat.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Tutup form buat card"
      />

      <form
        onSubmit={submit}
        className="relative w-full max-w-xl overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-950"
      >
        <header className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Buat card dari Calendar
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tenggat otomatis diarahkan ke tanggal yang dipilih.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Judul card
            </span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
              required
              placeholder="Contoh: Finalisasi materi campaign"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Tujuan campaign dan board
            </span>
            <select
              value={boardId}
              onChange={(event) => setBoardId(event.target.value)}
              disabled={loadingOptions}
              required
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {loadingOptions && <option value="">Memuat board...</option>}
              {!loadingOptions && boards.length === 0 && (
                <option value="">Tidak ada board yang dapat digunakan</option>
              )}
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.division.name} / {board.workspace.name} / {board.campaign.name} / {board.name}
                </option>
              ))}
            </select>
            {selectedBoard && (
              <p className="mt-1.5 text-xs text-slate-500">
                Card akan masuk ke {selectedBoard.campaign.name} — {selectedBoard.name}.
              </p>
            )}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Tenggat
              </span>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Prioritas
              </span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as CardPriority)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {priorities.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Deskripsi <span className="font-normal text-slate-400">(opsional)</span>
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Tambahkan brief singkat untuk card ini..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-500/10"
            />
          </label>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || loadingOptions || !boardId || !title.trim()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Buat card
          </button>
        </footer>
      </form>
    </div>
  );
}
