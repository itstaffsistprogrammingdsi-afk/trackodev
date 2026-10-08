import { useEffect, useId, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, ArrowUpRight, Check, FileText, ListChecks, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import JellyMascot from "./JellyMascot";
import type { MascotState } from "./JellyMascot";

export type AssistantProposal = {
  id: string;
  operation: string;
  status: "pending" | "executing" | "approved" | "rejected" | "failed" | "stale" | "expired";
  target: { type?: string; id?: string; title?: string };
  changes: Array<{ field: string; before: unknown; after: unknown }>;
  expires_at: string;
};
export type AssistantMessage = { role: "user" | "assistant"; content: string; proposal?: AssistantProposal };
export type AssistantServiceState = "checking" | "configured" | "needs_key" | "unavailable" | "error" | "demo";

const suggestions = [
  { title: "Rapikan brief", description: "Tujuan, hasil, dan langkah yang jelas", prompt: "Bantu susun brief pekerjaan yang jelas.", icon: FileText },
  { title: "Susun checklist", description: "Pecah pekerjaan menjadi langkah kecil", prompt: "Buat usulan checklist langkah kerja.", icon: ListChecks },
  { title: "Lihat risiko deadline", description: "Ringkas status dari card yang dipilih", prompt: "Ringkas status card dan risiko deadline berdasarkan data yang tersedia.", icon: Sparkles },
];

const serviceLabels: Record<AssistantServiceState, string> = {
  checking: "Memeriksa konfigurasi", configured: "Gateway dikonfigurasi", needs_key: "Key gateway belum diisi", unavailable: "AI belum tersedia", error: "Koneksi perlu diperiksa", demo: "Demo visual · tanpa layanan AI",
};

type Props = {
  open: boolean;
  onClose: () => void;
  state: MascotState;
  serviceState: AssistantServiceState;
  messages: AssistantMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy?: boolean;
  canSend?: boolean;
  error?: string;
  context?: ReactNode;
  onReset: () => void;
  demo?: boolean;
  footer?: ReactNode;
  onApproveProposal?: (proposalId: string) => void;
  onRejectProposal?: (proposalId: string) => void;
  proposalBusyId?: string;
  proposalError?: string;
};

export default function AssistantDrawer({ open, onClose, state, serviceState, messages, input, onInputChange, onSubmit, busy = false, canSend = false, error, context, onReset, demo = false, footer, onApproveProposal, onRejectProposal, proposalBusyId, proposalError }: Props) {
  const headingId = useId();
  const inputId = useId();
  const panel = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    const previousInert = root?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (root) root.inert = previousInert;
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else document.querySelector<HTMLButtonElement>(".assistant-launcher")?.focus();
    };
  }, [open]);

  useEffect(() => {
    const area = scroll.current;
    if (area) area.scrollTo({ top: messages.length || busy ? area.scrollHeight : 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [messages, busy, open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100001] flex justify-end">
      <div aria-hidden="true" className="assistant-backdrop absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
      <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={headingId} className="assistant-drawer relative flex h-[100dvh] w-full max-w-[460px] flex-col overflow-hidden border-l border-white/20 bg-white text-slate-900 shadow-2xl outline-none dark:bg-slate-950 dark:text-slate-100">
        <header className="shrink-0 border-b border-slate-100 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/50 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] dark:border-slate-800 dark:from-indigo-950/60 dark:via-slate-950 dark:to-cyan-950/30">
          <div className="flex items-start gap-3">
            <div className="-ml-2 -mt-2 h-[72px] w-[68px] shrink-0"><JellyMascot state={state} /></div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-indigo-500 dark:text-indigo-300">{demo ? "Demo visual" : "Teman kerja Anda"}</p>
              <h2 id={headingId} className="mt-1 text-lg font-semibold tracking-tight">Asisten Tracko<span className="ml-1 text-indigo-500">.</span></h2>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${serviceState === "configured" || demo ? "bg-cyan-500" : "bg-amber-400"}`} />{serviceLabels[serviceState]}</p>
            </div>
            <button type="button" aria-label="Tutup asisten" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-slate-800"><X size={19} /></button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><ShieldCheck size={13} />{demo ? "Data contoh, tidak disimpan" : "Konteks mengikuti akses Anda"}</span>
            <button type="button" onClick={onReset} disabled={busy} className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:text-indigo-300 dark:hover:bg-indigo-950"><RotateCcw size={12} /> Percakapan baru</button>
          </div>
        </header>
        <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {context && <div className="mb-5">{context}</div>}
          {!demo && (serviceState === "needs_key" || serviceState === "unavailable" || serviceState === "error") && <p role="status" className="mb-5 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{serviceState === "needs_key" ? "Key gateway belum diisi. Jika 9router mewajibkan key, administrator perlu mengisinya sebelum chat dapat digunakan." : serviceState === "error" ? "Koneksi sebelumnya gagal. Periksa gateway atau coba kembali." : "Asisten belum tersedia. Administrator perlu mengaktifkan konfigurasi gateway."}</p>}
          {!messages.length && <div>
            <div className="mx-auto mb-2 h-32 w-32"><JellyMascot state={state} /></div>
            <p className="text-center text-xl font-semibold tracking-tight">Halo, mulai dari mana?</p>
            <p className="mx-auto mt-2 max-w-72 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">Bawa ide atau pekerjaan Anda. Kita susun langkah berikutnya bersama.</p>
            <div className="mt-6 space-y-2.5">{suggestions.map(({ title, description, prompt, icon: Icon }) => <button key={title} type="button" disabled={busy || !canSend} onClick={() => onInputChange(prompt)} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300"><Icon size={18} strokeWidth={1.7} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</span></span><ArrowUpRight size={15} className="shrink-0 text-slate-300 group-hover:text-indigo-500" />
            </button>)}</div>
          </div>}
          <div role="log" aria-live="polite" aria-label={demo ? "Contoh percakapan" : "Percakapan dengan asisten"} className="space-y-5">{messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-8" : "mr-3"}>
            <p className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${message.role === "user" ? "text-right text-slate-400" : "text-indigo-500 dark:text-indigo-300"}`}>{message.role === "user" ? "Anda" : "Asisten Tracko"}</p>
            <div className={`whitespace-pre-wrap break-words rounded-2xl p-4 text-sm leading-relaxed ${message.role === "user" ? "rounded-tr-md bg-indigo-600 text-white" : "rounded-tl-md border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"}`}>{message.content}</div>
            {message.proposal && <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Proposal perubahan</p><p className="mt-1 text-xs font-semibold">{message.proposal.target.title ?? "Target Tracko"}</p></div><span className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-semibold uppercase text-indigo-600 dark:bg-slate-900 dark:text-indigo-300">{message.proposal.status === "pending" ? "Menunggu persetujuan" : message.proposal.status === "approved" ? "Disetujui · dijalankan" : message.proposal.status === "rejected" ? "Ditolak" : message.proposal.status === "stale" ? "Data berubah" : message.proposal.status === "expired" ? "Kedaluwarsa" : message.proposal.status === "failed" ? "Gagal" : "Diproses"}</span></div>
              <div className="mt-3 space-y-2">{message.proposal.changes.map((change, changeIndex) => <div key={`${change.field}-${changeIndex}`} className="rounded-xl border border-indigo-100/80 bg-white/80 px-3 py-2 dark:border-indigo-900/70 dark:bg-slate-950/60"><p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{change.field}</p><p className="mt-1 break-words text-xs text-slate-700 dark:text-slate-200">{change.before == null ? <span className="text-slate-400">—</span> : String(change.before)}<span className="mx-2 text-indigo-400">→</span><span className="font-semibold">{change.after == null ? "(kosong)" : String(change.after)}</span></p></div>)}</div>
              {message.proposal.status === "pending" && <div className="mt-3 flex gap-2"><button type="button" disabled={proposalBusyId === message.proposal.id || Boolean(proposalBusyId)} onClick={() => onApproveProposal?.(message.proposal!.id)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Check size={14} />{proposalBusyId === message.proposal.id ? "Menjalankan…" : "Setujui & jalankan"}</button><button type="button" disabled={Boolean(proposalBusyId)} onClick={() => onRejectProposal?.(message.proposal!.id)} className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Tolak</button></div>}
              {proposalError && proposalBusyId === message.proposal.id && <p role="alert" className="mt-2 text-[11px] text-rose-600 dark:text-rose-300">{proposalError}</p>}
            </div>}
          </div>)}</div>
          {busy && <div role="status" className="mt-4 flex items-center gap-2 text-xs text-indigo-500 dark:text-indigo-300"><span className="assistant-mini-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> Sedang menyusun jawaban…</div>}
          {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        </div>
        <form onSubmit={onSubmit} className="shrink-0 border-t border-slate-100 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900">
            <label htmlFor={inputId} className="sr-only">Pesan untuk asisten</label>
            <textarea id={inputId} value={input} onChange={(event) => onInputChange(event.target.value)} rows={2} maxLength={4000} disabled={busy || !canSend} placeholder={demo ? "Coba pesan demo…" : "Tulis pertanyaan atau brief…"} className="block max-h-32 w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-slate-100" />
            <div className="flex items-center justify-between px-1"><span className="text-[10px] text-slate-400">{demo ? "Respons sintetis · tanpa panggilan AI" : "Saran AI perlu ditinjau"}</span><button type="submit" disabled={busy || !canSend || !input.trim()} aria-label={demo ? "Kirim pesan demo" : "Kirim pesan"} className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-40"><ArrowUp size={18} /></button></div>
          </div>
          <div className="mt-2.5 text-center text-[10px] leading-relaxed text-slate-400">{footer ?? (demo ? "Tidak ada data pekerjaan yang diubah." : "Riwayat sementara · 30 menit sejak respons terakhir.")}</div>
        </form>
      </section>
    </div>, document.body,
  );
}
